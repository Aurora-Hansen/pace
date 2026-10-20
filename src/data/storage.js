// All tilgang til localStorage går gjennom denne filen.
// `backend` kan byttes ut med en falsk lagring i tester.
import { normalizeState } from '../logic/models.js';
import { parseTheme } from '../logic/theme.js';

export const STORAGE_KEY = 'pace:v1';
export const BACKUP_KEY = 'pace:v1:backup';
const VERSION = 1;

function defaultBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Nettleseren kan nekte tilgang, f.eks. ved blokkerte informasjonskapsler
    return null;
  }
}

// Gir { state, error }. state er null når ingenting er lagret eller dataene ikke kan leses.
export function load(backend = defaultBackend()) {
  let raw;
  try {
    raw = backend?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return { state: null, error: null };
  }
  if (raw === null) return { state: null, error: null };

  try {
    const stored = JSON.parse(raw);
    if (stored?.version !== VERSION || typeof stored.data !== 'object' || stored.data === null) {
      throw new Error('Ukjent lagringsformat');
    }
    return { state: normalizeState(stored.data), error: null };
  } catch {
    // Ta vare på dataene som ikke kunne leses, så de ikke overskrives ved neste lagring
    try {
      backend.setItem(BACKUP_KEY, raw);
    } catch {
      // Ingenting mer å gjøre
    }
    return { state: null, error: 'LESING_FEILET' };
  }
}

// Valg av lys/mørk modus lagres under egen nøkkel, fordi det må leses før appen starter
// (et lite skript i <head> i index.html og app.html leser samme nøkkel for å unngå hvit blink).
export const THEME_KEY = 'pace:tema';

export function loadTheme(backend = defaultBackend()) {
  try {
    return parseTheme(backend?.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

export function saveTheme(theme, backend = defaultBackend()) {
  try {
    if (theme === 'system') backend.removeItem(THEME_KEY);
    else backend.setItem(THEME_KEY, theme);
    return { ok: true };
  } catch {
    return { ok: false, error: 'LAGRING_FEILET' };
  }
}

// Gir { ok: true } eller { ok: false, error: 'LAGRING_FEILET' }
export function save(state, backend = defaultBackend()) {
  try {
    backend.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, data: state }));
    return { ok: true };
  } catch {
    return { ok: false, error: 'LAGRING_FEILET' };
  }
}
