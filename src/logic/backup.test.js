import { describe, it, expect } from 'vitest';
import { createBackup, serializeBackup, parseBackup, backupFilename, MAX_BACKUP_BYTES } from './backup.js';
import { createSampleData } from './sample.js';
import { createUser, createInitialState } from './models.js';
import { atMinutes } from './dates.js';

const now = atMinutes('2026-11-03', 9 * 60);
const sample = () => createSampleData(createUser({ id: 'u1', name: 'Kari' }), now);

// Lager en fil, lar testen endre dataene, og gir teksten tilbake
const fileWith = (change = (data) => data, extra = {}) =>
  JSON.stringify({ ...createBackup(change(structuredClone(sample())), now), ...extra });

describe('createBackup og serializeBackup', () => {
  it('pakker data med format, versjon og tidspunkt', () => {
    const data = sample();
    expect(createBackup(data, now)).toEqual({
      format: 'pace-sikkerhetskopi',
      version: 1,
      exported_at: now.toISOString(),
      data,
    });
    expect(JSON.parse(serializeBackup(data, now)).data).toEqual(data);
  });

  it('gir filnavn med dato', () => {
    expect(backupFilename('2026-11-03')).toBe('pace-sikkerhetskopi-2026-11-03.json');
  });
});

describe('parseBackup', () => {
  it('gir tilbake de samme dataene fra en gyldig fil', () => {
    const data = sample();
    const result = parseBackup(serializeBackup(data, now));
    expect(result.data).toEqual({ ...data, onboarding_done: true });
    expect(result.exportedAt).toBe(now.toISOString());
    expect(result.counts).toEqual({ courses: 3, tasks: 4, fixed: 5 });
  });

  it('godtar tomme data og fyller inn felt som mangler i eldre filer', () => {
    const { last_checked_date: _l, onboarding_done: _o, ...old } = createInitialState({ userId: 'u1' });
    const result = parseBackup(JSON.stringify(createBackup(old, now)));
    expect(result.data).toMatchObject({ last_checked_date: null, onboarding_done: true, courses: [] });
  });

  it('avviser tekst som ikke er JSON', () => {
    expect(parseBackup('{ikke json')).toEqual({ error: 'UGYLDIG_JSON' });
    expect(parseBackup(undefined)).toEqual({ error: 'UGYLDIG_JSON' });
  });

  it('avviser filer som ikke er fra Pace', () => {
    expect(parseBackup('[]')).toEqual({ error: 'IKKE_PACE_FIL' });
    expect(parseBackup(JSON.stringify({ format: 'annen-app', version: 1, data: {} }))).toEqual({ error: 'IKKE_PACE_FIL' });
    expect(parseBackup(fileWith(undefined, { version: '1' }))).toEqual({ error: 'IKKE_PACE_FIL' });
  });

  it('avviser filer fra en nyere versjon', () => {
    expect(parseBackup(fileWith(undefined, { version: 2 }))).toEqual({ error: 'NYERE_VERSJON' });
  });

  it('avviser for store filer', () => {
    expect(parseBackup(' '.repeat(MAX_BACKUP_BYTES + 1))).toEqual({ error: 'FILEN_ER_FOR_STOR' });
  });

  it('avviser data uten lister eller innstillinger', () => {
    expect(parseBackup(fileWith((d) => ({ ...d, tasks: 'ingen' })))).toMatchObject({ error: 'UGYLDIG_INNHOLD', where: 'data' });
    expect(parseBackup(fileWith((d) => ({ ...d, user: { ...d.user, daily_available_study_hours: 30 } })))).toMatchObject({
      error: 'UGYLDIG_INNHOLD',
      where: 'user',
    });
  });

  it('peker på oppgaven som mangler felt eller har ugyldige verdier', () => {
    const missingDeadline = fileWith((d) => {
      delete d.tasks[2].deadline;
      return d;
    });
    expect(parseBackup(missingDeadline)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'tasks', index: 2 });

    const badStatus = fileWith((d) => {
      d.tasks[0].status = 'kanskje';
      return d;
    });
    expect(parseBackup(badStatus)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'tasks', index: 0 });

    const negative = fileWith((d) => {
      d.tasks[1].estimated_hours = -2;
      return d;
    });
    expect(parseBackup(negative)).toMatchObject({ where: 'tasks', index: 1 });
  });

  it('avviser emne med ugyldig farge', () => {
    const file = fileWith((d) => {
      d.courses[1].color = 'grønn';
      return d;
    });
    expect(parseBackup(file)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'courses', index: 1 });
  });

  it('avviser aktivitet som slutter før den starter', () => {
    const file = fileWith((d) => {
      d.blocks[0].end_time = d.blocks[0].start_time;
      return d;
    });
    expect(parseBackup(file)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'blocks', index: 0 });
  });

  it('avviser id som er brukt to ganger', () => {
    const file = fileWith((d) => {
      d.tasks[3].id = d.tasks[0].id;
      return d;
    });
    expect(parseBackup(file)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'tasks', index: 3 });
  });

  it('avviser koblinger til emner og oppgaver som ikke finnes', () => {
    const unknownCourse = fileWith((d) => {
      d.tasks[0].course_id = 'finnes-ikke';
      return d;
    });
    expect(parseBackup(unknownCourse)).toMatchObject({ where: 'tasks', index: 0 });

    const orphanSession = fileWith((d) => {
      const index = d.blocks.findIndex((b) => !b.is_fixed);
      d.blocks[index].task_id = 'finnes-ikke';
      return d;
    });
    expect(parseBackup(orphanSession)).toMatchObject({ where: 'blocks' });

    const fixedWithTask = fileWith((d) => {
      d.blocks[0].task_id = d.tasks[0].id;
      return d;
    });
    expect(parseBackup(fixedWithTask)).toMatchObject({ where: 'blocks', index: 0 });
  });
});
