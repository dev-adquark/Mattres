/**
 * ApifyPort HTTP contract, entirely against a fake fetch. The token used
 * here is a fake test string; no request leaves the process.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ACTOR_ID,
  ApifyCallError,
  DEFAULT_MAX_TOTAL_CHARGE_USD,
  MAX_ITEMS_CAP,
  buildRtingsInput,
  checkApifyBudget,
  createApifyHttpPort,
  defaultMaxItems,
  getApifyPort,
  isApifyConfigured,
  maxChargeUsd,
  resolveActorId,
  toActorRunInput,
} from './apifyClient';

const FAKE_TOKEN = 'apify_api_TESTONLYfaketoken123456';

type Call = { url: string; init: RequestInit };

function fakeFetch(responses: (Response | Error)[]) {
  const calls: Call[] = [];
  const impl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error('TEST: unexpected extra request');
    if (next instanceof Error) throw next;
    return next;
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const runBody = (status: string, extra: Record<string, unknown> = {}) => ({ data: { id: 'TEST_RUN_x', status, defaultDatasetId: 'TEST_DS_x', ...extra } });

function headerOf(call: Call, name: string): string | null {
  return new Headers(call.init.headers as HeadersInit).get(name);
}

const savedEnv = { ...process.env };
beforeEach(() => {
  delete process.env.APIFY_RTINGS_ACTOR_ID;
  delete process.env.RTINGS_SYNC_MAX_ITEMS;
  delete process.env.APIFY_API_TOKEN;
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('TEST: network disabled'))));
});
afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...savedEnv };
});

describe('actor identity', () => {
  it('defaults to the RTINGS actor id', () => {
    expect(ACTOR_ID).toBe('dCa1uCOn8ZtEkUamC');
    expect(resolveActorId({})).toEqual({ ok: true, actorId: 'dCa1uCOn8ZtEkUamC' });
  });

  it.each(['dCa1uCOn8ZtEkUamC', 'crawlerbros/rtings-scraper', 'crawlerbros~rtings-scraper'])('accepts the same actor written as %s', (v) => {
    expect(resolveActorId({ APIFY_RTINGS_ACTOR_ID: v })).toEqual({ ok: true, actorId: 'dCa1uCOn8ZtEkUamC' });
  });

  it.each(['someone/other-scraper', 'apify/web-scraper', 'xyz123'])('refuses a different actor (%s) with APIFY_ACTOR_MISMATCH', (v) => {
    expect(resolveActorId({ APIFY_RTINGS_ACTOR_ID: v })).toMatchObject({ success: false, code: 'APIFY_ACTOR_MISMATCH' });
  });

  it('getApifyPort refuses a mismatched actor even with a token, without any request', () => {
    process.env.APIFY_API_TOKEN = FAKE_TOKEN;
    process.env.APIFY_RTINGS_ACTOR_ID = 'someone/other-scraper';
    expect(getApifyPort()).toMatchObject({ success: false, code: 'APIFY_ACTOR_MISMATCH' });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('getApifyPort reports APIFY_NOT_CONFIGURED without a token', () => {
    expect(isApifyConfigured()).toBe(false);
    expect(getApifyPort()).toMatchObject({ success: false, code: 'APIFY_NOT_CONFIGURED' });
  });
});

describe('HTTP port', () => {
  it('startRun POSTs /v2/acts/{id}/runs with a Bearer header and no token in the URL', async () => {
    const f = fakeFetch([json(runBody('READY'), 201)]);
    const port = createApifyHttpPort({ token: FAKE_TOKEN, fetchImpl: f.impl });
    const input = buildRtingsInput({ maxItems: 5 });
    const info = await port.startRun(input);

    expect(info).toMatchObject({ runId: 'TEST_RUN_x', status: 'READY', defaultDatasetId: 'TEST_DS_x' });
    const call = f.calls[0]!;
    expect(call.init.method).toBe('POST');
    expect(call.url.startsWith('https://api.apify.com/v2/acts/dCa1uCOn8ZtEkUamC/runs')).toBe(true);
    expect(call.url).not.toContain(FAKE_TOKEN);
    expect(call.url).not.toMatch(/token=/);
    expect(headerOf(call, 'authorization')).toBe(`Bearer ${FAKE_TOKEN}`);
    expect(JSON.parse(String(call.init.body))).toEqual(toActorRunInput(input));
    expect(JSON.parse(String(call.init.body))).toEqual({ mode: 'byCategory', category: 'mattress', sortBy: 'newest', includeVerdict: true, includeSummaries: true, maxItems: 5 });
    expect(call.url).toContain('maxItems=5');
    expect(call.url).not.toContain('maxTotalChargeUsd');
  });

  it('startRun maps url mode to the actor\'s byUrls/reviewUrls and sends the charge ceiling', async () => {
    const f = fakeFetch([json(runBody('READY'), 201)]);
    const port = createApifyHttpPort({ token: FAKE_TOKEN, fetchImpl: f.impl, maxTotalChargeUsd: 1.5 });
    await port.startRun(buildRtingsInput({ mode: 'url', reviewUrl: 'https://www.rtings.com/mattress/reviews/bear/elite-hybrid' }));
    const call = f.calls[0]!;
    expect(JSON.parse(String(call.init.body))).toEqual({
      mode: 'byUrls',
      category: 'mattress',
      reviewUrls: ['https://www.rtings.com/mattress/reviews/bear/elite-hybrid'],
      includeVerdict: true,
      includeSummaries: true,
      maxItems: 1,
    });
    expect(call.url).toContain('maxTotalChargeUsd=1.5');
    expect(call.url).toContain('maxItems=1');
  });

  it('maxChargeUsd reads RTINGS_SYNC_MAX_CHARGE_USD within bounds', () => {
    expect(maxChargeUsd({})).toBe(DEFAULT_MAX_TOTAL_CHARGE_USD);
    expect(maxChargeUsd({ RTINGS_SYNC_MAX_CHARGE_USD: '0.75' })).toBe(0.75);
    expect(maxChargeUsd({ RTINGS_SYNC_MAX_CHARGE_USD: '50' })).toBe(10);
    expect(maxChargeUsd({ RTINGS_SYNC_MAX_CHARGE_USD: 'abc' })).toBe(DEFAULT_MAX_TOTAL_CHARGE_USD);
  });

  it('getRun polls /v2/actor-runs/{id}?waitForFinish=60 and reports Apify usage verbatim', async () => {
    const f = fakeFetch([json(runBody('SUCCEEDED', { usageTotalUsd: 0.0421 }))]);
    const port = createApifyHttpPort({ token: FAKE_TOKEN, fetchImpl: f.impl });
    const info = await port.getRun('TEST_RUN_x');
    expect(f.calls[0]!.url).toBe('https://api.apify.com/v2/actor-runs/TEST_RUN_x?waitForFinish=60');
    expect(f.calls[0]!.init.method).toBe('GET');
    expect(info).toMatchObject({ status: 'SUCCEEDED', usageTotalUsd: 0.0421 });
  });

  it('usageTotalUsd is null when Apify does not report it (never estimated)', async () => {
    const f = fakeFetch([json(runBody('SUCCEEDED'))]);
    const info = await createApifyHttpPort({ token: FAKE_TOKEN, fetchImpl: f.impl }).getRun('TEST_RUN_x');
    expect(info.usageTotalUsd).toBeNull();
  });

  it('getDatasetItems reads /v2/datasets/{id}/items with the limit capped at 200', async () => {
    const f = fakeFetch([json([{ productId: '1' }])]);
    const items = await createApifyHttpPort({ token: FAKE_TOKEN, fetchImpl: f.impl }).getDatasetItems('TEST_DS_x', { limit: 5000 });
    expect(items).toEqual([{ productId: '1' }]);
    const url = new URL(f.calls[0]!.url);
    expect(url.pathname).toBe('/v2/datasets/TEST_DS_x/items');
    expect(url.searchParams.get('limit')).toBe(String(MAX_ITEMS_CAP));
    expect(url.searchParams.has('token')).toBe(false);
  });

  it('a 401 is not retried and surfaces as APIFY_UNAUTHORIZED without echoing the token', async () => {
    const f = fakeFetch([new Response(`bad token ${FAKE_TOKEN}`, { status: 401 })]);
    const port = createApifyHttpPort({ token: FAKE_TOKEN, fetchImpl: f.impl, baseDelayMs: 0 });
    const err = await port.getRun('TEST_RUN_x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApifyCallError);
    expect((err as ApifyCallError).code).toBe('APIFY_UNAUTHORIZED');
    expect((err as ApifyCallError).message).not.toContain(FAKE_TOKEN);
    expect(f.calls).toHaveLength(1);
  });

  it('a transient 503 on a read is retried, then succeeds', async () => {
    const f = fakeFetch([new Response('busy', { status: 503 }), json(runBody('SUCCEEDED'))]);
    const info = await createApifyHttpPort({ token: FAKE_TOKEN, fetchImpl: f.impl, baseDelayMs: 0 }).getRun('TEST_RUN_x');
    expect(info.status).toBe('SUCCEEDED');
    expect(f.calls).toHaveLength(2);
  });

  it('a network error while STARTING a paid run is never blindly retried', async () => {
    const f = fakeFetch([new TypeError('TEST: socket hang up'), json(runBody('READY'))]);
    const port = createApifyHttpPort({ token: FAKE_TOKEN, fetchImpl: f.impl, baseDelayMs: 0 });
    await expect(port.startRun(buildRtingsInput())).rejects.toMatchObject({ code: 'APIFY_NETWORK_ERROR' });
    expect(f.calls).toHaveLength(1);
  });

  it('a malformed run response is APIFY_MALFORMED_RESPONSE', async () => {
    const f = fakeFetch([json({ nope: true })]);
    await expect(createApifyHttpPort({ token: FAKE_TOKEN, fetchImpl: f.impl }).getRun('TEST_RUN_x')).rejects.toMatchObject({ code: 'APIFY_MALFORMED_RESPONSE' });
  });

  it('refuses an empty token', () => {
    expect(() => createApifyHttpPort({ token: '  ' })).toThrow(ApifyCallError);
  });
});

describe('buildRtingsInput', () => {
  it('defaults to a 50-item mattress category run', () => {
    expect(buildRtingsInput()).toEqual({ mode: 'byCategory', category: 'mattress', sortBy: 'newest', maxItems: 50 });
  });

  it('takes the default from RTINGS_SYNC_MAX_ITEMS and still caps it at 200', () => {
    expect(defaultMaxItems({ RTINGS_SYNC_MAX_ITEMS: '30' })).toBe(30);
    expect(defaultMaxItems({ RTINGS_SYNC_MAX_ITEMS: '5000' })).toBe(MAX_ITEMS_CAP);
    expect(defaultMaxItems({ RTINGS_SYNC_MAX_ITEMS: 'abc' })).toBe(50);
  });

  it('caps an explicit maxItems at 200', () => {
    expect(buildRtingsInput({ maxItems: 10_000 })).toMatchObject({ maxItems: MAX_ITEMS_CAP });
  });

  it('url mode only accepts an RTINGS mattress review URL and canonicalizes it', () => {
    expect(buildRtingsInput({ mode: 'url', reviewUrl: 'https://WWW.RTINGS.COM/mattress/reviews/bear/elite-hybrid/?x=1' })).toEqual({
      mode: 'url',
      url: 'https://www.rtings.com/mattress/reviews/bear/elite-hybrid',
    });
    expect(() => buildRtingsInput({ mode: 'url', reviewUrl: 'https://www.example.com/mattress/x' })).toThrow();
    expect(() => buildRtingsInput({ mode: 'url', reviewUrl: 'http://www.rtings.com/mattress/x' })).toThrow();
  });

  it('search mode requires a query', () => {
    expect(() => buildRtingsInput({ mode: 'search' })).toThrow();
    expect(buildRtingsInput({ mode: 'search', searchQuery: 'bear' })).toMatchObject({ mode: 'search', category: 'mattress', searchQuery: 'bear' });
  });

  it('refuses an unknown mode', () => {
    expect(() => buildRtingsInput({ mode: 'everything' })).toThrow();
  });
});

describe('checkApifyBudget', () => {
  const limitsBody = (current: number, limit: number, endAt = '2026-10-24T23:59:59.999Z') => ({
    data: { current: { monthlyUsageUsd: current }, limits: { maxMonthlyUsageUsd: limit }, monthlyUsageCycle: { endAt } },
  });

  it('reports ok when current usage plus the reserved per-run cap still fits the monthly limit', async () => {
    const f = fakeFetch([json(limitsBody(10, 19))]);
    const result = await checkApifyBudget({ token: FAKE_TOKEN, fetchImpl: f.impl, reservedUsd: 1.5 });
    expect(result).toMatchObject({ ok: true, monthlyUsageUsd: 10, monthlyLimitUsd: 19, reservedUsd: 1.5, cycleEndsAt: '2026-10-24T23:59:59.999Z' });
    expect(f.calls[0]!.url).toBe('https://api.apify.com/v2/users/me/limits');
    expect(headerOf(f.calls[0]!, 'Authorization')).toBe(`Bearer ${FAKE_TOKEN}`);
  });

  it('reports not ok when current usage plus the reserved cap would exceed the monthly limit', async () => {
    const f = fakeFetch([json(limitsBody(19.05, 19))]);
    const result = await checkApifyBudget({ token: FAKE_TOKEN, fetchImpl: f.impl, reservedUsd: 1.5 });
    expect(result).toMatchObject({ ok: false, monthlyUsageUsd: 19.05, monthlyLimitUsd: 19 });
  });

  it('defaults reservedUsd to maxChargeUsd() when not given', async () => {
    const f = fakeFetch([json(limitsBody(0, 19))]);
    const result = await checkApifyBudget({ token: FAKE_TOKEN, fetchImpl: f.impl });
    expect(result).toMatchObject({ ok: true, reservedUsd: DEFAULT_MAX_TOTAL_CHARGE_USD });
  });

  it('is never configured when no token is given or set', async () => {
    const result = await checkApifyBudget({ fetchImpl: fakeFetch([]).impl });
    expect(result).toMatchObject({ success: false, code: 'APIFY_NOT_CONFIGURED' });
  });

  it('fails closed on a network error', async () => {
    const result = await checkApifyBudget({ token: FAKE_TOKEN, fetchImpl: fakeFetch([new TypeError('TEST: offline')]).impl });
    expect(result).toMatchObject({ success: false, code: 'APIFY_NETWORK_ERROR' });
  });

  it('fails closed on a non-200 response', async () => {
    const result = await checkApifyBudget({ token: FAKE_TOKEN, fetchImpl: fakeFetch([new Response('nope', { status: 401 })]).impl });
    expect(result).toMatchObject({ success: false, code: 'APIFY_UNAUTHORIZED' });
  });

  it('fails closed on a malformed body missing the usage figures', async () => {
    const result = await checkApifyBudget({ token: FAKE_TOKEN, fetchImpl: fakeFetch([json({ data: {} })]).impl });
    expect(result).toMatchObject({ success: false, code: 'APIFY_MALFORMED_RESPONSE' });
  });

  it('never starts or charges for an actor run (GET only, no run/dataset endpoints touched)', async () => {
    const f = fakeFetch([json(limitsBody(0, 19))]);
    await checkApifyBudget({ token: FAKE_TOKEN, fetchImpl: f.impl });
    expect(f.calls).toHaveLength(1);
    expect(f.calls[0]!.init.method ?? 'GET').toBe('GET');
    expect(f.calls[0]!.url).not.toContain('/acts/');
    expect(f.calls[0]!.url).not.toContain('/datasets/');
  });
});
