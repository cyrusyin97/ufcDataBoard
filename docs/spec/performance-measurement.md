# 15. Journey performance measurement

[Product Spec index](../product-spec.md) · Version 1.5 · Updated 2026-11-01.

Status: Implementation candidate as of 2026-10-30. M7 overhead and baseline acceptance remain open. See the [runbook](../performance-measurement-runbook.md).
The [implementation plan](../development-plan.md#m7-journey-performance-measurement) tracks delivery.

## 15.1 Goal and boundary

Measure the existing implementation before optimizing it. Separate preparation delay, commit cost, animation duration, and frame continuity. Preserve J01–J17 behavior, route ownership, source data, scoring, and all accepted motion rules.

Version 1 is a browser-side TypeScript module. It has no new service, database, vendor SDK, external upload, session replay, or automatic production collection. Vercel Speed Insights, Sentry, Lighthouse CI, and optimization changes are separate follow-up work.

## 15.2 Modes and operator interface

Default mode is `off`. Diagnostic mode is opt-in for the current document and ends on reload. Do not persist activation in cookies or storage or append it to product routes.

Provide a documented console/test adapter at `window.__ufcPerf` with `start()`, `stop()`, `status()`, `clear()`, and `export()` methods. Start captures new actions only; an action already running is not reconstructed. Stop closes active records as incomplete and removes observers and frame callbacks. Export returns a detached JSON snapshot; the operator or test runner saves it locally. The optional Stats for nerds panel provides a public local-only display. See section 15.11.

The default adapter is a small lazy entry point. Disabled hooks must return immediately without allocating a record, reading layout, starting a timer, or loading observers. Enabling diagnostics must not change the application's pending or committed state.

## 15.3 Coverage and transaction identity

| Scene                                      | Journeys | Measurement owner                      |
| ------------------------------------------ | -------- | -------------------------------------- |
| Dial click, keyboard, wheel, drag          | J03      | RankingDial and navigation transaction |
| Division selection                         | J02      | Navigation transaction                 |
| Rankings/history open and return           | J04, J07 | Navigation and MotionController        |
| Opponent preview and replacement           | J05, J06 | Preview request and navigation owners  |
| Bout entry from title, result, recent form | J08, J09 | Navigation transaction                 |
| Participant and period selection           | J10      | Navigation transaction                 |
| Bout return and browser traversal          | J13, J16 | Navigation and MotionController        |

Radar hover and disclosure do not need custom transaction hooks in version 1. They remain functional regression checks. Initial document loading is outside this module's journey timing contract; later Web Vitals tooling owns it.

Assign each attempted navigation a local transaction ID. Link it to the existing request generation and input type. A wheel/drag gesture may contain multiple attempted navigations. Keep the gesture ID and final target distinct from each attempt. End drag on pointer up or cancellation. End a wheel gesture after 200ms without wheel input. Use one rescheduled timer, not one timer per event. Record event counts without storing all pointer coordinates.

Every attempt ends exactly once: `completed`, `cancelled`, `error`, `ignored`, or `incomplete`. Record cancellation reason, including superseded intent, resize, hidden document, stop, and unmount where applicable. Do not include cancelled attempts in completed-duration percentiles. Report their counts separately. A gesture reports final completion only if its latest accepted target completes.

## 15.4 Metric definitions

Use one monotonic clock (`performance.now()`) within the document. Store milliseconds. Missing or unsupported values are `null`, never zero.

| Metric                         | Definition                                                                                 | Interpretation                                                            |
| ------------------------------ | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| Handler delay                  | Handler start minus normalized native event timestamp, where comparable                    | Input waiting before our handler; unavailable for programmatic navigation |
| Preparation                    | Prepare start to data, validation, and media preparation completion                        | Work before departure                                                     |
| Resource spans                 | Start/end for fighter, index, media manifest, bout, reference, and image decode operations | May overlap; do not sum them as wall time                                 |
| Commit synchronous work        | Immediately before to immediately after the existing synchronous commit                    | Includes work completed within that call, not all browser paint work      |
| Commit latency                 | Accepted intent handler start to committed target content                                  | Time until the intended state exists in DOM                               |
| Departure / arrival            | Existing timeline start to completion                                                      | Includes intended animation duration; cancellation is separate            |
| Settle latency                 | Accepted intent handler start to final cleanup                                             | Complete transition time, not INP                                         |
| Visual update scheduling proxy | Handler start to first animation-frame callback after the relevant visual write or commit  | A scheduling proxy, not proof of presented pixels or INP                  |
| Frame intervals                | Adjacent animation-frame callback timestamps during active measurement                     | Main-thread cadence proxy, not GPU FPS or an exact dropped-frame count    |
| Long animation frames          | Supported browser entries overlapping the measured interval                                | Count and duration of frames above the API threshold; unsupported is null |

Separate the pending/loading visual proxy from the committed target visual proxy. Fast loading text must not conceal a slow target update. Do not measure visual feedback by adding DOM polling or geometry reads. Hooks report existing writes and commits. Do not delay the application to await a monitoring callback.

Record frame sample count, interval median/P95/max, counts above 33.3ms and 50ms, and observation-window duration. These fixed thresholds are diagnostic counters, not universal display-refresh budgets. Record the test display refresh rate in run metadata when known; do not infer it as a fact from callback intervals. Exclude hidden-tab periods. A frame spike cannot by itself prove forced layout or GPU saturation.

In version 1, long-animation-frame collection is optional and feature-detected. Keep numeric summaries only. Do not export script URLs, DOM selectors, stacks, or page text. Do not substitute Long Tasks data under the same metric name. Browser Performance recordings remain the tool for root-cause attribution.

## 15.5 Record and export contract

Export `schemaVersion`, `metricDefinitionVersion`, code/build ID, dataset version, run label, UTC export time, viewport, device pixel ratio, reduced-motion setting, browser label, mode, capabilities, records, and loss counters. Build identity may be `unknown` but cannot be omitted from a comparison report. Device, connection, browser version, and display refresh information can be operator-supplied metadata; distinguish it from detected values.

Each record includes transaction/gesture/parent IDs, journey/scene, input type, source and target view, public fighter/bout/division IDs when needed for reproducibility, period, outcome, reason, relative timestamps, stage spans, cache classification, and frame summaries. Cache classification means application-store hit/miss/unknown. It does not assert browser HTTP cache behavior. Treat image decode reuse as a separate value.

Use bounded strings and enum fields. Do not include full URLs/query strings, credentials, local paths, pointer traces, IP addresses, persistent visitor IDs, or fighter records. Error records contain an allowlisted reason rather than arbitrary exception text. Clearing removes retained records; it does not alter the application cache.

Schema changes increment `schemaVersion`. Changes to metric start/end semantics increment `metricDefinitionVersion`. Never silently compare incompatible definitions.

## 15.6 Overhead and failure isolation

- Keep at most 200 completed records and 16 active records. Evict oldest completed records and count evictions. On active overflow, skip new instrumentation and count skipped records; do not block navigation.
- Keep at most 64 spans per record and 4096 frame intervals per active observation window. Report truncation. Use one shared frame sampler for concurrent actions, and do not double-count intervals in run totals.
- Limit a diagnostic observation window to 30 seconds. Mark timed-out records incomplete. Do not time out or cancel the product action.
- Store primitive numeric samples in bounded memory. No React state updates, synchronous storage, per-frame logging, DOM traversal, layout reads, or network calls in measurement hooks.
- Calculate percentiles and serialize on explicit export after stopping capture. Reject export while capture is active with a clear operator message; no implicit navigation pause.
- Keep observer callbacks small. An asynchronous callback is not a worker. Do not add a Worker until measured aggregation cost justifies it.
- On exceptions, disable the faulty diagnostic collector and preserve product operation. Report diagnostic failures in status/loss counters. Never suppress application errors through the measurement wrapper.
- Clean up on stop, hidden document, navigation-owner disposal, and unmount. React development remounts must not duplicate listeners. Start after visibility resumes begins a new capture; do not bridge a background gap.

## 15.7 Implementation boundaries

| File                                            | Responsibility                                          |
| ----------------------------------------------- | ------------------------------------------------------- |
| `src/lib/performance/contracts.ts`, `schema.ts` | Versioned records, enums, export schema, limits         |
| `src/lib/performance/recorder.ts`               | Bounded records, stage hooks, outcomes, clock injection |
| `src/lib/performance/frames.ts`                 | Shared frame sampling and optional long-frame observer  |
| `src/lib/performance/client.ts`                 | Lazy diagnostic lifecycle and console adapter           |
| `src/lib/performance/export.ts`                 | Detached summaries and sanitized JSON export            |
| `tests/unit/performance*.test.ts`               | Clock, bounds, attribution, cleanup, schema tests       |
| `tests/e2e/performance*.spec.ts`                | Repeatable journeys and monitoring on/off checks        |

Existing input, store, preparation, and motion owners emit lifecycle hooks. The recorder must not own routing, animation, image loading, request scheduling, or retry behavior. Existing initial/direct routes remain immediate. Inject optional measurement context into asynchronous work so stale completions cannot attach to a newer attempt. Do not introduce a second global navigation controller.

## 15.8 Critical acceptance checks

PM01: Disabled mode has no active observer, frame sampler, capture record, or telemetry request.
PM02: Fake-clock tests verify stage math, overlapping spans, null values, and export definitions.
PM03: Rapid reversal cancels old attempts exactly once. Late resource completion cannot mutate the latest record.
PM04: Store hits, misses, failures, image fallback, and decode timeout produce accurate outcomes without changing behavior.
PM05: Stop, hidden document, resize, repeated start, and unmount leave no leaked listeners or sampler. Capture caps and dropped-sample counters work.
PM06: Unsupported APIs, collector errors, and overflow leave all user journeys usable.
PM07: Exports validate against their versioned contract, contain no disallowed fields, and do not upload data.
PM08: Existing C01–C20 checks selected by the touched code pass. Include rapid selection, reduced motion, portrait continuity, title cleanup, browser traversal, and nonzero-scroll return.
PM09: The monitoring overhead comparison passes or remains explicitly unresolved. Do not proceed to optimization claims with an unexplained measurement regression.

### Overhead comparison protocol

Use the same production build with diagnostics off and on. Record device, browser, viewport, dataset, cache condition, and refresh rate. Alternate mode order to reduce warmup bias. Run at least 20 repetitions per representative scene per mode after documented warmup. Separate cold application-store runs from warm runs; an application-store reset does not guarantee a cold HTTP cache.

Use the same external browser recording method in both modes. Compare input response, scripting cost, frame intervals, and retained memory. The in-app recorder cannot measure its own disabled mode. Preserve raw run receipts. Do not run a heavy React profiler in only one group.

Provisional regression limits: enabled median/P95 settle latency must not increase by more than the greater of 5% or 10ms; frame-interval P95 must not increase by more than 2ms; enabled mode must not add a reproducible monitoring-attributed task above 50ms. Report noise and sample counts. If noise prevents a decision, rerun under controlled conditions and mark the gate unresolved. These are monitoring-overhead limits, not achieved product performance targets.

The disabled bootstrap should add at most 5KB compressed initial JavaScript. Measure the actual build delta. Repeated capture/clear cycles must show bounded retention and no monotonic recorder growth. Detailed diagnostics load only after opt-in.

## 15.9 Baseline and future expansion

Save a versioned baseline before any optimization. Include the three repeated core sequences: dial forward/reverse, rankings/history, and history/bout/return. Include round and participant changes, errors, and cancellation in correctness coverage. Record first-target and warm-target results separately. Use JSON receipts in `docs/evidence/` and a dated human-readable report; keep large raw traces in `work/` or an explicitly selected artifact store.

Compare individual metrics and outcomes rather than one composite score. Report sample count and percentile method. With small cohorts, label tail estimates exploratory. Existing Web Vitals targets remain in [operations and performance](operations-and-performance.md); these custom measures must not be named INP or FPS.

A future vendor adapter may receive the same sanitized summaries after separate approval of destination and sampling. Add Web Vitals and CI budgets as separate collectors. Do not make navigation depend on any monitoring destination being available.

## 15.10 Candidate implementation notes

The console adapter lazy-loads the recorder and browser observers. Capture runs only after explicit start. The application hooks and adapter remain in the initial bundle. `schema.ts` validates the core capture contract in tests; it is not loaded for normal navigation. Export metadata is added by the adapter.
Input delay uses the passive capture listener timestamp, before the application target handler. The target scheduling proxy runs on the next animation-frame callback after commit. Neither value is a browser presentation timestamp. Parent IDs are reserved and currently null. Preview capture begins when its request effect runs.
The observer stops the capture on resize so pre-resize and post-resize geometry are not mixed. Decode span detail distinguishes timeout and decode rejection. Preparation includes validation; resource spans cover fetch and JSON decoding. The current implementation does not optimize or cache image decoding.
The off/on benchmark covers warm next/previous selection and four navigation directions. Native traces also cover fresh application stores and drag reversal. Capture/clear heap snapshots check recorder retention. Two warm runs disagree on tail regression; PM09 remains unresolved. First-target and drag-reversal timing cohorts are not a frozen baseline. See the report and runbook for evidence and limits.

## 15.11 Stats for nerds

Approved scope, 2026-11-01. Right-click an empty layout area in the rankings experience to open a custom menu with one Stats for nerds item. Keep native menus on links, images, controls, charts, editable content, and selected text. Text itself is not an empty area. Escape and outside pointer input dismiss the menu. Opening the panel moves focus to its close control. Closing restores prior focus without scrolling.

The panel uses the existing dark colors and type. Place it at the top right in a portal, outside motion containers. Keep it within the viewport and allow internal vertical scrolling. It does not change product routes or retain activation after reload. Mobile layout must fit; this version does not add a touch-only activation gesture.

Opening the panel starts or attaches to the current capture. Closing stops capture. Hidden documents and resize stop capture. The panel shows Paused; close and reopen to capture again. Export and clearing remain available through the console adapter. The compact panel has one close control and no reset, export, interaction breakdown, or environment section.

Revision 2026-11-02: Use a 280px-wide panel with 75% opaque dark background, 10px metrics, 9px supporting text, and a 16px heading. Keep text fully opaque. Drag the title bar with pointer capture to move it; arrow keys on the focused title bar move it 10px. Clamp movement to an 8px viewport margin and re-clamp after resize. Position is local to the mounted panel and resets on reopen. Pointer movement writes only panel coordinates and does not update product state.

Use one shared animation-frame sampler. Console-only capture remains idle between actions. Panel mode samples continuously while enabled and visible. Frame callbacks write only numeric counters. The independent panel polls at 500ms intervals; product components do not subscribe to these updates. No Worker is required in this version. Reconsider only if measured aggregation cost warrants it.

| Field            | Definition                                                                                                                                                                                                |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FPS estimate     | Number of intervals ending in the last second divided by their total duration, multiplied by 1000. This is callback cadence, not GPU-presented FPS.                                                       |
| Frame mean / P95 | Mean and nearest-rank P95 of intervals ending within ten seconds, capped at 2048 samples.                                                                                                                 |
| Trend            | Up to 40 half-second frame-mean snapshots; chart height caps at 100ms.                                                                                                                                    |
| Long tasks       | Count, full total duration, and maximum duration of browser long tasks ending within ten seconds; at most 256 entries. This includes browser work and is not JS CPU utilization. Unsupported is null/N/A. |

The console adapter adds `enableLive()` and `snapshot()` for the panel. Snapshot reads the last record and bounded live buffers; it does not export or serialize all records. Keep journey export semantics unchanged. The panel itself adds work to the measured page. Prior M7 receipts do not establish panel overhead.

PM10: Right-click exclusions, keyboard dismissal, focus restoration, close cleanup, bounded dragging, viewport resize, reload, and narrow viewport work. Console reset and export remain covered separately. PM11: Live cadence math, bounded buffers, unsupported long tasks, and shared-sampler cleanup have tests. PM12: Compare disabled, console capture, and capture with panel using the same external method; report sample counts and limits without claiming a universal zero-cost overlay.
