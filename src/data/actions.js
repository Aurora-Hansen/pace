// Endringer som sendes til store.update. Hver funksjon tar inn det den trenger
// og returnerer en ren funksjon state → nyState.
// Nye id-er sendes inn fra main.js, så endringene forblir rene.
import {
  parseNumber,
  numberToInput,
  createCourse,
  fixedBlockFromInput,
  fixedBlockToInput,
  taskFromInput,
  updateTaskFromInput,
  taskToInput,
  deadlineFromInput,
} from '../logic/models.js';
import {
  ERRORS,
  validateSettings,
  validateCourse,
  validateFixedBlockInput,
  validateTask,
  validateProgressInput,
} from '../logic/validation.js';
import { registerProgress, completeTask, reopenTask } from '../logic/progress.js';
import { addDays, isValidDateKey, toDateKey } from '../logic/dates.js';
import { replan, rollover } from '../logic/rollover.js';
import { completeSession, uncompleteSession } from '../logic/today.js';
import { detectOverload } from '../logic/overload.js';

export const VIEWS = ['idag', 'kalender', 'oppgaver', 'timeplan', 'innstillinger'];

// `today` er dagens dato (datonøkkel) fra clock.js når appen starter.
// `calendarMode` lar main.js starte med dagsvisning på smale skjermer.
// `simulatedNow` er ISO-tidspunktet når datoen er simulert med ?dato=, ellers null.
export function createInitialUi({ error = null, today, calendarMode = 'week', simulatedNow = null }) {
  return {
    view: 'idag',
    today,
    simulatedNow,
    calendar: { mode: calendarMode, date: today },
    // Regnes ut sammen med planen (withReplan og startDay), så render ikke trenger «nå»
    overload: { atRisk: [], overloadedDays: [] },
    // Oppgaver der brukeren har valgt «Behold planen» (bare til appen lastes på nytt)
    dismissedOverload: [],
    error,
    notice: null,
    confirm: null,
    forms: {},
  };
}

function withUi(state, changes) {
  return { ...state, ui: { ...state.ui, ...changes } };
}

function withForm(state, name, form) {
  return withUi(state, { notice: null, forms: { ...state.ui.forms, [name]: form } });
}

function withoutForm(ui, name) {
  const { [name]: _removed, ...forms } = ui.forms;
  return { ...ui, forms };
}

// Lagrer data og lukker skjemaet
function saveAndCloseForm(state, data, formName) {
  return { data: { ...state.data, ...data }, ui: withoutForm(state.ui, formName) };
}

const replaceById = (list, item) => list.map((existing) => (existing.id === item.id ? item : existing));

// --- Planlegging (steg 5.6) ---

const withOverload = (state, now) => withUi(state, { overload: detectOverload(state.data, now) });

// Kjører en endring og bygger planen på nytt hvis lagrede data ble endret (antakelse 3)
export const withReplan = (change, now) => (state) => {
  const next = change(state);
  if (next === state || next.data === state.data) return next;
  return withOverload({ ...next, data: replan(next.data, now) }, now);
};

// Daglig sjekk når appen åpnes. Overbelastning regnes alltid ut, også når planen ikke endres.
export const startDay = (now) => (state) => {
  const data = rollover(state.data, now);
  return withOverload(data === state.data ? state : { ...state, data }, now);
};

// Når appen har stått åpen over midnatt: daglig sjekk og ny dato i visningene
export const newDay = (now) => (state) => {
  const today = toDateKey(now);
  if (today === state.ui.today) return state;
  const checked = startDay(now)(state);
  const calendarDate = state.ui.calendar.date === state.ui.today ? today : state.ui.calendar.date;
  return withUi(checked, { today, calendar: { ...checked.ui.calendar, date: calendarDate } });
};

// Huker av eller fjerner avhuking for en arbeidsøkt («I dag»-visningen)
export const toggleSession = ({ id }) => (state) => {
  const block = state.data.blocks.find((b) => b.id === id);
  if (!block || block.is_fixed) return state;
  const data = block.is_completed ? uncompleteSession(state.data, id) : completeSession(state.data, id);
  return data === state.data ? state : { ...state, data };
};

