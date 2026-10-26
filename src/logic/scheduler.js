// Planlegging av arbeidsøkter (steg 5.2) og frigjøring av tid (steg 5.3)
import { STATUS, RECURRENCE } from './models.js';
import { toDateKey, addDays, atMinutes, minutesSinceMidnight } from './dates.js';
import { blocksForRange } from './calendar.js';
import { freeSlots, SLOT_STEP, roundUpTo, roundDownTo } from './slots.js';
import { remainingHours } from './progress.js';

// Lengste økt og pause mellom økter som ligger etter hverandre, i minutter.
// Minste og ønsket øktlengde er innstillinger på brukeren (F7, punkt 73).
export const SESSION_MAX = 120;
export const BREAK = 15;
// Korteste økt i runden med korte hull, når en frist ellers ikke rekkes (punkt 73 og 101)
export const SHORT_GAP_MIN = 30;

// Hvor lang neste økt blir når `remaining` minutter gjenstår og det er plass til `room` minutter her.
// Gir 0 når det ikke bør lages en økt her.
// - Økten blir høyst `preferred` minutter, men hele resten tas med hvis den får plass innenfor ønsket lengde.
// - Blir det igjen en rest under `min`, kortes økten ned så resten blir `min`. Blir økten da selv for kort,
//   legges resten til denne økten i stedet, hvis det er plass (høyst 120 minutter).
// - I runden med korte hull (`relaxed`) gjelder ikke restregelen.
export function sessionLength(remaining, room, { preferred, min, relaxed = false }) {
  const cap = roundDownTo(Math.min(preferred, room), SLOT_STEP);
  if (remaining <= cap) return remaining;
  const rest = remaining - cap;
  if (relaxed || rest >= min) return cap;
  const shortened = remaining - min;
  if (shortened >= min) return shortened;
  return remaining <= room ? remaining : 0;
}

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
// - Økter er mellom minste øktlengde og ønsket øktlengde (`min_session_minutes`, `preferred_session_minutes`).
//   Restregelen i `sessionLength` hindrer at det blir igjen en rest under minste lengde.
// - En oppgave med mindre igjen enn minste lengde totalt får én kort økt.
// - Det som ikke fikk plass, får en runde der også tidsrom under minste lengde (men minst 30 minutter) brukes,
//   fordi fristen ellers ikke rekkes (punkt 73).
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
  const minLength = user.min_session_minutes;
  const preferred = Math.min(user.preferred_session_minutes, SESSION_MAX);

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

  // Plasserer `remaining` minutter av oppgaven og gir tilbake det som ikke fikk plass.
  // `ignoreCapacity`: «Fordel på nytt». `shortGaps`: runden med korte hull, uten restregel.
  function placeTask(task, remaining, { ignoreCapacity = false, shortGaps = false } = {}) {
    const deadline = new Date(task.deadline);
    const deadlineDate = toDateKey(deadline);
    const lower = shortGaps ? Math.min(SHORT_GAP_MIN, minLength) : minLength;
    // Siste økt kan være kortere enn minimum hvis det er lite igjen
    const shortest = () => Math.min(lower, remaining);

    for (let date = from; date <= deadlineDate && remaining > 0; date = addDays(date, 1)) {
      let left = ignoreCapacity ? Infinity : capacity - (usedPerDay.get(date) ?? 0);
      if (left < shortest()) continue;

      const busy = [...occupied, ...placed].map(withBreak);
      for (const slot of freeSlots(date, busy, user, now)) {
        const slotEnd = date === deadlineDate ? Math.min(slot.end, minutesSinceMidnight(deadline)) : slot.end;
        let start = slot.start;

        while (remaining > 0) {
          const room = roundDownTo(Math.min(SESSION_MAX, slotEnd - start, left), SLOT_STEP);
          const length = sessionLength(remaining, room, { preferred, min: lower, relaxed: shortGaps });
          if (length === 0 || length < shortest()) break;
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

  // Fjerner oppgavens økter fra denne planleggingen og gir dem tilbake, så de kan settes inn igjen
  function takeBack(task) {
    const own = placed.filter((block) => block.task_id === task.id);
    for (const block of own) {
      placed.splice(placed.indexOf(block), 1);
      const date = toDateKey(new Date(block.start_time));
      usedPerDay.set(date, usedPerDay.get(date) - durationMinutes(block));
    }
    return own;
  }

  function putBack(blocksToRestore) {
    for (const block of blocksToRestore) {
      placed.push(block);
      const date = toDateKey(new Date(block.start_time));
      usedPerDay.set(date, (usedPerDay.get(date) ?? 0) + durationMinutes(block));
    }
  }

  // Første runde: alle oppgaver innenfor daglig kapasitet
  const leftover = [];
  for (const task of pending) {
    const remaining = roundUpTo(remainingHours(task) * 60 - (plannedPerTask.get(task.id) ?? 0), SLOT_STEP);
    if (remaining <= 0) continue;
    const rest = placeTask(task, remaining);
    if (rest > 0) leftover.push({ task, remaining, rest });
  }

  // Andre runde: korte hull for det som ellers ikke rekker fristen (punkt 73).
  // Oppgaven planlegges på nytt fra bunnen uten restregelen, fordi første runde kan ha kortet ned en økt
  // i håp om et senere tidsrom som ikke finnes. Den nye planen brukes bare hvis mindre blir igjen.
  // Med minste lengde 30 eller kortere finnes det ingen korte hull (v1-reglene, punkt 33), og runden hoppes over.
  const useShortGaps = minLength > SHORT_GAP_MIN;
  const shortGapsLeft = [];
  for (const { task, remaining, rest } of leftover) {
    if (!useShortGaps) {
      shortGapsLeft.push({ task, rest });
      continue;
    }
    const before = takeBack(task);
    const again = placeTask(task, remaining, { shortGaps: true });
    if (again < rest) {
      if (again > 0) shortGapsLeft.push({ task, rest: again });
      continue;
    }
    takeBack(task);
    putBack(before);
    // Første runde var minst like god. Resten kan fortsatt få korte hull ved siden av.
    const still = placeTask(task, rest, { shortGaps: true });
    if (still > 0) shortGapsLeft.push({ task, rest: still });
  }

  // Tredje runde: «Fordel på nytt» – resten i ledig tid uten kapasitetsgrense
  const unplaced = [];
  for (const { task, rest } of shortGapsLeft) {
    const still = task.allow_over_capacity ? placeTask(task, rest, { ignoreCapacity: true }) : rest;
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
