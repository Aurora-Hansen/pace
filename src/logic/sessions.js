// Én boks per sammenhengende økt (F10, steg 10.1–10.2, punkt 71 og 99 i plan.md)
import { toDateKey } from './dates.js';

const time = (iso) => new Date(iso).getTime();

// Økter som kan slås sammen, har samme oppgave, samme dag og samme status (planlagt eller fullført)
const groupKey = (block) => `${block.task_id}|${toDateKey(new Date(block.start_time))}|${block.is_completed}`;

// Delene en fullført økt består av. En økt som ikke er slått sammen, er sin egen del.
// Hver del husker når den ble huket av (`completed_order`), så angring bare fjerner den siste (punkt 99).
export function partsOf(block) {
  return (
    block.parts ?? [
      { id: block.id, start_time: block.start_time, end_time: block.end_time, completed_order: block.completed_order ?? 0 },
    ]
  );
}

// Slår sammen arbeidsøkter for samme oppgave som ligger rett etter hverandre (slutt lik start),
// samme dag, med samme status og samme lås.
// - `join` er id-er til økter brukeren selv har flyttet. De slås også sammen med naboer som har en annen lås,
//   og hele økten blir da låst (F9). Status må alltid være lik: en fullført og en planlagt del blir aldri én økt.
// - Den sammenslåtte økten får id-en og feltene til den første, og slutten til den siste.
// - Fullførte økter som slås sammen, får `parts` med de opprinnelige øktene, så avhukingen kan angres del for del.
// - Faste aktiviteter, økter uten oppgave og økter som overlapper, røres ikke.
// - Rekkefølgen i listen beholdes. Den sammenslåtte økten står der den første sto.
// Gir samme liste tilbake hvis ingenting ble slått sammen.
export function mergeAdjacentSessions(blocks, { join = [] } = {}) {
  const joinIds = new Set(join);
  const groups = new Map();
  for (const block of blocks) {
    if (block.is_fixed || !block.task_id) continue;
    const key = groupKey(block);
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
    let joined = joinIds.has(first.id);
    for (const next of sorted.slice(1)) {
      const adjacent = time(next.start_time) === time(current.end_time);
      const sameLock = Boolean(current.is_locked) === Boolean(next.is_locked);
      if (adjacent && (sameLock || joined || joinIds.has(next.id))) {
        current = combine(current, next);
        joined = joined || joinIds.has(next.id);
        absorbed.add(next);
      } else {
        if (current !== first) merged.set(first, current);
        first = next;
        current = next;
        joined = joinIds.has(next.id);
      }
    }
    if (current !== first) merged.set(first, current);
  }

  if (merged.size === 0) return blocks;
  return blocks.filter((block) => !absorbed.has(block)).map((block) => merged.get(block) ?? block);
}

function combine(current, next) {
  const result = { ...current, end_time: next.end_time, ...(next.is_locked ? { is_locked: true } : {}) };
  if (!current.is_completed) return result;
  const parts = [...partsOf(current), ...partsOf(next)];
  return { ...result, parts, completed_order: Math.max(...parts.map((part) => part.completed_order)) };
}

// Deler en sammenslått, fullført økt opp i de opprinnelige øktene igjen
export function splitParts(block) {
  const { parts, ...rest } = block;
  if (!parts) return [block];
  return parts.map((part) => ({ ...rest, ...part }));
}
