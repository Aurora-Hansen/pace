// Det eneste stedet appen henter «nå».
// For manuell testing kan datoen overstyres med URL-parameteren ?dato= (steg 5.5):
//   ?dato=2026-11-03        → den datoen med dagens klokkeslett
//   ?dato=2026-11-03T14:00  → den datoen og det klokkeslettet (står stille)
import { isValidDateKey, atMinutes, parseTime, minutesSinceMidnight } from '../logic/dates.js';

// Gir { now, simulated }. Ugyldig eller manglende ?dato= gir ekte tid.
export function parseSimulatedNow(search, realNow) {
  const value = new URLSearchParams(search).get('dato');
  const match = /^(\d{4}-\d{2}-\d{2})(?:T(\d{1,2}:\d{2}))?$/.exec(value ?? '');
  if (!match || !isValidDateKey(match[1])) return { now: realNow, simulated: false };

  const minutes = match[2] === undefined ? minutesSinceMidnight(realNow) : parseTime(match[2]);
  if (minutes === null) return { now: realNow, simulated: false };
  return { now: atMinutes(match[1], minutes), simulated: true };
}

const search = globalThis.location?.search ?? '';

export function now() {
  return parseSimulatedNow(search, new Date()).now;
}

export function isSimulated() {
  return parseSimulatedNow(search, new Date()).simulated;
}
