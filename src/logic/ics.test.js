import { describe, it, expect, afterEach } from 'vitest';
import { createIcs, prepareExport, formatOsloTime, formatUtcTime, escapeText, foldLine } from './ics.js';
import { createFixedBlock, STATUS } from './models.js';
import { atMinutes } from './dates.js';
import { eksport } from '../tekster.js';

const h = (hours) => Math.round(hours * 60);
const text = eksport.ics;
// Mandag 2. november 2026 kl. 09:00
const now = atMinutes('2026-11-02', h(9));

const fixed = (id, date, from, to, extra = {}) =>
  createFixedBlock(
    { title: id, start_time: atMinutes(date, h(from)), end_time: atMinutes(date, h(to)), recurrence: 'weekly', ...extra },
    { id },
  );

const session = (id, taskId, date, from, to, extra = {}) => ({
  id,
  task_id: taskId,
  course_id: null,
  title: 'gammel tittel',
  start_time: atMinutes(date, h(from)).toISOString(),
  end_time: atMinutes(date, h(to)).toISOString(),
  is_fixed: false,
  recurrence: 'none',
  is_completed: false,
  ...extra,
});

const task = (id, title, extra = {}) => ({
  id,
  course_id: 'c1',
  title,
  description: '',
  deadline: atMinutes('2026-11-06', h(12)).toISOString(),
  estimated_hours: 4,
  completed_hours: 0,
  status: STATUS.NOT_STARTED,
  ...extra,
});

const data = (blocks, tasks = [task('t1', 'Rapport')]) => ({
  user: {},
  courses: [{ id: 'c1', name: 'ITF10619 Programmering 2', color: '#2E5B88' }],
  tasks,
  blocks,
});

const ics = (blocks, options = {}) =>
  createIcs({ data: data(blocks, options.tasks), from: '2026-11-02', to: '2026-11-29', include: 'both', now, text, ...options });

// Fjerner linjebryting (RFC 5545) så innholdet kan leses som hele linjer
const unfold = (content) => content.replace(/\r\n /g, '').split('\r\n').filter(Boolean);
const events = (content) => {
  const lines = unfold(content);
  const result = [];
  let current = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') current = {};
    else if (line === 'END:VEVENT') result.push(current), (current = null);
    else if (current) {
      const index = line.indexOf(':');
      current[line.slice(0, index)] = line.slice(index + 1);
    }
  }
  return result;
};

describe('formatOsloTime', () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it('gir norsk veggklokketid i både sommertid og vintertid', () => {
    expect(formatOsloTime(new Date('2026-10-24T08:00:00Z'))).toBe('20261024T100000'); // CEST, UTC+2
    expect(formatOsloTime(new Date('2026-10-26T09:00:00Z'))).toBe('20261026T100000'); // CET, UTC+1
  });

  it('gir norsk tid også når koden kjører i en annen tidssone', () => {
    process.env.TZ = 'America/New_York';
    expect(formatOsloTime(new Date('2026-11-03T09:15:00Z'))).toBe('20261103T101500');
  });
});

describe('formatUtcTime', () => {
  it('gir UTC-format med Z', () => {
    expect(formatUtcTime(new Date('2026-11-03T09:15:30.123Z'))).toBe('20261103T091530Z');
  });
});

describe('escapeText', () => {
  it('escaper komma, semikolon, backslash og linjeskift, men lar æøå være', () => {
    expect(escapeText('Matte, del 1; repetisjon\\ekstra')).toBe('Matte\\, del 1\\; repetisjon\\\\ekstra');
    expect(escapeText('Første linje\nAndre linje')).toBe('Første linje\\nAndre linje');
    expect(escapeText('Øving på æøå ÆØÅ')).toBe('Øving på æøå ÆØÅ');
  });
});

