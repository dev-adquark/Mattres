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