// --- Navigasjon ---

export const showView = ({ view }) => (state) => {
  if (!VIEWS.includes(view) || state.ui.view === view) return state;
  return withUi(state, { view, notice: null, confirm: null });
};

export const dismissError = () => (state) => withUi(state, { error: null });

// --- Kalender ---

const withCalendar = (state, changes) => withUi(state, { calendar: { ...state.ui.calendar, ...changes } });

export const setCalendarMode = ({ mode }) => (state) => {
  if (!['week', 'day'].includes(mode) || state.ui.calendar.mode === mode) return state;
  return withCalendar(state, { mode });
};

// `direction` er '1' (fram) eller '-1' (tilbake), som tekst fra data-attributtet
export const stepCalendar = ({ direction }) => (state) => {
  const { mode, date } = state.ui.calendar;
  const step = (mode === 'week' ? 7 : 1) * Math.sign(Number(direction));
  if (!step) return state;
  return withCalendar(state, { date: addDays(date, step) });
};

export const calendarToday = () => (state) => withCalendar(state, { date: state.ui.today });

// Klikk på en dag i ukevisningen åpner dagsvisning for den dagen
export const openCalendarDay = ({ date }) => (state) => {
  if (!isValidDateKey(date)) return state;
  return withCalendar(state, { mode: 'day', date });
};

// --- Innstillinger ---

// `values` er feltene fra skjemaet som tekst
export const submitSettings = (values) => (state) => {
  const user = {
    ...state.data.user,
    name: (values.name ?? '').trim(),
    daily_available_study_hours: parseNumber(values.daily_available_study_hours),
    study_window_start: values.study_window_start ?? '',
    study_window_end: values.study_window_end ?? '',
  };

  const errors = validateSettings(user);
  if (errors.length > 0) {
    // Behold det brukeren skrev, så det ikke forsvinner ved neste tegning
    return withForm(state, 'settings', { values, errors });
  }

  return {
    data: { ...state.data, user },
    ui: { ...withoutForm(state.ui, 'settings'), notice: 'INNSTILLINGER_LAGRET' },
  };
};

// --- Emner ---

// Nytt emne når `values.id` er tom, ellers endring av eksisterende emne
export const submitCourse = (values, newId) => (state) => {
  const course = createCourse(values, { id: values.id || newId });
  const errors = validateCourse(course);
  if (errors.length > 0) return withForm(state, 'course', { values, errors });

  const courses = values.id ? replaceById(state.data.courses, course) : [...state.data.courses, course];
  return saveAndCloseForm(state, { courses }, 'course');
};

export const editCourse = ({ id }) => (state) => {
  const course = state.data.courses.find((c) => c.id === id);
  if (!course) return state;
  return withForm(withUi(state, { confirm: null }), 'course', { values: { ...course }, errors: [] });
};

export const cancelCourseForm = () => (state) => ({ ...state, ui: withoutForm(state.ui, 'course') });

// --- Faste aktiviteter ---

export const openFixedBlockForm = () => (state) =>
  withForm(withUi(state, { confirm: null }), 'fixedBlock', { values: { weekly: 'on' }, errors: [] });

export const editFixedBlock = ({ id }) => (state) => {
  const block = state.data.blocks.find((b) => b.id === id && b.is_fixed);
  if (!block) return state;
  return withForm(withUi(state, { confirm: null }), 'fixedBlock', { values: fixedBlockToInput(block), errors: [] });
};

export const cancelFixedBlockForm = () => (state) => ({ ...state, ui: withoutForm(state.ui, 'fixedBlock') });

// Ny aktivitet når `values.id` er tom, ellers endring av eksisterende
export const submitFixedBlock = (values, newId) => (state) => {
  const errors = validateFixedBlockInput(values);
  if (errors.length > 0) return withForm(state, 'fixedBlock', { values, errors });

  const block = fixedBlockFromInput(values, { id: values.id || newId });
  const blocks = values.id ? replaceById(state.data.blocks, block) : [...state.data.blocks, block];
  return saveAndCloseForm(state, { blocks }, 'fixedBlock');
};

