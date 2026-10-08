import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cx } from './cx';
import { iconButton as s } from '@/components/ui/systemStyles';

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** 44px round icon button. Always pass an aria-label (or visible text). */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton({ className, type = 'button', ...rest }, ref) {
  return <button ref={ref} type={type} className={cx(s.iconBtn, className)} {...rest} />;
});

/** The icon-button look, for elements that must compose it into their own class list. */
export const iconButtonClassName: string = s.iconBtn ?? '';
