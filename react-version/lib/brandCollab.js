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
