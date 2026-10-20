import { describe, it, expect } from 'vitest';
import {
  toDateKey,
  isValidDateKey,
  fromDateKey,
  atMinutes,
  minutesSinceMidnight,
  addDays,
  daysBetween,
  weekday,
  startOfWeek,
  parseTime,
  formatTime,
  overlaps,
} from './dates.js';

describe('toDateKey og fromDateKey', () => {
  it('bruker lokal dato, ikke UTC', () => {
    // 00:30 norsk tid er fortsatt forrige dag i UTC
    expect(toDateKey(new Date(2026, 10, 3, 0, 30))).toBe('2026-11-03');
  });

  it('går fram og tilbake uten å endre datoen', () => {
    expect(toDateKey(fromDateKey('2026-02-28'))).toBe('2026-02-28');
  });
});

describe('isValidDateKey', () => {
  it('godtar gyldige datoer', () => {
    expect(isValidDateKey('2028-02-29')).toBe(true);
  });

  it('avviser ugyldige datoer og formater', () => {
    expect(isValidDateKey('2026-02-29')).toBe(false);
    expect(isValidDateKey('2026-13-01')).toBe(false);
    expect(isValidDateKey('3.11.2026')).toBe(false);
    expect(isValidDateKey(undefined)).toBe(false);
  });
});

describe('addDays', () => {
  it('håndterer månedsskifte', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('håndterer årsskifte', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });

  it('teller hele dager over sommertid slutt 25.10.2026', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-10-20', 7)).toBe('2026-10-27');
  });

  it('teller hele dager over sommertid start 29.3.2026', () => {
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
  });
});

describe('daysBetween', () => {
  it('teller dager over sommertid og årsskifte', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-12-30', '2027-01-02')).toBe(3);
    expect(daysBetween('2026-11-03', '2026-11-01')).toBe(-2);
  });
});

describe('atMinutes og minutesSinceMidnight', () => {
  it('gir riktig klokkeslett på datoen', () => {
    const date = atMinutes('2026-11-03', 14 * 60 + 15);
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(15);
    expect(minutesSinceMidnight(date)).toBe(855);
  });

  it('gir samme klokkeslett på dagen sommertiden slutter', () => {
    // Døgnet 25.10.2026 har 25 timer, men 10:00 er fortsatt 10:00
    const date = atMinutes('2026-10-25', 600);
    expect(toDateKey(date)).toBe('2026-10-25');
    expect(minutesSinceMidnight(date)).toBe(600);
    expect(date - atMinutes('2026-10-25', 0)).toBe(11 * 3_600_000);
  });
});

describe('weekday og startOfWeek', () => {
  it('gir mandag = 1 og søndag = 7', () => {
    expect(weekday('2026-11-02')).toBe(1);
    expect(weekday('2026-11-08')).toBe(7);
  });

  it('finner mandagen i uken', () => {
    expect(startOfWeek('2026-11-05')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02');
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02');
  });

  it('finner mandagen over månedsskifte og sommertid', () => {
    expect(startOfWeek('2026-10-25')).toBe('2026-10-19');
    expect(startOfWeek('2026-11-01')).toBe('2026-10-26');
  });

  it('finner mandagen over årsskifte', () => {
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
  });
});

describe('parseTime og formatTime', () => {
  it('gjør om mellom HH:MM og minutter', () => {
    expect(parseTime('08:30')).toBe(510);
    expect(parseTime('8:05')).toBe(485);
    expect(formatTime(510)).toBe('08:30');
    expect(formatTime(0)).toBe('00:00');
  });

  it('gir null for ugyldig tid', () => {
    expect(parseTime('24:00')).toBeNull();
    expect(parseTime('12:60')).toBeNull();
    expect(parseTime('')).toBeNull();
    expect(parseTime(undefined)).toBeNull();
  });
});

describe('overlaps', () => {
  const at = (h) => atMinutes('2026-11-03', h * 60);

  it('finner delvis og full overlapp', () => {
    expect(overlaps({ start: at(10), end: at(12) }, { start: at(11), end: at(13) })).toBe(true);
    expect(overlaps({ start: at(10), end: at(14) }, { start: at(11), end: at(12) })).toBe(true);
  });

  it('regner tidsrom som bare møtes som ikke overlappende', () => {
    expect(overlaps({ start: at(10), end: at(12) }, { start: at(12), end: at(14) })).toBe(false);
  });

  it('håndterer tidsrom som ikke overlapper', () => {
    expect(overlaps({ start: at(8), end: at(9) }, { start: at(10), end: at(11) })).toBe(false);
  });
});