// Fra kalenderen: gå til timeplanen med skjemaet åpent
export const addFixedBlockFromCalendar = () => (state) =>
  openFixedBlockForm()(showView({ view: 'timeplan' })(state));

export const editFixedBlockFromCalendar = ({ id }) => (state) =>
  editFixedBlock({ id })(showView({ view: 'timeplan' })(state));

// --- Oppgaver ---

const updateTask = (state, id, change) => ({
  ...state,
  data: { ...state.data, tasks: state.data.tasks.map((task) => (task.id === id ? change(task) : task)) },
});

export const openTaskForm = () => (state) =>
  withForm(withUi(state, { confirm: null }), 'task', { values: {}, errors: [] });

export const editTask = ({ id }) => (state) => {
  const task = state.data.tasks.find((t) => t.id === id);
  if (!task) return state;
  return withForm(withUi(state, { confirm: null }), 'task', { values: taskToInput(task), errors: [] });
};

// Fra tom «I dag»-visning: gå til oppgaver med skjemaet åpent
export const openTaskFromToday = () => (state) => openTaskForm()(showView({ view: 'oppgaver' })(state));

export const cancelTaskForm = () => (state) => ({ ...state, ui: withoutForm(state.ui, 'task') });

// Ny oppgave når `values.id` er tom, ellers endring. `now` brukes for opprettet-tid og fristsjekk.
export const submitTask = (values, newId, now) => (state) => {
  const existing = values.id ? state.data.tasks.find((t) => t.id === values.id) : null;
  const task = existing ? updateTaskFromInput(existing, values) : taskFromInput(values, { id: newId, now });

  let errors = validateTask(task, now);
  // En oppgave med passert frist kan fortsatt redigeres så lenge fristen ikke endres
  if (existing && task.deadline === existing.deadline) {
    errors = errors.filter((error) => error.code !== ERRORS.FRIST_I_FORTIDEN);
  }
  if (errors.length > 0) return withForm(state, 'task', { values, errors });

  const tasks = existing ? replaceById(state.data.tasks, task) : [...state.data.tasks, task];
  return saveAndCloseForm(state, { tasks }, 'task');
};

export const openProgressForm = ({ id }) => (state) => {
  const task = state.data.tasks.find((t) => t.id === id);
  if (!task) return state;
  const values = { task_id: id, unit: 'hours', amount: numberToInput(task.completed_hours) };
  return withForm(withUi(state, { confirm: null }), 'progress', { values, errors: [] });
};

export const cancelProgressForm = () => (state) => ({ ...state, ui: withoutForm(state.ui, 'progress') });

// `values` = { task_id, unit: 'hours' | 'percent', amount }
export const submitProgress = (values) => (state) => {
  const errors = validateProgressInput(values);
  if (errors.length > 0) return withForm(state, 'progress', { values, errors });

  const amount = parseNumber(values.amount);
  const progress = values.unit === 'percent' ? { percent: amount } : { hours: amount };
  const updated = updateTask(state, values.task_id, (task) => registerProgress(task, progress));
  return { ...updated, ui: withoutForm(state.ui, 'progress') };
};

export const markTaskDone = ({ id }) => (state) => {
  const updated = updateTask(state, id, completeTask);
  // Lukk fremgangsskjemaet hvis det var åpent for denne oppgaven
  const ui = state.ui.forms.progress?.values.task_id === id ? withoutForm(state.ui, 'progress') : state.ui;
  return { ...updated, ui };
};

export const reopenTaskAction = ({ id }) => (state) => updateTask(state, id, reopenTask);

// --- Når arbeid hoper seg opp (steg 6.2) ---

// «Fordel på nytt»: oppgaven får gå over daglig kapasitet (planleggeren gjør resten via withReplan)
export const redistributeTask = ({ id }) => (state) => {
  const updated = updateTask(state, id, (task) => ({ ...task, allow_over_capacity: true }));
  return withUi(updated, { dismissedOverload: state.ui.dismissedOverload.filter((taskId) => taskId !== id) });
};

