// Regelbasert tidsestimat fra en oppgavetekst (steg 6.3, F3 i krav.md).
// Gir { hours, reasons } der reasons er koder med tall. Teksten til hver kode ligger i src/tekster.js.
// Tom tekst gir { error: 'TOMT_ESTIMAT' }.

// Antakelser, samlet her så de er lette å justere
export const WORDS_PER_HOUR = 200; // skriving, inkludert research og redigering
export const WORDS_PER_PAGE = 400; // norsk standardside
export const HOURS_PER_SOURCE = 0.5;
export const MAX_SOURCE_HOURS = 5;
export const SOURCES_WITHOUT_NUMBER = 2;
export const PRESENTATION_HOURS = 3;
export const GROUP_HOURS = 1;
export const DEFAULT_HOURS = 3;

// Oppgavetyper i prioritert rekkefølge. Grunntiden brukes når lengden ikke står i teksten.
// Programmering legges alltid til, fordi koden kommer i tillegg til en eventuell tekst.
export const TASK_TYPES = [
  { type: 'programmering', hours: 10, always: true, pattern: /programm|\bkod(e|ing)\b|implementer|applikasjon|\bapp\b|nettside|javascript|python|\bjava\b/i },
  { type: 'labrapport', hours: 6, pattern: /\blab(rapport|oratorie|øvelse)?\b/i },
  { type: 'rapport', hours: 8, pattern: /rapport/i },
  { type: 'essay', hours: 6, pattern: /essay|drøft|artikkel/i },
  { type: 'refleksjon', hours: 3, pattern: /refleksjon/i },
];

// Tall som «2000», «2 000» eller «2.000»
const NUMBER = '(\\d{1,3}(?:[ .\\u00a0]\\d{3})+|\\d+)';
const toNumber = (text) => Number(text.replace(/[ . ]/g, ''));

// Høyeste tall i et intervall som «1500–2000 ord», eller tallet alene
function findAmount(text, unitPattern) {
  const regex = new RegExp(`${NUMBER}\\s*(?:[-–]\\s*${NUMBER}\\s*)?${unitPattern}`, 'gi');
  let best = null;
  for (const match of text.matchAll(regex)) {
    const amount = toNumber(match[2] ?? match[1]);
    if (best === null || amount > best) best = amount;
  }
  return best;
}

const roundToHalf = (hours) => Math.round(hours * 2) / 2;

export function estimateHours(text) {
  const clean = (text ?? '').trim();
  if (!clean) return { error: 'TOMT_ESTIMAT' };

  const reasons = [];

  // Lengde: ord eller sider
  const words = findAmount(clean, '(?:ord|words)\\b');
  const pages = words === null ? findAmount(clean, '(?:sider|side)\\b') : null;
  if (words !== null) {
    reasons.push({ code: 'ORD', words, hours: words / WORDS_PER_HOUR });
  } else if (pages !== null) {
    reasons.push({ code: 'SIDER', pages, hours: (pages * WORDS_PER_PAGE) / WORDS_PER_HOUR });
  }
  const hasLength = reasons.length > 0;

  // Oppgavetype
  const taskType = TASK_TYPES.find((candidate) => candidate.pattern.test(clean));
  if (taskType && (taskType.always || !hasLength)) {
    reasons.push({ code: 'TYPE', type: taskType.type, hours: taskType.hours });
  } else if (!taskType && !hasLength) {
    reasons.push({ code: 'STANDARD', hours: DEFAULT_HOURS });
  }

  // Kilder
  const sources = findAmount(clean, '(?:kilder|referanser|sources)\\b');
  if (sources !== null) {
    reasons.push({ code: 'KILDER', sources, hours: Math.min(sources * HOURS_PER_SOURCE, MAX_SOURCE_HOURS) });
  } else if (/kilde|referanse|litteraturliste|\bapa\b|harvard/i.test(clean)) {
    reasons.push({ code: 'KILDER_UTEN_TALL', hours: SOURCES_WITHOUT_NUMBER });
  }

  if (/presentasjon|fremføring|framføring|muntlig|presenter/i.test(clean)) {
    reasons.push({ code: 'PRESENTASJON', hours: PRESENTATION_HOURS });
  }

  if (/gruppe|i par\b|sammen med|medstudent/i.test(clean)) {
    reasons.push({ code: 'GRUPPE', hours: GROUP_HOURS });
  }

  // En lang oppgavetekst tar tid å sette seg inn i
  const textWords = clean.split(/\s+/).length;
  if (textWords > 800) reasons.push({ code: 'LANG_TEKST', hours: 2 });
  else if (textWords > 300) reasons.push({ code: 'LANG_TEKST', hours: 1 });

  const total = reasons.reduce((sum, reason) => sum + reason.hours, 0);
  return { hours: Math.max(1, roundToHalf(total)), reasons };
}
