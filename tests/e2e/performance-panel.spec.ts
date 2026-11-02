import { test, expect } from "@playwright/test";
import type {} from "../../src/lib/performance/client";
const home = "/rankings?division=featherweight&selected=e1248941344b3288";
test("compact diagnostics move freely and close/reload clean up capture", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await page.goto(home);
  await page
    .locator("main")
    .click({ button: "right", position: { x: 3, y: 90 } });
  await page.getByRole("menuitem", { name: "Stats for nerds" }).click();
  const panel = page.getByRole("complementary", { name: "Stats for nerds" });
  await expect(panel).toContainText("Live · local only");
  await expect
    .poll(() =>
      page.evaluate(() => window.__ufcPerf!.snapshot().live?.samples ?? 0),
    )
    .toBeGreaterThan(2);
  await page.getByRole("button", { name: "Next fighter", exact: true }).click();
  await expect(panel).not.toContainText("Last interaction");
  await expect(panel.getByRole("button")).toHaveCount(1);
  const header = panel.getByRole("group", { name: "Move diagnostics" });
  const box = (await header.boundingBox())!;
  const before = (await panel.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x - 270, box.y + 110, { steps: 10 });
  await page.mouse.up();
  const moved = (await panel.boundingBox())!;
  expect(moved.x).toBeLessThan(before.x - 200);
  expect(moved.y).toBeGreaterThan(before.y + 80);
  await header.focus();
  await page.keyboard.press("ArrowLeft");
  expect((await panel.boundingBox())!.x).toBeCloseTo(moved.x - 10, 0);
  await page.screenshot({ path: "work/m7/stats-panel-compact.png" });
  await page.getByRole("button", { name: "Close diagnostics" }).click();
  await expect(panel).toHaveCount(0);
  expect(
    await page.evaluate(() => window.__ufcPerf!.snapshot().status.enabled),
  ).toBe(false);
  expect(posts).toEqual([]);
  await page.reload();
  await expect(panel).toHaveCount(0);
});
test("native menus remain on images, links and selected text; Escape dismisses custom menu", async ({
  page,
}) => {
  await page.goto(home);
  const prevented = await page.evaluate(() => {
    const targets = [
      document.querySelector("main img"),
      document.querySelector("main a"),
    ];
    return targets.map((target) => {
      if (!target) throw new Error("Missing native menu fixture");
      return !target.dispatchEvent(
        new MouseEvent("contextmenu", { bubbles: true, cancelable: true }),
      );
    });
  });
  expect(prevented).toEqual([false, false]);
  await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector("main h1")!);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
  });
  await page
    .locator("main")
    .dispatchEvent("contextmenu", { clientX: 30, clientY: 90 });
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.evaluate(() => getSelection()!.removeAllRanges());
  await page
    .locator("main")
    .click({ button: "right", position: { x: 3, y: 90 } });
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
});
test("narrow viewport fits and resize pauses the capture", async ({ page }) => {
  await page.goto(home);
  await page
    .locator("main")
    .click({ button: "right", position: { x: 3, y: 90 } });
  await page.getByRole("menuitem", { name: "Stats for nerds" }).click();
  const panel = page.getByRole("complementary", { name: "Stats for nerds" });
  await expect(panel).toContainText("Live · local only");
  const handle = (await panel
    .getByRole("group", { name: "Move diagnostics" })
    .boundingBox())!;
  await page.mouse.move(handle.x + 30, handle.y + 10);
  await page.mouse.down();
  await page.mouse.move(handle.x - 120, handle.y + 250, { steps: 5 });
  await page.mouse.up();
  await page.setViewportSize({ width: 390, height: 700 });
  await expect(panel).toContainText("Paused");
  const box = await panel.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  expect(box!.y + box!.height).toBeLessThanOrEqual(700);
  await page.screenshot({ path: "work/m7/stats-panel-mobile.png" });
  await page.getByRole("button", { name: "Close diagnostics" }).focus();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
});
