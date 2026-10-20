// Visning: timeplan – emner (steg 2.1) og faste aktiviteter (steg 2.3)
import {
  emner as te,
  fasteAktiviteter as tf,
  fargeNavn,
  knapper,
  hjelpetekster,
  tommeTilstander,
} from '../tekster.js';
import { COURSE_COLORS, suggestCourseColor } from '../logic/models.js';
import { sortFixedBlocks } from '../logic/recurrence.js';
import { escapeHtml, formErrorSummary, invalidAttrs } from './html.js';
import { formatFixedBlockWhen } from './format.js';
import emptyCalendarUrl from '../../assets/empty-calendar.png';

const isConfirming = (state, kind, id) => state.ui.confirm?.kind === kind && state.ui.confirm.id === id;

// Knappene på en rad i listen, eller spørsmål om sletting
function rowActions(state, kind, id, question) {
  if (isConfirming(state, kind, id)) {
    return `
      <div class="confirm" role="group">
        <p>${escapeHtml(question)}</p>
        <div class="row-actions">
          <button class="btn btn-danger" type="button" data-action="confirm-delete" data-autofocus>${knapper.jaSlett}</button>
          <button class="btn btn-secondary" type="button" data-action="cancel-delete">${knapper.avbryt}</button>
        </div>
      </div>`;
  }
  const edit = kind === 'course' ? 'edit-course' : 'edit-fixed-block';
  return `
    <div class="row-actions">
      <button class="btn btn-secondary btn-small" type="button" data-action="${edit}" data-id="${escapeHtml(id)}">${knapper.rediger}</button>
      <button class="btn btn-secondary btn-small" type="button" data-action="ask-delete" data-kind="${kind}" data-id="${escapeHtml(id)}">${knapper.slett}</button>
    </div>`;
}

function colorDot(color) {
  return `<span class="color-dot" style="--dot: ${escapeHtml(color ?? 'transparent')}" aria-hidden="true"></span>`;
}

// --- Emner ---

function courseForm(state) {
  const form = state.ui.forms.course;
  const errors = form?.errors ?? [];
  const values = form?.values ?? { name: '', color: suggestCourseColor(state.data.courses) };
  const editing = Boolean(values.id);

  const swatches = COURSE_COLORS.map(
    (color) => `
      <label class="swatch" title="${fargeNavn[color]}">
        <input type="radio" name="color" value="${color}"${color === values.color?.toUpperCase() ? ' checked' : ''}>
        <span class="swatch-color" style="--swatch: ${color}"></span>
        <span class="visually-hidden">${fargeNavn[color]}</span>
      </label>`,
  ).join('');

  return `
    <form data-form="course" class="subform" novalidate>
      ${editing ? `<h3>${te.rediger}</h3><input type="hidden" name="id" value="${escapeHtml(values.id)}">` : ''}
      ${formErrorSummary(errors)}
      <div class="form-field">
        <label for="course-name">${te.navn}</label>
        <input id="course-name" name="name" type="text" required placeholder="${te.navnEksempel}"
          value="${escapeHtml(values.name)}"${invalidAttrs(errors, 'name')}${editing && !errors.length ? ' data-autofocus' : ''}>
      </div>
      <fieldset class="form-field">
        <legend>${te.farge}</legend>
        <div class="swatches">${swatches}</div>
      </fieldset>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit">${editing ? knapper.lagre : te.leggTil}</button>
        ${editing ? `<button class="btn btn-secondary" type="button" data-action="cancel-course">${knapper.avbryt}</button>` : ''}
      </div>
    </form>`;
}

function courseSection(state) {
  const { courses } = state.data;
  const list = courses.length
    ? `<ul class="item-list">${courses
        .map(
          (course) => `
          <li class="item">
            <div class="item-main">${colorDot(course.color)}<span class="item-title">${escapeHtml(course.name)}</span></div>
            ${rowActions(state, 'course', course.id, te.slettSporsmal(course.name))}
          </li>`,
        )
        .join('')}</ul>`
    : `<p class="muted">${te.ingen}</p>`;

  return `
    <section class="card" aria-labelledby="courses-title">
      <h2 id="courses-title">${te.overskrift}</h2>
      ${list}
      ${courseForm(state)}
    </section>`;
}

// --- Faste aktiviteter ---

