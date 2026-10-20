// Lys og mørk modus. Valget er 'light', 'dark' eller 'system' (følg systeminnstillingen).
export const THEMES = ['light', 'dark', 'system'];

// Ukjent eller manglende verdi (f.eks. fra lagring) gir 'system'
export function parseTheme(value) {
  return THEMES.includes(value) ? value : 'system';
}

// Modusen som faktisk vises
export function effectiveTheme(preference, systemDark) {
  if (preference === 'system') return systemDark ? 'dark' : 'light';
  return preference;
}

// Knappen i headeren bytter til motsatt av det som vises nå
export function toggledTheme(preference, systemDark) {
  return effectiveTheme(preference, systemDark) === 'dark' ? 'light' : 'dark';
}
