# Validation log

This file is a chronological evidence log. Each entry retains its original scope and date.
Use [development plan](development-plan.md) for current gates and [Product Spec](product-spec.md) for current behavior.

## M0 foundation validation

Date: 2026-10-13.
Scope: The application foundation and project documents.
This report does not certify V6 visual parity.

## Environment

- Local runtime: Node.js 25.6.1 and npm 11.9.0.
- Target runtime: Node.js 24.
- Framework: Next.js 16.4.0 and React 19.3.0.
- Styles: Tailwind CSS 4.3.3.
- Motion dependency: GSAP 3.15.0.
- Browser tests: Playwright 1.64.0.

The CI configuration selects Node.js 24.
No remote CI run occurred during this task.
The lockfile records all exact versions.

## Results

| Check                       | Result  | Scope                                                          |
| --------------------------- | ------- | -------------------------------------------------------------- |
| ESLint                      | Pass    | Application code and test code                                 |
| TypeScript                  | Pass    | Strict compilation checks                                      |
| Vitest                      | Pass    | Five selection and ranking contract tests                      |
| Production build            | Pass    | Static foundation routes through webpack                       |
| Browser smoke test          | Pass    | Production route, roster, refresh, and browser errors          |
| STE document check          | Pass    | Zero findings across all project documents                     |
| Document links              | Pass    | Final document set                                             |
| Production dependency audit | Pass    | Zero reported vulnerabilities                                  |
| Full dependency audit       | Warning | Five high-severity reports in one development dependency chain |

## Build adjustment

Turbopack failed when its CSS worker tried to bind a local port.
The webpack build completed successfully.
Development and build scripts now select webpack explicitly.

## Dependency finding

The audit reports a stack-exhaustion issue in `braces`.
The ESLint dependency chain includes that package through `micromatch` and `fast-glob`.
The audit reports five affected packages in that chain.
The production-only audit reports zero affected packages.

The audit suggests a major downgrade of the Next.js lint configuration.
This task did not apply that incompatible downgrade.
Recheck the development dependency chain before M5.
Do not pass untrusted glob patterns to these development tools.

## Remaining work

M1 is now complete. M2 through M5 remain planned.
The current page shows the reference roster and snapshot date.
It does not implement the selector, history, preview, or transition controllers.
The local source database and V6 prototype remain unchanged.

## V7 prototype update

Date: 2026-10-14.
The Champion default replaces the earlier Movsar default.
The updated five unit tests and TypeScript checks pass.
The updated documents pass the STE check without findings.
The browser checks category drawers, repeated switching, refresh, and Lightweight navigation.
See [the V7 report](../outputs/designs/ufc-rankings/README-v7.md) for prototype evidence.
Application milestones M1 is now complete. M2 through M5 remain planned.

## V8 design and document alignment

Date: 2026-10-14.
V8 adds the main category heading to the drawer timeline.
The heading contains both division name and weight.
Browser samples show full departure beyond the left edge.
The settled heading transform equals none.
The last captured samples keep the same right edge after cleanup.
The browser warning and error logs are empty.
See [the V8 report](../outputs/designs/ufc-rankings/README-v8.md) and [frame samples](../outputs/designs/ufc-rankings/title-checks-v8.json).

V8 is the current accepted design reference.
Project documents now include division context, champion defaults, and all category drawers.
The production route contract uses query parameters rather than prototype hashes.
M0 remains complete.
M1 is now complete. M2 through M5 remain planned.
This document update does not add application features or repeat browser tests.

Document links pass the local path check.
The updated documents pass formatting and STE checks without findings.

## Architecture coverage clarification

Date: 2026-10-14.
The design now separates initial interface scope from complete data coverage.
All divisions use configurable production contracts.
Unranked fighters remain in the source archive.
The development plan includes additional division and unranked fighter fixtures.
The M1 report records the completed data checks. UI checks remain planned for M2 and M3.
This update changes documents only.

## Media acquisition investigation

Date: 2026-10-14.
Four athlete pages and their image candidates received bounded public HTTP checks.
The samples include another division and a fighter outside the initial rankings.
Pillow decoded 13 image responses successfully.
Four transparent WebP variants preserve aspect ratio.
Justin's tall original received a visual check.
Movsar and Justin conditional image requests returned HTTP 304.
One child sitemap supplied 26 athlete URLs.
The database contains nine duplicate normalized-name groups.
The offline extractor's six tests pass.