describe('foldLine', () => {
  const bytes = (line) => new TextEncoder().encode(line).length;

  it('lar korte linjer være', () => {
    expect(foldLine('SUMMARY:Kort')).toBe('SUMMARY:Kort');
  });

  it('bryter linjer over 75 byte, og fortsettelser starter med mellomrom', () => {
    const line = `DESCRIPTION:${'a'.repeat(200)}`;
    const parts = foldLine(line).split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.every((part) => bytes(part) <= 75)).toBe(true);
    expect(parts.slice(1).every((part) => part.startsWith(' '))).toBe(true);
    expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join('')).toBe(line);
  });

  it('teller byte og deler aldri æ, ø eller å', () => {
    const line = `SUMMARY:${'æøå'.repeat(40)}`;
    const parts = foldLine(line).split('\r\n');
    expect(parts.every((part) => bytes(part) <= 75)).toBe(true);
    // Hvert stykke er gyldig tekst for seg (ingen halve tegn)
    for (const part of parts) expect(new TextDecoder().decode(new TextEncoder().encode(part))).toBe(part);
    expect(parts.map((part, i) => (i === 0 ? part : part.slice(1))).join('')).toBe(line);
  });
});

describe('createIcs', () => {
  it('lager en gyldig kalender med CRLF, tidssone og riktig antall hendelser', () => {
    const { content, count } = ics([fixed('forelesning', '2026-11-02', 10.25, 12), session('s1', 't1', '2026-11-03', 8, 10)]);
    expect(count).toBe(2);
    expect(content.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(content.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(content.replaceAll('\r\n', '').includes('\n')).toBe(false);
    expect(content).toContain('BEGIN:VTIMEZONE\r\nTZID:Europe/Oslo');
    expect(content.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(content.match(/END:VEVENT/g)).toHaveLength(2);
  });

  it('har ingen linjer over 75 byte', () => {
    const long = task('t1', `Arbeidskrav med en svært lang tittel om æøå, komma; semikolon og mye mer tekst ${'x'.repeat(80)}`);
    const { content } = ics([session('s1', 't1', '2026-11-03', 8, 10)], { tasks: [long] });
    for (const line of content.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });

  it('eksporterer ukentlig aktivitet som gjentakende hendelse til slutten av perioden', () => {
    const [event] = events(ics([fixed('forelesning', '2026-10-12', 10.25, 12)]).content);
    // Første forekomst i perioden, ikke den opprinnelige datoen
    expect(event['DTSTART;TZID=Europe/Oslo']).toBe('20261102T101500');
    expect(event['DTEND;TZID=Europe/Oslo']).toBe('20261102T120000');
    // 29.11.2026 kl. 23:59:59 norsk tid er 22:59:59 UTC
    expect(event.RRULE).toBe('FREQ=WEEKLY;UNTIL=20261129T225959Z');
    expect(event.SUMMARY).toBe('forelesning');
  });

  it('eksporterer enkeltstående aktivitet uten RRULE', () => {
    const [event] = events(ics([fixed('veiledning', '2026-11-10', 9, 9.5, { recurrence: 'none' })]).content);
    expect(event.RRULE).toBeUndefined();
    expect(event['DTSTART;TZID=Europe/Oslo']).toBe('20261110T090000');
  });

  it('beholder klokkeslettet over sommertidsskiftet', () => {
    // Ukentlig forelesning kl. 10:15 fra 19.10 (sommertid), eksportert fra 19.10 til 1.11
    const { content } = createIcs({
      data: data([fixed('forelesning', '2026-10-19', 10.25, 12), session('s1', 't1', '2026-10-26', 10, 12)]),
      from: '2026-10-19',
      to: '2026-11-01',
      include: 'both',
      now,
      text,
    });
    const [lecture, work] = events(content);
    expect(lecture['DTSTART;TZID=Europe/Oslo']).toBe('20261019T101500');
    // Økt mandag 26.10 kl. 10 (vintertid) står som 10:00 og ikke 11:00
    expect(work['DTSTART;TZID=Europe/Oslo']).toBe('20261026T100000');
  });

  it('gir arbeidsøkter oppgavens tittel, emne og frist', () => {
    const [event] = events(ics([session('s1', 't1', '2026-11-03', 8, 10)], { tasks: [task('t1', 'Rapport, del 2; utkast')] }).content);
    expect(event.SUMMARY).toBe('Rapport\\, del 2\\; utkast');
    expect(event.DESCRIPTION).toBe(
      'Emne: ITF10619 Programmering 2\\nFrist: fredag 6. november kl. 12:00\\nArbeidsøkt planlagt av Pace',
    );
  });

  it('gir faste aktiviteter emnet i beskrivelsen, og ingen beskrivelse uten emne', () => {
    const [withCourse, without] = events(
      ics([fixed('forelesning', '2026-11-02', 10, 12, { course_id: 'c1' }), fixed('jobb', '2026-11-03', 16, 20)]).content,
    );
    expect(withCourse.DESCRIPTION).toBe('Emne: ITF10619 Programmering 2');
    expect(without.DESCRIPTION).toBeUndefined();
  });

  it('tar bare med det som er valgt', () => {
    const blocks = [fixed('forelesning', '2026-11-02', 10, 12), session('s1', 't1', '2026-11-03', 8, 10)];
    expect(events(ics(blocks, { include: 'sessions' }).content).map((e) => e.SUMMARY)).toEqual(['Rapport']);
    expect(events(ics(blocks, { include: 'fixed' }).content).map((e) => e.SUMMARY)).toEqual(['forelesning']);
  });

  it('tar bare med økter i perioden, og ikke fullførte økter eller økter uten oppgave', () => {
    const blocks = [
      session('før', 't1', '2026-11-01', 8, 10),
      session('inne', 't1', '2026-11-03', 8, 10),
      session('etter', 't1', '2026-11-30', 8, 10),
      session('ferdig', 't1', '2026-11-04', 8, 10, { is_completed: true }),
      session('slettet-oppgave', 'finnes-ikke', '2026-11-05', 8, 10),
    ];
    expect(events(ics(blocks, { include: 'sessions' }).content).map((e) => e.UID)).toEqual(['inne@pace']);
  });

  it('gir unike og stabile UID-er', () => {
    const blocks = [fixed('a', '2026-11-02', 10, 12), session('t1@2026-11-03T07:00:00.000Z', 't1', '2026-11-03', 8, 10)];
    const first = events(ics(blocks).content).map((e) => e.UID);
    expect(new Set(first).size).toBe(2);
    expect(first.every((uid) => /^[\w-]+@pace$/.test(uid))).toBe(true);
    expect(events(ics(blocks).content).map((e) => e.UID)).toEqual(first);
  });

  it('bruker «nå» i DTSTAMP og er ren', () => {
    const blocks = [session('s1', 't1', '2026-11-03', 8, 10)];
    expect(events(ics(blocks).content)[0].DTSTAMP).toBe(formatUtcTime(now));
    expect(ics(blocks)).toEqual(ics(blocks));
  });
});

describe('prepareExport', () => {
  const blocks = [fixed('forelesning', '2026-11-02', 10, 12), session('s1', 't1', '2026-11-20', 8, 10)];
  const run = (values) => prepareExport(data(blocks), values, { today: '2026-11-02', now, text });

  it('gir filnavn og innhold for valgt periode', () => {
    const result = run({ include: 'both', weeks: '4' });
    expect(result.filename).toBe('pace-plan-2026-11-02.ics');
    expect(result.count).toBe(2);
    // 4 uker fra mandag 2.11 slutter søndag 29.11
    expect(result.content).toContain('UNTIL=20261129T225959Z');
  });

  it('kortere periode tar ikke med økter etter perioden', () => {
    expect(run({ include: 'sessions', weeks: '1' })).toEqual({ error: 'INGEN_HENDELSER' });
  });

  it('bruker standardvalg for ugyldige verdier', () => {
    expect(run({ include: 'tull', weeks: '99' }).count).toBe(2);
  });
});
