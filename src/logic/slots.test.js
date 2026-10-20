import { describe, it, expect } from 'vitest';
import { freeSlots, minutesOnDate } from './slots.js';
import { DEFAULT_SETTINGS } from './models.js';
import { atMinutes } from './dates.js';

const h = (hours) => Math.round(hours * 60);
const DATE = '2026-11-03';
// «Nå» er dagen før, så hele DATE er ledig med mindre noe annet sies
const yesterday = atMinutes('2026-11-02', h(12));

const block = (date, from, to) => ({
  start_time: atMinutes(date, h(from)).toISOString(),
  end_time: atMinutes(date, h(to)).toISOString(),
});

describe('freeSlots', () => {
  it('gir hele studievinduet på en tom dag', () => {
    expect(freeSlots(DATE, [], DEFAULT_SETTINGS, yesterday)).toEqual([{ start: h(8), end: h(21) }]);
  });

  it('gir ingen ledig tid på en dag full av forelesninger', () => {
    const busy = [block(DATE, 8, 12), block(DATE, 12, 16.25), block(DATE, 16.25, 21)];
    expect(freeSlots(DATE, busy, DEFAULT_SETTINGS, yesterday)).toEqual([]);
  });

  it('deler opp dagen rundt faste aktiviteter', () => {
    const busy = [block(DATE, 10.25, 12), block(DATE, 14, 16)];
    expect(freeSlots(DATE, busy, DEFAULT_SETTINGS, yesterday)).toEqual([
      { start: h(8), end: h(10.25) },
      { start: h(12), end: h(14) },
      { start: h(16), end: h(21) },
    ]);
  });

  it('håndterer aktivitet som starter før vinduet og som slutter etter', () => {
    const busy = [block(DATE, 7, 9), block(DATE, 20, 22)];
    expect(freeSlots(DATE, busy, DEFAULT_SETTINGS, yesterday)).toEqual([{ start: h(9), end: h(20) }]);
  });

  it('håndterer overlappende aktiviteter', () => {
    const busy = [block(DATE, 10, 12), block(DATE, 11, 13)];
    expect(freeSlots(DATE, busy, DEFAULT_SETTINGS, yesterday)).toEqual([
      { start: h(8), end: h(10) },
      { start: h(13), end: h(21) },
    ]);
  });

  it('ignorerer blokker på andre dager', () => {
    expect(freeSlots(DATE, [block('2026-11-04', 10, 12)], DEFAULT_SETTINGS, yesterday)).toEqual([
      { start: h(8), end: h(21) },
    ]);
  });

  it('teller bare tiden etter «nå» i dag, rundet opp til neste kvarter', () => {
    const now = atMinutes(DATE, h(12) + 7);
    expect(freeSlots(DATE, [], DEFAULT_SETTINGS, now)).toEqual([{ start: h(12.25), end: h(21) }]);
  });

  it('runder ikke opp når «nå» er akkurat på et kvarter', () => {
    expect(freeSlots(DATE, [], DEFAULT_SETTINGS, atMinutes(DATE, h(12)))).toEqual([{ start: h(12), end: h(21) }]);
  });

  it('runder opp når det har gått sekunder', () => {
    const now = new Date(atMinutes(DATE, h(12)).getTime() + 30_000);
    expect(freeSlots(DATE, [], DEFAULT_SETTINGS, now)[0].start).toBe(h(12.25));
  });

  it('gir ingen ledig tid etter at studievinduet er over, eller på tidligere dager', () => {
    expect(freeSlots(DATE, [], DEFAULT_SETTINGS, atMinutes(DATE, h(21.5)))).toEqual([]);
    expect(freeSlots(DATE, [], DEFAULT_SETTINGS, atMinutes('2026-11-04', h(9)))).toEqual([]);
  });

  it('bruker studievinduet fra innstillingene', () => {
    const user = { ...DEFAULT_SETTINGS, study_window_start: '09:30', study_window_end: '15:00' };
    expect(freeSlots(DATE, [], user, yesterday)).toEqual([{ start: h(9.5), end: h(15) }]);
  });
});

describe('minutesOnDate', () => {
  it('klipper blokk som går over midnatt', () => {
    const night = { start_time: atMinutes('2026-11-02', h(22)).toISOString(), end_time: atMinutes(DATE, h(2)).toISOString() };
    expect(minutesOnDate(night, '2026-11-02')).toEqual({ start: h(22), end: h(24) });
    expect(minutesOnDate(night, DATE)).toEqual({ start: 0, end: h(2) });
  });

  it('gir null for blokk som slutter ved midnatt før dagen', () => {
    const evening = { start_time: atMinutes('2026-11-02', h(22)).toISOString(), end_time: atMinutes(DATE, 0).toISOString() };
    expect(minutesOnDate(evening, DATE)).toBeNull();
  });
});
