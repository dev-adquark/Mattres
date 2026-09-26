import { defineConfig } from 'vitest/config';

// Mirrors jsconfig.json's "@/*": ["./*"] mapping exactly, so tests can
// import the same '@/lib/...' paths the app itself uses - not a
// second, drifting alias definition.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.js'],
  },
  resolve: {
    alias: {
      '@': import.meta.dirname,
    },
  },
});
