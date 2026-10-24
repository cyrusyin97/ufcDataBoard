# Product requirements — superseded reference

> Superseded on 2026-10-24 by [Product Spec](../product-spec.md), the sole current product logic standard.
> The body below is retained as historical context for existing report links. Its status statements and instructions are not current requirements. Do not add new product rules here.

Status: V8 is the accepted existing interface. V9 bout analysis is implemented for integrated review.
Engineering targets remain subject to measurement.
Updated: 2026-10-24.
Read [user journeys](../spec/user-journeys.md) for the current end-to-end interaction catalog.

## Scope

The website helps users explore UFC fighters and their recorded fights.
The current interface must support all 11 captured weight divisions.
Each current division contains a champion and 15 challengers.
Keep source ties and source list order.
Do not infer a rank from list position.
The data architecture must support all UFC weight divisions.
The fighter archive must include every fighter in the source dataset.
Ranking membership must not limit archive access.
Rank zero represents the champion.
The initial interface uses English.
A later release can add languages and new ranking snapshots.

| ID  | Requirement                                                | Acceptance                                                         |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| B01 | Show the champion and 15 ranked fighters.                  | Each current division contains 16 unique IDs and its source ranks. |
| B02 | Select the active division champion on a fresh home visit. | A URL without a selection shows the champion.                      |
| B03 | Support wheel, drag, and click selection.                  | Each input selects the central row and its matching profile.       |
| B04 | Loop between the first and last rows.                      | Movement across either boundary keeps the sequence continuous.     |
| B05 | Show career record and profile facts.                      | Each shown fact has a defined source.                              |
| B06 | Show up to three verified recent results.                  | Missing results do not create artificial rows.                     |
| B07 | Show all recorded fights for the selected fighter.         | The history count equals the exported row count.                   |
| B08 | Show an opponent preview.                                  | Hover or keyboard focus exposes the brief profile.                 |
| B09 | Open any recorded opponent's history.                      | Opponents outside the ranking also resolve by ID.                  |
| B10 | Preserve selection when returning home.                    | Return uses ranking membership in the active division.             |
| B11 | Support direct links and refresh.                          | A history URL restores that fighter without prior navigation.      |
| B12 | Avoid an opponent navigation chain.                        | Opponent changes replace the current detail entry.                 |

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
| B13 | Select a division through the dropdown.             | All published registry divisions remain available.                      |
| B14 | Synchronize the selected division and fighter.      | Category changes show the target champion in rows, figure, and profile. |
| B15 | Preserve division through direct links and refresh. | The URL restores the active division and selected or detail fighter.    |

## Extensible coverage

| ID  | Requirement                                         | Acceptance                                                       |
| --- | --------------------------------------------------- | ---------------------------------------------------------------- |
| B16 | Support all weight divisions through configuration. | Another division uses the same contracts and components.         |
| B17 | Retain fighters outside every ranking.              | Export and direct detail access work without ranking membership. |
| B18 | Support ranking lists of different lengths.         | Domain contracts do not require exactly 16 entries.              |
| B19 | Support fighters without recorded bouts or images.  | Detail shows an empty history and the existing image fallback.   |

The current interface exposes eight men's divisions and three women's divisions.
The user authorized this scope expansion on 2026-10-16.
Use the captured ranking dates. This task does not refresh official rankings.
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
The user approved the existing mobile composition on 2026-10-15.
V9 mobile behavior has a separate M6 acceptance gate.
Basic narrow-screen access remains a release requirement.

## Open product decisions

| Decision                 | Needed before | Interim rule                                 |
| ------------------------ | ------------- | -------------------------------------------- |
| Public name and domain   | M5            | Use the internal name UFC Rankings.          |
| Update frequency         | M5            | Run exports manually.                        |
| Media publication rights | M5            | Preserve sources and mark rights as unknown. |

The cohort policy was confirmed on 2026-10-23: preceding five years, same division, at least 50 complete bouts, and a short-sample notice below 60 seconds.
Read [bout analysis](bout-analysis.md) for the complete rules.

Ask the user when the remaining decisions become necessary.
Do not block independent foundation work.

## V9 bout analysis extension

Status: M6.1–M6.3 implemented and checked. Integrated user acceptance remains pending.
Read [the bout analysis specification](bout-analysis.md) for formulas, data meaning, and acceptance checks.

| ID  | Requirement                                                | Acceptance                                                                                      |
| --- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| B20 | Open available bout analysis from fighter history.         | Both fighters and all available periods resolve by stable IDs; missing statistics are explicit. |
| B21 | Compare weighted five-axis scores.                         | Formula v1.1, reference provenance, and raw contributions are inspectable.                      |
| B22 | Return from bout detail to the selected fighter's history. | Profile entry, direct links, reload, and browser navigation preserve context.                   |
| B23 | Preserve the existing cards.                               | V8 history and profile UI remain in use with the new navigation.                                |
| B24 | Expose analysis without requiring radar activation.        | Radar geometry is hover-only; disclosure and text provide keyboard and touch access.            |

The prototype's single bout and two fighters are sample coverage only.
Do not present V9 as a shipped production feature or as a replacement ranking design.

## Integrated review revisions

The current M6 candidate includes the following requested behaviors.
Use [J08 through J13](../spec/user-journeys.md#j08--open-bout-analysis-from-history) for their entry and return paths.

| ID  | Requirement                                              | Acceptance                                                                                               |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| B25 | Open bout analysis from result badges and recent form.   | Each entry opens the matching bout; an entry from rankings has a fighter-history parent.                 |
| B26 | Use symmetric history and bout transitions.              | The same-font event title and live portrait move in both directions without a cleanup jump.              |
| B27 | Keep the bout return control reachable during scrolling. | The return bar is independent from the content scroll region.                                            |
| B28 | Keep the current viewport on bout return.                | The page position stays stable through commit and cleanup; history-list position restores independently. |
| B29 | Make hover values readable.                              | The fighter and score precede separate component rows; complete values remain in the disclosure.         |

These revisions have recorded local checks. They do not close M6 user acceptance or M5 release gates.
