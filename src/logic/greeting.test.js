import { describe, it, expect } from 'vitest';
import { greetingPeriod } from './greeting.js';

const at = (hour, minute = 0) => new Date(2026, 10, 3, hour, minute);

describe('greetingPeriod', () => {
  const cases = [
    [0, 0, 'natt'],
    [4, 59, 'natt'],
    [5, 0, 'morgen'],
    [9, 59, 'morgen'],
    [10, 0, 'dag'],
    [16, 59, 'dag'],
    [17, 0, 'kveld'],
    [22, 59, 'kveld'],
    [23, 0, 'natt'],
    [23, 59, 'natt'],
  ];

  for (const [hour, minute, expected] of cases) {
    it(`gir «${expected}» kl. ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, () => {
      expect(greetingPeriod(at(hour, minute))).toBe(expected);
    });
  }

  it('bruker lokal tid også den dagen sommertiden slutter', () => {
    // 25.10.2026 kl. 05:00 norsk tid er 04:00 UTC
    expect(greetingPeriod(new Date('2026-10-25T04:00:00Z'))).toBe('morgen');
    expect(greetingPeriod(new Date('2026-10-25T03:59:00Z'))).toBe('natt');
  });
});
