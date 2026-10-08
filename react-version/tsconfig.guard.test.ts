import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// `next dev` / `next build` append their distDir's type globs to tsconfig
// "include". Isolated runs (NEXT_DIST_DIR=.next-foo) are redirected to a
// throwaway `<distDir>.tsconfig.json` by next.config.mts; this keeps a
// scratch path from ever being committed in the real tsconfig.json.
describe('tsconfig.json', () => {
  const config = JSON.parse(readFileSync(new URL('./tsconfig.json', import.meta.url), 'utf8')) as {
    include?: string[];
  };

  it('includes only the default .next type globs, never an isolated dist dir', () => {
    const leaked = (config.include ?? []).filter((entry) => entry.startsWith('.next-'));
    expect(leaked).toEqual([]);
  });
});
