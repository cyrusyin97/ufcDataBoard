import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type {
  FighterSummary,
  Variant,
} from "../../src/components/rankings/types";
const image = (url: string): Variant => ({
  url,
  width: 10,
  height: 20,
  bytes: 10,
  sha256: "a".repeat(64),
  mime: "image/webp",
});
const summary = (url: string): FighterSummary => ({
  id: "a".repeat(16),
  name: "Test",
  record: { wins: 1, losses: 0, draws: 0, noContests: null },
  figure: image(url),
  figureRole: "half_body",
  thumbnail: null,
  fullBody: null,
  headshotFallback: null,
});
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() } });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("reuses successful readiness, bounds retained images, and separates URLs", async () => {
  const decode = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode = decode;
    },
  );
  const { prepareFighter } = await import("../../src/lib/motion/prepare");
  const prepare = (url: string) =>
    prepareFighter(summary(url), false, new AbortController().signal);
  await prepare("/one");
  await prepare("/one");
  expect(decode).toHaveBeenCalledTimes(1);
  for (const url of ["/two", "/three", "/four", "/five"]) await prepare(url);
  await prepare("/one");
  expect(decode).toHaveBeenCalledTimes(6);
});
it("does not cache failures and preserves the headshot fallback", async () => {
  const decode = vi
    .fn()
    .mockRejectedValueOnce(new Error("decode"))
    .mockResolvedValue(undefined);
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode = decode;
    },
  );
  const { prepareFighter } = await import("../../src/lib/motion/prepare");
  const data = { ...summary("/portrait"), headshotFallback: image("/head") };
  const first = await prepareFighter(data, false, new AbortController().signal);
  expect(first.figureRole).toBe("headshot");
  const second = await prepareFighter(
    data,
    false,
    new AbortController().signal,
  );
  expect(second.figureRole).toBe("half_body");
  expect(decode).toHaveBeenCalledTimes(3);
});
it("does not cache aborted preparation and permits a fresh retry", async () => {
  let resolve!: () => void;
  const decode = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValue(undefined);
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode = decode;
    },
  );
  const { prepareFighter } = await import("../../src/lib/motion/prepare");
  const controller = new AbortController();
  const pending = prepareFighter(summary("/one"), false, controller.signal);
  await vi.waitFor(() => expect(decode).toHaveBeenCalledTimes(1));
  controller.abort();
  await expect(pending).rejects.toBeDefined();
  resolve();
  await prepareFighter(summary("/one"), false, new AbortController().signal);
  expect(decode).toHaveBeenCalledTimes(2);
});
