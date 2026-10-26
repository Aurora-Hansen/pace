import { describe, it, expect } from 'vitest';
import { createBackup, serializeBackup, parseBackup, backupFilename, MAX_BACKUP_BYTES } from './backup.js';
import { createSampleData } from './sample.js';
import { createUser, createInitialState, PRIORITY, DAY_OFF_KIND } from './models.js';
import { atMinutes } from './dates.js';
import { migrate } from './migrate.js';
import { V1_STORED } from './fixtures/v1.js';

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
      version: 2,
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
    expect(parseBackup(fileWith(undefined, { version: 3 }))).toEqual({ error: 'NYERE_VERSJON' });
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

// Steg 9.5: sikkerhetskopi i versjon 2, og filer fra versjon 1
describe('parseBackup med datamodell v2', () => {
  // Fil fra v1 (steg 8.3), med v1-dataene fra fasiten
  const v1File = (data = V1_STORED.okter.data) =>
    JSON.stringify({ format: 'pace-sikkerhetskopi', version: 1, exported_at: now.toISOString(), data });

  it('henter inn en fil fra versjon 1 og overfører den til v2', () => {
    const result = parseBackup(v1File());
    expect(result.error).toBeUndefined();
    expect(result.data).toEqual({ ...migrate(V1_STORED.okter).data, onboarding_done: true });
    expect(result.data.user).toMatchObject({ break_minutes: 0, min_session_minutes: 45, preferred_session_minutes: 120 });
    expect(result.counts).toEqual({ courses: 1, tasks: 5, fixed: 2 });
  });

  it('henter inn eksempeldata lagret i versjon 1', () => {
    expect(parseBackup(v1File(V1_STORED.eksempel.data)).counts).toEqual({ courses: 3, tasks: 4, fixed: 5 });
  });

  it('gir tilbake alle v2-feltene uendret', () => {
    const data = structuredClone(sample());
    data.user = {
      ...data.user,
      preferred_session_minutes: 50,
      min_session_minutes: 30,
      break_minutes: 10,
      preferred_times: [{ id: 'p1', weekdays: [1, 2, 3, 4, 5], start: '09:00', end: '15:00' }],
    };
    data.tasks[0].priority = PRIORITY.HIGH;
    data.tasks[1].priority = PRIORITY.LOW;
    data.blocks.find((b) => !b.is_fixed).is_locked = true;
    data.days_off = [
      { date: '2026-11-06', kind: DAY_OFF_KIND.OFF },
      { date: '2026-11-04', kind: DAY_OFF_KIND.SICK },
    ];
    expect(parseBackup(serializeBackup(data, now)).data).toEqual({ ...data, onboarding_done: true });
  });

  it('fyller inn v2-felt som mangler i en fil fra versjon 2', () => {
    const result = parseBackup(
      fileWith((d) => {
        delete d.days_off;
        delete d.tasks[0].priority;
        return d;
      }),
    );
    expect(result.data.days_off).toEqual([]);
    expect(result.data.tasks[0].priority).toBe(PRIORITY.NORMAL);
  });

  it.each([
    ['foretrukket øktlengde over 120', { preferred_session_minutes: 130 }],
    ['foretrukket øktlengde som ikke går opp i 5', { preferred_session_minutes: 52 }],
    ['minste øktlengde som ikke er et valg', { min_session_minutes: 20 }],
    ['pause som ikke er et valg', { break_minutes: 5 }],
    ['pause som tekst', { break_minutes: '0' }],
    ['foretrukne tider som ikke er en liste', { preferred_times: 'hverdager' }],
  ])('avviser innstillinger med %s', (_name, change) => {
    const file = fileWith((d) => ({ ...d, user: { ...d.user, ...change } }));
    expect(parseBackup(file)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'user', index: -1 });
  });

  it.each([
    ['ukedag 8', { weekdays: [1, 8] }],
    ['ingen ukedager', { weekdays: [] }],
    ['samme ukedag to ganger', { weekdays: [2, 2] }],
    ['slutt før start', { start: '15:00', end: '09:00' }],
    ['ugyldig klokkeslett', { start: '9' }],
    ['manglende id', { id: '' }],
  ])('peker på foretrukket studietid med %s', (_name, change) => {
    const good = { id: 'p1', weekdays: [1, 2, 3, 4, 5], start: '09:00', end: '15:00' };
    const file = fileWith((d) => ({
      ...d,
      user: { ...d.user, preferred_times: [good, { ...good, id: 'p2', ...change }] },
    }));
    expect(parseBackup(file)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'preferredTimes', index: 1 });
  });

  it('avviser oppgave med ugyldig prioritet', () => {
    const file = fileWith((d) => {
      d.tasks[2].priority = 'viktig';
      return d;
    });
    expect(parseBackup(file)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'tasks', index: 2 });
  });

  it('avviser lås som ikke er sann/usann, og låst fast aktivitet', () => {
    const textLock = fileWith((d) => {
      d.blocks[6].is_locked = 'ja';
      return d;
    });
    expect(parseBackup(textLock)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'blocks', index: 6 });

    const lockedFixed = fileWith((d) => {
      d.blocks[0].is_locked = true;
      return d;
    });
    expect(parseBackup(lockedFixed)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'blocks', index: 0 });
  });

  it.each([
    ['ugyldig dato', { date: '2026-02-30', kind: 'off' }],
    ['ukjent type', { date: '2026-11-05', kind: 'ferie' }],
    ['dato som allerede er markert', { date: '2026-11-04', kind: 'off' }],
    ['noe som ikke er et objekt', '2026-11-05'],
  ])('peker på fridag med %s', (_name, day) => {
    const file = fileWith((d) => ({ ...d, days_off: [{ date: '2026-11-04', kind: 'sick' }, day] }));
    expect(parseBackup(file)).toEqual({ error: 'UGYLDIG_INNHOLD', where: 'daysOff', index: 1 });
  });

  it('avviser fridager som ikke er en liste', () => {
    expect(parseBackup(fileWith((d) => ({ ...d, days_off: 'ingen' })))).toEqual({
      error: 'UGYLDIG_INNHOLD',
      where: 'data',
      index: -1,
    });
  });
});

