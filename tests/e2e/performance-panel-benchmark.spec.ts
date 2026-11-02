import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import type {} from "../../src/lib/performance/client";
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

test("three-mode panel overhead receipt", async ({ page, browser }) => {
  test.skip(
    process.env.PERF_PANEL !== "1",
    "Explicit production overhead check",
  );
  test.setTimeout(360000);
  await page.goto("/rankings?division=featherweight&selected=e1248941344b3288");
  await page.waitForFunction(() => !!window.__ufcPerf);
  const rows: {
    mode: string;
    scene: string;
    duration: number;
    frames: number[];
    scriptMs: number;
  }[] = [];
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  const scriptTime = async () =>
    (await cdp.send("Performance.getMetrics")).metrics.find(
      (m: { name: string }) => m.name === "ScriptDuration",
    )!.value * 1000;
  const modes = ["off", "capture", "panel"];
  for (let iteration = -2; iteration < 20; iteration++) {
    const offset = (iteration + 3) % 3;
    for (const mode of [...modes.slice(offset), ...modes.slice(0, offset)]) {
      if (mode === "capture")
        await page.evaluate(() => window.__ufcPerf!.start());
      if (mode === "panel") {
        await page
          .locator("main")
          .click({ button: "right", position: { x: 3, y: 90 } });
        await page.getByRole("menuitem", { name: "Stats for nerds" }).click();
        await expect(
          page.getByRole("complementary", { name: "Stats for nerds" }),
        ).toContainText("Live · local only");
      }
      for (const [scene, target, label] of [
        ["dial-next", "selected=76e2870ffafbe38f", "Next fighter"],
        ["dial-previous", "selected=e1248941344b3288", "Previous fighter"],
      ]) {
        const before = await scriptTime();
        await arm(page, target);
        await page.getByRole("button", { name: label, exact: true }).click();
        await page.waitForFunction(
          () => (window as unknown as { __bench: unknown }).__bench !== null,
        );
        const probe = await page.evaluate(
          () =>
            (
              window as unknown as {
                __bench: {
                  duration: number;
                  frames: number[];
                  timeout: boolean;
                };
              }
            ).__bench,
        );
        expect(probe.timeout).toBe(false);
        const after = await scriptTime();
        if (iteration >= 0)
          rows.push({
            mode,
            scene,
            duration: probe.duration,
            frames: probe.frames,
            scriptMs: after - before,
          });
      }
      if (mode === "panel")
        await page.getByRole("button", { name: "Close diagnostics" }).click();
      else await page.evaluate(() => window.__ufcPerf!.stop());
    }
  }
  const stats = (v: number[]) => {
    const s = [...v].sort((a, b) => a - b);
    return {
      median: s[Math.ceil(s.length * 0.5) - 1],
      p95: s[Math.ceil(s.length * 0.95) - 1],
    };
  };
  const summary = modes.flatMap((mode) =>
    ["dial-next", "dial-previous"].map((scene) => {
      const group = rows.filter((r) => r.mode === mode && r.scene === scene);
      return {
        mode,
        scene,
        n: group.length,
        latency: stats(group.map((r) => r.duration)),
        frames: stats(group.flatMap((r) => r.frames)),
        scriptMs: stats(group.map((r) => r.scriptMs)),
      };
    }),
  );
  mkdirSync("work/m7", { recursive: true });
  writeFileSync(
    "work/m7/panel-overhead.json",
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: browser.version(),
        viewport: page.viewportSize(),
        warmups: 2,
        repetitions: 20,
        scope:
          "Warm dial next/previous only; off/capture/panel rotated; independent probe in all modes",
        summary,
        rows,
      },
      null,
      2,
    ),
  );
  expect(rows).toHaveLength(120);
});
