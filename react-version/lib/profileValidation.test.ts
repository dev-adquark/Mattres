import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateProfile } from '@/lib/profileValidation';

vi.mock('@/lib/rateLimit', () => ({ checkRateLimit: vi.fn(async () => ({ limited: false })) }));
vi.mock('@/lib/matchLogic', () => ({ DEFAULT_SCORE_VERSION: '0.2', matchProfile: vi.fn(async (profile, options) => ({ echoed: { profile, options } })) }));
import { matchProfile } from '@/lib/matchLogic';

const mockedMatchProfile = vi.mocked(matchProfile);
import { POST } from '@/app/api/match/route';

const VALID = { sleepPosition: 'side', weightLb: 160, preferredFirmnessLabel: 'medium', sleepTemperature: 'neutral' };

describe('validateProfile', () => {
  it('accepts a minimal valid profile and the new optional inputs', () => {
    expect(validateProfile(VALID)).toBeNull();
    for (const painFocus of ['shoulders', 'hips', 'lower-back', 'whole-body', 'none', [], ['shoulder', 'hip'], ['back'], null]) {
      expect(validateProfile({ ...VALID, painFocus })).toBeNull();
    }
    for (const edgeImportance of ['low', 'medium', 'high']) expect(validateProfile({ ...VALID, edgeImportance })).toBeNull();
    for (const scoreVersion of ['0.1', '0.2']) expect(validateProfile({ ...VALID, scoreVersion })).toBeNull();
    expect(validateProfile({ ...VALID, motionSensitivity: 'couple-high', mattressTypePreference: ['latex'] })).toBeNull();
  });

  it('accepts "no firmness preference" (omitted, null or none) but not unknown labels', () => {
    const { preferredFirmnessLabel, ...noLabel } = VALID;
    void preferredFirmnessLabel;
    expect(validateProfile(noLabel)).toBeNull();
    expect(validateProfile({ ...VALID, preferredFirmnessLabel: null })).toBeNull();
    expect(validateProfile({ ...VALID, preferredFirmnessLabel: 'none' })).toBeNull();
    expect(validateProfile({ ...VALID, preferredFirmnessLabel: 'squishy' })).toMatch(/firmness/);
    expect(validateProfile({ ...VALID, preferredFirmnessLabel: '' })).toMatch(/firmness/);
  });

  it('rejects invalid values', () => {
    expect(validateProfile(null)).toMatch(/JSON object/);
    expect(validateProfile({ ...VALID, sleepPosition: 'upside-down' })).toMatch(/sleep position/);
    expect(validateProfile({ ...VALID, weightLb: 20 })).toMatch(/Weight/);
    expect(validateProfile({ ...VALID, painFocus: 'knees' })).toMatch(/pain focus/);
    expect(validateProfile({ ...VALID, painFocus: ['shoulders', 7] })).toMatch(/pain focus/);
    expect(validateProfile({ ...VALID, edgeImportance: 'extreme' })).toMatch(/edge/);
    expect(validateProfile({ ...VALID, scoreVersion: '9.9' })).toMatch(/score version/);
    expect(validateProfile({ ...VALID, motionSensitivity: 'pets' })).toMatch(/motion/);
    expect(validateProfile({ ...VALID, budgetUsd: { min: 500, max: 100 } })).toMatch(/Budget/);
  });
});

function req(body: unknown) {
  return new Request('http://localhost/api/match', { method: 'POST', headers: { 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) });
}

describe('POST /api/match', () => {
  beforeEach(() => mockedMatchProfile.mockClear());

  it('400s on invalid JSON and on invalid optional inputs', async () => {
    expect((await POST(req('{nope'))).status).toBe(400);
    const res = await POST(req({ ...VALID, edgeImportance: 'extreme' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/edge/);
    expect(matchProfile).not.toHaveBeenCalled();
  });

  it('defaults to scoreVersion 0.2 and passes new inputs through', async () => {
    const res = await POST(req({ ...VALID, painFocus: 'hips', edgeImportance: 'high' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.echoed.options).toEqual({ scoreVersion: '0.2' });
    expect(body.echoed.profile).toMatchObject({ painFocus: 'hips', edgeImportance: 'high' });
    expect(body.echoed.profile.scoreVersion).toBeUndefined();
  });

  it('sends "no firmness preference" to the engine as an absent label', async () => {
    for (const preferredFirmnessLabel of ['none', null, undefined]) {
      const res = await POST(req({ ...VALID, preferredFirmnessLabel }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect('preferredFirmnessLabel' in body.echoed.profile).toBe(false);
    }
  });

  it('omits the engine trace unless ?trace=1', async () => {
    const item = { entry: { id: 'a' }, result: { overallScore: 80, trace: { categoryRulesUsed: [], riskRulesUsed: [] } } };
    mockedMatchProfile.mockResolvedValue({ results: [item], all: [], modelVersion: 'x', catalogSource: 'json_fallback' } as never);
    const slim = await (await POST(req(VALID))).json();
    expect(slim.results[0].result).toEqual({ overallScore: 80 });
    const full = await (await POST(new Request('http://localhost/api/match?trace=1', { method: 'POST', body: JSON.stringify(VALID) }))).json();
    expect(full.results[0].result.trace).toEqual(item.result.trace);
    mockedMatchProfile.mockReset();
    mockedMatchProfile.mockImplementation(async (profile, options) => ({ echoed: { profile, options } }) as never);
  });

  it('honours an explicit scoreVersion 0.1', async () => {
    const res = await POST(req({ ...VALID, scoreVersion: '0.1' }));
    expect((await res.json()).echoed.options).toEqual({ scoreVersion: '0.1' });
  });

  it('500s without leaking internals when scoring throws', async () => {
    mockedMatchProfile.mockRejectedValueOnce(new Error('/secret/path exploded'));
    const res = await POST(req(VALID));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/secret/);
  });
});
