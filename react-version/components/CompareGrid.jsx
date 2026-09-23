'use client';

import ResultCard from './ResultCard';

/**
 * The Compare page is a Server Component (it computes real scores at
 * request time via matchProfile()), but ResultCard is a Client Component
 * that expects an onCompareToggle function prop - and functions can't be
 * passed across the server/client boundary as props. This wrapper is the
 * client boundary: it receives only serializable data (results) from the
 * server, and defines the local no-op toggle itself, since this page has
 * no interactive compare-selection state (it's a fixed reference list,
 * not the quiz results grid).
 */
export default function CompareGrid({ results }) {
  function noOpToggle() {}

  return (
    <div className="compare-grid">
      {results.map((item) => (
        <ResultCard key={item.entry.id} item={item} compareChecked={false} onCompareToggle={noOpToggle} />
      ))}
    </div>
  );
}
