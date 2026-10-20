import { describe, it, expect } from 'vitest';
import { parseTheme, effectiveTheme, toggledTheme } from './theme.js';

describe('parseTheme', () => {
  it('godtar lyst, mørkt og system, og gir system ellers', () => {
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('system')).toBe('system');
    expect(parseTheme(null)).toBe('system');
    expect(parseTheme('blå')).toBe('system');
  });
});

describe('effectiveTheme', () => {
  it('følger systemet når valget er «system»', () => {
    expect(effectiveTheme('system', true)).toBe('dark');
    expect(effectiveTheme('system', false)).toBe('light');
  });

  it('bruker brukerens valg uansett system', () => {
    expect(effectiveTheme('dark', false)).toBe('dark');
    expect(effectiveTheme('light', true)).toBe('light');
  });
});

describe('toggledTheme', () => {
  it('bytter til motsatt av det som vises', () => {
    expect(toggledTheme('system', true)).toBe('light');
    expect(toggledTheme('system', false)).toBe('dark');
    expect(toggledTheme('dark', false)).toBe('light');
    expect(toggledTheme('light', true)).toBe('dark');
  });
});
