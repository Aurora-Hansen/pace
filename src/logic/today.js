// «I dag»-visningen (steg 5.7): dagens plan og avhuking av arbeidsøkter
import { blocksForRange } from './calendar.js';
import { registerProgress } from './progress.js';
import { mergeAdjacentSessions, splitParts, partsOf } from './sessions.js';

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

// Neste nummer for avhuking, så det går an å se hvilken del av en sammenslått økt som ble huket av sist
function nextCompletedOrder(blocks) {
  const orders = blocks.flatMap((b) => (b.is_completed ? partsOf(b).map((part) => part.completed_order) : []));
  return Math.max(0, ...orders) + 1;
}

const withoutCompletion = ({ completed_order: _o, ...block }) => ({ ...block, is_completed: false });

// Siste del som ble huket av. Ved likt nummer (f.eks. data fra før nummereringen) den som starter sist.
const lastCompleted = (parts) =>
  parts.reduce((last, part) =>
    part.completed_order > last.completed_order ||
    (part.completed_order === last.completed_order && part.start_time > last.start_time)
      ? part
      : last,
  );

const adjustTask = (data, taskId, change) =>
  data.tasks.map((task) =>
    task.id === taskId ? registerProgress(task, { hours: task.completed_hours + change }) : task,
  );

// Huker av en arbeidsøkt og legger varigheten til oppgaven (antakelse 4)
export function completeSession(data, blockId) {
  const block = data.blocks.find((b) => b.id === blockId && !b.is_fixed);
  if (!block || block.is_completed) return data;
  const completed = { ...block, is_completed: true, completed_order: nextCompletedOrder(data.blocks) };
  return {
    ...data,
    blocks: data.blocks.map((b) => (b === block ? completed : b)),
    tasks: adjustTask(data, block.task_id, hoursOf(block)),
  };
}

// Angrer avhuking og trekker tiden fra igjen.
// En sammenslått økt deles opp igjen, og bare den delen som ble huket av sist, blir planlagt igjen.
// Da blir tilstanden den samme som før avhukingen, også når øktene er slått sammen i mellomtiden (punkt 99).
export function uncompleteSession(data, blockId) {
  const block = data.blocks.find((b) => b.id === blockId && !b.is_fixed);
  if (!block || !block.is_completed) return data;

  const parts = splitParts(block);
  const undone = lastCompleted(parts);
  const pieces = parts.map((part) => (part === undone ? withoutCompletion(part) : part));
  const blocks = data.blocks.flatMap((b) => (b === block ? pieces : [b]));
  return {
    ...data,
    // Deler som fortsatt er fullført og ligger rett etter hverandre, blir én økt igjen
    blocks: mergeAdjacentSessions(blocks),
    tasks: adjustTask(data, block.task_id, -hoursOf(undone)),
  };
}
