import { describe, it, expect } from 'vitest';
import { formatHours, hoperSegOpp, feilmeldinger } from './tekster.js';

describe('hoperSegOpp.tekst', () => {
  it('fyller inn antall timer og dag', () => {
    expect(hoperSegOpp.tekst({ antall: 6, dag: 'i morgen' })).toBe(
      'For å rekke fristen må du jobbe 6 timer i morgen. Det er mer enn dagskapasiteten din. Vil du fordele arbeidet annerledes?',
    );
  });

  it('bruker desimalkomma', () => {
    expect(hoperSegOpp.tekst({ antall: 2.5, dag: 'på torsdag' })).toContain('jobbe 2,5 timer på torsdag.');
  });

  it('gir delene for utheving, og de blir samme tekst satt sammen', () => {
    const deler = hoperSegOpp.tekstDeler({ antall: 3, dag: 'i dag' });
    expect(deler.uthevet).toBe('3 timer');
    expect(deler.for + deler.uthevet + deler.etter).toBe(hoperSegOpp.tekst({ antall: 3, dag: 'i dag' }));
  });
});

describe('formatHours', () => {
  it('bruker entall for én time', () => {
    expect(formatHours(1)).toBe('1 time');
  });

  it('runder til én desimal', () => {
    expect(formatHours(1.25)).toBe('1,3 timer');
  });
});

describe('feilmeldinger', () => {
  it('har overskrift og tekst for alle feilkoder', () => {
    const koder = ['LAGRING_FEILET', 'FRIST_I_FORTIDEN', 'TOMT_ESTIMAT', 'MANGLER_FELT', 'SLUTT_FOR_START'];
    for (const kode of koder) {
      expect(feilmeldinger[kode].overskrift).toBeTruthy();
      expect(feilmeldinger[kode].tekst).toBeTruthy();
    }
  });
});
