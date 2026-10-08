import type { ComponentType, ReactNode } from 'react';
import { Moon, type LucideProps } from 'lucide-react';
import { cx } from './cx';
import { emptyState as s } from '@/components/ui/systemStyles';

interface EmptyStateProps {
  /** A lucide icon component (default Moon); null for none. */
  icon?: ComponentType<LucideProps> | null;
  title?: ReactNode;
  description?: ReactNode;
  /** Usually one or two <Button>s. */
  action?: ReactNode;
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
  role?: string;
}

/** Honest "nothing here" state; headingLevel keeps the outline valid. */
export function EmptyState({ icon: Icon = Moon, title, description, action, headingLevel = 'h2', className, role }: EmptyStateProps) {
  const Heading = headingLevel;
  return (
    <div className={cx(s.root, className)} role={role}>
      {Icon ? <Icon className={s.icon} aria-hidden="true" strokeWidth={1.5} /> : null}
      {title ? <Heading className={s.title}>{title}</Heading> : null}
      {description ? <p className={s.desc}>{description}</p> : null}
      {action ? <div className={s.action}>{action}</div> : null}
    </div>
  );
}
