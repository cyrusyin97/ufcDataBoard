# M6.3 interface and navigation report

> Historical evidence. Status, counts, and remaining work below apply to the recorded stage. Use [Product Spec](product-spec.md) for current behavior and [development plan](development-plan.md) for current gates.

Date: 2026-10-23.
Status: M6.3 implemented and checked.
M6.4 automated integration checks pass. User acceptance of the integrated preview is pending.
M6 and M5 remain in progress. No deployment occurred.

## Application changes

The existing React experience now supports a bout view.
Event links in FightHistory open the bout panel when the pinned dataset declares analysis support.
The existing history and profile components retain their V8 structure, with the requested title-font and navigation revisions below.
Opponent names still navigate to opponent history.
The profile record opens history from the bout view.
Fight History returns to the selected participant's parent history.
The figure's Back to rankings action preserves the ranked-fighter or champion return rule.

Both fighter controls update portrait and profile while keeping the bout and period.
All and per-round controls update the URL, summary, scores, and disclosure together.
A bounded, versioned BoutStore loads statistics and references lazily.
It checks identities, participant membership, period availability, formula/policy versions, source hash, and reference cutoff.
Aborted or failed requests do not create cached partial results.
The existing request-generation boundary discards obsolete preparations.
Round changes do not restart the portrait's entrance animation.

The radar uses local SVG and the shared formula v1.1 function.
Both series use thin solid strokes and subtle points.
Display order uses names with stable IDs as a tie breaker; names are not used to join data.
A fighter keeps the same series color when the selected participant changes.
Hover highlights exact scores and raw components. Radar geometry has no click or keyboard activation.
The default-closed disclosure contains all ten axis breakdowns for both fighters.
Keyboard and touch users can read every score and contribution without activating the radar.
Tank breakdown labels distinguish absorbed strikes and times knocked down.

The interface identifies insufficient cohorts, missing metrics, and unknown durations.
It does not plot an apparently complete radar when any axis is unavailable.
Available raw values remain inspectable.
Periods below 60 seconds show a short-sample notice.
Profile dates remain separate from the historical bout date.
Desktop bout cards scroll internally. Mobile preserves portrait, analysis, then profile.

## Routes and owned entries

Use `/rankings?division=<context>&fighter=<participant>&view=bout&bout=<id>&round=all|<round>`.
The active ranking division remains navigation context; the historical bundle division determines scoring.
The route controller retains version-one home/history ownership and adds version-two bout ownership.
History to bout pushes once. Period and participant changes replace the bout entry.
Direct bout entry seeds home, parent history, and bout once; reload reuses them.
Back returns to the current participant's history. Forward restores the last bout state.
The controller preserves framework state fields and native external traversal.
Malformed periods and nonparticipants produce errors instead of a silent fallback.
Error actions permit safe history return or a return to rankings.

## Dataset and preview

The integrated candidate uses `2026-10-14-5949094d82ded09a`.
The current pointer remains `2026-10-14-17c85108758d31ec`.
The production release descriptor is unchanged.
The candidate version is installed alongside the old version for static serving.
`UFC_PREVIEW_DATASET_VERSION` selects the candidate at build time.
`UFC_PREVIEW_BUILD_DIR` isolates the preview build inside the ignored work directory.
These options do not publish a release or change the active pointer.
Without overrides, the existing pointer remains the build default.
Old datasets keep rankings and history usable without exposing analysis links.
The new browser suite explicitly skips when the tested dataset lacks the analysis extension.

The final local preview is on port 3003.
The initial integration build directory was `work/next-m6-final`.
The first transition revision uses `work/next-m6-motion-final`.
The reviewed-controls build uses `work/next-m6-review2`.
The current viewport correction uses `work/next-m6-scroll`.
Run the production server with the matching preview version and build directory.
The final server trace contains 303 files, including the manifest, and no bout/reference artifacts.
The browser fetches those artifacts only when the bout is opened.
No prototype script, chart CDN, SQLite file, or source-site request enters the application.

## Checks

