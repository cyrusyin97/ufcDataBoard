import { afterEach, expect, it, vi } from "vitest";
import { Recorder } from "../../src/lib/performance/recorder";
import { observe } from "../../src/lib/performance/frames";
import { installPerformance } from "../../src/lib/performance/client";
function environment() {
  const doc = Object.assign(new EventTarget(), { hidden: false });
  const win = new EventTarget();
  const callbacks = new Map<number, FrameRequestCallback>();
  let serial = 0;
  vi.stubGlobal("document", doc);
  vi.stubGlobal("window", win);
  vi.stubGlobal("PerformanceObserver", undefined);
  vi.stubGlobal("requestAnimationFrame", (fn: FrameRequestCallback) => {
    callbacks.set(++serial, fn);
    return serial;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => callbacks.delete(id));
  vi.stubGlobal("innerWidth", 1200);
  vi.stubGlobal("innerHeight", 800);
  vi.stubGlobal("devicePixelRatio", 1);
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  return { doc, win, callbacks };
}
afterEach(() => {
  vi.unstubAllGlobals();
});
it("idle capture has no frame loop; stopping removes callbacks and input listeners", () => {
  const { doc, callbacks } = environment();
  const r = new Recorder(() => 0);
  r.start();
  const o = observe(r);
  expect(callbacks.size).toBe(0);
  r.begin(null, null);
  o.wake();
  o.wake();
  expect(callbacks.size).toBe(1);
  o.stop();
  expect(callbacks.size).toBe(0);
  doc.dispatchEvent(new Event("wheel"));
  expect(r.gestures).toHaveLength(0);
  expect(r.active.size).toBe(0);
});
it("hidden document stops capture without touching product actions", () => {
  const { doc, callbacks } = environment();
  const r = new Recorder(() => 0);
  r.start();
  const o = observe(r);
  r.begin(null, null);
  o.wake();
  doc.hidden = true;
  doc.dispatchEvent(new Event("visibilitychange"));
  expect(r.enabled).toBe(false);
  expect(callbacks.size).toBe(0);
  expect(r.records[0].reason).toBe("hidden");
});
it("stop wins over a pending lazy start and unmount removes the adapter", async () => {
  environment();
  const dispose = installPerformance("test");
  const starting = window.__ufcPerf!.start();
  window.__ufcPerf!.stop();
  await starting;
  expect(window.__ufcPerf!.status()).toMatchObject({ enabled: false });
  dispose();
  expect(window.__ufcPerf).toBeUndefined();
});
it("a failed collector cannot interrupt the application callback", () => {
  environment();
  const r = new Recorder(() => 0);
  r.start();
  const o = observe(r);
  vi.spyOn(r, "inputEvent").mockImplementation(() => {
    throw new Error("collector failure");
  });
  expect(() => document.dispatchEvent(new Event("click"))).not.toThrow();
  expect(r.enabled).toBe(false);
  expect(r.losses.failures).toBeGreaterThan(0);
  o.stop();
});
it("live display shares one sampler, stops on resize, and does not add idle journey frames", () => {
  const { win, callbacks } = environment();
  const r = new Recorder(() => 0);
  r.start();
  const o = observe(r);
  o.enableLive();
  o.enableLive();
  expect(callbacks.size).toBe(1);
  const [id, tick] = [...callbacks][0];
  callbacks.delete(id);
  tick(100);
  expect(callbacks.size).toBe(1);
  o.wake();
  expect(callbacks.size).toBe(1);
  win.dispatchEvent(new Event("resize"));
  expect(callbacks.size).toBe(0);
  expect(r.enabled).toBe(false);
  expect(r.export().runFrameSummary.count).toBe(0);
});
