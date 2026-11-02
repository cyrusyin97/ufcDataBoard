import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import type {} from "../../src/lib/performance/client";
type TraceEvent = {
  name: string;
  ph: string;
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  args?: {
    data?: { url?: string; scriptName?: string; functionName?: string };
  };
};
test("native trace checks monitor callbacks during navigation and drag reversal", async ({
  page,
  browser,
  browserName,
}) => {
  test.skip(
    process.env.PERF_NATIVE !== "1" || browserName !== "chromium",
    "Explicit native tracing run only.",
  );
  test.setTimeout(180000);
  const results: unknown[] = [];
  mkdirSync("work/m7", { recursive: true });
  for (let iteration = 0; iteration < 3; iteration++)
    for (const enabled of [false, true]) {
      await page.goto(
        "/rankings?division=featherweight&selected=e1248941344b3288",
      );
      await page.waitForFunction(() => !!window.__ufcPerf);
      const scripts = new Set<string>();
      const request = (r: import("@playwright/test").Request) => {
        if (r.resourceType() === "script") scripts.add(r.url());
      };
      page.on("request", request);
      if (enabled) await page.evaluate(() => window.__ufcPerf!.start());
      page.off("request", request);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Tracing.start", {
        categories: "devtools.timeline,disabled-by-default-devtools.timeline",
        transferMode: "ReturnAsStream",
      });
      await page
        .getByRole("button", { name: "Next fighter", exact: true })
        .click();
      await expect(page.locator("main")).toHaveAttribute(
        "data-phase",
        "rankings",
      );
      await expect(page.locator("main")).toHaveAttribute(
        "data-motion-stage",
        "idle",
      );
      const box = await page.getByRole("listbox").boundingBox();
      expect(box).not.toBeNull();
      const x = box!.x + box!.width * 0.5,
        y = box!.y + box!.height * 0.6;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x, y - 190, { steps: 15 });
      await page.mouse.move(x, y + 90, { steps: 15 });
      await page.mouse.up();
      await expect(page.locator("main")).toHaveAttribute(
        "data-phase",
        "rankings",
      );
      await expect(page.locator("main")).toHaveAttribute(
        "data-motion-stage",
        "idle",
      );
      await page.locator('a[aria-label^="Open recorded history for"]').click();
      await expect(page.locator("main")).toHaveAttribute(
        "data-phase",
        "history",
      );
      await page.locator('a[aria-label^="Open recent bout:"]').first().click();
      await expect(page.locator("main")).toHaveAttribute("data-phase", "bout");
      await page
        .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
        .click();
      await expect(page.locator("main")).toHaveAttribute(
        "data-phase",
        "history",
      );
      const finished = new Promise<{ stream?: string }>((resolve) =>
        cdp.once("Tracing.tracingComplete", resolve),
      );
      await cdp.send("Tracing.end");
      const { stream } = await finished;
      expect(stream).toBeTruthy();
      let raw = "";
      while (true) {
        const chunk = await cdp.send("IO.read", { handle: stream! });
        raw += chunk.base64Encoded
          ? Buffer.from(chunk.data, "base64").toString()
          : chunk.data;
        if (chunk.eof) break;
      }
      await cdp.send("IO.close", { handle: stream! });
      await cdp.detach();
      writeFileSync(
        `work/m7/native-${iteration}-${enabled ? "on" : "off"}.json`,
        raw,
      );
      const trace = JSON.parse(raw) as { traceEvents: TraceEvent[] };
      const calls = trace.traceEvents.filter(
        (e) =>
          e.ph === "X" &&
          e.name === "FunctionCall" &&
          scripts.has(e.args?.data?.url ?? e.args?.data?.scriptName ?? ""),
      );
      const durations = calls.map((e) => (e.dur ?? 0) / 1000);
      const tasks = trace.traceEvents.filter(
        (e) => e.ph === "X" && e.name === "RunTask" && (e.dur ?? 0) > 50000,
      );
      results.push({
        iteration,
        enabled,
        monitorScriptPaths: [...scripts].map((u) => new URL(u).pathname),
        monitorCalls: durations.length,
        maxMonitorCallMs: durations.length ? Math.max(...durations) : null,
        monitorCallsAbove50: durations.filter((n) => n > 50).length,
        longTasks: tasks.length,
        longTasksWithMonitorCall: tasks.filter((t) =>
          calls.some(
            (c) =>
              c.pid === t.pid &&
              c.tid === t.tid &&
              c.ts >= t.ts &&
              c.ts < t.ts + t.dur!,
          ),
        ).length,
      });
      if (enabled) {
        await page.evaluate(() => window.__ufcPerf!.stop());
        const capture = await page.evaluate(() => window.__ufcPerf!.export());
        writeFileSync(
          `work/m7/native-capture-${iteration}.json`,
          JSON.stringify(capture),
        );
      }
    }
  writeFileSync(
    "work/m7/native-summary.json",
    JSON.stringify(
      {
        browserVersion: browser.version(),
        scope:
          "Three repetitions per mode; fresh application stores; existing browser HTTP cache; native next, drag reversal, history/bout return",
        limitations: [
          "Function-call attribution covers lazy monitor chunks, not the small initial bootstrap",
          "A long task containing a monitor callback does not establish causation",
          "No controlled cold HTTP-cache timing",
        ],
        results,
      },
      null,
      2,
    ),
  );
});
