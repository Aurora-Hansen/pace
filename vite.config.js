import { defineConfig } from 'vite';
import { resolve } from 'node:path';

// Testene kjører i norsk tidssone, slik at sommertid testes likt på alle maskiner
process.env.TZ = 'Europe/Oslo';

// To sider: landingsside (index.html) og selve appen (app.html)
export default defineConfig({
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
