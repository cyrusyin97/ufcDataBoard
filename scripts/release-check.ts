import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { mediaSchema } from "../src/lib/domain/contracts.ts";
import { checkDataset } from "./check-data.ts";

const pointer = JSON.parse(readFileSync("public/data/current.json", "utf8"));
const base = `public/data/v1/${pointer.datasetVersion}`;
const manifest = checkDataset(base);
const media = mediaSchema.parse(
  JSON.parse(readFileSync(`${base}/media.json`, "utf8")),
);
const assets = Object.entries(media.fighters).flatMap(([fighterId, roles]) =>
  Object.entries(roles).flatMap(([role, asset]) =>
    asset
      ? [
          {
            fighterId,
            role,
            sourceUrl: asset.sourceUrl,
            sourceSha256: asset.sourceSha256,
            rightsStatus: asset.rightsStatus,
          },
        ]
      : [],
  ),
);
let revision: string | null =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? null;
if (revision && !/^[a-f0-9]{40,64}$/.test(revision))
  throw new Error("Invalid release source revision.");
try {
  revision ??= execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
} catch {
  /* Uncommitted source has no revision. */
}
const blockers: string[] = [];
if (process.versions.node.split(".")[0] !== "24")
  blockers.push("Run release checks with Node.js 24.");
if (!revision) blockers.push("Commit the release source before deployment.");
const unknown = assets.filter((a) => a.rightsStatus !== "approved");
if (unknown.length)
  blockers.push(
    `${unknown.length} media roles lack approved publication rights.`,
  );
const report = {
  status: blockers.length ? "blocked" : "passed",
  runtime: process.version,
  sourceRevision: revision,
  lockfileSha256: createHash("sha256")
    .update(readFileSync("package-lock.json"))
    .digest("hex"),
  datasetVersion: manifest.datasetVersion,
  counts: manifest.counts,
  mediaRoles: assets.length,
  approvedMediaRoles: assets.length - unknown.length,
  blockers,
  media: assets,
};
mkdirSync("outputs/releases", { recursive: true });
writeFileSync(
  "outputs/releases/preflight.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify({ ...report, media: undefined }));
if (blockers.length) process.exitCode = 1;
