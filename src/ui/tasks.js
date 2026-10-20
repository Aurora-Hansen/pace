// Visning: oppgaver og to-do-liste (steg 4.2, 4.3 og 4.5)
import { oppgaver as t, knapper, fasteAktiviteter, tommeTilstander, overbelastning } from '../tekster.js';
import { STATUS } from '../logic/models.js';
import { groupTasks, daysUntil } from '../logic/todo.js';
import { progressPercent } from '../logic/progress.js';
import { escapeHtml, formErrorSummary, invalidAttrs } from './html.js';
import { formatDeadline, formatHoursShort } from './format.js';
import { renderOverloadWarnings } from './overload.js';
import emptyTasksUrl from '../../assets/empty-tasks.png';
import allDoneUrl from '../../assets/all-done.png';

// --- Skjema for ny eller endret oppgave ---

function taskForm(state) {
  const { values, errors } = state.ui.forms.task;
  const editing = Boolean(values.id);
  const options = state.data.courses
    .map(
      (course) =>
        `<option value="${escapeHtml(course.id)}"${course.id === values.course_id ? ' selected' : ''}>${escapeHtml(course.name)}</option>`,
    )
    .join('');

  return `
    <section class="card" aria-labelledby="task-form-title">
      <form data-form="task" novalidate>
        <h2 id="task-form-title">${editing ? t.rediger : t.ny}</h2>
        ${editing ? `<input type="hidden" name="id" value="${escapeHtml(values.id)}">` : ''}
        ${formErrorSummary(errors)}

        <div class="form-row">
          <div class="form-field">
            <label for="task-title">${t.tittel}</label>
            <input id="task-title" name="title" type="text" required placeholder="${t.tittelEksempel}"
              value="${escapeHtml(values.title)}"${invalidAttrs(errors, 'title')}${errors.length ? '' : ' data-autofocus'}>
          </div>
          <div class="form-field">
            <label for="task-course">${t.emne}</label>
            <select id="task-course" name="course_id">
              <option value="">${fasteAktiviteter.utenEmne}</option>
              ${options}
            </select>
          </div>
        </div>

        <div class="form-field">
          <label for="task-description">${t.beskrivelse}</label>
          <textarea id="task-description" name="description" rows="3">${escapeHtml(values.description)}</textarea>
        </div>

        <div class="form-row">
          <div class="form-field">
            <label for="task-hours">${t.estimat}</label>
            <input id="task-hours" name="estimated_hours" type="text" inputmode="decimal" autocomplete="off" required
              value="${escapeHtml(values.estimated_hours)}"${invalidAttrs(errors, 'estimated_hours')}>
          </div>
          <div class="form-field">
            <label for="task-deadline">${t.fristDato}</label>
            <input id="task-deadline" name="deadline_date" type="date" required
              value="${escapeHtml(values.deadline_date)}"${invalidAttrs(errors, 'deadline')}>
          </div>
          <div class="form-field">
            <label for="task-deadline-time">${t.fristTid}</label>
            <input id="task-deadline-time" name="deadline_time" type="time" aria-describedby="task-deadline-help"
              value="${escapeHtml(values.deadline_time)}">
          </div>
        </div>
        <p id="task-deadline-help" class="field-help">${t.fristTidHjelp}</p>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${knapper.lagre}</button>
          <button class="btn btn-secondary" type="button" data-action="cancel-task">${knapper.avbryt}</button>
        </div>
      </form>
    </section>`;
}

// --- Fremgang, inne i kortet ---

function progressForm(state, task) {
  const { values, errors } = state.ui.forms.progress;
  const unitOptions = Object.entries(t.enheter)
    .map(([value, label]) => `<option value="${value}"${values.unit === value ? ' selected' : ''}>${label}</option>`)
    .join('');

  return `
    <form data-form="progress" class="progress-form" novalidate>
      <input type="hidden" name="task_id" value="${escapeHtml(task.id)}">
      ${formErrorSummary(errors)}
      <div class="progress-fields">
        <div class="form-field">
          <label for="progress-amount">${t.utfort}</label>
          <input id="progress-amount" name="amount" type="text" inputmode="decimal" autocomplete="off"
            value="${escapeHtml(values.amount)}"${invalidAttrs(errors, 'amount')}${errors.length ? '' : ' data-autofocus'}>
        </div>
        <div class="form-field">
          <label for="progress-unit">${t.enhet}</label>
          <select id="progress-unit" name="unit">${unitOptions}</select>
        </div>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary btn-small" type="submit">${knapper.lagre}</button>
        <button class="btn btn-secondary btn-small" type="button" data-action="cancel-progress">${knapper.avbryt}</button>
      </div>
    </form>`;
}

// --- Ett oppgavekort ---

function deadlineText(task, today) {
  const days = daysUntil(task.deadline, today);
  if (days < 0 && task.status !== STATUS.COMPLETED) {
    return `<span class="task-overdue">${t.fristPassert}</span> · ${formatDeadline(task.deadline)}`;
  }
  const relative = days >= 0 && days <= 14 && task.status !== STATUS.COMPLETED ? ` · ${t.relativ(days)}` : '';
  return `${t.frist(formatDeadline(task.deadline))}${relative}`;
}

