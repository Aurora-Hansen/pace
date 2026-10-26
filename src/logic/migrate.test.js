import { describe, it, expect } from 'vitest';
import { migrate, CURRENT_VERSION } from './migrate.js';
import { replan, rollover } from './rollover.js';
import { detectOverload } from './overload.js';
import { normalizeState, PRIORITY } from './models.js';
import { V1_STORED, V1_FASIT, withV1Settings, sortBlocks } from './fixtures/v1.js';

// Feltene v2 legger til, for å sammenligne resten med originalen
function withoutV2Fields(data) {
  const { preferred_session_minutes: _p, min_session_minutes: _m, break_minutes: _b, preferred_times: _t, ...user } =
    data.user;
  const { days_off: _d, ...rest } = data;
  return {
    ...rest,
    user,
    tasks: data.tasks.map(({ priority: _pr, ...task }) => task),
    blocks: data.blocks.map(({ is_locked: _l, ...block }) => block),
  };
}

describe('migrate', () => {
  it('er på versjon 2', () => {
    expect(CURRENT_VERSION).toBe(2);
  });

  describe.each(Object.keys(V1_STORED))('v1-datasettet «%s»', (name) => {
    const stored = V1_STORED[name];
    const result = migrate(structuredClone(stored));

    it('overføres fra versjon 1 til 2', () => {
      expect(result.error).toBeUndefined();
      expect(result.from).toBe(1);
      expect(result.to).toBe(2);
    });

    it('får de nye standardverdiene for økter (pause 0, minste 45, foretrukket 120)', () => {
      expect(result.data.user).toMatchObject({
        preferred_session_minutes: 120,
        min_session_minutes: 45,
        break_minutes: 0,
        preferred_times: [],
      });
    });

    it('får normal prioritet, ulåste økter og ingen fridager', () => {
      expect(result.data.tasks.every((task) => task.priority === PRIORITY.NORMAL)).toBe(true);
      expect(result.data.blocks.every((block) => block.is_locked === false)).toBe(true);
      expect(result.data.days_off).toEqual([]);
    });

    it('beholder alt annet uendret', () => {
      expect(withoutV2Fields(result.data)).toEqual(stored.data);
    });

    it('endrer ikke argumentet', () => {
      const copy = structuredClone(stored);
      migrate(copy);
      expect(copy).toEqual(stored);
    });

    it('gir samme resultat når det overføres to ganger', () => {
      const again = migrate({ version: result.to, data: result.data });
      expect(again).toEqual({ data: result.data, from: 2, to: 2 });
    });
  });

  // Planen skal være lik fasiten fra 9.1 når planleggeren kjøres med v1-innstillingene (punkt 94)
  it.each(V1_FASIT.map((f) => [f.dataset, f.fn, f.now, f]))(
    'overførte data gir fasiten med v1-innstillingene: %s, %s ved %s',
    (dataset, fn, now, expected) => {
      const data = withV1Settings(normalizeState(migrate(V1_STORED[dataset]).data));
      const result = { replan, rollover }[fn](data, new Date(now));
      // Nye økter fra planleggeren får is_locked først i steg 11.2 (punkt 93), så det sammenlignes uten feltet
      const strip = (blocks) => sortBlocks(blocks).map(({ is_locked: _l, ...block }) => block);
      expect(strip(result.blocks)).toEqual(expected.blocks);
      expect(result.last_checked_date).toBe(expected.last_checked_date);
      expect(detectOverload(result, new Date(now))).toEqual(expected.overload);
    },
  );

  it('overfører tomme data', () => {
    expect(migrate({ version: 1, data: {} })).toEqual({
      data: { user: undefined, tasks: undefined, blocks: undefined, days_off: [] },
      from: 1,
      to: 2,
    });
  });

  it('beholder v2-felt som allerede finnes', () => {
    const { data } = migrate({
      version: 1,
      data: {
        user: { id: 'u1', break_minutes: 10 },
        tasks: [{ id: 't1', priority: PRIORITY.HIGH }],
        blocks: [{ id: 'b1', is_locked: true }],
        days_off: [{ date: '2026-11-04', kind: 'off' }],
      },
    });
    expect(data.user.break_minutes).toBe(10);
    expect(data.user.min_session_minutes).toBe(45);
    expect(data.tasks[0].priority).toBe(PRIORITY.HIGH);
    expect(data.blocks[0].is_locked).toBe(true);
    expect(data.days_off).toEqual([{ date: '2026-11-04', kind: 'off' }]);
  });

  it('lar felt og elementer med feil type være i fred, så valideringen kan finne dem', () => {
    const { data } = migrate({ version: 1, data: { user: 'tull', tasks: ['x', null, { id: 't1' }], blocks: 'ikke en liste' } });
    expect(data.user).toBe('tull');
    expect(data.tasks).toEqual(['x', null, { id: 't1', priority: PRIORITY.NORMAL }]);
    expect(data.blocks).toBe('ikke en liste');
  });

  it('gir v2-data tilbake uendret', () => {
    const data = { user: { id: 'u1' }, tasks: [], blocks: [] };
    const result = migrate({ version: 2, data });
    expect(result.data).toBe(data);
    expect(result.from).toBe(2);
  });

  it('avviser data fra en nyere versjon', () => {
    expect(migrate({ version: 3, data: {} })).toEqual({ error: 'NYERE_VERSJON' });
  });

  it.each([
    ['ingenting', undefined],
    ['null', null],
    ['en liste', []],
    ['manglende versjon', { data: {} }],
    ['versjon som tekst', { version: '1', data: {} }],
    ['versjon 0', { version: 0, data: {} }],
    ['desimalversjon', { version: 1.5, data: {} }],
    ['manglende data', { version: 1 }],
    ['data som er null', { version: 1, data: null }],
    ['data som er en liste', { version: 1, data: [] }],
  ])('avviser ukjent format: %s', (_name, stored) => {
    expect(migrate(stored)).toEqual({ error: 'UKJENT_FORMAT' });
  });
});
