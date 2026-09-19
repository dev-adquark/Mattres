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
