# UI requirements — superseded reference

> Superseded on 2026-10-24 by [Product Spec](../product-spec.md), the sole current product logic standard.
> The body below is retained as historical context for existing report links. Its status statements and instructions are not current requirements. Do not add new product rules here.

Updated: 2026-10-24.
Read [user journeys](../spec/user-journeys.md) for complete entry, navigation, recovery, and input flows.

## Reference

Use [V8](../../outputs/designs/ufc-rankings/index-v8.html) as the current desktop reference.
Use the V6 [repair report](../../outputs/designs/ufc-rankings/README-v6.md) for motion history.
The reference uses local Barlow and Barlow Condensed fonts.
Its palette uses charcoal, cream, muted gray, and red.

| Token      | Reference value |
| ---------- | --------------- |
| Background | `#111112`       |
| Panel      | `#151516`       |
| Text       | `#eeeae2`       |
| Muted text | `#9b9996`       |
| Border     | `#323232`       |
| Accent     | `#e83c39`       |

Use Tailwind theme variables for these values.
Use explicit component variants instead of a new stylesheet for each revision.
Keep small global rules for fonts, focus, and motion preferences.
Do not add CSS Modules.

## Rankings state

The left area contains a circular selector.
Its central row represents the current selection.
The middle area contains the fighter image and name.
The right area contains the fighter profile.
Each selector update changes all three areas consistently.

## History state

1. Move the selector rows beyond the left edge.
2. Expand the fighter image to its full-body composition.
3. Move the fighter image into the left area.
4. Show the history card in the middle area.
5. Keep the right profile card in its existing position.

The history card scrolls internally.
Each row shows opponent, date, event, location, result, method, round, and time.
Missing values show an em dash.
The card uses the full exported list.

## Opponent preview

The preview is a nonmodal card.
It shows image, name, career record, age, height, and reach.
Keep it inside the viewport.
Keep it open while the pointer crosses into the card.
Close it after the pointer leaves both trigger and card.
Keyboard focus must expose the same information.
Escape closes the preview before it closes history.
Touch access must not depend on hover.

## Opponent transition

The preview name moves toward the left fighter heading.
The record and profile facts move toward the right profile card.
Use the final text elements during the entire transition.
Transform position, uniform scale, and color toward their final values.
Do not replace the text after the animation completes.
Fade images out and in.
Do not morph a headshot into a full-body image.

The portrait container must remain visible throughout detail mode.
V5 restarted its entrance animation after transition cleanup.
V6 removed that restart.
The application must preserve this correction.

## Navigation

Both the return button and browser Back follow the same selection rule.
A ranked detail fighter becomes the selected home fighter.
A detail fighter outside the active ranking returns to that division's champion.
Home refresh preserves the selection in the URL.
A fresh home URL selects the active division champion.
Opponent changes do not create additional history entries.

## Acceptance matrix

| ID  | Check                                     | Expected result                                               |
| --- | ----------------------------------------- | ------------------------------------------------------------- |
| U01 | Compare home at 1318 × 808.               | Layout, hierarchy, colors, and selected row match V8.         |
| U02 | Open history at 1084 × 854.               | The list scrolls inside the card without horizontal overflow. |
| U03 | Inspect the last transition frames.       | Text does not jump after cleanup.                             |
| U04 | Navigate through ten opponents.           | No old image, overlay, or animation remains.                  |
| U05 | Refresh a nested detail URL.              | Links and history work after reload.                          |
| U06 | Return from ranked and unranked fighters. | Selection follows the agreed rule.                            |
| U07 | Enable reduced motion.                    | The same state changes complete without spatial animation.    |
| U08 | Use only the keyboard.                    | Focus remains visible and every action remains available.     |
| U09 | Test a missing portrait.                  | A headshot or initials appears without a broken image.        |
| U10 | Test slow and failed requests.            | Existing content stays usable and retry remains available.    |

Target the final-frame geometry change at no more than one CSS pixel.
Record computed styles and actual rendered frames.
A screenshot sequence is not proof of native 60 FPS performance.
Use browser performance traces for frame timing.

## Category drawers

The dropdown sits above the circular selector.
Use the V8 dark custom menu, its right-aligned weights, and its active checkmark.
Do not open an operating-system select popup.
Support arrow keys, Enter, Escape, Tab, and outside-pointer dismissal.
It offers all published divisions in registry order with their configured weights.
Use a bounded scrolling menu so all options remain reachable on small screens.
Keep category controls available in the rankings state.
The selected category and the main heading identify the same division.

