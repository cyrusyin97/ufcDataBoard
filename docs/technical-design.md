# Technical design

Status: Proposed implementation based on the accepted V8 behavior.
Date: 2026-10-13.
M0 implements the foundation.
M1 implements the data and media pipeline.
M2 implements the rankings home interface.
M3 implements history and persistent navigation.
Later milestones implement coordinated motion and hosting.

## 1. Goals

Preserve the approved ranking, history, preview, and transition behavior.
Support all weight divisions through one configurable registry.
Expose two divisions in the first release.
Separate data preparation from browser rendering.
Keep navigation correct during refresh, cancellation, and repeated opponent changes.
Make every shown fact traceable to its source.

Read [product requirements](product-requirements.md) and [UI requirements](ui-requirements.md) first.
Read [the development plan](development-plan.md) for delivery gates.

## 2. Architecture

```text
Local UFCStats SQLite
        |
Python exporter + ranking map + media manifest
        |
Validated versioned JSON + image variants
        |
Next.js build ------ Vercel deployment
        |                   |
Server-rendered shell    Static files through CDN
        |                   |
Persistent React experience + lazy fighter bundles
```

The exporter reads SQLite outside the web runtime.
The build reads a small ranking snapshot.
The browser fetches one fighter bundle when necessary.
The CDN serves versioned files.
CDN means a content delivery network that caches files near users.

## 3. Stack and boundaries

| Layer             | Choice                                 | Reason                                                    |
| ----------------- | -------------------------------------- | --------------------------------------------------------- |
| Web framework     | Next.js App Router                     | Routes, metadata, server rendering, and Vercel deployment |
| UI                | React with TypeScript                  | Component boundaries and typed domain values              |
| Styles            | Tailwind CSS 4                         | Shared tokens and explicit component states               |
| Motion            | GSAP with `@gsap/react`                | Timelines, scoped targets, and cleanup                    |
| Media processing  | Pillow 12.3.0 in the planned media job | Decode, inspect, and generate reviewed image variants.    |
| Runtime contracts | Zod                                    | Reject invalid imported data                              |
| Export            | Python standard library and SQLite     | Reuse the local data source                               |
| State             | React reducer and refs                 | Keep state ownership explicit                             |
| Unit tests        | Vitest                                 | Check navigation and data rules                           |
| Browser tests     | Playwright                             | Check routes, input, failure paths, and visual behavior   |
| Hosting           | Vercel                                 | Managed Next.js deployment and asset delivery             |

Use Node.js 24 in CI and hosting.
The local machine currently provides Node.js 25.6.1.
Record that difference in validation results.
The package lockfile controls exact dependency versions.
Avoid a global state library until component boundaries require one.

## 4. Component plan

| Component              | Responsibility                                                    |
| ---------------------- | ----------------------------------------------------------------- |
| `RankingsPage`         | Read the ranking snapshot and provide initial route values.       |
| `FighterExperience`    | Own the reducer, route controller, and transition lifecycle.      |
| `CategoryDropdown`     | Select Featherweight or Lightweight in the rankings state.        |
| `CategoryHeading`      | Keep division name and weight in one motion element.              |
| `RankingDial`          | Convert wheel, pointer, and keyboard input into selection events. |
| `FighterFigure`        | Show a decoded image or a deterministic fallback.                 |
| `FighterProfile`       | Show career totals and sourced profile facts.                     |
| `FightHistory`         | Render all exported fights inside one scroll region.              |
| `OpponentPreview`      | Show a viewport-aware, nonmodal profile card.                     |
| `TransitionController` | Measure final elements and control one timeline.                  |

Keep the page and metadata on the server where possible.
Put pointer events and motion inside the client experience boundary.
Do not import SQLite code into client components.
Do not load all fighter histories in the initial JavaScript bundle.

## 5. Data contracts

Use the UFCStats fighter ID as the stable identity.
Keep the UFC.com slug as a separate field.
Never match fighters by name during a browser request.
Store ambiguous source matches in an explicit review file.

| Contract          | Required content                                                                        |
| ----------------- | --------------------------------------------------------------------------------------- |
| `RankingSnapshot` | Schema version, source URL, capture date, division, and ordered ranking entries         |
| `FighterProfile`  | ID, name, birth date, career record, measurements, stance, and field sources            |
| `FightRecord`     | Bout ID, fighter ID, opponent ID, event ID, date, result, method, round, and time       |
| `FighterBundle`   | Schema version, dataset version, profile, and ordered fight records                     |
| `MediaManifest`   | Fighter ID, image role, source URL, local variants, dimensions, hash, and rights status |

