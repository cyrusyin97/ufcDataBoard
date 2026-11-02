import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import type {} from "../../src/lib/performance/client";
test("dial feedback under controlled request delay", async ({ page }) => {
  test.skip(!process.env.PERF_OPT, "Explicit before/after receipt");
  const samples: unknown[] = [];
  for (let i = 0; i < 10; i++) {
    await page.goto(
      "/rankings?division=featherweight&selected=e1248941344b3288",
    );
    await page.route("**/fighters/76e2870ffafbe38f.json", async (route) => {
      await new Promise((r) => setTimeout(r, 250));
      await route.continue();
    });
    await page.evaluate(() => window.__ufcPerf!.start());
    await page.evaluate(() => {
      const row = document.querySelector(
        '[data-fighter-id="76e2870ffafbe38f"]',
      )!;
      const y = row.getBoundingClientRect().y;
      const w = window as unknown as {
        __feedback: { delay: number; profile: string | null } | null;
      };
      w.__feedback = null;
      document.addEventListener(
        "click",
        () => {
          const start = performance.now();
          const tick = () => {
            if (Math.abs(row.getBoundingClientRect().y - y) > 1) {
              w.__feedback = {
                delay: performance.now() - start,
                profile:
                  document
                    .querySelector("[data-selected-fighter]")
                    ?.getAttribute("data-selected-fighter") ?? null,
              };
              return;
            }
            if (performance.now() - start < 5000) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        },
        { once: true, capture: true },
      );
    });
    await page
      .getByRole("button", { name: "Next fighter", exact: true })
      .click();
    await page.waitForFunction(
      () => (window as unknown as { __feedback: unknown }).__feedback !== null,
    );
    await expect(page.locator("main")).toHaveAttribute(
      "data-phase",
      "rankings",
    );
    samples.push(
      await page.evaluate(() => {
        window.__ufcPerf!.stop();
        return {
          feedback: (window as unknown as { __feedback: unknown }).__feedback,
          capture: window.__ufcPerf!.export(),
        };
      }),
    );
    await page.unrouteAll();
  }
  mkdirSync("work/m8", { recursive: true });
  writeFileSync(
    `work/m8/${process.env.PERF_OPT}-feedback.json`,
    JSON.stringify(
      {
        condition:
          "250ms fighter response delay, fresh page/app store; 10 trials; not production latency",
        samples,
      },
      null,
      2,
    ),
  );
});
test("first recent bout under controlled JSON response delay", async ({
  page,
}) => {
  test.skip(!process.env.PERF_OPT, "Explicit before/after receipt");
  test.setTimeout(120000);
  const samples: unknown[] = [];
  for (let i = 0; i < 10; i++) {
    await page.goto(
      "/rankings?division=featherweight&selected=e1248941344b3288",
    );
    await page.route("**/data/v1/**/*.json", async (route) => {
      await new Promise((r) => setTimeout(r, 100));
      await route.continue();
    });
    await page.evaluate(() => window.__ufcPerf!.start());
    await page
      .getByRole("link", { name: /Open recent bout:/ })
      .first()
      .click();
    await expect(page.locator("main")).toHaveAttribute("data-phase", "bout");
    samples.push(
      await page.evaluate(() => {
        window.__ufcPerf!.stop();
        return window.__ufcPerf!.export();
      }),
    );
    await page.unrouteAll();
  }
  mkdirSync("work/m8", { recursive: true });
  writeFileSync(
    `work/m8/${process.env.PERF_OPT}-first-bout.json`,
    JSON.stringify(
      {
        condition:
          "100ms per JSON response, fresh application stores, existing HTTP cache; 10 trials; not production latency",
        samples,
      },
      null,
      2,
    ),
  );
});
