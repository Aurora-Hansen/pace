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

// Steg 10.2: en sammenslått økt registrerer hele lengden (F10)
describe('sammenslått økt', () => {
  it('registrerer hele lengden når den hukes av, og trekker hele lengden fra igjen', () => {
    const [merged] = mergeAdjacentSessions([session('a', 't1', TODAY, 9, 10), session('b', 't1', TODAY, 10, 11.5)]);
    const done = completeSession(data([merged]), 'a');
    expect(done.tasks[0].completed_hours).toBe(2.5);
    expect(uncompleteSession(done, 'a').tasks[0].completed_hours).toBe(0);
  });
});
