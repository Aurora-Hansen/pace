import { describe, it, expect, vi } from 'vitest';
import { createStore } from './store.js';

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function setup(saveResult = { ok: true }) {
  const state = deepFreeze({ data: { tasks: [], user: { name: 'Kari' } }, ui: { error: null } });
  const save = vi.fn(() => saveResult);
  const render = vi.fn();
  const store = createStore({ state, save, render });
  return { state, save, render, store };
}

const renameUser = (name) => (state) => ({ ...state, data: { ...state.data, user: { ...state.data.user, name } } });

describe('createStore', () => {
  it('kaller render nøyaktig én gang med ny tilstand', () => {
    const { store, render } = setup();
    store.update(renameUser('Ola'));
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(store.getState());
    expect(store.getState().data.user.name).toBe('Ola');
  });

  it('lagrer data etter endring', () => {
    const { store, save } = setup();
    store.update(renameUser('Ola'));
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(store.getState().data);
  });

  it('endrer ikke den gamle tilstanden', () => {
    const { store, state } = setup();
    // Den gamle tilstanden er frosset, så forsøk på å endre den ville kastet feil
    expect(() => store.update(renameUser('Ola'))).not.toThrow();
    expect(state.data.user.name).toBe('Kari');
  });

  it('lagrer ikke når bare ui endres', () => {
    const { store, save, render } = setup();
    store.update((state) => ({ ...state, ui: { ...state.ui, view: 'innstillinger' } }));
    expect(save).not.toHaveBeenCalled();
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('gjør ingenting når endringen gir samme tilstand', () => {
    const { store, save, render } = setup();
    store.update((state) => state);
    expect(save).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it('beholder endringen og viser feil når lagring feiler', () => {
    const { store, render } = setup({ ok: false, error: 'LAGRING_FEILET' });
    store.update(renameUser('Ola'));
    expect(store.getState().data.user.name).toBe('Ola');
    expect(store.getState().ui.error).toBe('LAGRING_FEILET');
    expect(render).toHaveBeenCalledTimes(1);
  });

  it('start tegner første gang', () => {
    const { store, render, state } = setup();
    store.start();
    expect(render).toHaveBeenCalledWith(state);
  });
});
