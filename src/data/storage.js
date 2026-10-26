// All tilgang til localStorage går gjennom denne filen.
// `backend` kan byttes ut med en falsk lagring i tester.
import { normalizeState } from '../logic/models.js';
import { migrate, CURRENT_VERSION } from '../logic/migrate.js';
import { parseTheme } from '../logic/theme.js';

export const STORAGE_KEY = 'pace:v1';
export const BACKUP_KEY = 'pace:v1:backup';

// Kopi av dataene slik de var før de ble overført til et nyere format, én per versjon
// (pace:v1:kopi-v1 er v1-dataene fra før v2). Skrives bare én gang og overskrives aldri (punkt 96 i plan.md).
export const migrationBackupKey = (version) => `pace:v1:kopi-v${version}`;

// Feil fra migrate → feilkode for appen. Da er dataene verken overskrevet eller slettet,
// og appen starter ikke tom, men viser feilen og tilbyr å laste ned dataene.
const BLOCKED_ERRORS = {
  NYERE_VERSJON: 'LAGRET_NYERE_VERSJON',
  UKJENT_FORMAT: 'LAGRET_UKJENT_FORMAT',
};

function defaultBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // Nettleseren kan nekte tilgang, f.eks. ved blokkerte informasjonskapsler
    return null;
  }
}

// Gir { state, error }. state er null når ingenting er lagret eller dataene ikke kan leses.
// - Korrupt JSON: kopieres til BACKUP_KEY, og appen starter tom med LESING_FEILET (punkt 13).
// - Data i eldre format: en kopi lagres først, deretter overføres og lagres de i nyeste format.
// - Data som ikke kan overføres (eller kopien kunne ikke lagres): ingenting i localStorage endres,
//   og svaret er { state: null, error, blocked: true, raw } med rådataene, så de kan lastes ned.
export function load(backend = defaultBackend()) {
  let raw;
  try {
    raw = backend?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return { state: null, error: null };
  }
  if (raw === null) return { state: null, error: null };

  let stored;
  try {
    stored = JSON.parse(raw);
  } catch {
    // Ta vare på dataene som ikke kunne leses, så de ikke overskrives ved neste lagring
    try {
      backend.setItem(BACKUP_KEY, raw);
    } catch {
      // Ingenting mer å gjøre
    }
    return { state: null, error: 'LESING_FEILET' };
  }

  const migrated = migrate(stored);
  if (migrated.error) return { state: null, error: BLOCKED_ERRORS[migrated.error], blocked: true, raw };

  if (migrated.from < CURRENT_VERSION) {
    // Kopien må finnes før dataene i det gamle formatet overskrives
    const backupKey = migrationBackupKey(migrated.from);
    try {
      if (backend.getItem(backupKey) === null) backend.setItem(backupKey, raw);
    } catch {
      return { state: null, error: 'LAGRET_KOPI_FEILET', blocked: true, raw };
    }
    const state = normalizeState(migrated.data);
    // Feiler lagringen her, prøves den igjen ved neste endring. Kopien finnes uansett.
    save(state, backend);
    return { state, error: null };
  }

  return { state: normalizeState(migrated.data), error: null };
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
    backend.setItem(STORAGE_KEY, JSON.stringify({ version: CURRENT_VERSION, data: state }));
    return { ok: true };
  } catch {
    return { ok: false, error: 'LAGRING_FEILET' };
  }
}
