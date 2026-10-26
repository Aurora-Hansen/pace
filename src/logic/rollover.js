// Ny plan ved endringer og daglig sjekk (steg 5.4, antakelse 3 i plan.md).
// Begge tar inn og gir tilbake den lagrede tilstanden { user, courses, tasks, blocks, last_checked_date }.
import { toDateKey } from './dates.js';
import { STATUS } from './models.js';
import { scheduleTasks } from './scheduler.js';
import { mergeAdjacentSessions } from './sessions.js';

const sessionDate = (block) => toDateKey(new Date(block.start_time));

// Beholder blokkene `keep` godtar og planlegger resten av arbeidet fra `from`.
// Til slutt blir økter for samme oppgave som ligger rett etter hverandre, én økt (F10).
function planAround(data, keep, from, now) {
  const kept = data.blocks.filter(keep);
  const { blocks } = scheduleTasks(data.tasks, kept, data.user, { from, now });
  return { ...data, blocks: mergeAdjacentSessions([...kept, ...blocks]) };
}

// Ved endring (ny oppgave, fremgang, endret estimat eller frist):
// dagens økter står fast, ufullførte økter fra i morgen planlegges på nytt.
// Ny plan kan bruke ledig tid i dag etter «nå».
export function replan(data, now) {
  const today = toDateKey(now);
  const openTasks = new Set(data.tasks.filter((t) => t.status !== STATUS.COMPLETED).map((t) => t.id));

  return planAround(
    data,
    (block) =>
      block.is_fixed ||
      block.is_completed ||
      // Dagens (og tidligere) økter beholdes, men ikke for oppgaver som er ferdige eller slettet
      (sessionDate(block) <= today && openTasks.has(block.task_id)),
    today,
    now,
  );
}

// Når appen åpnes en ny dag: ufullførte økter fjernes og alt planlegges på nytt fra i dag.
// Gjør ingenting samme dag, eller når «nå» er før forrige sjekk (f.eks. etter simulert dato).
export function rollover(data, now) {
  const today = toDateKey(now);
  if (data.last_checked_date && today <= data.last_checked_date) return data;

  const planned = planAround(data, (block) => block.is_fixed || block.is_completed, today, now);
  return { ...planned, last_checked_date: today };
}