function taskActions(state, task) {
  const id = escapeHtml(task.id);
  if (state.ui.confirm?.kind === 'task' && state.ui.confirm.id === task.id) {
    return `
      <div class="confirm">
        <p>${escapeHtml(t.slettSporsmal(task.title))}</p>
        <div class="row-actions">
          <button class="btn btn-danger btn-small" type="button" data-action="confirm-delete" data-autofocus>${knapper.jaSlett}</button>
          <button class="btn btn-secondary btn-small" type="button" data-action="cancel-delete">${knapper.avbryt}</button>
        </div>
      </div>`;
  }

  const done = task.status === STATUS.COMPLETED;
  const main = done
    ? `<button class="btn btn-secondary btn-small" type="button" data-action="reopen-task" data-id="${id}">${t.gjenapne}</button>`
    : `<button class="btn btn-secondary btn-small" type="button" data-action="open-progress" data-id="${id}">${knapper.registrerFremgang}</button>
       <button class="btn btn-primary btn-small" type="button" data-action="complete-task" data-id="${id}">${knapper.markerSomFerdig}</button>`;

  return `
    <div class="row-actions">
      ${main}
      <button class="btn btn-secondary btn-small" type="button" data-action="edit-task" data-id="${id}">${knapper.rediger}</button>
      <button class="btn btn-secondary btn-small" type="button" data-action="ask-delete" data-kind="task" data-id="${id}">${knapper.slett}</button>
    </div>`;
}

function taskCard(state, task, courseById) {
  const course = courseById.get(task.course_id);
  const percent = progressPercent(task);
  const done = task.status === STATUS.COMPLETED;
  const progressOpen = state.ui.forms.progress?.values.task_id === task.id;
  const atRisk = state.ui.overload.atRisk.some((risk) => risk.taskId === task.id);

  return `
    <li class="task-card${done ? ' task-done' : ''}" style="--task-color: ${escapeHtml(course?.color ?? 'var(--color-border)')}">
      <div class="task-head">
        <div>
          <h4 class="task-title">${escapeHtml(task.title)}${atRisk ? ` <span class="badge-risk">${overbelastning.fristIFare}</span>` : ''}</h4>
          <p class="task-meta">
            ${course ? `<span>${escapeHtml(course.name)}</span> · ` : ''}${deadlineText(task, state.ui.today)}
          </p>
        </div>
      </div>
      ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
      <div class="task-progress">
        <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"
          aria-label="${escapeHtml(task.title)}">
          <span style="width: ${percent}%"></span>
        </div>
        <span class="progress-text">${t.fremdrift(formatHoursShort(done ? task.estimated_hours : task.completed_hours), formatHoursShort(task.estimated_hours))} · ${percent} %</span>
      </div>
      ${progressOpen ? progressForm(state, task) : taskActions(state, task)}
    </li>`;
}

function taskGroup(state, title, tasks, courseById, emptyHtml = '') {
  const content = tasks.length
    ? `<ul class="task-list">${tasks.map((task) => taskCard(state, task, courseById)).join('')}</ul>`
    : emptyHtml;
  if (!content) return '';
  return `
    <section class="task-group" aria-label="${title}">
      <h3>${title} ${tasks.length ? `<span class="count">${tasks.length}</span>` : ''}</h3>
      ${content}
    </section>`;
}

// --- Hele visningen ---

export function renderTasks(state) {
  const { tasks, courses } = state.data;
  const formOpen = Boolean(state.ui.forms.task);

  const header = `
    <div class="view-header">
      <h2>${t.overskrift}</h2>
      ${tasks.length && !formOpen ? `<button class="btn btn-accent" type="button" data-action="open-task">${knapper.nyOppgave}</button>` : ''}
    </div>`;

  if (tasks.length === 0) {
    const empty = tommeTilstander.ingenOppgaver;
    return `
      ${header}
      ${formOpen ? taskForm(state) : ''}
      ${formOpen ? '' : `
        <section class="card">
          <div class="empty-state">
            <img src="${emptyTasksUrl}" alt="" width="160" height="160">
            <h3>${empty.overskrift}</h3>
            <p>${empty.tekst}</p>
            <button class="btn btn-accent" type="button" data-action="open-task">${empty.knapp}</button>
          </div>
        </section>`}`;
  }

  const groups = groupTasks(tasks, state.ui.today);
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const allDone = tommeTilstander.altFerdigIDag;
  const allDoneHtml = `
    <div class="empty-state empty-state-compact">
      <img src="${allDoneUrl}" alt="" width="120" height="120">
      <h4>${allDone.overskrift}</h4>
      <p>${allDone.tekst}</p>
    </div>`;

  return `
    ${header}
    ${renderOverloadWarnings(state)}
    ${formOpen ? taskForm(state) : ''}
    <div class="card task-groups">
      ${taskGroup(state, t.aktive, groups.active, courseById, allDoneHtml)}
      ${taskGroup(state, t.kommende, groups.upcoming, courseById)}
      ${taskGroup(state, t.fullforte, groups.completed, courseById)}
    </div>`;
}
