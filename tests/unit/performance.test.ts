import { describe, expect, it } from "vitest";
import { Recorder } from "../../src/lib/performance/recorder";
import { captureSchema } from "../../src/lib/performance/schema";
import { distribution } from "../../src/lib/performance/export";
const route = {
  view: "rankings" as const,
  divisionId: "featherweight",
  fighterId: "e1248941344b3288",
};
describe("bounded local diagnostics", () => {
  it("does not read its clock or create records when disabled", () => {
    const r = new Recorder(() => {
      throw new Error("clock read");
    });
    expect(r.begin(route, route)).toBeUndefined();
    expect(r.active.size).toBe(0);
  });
  it("measures overlapping spans, uses nearest-rank, and exports detached values", () => {
    let time = 100;
    const r = new Recorder(() => time);
    r.start();
    const c = r.begin(route, route)!;
    const a = c.span("prepare")!;
    time = 110;
    const b = c.span("fighter", "miss")!;
    time = 130;
    b();
    time = 140;
    a();
    c.mark("committed");
    c.mark("target");
    time = 150;
    r.frame(null);
    c.end("completed");
    r.stop();
    const data = r.export();
    expect(captureSchema.safeParse(data).success).toBe(true);
    expect(data.records[0].commitLatency).toBe(40);
    expect(data.records[0].settleLatency).toBe(50);
    expect(data.records[0].spans.map((s) => [s.start, s.end])).toEqual([
      [0, 40],
      [10, 30],
    ]);
    expect(data.records[0].marks.targetProxy).toBe(50);
    data.records[0].marks.committed = 999;
    expect(r.export().records[0].marks.committed).toBe(40);
    expect(distribution([1, 2, 3, 4, 50]).p95).toBe(50);
  });
  it("ignores stale callbacks and closes once", () => {
    let time = 0;
    const r = new Recorder(() => time);
    r.start();
    const old = r.begin(route, route)!;
    const end = old.span("fighter")!;
    time = 4;
    old.end("cancelled", "superseded");
    const next = r.begin(route, route)!;
    time = 8;
    end();
    old.end("completed");
    next.end("completed");
    r.stop();
    expect(r.records).toHaveLength(2);
    expect(r.records[0].spans[0].outcome).toBe("cancelled");
    expect(r.export().records[0].settleLatency).toBeNull();
  });
  it("bounds active, retained records and frames; reports loss", () => {
    let time = 0;
    const r = new Recorder(() => time);
    r.start();
    for (let i = 0; i < 17; i++) r.begin(route, route);
    expect(r.active.size).toBe(16);
    expect(r.losses.skipped).toBe(1);
    for (let i = 0; i < 4100; i++) {
      time += 1;
      r.frame(1);
    }
    expect([...r.active.values()][0].frames.length).toBe(4096);
    expect([...r.active.values()][0].frameTruncated).toBe(4);
    r.stop();
    r.start();
    for (let i = 0; i < 205; i++) r.begin(route, route)!.end("completed");
    expect(r.records.length).toBe(200);
    expect(r.losses.evicted).toBe(5);
  });
  it("marks timeout and stop as incomplete; rejects live export", () => {
    let time = 0;
    const r = new Recorder(() => time);
    r.start();
    r.begin(route, route);
    expect(() => r.export()).toThrow(/Stop/);
    time = 30001;
    r.frame(null);
    expect(r.records[0].reason).toBe("timeout");
    r.begin(route, route);
    r.stop("hidden");
    expect(r.records[1].outcome).toBe("incomplete");
    expect(r.records[1].reason).toBe("hidden");
  });
  it("links gesture to latest attempt and keeps only numeric long-frame summaries", () => {
    let time = 10;
    const r = new Recorder(() => time, true);
    r.start();
    r.inputEvent("wheel", 8, 0);
    const a = r.begin(route, route)!;
    a.generation(1);
    a.end("cancelled", "superseded");
    r.inputEvent("wheel", 9, 0);
    const b = r.begin(route, route)!;
    b.generation(2);
    time = 80;
    r.longFrame(11, 60);
    r.endGesture();
    b.end("completed");
    r.stop();
    expect(r.gestures[0].count).toBe(2);
    expect(r.gestures[0].outcome).toBe("completed");
    expect(r.records[1].longFrames).toEqual({ count: 1, duration: 60 });
    expect(r.records[1].handlerDelay).toBe(1);
  });
  it("captures target proxy on the next callback even for an immediate completed commit", () => {
    let time = 0;
    const r = new Recorder(() => time);
    r.start();
    const c = r.begin(route, route)!;
    c.mark("target");
    c.end("completed");
    time = 16;
    r.frame(null);
    r.stop();
    expect(r.records[0].marks.targetProxy).toBe(16);
  });
  it("sanitizes route fields and supports absent APIs", () => {
    const r = new Recorder(() => 0);
    r.start();
    r.begin(
      { ...route, fighterId: "private/path", divisionId: "https://bad.test" },
      route,
    )!.end("error", "request");
    r.stop();
    const data = r.export();
    expect(captureSchema.safeParse(data).success).toBe(true);
    expect(data.records[0].from?.fighter).toBeNull();
    expect(data.records[0].from?.division).toBeNull();
    expect(data.records[0].longFrames).toBeNull();
    expect(JSON.stringify(data)).not.toContain("private/path");
  });
});

it("isolates failures inside stage hooks", () => {
  let broken = false;
  const r = new Recorder(() => {
    if (broken) throw new Error("clock failed");
    return 0;
  });
  r.start();
  const c = r.begin(route, route)!;
  broken = true;
  expect(() => c.span("fighter")).not.toThrow();
  expect(r.enabled).toBe(false);
  expect(r.losses.failures).toBe(1);
});
