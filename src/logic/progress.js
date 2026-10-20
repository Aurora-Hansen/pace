// Fremgang på oppgaver (steg 4.4)
import { STATUS } from './models.js';

const round2 = (value) => Math.round(value * 100) / 100;

function statusFor(completedHours, estimatedHours) {
  if (completedHours >= estimatedHours) return STATUS.COMPLETED;
  return completedHours > 0 ? STATUS.IN_PROGRESS : STATUS.NOT_STARTED;
}

// Setter hvor mye som er gjort totalt, enten i timer eller prosent av estimatet.
// Verdien begrenses til 0–100 % av estimatet. 100 % gjør oppgaven ferdig.
export function registerProgress(task, { hours, percent }) {
  const estimated = task.estimated_hours;
  const raw = percent !== undefined ? (estimated * percent) / 100 : hours;
  const completed = round2(Math.min(Math.max(raw, 0), estimated));
  return { ...task, completed_hours: completed, status: statusFor(completed, estimated) };
}

// Ferdig uten å endre registrert tid, så det kan angres med reopenTask
export function completeTask(task) {
  return { ...task, status: STATUS.COMPLETED };
}

export function reopenTask(task) {
  const completed = Math.min(task.completed_hours, task.estimated_hours);
  // Var oppgaven ferdig fordi alt var registrert, settes den tilbake til påbegynt
  const status = completed > 0 ? STATUS.IN_PROGRESS : STATUS.NOT_STARTED;
  return { ...task, status };
}

// 0–100. Ferdige oppgaver er alltid 100 %.
export function progressPercent(task) {
  if (task.status === STATUS.COMPLETED) return 100;
  if (!task.estimated_hours) return 0;
  return Math.min(100, Math.round((task.completed_hours / task.estimated_hours) * 100));
}

export function remainingHours(task) {
  if (task.status === STATUS.COMPLETED) return 0;
  return round2(Math.max(0, task.estimated_hours - task.completed_hours));
}
