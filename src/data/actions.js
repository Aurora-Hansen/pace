// Endringer som sendes til store.update. Hver funksjon tar inn det den trenger
// og returnerer en ren funksjon state → nyState.
import { parseNumber } from '../logic/models.js';
import { validateSettings } from '../logic/validation.js';

export function createInitialUi({ error = null } = {}) {
  return {
    error,
    notice: null,
    forms: {},
  };
}

function withForm(state, name, form) {
  return { ...state, ui: { ...state.ui, notice: null, forms: { ...state.ui.forms, [name]: form } } };
}

function withoutForm(ui, name) {
  const { [name]: _removed, ...forms } = ui.forms;
  return { ...ui, forms };
}

// Innstillingsskjemaet. `values` er feltene fra skjemaet som tekst.
export const submitSettings = (values) => (state) => {
  const user = {
    ...state.data.user,
    name: (values.name ?? '').trim(),
    daily_available_study_hours: parseNumber(values.daily_available_study_hours),
    study_window_start: values.study_window_start ?? '',
    study_window_end: values.study_window_end ?? '',
  };

  const errors = validateSettings(user);
  if (errors.length > 0) {
    // Behold det brukeren skrev, så det ikke forsvinner ved neste tegning
    return withForm(state, 'settings', { values, errors });
  }

  return {
    data: { ...state.data, user },
    ui: { ...withoutForm(state.ui, 'settings'), notice: 'INNSTILLINGER_LAGRET' },
  };
};

export const dismissError = () => (state) => ({ ...state, ui: { ...state.ui, error: null } });
