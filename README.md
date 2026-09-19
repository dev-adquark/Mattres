# Mattress Match Score

A frontend-only recreation of the "Mattress Match Score" landing experience, plus static mockups
for the Compare, Methodology, and Disclosures pages.

## What's here

Single self-contained file: **`index.html`** — no build step, no dependencies, no backend.
Open it directly in a browser, or serve it with any static file server.

### Pages (client-side hash routing, all in one file)

- `#home` — Hero with a scroll-driven "exploding" mattress layer graphic, process steps,
  feature grid, brand comparison teaser, reviews, and CTA.
- `#compare` — Mockup of `/compare/best-for-side-sleepers-under-1000`: three mattress cards
  with an overall Match Score, six sub-scores, risk flags, and review highlights, using
  placeholder data. Includes a "Sponsored" badge clearly separated from "Top match — algorithmic".
- `#methodology` — Explains the (placeholder) scoring model: six weighted categories, the
  inputs → score flow, a risk-flag reference table, and a version history.
- `#disclosures` — Affiliate link and sponsored-listing disclosure copy, combined with the
  sponsored-listing policy.

## Explicit non-goals (by design)

- No login / signup / user accounts / admin panel.
- No real scoring engine, database, or API — all scores, flags, and reviews are placeholder
  content for design purposes only.
- No live affiliate IDs or tracking — "View at retailer" links are non-functional mockups.

## Notes

- The 3D-look mattress graphic is built with layered CSS/SVG and a scroll-linked CSS custom
  property (`--explode`), not WebGL.
- Fonts are loaded from Google Fonts (`Sora`, `Inter`); everything else is self-contained.

## Match Scoring Engine (v0.1 skeleton)

A small, dependency-free Node module implementing the scoring logic referenced by the
`#compare` and `#methodology` pages above. Nothing here is wired into the frontend yet —
this is the engine in isolation, runnable from the command line.

```
src/scoreEngine.js              versioned scoreEngine(version, profile, mattress) entry point
data/rules/0.1.json              weights, comfort bands, baselines, thresholds, risk-flag copy
data/samples/sample-profile.json  a demo Sleep Profile
data/samples/sample-mattress.json a demo Mattress spec (deliberately a poor match)
scripts/score-demo.js            CLI: prints deterministic scored JSON
scripts/test-score-engine.js     dependency-free tests (node's built-in `assert`)
```

### Run it

```
node scripts/score-demo.js
# or: npm run score-demo

node scripts/test-score-engine.js
# or: npm test
```

### Try your own inputs

```
node scripts/score-demo.js --profile path/to/profile.json --mattress path/to/mattress.json
```

### What it returns

`scoreEngine("0.1", profile, mattress)` returns:

- `overallScore` — 0–100, a weighted sum of the six sub-scores
- `subScores` — `pressureRelief`, `support`, `heat`, `motion`, `edge`, `durability` (each 0–10)
- `comfortBand` — the firmness range the engine expected for this profile, and which weight
  band it matched
- `riskFlags[]` — each with a `code`, `category`, `rationale` (built from the actual numbers
  that triggered it), and a `mitigation` suggestion. Four rules ship in v0.1:
  `SUPPORT_THRESHOLD_MISMATCH`, `HEAT_RETENTION_LIKELY`, `EDGE_SUPPORT_CONCERN`,
  `DURABILITY_SAG_RISK`.

### Design notes / known limitations

- **v0.1 is a skeleton.** Weights, baselines, and thresholds in `data/rules/0.1.json` are
  placeholders — reasonable-looking, not calibrated against real product or review data.
- **Deterministic on purpose.** No randomness, no wall-clock time in the scoring math, so the
  same inputs always produce the same output — this is asserted by the test suite.
- **Versioning is additive.** Each scoring model version gets its own JSON dataset under
  `data/rules/` and, if the math changes shape, its own implementation function registered in
  `VERSION_IMPLEMENTATIONS` inside `src/scoreEngine.js` — old versions keep working unchanged.
- **Not connected to the frontend.** The `#compare` page's numbers are still hand-written
  mockup data; wiring it to this engine is a follow-up step, not done here.

## Mattress catalog + review-tag ingestion

A local ingestion pipeline that normalizes messy/inconsistent raw mattress records into the
catalog schema referenced by the brief, and tags raw review snippets against a controlled
vocabulary.

