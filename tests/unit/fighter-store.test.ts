import { describe, expect, it, vi } from "vitest";
import {
  FighterStore,
  UnknownFighterError,
} from "../../src/lib/data/fighter-store";
import { fighterSummary } from "../../src/lib/data/summary";
import { profileBundle } from "../fixtures/fighter";
import type { RankingsData } from "../../src/components/rankings/types";
const datasetVersion = profileBundle.datasetVersion;
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
  it("treats a missing bundle as an unknown fighter without an index request", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => response({}, 404));
    const store = new FighterStore({ ...data, fighters: {} }, null, request);
    await expect(
      store.load("ffffffffffffffff", new AbortController().signal),
    ).rejects.toBeInstanceOf(UnknownFighterError);
    await expect(
      store.load("not-an-id", new AbortController().signal),
    ).rejects.toBeInstanceOf(UnknownFighterError);
    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls[0][0])).toContain(
      "/fighters/ffffffffffffffff.json",
    );
  });
  it("uses embedded media for an unranked fighter in one request", async () => {
    const asset = {
      sourceUrl: "https://example.com/source.png",
      sourceSha256: "a".repeat(64),
      role: "headshot",
      reviewedAt: "2026-10-14",
      rightsStatus: "unknown",
      variants: [
        {
          url: `/data/v1/${datasetVersion}/media/${"b".repeat(64)}.webp`,
          width: 96,
          height: 96,
          bytes: 100,
          sha256: "b".repeat(64),
          mime: "image/webp",
        },
      ],
    };
    const embedded = {
      ...profileBundle,
      media: { headshot: asset, half_body: null, full_body: null },
    };
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => response(embedded));
    const store = new FighterStore({ ...data, fighters: {} }, null, request);
    const bundle = await store.load(id, new AbortController().signal);
    const summary = await store.summary(bundle, new AbortController().signal);
    expect(summary.thumbnail?.url).toBe(asset.variants[0].url);
    expect(summary.fullBody).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
    const other = new FighterStore({ ...data, fighters: {} }, null, async () =>
      response({
        ...embedded,
        media: {
          ...embedded.media,
          headshot: {
            ...asset,
            variants: [
              {
                ...asset.variants[0],
                url: `/data/v1/2026-10-13-0000000000000000/media/${"b".repeat(64)}.webp`,
              },
            ],
          },
        },
      }),
    );
    await expect(
      other.load(id, new AbortController().signal),
    ).rejects.toThrow();
  });
  it("reads the media manifest for a bundle without embedded media and retains missing media as null", async () => {
    const media = {
      schemaVersion: 1,
      datasetVersion,
      fighters: { [id]: { headshot: null, half_body: null, full_body: null } },
    };
    const request = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        response(String(input).endsWith("media.json") ? media : profileBundle),
      );
    const store = new FighterStore({ ...data, fighters: {} }, null, request);
    const bundle = await store.load(id, new AbortController().signal);
    expect(
      (await store.summary(bundle, new AbortController().signal)).figure,
    ).toBeNull();
    await store.summary(bundle, new AbortController().signal);
    expect(request).toHaveBeenCalledTimes(2);
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
