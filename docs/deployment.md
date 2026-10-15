# Deployment guide

Status: M5 preparation is in progress. No Vercel deployment exists.
Read [the M5 report](m5-report.md) for completed local checks and open release inputs.

## Hosting model

Vercel runs the Next.js application and serves static assets through its delivery network.
The first release does not need a separate virtual server.
The first release does not need a hosted database.
The local scraper and SQLite database remain outside Vercel.

A domain is the public website name.
DNS records connect that name to the hosting service.
HTTPS encrypts browser traffic.
A preview deployment gives reviewers a URL before production release.

## Prerequisites

- The user controls a Git hosting account and the project repository.
- The user controls a Vercel account.
- The user approves the public name and domain.
- The release dataset passes M1 checks.
- Media publication rights meet the release requirements.

## First preview

1. Push the application source and lockfile to [the approved repository](https://github.com/cyrusyin97/ufcDataBoard).
2. Import that repository into Vercel.
3. Select the Next.js framework preset.
4. Select Node.js 24.
5. Set the project root to this directory.
6. Use `npm ci` for installation.
7. Use `npm run release:build` for the build command.
8. Set `UFC_DATASET_URL` to an approved HTTPS artifact URL.
   Keep its exact version and archive checksum in `data/release.json`.
   The build restores and checks this artifact. It then checks media publication rights.
9. Deploy a preview.
10. Run the M5 checks against its URL.
    Check both division URLs and their detail links.

The committed `vercel.json` selects the Next.js preset and release build command.
The package engine selects Node.js 24.x.
[Vercel supports this runtime](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
Local source uploads omit datasets, captures, credentials, and private work directories.
The artifact includes data and reviewed media together.
Keep originals outside the hosting source.
See [Vercel limits](https://vercel.com/docs/limits) before choosing a plan.
The current artifact is 53,892,686 bytes.
A successful role review does not supply publication rights.
The current release has 512 media roles with unknown publication rights.
`release:check` blocks the hosting build for those roles.

## Local release commands

```sh
npm run data:restore -- --artifact /absolute/path/to/pinned-release.tar.gz
npm run release:check
npm run release:http -- https://approved-preview-host
PLAYWRIGHT_BASE_URL=https://approved-preview-host npm run test:e2e
M4_CROSS_BROWSER=1 PLAYWRIGHT_BASE_URL=https://approved-preview-host npm run test:e2e
```

The restore command requires the descriptor checksum to match exactly.
Use `--root` to restore into an isolated data directory.
Use `--descriptor` with a retained descriptor to restore a previous version.
Neither command requires the source database.
The release check writes `outputs/releases/preflight.json` and exits nonzero for blockers.
The HTTP checker writes `outputs/releases/http-validation.json`.
HTTP checks do not certify hydration, browser Back, or motion.
Run the full browser matrix against the accepted preview.

Configure the `UFC_DATASET_URL` GitHub Actions secret for full CI release validation.
Without this secret, CI still checks source, unit tests, formatting, and the pipeline.
It explicitly skips the production build and browser checks.
A source-only CI success does not certify a release.

## Domain connection

1. Register the user-approved domain through the chosen registrar.
2. Add the domain in the Vercel project settings.
3. Read the DNS records that Vercel provides for that project.
4. Apply those exact records at the DNS provider.
5. Wait for Vercel to check the domain.
6. Check the HTTPS certificate.
7. Check the canonical hostname and redirect.

Do not copy example DNS values from a document.
Use the records that the hosting service provides at deployment time.
See [Vercel's domain guide](https://vercel.com/docs/domains/set-up-custom-domain).

## CDN and cache

Use hashed media paths and versioned JSON paths.
Cache these immutable assets for long periods.
Keep unversioned HTML and manifests under framework cache control.
Check response headers on the deployed preview.
A new dataset version must not reuse old immutable paths.

## Update and rollback

1. Run the source scraper as a separate approved operation.
2. Export a new dataset version.
3. Run data and application checks.
4. Deploy a preview with that version.
5. Check the changed fighters and records in both divisions.
6. Promote the accepted preview to production.

If the release fails, restore the previous Vercel deployment.
Keep its matching dataset and media artifacts available.
A release report must record source revision, lockfile, dataset version, and deployment URL.

## Cost decisions

Check hosting limits and pricing before release.
Estimate bandwidth from image sizes and expected traffic.
Large original portraits must not become default page downloads.
Consider object storage only when asset volume or delivery cost warrants it.
