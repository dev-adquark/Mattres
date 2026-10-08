'use client';

import { useState } from 'react';
import { DEVICE_DATA, forgetEverythingOnDevice } from '@/lib/deviceStorage';
import { Button } from './Button';
import { cx } from './cx';
import { deviceDataPanel as s } from '@/components/ui/systemStyles';

interface DeviceDataPanelProps {
  headingLevel?: 'h2' | 'h3' | 'h4';
  className?: string;
}

/**
 * "Your data on this device" (for /privacy#device-data): lists every key
 * the site may keep in this browser and offers one button that clears all
 * mms_* keys from localStorage and sessionStorage. No server involved.
 *
 * Rule-free hooks for the policy prose: .device-data, .device-data__row,
 * .device-data__label, .device-data__key.
 */
export function DeviceDataPanel({ headingLevel = 'h3', className }: DeviceDataPanelProps) {
  const [status, setStatus] = useState('');
  const Heading = headingLevel;
  return (
    <div className={cx('device-data', className)}>
      <dl className={s.list}>
        {DEVICE_DATA.map((item) => (
          <div key={item.key} className={cx('device-data__row', s.row)}>
            <dt>
              <Heading className={cx('device-data__label', s.label)}>{item.label}</Heading>
              <code className={cx('device-data__key', s.key)}>{item.key}</code>
              <span className={s.where}>{item.storage === 'session' ? 'Session storage' : 'Local storage'}</span>
            </dt>
            <dd>
              {item.what} <span className="muted">{item.lifetime}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className={s.actions}>
        <Button
          variant="secondary"
          onClick={() => {
            const n = forgetEverythingOnDevice();
            setStatus(n > 0 ? `Cleared ${n} item${n === 1 ? '' : 's'} from this browser.` : 'Nothing was stored on this device.');
          }}
        >
          Forget everything on this device
        </Button>
        <p className={s.status} role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </div>
  );
}
