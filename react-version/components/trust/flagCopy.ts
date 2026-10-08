/**
 * Plain-English documentation of each fit flag for /methodology. The
 * trigger thresholds are read from the rules file at render time (passed
 * in as `t`), so the copy can't drift from the numbers the engine uses.
 * Titles match the ones lib/explain.ts shows on results pages; severities
 * describe the rules in lib/explain.ts buildWatchOuts.
 */
import type { RulesV02 } from '@/lib/scoreEngine';
import type { RiskFlagCode, WatchOutSeverity } from '@/lib/types';

export interface FlagDoc {
  title: string;
  when: (t: RulesV02['thresholds'], d: RulesV02['durability']) => string;
  /** Mildest first; the last one is the most serious this flag can be. */
  severity: readonly [WatchOutSeverity, ...WatchOutSeverity[]];
  severityText: string;
}

export interface NoteDoc {
  id: string;
  title: string;
  when: string;
  severity: WatchOutSeverity;
}

export const FLAG_DOCS: Partial<Record<RiskFlagCode, FlagDoc>> = {
  SUPPORT_THRESHOLD_MISMATCH: {
    title: 'Softer or firmer than recommended for you',
    when: () =>
      'The firmness falls outside the range that usually keeps someone of your sleep position and body weight aligned.',
    severity: ['caution', 'warning'],
    severityText: 'Warning when it is 1.5 or more firmness points outside your band; caution when it is closer.',
  },
  PREFERRED_FIRMNESS_MISMATCH: {
    title: 'Different feel from what you asked for',
    when: (t) => `The firmness is ${t.preferredFirmnessMismatchPoints} or more points away from the feel you said you like.`,
    severity: ['caution'],
    severityText: 'Always a caution: a preference is real, but a trial night decides it.',
  },
  HEAT_RETENTION_LIKELY: {
    title: 'May sleep warm',
    when: (t) => `You said you sleep hot and its cooling sub-score is ${t.heatRetentionMaxHeatScore} or lower.`,
    severity: ['caution', 'warning'],
    severityText: 'Warning when the cooling score comes from an independent rating; caution when it is an estimate.',
  },
  EDGE_SUPPORT_CONCERN: {
    title: 'Softer edges',
    when: (t) =>
      `Its edge sub-score is below ${t.edgeSupportMinScore} (below ${t.edgeSupportMinScoreWhenImportant} if you said edge support matters a lot). Not checked if you said it matters little.`,
    severity: ['caution', 'warning'],
    severityText: 'Warning only when an independent edge rating is on file and you said edges matter a lot; caution otherwise.',
  },
  MOTION_TRANSFER_LIKELY: {
    title: "A partner's movement may carry",
    when: (t) => `You share the bed and wake easily, and its motion-isolation sub-score is below ${t.motionTransferMinScore}.`,
    severity: ['caution', 'warning'],
    severityText: 'Warning when an independent motion rating is on file; caution when it is an estimate.',
  },
  PRESSURE_POINT_RISK: {
    title: 'Possible pressure points',
    when: (t) =>
      `You sleep on your side or reported shoulder or hip discomfort, and its pressure-relief sub-score is below ${t.pressurePointMinScore}.`,
    severity: ['caution', 'warning'],
    severityText: 'Warning when pressure relief is below 5; caution between 5 and the threshold.',
  },
  DURABILITY_SAG_RISK: {
    title: 'Faster wear at higher body weights',
    when: (t, d) =>
      `You weigh ${d.heavierSleeperLb} lb or more and its independent durability rating is below ${t.durabilityHeavierSleeperMinScore}, or its stated top-foam density is under ${d.lowDensityThresholdLbFt3} lb/ft³. It never fires on an estimate.`,
    severity: ['warning'],
    severityText: 'Always a warning, because it only fires on real data.',
  },
};

/** Notes that sit alongside the flags on a results page but are not engine risk flags. */
export const NOTE_DOCS: readonly NoteDoc[] = [
  {
    id: 'multiple-firmness',
    title: 'Sold in more than one firmness',
    when: 'The listed firmness spans two or more points. The score uses the middle of the range, so the option you pick changes the fit.',
    severity: 'info',
  },
  {
    id: 'limited-data',
    title: 'Limited data',
    when: 'Three or more of the six dimensions had to be estimated from construction type. The score is shown, with that caveat beside it.',
    severity: 'info',
  },
];
