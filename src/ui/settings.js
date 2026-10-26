// Visning: innstillinger (steg 1.4)
import {
  innstillinger as t,
  hjelpetekster,
  knapper,
  bekreftelser,
  data as tData,
  veiviser,
  sikkerhetskopi as tBackup,
  feilmeldinger,
} from '../tekster.js';
import { formatLongDate } from './format.js';
import { toDateKey } from '../logic/dates.js';
import { sampleDataButton } from './sample.js';
import { exportButton, exportPanel } from './export.js';
import { themeSettings } from './theme.js';
import { escapeHtml, formErrorSummary, invalidAttrs } from './html.js';
import { numberToInput } from '../logic/models.js';

// Eksempeldata og sletting av alle data
function dataSection(state) {
  const confirmReset = state.ui.confirm?.kind === 'reset';
  const reset = confirmReset
    ? `
      <div class="confirm">
        <p>${tData.slettSporsmal}</p>
        <div class="row-actions">
          <button class="btn btn-danger btn-small" type="button" data-action="confirm-reset" data-autofocus>${tData.jaSlettAlt}</button>
          <button class="btn btn-secondary btn-small" type="button" data-action="cancel-delete">${knapper.avbryt}</button>
        </div>
      </div>`
    : `<button class="btn btn-danger" type="button" data-action="clear-all">${tData.slettAlt}</button>`;

  return `
    <section class="card" aria-labelledby="data-title">
      <h2 id="data-title">${tData.overskrift}</h2>
      <p class="muted">${tData.tekst}</p>
      <div class="data-actions">
        ${state.ui.forms.export || state.ui.confirm ? '' : exportButton()}
        ${confirmReset ? '' : sampleDataButton(state)}
        ${state.ui.confirm?.kind === 'sample' ? '' : reset}
      </div>
    </section>`;
}

// Sikkerhetskopi: last ned og gjenopprett. Importen viser enten spørsmål eller feil før noe endres.
function importResult(importState) {
  if (!importState) return '';
  if (importState.error) {
    const message = feilmeldinger[importState.error];
    const where = importState.where && tBackup.hvor[importState.where];
    const detail = where ? tBackup.feilGjelder(typeof where === 'function' ? where(importState.index + 1) : where) : '';
    return `
      <div class="form-error" role="alert" tabindex="-1" data-autofocus>
        <strong>${escapeHtml(message.overskrift)}</strong>
        <p>${escapeHtml(message.tekst)}${detail ? ` ${escapeHtml(detail)}` : ''}</p>
        <button class="btn btn-secondary btn-small" type="button" data-action="cancel-import">${knapper.lukk}</button>
      </div>`;
  }
  const { counts, exportedAt } = importState;
  const question = tBackup.sporsmal({
    emner: counts.courses,
    oppgaver: counts.tasks,
    aktiviteter: counts.fixed,
    dato: exportedAt ? formatLongDate(toDateKey(new Date(exportedAt))) : null,
  });
  return `
    <div class="confirm" role="alertdialog" aria-label="${tBackup.velgFil}">
      <p>${escapeHtml(question)}</p>
      <div class="row-actions">
        <button class="btn btn-primary btn-small" type="button" data-action="confirm-import" data-autofocus>${tBackup.jaErstatt}</button>
        <button class="btn btn-secondary btn-small" type="button" data-action="cancel-import">${knapper.avbryt}</button>
      </div>
    </div>`;
}

function backupSection(state) {
  return `
    <section class="card" aria-labelledby="backup-title">
      <h2 id="backup-title">${tBackup.overskrift}</h2>
      <p class="muted">${tBackup.tekst}</p>
      ${importResult(state.ui.importState)}
      ${state.ui.importState ? '' : `
        <div class="data-actions">
          <button class="btn btn-secondary" type="button" data-action="export-backup">${tBackup.lastNed}</button>
          <input class="visually-hidden file-input" id="backup-file" type="file" accept=".json,application/json" data-import>
          <label class="btn btn-secondary" for="backup-file">${tBackup.velgFil}</label>
        </div>`}
    </section>`;
}

function wizardSection() {
  const t = veiviser.innstillinger;
  return `
    <section class="card" aria-labelledby="wizard-settings-title">
      <h2 id="wizard-settings-title">${t.overskrift}</h2>
      <p class="muted">${t.tekst}</p>
      <button class="btn btn-secondary" type="button" data-action="restart-wizard">${t.knapp}</button>
    </section>`;
}

export function renderSettings(state) {
  return `${settingsForm(state)}${themeSettings(state)}${dataSection(state)}${exportPanel(state)}${backupSection(state)}${wizardSection()}`;
}

function settingsForm(state) {
  const form = state.ui.forms.settings;
  const errors = form?.errors ?? [];
  // Viser det brukeren skrev hvis skjemaet hadde feil, ellers det som er lagret
  const { user } = state.data;
  const values = form?.values ?? {
    ...user,
    daily_available_study_hours: numberToInput(user.daily_available_study_hours),
  };
  const notice = state.ui.notice === 'INNSTILLINGER_LAGRET' ? bekreftelser.INNSTILLINGER_LAGRET : '';

  return `
    <section class="card settings" aria-labelledby="settings-title">
      <h2 id="settings-title">${t.overskrift}</h2>
      <form data-form="settings" novalidate>
        ${formErrorSummary(errors)}

        <div class="form-field">
          <label for="settings-name">${t.navn}</label>
          <input id="settings-name" name="name" type="text" autocomplete="given-name"
            value="${escapeHtml(values.name)}"${invalidAttrs(errors, 'name')}>
        </div>

        <div class="form-field">
          <label for="settings-hours">${t.dagligKapasitet}</label>
          <input id="settings-hours" name="daily_available_study_hours" type="text"
            inputmode="decimal" autocomplete="off" required
            aria-describedby="settings-hours-help"
            value="${escapeHtml(values.daily_available_study_hours)}"${invalidAttrs(errors, 'daily_available_study_hours')}>
          <p id="settings-hours-help" class="field-help">${hjelpetekster.dagligKapasitet}</p>
        </div>

        <fieldset class="form-field">
          <div class="form-row">
            <div>
              <label for="settings-start">${t.studietidFra}</label>
              <input id="settings-start" name="study_window_start" type="time" required
                aria-describedby="settings-window-help"
                value="${escapeHtml(values.study_window_start)}"${invalidAttrs(errors, 'study_window_start')}>
            </div>
            <div>
              <label for="settings-end">${t.studietidTil}</label>
              <input id="settings-end" name="study_window_end" type="time" required
                aria-describedby="settings-window-help"
                value="${escapeHtml(values.study_window_end)}"${invalidAttrs(errors, 'study_window_end')}>
            </div>
          </div>
          <p id="settings-window-help" class="field-help">${t.studievindu}</p>
        </fieldset>

        <div class="form-actions">
          <button class="btn btn-primary" type="submit">${knapper.lagre}</button>
          <p class="form-notice" role="status">${notice}</p>
        </div>
      </form>
    </section>`;
}
