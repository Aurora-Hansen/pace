// Logikk for kalendervisningen
import { toDateKey, minutesSinceMidnight, parseTime } from './dates.js';
import { expandFixedBlocks } from './recurrence.js';

// Alle blokker mellom `from` og `to` (datonøkler, begge tatt med):
// faste aktiviteter utvidet til forekomster, pluss arbeidsøkter som starter i perioden.
export function blocksForRange(blocks, from, to) {
  const sessions = blocks
    .filter((block) => !block.is_fixed)
    .map((block) => ({ ...block, source_id: block.id, date: toDateKey(new Date(block.start_time)) }))
    .filter((block) => block.date >= from && block.date <= to);

  return [...expandFixedBlocks(blocks, from, to), ...sessions].sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time),
  );
}

// Plassering av blokker på én dag. Blokker som overlapper får hver sin kolonne.
// Gir { block, column, columns } for hver blokk, der `columns` er antall kolonner
// i gruppen av blokker som henger sammen gjennom overlapp.
export function layoutDay(blocks) {
  const sorted = [...blocks].sort(
    (a, b) => new Date(a.start_time) - new Date(b.start_time) || new Date(b.end_time) - new Date(a.end_time),
  );

  const result = [];
  let group = [];
  let columnEnds = []; // sluttid for siste blokk i hver kolonne i gruppen
  let groupEnd = -Infinity;

  const closeGroup = () => {
    for (const item of group) item.columns = columnEnds.length;
    result.push(...group);
    group = [];
    columnEnds = [];
  };

  for (const block of sorted) {
    const start = +new Date(block.start_time);
    const end = +new Date(block.end_time);
    if (start >= groupEnd && group.length) closeGroup();

    let column = columnEnds.findIndex((columnEnd) => columnEnd <= start);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = end;

    group.push({ block, column, columns: 0 });
    // Gruppen varer til den blokken som slutter sist
    groupEnd = group.length === 1 ? end : Math.max(groupEnd, end);
  }
  closeGroup();

  return result;
}

// Timene kalenderen skal vise: studievinduet, utvidet hvis noen blokker ligger utenfor
export function visibleHours(user, blocks) {
  let start = parseTime(user.study_window_start) ?? 8 * 60;
  let end = parseTime(user.study_window_end) ?? 21 * 60;

  for (const block of blocks) {
    const blockStart = new Date(block.start_time);
    const blockEnd = new Date(block.end_time);
    start = Math.min(start, minutesSinceMidnight(blockStart));
    // Blokk som slutter ved midnatt neste dag regnes som slutt kl. 24
    const endMinutes = toDateKey(blockEnd) === toDateKey(blockStart) ? minutesSinceMidnight(blockEnd) : 24 * 60;
    end = Math.max(end, endMinutes);
  }

  return { startHour: Math.floor(start / 60), endHour: Math.ceil(end / 60) };
}
