import { test, expect } from "@playwright/test";
import { chooseDivision } from "./helpers/division";
test.use({ deviceScaleFactor: 2 });
test("division menu matches V8 and supports keyboard, Escape, and outside dismissal", async ({
  page,
}, testInfo) => {
  await page.goto("/rankings");
  const trigger = page.getByRole("button", {
    name: "Weight division",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu", { name: "Weight division" });
  await expect(menu).toHaveCSS("background-color", "rgb(32, 32, 33)");
  await expect(menu.getByRole("menuitemradio")).toHaveCount(2);
  await expect(
    page.locator('[data-division-option="featherweight"]'),
  ).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(
    page.locator('[data-division-option="lightweight"]'),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator("#division-heading").click();
  await expect(menu).toHaveCount(0);
  await trigger.click();
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(menu).toHaveCount(0);
  await expect(page.locator("#division-heading")).toContainText("Lightweight");
  await expect(trigger).toBeEnabled();
  await trigger.click();
  await page.screenshot({
    path: `test-results/selector-menu-${testInfo.project.name}.png`,
  });
});
test("both rankings use sharp headshots with an unclipped image box", async ({
  page,
}, testInfo) => {
  await page.goto("/rankings");
  for (const division of ["featherweight", "lightweight"]) {
    await chooseDivision(page, division);
    await expect(page.locator("main")).toHaveAttribute(
      "data-motion-stage",
      "idle",
    );
    await expect(page.locator("main")).toHaveAttribute(
      "data-phase",
      "rankings",
    );
    const images = page.locator('[data-fighter-id][aria-selected="true"] img');
    await images.evaluateAll(async (elements) =>
      Promise.all(
        elements.map((image) => (image as HTMLImageElement).decode()),
      ),
    );
    const measurements = await images.evaluateAll((elements) =>
      elements.map((element) => {
        const image = element as HTMLImageElement,
          box = image.getBoundingClientRect(),
          parent = image.parentElement!.getBoundingClientRect();
        return {
          width: image.naturalWidth,
          height: image.naturalHeight,
          sameBox:
            Math.abs(box.height - parent.height) < 1 &&
            Math.abs(box.width - parent.width) < 1,
          position: getComputedStyle(image).objectPosition,
        };
      }),
    );
    expect(measurements.length).toBeGreaterThan(0);
    for (const sample of measurements) {
      expect(sample.width).toBe(520);
      expect(sample.height).toBe(325);
      expect(sample.sameBox).toBe(true);
      expect(sample.position).toBe("50% 50%");
    }
    await page.screenshot({
      path: `test-results/selector-${division}-${testInfo.project.name}.png`,
    });
  }
});
