// Starter appen: henter lagrede data, lager store og kobler hendelser til endringer.
import { load, save } from './data/storage.js';
import { createStore } from './data/store.js';
import * as actions from './data/actions.js';
import { createInitialState } from './logic/models.js';
import { toDateKey } from './logic/dates.js';
import { now, isSimulated } from './data/clock.js';
import { render } from './ui/render.js';

const root = document.querySelector('#app');
const newId = () => crypto.randomUUID();

const loaded = load();
const data = loaded.state ?? createInitialState({ userId: newId() });

// Ukevisningen er for trang på mobil, så smale skjermer starter i dagsvisning
const calendarMode = window.matchMedia('(max-width: 40rem)').matches ? 'day' : 'week';

const startNow = now();

const store = createStore({
  state: {
    data,
    ui: actions.createInitialUi({
      error: loaded.error,
      today: toDateKey(startNow),
      calendarMode,
      simulatedNow: isSimulated() ? startNow.toISOString() : null,
    }),
  },
  save,
  render: (state) => render(state, root),
});

// Skjema: data-form="navn" → endring som får skjemaverdiene
const formActions = {
  settings: (values) => actions.submitSettings(values),
  course: (values) => actions.submitCourse(values, newId()),
  fixedBlock: (values) => actions.submitFixedBlock(values, newId()),
  // Oppgaveskjemaet har tre knapper: lagre, «Foreslå tidsbruk» og «Bruk forslaget»
  task: (values) => {
    if (values.intent === 'estimate') return actions.suggestEstimate(values);
    if (values.intent === 'use-estimate') return actions.useEstimate(values);
    return actions.submitTask(values, newId(), now());
  },
  progress: (values) => actions.submitProgress(values),
  adjust: (values) => actions.submitAdjust(values, now()),
};

// Knapper: data-action="navn" → endring som får knappens data-attributter
const clickActions = {
  'show-view': actions.showView,
  'dismiss-error': actions.dismissError,
  'calendar-mode': actions.setCalendarMode,
  'calendar-step': actions.stepCalendar,
  'calendar-today': actions.calendarToday,
  'calendar-open-day': actions.openCalendarDay,
  'add-fixed-from-calendar': actions.addFixedBlockFromCalendar,
  'edit-fixed-from-calendar': actions.editFixedBlockFromCalendar,
  'edit-course': actions.editCourse,
  'cancel-course': actions.cancelCourseForm,
  'open-fixed-block': actions.openFixedBlockForm,
  'edit-fixed-block': actions.editFixedBlock,
  'cancel-fixed-block': actions.cancelFixedBlockForm,
  'open-task': actions.openTaskForm,
  'open-task-from-today': actions.openTaskFromToday,
  'edit-task': actions.editTask,
  'cancel-task': actions.cancelTaskForm,
  'open-progress': actions.openProgressForm,
  'cancel-progress': actions.cancelProgressForm,
  'complete-task': actions.markTaskDone,
  'reopen-task': actions.reopenTaskAction,
  'toggle-session': actions.toggleSession,
  redistribute: actions.redistributeTask,
  'keep-plan': actions.keepPlan,
  'open-adjust': actions.openAdjustForm,
  'cancel-adjust': actions.cancelAdjustForm,
  'load-sample': () => actions.requestSampleData(now()),
  'confirm-sample': () => actions.loadSampleData(now()),
  'clear-all': actions.askClearAll,
  'confirm-reset': actions.clearAllData,
  'dismiss-notice': actions.dismissNotice,
  'ask-delete': actions.askDelete,
  'cancel-delete': actions.cancelDelete,
  'confirm-delete': actions.confirmDelete,
};

// Alle endringer går via withReplan, så planen bygges på nytt når lagrede data endres
root.addEventListener('submit', (event) => {
  const action = formActions[event.target.dataset.form];
  if (!action) return;
  event.preventDefault();
  // `submitter` tar med navnet på knappen som ble trykket (f.eks. intent=estimate)
  const values = Object.fromEntries(new FormData(event.target, event.submitter));
  store.update(actions.withReplan(action(values), now()));
});

root.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  const action = clickActions[button?.dataset.action];
  if (action) store.update(actions.withReplan(action({ ...button.dataset }), now()));
});

// Daglig sjekk når appen åpnes, og når den vises igjen etter å ha stått åpen over midnatt
store.start();
store.update(actions.startDay(startNow));
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) store.update(actions.newDay(now()));
});
