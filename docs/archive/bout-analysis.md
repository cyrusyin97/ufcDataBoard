# Bout analysis — V9 specification — superseded reference

> Superseded on 2026-10-24 by [Product Spec](../product-spec.md), the sole current product logic standard.
> The body below is retained as historical context for existing report links. Its status statements and instructions are not current requirements. Do not add new product rules here.

Updated: 2026-10-24.
Status: M6.1–M6.3 implemented and checked. Integrated user acceptance is pending.
The user selected the formulas and requested the latest card and interaction revisions.
This does not establish production acceptance or release approval.

## Reference and scope

Use [V9](../../outputs/designs/ufc-rankings/index-v9.html) for the new bout panel.
Use V8 for the existing rankings, history card, and profile card.
Read the [prototype report](../../outputs/designs/ufc-rankings/README-v9.md) for local checks.
Prototype files are local design artifacts. They are not production dependencies.

The prototype contains Volkanovski vs. Ortega at UFC 266 on 2021-09-25.
Its bout ID is `18f1b88d8977c216`.
It contains two fighter bundles, with 18 and 14 recorded bouts respectively.
Only the shared UFC 266 event opens the analysis panel in this prototype.
Other event sources remain external links. Mutual opponent names open local history.
Do not copy these sample limits into production contracts.
Production must identify available bout statistics across the exported archive.
Missing statistics must produce an explicit unavailable state.

## Screen and navigation

Keep the selected fighter portrait on the left and the existing profile on the right.
Replace the middle history card with bout analysis when the user opens a supported event.
Show event, date, division, result, method, ending round, and time.
Show reviewed headshots for both fighters.
Selecting a headshot updates the portrait and profile without changing the bout.
Provide All and one control for each actual round. Do not hardcode five rounds.
Update summary statistics, radar scores, and the breakdown together.

Provide a sticky Fight History bar outside the bout content scroll region.
History result badges and profile recent-form entries also open internal bout analysis when supported.
Use the actual event name for the large heading and the same display typeface in the history row.
Use reversible live-title and portrait motion. Keep the current document position on return and restore list position independently.
Return to the currently selected fighter's history and preserve the active rankings division.
The profile's complete Professional Record button opens that fighter's history.
Keep opponent-name navigation distinct from event-to-bout navigation.
Reuse the V8 history count, column headings, result marker, opponent, event, location, date, method, round, and scroll footer.
Reuse the V8 profile record, finish bars, imperial measurements, recent results, and source link.
Do not add the superseded two-fighter tabs or instruction text to the history card.