Node.js 24.22.0 passes the production build, TypeScript, ESLint, and 51 unit tests.
The unit suite covers parent history, direct entry, native home return, cache reuse, cancellation, failed requests, and mixed identities.
The full existing Chromium coverage passes 46 distinct checks, including focused reruns described below.
It includes all 176 ranked fighter selections, all 11 divisions, history, preview, motion, and data endpoints.
The final bout suite passes ten checks in each of Chromium, Firefox, and WebKit: 30 checks.
Read [the structured receipt](evidence/m6-interface-validation.json).

The final bout checks cover:

- Direct entry, refresh, participant/period persistence, Back, and Forward.
- History event entry, profile history entry, and direct home return.
- Hover-only geometry and keyboard-accessible complete score disclosure.
- Invalid periods, nonparticipants, failed requests, and Retry.
- Missing values, insufficient samples, short periods, and rapid changes.
- Mobile, reduced motion, portrait visibility, and overflow.

Initial local test failures had two fixture causes.
The history fixture still selected media URLs from the old pointer and used a fixed port for touch navigation.
It now accepts the explicit preview dataset and supplied browser base URL.
Concurrent test commands also shared a trace directory and deleted each other's artifacts.
Affected checks passed with isolated output directories.
The final 30-check run used one isolated output root and had no failures.

The existing lab capture records 214,787 compressed initial script bytes.
Its local headless LCP is 104 ms and CLS is 0.0357.
These local measurements do not certify deployed performance, field INP, or native 60 FPS.
Snapshots at 1318 × 808 and 390 × 844 show the integrated composition without horizontal overflow.
The source database, reviewed media, and preserved prototypes were not modified.
The pipeline suite was not repeated in M6.3 because export code is unchanged since the 38-test M6.2 run.

## Remaining acceptance

The user must review the integrated layout and navigation before M6 completion.
Keep the candidate separate until that review is accepted.
M5 still requires hosting configuration, publication rights, domain decisions, and deployed preview checks.

## Requested transition revision

The user requested changes to the integrated preview on 2026-10-23.
History event entry now grows the portrait and moves the event title into the large heading.
Fight History and native return reverse those motions.
Other card content and profile facts fade around the route commit.
The controller uses final live glyphs and the existing portrait rather than copied title text or image overlays.
History scroll restoration makes the reverse flight work for later records.
User acceptance remains pending after this revision.

Temporary fixed positions let the final live portrait and title cross clipped scroll boundaries.
Measured slots preserve the final title layout during the flight. Cleanup restores normal flow.
The revision also pins the mounted dataset object. Server prop replay during native traversal no longer reinitializes browser history.

The final revision passes 39 bout and motion checks across Chromium, Firefox, and WebKit.
It also passes three existing Chromium motion checks, 51 unit tests, the production build, TypeScript, ESLint, and formatting.
Read [the transition receipt](evidence/m6-bout-motion-validation.json) for the corrected initial checks and scope.

## Second UI review

History event titles now use the same display typeface and uppercase treatment as bout headings.
History result badges and recent-form entries open internal bout details when the dataset supports analysis.
An entry from rankings creates a fighter-history parent before the bout entry.
The return bar is separate from the scrollable bout body and stays visible during page scrolling through the card.
Radar inspection uses a separate row for each component value.
The final revision passes 45 three-browser bout checks, three existing motion checks, and 52 unit tests.
The production build, TypeScript, ESLint, formatting, and whitespace checks pass.
Read [the second review receipt](evidence/m6-review-controls-validation.json).
User acceptance remains pending.

## Viewport correction

Fight History return retains the current document position instead of restoring the older browser entry position.
The shell keeps sufficient document height to prevent clamping after the history card becomes shorter.
The history card size and its internal scroll restoration remain unchanged.
The controller restores the browser's previous scroll-restoration setting on unmount.
The fix passes 48 three-browser bout checks and three existing motion checks.
Read [the viewport correction receipt](evidence/m6-scroll-validation.json).
User acceptance remains pending.
