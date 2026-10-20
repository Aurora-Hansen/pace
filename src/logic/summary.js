// Ukesoppsummering øverst på «I dag»: planlagte og gjennomførte timer denne uken (mandag–søndag)
import { toDateKey, startOfWeek, addDays } from './dates.js';

const hoursOf = (block) => (new Date(block.end_time) - new Date(block.start_time)) / 3_600_000;
const round2 = (value) => Math.round(value * 100) / 100;

// `today` er dagens dato (datonøkkel) fra clock.js, så ?dato= gir oppsummering for den simulerte uken.
// Planlagt = alle arbeidsøkter i uken (gjennomførte og ikke). Gjennomført = økter som er huket av.
// Faste aktiviteter teller ikke. Gir { from, to, plannedHours, doneHours, percent }.
export function weekSummary(data, today) {
  const from = startOfWeek(today);
  const to = addDays(from, 6);
  let planned = 0;
  let done = 0;

  for (const block of data.blocks) {
    if (block.is_fixed) continue;
    const date = toDateKey(new Date(block.start_time));
    if (date < from || date > to) continue;
    planned += hoursOf(block);
    if (block.is_completed) done += hoursOf(block);
  }

  return {
    from,
    to,
    plannedHours: round2(planned),
    doneHours: round2(done),
    percent: planned > 0 ? Math.round((done / planned) * 100) : 0,
  };
}