// «Behold planen»: lukker varselet for oppgaven
export const keepPlan = ({ id }) => (state) => {
  if (state.ui.dismissedOverload.includes(id)) return state;
  return withUi(state, { dismissedOverload: [...state.ui.dismissedOverload, id] });
};

// «Juster arbeidsmengde»: daglig kapasitet, estimat og frist i ett skjema
export const openAdjustForm = ({ id }) => (state) => {
  const task = state.data.tasks.find((t) => t.id === id);
  if (!task) return state;
  const { estimated_hours, deadline_date, deadline_time } = taskToInput(task);
  const values = {
    task_id: id,
    daily_available_study_hours: numberToInput(state.data.user.daily_available_study_hours),
    estimated_hours,
    deadline_date,
    deadline_time,
  };
  return withForm(state, 'adjust', { values, errors: [] });
};

export const cancelAdjustForm = () => (state) => ({ ...state, ui: withoutForm(state.ui, 'adjust') });

export const submitAdjust = (values, now) => (state) => {
  const existing = state.data.tasks.find((t) => t.id === values.task_id);
  if (!existing) return state;

  const user = { ...state.data.user, daily_available_study_hours: parseNumber(values.daily_available_study_hours) };
  const task = {
    ...existing,
    estimated_hours: parseNumber(values.estimated_hours),
    deadline: deadlineFromInput(values.deadline_date, values.deadline_time),
  };

  let errors = [...validateSettings(user), ...validateTask(task, now)];
  if (task.deadline === existing.deadline) {
    errors = errors.filter((error) => error.code !== ERRORS.FRIST_I_FORTIDEN);
  }
  if (errors.length > 0) return withForm(state, 'adjust', { values, errors });

  return {
    data: { ...state.data, user, tasks: replaceById(state.data.tasks, task) },
    ui: withoutForm(state.ui, 'adjust'),
  };
};

// --- Sletting med bekreftelse ---

const DELETABLE = ['course', 'fixedBlock', 'task'];

export const askDelete = ({ kind, id }) => (state) => {
  if (!DELETABLE.includes(kind)) return state;
  return withUi(state, { confirm: { kind, id } });
};

export const cancelDelete = () => (state) => withUi(state, { confirm: null });

export const confirmDelete = () => (state) => {
  const { confirm } = state.ui;
  if (!confirm) return state;
  const ui = { ...state.ui, confirm: null };

  if (confirm.kind === 'course') {
    // Oppgaver og aktiviteter i emnet beholdes, men mister koblingen til emnet
    const detach = (item) => (item.course_id === confirm.id ? { ...item, course_id: null } : item);
    const editing = state.ui.forms.course?.values.id === confirm.id;
    return {
      data: {
        ...state.data,
        courses: state.data.courses.filter((c) => c.id !== confirm.id),
        tasks: state.data.tasks.map(detach),
        blocks: state.data.blocks.map(detach),
      },
      ui: editing ? withoutForm(ui, 'course') : ui,
    };
  }

  if (confirm.kind === 'task') {
    // Arbeidsøktene til oppgaven slettes sammen med den
    let taskUi = state.ui.forms.task?.values.id === confirm.id ? withoutForm(ui, 'task') : ui;
    if (state.ui.forms.progress?.values.task_id === confirm.id) taskUi = withoutForm(taskUi, 'progress');
    return {
      data: {
        ...state.data,
        tasks: state.data.tasks.filter((t) => t.id !== confirm.id),
        blocks: state.data.blocks.filter((b) => b.task_id !== confirm.id),
      },
      ui: taskUi,
    };
  }

  const editing = state.ui.forms.fixedBlock?.values.id === confirm.id;
  return {
    data: { ...state.data, blocks: state.data.blocks.filter((b) => b.id !== confirm.id) },
    ui: editing ? withoutForm(ui, 'fixedBlock') : ui,
  };
};
