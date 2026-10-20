import { defineConfig } from 'vite';
import { resolve } from 'node:path';

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
  },
});
