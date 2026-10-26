// Testdata fra v1 (steg 9.1, punkt 70 og 94 i plan.md). Brukes bare i tester.
import v1Eksempel from './v1-eksempel.json';
import v1Okter from './v1-okter.json';
import fasit from './fasit-v1.json';

// Lagret slik localStorage hadde det i v1: { version: 1, data }
export const V1_STORED = { eksempel: v1Eksempel, okter: v1Okter };
export const V1_FASIT = fasit;

// Innstillingene som gir v1-planen: 15 minutters pause og økter på 30–120 minutter.
// Standardverdiene i v2 er pause 0 og minste øktlengde 45, så fasiten sjekkes med disse eksplisitt.
export const V1_SETTINGS = {
  preferred_session_minutes: 120,
  min_session_minutes: 30,
  break_minutes: 15,
};

export const withV1Settings = (data) => ({ ...data, user: { ...data.user, ...V1_SETTINGS } });

export const sortBlocks = (blocks) =>
  [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id));
