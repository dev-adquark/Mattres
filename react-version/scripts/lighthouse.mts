#!/usr/bin/env node
/**
 * Lighthouse performance audit for the key routes, plus a user-flow audit of
 * the quiz -> results transition (results have no URL of their own: they are
 * client state at /find-match, so a plain navigation audit cannot see them).
 *
 *   npm run build && npm run start            # audit a PRODUCTION server
 *   npm run perf:lighthouse                   # http://localhost:3000
 *   npm run perf:lighthouse -- --base http://localhost:3787 --only quiz,product
 *   npm run perf:lighthouse -- --no-flow      # navigation audits only
 *   npm run perf:lighthouse -- --assert       # exit 1 if a mobile LCP >= 2.5 s
 *   npm run perf:lighthouse -- --applied      # applied (DevTools) throttling
 *
 * Runs on Node's built-in TypeScript type stripping (Node 22.18+ / 23.6+).
 * Uses Lighthouse's default throttling: mobile = simulated slow 4G + 4x CPU
 * (Moto G Power), desktop = the desktop preset. Chrome comes from CHROME_PATH
 * or, by default, Playwright's cached Chromium. JSON + HTML reports are
 * written to --out (default: <os tmpdir>/mms-lighthouse); a summary table is
 * printed. Nothing here talks to any third-party service.
 *
 * Default (simulated / Lantern) throttling is the number to budget against:
 * it is what PageSpeed Insights reports. It models the HTML as one atomic
 * download and counts every VeryHigh-priority font and every async script
 * requested before the observed LCP, so it is pessimistic for streamed,
 * text-first pages. --applied re-runs with real network shaping + 4x CPU
 * (throttlingMethod 'devtools') so the observed paint timings can be read
 * next to the simulated ones. It never replaces the default for --assert.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import lighthouse, { desktopConfig, generateReport, startFlow, type Config, type Result } from 'lighthouse';
import puppeteer, { type Browser, type Page } from 'puppeteer-core';
import { chromium } from 'playwright';

interface RouteSpec {
  id: string;
  path: string;
}

const ROUTES: RouteSpec[] = [
  { id: 'home', path: '/' },
  { id: 'quiz', path: '/find-match' },
  { id: 'catalog', path: '/mattresses' },
  { id: 'product', path: '/mattress/casper-the-one' },
  { id: 'compare', path: '/compare/casper-the-one-vs-casper-dream' },
  { id: 'guide', path: '/guides/how-to-choose-mattress-firmness' },
  { id: 'methodology', path: '/methodology' },
];

const LCP_BUDGET_MS = 2500;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const base = (arg('base') || process.env.LH_BASE || 'http://localhost:3000').replace(/\/+$/, '');
const outDir = arg('out') || path.join(os.tmpdir(), 'mms-lighthouse');
const only = arg('only')?.split(',').filter(Boolean);
const formFactors = (arg('form') || 'mobile,desktop').split(',').filter((f): f is 'mobile' | 'desktop' => f === 'mobile' || f === 'desktop');

const throttlingMethod = has('applied') ? ('devtools' as const) : ('simulate' as const);
const mobileConfig: Config = { extends: 'lighthouse:default', settings: { throttlingMethod, onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] } };
const deskConfig: Config = { ...desktopConfig, settings: { ...desktopConfig.settings, throttlingMethod, onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] } };
const configFor = (form: 'mobile' | 'desktop') => (form === 'desktop' ? deskConfig : mobileConfig);

interface Row {
  name: string;
  perf: number | null;
  a11y: number | null;
  fcp: number | null;
  lcp: number | null;
  tbt: number | null;
  cls: number | null;
  inp: number | null;
  form: 'mobile' | 'desktop';
  mode: Result['gatherMode'];
}

const num = (lhr: Result, id: string): number | null => {
  const v = lhr.audits[id]?.numericValue;
  return typeof v === 'number' ? v : null;
};

function rowFor(name: string, form: 'mobile' | 'desktop', lhr: Result): Row {
  const score = (id: string) => {
    const v = lhr.categories[id]?.score;
    return typeof v === 'number' ? Math.round(v * 100) : null;
  };
  return {
    name,
    form,
    mode: lhr.gatherMode,
    // A snapshot has no load to time: Lighthouse reports pass/fail audits there, not a meaningful performance score.
    perf: lhr.gatherMode === 'snapshot' ? null : score('performance'),
    a11y: score('accessibility'),
    fcp: num(lhr, 'first-contentful-paint'),
    lcp: num(lhr, 'largest-contentful-paint'),
    tbt: num(lhr, 'total-blocking-time'),
    cls: num(lhr, 'cumulative-layout-shift'),
    inp: num(lhr, 'interaction-to-next-paint'),
  };
}

async function write(name: string, json: string, html: string) {
  await fs.writeFile(path.join(outDir, `${name}.json`), json);
  await fs.writeFile(path.join(outDir, `${name}.html`), html);
}

async function launch(): Promise<Browser> {
  const executablePath = process.env.CHROME_PATH || chromium.executablePath();
  return puppeteer.launch({ executablePath, headless: true, args: ['--no-first-run', '--no-default-browser-check'] });
}

async function auditRoute(browser: Browser, route: RouteSpec, form: 'mobile' | 'desktop'): Promise<Row> {
  const port = Number(new URL(browser.wsEndpoint()).port);
  const runner = await lighthouse(`${base}${route.path}`, { port, output: ['json', 'html'], logLevel: 'error' }, configFor(form));
  if (!runner) throw new Error(`Lighthouse returned no result for ${route.path}`);
  const [json, html] = runner.report as string[];
  await write(`lh-${route.id}-${form}`, json ?? '', html ?? '');
  return rowFor(route.id, form, runner.lhr);
}

/** Clicks the first visible element matching `selector` whose text matches `text`. */
async function clickText(page: Page, selector: string, text: RegExp) {
  const handle = await page.waitForFunction(
    (sel, src, flags) => {
      const re = new RegExp(src, flags);
      return Array.from(document.querySelectorAll<HTMLElement>(sel)).find((el) => re.test(el.textContent || '') && el.offsetParent !== null) || null;
    },
    { timeout: 15_000 },
    selector,
    text.source,
    text.flags,
  );
  const el = handle.asElement() as Awaited<ReturnType<Page['$']>>;
  if (!el) throw new Error(`No element ${selector} matching ${text}`);
  await el.click();
}

