import { describe, it, expect } from 'vitest';
import { estimateHours } from './estimate.js';

const codes = (result) => result.reasons.map((r) => r.code);

describe('estimateHours', () => {
  it('gir feil for tom tekst', () => {
    expect(estimateHours('')).toEqual({ error: 'TOMT_ESTIMAT' });
    expect(estimateHours('   \n ')).toEqual({ error: 'TOMT_ESTIMAT' });
    expect(estimateHours(undefined)).toEqual({ error: 'TOMT_ESTIMAT' });
  });

  it('essay med ordgrense og kilder', () => {
    const result = estimateHours('Skriv et drøftende essay på 2000 ord. Bruk minst 5 kilder og APA 7.');
    expect(result.hours).toBe(12.5); // 10 t skriving + 2,5 t kilder
    expect(result.reasons).toEqual([
      { code: 'ORD', words: 2000, hours: 10 },
      { code: 'KILDER', sources: 5, hours: 2.5 },
    ]);
  });

  it('forstår tall med mellomrom og intervaller, og bruker det høyeste', () => {
    expect(estimateHours('Besvarelsen skal være 1 500–2 000 ord.').reasons[0]).toEqual({
      code: 'ORD',
      words: 2000,
      hours: 10,
    });
  });

  it('rapport oppgitt i sider', () => {
    const result = estimateHours('Gruppen skal levere en rapport på 5–7 sider.');
    // 7 sider × 400 ord = 2800 ord = 14 t, + 1 t gruppe
    expect(result.hours).toBe(15);
    expect(codes(result)).toEqual(['SIDER', 'GRUPPE']);
  });

  it('rapport uten lengde bruker grunntiden for typen', () => {
    const result = estimateHours('Lag en rapport om forsøket. Ta med en litteraturliste.');
    expect(result.reasons).toEqual([
      { code: 'TYPE', type: 'rapport', hours: 8 },
      { code: 'KILDER_UTEN_TALL', hours: 2 },
    ]);
    expect(result.hours).toBe(10);
  });

  it('programmeringsoppgave med presentasjon', () => {
    const result = estimateHours('Implementer en enkel app i JavaScript og presenter løsningen for klassen.');
    expect(result.hours).toBe(13);
    expect(codes(result)).toEqual(['TYPE', 'PRESENTASJON']);
  });

  it('programmering legges til selv når teksten har en ordgrense', () => {
    const result = estimateHours('Skriv et Python-program og en rapport på 1000 ord om løsningen.');
    expect(result.hours).toBe(15); // 5 t skriving + 10 t programmering
  });

  it('kort refleksjonsnotat', () => {
    expect(estimateHours('Refleksjonsnotat etter praksisuken.').hours).toBe(3);
  });

  it('gir standardestimat når ingenting gjenkjennes', () => {
    expect(estimateHours('Ukesoppgave 4')).toEqual({ hours: 3, reasons: [{ code: 'STANDARD', hours: 3 }] });
  });

  it('legger til tid for lang oppgavetekst', () => {
    const long = `${'Les kriteriene nøye. '.repeat(120)}`;
    expect(codes(estimateHours(long))).toContain('LANG_TEKST');
  });

  it('begrenser tiden til kilder', () => {
    expect(estimateHours('Bruk 30 kilder.').reasons.find((r) => r.code === 'KILDER').hours).toBe(5);
  });

  it('gir alltid et rundet estimat større enn 0', () => {
    const texts = ['Skriv 50 ord.', 'Skriv 333 ord.', 'Essay', 'x', 'Rapport på 1 side'];
    for (const text of texts) {
      const { hours } = estimateHours(text);
      expect(hours).toBeGreaterThanOrEqual(1);
      expect(hours * 2).toBe(Math.round(hours * 2));
    }
  });
});
