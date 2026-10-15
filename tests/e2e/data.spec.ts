import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";

test("versioned fighter data and reviewed images are served consistently", async ({
  request,
}) => {
  test.skip(
    !existsSync("public/data/current.json"),
    "No exported dataset exists in this environment.",
  );
  const current = await request.get("/data/current.json");
  expect(current.ok()).toBeTruthy();
  expect(current.headers()["cache-control"]).toContain("no-store");
  const { datasetVersion } = await current.json();
  const base = `/data/v1/${datasetVersion}`;
  const registryResponse = await request.get(`${base}/divisions.json`);
  expect(registryResponse.headers()["cache-control"]).toContain("immutable");
  const registry = await registryResponse.json();
  expect(registry.datasetVersion).toBe(datasetVersion);
  for (const division of registry.divisions) {
    const bundle = await (
      await request.get(`${base}/fighters/${division.defaultFighterId}.json`)
    ).json();
    expect(bundle.profile.id).toBe(division.defaultFighterId);
    expect(bundle.datasetVersion).toBe(datasetVersion);
  }
  const media = await (await request.get(`${base}/media.json`)).json();
  const asset =
    media.fighters[registry.divisions[0].defaultFighterId].full_body;
  if (asset) {
    const variant = asset.variants[0];
    const image = await request.get(variant.url);
    expect(image.ok()).toBeTruthy();
    expect(image.headers()["content-type"]).toContain("image/webp");
    expect((await image.body()).length).toBe(variant.bytes);
  }
});

test("reviewed media from every additional division is available", async ({
  request,
}) => {
  test.skip(
    !existsSync("public/data/current.json") ||
      !existsSync("data/config/ranked-media-snapshot.json"),
    "No expanded dataset exists in this environment.",
  );
  const snapshot = JSON.parse(
    readFileSync("data/config/ranked-media-snapshot.json", "utf8"),
  );
  const { datasetVersion } = await (
    await request.get("/data/current.json")
  ).json();
  const base = `/data/v1/${datasetVersion}`;
  const media = await (await request.get(`${base}/media.json`)).json();
  for (const division of snapshot.divisions) {
    const fighterId = division.entries[0].fighterId;
    const bundleResponse = await request.get(
      `${base}/fighters/${fighterId}.json`,
    );
    expect(bundleResponse.ok()).toBeTruthy();
    const bundle = await bundleResponse.json();
    expect(bundle.profile.id).toBe(fighterId);
    expect(bundle.datasetVersion).toBe(datasetVersion);
    for (const role of ["headshot", "half_body", "full_body"]) {
      const asset = media.fighters[fighterId][role];
      expect(asset).not.toBeNull();
      const variant = asset.variants.at(-1);
      const image = await request.get(variant.url);
      expect(image.ok()).toBeTruthy();
      expect(image.headers()["content-type"]).toContain("image/webp");
      expect(image.headers()["cache-control"]).toContain("immutable");
      const body = await image.body();
      expect(body.length).toBe(variant.bytes);
      expect(createHash("sha256").update(body).digest("hex")).toBe(
        variant.sha256,
      );
    }
  }
});
