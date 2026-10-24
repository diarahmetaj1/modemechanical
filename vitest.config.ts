import { defineConfig } from 'vitest/config';

// Unit and integration tests (no browser, no network). End-to-end tests: tests/e2e.
export default defineConfig({
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  test: { include: ['tests/unit/**/*.test.{ts,tsx}'], environment: 'node' },
});
