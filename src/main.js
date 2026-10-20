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
  task: (values) => actions.submitTask(values, newId(), now()),
  progress: (values) => actions.submitProgress(values),
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
  'edit-task': actions.editTask,
  'cancel-task': actions.cancelTaskForm,
  'open-progress': actions.openProgressForm,
  'cancel-progress': actions.cancelProgressForm,
  'complete-task': actions.markTaskDone,
  'reopen-task': actions.reopenTaskAction,
  'ask-delete': actions.askDelete,
  'cancel-delete': actions.cancelDelete,
  'confirm-delete': actions.confirmDelete,
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
  if (action) store.update(action({ ...button.dataset }));
});

store.start();
