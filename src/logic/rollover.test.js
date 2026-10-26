import { describe, it, expect } from 'vitest';
import { replan, rollover } from './rollover.js';
import { DEFAULT_SETTINGS, STATUS, createFixedBlock } from './models.js';
import { atMinutes, toDateKey, minutesSinceMidnight, formatTime } from './dates.js';

const h = (hours) => Math.round(hours * 60);
const MON = '2026-11-02';
const TUE = '2026-11-03';
const WED = '2026-11-04';
const THU = '2026-11-05';

function task(id, hours, deadlineDate, deadlineHour = 23.99, extra = {}) {
  return {
    id,
    course_id: null,
    title: id,
    estimated_hours: hours,
    completed_hours: 0,
    status: STATUS.NOT_STARTED,
    deadline: atMinutes(deadlineDate, h(deadlineHour)).toISOString(),
    ...extra,
  };
}

function session(taskId, date, from, to, extra = {}) {
  const start = atMinutes(date, h(from)).toISOString();
  return {
    id: `${taskId}@${start}`,
    task_id: taskId,
    course_id: null,
    title: taskId,
    start_time: start,
    end_time: atMinutes(date, h(to)).toISOString(),
    is_fixed: false,
    recurrence: 'none',
    is_completed: false,
    ...extra,
  };
}

function fixed(id, date, from, to) {
  return createFixedBlock(
    { title: id, start_time: atMinutes(date, h(from)), end_time: atMinutes(date, h(to)), recurrence: 'weekly' },
    { id },
  );
}

function data({ tasks = [], blocks = [], capacity = 4, last_checked_date = null } = {}) {
  return {
    user: { id: 'u1', name: '', ...DEFAULT_SETTINGS, daily_available_study_hours: capacity },
    courses: [],
    tasks,
    blocks,
    last_checked_date,
  };
}

// Øktene som lesbar tekst, sortert: «oppgave dato fra–til»
const sessions = (state) =>
  state.blocks
    .filter((b) => !b.is_fixed)
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .map((b) => {
      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      return `${b.task_id} ${toDateKey(start)} ${formatTime(minutesSinceMidnight(start))}–${formatTime(minutesSinceMidnight(end))}${b.is_completed ? ' (ferdig)' : ''}`;
    });

describe('replan', () => {
  const now = atMinutes(MON, h(9));

  it('rører ikke dagens økter, selv når en ny oppgave har tidligere frist', () => {
    const today = session('gammel', MON, 10, 12);
    const state = data({
      tasks: [task('gammel', 2, THU), task('ny', 1, WED)],
      blocks: [today],
    });
    const result = replan(state, now);
    expect(result.blocks).toContain(today);
    // Ny oppgave får ledig tid før og etter, men dagens økt 10–12 står der den står
    expect(sessions(result)).toEqual([
      'ny 2026-11-02 09:00–09:30',
      'gammel 2026-11-02 10:00–12:00',
      'ny 2026-11-02 12:15–12:45',
    ]);
  });

  it('planlegger ufullførte økter fra i morgen på nytt', () => {
    // Fremgang er registrert, så bare 1 time gjenstår, men to timer ligger planlagt på tirsdag
    const state = data({
      tasks: [task('a', 3, THU, 23.99, { completed_hours: 2, status: STATUS.IN_PROGRESS })],
      blocks: [session('a', TUE, 8, 10)],
    });
    expect(sessions(replan(state, now))).toEqual(['a 2026-11-02 09:00–10:00']);
  });

  it('gir ny oppgave med frist i morgen tidlig en økt i dag når det er ledig tid etter «nå»', () => {
    const state = data({ tasks: [task('ny', 1, TUE, 9)] });
    expect(sessions(replan(state, now))).toEqual(['ny 2026-11-02 09:00–10:00']);
  });

  it('gir ingen økt i dag når resten av dagen er full', () => {
    const state = data({ tasks: [task('ny', 1, TUE, 9)], blocks: [fixed('jobb', MON, 9, 21)] });
    expect(sessions(replan(state, now))).toEqual(['ny 2026-11-03 08:00–09:00']);
  });

  it('gir ingen økt i dag når dagskapasiteten er brukt opp', () => {
    const state = data({
      tasks: [task('gammel', 2, THU), task('ny', 1, TUE, 9)],
      blocks: [session('gammel', MON, 9, 11)],
      capacity: 2,
    });
    expect(sessions(replan(state, now))).toEqual(['gammel 2026-11-02 09:00–11:00', 'ny 2026-11-03 08:00–09:00']);
  });

  it('beholder fullførte økter og faste aktiviteter', () => {
    const done = session('a', TUE, 8, 9, { is_completed: true });
    const lecture = fixed('forelesning', TUE, 10, 12);
    const result = replan(data({ tasks: [task('a', 2, THU)], blocks: [done, lecture] }), now);
    expect(result.blocks).toContain(done);
    expect(result.blocks).toContain(lecture);
  });

  it('fjerner økter for ferdige og slettede oppgaver, også i dag', () => {
    const state = data({
      tasks: [task('ferdig', 2, THU, 23.99, { status: STATUS.COMPLETED })],
      blocks: [session('ferdig', MON, 10, 12), session('slettet', MON, 13, 14)],
    });
    expect(sessions(replan(state, now))).toEqual([]);
  });

  it('planlegger ikke oppgave med passert frist', () => {
    const state = data({ tasks: [task('passert', 2, '2026-11-01')], blocks: [session('passert', TUE, 8, 10)] });
    expect(sessions(replan(state, now))).toEqual([]);
  });

  it('endrer ikke tilstanden som sendes inn', () => {
    const state = Object.freeze(data({ tasks: [Object.freeze(task('a', 2, THU))] }));
    expect(() => replan(state, now)).not.toThrow();
  });
});

