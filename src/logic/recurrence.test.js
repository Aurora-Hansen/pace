import { describe, it, expect } from 'vitest';
import { expandFixedBlocks, sortFixedBlocks } from './recurrence.js';
import { createFixedBlock } from './models.js';
import { atMinutes, minutesSinceMidnight, toDateKey } from './dates.js';

// Fast aktivitet på en dato, med klokkeslett i minutter
function fixed(id, date, startMin, endMin, recurrence = 'weekly') {
  return createFixedBlock(
    { title: id, start_time: atMinutes(date, startMin), end_time: atMinutes(date, endMin), recurrence },
    { id },
  );
}

const localTime = (iso) => minutesSinceMidnight(new Date(iso));

describe('expandFixedBlocks', () => {
  it('tar med enkeltstående aktivitet bare når datoen er i intervallet', () => {
    const block = fixed('a', '2026-11-04', 600, 720, 'none');
    expect(expandFixedBlocks([block], '2026-11-02', '2026-11-08')).toHaveLength(1);
    expect(expandFixedBlocks([block], '2026-11-05', '2026-11-08')).toHaveLength(0);
    expect(expandFixedBlocks([block], '2026-11-04', '2026-11-04')).toHaveLength(1);
  });

  it('gjentar ukentlig aktivitet hver uke i intervallet', () => {
    const block = fixed('a', '2026-11-02', 615, 720);
    const result = expandFixedBlocks([block], '2026-11-01', '2026-11-22');
    expect(result.map((o) => o.date)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16']);
    expect(result.every((o) => localTime(o.start_time) === 615 && localTime(o.end_time) === 720)).toBe(true);
  });

  it('starter ikke før første dato', () => {
    const block = fixed('a', '2026-11-16', 615, 720);
    expect(expandFixedBlocks([block], '2026-11-01', '2026-11-22').map((o) => o.date)).toEqual(['2026-11-16']);
  });

  it('finner riktig uke når intervallet starter lenge etter første dato', () => {
    const block = fixed('a', '2026-08-17', 615, 720);
    expect(expandFixedBlocks([block], '2026-11-03', '2026-11-12').map((o) => o.date)).toEqual(['2026-11-09']);
  });

  it('beholder klokkeslettet når sommertiden slutter', () => {
    // Mandag 19.10 er sommertid, mandag 26.10 er vintertid
    const block = fixed('a', '2026-10-19', 615, 720);
    const result = expandFixedBlocks([block], '2026-10-19', '2026-10-26');
    expect(result.map((o) => o.date)).toEqual(['2026-10-19', '2026-10-26']);
    expect(result.map((o) => localTime(o.start_time))).toEqual([615, 615]);
    expect(result.map((o) => toDateKey(new Date(o.start_time)))).toEqual(['2026-10-19', '2026-10-26']);
  });

  it('gir hver forekomst egen id og peker tilbake til aktiviteten', () => {
    const [occurrence] = expandFixedBlocks([fixed('a', '2026-11-02', 600, 660)], '2026-11-02', '2026-11-02');
    expect(occurrence.id).toBe('a@2026-11-02');
    expect(occurrence.source_id).toBe('a');
    expect(occurrence.is_fixed).toBe(true);
  });

  it('sorterer forekomstene etter starttid og hopper over arbeidsøkter', () => {
    const late = fixed('sen', '2026-11-02', 840, 900);
    const early = fixed('tidlig', '2026-11-03', 480, 540);
    const session = { ...fixed('økt', '2026-11-02', 600, 660), is_fixed: false };
    const result = expandFixedBlocks([early, session, late], '2026-11-02', '2026-11-03');
    expect(result.map((o) => o.source_id)).toEqual(['sen', 'tidlig']);
  });

  it('endrer ikke aktivitetene som sendes inn', () => {
    const block = Object.freeze(fixed('a', '2026-11-02', 600, 660));
    expect(() => expandFixedBlocks([block], '2026-11-01', '2026-11-30')).not.toThrow();
  });
});

describe('sortFixedBlocks', () => {
  it('sorterer ukentlige etter ukedag og tid, så enkeltstående etter dato', () => {
    const blocks = [
      fixed('engang-sen', '2026-12-01', 600, 660, 'none'),
      fixed('onsdag', '2026-11-04', 480, 540),
      fixed('engang-tidlig', '2026-11-20', 600, 660, 'none'),
      fixed('mandag-sen', '2026-11-02', 840, 900),
      fixed('mandag-tidlig', '2026-11-09', 480, 540),
    ];
    expect(sortFixedBlocks(blocks).map((b) => b.id)).toEqual([
      'mandag-tidlig',
      'mandag-sen',
      'onsdag',
      'engang-tidlig',
      'engang-sen',
    ]);
  });
});
