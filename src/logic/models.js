// Oppretter objekter etter datamodellen i docs/krav.md del 4.
// Funksjonene er rene: id og «nå» sendes inn, de lages ikke her.

export const STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
};

export const RECURRENCE = {
  NONE: 'none',
  WEEKLY: 'weekly',
};

// Standardinnstillinger. Studievinduet er en utvidelse av datamodellen (antakelse 1 i plan.md).
export const DEFAULT_SETTINGS = {
  daily_available_study_hours: 4,
  study_window_start: '08:00',
  study_window_end: '21:00',
};

export const DEFAULT_COURSE_COLOR = '#2E5B88';

// Tall fra skjema: godtar både '4.5' og '4,5'. Tom verdi gir null.
export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const number = Number(value.trim().replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

// Date eller datostreng → ISO-streng, eller null hvis ugyldig
export function toIsoString(value) {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const trimmed = (value) => (typeof value === 'string' ? value.trim() : '');

export function createUser({ id, name = '' }) {
  return { id, name: trimmed(name), ...DEFAULT_SETTINGS };
}

export function createInitialState({ userId }) {
  return {
    user: createUser({ id: userId }),
    courses: [],
    tasks: [],
    blocks: [],
    last_checked_date: null,
  };
}

// Fyller inn manglende felt i lagrede data, f.eks. etter at nye innstillinger er lagt til
export function normalizeState(raw) {
  const list = (value) => (Array.isArray(value) ? value : []);
  return {
    user: { name: '', ...DEFAULT_SETTINGS, ...raw.user },
    courses: list(raw.courses),
    tasks: list(raw.tasks),
    blocks: list(raw.blocks),
    last_checked_date: raw.last_checked_date ?? null,
  };
}

export function createCourse(input, { id }) {
  return {
    id,
    name: trimmed(input.name),
    color: input.color || DEFAULT_COURSE_COLOR,
  };
}

export function createTask(input, { id, now }) {
  return {
    id,
    course_id: input.course_id || null,
    title: trimmed(input.title),
    description: trimmed(input.description),
    deadline: toIsoString(input.deadline),
    estimated_hours: parseNumber(input.estimated_hours),
    completed_hours: 0,
    status: STATUS.NOT_STARTED,
    created_at: now.toISOString(),
  };
}

// Fast aktivitet, f.eks. forelesning. Flyttes aldri av planleggeren.
export function createFixedBlock(input, { id }) {
  return {
    id,
    task_id: null,
    course_id: input.course_id || null,
    title: trimmed(input.title),
    start_time: toIsoString(input.start_time),
    end_time: toIsoString(input.end_time),
    is_fixed: true,
    recurrence: input.recurrence === RECURRENCE.NONE ? RECURRENCE.NONE : RECURRENCE.WEEKLY,
    is_completed: false,
  };
}
