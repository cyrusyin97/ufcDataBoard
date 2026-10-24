# M6 contracts and navigation design

> Historical evidence. Status, counts, and remaining work below apply to the recorded stage. Use [Product Spec](product-spec.md) for current behavior and [development plan](development-plan.md) for current gates.

Date: 2026-10-23.
Status: M6.1 complete. M6.2 export and reference validation are implemented.
The user approved the reference-population policy on 2026-10-23.
M6.3 integrates production routes and UI. Analysis artifacts were validated in isolated release roots.
Read [the interface report](m6-interface-report.md) for the current implementation status.

## Read-only source audit

Run `python3 scripts/pipeline/audit_bout_stats.py --db /absolute/path/to/ufc.db --output work/m6-audit.json`.
The command opens a query-only transaction and verifies the database hash before and after reading.
The [audit receipt](evidence/m6-bout-audit.json) contains counts, formats, and example IDs.
It contains no source database path or credentials.

| Observation                                | Count  | Handling                                                                     |
| ------------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| Source bouts                               | 11,559 | Keep identities independent from ranking membership.                         |
| Bouts with statistics                      | 11,229 | Export both perspectives when available.                                     |
| Statistic rows                             | 73,234 | Keep round zero separate from round rows.                                    |
| Bouts without statistics                   | 330    | Keep history and show analysis unavailable.                                  |
| Rows with null control time                | 8,486  | Preserve null; affected Grappling scores are unavailable.                    |
| Incomplete round sets                      | 1      | Preserve available rows and identify missing periods.                        |
| Bouts with unknown duration                | 43     | Keep raw counts; do not calculate rates.                                     |
| Rows below 60 seconds                      | 2,832  | Includes totals and individual fighter-round rows, not unique bouts.         |
| Bouts with differing event IDs             | 14     | Preserve observations and exclude unresolved aliases from reference cohorts. |
| Bouts outside the current division mapping | 629    | Do not map through a fighter's current rank.                                 |

The 14 event differences include Noche UFC and UFC Fight Night aliases.
A common date alone is not proof of event identity.
Resolve them through reviewed source IDs or an explicit alias map before reference inclusion.
Do not repair the source database in this task.
No negative metric, control-above-duration, strike partition, or checked aggregate/round mismatch was found.
The audit candidate counts do not establish historical per-event reference coverage.
Candidates require complete statistics, matching event IDs, a mapped division, a UFC-prefixed event name, and a standard three- or five-round schedule.
The event-name filter follows the prototype and is conservative; it is not a complete organization identity registry.
Do not relabel candidate counts as all UFC bouts.

## Initial executable contracts

`src/lib/domain/bout-contracts.ts` defines independent bout and scoring-reference schemas.
The current fighter, registry, manifest, and release contracts remain unchanged.
No active release pointer changed.

A bout bundle contains:

- Schema version, dataset version, bout ID, and ordered participant IDs.
- Historical division, bout type, event label and date, source URL, and capture time.
- Method, outcomes, time format, ending round, and ending time.
- Ordered periods with actual elapsed seconds and two participant observations.
- Explicit issue codes and a nullable scoring reference ID.

A missing perspective's statistics are null. A missing field remains null inside its observation.
Do not create an all-zero row for missing data.
The schema rejects duplicate participants, participant-order mismatches, duplicate periods, negative counts, landed counts above attempts, inconsistent strike partitions, and control above duration.
The export checker validates period sets, complete aggregate consistency, participant references, provenance, and availability issue codes.
Read [the M6 data report](m6-data-report.md) for dataset and artifact checks.

A scoring reference contains its identity, dataset and policy versions, formula version, source hash, division, date window, sample counts, status, and bounds for both period types.
Each bound records P95, P99, MAX, or an unavailable value.
A reference status distinguishes an available cohort from insufficient history.
The contract carries the minimum count; it does not silently select a product threshold.

`src/lib/domain/bout-scoring.ts` implements the approved formula v1.1 independently of UI state.
It preserves full precision, includes control and GNP in Grappling, includes KD in Damage, and derives Tank from opponent output.
The caller must validate bout/reference identity and choose the period before calculating scores.
The function does not fetch data or select a historical cohort.
This policy-independent calculation is preparatory work for M6.2.

