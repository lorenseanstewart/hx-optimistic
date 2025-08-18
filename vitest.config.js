import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/helpers/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'tests/**',
        'demo/**',
        'src/**',
        '*.config.js',
        'hx-optimistic.min.js'
      ],
      thresholds: {
        branches: 74,
        functions: 90,
        lines: 90,
        statements: 90
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});