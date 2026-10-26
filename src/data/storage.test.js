import { describe, it, expect } from 'vitest';
import {
  load,
  save,
  loadTheme,
  saveTheme,
  STORAGE_KEY,
  BACKUP_KEY,
  THEME_KEY,
  migrationBackupKey,
} from './storage.js';
import { createInitialState, normalizeState, DEFAULT_SETTINGS } from '../logic/models.js';
import { migrate } from '../logic/migrate.js';
import { V1_STORED } from '../logic/fixtures/v1.js';

// Falsk localStorage i minnet
function fakeStorage(initial = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
  };
}

// Øyeblikksbilde av alt i lagringen, for å sjekke at ingenting er endret
const snapshot = (backend) => new Map(backend.items);

describe('save og load', () => {
  it('henter det som ble lagret', () => {
    const backend = fakeStorage();
    const state = { ...createInitialState({ userId: 'u1' }), tasks: [{ id: 't1', title: 'Rapport', priority: 'normal' }] };
    expect(save(state, backend)).toEqual({ ok: true });
    expect(load(backend)).toEqual({ state, error: null });
  });

  it('lagrer med versjonsnummer', () => {
    const backend = fakeStorage();
    save(createInitialState({ userId: 'u1' }), backend);
    expect(JSON.parse(backend.items.get(STORAGE_KEY)).version).toBe(2);
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

// Steg 9.4: overføring fra v1 til v2 (punkt 96 i plan.md)
describe('load med data i v1', () => {
  const v1Raw = JSON.stringify(V1_STORED.okter);

  it('lagrer en uendret kopi av v1-dataene og deretter dataene i v2', () => {
    const backend = fakeStorage({ [STORAGE_KEY]: v1Raw });
    const { state, error } = load(backend);

    expect(error).toBeNull();
    expect(state).toEqual(normalizeState(migrate(V1_STORED.okter).data));
    expect(backend.items.get(migrationBackupKey(1))).toBe(v1Raw);
    expect(JSON.parse(backend.items.get(STORAGE_KEY))).toEqual({ version: 2, data: state });
  });

  it('skriver kopien før dataene overskrives', () => {
    const backend = fakeStorage({ [STORAGE_KEY]: v1Raw });
    const order = [];
    const setItem = backend.setItem;
    backend.setItem = (key, value) => {
      order.push(key);
      setItem(key, value);
    };
    load(backend);
    expect(order).toEqual([migrationBackupKey(1), STORAGE_KEY]);
  });

  it('overskriver aldri kopien, verken ved neste lasting eller ved nye v1-data', () => {
    const backend = fakeStorage({ [STORAGE_KEY]: v1Raw });
    load(backend);
    load(backend);
    save(createInitialState({ userId: 'u2' }), backend);
    // F.eks. en gammel fane som lagret v1 igjen
    backend.setItem(STORAGE_KEY, JSON.stringify(V1_STORED.eksempel));
    load(backend);
    expect(backend.items.get(migrationBackupKey(1))).toBe(v1Raw);
  });

  it('laster v2 uten å endre noe i lagringen', () => {
    const backend = fakeStorage({ [STORAGE_KEY]: v1Raw });
    const first = load(backend);
    const before = snapshot(backend);
    expect(load(backend)).toEqual(first);
    expect(snapshot(backend)).toEqual(before);
  });

  it('endrer ingenting og gir rådataene tilbake når kopien ikke kan lagres', () => {
    const backend = fakeStorage({ [STORAGE_KEY]: v1Raw });
    const before = snapshot(backend);
    backend.setItem = () => {
      throw new Error('QuotaExceededError');
    };
    expect(load(backend)).toEqual({ state: null, error: 'LAGRET_KOPI_FEILET', blocked: true, raw: v1Raw });
    expect(snapshot(backend)).toEqual(before);
  });

  it('gir v2-dataene selv om lagringen av v2 feiler, når kopien er tatt', () => {
    const backend = fakeStorage({ [STORAGE_KEY]: v1Raw });
    const setItem = backend.setItem;
    backend.setItem = (key, value) => {
      if (key === STORAGE_KEY) throw new Error('QuotaExceededError');
      setItem(key, value);
    };
    expect(load(backend).state).toEqual(normalizeState(migrate(V1_STORED.okter).data));
    expect(backend.items.get(STORAGE_KEY)).toBe(v1Raw);
    expect(backend.items.get(migrationBackupKey(1))).toBe(v1Raw);
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

  it.each([
    ['nyere versjon', JSON.stringify({ version: 99, data: {} }), 'LAGRET_NYERE_VERSJON'],
    ['ukjent format', JSON.stringify({ tull: true }), 'LAGRET_UKJENT_FORMAT'],
    ['versjon som tekst', JSON.stringify({ version: '1', data: {} }), 'LAGRET_UKJENT_FORMAT'],
    ['JSON som ikke er et objekt', '42', 'LAGRET_UKJENT_FORMAT'],
  ])('endrer og sletter ingenting når data ikke kan overføres: %s', (_name, raw, error) => {
    const backend = fakeStorage({ [STORAGE_KEY]: raw, [THEME_KEY]: 'dark' });
    const before = snapshot(backend);
    expect(load(backend)).toEqual({ state: null, error, blocked: true, raw });
    expect(snapshot(backend)).toEqual(before);
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

describe('loadTheme og saveTheme', () => {
  const backend = () => {
    const storage = fakeStorage();
    storage.removeItem = (key) => storage.items.delete(key);
    return storage;
  };

  it('lagrer og henter lyst og mørkt valg', () => {
    const storage = backend();
    expect(saveTheme('dark', storage)).toEqual({ ok: true });
    expect(storage.items.get(THEME_KEY)).toBe('dark');
    expect(loadTheme(storage)).toBe('dark');
  });

  it('«Følg systemet» fjerner valget', () => {
    const storage = backend();
    saveTheme('light', storage);
    saveTheme('system', storage);
    expect(storage.items.has(THEME_KEY)).toBe(false);
    expect(loadTheme(storage)).toBe('system');
  });

  it('gir «system» for ukjent verdi eller uten lagring', () => {
    expect(loadTheme(fakeStorage({ [THEME_KEY]: 'lilla' }))).toBe('system');
    expect(loadTheme(null)).toBe('system');
    expect(saveTheme('dark', null)).toEqual({ ok: false, error: 'LAGRING_FEILET' });
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
