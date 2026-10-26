// Fasit fra v1 (steg 9.1): planen koden fra før fase 9 lager for to lagrede datasett.
// Fasiten ble laget én gang med scripts/lag-fasit.mjs og skal ikke lages på nytt.
// Standardverdiene er endret i v2 (pause 0, minste øktlengde 45), så planleggeren kjøres her med
// v1-innstillingene eksplisitt. Med dem skal planen være den samme gjennom fase 9–14 (punkt 70 og 94 i plan.md).
// Feiler en test her, har v1-oppførselen endret seg, og det er koden som skal rettes.
import { describe, it, expect } from 'vitest';
import { replan, rollover } from './rollover.js';
import { detectOverload } from './overload.js';
import { V1_STORED, V1_FASIT, withV1Settings, sortBlocks } from './fixtures/v1.js';

const fns = { replan, rollover };

describe('fasit fra v1', () => {
  it('datasettene er lagret i v1-format', () => {
    expect(V1_STORED.eksempel.version).toBe(1);
    expect(V1_STORED.okter.version).toBe(1);
  });

  it.each(V1_FASIT.map((f) => [f.dataset, f.fn, f.now, f]))('%s: %s ved %s', (dataset, fn, now, expected) => {
    const data = withV1Settings(structuredClone(V1_STORED[dataset].data));
    const before = structuredClone(data);
    const result = fns[fn](data, new Date(now));

    expect(sortBlocks(result.blocks)).toEqual(expected.blocks);
    expect(result.last_checked_date).toBe(expected.last_checked_date);
    expect(detectOverload(result, new Date(now))).toEqual(expected.overload);
    // Datasettet endres ikke
    expect(data).toEqual(before);
  });
});
