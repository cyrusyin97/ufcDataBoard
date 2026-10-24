import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { chooseDivision } from "./helpers/division";
import type { DivisionRegistry } from "../../src/lib/domain/contracts";
const datasetVersion =
  process.env.UFC_PREVIEW_DATASET_VERSION ??
  JSON.parse(readFileSync("public/data/current.json", "utf8")).datasetVersion;
const registry: DivisionRegistry = JSON.parse(
  readFileSync(`public/data/v1/${datasetVersion}/divisions.json`, "utf8"),
);
for (const division of registry.divisions) {
  test(`${division.label}: menu, champion, direct history, refresh, and return`, async ({
    page,
  }) => {
    await page.goto("/rankings");
    await chooseDivision(page, division.id);
    await expect(page.locator("main")).toHaveAttribute(
      "data-phase",
      "rankings",
    );
    await expect(page.locator("[data-selected-fighter]")).toHaveAttribute(
      "data-selected-fighter",
      division.defaultFighterId!,
    );
    await expect(page.locator("#division-heading")).toContainText(
      division.label,
    );
    await expect(page.locator("[data-fighter-id]")).toHaveCount(
      division.entries.length,
    );
    const target = division.entries.at(-1)!;
    await page.goto(
      `/rankings?division=${division.id}&fighter=${target.fighterId}&view=history`,
    );
    await expect(page.locator("[data-history-fighter]")).toHaveAttribute(
      "data-history-fighter",
      target.fighterId,
    );
    await page.reload();
    await expect(page.locator("[data-history-fighter]")).toHaveAttribute(
      "data-history-fighter",
      target.fighterId,
    );
    await page.getByRole("button", { name: "Back to rankings" }).click();
    await expect(page.locator("[data-selected-fighter]")).toHaveAttribute(
      "data-selected-fighter",
      target.fighterId,
    );
    await expect(page).toHaveURL(
      new RegExp(`division=${division.id}&selected=${target.fighterId}`),
    );
  });
}
test("all division options remain reachable on a narrow screen", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/rankings");
  await page
    .getByRole("button", { name: "Weight division", exact: true })
    .click();
  const menu = page.getByRole("menu");
  expect(
    await menu.evaluate(
      (element) => element.scrollHeight > element.clientHeight,
    ),
  ).toBe(true);
  await page.keyboard.press("End");
  const last = page.locator(
    `[data-division-option="${registry.divisions.at(-1)!.id}"]`,
  );
  await expect(last).toBeFocused();
  await expect(last).toBeInViewport();
  await page.screenshot({
    path: `test-results/all-divisions-mobile-menu-${testInfo.project.name}.png`,
  });
  await page.keyboard.press("Enter");
  await expect(page.locator("#division-heading")).toContainText(
    registry.divisions.at(-1)!.label,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `test-results/all-divisions-mobile-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("source tied ranks remain visible in the women’s flyweight dial", async ({
  page,
}) => {
  await page.goto("/rankings?division=womens-flyweight");
  const tied = registry.divisions
    .find((d) => d.id === "womens-flyweight")!
    .entries.filter((e) => e.rank === 6);
  expect(tied).toHaveLength(2);
  for (const entry of tied) {
    await page.goto(
      `/rankings?division=womens-flyweight&selected=${entry.fighterId}`,
    );
    await expect(
      page.locator(`[data-fighter-id="${entry.fighterId}"]`),
    ).toHaveAttribute("aria-label", /^Rank 6,/);
    await expect(
      page.getByRole("complementary", { name: "Fighter profile" }),
    ).toContainText("#6");
  }
});
