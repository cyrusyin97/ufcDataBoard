import { afterEach, describe, expect, it } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  symlinkSync,
  rmSync,
} from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import * as tar from "tar";
import {
  restoreDataset,
  assertArchiveExpansion,
} from "../../scripts/restore-data";
const version = "2026-10-14-0123456789abcdef";
const directories: string[] = [];
afterEach(() => {
  directories
    .splice(0)
    .forEach((p) => rmSync(p, { recursive: true, force: true }));
});
async function fixture(
  kind: "outside" | "symlink" | "duplicate" | "pointer" = "outside",
) {
  const dir = mkdtempSync(path.join(tmpdir(), "ufc-restore-test-"));
  directories.push(dir);
  mkdirSync(path.join(dir, "data/v1", version), { recursive: true });
  writeFileSync(
    path.join(dir, "data/current.json"),
    JSON.stringify({ schemaVersion: 1, datasetVersion: "wrong" }),
  );
  writeFileSync(path.join(dir, "outside.txt"), "outside");
  symlinkSync(
    "../../../outside.txt",
    path.join(dir, "data/v1", version, "link"),
  );
  const artifact = path.join(dir, "test.tar.gz");
  const names =
    kind === "outside"
      ? ["outside.txt"]
      : kind === "symlink"
        ? [`data/v1/${version}/link`]
        : kind === "duplicate"
          ? ["data/current.json", "data/current.json"]
          : ["data/current.json"];
  await tar.c({ gzip: true, cwd: dir, file: artifact }, names);
  const sha256 = createHash("sha256")
    .update(readFileSync(artifact))
    .digest("hex");
  const root = path.join(dir, "public/data");
  mkdirSync(root, { recursive: true });
  writeFileSync(path.join(root, "current.json"), "unchanged");
  return { artifact, root, descriptor: { datasetVersion: version, sha256 } };
}
describe("release archive restoration", () => {
  it.each(["outside", "symlink", "duplicate"] as const)(
    "rejects %s entries without replacing the active pointer",
    async (kind) => {
      const input = await fixture(kind);
      await expect(restoreDataset(input)).rejects.toThrow("archive entry");
      expect(readFileSync(path.join(input.root, "current.json"), "utf8")).toBe(
        "unchanged",
      );
    },
  );
  it("rejects an archive checksum mismatch before extraction", async () => {
    const input = await fixture();
    input.descriptor.sha256 = "0".repeat(64);
    await expect(restoreDataset(input)).rejects.toThrow("checksum");
    expect(readFileSync(path.join(input.root, "current.json"), "utf8")).toBe(
      "unchanged",
    );
  });
  it("rejects a pointer that disagrees with the pinned version", async () => {
    const input = await fixture("pointer");
    await expect(restoreDataset(input)).rejects.toThrow("pointer differs");
    expect(readFileSync(path.join(input.root, "current.json"), "utf8")).toBe(
      "unchanged",
    );
  });
  it("requires an explicit artifact source and HTTPS", async () => {
    const input = await fixture();
    await expect(
      restoreDataset({ ...input, artifact: undefined }),
    ).rejects.toThrow("UFC_DATASET_URL");
    await expect(
      restoreDataset({
        ...input,
        artifact: undefined,
        url: "http://example.test/data.tar.gz",
      }),
    ).rejects.toThrow("HTTPS");
  });
});

describe("analysis archive expansion bounds", () => {
  it("accepts the measured archive and retains finite entry and byte limits", () => {
    expect(() => assertArchiveExpansion(1024, 107915925, 23580)).not.toThrow();
    expect(() => assertArchiveExpansion(1024, 107915925, 40001)).toThrow(
      "expansion limit",
    );
    expect(() =>
      assertArchiveExpansion(20 * 1024 * 1024 + 1, 107915925, 1),
    ).toThrow("expansion limit");
    expect(() =>
      assertArchiveExpansion(1024, 512 * 1024 * 1024 + 1, 1),
    ).toThrow("expansion limit");
  });
});
