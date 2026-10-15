# M5 release preparation report

Date: 2026-10-15.
Status: In progress. Local preparation is complete. Hosting release is not complete.
The user approved [the GitHub repository](https://github.com/cyrusyin97/ufcDataBoard).
The verified application and release preparation are pushed to its `main` branch.
The initial source commit is `59d4cd426805ea5fc037e4bd60eac14e71266bce`.
The user has no Vercel project, public domain, or media rights evidence to supply yet.
The internal name remains UFC Rankings. Data updates remain manual.

## Delivered preparation

- Pin Node.js 24.x in the package engine and CI.
- Pin the current dataset version and compressed archive SHA-256 in `data/release.json`.
- Restore artifacts from a local file or a build-only HTTPS URL.
- Reject archive checksum mismatches, unsafe entries, duplicate files, links, and excessive expansion.
- Validate contracts, media references, and every file checksum before replacing the active pointer.
- Restore data before the Vercel build. Block deployment while media rights remain unknown.
- Add an HTTP checker for the preview origin, data contracts, image hashes, redirects, and cache headers.
- Let the existing browser matrix target an external preview through `PLAYWRIGHT_BASE_URL`.
- Make source-only CI checks available before an artifact host exists. Report skipped deployment validation explicitly.

The publication preflight exits nonzero with one expected blocker: 512 media roles lack approved publication rights.
This is a blocked release check, not a passing publication approval.

The source database, current dataset, and V6, V7, and V8 prototypes remain unchanged.
The public source repository excludes datasets, captured media, browser trace archives, and local design outputs.
Those local artifacts remain in the original workspace.
The repository contains source, configuration, text evidence, and the lockfile.
The bundled Barlow font families include their original copyright and OFL notices in `public/fonts/`.

## Completed local checks

| Check                       | Result  | Scope                                                                   |
| --------------------------- | ------- | ----------------------------------------------------------------------- |
| Runtime                     | Pass    | Node.js 24.22.0                                                         |
| Lint and TypeScript         | Pass    | Final release scripts and application                                   |
| Unit tests                  | Pass    | 27 tests in five files; six new archive failure checks                  |
| Production build            | Pass    | Current pinned dataset                                                  |
| Chromium browser suite      | Pass    | All 21 checks on Node.js 24                                             |
| Preview-target browser mode | Pass    | Two checks against the existing local server                            |
| HTTP validation             | Pass    | 17 requests; both divisions and an unranked direct URL                  |
| Clean-room restore          | Pass    | Current archive restored into an empty isolated directory               |
| Repeated restore            | Pass    | Same archive reused without a version collision                         |
| Previous-version rebuild    | Pass    | Isolated build with `2026-10-14-555dda3397f54a57`                       |
| Pipeline tests              | Pass    | All 24 tests; temporary fixture databases only                          |
| Production dependency audit | Pass    | Zero reported advisories                                                |
| Complete dependency audit   | Warning | Five high-severity reports in the existing development dependency chain |

The earlier dataset rebuild is a local recovery exercise.
It is not a Vercel rollback exercise.
Read [the HTTP receipt](evidence/m5/http-validation.json) and [the M5 receipt](evidence/m5-validation.json).
The Node.js 24 [lab metrics](evidence/m5/node24-performance.json) record LCP 60 ms, CLS 0.0357, and maximum observed Event Timing duration 48 ms.
These local samples do not certify deployed performance, field INP, or native 60 FPS.
The Firefox traversal difference from [M4](m4-report.md#firefox-traversal-difference) remains open.

The full dependency audit reports `braces`, `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, and `eslint-config-next`.
The available audit fix proposes a major downgrade of the Next.js lint configuration.
This task retains the compatible pinned configuration.
The production-only audit has no findings.

## Data and hosting footprint

Current dataset: `2026-10-14-7c5ad4426abf6d1a`.
Compressed archive: 53,892,686 bytes.
Archive checksum: `ef6a938e570ddd4caec539c139e74283fac9d461a2f2972a468a4220af95eea4`.
The release contains 4581 fighters, 23118 fighter-perspective rows, and 512 media roles.
Its static data layout contains 5611 files including the manifest and pointer.
Manifest-listed payloads total 64,953,019 bytes. The largest listed file is 717,256 bytes.

The source upload omits these generated assets and restores them during the hosting build.
[Vercel limits](https://vercel.com/docs/limits) distinguish source upload limits from generated output files.
Do not estimate hosting cost until the hosting plan and expected traffic are known.
The build uses the [supported Node.js 24 runtime](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Open release inputs and checks

1. Create or select the user's Vercel account and project.
2. Approve the public name, domain, and update frequency.
3. Obtain publication rights evidence for all 512 shipped media roles. Each currently has `rightsStatus: unknown`.
4. Produce a checked dataset that records the approved rights. Do not edit an immutable release in place.
5. Store the pinned archive at an approved HTTPS artifact host. Configure `UFC_DATASET_URL` in CI and Vercel.
6. Deploy a preview and run the complete acceptance matrix against its URL.
7. Confirm visible Firefox behavior and release-device performance.
8. Check HTTPS, canonical redirects, DNS, deployment rollback, and prior-artifact retention.
9. Obtain the user's release-preview approval before production promotion.

No Vercel preview or production URL exists.
No domain or hosting plan was purchased.
Read [the operator guide](deployment.md) for the commands and release sequence.
