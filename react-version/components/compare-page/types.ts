/**
 * Data shapes for the compare area (/compare, /compare/[topic], the
 * head-to-head pages and the modules other pages borrow from it).
 * Types only: importing this module has no runtime cost.
 */
import type {
  DimensionProvenance,
  Explanation,
  FirmnessFit,
  MattressEntry,
  ScoreCategory,
  ScoreResult,
  SubScores,
  VerificationLevel,
  WatchOutSeverity,
} from '@/lib/types';
import type { MissingKind } from '@/components/ui/DataValue';

/* ------------------------------------------------------------- columns -- */

/** An engine result without its trace (the UI never renders the trace). */
export type SlimResult = Omit<ScoreResult, 'trace'>;

/** A matchProfile() result item, trimmed for the server/client boundary. */
export interface SlimItem {
  result: SlimResult;
  explanation: Explanation | null;
  dataProvenance: Record<string, string> | null;
  verificationLevel: VerificationLevel | null;
}

/** One mattress in a comparison: the catalog record plus its engine result (null without a profile). */
export interface CompareColumn {
  id: string;
  entry: MattressEntry;
  item: SlimItem | null;
}

/** What the lineup shows where a score would be. */
export type ScoringState = 'ready' | 'loading' | 'none';

/** Where a comparison's verdict is addressed: the visitor's own profile or a disclosed demo profile. */
export type VerdictAudience = 'you' | 'demo';

/* ---------------------------------------------------------------- table -- */

export type CellTone = 'success' | 'warning';
export type CellKey = string | number | null;

export interface ValueCell {
  kind?: undefined;
  text: string | null;
  /** Numeric value used to find a row's leader; null when not comparable. */
  value: number | null;
  /** Equality key used for "Same for all". */
  key: CellKey;
  missing?: MissingKind;
  missingText?: string;
  suffix?: string;
  note?: string | null;
  tone?: CellTone | null;
  /** 0-100 bar fill. */
  bar?: number;
  estimated?: boolean;
  list?: { title: string; severity: WatchOutSeverity }[];
}

export interface VerificationCell {
  kind: 'verification';
  level: VerificationLevel;
  key: VerificationLevel;
  text: null;
  value: null;
}

export type CompareCell = ValueCell | VerificationCell;

export type Better = 'higher' | 'lower';

/** A table row before annotateRow() marks its leaders. */
export interface CompareRowDraft {
  id: string;
  label: string;
  hint?: string;
  better?: Better;
  leaderWord?: string;
  emphasis?: boolean;
  long?: boolean;
  cells: CompareCell[];
}

export interface RowAnnotation {
  /** Every cell is equivalent. */
  same: boolean;
  /** Column indexes holding the best known value. */
  leaders: number[];
  tied: boolean;
}

export type CompareRow = CompareRowDraft & RowAnnotation;

export type RowGroupId = 'match' | 'dimensions' | 'ratings' | 'build' | 'buying';

export interface CompareRowGroup {
  id: RowGroupId;
  label: string;
  note?: string;
  rows: CompareRow[];
}

/* -------------------------------------------------------------- verdict -- */

export interface VerdictLead {
  id: string;
  text: string;
}

export interface VerdictDifference {
  id: string;
  name: string;
  leads: VerdictLead[];
}

export type CompareVerdict =
  | { kind: 'no-profile'; differences: VerdictDifference[] }
  | { kind: 'tie'; score: number; tiedIds: string[]; differences: VerdictDifference[] }
  | {
      kind: 'winner';
      winnerId: string;
      score: number;
      runnerUpId: string;
      runnerUpScore: number;
      margin: number;
      differences: VerdictDifference[];
    };

/* ----------------------------------------------------------------- pair -- */

export type PairSideKey = 'a' | 'b';
export type PairSleeperKind = 'reference' | 'spotlight';

/** One mattress's engine result for one sleeper on a head-to-head page. */
export interface PairSide {
  score: number;
  tier: string;
  subScores: SubScores;
  provenance: Partial<Record<ScoreCategory, DimensionProvenance>>;
  firmnessFit: FirmnessFit | null;
  explanation: Explanation | null;
  /**
   * 1-based position among the RANKED mattresses for this sleeper (the same
   * rule as the category and product pages), or null when this mattress has
   * too little data to be ranked.
   */
  rank: number | null;
  total: number;
}

export interface PairRow {
  id: string;
  label: string;
  kind: PairSleeperKind;
  chips: string[];
  a: PairSide;
  b: PairSide;
}

export interface PairEntries {
  a: MattressEntry;
  b: MattressEntry;
}

export interface PairData {
  rows: PairRow[];
  modelVersion: string | null;
  entries: PairEntries;
}

export type PairNames = Record<PairSideKey, string>;

/** The slice of a PairRow the client-side dimension tabs need. */
export interface PairDimensionRow {
  id: string;
  label: string;
  kind: PairSleeperKind;
  a: Pick<PairSide, 'subScores' | 'provenance'>;
  b: Pick<PairSide, 'subScores' | 'provenance'>;
}

export interface ChooseItem {
  id: string;
  condition: string;
  evidence: string;
  reason: string | null;
  context: string | null;
}

export interface SpecValue {
  text: string | null;
  note?: string;
  missing?: string;
}

export interface SpecRow {
  id: string;
  label: string;
  long: boolean;
  a: SpecValue;
  b: SpecValue;
}

export interface RatingRow {
  id: string;
  label: string;
  a: number | null;
  b: number | null;
}

/** Heading levels the area's list/card components accept. */
export type HeadingLevel = 'h2' | 'h3' | 'h4';
