import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const fighter = "76e2870ffafbe38f",
  bout = "346e3897c2ead99a";
const history = `/rankings?division=featherweight&fighter=${fighter}&view=history`;
const stage = (page: Page) => page.locator("main");
const idle = async (page: Page, view: string) => {
  await expect(stage(page)).toHaveAttribute("data-phase", view);
  await expect(stage(page)).toHaveAttribute("data-motion-stage", "idle");
};
test.beforeEach(async ({ request }) => {
  const version =
    process.env.UFC_PREVIEW_DATASET_VERSION ??
    JSON.parse(readFileSync("public/data/current.json", "utf8")).datasetVersion;
  const manifest = await (
    await request.get(`/data/v1/${version}/manifest.json`)
  ).json();
  test.skip(!manifest.boutAnalysis, "Dataset has no bout analysis.");
});
async function captureFrames(page: Page) {
  await page.evaluate(() => {
    const root = document.querySelector("main")!;
    const state = {
      frames: [] as {
        stage: string;
        kind: string | undefined;
        time: number;
        portrait: { x: number; y: number; width: number; height: number };
        glyph: { x: number; y: number; width: number; height: number } | null;
        node: Element | null;
      }[],
    };
    Object.defineProperty(window, "boutMotionFrames", {
      value: state,
      configurable: true,
    });
    const rect = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    };
    let running = true;
    const tick = () => {
      if (!running) return;
      const image = root.querySelector("[data-media-role] > img")!,
        title = root.querySelector(
          '#bout-heading [data-motion-glyph], [data-bout-title="346e3897c2ead99a"] [data-motion-glyph]',
        );
      if (image)
        state.frames.push({
          stage: (root as HTMLElement).dataset.motionStage!,
          kind: (root as HTMLElement).dataset.motionKind,
          time: performance.now(),
          portrait: rect(image),
          glyph: title ? rect(title) : null,
          node: title,
        });
      requestAnimationFrame(tick);
    };
    tick();
    Object.defineProperty(window, "stopBoutFrames", {
      value: () => (running = false),
      configurable: true,
    });
  });
}

