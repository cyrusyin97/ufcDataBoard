# M0 validation

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
