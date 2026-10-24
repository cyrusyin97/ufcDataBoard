# M6.1 and M6.2 data report

> Historical evidence. Status, counts, and remaining work below apply to the recorded stage. Use [Product Spec](product-spec.md) for current behavior and [development plan](development-plan.md) for current gates.

Date: 2026-10-23.
Status: M6.1 complete. M6.2 implemented and checked.
M6.3 interface integration and M6.4 integrated acceptance remain pending.
No production deployment or active website dataset change occurred.

## Confirmed policy

The user approved five preceding calendar years in the same historical division.
Require at least 50 complete distinct bouts. Do not expand sparse windows or borrow another division.
Keep raw observations when a reference is unavailable.
A period below 60 seconds receives a short-sample label during UI integration.
The versioned policy records this threshold; M6.2 does not render the label.
Reference construction retains standard three- and five-round schedules from V9.
The conservative UFC event-name filter and unresolved event-alias exclusions remain explicit limitations.

## Implemented changes

- Added opt-in offline bout export through `--bout-policy data/config/bout-policy.json`.
- Added independent bout and reference contracts, plus portable JSON schemas.
- Added the approved five-axis scoring function with inspectable component contributions.
- Added explicit finite-schedule duration parsing, including unequal rounds and overtime.
- Added same-division reference generation with an exclusive event-date cutoff.
- Added separate bout and round distributions, linear quantiles, and P95/P99/MAX fallback metadata.
- Added a nullable reference identity and availability reasons for incomplete source data.
- Added a backward-compatible manifest capability; existing fighter contracts remain unchanged.
- Extended artifact checking to participants, aggregate/round consistency, policy weights, reference versions, and file coverage.

The bundle and policy artifacts share the immutable dataset version and file manifest.
The UI will load a bout by its existing history ID. No global bout index is needed in the initial payload.
Weights and duration normalization do not use ranking membership.
Profile snapshots and existing media roles remain independent from historical bout statistics.

## Complete source export

The candidate version is `2026-10-14-5949094d82ded09a`.
The snapshot date remains 2026-10-14. This export does not refresh rankings or fighter facts.
The source hash remains `4516eec0f095e13c1a39ae5452850ce34326a8c702753831c978c84e4b66925f`.

| Item                                                      | Count  |
| --------------------------------------------------------- | ------ |
| Fighter bundles                                           | 4,581  |
| Recorded fighter perspectives                             | 23,118 |
| Bout bundles                                              | 11,559 |
| Scoring reference artifacts                               | 6,189  |
| Published divisions                                       | 11     |
| Reviewed media roles                                      | 528    |
| Bouts with sufficient reference populations               | 9,529  |
| Bouts with insufficient reference populations             | 1,387  |
| Bouts without a mapped reference identity                 | 643    |
| Bouts with both fighters' complete five-axis total scores | 8,654  |

Sufficient reference population does not guarantee complete source metrics.
The smaller complete-score count accounts for absent observations, duration, control, or positive bounds.
The extension preserves 330 missing-statistics bouts and 1,585 bouts with incomplete metric fields.
It records 14 event conflicts without choosing one fighter's event arbitrarily.
Unmapped categories remain unmapped. They do not inherit the current rankings division.
Read the [structured receipt](evidence/m6-data-validation.json) and [source audit](evidence/m6-bout-audit.json).

## Validation

The new extension passed the full dataset checker in a private staging directory.
Repeated source export produced the same dataset version.
The existing publication runner installed the checked candidate into `work/m6-public`, not `public/data`.
The candidate packed and restored into a separate test root.
The current website remains on `2026-10-14-17c85108758d31ec`.
The production release descriptor is unchanged.

The first restore attempt rejected the archive at the old 20,000-entry limit.
The candidate contains 23,567 files, so the bounded entry limit is now 40,000.
The 20 MiB per-file limit, 512 MiB expanded limit, 256 MiB compressed limit, path checks, and hash checks remain in force.
A regression test checks the measured archive size and rejects excess entries or bytes.
The subsequent restore passed.
The archive is 63,433,729 bytes.
Its SHA-256 is `e5372188dfa6dff76358dec2754f597a87438bbf16bed64309e1bfa841184951`.

The exported UFC 266 fixture has the same 271-bout reference population as V9.
Volkanovski's total scores round to 81.06, 9.58, 17.41, 72.02, and 29.62.
The fixture checks real exported contracts against the approved prototype result.
Other tests cover nulls, zero values, KD caps, Tank symmetry, elapsed time, control share, and weight sums.
Reference tests cover the 49/50-bout boundary, same-day/future exclusion, leap dates, fallback quantiles, and repeatability.
The pipeline suite uses isolated databases and never writes to the source database.

Node.js 24.22.0 passes TypeScript and the production build against the unchanged active dataset.
The unit suite and complete pipeline suite pass; final counts are recorded in validation.md.
ESLint and document/schema formatting pass.
Browser tests were not rerun because this stage adds no application interaction or layout.
Production bout navigation, short-sample labels, and the radar disclosure still require M6.3/M6.4 checks.

## Next stage

Integrate lazy bout/reference loading with the existing route and request controller.
Implement the documented bout URL and parent-history return behavior.
Reuse the existing history and profile cards.
Provide the V9 radar and complete textual values for both fighters without hover dependence.
Promote the candidate release only after the integrated application checks pass.
