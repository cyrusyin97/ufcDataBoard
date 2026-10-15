import { test, expect } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
test("capture loading metrics, a browser trace, and responsive review screens", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "CDP capture uses Chromium.");
  test.setTimeout(60000);
  const bytes: Buffer[] = [];
  page.on("response", (response) => {
    if (
      response.url().includes("/_next/static/") &&
      response.url().endsWith(".js")
    )
      void response
        .body()
        .then((body) => bytes.push(body))
        .catch(() => {});
  });
  await page.addInitScript(() => {
    const metrics = {
      lcp: 0,
      cls: 0,
      interactions: [] as number[],
      longTasks: [] as number[],
    };
    Object.defineProperty(window, "m4LabMetrics", { value: metrics });
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => {
        metrics.lcp = entry.startTime;
      }),
    ).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => {
        if (
          !(entry as PerformanceEntry & { hadRecentInput: boolean })
            .hadRecentInput
        )
          metrics.cls += (entry as PerformanceEntry & { value: number }).value;
      }),
    ).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((list) =>
      list
        .getEntries()
        .forEach((entry) => metrics.longTasks.push(entry.duration)),
    ).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((list) =>
      list.getEntries().forEach((entry) => {
        if (
          (entry as PerformanceEntry & { interactionId: number }).interactionId
        )
          metrics.interactions.push(entry.duration);
      }),
    ).observe({
      type: "event",
      buffered: true,
      durationThreshold: 16,
    } as PerformanceObserverInit);
  });
  const session = await page.context().newCDPSession(page);
  await session.send("Tracing.start", {
    categories: "devtools.timeline,blink.user_timing,cc,benchmark,toplevel",
    transferMode: "ReturnAsStream",
  });
  await page.goto("/rankings");
  const idle = async () => {
    await expect(page.locator("main")).toHaveAttribute(
      "data-motion-stage",
      "idle",
    );
    await expect(page.locator("main")).toHaveAttribute(
      "data-phase",
      /^(rankings|history)$/,
    );
  };
  await page
    .locator("[data-media-role] img")
    .evaluate((image) => (image as HTMLImageElement).decode());
  await page.waitForTimeout(100);
  const initialGzipBytes = bytes.reduce(
    (sum, value) => sum + gzipSync(value).length,
    0,
  );
  await page.getByLabel("Weight division").selectOption("lightweight");
  await idle();
  await page.getByLabel("Weight division").selectOption("featherweight");
  await idle();
  await page
    .getByRole("link", {
      name: "Open recorded history for Alexander Volkanovski",
    })
    .click();
  await idle();
  await page.locator('[data-opponent-id="f166e93d04a8c274"]').first().hover();
  await expect(page.getByRole("dialog").getByRole("heading")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Open recorded history" })
    .click();
  await idle();
  const lab = await page.evaluate(
    () => (window as unknown as { m4LabMetrics: unknown }).m4LabMetrics,
  );
  const completed = new Promise<{ stream: string }>((resolve) =>
    session.once("Tracing.tracingComplete", (payload) =>
      resolve({ stream: payload.stream! }),
    ),
  );
  await session.send("Tracing.end");
  const { stream } = await completed;
  let trace = "";
  while (true) {
    const part = await session.send("IO.read", { handle: stream });
    trace += part.data;
    if (part.eof) break;
  }
  await session.send("IO.close", { handle: stream });
  writeFileSync("test-results/m4-performance-trace.json.gz", gzipSync(trace));
  const events = JSON.parse(trace).traceEvents as {
    name: string;
    dur?: number;
    ts: number;
    pid: number;
    tid: number;
  }[];
  const frameThreads = new Map<string, typeof events>();
  for (const event of events.filter(
    (e) => e.name === "Scheduler::BeginFrame",
  )) {
    const key = `${event.pid}:${event.tid}`;
    frameThreads.set(key, [...(frameThreads.get(key) ?? []), event]);
  }
  const [frameThread, frames] = [...frameThreads.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )[0] ?? [null, []];
  frames.sort((a, b) => a.ts - b.ts);
  const intervals = frames
    .map((e, i) => (i ? (e.ts - frames[i - 1].ts) / 1000 : 0))
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  const tasks = events.filter((e) => e.name.includes("RunTask"));
  const longTasks = tasks.filter((e) => (e.dur ?? 0) > 50000);
  const evidence = {
    browser: page.context().browser()?.version(),
    runtime: process.version,
    platform: process.platform,
    viewport: page.viewportSize(),
    initialGzipBytes,
    lab,
    trace: {
      events: events.length,
      schedulerThread: frameThread,
      schedulerFrames: frames.length,
      schedulerMedianMs: intervals[Math.floor(intervals.length / 2)] ?? null,
      schedulerP95Ms: intervals[Math.floor(intervals.length * 0.95)] ?? null,
      droppedBeginFrames: events.filter(
        (e) => e.name === "Scheduler::BeginFrameDropped",
      ).length,
      taskEventsAvailable: tasks.length > 0,
      longTasks: longTasks.length,
      maximumTaskMs: Math.max(0, ...longTasks.map((e) => (e.dur ?? 0) / 1000)),
    },
    note: "Headless lab measurements. Scheduler cadence does not certify native 60 FPS or field INP.",
  };
  writeFileSync(
    "test-results/m4-performance.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/rankings");
  await idle();
  await page.locator("img").evaluateAll(async (elements) => {
    elements.forEach((el) => {
      (el as HTMLImageElement).loading = "eager";
    });
    await Promise.all(
      elements.map((el) => (el as HTMLImageElement).decode().catch(() => {})),
    );
  });
  await page.screenshot({
    path: "test-results/m4-mobile-home.png",
    fullPage: true,
  });
  await page
    .getByRole("link", {
      name: "Open recorded history for Alexander Volkanovski",
    })
    .click();
  await idle();
  await page.screenshot({
    path: "test-results/m4-mobile-history.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Preview Diego Lopes", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog").getByRole("heading")).toBeVisible();
  await page.screenshot({ path: "test-results/m4-mobile-preview.png" });
});
