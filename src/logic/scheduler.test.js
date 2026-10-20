import { describe, it, expect } from 'vitest';
import { scheduleTasks, removeFutureSessions } from './scheduler.js';
import { DEFAULT_SETTINGS, STATUS, createFixedBlock } from './models.js';
import { atMinutes, toDateKey, minutesSinceMidnight, formatTime } from './dates.js';

const h = (hours) => Math.round(hours * 60);

// Mandag 2. november 2026 kl. 07:00
const MON = '2026-11-02';
const TUE = '2026-11-03';
const WED = '2026-11-04';
const now = atMinutes(MON, h(7));
const user = { ...DEFAULT_SETTINGS, daily_available_study_hours: 4 };

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

function fixed(id, date, from, to, recurrence = 'weekly') {
  return createFixedBlock(
    { title: id, start_time: atMinutes(date, h(from)), end_time: atMinutes(date, h(to)), recurrence },
    { id },
  );
}

function session(taskId, date, from, to, extra = {}) {
  return {
    id: `${taskId}-${date}-${from}`,
    task_id: taskId,
    start_time: atMinutes(date, h(from)).toISOString(),
    end_time: atMinutes(date, h(to)).toISOString(),
    is_fixed: false,
    is_completed: false,
    ...extra,
  };
}

// Øktene som lesbar tekst: «oppgave dato fra–til»
const describeSessions = (blocks) =>
  blocks.map((b) => {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    return `${b.task_id} ${toDateKey(start)} ${formatTime(minutesSinceMidnight(start))}–${formatTime(minutesSinceMidnight(end))}`;
  });

const totalHours = (blocks, taskId) =>
  blocks.filter((b) => b.task_id === taskId).reduce((sum, b) => sum + (new Date(b.end_time) - new Date(b.start_time)), 0) /
  3_600_000;

