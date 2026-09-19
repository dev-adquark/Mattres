#!/usr/bin/env node
'use strict';

/**
 * End-to-end test for GET /api/score-trace. Starts the real HTTP server
 * (scripts/serve-demo-api.js) on an ephemeral port, makes a real HTTP
 * request against it with the global fetch() (Node 18+), asserts on the
 * response, then shuts the server down.
 *
 * Usage: node scripts/test-score-trace-api.js
 */

const assert = require('assert');
const http = require('http');
const { handleScoreTraceRequest } = require('../src/api/scoreTraceHandler');

let passed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ok  - ${name}`);
    })
    .catch((err) => {
      console.error(`FAIL - ${name}`);
      console.error(err);
      process.exitCode = 1;
    });
}

// --- Unit-level tests against the handler directly (no network) ---

function testHandlerDirect() {
  return test('handler: missing profileId returns 400 with known ids', () => {
    const { status, body } = handleScoreTraceRequest(undefined);
    assert.strictEqual(status, 400);
    assert.ok(Array.isArray(body.knownProfileIds) && body.knownProfileIds.length > 0);
  })
    .then(() =>
      test('handler: unknown profileId returns 404', () => {
        const { status, body } = handleScoreTraceRequest('does-not-exist');
        assert.strictEqual(status, 404);
        assert.ok(body.error.includes('does-not-exist'));
      })
    )
    .then(() =>
      test('handler: known profileId returns 200 with modelVersion + non-empty trace arrays', () => {
        const { status, body } = handleScoreTraceRequest('demo-poor-match');
        assert.strictEqual(status, 200);
        assert.strictEqual(body.modelVersion, '0.1');
        assert.strictEqual(body.profileId, 'demo-poor-match');
        assert.ok(Array.isArray(body.recommendations) && body.recommendations.length >= 1);

        const rec = body.recommendations[0];
        assert.ok(Array.isArray(rec.trace.categoryRulesUsed) && rec.trace.categoryRulesUsed.length > 0);
        assert.ok(Array.isArray(rec.trace.riskRulesUsed) && rec.trace.riskRulesUsed.length > 0);
      })
    );
}

// --- Real HTTP end-to-end test ---

function testOverRealHttp() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/api/score-trace') {
        const profileId = url.searchParams.get('profileId') || undefined;
        const { status, body } = handleScoreTraceRequest(profileId);
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
        return;
      }
      res.writeHead(404);
      res.end();
    });

    server.listen(0, async () => {
      const port = server.address().port;
      try {
        await test('GET /api/score-trace?profileId=demo-poor-match over real HTTP', async () => {
          const res = await fetch(`http://localhost:${port}/api/score-trace?profileId=demo-poor-match`);
          assert.strictEqual(res.status, 200);
          const json = await res.json();
          assert.strictEqual(json.modelVersion, '0.1');
          assert.ok(json.recommendations.length >= 1);
          assert.ok(json.recommendations[0].trace.categoryRulesUsed.length > 0);
          assert.ok(json.recommendations[0].trace.riskRulesUsed.length > 0);
        });

        await test('GET /api/score-trace?profileId=demo-good-match shows untriggered risk rules over real HTTP', async () => {
          const res = await fetch(`http://localhost:${port}/api/score-trace?profileId=demo-good-match`);
          const json = await res.json();
          const rec = json.recommendations[0];
          assert.strictEqual(rec.riskFlags.length, 0);
          assert.ok(rec.trace.riskRulesUsed.every((r) => r.triggered === false));
        });

        await test('GET /api/score-trace with no profileId returns 400 over real HTTP', async () => {
          const res = await fetch(`http://localhost:${port}/api/score-trace`);
          assert.strictEqual(res.status, 400);
        });

        server.close(() => resolve());
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

async function main() {
  await testHandlerDirect();
  await testOverRealHttp();
  console.log(`\n${passed} test(s) passed.`);
}

main();
