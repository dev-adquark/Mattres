#!/usr/bin/env node
'use strict';

/**
 * Minimal demo API server. No framework, no dependencies — Node's built-in
 * http module only, to match the rest of this repo's zero-dependency
 * philosophy.
 *
 * Usage:
 *   node scripts/serve-demo-api.js [port]
 *   curl "http://localhost:8787/api/score-trace?profileId=demo-poor-match"
 *
 * Routes:
 *   GET /api/score-trace?profileId=<id>   -> { modelVersion, profileId, profile, recommendations: [...] }
 *   GET /api/score-trace                   -> 400 with the list of known demo profile ids
 *   anything else                          -> 404
 */

const http = require('http');
const { URL } = require('url');
const { handleScoreTraceRequest } = require('../src/api/scoreTraceHandler');

const PORT = Number(process.argv[2]) || 8787;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'GET' && url.pathname === '/api/score-trace') {
    const profileId = url.searchParams.get('profileId') || undefined;
    const { status, body } = handleScoreTraceRequest(profileId);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body, null, 2));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: `No route for ${req.method} ${url.pathname}` }));
});

server.listen(PORT, () => {
  console.log(`Demo API listening on http://localhost:${PORT}`);
  console.log(`Try: curl "http://localhost:${PORT}/api/score-trace?profileId=demo-poor-match"`);
});

module.exports = server;
