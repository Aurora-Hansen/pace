// Den felles render-funksjonen. Tegner hele appen ut fra tilstanden.
// Kalles av store etter hver endring – aldri direkte fra hendelser.
import { feilmeldinger, knapper } from '../tekster.js';
import { escapeHtml } from './html.js';
import { renderSettings } from './settings.js';
import logoUrl from '../../assets/logo.png';

function header() {
  return `
    <header class="app-header">
      <a class="app-logo" href="index.html">
        <img src="${logoUrl}" alt="" width="32" height="32">
        <span>Pace</span>
      </a>
    </header>`;
}

// Feil som gjelder hele appen, f.eks. at lagring feilet
function errorBanner(code) {
  if (!code) return '';
  const message = feilmeldinger[code];
  return `
    <div class="error-banner" role="alert">
      <div>
        <strong>${escapeHtml(message.overskrift)}</strong>
        <p>${escapeHtml(message.tekst)}</p>
      </div>
      <button class="btn btn-secondary" type="button" data-action="dismiss-error">${knapper.lukk}</button>
    </div>`;
}

export function render(state, root) {
  root.innerHTML = `
    ${header()}
    <main class="app-main">
      ${errorBanner(state.ui.error)}
      ${renderSettings(state)}
    </main>`;

  root.querySelector('[data-autofocus]')?.focus();
}
