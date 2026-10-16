# Decision log

## D01: Keep the agreed stack

Date: 2026-10-13.
Use Next.js, TypeScript, Tailwind CSS, and GSAP.
The prior database report records this recommendation.
Use the npm lockfile for repeatable installs.
Use Node.js 24 as the target runtime.

## D02: Keep SQLite offline

Python will read the source database in read-only mode.
The website will read checked JSON exports.
This avoids a database service for the first release.
Reconsider PostgreSQL when users need writes or dynamic queries.

## D03: Preserve V6 behavior

Keep the approved reference files unchanged.
M0 contains a runnable foundation, not a finished interface migration.
Implement the interface through M2, M3, and M4.

## D04: Use one experience route

Use `/rankings` for the persistent interactive experience.
Use query parameters for selection and history state.
This keeps the same client boundary during transitions.
It also supports direct links without a hash router.
M0 contains only the foundation page.
M3 will implement the navigation controller.

## D05: Use GSAP as the motion owner

V6 uses the Web Animations API for opponent transitions.
V7 and V8 also use GSAP for category drawers.
The application will use GSAP timelines for coordinated transitions.
Keep the prototype's final-element technique and cancellation rules.
Do not let CSS and GSAP animate the same property simultaneously.

## D06: Use English project documents

The user requested STE-flavored documents.
Use short English sentences and a shared glossary.
Use Chinese for conversational progress reports.
The documents do not claim certified ASD-STE100 compliance.

## D07: Use webpack for the initial build

Turbopack could not bind its worker port in this local environment.
Use the supported webpack builder for development and production checks.
This choice does not change the framework or runtime design.
Recheck Turbopack when the execution environment changes.

## D08: Add category drawers in V7

Date: 2026-10-14.
The user requested Lightweight and a category dropdown.
The user selected Champion as the default for each division.
The user requested a right drawer for the profile.
Preserve V6 and create V7 for review.
Use GSAP for category drawers.
Preserve existing opponent transitions in this focused prototype update.
The full application migration remains planned.

## D09: Use V8 as the current design reference

Date: 2026-10-14.
The user accepted the latest prototype and requested document alignment.
Use V8 as the current design reference.
Preserve V6 and V7 for comparison and repair history.
Keep the Next.js migration milestones planned until their acceptance checks pass.

## D10: Store division context in production URLs

Date: 2026-10-14.
Use an explicit division query parameter on the persistent rankings route.
Default missing division to Featherweight.
Default missing home selection to that division's champion.
Preserve division context during opponent navigation and return.
The prototype hash paths remain reference behavior rather than production routes.

## D11: Preserve all divisions and unranked fighters

Date: 2026-10-14.
The user requires an extensible data architecture beyond the initial two divisions.
Use a configurable division registry and variable ranking lengths.
Export every fighter in the source dataset independently from ranking membership.
Use shared components and lazy fighter bundles.
Keep Featherweight and Lightweight as the first interface scope.
The M0 fixture must not constrain the production contracts.

## D12: Separate media discovery, identity, and role approval

Date: 2026-10-14.
Use public athlete HTML and sitemap discovery as primary sources.
Treat JSON:API as optional exact-file metadata.
Decode downloaded bytes before choosing a local extension.
Require visual approval for full-body roles.
Do not promote an og:image headshot to full-body media.
Use representation-specific validators and immutable generated variants.
Follow the current robots policy in the production collector.
Use Pillow as a pinned media processing dependency during M1.
See [the media acquisition design](media-acquisition.md).

## D13: Keep data and media in one release

Date: 2026-10-14.
M1 stores generated media inside the versioned data directory.
One artifact contains its fighter bundles, registry, media, and checksums.
The current pointer changes only after runtime checks pass.
Use a publication lock and immutable version paths.
Retain prior hash-approved media during candidate review.
This replaces the earlier separate media path example.

## D14: Keep direct archive loading in the browser

Date: 2026-10-14.
A direct history URL first renders a loading shell.
The browser checks the pinned archive index before requesting an unranked bundle.
The shared store validates identity, version, and fighter perspective.
Archive media loads from the same release.
This keeps all 4581 archive bundles out of the page server function.
The server trace retains the published ranked bundles only.
This choice preserves lazy access for every source fighter.
It does not reduce archive coverage or change the URL contract.

## D15: Coordinate motion around one route commit

Date: 2026-10-15.
Use one motion controller for preparation, departure, arrival, and cleanup.
Keep route and fighter state in the experience reducer.
Commit the prepared target synchronously before measuring its final text.
Animate the final live text spans from measured preview positions.
Keep dial placement and drawer movement on separate wrappers.
This gives each animated property one owner.
It preserves the V6 portrait cleanup correction and prevents stale motion after navigation.

## D16: Restore a pinned artifact before the hosting build

Date: 2026-10-15.
Use a version and archive checksum in `data/release.json`.
Supply the artifact URL through the hosting and CI environments.
Restore into private staging and validate before replacing the current pointer.
Do not depend on an operator's ignored public directory.
Keep publication readiness separate from data integrity.
Block the Vercel release build while media publication rights remain unknown.
Keep the runtime dataset and source database unchanged during release preparation.

## D17: Use reviewed headshots for ranking rows

Date: 2026-10-15.
The user requested consistent headshots in both published ranking lists.
Select the largest reviewed headshot variant for each row.
Keep the source composition and use centered cover framing inside the row image box.
Use initials when that role is absent.
Keep hero image roles independent from row thumbnails.
Add a native 520 by 325 headshot bound without changing body image recipes.
Keep the accepted V8 custom division menu in the application.

## D18: Promote reviewed weight classes to the UI registry

Date: 2026-10-16.
Use the existing reviewed 176-fighter collection for all 11 captured weight classes.
Read explicit champion and challenger ranks from the hash-checked saved ranking HTML.
Preserve the two original snapshots and their dates.
Preserve ties in Women's Flyweight instead of replacing them with position numbers.
Keep Featherweight as the default, independent from menu order.
Use one scrolling division menu and the existing shared components.
This scope change does not refresh source sites or change the database.
