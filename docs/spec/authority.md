# 1. Authority and change rules

[Product Spec index](../product-spec.md) · Version 1.1 · Updated 2026-10-24.

The Product Spec index and its listed topic documents form the sole normative product specification in this repository.
It defines product behavior, interaction, design, motion, module boundaries, and acceptance rules.
“Must” identifies a required invariant. “Current baseline” identifies an implementation value that can change through an explicit spec revision.
A documented implementation is not evidence of user acceptance or deployment.

Use the index and the relevant owning topics when implementing or reviewing a feature. Do not assemble current rules from milestone-era documents.
The source code supplies implementation evidence. If code differs from this spec, record the discrepancy and resolve it explicitly; do not silently redefine the product.
A new user decision must be incorporated in its owning topic before the changed behavior is marked complete.

| Document class                                          | Responsibility                                                     | Authority boundary                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| This Product Spec                                       | Current product and engineering behavior                           | Sole product logic standard.                                            |
| [Development plan](../development-plan.md)              | Work sequence, milestone status, remaining gates                   | Does not redefine behavior.                                             |
| [Validation](../validation.md), reports, and evidence   | What was checked, when, on which environment, and with what result | Historical evidence, not new requirements.                              |
| [Decisions](../decisions.md)                            | Why an architectural choice was made                               | Rationale; current rule belongs in its owning topic.                    |
| Data, media, and deployment runbooks                    | Operator steps and environment details                             | Procedures must satisfy this spec.                                      |
| Archived requirement, UI, technical, and bout documents | Historical context and stable links from old reports               | Non-normative. Do not update them with new product rules.               |
| V6–V9 prototypes                                        | Visual history and references                                      | Do not use prototype scripts or sample data as production architecture. |

When moving documents, migrate local links and preserve historical acceptance identifiers. Keep evidence readable through the archive index.
Maintain each current rule in one owning topic instead of copying normative paragraphs into multiple documents.
Keep project documents in STE-flavored English: short sentences, active voice, and defined terms.
