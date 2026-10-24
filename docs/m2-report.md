# M2 rankings interface

> Historical evidence. Status, counts, and remaining work below apply to the recorded stage. Use [Product Spec](product-spec.md) for current behavior and [development plan](development-plan.md) for current gates.

Date: 2026-10-14.
Status: Implemented. The M2 acceptance checks pass.
Scope: Rankings home. History and coordinated motion remain planned.

## Delivered interface

The application now reads the M1 release instead of the M0 roster fixture.
The build pins dataset version `2026-10-14-7c5ad4426abf6d1a`.
The server sends the published registry and small ranked fighter summaries.
It sends one initial profile and up to three recorded results.
The browser loads another fighter bundle only after selection.
It retains up to 32 profiles in the cache.
It does not send the complete archive or all recorded fights in the initial page.

The shared components are CategoryDropdown, CategoryHeading, RankingDial, FighterFigure, and FighterProfile.
The dropdown uses a native select control with the V8 presentation.
Its options come from published registry entries.
The initial interface contains Featherweight and Lightweight.
Each division contains its champion and 15 ranked fighters.

Click, wheel, drag, and arrow keys select fighters.
Home and End select the first and last entries.
The dial calculates loop boundaries from the current list length.
Each selection updates the row, figure, and profile together.
A category change selects the target champion.
A valid explicit URL restores its division and selected fighter after refresh.
An invalid home selection uses the champion.

Selection updates use native history replacement.
They preserve framework history state.
The full history route controller remains an M3 task.
A newer request cancels the previous request and rejects stale responses.
A failed request keeps the current fighter visible and exposes Retry.
Images use reviewed local variants.
A failed figure uses an available headshot, then initials.
The image component also checks failures that occur before hydration.
Hydration connects server HTML to the browser component.

Career records come from UFCStats.
Finish totals use their recorded source field.
Age uses birth date and the active ranking snapshot date.
Missing facts show an em dash.
Recent results use at most three exported rows, in their exported order.
Source tooltips identify the fields.
The footer identifies the ranking snapshot and data sources.

## Checks

Environment: macOS arm64, Node.js 25.6.1, and Chromium through Playwright 1.64.0.
The target runtime remains Node.js 24.
The viewport is 1318 × 808 CSS pixels.
The narrow access check uses 390 × 844 CSS pixels.

| Check                                  | Result | Evidence                                                  |
| -------------------------------------- | ------ | --------------------------------------------------------- |
| ESLint                                 | Pass   | Application and test code                                 |
| TypeScript                             | Pass   | Strict compilation                                        |
| Unit and component tests               | Pass   | 14 tests                                                  |
| Production build                       | Pass   | Next.js webpack build                                     |
| Browser tests                          | Pass   | Seven production tests                                    |
| Each ranked fighter by click           | Pass   | All 32 IDs, profiles, records, and recent results         |
| Champion defaults and category changes | Pass   | Fresh visit and four category selections                  |
| Explicit URL and refresh               | Pass   | Both divisions                                            |
| Wheel and drag boundaries              | Pass   | Champion to last entry and back                           |
| Keyboard selection                     | Pass   | Arrow keys, Home, and End                                 |
| Additional division and list length    | Pass   | Shared components with five Welterweight fixture entries  |
| Loop lengths                           | Pass   | One, two, five, 16, and 23 entries                        |
| Failed and obsolete requests           | Pass   | HTTP 503, Retry, and a superseded request                 |
| Image failure and narrow access        | Pass   | Initials and no horizontal page overflow                  |
| Document format                        | Pass   | Prettier check                                            |
| Local document links                   | Pass   | No broken local paths                                     |
| Server file tracing                    | Pass   | 32 ranked bundles and no public media in the server trace |
| V8 desktop composition                 | Pass   | Captures and measured region geometry                     |

The M2 gate covers B01 through B06, B13 through B15, and U01.
M1 supplies the ranking and source integrity evidence.
These checks do not certify history navigation or animated transitions.

## Desktop comparison

Compare [the V8 capture](evidence/m2/v8-featherweight.png) with [the application capture](evidence/m2/featherweight.png).
The [Lightweight capture](evidence/m2/lightweight.png) uses the reviewed production media.
The [reference geometry](evidence/m2/v8-geometry.json) and [application geometry](evidence/m2/application-geometry.json) record the rendered regions.
The maximum measured region difference is one CSS pixel.
The header, dial position, dial size, and profile left edge agree with V8.
The application figure width differs by 0.03125 CSS pixels.
The application region and footer differ by one CSS pixel vertically.

The data values follow M1 source precedence.
For example, Volkanovski's reach is 71 inches from UFCStats.
V8 shows 71.5 inches from UFC.com.
The application preserves UFC.com observations in the source bundle.
It does not overwrite the UFCStats measurement.
Recent dates use UTC and the exported ISO date.
The prototype dates differ from some exported dates.
The application shows the nickname near the name and birthplace in the caption.
The source label replaces the prototype design badge.

## Remaining work

M3 must implement full history, opponent previews, and return navigation.
M4 must implement coordinated GSAP motion and measure transition frames.
M4 must also obtain user approval for the mobile composition.
M5 must check hosting, media rights, release performance, and rollback.
Firefox, WebKit, and Node.js 24 checks remain release tasks.
The source database and preserved V6, V7, and V8 files remain unchanged.

## Local preview

Run `npm run dev` after installing the checked public dataset.
Open `/rankings` through the local application server.
The application now requires `public/data/current.json` and its immutable release.
Read [data operations](data-operations.md) for artifact extraction and checks.
A database is not necessary at web runtime.
