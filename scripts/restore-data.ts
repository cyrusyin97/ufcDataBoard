import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import * as tar from "tar";
import { z } from "zod";
import { checkDataset } from "./check-data.ts";

export const descriptorSchema = z
  .object({
    datasetVersion: z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-f0-9]{16}$/),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const maxCompressed = 256 * 1024 * 1024;

async function download(url: string) {
  if (new URL(url).protocol !== "https:")
    throw new Error("Dataset URL must use HTTPS.");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (
      !response.ok ||
      !response.body ||
      new URL(response.url).protocol !== "https:"
    )
      throw new Error();
    const parts: Buffer[] = [];
    let size = 0;
    for await (const part of response.body) {
      size += part.length;
      if (size > maxCompressed) {
        await response.body.cancel().catch(() => {});
        throw new Error();
      }
      parts.push(Buffer.from(part));
    }
    return Buffer.concat(parts);
  } catch {
    // A signed artifact URL can contain credentials. Do not include it in errors.
    throw new Error(
      "Dataset download failed or exceeded its size or time limit.",
    );
  }
}

export async function restoreDataset(options: {
  descriptor: unknown;
  artifact?: string;
  url?: string;
  root: string;
}) {
  const descriptor = descriptorSchema.parse(options.descriptor);
  if (!options.artifact && !options.url)
    throw new Error(
      "Set UFC_DATASET_URL or pass --artifact. Local public files are not a release source.",
    );
  const bytes = options.artifact
    ? readFileSync(options.artifact)
    : await download(options.url!);
  if (bytes.length > maxCompressed || digest(bytes) !== descriptor.sha256)
    throw new Error("Dataset archive checksum or size differs.");
  const stage = mkdtempSync(path.join(tmpdir(), "ufc-release-"));
  const root = path.resolve(options.root);
  let ownsLock = false;
  try {
    const archive = path.join(stage, "release.tar.gz");
    writeFileSync(archive, bytes);
    const seen = new Set<string>();
    let expanded = 0;
    tar.t({
      file: archive,
      sync: true,
      strict: true,
      onReadEntry(entry) {
        const name = entry.path.replace(/\/$/, "");
        const prefix = `data/v1/${descriptor.datasetVersion}`;
        const allowed =
          name === "data/current.json" ||
          name === prefix ||
          name.startsWith(prefix + "/") ||
          (entry.type === "Directory" && ["data", "data/v1"].includes(name));
        if (
          !allowed ||
          name.includes("\\") ||
          name
            .split("/")
            .some((part) => part === ".." || part === "." || part === "") ||
          !["File", "Directory"].includes(entry.type) ||
          seen.has(name)
        )
          throw new Error("Unsafe or duplicate dataset archive entry.");
        seen.add(name);
        expanded += entry.size;
        if (
          entry.size > 20 * 1024 * 1024 ||
          expanded > 512 * 1024 * 1024 ||
          seen.size > 20000
        )
          throw new Error("Dataset expansion limit exceeded.");
      },
    });
    await tar.x({
      file: archive,
      cwd: stage,
      strict: true,
      preservePaths: false,
    });
    const pointer = JSON.parse(
      readFileSync(path.join(stage, "data/current.json"), "utf8"),
    );
    if (
      pointer.schemaVersion !== 1 ||
      pointer.datasetVersion !== descriptor.datasetVersion
    )
      throw new Error("Dataset pointer differs from release descriptor.");
    const source = path.join(stage, "data/v1", descriptor.datasetVersion);
    const manifest = checkDataset(source);
    mkdirSync(root, { recursive: true });
    writeFileSync(path.join(root, ".publish-lock"), String(process.pid), {
      flag: "wx",
    });
    ownsLock = true;
    const destination = path.join(root, "v1", descriptor.datasetVersion);
    mkdirSync(path.dirname(destination), { recursive: true });
    if (existsSync(destination)) {
      checkDataset(destination);
      if (
        digest(readFileSync(path.join(destination, "manifest.json"))) !==
        digest(readFileSync(path.join(source, "manifest.json")))
      )
        throw new Error("Existing immutable version differs.");
    } else {
      // The private stage can be on a different filesystem. Copy before atomic rename.
      const { cpSync } = await import("node:fs");
      const pending = path.join(root, "v1", `.pending-${process.pid}`);
      try {
        cpSync(source, pending, {
          recursive: true,
          errorOnExist: true,
          force: false,
        });
        renameSync(pending, destination);
      } finally {
        rmSync(pending, { recursive: true, force: true });
      }
    }
    const pendingPointer = path.join(root, ".restore-current.pending.json");
    writeFileSync(pendingPointer, JSON.stringify(pointer) + "\n");
    renameSync(pendingPointer, path.join(root, "current.json"));
    return {
      status: "restored",
      version: descriptor.datasetVersion,
      archiveSha256: descriptor.sha256,
      counts: manifest.counts,
    };
  } finally {
    if (ownsLock) rmSync(path.join(root, ".publish-lock"), { force: true });
    rmSync(stage, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const argument = (name: string, fallback?: string) => {
    const i = process.argv.indexOf(name);
    return i < 0 ? fallback : process.argv[i + 1];
  };
  const result = await restoreDataset({
    descriptor: JSON.parse(
      readFileSync(argument("--descriptor", "data/release.json")!, "utf8"),
    ),
    artifact: argument("--artifact"),
    url: process.env.UFC_DATASET_URL,
    root: argument("--root", "public/data")!,
  });
  console.log(JSON.stringify(result));
}
