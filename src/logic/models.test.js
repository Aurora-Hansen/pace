import { describe, it, expect } from 'vitest';
import {
  STATUS,
  RECURRENCE,
  PRIORITY,
  DAY_OFF_KIND,
  DEFAULT_SETTINGS,
  COURSE_COLORS,
  suggestCourseColor,
  fixedBlockFromInput,
  fixedBlockToInput,
  deadlineFromInput,
  taskFromInput,
  updateTaskFromInput,
  taskToInput,
  numberToInput,
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

describe('numberToInput', () => {
  it('bruker desimalkomma og gir tom tekst for manglende verdi', () => {
    expect(numberToInput(6.5)).toBe('6,5');
    expect(numberToInput(4)).toBe('4');
    expect(numberToInput(null)).toBe('');
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
    expect(state.onboarding_done).toBe(false);
    expect(state.days_off).toEqual([]);
  });

  it('har standardverdier for øktene som gir samme plan som før v2', () => {
    expect(createInitialState({ userId: 'u1' }).user).toMatchObject({
      preferred_session_minutes: 120,
      min_session_minutes: 30,
      break_minutes: 15,
      preferred_times: [],
    });
  });

  it('kan ikke endre den delte standardlisten for foretrukne tider', () => {
    const { user } = createInitialState({ userId: 'u1' });
    expect(() => user.preferred_times.push({})).toThrow();
    expect(DEFAULT_SETTINGS.preferred_times).toEqual([]);
  });
});

describe('normalizeState', () => {
  it('regner veiviseren som vist for eldre data med innhold, men ikke for tomme data', () => {
    expect(normalizeState({ user: { id: 'u1' }, tasks: [{ id: 't1' }] }).onboarding_done).toBe(true);
    expect(normalizeState({ user: { id: 'u1' } }).onboarding_done).toBe(false);
    expect(normalizeState({ user: { id: 'u1' }, onboarding_done: false, tasks: [{ id: 't1' }] }).onboarding_done).toBe(false);
  });

  it('fyller inn manglende felt og beholder lagrede verdier', () => {
    const state = normalizeState({ user: { id: 'u1', daily_available_study_hours: 6 }, tasks: [{ id: 't1' }] });
    expect(state.user).toEqual({ id: 'u1', name: '', ...DEFAULT_SETTINGS, daily_available_study_hours: 6 });
    expect(state.tasks).toEqual([{ id: 't1', priority: 'normal' }]);
    expect(state.courses).toEqual([]);
    expect(state.blocks).toEqual([]);
    expect(state.days_off).toEqual([]);
  });

  // Datamodell v2 (steg 9.2)
  it('fyller inn v2-felt som mangler i eldre data', () => {
    const state = normalizeState({
      user: { id: 'u1', daily_available_study_hours: 3 },
      tasks: [{ id: 't1' }],
      blocks: [{ id: 'b1', is_fixed: false }],
    });
    expect(state.user).toMatchObject({
      daily_available_study_hours: 3,
      preferred_session_minutes: 120,
      min_session_minutes: 30,
      break_minutes: 15,
      preferred_times: [],
    });
    expect(state.tasks[0].priority).toBe(PRIORITY.NORMAL);
    expect(state.blocks[0].is_locked).toBe(false);
    expect(state.days_off).toEqual([]);
  });

  it('endrer ikke v2-felt som finnes', () => {
    const preferred = [{ id: 'p1', weekdays: [1, 2, 3, 4, 5], start: '09:00', end: '15:00' }];
    const daysOff = [{ date: '2026-11-04', kind: DAY_OFF_KIND.SICK }];
    const raw = {
      user: { id: 'u1', preferred_session_minutes: 50, min_session_minutes: 45, break_minutes: 0, preferred_times: preferred },
      tasks: [{ id: 't1', priority: PRIORITY.HIGH }],
      blocks: [{ id: 'b1', is_fixed: false, is_locked: true }],
      days_off: daysOff,
    };
    const state = normalizeState(raw);
    expect(state.user).toMatchObject({ preferred_session_minutes: 50, min_session_minutes: 45, break_minutes: 0 });
    expect(state.user.preferred_times).toBe(preferred);
    expect(state.tasks[0].priority).toBe(PRIORITY.HIGH);
    expect(state.blocks[0].is_locked).toBe(true);
    expect(state.days_off).toBe(daysOff);
  });

  it('endrer ikke argumentet', () => {
    const raw = { user: { id: 'u1' }, tasks: [{ id: 't1' }], blocks: [{ id: 'b1' }] };
    const copy = structuredClone(raw);
    normalizeState(raw);
    expect(raw).toEqual(copy);
  });

  it('lar elementer som ikke er objekter være i fred, så valideringen kan finne dem', () => {
    expect(normalizeState({ user: { id: 'u1' }, tasks: ['tull', null] }).tasks).toEqual(['tull', null]);
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
      allow_over_capacity: false,
      priority: PRIORITY.NORMAL,
    });
  });

  it('har normal prioritet som standard og godtar bare gyldige verdier', () => {
    expect(createTask({ priority: PRIORITY.HIGH }, { id: 't1', now }).priority).toBe(PRIORITY.HIGH);
    expect(createTask({ priority: PRIORITY.LOW }, { id: 't1', now }).priority).toBe(PRIORITY.LOW);
    expect(createTask({ priority: 'viktig' }, { id: 't1', now }).priority).toBe(PRIORITY.NORMAL);
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

describe('deadlineFromInput', () => {
  it('bruker 23:59 når klokkeslett mangler', () => {
    expect(deadlineFromInput('2026-11-10', '')).toBe(new Date(2026, 10, 10, 23, 59).toISOString());
    expect(deadlineFromInput('2026-11-10', '12:00')).toBe(new Date(2026, 10, 10, 12, 0).toISOString());
  });

  it('gir null for ugyldig dato eller klokkeslett', () => {
    expect(deadlineFromInput('', '12:00')).toBeNull();
    expect(deadlineFromInput('2026-11-10', '25:00')).toBeNull();
  });
});

describe('taskFromInput, updateTaskFromInput og taskToInput', () => {
  const values = {
    title: ' Arbeidskrav 2 ',
    course_id: 'c1',
    description: 'Rapport på 2000 ord',
    estimated_hours: '6,5',
    deadline_date: '2026-11-10',
    deadline_time: '14:00',
  };

  it('lager ny oppgave fra skjemaet', () => {
    const task = taskFromInput(values, { id: 't1', now });
    expect(task).toMatchObject({
      id: 't1',
      title: 'Arbeidskrav 2',
      course_id: 'c1',
      estimated_hours: 6.5,
      completed_hours: 0,
      status: STATUS.NOT_STARTED,
      deadline: new Date(2026, 10, 10, 14, 0).toISOString(),
      created_at: now.toISOString(),
    });
  });

  it('beholder fremgang og status ved endring', () => {
    const existing = { ...taskFromInput(values, { id: 't1', now }), completed_hours: 2, status: STATUS.IN_PROGRESS };
    const updated = updateTaskFromInput(existing, { ...values, title: 'Nytt navn' });
    expect(updated).toMatchObject({ id: 't1', title: 'Nytt navn', completed_hours: 2, status: STATUS.IN_PROGRESS });
  });

  it('gir tilbake skjemaverdiene', () => {
    const task = taskFromInput(values, { id: 't1', now });
    expect(taskToInput(task)).toEqual({ id: 't1', ...values, title: 'Arbeidskrav 2' });
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
    expect(block.is_locked).toBe(false);
    expect(block.start_time).toBe(new Date(2026, 10, 3, 10, 15).toISOString());
  });

  it('kan være en enkeltstående aktivitet', () => {
    const block = createFixedBlock({ title: 'Veiledning', recurrence: 'none' }, { id: 'b1' });
    expect(block.recurrence).toBe(RECURRENCE.NONE);
  });
});
