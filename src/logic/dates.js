// Hjelpefunksjoner for datoer og klokkeslett. Alt tolkes i lokal tid.
// En dag representeres som en datonøkkel 'YYYY-MM-DD'. Da regner vi i hele dager
// og ikke i millisekunder, så sommertid ikke gir døgn på 23 eller 25 timer.

const pad = (n) => String(n).padStart(2, '0');

function keyParts(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  return [year, month - 1, day];
}

// Date → 'YYYY-MM-DD' (lokal dato)
export function toDateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function isValidDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toDateKey(fromDateKey(value)) === value;
}

// 'YYYY-MM-DD' → Date ved lokal midnatt
export function fromDateKey(dateKey) {
  return atMinutes(dateKey, 0);
}

// Tidspunkt på en dato, gitt som minutter siden midnatt (lokal tid)
export function atMinutes(dateKey, minutes) {
  const [year, month, day] = keyParts(dateKey);
  return new Date(year, month, day, Math.floor(minutes / 60), minutes % 60);
}

export function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

export function addDays(dateKey, days) {
  const [year, month, day] = keyParts(dateKey);
  return toDateKey(new Date(year, month, day + days));
}

// Antall hele dager fra a til b (negativt hvis b er før a)
export function daysBetween(a, b) {
  return Math.round((Date.UTC(...keyParts(b)) - Date.UTC(...keyParts(a))) / 86_400_000);
}

// 1 = mandag … 7 = søndag
export function weekday(dateKey) {
  return ((fromDateKey(dateKey).getDay() + 6) % 7) + 1;
}

// Mandagen i samme uke
export function startOfWeek(dateKey) {
  return addDays(dateKey, 1 - weekday(dateKey));
}

// De sju datoene i uken, fra mandag til søndag
export function weekDays(dateKey) {
  const monday = startOfWeek(dateKey);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

// Ukenummer etter ISO 8601 (som i norske kalendere)
export function isoWeek(dateKey) {
  // Uken hører til året som torsdagen i uken ligger i
  const thursday = addDays(startOfWeek(dateKey), 3);
  const firstMonday = startOfWeek(`${thursday.slice(0, 4)}-01-04`);
  return daysBetween(firstMonday, startOfWeek(dateKey)) / 7 + 1;
}

// 'HH:MM' → minutter siden midnatt, eller null hvis ugyldig
export function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value ?? '');
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

// Minutter siden midnatt → 'HH:MM'
export function formatTime(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

// Overlapper to tidsrom { start, end }? Endepunktene er halvåpne, så 10–12 og 12–14 overlapper ikke.
export function overlaps(a, b) {
  return +a.start < +b.end && +b.start < +a.end;
}
