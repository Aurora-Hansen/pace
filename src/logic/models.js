// Oppretter objekter etter datamodellen i docs/krav.md del 4.
// Funksjonene er rene: id og «nå» sendes inn, de lages ikke her.
import { atMinutes, parseTime, toDateKey, formatTime, minutesSinceMidnight, isValidDateKey } from './dates.js';

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

// Farger brukeren kan velge for emner. Navnene står i src/tekster.js.
export const COURSE_COLORS = ['#2E5B88', '#FF8C61', '#3F8F6B', '#7B5EA7', '#D9A21B', '#2A9BA8', '#C2577A', '#64748B'];

export const DEFAULT_COURSE_COLOR = COURSE_COLORS[0];

// Første farge som ingen emner bruker ennå
export function suggestCourseColor(courses) {
  const used = new Set(courses.map((course) => course.color.toUpperCase()));
  return COURSE_COLORS.find((color) => !used.has(color)) ?? DEFAULT_COURSE_COLOR;
}

// Tall fra skjema: godtar både '4.5' og '4,5'. Tom verdi gir null.
export function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const number = Number(value.trim().replace(',', '.'));
  return Number.isFinite(number) ? number : null;
}

// Tall → tekst for skjemafelt, med desimalkomma: 6.5 → '6,5'
export function numberToInput(value) {
  return value === null || value === undefined ? '' : String(value).replace('.', ',');
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
    // Utvidelse av datamodellen: førstegangsveiviseren er vist (lukket eller fullført)
    onboarding_done: false,
  };
}

// Fyller inn manglende felt i lagrede data, f.eks. etter at nye innstillinger er lagt til
export function normalizeState(raw) {
  const list = (value) => (Array.isArray(value) ? value : []);
  const courses = list(raw.courses);
  const tasks = list(raw.tasks);
  const blocks = list(raw.blocks);
  return {
    user: { name: '', ...DEFAULT_SETTINGS, ...raw.user },
    courses,
    tasks,
    blocks,
    last_checked_date: raw.last_checked_date ?? null,
    // Data lagret før veiviseren fantes: den som allerede har lagt inn noe, trenger den ikke
    onboarding_done: raw.onboarding_done ?? courses.length + tasks.length + blocks.length > 0,
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
    // Utvidelse av datamodellen: «Fordel på nytt» er valgt (antakelse 7 i plan.md)
    allow_over_capacity: false,
  };
}

// Frist fra skjema: dato og valgfritt klokkeslett (standard 23:59). Ugyldig gir null.
export const DEFAULT_DEADLINE_TIME = '23:59';

export function deadlineFromInput(date, time) {
  if (!isValidDateKey(date)) return null;
  const minutes = parseTime(time || DEFAULT_DEADLINE_TIME);
  return minutes === null ? null : atMinutes(date, minutes).toISOString();
}

// Skjemaverdier → felt i oppgaven som brukeren kan endre
function taskFieldsFromInput(values) {
  return {
    course_id: values.course_id || null,
    title: trimmed(values.title),
    description: trimmed(values.description),
    deadline: deadlineFromInput(values.deadline_date, values.deadline_time),
    estimated_hours: parseNumber(values.estimated_hours),
  };
}

export function taskFromInput(values, { id, now }) {
  return { ...createTask({}, { id, now }), ...taskFieldsFromInput(values) };
}

// Endring av eksisterende oppgave. Fremgang, status og opprettet-tid beholdes.
export function updateTaskFromInput(task, values) {
  return { ...task, ...taskFieldsFromInput(values) };
}

// Oppgave → skjemaverdier, for redigering
export function taskToInput(task) {
  const deadline = new Date(task.deadline);
  return {
    id: task.id,
    title: task.title,
    course_id: task.course_id ?? '',
    description: task.description,
    estimated_hours: numberToInput(task.estimated_hours),
    deadline_date: toDateKey(deadline),
    deadline_time: formatTime(minutesSinceMidnight(deadline)),
  };
}

// Skjemaverdier { title, course_id, date, start, end, weekly } → fast aktivitet.
// Verdiene må være validert med validateFixedBlockInput først.
export function fixedBlockFromInput(values, { id }) {
  return createFixedBlock(
    {
      title: values.title,
      course_id: values.course_id,
      start_time: atMinutes(values.date, parseTime(values.start)),
      end_time: atMinutes(values.date, parseTime(values.end)),
      recurrence: values.weekly === 'on' ? RECURRENCE.WEEKLY : RECURRENCE.NONE,
    },
    { id },
  );
}

// Fast aktivitet → skjemaverdier, for redigering
export function fixedBlockToInput(block) {
  const start = new Date(block.start_time);
  const end = new Date(block.end_time);
  return {
    id: block.id,
    title: block.title,
    course_id: block.course_id ?? '',
    date: toDateKey(start),
    start: formatTime(minutesSinceMidnight(start)),
    end: formatTime(minutesSinceMidnight(end)),
    ...(block.recurrence === RECURRENCE.WEEKLY ? { weekly: 'on' } : {}),
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
