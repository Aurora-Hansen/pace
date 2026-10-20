import { describe, it, expect } from 'vitest';
import {
  createInitialUi,
  showView,
  dismissError,
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
} from './actions.js';
import { createInitialState, RECURRENCE } from '../logic/models.js';
import { load, save } from './storage.js';

const initial = () => ({ data: createInitialState({ userId: 'u1' }), ui: createInitialUi() });

// Kjører flere endringer etter hverandre
const run = (state, ...changes) => changes.reduce((current, change) => change(current), state);

describe('showView', () => {
  it('bytter visning og fjerner bekreftelser', () => {
    const state = run(initial(), (s) => ({ ...s, ui: { ...s.ui, notice: 'X' } }), showView({ view: 'innstillinger' }));
    expect(state.ui.view).toBe('innstillinger');
    expect(state.ui.notice).toBeNull();
  });

  it('ignorerer ukjente visninger og samme visning', () => {
    const state = initial();
    expect(showView({ view: 'finnes-ikke' })(state)).toBe(state);
    expect(showView({ view: 'timeplan' })(state)).toBe(state);
  });
});

describe('dismissError', () => {
  it('fjerner feilmeldingen', () => {
    const state = { ...initial(), ui: createInitialUi({ error: 'LAGRING_FEILET' }) };
    expect(dismissError()(state).ui.error).toBeNull();
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
