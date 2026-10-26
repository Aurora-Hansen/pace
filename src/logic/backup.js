// Sikkerhetskopi: eksport og import av alle data som JSON (steg 8.3, versjon 2 i steg 9.5).
// Rene funksjoner. Selve nedlastingen og lesingen av filen skjer i main.js.
import { normalizeState, STATUS, RECURRENCE, PRIORITY, DAY_OFF_KIND } from './models.js';
import { validateSettings } from './validation.js';
import { migrate, CURRENT_VERSION } from './migrate.js';
import { parseTime, isValidDateKey } from './dates.js';
import { mergeAdjacentSessions } from './sessions.js';

export const BACKUP_FORMAT = 'pace-sikkerhetskopi';
// Versjonen til filen er versjonen til dataene i den, så filer fra v1 overføres med migrate (punkt 97)
export const BACKUP_VERSION = CURRENT_VERSION;
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

// Innstillinger for økter og foretrukne tider (datamodell v2)
const SESSION_MINUTES = { min: 25, max: 120, step: 5 };
const MIN_SESSION_CHOICES = [15, 30, 45, 60];
const BREAK_CHOICES = [0, 10, 15];

function validSessionSettings(user) {
  const preferred = user.preferred_session_minutes;
  return (
    Number.isInteger(preferred) &&
    preferred >= SESSION_MINUTES.min &&
    preferred <= SESSION_MINUTES.max &&
    preferred % SESSION_MINUTES.step === 0 &&
    MIN_SESSION_CHOICES.includes(user.min_session_minutes) &&
    BREAK_CHOICES.includes(user.break_minutes)
  );
}

// { id, weekdays: [1–7], start, end }: minst én ukedag, ingen dobbelt, og slutt etter start
function validPreferredTime(slot) {
  if (!isObject(slot) || !isText(slot.id) || !Array.isArray(slot.weekdays) || slot.weekdays.length === 0) return false;
  if (!slot.weekdays.every((day) => Number.isInteger(day) && day >= 1 && day <= 7)) return false;
  if (new Set(slot.weekdays).size !== slot.weekdays.length) return false;
  const start = parseTime(slot.start);
  const end = parseTime(slot.end);
  return start !== null && end !== null && end > start;
}

const validDayOff = (day) => isObject(day) && isValidDateKey(day.date) && Object.values(DAY_OFF_KIND).includes(day.kind);

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
    Object.values(PRIORITY).includes(task.priority) &&
    isOptionalRef(task.course_id, courseIds)
  );
}

function validBlock(block, courseIds, taskIds) {
  if (!isObject(block) || !isText(block.id) || !isTime(block.start_time) || !isTime(block.end_time)) return false;
  if (Date.parse(block.end_time) <= Date.parse(block.start_time)) return false;
  if (typeof block.is_fixed !== 'boolean' || typeof block.is_completed !== 'boolean') return false;
  // Bare arbeidsøkter kan være låst
  if (typeof block.is_locked !== 'boolean' || (block.is_fixed && block.is_locked)) return false;
  if (!Object.values(RECURRENCE).includes(block.recurrence)) return false;
  if (!isOptionalRef(block.course_id, courseIds)) return false;
  // Faste aktiviteter har ingen oppgave. Arbeidsøkter må høre til en oppgave som finnes.
  return block.is_fixed ? block.task_id === null || block.task_id === undefined : taskIds.has(block.task_id);
}

// Første element som ikke er gyldig, eller som har en nøkkel (id) som er brukt før. Gir indeksen eller -1.
function firstInvalid(list, isValid, key = (item) => item.id) {
  const seen = new Set();
  return list.findIndex((item) => {
    if (!isValid(item) || seen.has(key(item))) return true;
    seen.add(key(item));
    return false;
  });
}

const invalid = (where, index) => ({ error: 'UGYLDIG_INNHOLD', where, index });

// Leser og validerer en sikkerhetskopi. Filer fra versjon 1 overføres til nyeste format før valideringen.
// Gir { data, exportedAt, counts } eller { error, where?, index? }.
// `where` er 'data', 'user', 'preferredTimes', 'courses', 'tasks', 'blocks' eller 'daysOff',
// og `index` er 0-basert plass i listen (-1 når feilen ikke gjelder ett element).
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

  if (!isObject(backup.data)) return invalid('data', -1);
  const migrated = migrate({ version: backup.version, data: backup.data });
  if (migrated.error) return invalid('data', -1);

  const raw = migrated.data;
  if (!isObject(raw.user) || ![raw.courses, raw.tasks, raw.blocks].every(Array.isArray)) return invalid('data', -1);
  if (raw.days_off !== undefined && !Array.isArray(raw.days_off)) return invalid('data', -1);
  // Felt som mangler, fylles inn før valideringen. Verdier som finnes, valideres som de er.
  const data = normalizeState(raw);

  if (!isText(data.user.id) || validateSettings(data.user).length > 0 || !validSessionSettings(data.user)) {
    return invalid('user', -1);
  }
  if (!Array.isArray(data.user.preferred_times)) return invalid('user', -1);
  const preferredIndex = firstInvalid(data.user.preferred_times, validPreferredTime);
  if (preferredIndex >= 0) return invalid('preferredTimes', preferredIndex);

  const courseIndex = firstInvalid(data.courses, validCourse);
  if (courseIndex >= 0) return invalid('courses', courseIndex);
  const courseIds = new Set(data.courses.map((course) => course.id));

  const taskIndex = firstInvalid(data.tasks, (task) => validTask(task, courseIds));
  if (taskIndex >= 0) return invalid('tasks', taskIndex);
  const taskIds = new Set(data.tasks.map((task) => task.id));

  const blockIndex = firstInvalid(data.blocks, (block) => validBlock(block, courseIds, taskIds));
  if (blockIndex >= 0) return invalid('blocks', blockIndex);

  // Én markering per dato
  const dayOffIndex = firstInvalid(data.days_off, validDayOff, (day) => day.date);
  if (dayOffIndex >= 0) return invalid('daysOff', dayOffIndex);

  return {
    // Den som henter inn data, trenger ikke førstegangsveiviseren.
    // Økter som ligger rett etter hverandre, blir én økt (F10), også i filer fra før sammenslåingen fantes.
    data: { ...data, blocks: mergeAdjacentSessions(data.blocks), onboarding_done: true },
    exportedAt: isTime(backup.exported_at) ? backup.exported_at : null,
    counts: {
      courses: data.courses.length,
      tasks: data.tasks.length,
      fixed: data.blocks.filter((block) => block.is_fixed).length,
    },
  };
}
