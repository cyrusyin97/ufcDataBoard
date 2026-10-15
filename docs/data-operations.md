# Data operations

Status: Implemented in M1.
Date: 2026-10-14.
Run these commands from the project root.
The web application never needs the source database at runtime.

## Environment

1. Install Node.js 24.
2. Install Python 3.12.
3. Run `python3.12 -m venv .venv`.
4. Run `.venv/bin/python -m pip install -r requirements-media.txt`.
5. Run `npm ci`.

The runner selects `.venv/bin/python` when it exists.
Set `UFC_PYTHON` to use another compatible Python executable.
Set `UFC_DB_PATH` or pass `--db` for database export.
The runner does not automatically load `.env.local`.
The media dependency is Pillow 12.3.0.
Source downloads need WebP and AVIF decoder support.

## Configuration

| File                             | Responsibility                                                                            |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `data/config/initial.json`       | Division registry, ranking snapshots, reviewed identity mappings, and source observations |
| `data/config/media-sources.json` | Reviewed image URLs and optional local seeds                                              |
| `data/config/media-reviews.json` | Role approval tied to exact source hashes                                                 |
| `data/schemas/`                  | Generated portable JSON schemas                                                           |

Division keys and ranking lengths remain configurable.
Fighter identity uses the full source archive.
The first configuration publishes two rankings with 16 entries each.
Do not use names as unique fighter keys.
`data/config/ranked-media-snapshot.json` stores the additional captured membership lists.
It does not publish those divisions in the interface.

## Discover and prepare media

1. Run `npm run data:discover -- --max-pages 1`.
2. Review discovered athlete URLs against source fighter identities.
3. Add reviewed mappings to the configuration.
4. Run `npm run data:media:candidates`.
5. Run `npm run data:media -- --config work/media-candidates/media-sources.json`.
6. Run `npm run data:media:review`.
7. Inspect the labeled role sheets in `work/media-review/`.
8. Approve source hashes in `data/config/media-reviews.json`.

The sitemap job stores its visited pages and remaining page count.
Increase the page limit to continue an authorized crawl.
It does not crawl restricted athlete directory query paths.
The candidate job reuses captured pages unless `--refresh` is present.
The collection job reuses verified cached files unless `--refresh` is present.
Both jobs check robots rules before network requests.
The shared request interval is at least 15 seconds.
Long Retry-After values stop the network queue and persist its resume time.

Initial local seeds reuse the preserved prototype captures where appropriate.
A clone without those files downloads the configured URLs.
Encoding changes can produce a different source hash.
Inspect and approve that new hash before publishing its role.
Do not approve a role merely because its dimensions look plausible.

A collection failure keeps previous cached assets.
A new unreviewed candidate does not replace an older hash-approved role in the export.
Missing or unresolved roles remain null.
The first M1 dataset included 32 half-body images, 32 full-body cutouts, and 16 headshots.
The current dataset has 176 reviewed images for each of the three roles.
Both published rankings have headshots for all 32 fighters.
Read [the selector correction report](selector-correction.md) for the latest headshot checks.
The other fighters retain null roles until their sources receive review.

## Additional ranked fighters

Read [ranked media expansion](ranked-media-expansion.md) for the additional division job.
Run `npm run data:media:ranked -- --db /absolute/path/to/ufc.db --as-of 2026-10-14`.
The job keeps its ranking snapshot separate from the published interface registry.
It stores private candidates and resume state before hash review.
Use a new `--output` directory for a new ranking capture.
The existing directory retains its captured ranking and athlete pages.
Use `data:media -- --refresh` for approved URL checks after collection.
New source hashes need role review.

## Export and check

1. Run `npm run data:export -- --db /absolute/path/to/ufc.db --as-of 2026-10-14`.
2. Run `npm run data:check`.
3. Run `npm run data:pack`.

Use the intended snapshot date for `--as-of`.
This date controls age calculation and release identity.
It does not update the source database or ranking snapshots.
The scraper remains a separate task.

The exporter opens a read-only transaction.
It checks SQLite integrity, required columns, references, and bout pairing.
It exports all fighters, including fighters without recorded bouts.
It keeps career totals separate from recorded history.
It records source conflicts without replacing the chosen source silently.

The Python job writes a private staging directory.
The Node.js checker parses every bundle through the Zod contracts.
It checks counts, versions, references, file hashes, and public paths.
Only a successful check can update the current release pointer.
A publication lock prevents concurrent pointer writes.
A failed export leaves the current release intact.
Repeated identical exports reuse the same release identity.

## Release layout

```text
public/data/current.json
public/data/v1/<dataset-version>/
  manifest.json
  index.json
  divisions.json
  media.json
  conflicts.json
  fighters/<fighter-id>.json
  media/<variant-hash>.webp
```

One version contains its data and reviewed media together.
The manifest contains byte counts and SHA-256 checksums.
The current pointer identifies the active version.
Versioned resources receive immutable cache headers.
The pointer receives `no-store`.
The public directory contains no SQLite file, credentials, or machine paths.

Raw image objects, HTTP receipts, page captures, and variant caches remain in `work/`.
Prototype files remain unchanged.
Generated release files stay outside Git.
The archive from `data:pack` contains only the current public release and its pointer.
Use `npm run data:restore` before a deployment build.
The release descriptor pins its version and archive checksum.
The restore command checks the complete extracted dataset before installation.
Retain previous release artifacts for rollback.

## Checks

- Run `npm run test:pipeline` for export and media failure tests.
- Run `python3 -m unittest discover -s scripts/research -p 'test_*.py'` for candidate extraction checks.
- Run `npm run data:schemas` after a domain contract change.
- Run `npm run check` for application checks and production build.
- Run `npm run test:e2e` for foundation and data endpoint checks.

Pipeline tests use temporary databases and isolated publication roots.
They do not change the user's source database or the active release.
CI installs Python 3.12 and the pinned media dependency.
CI does not crawl UFC or need the user's database.
The data endpoint test skips when no generated dataset exists.
Production release checks must run against a real artifact.

## Remaining release work

M2 through M4 implement the interface, navigation, and motion.
M5 must check media rights, hosting delivery, and the update schedule.
M1 does not guarantee official images for every archive fighter.
