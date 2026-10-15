# Fighter media acquisition

Status: Implemented M1 pipeline with the initial reviewed dataset.
Date: 2026-10-14.
The collector, candidate job, variant cache, and publication runner exist.
Read [data operations](data-operations.md) for commands.

Read [the technical design](technical-design.md) for application boundaries.
Read [the evidence receipt](evidence/media-2026-10-14.json) for measured results.

## Terms

- A cutout is a portrait with a transparent background.
- Alpha stores pixel transparency.
- A role identifies the intended image use.
- A variant is a generated size or encoding of an approved source.
- A validator is an HTTP value used to check cached content.
- ETag identifies an HTTP representation for conditional requests.
- MIME describes the response content type.
- A representation is one encoding returned for a URL and request headers.
- An ICC profile describes image color interpretation.
- Quarantine means retaining a failed candidate outside published assets.

## 1. Findings

The investigation checked Movsar Evloev, Justin Gaethje, Valentina Shevchenko, and Dustin Poirier.
These samples cover both initial divisions, another division, and a fighter outside the initial rankings.
The investigation did not measure complete archive coverage.

| Source                     | Observed result                                                    | Decision                                               |
| -------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------ |
| Athlete hero image         | A 460 × 700 derived image                                          | Use for the half-body presentation.                    |
| Social metadata image      | A 520 × 325 headshot in all four samples                           | Treat as a headshot candidate.                         |
| Original hero path         | Four downloadable tall images, each 3324 pixels high               | Treat as full-body candidates requiring visual review. |
| Public JSON:API index      | No athlete resource in the returned index                          | Do not depend on an athlete API.                       |
| Public file collection     | One file record with original and style URLs                       | Use only when an exact relevant record exists.         |
| Filename filters           | Empty results for the current portrait and a known sample filename | Do not depend on file search for discovery.            |
| Conditional image requests | HTTP 304 for Movsar and Justin originals                           | Use representation-specific cache validators.          |

Justin's original candidate received a visual check.
It contains the fighter from head to feet.
The other three original candidates received decode and geometry checks only.
Their anatomical coverage still needs visual review.
Dimensions alone do not prove that a picture contains a full body.

### Prototype correction

The V7 collector preferred `og:image` for its `fullImage` field.
This rule classified headshots as full-body images.
All 16 Lightweight files with the `full-v7.png` suffix decode as 520 × 325 PNG images.
The previous report's full-body coverage claim was incorrect.
The accepted prototype layout remains unchanged during this investigation.
M1 now supplies 32 reviewed full-body cutouts in the exported dataset.
The prototype files keep their historical bindings.
Do not migrate the incorrect role labels into production.

### Encoding and size

The `.png` URLs returned WebP under one image Accept header.
Movsar's display URL returned AVIF under another Accept header.
The AVIF response includes `Vary: Accept`.
The decoder identified both actual formats successfully.
Never use the URL suffix as the local encoding extension.

| Candidate | Original dimensions | Received bytes | Generated body variant | Variant bytes |
| --------- | ------------------- | -------------- | ---------------------- | ------------- |
| Movsar    | 1004 × 3324         | 2513182        | 544 × 1800 WebP        | 146048        |
| Justin    | 1143 × 3324         | 2651250        | 619 × 1800 WebP        | 174850        |
| Valentina | 1132 × 3324         | 2429500        | 613 × 1800 WebP        | 163350        |
| Dustin    | 1026 × 3324         | 2858932        | 556 × 1800 WebP        | 187642        |

The sample transform preserves aspect ratio and alpha.
It uses Pillow 12.3.0, WebP quality 85, and method 6.
These sizes are sample results, not universal delivery budgets.
Visual quality across all variants remains an M1 gate.

## 2. Discovery beyond rankings

Rankings are one seed source, not the complete fighter directory.
Use existing reviewed mappings first.
Discover additional athlete URLs through the public sitemap index.
Deduplicate canonical `/athlete/` paths across all sitemap pages.
Treat sitemap coverage as incomplete until a crawl report measures it.

The inspected sitemap index advertises 69 child pages.
One child contained 1000 URLs, including 26 athlete URLs.
The investigation fetched that child only.
The first athlete directory page exposes 11 unique athlete links.
Its next-page URL uses a query parameter.

The captured robots file declares a 15-second crawl delay.
It disallows `/athletes/all?*` and `/facets-block-ajax`.
The production job must not crawl those directory query paths.
Use allowed sitemap paths and reviewed athlete page URLs instead.
Read robots rules at each collection run.
Use the stricter current delay if the policy changes.
If robots retrieval fails, pause network collection.

A sitemap URL is a source candidate, not proof of identity or completeness.
A missing UFC.com page must not remove a fighter from the database archive.

## 3. Identity mapping

The local database contains 4581 fighters.
Nine normalized-name groups contain more than one fighter ID.
Examples include Mike Davis, Joey Gomez, and Michael McDonald.
A dictionary keyed only by normalized name can overwrite a fighter.

Maintain a reviewed mapping file with these fields:

