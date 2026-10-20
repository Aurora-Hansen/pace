// Inndeling av to-do-listen (steg 4.1)
import { STATUS } from './models.js';
import { toDateKey, daysBetween } from './dates.js';

// Oppgaver med frist innen så mange dager regnes som aktive
export const ACTIVE_WITHIN_DAYS = 7;

// Antall dager fra `today` til fristen (0 = i dag, negativt = passert dato)
export function daysUntil(deadline, today) {
  return daysBetween(today, toDateKey(new Date(deadline)));
}

const byDeadline = (a, b) => new Date(a.deadline) - new Date(b.deadline);

// Deler oppgavene i aktive, kommende og fullførte.
// Aktive: påbegynt, eller frist innen 7 dager (også passerte frister).
// Kommende: ikke påbegynt og frist senere enn det.
// Aktive og kommende sorteres etter tidligste frist, fullførte etter seneste frist først.
export function groupTasks(tasks, today) {
  const active = [];
  const upcoming = [];
  const completed = [];

  for (const task of tasks) {
    if (task.status === STATUS.COMPLETED) {
      completed.push(task);
    } else if (task.status === STATUS.IN_PROGRESS || daysUntil(task.deadline, today) < ACTIVE_WITHIN_DAYS) {
      active.push(task);
    } else {
      upcoming.push(task);
    }
  }

  return {
    active: active.sort(byDeadline),
    upcoming: upcoming.sort(byDeadline),
    completed: completed.sort((a, b) => byDeadline(b, a)),
  };
}
