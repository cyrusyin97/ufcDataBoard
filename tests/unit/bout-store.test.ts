import { describe, it, expect, vi } from "vitest";
import fixture from "../fixtures/bout-analysis.json";
import { BoutStore } from "../../src/lib/data/bout-store";
const response = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status });
const version = fixture.bout.datasetVersion,
  id = fixture.bout.id,
  fighter = fixture.bout.fighterIds[0];
function setup() {
  const request = vi
    .fn<typeof fetch>()
    .mockImplementation(async (input) =>
      response(
        String(input).includes("bout-references")
          ? fixture.reference
          : fixture.bout,
      ),
    );
  return {
    request,
    store: new BoutStore(version, true, request),
    signal: new AbortController().signal,
  };
}
describe("lazy versioned bout store", () => {
  it("loads one bout and reference then reuses them for round and participant changes", async () => {
    const { store, request, signal } = setup();
    await store.load(id, fighter, "all", signal);
    await store.load(id, fixture.bout.fighterIds[1], 3, signal);
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("rejects invalid participants and periods even for cached bundles", async () => {
    const { store, signal } = setup();
    await store.load(id, fighter, "all", signal);
    await expect(
      store.load(id, "a".repeat(16), 1, signal),
    ).rejects.toMatchObject({ reason: "participant" });
    await expect(store.load(id, fighter, 6, signal)).rejects.toMatchObject({
      reason: "period",
    });
  });
  it("rejects mixed dataset or reference identities", async () => {
    const { request, signal, store } = setup();
    request.mockResolvedValueOnce(
      response({
        ...fixture.bout,
        datasetVersion: "2026-10-14-0000000000000000",
      }),
    );
    await expect(store.load(id, fighter, "all", signal)).rejects.toThrow(
      "identity",
    );
    const other = setup();
    other.request.mockImplementation(async (input) =>
      response(
        String(input).includes("bout-references")
          ? { ...fixture.reference, cutoffExclusive: "2021-09-26" }
          : fixture.bout,
      ),
    );
    await expect(
      other.store.load(id, fighter, "all", other.signal),
    ).rejects.toThrow("reference");
  });
  it("does not cache failed or cancelled requests", async () => {
    const { store, request, signal } = setup();
    request.mockResolvedValueOnce(response({}, 503));
    await expect(store.load(id, fighter, "all", signal)).rejects.toMatchObject({
      reason: "request",
    });
    await store.load(id, fighter, "all", signal);
    expect(request).toHaveBeenCalledTimes(3);
    const aborted = setup();
    const control = new AbortController();
    control.abort();
    await expect(
      aborted.store.load(id, fighter, "all", control.signal),
    ).rejects.toThrow();
    await aborted.store.load(id, fighter, "all", aborted.signal);
    expect(aborted.request).toHaveBeenCalledTimes(4);
  });
  it("leaves old releases usable without requesting unavailable analysis files", async () => {
    const request = vi.fn<typeof fetch>();
    await expect(
      new BoutStore(version, false, request).load(
        id,
        fighter,
        "all",
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ reason: "unsupported" });
    expect(request).not.toHaveBeenCalled();
  });
});
