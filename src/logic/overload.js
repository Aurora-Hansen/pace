// Når arbeid hoper seg opp (steg 6.1, krav.md del 5 punkt 4)
import { STATUS } from './models.js';
import { toDateKey } from './dates.js';
import { remainingHours } from './progress.js';
import { SLOT_STEP, roundUpTo } from './slots.js';

const minutesOf = (block) => (new Date(block.end_time) - new Date(block.start_time)) / 60_000;
const dateOf = (block) => toDateKey(new Date(block.start_time));

// Gir { atRisk, overloadedDays }:
//
// - atRisk: oppgaver der planen ikke rekker over all gjenstående tid før fristen, sortert etter frist.
//   For hver: { taskId, day, hoursNeeded, missingHours }. `day` er den siste dagen oppgaven har økter
//   (eller fristdagen), og `hoursNeeded` er det som ligger den dagen pluss det som mangler,
//   rundet opp til kvarter. Brukes i teksten «For å rekke fristen må du jobbe {antall} timer {dag}».
// - overloadedDays: dager fra i dag der planlagt arbeid er mer enn daglig kapasitet.
export function detectOverload(data, now) {
  const today = toDateKey(now);
  const capacity = data.user.daily_available_study_hours * 60;
  const sessions = data.blocks.filter((block) => !block.is_fixed);

  const perDay = new Map();
  for (const session of sessions) {
    const date = dateOf(session);
    perDay.set(date, (perDay.get(date) ?? 0) + minutesOf(session));
  }
  const overloadedDays = [...perDay]
    .filter(([date, minutes]) => date >= today && minutes > capacity)
    .map(([date]) => date)
    .sort();

  const atRisk = [];
  const open = data.tasks
    .filter((task) => task.status !== STATUS.COMPLETED && new Date(task.deadline) > now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  for (const task of open) {
    const own = sessions.filter((s) => s.task_id === task.id && !s.is_completed);
    const planned = own.reduce((sum, s) => sum + minutesOf(s), 0);
    const missing = remainingHours(task) * 60 - planned;
    if (missing <= 0) continue;

    const day = own.length ? own.map(dateOf).sort().at(-1) : toDateKey(new Date(task.deadline));
    const plannedThatDay = own.filter((s) => dateOf(s) === day).reduce((sum, s) => sum + minutesOf(s), 0);
    atRisk.push({
      taskId: task.id,
      day,
      hoursNeeded: roundUpTo(plannedThatDay + missing, SLOT_STEP) / 60,
      missingHours: roundUpTo(missing, SLOT_STEP) / 60,
    });
  }

  return { atRisk, overloadedDays };
}