describe('rollover', () => {
  it('gjør ingenting samme dag', () => {
    const state = data({ tasks: [task('a', 2, THU)], last_checked_date: MON });
    expect(rollover(state, atMinutes(MON, h(15)))).toBe(state);
  });

  it('flytter gårsdagens uferdige økt til ledig tid i dag', () => {
    const state = data({
      tasks: [task('a', 2, THU)],
      blocks: [session('a', MON, 10, 12)],
      last_checked_date: MON,
    });
    const result = rollover(state, atMinutes(TUE, h(8)));
    expect(sessions(result)).toEqual(['a 2026-11-03 08:00–10:00']);
    expect(result.last_checked_date).toBe(TUE);
  });

  it('beholder fullførte økter og planlegger bare det som gjenstår', () => {
    const state = data({
      tasks: [task('a', 3, THU, 23.99, { completed_hours: 1, status: STATUS.IN_PROGRESS })],
      blocks: [session('a', MON, 8, 9, { is_completed: true }), session('a', MON, 10, 12)],
      last_checked_date: MON,
    });
    expect(sessions(rollover(state, atMinutes(TUE, h(8))))).toEqual([
      'a 2026-11-02 08:00–09:00 (ferdig)',
      'a 2026-11-03 08:00–10:00',
    ]);
  });

  it('håndterer flere dager borte', () => {
    const state = data({
      tasks: [task('a', 4, '2026-11-06')],
      blocks: [session('a', MON, 8, 10), session('a', TUE, 8, 10)],
      last_checked_date: MON,
    });
    const result = rollover(state, atMinutes(THU, h(14)));
    expect(sessions(result)).toEqual(['a 2026-11-05 14:00–16:00', 'a 2026-11-05 16:15–18:15']);
    expect(result.last_checked_date).toBe(THU);
  });

  it('fjerner økter for oppgave med passert frist uten å planlegge nye', () => {
    const state = data({
      tasks: [task('a', 4, TUE, 12)],
      blocks: [session('a', MON, 8, 10)],
      last_checked_date: MON,
    });
    expect(sessions(rollover(state, atMinutes(WED, h(8))))).toEqual([]);
  });

  it('gjør ingenting når «nå» er før forrige sjekk (tilbake fra simulert dato)', () => {
    const state = data({ tasks: [task('a', 2, '2026-11-20')], last_checked_date: '2026-11-10' });
    expect(rollover(state, atMinutes(MON, h(8)))).toBe(state);
  });

  it('kjører første gang appen åpnes og lagrer datoen', () => {
    const result = rollover(data({ tasks: [task('a', 1, THU)] }), atMinutes(MON, h(8)));
    expect(result.last_checked_date).toBe(MON);
    expect(sessions(result)).toEqual(['a 2026-11-02 08:00–09:00']);
  });

  it('beholder faste aktiviteter uendret', () => {
    const lecture = Object.freeze(fixed('forelesning', MON, 8, 10));
    const result = rollover(data({ blocks: [lecture], last_checked_date: MON }), atMinutes(TUE, h(8)));
    expect(result.blocks).toEqual([lecture]);
  });
});

// Steg 10.2: økter for samme oppgave som ligger rett etter hverandre, blir én økt (F10)
describe('sammenslåing i replan og rollover', () => {
  it('replan slår sammen to av dagens økter som ligger rett etter hverandre', () => {
    const now = atMinutes(MON, h(9));
    const state = data({
      // Oppgaven trenger akkurat de 2,5 timene som allerede ligger i dag
      tasks: [task('rapport', 2.5, THU)],
      blocks: [session('rapport', MON, 10, 11), session('rapport', MON, 11, 12.5)],
    });
    const result = replan(state, now);
    expect(sessions(result)).toEqual([`rapport ${MON} 10:00–12:30`]);
    expect(result.blocks.find((b) => b.task_id === 'rapport' && b.start_time.startsWith('2026-11-02')).id).toBe(
      state.blocks[0].id,
    );
  });

  it('rollover slår sammen fullførte økter fra i går som ligger rett etter hverandre', () => {
    const now = atMinutes(TUE, h(7));
    const state = data({
      tasks: [task('rapport', 2, THU, 23.99, { completed_hours: 2, status: STATUS.IN_PROGRESS })],
      blocks: [
        session('rapport', MON, 8, 9, { is_completed: true }),
        session('rapport', MON, 9, 10, { is_completed: true }),
      ],
      last_checked_date: MON,
    });
    expect(sessions(rollover(state, now))).toEqual([`rapport ${MON} 08:00–10:00 (ferdig)`]);
  });

  it('slår ikke sammen økter med pause imellom', () => {
    const now = atMinutes(MON, h(9));
    const state = data({
      tasks: [task('rapport', 1.75, THU)],
      blocks: [session('rapport', MON, 10, 11), session('rapport', MON, 11.25, 12)],
    });
    expect(sessions(replan(state, now))).toEqual([
      `rapport ${MON} 10:00–11:00`,
      `rapport ${MON} 11:15–12:00`,
    ]);
  });
});
