import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
const { datasetVersion } = JSON.parse(
  readFileSync("public/data/current.json", "utf8"),
);
if (!/^\d{4}-\d{2}-\d{2}-[a-f0-9]{16}$/.test(datasetVersion))
  throw new Error("Invalid dataset pointer.");
const base = `./public/data/v1/${datasetVersion}`;
const registry = JSON.parse(readFileSync(`${base}/divisions.json`, "utf8"));
const rankedIds = new Set<string>(
  registry.divisions
    .filter(
      (d: { publicationState: string }) => d.publicationState === "published",
    )
    .flatMap((d: { entries: { fighterId: string }[] }) =>
      d.entries.map((e) => e.fighterId),
    ),
);
const config: NextConfig = {
  reactStrictMode: true,
  env: { UFC_DATASET_VERSION: datasetVersion },
  outputFileTracingExcludes: {
    "/rankings": [
      `./public/data/v1/!(${datasetVersion})/**`,
      `${base}/media/**`,
      `${base}/fighters/!(${Array.from(rankedIds).join("|")}).json`,
    ],
  },
  outputFileTracingIncludes: {
    "/rankings": [
      `${base}/divisions.json`,
      `${base}/media.json`,
      ...Array.from(rankedIds, (id) => `${base}/fighters/${id}.json`),
    ],
  },
  async headers() {
    return [
      {
        source: "/data/v1/:version/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/data/current.json",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};
export default config;
