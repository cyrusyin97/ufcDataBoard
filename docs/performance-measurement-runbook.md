# Local journey measurement runbook

Status: M7 implementation candidate. Read [the contract](spec/performance-measurement.md) before interpreting results.

## Capture a journey

Use a production build with its pinned dataset. Open browser developer tools after the page settles.

```js
await window.__ufcPerf.start();
```

Perform the target interaction. Wait until the application settles, then run:

```js
window.__ufcPerf.stop();
const capture = window.__ufcPerf.export();
```

Use the developer tools copy facility or the test harness to save `JSON.stringify(capture, null, 2)` as a local JSON file. No upload occurs. `export()` returns an object; it does not initiate a download.

`status()` reports enabled state, active records, retained records, and loss counters. `clear()` removes retained capture data after stopping. A new start clears the previous session. Reload removes capture state and returns to disabled mode. Resize and hidden-document events stop capture; start a new session after changing the environment. A start that is still loading can be cancelled by stop.

Record the device model, OS, browser/version, display refresh rate, connection, build commit and working-tree revision, and run label alongside the export. Build ID is `unknown` unless the build defines `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`. Do not mistake a source commit for the identity of uncommitted changes. Browser label and run label are null until supplied in an accompanying receipt.

## Interpret output

- Compare `settleLatency` only for completed records. Report ignored, cancelled, error, and incomplete counts separately.
- `commitLatency` measures target state commit. `pendingProxy` and `targetProxy` are animation-frame scheduling observations, not measured paint timestamps.
- Resource spans cover request and JSON decoding. The outer prepare span also covers validation and summary work. An application-store hit does not prove an HTTP cache hit.
- Decode spans report successful preparation or failure. A failed decode can lead to a successful fallback and completed navigation. The span detail distinguishes image timeout from decode rejection.
- Use frame interval summaries as cadence proxies. They are not native presented FPS. Zero samples mean no samples, not zero latency. Unsupported long-frame data is null.
- Check losses and truncation before comparing captures. A 30-second active transaction is closed as incomplete; the application continues.
- Parent IDs are reserved and currently null. Scene and source/target routes identify navigation families. Input labels come from passive capture listeners; programmatic navigation may not have a handler-delay sample.

## Functional verification

Use Node.js 24 and the installed release dataset.

```sh
npm run check
npm run test:e2e -- tests/e2e/performance.spec.ts tests/e2e/bout.spec.ts tests/e2e/bout-motion.spec.ts --workers=1
```

The unit suite includes the recorder contract and observer lifecycle. The browser checks use the production server. Do not use development-mode timings for acceptance.

## Controlled overhead comparison

```sh
PERF_BENCHMARK=1 npm run test:e2e -- tests/e2e/performance-benchmark.spec.ts --workers=1
```

This opt-in check alternates diagnostics off and on in one page, warms each path twice, then repeats six scenes 20 times per mode. It records an independent frame callback probe in both groups and Chromium performance counters when available. The output is `work/m7/overhead.json`.

The six scenes cover next/previous selection, history entry, recent-bout entry, bout return, and rankings return. This harness does not produce a cold-HTTP-cache result or a drag-reversal timing baseline. Separate native and retention checks are described below. Keep PM09 open when repeated timing runs disagree. It writes receipts rather than treating a noisy latency threshold as a functional test assertion.

For each scene and mode, calculate median and nearest-rank P95 operation duration. Compare frame-interval P95 and count intervals above 33.3ms and 50ms. Keep per-run samples and report variability. CDP script/layout counters are cumulative; subtract each pair's before/after values. Do not label the resulting interval as application-only work: the independent probe and automation are also present in both groups.

Freeze a baseline only after the module overhead gate passes. Record browser-native Performance traces to attribute new long tasks. Use repeated capture/clear cycles and controlled heap observations to check retention. Compare the disabled initial compressed JavaScript with an isolated build of the unchanged source revision. Keep large traces and intermediate build directories under `work/`.

## Native attribution and retention

```sh
PERF_NATIVE=1 npm run test:e2e -- tests/e2e/performance-native.spec.ts --workers=1
node scripts/summarize-performance.ts work/m7/overhead.json work/m7/overhead-summary.json
```

The native harness records three repetitions per mode in fresh pages. It includes drag reversal and navigation. Application stores start empty; the browser HTTP cache is not cleared. CDP traces and the summary remain in `work/m7/`. Attribution uses the lazy monitoring chunk URLs; it does not measure every initial bootstrap hook separately.

The functional measurement suite also runs 50 capture/clear cycles. It forces collection at checkpoints and compares recorder-shaped objects in two heap snapshots. It writes `work/m7/retention.json`. A stable recorder count is scoped evidence, not a whole-application leak guarantee.

The [M7 report](m7-report.md) preserves both warm timing runs, the native summary, and the retention receipt. Large raw files remain local and are not versioned. Copy them to a selected artifact store before removing the local workspace. Summary receipts preserve the raw warm-run hashes.

## On-page live display

Right-click an empty layout area and choose Stats for nerds. Links, images, controls, charts, selected text, and text content keep the browser menu. The compact translucent panel shows callback cadence, frame intervals, and long tasks. Drag its title bar to move it; arrow keys on the title bar move it 10px. Unsupported metrics show N/A.

Closing stops capture. Resize or hiding the document pauses capture. Close and reopen to start a fresh display. Use the console adapter for reset and export. The panel adds UI overhead, so label receipts as console-only or panel-visible. Earlier panel receipts describe the former expanded layout.

Run the panel comparison with `PERF_PANEL=1 npm run test:e2e -- tests/e2e/performance-panel-benchmark.spec.ts --workers=1`. It rotates off, console capture, and panel modes on one warm page, excludes two warmups per mode, and records 20 next/previous pairs per mode. The receipt is `work/m7/panel-overhead.json`. This covers warm dial selection only, not the full journey acceptance gate.
