import { describe, it, expect } from 'vitest';
import { todayAgenda, completeSession, uncompleteSession } from './today.js';
import { STATUS, createFixedBlock } from './models.js';
import { atMinutes } from './dates.js';
import { mergeAdjacentSessions } from './sessions.js';

const h = (hours) => Math.round(hours * 60);
const TODAY = '2026-11-04';

function session(id, taskId, date, from, to, extra = {}) {
  return {
    id,
    task_id: taskId,
    start_time: atMinutes(date, h(from)).toISOString(),
    end_time: atMinutes(date, h(to)).toISOString(),
    is_fixed: false,
    is_completed: false,
    ...extra,
  };
}

const fixed = (id, date, from, to) =>
  createFixedBlock(
    { title: id, start_time: atMinutes(date, h(from)), end_time: atMinutes(date, h(to)), recurrence: 'weekly' },
    { id },
  );

const task = (extra = {}) => ({ id: 't1', estimated_hours: 4, completed_hours: 0, status: STATUS.NOT_STARTED, ...extra });

const data = (blocks, tasks = [task()]) => ({ tasks, blocks });

describe('todayAgenda', () => {
  it('gir dagens aktiviteter og økter i tidsrekkefølge, med ukentlige aktiviteter utvidet', () => {
    const blocks = [
      session('økt-sen', 't1', TODAY, 14, 16),
      fixed('forelesning', '2026-10-28', 10, 12), // onsdag uka før
      session('økt-tidlig', 't1', TODAY, 8, 9),
      session('i-morgen', 't1', '2026-11-05', 8, 9),
    ];
    const { items } = todayAgenda(data(blocks), TODAY);
    expect(items.map((item) => item.source_id)).toEqual(['økt-tidlig', 'forelesning', 'økt-sen']);
  });

  it('teller økter og gjennomførte økter, ikke faste aktiviteter', () => {
    const blocks = [
      session('a', 't1', TODAY, 8, 9, { is_completed: true }),
      session('b', 't1', TODAY, 10, 11),
      fixed('forelesning', TODAY, 12, 14),
    ];
    expect(todayAgenda(data(blocks), TODAY)).toMatchObject({ sessionsTotal: 2, sessionsDone: 1 });
  });

  it('gir tom liste for en dag uten noe', () => {
    expect(todayAgenda(data([]), TODAY)).toEqual({ items: [], sessionsTotal: 0, sessionsDone: 0 });
  });
});

describe('completeSession', () => {
  const blocks = [session('a', 't1', TODAY, 8, 9.5), session('b', 't1', TODAY, 10, 11)];

  it('huker av økten og legger varigheten til oppgaven', () => {
    const result = completeSession(data(blocks), 'a');
    expect(result.blocks.find((b) => b.id === 'a').is_completed).toBe(true);
    expect(result.tasks[0]).toMatchObject({ completed_hours: 1.5, status: STATUS.IN_PROGRESS });
  });

  it('gir ikke dobbel tid når samme økt hukes av to ganger', () => {
    const once = completeSession(data(blocks), 'a');
    const twice = completeSession(once, 'a');
    expect(twice).toBe(once);
    expect(twice.tasks[0].completed_hours).toBe(1.5);
  });

  it('gjør oppgaven ferdig når all tid er gjennomført', () => {
    const result = completeSession(data(blocks, [task({ estimated_hours: 1.5 })]), 'a');
    expect(result.tasks[0].status).toBe(STATUS.COMPLETED);
  });

  it('endrer ikke andre økter eller oppgaver, og ignorerer faste aktiviteter', () => {
    const other = { id: 't2', estimated_hours: 2, completed_hours: 0, status: STATUS.NOT_STARTED };
    const withFixed = data([...blocks, fixed('forelesning', TODAY, 12, 14)], [task(), other]);
    const result = completeSession(withFixed, 'a');
    expect(result.blocks.find((b) => b.id === 'b').is_completed).toBe(false);
    expect(result.tasks[1]).toBe(other);
    expect(completeSession(withFixed, 'forelesning')).toBe(withFixed);
  });

  it('endrer ikke det som sendes inn', () => {
    const frozen = Object.freeze(data(blocks.map((b) => Object.freeze(b)), [Object.freeze(task())]));
    expect(() => completeSession(frozen, 'a')).not.toThrow();
  });
});

describe('uncompleteSession', () => {
  it('fjerner avhuking og trekker tiden fra igjen', () => {
    const blocks = [session('a', 't1', TODAY, 8, 9.5)];
    const done = completeSession(data(blocks), 'a');
    const undone = uncompleteSession(done, 'a');
    expect(undone.blocks[0].is_completed).toBe(false);
    expect(undone.tasks[0]).toMatchObject({ completed_hours: 0, status: STATUS.NOT_STARTED });
  });

  it('gjør ingenting med en økt som ikke er huket av', () => {
    const state = data([session('a', 't1', TODAY, 8, 9)]);
    expect(uncompleteSession(state, 'a')).toBe(state);
  });
});

