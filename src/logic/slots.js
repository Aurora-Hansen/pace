// Ledig tid på en dag (steg 5.1). Tider er minutter siden midnatt (lokal tid).
import { toDateKey, minutesSinceMidnight, parseTime } from './dates.js';

// Økter og ledig tid starter på hele kvarter
export const SLOT_STEP = 15;

export const roundUpTo = (minutes, step) => Math.ceil(minutes / step) * step;
export const roundDownTo = (minutes, step) => Math.floor(minutes / step) * step;

// Tidsrommet en blokk opptar på `date`, som { start, end } i minutter, eller null.
// Blokker som går over midnatt klippes til dagen.
export function minutesOnDate(block, date) {
  const start = new Date(block.start_time);
  const end = new Date(block.end_time);
  const startDate = toDateKey(start);
  const endDate = toDateKey(end);
  if (startDate > date || endDate < date) return null;

  const from = startDate < date ? 0 : minutesSinceMidnight(start);
  const to = endDate > date ? 24 * 60 : minutesSinceMidnight(end);
  return to > from ? { start: from, end: to } : null;
}

// Trekker `busy` fra tidsrommet `slot`
function subtract(slot, busy) {
  if (busy.end <= slot.start || busy.start >= slot.end) return [slot];
  const rest = [];
  if (busy.start > slot.start) rest.push({ start: slot.start, end: busy.start });
  if (busy.end < slot.end) rest.push({ start: busy.end, end: slot.end });
  return rest;
}

// Ledige tidsrom på `date` innenfor studievinduet, utenom blokkene i `busy`.
// `busy` er konkrete blokker (faste aktiviteter må være utvidet med expandFixedBlocks).
// Er `date` i dag, regnes bare tiden etter «nå», rundet opp til neste kvarter.
// Dager før i dag har ingen ledig tid.
export function freeSlots(date, busy, user, now) {
  const today = toDateKey(now);
  if (date < today) return [];

  let start = parseTime(user.study_window_start);
  const end = parseTime(user.study_window_end);
  if (date === today) {
    const exactNow = minutesSinceMidnight(now) + now.getSeconds() / 60;
    start = Math.max(start, roundUpTo(exactNow, SLOT_STEP));
  }

  let slots = start < end ? [{ start, end }] : [];
  for (const block of busy) {
    const taken = minutesOnDate(block, date);
    if (taken) slots = slots.flatMap((slot) => subtract(slot, taken));
  }
  return slots;
}
