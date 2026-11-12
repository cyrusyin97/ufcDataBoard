import { it, expect, vi } from "vitest";
import { IntentPreloader } from "../../src/lib/data/intent-preloader";
it("transfers pending work to navigation without hover cancellation", async () => {
  const loader = new IntentPreloader();
  let finish!: () => void;
  let active!: AbortSignal;
  const load = vi.fn((signal: AbortSignal) => {
    active = signal;
    return new Promise<void>((resolve) => {
      finish = resolve;
    });
  });
  loader.start("one", load);
  loader.start("one", load);
  const controller = new AbortController();
  const navigation = loader.take("one", controller.signal);
  loader.cancel();
  expect(active.aborted).toBe(false);
  expect(load).toHaveBeenCalledTimes(1);
  finish();
  await navigation;
});
it("cancels obsolete intent and propagates navigation cancellation", async () => {
  const loader = new IntentPreloader();
  let active!: AbortSignal;
  loader.start("one", async (signal) => {
    active = signal;
  });
  loader.start("two", async () => {});
  expect(active.aborted).toBe(true);
  loader.start("three", (signal) => {
    active = signal;
    return new Promise((resolve) =>
      signal.addEventListener("abort", () => resolve(), { once: true }),
    );
  });
  const controller = new AbortController();
  const navigation = loader.take("three", controller.signal);
  controller.abort();
  await expect(navigation).rejects.toThrow();
  expect(active.aborted).toBe(true);
});