// Steg 10.2: import slår sammen økter som ligger rett etter hverandre (F10)
describe('parseBackup og sammenslåing', () => {
  it('gjør to økter for samme oppgave rett etter hverandre om til én', () => {
    const minutesOf = (block) => (new Date(block.end_time) - new Date(block.start_time)) / 60_000;
    const open = (blocks) => blocks.filter((b) => !b.is_fixed && !b.is_completed);
    const before = open(sample().blocks);
    expect(before).toHaveLength(1);
    const file = fileWith((d) => {
      const first = open(d.blocks)[0];
      const end = new Date(new Date(first.end_time).getTime() + 60 * 60_000).toISOString();
      d.blocks.push({ ...first, id: 'rett-etter', start_time: first.end_time, end_time: end });
      return d;
    });
    const after = open(parseBackup(file).data.blocks);
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(before[0].id);
    expect(minutesOf(after[0])).toBe(minutesOf(before[0]) + 60);
  });
});

// Punkt 99: avhuking med nummer og deler
describe('parseBackup og deler i sammenslåtte økter', () => {
  const done = (d) => d.blocks.find((b) => !b.is_fixed && b.is_completed);
  const withParts = (change = (parts) => parts) =>
    fileWith((d) => {
      const block = done(d);
      const middle = new Date((Date.parse(block.start_time) + Date.parse(block.end_time)) / 2).toISOString();
      block.completed_order = 2;
      block.parts = change([
        { id: block.id, start_time: block.start_time, end_time: middle, completed_order: 1 },
        { id: 'del-2', start_time: middle, end_time: block.end_time, completed_order: 2 },
      ]);
      return d;
    });

  it('godtar en sammenslått økt med gyldige deler', () => {
    expect(parseBackup(withParts()).error).toBeUndefined();
  });

  it.each([
    ['deler som ikke er en liste', () => 'tull'],
    ['bare én del', (parts) => parts.slice(0, 1)],
    ['hull mellom delene', (parts) => [parts[0], { ...parts[1], start_time: parts[1].end_time }]],
    ['del uten nummer', (parts) => [parts[0], { ...parts[1], completed_order: 'to' }]],
    ['del uten id', (parts) => [parts[0], { ...parts[1], id: '' }]],
  ])('avviser %s', (_name, change) => {
    expect(parseBackup(withParts(change))).toMatchObject({ error: 'UGYLDIG_INNHOLD', where: 'blocks' });
  });

  it('avviser deler på en økt som ikke er fullført, og ugyldig nummer', () => {
    const planned = fileWith((d) => {
      const block = d.blocks.find((b) => !b.is_fixed && !b.is_completed);
      block.parts = [];
      return d;
    });
    expect(parseBackup(planned)).toMatchObject({ where: 'blocks' });
    const badOrder = fileWith((d) => {
      done(d).completed_order = -1;
      return d;
    });
    expect(parseBackup(badOrder)).toMatchObject({ where: 'blocks' });
  });
});
