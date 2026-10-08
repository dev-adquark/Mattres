#!/usr/bin/env node
/**
 * Deterministic still-render pipeline for the campaign image set.
 *
 *   node scripts/render-stills.mts                 # full set -> public/renders + manifest
 *   node scripts/render-stills.mts --only hero     # one kind (hero|product|card|detail|cutaway|material) or a still name
 *   node scripts/render-stills.mts --types hybrid  # limit mattress types
 *   node scripts/render-stills.mts --quick         # 1/6 samples, PNG previews only (no outputs)
 *   node scripts/render-stills.mts --preview <dir> # also write the raw PNG frames to <dir>
 *
 * Runs on Node's built-in TypeScript type stripping (Node 22.18+ / 23.6+),
 * so it needs no build step.
 *
 * How it works: a tiny static server exposes the studio page
 * (scripts/render-studio/*.ts, served type-stripped, + three from node_modules) to a
 * headless Chromium launched by Playwright. The page builds each procedural
 * scene and renders it progressively (hundreds of jittered passes for soft
 * area shadows, sky occlusion, anti-aliasing and depth of field), then hands
 * back a PNG. sharp encodes the WebP master (used by next/image), an AVIF
 * sibling, a small PNG fallback and a ~16px blur placeholder, and the run
 * rewrites components/ui/render-stills/manifest.ts.
 *
 * No network access, no stock or third-party imagery: every pixel is
 * generated from code in this repo. Seeds are fixed, so re-running produces
 * the same set (GPU drivers may differ by a few code values).
 */

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import fs from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from 'playwright';
import sharp from 'sharp';
import type { MattressType } from '../lib/types.ts';
import type { Colourway, DetailCrop, MaterialSubject, RenderStill } from '../components/ui/render-stills/stills.ts';
import type { ShotKind, ShotSpec as StudioShotSpec } from './render-studio/types.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public', 'renders');
const MANIFEST = path.join(ROOT, 'components', 'ui', 'render-stills', 'manifest.ts');

const args = process.argv.slice(2);
const flag = (name: string): boolean => args.includes(`--${name}`);
const opt = (name: string): string | null => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? (args[i + 1] ?? null) : null;
};
const list = (name: string): string[] | null => opt(name)?.split(',') ?? null;
const ALL_TYPES: readonly MattressType[] = ['hybrid', 'foam', 'latex', 'innerspring'];
const ONLY = list('only');
const TYPES: readonly MattressType[] = list('types')?.filter((t): t is MattressType => (ALL_TYPES as readonly string[]).includes(t)) ?? ALL_TYPES;
const QUICK = flag('quick');
const PREVIEW = opt('preview');
const SAMPLE_SCALE = opt('samples-scale') ? Number(opt('samples-scale')) : QUICK ? 1 / 6 : 1;

/* --------------------------------- shot list ---------------------------- */

export const COLOURWAYS: readonly Colourway[] = ['linen', 'mist', 'sand', 'dusk'];
// Border colourway of each construction's bedroom (matches HERO_MOODS in the studio).
const HERO_COLOURWAY: Record<MattressType, Colourway> = { hybrid: 'linen', foam: 'mist', latex: 'linen', innerspring: 'sand' };
// Detail crops per construction: low edge close-up, top-down quilting macro, bedding corner.
export const DETAIL_CROPS: readonly DetailCrop[] = ['edge', 'top', 'bedding'];
const DETAIL_COLOURWAY: Record<MattressType, Colourway> = { hybrid: 'dusk', foam: 'mist', latex: 'linen', innerspring: 'sand' };

/** What this pipeline sends to the studio page's window.renderShot(). */
type ShotSpec = Pick<StudioShotSpec, 'kind' | 'type' | 'colourway' | 'crop' | 'subject'> & { samples: number; seed: number };
interface Shot {
  name: string;
  spec: ShotSpec;
}
interface OutputSpec {
  width: number;
  height: number;
  quality: number;
  avif: number;
  pngWidth: number;
}
type EncodedStill = Pick<RenderStill, 'src' | 'avif' | 'png' | 'width' | 'height' | 'blurDataURL'> & {
  /** Only during a run (size report); stripped before the manifest is written. */
  bytes?: { webp: number; avif: number; png: number };
};
type ManifestEntry = RenderStill & Pick<EncodedStill, 'bytes'>;

// Output sizes (master WebP). PNG fallbacks are written at `pngWidth`.
const OUTPUT: Record<ShotKind, OutputSpec> = {
  hero: { width: 2400, height: 1600, quality: 78, avif: 46, pngWidth: 480 },
  product: { width: 2400, height: 1800, quality: 68, avif: 40, pngWidth: 320 },
  card: { width: 960, height: 960, quality: 78, avif: 48, pngWidth: 240 },
  detail: { width: 1600, height: 2000, quality: 70, avif: 40, pngWidth: 240 },
  cutaway: { width: 1920, height: 1080, quality: 84, avif: 52, pngWidth: 480 },
  material: { width: 1800, height: 1200, quality: 82, avif: 50, pngWidth: 360 },
};

