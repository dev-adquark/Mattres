'use client';

import { useEffect, useId, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { DEVICE_DATA_CLEARED_EVENT, clearSavedProfile, hasSavedProfile, saveProfileOnDevice } from '@/lib/deviceStorage';
import type { ScoreVersion, SleepProfile } from '@/lib/types';
import styles from './Results.module.css';

interface RememberToggleProps {
  profile: SleepProfile;
  scoreVersion: ScoreVersion | null;
}

/**
 * "Remember my matches on this device" - off by default. On: the
 * sanitised profile (enumerated choices + weight, no free text) goes to
 * localStorage via lib/deviceStorage; next visit /find-match re-scores it
 * with the current engine. Off: it is removed. Nothing leaves the device.
 */
export function RememberToggle({ profile, scoreVersion }: RememberToggleProps) {
  const id = useId();
  const [on, setOn] = useState<boolean>(() => hasSavedProfile());
  const [message, setMessage] = useState('');

  useEffect(() => {
    const onCleared = () => {
      setOn(false);
      setMessage('');
    };
    window.addEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
    return () => window.removeEventListener(DEVICE_DATA_CLEARED_EVENT, onCleared);
  }, []);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const ok = !!saveProfileOnDevice(profile, scoreVersion);
      setOn(ok);
      setMessage(
        ok
          ? 'Remembered in this browser. Next time you open Find My Match, your matches are recalculated from these answers.'
          : 'This browser is blocking local storage, so nothing could be saved.'
      );
    } else {
      clearSavedProfile();
      setOn(false);
      setMessage('Forgotten. This tab keeps your current results until you close it.');
    }
  };

  return (
    <div className={styles.remember}>
      <label className={styles.rememberLabel} htmlFor={id}>
        <input id={id} type="checkbox" className={styles.rememberInput} checked={on} onChange={onChange} aria-describedby={`${id}-hint`} />
        <span className={styles.rememberBox} aria-hidden="true" />
        <span className={styles.rememberText}>Remember my matches on this device</span>
      </label>
      <p id={`${id}-hint`} className={styles.rememberHint}>
        Off by default. Saved only in this browser: your answers, never your name or an account. Scores are recalculated
        on each visit. <Link href="/privacy#device-data" className="link">See or clear what this device holds</Link>.
      </p>
      <p className={styles.rememberStatus} role="status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
