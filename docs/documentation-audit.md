# Documentation audit and disposition

Date: 2026-10-24. Scope: Documentation organization only.
No runtime behavior, source database, release pointer, or acceptance decision changed.

## Scope and conclusion

The review covers the maintained Markdown files in the repository root, `docs/`, `scripts/`, and `public/fonts/`.
It also inventories the 14 local Markdown research/prototype documents under `outputs/` and their role in the maintained documentation.
Generated dependencies, build outputs, browser traces, and private work directories are not current documentation sources.
JSON receipts remain evidence; this review does not rerun or recertify their checks.
External URLs were not revalidated against live sites.

The main redundancy was a complete current specification plus five earlier behavior documents.
The development plan repeated completed implementation checklists. Reports and the validation log repeated pass counts with different dates and scopes.
Some early-stage statements appeared current because their files lacked a prominent historical boundary.

The Product Spec is now an index with 14 owning topic documents. This is one specification split by responsibility.
The old journey file was removed after its J01–J17 content and local links were preserved in the new owner.
Four earlier standards were moved to `archive/`. Their historical identifiers and architecture context remain available.

## File-by-file disposition

Paths in this table are relative to the repository root. An old path is shown when describing a removed or moved file.

| File or exact group              | Finding                                                                                                                       | Disposition                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `docs/product-spec.md`           | The 862-line document was difficult to maintain as one file.                                                                  | Keep as a short index; move sections 1–14 into `docs/spec/`.                                                                    |
| `docs/user-journeys.md`          | J01–J17 duplicate the consolidated spec; the remaining input/coverage checklist is covered by design and tests.               | Remove the duplicate file. Keep `docs/spec/user-journeys.md`; migrate links.                                                    |
| `docs/product-requirements.md`   | Repeats scope and flows; retains B01–B29 used by historical reports.                                                          | Move to `docs/archive/product-requirements.md`. Do not use for current rules.                                                   |
| `docs/ui-requirements.md`        | Repeats design and animation; retains U01–U18 acceptance definitions.                                                         | Move to `docs/archive/ui-requirements.md`.                                                                                      |
| `docs/technical-design.md`       | Mixes initial plans with 26 later sections; includes a two-division CategoryDropdown description beside all-division rules.   | Move to `docs/archive/technical-design.md`; use the topic owners for current architecture.                                      |
| `docs/bout-analysis.md`          | Repeats V9 interaction and formula rules; retains BA01–BA12 used by earlier checks.                                           | Move to `docs/archive/bout-analysis.md`.                                                                                        |
| `docs/development-plan.md`       | Completed M0–M4 and M6.1–M6.3 checklists repeat spec and reports; early two-division instructions look active.                | Replace completed checklists with status, report links, and current spec references. Retain remaining M5/M6 gates.              |
| `docs/README.md`                 | Previously cataloged five competing-looking references beside one long spec.                                                  | Keep as a map of document roles, not a second product index.                                                                    |
| `README.md`                      | Onboarding and milestone summaries overlap reports, but startup and artifact instructions are useful.                         | Keep concise onboarding and current links. Further milestone prose can be removed when onboarding is revised.                   |
| `AGENTS.md`                      | Short guardrails intentionally repeat critical spec constraints. Its glossary instruction still pointed to technical design.  | Keep operational guardrails; update glossary and topic ownership references.                                                    |
| `scripts/README.md`              | Still described the M0 fixture and linked the old technical design.                                                           | Remove that obsolete baseline; link current data semantics and operator commands.                                               |
| `public/fonts/README.md`         | Legal attribution and asset-to-font mapping, not product duplication.                                                         | Retain with the OFL notices. Do not delete as cleanup.                                                                          |
| `docs/data-operations.md`        | Overlaps architecture at a high level but contains unique export, isolated-preview, pack, restore, and verification commands. | Retain as the export runbook. Link rather than copy product rules in future edits.                                              |
| `docs/media-acquisition.md`      | Mixes initial four-athlete investigation and current collection procedure. Old pending role checks can look current.          | Retain unique acquisition and failure procedure; label investigation date and link current coverage.                            |
| `docs/deployment.md`             | Unique hosting inputs, commands, rights gates, CI skips, and rollback steps.                                                  | Retain. No deployment is implied by documentation restructuring.                                                                |
| `docs/decisions.md`              | Earlier decisions contain superseded scope and future tense; later entries explain replacements.                              | Retain chronology. Add the indexing decision rather than rewriting earlier rationale as current rules.                          |
| `docs/validation.md`             | Title said M0 although it contains M0–M6. Summaries repeat detailed reports.                                                  | Rename the heading to Validation log; keep dated receipts and limits. Future entries should be brief and link detailed reports. |
| `docs/m1-report.md`              | Initial 32-fighter media coverage and planned later milestones are historical.                                                | Retain source counts, integrity checks, dataset identity, and explicit historical label.                                        |
| `docs/m2-report.md`              | Native select and two divisions were replaced later.                                                                          | Retain the original measured baseline; label historical. Current menu rules are in design protocol.                             |
| `docs/m3-report.md`              | Two divisions and motion still planned describe the M3 stage.                                                                 | Retain archive/navigation evidence; label historical.                                                                           |
| `docs/m4-report.md`              | Contains unique user acceptance, geometry, frame limitations, and Firefox traversal findings.                                 | Retain. A newer bout test result does not automatically close its differently scoped release caveats.                           |
| `docs/m5-report.md`              | Earlier artifact sizes, rights counts, audit results, and CI scope are dated.                                                 | Retain release-preparation evidence; use the plan/runbook for today's gates.                                                    |
| `docs/ranked-media-expansion.md` | Initial two-division UI and 160 headshots precede subsequent corrections.                                                     | Retain source review, hashes, delivery counts, and later-correction links; label historical.                                    |
| `docs/selector-correction.md`    | Initial 32-headshot UI coverage is no longer the whole interface.                                                             | Retain crop, role, resolution, and review evidence; label historical.                                                           |
| `docs/all-divisions-report.md`   | Some behavior repeats the spec, but ties, source snapshot checks, and 176-fighter evidence are unique.                        | Retain as coverage evidence.                                                                                                    |
| `docs/m6-contract-design.md`     | Old fixture plan and preparatory wording repeat rules now implemented.                                                        | Retain the read-only audit, missing-data counts, and original BA plan; label historical.                                        |
| `docs/m6-data-report.md`         | Says M6.3 remains pending at its recorded stage.                                                                              | Retain export hashes, counts, rejected restore, successful rerun, and cohort evidence; label historical.                        |
| `docs/m6-interface-report.md`    | Four revisions have different preview directories and pass counts.                                                            | Retain the sequence and scopes. Do not combine them into a fictitious single test run.                                          |

