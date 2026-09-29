import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative asset paths keep the build working from any static host or sub-path.
  base: './',
  build: { target: 'es2022', sourcemap: true },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/types.ts', 'src/global.d.ts'],
    },
  },
});
