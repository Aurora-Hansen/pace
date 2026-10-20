// Varsel når arbeid hoper seg opp (steg 6.2). Vises øverst i «I dag» og «Oppgaver».
import {
  hoperSegOpp,
  overbelastning as t,
  knapper,
  innstillinger,
  oppgaver,
} from '../tekster.js';
import { escapeHtml, formErrorSummary, invalidAttrs } from './html.js';
import { formatDeadline, formatRelativeDay } from './format.js';

// Skjemaet «Juster arbeidsmengde»: daglig kapasitet, estimat og frist
function adjustForm(state) {
  const { values, errors } = state.ui.forms.adjust;
  const field = (name, label, attrs = '') => `
    <div class="form-field">
      <label for="adjust-${name}">${label}</label>
      <input id="adjust-${name}" name="${name}" ${attrs} value="${escapeHtml(values[name])}"${invalidAttrs(errors, name === 'deadline_date' ? 'deadline' : name)}>
    </div>`;

  return `
    <form data-form="adjust" class="adjust-form" novalidate>
      <input type="hidden" name="task_id" value="${escapeHtml(values.task_id)}">
      ${formErrorSummary(errors)}
      <div class="form-row">
        ${field('daily_available_study_hours', innstillinger.dagligKapasitet, `type="text" inputmode="decimal" autocomplete="off"${errors.length ? '' : ' data-autofocus'}`)}
        ${field('estimated_hours', oppgaver.estimat, 'type="text" inputmode="decimal" autocomplete="off"')}
      </div>
      <div class="form-row">
        ${field('deadline_date', oppgaver.fristDato, 'type="date"')}
        ${field('deadline_time', oppgaver.fristTid, 'type="time"')}
      </div>
      <div class="form-actions">
        <button class="btn btn-primary btn-small" type="submit">${knapper.lagre}</button>
        <button class="btn btn-secondary btn-small" type="button" data-action="cancel-adjust">${knapper.avbryt}</button>
      </div>
    </form>`;
}

function warning(state, risk, task) {
  const id = escapeHtml(task.id);
  const parts = hoperSegOpp.tekstDeler({ antall: risk.hoursNeeded, dag: formatRelativeDay(risk.day, state.ui.today) });
  const adjusting = state.ui.forms.adjust?.values.task_id === task.id;

  return `
    <section class="alert-warning overload" aria-labelledby="overload-${id}">
      <h3 id="overload-${id}">${hoperSegOpp.overskrift}</h3>
      <p class="overload-task">${escapeHtml(t.oppgave(task.title, formatDeadline(task.deadline)))}</p>
      <p>${escapeHtml(parts.for)}<strong>${escapeHtml(parts.uthevet)}</strong>${escapeHtml(parts.etter)}</p>
      ${adjusting
        ? adjustForm(state)
        : `<div class="row-actions">
            ${task.allow_over_capacity ? '' : `<button class="btn btn-accent btn-small" type="button" data-action="redistribute" data-id="${id}">${hoperSegOpp.knapper.fordelPaNytt}</button>`}
            <button class="btn btn-secondary btn-small" type="button" data-action="keep-plan" data-id="${id}">${hoperSegOpp.knapper.beholdPlanen}</button>
            <button class="btn btn-secondary btn-small" type="button" data-action="open-adjust" data-id="${id}">${knapper.justerArbeidsmengde}</button>
          </div>`}
    </section>`;
}

export function renderOverloadWarnings(state) {
  const taskById = new Map(state.data.tasks.map((task) => [task.id, task]));
  return state.ui.overload.atRisk
    .filter((risk) => !state.ui.dismissedOverload.includes(risk.taskId) && taskById.has(risk.taskId))
    .map((risk) => warning(state, risk, taskById.get(risk.taskId)))
    .join('');
}
