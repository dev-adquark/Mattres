'use strict';

/**
 * Deterministic, keyword-based tagging of raw review snippets against the
 * controlled vocabulary in data/schema/review-tags.vocabulary.json.
 *
 * This is intentionally NOT machine learning: it's case-insensitive
 * substring matching against a fixed phrase list, so results are
 * reproducible and auditable (every tag traces back to a specific phrase in
 * a specific review).
 */

/**
 * @param {string} text a single review snippet
 * @param {object} vocabulary parsed review-tags.vocabulary.json
 * @returns {string[]} the distinct tag ids matched in this one review
 */
function matchTagsInText(text, vocabulary) {
  const lower = text.toLowerCase();
  const matched = new Set();
  for (const tagDef of vocabulary.tags) {
    const hit = tagDef.triggerPhrases.some((phrase) => lower.includes(phrase.toLowerCase()));
    if (hit) matched.add(tagDef.tag);
  }
  return Array.from(matched);
}

function confidenceForMatchCount(vocabulary, matchCount) {
  const tiers = vocabulary.confidenceTiers;
  if (matchCount >= tiers.high.minMatches) return 'high';
  if (matchCount >= tiers.medium.minMatches) return 'medium';
  return 'low';
}

/**
 * Groups raw reviews by mattress id, tags each review, and aggregates into
 * per-mattress review highlight items (one item per distinct tag that
 * matched at least one review for that mattress).
 *
 * @param {Array<{mattressId: string, text: string}>} reviews raw reviews, already mapped to mattress ids
 * @param {object} vocabulary parsed review-tags.vocabulary.json
 * @returns {object} { [mattressId]: Array<{tag, label, sentiment, category, confidence, matchCount, snippet}> }
 */
function tagReviewsByMattress(reviews, vocabulary) {
  const tagDefByCode = Object.fromEntries(vocabulary.tags.map((t) => [t.tag, t]));

  // mattressId -> tag -> { count, firstSnippet }
  const aggregation = {};

  for (const review of reviews) {
    const tagsInThisReview = matchTagsInText(review.text, vocabulary);
    if (tagsInThisReview.length === 0) continue;

    if (!aggregation[review.mattressId]) aggregation[review.mattressId] = {};
    const byTag = aggregation[review.mattressId];

    for (const tag of tagsInThisReview) {
      if (!byTag[tag]) byTag[tag] = { count: 0, firstSnippet: review.text };
      byTag[tag].count += 1;
    }
  }

  const result = {};
  for (const [mattressId, byTag] of Object.entries(aggregation)) {
    result[mattressId] = Object.entries(byTag)
      .map(([tag, { count, firstSnippet }]) => {
        const def = tagDefByCode[tag];
        return {
          tag,
          label: def.label,
          sentiment: def.sentiment,
          category: def.category,
          confidence: confidenceForMatchCount(vocabulary, count),
          matchCount: count,
          snippet: firstSnippet,
        };
      })
      // Deterministic ordering: highest-confidence / most-matched first, then alphabetical by tag.
      .sort((a, b) => b.matchCount - a.matchCount || a.tag.localeCompare(b.tag));
  }
  return result;
}

module.exports = { matchTagsInText, tagReviewsByMattress };
