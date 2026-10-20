import { describe, it, expect } from 'vitest';
import { createSampleData, SAMPLE } from './sample.js';
import { createUser, STATUS } from './models.js';
import { validateCourse, validateTask, validateFixedBlock } from './validation.js';
import { rollover } from './rollover.js';
import { detectOverload } from './overload.js';
import { groupTasks } from './todo.js';
import { estimateHours } from './estimate.js';
import { remainingHours } from './progress.js';
import { atMinutes, toDateKey } from './dates.js';

const user = { ...createUser({ id: 'u1', name: 'Kari' }), daily_available_study_hours: 8 };
// Onsdag 4.11.2026 kl. 09:00
const now = atMinutes('2026-11-04', 9 * 60);
const sample = () => createSampleData(user, now);

const minutesOf = (b) => (new Date(b.end_time) - new Date(b.start_time)) / 60_000;
const openHoursFor = (data, taskId) =>
  data.blocks.filter((b) => b.task_id === taskId && !b.is_fixed && !b.is_completed).reduce((s, b) => s + minutesOf(b), 0) / 60;

describe('createSampleData', () => {
  it('har emner, en ukentlig timeplan og fire arbeidskrav', () => {
    const data = sample();
    expect(data.courses).toHaveLength(3);
    const fixed = data.blocks.filter((b) => b.is_fixed);
    expect(fixed).toHaveLength(5);
    expect(fixed.every((b) => b.recurrence === 'weekly')).toBe(true);
    expect(data.tasks).toHaveLength(4);
  });

  it('gir arbeidskravene ulike frister frem i tid', () => {
    const deadlines = sample().tasks.map((t) => t.deadline);
    expect(new Set(deadlines).size).toBe(4);
    expect(deadlines.every((d) => new Date(d) > now)).toBe(true);
  });

  it('lager bare gyldige objekter', () => {
    const data = sample();
    for (const course of data.courses) expect(validateCourse(course)).toEqual([]);
    for (const task of data.tasks) expect(validateTask(task, now)).toEqual([]);
    for (const block of data.blocks.filter((b) => b.is_fixed)) expect(validateFixedBlock(block)).toEqual([]);
  });

  it('peker bare til emner og oppgaver som finnes', () => {
    const data = sample();
    const courseIds = new Set(data.courses.map((c) => c.id));
    const taskIds = new Set(data.tasks.map((t) => t.id));
    for (const item of [...data.tasks, ...data.blocks]) {
      if (item.course_id) expect(courseIds.has(item.course_id)).toBe(true);
    }
    for (const block of data.blocks.filter((b) => !b.is_fixed)) expect(taskIds.has(block.task_id)).toBe(true);
  });

  it('starter timeplanen på mandag denne uken', () => {
    const lecture = sample().blocks.find((b) => b.id === 'eksempel-forelesning-itf');
    expect(toDateKey(new Date(lecture.start_time))).toBe('2026-11-02');
  });

  it('beholder navn og id, og setter standard kapasitet så varselet alltid vises', () => {
    const data = sample();
    expect(data.user).toMatchObject({ id: 'u1', name: 'Kari', daily_available_study_hours: 4 });
  });

  it('har registrert fremgang som stemmer med gårsdagens gjennomførte økt', () => {
    const data = sample();
    const report = data.tasks.find((t) => t.id === 'eksempel-itf-rapport');
    const done = data.blocks.find((b) => b.id === 'eksempel-okt-gjennomfort');
    expect(report.status).toBe(STATUS.IN_PROGRESS);
    expect(report.completed_hours).toBe(minutesOf(done) / 60);
  });

  it('har en rapportbeskrivelse som tidsestimatet gir samme timetall for', () => {
    const report = sample().tasks.find((t) => t.id === 'eksempel-itf-rapport');
    expect(estimateHours(report.description).hours).toBe(report.estimated_hours);
  });

  it('er ren: samme «nå» gir samme data', () => {
    expect(createSampleData(user, now)).toEqual(createSampleData(user, now));
  });
});

describe('eksempeldata etter daglig sjekk', () => {
  const checked = () => rollover(sample(), now);

  it('flytter gårsdagens uferdige økt og planlegger det som gjenstår', () => {
    const data = checked();
    expect(data.last_checked_date).toBe('2026-11-04');
    expect(data.blocks.find((b) => b.id === 'eksempel-okt-droppet')).toBeUndefined();
    const math = data.tasks.find((t) => t.id === 'eksempel-mat-innlevering');
    expect(openHoursFor(data, math.id)).toBe(remainingHours(math));
  });

  it('beholder den gjennomførte økten og planlegger resten av rapporten', () => {
    const data = checked();
    expect(data.blocks.find((b) => b.id === 'eksempel-okt-gjennomfort').is_completed).toBe(true);
    expect(openHoursFor(data, 'eksempel-itf-rapport')).toBe(7.5);
  });

  it('planlegger aldri oppå timeplanen', () => {
    const data = checked();
    const sessions = data.blocks.filter((b) => !b.is_fixed && !b.is_completed);
    expect(sessions.length).toBeGreaterThan(0);
    for (const s of sessions) {
      const date = toDateKey(new Date(s.start_time));
      const dayIndex = (new Date(s.start_time).getDay() + 6) % 7;
      for (const item of SAMPLE.timetable.filter((t) => t.day === dayIndex)) {
        const from = atMinutes(date, item.from * 60);
        const to = atMinutes(date, item.to * 60);
        expect(new Date(s.start_time) < to && from < new Date(s.end_time)).toBe(false);
      }
    }
  });

  it('legger refleksjonsnotatet under «Kommende» og resten under «Aktive»', () => {
    const { active, upcoming } = groupTasks(checked().tasks, '2026-11-04');
    expect(upcoming.map((t) => t.id)).toEqual(['eksempel-exphil-refleksjon']);
    expect(active).toHaveLength(3);
  });

  // Varselet skal vises uansett ukedag og klokkeslett eksempeldataene lastes
  const times = [
    ['mandag morgen', '2026-11-02', 6],
    ['onsdag formiddag', '2026-11-04', 9],
    ['fredag kveld', '2026-11-06', 20.5],
    ['lørdag midt på dagen', '2026-11-07', 12],
    ['søndag sent', '2026-11-08', 23.5],
    ['dagen sommertiden slutter', '2026-10-25', 10],
  ];
  for (const [label, date, hour] of times) {
    it(`viser varsel om eksamensforberedelsen (${label})`, () => {
      const at = atMinutes(date, Math.round(hour * 60));
      const data = rollover(createSampleData(user, at), at);
      const { atRisk } = detectOverload(data, at);
      expect(atRisk.map((r) => r.taskId)).toContain('eksempel-exphil-eksamen');
      expect(data.tasks.every((t) => new Date(t.deadline) > at)).toBe(true);
    });
  }
});
