// Eksport til kalenderfil (.ics): knapp og skjema. Brukes i kalendervisningen og under Innstillinger.
import { eksport as t, knapper } from '../tekster.js';
import { EXPORT_INCLUDE, EXPORT_WEEKS } from '../logic/ics.js';
import { escapeHtml, formErrorSummary } from './html.js';

export function exportButton(buttonClass = 'btn btn-secondary') {
  return `<button class="${buttonClass}" type="button" data-action="open-export">${t.knapp}</button>`;
}

// Skjemaet, eller ingenting når det ikke er åpent
export function exportPanel(state) {
  const form = state.ui.forms.export;
  if (!form) return '';
  const { values, errors } = form;

  const choices = EXPORT_INCLUDE.map(
    (value) => `
      <label class="radio">
        <input type="radio" name="include" value="${value}"${values.include === value ? ' checked' : ''}>
        <span>${t.valg[value]}</span>
      </label>`,
  ).join('');
  const weeks = EXPORT_WEEKS.map(
    (count) => `<option value="${count}"${String(count) === values.weeks ? ' selected' : ''}>${t.uker(count)}</option>`,
  ).join('');

  return `
    <section class="card export-panel" aria-labelledby="export-title">
      <form data-form="export" novalidate>
        <h2 id="export-title">${t.overskrift}</h2>
        ${formErrorSummary(errors)}
        <fieldset class="form-field">
          <legend>${t.hvaMed}</legend>
          <div class="radio-group">${choices}</div>
        </fieldset>
        <div class="form-field">
          <label for="export-weeks">${t.periode}</label>
          <select id="export-weeks" name="weeks">${weeks}</select>
        </div>
        <p class="field-help">${escapeHtml(t.hjelp)}</p>
        <p class="field-help">${escapeHtml(t.importHjelp)}</p>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit"${errors.length ? '' : ' data-autofocus'}>${t.lastNed}</button>
          <button class="btn btn-secondary" type="button" data-action="cancel-export">${knapper.avbryt}</button>
        </div>
      </form>
    </section>`;
}
