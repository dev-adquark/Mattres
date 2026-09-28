'use client';

import { useState } from 'react';
import OwlMascot from './OwlMascot';

// Coarse weight ranges instead of exact entry, per the product brief.
// weightLb is each band's own lower bound (not a midpoint) - the real
// scoring engine's only continuous (non-banded) weight check is the
// durabilityHighWeightLb=200 threshold, which falls inside the 180-230
// band. A midpoint (205) would flag everyone in that band as high-weight
// even at 181 lb; the lower bound never claims a higher weight than the
// person actually confirmed, so it never over-triggers that flag. Every
// other real scoring lookup (firmnessComfortBands, weightBands itself)
// is keyed by band, not by the exact value, so this choice doesn't
// change those outcomes at all - see lib/scoreEngine.js.
const WEIGHT_BANDS = [
  { key: 'under-130', label: 'Under 130 lb', kg: 'under 59 kg', weightLb: 115 },
  { key: '130-180', label: '130–180 lb', kg: '59–82 kg', weightLb: 130 },
  { key: '180-230', label: '180–230 lb', kg: '82–104 kg', weightLb: 180 },
  { key: '230-plus', label: '230+ lb', kg: '104+ kg', weightLb: 230 },
];

const POSITIONS = [
  { value: 'side', label: 'Side' },
  { value: 'back', label: 'Back' },
  { value: 'stomach', label: 'Stomach' },
  { value: 'combination', label: 'Combination', hint: 'I move around' },
];

const FIRMNESS = [
  { value: 'soft', label: 'Soft' },
  { value: 'medium-soft', label: 'Medium-soft' },
  { value: 'medium', label: 'Medium' },
  { value: 'medium-firm', label: 'Medium-firm' },
  { value: 'firm', label: 'Firm' },
  { value: 'extra-firm', label: 'Extra-firm' },
];

const TEMPERATURE = [
  { value: 'cold', label: 'I sleep cold' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'hot', label: 'I sleep hot' },
];

const MOTION = [
  { value: 'single', label: 'I sleep alone', hint: 'or not sensitive to movement' },
  { value: 'couple-low', label: 'Share the bed', hint: 'not easily woken' },
  { value: 'couple-high', label: 'Share the bed', hint: 'easily woken by movement' },
];

const TYPE_OPTIONS = ['foam', 'hybrid', 'innerspring'];

const initialFields = {
  sleepPosition: '',
  weightBand: '',
  firmnessPreference: '',
  sleepTemperature: '',
  motionSensitivity: '',
  budgetMin: '',
  budgetMax: '',
  mattressTypePreference: [],
};

const STEPS = [
  { key: 'sleepPosition', title: 'Sleep position', why: 'Your sleep position changes which parts of your body need the most pressure relief and support.' },
  { key: 'weightBand', title: 'Body weight', why: 'Firmness and support needs change with body weight — heavier bodies generally need firmer support to stay level.' },
  { key: 'firmnessPreference', title: 'Firmness preference', why: 'This is your comfort baseline — every result is scored against how close its real firmness is to what you ask for here.' },
  { key: 'sleepTemperature', title: 'Temperature', why: 'Hot sleepers benefit from breathable covers and less heat-retaining foam — we check for that specifically.' },
  { key: 'motionSensitivity', title: 'Motion sensitivity', why: 'If a partner’s movement wakes you, motion isolation matters a lot more than if you sleep alone.' },
  { key: 'budget', title: 'Budget & type', why: 'Only mattresses inside your budget (and preferred type, if you pick one) are scored — everything else is correctly left out, never guessed at.' },
];

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Real quiz form, now a one-question-per-screen wizard. Builds the exact
 * same Sleep Profile shape the scoring engine expects (see
 * app/api/match/route.js) and POSTs it to /api/match - no client-side
 * scoring logic duplicated here. `heightIn` and `painFocus` were removed:
 * neither is read anywhere in lib/scoreEngine.js or lib/matchLogic.js
 * (confirmed by search), so collecting them was asking for data the
 * real model never uses.
 *
 * onResult(profile, apiResponse) is called with the real API response on
 * success. This component owns only wizard/form state and the network
 * call, not what happens with the result - that's the page's job.
 */
