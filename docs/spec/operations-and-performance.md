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

### 10.2 Planned journey diagnostics

[Journey performance measurement](performance-measurement.md) owns the local capture and live-panel contract, metric definitions, overhead gates, and export rules. It does not replace Web Vitals or claim achieved performance. Record an accepted baseline before optimizing the audited interactions.

### Source collector ownership

Approved 2026-11-02. `scripts/collector/` owns explicit source database collection and migration. It does not run in browser components, Next.js builds, or routine CI. The exporter remains read-only. The manual candidate workflow requires a selected baseline and SHA-256, checks an isolated copy, and can publish an immutable source snapshot only when requested. It does not update the active website dataset. Schedule activation and dataset promotion require the operational cutover gates in [collector migration](../collector-migration.md).

Collector validation update, 2026-11-02: A candidate must retain both real fighter perspectives for each source fight. Newly introduced historical opponents are fetched using source IDs within a bounded request budget. Failed closure blocks candidate publication and website export. Never infer a missing opponent record from the first fighter.

### Weekly data publication

Approved 2026-11-09. Weekly collection, checked packaging, and production publication are authorized through the workflow in [collector migration](../collector-migration.md#weekly-website-publication). Reuse verified reviewed media derivatives and preserve ranking snapshots. Pin the source snapshot and website artifact in version control. A website descriptor can include `artifactUrl`; this URL takes precedence over the legacy environment URL. Check application behavior before publication and the expected public version after deployment. A failed check blocks subsequent steps. Concurrent main updates block descriptor promotion. Existing artifacts remain available for rollback.

### Rankings preparation

Approved 2026-11-09. Build and development startup validate source bundles and prepare a versioned rankings summary under `work/runtime/`. Deployment tracing includes this generated file. Server requests reuse the summary in process memory and load only the selected initial fighter bundle. A new deployment pins a new version. For ranked fighters, prepare portrait readiness concurrently with the fighter bundle request. Commit only after both complete and retain cancellation and identity checks.

### Intent preparation and embedded references

Recorded 2026-11-12. A mouse hover or keyboard focus on a History or Bout link starts one speculative preparation after 150 milliseconds. It loads the target fighter bundle and portrait. For a Bout link it also loads the bout and the other participant bundle. Only one speculative target exists. Leaving the link, a hidden document, or a different target cancels it. Touch pointers and the data-saver preference do not start it. Navigation to the same target takes ownership of the pending work. A failed speculative load publishes no result; navigation then loads the data again.

An exported bout bundle embeds its scoring reference. The browser then needs one request for bout analysis. Separate reference files remain in the dataset. The browser requests the separate file when a bundle has no embedded reference. The release `2026-11-09-6aead45623d69efa` has no embedded references. The next export includes them and its version identity records bout delivery version 2.
