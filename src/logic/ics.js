// Eksport av planen til kalenderfil (iCalendar, RFC 5545) for Google Calendar, Outlook og Apple Kalender.
// Rene funksjoner: data, periode, «nå» og tekstene som skal stå i filen sendes inn.
import { addDays, atMinutes, toDateKey } from './dates.js';
import { expandFixedBlocks } from './recurrence.js';
import { RECURRENCE } from './models.js';

export const TIMEZONE = 'Europe/Oslo';
export const EXPORT_WEEKS = [1, 2, 4, 8, 16];
export const DEFAULT_EXPORT_WEEKS = 4;
export const EXPORT_INCLUDE = ['both', 'sessions', 'fixed'];

// Regler for norsk tid: sommertid fra siste søndag i mars kl. 02 til siste søndag i oktober kl. 03.
// Kalenderprogrammet bruker disse til å regne om tidene, også for gjentakende hendelser over skiftet.
const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  `TZID:${TIMEZONE}`,
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const osloFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

// Tidspunkt som norsk veggklokketid, «20261103T101500», uansett hvilken tidssone koden kjører i
export function formatOsloTime(date) {
  const p = Object.fromEntries(osloFormat.formatToParts(date).map((part) => [part.type, part.value]));
  return `${p.year}${p.month}${p.day}T${p.hour}${p.minute}${p.second}`;
}

// Tidspunkt i UTC, «20261103T091500Z» (brukes i DTSTAMP og UNTIL)
export function formatUtcTime(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Tekstverdier: \ ; , og linjeskift må escapes (RFC 5545 avsnitt 3.3.11)
export function escapeText(value) {
  return String(value)
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r?\n/g, '\\n');
}

// Linjer over 75 byte brytes, og fortsettelseslinjer starter med mellomrom (RFC 5545 avsnitt 3.1).
// Grensen gjelder byte i UTF-8, og tegn som æ, ø og å (2 byte) deles aldri.
const encoder = new TextEncoder();
export function foldLine(line) {
  const parts = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) {
      parts.push(current);
      current = ' ';
      bytes = 1;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n');
}

// UID må være unik og stabil, så samme hendelse kan kjennes igjen ved ny import
const uidFor = (id) => `${String(id).replace(/[^\w-]/g, '-')}@pace`;

// Lager kalenderfilen. `include` er 'both', 'sessions' eller 'fixed'. `from` og `to` er datonøkler (begge tatt med).
// `text` er { calendarName, sessionDescription({ course, deadline }), fixedDescription({ course }) } fra tekster.js.
// Gir { content, count }.
export function createIcs({ data, from, to, include, now, text }) {
  const stamp = formatUtcTime(now);
  const courseName = (id) => data.courses.find((course) => course.id === id)?.name ?? null;
  const events = [];

  if (include !== 'sessions') {
    for (const block of data.blocks.filter((b) => b.is_fixed)) {
      const [first] = expandFixedBlocks([block], from, to);
      if (!first) continue;
      const weekly = block.recurrence === RECURRENCE.WEEKLY;
      events.push({
        uid: uidFor(block.id),
        start: new Date(first.start_time),
        end: new Date(first.end_time),
        // Gjentas hver uke til og med siste dag i perioden. UNTIL skal være i UTC når DTSTART har TZID.
        rrule: weekly ? `FREQ=WEEKLY;UNTIL=${formatUtcTime(new Date(atMinutes(addDays(to, 1), 0) - 1000))}` : null,
        summary: block.title,
        description: text.fixedDescription({ course: courseName(block.course_id) }),
      });
    }
  }

  if (include !== 'fixed') {
    const taskById = new Map(data.tasks.map((task) => [task.id, task]));
    for (const block of data.blocks) {
      const task = taskById.get(block.task_id);
      const date = toDateKey(new Date(block.start_time));
      if (block.is_fixed || block.is_completed || !task || date < from || date > to) continue;
      events.push({
        uid: uidFor(block.id),
        start: new Date(block.start_time),
        end: new Date(block.end_time),
        rrule: null,
        summary: task.title,
        description: text.sessionDescription({ course: courseName(task.course_id), deadline: new Date(task.deadline) }),
      });
    }
  }

  events.sort((a, b) => a.start - b.start);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pace//Studieplanlegger//NB',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(text.calendarName)}`,
    `X-WR-TIMEZONE:${TIMEZONE}`,
    ...VTIMEZONE,
  ];
  for (const event of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;TZID=${TIMEZONE}:${formatOsloTime(event.start)}`,
      `DTEND;TZID=${TIMEZONE}:${formatOsloTime(event.end)}`,
      ...(event.rrule ? [`RRULE:${event.rrule}`] : []),
      `SUMMARY:${escapeText(event.summary)}`,
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');

  return { content: `${lines.map(foldLine).join('\r\n')}\r\n`, count: events.length };
}

// Skjemaverdier { include, weeks } → kalenderfil fra og med `today`.
// Gir { filename, content, count } eller { error: 'INGEN_HENDELSER' } når perioden er tom.
export function prepareExport(data, values, { today, now, text }) {
  const include = EXPORT_INCLUDE.includes(values.include) ? values.include : 'both';
  const weeks = EXPORT_WEEKS.includes(Number(values.weeks)) ? Number(values.weeks) : DEFAULT_EXPORT_WEEKS;
  const to = addDays(today, weeks * 7 - 1);
  const { content, count } = createIcs({ data, from: today, to, include, now, text });
  if (count === 0) return { error: 'INGEN_HENDELSER' };
  return { filename: `pace-plan-${today}.ics`, content, count };
}
