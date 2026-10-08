import { describe, it, expect } from 'vitest';
import { loadRules } from '@/lib/scoreEngine';
import { matchProfile } from '@/lib/matchLogic';
import { PREVIEW_DEFAULTS, SCORE_VERSION } from './homeConfig';
import { buildPreviewGrid } from './homeSections';
import { cellCount, cellIndex, decodeCell, previewProfile, topFromRun } from './previewGrid';

describe('homepage sleep-profile preview grid', async () => {
  const preview = await buildPreviewGrid(loadRules(SCORE_VERSION));

  it('scores every position x feel x weight x temperature x sharing combination', () => {
    expect(preview.cells).toHaveLength(cellCount(preview));
    expect(preview.cells.length).toBe(4 * 6 * 4 * 3 * 3);
    expect(preview.cells.every((c) => c !== null)).toBe(true);
  });

  it('opens on the stated defaults', () => {
    expect(preview.positions.some((p) => p.id === PREVIEW_DEFAULTS.position)).toBe(true);
    expect(preview.firmness.some((f) => f.id === PREVIEW_DEFAULTS.firmness)).toBe(true);
    expect(preview.weights.some((w) => w.id === PREVIEW_DEFAULTS.weight)).toBe(true);
  });

  // Every decoded cell must equal a fresh engine run for the same profile.
  it.each([
    [0, 0, 0, 0, 0],
    [0, 2, 1, 1, 0],
    [1, 3, 2, 2, 1],
    [2, 5, 3, 0, 2],
    [3, 1, 0, 2, 2],
  ])('cell %i/%i/%i/%i/%i decodes to the engine top organic match', async (p, f, w, t, s) => {
    const top = decodeCell(preview, cellIndex(preview, { position: p, firmness: f, weight: w, temperature: t, sharing: s }));
    const run = await matchProfile(
      {
        sleepPosition: preview.positions[p]!.id,
        preferredFirmnessLabel: preview.firmness[f]!.id,
        weightLb: preview.weights[w]!.weightLb,
        sleepTemperature: preview.temperatures[t]!.id,
        motionSensitivity: preview.sharing[s]!.id,
        // The grid is scored with the default pain / edge, sent explicitly.
        painFocus: preview.defaults.pain,
        edgeImportance: preview.defaults.edge,
      },
      { scoreVersion: SCORE_VERSION },
    );
    const first = run.results.find((r) => !r.entry.sponsored)!;
    expect(top?.id).toBe(first.entry.id);
    expect(top?.score).toBe(first.result.overallScore);
    expect(top?.tier.id).toBe(first.explanation.tier.id);
    expect(top?.reasons).toEqual(first.explanation.reasons.slice(0, 2).map((r) => r.text));
    expect(top?.total).toBe(run.results.length);
    expect(top?.strongCount).toBe(run.results.filter((r) => r.result.overallScore >= 80).length);
    const band = preview.comfortBands[`${preview.positions[p]!.id}|${preview.weights[w]!.id}`];
    expect(band).toEqual({ min: first.result.comfortBand!.min, max: first.result.comfortBand!.max });
  });

  it('grid defaults for pain, edge and budget are the ones previewProfile sends', () => {
    expect(preview.defaults.pain).toBe('none');
    expect(preview.defaults.edge).toBe('medium');
    expect(preview.budgets.find((b) => b.id === preview.defaults.budget)?.max).toBeNull();
    const profile = previewProfile({ position: 'side', firmness: 'medium', weightLb: 155, temperature: 'neutral', sharing: 'single' });
    expect(profile.painFocus).toBe('none');
    expect(profile.edgeImportance).toBe('medium');
    expect(profile.budgetUsd).toBeUndefined();
  });

  // The live path (POST /api/match -> topFromRun) reads a run exactly like the grid.
  it.each([
    ['shoulders', 'medium', null],
    ['lower-back', 'high', null],
    ['none', 'low', 1500],
    ['hips', 'high', 1000],
  ] as const)('live answers pain=%s edge=%s budget=%s read the engine top organic match', async (pain, edge, budgetMax) => {
    const profile = previewProfile({ position: 'side', firmness: 'medium', weightLb: 155, temperature: 'neutral', sharing: 'single', pain, edge, budgetMax });
    if (budgetMax !== null) expect(profile.budgetUsd).toEqual({ min: 0, max: budgetMax });
    const run = await matchProfile(profile, { scoreVersion: SCORE_VERSION });
    const top = topFromRun(run.results);
    const first = run.results.find((r) => !r.entry.sponsored);
    if (!first) {
      expect(top).toBeNull();
      return;
    }
    expect(top?.id).toBe(first.entry.id);
    expect(top?.score).toBe(first.result.overallScore);
    expect(top?.reasons).toEqual(first.explanation.reasons.slice(0, 2).map((r) => r.text));
    expect(top?.total).toBe(run.results.length);
    if (budgetMax !== null) run.results.forEach((r) => expect(typeof r.entry.priceUsd === 'number' && r.entry.priceUsd <= budgetMax).toBe(true));
  });

  it('stays small on the wire', () => {
    expect(JSON.stringify(preview).length).toBeLessThan(60_000);
  });
});
