import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  manifestSchema,
  bundleSchema,
  mediaSchema,
  registrySchema,
} from "../src/lib/domain/contracts.ts";
import { fighterSummary } from "../src/lib/data/summary.ts";
import type { RankingsData } from "../src/components/rankings/types.ts";

export function buildRankings(version: string): RankingsData {
  const root = join(process.cwd(), "public/data");
  const base = join(root, "v1", version);
  const read = (file: string) =>
    JSON.parse(readFileSync(join(base, file), "utf8"));
  const registry = registrySchema.parse(read("divisions.json"));
  const media = mediaSchema.parse(read("media.json"));
  if (registry.datasetVersion !== version || media.datasetVersion !== version)
    throw new Error("Dataset versions do not agree.");
  const divisions = registry.divisions.filter(
    (d) => d.publicationState === "published",
  );
  const fighters: RankingsData["fighters"] = {};
  for (const division of divisions) {
    for (const entry of division.entries) {
      if (fighters[entry.fighterId]) continue;
      const bundle = bundleSchema.parse(
        read(`fighters/${entry.fighterId}.json`),
      );
      if (
        bundle.datasetVersion !== version ||
        bundle.profile.id !== entry.fighterId
      )
        throw new Error("Fighter bundle does not match its ranking.");
      const roles = media.fighters[entry.fighterId];
      fighters[entry.fighterId] = fighterSummary(bundle, roles);
    }
  }
  const manifest = manifestSchema.parse(read("manifest.json"));
  return {
    datasetVersion: version,
    boutAnalysis: !!manifest.boutAnalysis,
    boutSourceHash: manifest.sourceDatabaseSha256,
    defaultDivisionId: registry.defaultDivisionId,
    divisions,
    fighters,
  };
}
const version =
  process.env.UFC_PREVIEW_DATASET_VERSION ??
  JSON.parse(readFileSync("public/data/current.json", "utf8")).datasetVersion;
if (!/^\d{4}-\d{2}-\d{2}-[a-f0-9]{16}$/.test(version))
  throw new Error("Invalid dataset version");
const data = buildRankings(version);
mkdirSync("work/runtime", { recursive: true });
writeFileSync(`work/runtime/${version}.json`, JSON.stringify(data));
console.log(`Prepared rankings for ${version}`);
