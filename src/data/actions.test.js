import { describe, it, expect } from 'vitest';
import {
  createInitialUi,
  showView,
  dismissError,
  setCalendarMode,
  stepCalendar,
  calendarToday,
  openCalendarDay,
  addFixedBlockFromCalendar,
  editFixedBlockFromCalendar,
  submitSettings,
  submitCourse,
  editCourse,
  cancelCourseForm,
  openFixedBlockForm,
  editFixedBlock,
  cancelFixedBlockForm,
  submitFixedBlock,
  askDelete,
  cancelDelete,
  confirmDelete,
  openTaskForm,
  openTaskFromToday,
  editTask,
  cancelTaskForm,
  submitTask,
  openProgressForm,
  cancelProgressForm,
  submitProgress,
  markTaskDone,
  reopenTaskAction,
  withReplan,
  startDay,
  newDay,
  toggleSession,
} from './actions.js';
import { createInitialState, RECURRENCE } from '../logic/models.js';
import { load, save } from './storage.js';

// Onsdag 4. november 2026
const TODAY = '2026-11-04';
const initial = () => ({ data: createInitialState({ userId: 'u1' }), ui: createInitialUi({ today: TODAY }) });

// Kjører flere endringer etter hverandre
const run = (state, ...changes) => changes.reduce((current, change) => change(current), state);

describe('showView', () => {
  it('bytter visning og fjerner bekreftelser', () => {
    const state = run(initial(), (s) => ({ ...s, ui: { ...s.ui, notice: 'X' } }), showView({ view: 'innstillinger' }));
    expect(state.ui.view).toBe('innstillinger');
    expect(state.ui.view).toBe('innstillinger');
    expect(state.ui.notice).toBeNull();
  });

  it('starter på «I dag»', () => {
    expect(initial().ui.view).toBe('idag');
  });

  it('ignorerer ukjente visninger og samme visning', () => {
    const state = initial();
    expect(showView({ view: 'finnes-ikke' })(state)).toBe(state);
    expect(showView({ view: 'idag' })(state)).toBe(state);
  });
});

describe('dismissError', () => {
  it('fjerner feilmeldingen', () => {
    const state = { ...initial(), ui: createInitialUi({ error: 'LAGRING_FEILET', today: TODAY }) };
    expect(dismissError()(state).ui.error).toBeNull();
  });
});

describe('kalender', () => {
  it('starter på ukevisning for i dag', () => {
    expect(initial().ui.calendar).toEqual({ mode: 'week', date: TODAY });
  });

  it('går en uke fram og tilbake i ukevisning', () => {
    expect(stepCalendar({ direction: '1' })(initial()).ui.calendar.date).toBe('2026-11-11');
    expect(stepCalendar({ direction: '-1' })(initial()).ui.calendar.date).toBe('2026-10-28');
  });

  it('går en dag fram og tilbake i dagsvisning', () => {
    const day = setCalendarMode({ mode: 'day' })(initial());
    expect(stepCalendar({ direction: '1' })(day).ui.calendar.date).toBe('2026-11-05');
    expect(stepCalendar({ direction: '-1' })(day).ui.calendar.date).toBe('2026-11-03');
  });

  it('ignorerer ugyldig retning og visning', () => {
    const state = initial();
    expect(stepCalendar({ direction: 'x' })(state)).toBe(state);
    expect(setCalendarMode({ mode: 'måned' })(state)).toBe(state);
  });

  it('«I dag» går tilbake til dagens dato', () => {
    const state = run(initial(), stepCalendar({ direction: '1' }), stepCalendar({ direction: '1' }), calendarToday());
    expect(state.ui.calendar.date).toBe(TODAY);
  });

  it('åpner dagsvisning for en valgt dag', () => {
    expect(openCalendarDay({ date: '2026-11-06' })(initial()).ui.calendar).toEqual({ mode: 'day', date: '2026-11-06' });
    expect(openCalendarDay({ date: 'tull' })(initial()).ui.calendar.mode).toBe('week');
  });

  it('«Legg til forelesning» går til timeplanen med skjemaet åpent', () => {
    const state = addFixedBlockFromCalendar()(initial());
    expect(state.ui.view).toBe('timeplan');
    expect(state.ui.forms.fixedBlock).toBeDefined();
  });

  it('klikk på en aktivitet åpner redigering i timeplanen', () => {
    const values = { title: 'Forelesning', date: '2026-11-02', start: '10:15', end: '12:00', weekly: 'on' };
    const state = run(initial(), submitFixedBlock(values, 'b1'), editFixedBlockFromCalendar({ id: 'b1' }));
    expect(state.ui.view).toBe('timeplan');
    expect(state.ui.forms.fixedBlock.values.id).toBe('b1');
  });
});

