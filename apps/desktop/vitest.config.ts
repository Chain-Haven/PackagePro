import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/__tests__/**', 'src/**/*.d.ts', 'electron/**'],
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 50,
        statements: 50,
      },
    },
  },
});
