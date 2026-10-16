# Development plan

## Delivery rule

Complete each gate before starting dependent work.
Keep evidence with the milestone report.
A working build does not prove visual parity.
A visual recording does not prove data accuracy.

## M0: Foundation

Status: Implemented. Check results appear in [validation](validation.md).
Dependencies: The accepted V6 prototype and stack recommendation.

Deliverables:

- Root AGENTS.md and linked requirements.
- Technical design, development plan, and deployment guide.
- Next.js, TypeScript, Tailwind, and GSAP dependencies.
- A runnable foundation page with the 16-fighter snapshot.
- Domain schemas, return-selection rules, and motion tokens.
- Unit tests, a browser smoke test, and CI configuration.

Validation path:

1. Install dependencies from the lockfile.
2. Run lint, type checks, unit tests, and production build.
3. Open the foundation page through a production server.
4. Check the roster count and snapshot label.
5. Check document links and STE-flavored prose.

Exit gate: All available foundation checks pass with limitations recorded.
This milestone does not migrate the interactive interface.

## M1: Data and media pipeline

Status: Implemented. Acceptance checks appear in [the M1 report](m1-report.md).

Work:

1. Inspect the current SQLite schema in read-only mode.
2. Implement explicit field normalization and source precedence.
3. Export all source fighter bundles and configurable division manifests.
4. Implement the [media acquisition design](media-acquisition.md).
5. Generate reviewed media variants and record their provenance.
6. Add schema, count, uniqueness, and reference checks.

Deliverables: Python exporter, JSON schemas, media manifest, dataset report, and repeatable commands.

Validation path:

- Compare exported fighter counts with the source transaction.
- Check every fight row against its fighter perspective.
- Check all opponent IDs and ranking mappings.
- Check 16 unique ranking entries in each initial division.
- Check a third division fixture without changing the domain schema.
- Check a ranking fixture with a different list length.
- Check an unranked fighter without bouts or media.
- Compare the complete archive index with all source fighter IDs.
- Check separate source dates and field conflicts for both divisions.
- Test missing values and conflicting source observations.
- Correct the V7 Lightweight headshots labeled as full-body images.
- Check actual encoding, role approval, conditional requests, and resume behavior.
- Check sitemap discovery without restricted directory query crawling.
- Force an export failure and check that the previous dataset remains intact.
- Check that public files contain no database, credentials, or machine paths.

Exit gate: One complete dataset passes every integrity check.
Coverage: B01, B05, B06, B07, B09, and B16 through B19.

## M2: Rankings interface

Status: Implemented. Acceptance checks appear in [the M2 report](m2-report.md).
Depends on M1.

Work:

1. Convert V8 tokens and layout into Tailwind components.
2. Implement the circular selector with looping.
3. Generate the category dropdown from the division registry.
4. Apply the champion default from the active snapshot.
5. Connect the selected figure and profile.
6. Add keyboard controls and URL selection.
7. Load only necessary images and data.

Deliverables: CategoryDropdown, CategoryHeading, RankingDial, FighterFigure, FighterProfile, and desktop comparison captures.

Validation path:

- Select every fighter in both divisions by click.
- Check fresh visits and category changes against the champion rule.
- Check explicit selection and active division in the URL.
- Move through both wrap boundaries with wheel and drag.
- Check loop boundaries with different ranking lengths.
- Check another configured division with the same components.
- Check selection with keyboard input.
- Refresh a selected home URL.
- Compare the 1318 × 808 layout with V8.

Exit gate: B01 through B06, B13 through B15, and U01 pass.

## M3: History and navigation

Status: Implemented. Acceptance checks appear in [the M3 report](m3-report.md).
Depends on M2.

Work:

1. Add the full recorded history card.
2. Add the opponent preview and accessible links.
3. Implement the persistent route controller.
4. Add request cancellation, caching, and errors.
5. Implement return-selection behavior.

Deliverables: History and preview components, route controller, and navigation test report.

Validation path:

- Navigate to ranked and unranked opponents.
- Open an unranked fighter directly without a previous home visit.
- Open a fighter outside both initial rankings.
- Open a fighter with zero recorded bouts.
- Return through the button, Escape, and browser Back.
- Refresh a direct detail URL in each division and navigate again.
- Return from a fighter outside the active ranking to its champion.
- Check browser Forward without adding a navigation chain.
- Interrupt a pending request with a newer request or return action.
- Test unknown IDs, failed fetches, and missing images.
- Check that all recorded rows remain accessible through internal scrolling.

Exit gate: B07 through B12 and U02, U05, U06, U09, U10 pass.

## M4: Motion and visual parity

Status: Implemented. The agreed desktop checks pass. The user approved the mobile composition on 2026-10-15.
M4 acceptance is complete. The report retains browser and performance checks for M5.
Read [the M4 report](m4-report.md) for checks and remaining limits.
User input: Mobile composition approved on 2026-10-15.

Work:

1. Implement selector collapse and figure relocation.
2. Implement the category heading, row, and profile drawers.
3. Implement preview-to-profile text transforms.
4. Add independent image fades.
5. Add reduced-motion and resize handling.
6. Measure rendering and loading costs.

Deliverables: GSAP controllers, frame captures, performance traces, and responsive review pages.

Validation path:

- Inspect opponent frames at 900, 950, 983, and 1000 milliseconds.
- Capture category departure, commit, arrival, and cleanup frames.
- Check different heading widths and both screen edges.
- Alternate categories four times without residual styles.
- Compare the final animated frame with the settled frame.
- Check a maximum geometry difference of one CSS pixel.
- Check that portrait container opacity stays at one in detail mode.
- Navigate through ten opponents without residual overlays or images.
- Interrupt transitions with return, resize, and another navigation.
- Repeat with reduced motion and keyboard input.
- Record browser version, viewport, device, and capture method.

Exit gate: U01 through U18 pass on the agreed desktop baseline.
Measure Chromium, Firefox, and WebKit behavior before release.
Document any remaining browser difference.

## M5: Release

Status: In progress. M4 is accepted. Local release preparation is implemented.
Preview, hosting, domain, and publication rights remain pending.
Read [the M5 report](m5-report.md).
User input: Check public name, domain, hosting account, and data update policy.

Work:

1. Check media provenance and publication rights.
2. Create a Vercel preview deployment.
3. Run the complete acceptance matrix against that deployment.
4. Configure the approved domain and DNS records.
5. Check HTTPS, caching, direct links, and rollback.

Deliverables: Preview URL, production URL, release report, and operator instructions.

Validation path:

- Check direct detail links after a cold visit.
- Check asset responses and dataset version consistency.
- Check source labels and snapshot dates.
- Check release performance targets on a documented device.
- Restore the previous deployment in a rollback exercise.
- Rebuild with the previous dataset version.

Exit gate: The user accepts the release preview and every release check passes.
Do not buy a domain or publish production during M0.

## Change control

Update requirements before changing accepted behavior.
Record architecture changes in the decision log.
Update affected checks when a requirement changes.
Keep milestone status separate from planned work.

## All-division UI expansion

Date: 2026-10-16.
Status: Implemented. Checks appear in the expansion report.
The user authorized all 11 captured weight divisions after the selector correction.
Read [the expansion report](all-divisions-report.md).
Check explicit source ranks, champion defaults, all 176 selections, detail routes, and narrow menus.
Keep the M5 hosting gate separate.
