#!/usr/bin/env node
'use strict';

/**
 * Local ingestion pipeline.
 *
 * Reads:
 *   data/raw/mattresses-raw.json       messy/inconsistent raw mattress records
 *   data/raw/reviews-raw.json          raw review snippets, keyed by model_name
 *   data/schema/review-tags.vocabulary.json  controlled tag vocabulary + trigger phrases
 *
 * Writes:
 *   data/mattress-catalog.json         normalized mattresses (see data/schema/mattress.schema.json)
 *   data/review-tags.json              per-mattress tagged review highlights
 *
 * Usage: node scripts/ingest-mattresses.js
 */

const fs = require('fs');
const path = require('path');

const { normalizeMattress } = require('../src/ingest/normalizeMattress');
const { tagReviewsByMattress } = require('../src/ingest/tagReviews');

const ROOT = path.join(__dirname, '..');
const RAW_MATTRESSES_PATH = path.join(ROOT, 'data', 'raw', 'mattresses-raw.json');
const RAW_REVIEWS_PATH = path.join(ROOT, 'data', 'raw', 'reviews-raw.json');
const VOCAB_PATH = path.join(ROOT, 'data', 'schema', 'review-tags.vocabulary.json');
const CATALOG_OUT_PATH = path.join(ROOT, 'data', 'mattress-catalog.json');
const REVIEW_TAGS_OUT_PATH = path.join(ROOT, 'data', 'review-tags.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function main() {
  const rawMattresses = readJson(RAW_MATTRESSES_PATH);
  const rawReviews = readJson(RAW_REVIEWS_PATH);
  const vocabulary = readJson(VOCAB_PATH);

  // --- Normalize mattresses ---
  const mattresses = rawMattresses.map(normalizeMattress);

  // Build a lookup so raw reviews (keyed by model_name) can be mapped to the
  // stable ids the normalized catalog uses.
  const idByModelName = Object.fromEntries(mattresses.map((m) => [m.model, m.id]));

  const unmatchedModels = [];
  const reviewsWithMattressId = rawReviews
    .map((r) => {
      const mattressId = idByModelName[r.model_name];
      if (!mattressId) unmatchedModels.push(r.model_name);
      return { mattressId, text: r.text };
    })
    .filter((r) => r.mattressId);

  if (unmatchedModels.length > 0) {
    console.warn(
      `Warning: ${unmatchedModels.length} review(s) referenced a model_name not found in the catalog: ${[
        ...new Set(unmatchedModels),
      ].join(', ')}`
    );
  }

  // --- Tag reviews ---
  const reviewHighlightsByMattress = tagReviewsByMattress(reviewsWithMattressId, vocabulary);

  // Every mattress should have an entry, even if empty, so consumers never
  // need an existence check.
  for (const m of mattresses) {
    if (!reviewHighlightsByMattress[m.id]) reviewHighlightsByMattress[m.id] = [];
  }

  // --- Write outputs ---
  const catalogOutput = {
    catalogVersion: '0.1',
    generatedFrom: 'data/raw/mattresses-raw.json',
    mattressCount: mattresses.length,
    mattresses,
  };
  writeJson(CATALOG_OUT_PATH, catalogOutput);

  const reviewTagsOutput = {
    vocabularyVersion: vocabulary.vocabularyVersion,
    generatedFrom: 'data/raw/reviews-raw.json',
    controlledVocabulary: vocabulary.tags.map((t) => ({
      tag: t.tag,
      label: t.label,
      sentiment: t.sentiment,
      category: t.category,
    })),
    reviewHighlightsByMattress,
  };
  writeJson(REVIEW_TAGS_OUT_PATH, reviewTagsOutput);

  // --- Console summary ---
  console.log(`Ingested ${mattresses.length} mattresses -> ${path.relative(ROOT, CATALOG_OUT_PATH)}`);
  const byType = mattresses.reduce((acc, m) => {
    acc[m.type] = (acc[m.type] || 0) + 1;
    return acc;
  }, {});
  console.log('  by type:', JSON.stringify(byType));

  const taggedMattressCount = Object.values(reviewHighlightsByMattress).filter((tags) => tags.length > 0).length;
  const allTagsUsed = new Set();
  Object.values(reviewHighlightsByMattress).forEach((tags) => tags.forEach((t) => allTagsUsed.add(t.tag)));
  console.log(
    `Tagged review highlights -> ${path.relative(ROOT, REVIEW_TAGS_OUT_PATH)}`
  );
  console.log(`  ${taggedMattressCount}/${mattresses.length} mattresses have at least one tagged highlight`);
  console.log(`  distinct tags used: ${[...allTagsUsed].sort().join(', ')}`);
}

main();
