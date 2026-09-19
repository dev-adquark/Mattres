'use strict';

/**
 * Handler logic for GET /api/score-trace?profileId=...
 *
 * Kept framework-free (no Express) and separate from the HTTP transport
 * (scripts/serve-demo-api.js) so it can be unit-tested directly, without
 * spinning up a real server, and so a future real server/router can import
 * just this function.
 */

const path = require('path');
const { scoreEngine } = require('../scoreEngine');

const demoProfiles = require('../../data/samples/demo-profiles.json');

/**
 * @param {string|undefined} profileId
 * @returns {{status: number, body: object}}
 */
function handleScoreTraceRequest(profileId) {
  if (!profileId) {
    return {
      status: 400,
      body: { error: 'Missing required query parameter "profileId".', knownProfileIds: Object.keys(demoProfiles.profiles) },
    };
  }

  const entry = demoProfiles.profiles[profileId];
  if (!entry) {
    return {
      status: 404,
      body: { error: `Unknown profileId "${profileId}".`, knownProfileIds: Object.keys(demoProfiles.profiles) },
    };
  }

  const scored = scoreEngine('0.1', entry.profile, entry.mattress);

  const recommendation = {
    mattressId: scored.mattressId,
    overallScore: scored.overallScore,
    subScores: scored.subScores,
    comfortBand: scored.comfortBand,
    riskFlags: scored.riskFlags,
    trace: scored.trace,
  };

  return {
    status: 200,
    body: {
      modelVersion: scored.modelVersion,
      profileId,
      profile: entry.profile,
      recommendations: [recommendation],
    },
  };
}

module.exports = { handleScoreTraceRequest };
