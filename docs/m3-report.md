# M3 history and navigation

Date: 2026-10-14.
Status: Implemented. The M3 acceptance checks pass.
Scope: Full recorded history, opponent previews, and persistent navigation.
Coordinated motion remains an M4 task.

## Delivered interface

The career record opens the selected fighter's full recorded history.
The record control can also close history.
The history card scrolls internally.
Each row shows result, opponent, date, event, location, method, round, and time.
Missing fields show an em dash.
The card identifies the local UFCStats coverage.
Recorded bouts do not replace career totals.

History uses the reviewed full-body image when one exists.
A missing full-body role uses the reviewed half-body image or headshot.
A failed image uses an available headshot, then initials.
The right profile keeps its existing position.
The portrait container stays visible.
The history layout changes immediately in M3.
M4 will add the coordinated transitions.

An opponent name links to that opponent's history.
Hover and keyboard focus show a nonmodal brief profile.
The card contains image, name, career record, age, height, and reach.
The card stays inside the viewport.
The pointer can cross from the trigger into the card.
Keyboard focus keeps the card available.
A separate Preview button supports touch access.
Escape closes the preview before it closes history.
Modified clicks keep the native new-tab behavior.

## Navigation and data

The route controller uses `/rankings` with query parameters.
It keeps the active division during opponent navigation.
The initial interface still publishes two divisions.
The complete archive remains available by stable fighter ID.
An unknown ID shows a recoverable error.
It never shows another fighter as the requested detail fighter.
A fighter with no bouts shows an empty history.

Home opens one detail entry.
Each opponent navigation replaces that detail entry.
Return through the button, record control, Escape, or browser Back follows one rule.
A fighter ranked in the active division becomes the home selection.
Another fighter returns to the active division's champion.
Browser Forward restores the current detail fighter.
The next Back after returning home can leave the website.

A direct detail visit creates one owned home entry before the detail entry.
Reload reuses that ownership and does not create another entry.
History updates preserve framework state fields.
Duplicate route events do not restart an active request.

The build keeps the M1 dataset version pinned.
A home visit still receives one three-result profile from the server.
A direct detail visit receives a loading shell.
The browser checks archive membership before requesting an unranked fighter.
It loads the archive index and archive media only when necessary.
This keeps unranked bundles out of the server function trace.
The server trace still contains 32 ranked bundles.

The shared store caches up to 32 completed bundles.
It checks identity, dataset version, and fighter perspective before caching.
It does not cache failed or aborted responses.
A newer navigation cancels the older request.
Return cancels pending preparation.
Late responses cannot replace the current fighter or reopen a closed preview.
A failed request keeps the current content and exposes Retry and Return.

## Validation

Environment: macOS arm64, Node.js 25.6.1, and Playwright 1.64.0.
Browser: Chromium 156.0.8078.4.
History viewport: 1084 × 854 CSS pixels.
Home and preview viewport: 1318 × 808 CSS pixels.
Touch viewport: 390 × 844 CSS pixels.
The Node.js 24 target remains unchanged.

| Check                             | Result | Evidence                                            |
| --------------------------------- | ------ | --------------------------------------------------- |
| ESLint and TypeScript             | Pass   | Application and test code                           |
| Unit tests                        | Pass   | 21 tests across four files                          |
| Production build                  | Pass   | Next.js webpack build                               |
| Production browser tests          | Pass   | 17 tests, including all M2 regressions              |
| Full recorded history             | Pass   | All 18 champion rows match exported IDs and order   |
| Internal history scrolling        | Pass   | Last exported row remains accessible at 1084 × 854  |
| Ranked and unranked opponents     | Pass   | Profile, figure, and history agree by ID            |
| Direct URLs and refresh           | Pass   | Archive navigation in both division contexts        |
| Return selection                  | Pass   | Button, record control, Escape, and browser Back    |
| Browser Forward and external Back | Pass   | One detail entry and no trapped external navigation |
| Zero bouts and unknown IDs        | Pass   | Empty history, initials, and recoverable error      |
| Preview access                    | Pass   | Hover, focus, pointer crossing, Escape, and touch   |
| Portrait fallback                 | Pass   | Failed full-body image uses a reviewed headshot     |
| Request interruption              | Pass   | New target and return cancel old preparation        |
| Late preview and duplicate events | Pass   | No reopened card and one pending bundle request     |
| Repeated opponent navigation      | Pass   | Ten changes keep one detail entry and one portrait  |
| Native links                      | Pass   | Modified click opens a separate detail tab          |
| Document format and local links   | Pass   | Prettier and local path checks                      |

The M3 gate covers B07 through B12 and U02, U05, U06, U09, and U10.
The new archive checks also exercise B17 and B19.
The M2 home geometry checks remain green.

Read [the structured receipt](evidence/m3-validation.json).
Inspect [the history capture](evidence/m3/history.png) and [the preview capture](evidence/m3/preview.png).
Read [the browser environment](evidence/m3/environment.json) for capture details.

## Remaining work

M4 must add GSAP transitions and final-frame measurements.
These static captures do not prove animation parity or frame timing.
M4 must obtain user approval for the mobile composition.
The touch check proves access only.
Firefox, WebKit, and Node.js 24 checks remain release tasks.
No remote CI run occurred.
M5 still owns hosting, media rights, performance, and rollback checks.
The source database, dataset release, and preserved V6, V7, and V8 files remain unchanged.
