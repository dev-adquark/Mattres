import type { ReactNode } from 'react';
import { Info, OctagonAlert, TriangleAlert, type LucideIcon } from 'lucide-react';
import type { WatchOutSeverity } from '@/lib/types';
import s from '../Methodology.module.css';

/** The numbered eyebrow that opens each /methodology chapter. */
export function Chapter({ index, children }: { index: string; children: ReactNode }) {
  return (
    <p className="eyebrow eyebrow--index section__eyebrow" data-index={index}>
      {children}
    </p>
  );
}

const SEVERITY: Record<WatchOutSeverity, { label: string; Icon: LucideIcon }> = {
  info: { label: 'Note', Icon: Info },
  caution: { label: 'Caution', Icon: TriangleAlert },
  warning: { label: 'Warning', Icon: OctagonAlert },
};

/** Icon + word for a fit-flag severity (never colour alone). */
export function SeverityLabel({ severity }: { severity: WatchOutSeverity }) {
  const { label, Icon } = SEVERITY[severity];
  return (
    <span className={s.sev} data-severity={severity}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  );
}
