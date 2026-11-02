import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import type {} from "../../src/lib/performance/client";
test("measure shortened forward entry transitions", async ({
  page,
  browser,
}) => {
  test.skip(process.env.PERF_ENTRY !== "1", "Explicit local timing receipt");
  test.setTimeout(120000);
  await page.goto("/rankings?division=featherweight&selected=e1248941344b3288");
  await page.waitForFunction(() => !!window.__ufcPerf);
  const captures: unknown[] = [];
  for (let i = -1; i < 10; i++) {
    await page.evaluate(() => window.__ufcPerf!.start());
    await page
      .getByRole("link", {
        name: "Open recorded history for Alexander Volkanovski",
        exact: true,
      })
      .click();
    await expect(page.locator("main")).toHaveAttribute("data-phase", "history");
    await page
      .getByRole("link", { name: /Open recent bout:/ })
      .first()
      .click();
    await expect(page.locator("main")).toHaveAttribute("data-phase", "bout");
    const capture = await page.evaluate(() => {
      window.__ufcPerf!.stop();
      return window.__ufcPerf!.export();
    });
    if (i >= 0) captures.push(capture);
    await page
      .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
      .click();
    await expect(page.locator("main")).toHaveAttribute("data-phase", "history");
    await page.getByRole("button", { name: /Back to rankings/i }).click();
    await expect(page.locator("main")).toHaveAttribute(
      "data-phase",
      "rankings",
    );
  }
  mkdirSync("work/m8", { recursive: true });
  writeFileSync(
    "work/m8/entry-timing.json",
    JSON.stringify(
      {
        date: "2026-11-02",
        browser: browser.version(),
        buildId: readFileSync(".next/BUILD_ID", "utf8"),
        viewport: page.viewportSize(),
        warmups: 1,
        captures,
      },
      null,
      2,
    ),
  );
  expect(captures).toHaveLength(10);
});
