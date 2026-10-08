/**
 * Server-only data for the homepage. Everything here is computed from the
 * real catalog and the real scoring engine (v0.2 default) at render time;
 * nothing is hand-written per product. Each homepage section receives a
 * small, serialisable slice of this (shapes in ./types).
 */
import { getCatalog } from '@/lib/db/mattressRepo';
import { loadRules } from '@/lib/scoreEngine';
import { DIMENSIONS } from '@/lib/explain';
import { TIERS } from '@/lib/scoreTiers';
import { auditCatalog } from '@/lib/dataIntegrity';
import { firmnessFor } from '@/lib/firmness';
import type { MattressEntry } from '@/lib/types';
import {
  COMPARE_DEMO_PROFILE,
  RATING_FIELDS,
  SCORE_VERSION,
  SLEEP_CATEGORY_SLUGS,
  TYPE_ORDER,
  WEIGHT_PRESETS,
  isNum,
} from './homeConfig';
import {
  buildContrast,
  buildPersonal,
  buildPreviewGrid,
  buildSleepCategory,
  completenessCompare,
  effectiveWeights,
  runMatch,
  storySlide,
  toFinalist,
} from './homeSections';
import type { HomeAnatomy, HomeData, HomeTrust, SleepCategoryCard } from './types';

export { SCORE_VERSION, PREVIEW_POSITIONS, PREVIEW_FIRMNESS, COMPARE_DEMO_PROFILE } from './homeConfig';

async function loadCatalog(): Promise<MattressEntry[]> {
  // lib/db/mattressRepo is CommonJS (required by root Node scripts) and untyped; name the shape it returns.
  const { entries } = (await getCatalog()) as { entries: MattressEntry[] };
  return entries;
}

export async function getHomeData(): Promise<HomeData> {
  const catalog = await loadCatalog();
  const rules = loadRules(SCORE_VERSION);

  // 01 Hero facts --------------------------------------------------------
  const brands = new Set(catalog.map((e) => e.brand).filter(Boolean));
  const sponsoredCount = catalog.filter((e) => e.sponsored).length;
  const facts = { total: catalog.length, brands: brands.size, dimensions: DIMENSIONS.length, sponsoredCount };

  // 02 One mattress, two sleepers; 03 personalisation; 04 interactive preview
  const contrast = await buildContrast(catalog);
  const personal = buildPersonal(rules);
  const preview = await buildPreviewGrid(rules);

  // 05 Score anatomy -------------------------------------------------------------
  const anatomy: HomeAnatomy = {
    dimensions: DIMENSIONS.map((d) => ({ id: d.id, label: d.label })),
    presets: WEIGHT_PRESETS.map((preset) => {
      const weights = preset.profile ? effectiveWeights(rules, preset.profile) : rules.baseWeights;
      const rounded = { ...weights };
      for (const d of DIMENSIONS) rounded[d.id] = Math.round(weights[d.id] * 1000) / 1000;
      return { id: preset.id, label: preset.label, note: preset.note, weights: rounded };
    }),
    preference: {
      tolerance: rules.preferenceFit.tolerancePoints,
      perPoint: rules.preferenceFit.pointsPerFirmnessPoint,
      maxPenalty: rules.preferenceFit.maxPenalty,
    },
    tiers: TIERS.map((t) => ({ id: t.id, label: t.label, min: t.min, max: t.max })),
  };

  // 08 Featured: the most completely documented mattress of each type ---------------
  const featured = TYPE_ORDER.map((t) => catalog.filter((e) => e.type === t && !e.sponsored).sort(completenessCompare)[0]).filter(
    (e): e is MattressEntry => Boolean(e),
  );

  // Product story slider: the featured rule first, then the rest of the catalog by completeness.
  const featuredIds = new Set(featured.map((e) => e.id));
  const rest = catalog.filter((e) => !e.sponsored && !featuredIds.has(e.id)).sort(completenessCompare);
  const story = [...featured, ...rest].slice(0, 12).map(storySlide);

  const bySleep = await Promise.all(SLEEP_CATEGORY_SLUGS.map((slug) => buildSleepCategory(slug, catalog)));

  // 09 Compare demo ---------------------------------------------------------------
  const demoRun = await runMatch(COMPARE_DEMO_PROFILE);
  const finalists = demoRun.results
    .filter((r) => !r.entry.sponsored)
    .slice(0, 3)
    .map(toFinalist);

  // 11 Trust: catalog provenance (the same audit matchProfile attaches) -------------
  const audit = auditCatalog(catalog);
  const trust: HomeTrust = {
    total: audit.total,
    verified: audit.byLevel.verified,
    partial: audit.byLevel.partially_verified,
    unverified: audit.byLevel.unverified,
    incomplete: audit.byLevel.unknown,
    sponsoredCount,
    coverage: [
      { id: 'firmness', label: 'Firmness rating', count: catalog.filter((e) => firmnessFor(e)).length },
      ...RATING_FIELDS.map(({ dim, field }) => ({
        id: dim,
        label: `${DIMENSIONS.find((d) => d.id === dim)?.label ?? dim} rating`,
        count: catalog.filter((e) => isNum(e[field])).length,
      })),
      { id: 'price', label: 'Published Queen price', count: catalog.filter((e) => isNum(e.priceUsd)).length },
    ],
  };

  return {
    facts,
    contrast,
    personal,
    preview,
    anatomy,
    story,
    bySleep: bySleep.filter((c): c is SleepCategoryCard => c !== null),
    compare: { profile: COMPARE_DEMO_PROFILE, finalists },
    trust,
  };
}