The V7 Lightweight full-body coverage claim was incorrect.
All 16 files with that label are 520 × 325 headshots.
The acquisition design now blocks that classification rule.
Prototype files remain unchanged.
The M1 report now records the completed production correction and media pipeline.
See [the investigation receipt](evidence/media-2026-10-14.json) for measured evidence.

## M1 completion

Date: 2026-10-14.
M1 acceptance checks passed for the complete source archive and initial media set.
Read [the delivery report](m1-report.md) and [structured receipt](evidence/m1-validation.json).
The source database and preserved prototypes remain unchanged.
M2 through M5 remain planned.

## Additional ranked media

Date: 2026-10-14.
The nine additional weight divisions contain 144 reviewed fighters.
Collection supplied 432 source images and 864 verified WebP variants.
All 18 visual batches passed identity and anatomical role checks.
The new release passes runtime contracts and production HTTP checks.
Read [ranked media expansion](ranked-media-expansion.md) for the completed report.
The source database and preserved prototypes remain unchanged.
The initial interface scope remains two divisions.

## M2 completion

Date: 2026-10-14.
M2 implements the rankings home interface with the M1 release.
All 32 ranked fighters pass click, profile, and recent result checks.
Wheel, drag, keyboard, category defaults, and selected URL refresh checks pass.
A five-entry third division fixture uses the same components.
The 14 unit tests and seven production browser tests pass.
The production build, ESLint, and TypeScript checks pass.
Desktop region geometry differs from V8 by at most one CSS pixel.
Read [the M2 report](m2-report.md) for captures and detailed scope.
M3 through M5 remain planned.

## M3 completion

Date: 2026-10-14.
M3 implements complete recorded history and persistent navigation.
Ranked and unranked opponents resolve by stable ID.
Direct entry, refresh, Back, Forward, and return selection checks pass.
Preview checks cover hover, focus, Escape, touch, and late responses.
Failure checks cover unknown IDs, empty history, failed images, and interrupted requests.
All 21 unit tests and 17 production browser tests pass.
The production build, ESLint, and TypeScript checks pass.
Read [the M3 report](m3-report.md) for screenshots and detailed evidence.
M4 and M5 remain planned.

## M4 engineering validation

Date: 2026-10-15.
M4 implements GSAP motion for selection, category changes, history, and opponent previews.
Final live glyphs retain their identity after cleanup.
Category checks cover both viewport edges and four alternating changes.
Interruption checks cover resize, return, native Back, reduced motion, and keyboard actions.
The production build, ESLint, TypeScript, and all 21 unit tests pass.
Read [the M4 report](m4-report.md) and [structured receipt](evidence/m4-validation.json) for browser results and measured frames.
Firefox browser-level Back after direct entry and reload remains a recorded compatibility difference.
A standalone page reproduces the difference; native History.back succeeds.
The user approved the mobile composition on 2026-10-15.
All 21 Chromium checks and the latest ten focused Firefox and WebKit checks pass.
Headless lab traces do not certify field INP or native 60 FPS on a release device.
M4 acceptance is complete for the agreed desktop baseline and approved mobile composition.
M5 release remains planned. Its browser and performance checks remain open.

## M5 local preparation

Date: 2026-10-15.
Node.js 24.22.0 passes the production build and all 27 unit tests.
All 21 Chromium browser tests pass on that runtime.
Two preview-target browser checks and 17 local HTTP checks pass.
Current artifact restore, repeated restore, and an isolated previous-version rebuild pass.
All 24 pipeline tests pass.
The production dependency audit reports zero advisories.
The complete audit retains five high-severity development dependency findings.
The media inventory retains 512 unknown publication rights statuses.
GitHub source CI passes after removing local interpreter and dataset dependencies from tests.
Remote build and browser checks remain skipped until the artifact URL is configured.
M5 remains in progress. No hosting release occurred.
Read [the M5 report](m5-report.md) for remaining inputs and limits.

## Division menu and ranking headshot correction

Date: 2026-10-15.
The division menu matches the V8 custom menu.
Both published rankings use reviewed 520 by 325 headshots with centered framing.
All 32 headshots pass source and variant checks.
The source database, all fighter facts, and all body image hashes remain unchanged.
The Node.js 24 production build, ESLint, TypeScript, 29 unit tests, and 25 pipeline tests pass.
All 23 Chromium checks pass, including two corrected checks on a focused rerun.
Four focused Firefox and WebKit checks pass.
The pinned archive restores successfully into an isolated root.
Read [the correction report](selector-correction.md) for test adaptations and evidence.

