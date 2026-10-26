// Overføring av lagrede data til nyeste format (steg 9.3, punkt 67, 69 og 94 i plan.md).
// Hvert versjonsskifte er en ren funksjon i en kjede: 1 → 2, senere 2 → 3 osv.
// Brukes både når data lastes fra localStorage og ved import av sikkerhetskopi.
import { PRIORITY } from './models.js';

export const CURRENT_VERSION = 2;

const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

// Fyller inn felt som mangler på elementene i en liste. Lister og elementer med feil type røres ikke,
// så valideringen fortsatt kan finne dem.
const fillItems = (list, defaults) =>
  Array.isArray(list) ? list.map((item) => (isObject(item) ? { ...defaults, ...item } : item)) : list;

// v1 → v2: datamodell v2. Verdiene står her og ikke via DEFAULT_SETTINGS, så overføringen fra v1
// blir den samme selv om standardverdiene endres senere.
// v1 hadde ingen innstillinger for økter, så brukere med data får de nye standardverdiene (punkt 94):
// pause 0 og minste øktlengde 45.
function v1ToV2(data) {
  return {
    ...data,
    user: isObject(data.user)
      ? { preferred_session_minutes: 120, min_session_minutes: 45, break_minutes: 0, preferred_times: [], ...data.user }
      : data.user,
    tasks: fillItems(data.tasks, { priority: PRIORITY.NORMAL }),
    blocks: fillItems(data.blocks, { is_locked: false }),
    days_off: data.days_off ?? [],
  };
}

const MIGRATIONS = { 1: v1ToV2 };

// `stored` er det som er lagret: { version, data }.
// Gir { data, from, to } med data i nyeste format, eller { error }:
// - UKJENT_FORMAT: ikke et objekt med heltallsversjon fra 1 og et dataobjekt
// - NYERE_VERSJON: lagret av en nyere versjon av appen enn denne
export function migrate(stored) {
  if (!isObject(stored) || !isObject(stored.data) || !Number.isInteger(stored.version) || stored.version < 1) {
    return { error: 'UKJENT_FORMAT' };
  }
  if (stored.version > CURRENT_VERSION) return { error: 'NYERE_VERSJON' };

  let data = stored.data;
  for (let version = stored.version; version < CURRENT_VERSION; version += 1) {
    data = MIGRATIONS[version](data);
  }
  return { data, from: stored.version, to: CURRENT_VERSION };
}
