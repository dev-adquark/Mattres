'use client';

import { useState } from 'react';
import AmbientParticles from '@/components/AmbientParticles';
import FindMatchStats from '@/components/FindMatchStats';
import OwlMascot from '@/components/OwlMascot';
import QuizForm from '@/components/QuizForm';
import ResultsGrid from '@/components/ResultsGrid';
import SleepProfileChips from '@/components/SleepProfileChips';
import SponsorPromoStrip from '@/components/SponsorPromoStrip';
import { useLastResult } from '@/lib/useLastResult';

export default function FindMatchPage() {
  const [apiData, setApiData] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { setPayload } = useLastResult();

  function handleResult(profile, data) {
    setApiData(data);

    // Broadcast the real result to the home page's Sleep DNA / Universe /
    // Match Score sections via the same sessionStorage bridge the original
    // single-file project used - see lib/useLastResult.js for why.
    if (data.results && data.results.length) {
      const top = data.results[0];
      setPayload({
        profile,
        top,
        all: data.all,
        modelVersion: data.modelVersion,
      });
    }
  }

  return (
    <div>
      <header className="page-hero">
        <AmbientParticles className="ambient-canvas" />
        <OwlMascot variant="hero" />
        <div className="wrap">
          <span className="eyebrow">Find your match</span>
          <h1 className="ph-title">Find your perfect mattress match</h1>
          <p className="ph-sub">
            Answer a few questions and we&apos;ll score every mattress in our catalog against your sleep profile — live,
            using a real, transparent scoring engine.
          </p>
        </div>
      </header>

      <section className="section dot-grid-bg" style={{ paddingTop: 56 }}>
        <div className="wrap">
          <div className="fm-layout">
            <div className="fm-side">
              <FindMatchStats />
            </div>

            <div>
              <QuizForm onResult={handleResult} onSubmittingChange={setSubmitting} />

              {submitting && (
                <div className="scoring-state">
                  <div className="scoring-scan" aria-hidden="true" />
                  <p>Scoring every mattress in the catalog against your real profile…</p>
                </div>
              )}

              {!submitting && !apiData && (
                <div className="empty-state">
                  <OwlMascot variant="empty" />
                  <p>
                    Answer the questions above and select <strong>&ldquo;Find my matches&rdquo;</strong> to see your
                    personalized results.
                  </p>
                </div>
              )}

              {apiData && apiData.results.length === 0 && (
                <div className="no-results">
                  No mattresses in the catalog match your budget/type filters. Try widening your budget range or
                  clearing the type preference.
                </div>
              )}

              {apiData && apiData.results.length > 0 && (
                <ResultsGrid results={apiData.results} catalogAudit={apiData.catalogAudit} />
              )}
            </div>

            <div className="fm-side">
              <SleepProfileChips />
            </div>
          </div>

          <div style={{ marginTop: 48 }}>
            <SponsorPromoStrip />
          </div>
        </div>
      </section>
    </div>
  );
}
