import { describe, it, expect } from 'vitest';
import { parseSimulatedNow } from './clock.js';

// Ekte tid i testene: tirsdag 20. oktober 2026 kl. 15:42
const realNow = new Date(2026, 9, 20, 15, 42);

describe('parseSimulatedNow', () => {
  it('bruker datoen fra ?dato= med dagens klokkeslett', () => {
    expect(parseSimulatedNow('?dato=2026-11-03', realNow)).toEqual({
      now: new Date(2026, 10, 3, 15, 42),
      simulated: true,
    });
  });

  it('bruker også klokkeslettet når det er med', () => {
    expect(parseSimulatedNow('?dato=2026-11-03T08:30', realNow)).toEqual({
      now: new Date(2026, 10, 3, 8, 30),
      simulated: true,
    });
  });

  it('fungerer sammen med andre parametere', () => {
    expect(parseSimulatedNow('?visning=uke&dato=2026-11-03', realNow).simulated).toBe(true);
  });

  it('bruker ekte tid for ugyldig verdi', () => {
    for (const search of ['?dato=i-morgen', '?dato=2026-02-30', '?dato=2026-11-03T25:00', '?dato=']) {
      expect(parseSimulatedNow(search, realNow)).toEqual({ now: realNow, simulated: false });
    }
  });

  it('bruker ekte tid når parameteren mangler', () => {
    expect(parseSimulatedNow('', realNow)).toEqual({ now: realNow, simulated: false });
    expect(parseSimulatedNow('?annet=1', realNow)).toEqual({ now: realNow, simulated: false });
  });
});
