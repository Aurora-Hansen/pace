import { describe, it, expect } from 'vitest';
import { formatHours, hoperSegOpp, feilmeldinger, estimat, ukesoppsummering, hilsen } from './tekster.js';
import { estimateHours, TASK_TYPES } from './logic/estimate.js';

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

describe('hilsen', () => {
  it('tar med navnet når det er satt', () => {
    expect(hilsen.tekst('morgen', 'Kari')).toBe('God morgen, Kari!');
    expect(hilsen.tekst('kveld', '  Ola  ')).toBe('God kveld, Ola!');
  });

  it('klarer seg uten navn', () => {
    expect(hilsen.tekst('dag', '')).toBe('God dag!');
    expect(hilsen.tekst('natt', undefined)).toBe('God natt!');
    expect(hilsen.tekst('natt', '   ')).toBe('God natt!');
  });
});

describe('ukesoppsummering', () => {
  it('skriver «Denne uken: 6 av 14 timer» med desimalkomma og entall', () => {
    expect(ukesoppsummering.tekst(6, 14)).toBe('Denne uken: 6 av 14 timer');
    expect(ukesoppsummering.tekst(1.5, 2.5)).toBe('Denne uken: 1,5 av 2,5 timer');
    expect(ukesoppsummering.tekst(0, 1)).toBe('Denne uken: 0 av 1 time');
    expect(ukesoppsummering.tekst(2.25, 23.25)).toBe('Denne uken: 2,25 av 23,25 timer');
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

describe('estimat.begrunnelse', () => {
  it('har tekst for alle begrunnelser estimatet kan gi', () => {
    const result = estimateHours(
      'Gruppen skal skrive en rapport på 2 000 ord med minst 4 kilder, og presentere den. ' + 'Les nøye. '.repeat(160),
    );
    const texts = result.reasons.map((reason) => estimat.begrunnelse[reason.code](reason));
    expect(texts).toEqual([
      // Intl bruker hardt mellomrom (U+00A0) som tusenskille på norsk
      '2 000 ord å skrive: 10 timer',
      '4 kilder: + 2 timer',
      'Presentasjon: + 3 timer',
      'Gruppearbeid og koordinering: + 1 time',
      'Lang oppgavetekst å sette seg inn i: + 1 time',
    ]);
  });

  it('har navn på alle oppgavetyper', () => {
    for (const { type } of TASK_TYPES) expect(estimat.typer[type]).toBeTruthy();
  });
});

describe('feilmeldinger', () => {
  it('har overskrift og tekst for alle feilkoder', () => {
    const koder = [
      'LAGRING_FEILET',
      'LESING_FEILET',
      'FRIST_I_FORTIDEN',
      'TOMT_ESTIMAT',
      'MANGLER_FELT',
      'SLUTT_FOR_START',
    ];
    for (const kode of koder) {
      expect(feilmeldinger[kode].overskrift).toBeTruthy();
      expect(feilmeldinger[kode].tekst).toBeTruthy();
    }
  });
});
