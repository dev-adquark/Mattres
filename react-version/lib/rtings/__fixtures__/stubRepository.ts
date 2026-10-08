/**
 * TEST-ONLY: an RtingsRepository whose methods all reject unless a test
 * supplies them. Used where a test needs to control exactly one or two
 * reads (route handlers, the evidence reader) or to inject a storage
 * failure. Pipeline tests use the real InMemoryRtingsRepository instead.
 */
import type { RepositoryKind, RtingsRepository } from '../types';

export function stubRepository(overrides: Partial<RtingsRepository> & { kind?: RepositoryKind } = {}): RtingsRepository {
  const notStubbed = (name: string) => () => Promise.reject(new Error(`stubRepository: ${name} not stubbed in this test`));
  return {
    kind: 'memory',
    failStaleRuns: notStubbed('failStaleRuns'),
    startRun: notStubbed('startRun'),
    finishRun: notStubbed('finishRun'),
    getRun: notStubbed('getRun'),
    listRecentRuns: notStubbed('listRecentRuns'),
    getLastSuccessfulRun: notStubbed('getLastSuccessfulRun'),
    getAwaitingApifyRun: notStubbed('getAwaitingApifyRun'),
    appendRawRecords: notStubbed('appendRawRecords'),
    findReviewsByIdentity: notStubbed('findReviewsByIdentity'),
    listReviews: notStubbed('listReviews'),
    countReviews: notStubbed('countReviews'),
    upsertReview: notStubbed('upsertReview'),
    replaceScores: notStubbed('replaceScores'),
    upsertImages: notStubbed('upsertImages'),
    setReviewStatus: notStubbed('setReviewStatus'),
    appendChangeLog: notStubbed('appendChangeLog'),
    getPublishedForMattress: notStubbed('getPublishedForMattress'),
    ...overrides,
  };
}
