/**
 * TEST-ONLY ApifyPort. Never touches the network; every run/dataset id it
 * reports is a synthetic "TEST_*" value, and usageTotalUsd is a synthetic
 * number used only to prove the pipeline copies Apify's figure verbatim.
 */
import { vi } from 'vitest';
import { RTINGS_ACTOR_ID } from '../types';
import type { ApifyPort, ApifyRunInfo } from '@/lib/apify/apifyClient';

export interface MockApifyOptions {
  /** What getDatasetItems resolves with (any JSON; the pipeline checks the shape). */
  items?: unknown;
  /** Thrown by startRun. */
  startError?: unknown;
  /** Thrown by getDatasetItems. */
  datasetError?: unknown;
  /** Status startRun reports; getRun reports `finalStatus` (default SUCCEEDED). */
  startStatus?: string;
  finalStatus?: string;
  usageTotalUsd?: number | null;
  /** Report no dataset id for a succeeded run. */
  noDataset?: boolean;
}

let seq = 0;

export type MockApifyPort = ApifyPort & {
  startRun: ReturnType<typeof vi.fn<ApifyPort['startRun']>>;
  getRun: ReturnType<typeof vi.fn<ApifyPort['getRun']>>;
  getDatasetItems: ReturnType<typeof vi.fn<ApifyPort['getDatasetItems']>>;
};

export function mockApify(options: MockApifyOptions = {}): MockApifyPort {
  seq += 1;
  const runId = `TEST_APIFY_RUN_${seq}`;
  const datasetId = options.noDataset ? null : `TEST_DATASET_${seq}`;
  const info = (status: string): ApifyRunInfo => ({
    runId,
    status,
    defaultDatasetId: datasetId,
    usageTotalUsd: options.usageTotalUsd === undefined ? 0.0123 : options.usageTotalUsd,
    startedAt: null,
    finishedAt: null,
  });
  return {
    actorId: RTINGS_ACTOR_ID,
    startRun: vi.fn<ApifyPort['startRun']>(async () => {
      if (options.startError !== undefined) throw options.startError;
      return info(options.startStatus ?? 'SUCCEEDED');
    }),
    getRun: vi.fn<ApifyPort['getRun']>(async (id: string) => ({ ...info(options.finalStatus ?? 'SUCCEEDED'), runId: id })),
    getDatasetItems: vi.fn<ApifyPort['getDatasetItems']>(async () => {
      if (options.datasetError !== undefined) throw options.datasetError;
      return structuredClone(options.items ?? []);
    }),
  };
}