describe('scheduleTasks', () => {
  it('planlegger én oppgave i de første ledige tidsrommene, med pause mellom økter', () => {
    const { blocks, unplaced } = scheduleTasks([task('a', 3, WED)], [], user, { from: MON, now });
    expect(describeSessions(blocks)).toEqual(['a 2026-11-02 08:00–10:00', 'a 2026-11-02 10:15–11:15']);
    expect(unplaced).toEqual([]);
  });

  it('lager arbeidsøkter med feltene fra datamodellen', () => {
    const t = task('a', 1, WED, 23.99, { course_id: 'c1', title: 'Rapport' });
    const [block] = scheduleTasks([t], [], user, { from: MON, now }).blocks;
    expect(block).toMatchObject({
      task_id: 'a',
      course_id: 'c1',
      title: 'Rapport',
      is_fixed: false,
      recurrence: 'none',
      is_completed: false,
    });
    expect(block.id).toBe(`a@${block.start_time}`);
  });

  it('planlegger oppgaven med tidligst frist først', () => {
    const late = task('sen', 2, WED);
    const early = task('tidlig', 2, TUE);
    const { blocks } = scheduleTasks([late, early], [], user, { from: MON, now });
    expect(describeSessions(blocks)).toEqual(['tidlig 2026-11-02 08:00–10:00', 'sen 2026-11-02 10:15–12:15']);
  });

  it('fordeler over flere dager når daglig kapasitet fylles opp', () => {
    const small = { ...user, daily_available_study_hours: 2 };
    const { blocks } = scheduleTasks([task('a', 5, '2026-11-06')], [], small, { from: MON, now });
    expect(describeSessions(blocks)).toEqual([
      'a 2026-11-02 08:00–10:00',
      'a 2026-11-03 08:00–10:00',
      'a 2026-11-04 08:00–09:00',
    ]);
  });

  it('deler daglig kapasitet mellom oppgaver', () => {
    const small = { ...user, daily_available_study_hours: 2 };
    const { blocks } = scheduleTasks([task('a', 2, WED), task('b', 1, WED)], [], small, { from: MON, now });
    expect(describeSessions(blocks)).toEqual(['a 2026-11-02 08:00–10:00', 'b 2026-11-03 08:00–09:00']);
  });

  it('planlegger rundt faste aktiviteter uten å endre dem', () => {
    const lecture = Object.freeze(fixed('forelesning', MON, 8, 10));
    const { blocks } = scheduleTasks([task('a', 2, WED)], [lecture], user, { from: MON, now });
    expect(describeSessions(blocks)).toEqual(['a 2026-11-02 10:00–12:00']);
    expect(blocks.some((b) => b.id === 'forelesning')).toBe(false);
  });

  it('respekterer ukentlige faste aktiviteter i senere uker', () => {
    // Forelesning hver mandag 08–21 (hele vinduet), lagt inn uka før
    const allDay = fixed('hele-dagen', '2026-10-26', 8, 21);
    const { blocks } = scheduleTasks([task('a', 1, WED)], [allDay], user, { from: MON, now });
    expect(describeSessions(blocks)).toEqual(['a 2026-11-03 08:00–09:00']);
  });

  it('planlegger bare før fristen når fristen er i morgen', () => {
    const { blocks, unplaced } = scheduleTasks([task('a', 6, TUE, 10)], [], user, { from: MON, now });
    expect(describeSessions(blocks)).toEqual([
      'a 2026-11-02 08:00–10:00',
      'a 2026-11-02 10:15–12:15',
      'a 2026-11-03 08:00–10:00',
    ]);
    expect(unplaced).toEqual([]);
  });

  it('gir unplaced når det ikke er tid nok før fristen', () => {
    const { blocks, unplaced } = scheduleTasks([task('a', 6, MON)], [], user, { from: MON, now });
    expect(totalHours(blocks, 'a')).toBe(4);
    expect(unplaced).toEqual([{ task_id: 'a', hours: 2 }]);
  });

  it('starter etter «nå» når det planlegges fra i dag', () => {
    const midday = atMinutes(MON, h(13) + 5);
    const { blocks } = scheduleTasks([task('a', 1, WED)], [], user, { from: MON, now: midday });
    expect(describeSessions(blocks)).toEqual(['a 2026-11-02 13:15–14:15']);
  });

  it('kan starte fra i morgen', () => {
    const { blocks } = scheduleTasks([task('a', 1, WED)], [], user, { from: TUE, now });
    expect(describeSessions(blocks)).toEqual(['a 2026-11-03 08:00–09:00']);
  });

  it('lar beholdte økter i dag telle mot kapasitet og gjenstående tid', () => {
    // 3 av 5 timer ligger allerede i dag. Kapasitet 4 gir 1 time til i dag og 1 time i morgen.
    const kept = [session('a', MON, 8, 11)];
    const { blocks } = scheduleTasks([task('a', 5, WED)], kept, user, { from: MON, now });
    expect(describeSessions(blocks)).toEqual(['a 2026-11-02 11:15–12:15', 'a 2026-11-03 08:00–09:00']);
  });

  it('lar fullførte økter oppta tid og kapasitet, men ikke trekkes fra gjenstående tid', () => {
    // Fullført økt er allerede regnet med i completed_hours (antakelse 4)
    const t = task('a', 3, WED, 23.99, { completed_hours: 1, status: STATUS.IN_PROGRESS });
    const done = [session('a', MON, 8, 9, { is_completed: true })];
    const { blocks } = scheduleTasks([t], done, user, { from: MON, now });
    expect(describeSessions(blocks)).toEqual(['a 2026-11-02 09:15–11:15']);
  });

  it('holder pause før en beholdt økt, men ikke rundt faste aktiviteter', () => {
    // Beholdt økt 10–12: ny økt må slutte senest 09:45. Forelesning 12–13: ny økt kan starte 13:00.
    const busy = [session('b', MON, 10, 12), fixed('forelesning', MON, 12, 13)];
    const t = task('a', 3.75, WED);
    // Høy kapasitet, så det bare er pausene som styrer plasseringen
    const roomy = { ...user, daily_available_study_hours: 8 };
    expect(describeSessions(scheduleTasks([t], busy, roomy, { from: MON, now }).blocks)).toEqual([
      'a 2026-11-02 08:00–09:45',
      'a 2026-11-02 13:00–15:00',
    ]);
  });

  it('trekker fra registrert fremgang', () => {
    const t = task('a', 4, WED, 23.99, { completed_hours: 3.5, status: STATUS.IN_PROGRESS });
    expect(describeSessions(scheduleTasks([t], [], user, { from: MON, now }).blocks)).toEqual([
      'a 2026-11-02 08:00–08:30',
    ]);
  });

  it('runder gjenstående tid opp til hele kvarter og tillater kort siste økt', () => {
    const t = task('a', 2.2, WED);
    expect(describeSessions(scheduleTasks([t], [], user, { from: MON, now }).blocks)).toEqual([
      'a 2026-11-02 08:00–10:00',
      'a 2026-11-02 10:15–10:30',
    ]);
  });

  it('bruker ikke tidsrom kortere enn 30 minutter', () => {
    // Bare 20 minutter ledig mellom to forelesninger
    const busy = [fixed('f1', MON, 8, 10), fixed('f2', MON, 10.33, 21)];
    const { blocks } = scheduleTasks([task('a', 1, WED)], busy, user, { from: MON, now });
    expect(describeSessions(blocks)).toEqual(['a 2026-11-03 08:00–09:00']);
  });

  it('hopper over ferdige oppgaver og oppgaver med passert frist', () => {
    const done = task('ferdig', 2, WED, 23.99, { status: STATUS.COMPLETED });
    const overdue = task('passert', 2, '2026-11-01');
    expect(scheduleTasks([done, overdue], [], user, { from: MON, now })).toEqual({ blocks: [], unplaced: [] });
  });

  it('planlegger på riktig lokal tid den dagen sommertiden slutter', () => {
    const dstNow = atMinutes('2026-10-24', h(22));
    const { blocks } = scheduleTasks([task('a', 3, '2026-10-26')], [], user, { from: '2026-10-25', now: dstNow });
    expect(describeSessions(blocks)).toEqual(['a 2026-10-25 08:00–10:00', 'a 2026-10-25 10:15–11:15']);
    expect(totalHours(blocks, 'a')).toBe(3);
  });

  it('endrer ikke det som sendes inn', () => {
    const tasks = [Object.freeze(task('a', 3, WED))];
    const blocks = Object.freeze([Object.freeze(fixed('f', MON, 8, 9))]);
    expect(() => scheduleTasks(tasks, blocks, user, { from: MON, now })).not.toThrow();
  });
});

describe('removeFutureSessions', () => {
  const at = atMinutes(TUE, h(12));
  const blocks = [
    session('a', MON, 8, 10),
    session('a', TUE, 8, 9, { is_completed: true }),
    session('a', TUE, 11, 13),
    session('a', WED, 8, 10),
    session('b', WED, 10, 12),
    fixed('forelesning', WED, 12, 14),
  ];

  it('sletter gjenstående økter for oppgaven og beholder resten', () => {
    const result = removeFutureSessions(blocks, 'a', at);
    expect(result.map((b) => b.id)).toEqual([
      `a-${MON}-8`,
      `a-${TUE}-8`,
      `b-${WED}-10`,
      'forelesning',
    ]);
  });

  it('beholder fullførte og tidligere økter', () => {
    const result = removeFutureSessions(blocks, 'a', at);
    expect(result.find((b) => b.id === `a-${MON}-8`)).toBeDefined();
    expect(result.find((b) => b.id === `a-${TUE}-8`).is_completed).toBe(true);
  });
});
