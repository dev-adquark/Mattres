# Mattress Match Score — How matching works

**Model:** v0.1 (rule-based; not clinically validated)

The Match Score is a compatibility estimate for a shopper's stated sleep preferences and a mattress's recorded specifications. It is not a medical recommendation, a guarantee of comfort, or a prediction of pain relief.

## What goes into a match

The scoring engine evaluates six dimensions:

| Dimension | What it represents |
|---|---|
| Pressure relief | How the recorded firmness and construction align with the profile's comfort band |
| Support | Fit between firmness and the profile's position/weight-derived comfort band |
| Temperature | Cooling-cover and construction signals recorded in the catalog |
| Motion isolation | A type-based signal when the profile indicates high partner-motion sensitivity |
| Edge support | Reinforced-edge specification, when known |
| Durability | Foam-density and weight-related risk signals, when those data are available |

The versioned rule file in `data/rules/` owns the weights, thresholds, baselines, and rule catalog. The engine should not silently change score math without a model-version change.

## Reading the score

- A score is a relative fit estimate for the inputs supplied, not an objective quality grade.
- Compare scores only when they were generated with the same model version and comparable input completeness.
- Missing or unverified product attributes should be shown as unknown; they must not be presented as measured facts.
- Risk flags are surfaced separately so a high aggregate score cannot conceal an important mismatch.
- Catalog values and score outputs are informational and should be reviewed against current manufacturer specifications before publication.

## Commercial transparency

Retailer availability, price, affiliate commission, and sponsorship are commercial fields. They must not alter the compatibility score. Any affiliate relationship or sponsored placement must be disclosed next to the relevant link or placement, not only in a general footer.

## Before production launch

1. Calibrate thresholds and weights against documented product data and independent testing.
2. Add source URLs, source dates, and verification status for each material catalog claim.
3. Test score boundaries, missing values, invalid inputs, deterministic repeatability, and version compatibility.
4. Review consumer disclosures, privacy handling, accessibility, and local legal requirements.
5. Publish the model version and last-updated date alongside user-facing methodology.

## Data quality states

Use consistent labels in the UI:

- **Verified:** checked against a primary source or documented test, with source and date.
- **Reported:** supplied by a manufacturer or retailer and not independently tested.
- **Unknown:** unavailable or not reliable enough to display as a fact.

Never turn a missing value into a positive claim or imply that a reported feature has been independently tested.
