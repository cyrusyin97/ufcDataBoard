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

## M7: Journey performance measurement

Status: Implementation candidate started on 2026-10-30. M7.1–M7.3 code and tests are present. M7.4–M7.5 remain in validation; no complete performance acceptance is claimed.
The user requested measurement before optimization. This milestone does not include interaction fixes, vendor activation, telemetry upload, or deployment.
Evidence: [M7 implementation report](m7-report.md).
Authority: [measurement specification](spec/performance-measurement.md). Context: [deployed audit](performance-audit-2026-10-26.md).

### M7.1: Recorder and contracts

Status: Implemented candidate.

Implement bounded records, injectable clock, outcome handling, schema versions, and pure export summaries. Add the disabled lazy entry point and console adapter.
Exit: PM01, PM02, PM07 and relevant bound/error unit checks pass. No runtime dependency is added without a measured need.

### M7.2: Journey hooks

Status: Implemented candidate.

Instrument the existing input, navigation, store, media preparation, preview, and motion owners. Carry transaction context across asynchronous work. Preserve current sequencing and durations so this remains a pre-optimization baseline.
Exit: PM03, PM04 and selected PM08 behavior checks pass. Records distinguish requests, cache paths, interruption, commit, and timeline completion.

### M7.3: Frame sampling and lifecycle

Status: Implemented candidate.

Add the bounded shared frame sampler, feature-detected long-frame summaries, visibility handling, capture limits, and failure isolation.
Exit: PM05, PM06, PM07 pass. Unsupported engines export null capabilities rather than false zero measurements.

### M7.4: Production-build overhead validation

Status: In progress. [Runbook](performance-measurement-runbook.md) defines the available harness and missing acceptance evidence.

Create repeatable scene fixtures and an operator runbook. Execute the specification's off/on comparison with an independent browser measurement source. Record bootstrap size and retention behavior.
Exit: PM09 passes with dated receipts. If independent tracing is unavailable or noise prevents comparison, report that blocker and keep the gate open. Functional browser tests do not substitute for this gate.

### M7.5: Freeze baseline and report

Status: Pending the complete overhead gate.

Capture repeated dial and navigation sequences on the unoptimized implementation. Save versioned summaries, environment metadata, counts, limits, and outcomes. Include desktop and mobile/reduced-motion functional checks; document the actual devices used for performance measurement.
Run `npm run check` with the required local dataset and Node.js 24, targeted browser checks, and changed-document formatting checks.
Exit: PM01–PM09 have recorded evidence, the measurement runbook is reproducible, and the baseline report clearly separates loading, animation duration, and frame cadence.

Only after this gate should a separate optimization work item change dial behavior, request scheduling, rendering, or animation timing. Compare each such change against the frozen baseline. M5 still owns hosted release acceptance.

### M7.6: Local Stats for nerds panel

Approved on 2026-11-01. Implemented with PM10–PM12 scoped evidence in the [M7 report](m7-report.md#stats-for-nerds-extension--2026-11-01). The warm dial comparison passes numeric limits; full M7 baseline acceptance remains open.
Add the blank-area context-menu entry and an opt-in live panel. Use bounded counters, the shared sampler, and 2Hz isolated UI updates. Preserve native context menus on content and controls. No Worker or server upload is added.
Exit: PM10–PM12 have dated evidence. Retain M7.4–M7.5 limits; panel testing does not close the full journey baseline gate.

## M8: Interaction performance fixes

Started 2026-11-02 at the user's explicit request. First pass implemented and locally validated; see the [M8 report](m8-report.md). M7 full baseline acceptance remains open. This request authorizes scoped before/after fixes using the existing recorder; it does not retroactively close M7 gates.

Preserve a source snapshot and unchanged-build measurements before editing runtime behavior. Compare the same production scenes with console capture on and the live panel closed. Use separate controlled-delay experiments to test feedback and request dependencies. Keep actual animation schedules unchanged.

First implementation scope:

- Move the dial toward accepted pending intent before data preparation completes. Retain committed selection, profile, portrait, and URL until atomic commit. Recover its position on failure.
- Retarget same-division selection from current interpolation. Keep hard settling for route changes, layout reset, reduced motion, and disposal.
- Start selected-fighter/media preparation concurrently with bout/reference work. Join validated branches before commit and abort remaining work on failure.
- Reuse four successful immutable image URLs. Do not cache failed or aborted readiness.

Exit: Record before/after feedback, prepare, settle, and frame-interval distributions with their limits. Pass latest-intent, failure recovery, identity, portrait continuity, title, scroll, and reduced-motion checks. Lower-confidence glyph/layout/paint candidates require profiling before a separate change. Deployed acceptance remains M5 work.

### M8 forward entry timing revision

The user approved approximately one-second entry to fighter history and bout detail on 2026-11-02. Shorten these two forward schedules to 0.94 seconds plus the existing frame hold/commit. Preserve return and opponent-replacement timing. Validate live shared elements, scroll, interruption, and reduced motion. Record warm M7 settle measurements separately from the earlier throughput comparison.

## M9: Collector consolidation and automated data updates

The user approved collector migration on 2026-11-02. First step implemented and checked: collectors, CLI paths, offline tests, CI coverage, and a manual isolated candidate workflow. See [migration report](collector-migration.md).
Remaining gates: authoritative baseline reconciliation, manual candidate run, durable snapshot selection, single-owner schedule activation, reviewed media seed recovery, ranking refresh, validated dataset publication, descriptor update, and preview/production verification. No collection or website promotion is authorized by normal CI. Do not mark full automation complete from code migration.

M9 checkpoint, 2026-11-02: The production-matching baseline and first local candidate update are validated through export, packaging, and restoration. Historical pairing closure was added after the real export caught a defect. See [candidate validation](collector-validation.md). Remote first run, durable snapshot publication, ranking refresh, clean-runner media recovery, and website promotion remain pending.