| Field           | Meaning                                                    |
| --------------- | ---------------------------------------------------------- |
| `fighterId`     | Stable UFCStats identity                                   |
| `ufcSlug`       | Canonical UFC.com athlete path key                         |
| `sourcePageUrl` | The page that supplies media                               |
| `matchState`    | Reviewed, candidate, ambiguous, or unresolved              |
| `matchEvidence` | Names, aliases, biography observations, and reviewer notes |
| `reviewedAt`    | Date of the identity decision                              |

Normalized names generate candidates only.
Compare additional available facts before approval.
Conflicting names, slugs, or biography observations require review.
Keep aliases without replacing the stable ID.
Do not infer identity from a filename or one physical measurement.
Download publication candidates only after a reviewer approves the fighter-to-page mapping.
Retain unresolved fighters with null media roles.

## 4. Extract image candidates

Parse HTML with an HTML parser.
Do not use a filename regex as the identity parser.
Resolve relative URLs against the canonical athlete page.
Read `src`, lazy source attributes, and supported `srcset` candidates.
Keep query parameters on observed style URLs.
Do not generate image tokens.

Use this role order:

1. Read the primary `img.hero-profile__image` as the half-body source.
2. Read social metadata as a headshot candidate.
3. Read event headshots only when the associated athlete link matches the reviewed subject.
4. Use an exact API file record when its URI matches the relevant source asset.
5. Derive an original candidate from the observed hero style path when no exact original record exists.

Event sections also contain opponents' images.
Do not assign every image on the page to the page's fighter.
Unlinked or ambiguous event images remain unused until review.

For an observed `/images/styles/<style>/s3/<path>`, the candidate original is `/images/<path>`.
Keep nested path segments and the exact filename.
Do not change `_L`, `_R`, belt suffixes, or dates.
This derivation is a tested fallback, not an official universal contract.
A successful request still needs decoding and role review.
A failed original request must not invalidate a working hero image.

The API file `uri.url` identifies an original file, not its anatomical role.
An API result can refer to an editorial photo rather than a cutout.
Do not invent a full-body URL from the social headshot filename.

## 5. Download and decode

Use `urllib.request` for HTTP and Pillow for decoding and variants.
Pin Pillow 12.3.0 in the media job environment initially.
Check required WebP and AVIF decoder support at job start.
The sample environment supports both.
The pinned dependency file is `requirements-media.txt`.

Initial collector limits are engineering defaults:

- Allow HTTPS URLs on `ufc.com` and `www.ufc.com` only.
- Review any additional CDN host before adding it to the configuration.
- Check every redirect destination before requesting it.
- Reject credentials, unexpected ports, and local network targets.
- Use a 30-second request timeout.
- Limit each response body to 25 MiB.
- Limit decoded images to 50 million pixels.
- Allow at most three redirects.
- Serialize network requests through one site-wide delay controller.

The two UFC hostnames share the same delay budget.
Retries and conditional requests also consume that budget.
Use a stable configured Accept header for each representation.
Store its value with the cache entry.

1. Check the source URL and robots policy.
2. Read the response into a temporary file with the byte limit.
3. Record final URL, status, MIME, ETag, Last-Modified, and Vary.
4. Reject HTML or unsupported media responses.
5. Identify the actual encoding with Pillow.
6. Run `verify()`.
7. Reopen the file and decode all pixels with `load()`.
8. Check dimensions, alpha, and content bounds.
9. Calculate SHA-256 from the received bytes.
10. Rename the file atomically with its actual encoding extension.

A successful HTTP status is not sufficient.
Quarantine MIME and decoder disagreements for review.
Do not publish truncated or undecodable files.
Keep raw source files outside the public deployment directory.
Do not disable Pillow's image size protections.

## 6. Approve roles and produce variants

Use roles `headshot`, `half_body`, and `full_body`.
Use `unknown` while a source needs review.
A full-body approval needs a visual check for head, legs, and feet.
Alpha and aspect ratio can reject unsuitable candidates but cannot approve anatomy.

| Role      | Initial variants                           | Transform                              |
| --------- | ------------------------------------------ | -------------------------------------- |
| Headshot  | 160 × 100, 320 × 200, and 520 × 325 bounds | Preserve the source composition.       |
| Half-body | 320 and 460 pixel width bounds             | Use the reviewed hero source.          |
| Full-body | 900 and 1800 pixel height bounds           | Preserve the complete reviewed cutout. |

Keep aspect ratio.
Do not enlarge a small source.
Apply EXIF orientation before resizing.
Preserve real alpha instead of adding an artificial transparent channel.
Normalize color profiles when the source provides an ICC profile.
Use Lanczos resampling for size reduction.
Generate WebP in M1.
Stop variant generation if the required encoder is unavailable.
Strip unnecessary metadata from public variants.

Cropping requires explicit source-specific settings and review.
Do not infer a headshot crop from every full-body image.
Do not generate missing body parts or remove a background automatically.
Store crop settings and transform version for repeatable output.

## 7. Media manifest

The public manifest contains approved local variants only.
The private collection manifest keeps provenance, validators, errors, and review state.
Both use fighter IDs rather than ranking positions.

