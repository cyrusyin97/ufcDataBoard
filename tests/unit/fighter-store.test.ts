import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  FighterStore,
  UnknownFighterError,
} from "../../src/lib/data/fighter-store";
import { fighterSummary } from "../../src/lib/data/summary";
import type { FighterBundle } from "../../src/lib/domain/contracts";
import type { RankingsData } from "../../src/components/rankings/types";
const { datasetVersion } = JSON.parse(
  readFileSync("public/data/current.json", "utf8"),
);
const profileBundle: FighterBundle = JSON.parse(
  readFileSync(
    `public/data/v1/${datasetVersion}/fighters/e1248941344b3288.json`,
    "utf8",
  ),
);
const id = profileBundle.profile.id;
const data: RankingsData = {
  datasetVersion,
  defaultDivisionId: "featherweight",
  divisions: [],
  fighters: { [id]: fighterSummary(profileBundle, undefined) },
};
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
describe("lazy fighter store", () => {
  it("fetches the complete history after a three-row server seed and caches the checked bundle", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response(profileBundle));
    const seed = {
      ...profileBundle,
      records: profileBundle.records.slice(0, 3),
    };
    const store = new FighterStore(data, seed, request);
    expect(
      (await store.load(id, new AbortController().signal, false)).records,
    ).toHaveLength(3);
    expect(request).not.toHaveBeenCalled();
    expect(
      (await store.load(id, new AbortController().signal)).records,
    ).toHaveLength(profileBundle.records.length);
    await store.load(id, new AbortController().signal);
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("checks archive membership before a fighter request and retains missing media as null", async () => {
    const archiveData = { ...data, fighters: {} };
    const index = {
      schemaVersion: 1,
      datasetVersion,
      fighters: [
        {
          id,
          name: "Alexander Volkanovski",
          displayName: "Alexander Volkanovski",
          ufcSlug: null,
        },
      ],
    };
    const media = {
      schemaVersion: 1,
      datasetVersion,
      fighters: { [id]: { headshot: null, half_body: null, full_body: null } },
    };
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        response(
          String(input).endsWith("index.json")
            ? index
            : String(input).endsWith("media.json")
              ? media
              : profileBundle,
        ),
      );
    const store = new FighterStore(archiveData, null, request);
    await expect(
      store.load("ffffffffffffffff", new AbortController().signal),
    ).rejects.toBeInstanceOf(UnknownFighterError);
    expect(request).toHaveBeenCalledTimes(1);
    const bundle = await store.load(id, new AbortController().signal);
    expect(
      (await store.summary(bundle, new AbortController().signal)).figure,
    ).toBeNull();
  });
  it("does not cache failed, mismatched, or aborted responses", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(
        response({
          ...profileBundle,
          datasetVersion: "2026-10-13-0000000000000000",
        }),
      )
      .mockResolvedValueOnce(response(profileBundle))
      .mockResolvedValueOnce(response(profileBundle));
    const store = new FighterStore(data, null, request);
    await expect(
      store.load(id, new AbortController().signal),
    ).rejects.toThrow();
    await expect(store.load(id, new AbortController().signal)).rejects.toThrow(
      "mismatch",
    );
    const controller = new AbortController();
    controller.abort();
    await expect(store.load(id, controller.signal)).rejects.toThrow();
    await store.load(id, new AbortController().signal);
    expect(request).toHaveBeenCalledTimes(4);
  });
  it("evicts the least recent completed bundle after 32 fighters", async () => {
    const bundles = Array.from({ length: 33 }, (_, i) => ({
      ...profileBundle,
      profile: {
        ...profileBundle.profile,
        id: i.toString(16).padStart(16, "0"),
      },
      records: [],
    }));
    const fixtureData = {
      ...data,
      fighters: Object.fromEntries(
        bundles.map((b) => [b.profile.id, fighterSummary(b, undefined)]),
      ),
    };
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        response(bundles.find((b) => String(input).includes(b.profile.id))),
      );
    const store = new FighterStore(fixtureData, null, request);
    for (const bundle of bundles)
      await store.load(bundle.profile.id, new AbortController().signal);
    await store.load(bundles[0].profile.id, new AbortController().signal);
    expect(request).toHaveBeenCalledTimes(34);
  });
});
