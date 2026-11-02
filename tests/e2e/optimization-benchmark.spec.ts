import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import type {} from "../../src/lib/performance/client";
// This independent probe runs in both groups. It is not part of the app bundle.
async function arm(page: Page, target: string) {
  await page.evaluate((target) => {
    const w = window as unknown as { __bench: unknown };
    const frames: number[] = [];
    let start = 0,
      last = 0;
    const click = () => {
      start = performance.now();
      requestAnimationFrame(tick);
    };
    const tick = (at: number) => {
      if (last) frames.push(at - last);
      last = at;
      const main = document.querySelector("main");
      if (
        (location.search.includes(target) &&
          main?.getAttribute("data-motion-stage") === "idle" &&
          !["preparing", "transitioning"].includes(
            main?.getAttribute("data-phase") ?? "",
          )) ||
        at - start > 15000
      ) {
        w.__bench = {
          duration: at - start,
          frames,
          timeout: at - start > 15000,
        };
        return;
      }
      requestAnimationFrame(tick);
    };
    w.__bench = null;
    document.addEventListener("click", click, { once: true, capture: true });
  }, target);
}
test("optimization warm journey receipt", async ({
  page,
  browserName,
}, info) => {
  test.skip(
    !process.env.PERF_OPT,
    "Run explicitly after the functional checks.",
  );
  test.setTimeout(600000);
  const rows: unknown[] = [];
  const captures: unknown[] = [];
  const cdp =
    browserName === "chromium"
      ? await page.context().newCDPSession(page)
      : null;
  await cdp?.send("Performance.enable");
  await page.goto("/rankings?division=featherweight&selected=e1248941344b3288");
  await page.waitForFunction(() => !!window.__ufcPerf);
  const run = async (
    scene: string,
    enabled: boolean,
    iteration: number,
    selector: string,
    target: string,
  ) => {
    const before = await cdp?.send("Performance.getMetrics");
    await arm(page, target);
    await page.locator(selector).first().click();
    await page.waitForFunction(
      () => (window as unknown as { __bench: unknown }).__bench !== null,
    );
    const probe = await page.evaluate(
      () => (window as unknown as { __bench: unknown }).__bench,
    );
    const after = await cdp?.send("Performance.getMetrics");
    if (iteration >= 0)
      rows.push({
        scene,
        enabled,
        iteration,
        probe,
        before: before?.metrics,
        after: after?.metrics,
      });
  };
  // One continuous page keeps HTTP and application-store cache conditions comparable.
  for (let iteration = -2; iteration < 20; iteration++) {
    for (const enabled of [true]) {
      if (enabled) await page.evaluate(() => window.__ufcPerf!.start());
      await run(
        "dial-next",
        enabled,
        iteration,
        'button[aria-label="Next fighter"]',
        "selected=76e2870ffafbe38f",
      );
      await run(
        "dial-previous",
        enabled,
        iteration,
        'button[aria-label="Previous fighter"]',
        "selected=e1248941344b3288",
      );
      await run(
        "history-open",
        enabled,
        iteration,
        'a[aria-label="Open recorded history for Alexander Volkanovski"]',
        "view=history",
      );
      await run(
        "bout-open",
        enabled,
        iteration,
        'a[aria-label^="Open recent bout:"]',
        "view=bout",
      );
      await run(
        "bout-return",
        enabled,
        iteration,
        'button:has-text("← FIGHT HISTORY")',
        "view=history",
      );
      await run(
        "rankings-return",
        enabled,
        iteration,
        'button:has-text("Back to rankings")',
        "selected=e1248941344b3288",
      );
      if (enabled) {
        const capture = await page.evaluate(() => {
          window.__ufcPerf!.stop();
          return window.__ufcPerf!.export();
        });
        if (iteration >= 0) captures.push(capture);
      }
    }
  }
  const version = JSON.parse(
    readFileSync("public/data/current.json", "utf8"),
  ).datasetVersion;
  const receipt = {
    buildId: readFileSync(".next/BUILD_ID", "utf8"),
    candidate: process.env.PERF_OPT,
    date: new Date().toISOString(),
    datasetVersion: version,
    mode: "headless controlled warm application cache",
    browser: browserName,
    viewport: info.project.use.viewport,
    workerCount: 1,
    limitations: [
      "Not a cold HTTP cache comparison",
      "External animation-frame cadence is not GPU FPS",
      "No monitor-attributed native CPU trace",
      "No heap-retention proof",
      "No drag-reversal baseline",
    ],
    rows,
    captures,
  };
  mkdirSync("work/m8", { recursive: true });
  writeFileSync(
    `work/m8/${process.env.PERF_OPT}-warm.json`,
    JSON.stringify(receipt),
  );
  expect(rows.length).toBe(120);
  expect(
    rows.every((r) => !(r as { probe: { timeout: boolean } }).probe.timeout),
  ).toBe(true);
});