1. Prepare the target division data and champion image.
2. Move the old main heading and rows beyond the left screen edge.
3. Move the old profile beyond the right screen edge.
4. Fade the middle figure out.
5. Commit the target division with its champion selected.
6. Move the new heading and rows from the left edge.
7. Move the new profile from the right edge.
8. Fade the new figure in.
9. Remove temporary motion styles after completion.

Move the division name and weight as one heading element.
Synchronize heading movement with row movement.
Measure the outgoing and incoming heading separately.
Their text widths can differ.
Keep row drawers separate from dial positioning.
Keep current content visible during preparation.
Disable another category change during the transition.
A failed preparation preserves the current division and exposes retry.
Reduced motion commits the same final state without spatial movement.

## Category acceptance

| ID  | Check                                          | Expected result                                                   |
| --- | ---------------------------------------------- | ----------------------------------------------------------------- |
| U11 | Switch published categories.                   | Each target division selects its champion.                        |
| U12 | Inspect old heading and rows.                  | They move fully beyond the left edge before replacement.          |
| U13 | Inspect the profile.                           | Departure and arrival use the right edge.                         |
| U14 | Compare different heading widths.              | Name and weight move together without clipping or a final jump.   |
| U15 | Alternate categories four times.               | The final division, champion, figure, and profile agree.          |
| U16 | Refresh home and detail in each division.      | The active division and explicit fighter persist.                 |
| U17 | Inspect category cleanup.                      | Temporary transforms disappear without changing settled geometry. |
| U18 | Interrupt preparation or resize during motion. | No stale data, overlay, or temporary style remains.               |

Use V8 for current comparisons.
Keep V6 and V7 as historical references.

## Ranking headshots

Use a reviewed headshot for every ranking-list thumbnail in each published division.
Select the largest available headshot variant.
Keep the complete vertical headshot composition inside the image box.
Use a centered cover crop for horizontal framing.
Do not stretch the image beyond the thumbnail container or offset it upwards.
Use initials when a reviewed headshot is absent.
Keep half-body and full-body roles for the main figure and history composition.

## V9 bout analysis

Use [V9](../../outputs/designs/ufc-rankings/index-v9.html) for the new middle bout panel only.
Keep V8 as the existing rankings, history, and profile reference.
Follow [the bout analysis specification](bout-analysis.md) and BA04 through BA10.

Show the selected portrait, bout analysis, and existing profile from left to right.
Support both fighter headshots, All, and each available round.
Use thin solid red and blue radar lines with subtle points.
Radar geometry responds to hover only. It must not select or pin values on click or tap.
Keep formulas and score contributions inside the default-closed How to read this chart disclosure.
Provide textual access for both fighters without depending on hover.
The keyboard and touch exception concerns radar geometry only, not other controls.

Add Fight History to the bout panel and retain the complete Professional Record entry on the profile.
Use opponent names for fighter-history navigation and event links for bout navigation.
Restore the selected fighter's history on return.
Keep V8 history rows, count, headings, location, and scroll footer.
Do not retain the superseded V9 history tabs or instructional banner.
Keep V8 profile digits, finish bars, imperial measurements, recent-form dates, and source link.
The V9 prototype remains subject to production visual and navigation checks.

### History and bout transition

User revision: 2026-10-23.
Opening a history event uses the existing coordinated motion system.
The portrait grows smoothly into the bout composition.
The selected event title moves upward from its row into the large bout heading.
Use the actual event name as that heading, not the generic Bout Study label.
Returning to history reverses the portrait scale and title movement.
Fade the remaining card content, figure labels, and profile during the swap.
Keep the portrait container visible throughout both directions.

Use the final live title glyphs throughout each flight.
Do not clone or replace title text at completion.
Keep event words intact when the title wraps.
Restore the originating history scroll position before measuring the return title.
A direct bout visit without a saved history position must still reveal the matching row on return.
Native Back and Forward use the same motion path as the controls.
Resize, interruption, reduced motion, and narrow layouts must settle without stale transforms.

### Bout review controls and text

User revision: 2026-10-23.
Use the same display typeface and uppercase treatment for history event names and bout headings.
Keep the history event text small enough for its row.
The history result badge and each recent-form entry open the matching internal bout when analysis is available.
Keep modified clicks and link URLs usable.
The Fight History control stays at the top while the detail content scrolls.
Keep it visible when the page scrolls through the bout card.
Show radar inspection values on separate rows. Show the fighter, axis, and total before component rows.

### Preserve viewport on bout return

Keep the current document scroll position when returning from bout detail to fight history.
Do not restore the browser entry's older page position during that transition.
Keep the position stable during departure, commit, arrival, and cleanup.
Keep history-list scroll restoration independent from document scrolling.
Apply the same rule to native traversal and reduced-motion mode.
