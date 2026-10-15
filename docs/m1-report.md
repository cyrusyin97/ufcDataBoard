# M1 delivery report

Status: Implemented. Acceptance checks passed.
Date: 2026-10-14.
Dataset version: `2026-10-14-555dda3397f54a57`.

## Delivered system

The Python exporter reads SQLite in a consistent read-only transaction.
It exports the complete fighter index and recorded fight perspectives.
It separates fighter identity from configurable ranking membership.
The Node.js checker checks every bundle through runtime contracts.
Portable JSON schemas mirror those contracts.
The publication runner uses a lock and atomic current pointer replacement.

The media jobs discover sitemap URLs and prepare candidates from reviewed athlete pages.
They check robots rules, source hosts, decoded formats, and image limits.
They reuse caches and representation-specific HTTP validators.
They retain prior hash-approved media while new candidates need review.
Role approval requires the exact source hash.
Variant output preserves image dimensions, aspect ratio, and real transparency.

## Dataset counts

| Item                            | Count |
| ------------------------------- | ----: |
| Fighters                        |  4581 |
| Recorded fighter perspectives   | 23118 |
| Unique bouts                    | 11559 |
| Initial division snapshots      |     2 |
| Entries per initial division    |    16 |
| Fighters without recorded bouts |   430 |
| Reviewed media assets           |    80 |
| Generated image variants        |   160 |
| Reported field conflicts        |    13 |

Every database fighter remains in the archive.
Every recorded opponent ID resolves to that archive.
Career records use source totals rather than sums of recorded bouts.
Unknown values remain null.
The conflict file retains differing UFC.com observations.

The initial media set contains 32 half-body images and 32 full-body cutouts.
It also contains 16 headshots.
The other 4549 fighters retain explicit null media roles.
The full-body set replaces the incorrect Lightweight headshot bindings in exported data.
The preserved V8 prototype files remain unchanged.

## Validation

- Sixteen Python pipeline tests pass.
- Six candidate extraction tests pass.
- Six Vitest domain tests pass.
- Two production browser tests pass.
- All generated bundles pass Zod checks.
- All 160 generated variants decode as WebP with expected dimensions and transparency.
- A third division and a shorter ranking pass fixture checks.
- An unranked fighter with no bouts or images passes fixture checks.
- Duplicate names remain separate identities.
- Failed publication preserves the previous pointer.
- Repeated identical fixture exports preserve the release identity.
- Checksums reject corrupt files.
- Public checks reject undeclared files, source databases, machine paths, and credential fields.
- HTTP checks pass for immutable version resources and a noncached current pointer.
- The source database hash remains unchanged.

The data export and production build also ran with Node.js 24.19.0.
Python media jobs use Python 3.12 and Pillow 12.3.0.
The standard local npm checks also passed under the machine's default Node.js 25.
The CI configuration selects Node.js 24 and Python 3.12.
No remote CI run occurred.

## Delivery and limits

Use [data operations](data-operations.md) for repeatable commands.
Use [the structured receipt](evidence/m1-validation.json) for measured counts and checks.
The archive is `outputs/datasets/ufc-data-2026-10-14-555dda3397f54a57.tar.gz`.
The current public release occupies 22661262 bytes before archive compression.
The archive contains no source database or raw image cache.

The first release uses the accepted ranking observations from October 13 and 14.
This task does not rerun the source scraper or claim a live ranking feed.
Additional source fighters can receive images through the same reviewed mapping workflow.
Complete official image coverage is not guaranteed.
Media publication rights remain an M5 check.
Advanced round statistics remain outside the current interface export contract.
The source database remains available for future export extensions.

M2 can now connect the rankings interface to these data contracts.
M3 through M5 remain planned.
