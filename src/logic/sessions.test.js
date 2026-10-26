import { describe, it, expect } from 'vitest';
import { mergeAdjacentSessions } from './sessions.js';
import { atMinutes } from './dates.js';

const DAY = '2026-11-04';
const at = (hm, date = DAY) => {
  const [h, m] = hm.split(':').map(Number);
  return atMinutes(date, h * 60 + m).toISOString();
};

function session(id, taskId, from, to, extra = {}) {
  return {
    id,
    task_id: taskId,
    course_id: null,
    title: taskId,
    start_time: at(from, extra.date),
    end_time: at(to, extra.date),
    is_fixed: false,
    recurrence: 'none',
    is_completed: false,
    is_locked: false,
    ...extra,
  };
}

function fixed(id, from, to) {
  return { ...session(id, null, from, to), course_id: 'c1', is_fixed: true, recurrence: 'weekly' };
}

const span = (block) => [block.id, block.start_time, block.end_time];

describe('mergeAdjacentSessions', () => {
  it('slår sammen to økter på rad til én', () => {
    const result = mergeAdjacentSessions([session('a1', 'a', '09:00', '10:00'), session('a2', 'a', '10:00', '11:30')]);
    expect(result).toHaveLength(1);
    expect(span(result[0])).toEqual(['a1', at('09:00'), at('11:30')]);
  });

  it('slår sammen tre økter på rad, også når listen ikke er sortert', () => {
    const result = mergeAdjacentSessions([
      session('a3', 'a', '11:00', '12:00'),
      session('a1', 'a', '09:00', '10:00'),
      session('a2', 'a', '10:00', '11:00'),
    ]);
    expect(result.map(span)).toEqual([['a1', at('09:00'), at('12:00')]]);
  });

  it('gir den sammenslåtte økten id-en og feltene til den første', () => {
    const first = session('a1', 'a', '09:00', '10:00', { title: 'Rapport', course_id: 'c1' });
    const [result] = mergeAdjacentSessions([first, session('a2', 'a', '10:00', '11:00', { title: 'annet' })]);
    expect(result).toEqual({ ...first, end_time: at('11:00') });
  });

  it('beholder rekkefølgen, med den sammenslåtte økten der den første sto', () => {
    const result = mergeAdjacentSessions([
      fixed('f1', '08:00', '09:00'),
      session('a1', 'a', '09:00', '10:00'),
      session('b1', 'b', '13:00', '14:00'),
      session('a2', 'a', '10:00', '11:00'),
    ]);
    expect(result.map((b) => b.id)).toEqual(['f1', 'a1', 'b1']);
  });

  it('slår ikke sammen når det ligger en pause imellom', () => {
    const blocks = [session('a1', 'a', '09:00', '10:00'), session('a2', 'a', '10:15', '11:00')];
    expect(mergeAdjacentSessions(blocks)).toBe(blocks);
  });

  it('slår ikke sammen en økt som ender 10.00 og en som starter 10.05', () => {
    const blocks = [session('a1', 'a', '09:00', '10:00'), session('a2', 'a', '10:05', '11:00')];
    expect(mergeAdjacentSessions(blocks)).toBe(blocks);
  });

  it('slår ikke sammen når en fast aktivitet ligger imellom', () => {
    const blocks = [session('a1', 'a', '08:00', '09:00'), fixed('f1', '09:00', '10:00'), session('a2', 'a', '10:00', '11:00')];
    expect(mergeAdjacentSessions(blocks)).toBe(blocks);
  });

  it('slår ikke sammen når en annen oppgave ligger imellom, og slår ikke sammen ulike oppgaver', () => {
    const blocks = [session('a1', 'a', '09:00', '10:00'), session('b1', 'b', '10:00', '11:00'), session('a2', 'a', '11:00', '12:00')];
    expect(mergeAdjacentSessions(blocks)).toBe(blocks);
  });

  it('slår ikke sammen en fullført og en ikke fullført økt', () => {
    const blocks = [session('a1', 'a', '09:00', '10:00', { is_completed: true }), session('a2', 'a', '10:00', '11:00')];
    expect(mergeAdjacentSessions(blocks)).toBe(blocks);
  });

  it('slår sammen to fullførte økter', () => {
    const result = mergeAdjacentSessions([
      session('a1', 'a', '09:00', '10:00', { is_completed: true }),
      session('a2', 'a', '10:00', '11:00', { is_completed: true }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].is_completed).toBe(true);
  });

  it('gjør låst og ulåst til én låst økt, uansett rekkefølge', () => {
    const lockedFirst = mergeAdjacentSessions([
      session('a1', 'a', '09:00', '10:00', { is_locked: true }),
      session('a2', 'a', '10:00', '11:00'),
    ]);
    const lockedLast = mergeAdjacentSessions([
      session('a1', 'a', '09:00', '10:00'),
      session('a2', 'a', '10:00', '11:00', { is_locked: true }),
    ]);
    expect(lockedFirst[0].is_locked).toBe(true);
    expect(lockedLast[0].is_locked).toBe(true);
  });

  it('slår ikke sammen økter på ulike dager', () => {
    const blocks = [
      session('a1', 'a', '22:00', '23:59'),
      session('a2', 'a', '00:00', '01:00', { date: '2026-11-05' }),
    ];
    blocks[0].end_time = at('00:00', '2026-11-05');
    expect(mergeAdjacentSessions(blocks)).toBe(blocks);
  });

  it('lager to bokser av to adskilte rekker for samme oppgave', () => {
    const result = mergeAdjacentSessions([
      session('a1', 'a', '08:00', '09:00'),
      session('a2', 'a', '09:00', '10:00'),
      session('a3', 'a', '13:00', '14:00'),
      session('a4', 'a', '14:00', '15:00'),
    ]);
    expect(result.map(span)).toEqual([
      ['a1', at('08:00'), at('10:00')],
      ['a3', at('13:00'), at('15:00')],
    ]);
  });

  it('rører ikke faste aktiviteter som ligger rett etter hverandre', () => {
    const blocks = [fixed('f1', '08:00', '09:00'), fixed('f2', '09:00', '10:00')];
    expect(mergeAdjacentSessions(blocks)).toBe(blocks);
  });

  it('rører ikke økter som overlapper', () => {
    const blocks = [session('a1', 'a', '09:00', '10:30'), session('a2', 'a', '10:00', '11:00')];
    expect(mergeAdjacentSessions(blocks)).toBe(blocks);
  });

  it('endrer ikke argumentet', () => {
    const blocks = [session('a1', 'a', '09:00', '10:00'), session('a2', 'a', '10:00', '11:00', { is_locked: true })];
    const copy = structuredClone(blocks);
    mergeAdjacentSessions(blocks);
    expect(blocks).toEqual(copy);
  });

  it('gir tom liste tilbake for tom liste', () => {
    const blocks = [];
    expect(mergeAdjacentSessions(blocks)).toBe(blocks);
  });
});
