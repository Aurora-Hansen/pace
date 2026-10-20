// Planlegging av arbeidsøkter (steg 5.2) og frigjøring av tid (steg 5.3)
import { STATUS, RECURRENCE } from './models.js';
import { toDateKey, addDays, atMinutes, minutesSinceMidnight } from './dates.js';
import { blocksForRange } from './calendar.js';
import { freeSlots, SLOT_STEP, roundUpTo, roundDownTo } from './slots.js';
import { remainingHours } from './progress.js';

// Øktlengde i minutter (antakelse 2 i plan.md) og pause mellom økter som ligger etter hverandre
export const SESSION_MIN = 30;
export const SESSION_MAX = 120;
export const BREAK = 15;

const durationMinutes = (block) => (new Date(block.end_time) - new Date(block.start_time)) / 60_000;

// Arbeidsøkter tar litt ekstra plass på hver side, så det blir pause mellom to økter
function withBreak(block) {
  if (block.is_fixed) return block;
  return {
    ...block,
    start_time: new Date(new Date(block.start_time).getTime() - BREAK * 60_000).toISOString(),
    end_time: new Date(new Date(block.end_time).getTime() + BREAK * 60_000).toISOString(),
  };
}

function createSession(task, date, start, length) {
  const startTime = atMinutes(date, start).toISOString();
  return {
    // Fast id ut fra oppgave og starttid, så funksjonen forblir ren
    id: `${task.id}@${startTime}`,
    task_id: task.id,
    course_id: task.course_id ?? null,
    title: task.title,
    start_time: startTime,
    end_time: atMinutes(date, start + length).toISOString(),
    is_fixed: false,
    recurrence: RECURRENCE.NONE,
    is_completed: false,
  };
}

// Planlegger gjenstående arbeid på oppgavene i ledig tid fra og med datoen `from`.
//
// - `blocks` er det som allerede ligger i kalenderen: faste aktiviteter og arbeidsøkter som beholdes.
//   Disse endres aldri. Funksjonen gir bare tilbake nye økter.
// - Oppgaven med tidligst frist planlegges først, i de første ledige tidsrommene før fristen.
// - Gjenstående tid er estimat – utført – beholdte økter som ikke er fullført.
// - Daglig kapasitet gjelder for alle oppgaver til sammen, også beholdte økter.
// - Det er minst 15 minutter pause mellom to arbeidsøkter (ikke mellom økt og fast aktivitet).
// - En økt gjøres kortere hvis det ellers ville blitt igjen en rest på under 30 minutter.
// - Ferdige oppgaver og oppgaver med passert frist planlegges ikke.
// - Oppgaver med `allow_over_capacity` («Fordel på nytt», antakelse 7) får en ekstra runde til slutt:
//   det som ikke fikk plass, legges i ledig tid uten kapasitetsgrense.
//
// Gir { blocks: nye økter, unplaced: [{ task_id, hours }] } for tid som ikke fikk plass før fristen.
export function scheduleTasks(tasks, blocks, user, { from, now }) {
  const pending = tasks
    .filter((task) => task.status !== STATUS.COMPLETED && new Date(task.deadline) > now)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  if (pending.length === 0) return { blocks: [], unplaced: [] };

  const lastDate = toDateKey(new Date(pending[pending.length - 1].deadline));
  const occupied = blocksForRange(blocks, from, lastDate);
  const capacity = user.daily_available_study_hours * 60;

  // Arbeid som allerede ligger i planen: per dag (mot kapasiteten) og per oppgave (mot gjenstående tid)
  const usedPerDay = new Map();
  const plannedPerTask = new Map();
  for (const block of occupied) {
    if (block.is_fixed) continue;
    const minutes = durationMinutes(block);
    usedPerDay.set(block.date, (usedPerDay.get(block.date) ?? 0) + minutes);
    if (!block.is_completed) {
      plannedPerTask.set(block.task_id, (plannedPerTask.get(block.task_id) ?? 0) + minutes);
    }
  }

  const placed = [];

  // Plasserer `remaining` minutter av oppgaven og gir tilbake det som ikke fikk plass
  function placeTask(task, remaining, ignoreCapacity) {
    const deadline = new Date(task.deadline);
    const deadlineDate = toDateKey(deadline);
    // Siste økt kan være kortere enn minimum hvis det er lite igjen
    const shortest = () => Math.min(SESSION_MIN, remaining);

    for (let date = from; date <= deadlineDate && remaining > 0; date = addDays(date, 1)) {
      let left = ignoreCapacity ? Infinity : capacity - (usedPerDay.get(date) ?? 0);
      if (left < shortest()) continue;

      const busy = [...occupied, ...placed].map(withBreak);
      for (const slot of freeSlots(date, busy, user, now)) {
        const slotEnd = date === deadlineDate ? Math.min(slot.end, minutesSinceMidnight(deadline)) : slot.end;
        let start = slot.start;

        while (remaining > 0) {
          let length = roundDownTo(Math.min(SESSION_MAX, slotEnd - start, left, remaining), SLOT_STEP);
          // Ikke la det bli igjen en rest som er kortere enn en vanlig økt
          const rest = remaining - length;
          if (rest > 0 && rest < SESSION_MIN) length = remaining - SESSION_MIN;
          if (length < shortest()) break;
          placed.push(createSession(task, date, start, length));
          usedPerDay.set(date, (usedPerDay.get(date) ?? 0) + length);
          remaining -= length;
          left -= length;
          start += length + BREAK;
        }
        if (remaining <= 0 || left < shortest()) break;
      }
    }
    return remaining;
  }

  // Første runde: alle oppgaver innenfor daglig kapasitet
  const leftover = [];
  for (const task of pending) {
    const remaining = roundUpTo(remainingHours(task) * 60 - (plannedPerTask.get(task.id) ?? 0), SLOT_STEP);
    if (remaining <= 0) continue;
    const rest = placeTask(task, remaining, false);
    if (rest > 0) leftover.push({ task, rest });
  }

  // Andre runde: «Fordel på nytt» – resten i ledig tid uten kapasitetsgrense
  const unplaced = [];
  for (const { task, rest } of leftover) {
    const still = task.allow_over_capacity ? placeTask(task, rest, true) : rest;
    if (still > 0) unplaced.push({ task_id: task.id, hours: still / 60 });
  }

  return { blocks: placed, unplaced };
}

// Sletter gjenstående arbeidsøkter for en oppgave som er ferdig (F4).
// Faste aktiviteter, fullførte økter og økter som er over, beholdes.
export function removeFutureSessions(blocks, taskId, now) {
  return blocks.filter(
    (block) => block.is_fixed || block.task_id !== taskId || block.is_completed || new Date(block.end_time) <= now,
  );
}
