// Gjentakelse av faste aktiviteter
import { toDateKey, atMinutes, minutesSinceMidnight, daysBetween, addDays, weekday } from './dates.js';
import { RECURRENCE } from './models.js';

// Datoene i [from, to] som har samme ukedag som `first`, fra og med `first`
function weeklyDates(first, from, to) {
  let date = first;
  if (date < from) {
    date = addDays(first, Math.ceil(daysBetween(first, from) / 7) * 7);
  }
  const dates = [];
  for (; date <= to; date = addDays(date, 7)) dates.push(date);
  return dates;
}

// Gjør faste aktiviteter om til konkrete forekomster mellom `from` og `to` (datonøkler, begge tatt med).
// Hver forekomst er en kopi av aktiviteten med egne tider, `date` og `source_id` (id-en til aktiviteten).
// Klokkeslettet er det samme hver uke, også når sommertiden slutter eller begynner.
export function expandFixedBlocks(blocks, from, to) {
  const occurrences = [];

  for (const block of blocks) {
    if (!block.is_fixed) continue;

    const start = new Date(block.start_time);
    const end = new Date(block.end_time);
    const firstDate = toDateKey(start);
    const startMinutes = minutesSinceMidnight(start);
    const lengthMinutes = daysBetween(firstDate, toDateKey(end)) * 1440 + minutesSinceMidnight(end) - startMinutes;

    const dates =
      block.recurrence === RECURRENCE.WEEKLY
        ? weeklyDates(firstDate, from, to)
        : [firstDate].filter((date) => date >= from && date <= to);

    for (const date of dates) {
      occurrences.push({
        ...block,
        id: `${block.id}@${date}`,
        source_id: block.id,
        date,
        start_time: atMinutes(date, startMinutes).toISOString(),
        end_time: atMinutes(date, startMinutes + lengthMinutes).toISOString(),
      });
    }
  }

  return occurrences.sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
}

// Rekkefølge i listen over faste aktiviteter: ukentlige etter ukedag og klokkeslett, deretter enkeltstående etter dato
export function sortFixedBlocks(blocks) {
  const key = (block) => {
    const start = new Date(block.start_time);
    return block.recurrence === RECURRENCE.WEEKLY
      ? [0, weekday(toDateKey(start)), minutesSinceMidnight(start)]
      : [1, start.getTime(), 0];
  };
  return [...blocks].sort((a, b) => {
    const [ka, kb] = [key(a), key(b)];
    return ka[0] - kb[0] || ka[1] - kb[1] || ka[2] - kb[2];
  });
}
