import { describe, it, expect } from 'vitest';
import { createInitialUi, submitSettings, dismissError } from './actions.js';
import { createInitialState } from '../logic/models.js';
import { load, save } from './storage.js';

const initial = () => ({ data: createInitialState({ userId: 'u1' }), ui: createInitialUi() });

const validValues = {
  name: ' Kari ',
  daily_available_study_hours: '5,5',
  study_window_start: '09:00',
  study_window_end: '20:00',
};

describe('submitSettings', () => {
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
    const fixed = submitSettings(validValues)(withError);
    expect(fixed.ui.forms.settings).toBeUndefined();
  });

  it('innstillingene er der etter lagring og ny innlasting', () => {
    const items = new Map();
    const backend = { getItem: (k) => items.get(k) ?? null, setItem: (k, v) => items.set(k, v) };
    const state = submitSettings(validValues)(initial());
    save(state.data, backend);
    expect(load(backend).state.user.daily_available_study_hours).toBe(5.5);
  });
});

describe('dismissError', () => {
  it('fjerner feilmeldingen', () => {
    const state = { ...initial(), ui: createInitialUi({ error: 'LAGRING_FEILET' }) };
    expect(dismissError()(state).ui.error).toBeNull();
  });
});
