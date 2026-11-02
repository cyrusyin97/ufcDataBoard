# 6. Animation and scroll specification

[Product Spec index](../product-spec.md) · Version 1.7 · Updated 2026-11-02.

### 6.1 Ownership and transaction

MotionController owns route-transition properties. RankingDial owns its row positioning on a separate inner layer.
React owns committed content. GSAP owns temporary transforms and opacity; two owners must not animate the same element/property.
A transition follows: prepare data and media → measure source → depart → commit → measure final live elements → arrive → cleanup.
Keep the departed layout through a painted frame before replacement.
Use stable keyed glyphs for moving text. Do not swap duplicate text into place at completion.
Do not animate opacity on the portrait container. Image pixels can fade for fighter changes.

### 6.2 Current desktop timing baseline

Durations are seconds. Departure and arrival are separate timeline phases; offsets below are within their respective phase.

| Transition                             | Departure                                                                                      | Arrival                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Dial selection                         | No route drawer                                                                                | Visible row x/y/scale: 0.38, `power3.out`.                                                                          |
| Division change                        | Heading/rows left 0.34; profile right 0.40; figure fade 0.22 at +0.10; phase hold through 0.46 | Heading/rows from left 0.56 with 0.035 row stagger; profile 0.62 at +0.02; figure 0.42 at +0.10.                    |
| Rankings to detail                     | Rows leave left and fade over 0.30; up to 0.06 stagger                                         | Figure translates 0.58; History card fades/translates/scales over 0.52 at +0.06 when present.                       |
| Detail to rankings                     | History card fades and shifts 42px over 0.26 when present                                      | Figure translates 0.85; selector enters over 0.72.                                                                  |
| Opponent replacement                   | Prepared source preview geometry; no category drawer                                           | Matching final name/profile glyphs move for 1.00; incoming image fades 0.62 at +0.18; old image overlay fades 0.26. |
| History to Bout, same fighter          | Other content fades over 0.14                                                                  | Live portrait and title glyphs move for 0.80, `power3.inOut`; other content fades 0.42 at +0.12.                    |
| Bout to History, same fighter          | Other content fades over 0.18                                                                  | Live portrait and title glyphs move for 1.00, `power3.inOut`; other content fades 0.42 at +0.12.                    |
| Period / same-fighter bout replacement | No spatial flight                                                                              | Commit matching content immediately.                                                                                |

Default departure ease is `power2.in`; default arrival ease is `power3.out` unless the row above specifies otherwise.
Ordinary image entry uses a 0.62 fade at +0.18. Rankings entry, category, and same-image bout transitions have their explicit schedules above.
Initial/direct rendering has no route flight. Selecting another participant uses the existing fighter-replacement path.
Current timing is implemented in `src/lib/motion/controller.ts` and `dial.tsx`; do not assume every duration is centralized in `tokens.ts`.

### 6.3 History / Bout shared-element behavior

Measure actual contained portrait pixels rather than the letterboxed image element alone.
Use the final live portrait and event-title glyphs. Temporarily position them above clipping regions while retaining measured text layout slots.
Move and uniformly scale them from previous to final geometry. Do not create an image or title clone for these same-image transitions.
Match the title font family, case, and stable character keys across both endpoints.
On return, restore the relevant History row before measuring its title destination.
No residual fixed positioning, dimensions, transform, opacity, color, or duplicate overlay may remain after settling.
The final animation frame and settled geometry should differ by no more than one CSS pixel in the recorded baseline checks.

### 6.4 Document and internal scrolling

Keep document viewport scroll independent from the History list scroll and Bout content scroll.
Store up to 32 History positions keyed by fighter and bout. On return, restore the saved position and reveal the matching row if needed.
A different History fighter starts at the top. Opening Preview does not reset the list.

While mounted, the experience uses manual browser scroll restoration and disables automatic scroll anchoring on its shell.
Before a Bout-to-History commit, capture current document coordinates and retain enough shell height to support that viewport.
Restore the captured position before measuring final motion geometry.
Keep the minimum document height after cleanup; removing it would clamp the viewport when History is shorter.
The History card itself keeps its normal height. A later bout return recomputes the minimum from the current position.
Restore the previous browser scroll-restoration setting on unmount.
The checked 1169 × 670 case retains 240px throughout the return and 320px on a subsequent native Back.

### 6.5 Interruption and reduced motion

Resize, a new valid navigation, return, or unmount cancels obsolete timelines and pending work.
Clear temporary styles and overlays and settle final elements. Keep the portrait container visible.
At width 900px or below, route spatial transitions use the immediate path. Reduced-motion preference also skips route spatial animation.
The dial skips its own interpolation under reduced motion; narrow width alone does not disable dial selection.
Reduced motion must preserve final route, focus, data, and scroll outcomes.
Frame sampling proves geometry continuity only. It does not certify native 60 FPS.

### 6.6 Pending dial feedback and preparation reuse

Updated 2026-11-02 after the user requested interaction performance fixes.
During same-division selection preparation, row position follows the accepted target immediately. The highlighted selection, profile, portrait, and URL still represent the committed fighter. Expose the dial's busy state. If preparation fails, return row position to the committed selection. A newer intent replaces the previous target.

Same-division selection cancellation and departure do not force row interpolation to its old endpoint. The dial keeps sole ownership of row transforms and retargets from the current position. Other routes, layout reset, reduced motion, and disposal retain hard-settle behavior. Existing durations remain unchanged. Drag remains slot-based; this revision does not implement a continuous fractional pointer-follow model.

Prepare selected-fighter data and portrait independently of bout/reference loading. Prepare other participants after the bout identifies them. Join all required results before departure and atomic commit. On failure or superseding intent, cancel pending work and reject stale commits.

Keep a four-entry LRU of successfully prepared images keyed by immutable URL. Retain the Image resource; do not cache errors, timeouts, or aborted results. Different portrait roles have separate URLs. This is readiness reuse, not a guarantee that the browser never evicts decoded GPU resources. Browser image loading or decode may complete after cancellation, but obsolete results must not enter the readiness cache.

### 6.7 Forward entry duration revision

Approved 2026-11-02. Rankings-to-detail uses at most 0.36 seconds of departure and 0.58 seconds of arrival. Its image fade is 0.48 seconds at +0.08. History-to-bout uses 0.14 seconds of departure and 0.80 seconds of arrival. Both schedules total 0.94 seconds before the existing painted-frame hold, commit, and data readiness. The target is approximately one second with ready data, not a hard network-independent deadline.

Return and opponent-replacement schedules remain unchanged. Preserve the two-callback departure hold, shared live title/portrait nodes, easing, interruption, scroll, and reduced-motion rules. This is an approved duration change; do not count the shorter schedule as improved rendering throughput.
