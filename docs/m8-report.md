# M8 interaction performance report

Date: 2026-11-02.
Status: First implementation pass plus approved forward-entry timing revision. Local evidence; not deployed acceptance.

The initial comparison below precedes the timing revision at the end of this report. Use the final section for current forward-entry durations.

## Changes and cause

The user requested fixes for the audited interaction waits using the M7 recorder. This authorizes a scoped comparison while broad M7 baseline acceptance remains open. The previous uncommitted runtime and production build were preserved before measurement. No animation duration, source data, prototype, or scoring rule changed.

1. Dial position now follows accepted pending intent before data and image readiness. Profile, portrait, selected identity, and URL remain committed until the target is ready. Failed preparation returns the dial to that committed slot.
2. Same-division selection cancellation and departure no longer force the dial to its previous endpoint. The dial retargets its existing interpolation. Resize, reduced motion, disposal, and other route transitions retain their hard-settle behavior.
3. Selected-fighter loading and portrait preparation start independently of bout/reference loading. Other participants start after bout identity is known. Commit joins all validated results. Failure aborts remaining work.
4. Media preparation reuses four successfully prepared immutable image URLs with LRU eviction. Failed, timed-out, and aborted attempts do not enter this cache. No speculative portrait prefetch was added.

These changes remove a confirmed preparation dependency from visible dial feedback and shorten an independent request chain. They do not prove that all reported stutter has the same cause. Drag remains slot-based. Continuous pointer tracking, shared in-flight request pooling, offscreen glyph reduction, and GPU/paint changes are not included in this pass.

## Measurement method

Use the same Node.js 24 production setup, pinned dataset `2026-10-14-5949094d82ded09a`, Chromium runner, and 1318 × 808 viewport. Enable console capture with the live panel closed. The six warm scenes run 20 measured repetitions per candidate after two warmups (240 measured operations total). An identical external frame probe runs in both candidates. M7 supplies prepare, commit, and settle measurements.

Two separate mechanism experiments run ten trials per candidate with fresh application stores. One delays the target fighter response by 250ms and observes the first row displacement above one CSS pixel. The other delays each JSON response by 100ms and opens a recent bout from rankings. HTTP cache is not claimed cold. These delays test dependencies; they are not measured production network latency. Tail estimates from ten samples are exploratory.

Read the [versioned summary](evidence/m8-comparison.json). It includes build IDs, dataset, viewport, source-tree identities, raw receipt paths, and SHA-256 hashes. The local source archives are `work/m8/before-source.tar.gz` and `work/m8/after-source.tar.gz`. Raw receipts remain in `work/m8/` and are not versioned. Preserve them before deleting this workspace. Runs are sequential before/after, not a randomized crossover across rebuilds.

## Results

All values below are milliseconds. Use medians unless specified.

| Measure                                             | Before | After  | Interpretation                                                    |
| --------------------------------------------------- | ------ | ------ | ----------------------------------------------------------------- |
| First dial movement, 250ms delayed fighter response | 282.5  | 14.8   | Visible slot movement no longer waits for the target response.    |
| First bout prepare, 100ms delayed JSON responses    | 458.8  | 318.5  | Independent preparation overlaps the bout/reference chain.        |
| First bout settle, same delayed experiment          | 2064.4 | 1914.8 | Preparation improves; intentional transition time remains.        |
| Warm next-fighter prepare                           | 18.2   | 1.6    | Successful readiness reuse avoids repeated decode preparation.    |
| Warm next-fighter external settle                   | 830.3  | 813.8  | Total improvement is smaller because the image animation remains. |

### Warm scene detail

| Scene           | Before settle median | After settle median | Before settle P95 | After settle P95 | Frame interval P95 before / after |
| --------------- | -------------------- | ------------------- | ----------------- | ---------------- | --------------------------------- |
| Dial next       | 830.3                | 813.8               | 847.0             | 830.3            | 16.7 / 16.7                       |
| Dial previous   | 813.4                | 813.5               | 814.0             | 830.0            | 16.8 / 16.7                       |
| History open    | 1663.1               | 1663.2              | 1679.6            | 1663.5           | 16.7 / 16.7                       |
| Bout open       | 1229.0               | 1229.2              | 1229.5            | 1245.9           | 16.7 / 16.8                       |
| Bout return     | 1229.9               | 1229.8              | 1246.3            | 1246.2           | 16.8 / 16.7                       |
| Rankings return | 1162.5               | 1162.5              | 1179.2            | 1163.3           | 16.7 / 16.8                       |

These frame intervals describe callback cadence, not displayed GPU FPS. Warm navigation is largely unchanged. Two P95 values increase by about one 60Hz frame; do not present only the favorable rows. No deployed INP, universal 60 FPS, or zero-stutter claim follows from this result.

Warm commit medians remain about 11ms for bout open and 20ms for bout return. History/title DOM work is still a candidate for a native commit/layout profile. The current evidence does not isolate glyph construction as the cause, so this pass preserves the accepted title nodes and shared-element animation.

## Verification

The final production check passes TypeScript, 71 unit tests, and build. ESLint has no errors and retains the existing unused-variable warning in `scripts/release-check.ts`. An initial type check found that the new optional dial input was required by an existing render fixture; the prop now defaults to null.

All 27 selected Chromium functional checks pass. They cover data-delay feedback with committed identity, failure rollback, interruption continuity, independent request start, rapid latest-intent navigation, error retry, media/portrait cleanup, nonzero scroll, title continuity, reduced motion, and recorder lifecycle. Both candidates complete their warm and controlled-delay benchmark fixtures.

The six dial/motion checks also pass in Firefox and WebKit, with the Chromium rerun passing as well (18 checks). Across the suites, 39 distinct browser/case combinations pass. Formatting, changed-document local links, and whitespace checks pass.

The before source hash and build ID match the M7 checked panel candidate. Both warm captures have zero loss counters. No commit, push, or deployment is included.

## Remaining scope

Keep M7's full baseline gate open. Obtain native layout/paint traces and a real-device/deployed comparison before asserting broad smoothness improvement. Profile the roughly 20ms history-return commit before changing glyph lifetime or list rendering. Any shortened or overlapping motion schedule needs separate visual review rather than being counted as an FPS fix.

## Approved forward-entry timing revision — 2026-11-02

The user requested approximately one-second forward entries after reviewing the prior 1.605-second rankings-to-detail and 1.18-second history-to-bout schedules. This is a visual timing change, separate from the earlier throughput fixes.

Rankings-to-detail now uses at most 0.36 seconds of row departure and 0.58 seconds of arrival. History-to-bout uses 0.14 seconds of departure and 0.80 seconds of portrait/title flight. Both configured schedules total 0.94 seconds. Keep the painted-frame hold and atomic commit. Return and opponent-replacement schedules remain as before.

The final Node.js 24 production check passes with 71 unit tests and the existing lint warning only. Nine motion regression tests and the opt-in timing test pass (10 total). The timing fixture excludes one warmup and records ten trials per path, with console capture enabled and the panel closed. M7 total settle latency includes preparation and commit:

| Path                | Median  | P95     | Samples |
| ------------------- | ------- | ------- | ------- |
| Rankings to History | 980.5ms | 982.0ms | 10      |
| History to Bout     | 981.9ms | 998.5ms | 10      |

See [timing receipt](evidence/m8-entry-timing.json). These are local warm-cache measurements, not a deadline for uncached data or slow networks. The shorter totals come primarily from the approved animation schedule; they are not evidence of higher rendering throughput. The prior M8 comparison and source archives remain historical evidence for the first pass.
