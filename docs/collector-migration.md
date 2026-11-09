# Collector migration

Updated: 2026-11-09. Status: Weekly automation is active. The first full collection, website publication, and Vercel deployment passed in run `42550859658`.

## Scope and source

The user approved moving the UFC database collector into this repository. The source is [ufcdb](https://github.com/cyrusyin97/ufcdb/tree/bcdea5e6ec4471be11c8e97055e76c27b2613068), revision `bcdea5e6ec4471be11c8e97055e76c27b2613068`.
`scripts/collector/upstream.json` records the original file hashes. Package-relative imports, the default database path, and CLI examples changed. The scraper and core ingest retain upstream behavior. The incremental updater now closes unpaired histories with bounded source-ID-based opponent requests. Additional snapshot checks and offline tests belong to this repository.

The migration includes `scrape_ufcstats.py`, `build_db.py`, `update_db.py`, their updater tests, and the workflow responsibility. Chat, RAG, prediction, embedding dependencies, and source database files were not copied.
The old upstream task was already disabled for inactivity at inspection. This migration does not modify the upstream repository or enable a second timer.

## Local commands

Install the lightweight collector and test dependencies into the project environment:

```sh
.venv/bin/python -m pip install -r requirements-collector-test.txt
npm run test:collector
npm run data:collect -- --help
npm run data:bootstrap-db -- --help
```

Explicit source collection uses `npm run data:collect -- --db work/collector/candidate/ufc.db`. Full initial collection uses `data:bootstrap-db` with its original flags. Read help and confirm the intended baseline first. The default writable database is `work/collector/ufc.db`, outside public assets and Git. These commands can modify their supplied database. They never run during Next.js builds, imports, or normal CI.

Use a copy for collection. Do not point them at the user's authoritative local database during a website task. Offline tests deny requests through the collector's HTTP library and use temporary SQLite fixtures. Initial migration tests did not collect live data. The subsequent isolated validation run is recorded in [candidate validation](collector-validation.md).

## Manual Actions workflow

`.github/workflows/collect-db.yml` replaces the upstream job's responsibility but exposes only `workflow_dispatch` during migration. No cron is active. The former cadence was Monday 14:00 UTC, or Monday 22:00 Asia/Singapore.

Inputs select a baseline repository, release tag, expected lowercase SHA-256, and optional candidate publication. The fixed asset name is `ufc.db`. Check the authoritative baseline independently before supplying its hash. The old upstream `db` asset was last updated on 2026-09-21; this does not establish parity with the website's 2026-10-14 snapshot.

The workflow:

1. Downloads the selected baseline to an isolated work directory.
2. Checks its hash, SQLite integrity, references, and required nonempty tables.
3. Copies it to a new candidate path.
4. Runs the incremental updater with Bash pipefail, so a failed event cannot be hidden by `tee`.
5. Rejects integrity errors, removed source identities, decreased table counts, or unpaired fighter perspectives.
6. Saves the candidate, baseline receipt, validation receipt, and checksum as an Actions artifact for 14 days.
7. If explicitly selected, publishes an immutable `db-snapshot-<run-id>-<attempt>` release with these files. It does not mark this source database release as Latest.

The collection job has read-only repository permissions. Only the optional publisher has contents-write permission. A single concurrency group serializes manual runs. A failed job cannot publish its candidate. Actions artifacts are short-lived review evidence, not the durable baseline store. Database releases contain source data; they are separate from website data packages and do not approve website promotion.

## Migration checkpoint before weekly activation

The manual migration checkpoint recorded these gates. The weekly implementation and first successful production run now supersede this checkpoint.

- Baseline reconciliation passed locally: the selected source SHA-256 matches the production manifest. Integrity and append-only checks do not certify every statistical value. See the candidate report.
- The first [manual candidate job](https://github.com/cyrusyin97/ufcDataBoard/actions/runs/41417007530) passed. The verified [database snapshot](https://github.com/cyrusyin97/ufcDataBoard/releases/tag/db-snapshot-41417007530-1) is available for the next explicit baseline selection. Use the SHA-256 in the [candidate report](collector-validation.md#cloud-candidate-and-durable-snapshot). GitHub release immutability is off. Treat each versioned tag as write-once and verify the pinned checksum when downloading it.
- Define how scheduled runs select the next baseline. The current workflow requires explicit selection and has no rolling pointer.
- Keep the old collector disabled and establish one collection owner. Retain old snapshots for rollback.
- Restore reviewed media before export on a clean runner. Keep ranking refresh and its identity checks separate. This data update reuses the existing ranking lists and dates.
- Connect validated candidates to export, package validation, immutable dataset publication, descriptor updates, preview checks, and website promotion.

The website's `data/release.json`, public pointer, Vercel environment, and active dataset are unchanged. The migration is not an end-to-end automatic data release implementation.

## Historical pairing closure

Debut profiles can add earlier DWCS fights that are absent from the recent UFC event listing. After event reconciliation, inspect all fight perspectives. For a single-sided fight, read its source details, validate both stable fighter IDs, fetch the missing opponent profile, and store the source details. Repeat until histories are paired or the extra request budget is exhausted. `--repair-limit` defaults to 64 additional requests. A source identity mismatch, unavailable opponent history, or exhausted budget fails the job; no inverse outcome/statistics are fabricated. Candidate validation independently rejects unpaired fights before snapshot publication.

## Weekly website publication

Approved 2026-11-09. `.github/workflows/weekly-data.yml` runs each Monday at 14:17 UTC (22:17 Asia/Singapore). It also accepts a manual run. `validate_only` runs collection and all checks without publication. Both collector workflows share one concurrency group. The former ufcdb schedule remains disabled.

`data/collector.json` pins the last published source snapshot and checksum. `data/release.json` pins the website version, checksum, and HTTPS artifact URL. The descriptor URL takes precedence over the legacy `UFC_DATASET_URL` environment variable. Local `--artifact` remains an explicit override.

The weekly job performs these steps in order.

1. Verify and restore the previous website artifact and database snapshot.
2. Collect into a new database copy and validate its integrity, identities, counts, and bout pairing.
3. Export with `--media-release` from the verified previous website version. Validate each media role against current source-hash reviews. Verify image bytes before copying derivatives. Fail when a reviewed role is missing. Retain ranking lists and their snapshot dates.
4. Validate the dataset, package it, and restore it into a separate directory. Check media equality, application tests, production build, and the full browser suite.
5. Publish separate source and website releases with run/attempt tags. Verify uploaded asset hashes. Keep application Latest selection. An incomplete upload leaves a draft for inspection.
6. Check that main still matches the run's starting commit. Commit both descriptors together and push normally. A concurrent change rejects promotion. Published orphan artifacts can remain available for inspection.
7. Call the Vercel Deploy Hook, wait for the expected public dataset version, and run deployed HTTP checks. A failed or timed-out deployment fails the workflow. Inspect Vercel before retrying. A fresh run starts from the descriptors now in main.

Set the repository Actions secret `VERCEL_DEPLOY_HOOK` to a Vercel hook that targets main. Create it under Vercel Project Settings > Git > Deploy Hooks. The workflow checks this secret before a publishing run. Automatic commits use `GITHUB_TOKEN`. The hook explicitly starts deployment because automatic commits do not start another ordinary GitHub push workflow. Full validation runs before publication in this same workflow.

For rollback, restore both descriptors from a prior successful data commit and push the change. Retain the referenced release assets. To pause automatic updates, disable `Weekly website data release` in Actions. GitHub schedules can be delayed and public repositories can disable inactive schedules after 60 days. Check Actions failure notifications and the workflow's recorded deployment result.
