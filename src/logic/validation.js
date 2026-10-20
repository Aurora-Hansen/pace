// Validering. Hver funksjon returnerer en liste med feil { code, field }.
// Tom liste betyr gyldig. Kodene er nøkler i `feilmeldinger` i src/tekster.js.
import { parseTime, isValidDateKey } from './dates.js';

export const ERRORS = {
  MANGLER_FELT: 'MANGLER_FELT',
  FRIST_I_FORTIDEN: 'FRIST_I_FORTIDEN',
  SLUTT_FOR_START: 'SLUTT_FOR_START',
};

const missing = (field) => ({ code: ERRORS.MANGLER_FELT, field });
const isPositive = (value) => typeof value === 'number' && value > 0;

export function validateCourse(course) {
  const errors = [];
  if (!course.name) errors.push(missing('name'));
  if (!/^#[0-9a-f]{6}$/i.test(course.color ?? '')) errors.push(missing('color'));
  return errors;
}

export function validateTask(task, now) {
  const errors = [];
  if (!task.title) errors.push(missing('title'));
  if (!isPositive(task.estimated_hours)) errors.push(missing('estimated_hours'));
  if (!task.deadline) {
    errors.push(missing('deadline'));
  } else if (new Date(task.deadline) <= now) {
    errors.push({ code: ERRORS.FRIST_I_FORTIDEN, field: 'deadline' });
  }
  return errors;
}

export function validateFixedBlock(block) {
  const errors = [];
  if (!block.title) errors.push(missing('title'));
  if (!block.start_time) errors.push(missing('start_time'));
  if (!block.end_time) errors.push(missing('end_time'));
  if (block.start_time && block.end_time && new Date(block.end_time) <= new Date(block.start_time)) {
    errors.push({ code: ERRORS.SLUTT_FOR_START, field: 'end_time' });
  }
  return errors;
}

// Skjemaet for fast aktivitet: { title, date, start, end } som tekst
export function validateFixedBlockInput(values) {
  const errors = [];
  if (!values.title?.trim()) errors.push(missing('title'));
  if (!isValidDateKey(values.date)) errors.push(missing('date'));

  const start = parseTime(values.start);
  const end = parseTime(values.end);
  if (start === null) errors.push(missing('start'));
  if (end === null) errors.push(missing('end'));
  if (start !== null && end !== null && end <= start) {
    errors.push({ code: ERRORS.SLUTT_FOR_START, field: 'end' });
  }
  return errors;
}

export function validateSettings(user) {
  const errors = [];
  const hours = user.daily_available_study_hours;
  if (!isPositive(hours) || hours > 24) errors.push(missing('daily_available_study_hours'));

  const start = parseTime(user.study_window_start);
  const end = parseTime(user.study_window_end);
  if (start === null) errors.push(missing('study_window_start'));
  if (end === null) errors.push(missing('study_window_end'));
  if (start !== null && end !== null && end <= start) {
    errors.push({ code: ERRORS.SLUTT_FOR_START, field: 'study_window_end' });
  }
  return errors;
}

// Feilen som skal vises øverst i skjemaet. Manglende felt vises først.
export function primaryError(errors) {
  return errors.find((error) => error.code === ERRORS.MANGLER_FELT) ?? errors[0] ?? null;
}
