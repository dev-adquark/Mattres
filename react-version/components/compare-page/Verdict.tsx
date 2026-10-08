import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight, Scale } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RiskFlagList } from '@/components/ui/RiskFlagList';
import { tierFor } from '@/lib/scoreTiers';
import { columnName } from './compareModel';
import type { CompareColumn, CompareVerdict, VerdictAudience, VerdictDifference } from './types';
import styles from './Compare.module.css';

interface VerdictProps {
  columns: readonly CompareColumn[];
  /** compareVerdict(columns). */
  verdict: CompareVerdict;
  audience?: VerdictAudience;
  /** id for the section's h2 (used by aria-labelledby). */
  headingId: string;
}

type WinnerVerdict = Extract<CompareVerdict, { kind: 'winner' }>;
type TieVerdict = Extract<CompareVerdict, { kind: 'tie' }>;

interface PanelProps {
  eyebrow: string;
  headingId: string;
  audience: VerdictAudience;
  byId: ReadonlyMap<string, CompareColumn>;
}

/**
 * "Best for you" - the verdict, rendered from compareVerdict() output and the
 * engine's own explanation of the winner. It never names a winner the engine
 * didn't produce: a shared top score is reported as a tie, and without a
 * sleep profile there is no winner at all.
 */
export function Verdict({ columns, verdict, audience = 'you', headingId }: VerdictProps) {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const panel: PanelProps = { eyebrow: audience === 'demo' ? 'Top pick for this profile' : 'Best for you', headingId, audience, byId };

  let main: ReactNode;
  if (verdict.kind === 'winner') main = <WinnerPanel {...panel} verdict={verdict} />;
  else if (verdict.kind === 'tie') main = <TiePanel {...panel} verdict={verdict} />;
  else main = <NoProfilePanel {...panel} />;

  const diffs = verdict.differences || [];
  return (
    <div className={styles.verdict}>
      {main}
      {diffs.length > 1 ? <Differences diffs={diffs} /> : null}
    </div>
  );
}

function WinnerPanel({ eyebrow, headingId, audience, byId, verdict }: PanelProps & { verdict: WinnerVerdict }) {
  const winner = byId.get(verdict.winnerId);
  const runner = byId.get(verdict.runnerUpId);
  if (!winner || !runner) return null;
  const ex = winner.item ? winner.item.explanation : null;
  const reasons = (ex ? ex.reasons : []).slice(0, 3);
  const watch = ex ? ex.watchOuts : [];
  const tier = tierFor(verdict.score).label;
  return (
    <div className={styles.verdictMain}>
      <div className={styles.verdictScore}>
        <span className="numeral" aria-hidden="true">
          {verdict.score}
        </span>
        <span className={styles.verdictTier}>{tier}</span>
      </div>
      <div className={styles.verdictCopy}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={headingId} className="h1">
          {columnName(winner.entry)}
        </h2>
        <p className="sr-only">
          Match score {verdict.score} out of 100, {tier}.
        </p>
        {ex && ex.headline ? <p className="lead">{ex.headline}</p> : null}
        <p className={styles.verdictMargin}>
          {verdict.margin} {verdict.margin === 1 ? 'point' : 'points'} ahead of {columnName(runner.entry)} ({verdict.runnerUpScore}).
          {verdict.margin <= 2 ? ' That is a narrow lead, so weigh the differences below as much as the score.' : null}
        </p>
        {reasons.length ? (
          <>
            <h3 className={styles.verdictSub}>{audience === 'demo' ? 'Why it fits this profile' : 'Why it fits you'}</h3>
            <ul className={styles.reasonList}>
              {reasons.map((r) => (
                <li key={`${r.dimension}-${r.text.slice(0, 24)}`}>{r.text}</li>
              ))}
            </ul>
          </>
        ) : null}
        {watch.length ? (
          <>
            <h3 className={styles.verdictSub}>Watch out for</h3>
            <RiskFlagList flags={watch} />
          </>
        ) : null}
        <div className={styles.verdictActions}>
          <Button href={`/mattress/${winner.entry.id}`} variant="onDark" arrow>
            See {columnName(winner.entry)}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TiePanel({ eyebrow, headingId, audience, byId, verdict }: PanelProps & { verdict: TieVerdict }) {
  const names = verdict.tiedIds.flatMap((id) => {
    const col = byId.get(id);
    return col ? [columnName(col.entry)] : [];
  });
  return (
    <div className={styles.verdictMain}>
      <div className={styles.verdictScore}>
        <Scale aria-hidden="true" className={styles.verdictIcon} strokeWidth={1.25} />
      </div>
      <div className={styles.verdictCopy}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={headingId} className="h1">
          No single winner: a tie at {verdict.score}.
        </h2>
        <p className="lead">
          {listJoin(names)} get the same Match Score for {audience === 'demo' ? 'this profile' : 'your profile'}. We won&apos;t break the tie by
          hand. The rows where they differ are the better guide.
        </p>
      </div>
    </div>
  );
}

function NoProfilePanel({ eyebrow, headingId }: PanelProps) {
  return (
    <div className={styles.verdictMain}>
      <div className={styles.verdictScore}>
        <Scale aria-hidden="true" className={styles.verdictIcon} strokeWidth={1.25} />
      </div>
      <div className={styles.verdictCopy}>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={headingId} className="h1">
          No winner without your sleep profile.
        </h2>
        <p className="lead">
          A Match Score depends on how you sleep: position, weight, firmness preference, temperature and whether you share the bed. Answer those
          once and every mattress here gets a score, with the reasons behind it.
        </p>
        <div className={styles.verdictActions}>
          <Button href="/find-match" variant="onDark" arrow magnetic>
            Find My Match
          </Button>
        </div>
      </div>
    </div>
  );
}

function Differences({ diffs }: { diffs: readonly VerdictDifference[] }) {
  return (
    <div className={styles.diffBlock}>
      <h3 className={styles.verdictSub}>Where each one pulls ahead</h3>
      <ul className={styles.diffList}>
        {diffs.map((d) => (
          <li key={d.id}>
            <Link href={`/mattress/${d.id}`} className={styles.diffName}>
              {d.name}
              <ArrowUpRight aria-hidden="true" />
            </Link>
            {d.leads.length ? (
              <ul className={styles.diffLeads}>
                {d.leads.map((l) => (
                  <li key={l.id}>{l.text}</li>
                ))}
              </ul>
            ) : (
              <p className={styles.diffNone}>Doesn&apos;t lead outright on any row compared here.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function listJoin(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