Use centimeters for stored height and reach.
Use ISO dates for known dates.
Keep unknown dates and measurements as `null`.
Calculate age from birth date and the shown snapshot date.
Never treat a captured age as a permanent value.
Keep formatting outside the data adapter.

Use UFC.com for rankings and media mapping.
Use UFCStats for recorded bouts and the initial career record.
Preserve UFC.com values as separate source observations when they differ.
Do not silently overwrite conflicting values.
Keep source URL and capture date for each source observation.

The `fights` table contains one row per fighter perspective.
A bout normally produces two such rows.
Count unique bout IDs for event totals.
Filter by fighter ID for fighter history.
Do not add `round=0` aggregates to per-round values.

## 6. Export and update process

The source path comes from `UFC_DB_PATH` or an explicit command argument.
The exporter opens SQLite with read-only access.
It must not run the scraper or update the database implicitly.

1. Open a consistent read transaction.
2. Check database integrity and required columns.
3. Read ranking mappings and source observations.
4. Normalize fields without inventing missing values.
5. Check unique IDs and every opponent reference.
6. Write files into a temporary version directory.
7. Write counts, checksums, source dates, and schema version.
8. Check every bundle with the runtime schema.
9. Publish the version directory only after all checks pass.

Use paths such as `/data/v1/<dataset-version>/fighters/<id>.json`.
The build embeds one dataset version.
This prevents a page from mixing old ranking data with new histories.
A failed export must leave the previous version intact.
M1 provides `npm run data:export` and `npm run data:check`.
Read [data operations](data-operations.md) for setup and commands.

The source scraper remains a separate operational task.
Run it manually until the user approves the update policy.
Keep the source database outside Git and the deployment artifact.

## 7. Routing and browser history

The production route plan uses query parameters.
It replaces the prototype's hash format.

| URL                                                       | Meaning                                             |
| --------------------------------------------------------- | --------------------------------------------------- |
| `/rankings`                                               | Featherweight home with its champion selected       |
| `/rankings?division=lightweight`                          | Lightweight home with its champion selected         |
| `/rankings?division=<division>&selected=<id>`             | Home with an explicit division and selected fighter |
| `/rankings?division=<division>&fighter=<id>&view=history` | Detail with its active division context             |

A redirect sends `/` to `/rankings`.
Check IDs against the dataset before loading a bundle.
Check division keys against the published division registry.
The first release publishes Featherweight and Lightweight.
A missing or invalid division uses Featherweight.
Check home selection against the active ranking.
Keep division context when an opponent does not belong to that ranking.
An unknown detail ID shows a recoverable not-found state.
An invalid home selection uses the champion default.
Do not silently show another fighter for an invalid detail URL.

Use one route controller inside the persistent experience.
Read the URL once during initialization.
Listen to `popstate` for browser traversal.
Use native history updates for same-page state changes.
Preserve framework history fields when adding application state.
Do not combine independent Next.js and native history writers for these transitions.

When home opens detail, push one application-owned detail entry.
When detail opens another opponent, replace that entry.
Before replacing detail, store its home selection in application state.
When browser Back reaches home, replace the home selection with the current detail fighter's return selection.
Use membership in the active division for that selection.
A fighter outside that ranking resolves to its rank zero.

For a direct detail visit, create one home entry before the detail entry.
Mark application entries with a versioned ownership field.
On refresh, reuse the existing owned entry.
Do not create another home entry on each reload.
Do not intercept navigation to an external history entry.
After the application returns home, the next Back may leave the website.

The return button uses Back only when an owned home entry exists.
Otherwise, it replaces the current entry with the computed home URL.
Duplicate route events must not restart data requests or animations.
M3 must test Back, Forward, direct entry, reload, and repeated navigation.

## 8. State and request lifecycle

The reducer uses these phases:

| Phase           | Allowed work                                                       |
| --------------- | ------------------------------------------------------------------ |
| `rankings`      | Select a ranked fighter or request history.                        |
| `history`       | Scroll, preview an opponent, or request navigation.                |
| `preparing`     | Fetch target data and prepare media. Keep current content visible. |
| `transitioning` | Animate the committed target elements.                             |
| `error`         | Keep existing content and expose retry or return.                  |

Store active division, selected ID, detail ID, preview ID, phase, and request generation.
Keep DOM references and GSAP timelines outside serializable state.
A generation number identifies the newest navigation request.
Abort obsolete fetches where possible.
Discard stale responses even when abort cannot stop completion.
A return action cancels pending preparation and active motion.

