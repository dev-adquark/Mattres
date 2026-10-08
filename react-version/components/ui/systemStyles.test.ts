import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the single site-wide stylesheet (see systemStyles.ts). If any file
 * imports one of the barrel's CSS Modules directly again, Turbopack sees the
 * module in a different order on some routes and the 'graph' CSS chunker
 * splits the shell back into many render-blocking sheets.
 */
const ROOT = path.resolve(import.meta.dirname, '../..');
const BARREL = path.join(ROOT, 'components/ui/systemStyles.ts');
const barrelSource = fs.readFileSync(BARREL, 'utf8');

/** Absolute paths of the CSS Modules the barrel re-exports (default imports). */
const reexported = [...barrelSource.matchAll(/^import \w+ from '(\.[^']+\.module\.css)';$/gm)].map((m) =>
  path.resolve(path.dirname(BARREL), m[1] ?? ''),
);

const SOURCE_DIRS = ['app', 'components', 'lib'];
const SOURCE_EXT = /\.(?:ts|tsx|js|jsx|mts|mjs)$/;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (SOURCE_EXT.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

function resolveSpecifier(from: string, spec: string): string {
  if (spec.startsWith('@/')) return path.join(ROOT, spec.slice(2));
  return path.resolve(path.dirname(from), spec);
}

describe('systemStyles barrel', () => {
  it('re-exports the shell, shared UI and motion modules', () => {
    expect(reexported.length).toBeGreaterThanOrEqual(20);
    for (const file of reexported) expect(fs.existsSync(file), file).toBe(true);
  });

  it('imports globals.css before any CSS Module', () => {
    const firstImport = barrelSource.match(/^import [^\n]+$/m)?.[0];
    expect(firstImport).toBe("import '@/app/globals.css';");
  });

  it('is the only importer of the modules it re-exports', () => {
    const offenders: string[] = [];
    for (const dir of SOURCE_DIRS) {
      for (const file of sourceFiles(path.join(ROOT, dir))) {
        if (file === BARREL) continue;
        const src = fs.readFileSync(file, 'utf8');
        for (const m of src.matchAll(/(?:from|import)\s+'([^']+\.module\.css)'/g)) {
          if (reexported.includes(resolveSpecifier(file, m[1] ?? ''))) offenders.push(`${path.relative(ROOT, file)} -> ${m[1]}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('is the first import of the root layout, which no longer imports globals.css itself', () => {
    const layout = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8');
    expect(layout.match(/^import [^\n]+$/m)?.[0]).toBe("import '@/components/ui/systemStyles';");
    expect(layout).not.toMatch(/import '\.\/globals\.css'/);
  });
});