test("history to bout and back smoothly scale the live portrait and move the event title", async ({
  page,
}) => {
  await page.goto(history);
  await idle(page, "history");
  const event = page.locator(`[data-bout-title="${bout}"]`);
  await event.scrollIntoViewIfNeeded();
  const scroll = await page
    .locator("[data-history-scroll]")
    .evaluate((e) => e.scrollTop);
  const source = await page.locator("[data-media-role] > img").boundingBox();
  await captureFrames(page);
  await event.click();
  await expect(stage(page)).toHaveAttribute("data-motion-kind", "bout-open");
  await idle(page, "bout");
  await expect(page.locator("#bout-heading")).toHaveText(
    "UFC Fight Night: Evloev vs. Murphy",
  );
  const open = await page.evaluate(() => {
    const w = window as unknown as {
      boutMotionFrames: {
        frames: {
          stage: string;
          kind: string;
          portrait: { height: number };
          glyph: { y: number } | null;
          node: Element | null;
        }[];
      };
      stopBoutFrames: () => void;
    };
    w.stopBoutFrames();
    const frames = w.boutMotionFrames.frames.filter(
      (f) => f.kind === "bout-open" && f.stage === "arriving",
    );
    return {
      heights: frames.map((f) => f.portrait.height),
      ys: frames.flatMap((f) => (f.glyph ? [f.glyph.y] : [])),
      sameFinalNodes: frames.every(
        (f) =>
          f.node ===
          document.querySelector("#bout-heading [data-motion-glyph]"),
      ),
    };
  });
  const large = await page.locator("[data-media-role] > img").boundingBox();
  expect(large!.height).toBeGreaterThan(source!.height * 1.15);
  expect(
    new Set(open.heights.map((h) => Math.round(h))).size,
  ).toBeGreaterThanOrEqual(3);
  expect(Math.max(...open.heights) - Math.min(...open.heights)).toBeGreaterThan(
    50,
  );
  expect(Math.max(...open.ys) - Math.min(...open.ys)).toBeGreaterThan(20);
  expect(open.sameFinalNodes).toBe(true);
  await captureFrames(page);
  await page
    .getByRole("region", { name: "Bout analysis", exact: true })
    .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
    .click();
  await idle(page, "history");
  const returned = await page.locator("[data-media-role] > img").boundingBox();
  expect(Math.abs(returned!.height - source!.height)).toBeLessThan(1);
  expect(
    await page.locator("[data-history-scroll]").evaluate((e) => e.scrollTop),
  ).toBeCloseTo(scroll, 0);
  const reverse = await page.evaluate(() => {
    const w = window as unknown as {
      boutMotionFrames: {
        frames: {
          stage: string;
          kind: string;
          portrait: { height: number };
          glyph: { y: number } | null;
          node: Element | null;
        }[];
      };
      stopBoutFrames: () => void;
    };
    w.stopBoutFrames();
    const f = w.boutMotionFrames.frames.filter(
      (f) => f.kind === "bout-return" && f.stage === "arriving",
    );
    return {
      heights: f.map((x) => x.portrait.height),
      ys: f.flatMap((x) => (x.glyph ? [x.glyph.y] : [])),
      sameFinalNodes: f.every(
        (x) =>
          x.node ===
          document.querySelector(
            '[data-bout-title="346e3897c2ead99a"] [data-motion-glyph]',
          ),
      ),
    };
  });
  expect(
    new Set(reverse.heights.map((h) => Math.round(h))).size,
  ).toBeGreaterThanOrEqual(3);
  expect(reverse.heights[0]).toBeGreaterThan(reverse.heights.at(-1)!);
  expect(reverse.ys[0]).toBeLessThan(reverse.ys.at(-1)!);
  expect(reverse.sameFinalNodes).toBe(true);
  await expect(page.locator("[data-motion-overlay]")).toHaveCount(0);
  expect(
    await page
      .locator("[data-media-role]")
      .evaluate((e) => getComputedStyle(e).opacity),
  ).toBe("1");
});

test("return restores a later event row before measuring the reverse title flight", async ({
  page,
}) => {
  await page.goto(history);
  await idle(page, "history");
  const later = page.locator("[data-bout-title]").nth(5);
  const id = await later.getAttribute("data-bout-title");
  await later.scrollIntoViewIfNeeded();
  const scroll = await page
    .locator("[data-history-scroll]")
    .evaluate((e) => e.scrollTop);
  expect(scroll).toBeGreaterThan(0);
  await later.click();
  await idle(page, "bout");
  await page
    .getByRole("region", { name: "Bout analysis", exact: true })
    .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
    .click();
  await idle(page, "history");
  expect(
    await page.locator("[data-history-scroll]").evaluate((e) => e.scrollTop),
  ).toBeCloseTo(scroll, 0);
  await expect(page.locator(`[data-bout-title="${id}"]`)).toBeInViewport();
});

