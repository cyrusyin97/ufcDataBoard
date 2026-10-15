import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cache } from "react";
import {
  bundleSchema,
  mediaSchema,
  registrySchema,
} from "@/lib/domain/contracts";
import { fighterSummary } from "./summary";
import type { RankingsData } from "@/components/rankings/types";

export const readRankings = cache((): RankingsData => {
  const root = join(process.cwd(), "public/data");
  // Next.js embeds this version during the build. Runtime pointer changes do not mix releases.
  const pinned = process.env.UFC_DATASET_VERSION;
  const version =
    pinned && /^\d{4}-\d{2}-\d{2}-[a-f0-9]{16}$/.test(pinned) ? pinned : null;
  if (!version) throw new Error("Invalid dataset pointer.");
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
  return {
    datasetVersion: version,
    defaultDivisionId: registry.defaultDivisionId,
    divisions,
    fighters,
  };
});
export function readInitialFighter(version: string, id: string) {
  const bundle = bundleSchema.parse(
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          "public/data/v1",
          version,
          "fighters",
          `${id}.json`,
        ),
        "utf8",
      ),
    ),
  );
  return { ...bundle, records: bundle.records.slice(0, 3) };
}
