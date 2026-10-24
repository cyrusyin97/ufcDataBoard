# Product Spec — UFC Rankings

Version: 1.1. Updated: 2026-10-24.

This index and the topic documents below form the sole current product logic standard.
Each topic has one owning document. Update that document instead of copying its rules into plans, reports, or runbooks.
The split changes document organization only. It does not change product behavior or acceptance status.

## Specification index

| Section | Owning document                                                               |
| ------- | ----------------------------------------------------------------------------- |
| 1       | [Authority and change rules](spec/authority.md)                               |
| 2       | [Product scope and invariants](spec/scope.md)                                 |
| 3       | [User journeys](spec/user-journeys.md)                                        |
| 4       | [Routes, state, and recovery](spec/navigation.md)                             |
| 5       | [Design protocol](spec/design-protocol.md)                                    |
| 6       | [Animation and scroll specification](spec/animation.md)                       |
| 7       | [Data semantics and scoring](spec/data-and-scoring.md)                        |
| 8       | [Components and module ownership](spec/components.md)                         |
| 9       | [Code and file structure](spec/code-structure.md)                             |
| 10      | [Data operations, security, and delivery](spec/operations-and-performance.md) |
| 11      | [Critical test cases](spec/critical-tests.md)                                 |
| 12      | [Maintenance and expandability](spec/maintenance.md)                          |
| 13      | [Acceptance, evidence, and current limits](spec/acceptance.md)                |
| 14      | [Spec revision record](spec/changelog.md)                                     |

## How to use this specification

1. Read authority and scope first.
2. Find the affected journey, then its design, navigation, motion, data, and module rules.
3. Use C01–C20 to select regression checks. Follow the maintenance procedure for a change.
4. Update the affected topic and the shared changelog. Keep current delivery status in the development plan and check results in validation.

J01–J17 and C01–C20 remain unchanged. Topic section numbers remain stable after the split.
M6 integrated user acceptance and M5 release remain pending.

## Supporting documents

- [Documentation map](README.md): procedures, reports, and archived references.
- [Development plan](development-plan.md): delivery status and remaining gates.
- [Validation log](validation.md): dated check evidence.
- [Documentation audit](documentation-audit.md): redundant, outdated, and retained material.
- [Archived specifications](archive/README.md): historical B/U/BA definitions and earlier design context.
