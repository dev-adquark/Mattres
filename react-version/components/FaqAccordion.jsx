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
  {
    q: 'What are the firmness tradeoffs I should know about?',
    a: 'Softer surfaces generally improve pressure relief but reduce edge support and can under-support heavier bodies; firmer surfaces do the reverse. The engine checks both your position/weight comfort band and your own stated preference against a mattress\u2019s real firmness rating — they can disagree, and both flags are worth reading.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 19h18M6 19V9M12 19V5M18 19v12" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    q: 'How should I actually use a trial period?',
    a: 'A trial period exists because firmness feel is genuinely subjective — no score, real or not, replaces sleeping on it. Use the full window, not just the first few nights; initial adjustment discomfort is common and doesn\u2019t always predict long-term fit.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
      </svg>
    ),
  },
  {
    q: 'What does the durability score actually predict?',
    a: 'It flags sag risk based on top-foam density relative to your body weight \u2014 a real, checkable relationship, not a guess about how many years a specific mattress will last. Lower-density foam under higher body weight is the real trigger for the DURABILITY_SAG_RISK flag.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="4" y="15" width="16" height="4" rx="1" />
        <rect x="4" y="9.5" width="16" height="4" rx="1" opacity="0.65" />
        <rect x="4" y="4" width="16" height="4" rx="1" opacity="0.4" />
      </svg>
    ),
  },
  {
    q: 'What should I actually expect from motion isolation?',
    a: 'Motion isolation matters most if you share a bed and are sensitive to a partner\u2019s movement \u2014 it\u2019s scored higher for hybrids/foam with individually-responsive layers than for traditional innersprings, which transfer motion across the whole surface more readily.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 12c2-6 4-6 6 0s4 6 6 0 4-6 6 0" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    q: 'Why does the same mattress get a different heat score for different people?',
    a: 'It doesn\u2019t \u2014 a mattress\u2019s real Heat sub-score reflects its own construction (type, cooling cover) and is the same for everyone. What changes per person is whether that real score triggers the HEAT_RETENTION_LIKELY risk flag, which only fires if you said you sleep hot.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M2 8c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" strokeDasharray="4 2" />
      </svg>
    ),
  },
  {
    q: 'What is edge support, and when does it actually matter?',
    a: 'Edge support is stability near the perimeter of the mattress \u2014 it matters most if you sit on the edge often, sleep near it, or share a bed and want the full usable surface. A reinforced perimeter (common in hybrids/innersprings, less common in all-foam) scores higher here.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4" strokeLinecap="round" strokeLinejoin="round" />
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
