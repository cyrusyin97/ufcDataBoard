# 6. Animation and scroll specification

[Product Spec index](../product-spec.md) · Version 1.3 · Updated 2026-10-24.

### 6.1 Ownership and transaction

MotionController owns route-transition properties. RankingDial owns its row positioning on a separate inner layer.
React owns committed content. GSAP owns temporary transforms and opacity; two owners must not animate the same element/property.
A transition follows: prepare data and media → measure source → depart → commit → measure final live elements → arrive → cleanup.
Keep the departed layout through a painted frame before replacement.
Use stable keyed glyphs for moving text. Do not swap duplicate text into place at completion.
Do not animate opacity on the portrait container. Image pixels can fade for fighter changes.

### 6.2 Current desktop timing baseline

Durations are seconds. Departure and arrival are separate timeline phases; offsets below are within their respective phase.

| Transition                                | Departure                                                                                      | Arrival                                                                                                             |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Dial selection                            | No route drawer                                                                                | Visible row x/y/scale: 0.38, `power3.out`.                                                                          |
| Division change                           | Heading/rows left 0.34; profile right 0.40; figure fade 0.22 at +0.10; phase hold through 0.46 | Heading/rows from left 0.56 with 0.035 row stagger; profile 0.62 at +0.02; figure 0.42 at +0.10.                    |
| Rankings to detail                        | Rows leave left and fade over 0.60; up to 0.105 stagger                                        | Figure translates 0.85; History card fades/translates/scales over 0.75 at +0.15 when present.                       |
| Detail to rankings                        | History card fades and shifts 42px over 0.26 when present                                      | Figure translates 0.85; selector enters over 0.72.                                                                  |
| Opponent replacement                      | Prepared source preview geometry; no category drawer                                           | Matching final name/profile glyphs move for 1.00; incoming image fades 0.62 at +0.18; old image overlay fades 0.26. |
| History to Bout and reverse, same fighter | Other content fades over 0.18                                                                  | Live portrait scales uniformly and title glyphs move for 1.00, `power3.inOut`; other content fades 0.42 at +0.12.   |
| Period / same-fighter bout replacement    | No spatial flight                                                                              | Commit matching content immediately.                                                                                |

Default departure ease is `power2.in`; default arrival ease is `power3.out` unless the row above specifies otherwise.
Ordinary image entry uses a 0.62 fade at +0.18. Category and same-image bout transitions have their explicit schedules above.
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
