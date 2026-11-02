# 9. Code and file structure

[Product Spec index](../product-spec.md) · Version 1.3 · Updated 2026-10-24.

```text
src/
  app/
    page.tsx                     # Redirect to rankings
    rankings/page.tsx            # Initial route and keyed experience
    layout.tsx, globals.css      # Shell metadata, fonts, theme, focus
  components/rankings/
    experience.tsx               # Persistent UI composition
    use-experience.ts            # Transaction and request lifecycle
    category.tsx, dial.tsx       # Division controls and ranked selection
    media.tsx, profile.tsx       # Portrait and career profile
    history.tsx, preview.tsx     # Recorded history and opponent preview
    bout.tsx, types.ts           # Bout UI and view contracts
  lib/
    domain/                     # Zod contracts, routes, selection, formatting, scoring
    navigation/controller.ts    # Browser entry ownership
    motion/                     # Controller, preparation, glyph helpers, timing constants
    performance/                # Opt-in local recorder, frame collector, export contracts
    data/                       # Server readers, summaries, fighter and bout stores
  messages/en.ts                # Existing shared English labels
  data/roster.json              # Small reference fixture, not the live archive
scripts/
  pipeline/                     # Python export, media, ranking expansion, bout references
  research/                     # Source/media investigation helpers
  check-data.ts, check-bouts.ts  # Runtime artifact validation
  restore-data.ts               # Bounded archive restoration
  release-check.ts              # Release preflight
  check-deployment.ts           # Deployed HTTP checks
  run-data.ts                   # Data operation command dispatch
data/                          # Repository configuration, schemas, release descriptor
public/data/                   # Installed generated versioned datasets; not source DB
public/fonts/                  # Local fonts
tests/
  unit/                         # Domain, route, store, and restore checks
  pipeline/                     # Offline export and scoring/reference checks
  e2e/                          # Browser behavior and motion checks
  fixtures/                     # Shared scoring and test inputs
docs/
  product-spec.md              # Specification index
  spec/                        # Current topic owners and shared changelog
  archive/                     # Earlier non-normative specifications
  evidence/                    # Dated check receipts and measurements
  development-plan.md          # Delivery status and remaining gates
  validation.md                # Chronological validation log
outputs/designs/               # Preserved local prototypes; not runtime architecture
work/                          # Ignored local builds, captures, and investigation artifacts
```

Root `next.config.ts` pins the dataset and traces only necessary server artifacts.
`package.json` supplies supported commands; the lockfile supplies exact dependency versions.
`playwright.config.ts` configures browser checks and external preview URLs.
`vercel.json` and `.github/workflows/` define release and CI entry points.
The schema directory is `data/schemas/`; configuration is `data/config/`; the production descriptor is `data/release.json`.
New user-facing strings should use clear English and be prepared for future localization; current Bout labels also exist in `bout.tsx`.

`src/components/performance/launcher.tsx` owns menu eligibility and lazy panel loading. `panel.tsx` owns the local diagnostics display. `src/lib/performance/live.ts` owns bounded live counters. These files do not own navigation or animation. Panel behavior tests are in `tests/e2e/performance-panel.spec.ts`; its opt-in three-mode comparison is in `performance-panel-benchmark.spec.ts`.

`scripts/collector/` contains the migrated source parsers, full builder, incremental updater, snapshot validation, and provenance. `tests/collector/` contains offline pytest coverage. `collect-db.yml` is manual-only during cutover; `ci.yml` runs offline tests. No runtime module imports this collector.
