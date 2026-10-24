# All-division UI expansion

> Historical evidence. Status, counts, and remaining work below apply to the recorded stage. Use [Product Spec](product-spec.md) for current behavior and [development plan](development-plan.md) for current gates.

Date: 2026-10-16.
Status: Implemented and checked.

## Scope

The user authorized all captured weight divisions in the interface.
The registry now exposes eight men's divisions and three women's divisions.
Each division contains a champion and 15 challengers.
The interface covers 176 ranked fighters.
Featherweight remains the default division.
The menu lists men's divisions by weight, then women's divisions by weight.
It scrolls within a bounded height on desktop and narrow screens.
The existing rankings, profile, history, opponent preview, and motion components remain shared.

## Source checks

The additional membership comes from the reviewed 2026-10-14 ranking capture.
The two original division snapshots retain their existing entries and dates.
The expansion command checks the saved HTML hash against the media snapshot.
It reads only the visible ranking block.
It reads champion headings and explicit rank cells.
It does not convert list positions into official ranks.
Women's Flyweight retains two fighters at rank six and no rank seven.
The rank labels and profile badges use these source values.

No source site refresh or database update occurs in this task.
All 4581 fighter bundles retain their facts and complete recorded history.
All 528 reviewed media roles retain their source and variant hashes.
Every published fighter has a headshot, a half-body image, and a full-body cutout.
The latest headshot variants remain available for list thumbnails.

## Repeatable preparation

`data/config/division-metadata.json` defines the weight-class keys, labels, and limits.
The source capture remains private in `work/media-expansion/rankings.html`.
Run `.venv/bin/python scripts/pipeline/expand_ui_divisions.py` to check and promote the saved snapshots.
This command performs no network requests or database writes.
It rejects a changed HTML hash, missing champion, missing explicit rank, or mismatched identity list.
Then run the documented export, integrity check, and package commands.
Retain the original `--as-of 2026-10-14` when facts have not been refreshed.

Dataset: `2026-10-14-17c85108758d31ec`.
The pinned archive occupies 57,387,518 bytes.
Read [the structured receipt](evidence/all-divisions-validation.json) for per-division dates, ranks, and checksums.
Generated public releases and private image sheets remain outside Git.

## Verification

The Node.js 24 production build, ESLint, TypeScript, 29 unit tests, and 28 pipeline tests pass.
All 46 distinct Chromium browser checks pass.
The full run passed 45 checks. The corrected image fallback fixture passes on a focused rerun.
The old fixture selected a globally unranked fighter with media.
After this expansion, every fighter with reviewed media belongs to a published ranking.
The fixture now uses a known media-bearing fighter outside the active division.
An initial test-loader error from a JSON import was corrected with explicit JSON file parsing.

All 30 focused Firefox and WebKit checks pass.
These checks cover each division's menu selection, champion, direct history, reload, and in-app return.
They also cover narrow menu access, source ties, and the existing headshot checks.
The M4 report retains its separate Firefox browser-level Back compatibility difference.

All 176 fighters pass individual selection, career record, profile identity, and recent-result checks.
All 176 headshots retain their native 520 by 325 variant.
An isolated restore of the pinned archive passes dataset integrity checks.
The source database SHA-256 remains unchanged.

Visual review covers all 11 champion pages at 1318 by 808 CSS pixels and device scale factor two.
No page has horizontal overflow.
The long women's division labels fit the desktop layout and wrap on narrow screens.
The narrow captures use 390 by 844 CSS pixels.
Private screenshots remain in `docs/evidence/all-divisions/`.
The [geometry receipt](evidence/all-divisions/desktop-geometry.json) records browser and viewport details.
M5 hosting and publication rights remain pending.
