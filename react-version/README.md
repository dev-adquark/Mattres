# Mattress Match Score — React/Next.js conversion (IN PROGRESS)

This is a from-scratch React/Next.js port of the single-file HTML site in
the repo root (`../index.html`). It is **not finished** — see the honest
status below before assuming any given page or feature works.

## Why this exists

The original site is one large (~4,600-line) static HTML file with an
embedded copy of the scoring logic (it had no server, so it had to
duplicate the real engine's rules by hand to run client-side). This
conversion is a genuine architecture upgrade, not just a reformat:

- **The real scoring engine is reused, not re-derived.** `lib/scoreEngine.js`
  is a direct port of the repo root's `src/scoreEngine.js` (same logic, same
  `lib/rules/0.1.json` dataset), called from a real Next.js API route
  (`app/api/match/route.js`) instead of being duplicated as client JS.
  One implementation now, not two that could quietly drift apart.
- Routing is real Next.js file-based routing instead of a hash router.
- Three.js scenes are proper React components with lifecycle-managed
  cleanup (dispose renderer/geometry, remove listeners on unmount) —
  the original never needed this since it was a single page that never
  unmounted its canvases; this version does need it, since navigating
  between routes really unmounts things.

## What's actually done (build-verified, not just written)

- Project scaffold, Three.js installed, real scoring engine + API route
- All of the original site's CSS ported into `app/globals.css`
- `Nav`, `Footer`, `AnimatedLogo`, `OwlMascot`, `SleeperCharacter`,
  `AmbientParticles`, `MattressThumb`, `ScrollReveal`
- All three Three.js scenes: `DnaHelixScene`, `ScoreCoreScene` (exposes
  `pulse()` via ref), `MattressUniverseScene` (click-to-inspect panel
  rebuilt as real React state instead of raw `innerHTML`)
- `useLastResult` — a `sessionStorage`-backed hook so a quiz result can
  reach the home page's Universe/Match Score sections from the
  `/find-match` route after a real navigation, replacing the original's
  single-page `sessionStorage` bridge
- `npm run build` succeeds

## What's NOT done yet

- No actual page routes exist yet beyond a placeholder `app/page.js`
- No six-dimension illustrated gallery, no X-Ray pinned-scroll section,
  no matched-mattress panel
- No quiz form, no results grid, no comparison table wiring to the new
  `/api/match` route
- `/find-match`, `/compare`, `/methodology`, `/disclosures` routes don't
  exist yet
- **No dev-server or Playwright testing has been done on this folder at
  all** beyond confirming `npm run build` compiles. Nothing here should be
  assumed to render or behave correctly yet.

## A real limitation hit while building this

`next/font/google` (the better, self-hosting font approach) was tried
first and reverted — it needs to fetch the actual font files from Google
at *build time*, and the sandbox this was built in has no network access
to `fonts.googleapis.com`. The build failed with a 403 there. Reverted to
a plain `<link>` tag (see the comment in `app/layout.js`) so the build
could actually be verified. If your own environment has normal internet
access, switching back to `next/font/google` is a worthwhile upgrade —
just confirm the build succeeds in your environment first, since it
could not be confirmed here.

## Running it

```bash
cd react-version
npm install
npm run dev
```
