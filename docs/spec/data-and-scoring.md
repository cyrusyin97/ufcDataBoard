# 7. Data semantics and scoring

[Product Spec index](../product-spec.md) · Version 1.1 · Updated 2026-10-24.

### 7.1 Identity and artifacts

Public artifacts use `/data/v1/<datasetVersion>/`.
The release manifest, division registry, fighter bundles, media manifest, bout bundles, and references must agree on the dataset version.
The manifest's optional analysis descriptor enables Bout. Legacy releases remain usable without it.

| Entity            | Required meaning                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Registry          | Published divisions, weights, snapshot provenance, ordered ranking entries, and champion defaults.                                                     |
| Fighter bundle    | Stable profile ID, independent career facts and sources, recorded bouts, opponent IDs, dates, results, and source links.                               |
| Media manifest    | Reviewed image role, available variants, identity/provenance, and publication-rights information.                                                      |
| Bout bundle       | Stable bout and participant IDs, historical division, event metadata, outcomes, actual periods, duration, statistics, and reference ID.                |
| Scoring reference | Dataset/formula/policy versions, historical division, cutoff, cohort size, separate bout/round bounds, bound fallback provenance, and source checksum. |

Runtime Zod contracts and exported JSON Schemas must remain compatible.
Check IDs, version, participant membership, requested period, formula/policy versions, reference division/cutoff, and source checksum before rendering analysis.
Do not infer a historical division from current ranking membership.
Whole-bout totals are round zero. Do not add them to the per-round rows.

### 7.2 Formula 1.1

For an event count `x` in a period with actual elapsed seconds `t`:

```text
rate(x) = 300 × x / t
controlShare = controlSeconds / t
normalize_m(value) = 100 × clamp(value / upper_m, 0, 1)
contribution_m = weight_m × normalize_m(value_m)
axisScore = sum(required contributions)
```

Use separately normalized inputs, not a sum of raw counts normalized after weighting.
Require finite nonnegative counts and finite positive duration.
Keep full calculation precision and round only displayed values.

| Axis      | Weighted normalized components                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Striking  | 70% distance landed + 30% distance attempted                                                                                         |
| Clinching | 70% clinch landed + 30% clinch attempted                                                                                             |
| Grappling | 30% takedowns landed + 10% takedowns attempted + 20% submission attempts + 25% control share + 15% ground significant strikes landed |
| Damage    | 75% significant strikes landed + 25% knockdowns                                                                                      |
| Tank      | The opponent's Damage inputs and weights, with the same period and reference                                                         |

Each axis has weights summing to one. Do not redistribute weights around missing inputs.
If a required component or valid normalization bound is unavailable, its axis is unavailable.
If any required axis is unavailable, do not render an apparently complete radar; preserve available raw values and explanatory text.
Fighter A's Tank equals fighter B's Damage for the same period and reference.

Significant strikes already include distance, clinch, and ground significant strikes. Do not add ground strikes again in Damage.
Ground significant strikes are a GNP proxy, not a verified upper-position classification.
Control includes possible clinch and ground control. Grappling and Damage intentionally share some evidence.
Tank means impacts received. More Tank does not mean better defense or durability.
Do not sum these axes into an overall skill, judging, injury, or medical score. A score of 80 is not the 80th percentile.

### 7.3 Reference policy 1

Use the five calendar years before the target event date in the same historical division.
Exclude the entire target date and later dates. Adjust a leap-day start to February 28 when needed.
Require at least 50 distinct complete UFC bouts, not 50 fighter perspectives.
Do not widen the time window or borrow another division for sparse cohorts.
Use standard three- or five-round schedules with five-minute rounds for reference construction.
Apply the conservative UFC event-name filter; exclude unresolved aliases and incomplete observations.
Use actual finite durations for supported other formats; unsupported or unlimited durations remain unavailable.

Use separate whole-bout and round populations. Select each upper bound at P95, using linear interpolation.
If P95 is zero, try P99 and then the maximum. If no positive bound exists, mark the score unavailable.
Flag any selected bout or round shorter than 60 seconds as a short sample.
Version weights, policy, bounds, source checksum, and dataset together.
Executable policy: [bout-policy.json](../../data/config/bout-policy.json). Runtime algorithm: [bout-scoring.ts](../../src/lib/domain/bout-scoring.ts).
Changes require an explicit spec/formula or policy version revision and rebuilt references; never silently reinterpret existing artifacts.
