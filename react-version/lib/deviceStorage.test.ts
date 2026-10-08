import { describe, it, expect } from 'vitest';
import { DEVICE_DATA, STORAGE_KEYS, sanitizeProfileForStorage } from '@/lib/deviceStorage';

describe('deviceStorage', () => {
  it('documents every key and all keys are mms_ prefixed', () => {
    for (const key of Object.values(STORAGE_KEYS)) expect(key.startsWith('mms_')).toBe(true);
    const documented = new Set<string>(DEVICE_DATA.map((d) => d.key));
    // The privacy page calls this the complete list, so every key the site writes must be documented.
    for (const key of Object.values(STORAGE_KEYS)) expect(documented.has(key)).toBe(true);
    expect(documented.has('mms_compare_labels')).toBe(true);
    expect(documented.has('mms_catalog_view')).toBe(true);
  });

  it('keeps only enums and numbers from a profile', () => {
    const clean = sanitizeProfileForStorage(
      { sleepPosition: 'side', weightLb: 154.6, preferredFirmnessLabel: 'medium', sleepTemperature: 'hot', notes: 'free text', email: 'x@y.z', mattressTypePreference: ['hybrid', 'bogus'] },
      '0.2',
    );
    expect(clean).toEqual({ sleepPosition: 'side', weightLb: 155, preferredFirmnessLabel: 'medium', sleepTemperature: 'hot', scoreVersion: '0.2', mattressTypePreference: ['hybrid'] });
  });

  it('rejects an invalid profile', () => {
    expect(sanitizeProfileForStorage({ sleepPosition: 'upside-down' }, '0.2')).toBeNull();
  });

  it('is a no-op on the server', async () => {
    const { readItem, forgetEverythingOnDevice } = await import('@/lib/deviceStorage');
    expect(readItem('local', 'mms_compare')).toBeNull();
    expect(forgetEverythingOnDevice()).toBe(0);
  });
});
