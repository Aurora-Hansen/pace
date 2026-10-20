// Hilsen etter tid på døgnet (lokal tid). Ordene står i src/tekster.js.
// morgen 05–10, dag 10–17, kveld 17–23, natt 23–05 (fra og med første, til men ikke med siste)
export function greetingPeriod(date) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 10) return 'morgen';
  if (hour >= 10 && hour < 17) return 'dag';
  if (hour >= 17 && hour < 23) return 'kveld';
  return 'natt';
}
