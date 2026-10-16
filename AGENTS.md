# Project guide

## Purpose

Build a UFC rankings website from the approved V8 prototype.
Show all 11 captured weight divisions with 16 fighters each in the current interface.
Keep Featherweight as the default division.
Design data contracts and components for all UFC weight divisions.
Keep fighter identity and history independent from ranking membership.
Retain all fighters in the source dataset, including unranked fighters.
Select the champion on fresh visits and category changes.
Support every opponent that the local database contains.
Use English for the initial interface.

## Read order

1. Read [product requirements](docs/product-requirements.md).
2. Read [UI requirements](docs/ui-requirements.md).
3. Read [technical design](docs/technical-design.md).
4. Read [media acquisition](docs/media-acquisition.md) before media work.
   Read [ranked media expansion](docs/ranked-media-expansion.md) for current coverage.
5. Read [data operations](docs/data-operations.md) before export or collection.
6. Read [development plan](docs/development-plan.md).
7. Read [deployment guide](docs/deployment.md) before a release.
8. Read [validation](docs/validation.md) for completed checks.
9. Read [decision log](docs/decisions.md) before an architecture change.

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
Treat V8 as the current accepted visual reference.
Preserve V7 and V8 with their local dependencies.
Use V6 reports to understand the portrait flicker correction.
Do not treat prototype code as the application architecture.
Ask the user about unclear product or UI choices before implementation.
Resolve routine engineering choices through the technical design.
Record architecture changes in the decision log.

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
Define new terms in the technical design.
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

| Milestone | Scope                             | Status                       |
| --------- | --------------------------------- | ---------------------------- |
| M0        | Documents and runnable foundation | Implemented, checks recorded |
| M1        | Data export and media manifest    | Implemented, checks recorded |
| M2        | Rankings interface                | Implemented, checks recorded |
| M3        | History and navigation            | Implemented, checks recorded |
| M4        | Motion and visual parity          | Implemented, checks recorded |
| M5        | Release and hosting               | In progress; release pending |

Update this index when document paths change.
Update milestone status when its acceptance checks pass.
