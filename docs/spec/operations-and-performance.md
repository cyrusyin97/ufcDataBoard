# 10. Data operations, security, and delivery

[Product Spec index](../product-spec.md) · Version 1.3 · Updated 2026-10-24.

The build pins a single dataset version. Runtime pointer changes must not mix releases in an open experience.
Use versioned artifact URLs with immutable one-year caching. `data/current.json` uses `no-store`.
Fetch complete archive bundles, bouts, and references lazily. Keep images, unranked bundles, and bulk analysis outside initial server tracing where configured.
Use local SVG; do not import the prototype's chart CDN or standalone scripts.

Export from a read-only source connection. Record source hashes, dates, row identities, and conflicts.
Validate artifacts before packaging, restore into an isolated location, and promote only complete checked versions.
Restore checks include archive checksum, path safety, entry count, and compressed/expanded/per-file limits.
Do not weaken those limits merely to accept a larger artifact. Measure and document any justified change.
Preserve the previous usable release when export, validation, restoration, or promotion fails.

Review both identity and anatomical media role before publishing an asset.
Role approval does not grant publication rights. Rights and source provenance remain separate release checks.
Keep credentials, source SQLite, private machine paths, original captures, and unreviewed media out of public output.
Run source acquisition outside browser components and outside this web runtime.

Use [data operations](../data-operations.md), [media acquisition](../media-acquisition.md), and [deployment](../deployment.md) for exact operator commands.
The current release target is Vercel with Node.js 24 and a pinned checked artifact.
A source-only CI pass does not certify a production build, deployed navigation, performance, or rollback.
Local preview overrides `UFC_PREVIEW_DATASET_VERSION` and `UFC_PREVIEW_BUILD_DIR` do not promote a release.
Hosting configuration, publication rights, public identity/domain, update policy, deployed checks, and accepted preview remain release gates where unresolved.

### 10.1 Performance and loading budgets

The following are engineering targets. They need measurements on a documented device and build; this spec does not claim they are achieved.

| Measure                                   | Target                      | Meaning                                           |
| ----------------------------------------- | --------------------------- | ------------------------------------------------- |
| Largest Contentful Paint (LCP)            | At most 2.5 seconds         | Time until the largest visible content appears.   |
| Cumulative Layout Shift (CLS)             | At most 0.1                 | Unexpected layout movement.                       |
| Interaction to Next Paint (INP)           | At most 200 milliseconds    | Delay from interaction to visible response.       |
| Desktop transition frame rate             | 60 FPS                      | Smooth motion under the measured device workload. |
| Initial compressed application JavaScript | Below 250 KB where feasible | Initial application script transfer budget.       |

Reserve image space with known dimensions. Keep original source images outside the initial payload.
Do not eagerly decode all full-body images. Prepare the selected portrait and likely targets after user intent.
Measure startup, interaction, and payload cost when adding dependencies or data. Report exceptions with their cause and effect.
Use field measurements when traffic is available. Local browser checks do not establish field performance.
