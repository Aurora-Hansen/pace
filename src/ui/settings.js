// Visning: innstillinger (steg 1.4)
import { innstillinger as t, hjelpetekster, knapper, bekreftelser } from '../tekster.js';
import { escapeHtml, formErrorSummary, invalidAttrs } from './html.js';

export function renderSettings(state) {
  const form = state.ui.forms.settings;
  const errors = form?.errors ?? [];
  // Viser det brukeren skrev hvis skjemaet hadde feil, ellers det som er lagret
  const values = form?.values ?? state.data.user;
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
          <input id="settings-hours" name="daily_available_study_hours" type="number"
            inputmode="decimal" min="0.5" max="24" step="0.5" required
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
