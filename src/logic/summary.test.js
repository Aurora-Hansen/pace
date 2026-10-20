import { describe, it, expect } from 'vitest';
import { weekSummary } from './summary.js';
import { createFixedBlock } from './models.js';
import { atMinutes } from './dates.js';

const h = (hours) => Math.round(hours * 60);

const session = (date, from, to, completed = false) => ({
  id: `${date}-${from}`,
  task_id: 't1',
  start_time: atMinutes(date, h(from)).toISOString(),
  end_time: atMinutes(date, h(to)).toISOString(),
  is_fixed: false,
  is_completed: completed,
});

const data = (blocks) => ({ blocks });

describe('weekSummary', () => {
  it('gir null timer for en uke uten økter', () => {
    expect(weekSummary(data([]), '2026-11-04')).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
      plannedHours: 0,
      doneHours: 0,
      percent: 0,
    });
  });

  it('teller planlagte og gjennomførte timer i uken', () => {
    const blocks = [
      session('2026-11-02', 8, 10, true),
      session('2026-11-03', 8, 12, true),
      session('2026-11-05', 8, 10),
      session('2026-11-07', 10, 16),
    ];
    // 2 + 4 gjennomført av 2 + 4 + 2 + 6 = 14
    expect(weekSummary(data(blocks), '2026-11-04')).toMatchObject({ plannedHours: 14, doneHours: 6, percent: 43 });
  });

  it('tar med hele uken fra mandag 00:00 til søndag, og ingenting utenfor', () => {
    const blocks = [
      session('2026-11-01', 22, 23, true), // søndag uka før
      session('2026-11-02', 0, 1), // mandag kl. 00
      session('2026-11-08', 22.5, 23.5), // søndag kveld
      session('2026-11-09', 8, 9), // mandag uka etter
    ];
    expect(weekSummary(data(blocks), '2026-11-08')).toMatchObject({ plannedHours: 2, doneHours: 0 });
  });

  it('gir samme uke uansett hvilken dag i uken det er', () => {
    const blocks = [session('2026-11-04', 8, 10)];
    expect(weekSummary(data(blocks), '2026-11-02').plannedHours).toBe(2);
    expect(weekSummary(data(blocks), '2026-11-08').plannedHours).toBe(2);
    expect(weekSummary(data(blocks), '2026-11-09').plannedHours).toBe(0);
  });

  it('teller ikke faste aktiviteter', () => {
    const lecture = createFixedBlock(
      { title: 'Forelesning', start_time: atMinutes('2026-11-02', h(10)), end_time: atMinutes('2026-11-02', h(12)) },
      { id: 'f1' },
    );
    expect(weekSummary(data([lecture, session('2026-11-03', 8, 9)]), '2026-11-04').plannedHours).toBe(1);
  });

  it('teller riktig i uken sommertiden slutter', () => {
    // Økten søndag 25.10.2026, dagen sommertiden slutter, hører til uke 43
    const blocks = [session('2026-10-25', 10, 12, true), session('2026-10-19', 8, 9)];
    expect(weekSummary(data(blocks), '2026-10-21')).toMatchObject({
      from: '2026-10-19',
      to: '2026-10-25',
      plannedHours: 3,
      doneHours: 2,
      percent: 67,
    });
  });

  it('gir 100 % når alt er gjennomført, og halve timer uten avrundingsfeil', () => {
    const blocks = [session('2026-11-02', 8, 9.5, true), session('2026-11-03', 8, 8.25, true)];
    expect(weekSummary(data(blocks), '2026-11-04')).toMatchObject({ plannedHours: 1.75, doneHours: 1.75, percent: 100 });
  });
});
