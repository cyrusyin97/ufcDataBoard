# M4 engineering report

Date: 2026-10-15.
Status: Accepted for the agreed desktop baseline and mobile composition.
The user approved the current mobile layout on 2026-10-15.
Browser and performance release checks remain open.
Read [the development plan](development-plan.md#m4-motion-and-visual-parity) for the acceptance gate.

## Delivered behavior

The circular selector now animates row placement.
Opening history sends the selector beyond the left edge and relocates the figure.
Category changes prepare the champion, depart both side panels, commit the target, and animate arrival.
The outgoing heading and every visible drawer cross the left edge.
The profile crosses the right edge.
Heading widths are measured for each division.
Category controls remain locked during the transaction.

The opponent preview supplies source geometry for name, record, and profile facts.
The final live glyphs move from those positions with uniform scale and color changes.
The target glyphs remain in the DOM after cleanup.
Old and new images fade independently.
The portrait container stays visible.
A separate clipped decoration layer permits text flight across the history column.

Preparation waits for fonts and image decode with bounded waits.
Failed images use reviewed headshots or initials.
Obsolete requests and timelines are cancelled.
Resize, return, browser traversal, and unmount remove temporary properties and image overlays.
Narrow screens and reduced-motion mode commit without spatial motion.

## Validation method

Run the production build before browser checks.
The default suite uses Chromium.
The optional cross-browser run uses five checks in each engine:
initial selection, direct archive navigation, category drawers, final glyph geometry, and interruption cleanup.
This focused run does not claim the full suite ran in Firefox or WebKit.

```sh
npm run check
npm run test:e2e -- --workers=2
npx playwright install firefox webkit
M4_CROSS_BROWSER=1 npm run test:e2e -- --project=firefox --project=webkit --grep 'category drawers|preview glyphs|resize, return|fresh visit|direct archive' --workers=2
npm run format:check
```

The production build, lint, type checks, and all 21 unit tests pass.
The complete Chromium suite passes all 21 checks.
The focused browser results are recorded in the structured receipt.
Firefox retains the traversal difference described below.

The test host is an Apple M3 MacBook Air with 16 GB memory on macOS arm64.
Local checks use Node.js 25.6.1.
Node.js 24 remains the CI and hosting target.
A local Node.js 24 run and remote CI were not available in this session.
Desktop motion checks use 1318 × 808.
The interruption check also resizes to 1084 × 854.
History composition uses the existing 1084 × 854 check.
Mobile captures use 390 × 844.

The normal navigation helper waits for the final motion state.
A separate interruption check invokes native `history.back()` during arrival.
It checks that return completes and removes all temporary motion.
Keyboard handlers and the current navigation snapshot now update during layout effects.
This makes the committed DOM and event behavior agree before the next input.

## Evidence

The [structured receipt](evidence/m4-validation.json) records commands, results, environment, and open gates.
The [category samples](evidence/m4/m4-category-chromium.json) record all four alternating departures.
Departure, arrival, and settled screenshots accompany the numeric samples.
The screenshots capture observed states; browser scheduling can move them beyond the requested instant.
The JSON supplies the measured edge positions.
The synchronous route commit has no separate painted frame.
Arrival starts in the same layout effect.
The captures bracket that commit without adding a visible intermediate state.
The existing V8 geometry fixture checks the settled home regions within one CSS pixel.
The ten-opponent regression checks one detail history entry, one portrait container, and no old image overlays.

The [opponent samples](evidence/m4/m4-opponent-frames-chromium.json) record requested and actual elapsed times.
They include early transforms, final-node identity, portrait opacity, and the geometry difference after cleanup.
Browser animation frames supply timing samples.
Playwright screenshots follow those samples and can be later.
These are observed frames rather than deterministic timeline seeks.

| Requested time (ms) | Actual sample (ms) | Maximum geometry change (px) |
| ------------------- | ------------------ | ---------------------------- |
| 900                 | 915.3              | 0.0144                       |
| 950                 | 964.1              | 0.0001                       |
| 983                 | 997.1              | 0.0000                       |
| 1000                | 1012.9             | 0.0000                       |

All sampled portrait container opacities are one.
All sampled glyph nodes retain their original identity.

| Local lab metric                           | Observed value    |
| ------------------------------------------ | ----------------- |
| Initial JavaScript gzip estimate           | 207721 bytes      |
| LCP                                        | 368.0 ms          |
| CLS                                        | 0.0364            |
| Maximum observed Event Timing duration     | 184 ms            |
| Long tasks observed by PerformanceObserver | 3                 |
| Scheduler interval median / p95            | 22.29 / 108.38 ms |
| Dropped begin-frame events                 | 0                 |

The scheduler summary uses the thread with the most begin-frame events.

## Performance limits

The [Chromium metrics](evidence/m4/m4-performance.json) describe a local headless lab run.
The [compressed trace](evidence/m4/m4-performance-trace.json.gz) retains browser timeline events.
The initial JavaScript estimate sums gzip-compressed response bodies.
It does not represent a deployed network transfer measurement.
Event Timing samples are lab observations and do not establish field INP.
Scheduler timing and dropped-frame events expose this capture's rendering cost.
They do not certify native 60 FPS on a release device.
The two-worker regression run and the earlier concurrent capture are retained separately.
Read [the full-suite metrics](evidence/m4/m4-performance-full-suite.json) and [the earlier concurrent metrics](evidence/m4/m4-performance-concurrent.json).
The observed maximum interaction durations varied across local runs.
Do not infer a stable field result from one passing sample.
Use a documented deployment and device for the M5 performance check.

## Firefox traversal difference

The Firefox direct-entry, reload, and browser-level Back check still fails intermittently.
Native `history.back()` and the page return button pass.
An isolated HTML fixture reproduces browser-level Back failure without the application.
Its protocol traversal stayed at the replaced detail URL in all three controlled probe runs.
Native History.back then returned home in each of those same documents.
Read the [isolated probe](evidence/m4/firefox-history/probe.spec.txt) and [failure trace](evidence/m4/firefox-history/probe-failure-trace.zip).
Mozilla records related [Back-button intervention behavior](https://bugzilla.mozilla.org/show_bug.cgi?id=1981019).
The local result is consistent with that behavior; the probe does not prove the exact browser cause.
Do not treat this as a passing browser-level traversal check.
Do not disable browser safeguards to make the test pass.
Confirm the behavior in a visible Firefox release and resolve or approve the difference before M5 release.

## Mobile review and remaining gates

Review the local [mobile composition page](../outputs/designs/ufc-m4-review/mobile-review.html).
Serve that directory on port 4312 and open <http://127.0.0.1:4312/mobile-review.html>.
The page contains real application captures.
Home order is selector, figure, then profile.
History order is figure, internally scrolling history card, then profile.
The preview has an explicit touch action.
The small header label is hidden to keep the wordmark clear at narrow widths.

The user approved this composition on 2026-10-15.
The approval covers the home order, history order, and current vertical layout.
M4 acceptance is complete for this composition and the agreed desktop baseline.
The approval does not waive the Firefox traversal difference or the remaining release checks.
M5 deployment has not started.
The source database, public release, and preserved V6, V7, and V8 prototypes remain unchanged.
