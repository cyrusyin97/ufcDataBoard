# 12. Maintenance and expandability

[Product Spec index](../product-spec.md) · Version 1.3 · Updated 2026-10-24.

### 12.1 Required change workflow

1. Identify affected journey IDs, invariants, modules, and C-series tests in this spec.
2. Clarify unresolved product choices with the user. Resolve routine engineering through the existing boundaries.
3. Update this spec's current rule, version, and change record. Keep planned work clearly labeled in the development plan.
4. Record architectural rationale in the decision log. Avoid a second normative behavior description there.
5. Change the smallest owning module. Preserve schema compatibility or introduce explicit version handling.
6. Run checks that cover the changed behavior and its failure/return paths. Fix failures before declaring completion.
7. Record evidence and remaining gates. A successful build alone does not establish visual acceptance.
8. Promote only through the release procedure. Preserve rollback artifacts and previous descriptors.

### 12.2 Extension recipes

| Change                                 | Extend                                                                                   | Preserve / validate                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Add a division or alter list length    | Registry/configuration, snapshot mapping, export, reviewed media                         | No component fork or fixed 16-entry assumption; champion, ties, source order, menu, loops, direct links.    |
| Add a fighter or opponent              | Archive export and stable ID mapping                                                     | Independent ranking membership; empty history, unranked return, missing facts/media.                        |
| Add profile fields                     | Domain schemas, exporter provenance, profile formatting                                  | Nullable values, source dates, no inferred career facts, old-release compatibility.                         |
| Add a bout statistic or period type    | Python extraction/duration parser, schemas, contracts, stores, UI                        | Both perspectives, supported durations, explicit unavailable state, shared fixture parity.                  |
| Change weights or reference policy     | This spec, policy/formula versions, Python references, pure scorer, schemas and fixtures | Rebuild immutable artifacts; no future leakage or silent reinterpretation; compare old/new data behavior.   |
| Add a view or entry point              | Route union/parser/controller, reducer, UI control, motion boundary                      | Owned parents, direct entry, refresh, Back/Forward, modified clicks, cancellation, safe return from errors. |
| Add interaction to an existing card    | Owning component and this spec                                                           | Keyboard/touch access, stable layout, single property owner, current route/scroll rules.                    |
| Change motion or layout                | Motion owner, component tokens/classes, shared glyph endpoints                           | Final-node identity, clipping, resize, reduced motion, document/list scroll, representative viewports.      |
| Add language support                   | Locale/string structure, formatters, accessible names                                    | Stable IDs, longer labels and word wrapping, URLs, numeric/date meaning, transition measurements.           |
| Add live updates or online persistence | New explicitly reviewed architecture and product scope                                   | Do not embed scraping in components or replace the immutable snapshot model implicitly.                     |

### 12.3 Version and compatibility discipline

Use manifest capability checks to gate optional features. A new release must define behavior for older compatible artifacts.
Change schema/formula/policy versions when meaning or required fields change; update both export and runtime validation.
Do not use display text, rank position, or current division to repair a missing identity.
Bound caches and lazy-load growing datasets. Review server trace size and initial payload when adding public data.
Keep shared fixtures for Python and TypeScript score semantics.
Keep animation cleanup idempotent and generation checks intact during refactors.
Do not remove the viewport height floor at animation completion without an equivalent tested scroll-preservation method.
Do not copy old milestone prose back into the current spec without checking code and newer user decisions.