// Steg 10.2: en sammenslått økt registrerer hele lengden (F10), og angring gir tilbake tilstanden fra før
describe('sammenslått økt', () => {
  const ids = (d) => d.blocks.map((b) => [b.id, b.is_completed]);
  // Som replan: fullførte økter rett etter hverandre slås sammen
  const merge = (d) => ({ ...d, blocks: mergeAdjacentSessions(d.blocks) });

  it('registrerer hele lengden når en planlagt sammenslått økt hukes av, og angring trekker alt fra', () => {
    const [merged] = mergeAdjacentSessions([session('a', 't1', TODAY, 9, 10), session('b', 't1', TODAY, 10, 11.5)]);
    const done = completeSession(data([merged]), 'a');
    expect(done.tasks[0].completed_hours).toBe(2.5);
    expect(uncompleteSession(done, 'a').tasks[0].completed_hours).toBe(0);
  });

  it('B er fullført, A hukes av og slås sammen med B: angring gir to økter der bare B er fullført', () => {
    const before = completeSession(data([session('A', 't1', TODAY, 9, 10), session('B', 't1', TODAY, 10, 11.5)]), 'B');
    expect(before.tasks[0].completed_hours).toBe(1.5);

    const merged = merge(completeSession(before, 'A'));
    expect(merged.blocks).toHaveLength(1);
    expect(merged.tasks[0].completed_hours).toBe(2.5);

    // Angring: bare As tid trekkes fra, og øktene er som før
    const undone = uncompleteSession(merged, merged.blocks[0].id);
    expect(ids(undone)).toEqual([
      ['A', false],
      ['B', true],
    ]);
    expect(undone.tasks[0].completed_hours).toBe(1.5);
    expect(undone.blocks).toEqual(before.blocks);
  });

  it('angrer også når den siste avhukingen er den andre delen i tid', () => {
    const start = data([session('A', 't1', TODAY, 9, 10), session('B', 't1', TODAY, 10, 11)]);
    const merged = merge(completeSession(completeSession(start, 'A'), 'B'));
    const undone = uncompleteSession(merged, 'A');
    expect(ids(undone)).toEqual([
      ['A', true],
      ['B', false],
    ]);
    expect(undone.tasks[0].completed_hours).toBe(1);
  });

  it('deler opp tre deler riktig når den midterste angres', () => {
    const start = data([session('A', 't1', TODAY, 9, 10), session('B', 't1', TODAY, 10, 11), session('C', 't1', TODAY, 11, 12)]);
    const merged = merge(completeSession(completeSession(completeSession(start, 'A'), 'C'), 'B'));
    expect(merged.blocks).toHaveLength(1);
    const undone = uncompleteSession(merged, 'A');
    expect(ids(undone)).toEqual([
      ['A', true],
      ['B', false],
      ['C', true],
    ]);
    expect(undone.tasks[0].completed_hours).toBe(2);
  });

  it('kan angre del for del, i omvendt rekkefølge av avhukingen', () => {
    const start = data([session('A', 't1', TODAY, 9, 10), session('B', 't1', TODAY, 10, 11)]);
    const merged = merge(completeSession(completeSession(start, 'B'), 'A'));
    const once = uncompleteSession(merged, 'A');
    expect(ids(once)).toEqual([
      ['A', false],
      ['B', true],
    ]);
    // Når begge er planlagt igjen, har de lik status og blir én økt, som før de ble huket av
    const twice = uncompleteSession(once, 'B');
    expect(ids(twice)).toEqual([['A', false]]);
    expect(twice.blocks[0].end_time).toBe(start.blocks[1].end_time);
    expect(twice.tasks[0].completed_hours).toBe(0);
  });

  it('gir hver avhuking et høyere nummer, også når tidligere deler er slått sammen', () => {
    const start = data([session('A', 't1', TODAY, 9, 10), session('B', 't1', TODAY, 10, 11), session('C', 't1', TODAY, 14, 15)]);
    const three = completeSession(merge(completeSession(completeSession(start, 'A'), 'B')), 'C');
    expect(three.blocks.find((b) => b.id === 'C').completed_order).toBe(3);
  });

  it('angrer en fullført økt uten nummer (data fra før nummereringen) som før', () => {
    const old = data([session('A', 't1', TODAY, 9, 10, { is_completed: true })], [task({ completed_hours: 1 })]);
    const undone = uncompleteSession(old, 'A');
    expect(ids(undone)).toEqual([['A', false]]);
    expect(undone.tasks[0].completed_hours).toBe(0);
  });
});
