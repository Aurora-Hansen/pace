import { describe, it, expect } from 'vitest';
import {
  STATUS,
  RECURRENCE,
  DEFAULT_SETTINGS,
  COURSE_COLORS,
  suggestCourseColor,
  fixedBlockFromInput,
  fixedBlockToInput,
  parseNumber,
  toIsoString,
  createInitialState,
  normalizeState,
  createCourse,
  createTask,
  createFixedBlock,
} from './models.js';

const now = new Date('2026-11-03T09:00:00Z');

describe('parseNumber', () => {
  it('godtar punktum, komma og tall', () => {
    expect(parseNumber('4.5')).toBe(4.5);
    expect(parseNumber('4,5')).toBe(4.5);
    expect(parseNumber(' 3 ')).toBe(3);
    expect(parseNumber(2)).toBe(2);
  });

  it('gir null for tomt eller ugyldig', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber(undefined)).toBeNull();
    expect(parseNumber(Number.NaN)).toBeNull();
  });
});

describe('toIsoString', () => {
  it('gjør om Date og datostreng til ISO', () => {
    expect(toIsoString(now)).toBe('2026-11-03T09:00:00.000Z');
    expect(toIsoString('2026-11-03T10:00')).toBe(new Date(2026, 10, 3, 10, 0).toISOString());
  });

  it('gir null for tomt eller ugyldig', () => {
    expect(toIsoString('')).toBeNull();
    expect(toIsoString('ikke en dato')).toBeNull();
  });
});

describe('createInitialState', () => {
  it('lager tom tilstand med standardinnstillinger', () => {
    const state = createInitialState({ userId: 'u1' });
    expect(state.user).toEqual({ id: 'u1', name: '', ...DEFAULT_SETTINGS });
    expect(state.courses).toEqual([]);
    expect(state.tasks).toEqual([]);
    expect(state.blocks).toEqual([]);
    expect(state.last_checked_date).toBeNull();
  });
});

describe('normalizeState', () => {
  it('fyller inn manglende felt og beholder lagrede verdier', () => {
    const state = normalizeState({ user: { id: 'u1', daily_available_study_hours: 6 }, tasks: [{ id: 't1' }] });
    expect(state.user).toEqual({ id: 'u1', name: '', ...DEFAULT_SETTINGS, daily_available_study_hours: 6 });
    expect(state.tasks).toEqual([{ id: 't1' }]);
    expect(state.courses).toEqual([]);
    expect(state.blocks).toEqual([]);
  });
});

describe('createCourse', () => {
  it('trimmer navn og bruker standardfarge', () => {
    expect(createCourse({ name: '  ITF10619 Programmering 2 ' }, { id: 'c1' })).toEqual({
      id: 'c1',
      name: 'ITF10619 Programmering 2',
      color: '#2E5B88',
    });
  });
});

describe('createTask', () => {
  it('lager oppgave med feltene fra datamodellen', () => {
    const task = createTask(
      { title: ' Rapport ', course_id: 'c1', estimated_hours: '7,5', deadline: '2026-11-10T23:59' },
      { id: 't1', now },
    );
    expect(task).toEqual({
      id: 't1',
      course_id: 'c1',
      title: 'Rapport',
      description: '',
      deadline: new Date(2026, 10, 10, 23, 59).toISOString(),
      estimated_hours: 7.5,
      completed_hours: 0,
      status: STATUS.NOT_STARTED,
      created_at: '2026-11-03T09:00:00.000Z',
    });
  });

  it('gir null for emne, frist og estimat som mangler', () => {
    const task = createTask({ title: 'X', course_id: '' }, { id: 't1', now });
    expect(task.course_id).toBeNull();
    expect(task.deadline).toBeNull();
    expect(task.estimated_hours).toBeNull();
  });
});

describe('suggestCourseColor', () => {
  it('foreslår første farge som ikke er brukt', () => {
    expect(suggestCourseColor([])).toBe(COURSE_COLORS[0]);
    expect(suggestCourseColor([{ color: COURSE_COLORS[0] }, { color: COURSE_COLORS[1].toLowerCase() }])).toBe(
      COURSE_COLORS[2],
    );
  });

  it('bruker standardfargen når alle er brukt', () => {
    expect(suggestCourseColor(COURSE_COLORS.map((color) => ({ color })))).toBe(COURSE_COLORS[0]);
  });
});

describe('fixedBlockFromInput og fixedBlockToInput', () => {
  const values = { title: 'Forelesning', course_id: 'c1', date: '2026-11-02', start: '10:15', end: '12:00', weekly: 'on' };

  it('lager ukentlig aktivitet med lokale klokkeslett', () => {
    const block = fixedBlockFromInput(values, { id: 'b1' });
    expect(block.start_time).toBe(new Date(2026, 10, 2, 10, 15).toISOString());
    expect(block.end_time).toBe(new Date(2026, 10, 2, 12, 0).toISOString());
    expect(block.recurrence).toBe(RECURRENCE.WEEKLY);
    expect(block.course_id).toBe('c1');
  });

  it('lager enkeltstående aktivitet når «gjentas» ikke er krysset av', () => {
    const { weekly: _weekly, ...once } = values;
    expect(fixedBlockFromInput(once, { id: 'b1' }).recurrence).toBe(RECURRENCE.NONE);
  });

  it('gir tilbake de samme skjemaverdiene', () => {
    expect(fixedBlockToInput(fixedBlockFromInput(values, { id: 'b1' }))).toEqual({ id: 'b1', ...values });
  });
});

describe('createFixedBlock', () => {
  it('lager fast, ukentlig aktivitet som standard', () => {
    const block = createFixedBlock(
      { title: 'Forelesning', start_time: '2026-11-03T10:15', end_time: '2026-11-03T12:00' },
      { id: 'b1' },
    );
    expect(block.is_fixed).toBe(true);
    expect(block.task_id).toBeNull();
    expect(block.recurrence).toBe(RECURRENCE.WEEKLY);
    expect(block.is_completed).toBe(false);
    expect(block.start_time).toBe(new Date(2026, 10, 3, 10, 15).toISOString());
  });

  it('kan være en enkeltstående aktivitet', () => {
    const block = createFixedBlock({ title: 'Veiledning', recurrence: 'none' }, { id: 'b1' });
    expect(block.recurrence).toBe(RECURRENCE.NONE);
  });
});