## Implemented artifact boundary

Keep the current immutable dataset root and publication lock.
The opt-in export adds `bouts/<bout-id>.json`, `bout-references/<reference-id>.json`, and `bout-policy.json`.
Hash their content and include every file in the manifest.
The optional manifest `boutAnalysis` descriptor declares the capability, formula/policy versions, and artifact counts.
An analysis-enabled release includes one file for every history bout ID, including explicit missing-statistics states.
The UI can request that stable ID directly without downloading a global bout index.
Existing releases without this descriptor remain valid.
Keep the current dataset readable until the exporter, checker, packer, and restore checks all support the extension.
Do not publish standalone analysis files outside the pinned dataset version.

Cache bout data by dataset version and bout ID.
Cache references by dataset version and reference ID.
Load both lazily. Do not send all historical statistics in the initial page payload.
Keep cancellation and generation checks in the existing experience lifecycle.
A mismatch between dataset, formula, division, or reference identity rejects the analysis result.

## Route design for M6.3

Extend the existing `/rankings` query route rather than adding a hash router.
Use `view=bout`, `division=<active-ranking-division>`, `fighter=<selected-participant>`, `bout=<bout-id>`, and `round=all|<positive-integer>`.
The active rankings division is navigation context. The bundle's historical division determines scoring.
Validate participant membership and round availability after the bundle loads.
An unknown ID, nonparticipant fighter, or unavailable period shows an error with a safe history return.
Do not display another fighter or round silently.

Use the existing route controller with one owned bout entry above the history entry:

1. Rankings to history retains the current push behavior.
2. History to bout pushes one bout entry that records the parent history key.
3. Round and participant changes replace the current bout entry.
4. Bout Back or Fight History returns to the existing parent history entry.
5. On return, update that parent to the latest committed bout participant, without adding an opponent chain.
6. History to rankings retains the current ranked-fighter or champion rule.
7. A direct bout visit creates the owned home/history/bout context once. Reload reuses it.
8. Forward restores the bout entry and its last selected participant and period.

Preserve framework history fields and external browser traversal.
Version owned-entry metadata so old rankings/history entries remain valid.
Do not overwrite the parent while handling an unrelated external traversal.
M6.3 implements this route design. Its integrated user acceptance remains pending.

## Duration policy

Parse finite schedules from explicit round lengths, including overtime.
Sum preceding scheduled rounds and the actual ending time for bout totals.
Use the scheduled duration for completed rounds and actual ending time for the final round.
Reject malformed clocks, impossible ending rounds, times beyond the schedule, and zero elapsed duration.
Keep unlimited or absent schedules unavailable instead of assuming five minutes.
The audit parser has fixtures for 10-minute rounds and overtime.
Cohort inclusion for nonstandard formats remains separate from duration parsing.

## Confirmed product policy

The user approved the preceding five calendar years in the same division, with at least 50 complete bouts.
Sparse samples retain raw statistics without a radar score; no cross-division fallback is used.
The short-period label applies below 60 seconds.
`data/config/bout-policy.json` pins the policy, weights, and standard reference schedules.
A reference window excludes every observation on or after the target event date.

## Fixture and acceptance plan

| Area      | Evidence now                                           | Remaining gate                                                                        |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| BA01      | Read-only audit, participant schema, duration fixtures | Complete export, source comparison, and release checking                              |
| BA02      | Pure scoring and contract unit fixtures                | Cross-language/export parity and real reference fixtures                              |
| BA03      | Source coverage and explicit policy fields             | User policy choice, no-leakage reference builder, quantile and sparse-cohort tests    |
| BA04–BA06 | Documented route transitions                           | Controller implementation, direct entry, reload, Back/Forward, and cancellation tests |
| BA07–BA10 | Existing V9 design reference                           | React integration, accessibility, visual comparison, and browser matrix               |
| BA11–BA12 | Null-safe contracts and isolated files                 | Data-store errors, artifact restore, and production-build verification                |

M6.1 is complete after the policy confirmation and additive artifact decision.
The table above records the original fixture plan. The M6 data report records completed M6.2 checks.
