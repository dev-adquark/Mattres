import Link from 'next/link';
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cx } from './cx';
import { Magnetic } from './Magnetic';
import { button as s } from '@/components/ui/systemStyles';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'onDark';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  arrow?: boolean;
}

/**
 * Class names for the button look, for the rare element that must stay a
 * plain <button>/<a> (e.g. a disclosure toggle with its own aria wiring).
 * Prefer <Button>. `btn` is a stable, rule-free hook class that parents may
 * target with :global(.btn).
 */
export function buttonClassName({ variant = 'primary', size = 'md', block = false, arrow = false }: ButtonStyleOptions = {}): string {
  return cx('btn', s.btn, s[variant], s[size], block && s.block, arrow && s.hasArrow);
}

interface CommonProps extends ButtonStyleOptions {
  /** Leading icon node. */
  icon?: ReactNode;
  /** Subtle pointer pull for the one or two most important CTAs in a view. */
  magnetic?: boolean;
  /** Class for the magnetic wrapper (only rendered when `magnetic`). */
  wrapClassName?: string;
  className?: string;
  children?: ReactNode;
}

type LinkExtras = { prefetch?: boolean | null; scroll?: boolean; replace?: boolean; transitionTypes?: string[] };

export type ButtonAsLinkProps = CommonProps &
  LinkExtras &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'> & {
    href: string;
    /** Opens in a new tab with rel="noopener noreferrer nofollow". */
    external?: boolean;
  };

export type ButtonAsButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'> & {
    href?: undefined;
    external?: undefined;
  };

export type ButtonProps = ButtonAsLinkProps | ButtonAsButtonProps;

const OWN_KEYS = ['variant', 'size', 'block', 'arrow', 'icon', 'magnetic', 'wrapClassName', 'className', 'children', 'href', 'external', 'type'] as const;

/** The props that belong on the DOM element / Link (everything Button does not consume itself). */
function passThrough<T extends object>(props: T): Omit<T, (typeof OWN_KEYS)[number]> {
  const out = { ...props } as Record<string, unknown>;
  for (const key of OWN_KEYS) delete out[key];
  return out as Omit<T, (typeof OWN_KEYS)[number]>;
}

/**
 * Button / link-button.
 *  - href (internal)  -> next/link (extra props such as transitionTypes pass through)
 *  - href + external  -> <a target=_blank rel="noopener noreferrer nofollow">
 *  - no href          -> <button type="button"> (pass type="submit" for forms)
 *
 * arrow: append the arrow capsule (the arrow slides through on hover/focus)
 * magnetic: subtle pointer pull (desktop mouse only, off under reduced
 *   motion; the hit area never moves away from the cursor).
 */
export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', block = false, arrow = false, icon = null, magnetic = false, wrapClassName, className, children } = props;
  const classes = cx(buttonClassName({ variant, size, block, arrow }), className);
  const content = (
    <>
      {icon}
      <span>{children}</span>
      {arrow ? (
        <span className={s.arrow} aria-hidden="true">
          <ArrowRight />
          <ArrowRight />
        </span>
      ) : null}
    </>
  );

  let el: ReactNode;
  if (props.href !== undefined) {
    const { href, external } = props;
    const rest = passThrough(props);
    el = external ? (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer nofollow" {...rest}>
        {content}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    ) : (
      <Link href={href} className={classes} {...rest}>
        {content}
      </Link>
    );
  } else {
    const type = props.type ?? 'button';
    const rest = passThrough(props);
    el = (
      <button type={type} className={classes} {...rest}>
        {content}
      </button>
    );
  }

  return magnetic ? (
    <Magnetic block={block} className={wrapClassName}>
      {el}
    </Magnetic>
  ) : (
    el
  );
}
