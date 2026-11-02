# Deployed interaction audit

Date: 2026-10-26.
Target: https://ufc-data-board-gamma.vercel.app/rankings.
Scope: Diagnose reported dial and navigation delays. No runtime code or deployment was changed.
Local source reviewed: `49be350c842d89f0a3ec1f48000891267d75abd3`.
The deployed commit was not independently verified.

## Method and limits

Use the Product Spec journeys as the review map. Inspect the live site in the Codex in-app browser at approximately 1121 × 864. Use native drag, scroll, and click plus semantic controls. Compare the observed states with local implementation paths.

This audit confirms pending states and functional outcomes. It does not measure FPS, INP, long tasks, network timings, or GPU cost. The browser interface did not expose a performance recording. Tool execution time is not interaction latency. Screenshots do not prove smooth animation. Cold cache and CPU throttling were not controlled.

## Journey coverage

| Journeys | Live check                                                                                      | Outcome and limit                                                                                                                                                                                                                        |
| -------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| J01, J16 | Open rankings; refresh Gane's history; browser Back and Forward                                 | Expected pages and fighter identity loaded.                                                                                                                                                                                              |
| J02      | Open the division menu; switch Featherweight to Heavyweight                                     | All 11 menu choices present; Gane selected after transition. Other nine divisions were not exercised.                                                                                                                                    |
| J03      | Drag about 272px; scroll the ranking wheel                                                      | Drag selected Murphy from Volkanovski. A later scroll left Murphy selected with `Loading fighter…` before Sterling appeared. The pending interval is confirmed; frame loss is not quantified. Keyboard and wraparound were not retested. |
| J04, J05 | Open Sterling history; open Zalal preview; Escape                                               | 23 recorded bouts loaded. Preview exposed its loading state. Escape closed it. Full pointer traversal and preview completion were not checked.                                                                                           |
| J07      | Return from Zalal history to rankings                                                           | Returned to Zalal's ranked selection.                                                                                                                                                                                                    |
| J08, J09 | Open Sterling–Zalal through event title; open Gane–Pereira through Recent Form and result badge | Bout content loaded. First event navigation exposed a pending state before route commit.                                                                                                                                                 |
| J10      | Change Sterling–Zalal to R1; select Zalal                                                       | R1 URL and statistics updated. Zalal portrait/profile became selected.                                                                                                                                                                   |
| J12      | Expand and collapse How to read this chart                                                      | Formula and both fighters' breakdown tables appeared and collapsed.                                                                                                                                                                      |
| J13      | Return from bout to history at nonzero document scroll                                          | Native click retained 217.083px during transition and after idle. Zalal also returned to his own history. History-list restoration at a deep row was not retested.                                                                       |
| J17      | Inspect source links                                                                            | Official profile and UFCStats bout links present; external destinations not opened.                                                                                                                                                      |

J06 opponent-history replacement, J11 radar hover traversal, J14 recovery, and J15 unavailable-data branches were not fully exercised. Mobile, reduced motion, other browser engines, and constrained devices remain untested here. This is a targeted deployed audit, not the complete release acceptance matrix.

Captured warning/error logs were empty at the two inspection points. This does not exclude rendering bottlenecks.
A semantic click initially moved the document to the top before activation. A second test used the visible button's native coordinates and retained scroll. Do not file that first result as an application scroll regression.

## Findings and optimization order

### 1. High confidence: dial feedback waits for global navigation

`src/components/rankings/dial.tsx:73` sends each target to the same navigation pipeline as page changes. Row positions depend on the committed selection. Pointer movement uses `Math.round(dy / 92)` at line 139; it does not continuously follow the pointer.

`src/components/rankings/use-experience.ts:152` cancels motion, loads data, prepares media, departs, and only then commits. `src/lib/data/fighter-store.ts` fetches a full fighter bundle for a non-initial uncached selection. Thus local wheel input can wait for archive data and image readiness before the wheel moves. The observed pending state supports this diagnosis.

Recommended first change: separate transient dial position from committed fighter identity. Update position on animation frames during drag and settle to a slot. Coalesce rapid intent to the final target. Keep profile, portrait, and URL atomically consistent when committing; never show an old profile as the new fighter. Add bounded adjacent-target preparation and reuse completed preparations. Do not preload every portrait.

### 2. High confidence: interruption forces a snap before retargeting