function shotList(): Shot[] {
  const list: Shot[] = [];
  TYPES.forEach((type) => {
    list.push({ name: `hero-${type}`, spec: { kind: 'hero', type, colourway: HERO_COLOURWAY[type], samples: 288, seed: 11 } });
  });
  TYPES.forEach((type) => {
    COLOURWAYS.forEach((cw) => {
      list.push({ name: `product-${type}-${cw}`, spec: { kind: 'product', type, colourway: cw, samples: 192, seed: 21 } });
    });
  });
  TYPES.forEach((type) => {
    COLOURWAYS.forEach((cw) => {
      list.push({ name: `card-${type}-${cw}`, spec: { kind: 'card', type, colourway: cw, samples: 168, seed: 31 } });
    });
  });
  TYPES.forEach((type) => {
    DETAIL_CROPS.forEach((crop) => {
      list.push({ name: `detail-${type}-${crop}`, spec: { kind: 'detail', type, crop, colourway: DETAIL_COLOURWAY[type], samples: 240, seed: 61 } });
    });
  });
  TYPES.forEach((type) => {
    list.push({ name: `cutaway-${type}`, spec: { kind: 'cutaway', type, colourway: 'linen', samples: 288, seed: 41 } });
  });
  const subjects: readonly MaterialSubject[] = ['quilt', 'coils', 'foam'];
  subjects.forEach((subject) => {
    list.push({ name: `material-${subject}`, spec: { kind: 'material', subject, samples: 384, seed: 51 } });
  });
  return list.filter((s) => !ONLY || ONLY.includes(s.spec.kind) || ONLY.includes(s.name));
}

/* ------------------------------- static server -------------------------- */

const ALLOWED = ['/node_modules/three/'];
/**
 * The studio's own modules (scripts/render-studio/*.ts, strict TypeScript) and
 * the site's generic layer sets (components/three/layers.ts) are erasable
 * TypeScript, so each `.js` URL is served from its `.ts` source, type-stripped.
 */
const STUDIO_DIR = '/scripts/render-studio/';
const TS_MODULES: Readonly<Record<string, string>> = { '/components/three/layers.js': 'components/three/layers.ts' };
function tsSourceFor(url: string): string | null {
  const fixed = TS_MODULES[url];
  if (fixed) return fixed;
  const name = url.startsWith(STUDIO_DIR) ? url.slice(STUDIO_DIR.length) : '';
  return /^[a-z][a-z-]*\.js$/i.test(name) ? `scripts/render-studio/${name.replace(/\.js$/, '.ts')}` : null;
}
const TYPES_MIME: Readonly<Record<string, string>> = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };

/**
 * The studio page: a bare canvas plus an import map for three.js. Served from
 * memory (it is tooling, not part of the site, so there is no .html file).
 */
