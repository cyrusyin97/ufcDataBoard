import "server-only";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { bundleSchema } from "@/lib/domain/contracts";
import type { RankingsData } from "@/components/rankings/types";
let rankings: RankingsData | undefined;
export function readRankings(): RankingsData {
  if (rankings) return rankings;
  const version = process.env.UFC_DATASET_VERSION;
  if (!version || !/^\d{4}-\d{2}-\d{2}-[a-f0-9]{16}$/.test(version))
    throw new Error("Invalid dataset version");
  const data: RankingsData = JSON.parse(
    readFileSync(
      join(process.cwd(), "work/runtime", `${version}.json`),
      "utf8",
    ),
  );
  if (data.datasetVersion !== version)
    throw new Error("Rankings version mismatch");
  rankings = data;
  return data;
}
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