```
data/raw/mattresses-raw.json           12 raw mattress records, deliberately inconsistent
                                        (mixed units, free-text categories, missing fields)
data/raw/reviews-raw.json              raw review snippets, keyed by model_name
data/schema/mattress.schema.json       JSON Schema for the normalized catalog entry
data/schema/review-tags.vocabulary.json controlled tag vocabulary + ingestion trigger phrases
src/ingest/normalizeMattress.js        raw record -> canonical mattress (unit/label parsing)
src/ingest/tagReviews.js               keyword-based review tagging + confidence scoring
scripts/ingest-mattresses.js           CLI: runs the pipeline, writes the two output files
scripts/test-ingest.js                 dependency-free tests (also runs the pipeline as a smoke test)
```

### Run it

```
node scripts/ingest-mattresses.js
# or: npm run ingest

node scripts/test-ingest.js
```

### What it generates

- **`data/mattress-catalog.json`** — 12 normalized mattresses, each with `brand`, `model`,
  `type` (`foam` | `hybrid` | `innerspring`), `retailPartners`, `height.inches`, `trialDays`,
  `warrantyYears` / `warrantyLifetime`, `firmnessRange` (`{min, max}` on a 1-10 scale, or `null`
  when unparseable), `sourceConfidence` (`high` / `medium` / `low`), and `dataQualityNotes`
  explaining any fallback (e.g. a height given in cm and converted, or a missing firmness value).

- **`data/review-tags.json`** — for every mattress, an array of review highlight items tagged
  from the controlled vocabulary (`sleepsHot`, `coolSleeper`, `greatEdgeSupport`,
  `poorEdgeSupport`, `tooFirm`, `tooSoft`, `offGassing`, `motionIsolationGood`, `sagsAfterTime`,
  `pressureReliefGood`, `greatValue`), each with a `confidence` tier (`high` ≥3 matching
  reviews, `medium` = 2, `low` = 1), a `matchCount`, and the originating review `snippet`.

### Design notes / known limitations

- **Rule-based, not ML.** Tagging is deterministic case-insensitive phrase matching against
  `data/schema/review-tags.vocabulary.json` — every tag traces back to an exact phrase in an
  exact review. This trades recall for auditability, which matters more at this stage.
- **Raw data is illustrative.** The 12 mattresses and their reviews are hand-written to exercise
  every normalization edge case (a cm height, a missing firmness label, an explicit "(x/10)"
  score, a "Lifetime" warranty) and every required tag — they are not real products.
- **Confidence reflects review volume, not truth.** A `low` confidence tag just means only one
  review snippet in this small sample happened to mention it, not that it's unreliable in
  principle.
- **Not connected to the frontend or scoring engine yet.** The `#compare` page's mattress cards
  and `scoreEngine()`'s sample mattress are still separate, hand-written fixtures.

## Data contracts: SleepProfile + RecommendationResult (TypeScript)

The single internal shape used end-to-end — form input → scoring → results rendering — lives in
`src/contracts/mattress-match.ts`. This is the first TypeScript in the repo, so `typescript` is
now a devDependency and there's a `tsconfig.json` scoped to `src/contracts/**/*.ts`.

```
src/contracts/mattress-match.ts                  the contract: types + getPlacementBadge()
src/contracts/formToProfile.example.ts           Quick Match / full form -> SleepProfile
src/contracts/buildRecommendationResult.example.ts  SleepProfile + catalog -> RecommendationResult[]
src/contracts/resultsPageViewModel.example.ts    RecommendationResult[] -> results page view model
```

### Run it

```
npm run typecheck        # tsc --noEmit, strict mode, noUnusedLocals/noUnusedParameters on
npm test                 # runs the scoring + ingestion test suites, then typecheck
```

The `.example.ts` files aren't test files in the mocha/jest sense — they're runnable
demonstrations that every field on `SleepProfile` and `RecommendationResult` is read by
something concrete (a filter, a chip, a badge, a sort), which is what makes "no unused fields"
checkable rather than just asserted. To see them actually run end-to-end (form → profile →
filtered/ranked recommendations → view model, including the budget filter excluding an
over-budget mattress), transpile with `tsc` to a scratch directory and `require()` the output —
see the project's PR/commit history for the exact one-liner used to verify this.

### The two forms -> one profile

- **`QuickMatchFormInput`** (landing page) — 4 fields: `sleepPosition`, `weightLb`,
  `firmnessPreference`, `sleepTemperature`. Fast on purpose; missing fields (motion sensitivity,
  pain focus) get explicit, documented defaults when normalized.
