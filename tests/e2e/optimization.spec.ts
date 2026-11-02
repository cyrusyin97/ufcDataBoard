import { test, expect } from "@playwright/test";
const home = "/rankings?division=featherweight&selected=e1248941344b3288";
test("dial moves while a delayed target keeps committed identity and recovers on failure", async ({
  page,
}) => {
  await page.goto(home);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/fighters/76e2870ffafbe38f.json", async (route) => {
    await gate;
    await route.fulfill({ status: 503, body: "unavailable" });
  });
  const row = page.locator('[data-fighter-id="76e2870ffafbe38f"]');
  const before = (await row.boundingBox())!.y;
  await page.getByRole("button", { name: "Next fighter", exact: true }).click();
  await expect
    .poll(async () => Math.abs((await row.boundingBox())!.y - before))
    .toBeGreaterThan(15);
  await expect(page.locator("[data-selected-fighter]")).toHaveAttribute(
    "data-selected-fighter",
    "e1248941344b3288",
  );
  await expect(page).toHaveURL(/selected=e1248941344b3288/);
  await expect(page.getByRole("option", { selected: true })).toHaveAttribute(
    "data-fighter-id",
    "e1248941344b3288",
  );
  release();
  await expect(page.locator("main")).toHaveAttribute("data-phase", "error");
  await expect
    .poll(async () => Math.abs((await row.boundingBox())!.y - before))
    .toBeLessThan(1);
});
test("wheel retarget does not synchronously snap a moving row", async ({
  page,
}) => {
  await page.goto(home);
  await page.getByRole("button", { name: "Next fighter", exact: true }).click();
  await page.waitForTimeout(70);
  const jump = await page.evaluate(() => {
    const row = document.querySelector('[data-fighter-id="76e2870ffafbe38f"]')!;
    const before = row.getBoundingClientRect().y;
    document.querySelector('[role="listbox"]')!.dispatchEvent(
      new WheelEvent("wheel", {
        deltaY: 90,
        bubbles: true,
        cancelable: true,
      }),
    );
    return Math.abs(row.getBoundingClientRect().y - before);
  });
  expect(jump).toBeLessThan(1);
  await expect(page.locator("main")).toHaveAttribute("data-phase", "rankings");
  await expect(page).toHaveURL(/selected=f166e93d04a8c274/);
});
test("selected fighter request starts before a delayed bout request completes", async ({
  page,
}) => {
  await page.goto(home);
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route("**/bouts/*.json", async (route) => {
    await gate;
    await route.continue();
  });
  const fighter = page.waitForRequest("**/fighters/e1248941344b3288.json");
  await page
    .getByRole("link", { name: /Open recent bout:/ })
    .first()
    .click();
  await fighter; // Fails if the selected fighter still waits for bout/reference.
  release();
  await expect(page.locator("main")).toHaveAttribute("data-phase", "bout");
});
