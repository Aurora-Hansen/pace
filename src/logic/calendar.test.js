import { describe, it, expect } from 'vitest';
import { blocksForRange, layoutDay, visibleHours } from './calendar.js';
import { createFixedBlock, DEFAULT_SETTINGS } from './models.js';
import { atMinutes } from './dates.js';

const h = (hours) => hours * 60;

function block(id, date, startHour, endHour, extra = {}) {
  return {
    id,
    start_time: atMinutes(date, h(startHour)).toISOString(),
    end_time: atMinutes(date, h(endHour)).toISOString(),
    ...extra,
  };
}

function fixed(id, date, startHour, endHour, recurrence = 'weekly') {
  return createFixedBlock(
    { title: id, start_time: atMinutes(date, h(startHour)), end_time: atMinutes(date, h(endHour)), recurrence },
    { id },
  );
}

describe('blocksForRange', () => {
  it('gir faste forekomster og arbeidsøkter i perioden, sortert', () => {
    const blocks = [
      fixed('forelesning', '2026-10-26', 10, 12),
      block('økt-inne', '2026-11-03', 8, 9, { is_fixed: false, task_id: 't1' }),
      block('økt-ute', '2026-11-10', 8, 9, { is_fixed: false, task_id: 't1' }),
    ];
    const result = blocksForRange(blocks, '2026-11-02', '2026-11-08');
    expect(result.map((b) => [b.source_id, b.date])).toEqual([
      ['forelesning', '2026-11-02'],
      ['økt-inne', '2026-11-03'],
    ]);
  });

  it('gir tom liste når ingenting er i perioden', () => {
    expect(blocksForRange([fixed('a', '2026-12-01', 10, 12, 'none')], '2026-11-02', '2026-11-08')).toEqual([]);
  });
});

describe('layoutDay', () => {
  const columnsOf = (layout) => Object.fromEntries(layout.map((l) => [l.block.id, [l.column, l.columns]]));

  it('gir én kolonne når ingenting overlapper', () => {
    const layout = layoutDay([block('a', '2026-11-02', 8, 10), block('b', '2026-11-02', 10, 12)]);
    expect(columnsOf(layout)).toEqual({ a: [0, 1], b: [0, 1] });
  });

  it('gir to kolonner ved delvis overlapp', () => {
    const layout = layoutDay([block('a', '2026-11-02', 8, 10), block('b', '2026-11-02', 9, 11)]);
    expect(columnsOf(layout)).toEqual({ a: [0, 2], b: [1, 2] });
  });

  it('gir tre kolonner for tre samtidige blokker', () => {
    const layout = layoutDay([
      block('a', '2026-11-02', 10, 12),
      block('b', '2026-11-02', 10, 12),
      block('c', '2026-11-02', 10, 11),
    ]);
    expect(Object.values(columnsOf(layout)).map(([, columns]) => columns)).toEqual([3, 3, 3]);
    expect(new Set(layout.map((l) => l.column))).toEqual(new Set([0, 1, 2]));
  });

  it('gjenbruker ledig kolonne i en kjede av overlapp', () => {
    // a overlapper b, b overlapper c, men a og c overlapper ikke
    const layout = layoutDay([
      block('a', '2026-11-02', 8, 10),
      block('b', '2026-11-02', 9, 12),
      block('c', '2026-11-02', 10, 11),
    ]);
    expect(columnsOf(layout)).toEqual({ a: [0, 2], b: [1, 2], c: [0, 2] });
  });

  it('behandler grupper hver for seg', () => {
    const layout = layoutDay([
      block('a', '2026-11-02', 8, 10),
      block('b', '2026-11-02', 9, 10),
      block('c', '2026-11-02', 14, 15),
    ]);
    expect(columnsOf(layout).c).toEqual([0, 1]);
  });

  it('gir tom liste for dag uten blokker', () => {
    expect(layoutDay([])).toEqual([]);
  });
});

describe('visibleHours', () => {
  it('viser studievinduet', () => {
    expect(visibleHours(DEFAULT_SETTINGS, [])).toEqual({ startHour: 8, endHour: 21 });
  });

  it('runder ut til hele timer', () => {
    const user = { ...DEFAULT_SETTINGS, study_window_start: '08:30', study_window_end: '20:15' };
    expect(visibleHours(user, [])).toEqual({ startHour: 8, endHour: 21 });
  });

  it('utvides for blokker utenfor vinduet', () => {
    const blocks = [block('tidlig', '2026-11-02', 7, 8), block('sen', '2026-11-03', 20, 22.5)];
    expect(visibleHours(DEFAULT_SETTINGS, blocks)).toEqual({ startHour: 7, endHour: 23 });
  });

  it('håndterer blokk som slutter ved midnatt', () => {
    const blocks = [block('kveld', '2026-11-02', 22, 24)];
    expect(visibleHours(DEFAULT_SETTINGS, blocks).endHour).toBe(24);
  });
});
