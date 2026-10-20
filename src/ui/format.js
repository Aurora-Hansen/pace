// Formatering av datoer og klokkeslett for visning (norsk)
import { formatTime, minutesSinceMidnight, fromDateKey, daysBetween } from '../logic/dates.js';
import { RECURRENCE } from '../logic/models.js';
import { fasteAktiviteter, overbelastning } from '../tekster.js';

const weekdayFormat = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' });
const shortWeekdayFormat = new Intl.DateTimeFormat('nb-NO', { weekday: 'short' });
const longDateFormat = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
const fullDateFormat = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const rangeFormat = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

export const formatClock = (date) => formatTime(minutesSinceMidnight(date));

// «10:15–12:00»
export const formatTimeRange = (start, end) => `${formatClock(new Date(start))}–${formatClock(new Date(end))}`;

// «Hver mandag 10:15–12:00» eller «tirsdag 3. november 10:15–12:00»
export function formatFixedBlockWhen(block) {
  const start = new Date(block.start_time);
  const day =
    block.recurrence === RECURRENCE.WEEKLY
      ? fasteAktiviteter.hver(weekdayFormat.format(start))
      : longDateFormat.format(start);
  return `${day} ${formatTimeRange(block.start_time, block.end_time)}`;
}

const deadlineFormat = new Intl.DateTimeFormat('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' });

// «tor. 10. nov. kl. 23:59»
export const formatDeadline = (iso) => {
  const date = new Date(iso);
  return `${deadlineFormat.format(date)} kl. ${formatClock(date)}`;
};

// «2,5 t»
const hoursFormat = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 });
export const formatHoursShort = (hours) => `${hoursFormat.format(hours)} t`;

// «man.» for kolonneoverskrifter
export const formatShortWeekday = (dateKey) => shortWeekdayFormat.format(fromDateKey(dateKey));

// «mandag 2. november»
export const formatLongDate = (dateKey) => longDateFormat.format(fromDateKey(dateKey));

// «mandag 2. november 2026»
export const formatFullDate = (dateKey) => fullDateFormat.format(fromDateKey(dateKey));

// «i dag», «i morgen», «på torsdag» eller «mandag 16. november» – brukes i varselet
export const formatRelativeDay = (dateKey, today) =>
  overbelastning.dag(
    daysBetween(today, dateKey),
    weekdayFormat.format(fromDateKey(dateKey)),
    longDateFormat.format(fromDateKey(dateKey)),
  );

// «2.–8. november 2026» eller «26. oktober–1. november 2026»
export const formatDateRange = (from, to) => rangeFormat.formatRange(fromDateKey(from), fromDateKey(to));