`src/lib/motion/controller.ts:166` emits `ufc:motion-settle` on cancellation and departure. The dial listener at `dial.tsx:54` kills row tweens and sets their final coordinates immediately.

Wheel input can trigger every 150ms, while each row tween lasts 380ms. A new intent during interpolation therefore has a concrete path that jumps to the previous endpoint before the next target is ready. This mechanism explains discontinuity without requiring a slow server. No frame trace was captured to quantify its frequency online.

Recommended first change: let the dial retarget from its current interpolated position. Reserve hard settling for disposal, explicit reduced-motion behavior, or a layout reset. Keep one owner for row transforms. Test rapid reversals and aborted preparations.

### 3. High confidence: sequential preparation and long serial timelines add latency

`use-experience.ts:160` waits for the bout and its reference, then the selected fighter and summary, then other participants, then portrait preparation. Independent work is not all started together. `src/lib/data/bout-store.ts` needs the bout before resolving its reference. That dependency is legitimate; selected-fighter loading need not wait for the entire chain.

`src/lib/motion/prepare.ts` creates an image and calls `decode()` on each preparation. It has no application-level successful-decode cache. Each image attempt can wait up to 1500ms, with a second attempt for a fallback. Browser caching can reduce actual cost; repeated calls do not prove repeated network transfer. Even a round-only route repeats preparation.

After preparation, rankings-to-history has up to 0.705s departure plus 0.90s arrival, with a two-frame departure hold. History-to-bout and reverse use 0.18s departure plus 1.00s arrival, also with the hold. These are source timing sums, not measured latency. A smooth 1.6-second transition can still feel slow.

Recommended changes: start independent requests together; deduplicate in-flight loads; cache bounded media readiness; bypass media preparation when the same portrait and bout are already ready. Keep loading feedback immediate. Treat shorter or overlapping transition schedules as a product-motion change that needs review, not as proof of an FPS fix.

### 4. Measured DOM size; unmeasured cost: all history titles use glyph nodes

Zalal's 13-record history had 1,561 DOM elements and 486 `[data-motion-glyph]` elements. `src/lib/motion/bout-title.tsx` expands every event title into words, character slots, and glyphs, including offscreen rows. Opening history mounts this tree in the synchronous commit at `use-experience.ts:213`.

Recommended investigation: record React commit, style, and layout cost for short and long careers. Limit character-level preparation to the active shared title while preserving final live text and stable keys. Consider row isolation or windowing only if profiling supports it; preserve list scroll, focus, accessibility, and title return targets. A large element count alone is not proof of dropped frames.

### 5. Lower-confidence contributors to profile before changing

- `controller.ts` measures layout and computed styles, then prepares fixed portrait and glyph elements. Some branches interleave measurements and GSAP writes. Check forced layout in a trace. The bout-title target measurements already use a batch; do not label all measurement code as layout thrashing.
- `BoutAnalysis` recomputes scores and constructs the breakdown subtree when hover state changes. Separate the hover display and memoize invariant derived data if profiling shows material cost. The score arithmetic is small; it is not the leading suspect.
- Large filtered portraits, translucent overlays, masks, and fades may add raster/compositing work. Inspect paint and layer costs before changing the accepted design or adding `will-change` broadly.

There is no evidence here that Vercel compute, SQLite queries, or the radar formula is the main bottleneck. Runtime data comes from exported JSON. Network delay can amplify the frontend preparation dependency, but CDN cache and transfer behavior were not measured.

## Next validation pass

1. Record production-mode traces on a documented browser, device, viewport, and connection. Keep initial-load, first-target, and warm-target runs separate.
2. Mark input, prepare start/end, data ready, media ready, commit, first visual feedback, and settle. Record frame intervals during sustained drag and navigation. Measure loading latency separately from frame continuity.
3. Repeat the same sequences before and after each isolated fix: ten wheel steps, reverse drag, uncached and cached fighter, rankings/history, history/bout return at nonzero scroll, round changes, and participant changes.
4. Check request cancellation and bounded caches. Confirm latest intent wins and no identity mismatch, portrait flash, residual overlay, focus loss, or scroll reset.
5. Reuse Product Spec performance targets: INP at most 200ms and desktop motion target 60 FPS. Report actual distributions and long frames; a functional test pass alone does not satisfy those targets.

Recommended order: dial feedback and interruption first; preparation reuse and request scheduling second; measured commit/layout/paint work third; reviewed timing adjustments last. Add the resulting evidence to M5 before declaring deployed performance accepted.
