import { chooseDivision } from "./helpers/division";
import { test, expect, type Page } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
const champion = "e1248941344b3288",
  opponent = "f166e93d04a8c274";
const home = "/rankings";
const detail = `/rankings?division=featherweight&fighter=${champion}&view=history`;
const root = (page: Page) => page.locator("main");
const idle = async (page: Page) => {
  await expect(root(page)).toHaveAttribute("data-motion-stage", "idle");
  await expect(root(page)).toHaveAttribute(
    "data-phase",
    /^(rankings|history)$/,
  );
};
async function clean(page: Page) {
  await idle(page);
  expect(await page.locator("[data-motion-overlay]").count()).toBe(0);
  expect(
    await page
      .locator(
        "[data-motion-glyph], [data-row-drawer], [data-motion=category-heading], [data-profile-fighter], [data-selected-fighter]",
      )
      .evaluateAll((elements) =>
        elements
          .filter(
            (el) =>
              (el as HTMLElement).style.transform ||
              (el as HTMLElement).style.opacity,
          )
          .map((el) => el.outerHTML.slice(0, 100)),
      ),
  ).toEqual([]);
}
test("category drawers cross both viewport edges and settle without residual styles", async ({
  page,
}, testInfo) => {
  await page.goto(home);
  await idle(page);
  const samples: unknown[] = [];
  for (const division of [
    "lightweight",
    "featherweight",
    "lightweight",
    "featherweight",
  ]) {
    await page.evaluate(() => {
      const probe = window as unknown as { m4Departure: unknown };
      probe.m4Departure = null;
      const deadline = performance.now() + 10000;
      const sample = () => {
        const heading = document
          .querySelector("#division-heading")!
          .getBoundingClientRect();
        const profile = document
          .querySelector("[data-profile-fighter]")!
          .getBoundingClientRect();
        if (
          document.querySelector<HTMLElement>("main")!.dataset.motionStage ===
            "departing" &&
          heading.right < 0 &&
          profile.left > innerWidth
        ) {
          probe.m4Departure = {
            stage: "departure",
            heading: heading.toJSON(),
            profile: profile.toJSON(),
            rows: Array.from(document.querySelectorAll("[data-row-drawer]"))
              .filter((el) => getComputedStyle(el).visibility !== "hidden")
              .map((el) => el.getBoundingClientRect().right),
          };
        } else if (performance.now() < deadline) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    await chooseDivision(page, division);
    await expect(page.getByLabel("Weight division")).toBeDisabled();
    if (!samples.length)
      await page.screenshot({
        path: `test-results/m4-category-departure-${testInfo.project.name}.png`,
      });
    await page.waitForFunction(
      () => !!(window as unknown as { m4Departure: unknown }).m4Departure,
    );
    const departure = await page.evaluate(
      () =>
        (window as unknown as { m4Departure: { rows: number[] } }).m4Departure,
    );
    departure.rows.forEach((right) => expect(right).toBeLessThan(0));
    samples.push(departure);

    await expect(page.locator("#division-heading")).toContainText(
      division === "lightweight" ? "Lightweight" : "Featherweight",
    );
    if (samples.length === 1)
      await page.screenshot({
        path: `test-results/m4-category-arrival-${testInfo.project.name}.png`,
      });
    await clean(page);
    if (samples.length === 1)
      await page.screenshot({
        path: `test-results/m4-category-settled-${testInfo.project.name}.png`,
      });
    const before = await page.locator("#division-heading").boundingBox();
    await page.waitForTimeout(40);
    expect(await page.locator("#division-heading").boundingBox()).toEqual(
      before,
    );
  }
  mkdirSync("test-results", { recursive: true });
  writeFileSync(
    `test-results/m4-category-${testInfo.project.name}.json`,
    JSON.stringify(samples, null, 2) + "\n",
  );
});

test("preview glyphs keep their final nodes and last frames match settled geometry", async ({
  page,
}, testInfo) => {
  const samples: unknown[] = [];
  for (const ms of [900, 950, 983, 1000]) {
    await page.goto(detail);
    await idle(page);
    const trigger = page.locator(`[data-opponent-id="${opponent}"]`).first();
    await trigger.hover();
    await expect(page.getByRole("dialog").getByRole("heading")).toContainText(
      "Diego Lopes",
    );
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Open recorded history" })
      .click();
    await expect(root(page)).toHaveAttribute("data-motion-stage", "arriving");
    const early = await page
      .locator("[data-final-text] [data-motion-glyph]")
      .evaluateAll((elements) =>
        elements
          .filter((el) => (el as HTMLElement).style.transform)
          .map((el) => ({
            key: (el as HTMLElement).dataset.motionGlyph,
            transform: (el as HTMLElement).style.transform,
          })),
      );
    expect(early.length).toBeGreaterThan(0);
    await expect(page.locator("[data-selected-fighter]")).toHaveCSS(
      "overflow",
      "visible",
    );
    if (ms === 900)
      await page.screenshot({
        path: `test-results/m4-opponent-early-${testInfo.project.name}.png`,
      });
    await page
      .locator("[data-final-text] [data-motion-glyph]")
      .evaluateAll((elements) =>
        elements.forEach((el) =>
          el.setAttribute("data-node-check", "original"),
        ),
      );
    const frame = await page.evaluate(async (requested) => {
      await new Promise<void>((resolve) => {
        const tick = () => {
          if (
            performance.now() -
              Number(
                document.querySelector<HTMLElement>("main")!.dataset
                  .motionStart,
              ) >=
            requested
          )
            resolve();
          else requestAnimationFrame(tick);
        };
        tick();
      });
      return {
        requested: 0,
        actual:
          performance.now() -
          Number(
            document.querySelector<HTMLElement>("main")!.dataset.motionStart,
          ),
        glyphs: Array.from(
          document.querySelectorAll<HTMLElement>(
            "[data-final-text] [data-motion-glyph]",
          ),
        ).map((el) => ({
          key: el.dataset.motionGlyph,
          rect: el.getBoundingClientRect().toJSON(),
          original: el.dataset.nodeCheck,
          transform: getComputedStyle(el).transform,
        })),
        portrait: getComputedStyle(document.querySelector("[data-media-role]")!)
          .opacity,
      };
    }, ms);
    frame.requested = ms;
    await page.screenshot({
      path: `test-results/m4-opponent-${ms}-${testInfo.project.name}.png`,
    });
    await clean(page);
    const settled = await page
      .locator("[data-final-text] [data-motion-glyph]")
      .evaluateAll((elements) =>
        elements.map((el) => ({
          rect: el.getBoundingClientRect().toJSON(),
          original: (el as HTMLElement).dataset.nodeCheck,
        })),
      );
    let maxDifference = 0;
    settled.forEach((value, i) => {
      expect(value.original).toBe("original");
      for (const field of ["x", "y", "width", "height"] as const)
        maxDifference = Math.max(
          maxDifference,
          Math.abs(value.rect[field] - frame.glyphs[i].rect[field]),
        );
    });
    expect(maxDifference).toBeLessThanOrEqual(1);
    expect(frame.portrait).toBe("1");
    samples.push({ ...frame, early, maxDifference });
  }
  writeFileSync(
    `test-results/m4-opponent-frames-${testInfo.project.name}.json`,
    JSON.stringify(samples, null, 2) + "\n",
  );
});

test("resize, return, newer navigation, and reduced motion settle safely", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto(home);
  await idle(page);
  await chooseDivision(page, "lightweight");
  await expect(root(page)).toHaveAttribute("data-motion-stage", "departing");
  await page.setViewportSize({ width: 1084, height: 854 });
  await expect(page.locator("#division-heading")).toContainText("Lightweight");
  await clean(page);
  await page.goto(detail);
  await idle(page);
  await page.locator(`[data-opponent-id="${opponent}"]`).first().click();
  await expect(root(page)).toHaveAttribute("data-motion-stage", "arriving");
  await page.getByRole("button", { name: "Back to rankings" }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await clean(page);
  await page.goto(detail);
  await idle(page);
  await page.locator(`[data-opponent-id="${opponent}"]`).first().click();
  await expect(root(page)).toHaveAttribute("data-motion-stage", "arriving");
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole("listbox")).toBeVisible();
  await clean(page);
  await page.goto(detail);
  await idle(page);
  await page.locator(`[data-opponent-id="${opponent}"]`).first().click();
  await expect(root(page)).toHaveAttribute("data-motion-stage", "arriving");
  const newer = page.locator("[data-opponent-id]").first();
  const newerId = await newer.getAttribute("data-opponent-id");
  await newer.click();
  await expect(page.locator("[data-history-fighter]")).toHaveAttribute(
    "data-history-fighter",
    newerId!,
  );
  await clean(page);
  await page.getByRole("button", { name: "Back to rankings" }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await clean(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await chooseDivision(page, "lightweight");
  await clean(page);
  await expect(page.locator("#division-heading")).toContainText("Lightweight");
  await page.goto(detail);
  await idle(page);
  await page.locator(`[data-opponent-id="${opponent}"]`).first().focus();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await clean(page);
  await expect(page.locator("[data-history-fighter]")).toHaveAttribute(
    "data-history-fighter",
    opponent,
  );
});
