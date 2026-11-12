# 4. Routes, state, and recovery

[Product Spec index](../product-spec.md) · Version 1.6 · Updated 2026-11-02.

### 4.1 URL contract

`/` redirects to `/rankings`. Use query routes, not prototype hash routes.

| View              | URL                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------- |
| Default rankings  | `/rankings`                                                                           |
| Selected rankings | `/rankings?division=<division>&selected=<fighter>`                                    |
| Fighter history   | `/rankings?division=<division>&fighter=<fighter>&view=history`                        |
| Bout              | `/rankings?division=<division>&fighter=<participant>&view=bout&bout=<bout>&round=all` |
| Round             | The same bout URL with `round=<positive actual round>`                                |

An absent or invalid division resolves to Featherweight. An invalid ranked selection resolves to that division's champion.
An invalid History fighter must not silently select another fighter.
An invalid bout, nonparticipant, malformed period, or absent requested round produces an explicit error.
The active ranking division is navigation context. The bout's historical division determines its reference population.
Hover, preview, disclosure state, and scroll positions are not encoded in URLs.

### 4.2 Owned browser-history transitions

| Action                                                 | Browser entry behavior                                                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------- |
| Change ranking selection or division                   | Replace current rankings entry.                                             |
| Rankings to History                                    | Push one History entry linked to the owned home entry.                      |
| History to opponent History                            | Replace History; preserve home ownership and active division.               |
| History to Bout                                        | Push one Bout entry linked to its History parent.                           |
| Rankings recent result to Bout                         | Create History parent, then push Bout.                                      |
| Change participant, period, or recent bout within Bout | Replace Bout; keep the same parent relationship.                            |
| Fight History / native Back from Bout                  | Traverse to parent History, using the current participant.                  |
| Back to rankings from Bout                             | Traverse past parent History to home; apply ranked/champion selection rule. |
| Direct History / Bout entry                            | Seed missing owned parents once. Reload reuses them.                        |
| Native Forward                                         | Restore the last owned view and bout state.                                 |

Preserve framework history state fields. Do not add a second router or a competing history writer.
Do not capture external navigation. Back from the owned home may leave the application.
The experience pins its dataset object across server prop replay; key a remount by dataset version.
This prevents traversal from reinitializing ownership and losing Forward entries.

### 4.3 State lifecycle

| Phase           | Visible behavior and allowed work                                                |
| --------------- | -------------------------------------------------------------------------------- |
| `rankings`      | Dial, division control, profile, and entry actions.                              |
| `history`       | Internal list scroll, opponent preview, archive navigation, and bout entry.      |
| `bout`          | Participant and period controls, radar, disclosure, and returns.                 |
| `preparing`     | Keep committed content; fetch and validate target data; prepare fonts and media. |
| `transitioning` | Animate the committed target; generation checks still protect newer intent.      |
| `error`         | Keep available committed content and show explicit recovery controls.            |

One request generation owns each navigation transaction.
Abort obsolete requests and discard stale results even if a transport does not stop immediately.
Commit route, fighter, bout, participant, and period data together after validation and preparation.
Duplicate route events do not restart equivalent pending work.
Category changes are blocked during their transaction. Other newer navigation and return actions cancel obsolete work.
Failed or aborted requests must not publish partial cache results.

### 4.4 Error and data-state contract

| Condition                                         | Required result                                                                         |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Slow preparation                                  | Keep committed content usable; announce loading.                                        |
| Failed request                                    | Show error, Retry, and appropriate return action.                                       |
| Unknown fighter                                   | Explicit unavailable fighter and rankings return; no fabricated replacement.            |
| Invalid bout identity, participant, or period     | Bout error; safe History and rankings actions when offered.                             |
| No recorded fights                                | Empty list and no invented recent-result tiles.                                         |
| Missing profile or metric                         | Em dash or unavailable score; never turn missing data into zero.                        |
| Insufficient reference or unavailable axis        | Explain scoring limitation; retain raw values; do not show a misleading complete radar. |
| Missing image                                     | Reviewed headshot fallback, then initials; no broken-image state.                       |
| Interrupted motion, resize, reduced-motion change | Settle final elements and remove obsolete styles, overlays, and requests.               |

Preparation update, 2026-11-02: Selected-fighter and portrait readiness can run concurrently with bout/reference work. Commit still joins all validated results. A failure aborts the remaining branch. During same-division ranking preparation only the dial's transient position can follow the pending target; committed identity, profile, portrait, and URL remain unchanged.

Intent preparation update, 2026-11-12: Speculative preparation after hover or focus is not a navigation transaction. It does not change the route, the phase, browser history, or committed content. A navigation transaction can take ownership of matching speculative work. See [intent preparation](operations-and-performance.md#intent-preparation-and-embedded-references).