async function clickNth(page: Page, selector: string, n = 0) {
  await page.waitForSelector(selector, { timeout: 15_000 });
  const all = await page.$$(selector);
  const el = all[n];
  if (!el) throw new Error(`No element ${selector} #${n}`);
  await el.click();
}

/**
 * The quiz -> results user flow: cold navigation to /find-match, a timespan
 * covering all five answers, the submit, the /api/match call and the reveal,
 * then a snapshot of the results view.
 */
async function auditMatchFlow(browser: Browser, form: 'mobile' | 'desktop'): Promise<Row[]> {
  const page = await browser.newPage();
  const flow = await startFlow(page, { name: `Quiz to results (${form})`, config: configFor(form) });

  await flow.navigate(`${base}/find-match`, { name: 'Quiz (cold load)' });

  await flow.startTimespan({ name: 'Answer the quiz and reveal results' });
  await page.waitForSelector('input[name="position"]');
  await clickNth(page, 'label:has(input[name="position"][value="side"])');
  await clickText(page, 'button', /^\s*Next/);
  await clickNth(page, 'label:has(input[name="weightBand"])', 1);
  await clickText(page, 'button', /^\s*Next/);
  await page.focus('input[type="range"]');
  await page.keyboard.press('ArrowRight');
  await clickText(page, 'button', /^\s*Next/);
  await clickNth(page, 'label:has(input[name="temperature"])', 0);
  await clickText(page, 'button', /^\s*Next/);
  const matched = page.waitForResponse((r) => r.url().endsWith('/api/match') && r.request().method() === 'POST', { timeout: 20_000 });
  await clickText(page, 'button', /See my matches/);
  const res = await matched;
  if (res.status() !== 200) throw new Error(`/api/match answered ${res.status()}`);
  await page.waitForSelector('#match-title', { visible: true, timeout: 20_000 });
  // Let the reveal choreography finish so the timespan includes it.
  await new Promise((r) => setTimeout(r, 3_500));
  await flow.endTimespan();

  await flow.snapshot({ name: 'Results view' });

  const result = await flow.createFlowResult();
  await write(`lh-flow-quiz-results-${form}`, JSON.stringify(result), generateReport(result, 'html'));
  await page.close();
  return result.steps.map((step) => rowFor(`flow: ${step.name}`, form, step.lhr));
}

const ms = (v: number | null) => (v === null ? '-' : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);

async function main() {
  if (has('assert') && has('applied')) throw new Error('--assert budgets the default simulated run; drop --applied.');
  await fs.mkdir(outDir, { recursive: true });
  const routes = only ? ROUTES.filter((r) => only.includes(r.id)) : ROUTES;
  const rows: Row[] = [];
  const browser = await launch();
  try {
    for (const form of formFactors) {
      for (const route of routes) {
        rows.push(await auditRoute(browser, route, form));
        process.stdout.write('.');
      }
      if (!has('no-flow') && (!only || only.includes('flow'))) rows.push(...(await auditMatchFlow(browser, form)));
    }
  } finally {
    await browser.close();
  }
  process.stdout.write('\n');

  console.log(`Lighthouse (${throttlingMethod} throttling) against ${base} (reports in ${outDir})`);
  console.log(['route'.padEnd(46), 'form'.padEnd(8), 'mode'.padEnd(10), 'perf', 'a11y', 'FCP'.padStart(8), 'LCP'.padStart(8), 'TBT'.padStart(8), 'CLS'.padStart(7), 'INP'.padStart(8)].join(' '));
  for (const r of rows) {
    console.log(
      [r.name.padEnd(46), r.form.padEnd(8), r.mode.padEnd(10), String(r.perf ?? '-').padStart(4), String(r.a11y ?? '-').padStart(4), ms(r.fcp).padStart(8), ms(r.lcp).padStart(8), ms(r.tbt).padStart(8), (r.cls === null ? '-' : r.cls.toFixed(3)).padStart(7), ms(r.inp).padStart(8)].join(' '),
    );
  }

  if (has('assert')) {
    const over = rows.filter((r) => r.form === 'mobile' && r.mode === 'navigation' && r.lcp !== null && r.lcp >= LCP_BUDGET_MS);
    if (over.length) {
      console.error(`Mobile LCP budget (${LCP_BUDGET_MS} ms) exceeded: ${over.map((r) => `${r.name} ${ms(r.lcp)}`).join(', ')}`);
      process.exitCode = 1;
    }
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.stack || err.message : err);
  process.exitCode = 1;
});
