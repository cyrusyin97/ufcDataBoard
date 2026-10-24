# 2. Product scope and invariants

[Product Spec index](../product-spec.md) · Version 1.3 · Updated 2026-10-24.

The product lets users browse UFC rankings, inspect fighter records, follow opponents, and compare statistics from one bout.
The initial interface is English. It has no login, payments, predictions, user editing, global fighter search, or browser-triggered data collection.

### 2.1 Current functions

| Module          | User capability                                                                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| Rankings        | Choose a published division; select fighters with a looping dial; read the selected profile.                |
| Fighter archive | Open full recorded history, including fighters outside current rankings; preview and follow opponents.      |
| Bout analysis   | Open a fight from an event, result badge, or recent result; select either participant and an actual period. |
| Scores          | Compare five weighted axes; inspect raw inputs and formulas; distinguish missing scores from zero.          |
| Navigation      | Share URLs, reload, return, use native Back/Forward, and recover from failed requests.                      |
| Source access   | Open recorded source links without implying a live data refresh.                                            |

### 2.2 Required invariants

- Use stable UFCStats IDs for fighters and bouts. Never join data by display name.
- Keep fighter identity, career facts, recorded bouts, and ranking membership separate.
- Expose all 11 captured divisions and 176 ranking entries in the current dataset. Preserve explicit source ties and order.
- Resolve divisions from a configurable registry. Contracts must support other division counts and list lengths.
- Keep all source fighters in the archive, including unranked fighters and fighters with no recorded bouts.
- Default to Featherweight and the active division's champion. A category change selects its target champion.
- Return to a ranked fighter in the active division; otherwise return to that division's champion.
- Keep absent values as `null`; display an em dash or an explicit unavailable state. Never infer career totals from recorded bouts.
- Pin one immutable dataset per mounted experience. Do not mix release versions during navigation.
- Keep SQLite, credentials, and private source files outside public assets and browser runtime.
- Keep source-site calls in offline tooling. Browser components use checked local artifacts only.
- Use one owner for each animated property. Cancel obsolete requests and animations. Keep final live text and the portrait container visible through cleanup.

### 2.3 Terms

A ranking entry is one fighter's membership in a division snapshot.
A fighter bundle contains profile facts and recorded fights independently from ranking membership.
A bout bundle contains both fighter perspectives and available periods for one fight.
A period is the entire bout or one actual round; exported round zero means bout totals.
An owned entry is a browser-history entry marked by this application.
A committed view is the last complete, validated view shown to the user.
A reference cohort is the historical population used to normalize a score.
A component contribution is one normalized statistic multiplied by its axis weight.
A reviewed media role identifies how an image can be used: headshot, half-body, or full-body.