describe('submitSettings', () => {
  const validValues = {
    name: ' Kari ',
    daily_available_study_hours: '5,5',
    study_window_start: '09:00',
    study_window_end: '20:00',
  };

  it('lagrer gyldige innstillinger og viser bekreftelse', () => {
    const state = submitSettings(validValues)(initial());
    expect(state.data.user).toEqual({
      id: 'u1',
      name: 'Kari',
      daily_available_study_hours: 5.5,
      study_window_start: '09:00',
      study_window_end: '20:00',
    });
    expect(state.ui.notice).toBe('INNSTILLINGER_LAGRET');
    expect(state.ui.forms.settings).toBeUndefined();
  });

  it('beholder data og skjemaverdier ved feil', () => {
    const before = initial();
    const values = { ...validValues, study_window_end: '07:00' };
    const state = submitSettings(values)(before);
    expect(state.data).toBe(before.data);
    expect(state.ui.forms.settings.values).toBe(values);
    expect(state.ui.forms.settings.errors).toEqual([{ code: 'SLUTT_FOR_START', field: 'study_window_end' }]);
    expect(state.ui.notice).toBeNull();
  });

  it('fjerner gamle skjemafeil når innstillingene blir gyldige', () => {
    const withError = submitSettings({ ...validValues, daily_available_study_hours: '' })(initial());
    expect(submitSettings(validValues)(withError).ui.forms.settings).toBeUndefined();
  });

  it('innstillingene er der etter lagring og ny innlasting', () => {
    const items = new Map();
    const backend = { getItem: (k) => items.get(k) ?? null, setItem: (k, v) => items.set(k, v) };
    save(submitSettings(validValues)(initial()).data, backend);
    expect(load(backend).state.user.daily_available_study_hours).toBe(5.5);
  });
});

describe('emner', () => {
  const addMatte = submitCourse({ name: 'Matte', color: '#3F8F6B' }, 'c1');

  it('legger til emne', () => {
    const state = addMatte(initial());
    expect(state.data.courses).toEqual([{ id: 'c1', name: 'Matte', color: '#3F8F6B' }]);
  });

  it('viser feil og lagrer ikke emne uten navn', () => {
    const before = initial();
    const state = submitCourse({ name: ' ', color: '#3F8F6B' }, 'c1')(before);
    expect(state.data).toBe(before.data);
    expect(state.ui.forms.course.errors).toEqual([{ code: 'MANGLER_FELT', field: 'name' }]);
  });

  it('redigerer eksisterende emne uten å lage nytt', () => {
    const state = run(
      initial(),
      addMatte,
      editCourse({ id: 'c1' }),
      submitCourse({ id: 'c1', name: 'Matematikk', color: '#7B5EA7' }, 'ny-id'),
    );
    expect(state.data.courses).toEqual([{ id: 'c1', name: 'Matematikk', color: '#7B5EA7' }]);
    expect(state.ui.forms.course).toBeUndefined();
  });

  it('åpner redigering med verdiene til emnet, og avbryt lukker', () => {
    const editing = run(initial(), addMatte, editCourse({ id: 'c1' }));
    expect(editing.ui.forms.course.values).toEqual({ id: 'c1', name: 'Matte', color: '#3F8F6B' });
    expect(cancelCourseForm()(editing).ui.forms.course).toBeUndefined();
  });
});