## All-division UI expansion

Date: 2026-10-16.
All 11 captured weight divisions are available in the UI.
All 176 fighters pass individual selection, record, profile, and recent-result checks.
Each division passes menu selection, champion default, direct history, reload, and return checks.
The source ranks retain the Women's Flyweight tie at rank six.
The desktop pages and narrow menu pass visual review.
The production build, ESLint, TypeScript, 29 unit tests, and 28 pipeline tests pass.
All 46 Chromium checks pass, including one corrected fixture on a focused rerun.
All 30 focused Firefox and WebKit checks pass.
The pinned archive restores into an isolated root.
The source database, 4581 fighter bundles, and 528 media source and variant hashes remain unchanged.
Read [the expansion report](all-divisions-report.md) for source dates, test adaptations, and evidence.
M5 remains in progress. No hosting release occurred.

## V9 prototype and documentation boundary

Date: 2026-10-23.
The local V9 prototype contains one bout, two fighter histories, formula v1.1, and historical reference bounds.
Its report records Chromium navigation, round updates, scoring fixture checks, and desktop/mobile captures.
Latest revisions restore V8 history and profile cards and remove radar click activation.
These are prototype checks, not production acceptance.
No production bout export, scoring contract, or integrated route is certified by this record.
M6 remains planned. M5 release status is unchanged.
Read [the specification and acceptance matrix](archive/bout-analysis.md) before implementation.

Documentation checks for this update:

- `npm run format:check` passes.
- Relative file links in all eight changed or added documents resolve locally.
- Application, pipeline, and browser suites were not rerun. This update changes documentation only.

## M6.1 audit and contract foundation

Date: 2026-10-23.
The read-only source audit covers 11,559 bouts and verifies an unchanged source checksum.
It records missing statistics, null control time, unsupported duration, event aliases, and historical division coverage.
Read [the contract design](m6-contract-design.md) and [audit receipt](evidence/m6-bout-audit.json).

Implemented initial bout/reference Zod schemas and a policy-independent formula v1.1 scoring function.
All 39 unit tests pass, including ten new contract and scoring checks.
Five Python duration, division, and date audit-rule tests pass.
TypeScript, ESLint, and the repository format check pass.
The current production routes, exported release, and source database remain unchanged.
The application build and browser suites were not run for these disconnected domain modules.
The complete export/media pipeline suite was not rerun; the existing pipeline is unchanged.
M6.1 remains in progress pending the cohort policy answer and artifact integration decisions.

## M6.2 export and reference generation

Date: 2026-10-23.
The user confirmed the five-year, 50-bout reference policy and 60-second short-period threshold.
M6.1 is complete. M6.2 exports all 11,559 bouts and 6,189 historical reference artifacts.
The complete extension passes runtime contracts and dataset checks.
Repeated exports produce the same version.
Isolated packaging and restoration pass after increasing the bounded archive entry limit to 40,000.
The initial 20,000-entry restore rejection and its correction are recorded in [the M6 data report](m6-data-report.md).
The active website dataset and production descriptor remain unchanged.

Node.js 24.22.0 passes the production build and type checks.
The complete pipeline suite passes 38 tests.
The unit suite includes 42 tests after the archive-bound regression was added.
Read [the structured data receipt](evidence/m6-data-validation.json) for coverage and artifact hashes.
Browser checks were not run for this stage. M6.3 and M6.4 remain pending.

## M6.3 interface and navigation

Date: 2026-10-23.
The production application integrates the V9 bout panel with the existing history and profile cards.
Node.js 24.22.0 passes the production build, TypeScript, ESLint, and 51 unit tests.
All 46 existing Chromium checks pass, including focused fixture and output-directory reruns.
The final bout suite passes ten tests per browser in Chromium, Firefox, and WebKit: 30 checks.
Desktop/mobile captures, missing-data behavior, short-sample labels, and keyboard disclosure access pass.
Read [the interface report](m6-interface-report.md) for test corrections and performance limits.
Read [the structured receipt](evidence/m6-interface-validation.json) for final counts.
M6.3 is implemented. M6.4 awaits user acceptance of the integrated preview.
The active data pointer and production release descriptor remain unchanged. M5 hosting remains pending.

## M6 transition revision