const STUDIO_PATH = '/__render-studio';
const STUDIO_DOCUMENT = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Render studio</title>
<script type="importmap">
{ "imports": { "three": "/node_modules/three/build/three.module.js", "three/addons/": "/node_modules/three/examples/jsm/", "@/components/three/layers.js": "/components/three/layers.js" } }
</script>
<style>html,body{margin:0;background:#111}canvas{display:block;max-width:100vw;height:auto}</style>
</head>
<body>
<canvas id="c"></canvas>
<script type="module" src="/scripts/render-studio/main.js"></script>
</body>
</html>
`;

function startServer(): Promise<http.Server> {
  const server = http.createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    if (url === STUDIO_PATH) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(STUDIO_DOCUMENT);
      return;
    }
    const tsSource = tsSourceFor(url);
    if (tsSource) {
      try {
        const js = stripTypeScriptTypes(await fs.readFile(path.join(ROOT, tsSource), 'utf8'));
        res.writeHead(200, { 'content-type': 'text/javascript' });
        res.end(js);
      } catch {
        res.writeHead(500).end();
      }
      return;
    }
    if (!ALLOWED.some((p) => url.startsWith(p)) || url.includes('..')) {
      res.writeHead(404).end();
      return;
    }
    try {
      const body = await fs.readFile(path.join(ROOT, url));
      res.writeHead(200, { 'content-type': TYPES_MIME[path.extname(url)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* ----------------------------------- run -------------------------------- */

async function encode(name: string, kind: ShotKind, png: Buffer): Promise<EncodedStill> {
  const o = OUTPUT[kind];
  const img = sharp(png).resize(o.width, o.height, { fit: 'cover', kernel: 'lanczos3' });
  const webp = await img.clone().webp({ quality: o.quality, effort: 6, smartSubsample: true }).toBuffer();
  const avif = await img.clone().avif({ quality: o.avif, effort: 6 }).toBuffer();
  const pngSmall = await sharp(png)
    .resize(o.pngWidth, Math.round((o.pngWidth * o.height) / o.width), { kernel: 'lanczos3' })
    .png({ palette: true, quality: 70, colours: 128, compressionLevel: 9, effort: 10 })
    .toBuffer();
  const blur = await sharp(png).resize(16, Math.max(1, Math.round((16 * o.height) / o.width))).webp({ quality: 50 }).toBuffer();
  await fs.writeFile(path.join(OUT_DIR, `${name}.webp`), webp);
  await fs.writeFile(path.join(OUT_DIR, `${name}.avif`), avif);
  await fs.writeFile(path.join(OUT_DIR, `${name}.png`), pngSmall);
  return {
    src: `/renders/${name}.webp`,
    avif: `/renders/${name}.avif`,
    png: `/renders/${name}.png`,
    width: o.width,
    height: o.height,
    blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
    bytes: { webp: webp.length, avif: avif.length, png: pngSmall.length },
  };
}

async function readManifest(): Promise<Record<string, ManifestEntry>> {
  try {
    const src = await fs.readFile(MANIFEST, 'utf8');
    const json = src.slice(src.indexOf('/*JSON*/') + 8, src.lastIndexOf('/*END*/'));
    // Our own generated file (written below), so its shape is known.
    return JSON.parse(json) as Record<string, ManifestEntry>;
  } catch {
    return {};
  }
}

async function writeManifest(entries: Record<string, ManifestEntry>): Promise<void> {
  const sorted = Object.fromEntries(Object.keys(entries).sort().map((k) => [k, entries[k]]));
  const body = `// GENERATED by scripts/render-stills.mts - do not edit by hand.
// Original code-generated renders (procedural three.js studio). They are
// illustrations of typical constructions per mattress TYPE, not photographs
// of any specific product.
import type { RenderStill } from './stills';

export const RENDER_STILLS: Record<string, RenderStill> = /*JSON*/${JSON.stringify(sorted, null, 2)}/*END*/;
`;
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  await fs.writeFile(MANIFEST, body);
}

async function launch(): Promise<Browser> {
  const attempts = [
    { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] },
    { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  ];
  for (const a of attempts) {
    try {
      return await chromium.launch({ channel: 'chromium', ...a });
    } catch (e) {
      console.warn('launch failed, trying fallback:', String(e instanceof Error ? e.message : e).split('\n')[0]);
    }
  }
  return chromium.launch();
}

async function main() {
  const shots = shotList();
  if (!shots.length) throw new Error('No shots match the filters.');
  if (!QUICK) await fs.mkdir(OUT_DIR, { recursive: true });
  if (PREVIEW) await fs.mkdir(PREVIEW, { recursive: true });
  const server = await startServer();
  const port = (server.address() as AddressInfo).port;
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') console.log(`[page ${m.type()}]`, m.text());
  });
  page.on('pageerror', (e: Error) => console.log('[page error]', e.message));
  await page.goto(`http://127.0.0.1:${port}${STUDIO_PATH}`);
  await page.waitForFunction(() => window.__studioReady === true, null, { timeout: 30000 });
  const gpu = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : 'unknown';
  });
  console.log(`GPU: ${gpu}`);

  const manifest: Record<string, ManifestEntry> = QUICK ? {} : await readManifest();
  let totalBytes = 0;
  for (const { name, spec } of shots) {
    const s = { ...spec, samples: Math.max(12, Math.round(spec.samples * SAMPLE_SCALE)) };
    const t0 = Date.now();
    const res = await page.evaluate((sp: ShotSpec) => {
      if (!window.renderShot) throw new Error('studio not ready');
      return window.renderShot(sp);
    }, s);
    const png = Buffer.from(res.url.split(',')[1] ?? '', 'base64');
    if (PREVIEW) await fs.writeFile(path.join(PREVIEW, `${name}.png`), png);
    let note = '';
    if (!QUICK) {
      const entry = await encode(name, spec.kind, png);
      manifest[name] = { kind: spec.kind, type: spec.type || null, colourway: spec.colourway || null, subject: spec.subject || null, ...(spec.crop ? { crop: spec.crop } : null), ...entry };
      const bytes = entry.bytes ?? { webp: 0, avif: 0, png: 0 };
      totalBytes += bytes.webp + bytes.avif + bytes.png;
      note = ` webp ${(bytes.webp / 1024).toFixed(0)}KB avif ${(bytes.avif / 1024).toFixed(0)}KB png ${(bytes.png / 1024).toFixed(0)}KB`;
    }
    console.log(`${name}: ${s.samples} passes, build ${res.buildMs}ms, render ${res.renderMs}ms (${((Date.now() - t0) / 1000).toFixed(1)}s)${note}`);
  }
  if (!QUICK) {
    Object.values(manifest).forEach((e) => delete e.bytes);
    await writeManifest(manifest);
    const files = await fs.readdir(OUT_DIR);
    let dirBytes = 0;
    for (const f of files) dirBytes += (await fs.stat(path.join(OUT_DIR, f))).size;
    console.log(`This run: ${(totalBytes / 1048576).toFixed(2)} MB. public/renders total: ${(dirBytes / 1048576).toFixed(2)} MB in ${files.length} files.`);
    // Budget (brief): the whole set stays under 5 MB.
    if (dirBytes > 5 * 1000 * 1000) console.warn(`WARNING: public/renders is over the 5 MB budget (${dirBytes} bytes).`);
  }
  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
