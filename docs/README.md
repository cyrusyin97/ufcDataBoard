# Documentation map

Updated: 2026-11-12.

Start with [Product Spec](product-spec.md). The index and its topic documents form one standard, not separate competing specifications.

| Purpose                     | Document                                                                  | Maintenance rule                                                      |
| --------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Product behavior            | [Product Spec index](product-spec.md) and `spec/`                         | Change the owning topic and shared changelog.                         |
| Contributor workflow        | [AGENTS](../AGENTS.md)                                                    | Keep commands and read order aligned with the spec.                   |
| Delivery                    | [Development plan](development-plan.md)                                   | Track status and remaining gates; link to rules and evidence.         |
| Validation                  | [Validation log](validation.md), milestone reports, [receipts](evidence/) | Preserve dates, environments, failures, and limitations.              |
| Architecture rationale      | [Decisions](decisions.md)                                                 | Record why a decision was made; current behavior belongs in the spec. |
| Export and restoration      | [Data operations](data-operations.md)                                     | Maintain repeatable operator commands.                                |
| Media collection and review | [Media acquisition](media-acquisition.md)                                 | Maintain source handling, review, and failure procedures.             |
| Hosting                     | [Deployment](deployment.md)                                               | Maintain release commands and environment inputs.                     |
| Scripts                     | [Script guide](../scripts/README.md)                                      | Identify commands and link to their runbooks.                         |
| Legal notices               | [Font notices](../public/fonts/README.md)                                 | Keep asset attribution and licenses.                                  |
| Earlier specifications      | [Archive index](archive/README.md)                                        | Historical reference only; no new product rules.                      |
| Cleanup review              | [Documentation audit](documentation-audit.md)                             | Record disposition and deletion conditions; no behavior rules.        |

## Evidence directory

- [M1 data](m1-report.md), [M2 rankings](m2-report.md), [M3 history](m3-report.md), [M4 motion](m4-report.md), [M5 release preparation](m5-report.md).
- [Media expansion](ranked-media-expansion.md), [selector correction](selector-correction.md), [all-division expansion](all-divisions-report.md).
- [M7 measurement implementation](m7-report.md): implementation evidence and remaining overhead gates.
- [Deployed interaction audit, 2026-10-26](performance-audit-2026-10-26.md): pending-state observations, code causes, optimization priorities, and measurement limits.
- [M6 source/contract audit](m6-contract-design.md), [M6 data](m6-data-report.md), [M6 interface and review revisions](m6-interface-report.md).

These reports retain old counts and stages intentionally. Their dated statements are not today's backlog.
Preserved V6–V9 prototype documents and local research reports stay with their artifacts in `outputs/`; they are not runtime specifications.

The [local measurement runbook](performance-measurement-runbook.md) explains M7 capture, export, and controlled overhead checks.

## Change workflow

Update one owning spec topic, select its journey and critical-case coverage, then update delivery status and append actual validation evidence.
Do not copy the specification into the plan or report. Do not delete evidence just because a later check has a larger pass count.

[M8 interaction performance report](m8-report.md) records the 2026-11-02 before/after comparison. It is evidence, not a competing product standard or deployed acceptance.

[Collector migration](collector-migration.md) records source provenance, local commands, the manual Actions workflow, cutover gates, and the active weekly publication workflow.

[Collector candidate validation](collector-validation.md) records the first isolated live update, pairing correction, package/restore checks, and remaining release gates.
