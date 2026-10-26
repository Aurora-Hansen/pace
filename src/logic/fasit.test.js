// Fasit fra v1 (steg 9.1): planen dagens kode lager for to lagrede datasett.
// Fasiten ble laget én gang med koden fra før fase 9 og skal ikke lages på nytt.
// Med standardinnstillingene skal planen være den samme etter alle endringene i fase 9–14 (punkt 68 i plan.md).
// Endrer en test seg her, har planen endret seg for brukere som ikke har endret noe.
import { describe, it, expect } from 'vitest';
import { replan, rollover } from './rollover.js';
import { detectOverload } from './overload.js';
import v1Eksempel from './fixtures/v1-eksempel.json';
import v1Okter from './fixtures/v1-okter.json';
import fasit from './fixtures/fasit-v1.json';

const stored = { eksempel: v1Eksempel, okter: v1Okter };
const fns = { replan, rollover };

const sortBlocks = (blocks) =>
  [...blocks].sort((a, b) => a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id));

describe('fasit fra v1', () => {
  it('datasettene er lagret i v1-format', () => {
    expect(v1Eksempel.version).toBe(1);
    expect(v1Okter.version).toBe(1);
  });

  it.each(fasit.map((f) => [f.dataset, f.fn, f.now, f]))('%s: %s ved %s', (dataset, fn, now, expected) => {
    const data = structuredClone(stored[dataset].data);
    const result = fns[fn](data, new Date(now));

    expect(sortBlocks(result.blocks)).toEqual(expected.blocks);
    expect(result.last_checked_date).toBe(expected.last_checked_date);
    expect(detectOverload(result, new Date(now))).toEqual(expected.overload);
    // Datasettet endres ikke
    expect(data).toEqual(stored[dataset].data);
  });
});
