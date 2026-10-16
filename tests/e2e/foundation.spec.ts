import { chooseDivision } from "./helpers/division";
import { readFileSync, writeFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
const { datasetVersion } = JSON.parse(
  readFileSync("public/data/current.json", "utf8"),
);
const registry = JSON.parse(
  readFileSync(`public/data/v1/${datasetVersion}/divisions.json`, "utf8"),
);
type Division = {
  id: string;
  label: string;
  defaultFighterId: string;
  entries: { fighterId: string; rank: number }[];
};
const divisions: Division[] = registry.divisions
  .filter(
    (d: { publicationState: string }) => d.publicationState === "published",
  )
  .sort((a: Division, b: Division) => {
    const order = (id: string) =>
      id === registry.defaultDivisionId ? 0 : id === "lightweight" ? 1 : 2;
    return order(a.id) - order(b.id);
  });
const selectedFigure = (page: import("@playwright/test").Page) =>
  page.locator("[data-selected-fighter]");

test("fresh visit, category defaults, invalid selection, and explicit URL refresh", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page).toHaveURL(/\/rankings$/);
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[0].defaultFighterId,
  );
  await expect(page.locator("[data-fighter-id]")).toHaveCount(16);
  for (const division of [...divisions, ...divisions].reverse()) {
    await chooseDivision(page, division.id);
    await expect(selectedFigure(page)).toHaveAttribute(
      "data-selected-fighter",
      division.defaultFighterId,
    );
    await expect(page.locator("[data-profile-fighter]")).toHaveAttribute(
      "data-profile-fighter",
      division.defaultFighterId,
    );
    await expect(page).toHaveURL(new RegExp(`division=${division.id}`));
  }
  for (const division of divisions) {
    const id = division.entries[5].fighterId;
    await page.goto(`/rankings?division=${division.id}&selected=${id}`);
    await expect(selectedFigure(page)).toHaveAttribute(
      "data-selected-fighter",
      id,
    );
    await page.reload();
    await expect(selectedFigure(page)).toHaveAttribute(
      "data-selected-fighter",
      id,
    );
  }
  await page.goto("/rankings?division=unknown&selected=invalid");
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[0].defaultFighterId,
  );
  expect(errors).toEqual([]);
});

for (const division of divisions) {
  test(`click every fighter in ${division.label} and check profile, career record, and recent results`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    await page.goto(`/rankings?division=${division.id}`);
    for (let i = 0; i < division.entries.length; i++) {
      const entry = division.entries[i];
      const bundle = JSON.parse(
        readFileSync(
          `public/data/v1/${datasetVersion}/fighters/${entry.fighterId}.json`,
          "utf8",
        ),
      );
      const row = page.locator(`[data-fighter-id="${entry.fighterId}"]`);
      await row.click();
      await expect(row).toHaveAttribute("aria-selected", "true");
      await expect(selectedFigure(page)).toHaveAttribute(
        "data-selected-fighter",
        entry.fighterId,
      );
      await expect(page.locator("[data-profile-fighter]")).toHaveAttribute(
        "data-profile-fighter",
        entry.fighterId,
      );
      const record = bundle.profile.careerRecord;
      await expect(
        page.getByLabel(
          `Career record ${[record.wins, record.losses, record.draws].map((n) => n ?? "—").join("-")}`,
          { exact: true },
        ),
      ).toBeVisible();
      expect(
        await page
          .locator("[data-recent-result]")
          .evaluateAll((elements) =>
            elements.map((el) => el.getAttribute("data-recent-result")),
          ),
      ).toEqual(
        bundle.records.slice(0, 3).map((r: { result: string }) => r.result),
      );
    }
  });
}

