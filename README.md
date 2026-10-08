# Mattress Match Score

A sleep-discovery site that scores real mattresses against the way you sleep. You answer a short
quiz (sleep position, body weight, firmness preference and temperature, plus optional answers
about bed sharing, edge support, discomfort, mattress type and budget). A deterministic,
rules-based engine then gives every mattress in the catalog a 0–100 **Match Score**, six
sub-scores, plain-language reasons and fit flags for anything that could be a problem.

The product rules that matter most:

- **No invented data.** Missing prices, ratings or specs show as "Not yet verified" or "Data
  unavailable"; estimated sub-scores are labelled as estimates.
- **No affiliate links or sponsors today.** The only outbound product link is the manufacturer's
  own product page ("Visit {Brand}"), with no affiliate code.
- **Scores come only from the engine.** UI components render engine output; they never hand-write
  scores or reasons per product.
- **Images are illustrations.** There are no licensed product photos. Mattress visuals are drawn
  in code (SVG, plus a lazy-loaded Three.js scene) and labelled as illustrations.

## Repository layout

| Path | What it is |
| --- | --- |
| `react-version/` | **The website.** Next.js 16 App Router, React 19, TypeScript (strict; migration from JavaScript in progress, see [`REACT_MIGRATION_MATRIX.md`](REACT_MIGRATION_MATRIX.md)). This is the directory that gets deployed. See [`react-version/README.md`](react-version/README.md). |
| `src/scoreEngine.js` | Plain-JavaScript copy of the scoring engine for the root Node CLI tools (no TypeScript toolchain). Same logic as `react-version/lib/scoreEngine.ts`; only the rules path differs. The root and app test suites check both produce byte-identical output. |
| `data/rules/0.1.json`, `data/rules/0.2.json` | Versioned rule sets, mirroring `react-version/lib/rules/`. |
| `data/`, `src/ingest/`, `scripts/` | Early catalog-ingestion and review-tagging pipeline, CLI demos and the root test scripts. |
| `src/contracts/` | TypeScript data contracts (`SleepProfile`, `RecommendationResult`) checked by `tsc`. |
| `supabase/migrations/` | SQL for the optional Supabase catalog database. |
| `docs/` | `MATCH_SCORE_EXPLAINED.md` and `PRODUCTION_DEPLOYMENT.md`. |

## The scoring engine

`scoreEngine(version, profile, mattress)` is deterministic: no randomness and no clock, so the same
inputs always give the same output. Every weight, threshold and baseline lives in a versioned JSON
rules file; the engine code holds no tuning constants of its own.

- **v0.2 (default).** Uses the catalog's graded third-party ratings (out of 10) for cooling,
  motion isolation, edge support and durability, and calculates support and pressure relief from
  the mattress's stated firmness against the sleeper's comfort band. A dimension with no rating
  falls back to a construction-type baseline capped at 6.5 and is marked `estimated`. The default
  weights (pressure relief 20%, support 25%, cooling 15%, motion isolation 15%, edge support 15%,
  durability 10%) are re-weighted from the sleeper's answers and renormalised to 100%. A graded
  penalty (up to 12 points) applies when firmness is far from the stated preference. Seven fit
  flags: `SUPPORT_THRESHOLD_MISMATCH`, `PREFERRED_FIRMNESS_MISMATCH`, `HEAT_RETENTION_LIKELY`,
  `EDGE_SUPPORT_CONCERN`, `MOTION_TRANSFER_LIKELY`, `PRESSURE_POINT_RISK`, `DURABILITY_SAG_RISK`.
- **v0.1.** The first model. Kept byte-for-byte and still selectable (`scoreVersion: "0.1"`), with
  snapshot tests proving its output has not changed. It was replaced as the default because it
  could not tell mattresses apart: across a 288-profile test grid, every top match scored exactly 78.

Each result includes `overallScore`, `subScores`, `effectiveWeights`, `dimensionProvenance`
(`measured` | `estimated`), `firmnessFit`, `scoreBreakdown`, `riskFlags` and a `trace` of every rule
that fired. `react-version/lib/explain.ts` turns that into the reasons and watch-outs users see. The
public write-up, including an interactive weight explorer driven by the engine's own weighting
function, is the site's `/methodology` page.

## Running it

Requirements: Node.js 20 or newer.

```bash
cd react-version
npm install
npm run dev              # http://localhost:3000
```

No environment variables are needed locally. Without Supabase credentials the site reads the
committed catalog at `react-version/lib/data/mattress-catalog.json` (37 mattresses from 17 brands).
See `react-version/.env.example` and `docs/PRODUCTION_DEPLOYMENT.md` for the optional database,
cron, admin and shared rate-limit settings.

## Tests

```bash
# From the repository root: engine, ingestion, score-trace API and RTINGS-sync tests,
# then the website's Vitest suite, then the TypeScript contract check.
npm install              # once, for TypeScript
npm test

# Website only
cd react-version
npm test                 # Vitest: every *.test.{js,ts,tsx} (engine v0.1 regression + v0.2, match logic,
                         # explanations, tiers, validation, search, quiz model, catalog query, ...)
npm run lint
npm run build
```

Other root scripts: `npm run score-demo`, `npm run ingest`, `npm run serve` (demo score-trace
API), `npm run verify-catalog`, `npm run sync-rtings` and `npm run typecheck`.

## License

MIT. See [`LICENSE`](LICENSE).
