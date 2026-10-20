import { describe, it, expect } from 'vitest';
import { detectOverload } from './overload.js';
import { DEFAULT_SETTINGS, STATUS } from './models.js';
import { replan } from './rollover.js';
import { atMinutes } from './dates.js';

const h = (hours) => Math.round(hours * 60);
const MON = '2026-11-02';
const TUE = '2026-11-03';
const WED = '2026-11-04';
const now = atMinutes(MON, h(7));

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

const data = (tasks, { capacity = 4, blocks = [] } = {}) => ({
  user: { id: 'u1', ...DEFAULT_SETTINGS, daily_available_study_hours: capacity },
  courses: [],
  tasks,
  blocks,
  last_checked_date: null,
});

// Planlegger som appen gjør, og ser etter overbelastning
const planned = (tasks, options) => replan(data(tasks, options), now);

describe('detectOverload', () => {
  it('finner ingen overbelastning når alt får plass', () => {
    expect(detectOverload(planned([task('a', 3, WED)]), now)).toEqual({ atRisk: [], overloadedDays: [] });
  });

  it('finner én oppgave i fare og regner ut timer den siste dagen', () => {
    // 10 timer med frist tirsdag kl. 21 og kapasitet 4: mandag 4 + tirsdag 4 = 8, så 2 mangler.
    // Tirsdag har allerede 4 timer, så teksten blir «6 timer på tirsdag».
    const result = detectOverload(planned([task('a', 10, TUE, 21)]), now);
    expect(result.atRisk).toEqual([{ taskId: 'a', day: TUE, hoursNeeded: 6, missingHours: 2 }]);
    expect(result.overloadedDays).toEqual([]);
  });

  it('bruker fristdagen når oppgaven ikke har fått noen økter', () => {
    const busyDay = { capacity: 0.25 };
    const result = detectOverload(planned([task('a', 2, MON, 21)], busyDay), now);
    expect(result.atRisk).toEqual([{ taskId: 'a', day: MON, hoursNeeded: 2, missingHours: 2 }]);
  });

  it('håndterer flere oppgaver som konkurrerer om samme tid', () => {
    // Hver for seg får de plass mandag, men sammen er det 6 timer på en dag med kapasitet 4
    const result = detectOverload(planned([task('a', 3, MON, 21), task('b', 3, MON, 21)]), now);
    expect(result.atRisk.map((r) => r.taskId)).toEqual(['b']);
    expect(result.atRisk[0]).toMatchObject({ day: MON, missingHours: 2 });
  });

  it('markerer dager over kapasitet etter «Fordel på nytt», og oppgaven er ikke lenger i fare', () => {
    const result = detectOverload(planned([task('a', 6, MON, 21, { allow_over_capacity: true })]), now);
    expect(result.atRisk).toEqual([]);
    expect(result.overloadedDays).toEqual([MON]);
  });

  it('ser bort fra ferdige oppgaver, passerte frister og tidligere dager', () => {
    const state = data(
      [task('ferdig', 10, TUE, 21, { status: STATUS.COMPLETED }), task('passert', 10, '2026-11-01')],
      {
        blocks: [
          {
            id: 'gammel',
            task_id: 'x',
            is_fixed: false,
            is_completed: true,
            start_time: atMinutes('2026-10-30', h(8)).toISOString(),
            end_time: atMinutes('2026-10-30', h(16)).toISOString(),
          },
        ],
      },
    );
    expect(detectOverload(state, now)).toEqual({ atRisk: [], overloadedDays: [] });
  });

  it('teller registrert fremgang', () => {
    const t = task('a', 10, TUE, 21, { completed_hours: 3, status: STATUS.IN_PROGRESS });
    expect(detectOverload(planned([t]), now).atRisk).toEqual([]);
  });
});
