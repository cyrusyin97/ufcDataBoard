# Development plan

Authority: [Product Spec](product-spec.md) defines all current product behavior.
This plan tracks delivery only. Historical B/U/BA exit-gate identifiers describe their original milestone scope; use Product Spec journeys and C01–C20 for current change acceptance.

## Delivery rule

Complete each gate before starting dependent work.
Keep evidence with the milestone report.
Use [Product Spec journeys J01–J17](spec/user-journeys.md#3-user-journeys) as the current interaction review checklist.
A working build does not prove visual parity.
A visual recording does not prove data accuracy.

## M0: Foundation

Implemented. See [foundation validation](validation.md#m0-foundation-validation).
The runnable foundation and initial documents are complete. Current architecture is owned by [Product Spec components](spec/components.md).

## M1: Data and media pipeline

Implemented and checked. See [M1 report](m1-report.md).
The exporter, identity mapping, public contracts, and reviewed media pipeline are complete within the recorded scope.
Use [data operations](data-operations.md) for commands and [data semantics](spec/data-and-scoring.md) for current rules.

## M2: Rankings interface

Implemented and checked. See [M2 report](m2-report.md).
Its initial two-division scope was later expanded to all 11 captured divisions.
Use [journeys J01–J03](spec/user-journeys.md#j01--start-or-restore-rankings) and C01–C04 for current acceptance.

## M3: History and navigation

Implemented and checked. See [M3 report](m3-report.md).
Use [journeys J04–J07](spec/user-journeys.md#j04--open-and-read-fighter-history) and [navigation](spec/navigation.md) for current behavior.

## M4: Motion and visual parity

Accepted for the agreed desktop baseline and the mobile composition approved on 2026-10-15.
See [M4 report](m4-report.md) for evidence and limitations.
Later M6 motion revisions have their own acceptance gate. Deployed performance and browser checks remain part of M5.
Current motion rules are in [animation](spec/animation.md).

## M5: Release

Status: In progress. M4 is accepted. Local release preparation is implemented.
Preview, hosting, domain, and publication rights remain pending.
Read [the M5 report](m5-report.md).
User input: Check public name, domain, hosting account, and data update policy.

Work:

1. Check media provenance and publication rights.
2. Create a Vercel preview deployment.
3. Run the complete acceptance matrix against that deployment.
4. Configure the approved domain and DNS records.
5. Check HTTPS, caching, direct links, and rollback.

Deliverables: Preview URL, production URL, release report, and operator instructions.

Validation path:

- Check direct detail links after a cold visit.
- Check asset responses and dataset version consistency.
- Check source labels and snapshot dates.
- Check release performance targets on a documented device.
- Restore the previous deployment in a rollback exercise.
- Rebuild with the previous dataset version.

Exit gate: The user accepts the release preview and every release check passes.
Publish only after the release gate above passes.

## Change control

Update Product Spec before changing accepted behavior.
Record architecture changes in the decision log.
Update affected checks when a requirement changes.
Keep milestone status separate from planned work.

## All-division UI expansion

Date: 2026-10-16.
Status: Implemented. Checks appear in the expansion report.
The user authorized all 11 captured weight divisions after the selector correction.
Read [the expansion report](all-divisions-report.md).
Check explicit source ranks, champion defaults, all 176 selections, detail routes, and narrow menus.
Keep the M5 hosting gate separate.

## M6: Bout analysis from V9

Status: Accepted for submission on 2026-10-24. M6.1 through M6.4 have local checks and user acceptance.
Deployment validation remains part of M5. The accepted M6 dataset is now the default build dataset.
Read [the M6 data report](m6-data-report.md).
Scope recorded: 2026-10-23.
Depends on the implemented M1 data pipeline and M3/M4 navigation and UI.
Local M6 work does not depend on M5 hosting completion.
M5 remains in progress; this milestone does not approve a release.
Read [Product Spec scoring and data rules](spec/data-and-scoring.md#7-data-semantics-and-scoring).

### M6.1: Contracts and reference policy

Complete. See [source and contract audit](m6-contract-design.md).
The user confirmed the policy on 2026-10-23. Current rules are in [data and scoring](spec/data-and-scoring.md).

### M6.2: Export and scoring

Implemented and checked. See [data report](m6-data-report.md).
The candidate is opt-in and separate from the active release. Use [data operations](data-operations.md#optional-bout-analysis-export) for isolated export and preview commands.

### M6.3: Interface and navigation

Implemented and checked. See [interface report](m6-interface-report.md), including the subsequent motion, badge, sticky-return, and viewport revisions.
Current requirements are [J08–J13](spec/user-journeys.md#j08--open-bout-analysis-from-history), [navigation](spec/navigation.md), [design](spec/design-protocol.md), and [animation](spec/animation.md).

### M6.4: Verification and release integration

Status: Local automated checks and integrated user acceptance are complete. Hosted release promotion remains in M5.

- Compare desktop cards against V8 and the bout panel against the latest V9.
- Check mobile layouts, reduced motion, keyboard controls, and touch access.
- Test rapid changes, failed requests, missing media, invalid data, and unknown bout IDs.
- Run applicable code, pipeline, production-build, and browser checks.
- Record data coverage, reference limitations, screenshots, and remaining release risks.
- Include the new immutable data artifacts in the existing M5 preview and rollback checks.

Exit gate: The applicable [C01–C20 checks](spec/critical-tests.md) pass for the integrated candidate and the user accepts the preview. Historical BA01–BA12 definitions remain in the archived V9 specification.
Do not mark M6 complete from the single-bout prototype checks.

### M6 review checkpoint — 2026-10-24

The requested motion, entry-control, text, sticky-return, and viewport revisions are implemented.
The latest recorded run passes 48 bout checks across three browsers and three existing Chromium motion checks.
Read [the interface report](m6-interface-report.md) and [scroll receipt](evidence/m6-scroll-validation.json).
The candidate preview uses `work/next-m6-scroll` on port 3003.
The active data pointer and production release descriptor still use the previous release.

Remaining work:

- User acceptance was received on 2026-10-24; submit the checked implementation.
- Carry the accepted candidate into M5 deployment and rollback checks when release inputs are ready.
- The accepted M6 data version is promoted locally; publish the hosted release only through the documented process.

Product Spec is the sole current standard and includes J01–J17 and C01–C20. This does not replace recorded evidence or the user acceptance gate.

### M6 submission acceptance — 2026-10-24

The user confirmed that M6 can be submitted. The accepted scope includes the latest review corrections and recorded local checks.
The source and tests can be committed and pushed. M5 owns hosting, media rights, deployed verification, rollback, and production dataset promotion.
The active dataset pointer and release descriptor remain unchanged.

### Default dataset promotion — 2026-10-24

The user requested the latest accepted data version as the formal build version.
`data/release.json` and the local public pointer now select `2026-10-14-5949094d82ded09a`.
The exact checked archive is retained in `outputs/datasets/` with its checksum and descriptor. The prior archive and descriptor remain available for rollback.
Artifact upload, `UFC_DATASET_URL` configuration, publication rights, and hosted checks remain M5 work.
This changes the default dataset, not the source snapshot date or source database.
