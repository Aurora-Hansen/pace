// Små hjelpere for å bygge HTML som tekst
import { feilmeldinger } from '../tekster.js';
import { primaryError } from '../logic/validation.js';

// Brukerens tekst må escapes før den settes inn i HTML
export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Feilmelding øverst i et skjema. Får fokus etter tegning, så skjermlesere leser den.
export function formErrorSummary(errors) {
  const error = primaryError(errors);
  if (!error) return '';
  const message = feilmeldinger[error.code];
  return `
    <div class="form-error" role="alert" tabindex="-1" data-autofocus>
      <strong>${escapeHtml(message.overskrift)}</strong>
      <p>${escapeHtml(message.tekst)}</p>
    </div>`;
}

// Attributter for et felt som har feil
export function invalidAttrs(errors, field) {
  return errors.some((error) => error.field === field) ? ' aria-invalid="true"' : '';
}
