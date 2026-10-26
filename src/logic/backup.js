// Sikkerhetskopi: eksport og import av alle data som JSON (steg 8.3).
// Rene funksjoner. Selve nedlastingen og lesingen av filen skjer i main.js.
import { normalizeState, STATUS, RECURRENCE } from './models.js';
import { validateSettings } from './validation.js';

export const BACKUP_FORMAT = 'pace-sikkerhetskopi';
export const BACKUP_VERSION = 1;
// En vanlig sikkerhetskopi er noen få kilobyte. Større filer er nesten sikkert feil fil.
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

export function createBackup(data, now) {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exported_at: now.toISOString(), data };
}

export function serializeBackup(data, now) {
  return `${JSON.stringify(createBackup(data, now), null, 2)}\n`;
}

export const backupFilename = (today) => `${BACKUP_FORMAT}-${today}.json`;

// --- Validering ---

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isTime = (value) => typeof value === 'string' && !Number.isNaN(Date.parse(value));
const isNumber = (value) => typeof value === 'number' && Number.isFinite(value);
const isOptionalRef = (value, ids) => value === null || value === undefined || ids.has(value);

const validCourse = (course) => isObject(course) && isText(course.id) && isText(course.name) && /^#[0-9a-f]{6}$/i.test(course.color ?? '');

function validTask(task, courseIds) {
  return (
    isObject(task) &&
    isText(task.id) &&
    isText(task.title) &&
    isTime(task.deadline) &&
    isNumber(task.estimated_hours) &&
    task.estimated_hours > 0 &&
    isNumber(task.completed_hours) &&
    task.completed_hours >= 0 &&
    Object.values(STATUS).includes(task.status) &&
    isOptionalRef(task.course_id, courseIds)
  );
}

function validBlock(block, courseIds, taskIds) {
  if (!isObject(block) || !isText(block.id) || !isTime(block.start_time) || !isTime(block.end_time)) return false;
  if (Date.parse(block.end_time) <= Date.parse(block.start_time)) return false;
  if (typeof block.is_fixed !== 'boolean' || typeof block.is_completed !== 'boolean') return false;
  if (!Object.values(RECURRENCE).includes(block.recurrence)) return false;
  if (!isOptionalRef(block.course_id, courseIds)) return false;
  // Faste aktiviteter har ingen oppgave. Arbeidsøkter må høre til en oppgave som finnes.
  return block.is_fixed ? block.task_id === null || block.task_id === undefined : taskIds.has(block.task_id);
}

// Første element som ikke er gyldig, eller som har en id som er brukt før. Gir indeksen eller -1.
function firstInvalid(list, isValid) {
  const seen = new Set();
  return list.findIndex((item) => {
    if (!isValid(item) || seen.has(item.id)) return true;
    seen.add(item.id);
    return false;
  });
}

const invalid = (where, index) => ({ error: 'UGYLDIG_INNHOLD', where, index });

// Leser og validerer en sikkerhetskopi.
// Gir { data, exportedAt, counts } eller { error, where?, index? }.
// `where` er 'user', 'courses', 'tasks' eller 'blocks', og `index` er 0-basert plass i listen.
export function parseBackup(text) {
  if (typeof text !== 'string') return { error: 'UGYLDIG_JSON' };
  if (text.length > MAX_BACKUP_BYTES) return { error: 'FILEN_ER_FOR_STOR' };

  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    return { error: 'UGYLDIG_JSON' };
  }

  if (!isObject(backup) || backup.format !== BACKUP_FORMAT || !Number.isInteger(backup.version) || backup.version < 1) {
    return { error: 'IKKE_PACE_FIL' };
  }
  if (backup.version > BACKUP_VERSION) return { error: 'NYERE_VERSJON' };

  const { data } = backup;
  if (!isObject(data) || !isObject(data.user) || ![data.courses, data.tasks, data.blocks].every(Array.isArray)) {
    return invalid('data', -1);
  }
  if (!isText(data.user.id) || validateSettings(data.user).length > 0) return invalid('user', -1);

  const courseIndex = firstInvalid(data.courses, validCourse);
  if (courseIndex >= 0) return invalid('courses', courseIndex);
  const courseIds = new Set(data.courses.map((course) => course.id));

  const taskIndex = firstInvalid(data.tasks, (task) => validTask(task, courseIds));
  if (taskIndex >= 0) return invalid('tasks', taskIndex);
  const taskIds = new Set(data.tasks.map((task) => task.id));

  const blockIndex = firstInvalid(data.blocks, (block) => validBlock(block, courseIds, taskIds));
  if (blockIndex >= 0) return invalid('blocks', blockIndex);

  return {
    // Den som henter inn data, trenger ikke førstegangsveiviseren
    data: { ...normalizeState(data), onboarding_done: true },
    exportedAt: isTime(backup.exported_at) ? backup.exported_at : null,
    counts: {
      courses: data.courses.length,
      tasks: data.tasks.length,
      fixed: data.blocks.filter((block) => block.is_fixed).length,
    },
  };
}
