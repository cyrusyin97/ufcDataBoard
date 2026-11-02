# M7 measurement implementation report

Date: 2026-10-30.
Status: Implementation candidate. Full overhead and baseline acceptance remain open.

## Delivered scope

The browser has a default-off `window.__ufcPerf` adapter. It loads capture code on explicit start and exports local JSON after stop. There is no vendor SDK, endpoint, automatic upload, persistent visitor identifier, or new public UI.

The recorder tracks navigation generations, outcomes, gestures, preparation, resource reads, image/font preparation, commit, and arrival. Preview requests have separate records. It observes the existing sequence and does not optimize the dial, change animation durations, or reorder requests.

Frame collection uses one bounded callback stream. Numeric long-animation-frame summaries are optional. Visibility, resize, stop, and unmount end capture. Collector failures cannot escape through stage hooks into application work. The test schema rejects unexpected core-capture fields.

Read the [measurement specification](spec/performance-measurement.md) for ownership and [runbook](performance-measurement-runbook.md) for operator commands and interpretation.

## Evidence

- Node.js 24 production check: lint has no errors; the existing unused `unknown` variable warning in `scripts/release-check.ts` remains. TypeScript, 65 unit tests, and the production build pass.
- The first browser run passed 18 of 19 checks. The resize assertion ran before browser resize delivery. The test now waits for the observed disabled state. The final production rerun passed all 19 checks, including all 16 existing bout/navigation/motion checks. Additional lifecycle stress checks are recorded separately.
- An isolated source build at `49be350c842d89f0a3ec1f48000891267d75abd3` provides the bootstrap control. The candidate adds 1,603 gzip bytes across the unique ranking client-reference chunks and root main scripts: 216,268 to 217,871 bytes. This is below the 5,120-byte diagnostic bootstrap budget. See [size receipt](evidence/m7-bootstrap-size.json). This is a build-asset comparison, not a measured network transfer.
- The isolated control build warns about a parent workspace lockfile. Both builds use the same installed dependencies and pinned dataset. No production files were changed by that control build.

## Remaining gates

The warm benchmark rerun passes the numeric limits. Native tracing and capture/clear retention checks also pass in the tested Chromium environment. The first run has unexplained tail variability. PM09 remains unresolved until a controlled environment can establish a repeatable result. First-target and drag-reversal timing cohorts remain incomplete for the frozen baseline. Do not mark M7.5 or deployed performance acceptance complete from functional tests or the bootstrap size result.

No UI performance fix, data change, commit, push, or deployment is included in this work. Prior audit/specification document changes in the workspace are retained.

## Warm overhead comparison

The explicit benchmark finished successfully with 240 measured operations: six scenes, 20 repetitions per mode. Two warmup repetitions per mode are excluded. The enabled captures report no dropped records, sample truncation, or collector failures. The benchmark test proves completion, not numeric budget acceptance.

| Scene           | Disabled P95 (ms) | Enabled P95 (ms) | Delta (ms) | Numeric limits |
| --------------- | ----------------- | ---------------- | ---------- | -------------- |
| Dial next       | 1021.8            | 1012.1           | -9.7       | Pass           |
| Dial previous   | 924.9             | 900.8            | -24.1      | Pass           |
| History open    | 1746.4            | 1850.6           | +104.2     | Fail           |
| Bout open       | 1257.2            | 1342.2           | +85.0      | Fail           |
| Bout return     | 1323.9            | 1371.8           | +47.9      | Pass           |
| Rankings return | 1300.6            | 1261.3           | -39.3      | Pass           |

History-open and bout-open P95 exceed their 5% allowance. Their script-time P95 counters do not show a matching increase, and some enabled paths appear faster than disabled paths. This run does not establish the cause of the tail differences. It does not justify changing the threshold or claiming a performance improvement. PM09 remains unresolved. Repeat under a controlled device workload and use a native trace before attributing the result to monitoring.

Read the [summary and build identity](evidence/m7-overhead-summary.json) and local compressed raw receipt at `docs/evidence/m7-overhead-run.json.gz` (ignored by Git). The raw receipt includes the independent callback samples, browser performance counters, and local diagnostic captures. Frame-interval P95 is commonly 33.4ms in this headless run; do not report it as native displayed FPS. This is a candidate measurement receipt, not the frozen M7.5 baseline.

