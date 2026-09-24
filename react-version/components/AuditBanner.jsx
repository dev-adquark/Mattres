/**
 * Renders the honest summary matchProfile() computes on every request
 * (lib/dataIntegrity.js's auditCatalog) - never a static claim, always
 * the real current verified/unverified count for whatever catalog is
 * actually loaded.
 */
export default function AuditBanner({ audit }) {
  if (!audit || audit.total === 0) return null;

  return (
    <div className="audit-banner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      </svg>
      <span>
        <b>
          {audit.verifiedCount} of {audit.total}
        </b>{' '}
        catalog entries are verified (real sourceUrl + last-verified date on file). Brand and model names shown are
        real, but the specific specs, prices, and scores for the remaining <b>{audit.unverifiedCount}</b> have not
        been independently confirmed against the manufacturer or retailer — treat those numbers as placeholders
        until verification is added. No result is shown as verified unless it actually is.
      </span>
    </div>
  );
}
