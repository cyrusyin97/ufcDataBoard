# Product requirements

Status: Accepted behavior from V8. Engineering targets remain subject to measurement.

## Scope

The website helps users explore UFC fighters and their recorded fights.
The initial release must support Featherweight and Lightweight.
Each initial division contains 16 fighters.
The data architecture must support all UFC weight divisions.
The fighter archive must include every fighter in the source dataset.
Ranking membership must not limit archive access.
Rank zero represents the champion.
The initial interface uses English.
A later release can add languages and more divisions.

| ID  | Requirement                                                | Acceptance                                                              |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| B01 | Show the champion and 15 ranked fighters.                  | Each initial division contains 16 unique IDs and ranks zero through 15. |
| B02 | Select the active division champion on a fresh home visit. | A URL without a selection shows the champion.                           |
| B03 | Support wheel, drag, and click selection.                  | Each input selects the central row and its matching profile.            |
| B04 | Loop between the first and last rows.                      | Movement across either boundary keeps the sequence continuous.          |
| B05 | Show career record and profile facts.                      | Each shown fact has a defined source.                                   |
| B06 | Show up to three verified recent results.                  | Missing results do not create artificial rows.                          |
| B07 | Show all recorded fights for the selected fighter.         | The history count equals the exported row count.                        |
| B08 | Show an opponent preview.                                  | Hover or keyboard focus exposes the brief profile.                      |
| B09 | Open any recorded opponent's history.                      | Opponents outside the ranking also resolve by ID.                       |
| B10 | Preserve selection when returning home.                    | Return uses ranking membership in the active division.                  |
| B11 | Support direct links and refresh.                          | A history URL restores that fighter without prior navigation.           |
| B12 | Avoid an opponent navigation chain.                        | Opponent changes replace the current detail entry.                      |

## Category and selection rules

A fresh visit without a division uses Featherweight.
A fresh visit without a selected fighter uses that division's champion.
An explicit selected home URL preserves a valid selection.
A category change always selects the target division's champion.
Returning from history preserves a fighter ranked in the active division.
Otherwise, return selects the active division's champion.
Keep the active division during opponent navigation.

| ID  | Requirement                                         | Acceptance                                                              |
| --- | --------------------------------------------------- | ----------------------------------------------------------------------- |
| B13 | Select a division through the dropdown.             | Featherweight and Lightweight remain available.                         |
| B14 | Synchronize the selected division and fighter.      | Category changes show the target champion in rows, figure, and profile. |
| B15 | Preserve division through direct links and refresh. | The URL restores the active division and selected or detail fighter.    |

## Extensible coverage

| ID  | Requirement                                         | Acceptance                                                       |
| --- | --------------------------------------------------- | ---------------------------------------------------------------- |
| B16 | Support all weight divisions through configuration. | Another division uses the same contracts and components.         |
| B17 | Retain fighters outside every ranking.              | Export and direct detail access work without ranking membership. |
| B18 | Support ranking lists of different lengths.         | Domain contracts do not require exactly 16 entries.              |
| B19 | Support fighters without recorded bouts or images.  | Detail shows an empty history and the existing image fallback.   |

The first release exposes two divisions in the dropdown.
This interface scope does not limit the production data model.
Adding another division must not require a new animation implementation.
A fighter can appear in more than one ranking snapshot.
Do not store one permanent rank or division on the fighter profile.
Additional divisions enter the interface when their data and UI checks pass.
A global search interface remains outside the current design scope.

## Data meaning

A career record differs from the list of recorded fights.
The history list covers the local UFCStats dataset.
The interface must identify this coverage.
A missing image uses a headshot, then initials.
A missing fact shows an em dash.
Do not replace missing values with zero.

Rankings and UFCStats profiles use separate sources.
The importer must record source URLs and snapshot dates.
The importer must report field conflicts.
The website must not silently combine incompatible totals.

## Release boundaries

The first release has no login, payments, predictions, or user edits.
The first release does not need an online database.
The current task does not publish a website or register a domain.
Mobile composition needs user review before M4 acceptance.
Basic narrow-screen access remains a release requirement.

## Open product decisions

| Decision                        | Needed before | Interim rule                                 |
| ------------------------------- | ------------- | -------------------------------------------- |
| Mobile layout and touch preview | M4            | Preserve readable content and working links. |
| Public name and domain          | M5            | Use the internal name UFC Rankings.          |
| Update frequency                | M5            | Run exports manually.                        |
| Media publication rights        | M5            | Preserve sources and mark rights as unknown. |

Ask the user when these decisions become necessary.
Do not block independent foundation work.