describe('faste aktiviteter', () => {
  const values = { title: 'Forelesning', course_id: 'c1', date: '2026-11-02', start: '10:15', end: '12:00', weekly: 'on' };

  it('åpner tomt skjema med ukentlig gjentakelse som standard', () => {
    expect(openFixedBlockForm()(initial()).ui.forms.fixedBlock.values).toEqual({ weekly: 'on' });
  });

  it('legger til aktivitet og lukker skjemaet', () => {
    const state = run(initial(), openFixedBlockForm(), submitFixedBlock(values, 'b1'));
    expect(state.data.blocks).toHaveLength(1);
    expect(state.data.blocks[0]).toMatchObject({ id: 'b1', title: 'Forelesning', is_fixed: true, recurrence: RECURRENCE.WEEKLY });
    expect(state.ui.forms.fixedBlock).toBeUndefined();
  });

  it('viser «Sjekk klokkeslettet» og beholder verdiene når slutt er før start', () => {
    const bad = { ...values, end: '09:00' };
    const state = run(initial(), openFixedBlockForm(), submitFixedBlock(bad, 'b1'));
    expect(state.data.blocks).toEqual([]);
    expect(state.ui.forms.fixedBlock).toEqual({ values: bad, errors: [{ code: 'SLUTT_FOR_START', field: 'end' }] });
  });

  it('redigerer eksisterende aktivitet', () => {
    const state = run(
      initial(),
      submitFixedBlock(values, 'b1'),
      editFixedBlock({ id: 'b1' }),
      (s) => submitFixedBlock({ ...s.ui.forms.fixedBlock.values, title: 'Seminar' }, 'ny-id')(s),
    );
    expect(state.data.blocks.map((b) => [b.id, b.title])).toEqual([['b1', 'Seminar']]);
  });

  it('avbryt lukker skjemaet', () => {
    expect(run(initial(), openFixedBlockForm(), cancelFixedBlockForm()).ui.forms.fixedBlock).toBeUndefined();
  });
});

