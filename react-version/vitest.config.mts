import { defineConfig } from 'vitest/config';

// Mirrors tsconfig.json's "@/*": ["./*"] mapping exactly, so tests can
// import the same '@/lib/...' paths the app itself uses - not a
// second, drifting alias definition.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.{js,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/.next*/**', '**/.qa-*/**'],
  },
  resolve: {
    alias: {
      '@': import.meta.dirname,
      // 'server-only' throws outside the Next server graph; tests run in plain Node.
      'server-only': `${import.meta.dirname}/lib/__stubs__/server-only.ts`,
    },
  },
});
