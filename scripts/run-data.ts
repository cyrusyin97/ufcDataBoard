import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { checkDataset } from "./check-data.ts";

const python =
  process.env.UFC_PYTHON ??
  (existsSync(".venv/bin/python") ? ".venv/bin/python" : "python3");
const mode = process.argv[2];
const args = process.argv.slice(3);
const rootArgument = args.indexOf("--publish-root");
const publishRoot =
  rootArgument >= 0 ? args.splice(rootArgument, 2)[1] : "public/data";
let ownsLock = false;
if (mode === "pack") {
  const rootFlag = args.indexOf("--root");
  const packRoot = rootFlag >= 0 ? args[rootFlag + 1] : "public/data";
  const current = JSON.parse(
    readFileSync(path.join(packRoot, "current.json"), "utf8"),
  );
  checkDataset(path.join(packRoot, "v1", current.datasetVersion));
  const pack = spawnSync(
    python,
    ["scripts/pipeline/package_release.py", ...args],
    { stdio: "inherit" },
  );
  process.exit(pack.status ?? 1);
}
if (
  ["media", "discover", "candidates", "review", "ranked"].includes(mode ?? "")
) {
  const files: Record<string, string> = {
    media: "media",
    discover: "discover",
    candidates: "candidates",
    review: "review_sheet",
    ranked: "expand_ranked_media",
  };
  const processResult = spawnSync(
    python,
    ["scripts/pipeline/" + files[mode] + ".py", ...args],
    { stdio: "inherit" },
  );
  process.exit(processResult.status ?? 1);
}
if (mode !== "export") throw new Error("Unknown data command");
const result = spawnSync(python, ["scripts/pipeline/export_data.py", ...args], {
  encoding: "utf8",
});
if (result.status !== 0) {
  process.stderr.write(
    result.stderr || result.error?.message || "Python job failed",
  );
  process.exit(result.status ?? 1);
}
const prepared = JSON.parse(result.stdout.trim());
try {
  const manifest = checkDataset(prepared.stage);
  const destination = path.join(publishRoot, "v1", prepared.version);
  mkdirSync(path.join(publishRoot, "v1"), { recursive: true });
  writeFileSync(path.join(publishRoot, ".publish-lock"), String(process.pid), {
    flag: "wx",
  });
  ownsLock = true;
  if (existsSync(destination)) {
    checkDataset(destination);
    rmSync(prepared.stage, { recursive: true });
  } else renameSync(prepared.stage, destination);
  const temp = path.join(publishRoot, ".current.pending.json");
  writeFileSync(
    temp,
    JSON.stringify({
      schemaVersion: 1,
      datasetVersion: manifest.datasetVersion,
    }) + "\n",
  );
  renameSync(temp, path.join(publishRoot, "current.json"));
  console.log(
    JSON.stringify({
      status: "published",
      version: manifest.datasetVersion,
      counts: manifest.counts,
    }),
  );
} catch (error) {
  if (existsSync(prepared.stage)) rmSync(prepared.stage, { recursive: true });
  throw error;
} finally {
  if (ownsLock) rmSync(path.join(publishRoot, ".publish-lock"));
}