test("resize and reduced motion leave no stale portrait or title transforms", async ({
  page,
}) => {
  await page.goto(history);
  await idle(page, "history");
  await page.locator(`[data-bout-title="${bout}"]`).click();
  await expect(stage(page)).toHaveAttribute("data-motion-stage", "arriving");
  await page.setViewportSize({ width: 1100, height: 850 });
  await idle(page, "bout");
  expect(
    await page
      .locator("[data-media-role] > img")
      .evaluate((e) => getComputedStyle(e).transform),
  ).toBe("none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page
    .getByRole("region", { name: "Bout analysis", exact: true })
    .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
    .click();
  await idle(page, "history");
  await expect(page.locator("[data-motion-overlay]")).toHaveCount(0);
  expect(
    await page
      .locator("[data-media-role]")
      .evaluate((e) => getComputedStyle(e).opacity),
  ).toBe("1");
});

test("result badges and recent form open internal bout details with a history parent", async ({
  page,
}) => {
  await page.goto(
    "/rankings?division=heavyweight&fighter=787bb1f087ccff8a&view=history",
  );
  await idle(page, "history");
  const title = page.locator("[data-bout-title]").first();
  const family = await title.evaluate((e) => getComputedStyle(e).fontFamily);
  await page
    .getByRole("link", {
      name: "Open bout result: UFC Freedom 250",
      exact: true,
    })
    .click();
  await idle(page, "bout");
  expect(
    await page
      .locator("#bout-heading")
      .evaluate((e) => getComputedStyle(e).fontFamily),
  ).toBe(family);
  await page
    .getByRole("link", { name: /Open recent bout:/ })
    .nth(1)
    .click();
  await idle(page, "bout");
  await expect(page.locator("#bout-heading")).toHaveText(
    "UFC 321: Aspinall vs. Gane",
  );
  await page
    .getByRole("region", { name: "Bout analysis", exact: true })
    .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
    .click();
  await idle(page, "history");
  await page
    .getByRole("button", { name: "Back to rankings", exact: false })
    .click();
  await idle(page, "rankings");
  await page
    .getByRole("link", {
      name: "Open recent bout: UFC Freedom 250",
      exact: true,
    })
    .click();
  await idle(page, "bout");
  await page
    .getByRole("region", { name: "Bout analysis", exact: true })
    .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
    .click();
  await idle(page, "history");
});

test("return stays visible while bout content scrolls and radar inspection uses separate rows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1169, height: 670 });
  await page.goto(
    "/rankings?division=heavyweight&fighter=fa6796c55d6c5440&view=bout&bout=606639bf387f60e2&round=all",
  );
  await idle(page, "bout");
  const scroll = page.locator("[data-bout-scroll]");
  const back = page
    .getByRole("region", { name: "Bout analysis", exact: true })
    .getByRole("button", { name: "← FIGHT HISTORY", exact: true });
  const before = await back.boundingBox();
  await scroll.evaluate((e) => {
    e.scrollTop = 250;
  });
  expect((await back.boundingBox())!.y).toBeCloseTo(before!.y, 0);
  await page.evaluate(() => window.scrollTo(0, 300));
  await expect(back).toBeInViewport();
  const line = page.locator("[data-radar-series]").first();
  await line.scrollIntoViewIfNeeded();
  await line.hover({ force: true });
  const inspection = page.locator("[data-radar-inspection]");
  await expect(inspection.locator("dl > div")).not.toHaveCount(0);
  const rows = await inspection
    .locator("dl > div")
    .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().y));
  expect(rows.length).toBeGreaterThan(1);
  expect(rows[1]).toBeGreaterThan(rows[0]);
  await back.click();
  await idle(page, "history");
});

test("scrolled bout return preserves the viewport through every animation frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1169, height: 670 });
  for (const reduced of [false, true]) {
    await page.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await page.goto(
      "/rankings?division=heavyweight&fighter=955da1675ad58a50&view=bout&bout=30cdb851f6c63444&round=all",
    );
    await idle(page, "bout");
    await page.evaluate(async () => {
      window.scrollTo(0, 240);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
      const samples = { ys: [scrollY], running: true };
      Object.defineProperty(window, "viewportSamples", {
        value: samples,
        configurable: true,
      });
      const sample = () => {
        if (samples.running) {
          samples.ys.push(scrollY);
          requestAnimationFrame(sample);
        }
      };
      sample();
    });
    await page
      .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
      .click();
    await idle(page, "history");
    // Cover browser restoration and a delayed clamp after motion cleanup.
    await page.waitForTimeout(150);
    const ys = await page.evaluate(() => {
      const samples = (
        window as unknown as {
          viewportSamples: { ys: number[]; running: boolean };
        }
      ).viewportSamples;
      samples.running = false;
      return [...samples.ys, scrollY];
    });
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(239);
    expect(Math.max(...ys)).toBeLessThanOrEqual(241);
    await page.goForward();
    await idle(page, "bout");
    await page.evaluate(() => window.scrollTo(0, 320));
    await page.goBack();
    await idle(page, "history");
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(320, 0);
    await expect(
      page.locator('[data-bout-title="30cdb851f6c63444"]'),
    ).toBeInViewport();
  }
});