export default function QuizForm({ onResult, onSubmittingChange }) {
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState(initialFields);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  function setField(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function goNext() {
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function selectAndAdvance(key, value) {
    setField(key, value);
    goNext();
  }

  function buildProfile() {
    const band = WEIGHT_BANDS.find((b) => b.key === fields.weightBand);
    const budgetMin = fields.budgetMin ? parseFloat(fields.budgetMin) : undefined;
    // See app/api/match/route.js: an unbounded max must be omitted
    // (undefined), never Infinity - Infinity isn't valid JSON and would
    // silently become null after this profile is POSTed over real HTTP.
    const budgetMax = fields.budgetMax ? parseFloat(fields.budgetMax) : undefined;
    const budgetUsd = budgetMin !== undefined || budgetMax !== undefined ? { min: budgetMin ?? 0, max: budgetMax } : undefined;

    return {
      profileId: `browser_${Date.now().toString(36)}`,
      sleepPosition: fields.sleepPosition,
      weightLb: band ? band.weightLb : undefined,
      preferredFirmnessLabel: fields.firmnessPreference,
      sleepTemperature: fields.sleepTemperature,
      motionSensitivity: fields.motionSensitivity || 'single',
      mattressTypePreference: fields.mattressTypePreference,
      budgetUsd,
      source: 'full',
      createdAt: new Date().toISOString(),
    };
  }

  async function handleSubmit() {
    setError(null);
    setApiError(null);
    const profile = buildProfile();
    setSubmitting(true);
    onSubmittingChange?.(true);
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || 'Something went wrong scoring your profile. Please try again.');
        return;
      }
      onResult(profile, data);
    } catch {
      setApiError('Could not reach the scoring service. Check your connection and try again.');
    } finally {
      setSubmitting(false);
      onSubmittingChange?.(false);
    }
  }

  const current = STEPS[step];
  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="quiz-wizard">
      <div className="quiz-progress-head">
        <span className="quiz-step-count">
          Your Sleep Profile {step + 1} of {STEPS.length}
        </span>
        <div className="quiz-progress-segments" role="progressbar" aria-label="Sleep profile completion" aria-valuetext={'Step ' + (step + 1) + ' of ' + STEPS.length + ': ' + current.title} aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={STEPS.length}>
          {STEPS.map((s, i) => (
            <i key={s.key} className={i <= step ? 'filled' : ''} />
          ))}
        </div>
      </div>

      {(error || apiError) && (
        <div className="form-error" role="alert">
          <strong>{apiError || error}</strong>
        </div>
      )}

      <div className="quiz-step" key={current.key}>
        <h2 className="quiz-step-title">{current.title}</h2>
        <p className="quiz-why-we-ask">
          <b>Why we ask:</b> {current.why}
        </p>

        {step === 0 && (
          <div className="quiz-option-grid">
            {POSITIONS.map((o) => (
              <button
                type="button"
                key={o.value}
                className={`quiz-option-btn${fields.sleepPosition === o.value ? ' selected' : ''}`}
                aria-pressed={fields.sleepPosition === o.value}
                onClick={() => selectAndAdvance('sleepPosition', o.value)}
              >
                <span>{o.label}</span>
                {o.hint && <i>{o.hint}</i>}
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="quiz-option-grid">
            {WEIGHT_BANDS.map((b) => (
              <button
                type="button"
                key={b.key}
                className={`quiz-option-btn${fields.weightBand === b.key ? ' selected' : ''}`}
                aria-pressed={fields.weightBand === b.key}
                onClick={() => selectAndAdvance('weightBand', b.key)}
              >
                <span>{b.label}</span>
                <i>{b.kg}</i>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="quiz-option-grid quiz-option-grid-wide">
            {FIRMNESS.map((o) => (
              <button
                type="button"
                key={o.value}
                className={`quiz-option-btn${fields.firmnessPreference === o.value ? ' selected' : ''}`}
                aria-pressed={fields.firmnessPreference === o.value}
                onClick={() => selectAndAdvance('firmnessPreference', o.value)}
              >
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="quiz-option-grid">
            {TEMPERATURE.map((o) => (
              <button
                type="button"
                key={o.value}
                className={`quiz-option-btn${fields.sleepTemperature === o.value ? ' selected' : ''}`}
                aria-pressed={fields.sleepTemperature === o.value}
                onClick={() => selectAndAdvance('sleepTemperature', o.value)}
              >
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="quiz-option-grid">
            {MOTION.map((o) => (
              <button
                type="button"
                key={o.value}
                className={`quiz-option-btn${fields.motionSensitivity === o.value ? ' selected' : ''}`}
                aria-pressed={fields.motionSensitivity === o.value}
                onClick={() => selectAndAdvance('motionSensitivity', o.value)}
              >
                <span>{o.label}</span>
                {o.hint && <i>{o.hint}</i>}
              </button>
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="quiz-final-step">
            <fieldset className="form-field">
              <legend>Budget range (USD) — optional</legend>
              <div className="budget-row">
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Min"
                  aria-label="Minimum budget"
                  value={fields.budgetMin}
                  onChange={(e) => setField('budgetMin', e.target.value)}
                />
                <span>–</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  placeholder="Max"
                  aria-label="Maximum budget"
                  value={fields.budgetMax}
                  onChange={(e) => setField('budgetMax', e.target.value)}
                />
              </div>
            </fieldset>

            <fieldset className="form-field" style={{ marginTop: 18 }}>
              <legend>Mattress type preference — optional, choose any</legend>
              <div className="checkbox-row">
                {TYPE_OPTIONS.map((v) => (
                  <label className="checkbox-pill" key={v}>
                    <input
                      type="checkbox"
                      checked={fields.mattressTypePreference.includes(v)}
                      onChange={() => setField('mattressTypePreference', toggleValue(fields.mattressTypePreference, v))}
                    />{' '}
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        )}
      </div>

      <div className="quiz-nav-row">
        <button type="button" className="btn btn-ghost-dark" onClick={goBack} disabled={step === 0}>
          Back
        </button>
        {isLastStep ? (
          <button type="button" className="btn btn-primary quiz-sticky-cta" disabled={submitting} onClick={handleSubmit}>
            {submitting ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                Scoring…
              </>
            ) : (
              <>
                <OwlMascot variant="nav" idSuffix="Submit" />
                See My Matches
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary quiz-sticky-cta"
            onClick={() => {
              const requiredMissing =
                (step === 0 && !fields.sleepPosition) ||
                (step === 1 && !fields.weightBand) ||
                (step === 2 && !fields.firmnessPreference) ||
                (step === 3 && !fields.sleepTemperature);
              if (requiredMissing) {
                setError('Choose an option to continue.');
                return;
              }
              goNext();
            }}
          >
            Continue
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