- **`SleepProfileFormInput`** (full form) — adds `motionSensitivity`, `painFocus[]`, optional
  `heightIn`, `mattressTypePreference[]`, `budgetUsd`.
- Both normalize into **`SleepProfile`**, the one shape scoring and rendering ever see. It adds
  `profileId` (audit trail back to the inputs that drove a result), `source` (`'quick' | 'full'`,
  for the PRD's form-completion-rate metric), and `createdAt`.

### Sponsored vs algorithmic placement

`ListingPlacement` is a discriminated union — `{ kind: 'sponsored', verifiedAt, sponsorName? }`
or `{ kind: 'algorithmic', isTopMatch }` — so a listing can't be both sponsored and a "top match"
at once, which encodes the disclosures page's promise that sponsored slots are never blended
into algorithmic ranking. `getPlacementBadge()` is the one function anything should call to
render a badge, so the wording (`"Sponsored Verified"` / `"Algorithmic Pick"`) stays consistent
everywhere instead of being re-typed per component.

### Known gaps

- `MattressSummary.priceUsd` and `.affiliateUrl` are rendered by the results page contract but
  not yet produced by `scripts/ingest-mattresses.js` — pricing/affiliate-link ingestion is a
  follow-up, not part of this task.
- These contracts aren't wired into the static `index.html` site or the scoring engine's JS —
  they're the target shape for when those become real form/API/page code, exercised here via the
  `.example.ts` adapters rather than the production HTML.

## Scoring trace + demo API (auditability)

The scoring engine now returns a `trace` alongside every score, and a small demo HTTP endpoint
exposes it directly — this is what a "Why this match?" section on the results page would render
from.

```
data/samples/demo-profiles.json     2 demo profile/mattress pairs, keyed by profileId
src/api/scoreTraceHandler.js        framework-free handler: profileId -> { modelVersion, trace, ... }
scripts/serve-demo-api.js           minimal http server (no deps) exposing GET /api/score-trace
scripts/test-score-trace-api.js     tests the handler directly AND over real HTTP
```

### Run it

```
npm run serve
# in another terminal:
curl "http://localhost:8787/api/score-trace?profileId=demo-poor-match"
curl "http://localhost:8787/api/score-trace?profileId=demo-good-match"
```

`demo-poor-match` triggers all 4 risk rules (same fixture as `npm run score-demo`);
`demo-good-match` triggers none, and its `trace.riskRulesUsed` shows all 4 rules evaluated with
`triggered: false` — proving the trace records *why a flag didn't fire*, not just why it did.

### What `trace` looks like

```
{
  "modelVersion": "0.1",
  "categoryRulesUsed": [
    { "ruleId": "BASELINE_BY_TYPE", "category": null, "description": "...", "delta": 0, "note": "..." },
    { "ruleId": "SUPPORT_BAND_PENALTY", "category": "support", "description": "...", "delta": -1.2, "note": "Firmness 3/10 is 2 point(s) below the 5-8 band." }
  ],
  "riskRulesUsed": [
    { "ruleId": "HEAT_RETENTION_LIKELY", "triggered": true, "thresholdId": "thresholds.heatRetentionMaxHeatScore", "thresholdValue": 6, "evaluatedValue": 3 }
  ]
}
```

Every `ruleId` traces back to `data/rules/0.1.json`'s `categoryRuleCatalog` (for sub-score
adjustments) or `riskFlagRules` (for flags) — the same dataset the methodology page's copy is
meant to describe, so a rule's id, its human description, and its actual effect on a given score
all come from one place instead of three that could drift apart.

### `modelVersion`

`scoreEngine()`'s return value now has both `modelVersion` (canonical, matches this task's ask)
and `scoreModelVersion` (kept as a backward-compatible alias). The TypeScript contract's
`RecommendationResult.modelVersion` follows the canonical name — this is the field a methodology
page banner and each recommendation card would read to show which scoring model version produced
what's on screen.

### Known gaps

- The demo endpoint scores a fixed profile against a fixed mattress from `data/samples/`, not
  the live catalog — same scope boundary as `npm run score-demo`. Wiring `GET /api/score-trace`
  to the real catalog + a real profile store is a follow-up.
- There's no real HTTP framework here on purpose (matches the rest of the repo's
  zero-dependency approach) — `scripts/serve-demo-api.js` is a demo server, not production
  infrastructure.
