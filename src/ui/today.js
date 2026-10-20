// Visning: «I dag» (steg 5.7) – dagens faste aktiviteter og arbeidsøkter, med avhuking
import { iDag as t, tommeTilstander, hjelpetekster } from '../tekster.js';
import { todayAgenda } from '../logic/today.js';
import { escapeHtml } from './html.js';
import { formatFullDate, formatTimeRange } from './format.js';
import allDoneUrl from '../../assets/all-done.png';
import emptyCalendarUrl from '../../assets/empty-calendar.png';

function itemHtml(item, taskById, courseById) {
  const task = taskById.get(item.task_id);
  // Arbeidsøkter henter navn og emne fra oppgaven, så de følger med når oppgaven endres
  const title = item.is_fixed ? item.title : (task?.title ?? item.title);
  const course = courseById.get(item.is_fixed ? item.course_id : (task?.course_id ?? item.course_id));
  const time = formatTimeRange(item.start_time, item.end_time);
  const color = escapeHtml(course?.color ?? 'var(--color-border)');
  const meta = [item.is_fixed ? t.fastAktivitet : t.arbeidsokt, course?.name].filter(Boolean).map(escapeHtml).join(' · ');

  const check = item.is_fixed
    ? ''
    : `<button type="button" class="check" role="checkbox" aria-checked="${item.is_completed}"
         aria-label="${escapeHtml(t.merkGjennomfort(title, time))}"
         data-action="toggle-session" data-id="${escapeHtml(item.source_id)}">
         <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7" /></svg>
       </button>`;

  return `
    <li class="agenda-item ${item.is_fixed ? 'agenda-fixed' : 'agenda-session'}${item.is_completed ? ' is-done' : ''}"
      style="--item-color: ${color}">
      <span class="agenda-time">${time}</span>
      <div class="agenda-body">
        <span class="agenda-title">${escapeHtml(title)}</span>
        <span class="agenda-meta">${meta}</span>
      </div>
      ${check}
    </li>`;
}

export function renderToday(state) {
  const { tasks, courses } = state.data;
  const today = state.ui.today;
  const { items, sessionsTotal, sessionsDone } = todayAgenda(state.data, today);
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const courseById = new Map(courses.map((course) => [course.id, course]));

  const header = `
    <div class="view-header">
      <div>
        <h2>${t.overskrift}</h2>
        <p class="view-subtitle">${formatFullDate(today)}</p>
      </div>
      ${sessionsTotal ? `<p class="today-progress">${t.fremdrift(sessionsDone, sessionsTotal)}</p>` : ''}
    </div>`;

  // Ingenting i dag: vis veien videre
  if (items.length === 0) {
    const noTasks = tasks.length === 0;
    const empty = tommeTilstander.ingenOppgaver;
    return `
      ${header}
      <section class="card">
        <div class="empty-state">
          <img src="${emptyCalendarUrl}" alt="" width="160" height="160">
          <h3>${noTasks ? empty.overskrift : t.ingenting}</h3>
          <p>${noTasks ? empty.tekst : t.ingentingTekst}</p>
          ${noTasks ? `<button class="btn btn-accent" type="button" data-action="open-task-from-today">${empty.knapp}</button>` : ''}
        </div>
      </section>`;
  }

  const done = tommeTilstander.altFerdigIDag;
  const allDone = sessionsTotal > 0 && sessionsDone === sessionsTotal
    ? `
      <section class="card">
        <div class="empty-state empty-state-compact">
          <img src="${allDoneUrl}" alt="" width="120" height="120">
          <h3>${done.overskrift}</h3>
          <p>${done.tekst}</p>
        </div>
      </section>`
    : '';

  return `
    ${header}
    ${allDone}
    <section class="card" aria-label="${t.overskrift}">
      <ol class="agenda">
        ${items.map((item) => itemHtml(item, taskById, courseById)).join('')}
      </ol>
      ${sessionsTotal === 0 ? `<p class="muted agenda-note">${t.ingenOkter}</p>` : ''}
      <p class="field-help agenda-note">${hjelpetekster.forskyvning}</p>
    </section>`;
}
