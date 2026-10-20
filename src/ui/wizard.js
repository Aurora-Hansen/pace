// Førstegangsveiviser i tre steg (dialog). Resten av siden er `inert` mens den er åpen.
import { veiviser as t, hjelpetekster, fasteAktiviteter, oppgaver, innstillinger } from '../tekster.js';
import { WIZARD_STEPS } from '../data/actions.js';
import { numberToInput } from '../logic/models.js';
import { escapeHtml, formErrorSummary, invalidAttrs } from './html.js';

function input(id, name, label, values, errors, attrs = '', errorField = name) {
  return `
    <div class="form-field">
      <label for="${id}">${label}</label>
      <input id="${id}" name="${name}" ${attrs} value="${escapeHtml(values[name])}"${invalidAttrs(errors, errorField)}>
    </div>`;
}

function stepFields(state) {
  const { step, values, errors } = state.ui.wizard;

  if (step === 1) {
    const current = values.daily_available_study_hours ?? numberToInput(state.data.user.daily_available_study_hours);
    return `
      ${input('wizard-hours', 'daily_available_study_hours', innstillinger.dagligKapasitet, { daily_available_study_hours: current }, errors,
        'type="text" inputmode="decimal" autocomplete="off" aria-describedby="wizard-hours-help"')}
      <p id="wizard-hours-help" class="field-help">${hjelpetekster.dagligKapasitet}</p>`;
  }

  if (step === 2) {
    const weekly = values.title === undefined || values.weekly === 'on';
    return `
      ${input('wizard-title', 'title', fasteAktiviteter.tittel, values, errors, `type="text" placeholder="${fasteAktiviteter.tittelEksempel}"`)}
      <div class="form-row">
        ${input('wizard-date', 'date', fasteAktiviteter.dato, values, errors, 'type="date"')}
        ${input('wizard-start', 'start', fasteAktiviteter.start, values, errors, 'type="time"')}
        ${input('wizard-end', 'end', fasteAktiviteter.slutt, values, errors, 'type="time"')}
      </div>
      <div class="form-field checkbox">
        <input id="wizard-weekly" name="weekly" type="checkbox"${weekly ? ' checked' : ''}>
        <label for="wizard-weekly">${fasteAktiviteter.ukentlig}</label>
      </div>
      <p class="field-help">${hjelpetekster.fastAktivitet}</p>`;
  }

  return `
    ${input('wizard-task', 'title', oppgaver.tittel, values, errors, `type="text" placeholder="${oppgaver.tittelEksempel}"`)}
    <div class="form-row">
      ${input('wizard-estimate', 'estimated_hours', oppgaver.estimat, values, errors, 'type="text" inputmode="decimal" autocomplete="off"')}
      ${input('wizard-deadline', 'deadline_date', oppgaver.fristDato, values, errors, 'type="date"', 'deadline')}
    </div>`;
}

export function renderWizard(state) {
  const wizard = state.ui.wizard;
  if (!wizard) return '';
  const { step, errors } = wizard;
  const content = t[`steg${step}`];
  const last = step === WIZARD_STEPS;
  const dots = Array.from({ length: WIZARD_STEPS }, (_, i) => `<span class="wizard-dot${i + 1 <= step ? ' is-active' : ''}"></span>`).join('');

  return `
    <div class="wizard-backdrop">
      <div class="wizard" role="dialog" aria-modal="true" aria-labelledby="wizard-heading" aria-describedby="wizard-intro">
        <div class="wizard-top">
          <p class="wizard-title">${t.tittel}</p>
          <button class="wizard-close" type="button" data-action="close-wizard" aria-label="${t.lukk}">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div class="wizard-progress" aria-hidden="true">${dots}</div>
        <form data-form="wizard" novalidate>
          <h2 id="wizard-heading" tabindex="-1"${errors.length ? '' : ' data-autofocus'}>
            <span class="wizard-step">${t.steg(step, WIZARD_STEPS)}:</span> ${content.overskrift}
          </h2>
          <p id="wizard-intro">${content.tekst}</p>
          ${formErrorSummary(errors)}
          ${stepFields(state)}
          <div class="form-actions">
            <button class="btn btn-primary" type="submit" name="intent" value="next">${last ? t.ferdig : t.neste}</button>
            <button class="btn btn-secondary" type="submit" name="intent" value="skip">${t.hoppOver}</button>
          </div>
        </form>
      </div>
    </div>`;
}
