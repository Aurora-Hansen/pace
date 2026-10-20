// Landingssiden: bare knappen for lys/mørk modus. Resten av siden er vanlig HTML.
// Valget lagres på samme måte som i appen, så det gjelder begge sidene.
import { loadTheme, saveTheme } from './data/storage.js';
import { effectiveTheme, toggledTheme } from './logic/theme.js';
import { themeToggle } from './ui/theme.js';

const slot = document.querySelector('#theme-toggle-slot');
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
let theme = loadTheme();

function draw() {
  slot.innerHTML = themeToggle(effectiveTheme(theme, darkQuery.matches));
}

slot.addEventListener('click', (event) => {
  if (!event.target.closest('[data-action="toggle-theme"]')) return;
  theme = toggledTheme(theme, darkQuery.matches);
  document.documentElement.dataset.theme = theme;
  saveTheme(theme);
  draw();
  slot.querySelector('button').focus();
});

darkQuery.addEventListener('change', draw);
draw();
