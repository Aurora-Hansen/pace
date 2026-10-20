// Formatering av datoer og klokkeslett for visning (norsk)
import { formatTime, minutesSinceMidnight } from '../logic/dates.js';
import { RECURRENCE } from '../logic/models.js';
import { fasteAktiviteter } from '../tekster.js';

const weekdayFormat = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' });
const longDateFormat = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });

export const formatClock = (date) => formatTime(minutesSinceMidnight(date));

// «Hver mandag 10:15–12:00» eller «tirsdag 3. november 10:15–12:00»
export function formatFixedBlockWhen(block) {
  const start = new Date(block.start_time);
  const end = new Date(block.end_time);
  const day =
    block.recurrence === RECURRENCE.WEEKLY
      ? fasteAktiviteter.hver(weekdayFormat.format(start))
      : longDateFormat.format(start);
  return `${day} ${formatClock(start)}–${formatClock(end)}`;
}
