const FIRMNESS_ORDER = ['soft', 'medium-soft', 'medium', 'medium-firm', 'firm', 'extra-firm'];
const FIRMNESS_LABEL = {
  soft: 'Soft',
  'medium-soft': 'Medium-soft',
  medium: 'Medium',
  'medium-firm': 'Medium-firm',
  firm: 'Firm',
  'extra-firm': 'Extra-firm',
};
const POSITION_LABEL = { side: 'Side', back: 'Back', stomach: 'Stomach', combination: 'Combination' };
const TEMP_LABEL = { cold: 'Sleeps cold', neutral: 'Neutral', hot: 'Sleeps hot' };

// weightLb is always one of the wizard's real band lower bounds
// (115/130/180/230 - see QuizForm.jsx's WEIGHT_BANDS), so this reverse
// lookup is exact, not a guess, for every profile this component will
// ever actually receive.
function weightBandLabel(weightLb) {
  if (weightLb < 130) return 'Under 130 lb';
  if (weightLb < 180) return '130–180 lb';
  if (weightLb < 230) return '180–230 lb';
  return '230+ lb';
}

function firmnessPct(pref) {
  const i = FIRMNESS_ORDER.indexOf(pref);
  return i === -1 ? 50 : (i / (FIRMNESS_ORDER.length - 1)) * 100;
}

/**
 * Your real Sleep DNA, built only from the profile you actually
 * submitted and the real match count the API returned - no attribute
 * shown here is invented or estimated. Distinct from SleepProfileChips
 * (that's a pre-quiz "here's what a few common profiles look like"
 * teaser); this is your own result.
 */
export default function SleepDnaSummary({ profile, matchCount }) {
  if (!profile) return null;
  return (
    <div className="fm-side-card sleep-dna-summary">
      <h5>Your Sleep DNA</h5>
      <p className="sub">
        We found <b>{matchCount}</b> mattress{matchCount === 1 ? '' : 'es'} matching this profile.
      </p>

      <div className="dna-attr-row">
        <span>Position</span>
        <b>{POSITION_LABEL[profile.sleepPosition] || profile.sleepPosition}</b>
      </div>
      <div className="dna-attr-row">
        <span>Weight</span>
        <b>{weightBandLabel(profile.weightLb)}</b>
      </div>
      <div className="dna-attr-row">
        <span>Temperature</span>
        <b>{TEMP_LABEL[profile.sleepTemperature] || profile.sleepTemperature}</b>
      </div>

      <div className="dna-bar-block">
        <span className="dna-bar-label">
          Firmness <b>{FIRMNESS_LABEL[profile.preferredFirmnessLabel] || profile.preferredFirmnessLabel}</b>
        </span>
        <div className="dna-bar-track">
          <i style={{ left: `${firmnessPct(profile.preferredFirmnessLabel)}%` }} />
        </div>
        <div className="dna-bar-scale">
          <span>Soft</span>
          <span>Firm</span>
        </div>
      </div>

      {profile.budgetUsd && (
        <div className="dna-attr-row">
          <span>Budget</span>
          <b>
            {profile.budgetUsd.min ? `$${profile.budgetUsd.min}` : '$0'}
            {profile.budgetUsd.max ? `–$${profile.budgetUsd.max}` : '+'}
          </b>
        </div>
      )}
    </div>
  );
}
