# 11. Critical test cases

[Product Spec index](../product-spec.md) · Version 1.2 · Updated 2026-10-24.

Use these cases as minimum impact-based regression coverage. They are not a claim that all combinations are automated.
Retain existing B/U/BA identifiers in historical reports; use this spec and C01–C20 for new acceptance references.

| ID  | Scenario and action                                                      | Pass condition                                                                                              | Primary checks                                                        |
| --- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| C01 | Fresh, invalid, and explicit ranking URLs                                | Champion defaults and explicit valid selection are consistent after refresh.                                | `foundation.spec.ts`, `routes.test.ts`                                |
| C02 | Traverse every published division and ranked entry                       | All 11 divisions/176 current entries work; ties and source order remain intact.                             | `all-divisions.spec.ts`                                               |
| C03 | Loop dial by wheel, drag, buttons, keyboard, endpoints                   | Both boundaries loop; selected row, URL, portrait, and profile agree.                                       | `foundation.spec.ts`                                                  |
| C04 | Operate dark menu on narrow screen and keyboard                          | All options reachable; dismissal/focus work; target champion selected.                                      | `selector.spec.ts`, `all-divisions.spec.ts`                           |
| C05 | Open full History and scroll to oldest record                            | Full count and list match bundle; no career-total inference.                                                | `history.spec.ts`                                                     |
| C06 | Follow repeated ranked/unranked opponents and return                     | One replaceable History entry; correct ranked/champion home return.                                         | `history.spec.ts`, `routes.test.ts`                                   |
| C07 | Preview by hover, focus, touch; dismiss during slow response             | No late reopening, focus loss, or list reset; Escape priority holds.                                        | `history.spec.ts`                                                     |
| C08 | Open from event, result badge, and Recent Form in each view              | Correct bout/participant/All; Rankings entry has History parent.                                            | `bout-motion.spec.ts`, `routes.test.ts`                               |
| C09 | Direct bout, reload, rapid Back/Forward, participant/period change       | One owned parent chain; latest participant and period restored; no lost Forward entry.                      | `bout.spec.ts`, `routes.test.ts`                                      |
| C10 | Interrupt slow or failed navigation and retry                            | Committed view remains; stale results cannot overwrite latest target.                                       | `foundation.spec.ts`, `history.spec.ts`, `bout.spec.ts`               |
| C11 | Unknown fighter/bout, invalid participant/period, mixed versions         | Explicit recoverable error; no silent substitution or mixed release.                                        | Store/contract unit tests, `bout.spec.ts`                             |
| C12 | Empty history, missing facts or images                                   | Empty/null/fallback states are correct and usable.                                                          | `history.spec.ts`, `foundation.spec.ts`                               |
| C13 | Scoring fixture with KD, control, ground strikes, zero and null          | Correct weights/rates/caps; Tank symmetry; no ground double count or null-to-zero conversion.               | `bout-scoring.test.ts`, pipeline bout tests                           |
| C14 | Sparse cohort, target/later dates, unusual duration, zero bounds         | Five-year same-division policy, 50-bout gate, fallbacks, and short-period notice hold.                      | Pipeline audit/reference tests, `bout.spec.ts`                        |
| C15 | Hover/click/tap radar; open disclosure by keyboard                       | Hover only; no pin action; both fighters/all axes available without hover; values on separate rows.         | `bout.spec.ts`, `bout-motion.spec.ts`                                 |
| C16 | Compare transition intermediate and settled frames                       | Same final live glyphs; continuous portrait/title movement; no residual overlay or cleanup jump.            | `motion.spec.ts`, `bout-motion.spec.ts`                               |
| C17 | Return from scrolled Bout, including native traversal and reduced motion | Current document position stays stable across frames/cleanup; list restores independently.                  | `bout-motion.spec.ts`                                                 |
| C18 | Scroll Bout content and the document                                     | Return remains reachable; no horizontal overflow; mobile order holds.                                       | `bout-motion.spec.ts`, `bout.spec.ts`                                 |
| C19 | Resize, unmount, change preference, or navigate during motion            | No stale transforms/fixed elements; portrait container remains visible.                                     | Motion suites                                                         |
| C20 | Export, restore, deploy, and roll back a pinned artifact                 | Identity/version/checksum/media checks pass; old release stays usable; direct routes work after deployment. | Pipeline, restore unit tests, data E2E, release preflight/HTTP checks |

### 11.1 Verification procedure

For code changes, run the relevant unit/browser checks and `npm run check` when the change requires a production build.
For data/export changes, run `npm run test:pipeline`, schema/data validation, and isolated artifact restoration as applicable.
For docs-only changes, run `npm run format:check`, local-link/anchor checks, and `git diff --check`; do not claim fresh application validation.
Use `M4_CROSS_BROWSER=1` for Chromium, Firefox, and WebKit coverage. Use an explicit `PLAYWRIGHT_BASE_URL` for a candidate or deployed server.
Give concurrent test runs different output directories so traces do not overwrite each other.
For M6 tests, verify the server and test process target the same candidate dataset; tests skipped on a legacy dataset are not passes for Bout.
Record environment, viewport, dataset/build version, counts, failures, reruns, and remaining limits.
Review key layouts at 1318 × 808, 1084 × 854, the reported 1169 × 670 case, and mobile 390 × 844.
Measure performance on a documented device. Local screenshots and geometry samples do not certify field performance or native frame rate.