Date: 2026-10-23.
The user requested symmetric portrait and event-title motion between history and bout detail.
The final candidate passes 39 bout and motion checks across Chromium, Firefox, and WebKit.
Three existing Chromium motion checks also pass. The unit suite passes 51 tests.
The production build, TypeScript, ESLint, format check, and whitespace check pass.
The checks cover final live glyph identity, changing intermediate geometry, reverse direction, history scroll restoration, resize, and reduced motion.
An initial frame-count threshold was replaced with distinct geometry assertions. This does not certify native frame rate.
Regression checks exposed native Forward loss during server prop replay. Pinning the mounted dataset corrected that race.
The final 39-check run has no failures.
Read [the motion receipt](evidence/m6-bout-motion-validation.json).
The updated local preview uses port 3003 and `work/next-m6-motion-final`.
M6 user acceptance remains pending. The active data pointer and release descriptor are unchanged.

## M6 second UI review

Date: 2026-10-23.
The five requested revisions are implemented in `work/next-m6-review2`.
The candidate passes 45 bout and motion checks across Chromium, Firefox, and WebKit.
Three existing Chromium motion checks and 52 unit tests pass.
The production build, TypeScript, ESLint, format check, and whitespace check pass.
Checks cover matching title fonts, both badge entries, return history ownership, sticky return visibility, and separate inspection rows.
Read [the review receipt](evidence/m6-review-controls-validation.json).
The updated preview remains on port 3003. M6 user acceptance remains pending.

## M6 viewport return correction

Date: 2026-10-23.
The old preview reset document scrollY from 240 to 0 on bout return at 1169 by 670.
The fixed build retains 240 throughout sampled animation frames and after cleanup.
A subsequent native Back retains 320. Both normal and reduced-motion modes pass.
The final run passes 48 bout and motion checks across Chromium, Firefox, and WebKit.
Three existing Chromium motion checks also pass.
The production build, TypeScript, ESLint, formatting, and whitespace checks pass.
Read [the scroll receipt](evidence/m6-scroll-validation.json).
The preview remains on port 3003 and uses `work/next-m6-scroll`.
M6 acceptance remains pending. The active data pointer and release descriptor are unchanged.

## Documentation and journey audit

Date: 2026-10-24.
The documentation now includes [user journeys J01–J17](spec/user-journeys.md).
The catalog covers rankings, history, opponent previews, bout entry, participant and period changes, score inspection, return paths, direct URLs, input methods, and recovery states.
The audit compared those flows with the current components, route controller, and test descriptions.
README and AGENTS link the catalog. Requirements B25–B29 and the development plan include the recent review revisions.
Resolved cohort rules no longer appear as open product decisions.
Technical design and bout specifications distinguish implemented behavior from pending acceptance and deployment.
Documentation formatting, local links, heading anchors, and whitespace are checked for this update.
Application tests were not rerun for this documentation-only change. The prior receipts retain their original dates and scope.
M6 user acceptance and M5 release remain pending.

## Product Spec consolidation

Date: 2026-10-24.
[Product Spec](product-spec.md) is now the sole normative product logic standard.
It consolidates current behavior, 17 journeys (J01–J17), 20 critical cases (C01–C20), design, motion, scoring, module ownership, and maintenance rules.
The audit compared the spec with the current implementation and existing check receipts.
The five earlier product documents remain as superseded historical references. README, AGENTS, the documentation map, and the development plan point to the new standard.
Local-link validation passes for 226 links in 26 Markdown files, including heading anchors. Journey and critical-case identifiers are complete and unique.
Formatting and whitespace checks pass for this documentation-only update.
No application code changed in this consolidation. Application tests were not rerun; prior evidence retains its original scope and date.
M6 user acceptance and M5 release remain pending. Performance budgets are targets, not newly measured results.

## Documentation topic split and cleanup

Date: 2026-10-24.
[Product Spec](product-spec.md) is now a 44-line index for 14 owning topic documents.
J01–J17 and C01–C20 remain complete and unique.
Four superseded standards moved to `archive/`; the old duplicate journey file was removed after link migration.
The development plan decreased from 301 to 142 lines by replacing completed checklists with status and references.
The [documentation audit](documentation-audit.md) records each maintained file's disposition and separately inventories local research/prototype documents.
Historical reports now identify their dated scope. The validation heading and obsolete contributor/script entry points are corrected.
Local Markdown paths and heading anchors, formatting, and whitespace checks pass.
Application tests were not rerun for this documentation-only change. Runtime behavior, source data, preserved prototypes, and release state are unchanged.
M6 user acceptance and M5 release remain pending.