## Local artifacts and evidence

| Material                                                                    | Finding                                                                                                                   | Deletion guidance                                                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `docs/evidence/` JSON receipts, captures, and referenced measurements       | Establish provenance and actual check scope. Some image/trace artifacts are local-only.                                   | Keep referenced evidence. Remove a receipt only through an explicit retention decision with report links migrated. |
| `outputs/designs/ufc-rankings/README-v6.md` through `README-v9.md`          | Accepted references and motion repair history; some prose is intentionally older than production.                         | Preserve with their HTML and dependencies as required by AGENTS.                                                   |
| Design README plus `README-v2.md` through `README-v5.md` in the same folder | Earlier experiments, not current rules; useful for tracing the V6 repair.                                                 | Optional archival candidates, not deleted in this pass. Check shared assets before removing any prototype bundle.  |
| `outputs/ufc-rankings/README.md`                                            | The v1 README matches the design folder's v1 README. A duplicate README alone does not prove duplicate or unused bundles. | Can remove only with retirement of that older entry point; leave intact for this documentation-only pass.          |
| `outputs/GLORY网站技术分析.md`                                              | External-site technology research, not the chosen application stack contract.                                             | Optional local research archive; no need in the current spec.                                                      |
| `outputs/UFC人像图片分析.md`                                                | Early source observations later refined by media investigation and role checks.                                           | Optional research archive; do not use its observations to approve current media.                                   |
| `outputs/UFC数据库初检与接入建议.md`                                        | Counts precede the source refresh.                                                                                        | Retain as a dated source baseline, not current dataset coverage.                                                   |
| `outputs/UFC数据库更新报告.md`                                              | Records a separate database update and recovery evidence, with private machine context.                                   | Keep local and outside public assets; do not delete as product-doc duplication.                                    |

## What can be deleted, and what must be preserved first

1. **Direct duplicate:** the old journey file is removed; the topic document preserves all journey IDs and behavior.
2. **Repeated completed work:** long completed-stage plan checklists are removed; spec topics and dated reports retain behavior and evidence.
3. **Obsolete current instructions:** the M0 fixture description and old glossary/contract entry points are corrected.
4. **Archived standards:** their product prose no longer needs maintenance. Full deletion should first preserve B/U/BA definitions in an acceptance-ID ledger and migrate historical citations. This pass retains them in the archive to avoid erasing that context.
5. **Evidence, licenses, and accepted prototypes:** do not delete merely because their numbers or technology descriptions are old. Age is not redundancy when a file records a dated event.

The resulting structure separates current rules, remaining work, operator procedures, and historical evidence.
For future changes, edit one spec topic and append a short evidence entry. Do not create another versioned product standard beside the indexed topics.
