// Endringer som sendes til store.update. Hver funksjon tar inn det den trenger
// og returnerer en ren funksjon state → nyState.
// Nye id-er sendes inn fra main.js, så endringene forblir rene.
import { parseNumber, createCourse, fixedBlockFromInput, fixedBlockToInput } from '../logic/models.js';
import { validateSettings, validateCourse, validateFixedBlockInput } from '../logic/validation.js';

export const VIEWS = ['timeplan', 'innstillinger'];

export function createInitialUi({ error = null } = {}) {
  return {
    view: 'timeplan',
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

// --- Navigasjon ---

export const showView = ({ view }) => (state) => {
  if (!VIEWS.includes(view) || state.ui.view === view) return state;
  return withUi(state, { view, notice: null, confirm: null });
};

export const dismissError = () => (state) => withUi(state, { error: null });

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

// --- Sletting med bekreftelse ---

const DELETABLE = ['course', 'fixedBlock'];

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

  const editing = state.ui.forms.fixedBlock?.values.id === confirm.id;
  return {
    data: { ...state.data, blocks: state.data.blocks.filter((b) => b.id !== confirm.id) },
    ui: editing ? withoutForm(ui, 'fixedBlock') : ui,
  };
};
