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
  redistributeTask,
  keepPlan,
  openAdjustForm,
  cancelAdjustForm,
  submitAdjust,
  suggestEstimate,
  useEstimate,
  requestSampleData,
  loadSampleData,
  askClearAll,
  clearAllData,
  dismissNotice,
  openExportForm,
  cancelExportForm,
  exportFailed,
  exportDone,
  showWizardIfNew,
  restartWizard,
  closeWizard,
  submitWizard,
  refreshGreeting,
  setTheme,
  toggleTheme,
  setSystemDark,
  backupExported,
  importLoaded,
  cancelImport,
  confirmImport,
  undoDelete,
  expireUndo,
} from './actions.js';
import { parseBackup, serializeBackup } from '../logic/backup.js';
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

  it('«Foreslå tidsbruk» gir forslag fra beskrivelsen og beholder skjemaverdiene', () => {
    const typed = { ...values, estimated_hours: '', description: 'Essay på 1000 ord.', intent: 'estimate' };
    const state = run(initial(), openTaskForm(), suggestEstimate(typed));
    expect(state.ui.forms.task.estimate.hours).toBe(5);
    expect(state.ui.forms.task.values).toEqual({ ...values, estimated_hours: '', description: 'Essay på 1000 ord.' });
    expect(state.data.tasks).toEqual([]);
  });

  it('«Foreslå tidsbruk» uten beskrivelse viser «Vi trenger litt tekst»', () => {
    const state = suggestEstimate({ ...values, description: ' ' })(initial());
    expect(state.ui.forms.task.errors).toEqual([{ code: 'TOMT_ESTIMAT', field: 'description' }]);
  });

  it('«Bruk forslaget» fyller inn estimatet, som kan justeres før lagring', () => {
    const typed = { ...values, estimated_hours: '', description: 'Essay på 1000 ord.' };
    const suggested = run(initial(), openTaskForm(), suggestEstimate(typed));
    const used = useEstimate(typed)(suggested);
    expect(used.ui.forms.task.values.estimated_hours).toBe('5');
    const saved = submitTask({ ...used.ui.forms.task.values, estimated_hours: '6,5' }, 't1', now)(used);
    expect(saved.data.tasks[0].estimated_hours).toBe(6.5);
    expect(saved.ui.forms.task).toBeUndefined();
  });

  it('«Bruk forslaget» gjør ingenting uten forslag', () => {
    const state = run(initial(), openTaskForm());
    expect(useEstimate(values)(state)).toBe(state);
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

describe('når arbeid hoper seg opp', () => {
  // Onsdag 4.11.2026 kl. 07:00, kapasitet 4 timer
  const now = new Date(2026, 10, 4, 7, 0);
  // 6 timer med frist i dag kl. 21: 2 timer får ikke plass
  const tooMuch = {
    title: 'Eksamen',
    course_id: '',
    description: '',
    estimated_hours: '6',
    deadline_date: '2026-11-04',
    deadline_time: '21:00',
  };
  const overloaded = () => withReplan(submitTask(tooMuch, 't1', now), now)(initial());

  it('finner oppgaven i fare når planen bygges', () => {
    expect(overloaded().ui.overload.atRisk).toEqual([
      { taskId: 't1', day: '2026-11-04', hoursNeeded: 6, missingHours: 2 },
    ]);
  });

  it('«Fordel på nytt» legger resten over kapasiteten og markerer dagen', () => {
    const state = withReplan(redistributeTask({ id: 't1' }), now)(overloaded());
    expect(state.data.tasks[0].allow_over_capacity).toBe(true);
    expect(state.ui.overload).toEqual({ atRisk: [], overloadedDays: ['2026-11-04'] });
  });

  it('«Behold planen» lukker varselet uten å endre planen', () => {
    const before = overloaded();
    const state = keepPlan({ id: 't1' })(before);
    expect(state.ui.dismissedOverload).toEqual(['t1']);
    expect(state.data).toBe(before.data);
    expect(keepPlan({ id: 't1' })(state)).toBe(state);
  });

  it('«Juster arbeidsmengde» åpner skjema med kapasitet, estimat og frist', () => {
    const state = openAdjustForm({ id: 't1' })(overloaded());
    expect(state.ui.forms.adjust.values).toEqual({
      task_id: 't1',
      daily_available_study_hours: '4',
      estimated_hours: '6',
      deadline_date: '2026-11-04',
      deadline_time: '21:00',
    });
  });

  it('høyere kapasitet fjerner varselet', () => {
    const state = run(overloaded(), openAdjustForm({ id: 't1' }), (s) =>
      withReplan(submitAdjust({ ...s.ui.forms.adjust.values, daily_available_study_hours: '6' }, now), now)(s),
    );
    expect(state.data.user.daily_available_study_hours).toBe(6);
    expect(state.ui.overload.atRisk).toEqual([]);
    expect(state.ui.forms.adjust).toBeUndefined();
  });

  it('lavere estimat eller senere frist fjerner også varselet', () => {
    const adjust = (changes) =>
      run(overloaded(), openAdjustForm({ id: 't1' }), (s) =>
        withReplan(submitAdjust({ ...s.ui.forms.adjust.values, ...changes }, now), now)(s),
      );
    expect(adjust({ estimated_hours: '4' }).ui.overload.atRisk).toEqual([]);
    expect(adjust({ deadline_date: '2026-11-05' }).ui.overload.atRisk).toEqual([]);
  });

  it('viser feil i justeringsskjemaet', () => {
    const state = run(overloaded(), openAdjustForm({ id: 't1' }), (s) =>
      submitAdjust({ ...s.ui.forms.adjust.values, daily_available_study_hours: '', deadline_date: '2026-11-01' }, now)(s),
    );
    expect(state.ui.forms.adjust.errors.map((e) => e.code)).toEqual(['MANGLER_FELT', 'FRIST_I_FORTIDEN']);
  });

  it('avbryt lukker justeringsskjemaet', () => {
    expect(run(overloaded(), openAdjustForm({ id: 't1' }), cancelAdjustForm()).ui.forms.adjust).toBeUndefined();
  });

  it('daglig sjekk regner ut overbelastning også når planen ikke endres', () => {
    const state = overloaded();
    const reset = { ...state, ui: { ...state.ui, overload: { atRisk: [], overloadedDays: [] } } };
    expect(startDay(now)(reset).ui.overload.atRisk).toHaveLength(1);
  });
});

describe('eksempeldata og sletting av alle data', () => {
  const now = new Date(2026, 10, 4, 9, 0);

  it('legger inn eksempeldata med en gang når det ikke finnes data', () => {
    const state = requestSampleData(now)(run(initial(), showView({ view: 'innstillinger' })));
    expect(state.data.tasks).toHaveLength(4);
    expect(state.data.last_checked_date).toBe('2026-11-04');
    expect(state.ui).toMatchObject({ view: 'idag', notice: 'EKSEMPELDATA_LAGT_INN', confirm: null });
    expect(state.ui.overload.atRisk.map((r) => r.taskId)).toContain('eksempel-exphil-eksamen');
  });

  it('spør før eksisterende data erstattes, og avbryt beholder dem', () => {
    const withCourse = submitCourse({ name: 'Mitt emne', color: '#3F8F6B' }, 'c1')(initial());
    const asked = requestSampleData(now)(withCourse);
    expect(asked.ui.confirm).toEqual({ kind: 'sample' });
    expect(asked.data).toBe(withCourse.data);
    expect(cancelDelete()(asked).data.courses.map((c) => c.name)).toEqual(['Mitt emne']);
  });

  it('erstatter eksisterende data når det er bekreftet', () => {
    const withCourse = submitCourse({ name: 'Mitt emne', color: '#3F8F6B' }, 'c1')(initial());
    const state = loadSampleData(now)(requestSampleData(now)(withCourse));
    expect(state.data.courses.map((c) => c.id)).not.toContain('c1');
    expect(state.ui.confirm).toBeNull();
  });

  it('beholder brukerens navn og id', () => {
    const named = submitSettings({ name: 'Kari', daily_available_study_hours: '6', study_window_start: '09:00', study_window_end: '20:00' })(initial());
    const state = loadSampleData(now)(named);
    expect(state.data.user).toMatchObject({ id: 'u1', name: 'Kari', daily_available_study_hours: 4 });
  });

  it('sletter alle data etter bekreftelse og beholder bruker-id', () => {
    const loaded = loadSampleData(now)(initial());
    const asked = askClearAll()(loaded);
    expect(asked.ui.confirm).toEqual({ kind: 'reset' });
    expect(asked.data).toBe(loaded.data);
    const cleared = clearAllData()(asked);
    expect(cleared.data).toEqual(createInitialState({ userId: 'u1' }));
    expect(cleared.ui).toMatchObject({ notice: 'DATA_SLETTET', confirm: null, overload: { atRisk: [], overloadedDays: [] } });
  });

  it('bekreftelsen kan lukkes', () => {
    expect(dismissNotice()(loadSampleData(now)(initial())).ui.notice).toBeNull();
  });
});

describe('lys og mørk modus', () => {
  it('følger systemet som standard', () => {
    expect(initial().ui).toMatchObject({ theme: 'system', systemDark: false });
  });

  it('valg i Innstillinger setter modus, og ukjent verdi gir «system»', () => {
    expect(setTheme({ theme: 'dark' })(initial()).ui.theme).toBe('dark');
    const dark = setTheme({ theme: 'dark' })(initial());
    expect(setTheme({ theme: 'tull' })(dark).ui.theme).toBe('system');
    expect(setTheme({ theme: 'dark' })(dark)).toBe(dark);
  });

  it('knappen i headeren bytter til motsatt av det som vises', () => {
    const systemDark = setSystemDark(true)(initial());
    expect(toggleTheme()(systemDark).ui.theme).toBe('light');
    expect(toggleTheme()(initial()).ui.theme).toBe('dark');
    expect(toggleTheme()(toggleTheme()(initial())).ui.theme).toBe('light');
  });

  it('endrer ikke lagrede data', () => {
    const state = initial();
    expect(toggleTheme()(state).data).toBe(state.data);
  });
});

describe('hilsen', () => {
  it('oppdaterer tid på døgnet, og gjør ingenting når den er den samme', () => {
    const state = initial();
    expect(refreshGreeting(new Date(2026, 10, 4, 18, 0))(state).ui.greeting).toBe('kveld');
    expect(refreshGreeting(new Date(2026, 10, 4, 12, 0))(state)).toBe(state);
  });
});

describe('førstegangsveiviser', () => {
  const now = new Date(2026, 10, 4, 9, 0);
  const open = () => showWizardIfNew()(initial());
  const step = (values, state) => submitWizard(values, 'ny-id', now)(state);
  const activity = { title: 'Forelesning', date: '2026-11-02', start: '10:15', end: '12:00', weekly: 'on', intent: 'next' };
  const firstTask = { title: 'Arbeidskrav 1', estimated_hours: '6', deadline_date: '2026-11-12', deadline_time: '', intent: 'next' };

  it('vises første gang, men ikke når den er vist før', () => {
    expect(open().ui.wizard).toEqual({ step: 1, values: {}, errors: [] });
    const done = { ...initial(), data: { ...initial().data, onboarding_done: true } };
    expect(showWizardIfNew()(done)).toBe(done);
  });

  it('steg 1 lagrer daglig kapasitet og går videre', () => {
    const state = step({ daily_available_study_hours: '5,5', intent: 'next' }, open());
    expect(state.data.user.daily_available_study_hours).toBe(5.5);
    expect(state.ui.wizard.step).toBe(2);
  });

  it('steg 1 viser feil og blir stående ved ugyldig kapasitet', () => {
    const state = step({ daily_available_study_hours: '', intent: 'next' }, open());
    expect(state.ui.wizard).toMatchObject({ step: 1, errors: [{ code: 'MANGLER_FELT', field: 'daily_available_study_hours' }] });
    expect(state.data.user.daily_available_study_hours).toBe(4);
  });

  it('steg 2 legger til en ukentlig fast aktivitet', () => {
    const state = run(open(), (s) => step({ intent: 'skip' }, s), (s) => step(activity, s));
    expect(state.data.blocks).toHaveLength(1);
    expect(state.data.blocks[0]).toMatchObject({ id: 'ny-id', title: 'Forelesning', is_fixed: true, recurrence: 'weekly' });
    expect(state.ui.wizard.step).toBe(3);
  });

  it('steg 2 gir enkeltstående aktivitet når «gjentas» ikke er krysset av, og feil for slutt før start', () => {
    const atStep2 = run(open(), (s) => step({ intent: 'skip' }, s));
    const { weekly: _weekly, ...once } = activity;
    expect(step(once, atStep2).data.blocks[0].recurrence).toBe('none');
    expect(step({ ...activity, end: '09:00' }, atStep2).ui.wizard.errors).toEqual([{ code: 'SLUTT_FOR_START', field: 'end' }]);
  });

  it('steg 3 legger til oppgave, lukker veiviseren og går til «I dag»', () => {
    const state = run(open(), (s) => step({ intent: 'skip' }, s), (s) => step({ intent: 'skip' }, s), showView({ view: 'kalender' }), (s) => step(firstTask, s));
    expect(state.data.tasks.map((t) => t.title)).toEqual(['Arbeidskrav 1']);
    expect(state.ui.wizard).toBeNull();
    expect(state.ui.view).toBe('idag');
    expect(state.data.onboarding_done).toBe(true);
  });

  it('steg 3 viser «Fristen har allerede vært»', () => {
    const atStep3 = run(open(), (s) => step({ intent: 'skip' }, s), (s) => step({ intent: 'skip' }, s));
    expect(step({ ...firstTask, deadline_date: '2026-11-01' }, atStep3).ui.wizard.errors).toEqual([
      { code: 'FRIST_I_FORTIDEN', field: 'deadline' },
    ]);
  });

  it('alle stegene kan hoppes over uten å endre noe annet enn at veiviseren er vist', () => {
    const before = open();
    const state = run(before, (s) => step({ intent: 'skip' }, s), (s) => step({ intent: 'skip' }, s), (s) => step({ intent: 'skip' }, s));
    expect(state.ui.wizard).toBeNull();
    expect(state.data).toEqual({ ...before.data, onboarding_done: true });
  });

  it('kan lukkes når som helst og vises ikke igjen av seg selv', () => {
    const closed = closeWizard()(step({ daily_available_study_hours: '6', intent: 'next' }, open()));
    expect(closed.ui.wizard).toBeNull();
    expect(closed.data.onboarding_done).toBe(true);
    expect(closed.data.user.daily_available_study_hours).toBe(6);
    expect(showWizardIfNew()(closed)).toBe(closed);
  });

  it('kan startes på nytt fra Innstillinger uten å slette noe', () => {
    const closed = closeWizard()(run(open(), (s) => step({ intent: 'skip' }, s), (s) => step(activity, s)));
    const restarted = restartWizard()(closed);
    expect(restarted.ui.wizard.step).toBe(1);
    expect(restarted.data).toBe(closed.data);
  });

  it('gjør ingenting når veiviseren ikke er åpen', () => {
    const state = initial();
    expect(step({ intent: 'next' }, state)).toBe(state);
    expect(closeWizard()(state)).toBe(state);
  });
});

describe('angre sletting', () => {
  const now = new Date(2026, 10, 4, 7, 0);
  const setup = () =>
    run(
      initial(),
      submitCourse({ name: 'Matte', color: '#3F8F6B' }, 'c1'),
      submitCourse({ name: 'Fysikk', color: '#7B5EA7' }, 'c2'),
      submitFixedBlock({ title: 'Forelesning', course_id: 'c1', date: '2026-11-02', start: '10:15', end: '12:00', weekly: 'on' }, 'f1'),
      submitFixedBlock({ title: 'Lab', course_id: 'c2', date: '2026-11-03', start: '08:00', end: '10:00', weekly: 'on' }, 'f2'),
      (s) => withReplan(submitTask({ title: 'Rapport', course_id: 'c1', description: '', estimated_hours: '3', deadline_date: '2026-11-06', deadline_time: '' }, 't1', now), now)(s),
    );
  const remove = (kind, id, token = 'tok-1') => (s) => confirmDelete({ token })(askDelete({ kind, id })(s));

  it('husker slettet oppgave og legger den tilbake på samme plass', () => {
    const before = setup();
    const deleted = remove('task', 't1')(before);
    expect(deleted.ui.undo).toMatchObject({ token: 'tok-1', kind: 'task', title: 'Rapport' });
    const restored = undoDelete()(deleted);
    expect(restored.data.tasks).toEqual(before.data.tasks);
    expect(restored.ui).toMatchObject({ undo: null, notice: 'SLETTING_ANGRET' });
  });

  it('legger tilbake gjennomførte økter, og planen lager resten på nytt', () => {
    const planned = setup();
    const first = planned.data.blocks.find((b) => !b.is_fixed);
    const withDone = toggleSession({ id: first.id })(planned);
    const restored = withReplan(undoDelete(), now)(remove('task', 't1')(withDone));
    const sessions = restored.data.blocks.filter((b) => b.task_id === 't1');
    expect(sessions.find((b) => b.id === first.id)?.is_completed).toBe(true);
    const hours = sessions.reduce((sum, b) => sum + (new Date(b.end_time) - new Date(b.start_time)) / 3_600_000, 0);
    expect(hours).toBe(3);
  });

  it('legger tilbake emne og koblingene fra oppgaver og aktiviteter', () => {
    const before = setup();
    const deleted = remove('course', 'c1')(before);
    expect(deleted.data.tasks[0].course_id).toBeNull();
    expect(deleted.data.blocks.find((b) => b.id === 'f1').course_id).toBeNull();
    const restored = undoDelete()(deleted);
    expect(restored.data.courses.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(restored.data.tasks[0].course_id).toBe('c1');
    expect(restored.data.blocks.find((b) => b.id === 'f1').course_id).toBe('c1');
    // Aktiviteter i andre emner er urørt
    expect(restored.data.blocks.find((b) => b.id === 'f2').course_id).toBe('c2');
  });

  it('beholder endringer gjort etter slettingen', () => {
    const deleted = remove('course', 'c1')(setup());
    // Oppgaven får et annet emne før slettingen angres – det valget beholdes
    const changed = { ...deleted, data: { ...deleted.data, tasks: deleted.data.tasks.map((t) => ({ ...t, course_id: 'c2' })) } };
    expect(undoDelete()(changed).data.tasks[0].course_id).toBe('c2');
  });

  it('legger tilbake fast aktivitet', () => {
    const before = setup();
    const restored = undoDelete()(remove('fixedBlock', 'f1')(before));
    expect(restored.data.blocks.filter((b) => b.is_fixed)).toEqual(before.data.blocks.filter((b) => b.is_fixed));
  });

  it('kan ikke angres når tiden er ute', () => {
    const deleted = remove('task', 't1')(setup());
    const expired = expireUndo({ token: 'tok-1' })(deleted);
    expect(expired.ui.undo).toBeNull();
    expect(undoDelete()(expired)).toBe(expired);
    expect(expired.data.tasks).toEqual([]);
  });

  it('en gammel tidtaker fjerner ikke en nyere sletting', () => {
    const twice = run(setup(), remove('fixedBlock', 'f1', 'tok-1'), remove('fixedBlock', 'f2', 'tok-2'));
    expect(twice.ui.undo.token).toBe('tok-2');
    expect(expireUndo({ token: 'tok-1' })(twice)).toBe(twice);
    // Bare den siste slettingen kan angres
    expect(undoDelete()(twice).data.blocks.map((b) => b.id)).toContain('f2');
    expect(undoDelete()(twice).data.blocks.map((b) => b.id)).not.toContain('f1');
  });
});

describe('sikkerhetskopi', () => {
  const now = new Date(2026, 10, 4, 9, 0);
  const backupOf = (state) => parseBackup(serializeBackup(state.data, now));
  const withCourse = () => submitCourse({ name: 'Mitt emne', color: '#3F8F6B' }, 'c1')(initial());

  it('viser hva filen inneholder og venter på bekreftelse', () => {
    const fromSample = backupOf(loadSampleData(now)(initial()));
    const state = importLoaded(fromSample)(withCourse());
    expect(state.ui.importState.counts).toEqual({ courses: 3, tasks: 4, fixed: 5 });
    expect(state.data.courses.map((c) => c.id)).toEqual(['c1']);
  });

  it('avbryt beholder dataene', () => {
    const before = withCourse();
    const state = cancelImport()(importLoaded(backupOf(loadSampleData(now)(initial())))(before));
    expect(state.ui.importState).toBeNull();
    expect(state.data).toBe(before.data);
  });

  it('erstatter dataene når det er bekreftet, og planlegger på nytt', () => {
    const fromSample = backupOf(loadSampleData(now)(initial()));
    const state = confirmImport(now)(importLoaded(fromSample)(withCourse()));
    expect(state.data.courses.map((c) => c.id)).not.toContain('c1');
    expect(state.data.tasks).toHaveLength(4);
    expect(state.data.last_checked_date).toBe('2026-11-04');
    expect(state.ui).toMatchObject({ view: 'idag', notice: 'IMPORT_FULLFORT', importState: null });
  });

  it('en fil med feil endrer ingenting og kan ikke bekreftes', () => {
    const before = withCourse();
    const failed = importLoaded({ error: 'UGYLDIG_JSON' })(before);
    expect(failed.ui.importState).toEqual({ error: 'UGYLDIG_JSON' });
    expect(confirmImport(now)(failed)).toBe(failed);
    expect(failed.data).toBe(before.data);
  });

  it('bekrefter nedlasting', () => {
    expect(backupExported()(initial()).ui.notice).toBe('SIKKERHETSKOPI_LASTET_NED');
  });
});

describe('eksport til kalender', () => {
  it('åpner skjema med begge typer og 4 uker som standard', () => {
    expect(openExportForm()(initial()).ui.forms.export).toEqual({ values: { include: 'both', weeks: '4' }, errors: [] });
  });

  it('viser feil og beholder valgene når perioden er tom', () => {
    const values = { include: 'sessions', weeks: '1' };
    const state = exportFailed(values, 'INGEN_HENDELSER')(openExportForm()(initial()));
    expect(state.ui.forms.export).toEqual({ values, errors: [{ code: 'INGEN_HENDELSER', field: 'include' }] });
  });

  it('lukker skjemaet og viser bekreftelse etter nedlasting, uten å endre data', () => {
    const before = openExportForm()(initial());
    const state = exportDone()(before);
    expect(state.ui.forms.export).toBeUndefined();
    expect(state.ui.notice).toBe('EKSPORT_LASTET_NED');
    expect(state.data).toBe(before.data);
  });

  it('avbryt lukker skjemaet', () => {
    expect(cancelExportForm()(openExportForm()(initial())).ui.forms.export).toBeUndefined();
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
