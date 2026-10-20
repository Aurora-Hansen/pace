// Den felles render-funksjonen. Tegner hele appen ut fra tilstanden.
// Kalles av store etter hver endring – aldri direkte fra hendelser.
import { feilmeldinger, knapper, navigasjon, testmodus } from '../tekster.js';
import { toDateKey } from '../logic/dates.js';
import { escapeHtml } from './html.js';
import { formatFullDate, formatClock } from './format.js';
import { renderSettings } from './settings.js';
import { renderTimeplan } from './timeplan.js';
import { renderCalendar } from './calendar.js';
import { renderTasks } from './tasks.js';
import logoUrl from '../../assets/logo.png';

// Rekkefølgen her er rekkefølgen i menyen
const views = {
  kalender: renderCalendar,
  oppgaver: renderTasks,
  timeplan: renderTimeplan,
  innstillinger: renderSettings,
};

function header(state) {
  const tabs = Object.keys(views)
    .map((view) => {
      const current = state.ui.view === view ? ' aria-current="page"' : '';
      return `<button class="nav-tab" type="button" data-action="show-view" data-view="${view}"${current}>${navigasjon[view]}</button>`;
    })
    .join('');

  return `
    <header class="app-header">
      <a class="app-logo" href="index.html">
        <img src="${logoUrl}" alt="" width="32" height="32">
        <span>Pace</span>
      </a>
      <nav class="app-nav" aria-label="${navigasjon.meny}">${tabs}</nav>
    </header>`;
}

// Viser tydelig at datoen er simulert med ?dato=
function testBanner(simulatedNow) {
  if (!simulatedNow) return '';
  const date = new Date(simulatedNow);
  const label = `${formatFullDate(toDateKey(date))} kl. ${formatClock(date)}`;
  return `<div class="test-banner" role="status">${escapeHtml(testmodus.banner(label))}</div>`;
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
    ${testBanner(state.ui.simulatedNow)}
    ${header(state)}
    <main class="app-main app-main-${state.ui.view}">
      ${errorBanner(state.ui.error)}
      ${views[state.ui.view](state)}
    </main>`;

  root.querySelector('[data-autofocus]')?.focus();
}
