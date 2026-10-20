// Starter appen: henter lagrede data, lager store og kobler hendelser til endringer.
import { load, save } from './data/storage.js';
import { createStore } from './data/store.js';
import { createInitialUi, submitSettings, dismissError } from './data/actions.js';
import { createInitialState } from './logic/models.js';
import { render } from './ui/render.js';

const root = document.querySelector('#app');

const loaded = load();
const data = loaded.state ?? createInitialState({ userId: crypto.randomUUID() });

const store = createStore({
  state: { data, ui: createInitialUi({ error: loaded.error }) },
  save,
  render: (state) => render(state, root),
});

// Skjema: data-form="navn" → endring som får skjemaverdiene
const formActions = {
  settings: submitSettings,
};

// Knapper: data-action="navn" → endring
const clickActions = {
  'dismiss-error': dismissError,
};

root.addEventListener('submit', (event) => {
  const action = formActions[event.target.dataset.form];
  if (!action) return;
  event.preventDefault();
  store.update(action(Object.fromEntries(new FormData(event.target))));
});

root.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  const action = clickActions[button?.dataset.action];
  if (action) store.update(action());
});

store.start();
