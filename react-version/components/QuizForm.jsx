'use client';

import { useState } from 'react';
import OwlMascot from './OwlMascot';

const initialFields = {
  sleepPosition: '',
  weightLb: '',
  firmnessPreference: '',
  sleepTemperature: '',
  motionSensitivity: 'single',
  heightIn: '',
  budgetMin: '',
  budgetMax: '',
  painFocus: [],
  mattressTypePreference: [],
};

function toggleValue(list, value) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Real quiz form. Validates the same required fields the original project
 * required (sleep position, weight 60-500lb, firmness, temperature), builds
 * the same Sleep Profile shape the scoring engine expects, and POSTs it to
 * /api/match - the real API route that runs the real scoreEngine against
 * the real catalog. No client-side scoring logic duplicated here.
 *
 * onResult(profile, apiResponse) is called with the real API response on
 * success. This component owns only form state/validation/the network
 * call, not what happens with the result - that's the page's job.
 */
export default function QuizForm({ onResult, onSubmittingChange }) {
  const [fields, setFields] = useState(initialFields);
  const [errors, setErrors] = useState([]);
  const [invalidKeys, setInvalidKeys] = useState([]);
  const [showMore, setShowMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);

  function setField(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function validate() {
    const errs = [];
    const invalid = [];
    if (!fields.sleepPosition) {
      errs.push('Choose a sleep position.');
      invalid.push('sleepPosition');
    }
    const weight = parseFloat(fields.weightLb);
    if (!fields.weightLb || Number.isNaN(weight) || weight < 60 || weight > 500) {
      errs.push('Enter a weight between 60 and 500 lb.');
      invalid.push('weightLb');
    }
    if (!fields.firmnessPreference) {
      errs.push('Choose a firmness preference.');
      invalid.push('firmnessPreference');
    }
    if (!fields.sleepTemperature) {
      errs.push('Choose how you sleep, temperature-wise.');
      invalid.push('sleepTemperature');
    }
    return { errs, invalid };
  }

  function buildProfile() {
    const heightIn = fields.heightIn ? parseFloat(fields.heightIn) : undefined;
    const budgetMin = fields.budgetMin ? parseFloat(fields.budgetMin) : undefined;
    // See app/api/match/route.js: an unbounded max must be omitted
    // (undefined), never Infinity - Infinity isn't valid JSON and would
    // silently become null after this profile is POSTed over real HTTP.
    const budgetMax = fields.budgetMax ? parseFloat(fields.budgetMax) : undefined;
    const budgetUsd = budgetMin !== undefined || budgetMax !== undefined ? { min: budgetMin ?? 0, max: budgetMax } : undefined;

    return {
      profileId: `browser_${Date.now().toString(36)}`,
      sleepPosition: fields.sleepPosition,
      weightLb: parseFloat(fields.weightLb),
      preferredFirmnessLabel: fields.firmnessPreference,
      sleepTemperature: fields.sleepTemperature,
      motionSensitivity: fields.motionSensitivity,
      painFocus: fields.painFocus,
      heightIn,
      mattressTypePreference: fields.mattressTypePreference,
      budgetUsd,
      source: 'full',
      createdAt: new Date().toISOString(),
    };
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const { errs, invalid } = validate();
    setErrors(errs);
    setInvalidKeys(invalid);
    setApiError(null);
    if (errs.length) {
      document.getElementById(`f-${invalid[0]}`)?.focus();
      return;
    }

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

  function handleClear() {
    setFields(initialFields);
    setErrors([]);
    setInvalidKeys([]);
    setApiError(null);
  }

  const fieldClass = (key) => `form-field${invalidKeys.includes(key) ? ' field-invalid' : ''}`;

  return (
    <form className="match-form" noValidate onSubmit={handleSubmit}>
      {(errors.length > 0 || apiError) && (
        <div className="form-error" role="alert">
          {apiError ? (
            <strong>{apiError}</strong>
          ) : (
            <>
              <strong>Please fix the following:</strong>
              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="form-grid">
        <div className={fieldClass('sleepPosition')}>
          <label htmlFor="f-sleepPosition">
            Sleep position <span className="req">*</span>
          </label>
          <select
            id="f-sleepPosition"
            value={fields.sleepPosition}
            onChange={(e) => setField('sleepPosition', e.target.value)}
            required
          >
            <option value="" disabled>Choose one…</option>
            <option value="side">Side</option>
            <option value="back">Back</option>
            <option value="stomach">Stomach</option>
            <option value="combination">Combination / I move around</option>
          </select>
        </div>

        <div className={fieldClass('weightLb')}>
          <label htmlFor="f-weightLb">
            Your weight (lb) <span className="req">*</span>
          </label>
          <input
            id="f-weightLb"
            type="number"
            min="60"
            max="500"
            step="1"
            placeholder="e.g. 165"
            value={fields.weightLb}
            onChange={(e) => setField('weightLb', e.target.value)}
            required
          />
        </div>

        <div className={fieldClass('firmnessPreference')}>
          <label htmlFor="f-firmnessPreference">
            Firmness preference <span className="req">*</span>
          </label>
          <select
            id="f-firmnessPreference"
            value={fields.firmnessPreference}
            onChange={(e) => setField('firmnessPreference', e.target.value)}
            required
          >
            <option value="" disabled>Choose one…</option>
            <option value="soft">Soft</option>
            <option value="medium-soft">Medium-soft</option>
            <option value="medium">Medium</option>
            <option value="medium-firm">Medium-firm</option>
            <option value="firm">Firm</option>
            <option value="extra-firm">Extra-firm</option>
          </select>
        </div>

        <div className={fieldClass('sleepTemperature')}>
          <label htmlFor="f-sleepTemperature">
            How do you sleep, temperature-wise? <span className="req">*</span>
          </label>
          <select
            id="f-sleepTemperature"
            value={fields.sleepTemperature}
            onChange={(e) => setField('sleepTemperature', e.target.value)}
            required
          >
            <option value="" disabled>Choose one…</option>
            <option value="cold">I sleep cold</option>
            <option value="neutral">Neutral</option>
            <option value="hot">I sleep hot</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        className="more-options-toggle"
        aria-expanded={showMore}
        aria-controls="moreOptionsPanel"
        onClick={() => setShowMore((v) => !v)}
      >
        <span>More options for a better match</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {showMore && (
        <div className="more-options-panel" id="moreOptionsPanel">
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="f-motionSensitivity">Motion sensitivity</label>
              <select
                id="f-motionSensitivity"
                value={fields.motionSensitivity}
                onChange={(e) => setField('motionSensitivity', e.target.value)}
              >
                <option value="single">I sleep alone / not sensitive</option>
                <option value="couple-low">Share the bed, not easily woken</option>
                <option value="couple-high">Share the bed, easily woken by movement</option>
              </select>
            </div>

            <div className="form-field">
              <label htmlFor="f-heightIn">Height (inches)</label>
              <input
                id="f-heightIn"
                type="number"
                min="48"
                max="84"
                step="1"
                placeholder="e.g. 68"
                value={fields.heightIn}
                onChange={(e) => setField('heightIn', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Budget range (USD)</label>
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
            </div>
          </div>

          <div className="form-field">
            <label>Pain / comfort focus (optional, choose any)</label>
            <div className="checkbox-row">
              {['shoulder', 'hip', 'lowerBack', 'neck'].map((v) => (
                <label className="checkbox-pill" key={v}>
                  <input
                    type="checkbox"
                    checked={fields.painFocus.includes(v)}
                    onChange={() => setField('painFocus', toggleValue(fields.painFocus, v))}
                  />{' '}
                  {v === 'lowerBack' ? 'Lower back' : v.charAt(0).toUpperCase() + v.slice(1)}
                </label>
              ))}
            </div>
          </div>

          <div className="form-field">
            <label>Mattress type preference (optional, choose any)</label>
            <div className="checkbox-row">
              {['foam', 'hybrid', 'innerspring'].map((v) => (
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
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? (
            <>
              <span className="btn-spinner" aria-hidden="true" />
              Scoring…
            </>
          ) : (
            <>
              <OwlMascot variant="nav" idSuffix="Submit" />
              Find my matches
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </>
          )}
        </button>
        <button type="button" className="btn btn-ghost-dark" onClick={handleClear}>
          Clear answers
        </button>
      </div>
    </form>
  );
}
