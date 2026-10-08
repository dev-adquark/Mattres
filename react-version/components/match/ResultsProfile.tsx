'use client';

import { Pencil, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Explanation, ScoreVersion, SleepProfile } from '@/lib/types';
import { RememberToggle } from './RememberToggle';
import { POSITIONS, WEIGHT_BANDS, optionLabel, parseExactWeight, profileChips, type QuizAnswers } from './quizModel';
import styles from './Results.module.css';

type ProfileFactor = Explanation['profileFactors'][number];

/** The position factor's label, using the range the visitor chose rather than the representative weight sent to the engine. */
function factorLabel(factor: ProfileFactor, answers: QuizAnswers): string {
  if (factor.id !== 'position' || parseExactWeight(answers.weightExact).value != null) return factor.label;
  const pos = optionLabel(POSITIONS, answers.position);
  const band = optionLabel(WEIGHT_BANDS, answers.weightBand);
  return pos && band ? `${pos} sleeper, ${band}` : factor.label;
}

interface ResultsProfileProps {
  answers: QuizAnswers;
  profile: SleepProfile;
  scoreVersion: ScoreVersion | null;
  /** explanation.profileFactors of the top match (engine output). */
  factors: readonly ProfileFactor[];
  onEdit: (step: number) => void;
  onRestart: () => void;
}

/** "Your sleep profile": editable answer chips, edit/restart, the opt-in remember toggle, and how the answers shaped the score. */
export function ResultsProfile({ answers, profile, scoreVersion, factors, onEdit, onRestart }: ResultsProfileProps) {
  const chips = profileChips(answers);
  return (
    <section className={`section section--editorial section--tight ${styles.profile}`} aria-labelledby="profile-title">
      <div className={`container container--wide ${styles.profileGrid}`}>
        <div>
          <p className="eyebrow">Your answers</p>
          <h2 id="profile-title" className={styles.sectionTitle}>
            Your sleep profile
          </h2>
          <ul className={styles.chips} aria-label="Your answers. Select one to change it.">
            {chips.map((c) => (
              <li key={c.id}>
                <button type="button" className={`chip ${styles.chip}`} onClick={() => onEdit(c.step)}>
                  <span>{c.label}</span>
                  <Pencil aria-hidden="true" />
                  <span className="sr-only"> (edit)</span>
                </button>
              </li>
            ))}
          </ul>
          <div className={styles.profileActions}>
            <Button variant="secondary" icon={<Pencil aria-hidden="true" />} onClick={() => onEdit(0)}>
              Edit answers
            </Button>
            <Button variant="ghost" icon={<RotateCcw aria-hidden="true" />} onClick={onRestart}>
              Start over
            </Button>
          </div>
          <RememberToggle profile={profile} scoreVersion={scoreVersion} />
        </div>
        {factors.length ? (
          <div>
            <h3 className={styles.factorsTitle}>How your answers shaped the score</h3>
            <ul className={`rule-list ${styles.factors}`}>
              {factors.map((f) => (
                <li key={f.id}>
                  <strong>{factorLabel(f, answers)}</strong>
                  <span>{f.text}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
