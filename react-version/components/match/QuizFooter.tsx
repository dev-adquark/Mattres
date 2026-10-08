import { Lock } from 'lucide-react';
import { IntentLink } from '@/components/ui/IntentLink';
import { SITE_NAME } from '@/lib/site';
import styles from './Quiz.module.css';

const LINKS = [
  { href: '/methodology', label: 'How scoring works' },
  { href: '/disclosures', label: 'Disclosures' },
  { href: '/privacy#device-data', label: 'Your data' },
  { href: '/terms', label: 'Terms' },
] as const;

/**
 * Minimal footer for the immersive quiz, loading and error stages. While it
 * is on the page, Quiz.module.css hides the full marketing footer
 * ([data-site-footer]) so the flow reads as a product, not a page section;
 * the results page keeps the full footer. Keeps the trust links one tap away.
 */
export function QuizFooter({ saved = false }: { saved?: boolean }) {
  return (
    <footer className={styles.quizFooter} aria-label="Quiz footer">
      <div className={`container container--wide ${styles.quizFooterInner}`}>
        {saved ? (
          <p className={styles.saved}>
            <Lock aria-hidden="true" />
            Answers stay in this browser tab, so a refresh won’t lose them. No account, and nothing is sent until you ask for matches.
          </p>
        ) : (
          <p className={styles.saved}>© {SITE_NAME}. Same answers, same scores: the model is deterministic.</p>
        )}
        <nav aria-label="Quiz footer links">
          <ul className={styles.quizFooterLinks}>
            {LINKS.map((l) => (
              <li key={l.href}>
                <IntentLink href={l.href}>{l.label}</IntentLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