describe('oppgaver', () => {
  // Onsdag 4.11.2026 kl. 12
  const now = new Date(2026, 10, 4, 12, 0);
  const values = {
    title: 'Arbeidskrav 2',
    course_id: '',
    description: '',
    estimated_hours: '8',
    deadline_date: '2026-11-10',
    deadline_time: '',
  };
  const withTask = () => run(initial(), openTaskForm(), submitTask(values, 't1', now));

  it('legger til oppgave og lukker skjemaet', () => {
    const state = withTask();
    expect(state.data.tasks).toHaveLength(1);
    expect(state.data.tasks[0]).toMatchObject({ id: 't1', title: 'Arbeidskrav 2', estimated_hours: 8 });
    expect(state.ui.forms.task).toBeUndefined();
  });

  it('viser «Noe mangler» med markerte felt', () => {
    const state = submitTask({ ...values, title: '', estimated_hours: '' }, 't1', now)(initial());
    expect(state.data.tasks).toEqual([]);
    expect(state.ui.forms.task.errors.map((e) => e.field)).toEqual(['title', 'estimated_hours']);
  });

  it('viser «Fristen har allerede vært» for frist i fortiden', () => {
    const state = submitTask({ ...values, deadline_date: '2026-11-03' }, 't1', now)(initial());
    expect(state.ui.forms.task.errors).toEqual([{ code: 'FRIST_I_FORTIDEN', field: 'deadline' }]);
  });

  it('lar en oppgave med passert frist redigeres når fristen ikke endres', () => {
    const later = new Date(2026, 10, 12, 12, 0);
    const state = run(withTask(), editTask({ id: 't1' }), (s) =>
      submitTask({ ...s.ui.forms.task.values, title: 'Nytt navn' }, 'ny-id', later)(s),
    );
    expect(state.data.tasks.map((t) => [t.id, t.title])).toEqual([['t1', 'Nytt navn']]);
  });

  it('registrerer fremgang i timer og prosent', () => {
    const hours = run(withTask(), openProgressForm({ id: 't1' }), submitProgress({ task_id: 't1', unit: 'hours', amount: '2' }));
    expect(hours.data.tasks[0]).toMatchObject({ completed_hours: 2, status: 'in_progress' });
    expect(hours.ui.forms.progress).toBeUndefined();

    const percent = submitProgress({ task_id: 't1', unit: 'percent', amount: '75' })(withTask());
    expect(percent.data.tasks[0].completed_hours).toBe(6);
  });

  it('åpner fremgangsskjemaet med registrert tid', () => {
    const state = run(withTask(), submitProgress({ task_id: 't1', unit: 'hours', amount: '2,5' }), openProgressForm({ id: 't1' }));
    expect(state.ui.forms.progress.values).toEqual({ task_id: 't1', unit: 'hours', amount: '2,5' });
  });

  it('viser feil for ugyldig fremgang', () => {
    const state = submitProgress({ task_id: 't1', unit: 'hours', amount: '' })(withTask());
    expect(state.ui.forms.progress.errors).toEqual([{ code: 'MANGLER_FELT', field: 'amount' }]);
    expect(state.data.tasks[0].completed_hours).toBe(0);
  });

  it('markerer som ferdig og gjenåpner', () => {
    const done = markTaskDone({ id: 't1' })(withTask());
    expect(done.data.tasks[0].status).toBe('completed');
    expect(reopenTaskAction({ id: 't1' })(done).data.tasks[0].status).toBe('not_started');
  });

  it('lukker fremgangsskjemaet når oppgaven markeres som ferdig', () => {
    const state = run(withTask(), openProgressForm({ id: 't1' }), markTaskDone({ id: 't1' }));
    expect(state.ui.forms.progress).toBeUndefined();
  });

  it('sletter oppgave sammen med arbeidsøktene, men ikke faste aktiviteter', () => {
    const state = run(
      withTask(),
      (s) => ({
        ...s,
        data: {
          ...s.data,
          blocks: [
            { id: 'økt', task_id: 't1', is_fixed: false },
            { id: 'fast', task_id: null, is_fixed: true },
          ],
        },
      }),
      askDelete({ kind: 'task', id: 't1' }),
      confirmDelete(),
    );
    expect(state.data.tasks).toEqual([]);
    expect(state.data.blocks.map((b) => b.id)).toEqual(['fast']);
  });

  it('«Legg til første oppgave» i «I dag» går til oppgaver med skjemaet åpent', () => {
    const state = openTaskFromToday()(initial());
    expect(state.ui.view).toBe('oppgaver');
    expect(state.ui.forms.task).toEqual({ values: {}, errors: [] });
  });

  it('avbryt lukker skjemaene', () => {
    expect(run(initial(), openTaskForm(), cancelTaskForm()).ui.forms.task).toBeUndefined();
    expect(run(withTask(), openProgressForm({ id: 't1' }), cancelProgressForm()).ui.forms.progress).toBeUndefined();
  });
});