## Repeat comparison and native checks

The second warm run completes another 240 measured operations on the same candidate. All six scenes pass the numeric median, P95, and frame-interval limits. P95 enabled-minus-disabled differences are -0.1ms, -0.4ms, -0.7ms, +0.2ms, -0.6ms, and +0.9ms in the table order above. See the [second summary](evidence/m7-overhead-summary-run2.json). Its local raw receipt is `docs/evidence/m7-overhead-run2.json.gz` (ignored by Git). Preserve both runs. Do not select only the passing run as proof of a universal overhead bound.

Native tracing covers three repetitions per mode with fresh application stores and an existing browser HTTP cache. It includes next selection, drag reversal, history, bout entry, and return. Each enabled run has 425 calls attributed to the lazy monitoring chunks. Maximum durations are 0.147ms, 0.061ms, and 0.052ms. No task above 50ms appears in these six traces. Attribution does not cover the small initial bootstrap hooks. See the [native summary](evidence/m7-native-summary.json). Raw traces remain in `work/m7/native-*.json`.

The final five measurement browser tests pass. Together with the 16 existing bout/motion tests, this gives 21 unique functional checks. The added checks cover rapid cancellation and 50 start, ignored-selection, stop, and clear cycles. At each cleanup checkpoint, active and retained record counts are zero. Heap snapshots identify one recorder object before and after the cycles. Total browser heap changes from 4,545,692 to 4,714,560 bytes; this is not proof that the whole application has no leak. The recorder count uses an own-property shape and is a scoped retention check. See the [retention receipt](evidence/m7-retention.json).

## Stats for nerds extension — 2026-11-01

The user approved an empty-area context menu and a local live panel. The panel uses the shared frame sampler and updates its own React state at 2Hz. It shows estimated callback FPS, frame intervals, optional long tasks, last interaction, counters, and build/data/viewport metadata. It has close, reset, resume, and local journey-JSON download controls. The panel is lazy-loaded. A render error boundary isolates it from the product interface. No Worker, telemetry destination, or product animation change was added.

The final Node.js 24 check passes lint (one existing unused-variable warning), TypeScript, 68 unit tests, and production build. Eight measurement/panel browser tests passed in the initial run. The final build passes all 16 existing bout/motion tests, three panel tests, and one opt-in overhead harness. This is 24 unique functional browser checks across the runs, plus one overhead check. Format and changed-topic link checks pass. Desktop and 390px-wide screenshots were inspected locally.

The initial script total is 218,805 gzip bytes: +934 bytes against the previous console-only candidate and +2,537 bytes against the original control. The latter is below the 5,120-byte budget. See the [bootstrap receipt](evidence/m7-panel-bootstrap.json). This uses build-asset gzip sums, not a network-transfer trace.

The three-mode comparison rotates off, console capture, and visible panel on one warm page. It excludes two warmups per mode and records 20 repetitions per direction per mode (120 operations). All modes use the same external callback probe. See the [overhead summary](evidence/m7-panel-overhead.json).

| Mode            | Next P95 (ms) | Previous P95 (ms) | Frame-interval P95 (ms), both directions |
| --------------- | ------------- | ----------------- | ---------------------------------------- |
| Off             | 926.2         | 914.8             | 33.4                                     |
| Console capture | 911.5         | 907.5             | 33.4                                     |
| Visible panel   | 926.8         | 941.8             | 33.4                                     |

Panel-vs-off median/P95 settle differences and frame-interval P95 differences pass the provisional numeric thresholds in these two scenes. Panel-vs-console script-time median increases by about 1.5ms (next) and 2.5ms (previous) per operation. Script counters also include the test probe; this is not a pure callback-cost measurement. There is no zero-overhead claim. This run does not provide native task attribution, cold-path, real-device, or all-journey acceptance. PM10–PM12 have scoped evidence; the full PM09/M7.5 gates remain open.

Raw receipt and screenshots stay in `work/m7/`. The summary records the raw hash and uncommitted candidate identity. No commit, push, or deployment occurred.