Cache bundles by dataset version and fighter ID.
Remove failed promises from the cache.
Bound the cache to 32 recently used bundles initially.
Reset history scroll when the shown fighter changes.
Do not reset scroll when a preview opens.

## 9. Motion lifecycle

FLIP means First, Last, Invert, Play.
The controller measures source and final geometry.
It places final elements at the source position with transforms.
It then animates those elements toward their settled position.

1. Fetch the target bundle.
2. Wait for required fonts.
3. Decode the target image or choose its fallback.
4. Check that the request still owns navigation.
5. Capture the preview geometry.
6. Commit the target layout while blocking an intermediate paint.
7. Measure the final text elements.
8. Apply inverse transforms in a layout effect.
9. Start one scoped GSAP timeline.
10. Remove overlays and temporary styles after completion.

Use the final glyph elements when wrapping or tracking differs.
Match glyphs only when their text and semantic keys agree.
Expose one accessible text value outside decorative glyph spans.
Keep scale uniform to avoid stretched letters.
Keep the final font loaded before measurements.

Opponent transition timings follow the V6 behavior retained in V8:

| Motion                  | Duration | Delay  |
| ----------------------- | -------- | ------ |
| Text transform          | 1000 ms  | 0 ms   |
| Outgoing image and card | 260 ms   | 0 ms   |
| Incoming image          | 620 ms   | 180 ms |

These values are reference values, not measured performance guarantees.
Do not reintroduce a container entrance animation after detail transitions.
Images own opacity transitions.
The portrait container stays at opacity one in detail mode.

Scope GSAP targets to the experience root.
Use context cleanup for unmount and interrupted transitions.
Track overlays separately from live profile elements.
Cancel timelines, remove snapshots, and clear temporary styles together.
Repeat cleanup safely when it runs twice.
Reduced motion commits the final state without spatial movement.
A resize during motion cancels the transform and shows the final layout.

## 10. Media and performance

Follow [the media acquisition design](media-acquisition.md) for collection and processing.
The investigation found incorrect Lightweight full-body labels in the V7 source collector.
M1 supplies reviewed full-body bindings for the initial 32 fighters.
The preserved prototype keeps its historical media files.
Do not infer anatomical roles from social metadata or filenames.

Generate separate thumbnail, half-body, and full-body variants.
Keep transparency for fighter cutouts.
Store dimensions to reserve image space.
Keep original source images outside the initial page payload.
Do not eagerly decode all full-body images.
Preload the selected image and prepare likely targets after user intent.

Use versioned JSON and hashed media paths for immutable caching.
Do not mark unversioned manifests as immutable.
Show the snapshot date near source attribution.
A later update becomes a new build and dataset version.

Initial release targets need measurements on a documented device:

- Target LCP at or below 2.5 seconds.
- Target CLS at or below 0.1.
- Target INP at or below 200 milliseconds.
- Target 60 FPS during desktop transitions.
- Keep initial compressed application JavaScript below 250 KB where feasible.

LCP measures when the largest visible content appears.
CLS measures unexpected layout movement.
INP measures response delay after user input.
Use lab checks before release.
Use field measurements only after enough real traffic exists.

## 11. Failure and access behavior

Keep the current fighter visible during a failed target request.
Show a short error with a retry action.
Use a placeholder when an image fails or decode exceeds a bounded wait.
A late image must not replace another fighter's image.
Check the current request generation before any image commit.

Use buttons for actions and anchors for navigable destinations.
Preserve modifier-click and new-tab behavior.
Expose selector position and selected state to assistive technology.
Move focus to the new history heading after navigation.
Return focus to the selected row after closing history.
Keep loading announcements separate from decorative animation.

## 12. Validation and sources

M0 checks the foundation only.
M1 checks data integrity.
M2 and M3 check behavior.
M4 checks visual and motion parity.
M5 checks deployment and rollback.
The development plan defines the evidence for each gate.

Official implementation references:

