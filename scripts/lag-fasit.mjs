// Lager fasiten i src/logic/fixtures/ for steg 9.1 (punkt 70 i docs/plan.md).
//
// VIKTIG: Skal bare kjøres mot koden fra før fase 9 (commit 0f7b700 eller tidligere).
// Kjør det ALDRI for å oppdatere fasiten etter endringer i planleggeren. Da blir fasiten lik
// den nye koden, og fasit.test.js tester ingenting. Feiler fasit.test.js, er det planen som har
// endret seg, og det er koden som skal rettes (eller endringen skal være bevisst og forklart).
//
// Kjøring (fra en utsjekk av den gamle koden): TZ=Europe/Oslo node scripts/lag-fasit.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = (file) => import(pathToFileURL(join(root, 'src', file)).href);
const { createSampleData } = await src('logic/sample.js');
const { replan, rollover } = await src('logic/rollover.js');
const { detectOverload } = await src('logic/overload.js');
const { atMinutes } = await src('logic/dates.js');

const at = (date, hm) => {
  const [hh, mm] = hm.split(':').map(Number);
  return atMinutes(date, hh * 60 + mm);
};
const iso = (date, hm) => at(date, hm).toISOString();

// --- Datasett 1: eksempeldataene, lastet mandag 2. november 2026 kl. 09.00 ---
const sampleNow = at('2026-11-02', '09:00');
const eksempel = createSampleData({ id: 'fasit-bruker', name: '' }, sampleNow);

// --- Datasett 2: fullførte, droppede og fremtidige økter, «Fordel på nytt» og en ferdig oppgave ---
const session = (id, taskId, date, from, to, done) => ({
  id,
  task_id: taskId,
  course_id: 'fasit-emne',
  title: taskId,
  start_time: iso(date, from),
  end_time: iso(date, to),
  is_fixed: false,
  recurrence: 'none',
  is_completed: done,
});
const task = (id, title, hours, done, status, deadline, extra = {}) => ({
  id,
  course_id: 'fasit-emne',
  title,
  description: '',
  deadline,
  estimated_hours: hours,
  completed_hours: done,
  status,
  created_at: iso('2026-10-26', '12:00'),
  ...extra,
});

const okter = {
  user: {
    id: 'fasit-bruker',
    name: '',
    daily_available_study_hours: 3,
    study_window_start: '08:00',
    study_window_end: '20:00',
  },
  courses: [{ id: 'fasit-emne', name: 'Fasit-emne', color: '#2E5B88' }],
  tasks: [
    task('rapport', 'Rapport', 8, 2, 'in_progress', iso('2026-11-06', '23:59')),
    task('lab', 'Lab', 4, 0, 'not_started', iso('2026-11-05', '12:00')),
    task('lesing', 'Lesing', 3, 3, 'completed', iso('2026-11-03', '23:59')),
    task('eksamen', 'Eksamen', 10, 0, 'not_started', iso('2026-11-05', '18:00'), { allow_over_capacity: true }),
    task('prosjekt', 'Prosjekt', 6, 1.5, 'in_progress', iso('2026-11-20', '16:00'), { allow_over_capacity: false }),
  ],
  blocks: [
    {
      id: 'forelesning',
      task_id: null,
      course_id: 'fasit-emne',
      title: 'Forelesning',
      start_time: iso('2026-10-26', '10:15'),
      end_time: iso('2026-10-26', '12:00'),
      is_fixed: true,
      recurrence: 'weekly',
      is_completed: false,
    },
    {
      id: 'tannlege',
      task_id: null,
      course_id: null,
      title: 'Tannlege',
      start_time: iso('2026-11-04', '14:00'),
      end_time: iso('2026-11-04', '16:00'),
      is_fixed: true,
      recurrence: 'none',
      is_completed: false,
    },
    session('rapport@man', 'rapport', '2026-11-02', '08:00', '10:00', true),
    session('rapport@tir', 'rapport', '2026-11-03', '13:00', '15:00', false),
    session('lab@tir', 'lab', '2026-11-03', '16:00', '17:00', false),
    session('lesing@ons', 'lesing', '2026-11-04', '16:30', '17:30', false),
    session('rapport@tor', 'rapport', '2026-11-05', '08:00', '10:00', false),
    session('prosjekt@man', 'prosjekt', '2026-11-02', '13:00', '14:30', true),
  ],
  last_checked_date: '2026-11-03',
  onboarding_done: true,
};

// Tilfellene som låses fast: funksjon, datasett og «nå»
const cases = [
  ['eksempel', 'rollover', '2026-11-02', '09:00'],
  ['eksempel', 'replan', '2026-11-02', '09:00'],
  ['eksempel', 'replan', '2026-11-02', '15:40'],
  ['eksempel', 'rollover', '2026-11-03', '07:00'],
  ['okter', 'rollover', '2026-11-04', '10:00'],
  ['okter', 'replan', '2026-11-04', '10:00'],
  ['okter', 'rollover', '2026-11-04', '19:50'],
  ['okter', 'rollover', '2026-11-05', '07:00'],
];
const datasets = { eksempel, okter };
const fns = { replan, rollover };

const sortBlocks = (blocks) =>
  [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id));

const fasit = cases.map(([name, fn, date, time]) => {
  const now = at(date, time);
  const result = fns[fn](datasets[name], now);
  return {
    dataset: name,
    fn,
    now: now.toISOString(),
    blocks: sortBlocks(result.blocks),
    last_checked_date: result.last_checked_date,
    overload: detectOverload(result, now),
  };
});

const out = join(root, 'src', 'logic', 'fixtures');
mkdirSync(out, { recursive: true });
const write = (file, value) => writeFileSync(join(out, file), JSON.stringify(value, null, 2) + '\n');
// Lagret slik localStorage har det i v1: { version: 1, data }
write('v1-eksempel.json', { version: 1, data: eksempel });
write('v1-okter.json', { version: 1, data: okter });
write('fasit-v1.json', fasit);

for (const f of fasit) {
  const sessions = f.blocks.filter((b) => !b.is_fixed).length;
  console.log(f.dataset, f.fn, f.now, `${sessions} økter`, `${f.overload.atRisk.length} i fare`, `dager over: ${f.overload.overloadedDays}`);
}
