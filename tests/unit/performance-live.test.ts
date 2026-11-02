import { expect, it } from "vitest";
import { LiveMetrics } from "../../src/lib/performance/live";
it("reports cadence from elapsed time, bounded windows, and unavailable task metrics", () => {
  const m = new LiveMetrics(false);
  expect(m.snapshot(0)).toMatchObject({
    fps: null,
    p95: null,
    longTasks: null,
  });
  for (let i = 0; i <= 60; i++) m.frame((i * 1000) / 60);
  expect(m.snapshot(1000).fps).toBeCloseTo(60);
  expect(m.snapshot(1000).p95).toBeCloseTo(1000 / 60);
  expect(m.snapshot(12000)).toMatchObject({ fps: null, samples: 0 });
  for (let i = 0; i < 3000; i++) m.frame(13000 + i);
  expect(m.snapshot(16000).samples).toBe(2048);
});
it("bounds long-task storage and expires completed tasks after ten seconds", () => {
  const m = new LiveMetrics(true);
  for (let i = 0; i < 300; i++) m.task(i, 60);
  expect(m.snapshot(1000).longTasks).toEqual({
    count: 256,
    total: 15360,
    max: 60,
    dropped: 44,
  });
  expect(m.snapshot(12000).longTasks).toMatchObject({
    count: 0,
    total: 0,
    max: 0,
  });
});
