'use client';

import { Button, type ButtonAsLinkProps } from '@/components/ui/Button';
import { track } from '@/lib/analytics';
import type { AnalyticsEventName, AnalyticsProps } from '@/lib/types';

type TrackedButtonProps = Omit<ButtonAsLinkProps, 'onClick'> & {
  event: AnalyticsEventName;
  eventProps?: AnalyticsProps;
};

/** A Button link that sends one analytics event on click. */
export function TrackedButton({ event, eventProps, ...rest }: TrackedButtonProps) {
  return <Button {...rest} onClick={() => track(event, eventProps)} />;
}