- [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)
- [Tailwind with Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [GSAP with React](https://gsap.com/resources/React/)
- [Vercel custom domains](https://vercel.com/docs/domains/set-up-custom-domain)

Check these sources again before a major version change.

## 13. Category drawers

V8 defines the current category behavior.
The application migration remains planned.
Store active division independently from fighter identity.
Keep one ranking snapshot per division and capture date.
Share fighter bundles by stable ID across divisions.
A ranking entry describes membership, not a fighter's permanent division.

Use an outer motion layer for each row drawer.
Keep dial geometry on a separate element.
Use one GSAP controller for heading, rows, profile, and figure fades.
Prepare the target champion image before departure.
Measure profile travel before applying outgoing transforms.
Measure the old heading before departure.
Measure the new heading after committing its text.
Exclude existing transform offsets from geometry measurements.

Commit the new division before its incoming timeline starts.
Select rank zero during that commit.
Keep heading name and weight in one element.
Remove temporary transforms and opacity after completion.
Keep the portrait container free from automatic entrance animations.
Category preparation and opponent navigation use the same cancellation boundary.
A route change or unmount cancels obsolete work.
A resize during motion shows the final layout after cleanup.
Disable a second category request while the first transition runs.

### Reference timing

| Element       | Departure | Arrival | Arrival delay      |
| ------------- | --------- | ------- | ------------------ |
| Heading       | 340 ms    | 560 ms  | 0 ms               |
| Row drawers   | 340 ms    | 560 ms  | 35 ms between rows |
| Profile       | 400 ms    | 620 ms  | 20 ms              |
| Middle figure | 220 ms    | 420 ms  | 100 ms             |

Figure departure starts 100 ms after the departure timeline starts.
Arrival starts after departure completes.
The row delay affects the total timeline duration.
These values describe V8 and do not guarantee rendering performance.

### Source contract

The prototype reads local snapshots through HTTP.
Official HTML provides ranking and media observations.
Read-only SQLite queries provide Lightweight career totals and recorded fights.
The public JSON:API checks did not identify a usable ranking resource.
Do not describe this prototype as a live official API integration.

M1 exports both divisions with source dates and explicit field precedence.
Keep separate UFC.com observations when career totals differ.
Missing measurements, totals, or locations remain null.
The production adapter must normalize prototype omissions to null.
Never infer career finish totals from recorded fights.

## 14. All divisions and the fighter archive

A division registry is a configuration list of supported divisions.
Use stable machine keys that distinguish weight classes and competition categories.
Store label, weight metadata, default selection, snapshot reference, and publication state per entry.
Do not use a closed two-value enum in production data contracts.
Generate dropdown options from published registry entries.
Keep labels in message files for later translation.

Ranking entries reference fighter IDs.
They contain rank and champion status for that snapshot only.
Fighter profiles contain no permanent rank.
Keep division observations separate from ranking membership.
A bout's weight class does not prove the fighter's current division.
Derive the profile's visible ranking from the active snapshot.
An unranked fighter keeps a null visible rank.
Do not discard that fighter's profile or history.

The exporter must include all source fighters.
Do not export only fighters reachable from the initial rankings.
Check opponent references against the full fighter index.
Keep one lazy bundle per fighter ID and dataset version.
A direct detail URL must work for an unranked fighter without prior navigation.
Zero recorded bouts produce an empty array.
Unknown images and measurements retain the existing fallbacks.
Keep archive counts separate from ranking counts.

The M0 roster fixture contains 16 Featherweight entries.
Its ranking schema now accepts configurable division keys and list lengths.
M1 supplies independent production contracts for the full archive.
Production checks enforce valid IDs and consistent ordering per snapshot.
They must not require every future ranking to contain 16 entries.
Check the champion reference when a published division uses the champion default.
Report missing champion data before publication.
Do not invent a champion or silently select an unrelated fighter.

Use the same selector, profile, history, and motion components for every division.
Calculate loop boundaries from the active ranking length.
Calculate drawer distances from actual geometry.
Do not load the full archive into the initial browser payload.
Use a shared server or build index with lazy public fighter bundles.
Keep the complete archive available without requiring a global search interface.

## 15. Implemented M1 release boundary

The exporter keeps data and media inside one immutable release directory.
Use `/data/v1/<dataset-version>/media/<variant-hash>.webp` for generated media.
The version includes normalized content, source configuration, media metadata, and transform version.
A staging directory remains private until runtime checks pass.
The publication runner renames the checked directory before replacing the current pointer.
A publication lock prevents concurrent pointer writes.
Read [data operations](data-operations.md) for artifact delivery and rollback preparation.

## 16. Implemented M2 page boundary

The Next.js configuration pins the dataset version during the build.
It includes the published ranking files in server file tracing.
Server file tracing identifies files that a deployed server function needs.
Hydration connects server HTML to browser components.
The page resolves division and selection from query parameters.
It sends the published registry, ranked summaries, and one initial profile.
The initial profile contains up to three recent recorded results.
The browser requests another versioned bundle after a selection action.
It keeps a bounded profile cache and cancels obsolete requests.
A generation check rejects stale responses.
Read [the M2 report](m2-report.md) for the completed interface checks.
M3 now implements the route controller.
The M4 controller now coordinates the committed route and its visual transition.

## 17. Implemented M3 archive and navigation boundary

An owned entry is a browser history entry marked by this application.
The ownership field is `ufcRankingsV1` with version one.
A home entry has a unique key.
A detail entry references that home key.
The controller preserves framework fields during every native history update.
It pushes the first detail entry and replaces subsequent opponent entries.
Back computes the home selection from the latest committed detail fighter.
Direct detail entry creates the owned pair once.
Reload reuses the existing pair.
Traversal outside `/rankings` remains native browser behavior.

The server renders a loading shell for direct history URLs.
The browser then validates the requested ID against the pinned dataset.
Published ranking membership supplies known IDs for ranked fighters.
Other IDs require the complete versioned archive index.
The initial home payload does not contain that index or unranked bundles.
Archive media loads on demand from the same immutable version.
This follows [decision D14](decisions.md#d14-keep-direct-archive-loading-in-the-browser).

The experience reducer owns committed route, bundle, phase, error, and request generation.
A generation number rejects obsolete navigation results.
The fighter store caches only completed, checked bundles.
The cache uses one pinned version and stable fighter IDs.
It retains 32 recent bundles.
The three-row server seed is not a complete history cache entry.
Opening history fetches the complete bundle.
Failed and aborted responses do not enter the cache.

The preview owns its loading state and abort controller.
The trigger and card DOM references remain in refs.
Preview state contains identity and access intent only.
Closing the preview cancels its request and close timer.
A navigation suppresses automatic hover reopening until the pointer moves.
Keyboard focus and the explicit Preview button remain available.
Read [the M3 report](m3-report.md) for the completed checks.

## 18. Implemented M4 motion boundary

A motion transaction prepares data and images, departs the old layout, commits the target, and arrives at the final layout.
The experience reducer owns route and data state.
The motion controller owns temporary visual properties.
One synchronous React commit supplies the target DOM before layout measurement.
Preparation waits for local fonts and the selected image with bounded waits.
Image decode failure uses the reviewed headshot or initials fallback.
An abort signal and a generation number reject obsolete work.

The controller measures heading widths and each screen edge.
It converts drawer distance into the row's scaled coordinate space.
The outgoing layout stays beyond the viewport through a painted frame before replacement.
The row drawer owns departure translation.
The dial owns circular row translation and scale on its outer wrapper.
The server supplies a CSS transform fallback for the dial.
GSAP owns the hydrated inline transform.

A motion glyph is a final text span identified by field, character position, and character value.
The preview supplies source rectangles, font size, and color.
The controller measures all target glyphs before it writes transforms.
It animates the final spans with translation, uniform scale, and color.
It does not clone text or replace glyphs after completion.
During text flight, the fighter heading can paint across the history column.
A separate clipped layer contains decorative rings and weight text.

Only old image pixels use a temporary overlay.
The new image fades independently.
The portrait container stays visible.
Completion, cancellation, resize, and unmount remove overlays and temporary properties.
The dial receives the same settlement event and stops its own tweens.
Narrow layouts and reduced-motion mode commit without spatial motion.
Read [the M4 report](m4-report.md) for measurements and acceptance limits.

## 19. M5 release preparation

A release descriptor pins an archive version and its SHA-256 checksum.
`data/release.json` contains this descriptor.
The artifact URL is a build-only environment variable named `UFC_DATASET_URL`.
It is not part of the browser payload.
The restore command checks the compressed archive before extraction.
It rejects links, duplicate entries, paths outside the selected version, and oversized entries.
It checks all extracted contracts and file hashes in a private staging directory.
It then installs the immutable version and replaces the pointer under the publication lock.
A failed restore keeps the active pointer unchanged.

Vercel uses `release:build` to restore data, check publication readiness, and build Next.js.
The readiness check requires Node.js 24, a source revision, and approved rights for every shipped media role.
Role identity review does not establish publication rights.
The existing dataset retains its recorded rights status.
A rights change needs evidence and a new checked dataset; a release command cannot waive it.

CI always runs source and pipeline checks.
A configured artifact URL also enables the production build and browser matrix.
CI reports an explicit release-validation omission when that URL is absent.
The HTTP checker validates a supplied origin and its pinned data, response hashes, redirects, and cache headers.
It does not replace browser interaction checks.
The browser runner accepts `PLAYWRIGHT_BASE_URL` for a deployed preview.
