'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'Is the Match Score a real calculation, or marketing?',
    a: 'It is a real, rules-based calculation — six weighted categories, computed live from your answers against the real catalog. The full methodology and current weights are public on the Guides page.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2 3 6v6c0 5.5 3.8 9.7 9 10 5.2-.3 9-4.5 9-10V6Z" />
      </svg>
    ),
  },
  {
    q: 'Do sponsored listings affect the score?',
    a: 'No. A sponsored badge only means a listing paid for placement — it never changes that mattress\u2019s real sub-scores or risk flags. See the Disclosures page for the full policy.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    q: 'Do you earn money from this site?',
    a: 'Yes, through affiliate links and some sponsored placements — always disclosed, and never a factor in the actual Match Score calculation.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v10M9.5 9.5c0-1.4 1.2-2.5 2.5-2.5s2.5.8 2.5 2c0 1.5-1.5 2-2.5 2.3-1.3.4-2.5 1-2.5 2.7 0 1.2 1.2 2 2.5 2s2.5-.9 2.5-2.3" />
      </svg>
    ),
  },
  {
    q: 'How many mattresses are in the catalog?',
    a: 'The current catalog is intentionally small and fully scored — every mattress shown has real data behind every sub-score, rather than a large catalog with gaps.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="12" width="20" height="7" rx="2" />
        <path d="M2 12v-2a3 3 0 0 1 3-3h5" />
      </svg>
    ),
  },
  {
    q: 'Can I see why a specific mattress scored the way it did?',
    a: 'Yes — the X-Ray view breaks down each layer of construction, and clicking any dimension in your Match Score jumps straight to the related layer.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
];

export default function FaqAccordion({ onLight = false }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="faq-list">
      {FAQS.map((item, i) => {
        const open = openIndex === i;
        return (
          <div className={`faq-item${onLight ? ' on-light' : ''}${open ? ' open' : ''}`} key={item.q}>
            <button
              type="button"
              className="faq-q"
              onClick={() => setOpenIndex(open ? -1 : i)}
              aria-expanded={open}
            >
              <span className="faq-q-icon" aria-hidden="true">
                {item.icon}
              </span>
              <b>{item.q}</b>
              <svg className="faq-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <div className="faq-a">
              <div className="faq-a-inner">{item.a}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
