import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import * as tekster from './src/tekster.js';

// Testene kjører i norsk tidssone, slik at sommertid testes likt på alle maskiner
process.env.TZ = 'Europe/Oslo';

// Adressen siden publiseres på. Brukes i OG-taggene, som må ha absolutte URL-er.
const SITE_URL = 'https://pacewa.netlify.app';

const escapeHtml = (value) =>
  String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Setter inn tekster fra src/tekster.js i HTML-filene: {{landingsside.hero.overskrift}}.
// Da kommer også landingssidens tekst fra samme sted som resten av appen.
function textsInHtml() {
  return {
    name: 'pace-tekster',
    transformIndexHtml(html) {
      return html
        .replaceAll('{{SITE_URL}}', SITE_URL)
        .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
          const value = path.split('.').reduce((object, key) => object?.[key], tekster);
          if (typeof value !== 'string') throw new Error(`Fant ikke teksten «${path}» i src/tekster.js`);
          return escapeHtml(value);
        });
    },
  };
}

// To sider: landingsside (index.html) og selve appen (app.html)
export default defineConfig({
  plugins: [textsInHtml()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app.html'),
      },
    },
  },
  test: {
    environment: 'node',
    env: { TZ: 'Europe/Oslo' },
  },
});
