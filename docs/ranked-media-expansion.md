# Ranked fighter media expansion

Status: Complete. Collection, review, export, and delivery checks passed.
Date: 2026-10-14.

## Scope

Collect media for ranked fighters in the nine other weight divisions.
Use the visible official ranking block as the source.
Exclude pound-for-pound lists and hidden metadata rankings.
Keep the first interface limited to Featherweight and Lightweight.
This collection does not add categories to the interface.

The captured page lists 16 fighters in each additional division.
It contains 144 unique athlete URLs across those divisions.
The divisions include six men's divisions and three women's divisions.

## Collection

Run `npm run data:media:ranked -- --db /absolute/path/to/ufc.db --as-of 2026-10-14`.
The job writes its private snapshot and progress to `work/media-expansion/`.
It reads SQLite without writes.
It keeps separate database identities for duplicate names.
It checks the official profile heading and additional biography facts.
It requires at least two agreements after a unique database name match.
Height and reach comparisons allow a one-inch difference.
Age comparisons allow a one-year difference at the page capture date.
Career record agreement requires an exact match.
These identity checks do not replace differing database values.
The exporter retains source conflicts.
Unresolved identities remain outside the download queue.

The job reads the observed hero image and social metadata.
It derives a full-body candidate only from the observed hero style path.
It does not derive body images from headshots.
It downloads three candidate roles when those sources exist.
It uses the approved www hostname to avoid redundant redirects.
The receipt retains the observed source URL and final response URL.

Requests share one delay controller.
The current minimum interval is 15 seconds.
Each successful image passes MIME, decode, size, and hash checks.
The job saves its progress after each role and fighter.
Restart the same command to resume.
Add `--retry-failures` to check failed roles again after review.
A rate limit pauses the queue and retains its resume time.

## Approval and export

Downloaded files remain private until role review passes.
Inspect the half-body, full-body, and headshot sheets.
Check fighter identity across the three roles.
Check head, legs, and feet before full-body approval.
Record each approved source hash in the role review configuration.
Retain unresolved roles as null.

Merge reviewed mappings and sources after collection and review.
Keep the existing two published ranking snapshots unchanged.
Export one new version with the added media.
Run the runtime checker and package the checked release.
Keep the previous release for rollback.

## Validation

Tests check visible ranking selection and hidden metadata exclusion.
Tests also check duplicate primary layouts and name normalization.
The lazy srcset test prevents candidate list corruption.
The collection contains 144 fighters and 432 approved source assets.
Each fighter has a headshot, a half-body image, and a full-body cutout.
All 18 labeled batches received visual checks.
No identity, download, decode, or role failure remains.
The source database hash remains unchanged.

The new [ranking membership snapshot](../data/config/ranked-media-snapshot.json) keeps the additional lists.
Position means list order in that file. It does not define an official rank number.
The private inventory is `work/media-expansion/media-index.json`.
Its raw file paths resolve from `work/media/`.
The private cache remains outside the deployment artifact.

## Delivery

Dataset version: `2026-10-14-7c5ad4426abf6d1a`.
The release adds 432 approved source assets and 864 WebP variants.
The complete media set covers 176 fighters.
It contains 176 full-body images, 176 half-body images, and 160 headshots.
The other 4405 archive fighters retain null media roles.
The first 16 Featherweight fighters retain their half-body avatar fallback.

| Additional division  | Fighters | Approved source assets | Variants |
| -------------------- | -------: | ---------------------: | -------: |
| Flyweight            |       16 |                     48 |       96 |
| Bantamweight         |       16 |                     48 |       96 |
| Welterweight         |       16 |                     48 |       96 |
| Middleweight         |       16 |                     48 |       96 |
| Light Heavyweight    |       16 |                     48 |       96 |
| Heavyweight          |       16 |                     48 |       96 |
| Women's Strawweight  |       16 |                     48 |       96 |
| Women's Flyweight    |       16 |                     48 |       96 |
| Women's Bantamweight |       16 |                     48 |       96 |

The export keeps all 4581 fighters, 11559 bouts, and 23118 fight perspectives.
It retains 54 source field conflicts without changing database totals.
The two published ranking snapshots remain unchanged.
Read [the structured receipt](evidence/ranked-media-2026-10-14.json) for counts and limits.
Download [the checked release package](../outputs/datasets/ufc-data-2026-10-14-7c5ad4426abf6d1a.tar.gz).
The package occupies 53892686 bytes.
It contains public JSON and reviewed variants.
It contains no source database, credentials, or raw image cache.

Twenty-four Python pipeline tests and seven extraction tests pass.
Six domain tests and three production browser tests pass.
The browser checks cover images from every additional division.
Runtime contracts, file checksums, production build, and format checks pass.
The export ran with Node.js 24.19.0.
The initial browser attempt could not bind a sandbox port.
The approved local server rerun passed.
No remote CI run occurred.
M2 through M5 remain planned.

## Later headshot correction

The counts above describe the original expansion snapshot.
The [selector correction](selector-correction.md) adds the 16 missing Featherweight headshots.
The current release contains 176 reviewed assets for each media role.
