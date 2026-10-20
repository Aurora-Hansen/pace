import { describe, it, expect } from 'vitest';
import { registerProgress, completeTask, reopenTask, progressPercent, remainingHours } from './progress.js';
import { STATUS } from './models.js';

const task = (extra = {}) => ({
  id: 't1',
  estimated_hours: 8,
  completed_hours: 0,
  status: STATUS.NOT_STARTED,
  ...extra,
});

describe('registerProgress', () => {
  it('setter utførte timer og går fra ikke startet til påbegynt', () => {
    const result = registerProgress(task(), { hours: 3 });
    expect(result.completed_hours).toBe(3);
    expect(result.status).toBe(STATUS.IN_PROGRESS);
  });

  it('gjør om prosent til timer', () => {
    expect(registerProgress(task(), { percent: 25 }).completed_hours).toBe(2);
    expect(registerProgress(task({ estimated_hours: 3 }), { percent: 33 }).completed_hours).toBe(0.99);
  });

  it('begrenser verdier over 100 % og gjør oppgaven ferdig', () => {
    const fromPercent = registerProgress(task(), { percent: 150 });
    const fromHours = registerProgress(task(), { hours: 12 });
    expect(fromPercent.completed_hours).toBe(8);
    expect(fromHours.completed_hours).toBe(8);
    expect(fromHours.status).toBe(STATUS.COMPLETED);
  });

  it('godtar ikke negative verdier, og 0 betyr ikke startet', () => {
    const result = registerProgress(task({ completed_hours: 2, status: STATUS.IN_PROGRESS }), { hours: -1 });
    expect(result.completed_hours).toBe(0);
    expect(result.status).toBe(STATUS.NOT_STARTED);
  });

  it('går gjennom hele forløpet ikke startet → påbegynt → ferdig', () => {
    const started = registerProgress(task(), { hours: 4 });
    const done = registerProgress(started, { percent: 100 });
    expect([task().status, started.status, done.status]).toEqual([
      STATUS.NOT_STARTED,
      STATUS.IN_PROGRESS,
      STATUS.COMPLETED,
    ]);
  });

  it('endrer ikke oppgaven som sendes inn', () => {
    const original = Object.freeze(task());
    expect(() => registerProgress(original, { hours: 1 })).not.toThrow();
  });
});

describe('completeTask og reopenTask', () => {
  it('ferdig beholder registrert tid', () => {
    const done = completeTask(task({ completed_hours: 3, status: STATUS.IN_PROGRESS }));
    expect(done.status).toBe(STATUS.COMPLETED);
    expect(done.completed_hours).toBe(3);
  });

  it('gjenåpning gir riktig status ut fra registrert tid', () => {
    expect(reopenTask(completeTask(task({ completed_hours: 3 }))).status).toBe(STATUS.IN_PROGRESS);
    expect(reopenTask(completeTask(task())).status).toBe(STATUS.NOT_STARTED);
  });
});

describe('progressPercent og remainingHours', () => {
  it('regner prosent og gjenstående tid', () => {
    const t = task({ completed_hours: 2, status: STATUS.IN_PROGRESS });
    expect(progressPercent(t)).toBe(25);
    expect(remainingHours(t)).toBe(6);
  });

  it('ferdig oppgave er 100 % med 0 timer igjen', () => {
    const t = completeTask(task({ completed_hours: 1 }));
    expect(progressPercent(t)).toBe(100);
    expect(remainingHours(t)).toBe(0);
  });

  it('håndterer manglende estimat', () => {
    expect(progressPercent(task({ estimated_hours: 0 }))).toBe(0);
  });
});
