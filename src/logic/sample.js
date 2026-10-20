// Eksempeldata («Prøv med eksempeldata»): emner, en ukentlig timeplan og fire arbeidskrav.
// Datoene regnes ut fra «nå», så planlegging, forskyvning og varsel vises med en gang:
// - Arbeidskravene har ulike frister og blir planlagt rundt timeplanen.
// - En økt fra i går er ikke gjennomført, så daglig sjekk flytter den.
// - Eksamensforberedelsen trenger mer tid enn det er plass til før fristen, så varselet vises.
// Funksjonen er ren: id-ene er faste og «nå» sendes inn.
import { toDateKey, addDays, startOfWeek, atMinutes } from './dates.js';
import { STATUS, RECURRENCE, DEFAULT_SETTINGS } from './models.js';

const h = (hours) => Math.round(hours * 60);

// Navn og tekster i eksempeldataene er innhold, ikke grensesnittekst, og står derfor her
export const SAMPLE = {
  courses: [
    { id: 'eksempel-itf', name: 'ITF10619 Programmering 2', color: '#2E5B88' },
    { id: 'eksempel-mat', name: 'MAT1100 Matematikk', color: '#3F8F6B' },
    { id: 'eksempel-exphil', name: 'EXPHIL Examen philosophicum', color: '#7B5EA7' },
  ],
  // Ukedag (0 = mandag) og klokkeslett i timer
  timetable: [
    { id: 'eksempel-forelesning-itf', title: 'Forelesning', course: 'eksempel-itf', day: 0, from: 10.25, to: 12 },
    { id: 'eksempel-jobb', title: 'Deltidsjobb', course: null, day: 1, from: 16, to: 20 },
    { id: 'eksempel-forelesning-mat', title: 'Forelesning', course: 'eksempel-mat', day: 2, from: 8.25, to: 10 },
    { id: 'eksempel-seminar-exphil', title: 'Seminar', course: 'eksempel-exphil', day: 3, from: 12.25, to: 14 },
    { id: 'eksempel-lab-itf', title: 'Lab', course: 'eksempel-itf', day: 4, from: 10.25, to: 12 },
  ],
  // Frist: antall dager fra i dag og klokkeslett
  tasks: [
    {
      id: 'eksempel-exphil-eksamen',
      course: 'eksempel-exphil',
      title: 'Eksamensforberedelse',
      description: 'Les gjennom pensum og løs tidligere eksamensoppgaver.',
      hours: 14,
      deadlineDays: 2,
      deadlineHour: 12,
    },
    {
      id: 'eksempel-mat-innlevering',
      course: 'eksempel-mat',
      title: 'Innlevering 5',
      description: 'Oppgavesett med derivasjon og integrasjon.',
      hours: 3,
      deadlineDays: 3,
      deadlineHour: 16,
    },
    {
      id: 'eksempel-itf-rapport',
      course: 'eksempel-itf',
      title: 'Arbeidskrav 2: Rapport',
      description: 'Skriv en rapport på 1500 ord om personvern i skytjenester. Bruk minst 4 kilder.',
      hours: 9.5,
      completedHours: 2,
      deadlineDays: 6,
      deadlineHour: 23.99,
    },
    {
      id: 'eksempel-exphil-refleksjon',
      course: 'eksempel-exphil',
      title: 'Refleksjonsnotat',
      description: 'Kort refleksjonsnotat etter seminaret.',
      hours: 2,
      deadlineDays: 12,
      deadlineHour: 23.99,
    },
  ],
};

function session(id, task, date, from, to, completed) {
  return {
    id,
    task_id: task.id,
    course_id: task.course,
    title: task.title,
    start_time: atMinutes(date, h(from)).toISOString(),
    end_time: atMinutes(date, h(to)).toISOString(),
    is_fixed: false,
    recurrence: RECURRENCE.NONE,
    is_completed: completed,
  };
}

// Gir lagret tilstand ({ user, courses, tasks, blocks, last_checked_date }) med eksempeldata.
// `user` er eksisterende bruker: navn og id beholdes, kapasitet og studievindu settes til standard.
// last_checked_date er i går, så rollover kjører og flytter den uferdige økten.
export function createSampleData(user, now) {
  const today = toDateKey(now);
  const yesterday = addDays(today, -1);
  const monday = startOfWeek(today);
  const [, mathTask, reportTask] = SAMPLE.tasks;

  return {
    user: { ...user, ...DEFAULT_SETTINGS },
    courses: SAMPLE.courses.map((course) => ({ ...course })),
    tasks: SAMPLE.tasks.map((task) => ({
      id: task.id,
      course_id: task.course,
      title: task.title,
      description: task.description,
      deadline: atMinutes(addDays(today, task.deadlineDays), h(task.deadlineHour)).toISOString(),
      estimated_hours: task.hours,
      completed_hours: task.completedHours ?? 0,
      status: task.completedHours ? STATUS.IN_PROGRESS : STATUS.NOT_STARTED,
      created_at: atMinutes(addDays(today, -7), h(12)).toISOString(),
      allow_over_capacity: false,
    })),
    blocks: [
      ...SAMPLE.timetable.map((item) => ({
        id: item.id,
        task_id: null,
        course_id: item.course,
        title: item.title,
        start_time: atMinutes(addDays(monday, item.day), h(item.from)).toISOString(),
        end_time: atMinutes(addDays(monday, item.day), h(item.to)).toISOString(),
        is_fixed: true,
        recurrence: RECURRENCE.WEEKLY,
        is_completed: false,
      })),
      // I går: én gjennomført økt (de 2 timene som er registrert på rapporten) og én som ble droppet
      session('eksempel-okt-gjennomfort', reportTask, yesterday, 8, 10, true),
      session('eksempel-okt-droppet', mathTask, yesterday, 13, 15, false),
    ],
    last_checked_date: yesterday,
  };
}
