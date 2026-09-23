/**
 * Config-driven brand-collaboration slot. Every field here is generic
 * placeholder data on purpose - swapping in a real partner later means
 * editing this object (or wiring it to a CMS/API), never touching
 * BrandCollabSlot.jsx or any page that renders it.
 */
export const brandCollab = {
  active: true,
  brandName: 'Partner Brand',
  brandLogoInitial: 'P',
  headline: 'A limited collaboration is coming',
  body: 'We partner with a small number of mattress makers each season to spotlight a single design in depth. This slot is reserved for that feature.',
  productImageAlt: 'Placeholder product artwork',
  ctaLabel: 'Get notified',
  ctaHref: '/find-match',
  accent: {
    from: 'var(--electric-500)',
    to: 'var(--violet-500)',
  },
};

/**
 * Generic placeholder partner list for the brand marquee strip. Real
 * partner names/links later means editing this array, not the
 * BrandMarquee component - same swap-via-config principle as
 * brandCollab above.
 */
export const brandPartners = [
  { name: 'Northline Sleep Co.' },
  { name: 'Aurora Bedding' },
  { name: 'Cedar & Stone' },
  { name: 'Drift Supply' },
  { name: 'Haven Mattress Lab' },
  { name: 'Solace Home' },
  { name: 'Restwell Studio' },
  { name: 'Nightfall & Co.' },
];

/**
 * A small grid of additional promo/collaboration cards, for the pages
 * that want more of this density than the single brandCollab slot.
 * Every entry here is invented placeholder content - none of these are
 * real brands, offers, or partnerships. Each card is rendered with an
 * explicit "Placeholder - demo content" label (see PromoGrid.jsx) so
 * nothing on the page could be mistaken for a real promotion.
 */
export const promoCards = [
  {
    id: 'seasonal-drop',
    kicker: 'Seasonal collaboration',
    title: 'A cooling-focused drop, once a year',
    body: 'Each summer we work with one maker to spotlight a mattress built specifically for hot sleepers.',
    ctaLabel: 'See cooling picks',
    ctaHref: '/find-match',
    icon: 'snow',
    accent: { from: 'var(--cyan-400)', to: 'var(--electric-500)' },
  },
  {
    id: 'featured-partner',
    kicker: 'Featured partner',
    title: 'One mattress, reviewed in depth',
    body: 'A single design gets the full treatment: real scores, a full X-Ray breakdown, and verified reviews.',
    ctaLabel: 'View methodology',
    ctaHref: '/methodology',
    icon: 'star',
    accent: { from: 'var(--violet-500)', to: 'var(--magenta-400)' },
  },
  {
    id: 'trial-extension',
    kicker: 'Limited offer slot',
    title: 'Extended trial periods, when available',
    body: 'Some partners occasionally extend their home-trial window through this site. Terms vary by mattress.',
    ctaLabel: 'Compare trial terms',
    ctaHref: '/compare',
    icon: 'gift',
    accent: { from: 'var(--teal-400)', to: 'var(--teal-600)' },
  },
];
