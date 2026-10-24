# Project guide

## Purpose

Build and maintain the UFC rankings website defined by [Product Spec](docs/product-spec.md).
The Product Spec index and its topic documents form the sole product logic standard. It covers current journeys, design, motion, data meaning, architecture, and critical tests.
The user accepted M6 for submission on 2026-10-24. M5 hosting release remains pending. The default dataset now includes accepted M6 analysis.

## Read order

1. Read [Product Spec](docs/product-spec.md). Start all product and UI work here.
2. Read [development plan](docs/development-plan.md) for current work and acceptance gates.
3. Read [validation](docs/validation.md) and the relevant milestone report for existing evidence.
4. Read [data operations](docs/data-operations.md) before export or collection.
5. Read [media acquisition](docs/media-acquisition.md) and [ranked media expansion](docs/ranked-media-expansion.md) before media work.
6. Read [deployment guide](docs/deployment.md) before a release.
7. Read [decision log](docs/decisions.md) before an architecture change.
8. Use [the document map](docs/README.md) to distinguish procedures, evidence, and superseded references.

Do not use archived specifications as competing product standards. Update the owning topic in `docs/spec/` and its changelog.

## Stack

Use Next.js App Router, React, and TypeScript.
Use Tailwind CSS for styles.
Use GSAP for coordinated motion.
Use Python to export public JSON from local SQLite.
Deploy the initial website on Vercel.
Use Node.js 24 for CI and hosting.
The lockfile defines exact package versions.

## Working rules

Preserve `outputs/designs/ufc-rankings/index-v6.html` and its dependencies.
Treat V8 as the accepted reference for existing rankings, history, and profile cards.
Use the latest V9 bout panel and interaction revisions for M6.
Preserve V9 and its local dependencies.
Preserve V7 and V8 with their local dependencies.
Use V6 reports to understand the portrait flicker correction.
Do not treat prototype code as the application architecture.
Ask the user about unclear product or UI choices before implementation.
Resolve routine engineering choices through Product Spec.
Update Product Spec when approved behavior changes. Record architecture rationale in the decision log.

Do not change the source database during a web task.
Do not put the database or credentials in `public/`.
Do not call source websites from browser components.
Use stable UFCStats IDs for fighter identity.
Resolve division keys through a configurable registry.
Do not hardcode two divisions or 16 entries in production domain contracts.
Keep absent data as `null`.
Do not classify social metadata images as full-body portraits.
Require identity and anatomical role checks before publishing media.
Never infer career totals from recorded bouts.

Keep one owner for each animated property.
Cancel obsolete requests and animations.
Preserve the final text elements throughout a transition.
Keep the portrait container visible after transition cleanup.

Write project documents in STE-flavored English.
Use short sentences and active voice.
Define new terms in the Product Spec scope and glossary.
This style does not claim certified ASD-STE100 compliance.

## Commands

- Install dependencies: `npm ci`.
- Start development: `npm run dev`.
- Check code and production build: `npm run check`.
- Check browser behavior: `npm run test:e2e`.
- Check document format: `npm run format:check`.

Run checks that match the change.
Report failed or unavailable checks explicitly.
Do not describe a planned feature as complete.

## Roadmap

| Milestone | Scope                             | Status                          |
| --------- | --------------------------------- | ------------------------------- |
| M0        | Documents and runnable foundation | Implemented, checks recorded    |
| M1        | Data export and media manifest    | Implemented, checks recorded    |
| M2        | Rankings interface                | Implemented, checks recorded    |
| M3        | History and navigation            | Implemented, checks recorded    |
| M4        | Motion and visual parity          | Implemented, checks recorded    |
| M5        | Release and hosting               | In progress; release pending    |
| M6        | Bout analysis and weighted radar  | Accepted; release handled in M5 |

Update this index when document paths change.
Update milestone status when its acceptance checks pass.
