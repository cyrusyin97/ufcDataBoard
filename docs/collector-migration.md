# Collector migration

Date: 2026-11-02. Status: Local migration and isolated candidate collection validated. Remote cutover remains pending.

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

## Cutover and remaining work

Before activating a schedule:

- Baseline reconciliation passed locally: the selected source SHA-256 matches the production manifest. Integrity and append-only checks do not certify every statistical value. See the candidate report.
- Run and review one manual candidate job after these files are committed and pushed.
- Choose the durable immutable baseline and the procedure that selects the next baseline. The current workflow requires explicit selection; it does not maintain a rolling pointer.
- Keep the old collector disabled and establish one collection owner. Retain old snapshots for rollback.
- Restore the reviewed media seed before export and implement independent ranking refresh/identity checks.
- Connect validated candidates to export, package validation, immutable dataset publication, descriptor updates, preview checks, and website promotion.

The website's `data/release.json`, public pointer, Vercel environment, and active dataset are unchanged. The migration is not an end-to-end automatic data release implementation.

## Historical pairing closure

Debut profiles can add earlier DWCS fights that are absent from the recent UFC event listing. After event reconciliation, inspect all fight perspectives. For a single-sided fight, read its source details, validate both stable fighter IDs, fetch the missing opponent profile, and store the source details. Repeat until histories are paired or the extra request budget is exhausted. `--repair-limit` defaults to 64 additional requests. A source identity mismatch, unavailable opponent history, or exhausted budget fails the job; no inverse outcome/statistics are fabricated. Candidate validation independently rejects unpaired fights before snapshot publication.
