'use client';

import { useRef, useState } from 'react';

/**
 * Collapses everything below the hero behind a real "Show more" action,
 * so a first-time mobile visitor sees the hero and immediately
 * understands this is a match-score product without a long initial
 * scroll. The collapsed content still renders in the real server HTML
 * (only its visual height is constrained via CSS, nothing is unmounted
 * or excluded from the response) - a search crawler sees the exact same
 * full page a human does after clicking "Show more", so this is a UX
 * affordance, not an SEO-hiding trick.
 */
export default function HomeShowMore({ children, peekHeight = 0 }) {
  const [expanded, setExpanded] = useState(false);
  const contentRef = useRef(null);

  return (
    <div className={`home-show-more${expanded ? ' expanded' : ''}`}>
      <div
        className="home-show-more-content"
        ref={contentRef}
        style={!expanded ? { maxHeight: peekHeight } : undefined}
      >
        {children}
      </div>
      {!expanded && (
        <div className="home-show-more-bar">
          <button type="button" className="btn btn-ghost-dark home-show-more-btn" onClick={() => setExpanded(true)}>
            Show more <span aria-hidden="true">↓</span>
          </button>
        </div>
      )}
    </div>
  );
}
