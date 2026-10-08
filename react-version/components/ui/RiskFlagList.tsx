import type { ComponentType, SVGProps } from 'react';
import { CircleCheck, Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import type { RiskFlagCode, WatchOutSeverity } from '@/lib/types';
import { cx } from './cx';
import { riskFlagList as s } from '@/components/ui/systemStyles';

/** Default severity per engine risk code; a flag's own `severity` wins. */
export const RISK_SEVERITY: Record<RiskFlagCode, WatchOutSeverity> = {
  SUPPORT_THRESHOLD_MISMATCH: 'warning',
  DURABILITY_SAG_RISK: 'warning',
  PREFERRED_FIRMNESS_MISMATCH: 'caution',
  HEAT_RETENTION_LIKELY: 'caution',
  EDGE_SUPPORT_CONCERN: 'caution',
  PRESSURE_POINT_RISK: 'caution',
  MOTION_TRANSFER_LIKELY: 'caution',
};

export const RISK_TITLE: Record<RiskFlagCode, string> = {
  SUPPORT_THRESHOLD_MISMATCH: 'Support may not suit your body weight',
  DURABILITY_SAG_RISK: 'Higher risk of sagging over time',
  PREFERRED_FIRMNESS_MISMATCH: 'Firmness differs from your preference',
  HEAT_RETENTION_LIKELY: 'May sleep warm',
  EDGE_SUPPORT_CONCERN: 'Weaker edge support',
  PRESSURE_POINT_RISK: 'Pressure points likely',
  MOTION_TRANSFER_LIKELY: "A partner's movement may carry",
};

function humanize(code: unknown): string {
  const text = String(code || 'Risk')
    .toLowerCase()
    .replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const SEVERITY: Record<WatchOutSeverity, { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }> = {
  info: { label: 'Note', Icon: Info },
  caution: { label: 'Caution', Icon: TriangleAlert },
  warning: { label: 'Warning', Icon: OctagonAlert },
};

/** An engine risk flag or a lib/explain watch-out - both render here. */
export interface RiskFlagLike {
  code?: string;
  severity?: WatchOutSeverity;
  title?: string;
  rationale?: string;
  text?: string;
  mitigation?: string;
}

interface RiskFlagListProps {
  flags: readonly RiskFlagLike[] | null | undefined;
  /** Shown when there are no flags; pass '' to render nothing. */
  emptyText?: string;
  headingLevel?: 'h2' | 'h3' | 'h4' | 'h5';
  className?: string;
}

/**
 * Engine risk flags ({code, category, rationale, mitigation}) or lib/explain
 * watch-outs ({code, severity, title, text, mitigation}) with a severity
 * icon AND text label. Copy comes from the engine output; only the short
 * title is a fixed per-code mapping.
 */
export function RiskFlagList({ flags, emptyText = 'No risk flags for your profile.', headingLevel = 'h4', className }: RiskFlagListProps) {
  if (!flags || flags.length === 0) {
    return emptyText ? (
      <p className={cx(s.empty, className)}>
        <CircleCheck aria-hidden="true" />
        {emptyText}
      </p>
    ) : null;
  }
  const Heading = headingLevel;
  return (
    <ul className={cx(s.list, className)}>
      {flags.map((flag, i) => {
        const code = flag.code as RiskFlagCode | undefined;
        const severity: WatchOutSeverity = flag.severity || (code && RISK_SEVERITY[code]) || 'info';
        const { label, Icon } = SEVERITY[severity] || SEVERITY.info;
        return (
          <li key={`${flag.code}-${i}`} className={cx(s.risk, s[severity])}>
            <Icon className={s.icon} aria-hidden="true" />
            <div>
              <span className={s.severity}>{label}</span>
              <Heading className={s.title}>{flag.title || (code && RISK_TITLE[code]) || humanize(flag.code)}</Heading>
              {flag.rationale || flag.text ? <p className={s.text}>{flag.rationale || flag.text}</p> : null}
              {flag.mitigation ? (
                <p className={s.mitigation}>
                  <strong>What to do: </strong>
                  {flag.mitigation}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
