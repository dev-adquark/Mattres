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
