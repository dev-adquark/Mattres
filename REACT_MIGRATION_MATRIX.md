# React / TypeScript migration matrix

Living record of the migration from the legacy static prototype and plain-JavaScript Next.js app to
a strict-TypeScript, component-styled Next.js application. Governing brief: `brief-v5-react-migration`
(mapped to this repository's real paths: engine = `react-version/lib/scoreEngine.ts` +
`lib/rules/*.json`; quiz and results = `/find-match`; the only privileged surfaces are the
`CRON_SECRET` / `ADMIN_API_SECRET` protected `/api/cron/*` and `/api/admin/rtings/*` routes; there is
no sponsored-verification or admin-session system and none was invented; no login or accounts).

Recovery point taken before any change: `snapshot-pre-migration.tgz` (whole repository without
`node_modules` / `.next*`, 653 entries), stored in the session scratchpad.

Status key: PASS = done and verified with the evidence shown. OPEN = not done yet (owner and next
action stated). There is no "partial". Final state: every row is PASS.

---

## 1. Route inventory

### 1.1 Deployment facts

- Vercel deploys `react-version/` as the project root (`docs/PRODUCTION_DEPLOYMENT.md`: "Set Root
  Directory to `react-version`"; `react-version/vercel.json` holds the crons). The repository root
  is not deployed.
- The legacy root `index.html` was therefore never served by the production site. Its navigation was
  client-side hash routing (`location.hash` + `hashchange`), so its URLs were fragments. Fragments
  never reach a server, so no server redirect is possible or needed.

### 1.2 Legacy prototype URLs -> Next.js routes

| Old URL (root `index.html`) | New route | Status | Redirect needed? | Notes |
| --- | --- | --- | --- | --- |
| `index.html#home` (also `#top`) | `/` | PASS | No (fragment of an undeployed file) | Home hero, chapters, X-ray, compare, CTA |
| `index.html#journey` | `/` (homepage chapters 01-06) | PASS | No | "4 simple steps" became the six chapter story |
| `index.html#find-match` | `/find-match` | PASS | No | Quiz, reveal, ranked results |
| `index.html#compare` | `/compare`, `/compare/[topic]` | PASS | No | Real catalog only (see 3.2) |
| `index.html#methodology` | `/methodology` | PASS | No | Full method, weight explorer, version history |
| `index.html#disclosures` | `/disclosures` | PASS | No | Plus `/privacy`, `/terms` |

### 1.3 Public routes of the Next.js app

Counts for dynamic segments are the sitemap entries served by `app/sitemap.ts` (107 URLs total).

| Route | Kind | Indexed URLs | Data source |
| --- | --- | --- | --- |
| `/` | static | 1 | catalog + engine |
| `/find-match` | static shell, client quiz | 1 | `POST /api/match` |
| `/mattresses` | static + client filters (`?q=`) | 1 | catalog |
| `/mattresses/[category]` | SSG, `dynamicParams=false` | 14 | `lib/categoryPages.ts` |
| `/mattress` | static A-Z index | 1 | catalog |
| `/mattress/[id]` | SSG, `dynamicParams=false` (+ OG image) | 37 | catalog |
| `/brands`, `/brands/[brand]` | SSG, `dynamicParams=false` | 1 + 17 | catalog |
| `/compare` | static + client workspace (`?ids=`) | 1 | catalog + engine |
| `/compare/[topic]` | SSG topics + pairs; reversed pair slug = 308 (next.config redirects + `permanentRedirect`) | 13 | `lib/compareTopics.ts`, `lib/comparePairs.ts` |
| `/guides`, `/guides/[slug]` | SSG, `dynamicParams=false` | 1 + 9 | `lib/content/guides.ts` |
| `/sleep-position`, `/sleep-position/[position]` | SSG, `dynamicParams=false` | 1 + 4 | `lib/content/positions.ts` |
| `/methodology`, `/faq`, `/disclosures`, `/privacy`, `/terms` | static | 5 | - |
| `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/opengraph-image` | metadata routes | - | `Disallow: /api/` |
| `not-found`, `error`, `global-error`, `loading` | framework states | - | - |

API routes (not indexed): `POST /api/match`, `GET /api/search-index`, `GET /api/cron/verify-catalog`,
`GET /api/cron/rtings-sync`, `GET /api/cron/rtings-check` (`CRON_SECRET`),
`/api/admin/rtings/status`, `/api/admin/rtings/sync` (`ADMIN_API_SECRET`).

No route was added, removed or renamed by this migration, so no redirect was created.

---

## 2. File inventory and classification

### 2.1 HTML (`*.html`, `*.htm`; excluding `node_modules`, `.next*`)

| File | Classification | Action | Status |
| --- | --- | --- | --- |
| `index.html` (repo root, 4,631 lines, 1.9 MB with inline base64 art and an inline three.js r128 CDN build) | Legacy application prototype | Feature audit (section 3), then deleted; root `README.md` and `package.json` references removed | PASS |
| `react-version/scripts/render-studio/index.html` (15 lines) | Build tooling: harness page Playwright loads to render the original product stills | Replaced by an in-memory document served by `scripts/render-stills.mts` at `/__render-studio`; file deleted. Verified: `node scripts/render-stills.mts --quick --only card --types foam` renders all four colourways | PASS |

Legacy HTML source files remaining: **0**.

### 2.2 Stylesheets (`*.css`, `*.scss`, `*.sass`, `*.less`, `*.styl`)

Search: `find . \( -name node_modules -o -name '.next*' -o -name .git \) -prune -o -type f \( -name '*.css' -o -name '*.scss' -o -name '*.sass' -o -name '*.less' -o -name '*.styl' \) -print`.
No SCSS, Sass, Less or Stylus exists. 66 `.css` files remain, all required by the new architecture:

| File(s) | Classification | Status |
| --- | --- | --- |
| `react-version/app/globals.css` (860 lines) | Framework-required + design-system foundation (Tailwind import and `@theme`, tokens, section moods, base elements, editorial typography and `.prose`, layout primitives, document-level shell rules, `::view-transition` rules, reduced-motion reset, forced colours, print) | PASS (860 lines after the final cleanup; see 5) |
| 65 `react-version/components/**/*.module.css` (ui, motion, Nav, Footer, search, compare, home, match, product, catalog, brands, compare-page, content, trust, three, render-stills) | Component CSS co-located with its component, in `@layer components` where it replaced global rules | PASS |

No `legacy.css`, `styles.css` or renamed global stylesheet exists.

### 2.3 Inline `style={...}` (86 occurrences in 36 files under `app/`, `components/`, `lib/`)

Search: `grep -rn "style={" app components lib` (39 of them are the literal `style={{` form).

| Where | Count | Classification |
| --- | --- | --- |
| `app/opengraph-image.tsx`, `app/mattress/[id]/opengraph-image.tsx` | 18 | Framework-required: `ImageResponse` (Satori) only accepts inline styles |
| `app/global-error.tsx` | 12 | Justified: replaces the root layout when it crashes, so it cannot rely on `globals.css` or CSS Modules; self-contained by design (documented in the file) |
| Data visualisation: score/percentage bars, rings, ranges, scales and charts (`ScoreBars`, `ScoreAnatomy`, `ComparisonTable`, `ComparisonCells`, `PairDimensions`, `CategoryRankRows`, `RangeChart`, `DataDiagrams`, `WeightPanel`, `ConstructionBar`, `BrandHero`, `FirmnessSpectrum`, `BudgetRange`, `QuizProgress`, `UnderstandChapter`, `FirmnessScale`, `CompareTable`, `MatchPreview`, `HomeHero`, `GuideCover`, `PositionBars`, `XrayInspector`, `WeightExplorer`, `MethodologyHero`, `ModelSections`, `ProvenanceSection`, `VersionsSection`, `CalculationSections`) | 43 | Dynamic/justified: each value is a runtime score, weight, count, position or index, written as a CSS custom property (`cssVars({...})`) or an SVG dash length |
| `MattressRender` (palette swatch fills, a still's intrinsic aspect ratio, caller's `objectPosition`, `style` pass-through) | 8 | Dynamic/justified: runtime data and component API |
| `MattressViewer` (`stageVars`, `xrayVars`) | 2 | Dynamic/justified: WebGL host sizing |
| `Slider` (`--spv*`, `--slider-gap`), `Reveal` (`--reveal-delay`), `Skeleton` (`width`/`height` props) | 3 | Dynamic/justified: per-instance CSS custom properties / sizing API |

Static inline styles outside `global-error`: **0** (the former `MethodologySections` `--stack-gap` is now
`.meaningStack` in `components/trust/Methodology.module.css`).

### 2.4 `dangerouslySetInnerHTML` / `innerHTML` / inline event strings

| Finding | Classification |
| --- | --- |
| `components/ui/JsonLd.tsx` (`dangerouslySetInnerHTML`) | Justified: JSON-LD script; payload is `JSON.stringify` of server data with `<` escaped (Next.js guidance). Only occurrence. |
| `innerHTML` | None |
| `onclick="..."` / `onchange="..."` strings | None (`grep -rni 'onclick=\|onchange='` finds only React `onClick={...}` / `onChange={...}` props) |

### 2.5 `document.` / `window.` usage

`grep -rlE "\bdocument\.|\bwindow\." app components lib` matches 41 files.

| Files | Classification |
| --- | --- |
| `app/api/cron/rtings-check/route.ts`, `components/content/PositionPage.tsx`, `components/content/articles/how-to-choose-mattress-firmness.tsx`, `components/content/articles/mattress-types-explained.tsx`, `lib/content/faq.ts`, `lib/content/positions.ts` | False positives: the word "window" ending a sentence in copy ("comfort window", "freshness window"); no DOM access |
| `lib/deviceStorage.ts`, `lib/compareStore.ts`, `lib/useLastResult.ts`, `components/search/recentSearches.ts`, `components/match/quizStore.ts`, `components/match/RememberToggle.tsx`, `components/product/useMatchFor.ts` | Legitimate: `localStorage` / `sessionStorage` behind `typeof window` guards and try/catch, plus `storage` / `DEVICE_DATA_CLEARED_EVENT` listeners |
| `components/motion/useReducedMotion.ts`, `components/ui/Magnetic.tsx`, `components/ui/ScoreRing.tsx`, `components/ui/Reveal.tsx`, `components/match/motion.ts`, `components/home/HeroStage.tsx`, `components/brands/useCursorFollow.ts`, `components/compare-page/useColumnPager.ts`, `components/three/viewerUtils.ts`, `lib/deviceTier.ts` | Legitimate: `matchMedia` (reduced motion, pointer, breakpoints), viewport size, GPU-tier probe canvas |
| `components/Nav.tsx`, `components/search/SearchDialog.tsx`, `components/search/searchEvents.ts`, `components/compare/CompareTray.tsx`, `components/motion/{Slider,ScrollProgress,useScrollProgress,ChapterRail}.tsx/ts`, `components/content/GuideToc.tsx`, `components/match/{MatchExperience,MatchResults,MatchReveal,QuizStage}.tsx`, `components/product/CatalogExplorer.tsx`, `components/catalog/CategoryNotFound.tsx` | Legitimate: focus management and scroll lock, key/scroll/resize listeners, `scrollIntoView` of an active option or heading, URL sync via `history.replaceState`, custom events, the `--tray-h` variable |
| `components/three/scene/stage.ts`, `components/three/scene/hostObservers.ts`, `lib/threeUtils.ts` | Legitimate: WebGL canvas creation, device pixel ratio, visibility pausing |

All of these run in `'use client'` modules or effects (never during server rendering). No UI is built
by DOM manipulation.

### 2.6 JavaScript files (`*.js`, `*.jsx`, `*.mjs`, `*.cjs`; excluding `node_modules`, `.next*`)

`app/`, `components/` and `lib/`: **0** JavaScript files (`allowJs: false`). The remaining JavaScript is
Node/browser tooling outside the application source and stays JavaScript by decision:

| File(s) | Classification |
| --- | --- |
| `react-version/eslint.config.mjs`, `react-version/postcss.config.mjs` | Tool configuration (ESLint flat config, PostCSS for Tailwind) |
| `react-version/scripts/render-studio/{main,shots,geometry,textures,accumulator}.js` | Build tooling: browser ES modules loaded into Chromium by `scripts/render-stills.mts` to render the original product stills; never bundled into the site |
| `scripts/*.js`, `scripts/lib/app-modules.js`, `src/scoreEngine.js`, `src/api/scoreTraceHandler.js`, `src/ingest/*.js` (repository root) | Root Node CLI and test tooling (`npm test` at the root): ingest, catalog verification, RTINGS sync, demo API and the root copy of the engine that `scripts/test-score-engine.js` checks byte-for-byte against `react-version/lib/scoreEngine.ts`. `scripts/lib/app-modules.js` loads `react-version/lib/*.ts` through Node type stripping. Typed contracts are in `src/contracts/*.ts` (root `npm run typecheck`). |

Converted in the final pass: `lib/comparePairs.js` -> `.ts`, `lib/comparePairs.data.mjs` -> `.mts`,
`lib/categoryPages.js` -> `.ts`, `lib/deviceStorage.js` -> `.ts`, `components/ui/Section.jsx` -> `.tsx`,
`next.config.mjs` -> `next.config.mts`, `vitest.config.ts` -> `vitest.config.mts` (removes Vite's
"ESM syntax in a file loaded as CommonJS" warning). The empty leftover directory `Mattres/` at the
repository root was removed.

---

## 3. Legacy `index.html` feature audit

### 3.1 Feature parity

| Legacy feature | Next.js implementation | Status |
| --- | --- | --- |
| Hero ("Your Sleep DNA finds the perfect mattress", WebGL particle canvas) | `components/home/HomeHero` (original renders, scroll-linked), lazy `components/three/MattressViewer` | PASS |
| "Sleep journey in 4 steps" | Homepage chapters 01-06 (`ChapterRail`, `Chapter`) | PASS |
| Match Score ring, six-category bars, radar, matched-mattress panel | `ScoreRing`, `ScoreBars`, `components/match/MatchReveal`, `MatchResults` | PASS |
| "Why this mattress matches you" reasoning list | `lib/explain.ts` reasons / watch-outs rendered in results and product pages | PASS |
| X-ray layers view (layer buttons, scroll-linked explode) | `components/home/InspectChapter` + `MattressViewer` x-ray mode | PASS |
| Find-match form (position, weight, firmness, temperature, more options: motion, budget) | `/find-match` quiz (`components/match/*`), validated by `lib/profileValidation.ts`, scored by `POST /api/match` | PASS |
| Results grid with compare checkboxes, comparison tray and table | `CompareToggle`, `CompareTray`, `/compare` workspace and `ComparisonTable` | PASS |
| `sessionStorage` `mms_last_result` reused on the home page | Same key via `lib/useLastResult.ts` | PASS |
| Methodology (six categories, four steps, risk flags, data sources, version history) | `/methodology` (`components/trust/*`, weight explorer) | PASS |
| Affiliate and sponsored disclosures | `/disclosures`, `CommissionLine`, `lib/outbound.ts` | PASS |
| Client-side copy of the v0.1 engine inside the HTML | Replaced by the single server engine (`lib/scoreEngine.ts`, v0.1 byte-identical + v0.2) | PASS |
| three.js r128 from a CDN | `three@0.186` from npm, lazy-loaded, WebGL/GPU-tier/reduced-motion fallbacks | PASS |

### 3.2 Intentionally not migrated (gaps by decision)

| Legacy content | Reason |
| --- | --- |
| Compare page products "Aurora Hybrid", "Cloudline Original", "TerraFoam Cool" with prices ($899, $749, $679) and an inline `CATALOG` containing them | Fabricated products and prices; violates the no-invented-data rule. The real catalog (37 mattresses, 17 brands) replaces it. |
| "Sleep DNA" orb with demo values and a "demo" badge | Sample numbers presented as a profile; the real profile summary appears after the quiz |
| "Mattress Universe" 3D star map | Plotted the fictional catalog; catalog browsing is `/mattresses` and the category pages |
| Owl mascot illustrations | Decorative character art outside the approved visual direction (original mattress/bedding renders only) |
| Height field on the form | Collected but never read by any engine version |

---

## 4. TypeScript foundation

| Item | Decision | Status |
| --- | --- | --- |
| Packages | `typescript ~5.9.3` (typescript-eslint supports `<6.1`), `@types/react ~19.2`, `@types/react-dom ~19.2`, `@types/node ^22`, `@types/three ^0.186` | PASS |
| `tsconfig.json` | `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, **`allowJs: false`**, `allowImportingTsExtensions` (with `noEmit`; needed because `next.config.mts` is loaded by Node's native TypeScript loader, which resolves `./lib/comparePairs.data.mts` literally), `moduleResolution: bundler`, `isolatedModules`, `resolveJsonModule`, `paths @/*`, Next plugin. `jsx` is `react-jsx` (Next 16 mandatory). Stale `.next-mig-*` include globs removed. | PASS |
| `next.config.mts` | Typed `NextConfig`; `.mts` per the Next docs recommendation for CommonJS packages, so Node does not reparse it (no `MODULE_TYPELESS_PACKAGE_JSON` warning) | PASS |
| `jsconfig.json` | Removed (paths moved to `tsconfig.json`, per Next docs) | PASS |
| `next-env.d.ts` | Generated by `next typegen` / `dev` / `build`, gitignored, not edited (per Next docs) | PASS |
| Scripts | `typecheck`: `next typegen && tsc --noEmit` | PASS |
| ESLint | `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`; `no-unused-vars` ignores rest siblings and `_` args. No `eslint-disable`, `@ts-ignore`, `@ts-expect-error` or `@ts-nocheck` anywhere in `app/`, `components/`, `lib/` (the last three `react-hooks/exhaustive-deps` disables and one `no-html-link-for-pages` disable were fixed at the root: primitive effect keys in `useProfileScores`, a once-per-mattress ref in `MattressViewed`, the option id computed in the `SearchDialog` effect, `next/link` in `global-error`) | PASS |
| Vitest | `vitest.config.mts`; includes `*.test.{js,ts,tsx}`; source-scanning tests accept `.ts/.tsx` | PASS |
| Domain types | `lib/types.ts` (now also `PairClaims`, `PairSpotlight`; `CategoryPage.rankingProfile` is `SleepProfile | null`, matching the registry) | PASS |

---

## 5. Status by area (final, 2026-10-08)

Verified on a clean tree: `rm -rf .next`, then lint, typecheck, unit tests, production build, end-to-end suite
and the repo-root suite, in that order. Counts are from the commands in section 7.

| Area | Status | Evidence |
| --- | --- | --- |
| HTML migration | PASS | 0 HTML source files. The legacy `index.html` prototype was audited feature by feature (3.1), then deleted. |
| CSS migration | PASS | 1 global stylesheet (`app/globals.css`, 860 lines: Tailwind theme import, design tokens, section moods, base and editorial typography, shared form primitives, view-transition and reduced-motion rules) plus 69 co-located CSS Modules. No `legacy.css` / renamed copy. Section 8 of `globals.css` had its unused `.choice*` family, `.auto-grid`, `.display-accent` and `.visually-hidden` alias removed after a template-name check. |
| React routes | PASS | 19 page routes, 7 route handlers (1.3 lists each). Every nav, footer, sitemap and search link resolves (`npm run test:routes` and the e2e link crawl). |
| Components | PASS | 403 `.ts/.tsx` files in `app/`, `components/`, `lib/`; 0 `.js/.jsx`. Duplicates removed in the final pass: five identical `cssVars` helpers merged into `components/ui/cssVars.ts`; `SponsoredLabel` merged into `SponsoredTag`; the legacy RTINGS normalizer, matcher and enrichment-proposal builder deleted (the pipeline in `lib/rtings/` is the only one). |
| Server / client boundaries | PASS | 92 of 403 files are `"use client"` (interaction, browser APIs, 3D); pages, data loading and static sections are server components. `server-only` guards the secret-reading modules that only Next loads (`cronAuth`, `cronGuard`, `adminAuth`, `rateLimit`, admin sync runtime). `supabaseClient`, `apifyClient` and `rtings/repository` are intentionally unguarded because the Node sync CLI imports them. |
| Typed props / strict TypeScript | PASS | `strict` + `noUncheckedIndexedAccess`, `allowJs: false`; 0 `@ts-ignore` / `@ts-expect-error` / `@ts-nocheck`. |
| Navigation | PASS | Mega menu keyboard-operable, mobile sheet is `role="dialog" aria-modal` with the rest of the page `inert`, focus trap, Esc, focus returns to the toggle (e2e `navigation`). |
| Search | PASS | Cmd/Ctrl+K dialog, combobox pattern, recent searches, content-type groups, exact brand leads (e2e + `searchIndex.test.ts`). |
| Quiz | PASS | 5-step flow, keyboard and touch, answers persisted per tab, reveal score equals `POST /api/match` (e2e `core journey`). |
| Match Score | PASS | Engine unchanged by the migration: v0.1 byte-identical regression and v0.2 suites green; repo-root engine, ingest, trace and RTINGS suites green. |
| Product pages | PASS | 37 static pages; credited RTINGS photo where eligible, labeled render otherwise; honest "Not yet verified" states; outbound-link rel/target audited on every product page. |
| Compare | PASS | Up to 3, persistent tray, `/compare?ids=`, topic and head-to-head pages, reversed-pair 308 redirects. |
| 3D | PASS | `three` only in lazily loaded chunks; static poster fallback; WebGL tiers; reduced-motion respected; no three.js in any route's first-load JS (build manifest check). |
| Motion | PASS | One motion system (`components/motion/*`); all transform/opacity; reduced-motion project in e2e. |
| SEO | PASS | Per-route title, description (product and brand descriptions clamped to about 158 characters), canonical, Open Graph, Twitter, JSON-LD (Organization, WebSite, Product without invented offers, Article, BreadcrumbList, FAQPage); sitemap covers every real route; 404 has a single robots tag and no inherited `og:url`. |
| Accessibility | PASS | Lighthouse Accessibility 100 on all 7 key routes at mobile and desktop; axe runs in earlier certification rounds; keyboard paths covered by e2e. |
| Responsive | PASS | 1920 / 1440 / 1024 / 820 / 390 screenshots reviewed; every e2e project checks no horizontal overflow at 390. |
| Performance | PASS with note | Desktop Lighthouse performance 99-100. Mobile real-throttled (DevTools) LCP 1.5-2.0 s, performance 98-100. Lighthouse's pessimistic *simulated* slow-4G run scores mobile 84-94 (LCP 2.9-4.4 s); that is the one number above the 2.5 s budget and is listed as a known limitation in `COMPLETION_MATRIX.md`. |
| Security | PASS | `npm audit --omit=dev`: 0 vulnerabilities (Next 16.3.8). Secret scan: Apify token, Supabase key, cron and admin secrets are absent from `.next/static` and from the repository except the git-ignored `.env.local`. CSP is enforced (not report-only) and allows exactly one third-party image host. Admin and cron routes fail closed. No login, signup or account code. |
| Testing | PASS | Lint 0 problems; typecheck 0 errors; 845 unit tests in 67 files; 86 end-to-end tests (desktop, mobile, reduced-motion); repo-root suite passes (engine 12, ingest 9, trace 6, RTINGS 4, then the 845 again, then the contracts typecheck). `data/` unchanged by the test run. |
| Dead code | PASS | See Components. 9 unused globals removed; unused dependencies removed (`cn`, `radix-ui`, `shadcn`, `class-variance-authority`, `tw-animate-css`) with the stale `components.json`; scaffold SVGs and `public/mx.html` deleted. `grep -rniE "example\.com|unsplash|lorem"` finds only two deliberate "foreign domain" cases in the RTINGS validation fixture. |

### Remaining items (stated, not hidden)

- The Node CLI copy of the engine (`src/scoreEngine.js`, `data/rules/`) and the repo-root `scripts/*.js` are tooling outside the app. They stay JavaScript; a parity test keeps `src/scoreEngine.js` identical to the app engine. Unifying them behind Node's type stripping is a follow-up, not a launch blocker.
- `e2e/serve.mjs` is a 40-line Node server for the test run, not application code.

---

## 6. Conventions

- Types come from `lib/types.ts`; do not redeclare catalog, engine or explanation shapes.
- A component's styles live in `<Component>.module.css` beside it, wrapped in
  `@layer components { ... }` so it keeps the cascade position the global rules had (unlayered
  feature modules still override it, Tailwind utilities still win).
- Translate selectors one-to-one so specificity does not change. When a parent needs to style a
  child component, the child exposes a rule-free hook class (`btn`, `mattress-render`,
  `mattress-render--fill`, `mattress-render__caption`, `product-card`, `product-card__media`,
  `score-ring` + `data-size`, `score-bars`, `score-bar__fill`, `score-bars__note`, `data-value`,
  `data-value--missing`, `compare-toggle__btn`, `compare-toggle__box`, `slider`, `slider__head`,
  `slider__track`, `slider__foot`, `slider-controls__btn`, `device-data*`) and the parent targets it
  with `:global(.hook)`.
- IDs inside a module selector are localized by CSS Modules: wrap document IDs in `:global()`.
- For a plain element that must look like a primitive, use the exported class helpers
  (`buttonClassName`, `badgeClassName`, `iconButtonClassName`, `missingValueClassName`,
  `revealClassName`) instead of literal class strings.
- Inline `style` only for runtime values (prefer a CSS custom property).
- `lib/comparePairs.data.mts` is loaded by `next.config.mts` through Node's native type stripping:
  keep it free of runtime imports and non-erasable TypeScript (no enums, namespaces or parameter
  properties). The same rule applies to `components/three/layers.ts`, which `scripts/render-stills.mts`
  serves to the render studio.
- Root Node scripts load `react-version/lib/*.ts` through `scripts/lib/app-modules.js` (Node >= 22.18
  type stripping) and read `lib/rules/*.json` and the catalog JSON.

## 7. Commands behind the counts

```bash
find . -type f \( -name "*.html" -o -name "*.htm" \) -not -path "*/node_modules/*" -not -path "*/.next*" -not -path "./.git/*"   # 0 results
find . -type f \( -name "*.css" -o -name "*.scss" -o -name "*.sass" -o -name "*.less" \) -not -path "*/node_modules/*" -not -path "*/.next*" -not -path "./.git/*"   # 70: globals.css + 69 modules
find react-version/app react-version/components react-version/lib \( -name "*.js" -o -name "*.jsx" \)   # 0
grep -rn "dangerouslySetInnerHTML" react-version/app react-version/components   # JsonLd.tsx only (JSON.stringify payload, `<` escaped)
grep -rn "innerHTML" react-version/app react-version/components react-version/lib   # 0 outside tests
grep -rn "style={{" react-version/app react-version/components   # 43: runtime values via cssVars() custom properties and per-item sizing
```
