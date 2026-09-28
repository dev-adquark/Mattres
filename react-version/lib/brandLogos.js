/**
 * Real brand -> real official domain, so every brand name shown on the
 * site can carry that brand's actual logo (fetched live from its own
 * domain via a public logo service), never an invented or placeholder
 * image. The 17 catalog-brand entries are the exact host of each real
 * `officialProductUrl` already on file in lib/data/mattress-catalog.json
 * - not guessed. The extra names below (used only by the decorative
 * brand marquee, not by any catalog entry) are other well-known, real
 * mattress companies' well-known domains.
 *
 * Novaform is mapped to its brand storefront domain; Molecule remains
 * intentionally omitted until its official domain is confirmed.
 */
export const BRAND_DOMAINS = {
  Avocado: 'avocadogreenmattress.com',
  Bear: 'bearmattress.com',
  'Big Fig': 'bigfigmattress.com',
  Birch: 'birchliving.com',
  'Brooklyn Bedding': 'brooklynbedding.com',
  Novaform: 'novaformcomfort.com',
  Casper: 'casper.com',
  DreamCloud: 'dreamcloudsleep.com',
  Helix: 'helixsleep.com',
  Leesa: 'leesa.com',
  PlushBeds: 'plushbeds.com',
  Purple: 'purple.com',
  Saatva: 'saatva.com',
  'Silk & Snow': 'silkandsnow.com',
  'Sleep On Latex': 'sleeponlatex.com',
  'Tempur-Pedic': 'tempurpedic.com',
  'Tuft & Needle': 'tuftandneedle.com',
  // Real mattress brands referenced only in the decorative brand
  // marquee (not currently in the scored catalog).
  Nectar: 'nectarsleep.com',
  WinkBed: 'winkbeds.com',
  Layla: 'laylasleep.com',
  GhostBed: 'ghostbed.com',
  Nolah: 'nolahmattress.com',
  Amerisleep: 'amerisleep.com',
  Awara: 'awarasleep.com',
  'Nest Bedding': 'nestbedding.com',
  Zinus: 'zinus.com',
};

export function brandDomain(brand) {
  return BRAND_DOMAINS[brand] || null;
}

/**
 * Google's public favicon endpoint returns that domain's real, current
 * site icon fetched live from the domain itself - not a file this
 * project stores or could get stale/wrong, and never a stand-in image.
 * Chosen over other public logo-lookup services (e.g. Clearbit) after
 * confirming in this project's own sandbox that its domain is
 * unreachable here (`Could not resolve host: logo.clearbit.com`) while
 * Google's is reachable - some networks/firewalls block third-party
 * data-enrichment domains like Clearbit's, so this is also the safer
 * default for a production audience with varied network policies.
 */
export function brandLogoUrl(brand, size = 64) {
  const domain = brandDomain(brand);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}` : null;
}
