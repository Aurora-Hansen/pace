import { describe, it, expect } from 'vitest';
import { load, save, STORAGE_KEY, BACKUP_KEY } from './storage.js';
import { createInitialState, DEFAULT_SETTINGS } from '../logic/models.js';

// Falsk localStorage i minnet
function fakeStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

describe('save og load', () => {
  it('henter det som ble lagret', () => {
    const backend = fakeStorage();
    const state = { ...createInitialState({ userId: 'u1' }), tasks: [{ id: 't1', title: 'Rapport' }] };
    expect(save(state, backend)).toEqual({ ok: true });
    expect(load(backend)).toEqual({ state, error: null });
  });

  it('lagrer med versjonsnummer', () => {
    const backend = fakeStorage();
    save(createInitialState({ userId: 'u1' }), backend);
    expect(JSON.parse(backend.items.get(STORAGE_KEY)).version).toBe(1);
  });

  it('fyller inn nye felt i eldre lagrede data', () => {
    const backend = fakeStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 1, data: { user: { id: 'u1' } } }),
    });
    const { state } = load(backend);
    expect(state.user).toEqual({ id: 'u1', name: '', ...DEFAULT_SETTINGS });
    expect(state.tasks).toEqual([]);
  });
});

describe('load', () => {
  it('gir null uten feil når ingenting er lagret', () => {
    expect(load(fakeStorage())).toEqual({ state: null, error: null });
  });

  it('gir feil og tar vare på korrupt JSON', () => {
    const backend = fakeStorage({ [STORAGE_KEY]: '{ødelagt' });
    expect(load(backend)).toEqual({ state: null, error: 'LESING_FEILET' });
    expect(backend.items.get(BACKUP_KEY)).toBe('{ødelagt');
  });

  it('gir feil for ukjent versjon', () => {
    const backend = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ version: 99, data: {} }) });
    expect(load(backend).error).toBe('LESING_FEILET');
  });

  it('tåler at lagringen ikke er tilgjengelig', () => {
    const backend = {
      getItem: () => {
        throw new Error('SecurityError');
      },
    };
    expect(load(backend)).toEqual({ state: null, error: null });
    expect(load(null)).toEqual({ state: null, error: null });
  });
});

describe('save', () => {
  it('gir LAGRING_FEILET når setItem kaster feil', () => {
    const backend = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    expect(save(createInitialState({ userId: 'u1' }), backend)).toEqual({ ok: false, error: 'LAGRING_FEILET' });
  });

  it('gir LAGRING_FEILET uten lagring', () => {
    expect(save(createInitialState({ userId: 'u1' }), null)).toEqual({ ok: false, error: 'LAGRING_FEILET' });
  });
});
