// «I dag»-visningen (steg 5.7): dagens plan og avhuking av arbeidsøkter
import { blocksForRange } from './calendar.js';
import { registerProgress } from './progress.js';

// Dagens faste aktiviteter og arbeidsøkter i tidsrekkefølge, og hvor mange økter som er gjennomført
export function todayAgenda(data, today) {
  const items = blocksForRange(data.blocks, today, today);
  const sessions = items.filter((item) => !item.is_fixed);
  return {
    items,
    sessionsTotal: sessions.length,
    sessionsDone: sessions.filter((session) => session.is_completed).length,
  };
}

const hoursOf = (block) => (new Date(block.end_time) - new Date(block.start_time)) / 3_600_000;

// Huker av (eller fjerner avhuking for) en arbeidsøkt og justerer utført tid på oppgaven (antakelse 4)
function setSessionCompleted(data, blockId, completed) {
  const block = data.blocks.find((b) => b.id === blockId && !b.is_fixed);
  if (!block || block.is_completed === completed) return data;

  const change = completed ? hoursOf(block) : -hoursOf(block);
  return {
    ...data,
    blocks: data.blocks.map((b) => (b.id === blockId ? { ...b, is_completed: completed } : b)),
    tasks: data.tasks.map((task) =>
      task.id === block.task_id ? registerProgress(task, { hours: task.completed_hours + change }) : task,
    ),
  };
}

export const completeSession = (data, blockId) => setSessionCompleted(data, blockId, true);
export const uncompleteSession = (data, blockId) => setSessionCompleted(data, blockId, false);
