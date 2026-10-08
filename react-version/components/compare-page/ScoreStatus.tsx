import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { ProfileScoreStatus } from './useProfileScores';
import styles from './Compare.module.css';

interface ScoreStatusProps {
  status: ProfileScoreStatus;
  /** Plain-language chips for the visitor's profile (profileChips). */
  chips: readonly string[];
  onRetry: () => void;
}

/** Whether the workspace's columns are scored for the visitor, and what to do if not. */
export function ScoreStatus({ status, chips, onRetry }: ScoreStatusProps) {
  if (status === 'ready') {
    return (
      <div className={styles.scoreStatus}>
        <p className={styles.scoreStatusTitle}>Scored for your profile</p>
        <ul className={styles.profileChips} aria-label="Your sleep profile">
          {chips.slice(0, 5).map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </div>
    );
  }
  if (status === 'loading' || status === 'pending') {
    // Same shape as the "no profile" state (a line of text, then a small button), so the table
    // below doesn't jump when the check resolves after hydration (CLS).
    return (
      <div className={styles.scoreStatus} role="status">
        <p className={styles.scoreStatusTitle}>Checking for your sleep profile…</p>
        <Skeleton width="10rem" height="40px" className={styles.statusSkeleton} />
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className={styles.scoreStatus} role="alert">
        <p className={styles.scoreStatusTitle}>We couldn’t score these for your profile just now.</p>
        <button type="button" className={styles.textBtn} onClick={onRetry}>
          <RotateCcw aria-hidden="true" />
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className={styles.scoreStatus}>
      <p className={styles.scoreStatusTitle}>No sleep profile yet, so no Match Scores.</p>
      <Button href="/find-match" size="sm" arrow>
        Find My Match
      </Button>
    </div>
  );
}
