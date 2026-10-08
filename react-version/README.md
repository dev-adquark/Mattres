# Mattress Match Score: website

The Mattress Match Score site: Next.js 16 (App Router), React 19, TypeScript (`strict`,
`noUncheckedIndexedAccess`), Tailwind CSS 4, design tokens in `app/globals.css` and co-located CSS
Modules for component styles. The import alias `@/*` maps to this directory.

Every file under `app/`, `components/` and `lib/` is `.ts`/`.tsx` (`allowJs` is off); the config
files `next.config.mts` and `vitest.config.mts` are TypeScript too. The only JavaScript left in this
directory is tooling: `eslint.config.mjs`, `postcss.config.mjs` and the browser-side render-studio
modules in `scripts/render-studio/*.js` (loaded into Chromium by `scripts/render-stills.mts`).
Shared domain types live in `lib/types.ts`. See `../REACT_MIGRATION_MATRIX.md`.

> This Next.js version has breaking changes compared with older releases. Before using a Next API,
> read the matching guide in `node_modules/next/dist/docs/` (see `AGENTS.md`).

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest
npm run lint       # ESLint (Next core-web-vitals + typescript rules)
npm run typecheck  # next typegen && tsc --noEmit
npm run build      # production build (also type-checks)
```

Nothing needs configuring locally. With no Supabase credentials, `lib/db/mattressRepo.ts` serves the
committed catalog in `lib/data/mattress-catalog.json`. Copy `.env.example` to `.env.local` only if
you need the database, cron, admin or shared rate-limit features
(see `../docs/PRODUCTION_DEPLOYMENT.md`).

To run a second dev server without clashing with another one, give it its own build directory and
port: `NEXT_DIST_DIR=.next-alt npx next dev -p 3101`.

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Home: the story of the product, featured mattresses, the X-ray view |
| `/find-match` | The sleep quiz, the match reveal and ranked results |
| `/mattresses` | Catalog with search and filters (state in the URL, e.g. `?q=Casper`) |
| `/mattress/[id]` | Mattress detail: specs, verification, illustration, personal score if you took the quiz |
| `/compare`, `/compare/[topic]` | Compare up to three mattresses; curated comparison topics |
| `/guides`, `/guides/[slug]` | Sleep guides |
| `/sleep-position/[position]` | Side, back, stomach and combination sleeper pages |
| `/faq` | Frequently asked questions |
| `/methodology` | How it works: the full scoring method, weight explorer, data provenance, limitations, version history |
| `/disclosures`, `/privacy`, `/terms` | Policies |

API routes: `POST /api/match` (score a profile), `GET /api/search-index` (site search index),
`/api/cron/*` (Vercel Cron: catalog freshness and RTINGS sync, `CRON_SECRET`) and
`/api/admin/rtings/*` (`ADMIN_API_SECRET`).

## Scoring

- `lib/scoreEngine.ts`: the versioned, deterministic engine (server-only; it reads
  `lib/rules/<version>.json`). Exports `scoreEngine`, `loadRules`, `computeEffectiveWeights`,
  `normalizePainFocus` and helpers.
- `lib/rules/0.2.json`: the default model. `lib/rules/0.1.json`: the original model, kept unchanged.
- `lib/matchLogic.ts`: `matchProfile(profile, { scoreVersion })` loads the catalog, applies the type
  and budget filters, scores every mattress, sorts deterministically and attaches explanations.
- `lib/explain.ts`, `lib/scoreTiers.ts`: client-safe wording for reasons, watch-outs and tiers.
- `lib/profileValidation.ts`: validation used by `POST /api/match`.
- `lib/dataIntegrity.ts`: the single definition of "verified" (`getVerificationLevel`,
  `missingFields`, `auditCatalog`). Use it, not the stored `verified` fields.

`POST /api/match` body: `sleepPosition`, `weightLb`, `preferredFirmnessLabel` and `sleepTemperature`
(all required), plus optional `motionSensitivity`, `painFocus`, `edgeImportance`,
`mattressTypePreference`, `budgetUsd` and `scoreVersion` (`"0.2"` by default). It is rate-limited to
30 requests a minute per IP, using Upstash Redis when configured and in-memory counting otherwise.
Profiles are not stored.

## Where things live

- `app/`: routes. `app/layout.tsx` mounts the header, footer, compare tray, page transitions and
  Vercel Analytics / Speed Insights. Pages must not render their own `<main>`.
- `components/ui/`: shared primitives (Button, Section, ScoreRing, ScoreBars, RiskFlagList, Badge,
  ProductCard, MattressRender, OutboundLink, and more).
- `components/three/`: the lazy-loaded Three.js mattress viewer. It is the only code that imports
  `three`, and it falls back to an SVG illustration.
- `components/<area>/`: page-specific components (`home`, `match`, `product`, `compare-page`,
  `content`, `trust`, `search`, `compare`).
- `lib/types.ts`: domain types (catalog entry, profile, engine result, match item, explanation,
  tier, CTA, analytics, navigation, search, editorial registries).
- Styling: `app/globals.css` holds only tokens, base elements, editorial typography/prose, layout
  primitives and document-level rules. Component styles are CSS Modules next to the component,
  wrapped in `@layer components`. Inline `style` is only for runtime values (scores, CSS custom
  properties, intrinsic aspect ratios).
- `lib/analytics.ts`: the allow-list of custom events (`track(name, props)`). Only primitive props are
  sent, and keys that could carry personal data are dropped.
- `lib/compareStore.ts`: compare selection (localStorage); `lib/useLastResult.ts`: last quiz result
  (sessionStorage).

## Image system

There are no licensed product photos. Every mattress image on the site is original artwork generated
from code in this repo, and every one is labelled as an illustration, not a product photo. Nothing
comes from stock libraries or brand sites, and no image shows a person.

**What exists** (`public/renders/`, about 3.7 MB):

| Kind | Aspect | Master size | Set | Use |
| --- | --- | --- | --- | --- |
| `hero-{type}` | 3:2 | 2400×1600 | 4 (one per type) | Cinematic sections: a dressed bed in a moonlit bedroom |
| `product-{type}-{colourway}` | 4:3 | 1600×1200 | 16 | Product storytelling: a warm-sand studio sweep |
| `card-{type}-{colourway}` | 1:1 | 960×960 | 16 | Catalogue and product cards |
| `cutaway-{type}` | 16:9 | 1920×1080 | 4 | Stair-step cut through cover, comfort, transition and support layers on Night Ink |
| `material-{quilt,coils,foam}` | 3:2 | 1800×1200 | 3 | Editorial macro close-ups with depth of field |

- Types are `foam`, `hybrid`, `innerspring` and `latex`. The layer kinds come from
  `components/three/layers.ts`, so the stills match the interactive X-ray.
- Colourways are `linen`, `mist`, `sand` and `dusk`. They change only the side-panel colour; nothing
  implies a specific product.
- Each image ships as a WebP master (the `next/image` source), an AVIF sibling and a small PNG
  fallback.
- `components/ui/render-stills/manifest.ts` is generated by the pipeline and lists the dimensions
  and a 16px blur placeholder for every image.

**Using them:**

- `MattressRender` (`components/ui/MattressRender.tsx`) keeps its original props and adds these:
  - `aspect`: `card` (the default), `product`, `hero`, `cutaway`, or `illustration` (the SVG only)
  - `colourway`, `sizes` and `preload`
- It picks the still from the mattress `type` plus `aspect`. The colourway comes from `seed`
  (use `entry.id`), using the same hash as the SVG palette.
- It renders through `next/image` with explicit width and height, responsive `sizes` and a blur
  placeholder. Use `preload` only on the LCP image.
- The alt text always reads "Illustration of a {type} mattress … not a product photo".
- Unknown types, and any image that fails to load, fall back to the isometric SVG illustration
  (`MattressIllustration`).
- `MaterialStill {subject: 'quilt'|'coils'|'foam', caption?, sizes?}` renders the editorial
  close-ups.
- The lookup helpers (`getRenderStill`, `getMaterialStill`, `stillAlt`) live in
  `components/ui/render-stills/stills.ts`.

**Regenerating** takes about 2 minutes on an Apple-silicon GPU:

```bash
node scripts/render-stills.mts                                  # full set -> public/renders + manifest
node scripts/render-stills.mts --quick --preview /tmp/stills    # 1/6 samples, PNG previews only
node scripts/render-stills.mts --only cutaway --types hybrid    # a subset (updates the manifest in place)
```

**How the pipeline works:**

- `scripts/render-stills.mts` serves `scripts/render-studio/` (plain ES modules plus `three` from
  `node_modules`, so it never touches the Next.js build) to headless Chromium through Playwright.
  It uses the Metal GPU when available and falls back to SwiftShader otherwise.
- The studio builds procedural scenes:
  - a swept mattress side profile with piping and a quilt panel displaced with real geometry
  - linen, jersey, spacer-mesh, boucle, foam-cell, latex-pinhole and oak textures, generated from
    seeded noise
  - pillows and a turned-down duvet
  - pocketed and Bonnell coils
- Each image is accumulated over 170 to 380 jittered passes:
  - area lights give soft shadows
  - a stochastic shadowed sky dome gives ambient occlusion and contact shadows
  - sub-pixel jitter handles anti-aliasing
  - thin-lens jitter gives depth of field on the macros
- Tone mapping, vignette, a black-level lift and fine grain are applied last.
- `sharp` encodes the outputs. All seeds are fixed, so re-runs are deterministic, give or take
  GPU driver rounding.

## Data rules

Never invent prices, ratings, reviews, retailers, affiliate links or verification. Show what is
missing ("Not yet verified", "Data unavailable", "Link coming soon"). There is no affiliate program:
the only product link is the manufacturer's `officialProductUrl`, labelled "Visit {Brand}" and
tracked as `outbound_click`. Mattress images are code-generated illustrations (see Image system) and are labelled that way.
