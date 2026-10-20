// Visning: kalender med uke- og dagsvisning (steg 3.2 og 3.3)
import { kalender as t, tommeTilstander, overbelastning } from '../tekster.js';
import { blocksForRange, layoutDay, visibleHours } from '../logic/calendar.js';
import { weekDays, isoWeek, minutesSinceMidnight, formatTime } from '../logic/dates.js';
import { escapeHtml } from './html.js';
import {
  formatTimeRange,
  formatShortWeekday,
  formatLongDate,
  formatFullDate,
  formatDateRange,
} from './format.js';
import emptyCalendarUrl from '../../assets/empty-calendar.png';

function emptyState() {
  const empty = tommeTilstander.tomKalender;
  return `
    <section class="card" aria-labelledby="calendar-title">
      <h2 id="calendar-title" class="visually-hidden">${t.overskrift}</h2>
      <div class="empty-state">
        <img src="${emptyCalendarUrl}" alt="" width="160" height="160">
        <h3>${empty.overskrift}</h3>
        <p>${empty.tekst}</p>
        <button class="btn btn-accent" type="button" data-action="add-fixed-from-calendar">${empty.knapp}</button>
      </div>
    </section>`;
}

function toolbar(state, days) {
  const { mode, date } = state.ui.calendar;
  const week = mode === 'week';
  const title = week
    ? `${t.ukenummer(isoWeek(date))} <span class="cal-range">${formatDateRange(days[0], days[6])}</span>`
    : `<span class="cal-day-title">${formatFullDate(date)}</span>`;
  const modeButton = (value, label) =>
    `<button type="button" class="segment" data-action="calendar-mode" data-mode="${value}" aria-pressed="${mode === value}">${label}</button>`;

  return `
    <div class="cal-toolbar">
      <h2 id="calendar-title" class="cal-title">${title}</h2>
      <div class="cal-controls">
        <div class="cal-step">
          <button class="btn btn-secondary btn-small" type="button" data-action="calendar-step" data-direction="-1"
            aria-label="${week ? t.forrigeUke : t.forrigeDag}">‹</button>
          <button class="btn btn-secondary btn-small" type="button" data-action="calendar-today">${t.iDag}</button>
          <button class="btn btn-secondary btn-small" type="button" data-action="calendar-step" data-direction="1"
            aria-label="${week ? t.nesteUke : t.nesteDag}">›</button>
        </div>
        <div class="segmented" role="group" aria-label="${t.visning}">
          ${modeButton('day', t.dag)}${modeButton('week', t.uke)}
        </div>
      </div>
    </div>`;
}

// Én blokk plassert i dagkolonnen. Posisjonen settes med CSS-variabler.
function blockHtml({ block, column, columns }, range, courseById, taskById) {
  const start = minutesSinceMidnight(new Date(block.start_time));
  const end = Math.min(start + (new Date(block.end_time) - new Date(block.start_time)) / 60_000, range.end);
  // Arbeidsøkter henter navn og emne fra oppgaven, så de følger med når oppgaven endres
  const task = block.is_fixed ? null : taskById.get(block.task_id);
  const title = task?.title ?? block.title;
  const course = courseById.get(task ? task.course_id : block.course_id);
  const total = range.end - range.start;
  const style = [
    `--top: ${((start - range.start) / total) * 100}%`,
    `--height: ${((end - start) / total) * 100}%`,
    `--left: ${(column / columns) * 100}%`,
    `--width: ${100 / columns}%`,
    `--block-color: ${course?.color ?? 'var(--color-text-muted)'}`,
  ].join('; ');
  const content = `
      <span class="cal-block-title">${block.is_completed ? '✓ ' : ''}${escapeHtml(title)}</span>
      <span class="cal-block-time">${formatTimeRange(block.start_time, block.end_time)}</span>
      ${course ? `<span class="cal-block-course">${escapeHtml(course.name)}</span>` : ''}`;

  // Korte blokker har ikke plass til alle linjene
  const length = end - start;
  const size = length <= 30 ? ' cal-block-tiny cal-block-short' : length <= 60 ? ' cal-block-short' : '';

  // Faste aktiviteter kan klikkes for å redigeres i timeplanen
  return block.is_fixed
    ? `<button type="button" class="cal-block${size}" style="${escapeHtml(style)}"
        data-action="edit-fixed-from-calendar" data-id="${escapeHtml(block.source_id)}">${content}</button>`
    : `<div class="cal-block cal-session${block.is_completed ? ' is-done' : ''}${size}" style="${escapeHtml(style)}">${content}</div>`;
}

export function renderCalendar(state) {
  const { blocks, courses, tasks, user } = state.data;
  if (blocks.length === 0) return emptyState();

  const { mode, date } = state.ui.calendar;
  const days = mode === 'week' ? weekDays(date) : [date];
  const items = blocksForRange(blocks, days[0], days[days.length - 1]);
  const { startHour, endHour } = visibleHours(user, items);
  const range = { start: startHour * 60, end: endHour * 60 };
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const timeLabels = hours.map((hour) => `<div class="cal-hour">${formatTime(hour * 60)}</div>`).join('');

  // Dager der planlagt arbeid er mer enn daglig kapasitet, markeres i rødt (krav.md del 5)
  const overloaded = new Set(state.ui.overload.overloadedDays);
  const heads = days
    .map((day) => {
      const today = (day === state.ui.today ? ' cal-today' : '') + (overloaded.has(day) ? ' cal-overloaded' : '');
      const warning = overloaded.has(day) ? `<span class="visually-hidden">${overbelastning.dagOverKapasitet}</span>` : '';
      const label = `<span class="cal-weekday">${formatShortWeekday(day)}</span><span class="cal-date">${Number(day.slice(8))}</span>${warning}`;
      return mode === 'week'
        ? `<button type="button" class="cal-head-day${today}" data-action="calendar-open-day" data-date="${day}"
             aria-label="${t.apneDag(formatLongDate(day))}">${label}</button>`
        : `<div class="cal-head-day${today}">${label}</div>`;
    })
    .join('');

  const columns = days
    .map((day) => {
      const dayItems = layoutDay(items.filter((item) => item.date === day));
      return `
        <div class="cal-day${day === state.ui.today ? ' cal-today' : ''}${overloaded.has(day) ? ' cal-overloaded' : ''}" role="group"
          aria-label="${formatLongDate(day)}${overloaded.has(day) ? `, ${overbelastning.dagOverKapasitet.toLowerCase()}` : ''}">
          ${dayItems.map((item) => blockHtml(item, range, courseById, taskById)).join('')}
        </div>`;
    })
    .join('');

  return `
    <section class="card cal-card" aria-labelledby="calendar-title">
      ${toolbar(state, days)}
      <div class="cal-scroll">
        <div class="cal cal-mode-${mode}" style="--days: ${days.length}; --hours: ${hours.length}">
          <div class="cal-head"><div></div>${heads}</div>
          <div class="cal-body">
            <div class="cal-times" aria-hidden="true">${timeLabels}</div>
            ${columns}
          </div>
        </div>
      </div>
    </section>`;
}