Preserve direct entry, reload, Back, and Forward for the new bout state.
The production URL and owned-entry behavior are implemented; see [user journeys](../spec/user-journeys.md#j16--share-refresh-and-traverse-a-view) and technical design sections 23–26.
The prototype uses hash routes. This is not a production route decision.
Do not alter the existing home-return or opponent-chain rules.
On mobile, show portrait, bout panel, then profile.
Keep history internally scrollable and prevent horizontal overflow.
Profile facts retain their snapshot date. They are not historical facts from the bout date.

## Radar presentation

Use red for one fighter and muted blue for the other, with named legends.
Use thin solid strokes for both series. Do not use a dashed series.
The current reference uses 1.1-pixel strokes and 1.5-pixel hover emphasis.
Use subtle 2-pixel visible points with larger transparent pointer targets.
Show axis scores for both fighters and a 0–100 scale.
Hovering a line or point highlights the series and exposes exact values.
Show the fighter and total before separate metric rows.
Do not use click, tap, or keyboard activation to select radar geometry.
This rule applies to the radar, not to the round, fighter, or navigation controls.

Put the score breakdown inside the default-closed How to read this chart disclosure.
Show raw values, normalized scores, weights, and weighted contributions.
Include the formula, reference population, period, and score meaning.
Keep this information accessible without hover in production.
M6 must provide textual values for both fighters and all axes inside the disclosure.
The prototype's last-hovered breakdown alone is not sufficient for that production check.
Use keyboard-accessible controls for disclosure and navigation without adding radar click behavior.

## Formula v1.1

A component is one measured statistic used in an axis score.
A reference cohort is the historical population used to set normalization bounds.
A fighter-bout record is one fighter's statistics for a complete bout.
A fighter-round record is one fighter's statistics for one round.
A normalized score places one component on a bounded 0–100 scale.
A contribution is a normalized component multiplied by its axis weight.

Let `t` be the actual elapsed seconds in the selected period.
For event counts, use `R(x) = 300 * x / t`.
For control, use `C = ctrl_seconds / t`.
Use `N_m(x) = 100 * clamp(x / upper_m, 0, 1)` for each component `m`.
The normal upper bound is the reference population's P95.
Use linear interpolation between sorted observations to calculate quantiles.
If P95 is zero, try P99 and then the maximum.
If no positive bound exists, mark the component unavailable.
Keep unknown inputs as null. Do not substitute zero or redistribute their weights.
An unavailable required component makes its axis score unavailable.
Validate nonnegative counts and positive duration before scoring.
Round only displayed values. Keep full precision during calculation.

Each term below means its separately normalized rate, except control, which uses time share.

| Axis      | Components and weights                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Striking  | 70% distance landed + 30% distance attempted                                                                                         |
| Clinching | 70% clinch landed + 30% clinch attempted                                                                                             |
| Grappling | 30% takedowns landed + 10% takedowns attempted + 20% submission attempts + 25% control share + 15% ground significant strikes landed |
| Damage    | 75% significant strikes landed + 25% knockdowns                                                                                      |
| Tank      | Apply the Damage formula to the opponent's output using the same reference                                                           |

Weights sum to one within each axis.
Tank means impacts received. A higher value does not indicate better defense or durability.
With the same reference and period, fighter A's Tank equals fighter B's Damage.
Significant strikes already include distance, clinch, and ground significant strikes.
Do not add ground strikes to Damage a second time.
Ground strikes are a proxy for ground-and-pound (GNP), not a verified upper-position classification.
Control can include clinch and ground control.
Grappling and Damage intentionally share some evidence.
Do not sum the axes into an overall ability score.
These weights are product choices. They are not validated medical injury or judging scores.
A score of 80 does not mean the 80th percentile.
Short elapsed periods can produce extreme rates; disclose this limitation.

## Data and reference provenance

Read `fight_details` and `fight_round_stats` through the offline exporter.
Use stable bout IDs and fighter IDs, not names, for joins.
Required raw fields are `distance_landed`, `distance_attempted`, `clinch_landed`, `clinch_attempted`, `td_landed`, `td_attempted`, `sub_att`, `ctrl_seconds`, `ground_landed`, `sig_landed`, and `kd`.
Include both perspectives, source URLs, capture dates, time format, ending round, and ending time.
Round zero contains bout totals. Never add it to round rows.
Derive elapsed duration from the actual format and finish time.
Do not assume every historical round lasts five minutes.
Preserve unsupported formats with an explicit scoring limitation.

The prototype reference contains 271 UFC men's featherweight bouts from 2016-09-25 through 2021-09-24.
It uses complete rows and standard three- or five-round formats with five-minute rounds.
It excludes the sample event and later events.
Whole-bout and round references are separate: 542 and 1,390 fighter records.
Every selected bound is positive at P95, including KD.
See [reference values](../../outputs/designs/ufc-rankings/v9/reference.json) and the [read-only reference builder](../../outputs/designs/ufc-rankings/v9/build-reference.py).
Source database SHA-256: `4516eec0f095e13c1a39ae5452850ce34326a8c702753831c978c84e4b66925f`.

Production must version the formula, weights, cohort definition, bounds, source checksum, and dataset together.
The user confirmed the production cohort policy on 2026-10-23.
Both fighters must use the same reference for a selected period.
Do not use current ranking membership to infer a historical bout's division.
Do not apply this featherweight sample reference to every division.
Use the preceding five calendar years in the same historical division.
Exclude the target event date and all later dates. A leap-day window starts on February 28 when required.
Require at least 50 distinct complete UFC bouts, not 50 fighter perspectives.
Do not expand the window or borrow another division when the sample is too small.
Keep raw statistics and mark scores unavailable in that case.
Label a bout or round shorter than 60 seconds as a short sample.
For reference construction, retain the prototype's standard three- or five-round schedules and conservative UFC event-name filter.
Exclude unresolved event aliases and incomplete observations from the cohort.
Parse other finite schedules for raw period durations. Unlimited schedules retain null durations.
Read [the M6 data report](../m6-data-report.md) for implemented export coverage.

## Acceptance matrix

| ID   | Check                                               | Required result                                                                                                 |
| ---- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| BA01 | Export both perspectives and all available rounds   | IDs, counts, sources, and duration agree with the read-only source.                                             |
| BA02 | Check scoring fixtures                              | Weights, caps, zero values, nulls, KD contribution, and control share match the formulas.                       |
| BA03 | Check reference construction                        | Separate round/bout cohorts, reproducible quantiles, no later-event leakage, and explicit sparse-data handling. |
| BA04 | Open and refresh bout URLs                          | Bout, fighter, active division, and period restore consistently.                                                |
| BA05 | Navigate history, bout, opponent, Back, and Forward | Existing return rules hold; no stale data or navigation chain appears.                                          |
| BA06 | Change rounds and fighters rapidly                  | All visible values match the newest committed state.                                                            |
| BA07 | Inspect the radar                                   | Thin solid lines, subtle points, hover response, and no geometry click/tap action.                              |
| BA08 | Open the disclosure without a pointer               | Both fighters' scores and contributions are available without hover.                                            |
| BA09 | Compare cards with V8                               | History and profile structure remain unchanged; only bout navigation is added.                                  |
| BA10 | Check desktop and mobile                            | Portrait remains visible; scroll and focus work; no horizontal overflow.                                        |
| BA11 | Test absent, malformed, or failed data              | No invented zeros, division reassignment, stale scores, or misleading complete chart.                           |
| BA12 | Check release boundaries                            | Lazy versioned data, no SQLite/browser source calls, and no prototype CDN dependency.                           |

Prototype interaction and screenshot checks do not satisfy these production gates.

Read [the integrated interface report](../m6-interface-report.md) for application checks beyond the prototype.