Each private asset record contains:

- Fighter ID and reviewed page mapping.
- Source URL, final URL, extraction method, and source role.
- Source capture date and last successful check time.
- HTTP validators and representation key.
- Actual encoding, dimensions, alpha bounds, byte count, and SHA-256.
- Role review state and reviewer notes.
- Variant paths, dimensions, hashes, and transform version.
- Rights status and collection failure state.

Each public role is null or references an approved asset and its variants.
Keep a headshot separate from a missing full-body role.
A fighter without images still receives a manifest entry.
Use `/data/v1/<dataset-version>/media/<variant-hash>.webp`.
Include the media manifest version in the dataset release.
Publish data and media references together after all checks pass.
Do not publish files merely because they exist in a temporary folder.

## 8. Incremental updates and failures

Store final URL and Accept representation with each cache entry.
Do not reuse validators after the source URL or representation changes.
Do not reuse an AVIF ETag for a WebP request.
Keep prior source records when a new hash arrives.
Export the current hash-approved role until the new candidate receives approval.
Use `If-None-Match` when the representation has an ETag.
Otherwise, use `If-Modified-Since` when available.

HTTP 304 reuses a verified existing file.
If that file is absent or corrupt, request the body again without validators.
HTTP 200 triggers decoding and hash comparison.
An unchanged hash reuses existing variants when transform settings also match.
A new hash creates new immutable variant paths.
Keep the previous release available for rollback.

| Failure                | Action                                                                  |
| ---------------------- | ----------------------------------------------------------------------- |
| HTTP 403               | Record blocked status. Stop retries for that source in the current run. |
| HTTP 404 or 410        | Record unavailable status. Keep previous approved media pending review. |
| HTTP 429               | Honor Retry-After. Pause the shared network queue.                      |
| Timeout or HTTP 5xx    | Retry at most twice with backoff and the site delay.                    |
| Decode or role failure | Quarantine the candidate. Keep the previous approved role.              |
| Missing mapping        | Export null media roles and an unresolved mapping receipt.              |

Never treat a failed refresh as permission to remove working media.
Use a persisted resume queue so interrupted jobs can continue.
Keep bounded failure receipts instead of retrying the full archive on every build.
The initial schedule remains manual until the user approves an update policy.

## 9. Website integration

The browser reads the public manifest and local or CDN variants.
It does not request UFC pages or the source database.
Select a size from the role's variants and the rendered image size.
Reserve dimensions before decoding to avoid layout movement.
Prepare the target figure before starting a fighter or category transition.

Use this figure fallback order: approved full-body, approved half-body, headshot, then initials.
Apply a visible layout variant for each fallback role.
Do not label a headshot fallback as full-body media.
Keep image preparation separate from the GSAP timeline.
A late decoded image must pass the current navigation generation check.

## 10. M1 validation gates

1. Check both initial rankings against reviewed identity mappings.
2. Check additional division and unranked fighter samples.
3. Check duplicate names without dictionary overwrite.
4. Check social metadata without full-body promotion.
5. Check opponent headshots without subject misassignment.
6. Check PNG URLs returning WebP or AVIF.
7. Check 304 with existing, missing, and corrupt cache files.
8. Check redirects, limits, 403, 404, 429, and truncated images.
9. Check alpha preservation and every approved role visually.
10. Check resume behavior and atomic release failure.
11. Check that all source fighters retain media entries, including null roles.
12. Check public variants and source provenance before release.

## 11. Current research tools

The offline extractor is [media_candidates.py](../scripts/research/media_candidates.py).
It reads saved HTML and produces role candidates.
It does not download files or claim full directory coverage.
Its six tests check candidate roles, nested paths, approved hosts, and event ownership.

Run the tests with `python3 -m unittest discover -s scripts/research -p 'test_*.py'`.
Run extraction with the saved HTML path and `--page-url`.
The measured decode and resize outputs remain in `work/media-investigation/`.
The structured receipt remains in this document's evidence directory.

Primary references:

- [UFC robots policy](https://www.ufc.com/robots.txt)
- [UFC sitemap index](https://www.ufc.com/sitemap.xml)
- [Movsar athlete page](https://www.ufc.com/athlete/movsar-evloev)
- [Justin athlete page](https://www.ufc.com/athlete/justin-gaethje)
- [Valentina athlete page](https://www.ufc.com/athlete/valentina-shevchenko)
- [Dustin athlete page](https://www.ufc.com/athlete/dustin-poirier)
- [Drupal JSON:API filtering](https://www.drupal.org/docs/core-modules-and-themes/core-modules/jsonapi-module/filtering)
- [Pillow image decoding](https://pillow.readthedocs.io/en/stable/reference/Image.html)

## 12. Additional ranked divisions

Read [ranked media expansion](ranked-media-expansion.md) for the current collection.
The official page contains both visible rankings and hidden metadata rankings.
Use `view-display-id-block_1` for the visible list.
Do not overwrite it with `view-display-id-meta_rankings`.
The collection does not change the accepted interface scope.
