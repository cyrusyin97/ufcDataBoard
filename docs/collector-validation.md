# Isolated collector candidate validation

Date: 2026-11-02. Status: Local source-to-artifact validation passed. Remote workflow cutover and website promotion remain pending.

## Baseline reconciliation

The local source database hash exactly matches the production website manifest: `4516eec0f095e13c1a39ae5452850ce34326a8c702753831c978c84e4b66925f`.
The active public version is `2026-10-14-5949094d82ded09a`. Its export date is 2026-10-14; its latest completed event is 2026-10-10. An export date does not certify collection through that date.

The old ufcdb `db` release asset has hash `842114bf49952fc7186c84744aae81f421b14f1838495ad859a58396f9b7dc58` and latest completed event 2026-09-19. It has 4,574 fighters, 23,038 perspective rows, and 11,518 fight details. It is not the baseline for this run. Internal integer event IDs are not compared as stable external identities across these two independently evolved files.

The matching local original was inspected read-only and copied into an ignored work directory. Its hash was checked again after collection and remains unchanged. The final run uses `work/collector-migration/run-1/ufc.db`. An earlier interrupted exploratory copy is separate and was not used as the final candidate.

## Live collection and discovered defect

The robots endpoint returned 404. The explicit collector run uses its upstream one-second request interval. It checked 24 listed events: 21 already current and three newly ingested (October 17, 24, and 31). It fetched 78 event fighter profiles and 39 fight detail pages. The process returned success, but the first website export correctly rejected three single-sided historical DWCS fights.

New debut profiles introduced these older fights outside the recent UFC listing. The updater now closes those histories through the source bout's participant IDs and the real missing opponent profiles. It never fabricates an inverse result or statistics. The repair used six bounded requests for three fights. Independent snapshot validation now rejects incomplete perspectives as well. Added regression tests cover closure, idempotence, request budget exhaustion, wrong identities, and the independent pairing gate.

| Source table               | Accepted baseline | Validated candidate | Change |
| -------------------------- | ----------------- | ------------------- | ------ |
| Fighters                   | 4581              | 4586                | +5     |
| Events                     | 1273              | 1278                | +5     |
| Fighter-perspective fights | 23118             | 23202               | +84    |
| Fight details              | 11559             | 11601               | +42    |
| Round-stat rows            | 73234             | 73506               | +272   |

Three listed UFC events and historical records account for the changes; the event count is not the count of newly listed UFC cards. Candidate integrity, references, existing identity retention, nondecreasing counts, and two-perspective pairing checks pass. Its source SHA-256 is `4bc14c866869fed7bacb1cdb617ff330f7b8a3b744f5ba57fc8512b3b77436ed`.

## Export, package, and restore

The normal read-only exporter ran with `--as-of 2026-11-02`, the existing bout policy, and isolated output/public roots. It reused the existing reviewed media cache and generated version `2026-11-02-b4cb0219bc328bcb`.
The complete contract check passes: 4,586 fighters, 23,202 perspective records, 11,601 bouts, 11 divisions, 528 media roles, and 76 reported field conflicts. Conflicts remain explicit; this report does not approve their values or new rankings.

The candidate archive is `work/collector-migration/run-1/packages/ufc-data-2026-11-02-b4cb0219bc328bcb.tar.gz` (63,465,794 bytes). SHA-256: `08ff26ce317d517dbef2572f099992096890a6cc0daef8e1e4bf235aee05b5b4`.
Its local descriptor and checksum sidecar are in the same directory. The standard restore command verified archive safety, SHA-256, full dataset contracts, and installation into another isolated root successfully.
Read the [summary receipt](evidence/collector-validation.json) for counts and raw receipt hashes. Raw databases, media, logs, staging, archives, and restore results stay under ignored work paths.

## Checks and remaining gates

All 14 collector/snapshot tests and all 38 existing pipeline tests pass. Expected simulated HTTP failures in pipeline tests are fixtures. Formatting, links, and whitespace checks pass. No application runtime changed; a new Next.js build or browser matrix against this candidate was not run.

The original source database, `data/release.json`, public current pointer, production dataset, and Vercel configuration remain unchanged. No source snapshot or package was uploaded. No schedule was enabled and no GitHub workflow was executed remotely. The migration code remains uncommitted.

Next, commit the migrated workflow and establish a durable verified source snapshot for a manual GitHub Actions run. Keep website promotion gated on ranking refresh, reviewed media seed restoration on a clean runner, conflict review, and application/preview checks. The rankings in this candidate still use the existing 2026-10-14 snapshot. Local media availability does not prove that a clean runner can rebuild them.
