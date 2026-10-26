// Én boks per sammenhengende økt (F10, steg 10.1, punkt 71 i plan.md)
import { toDateKey } from './dates.js';

const time = (iso) => new Date(iso).getTime();

// Økter som kan slås sammen, har samme nøkkel: samme oppgave, samme dag og samme status
const mergeKey = (block) => `${block.task_id}|${toDateKey(new Date(block.start_time))}|${block.is_completed}`;

// Slår sammen arbeidsøkter for samme oppgave som ligger rett etter hverandre (slutt lik start),
// samme dag og med samme `is_completed`.
// - Den sammenslåtte økten får id-en og feltene til den første, og slutten til den siste.
// - Er én av dem låst, blir hele økten låst.
// - Faste aktiviteter, økter uten oppgave og økter som overlapper, røres ikke.
// - Rekkefølgen i listen beholdes. Den sammenslåtte økten står der den første sto.
// Gir samme liste tilbake hvis ingenting ble slått sammen.
export function mergeAdjacentSessions(blocks) {
  const groups = new Map();
  for (const block of blocks) {
    if (block.is_fixed || !block.task_id) continue;
    const key = mergeKey(block);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(block);
  }

  // Første økt i hver rekke → sammenslått økt, og øktene som er slått inn i den
  const merged = new Map();
  const absorbed = new Set();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => time(a.start_time) - time(b.start_time));
    let first = sorted[0];
    let current = first;
    for (const next of sorted.slice(1)) {
      if (time(next.start_time) === time(current.end_time)) {
        current = { ...current, end_time: next.end_time, is_locked: Boolean(current.is_locked || next.is_locked) };
        absorbed.add(next);
      } else {
        if (current !== first) merged.set(first, current);
        first = next;
        current = next;
      }
    }
    if (current !== first) merged.set(first, current);
  }

  if (merged.size === 0) return blocks;
  return blocks.filter((block) => !absorbed.has(block)).map((block) => merged.get(block) ?? block);
}
