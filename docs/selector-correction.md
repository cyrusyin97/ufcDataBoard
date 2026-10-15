# Division menu and ranking headshots

Date: 2026-10-15.
Status: Implemented and checked.

## User request

Match the accepted V8 division menu.
Use headshots in both ranking lists.
Improve image resolution and framing.

## Changes

The division trigger now opens the V8 dark menu.
Each option shows its label, weight, and selected state.
Arrow keys, Home, and End move focus.
Enter and Space select an option.
Escape closes the menu and returns focus to the trigger.
A pointer outside the menu closes it.
Division changes still select the champion.

The ranking summary uses the largest reviewed headshot variant.
It no longer substitutes a half-body image for that role.
A missing headshot uses the existing initials fallback.
The image fills its 48 by 57 CSS pixel frame with centered cover framing.
The previous enlarged, top-aligned image box could cut off the face.
The previous smallest variant also reduced visible face detail.

The media pipeline retains 160 by 100, 320 by 200, and 520 by 325 headshot bounds.
It never enlarges a source image.
Body image recipes and their cache identities remain unchanged.
The source photograph limits the available detail.
No generated facial detail is added.

## Media review

Sixteen Featherweight headshots come from the mapped official athlete pages.
Each source is 520 by 325 pixels.
The role review compares each headshot with its previously reviewed body image.
It checks identity, hair, chin, and shoulders.
The approved source hashes are in `data/config/media-reviews.json`.
The private identity review sheet is `work/headshot-fix/review.png`.
The private 32-fighter framing sheet is `work/headshot-fix/framing.png`.
The framing sheet uses the actual 48 by 57 box ratio at two device pixels per CSS pixel.
All 32 published fighters now have reviewed headshots.
Hero portraits retain their body image roles.
Role review does not supply publication rights.

## Verification

Dataset: `2026-10-14-a8f817e5c4158abe`.
The release contains 4581 fighters, 23118 fighter-perspective records, and 528 media roles.
All 32 published headshots retain a 520 by 325 variant.
All 4581 fighter bundles retain the same profile and record content.
All 352 body image roles retain their source and variant hashes.
The source database SHA-256 remains unchanged.

The archive contains 57,389,802 bytes.
`data/release.json` pins its version and SHA-256.
An isolated restore of that exact archive passes all dataset checks.
The Node.js 24 production build, ESLint, TypeScript, 29 unit tests, and 25 pipeline tests pass.
All 23 Chromium production browser checks pass after two test adaptations.
The first full run passed 21 checks.
Two checks initially failed because they retained native-select and offscreen-decode assumptions.
The corrected checks pass on a focused rerun.
The division loop now starts with a different category.
The image check decodes the visible selected row; the dataset check covers all 32 sources.
Four focused Firefox and WebKit checks also pass.
The screenshots use a 1318 by 808 CSS pixel viewport and device scale factor two.
Visual review confirms the dark menu and complete head framing in both divisions.
Private production screenshots are in `docs/evidence/selector-correction/`.
Read [the structured receipt](evidence/selector-correction.json) for per-fighter coverage and hashes.
The archive and image sheets remain local. No Vercel deployment occurred.
