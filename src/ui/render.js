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
import { renderToday } from './today.js';
import logoUrl from '../images/logo-64.png';

// Rekkefølgen her er rekkefølgen i menyen
const views = {
  idag: renderToday,
  kalender: renderCalendar,
  oppgaver: renderTasks,
  timeplan: renderTimeplan,
  innstillinger: renderSettings,
};

// Ikoner i menyen. Vises bare i bunnmenyen på smale skjermer.
const icons = {
  idag: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  kalender: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  oppgaver: '<path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10M4.5 6.5h.01M4.5 12h.01M4.5 17.5h.01"/>',
  timeplan: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  innstillinger: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
};

function header(state) {
  const tabs = Object.keys(views)
    .map((view) => {
      const current = state.ui.view === view ? ' aria-current="page"' : '';
      return `
        <button class="nav-tab" type="button" data-action="show-view" data-view="${view}"${current}>
          <svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[view]}</svg>
          <span>${navigasjon[view]}</span>
        </button>`;
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
    <main id="innhold" class="app-main app-main-${state.ui.view}" tabindex="-1">
      <h1 class="visually-hidden">Pace – ${navigasjon[state.ui.view]}</h1>
      ${errorBanner(state.ui.error)}
      ${views[state.ui.view](state)}
    </main>`;

  root.querySelector('[data-autofocus]')?.focus();
}