function fixedBlockForm(state) {
  const { values, errors } = state.ui.forms.fixedBlock;
  const editing = Boolean(values.id);
  const options = state.data.courses
    .map(
      (course) =>
        `<option value="${escapeHtml(course.id)}"${course.id === values.course_id ? ' selected' : ''}>${escapeHtml(course.name)}</option>`,
    )
    .join('');

  return `
    <form data-form="fixedBlock" class="subform" novalidate aria-labelledby="fixed-form-title">
      <h3 id="fixed-form-title">${editing ? tf.rediger : tf.ny}</h3>
      ${editing ? `<input type="hidden" name="id" value="${escapeHtml(values.id)}">` : ''}
      ${formErrorSummary(errors)}
      <p class="field-help">${hjelpetekster.fastAktivitet}</p>

      <div class="form-row">
        <div class="form-field">
          <label for="fixed-title">${tf.tittel}</label>
          <input id="fixed-title" name="title" type="text" required placeholder="${tf.tittelEksempel}"
            value="${escapeHtml(values.title)}"${invalidAttrs(errors, 'title')}${errors.length ? '' : ' data-autofocus'}>
        </div>
        <div class="form-field">
          <label for="fixed-course">${tf.emne}</label>
          <select id="fixed-course" name="course_id">
            <option value="">${tf.utenEmne}</option>
            ${options}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-field">
          <label for="fixed-date">${tf.dato}</label>
          <input id="fixed-date" name="date" type="date" required aria-describedby="fixed-date-help"
            value="${escapeHtml(values.date)}"${invalidAttrs(errors, 'date')}>
        </div>
        <div class="form-field">
          <label for="fixed-start">${tf.start}</label>
          <input id="fixed-start" name="start" type="time" required
            value="${escapeHtml(values.start)}"${invalidAttrs(errors, 'start')}>
        </div>
        <div class="form-field">
          <label for="fixed-end">${tf.slutt}</label>
          <input id="fixed-end" name="end" type="time" required
            value="${escapeHtml(values.end)}"${invalidAttrs(errors, 'end')}>
        </div>
      </div>
      <p id="fixed-date-help" class="field-help">${tf.datoHjelp}</p>

      <div class="form-field checkbox">
        <input id="fixed-weekly" name="weekly" type="checkbox"${values.weekly === 'on' ? ' checked' : ''}>
        <label for="fixed-weekly">${tf.ukentlig}</label>
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" type="submit">${knapper.lagre}</button>
        <button class="btn btn-secondary" type="button" data-action="cancel-fixed-block">${knapper.avbryt}</button>
      </div>
    </form>`;
}

function fixedBlockSection(state) {
  const blocks = sortFixedBlocks(state.data.blocks.filter((block) => block.is_fixed));
  const formOpen = Boolean(state.ui.forms.fixedBlock);
  const courseById = new Map(state.data.courses.map((course) => [course.id, course]));

  let content;
  if (blocks.length) {
    content = `<ul class="item-list">${blocks
      .map((block) => {
        const course = courseById.get(block.course_id);
        return `
          <li class="item">
            <div class="item-main">
              ${colorDot(course?.color)}
              <div>
                <span class="item-title">${escapeHtml(block.title)}</span>
                <span class="item-meta">${escapeHtml(formatFixedBlockWhen(block))}${course ? ` · ${escapeHtml(course.name)}` : ''}</span>
              </div>
            </div>
            ${rowActions(state, 'fixedBlock', block.id, tf.slettSporsmal(block.title))}
          </li>`;
      })
      .join('')}</ul>`;
  } else if (!formOpen) {
    const empty = tommeTilstander.tomKalender;
    content = `
      <div class="empty-state">
        <img src="${emptyCalendarUrl}" alt="" width="160" height="160">
        <h3>${empty.overskrift}</h3>
        <p>${empty.tekst}</p>
        <button class="btn btn-accent" type="button" data-action="open-fixed-block">${empty.knapp}</button>
      </div>`;
  } else {
    content = '';
  }

  const addButton =
    blocks.length && !formOpen
      ? `<button class="btn btn-accent" type="button" data-action="open-fixed-block">${knapper.nyAktivitet}</button>`
      : '';

  return `
    <section class="card" aria-labelledby="fixed-title">
      <h2 id="fixed-title">${tf.overskrift}</h2>
      ${content}
      ${formOpen ? fixedBlockForm(state) : addButton}
    </section>`;
}

export function renderTimeplan(state) {
  return `${fixedBlockSection(state)}${courseSection(state)}`;
}