describe('planlegging i appen', () => {
  // Onsdag 4.11.2026 kl. 07:00
  const now = new Date(2026, 10, 4, 7, 0);
  const taskValues = {
    title: 'Rapport',
    course_id: '',
    description: '',
    estimated_hours: '3',
    deadline_date: '2026-11-06',
    deadline_time: '',
  };
  const sessionsOf = (state) => state.data.blocks.filter((b) => !b.is_fixed);
  const hoursOf = (blocks) =>
    blocks.reduce((sum, b) => sum + (new Date(b.end_time) - new Date(b.start_time)), 0) / 3_600_000;
  const withPlannedTask = () => withReplan(submitTask(taskValues, 't1', now), now)(initial());

  it('ny oppgave gir arbeidsøkter', () => {
    const state = withPlannedTask();
    expect(hoursOf(sessionsOf(state))).toBe(3);
    expect(sessionsOf(state).every((b) => b.task_id === 't1')).toBe(true);
  });

  it('kjører ikke replan når bare ui endres eller skjemaet har feil', () => {
    const state = withPlannedTask();
    expect(withReplan(showView({ view: 'oppgaver' }), now)(state).data).toBe(state.data);
    expect(withReplan(submitTask({ ...taskValues, title: '' }, 't2', now), now)(state).data).toBe(state.data);
  });

  it('«Marker som ferdig» fjerner øktene og frigjør tiden', () => {
    const state = withReplan(markTaskDone({ id: 't1' }), now)(withPlannedTask());
    expect(sessionsOf(state)).toEqual([]);
  });

  it('avhuking av en økt registrerer tid og gir færre timer igjen i planen', () => {
    const planned = withPlannedTask();
    const first = sessionsOf(planned)[0];
    const state = withReplan(toggleSession({ id: first.id }), now)(planned);
    const task = state.data.tasks[0];
    expect(task.completed_hours).toBe(hoursOf([first]));
    expect(task.status).toBe('in_progress');
    // Den fullførte økten står, og resten av planen dekker bare det som gjenstår
    const open = sessionsOf(state).filter((b) => !b.is_completed);
    expect(hoursOf(open)).toBe(3 - hoursOf([first]));
  });

  it('avhuking kan angres', () => {
    const planned = withPlannedTask();
    const first = sessionsOf(planned)[0];
    const state = run(planned, toggleSession({ id: first.id }), toggleSession({ id: first.id }));
    expect(state.data.tasks[0].completed_hours).toBe(0);
  });

  it('daglig sjekk flytter gårsdagens uferdige økter', () => {
    const planned = withPlannedTask();
    const tomorrow = new Date(2026, 10, 5, 8, 0);
    const state = startDay(tomorrow)(planned);
    expect(state.data.last_checked_date).toBe('2026-11-05');
    expect(sessionsOf(state).every((b) => new Date(b.start_time) >= tomorrow)).toBe(true);
    expect(hoursOf(sessionsOf(state))).toBe(3);
  });

  it('ny dag oppdaterer dagens dato og kalenderen', () => {
    const state = newDay(new Date(2026, 10, 5, 8, 0))(withPlannedTask());
    expect(state.ui.today).toBe('2026-11-05');
    expect(state.ui.calendar.date).toBe('2026-11-05');
  });

  it('ny dag gjør ingenting samme dag', () => {
    const state = withPlannedTask();
    expect(newDay(new Date(2026, 10, 4, 22, 0))(state)).toBe(state);
  });
});

describe('sletting', () => {
  const withData = () =>
    run(
      initial(),
      submitCourse({ name: 'Matte', color: '#3F8F6B' }, 'c1'),
      submitFixedBlock({ title: 'Forelesning', course_id: 'c1', date: '2026-11-02', start: '10:15', end: '12:00' }, 'b1'),
      (s) => ({ ...s, data: { ...s.data, tasks: [{ id: 't1', course_id: 'c1' }] } }),
    );

  it('sletter ikke før det er bekreftet', () => {
    const state = askDelete({ kind: 'course', id: 'c1' })(withData());
    expect(state.ui.confirm).toEqual({ kind: 'course', id: 'c1' });
    expect(state.data.courses).toHaveLength(1);
    expect(cancelDelete()(state).ui.confirm).toBeNull();
  });

  it('sletter emne og beholder oppgaver og aktiviteter uten emne', () => {
    const state = run(withData(), askDelete({ kind: 'course', id: 'c1' }), confirmDelete());
    expect(state.data.courses).toEqual([]);
    expect(state.data.tasks[0].course_id).toBeNull();
    expect(state.data.blocks[0].course_id).toBeNull();
    expect(state.ui.confirm).toBeNull();
  });

  it('lukker redigering av emnet som slettes', () => {
    const state = run(withData(), editCourse({ id: 'c1' }), askDelete({ kind: 'course', id: 'c1' }), confirmDelete());
    expect(state.ui.forms.course).toBeUndefined();
  });

  it('sletter fast aktivitet', () => {
    const state = run(withData(), askDelete({ kind: 'fixedBlock', id: 'b1' }), confirmDelete());
    expect(state.data.blocks).toEqual([]);
  });

  it('ignorerer ukjente typer og bekreftelse uten spørsmål', () => {
    const state = withData();
    expect(askDelete({ kind: 'user', id: 'u1' })(state)).toBe(state);
    expect(confirmDelete()(state)).toBe(state);
  });
});
