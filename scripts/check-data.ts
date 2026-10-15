import {
  readFileSync,
  lstatSync,
  readdirSync,
  statSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  bundleSchema,
  indexSchema,
  registrySchema,
  mediaSchema,
  manifestSchema,
  conflictsSchema,
} from "../src/lib/domain/contracts.ts";

const read = (file: string) => JSON.parse(readFileSync(file, "utf8"));
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function checkDataset(directory: string) {
  const manifest = manifestSchema.parse(
    read(path.join(directory, "manifest.json")),
  );
  const version = manifest.datasetVersion;
  const actualFiles: string[] = [];
  const walk = (folder: string) => {
    for (const name of readdirSync(folder)) {
      const file = path.join(folder, name),
        info = lstatSync(file);
      assert(!info.isSymbolicLink(), "Release contains a symlink");
      if (info.isDirectory()) walk(file);
      else {
        assert(
          !/\.(db|sqlite|sqlite3)$/i.test(name) && !name.startsWith(".env"),
          "Release contains private source files",
        );
        actualFiles.push(path.relative(directory, file));
      }
    }
  };
  walk(directory);
  assert(
    actualFiles.length === Object.keys(manifest.files).length + 1 &&
      actualFiles.every(
        (name) => name === "manifest.json" || name in manifest.files,
      ),
    "Undeclared release file",
  );
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert(
      !path.isAbsolute(name) && !name.split(/[\\/]/).includes(".."),
      "Unsafe artifact path",
    );
    const file = path.join(directory, name),
      payload = readFileSync(file);
    assert(payload.length === expected.bytes, `Byte count differs: ${name}`);
    assert(
      createHash("sha256").update(payload).digest("hex") === expected.sha256,
      `Checksum differs: ${name}`,
    );
  }
  const index = indexSchema.parse(read(path.join(directory, "index.json")));
  const registry = registrySchema.parse(
    read(path.join(directory, "divisions.json")),
  );
  const media = mediaSchema.parse(read(path.join(directory, "media.json")));
  for (const artifact of [index, registry, media])
    assert(artifact.datasetVersion === version, "Mixed dataset versions");
  const conflicts = conflictsSchema.parse(
    read(path.join(directory, "conflicts.json")),
  );
  assert(
    conflicts.datasetVersion === version &&
      conflicts.observations.length === manifest.counts.fieldConflicts,
    "Conflict count or version differs",
  );
  const ids = new Set(index.fighters.map((fighter) => fighter.id));
  assert(
    ids.size === index.fighters.length &&
      ids.size === manifest.sourceCounts.fighters &&
      ids.size === manifest.counts.fighters,
    "Fighter coverage differs",
  );
  assert(
    Object.keys(media.fighters).length === ids.size &&
      [...ids].every((id) => id in media.fighters),
    "Media archive coverage differs",
  );
  assert(
    conflicts.observations.every((row) => ids.has(row.fighterId)),
    "Unknown conflict identity",
  );
  const divisionIds = registry.divisions.map((division) => division.id);
  assert(
    new Set(divisionIds).size === divisionIds.length &&
      divisionIds.includes(registry.defaultDivisionId),
    "Invalid division registry",
  );
  assert(
    divisionIds.length === manifest.counts.divisions,
    "Division count differs",
  );
  for (const division of registry.divisions) {
    assert(
      new Set(division.entries.map((entry) => entry.fighterId)).size ===
        division.entries.length,
      "Duplicate ranking identity",
    );
    assert(
      division.entries.every(
        (entry, i) =>
          ids.has(entry.fighterId) &&
          (i === 0 || entry.rank >= division.entries[i - 1].rank),
      ),
      "Invalid ranking ordering or reference",
    );
    if (division.publicationState === "published") {
      const champions = division.entries.filter((entry) => entry.isChampion);
      assert(
        champions.length === 1 &&
          champions[0].fighterId === division.defaultFighterId &&
          champions[0].rank === 0,
        "Invalid published champion",
      );
    }
  }
  let perspectives = 0;
  const bouts = new Map<string, Set<string>>();
  const fighterFiles = readdirSync(path.join(directory, "fighters"));
  assert(fighterFiles.length === ids.size, "Fighter bundle count differs");
  for (const id of ids) {
    const bundle = bundleSchema.parse(
      read(path.join(directory, "fighters", id + ".json")),
    );
    assert(
      bundle.datasetVersion === version && bundle.profile.id === id,
      "Bundle identity or version differs",
    );
    const seen = new Set<string>();
    for (const row of bundle.records) {
      assert(
        row.fighterId === id &&
          ids.has(row.opponentId) &&
          row.opponentId !== id &&
          !seen.has(row.id),
        "Invalid fight perspective or opponent",
      );
      seen.add(row.id);
      if (!bouts.has(row.id)) bouts.set(row.id, new Set());
      bouts.get(row.id)!.add(id);
      perspectives++;
    }
  }
  assert(
    perspectives === manifest.sourceCounts.fights &&
      perspectives === manifest.counts.records,
    "Fight coverage differs",
  );
  assert(
    bouts.size === manifest.counts.bouts &&
      bouts.size === manifest.sourceCounts.fight_details &&
      [...bouts.values()].every((ids) => ids.size === 2),
    "Bout pairing differs",
  );
  let assets = 0;
  for (const [id, roles] of Object.entries(media.fighters)) {
    assert(ids.has(id), "Unknown media fighter");
    for (const [role, asset] of Object.entries(roles)) {
      if (!asset) continue;
      assert(asset.role === role, "Media role differs");
      assets++;
      for (const variant of asset.variants) {
        const prefix = "/data/v1/" + version + "/";
        assert(
          variant.url.startsWith(prefix),
          "Media references another release",
        );
        const relative = variant.url.slice(prefix.length);
        assert(
          relative in manifest.files &&
            manifest.files[relative].sha256 === variant.sha256 &&
            statSync(path.join(directory, relative)).size === variant.bytes,
          "Invalid media reference",
        );
      }
    }
  }
  assert(assets === manifest.counts.mediaAssets, "Media asset count differs");
  const inspectPaths = (value: unknown): void => {
    if (typeof value === "string") {
      if (/^https?:\/\//.test(value)) {
        const source = new URL(value);
        assert(
          !source.username &&
            !source.password &&
            ![...source.searchParams.keys()].some((key) =>
              /^(password|secret|apiKey|api_key|authorization|access_token|token)$/i.test(
                key,
              ),
            ),
          "Public source URL contains credentials",
        );
      }
      assert(
        !/^(\/Users\/|\/private\/|[A-Za-z]:\\)/.test(value),
        "Public data contains a machine path",
      );
    } else if (Array.isArray(value)) value.forEach(inspectPaths);
    else if (value && typeof value === "object") {
      for (const key of Object.keys(value))
        assert(
          !/^(password|secret|apiKey|api_key|authorization|access_token)$/i.test(
            key,
          ),
          "Public data contains credential fields",
        );
      Object.values(value).forEach(inspectPaths);
    }
  };
  for (const name of Object.keys(manifest.files))
    if (name.endsWith(".json")) inspectPaths(read(path.join(directory, name)));
  return manifest;
}

if (process.argv.includes("--schemas")) {
  mkdirSync("data/schemas", { recursive: true });
  for (const [name, schema] of Object.entries({
    fighter: bundleSchema,
    index: indexSchema,
    divisions: registrySchema,
    media: mediaSchema,
    manifest: manifestSchema,
    conflicts: conflictsSchema,
  }))
    writeFileSync(
      `data/schemas/${name}.schema.json`,
      JSON.stringify(z.toJSONSchema(schema), null, 2) + "\n",
    );
} else if (process.argv[1]?.endsWith("check-data.ts")) {
  const directory =
    process.argv[2] ??
    path.join(
      "public/data/v1",
      read("public/data/current.json").datasetVersion,
    );
  const manifest = checkDataset(directory);
  console.log(
    JSON.stringify({
      status: "passed",
      version: manifest.datasetVersion,
      counts: manifest.counts,
    }),
  );
}