test("wheel, drag, and keyboard loop across both boundaries", async ({
  page,
}) => {
  await page.goto("/rankings");
  const dial = page.getByRole("listbox");
  const last = divisions[0].entries.at(-1)!.fighterId;
  await dial.hover();
  await page.mouse.wheel(0, -125);
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    last,
  );
  await page.waitForTimeout(160);
  await page.mouse.wheel(0, 125);
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[0].defaultFighterId,
  );
  const box = (await dial.boundingBox())!;
  await page.mouse.move(box.x + 180, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + box.height / 2 + 100, {
    steps: 5,
  });
  await page.mouse.up();
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    last,
  );
  await page.mouse.move(box.x + 180, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + box.height / 2 - 100, {
    steps: 5,
  });
  await page.mouse.up();
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[0].defaultFighterId,
  );
  await dial.focus();
  await page.keyboard.press("ArrowUp");
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    last,
  );
  await page.keyboard.press("ArrowDown");
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[0].defaultFighterId,
  );
  await page.keyboard.press("End");
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    last,
  );
  await page.keyboard.press("Home");
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[0].defaultFighterId,
  );
});

test("failed or obsolete requests preserve the visible fighter and allow retry", async ({
  page,
}) => {
  await page.goto("/rankings");
  const id = divisions[0].entries[1].fighterId;
  await page.route(`**/fighters/${id}.json`, (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.getByRole("button", { name: "Next fighter" }).click();
  await expect(
    page.getByRole("alert", { name: "Fighter navigation error" }),
  ).toBeVisible();
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[0].defaultFighterId,
  );
  await page.unroute(`**/fighters/${id}.json`);
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    id,
  );
  await page.goto("/rankings");
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/fighters/${id}.json`, async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await page.getByRole("button", { name: "Next fighter" }).click();
  await page.getByRole("button", { name: "Next fighter" }).click();
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[0].entries[2].fighterId,
  );
  release();
  await page.waitForTimeout(200);
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[0].entries[2].fighterId,
  );
});

test("desktop captures, missing image fallback, and narrow screen access", async ({
  page,
}) => {
  await page.goto("/rankings");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("[data-media-role] img")).toBeVisible();
  await expect(page.locator("[data-media-role] img")).toHaveJSProperty(
    "complete",
    true,
  );
  const geometry = await page.evaluate(() =>
    Object.fromEntries(
      [
        "header",
        "[data-region=experience]",
        "[aria-label='Ranking selector']",
        "[role=listbox]",
        "[aria-label='Selected fighter figure']",
        "[aria-label='Fighter profile']",
        "footer",
      ].map((selector) => {
        const r = document.querySelector(selector)!.getBoundingClientRect();
        return [selector, { x: r.x, y: r.y, width: r.width, height: r.height }];
      }),
    ),
  );
  writeFileSync(
    "test-results/m2-geometry.json",
    JSON.stringify(geometry, null, 2) + "\n",
  );
  const reference = JSON.parse(
    readFileSync("docs/evidence/m2/v8-geometry.json", "utf8"),
  );
  for (const [actual, expected] of [
    ["header", ".masthead"],
    ["[data-region=experience]", ".experience"],
    ["[role=listbox]", ".dial"],
    ["[aria-label='Selected fighter figure']", ".profile-stage"],
    ["[aria-label='Fighter profile']", ".stats-panel"],
    ["footer", "footer"],
  ]) {
    for (const field of ["x", "y", "width", "height"] as const)
      expect(
        Math.abs(geometry[actual][field] - reference[expected][field]),
        `${actual} ${field}`,
      ).toBeLessThanOrEqual(1);
  }
  await page.screenshot({
    path: "test-results/m2-featherweight.png",
    fullPage: true,
  });
  await chooseDivision(page, "lightweight");
  await expect(selectedFigure(page)).toHaveAttribute(
    "data-selected-fighter",
    divisions[1].defaultFighterId,
  );
  await page.locator("img").evaluateAll(async (images) => {
    images.forEach((image) => {
      (image as HTMLImageElement).loading = "eager";
    });
    await Promise.all(
      images.map((image) =>
        (image as HTMLImageElement).decode().catch(() => {}),
      ),
    );
  });
  await expect(page.locator("main")).toHaveAttribute(
    "data-motion-stage",
    "idle",
  );
  await expect(page.locator("main")).toHaveAttribute("data-phase", "rankings");
  await page.screenshot({
    path: "test-results/m2-lightweight.png",
    fullPage: true,
  });
  await page.route("**/media/*.webp", (route) => route.abort());
  await page.reload();
  await expect(
    page.locator("[data-media-role]").getByLabel(/image unavailable/),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Weight division")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
