import { describe, it, expect } from 'vitest';
import {
  ERRORS,
  validateCourse,
  validateTask,
  validateFixedBlock,
  validateFixedBlockInput,
  validateProgressInput,
  validateSettings,
  primaryError,
} from './validation.js';
import { DEFAULT_SETTINGS } from './models.js';

const now = new Date(2026, 10, 3, 12, 0);

describe('validateCourse', () => {
  it('godtar emne med navn og farge', () => {
    expect(validateCourse({ name: 'Matte', color: '#FF8C61' })).toEqual([]);
  });

  it('krever navn og gyldig farge', () => {
    expect(validateCourse({ name: '', color: 'rød' })).toEqual([
      { code: ERRORS.MANGLER_FELT, field: 'name' },
      { code: ERRORS.MANGLER_FELT, field: 'color' },
    ]);
  });
});

describe('validateTask', () => {
  const valid = {
    title: 'Rapport',
    estimated_hours: 5,
    deadline: new Date(2026, 10, 10, 23, 59).toISOString(),
  };

  it('godtar gyldig oppgave', () => {
    expect(validateTask(valid, now)).toEqual([]);
  });

  it('markerer alle felt som mangler', () => {
    const fields = validateTask({ title: '', estimated_hours: null, deadline: null }, now).map((e) => e.field);
    expect(fields).toEqual(['title', 'estimated_hours', 'deadline']);
  });

  it('avviser estimat på 0 eller mindre', () => {
    expect(validateTask({ ...valid, estimated_hours: 0 }, now)).toEqual([
      { code: ERRORS.MANGLER_FELT, field: 'estimated_hours' },
    ]);
  });

  it('avviser frist før eller lik «nå»', () => {
    const before = { ...valid, deadline: new Date(2026, 10, 3, 11, 59).toISOString() };
    const same = { ...valid, deadline: now.toISOString() };
    expect(validateTask(before, now)).toEqual([{ code: ERRORS.FRIST_I_FORTIDEN, field: 'deadline' }]);
    expect(validateTask(same, now)).toEqual([{ code: ERRORS.FRIST_I_FORTIDEN, field: 'deadline' }]);
  });

  it('godtar frist ett minutt etter «nå»', () => {
    const soon = { ...valid, deadline: new Date(2026, 10, 3, 12, 1).toISOString() };
    expect(validateTask(soon, now)).toEqual([]);
  });
});

describe('validateFixedBlock', () => {
  const at = (h) => new Date(2026, 10, 3, h, 0).toISOString();

  it('godtar gyldig aktivitet', () => {
    expect(validateFixedBlock({ title: 'Forelesning', start_time: at(10), end_time: at(12) })).toEqual([]);
  });

  it('avviser sluttid før eller lik starttid', () => {
    expect(validateFixedBlock({ title: 'X', start_time: at(12), end_time: at(10) })).toEqual([
      { code: ERRORS.SLUTT_FOR_START, field: 'end_time' },
    ]);
    expect(validateFixedBlock({ title: 'X', start_time: at(12), end_time: at(12) })).toHaveLength(1);
  });

  it('markerer felt som mangler', () => {
    const fields = validateFixedBlock({ title: '', start_time: null, end_time: null }).map((e) => e.field);
    expect(fields).toEqual(['title', 'start_time', 'end_time']);
  });
});

describe('validateFixedBlockInput', () => {
  const valid = { title: 'Forelesning', date: '2026-11-02', start: '10:15', end: '12:00' };

  it('godtar gyldige skjemaverdier', () => {
    expect(validateFixedBlockInput(valid)).toEqual([]);
  });

  it('markerer felt som mangler eller er ugyldige', () => {
    const fields = validateFixedBlockInput({ title: '  ', date: '2026-02-30', start: '', end: '25:00' }).map(
      (e) => e.field,
    );
    expect(fields).toEqual(['title', 'date', 'start', 'end']);
  });

  it('avviser sluttid før eller lik starttid', () => {
    expect(validateFixedBlockInput({ ...valid, end: '10:00' })).toEqual([
      { code: ERRORS.SLUTT_FOR_START, field: 'end' },
    ]);
    expect(validateFixedBlockInput({ ...valid, end: '10:15' })).toHaveLength(1);
  });
});

describe('validateProgressInput', () => {
  it('godtar 0 og positive tall, også med komma', () => {
    expect(validateProgressInput({ amount: '0' })).toEqual([]);
    expect(validateProgressInput({ amount: '2,5' })).toEqual([]);
  });

  it('avviser tomt, negativt og ugyldig', () => {
    for (const amount of ['', '-1', 'mye']) {
      expect(validateProgressInput({ amount })).toEqual([{ code: ERRORS.MANGLER_FELT, field: 'amount' }]);
    }
  });
});

describe('validateSettings', () => {
  it('godtar standardinnstillingene', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS })).toEqual([]);
  });

  it('avviser kapasitet som mangler, er 0 eller over 24', () => {
    for (const hours of [null, 0, 25]) {
      expect(validateSettings({ ...DEFAULT_SETTINGS, daily_available_study_hours: hours })).toEqual([
        { code: ERRORS.MANGLER_FELT, field: 'daily_available_study_hours' },
      ]);
    }
  });

  it('avviser studievindu der slutt er før start', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, study_window_start: '20:00', study_window_end: '08:00' })).toEqual([
      { code: ERRORS.SLUTT_FOR_START, field: 'study_window_end' },
    ]);
  });

  it('avviser ugyldig klokkeslett', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, study_window_start: '' })).toEqual([
      { code: ERRORS.MANGLER_FELT, field: 'study_window_start' },
    ]);
  });
});

describe('primaryError', () => {
  it('viser manglende felt før andre feil', () => {
    const errors = [
      { code: ERRORS.SLUTT_FOR_START, field: 'end_time' },
      { code: ERRORS.MANGLER_FELT, field: 'title' },
    ];
    expect(primaryError(errors)).toEqual({ code: ERRORS.MANGLER_FELT, field: 'title' });
  });

  it('gir null uten feil', () => {
    expect(primaryError([])).toBeNull();
  });
});
