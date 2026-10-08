import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { EVENTS } from '@/lib/analytics';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIRS = ['app', 'components', 'lib'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(js|jsx|mjs|ts|tsx)$/.test(name) && !/\.test\.(js|ts|tsx)$/.test(name) && !/\.d\.ts$/.test(name)) out.push(full);
  }
  return out;
}

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const sources: [string, string][] = files.map((f) => [path.relative(ROOT, f), fs.readFileSync(f, 'utf8')]);

describe('analytics allowlist', () => {
  it('includes the brief v3 events', () => {
    for (const name of ['quiz_started', 'quiz_completed', 'match_revealed', 'mattress_viewed', 'compare_added', 'compare_removed', 'affiliate_click', 'guide_viewed', 'search_used', 'filter_used', 'slider_interaction', 'layer_explored', 'category_viewed']) {
      expect(Object.values(EVENTS)).toContain(name);
    }
  });

  it('every EVENTS.<NAME> referenced in source exists', () => {
    const missing: string[] = [];
    for (const [file, src] of sources) {
      for (const m of src.matchAll(/\bEVENTS\.([A-Z_]+)\b/g)) if (!((m[1] as string) in EVENTS)) missing.push(`${file}: EVENTS.${m[1]}`);
    }
    expect(missing).toEqual([]);
  });

  it('every track("literal") call uses an allowlisted event name', () => {
    const allowed = new Set<string>(Object.values(EVENTS));
    const bad: string[] = [];
    for (const [file, src] of sources) {
      for (const m of src.matchAll(/\btrack\(\s*['"]([a-z_]+)['"]/g)) if (!allowed.has(m[1] as string)) bad.push(`${file}: ${m[1]}`);
    }
    expect(bad).toEqual([]);
  });
});
