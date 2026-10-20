// Lys og mørk modus: knapp i headeren og valg under Innstillinger
import { utseende as t } from '../tekster.js';
import { THEMES } from '../logic/theme.js';

const sun = '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>';
const moon = '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>';

// Viser solen i mørk modus (bytt til lyst) og månen i lys modus (bytt til mørkt)
export function themeToggle(current) {
  const dark = current === 'dark';
  return `
    <button class="theme-toggle" type="button" data-action="toggle-theme" aria-label="${dark ? t.tilLyst : t.tilMorkt}">
      <svg viewBox="0 0 24 24" aria-hidden="true">${dark ? sun : moon}</svg>
    </button>`;
}

export function themeSettings(state) {
  const options = THEMES.map(
    (theme) => `
      <label class="radio">
        <input type="radio" name="theme" value="${theme}" data-action="set-theme" data-theme="${theme}"${state.ui.theme === theme ? ' checked' : ''}>
        <span>${t.valg[theme]}</span>
      </label>`,
  ).join('');

  return `
    <section class="card" aria-labelledby="theme-title">
      <h2 id="theme-title">${t.overskrift}</h2>
      <fieldset class="form-field">
        <legend class="muted">${t.tekst}</legend>
        <div class="radio-group">${options}</div>
      </fieldset>
    </section>`;
}
