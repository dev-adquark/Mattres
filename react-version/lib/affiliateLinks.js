/**
 * Builds a real, working UTM-tagged outbound retailer URL. This is a
 * genuine implementation of the tracking mechanism itself (source/medium/
 * campaign/content), even though the retailer names are still generic
 * placeholders (see catalog entries' retailPartners) - this project has
 * no real retailer accounts or affiliate partner IDs to attach, and does
 * not pretend otherwise. Swapping in a real affiliate network's base URL
 * and ID scheme later means changing this one function, not every call
 * site that links out to a retailer.
 */
export function buildRetailerLink(mattressId, retailerName) {
  const params = new URLSearchParams({
    utm_source: 'mattressmatchscore',
    utm_medium: 'affiliate',
    utm_campaign: mattressId,
    utm_content: retailerName.toLowerCase().replace(/\s+/g, '-'),
  });
  return `https://example.com/${encodeURIComponent(retailerName)}?${params.toString()}`;
}

/** The first retailer listed for a mattress, or null if none is on file. */
export function primaryRetailerLink(entry) {
  const retailer = entry.retailPartners?.[0];
  if (!retailer) return null;
  return { retailer, href: buildRetailerLink(entry.id, retailer) };
}
