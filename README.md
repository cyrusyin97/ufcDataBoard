# UFC Rankings

This project converts the approved V8 prototype into a maintained website.
M2 implements the V8 rankings home interface.
M3 implements full recorded history, opponent previews, and navigation.
M4 implements coordinated desktop motion.
The user approved the mobile composition on 2026-10-15.
M4 acceptance is complete for the agreed desktop baseline and mobile composition.
The report retains the open release checks.
Read [the M4 report](docs/m4-report.md) for evidence and limits.
M5 release preparation is in progress. Read [the M5 report](docs/m5-report.md).
M6 bout analysis was accepted for submission on 2026-10-24. The default dataset includes M6 analysis. Hosting release remains pending under M5.
Read [the M6 interface report](docs/m6-interface-report.md) for current review changes.

## Start

1. Install Node.js 24.
2. Run `npm ci`.
3. Run `npm run dev`.
4. Open <http://127.0.0.1:3000>.

Install a checked public dataset before starting the application.
Read [data operations](docs/data-operations.md) for artifact extraction.
No credentials or database are necessary at web runtime.
The V8 prototype includes two divisions with 16 fighters each.
The M1 pipeline includes both initial rankings and all source fighters.
The production design supports all divisions and the complete source fighter archive.
M1 provides configurable production contracts.
The current interface includes all 11 captured weight divisions and 176 ranked fighters.
Read [the all-division report](docs/all-divisions-report.md) for source dates and checks.
The build pins one dataset version.
Read [the M2 report](docs/m2-report.md) and [the M3 report](docs/m3-report.md) for completed checks.

## Check

1. Run `npm run check`.
2. Run `npx playwright install chromium`.
3. Run `npm run test:e2e`.
4. Run `npm run format:check`.

The browser test starts a production server on port 3000.
Stop another server on that port before this test.
Run the production build before the browser test.

## Documents

Read [Product Spec](docs/product-spec.md) first. It is the sole current product logic standard.
Its topic documents define journeys, functions, design, motion, components, file ownership, critical tests, and extension rules.
Use [the document map](docs/README.md) to find supporting procedures and evidence.
[AGENTS.md](AGENTS.md) defines the project workflow. [Development plan](docs/development-plan.md) tracks work and acceptance gates.
Read [validation](docs/validation.md) for recorded checks and [deployment](docs/deployment.md) for release procedures.
Earlier specifications are in `docs/archive/`. Do not maintain new behavior there.

## Reference

The existing-card reference is [V8](outputs/designs/ufc-rankings/index-v8.html).
Use [V9](outputs/designs/ufc-rankings/index-v9.html) and the recorded UI revisions for bout analysis.
Its base references are [V6](outputs/designs/ufc-rankings/index-v6.html) and [V7](outputs/designs/ufc-rankings/index-v7.html).
The prototype server uses port 4311.
The application uses port 3000.
The `outputs/` directory contains local artifacts and stays outside version control.
Archive the approved reference before another developer needs it.

## Layout

| Path              | Responsibility                                    |
| ----------------- | ------------------------------------------------- |
| `src/app/`        | Routes, metadata, and shared layout               |
| `src/components/` | Reusable interface components                     |
| `src/lib/domain/` | Data contracts and selection rules                |
| `src/lib/motion/` | Motion preparation, controllers, and text         |
| `src/data/`       | Small checked reference fixtures                  |
| `src/messages/`   | English interface text                            |
| `scripts/`        | Offline export and validation commands            |
| `tests/`          | Domain and browser checks                         |
| `docs/`           | Spec index, topic rules, procedures, and evidence |

## Data boundaries

The source database remains outside this project.
The website uses checked JSON exports.
Read [data operations](docs/data-operations.md) to export and check a dataset.
Do not copy private source files into the public directory.

Additional ranked media now covers the nine other weight divisions.
Read [the collection report](docs/ranked-media-expansion.md) for coverage and delivery checks.

## Release preparation

Use Node.js 24.x.
Restore the pinned dataset with `npm run data:restore -- --artifact /absolute/path/to/artifact.tar.gz`.
CI and hosting use the `UFC_DATASET_URL` secret instead of a local artifact path.
Run `npm run release:check` before a hosting build.
The current media rights status blocks deployment.
Read [the deployment guide](docs/deployment.md) for the remaining inputs.

The public repository excludes generated datasets, captured images, browser trace archives, and local design outputs.
Text evidence remains in `docs/evidence/`.
The excluded artifacts remain available in the original workspace.
A source checkout needs the checked artifact before production build and browser checks.
