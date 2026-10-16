import { readFileSync, writeFileSync } from "node:fs";
import { test, expect, type Page } from "@playwright/test";
const { datasetVersion } = JSON.parse(
  readFileSync("public/data/current.json", "utf8"),
);
const base = `public/data/v1/${datasetVersion}`;
const registry = JSON.parse(readFileSync(`${base}/divisions.json`, "utf8"));
const divisions = registry.divisions as {
  id: string;
  defaultFighterId: string;
  entries: { fighterId: string }[];
}[];
const feather = divisions.find((d) => d.id === "featherweight")!,
  light = divisions.find((d) => d.id === "lightweight")!;
const bundle = (id: string) =>
  JSON.parse(readFileSync(`${base}/fighters/${id}.json`, "utf8"));
const champion = bundle(feather.defaultFighterId);
const ranked = champion.records[0].opponentId;
const unranked = champion.records.find(
  (r: { opponentId: string }) =>
    !divisions.some((d) => d.entries.some((e) => e.fighterId === r.opponentId)),
).opponentId;
const zero = "f71028a6e5128856";
const detail = (division: string, id: string) =>
  `/rankings?division=${division}&fighter=${id}&view=history`;
const history = (page: Page) =>
  page.getByRole("region", { name: "Recorded fight history" });
const figure = (page: Page) => page.locator("[data-selected-fighter]");
const opponent = (page: Page, id: string) =>
  page.locator(`[data-opponent-id="${id}"]`).first();
const settle = async (page: Page, id: string) => {
  await expect(history(page)).toHaveAttribute("data-history-fighter", id);
  await expect(page.locator("main")).toHaveAttribute(
    "data-motion-stage",
    "idle",
  );
  await expect(page.locator("main")).toHaveAttribute(
    "data-phase",
    /^(history|error)$/,
  );
  await expect(figure(page)).toHaveAttribute("data-selected-fighter", id);
  await expect(page.locator("[data-profile-fighter]")).toHaveAttribute(
    "data-profile-fighter",
    id,
  );
};

test("complete recorded history, internal scroll, and desktop composition", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/rankings");
  await page
    .getByRole("link", {
      name: `Open recorded history for ${champion.profile.displayName}`,
      exact: true,
    })
    .click();
  await settle(page, feather.defaultFighterId);
  await expect(page.locator("[data-fight-id]")).toHaveCount(
    champion.records.length,
  );
  await expect(
    page.getByLabel(`${champion.records.length} recorded fights`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator("#history-heading")).toBeFocused();
  await expect(page.locator("[data-media-role]")).toHaveAttribute(
    "data-media-role",
    "full_body",
  );
  await page.setViewportSize({ width: 1084, height: 854 });
  const scroll = page.getByLabel("Recorded fights", { exact: true });
  expect(await scroll.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(
    true,
  );
  await scroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await expect(
    page.locator(`[data-fight-id="${champion.records.at(-1).id}"]`),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await scroll.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page
    .locator("[data-media-role] img")
    .evaluate((img) => (img as HTMLImageElement).decode());
  await page.screenshot({
    path: "test-results/m3-history.png",
    fullPage: true,
  });
  writeFileSync(
    "test-results/m3-environment.json",
    JSON.stringify(
      {
        browser: page.context().browser()?.version(),
        runtime: process.version,
        viewport: page.viewportSize(),
        datasetVersion,
        rowCount: champion.records.length,
      },
      null,
      2,
    ) + "\n",
  );
  expect(
    await page
      .locator("[data-fight-id]")
      .evaluateAll((elements) =>
        elements.map((el) => el.getAttribute("data-fight-id")),
      ),
  ).toEqual(champion.records.map((record: { id: string }) => record.id));
  await page.getByRole("link", { name: "Close fight history" }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  expect(errors).toEqual([]);
});

test("ranked and unranked opponent navigation replaces detail and preserves return rules", async ({
  page,
}) => {
  await page.goto("/rankings");
  const homeLength = await page.evaluate(() => window.history.length);
  await page
    .getByRole("link", {
      name: `Open recorded history for ${champion.profile.displayName}`,
    })
    .click();
  await settle(page, feather.defaultFighterId);
  await opponent(page, ranked).click();
  await settle(page, ranked);
  expect(await page.evaluate(() => window.history.length)).toBe(homeLength + 1);
  await page.goBack();
  await expect(page.getByRole("listbox")).toBeFocused();
  await expect(figure(page)).toHaveAttribute("data-selected-fighter", ranked);
  await expect(page).toHaveURL(new RegExp(`selected=${ranked}`));
  await page.goForward();
  await settle(page, ranked);
  expect(await page.evaluate(() => window.history.length)).toBe(homeLength + 1);
  // A new direct entry still returns an opponent outside both rankings to the active champion.
  await page.goto(detail("lightweight", feather.defaultFighterId));
  await settle(page, feather.defaultFighterId);
  await opponent(page, unranked).click();
  await settle(page, unranked);
  await page.getByRole("button", { name: "Back to rankings" }).click();
  await expect(figure(page)).toHaveAttribute(
    "data-selected-fighter",
    light.defaultFighterId,
  );
  await expect(page).toHaveURL(
    new RegExp(`division=lightweight&selected=${light.defaultFighterId}`),
  );
});

test("direct archive URLs, reload, owned home entry, and external Back", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const division of divisions) {
    await page.goto(detail(division.id, unranked));
    await settle(page, unranked);
    const length = await page.evaluate(() => window.history.length);
    await page.reload();
    await settle(page, unranked);
    expect(await page.evaluate(() => window.history.length)).toBe(length);
    const next = bundle(unranked).records[0].opponentId;
    await opponent(page, next).click();
    await settle(page, next);
    await page.goBack();
    const selected = division.entries.some((e) => e.fighterId === next)
      ? next
      : division.defaultFighterId;
    await expect(figure(page)).toHaveAttribute(
      "data-selected-fighter",
      selected,
    );
    await expect(page.getByRole("listbox")).toBeVisible();
  }
  await page.goto("about:blank");
  await page.goto(detail("featherweight", unranked));
  await settle(page, unranked);
  await page.goBack();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL("about:blank");
});

test("zero bouts, null facts, missing media, and unknown IDs remain recoverable", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto(detail("lightweight", zero));
  await settle(page, zero);
  await expect(
    page.getByText("No recorded bouts in this dataset."),
  ).toBeVisible();
  await expect(page.locator("[data-fight-id]")).toHaveCount(0);
  await expect(page.locator("[data-media-role]")).toHaveAttribute(
    "data-media-role",
    "initials",
  );
  await expect(
    page.getByLabel(`${bundle(zero).profile.displayName} image unavailable`),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(figure(page)).toHaveAttribute(
    "data-selected-fighter",
    light.defaultFighterId,
  );
  for (const id of ["unknown", "ffffffffffffffff"]) {
    await page.goto(detail("featherweight", id));
    await expect(
      page.getByRole("alert", { name: "Fighter navigation error" }),
    ).toContainText("not in the dataset");
    await expect(page.locator("[data-selected-fighter]")).toHaveCount(0);
    await page
      .getByRole("alert", { name: "Fighter navigation error" })
      .getByRole("button", { name: "Return to rankings" })
      .click();
    await expect(figure(page)).toHaveAttribute(
      "data-selected-fighter",
      feather.defaultFighterId,
    );
  }
  expect(
    requests.some((url) =>
      /fighters\/(unknown|ffffffffffffffff)\.json/.test(url),
    ),
  ).toBe(false);
});

test("opponent preview supports hover, keyboard, Escape priority, and touch button", async ({
  page,
}) => {
  await page.goto(detail("featherweight", feather.defaultFighterId));
  await settle(page, feather.defaultFighterId);
  const trigger = opponent(page, ranked);
  await trigger.hover();
  const preview = page.getByRole("dialog");
  await expect(preview).toBeVisible();
  await expect(
    preview.getByRole("heading", { name: bundle(ranked).profile.displayName }),
  ).toBeVisible();
  const beforeScroll = await page
    .getByLabel("Recorded fights", { exact: true })
    .evaluate((el) => el.scrollTop);
  await preview.hover();
  await page.waitForTimeout(250);
  await expect(preview).toBeVisible();
  const box = (await preview.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1318);
  expect(box.y + box.height).toBeLessThanOrEqual(808);
  expect(
    await page
      .getByLabel("Recorded fights", { exact: true })
      .evaluate((el) => el.scrollTop),
  ).toBe(beforeScroll);
  await page.screenshot({ path: "test-results/m3-preview.png" });
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(history(page)).toBeVisible();
  await trigger.focus();
  await expect(preview).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await page
    .getByRole("button", {
      name: `Preview ${bundle(ranked).profile.displayName}`,
      exact: true,
    })
    .first()
    .click();
  await expect(preview).toBeVisible();
  await preview.getByRole("link", { name: "Open recorded history" }).click();
  await settle(page, ranked);
  await expect(preview).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(figure(page)).toHaveAttribute("data-selected-fighter", ranked);
});

test("failed fetch, Retry, superseded navigation, and return cancellation", async ({
  page,
}) => {
  await page.goto(detail("featherweight", feather.defaultFighterId));
  await settle(page, feather.defaultFighterId);
  await page.route(`**/fighters/${ranked}.json`, (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await opponent(page, ranked).click();
  await expect(
    page.getByRole("alert", { name: "Fighter navigation error" }),
  ).toBeVisible();
  await settle(page, feather.defaultFighterId);
  await page.unroute(`**/fighters/${ranked}.json`);
  await page
    .getByRole("alert", { name: "Fighter navigation error" })
    .getByRole("button", { name: "Retry" })
    .click();
  await settle(page, ranked);
  await page.goto(detail("featherweight", feather.defaultFighterId));
  await settle(page, feather.defaultFighterId);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/fighters/${ranked}.json`, async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await opponent(page, ranked).click();
  const other = champion.records.find(
    (r: { opponentId: string }) => r.opponentId !== ranked,
  ).opponentId;
  await opponent(page, other).click();
  await settle(page, other);
  release();
  await page.waitForTimeout(100);
  await settle(page, other);
  await page.unroute(`**/fighters/${ranked}.json`);
  await page.goto(detail("featherweight", feather.defaultFighterId));
  await settle(page, feather.defaultFighterId);
  let releaseReturn: () => void = () => {};
  const returnGate = new Promise<void>((resolve) => {
    releaseReturn = resolve;
  });
  await page.route(`**/fighters/${ranked}.json`, async (route) => {
    await returnGate;
    await route.continue().catch(() => {});
  });
  await opponent(page, ranked).click();
  await page.getByRole("button", { name: "Back to rankings" }).click();
  await expect(page.getByRole("listbox")).toBeVisible();
  releaseReturn();
  await page.waitForTimeout(100);
  await expect(page.locator("[data-history-fighter]")).toHaveCount(0);
  await expect(figure(page)).toHaveAttribute(
    "data-selected-fighter",
    feather.defaultFighterId,
  );
});

test("opponent links preserve modified click and repeated navigation has one detail entry", async ({
  page,
  context,
}) => {
  await page.goto(detail("featherweight", feather.defaultFighterId));
  await settle(page, feather.defaultFighterId);
  const length = await page.evaluate(() => window.history.length);
  const newPagePromise = context.waitForEvent("page");
  await opponent(page, ranked).click({ modifiers: ["Meta"] });
  const newPage = await newPagePromise;
  await settle(newPage, ranked);
  await settle(page, feather.defaultFighterId);
  await newPage.close();
  for (let i = 0; i < 10; i++) {
    const currentId = await history(page).getAttribute("data-history-fighter");
    const next = bundle(currentId!).records[0].opponentId;
    await opponent(page, next).click();
    await settle(page, next);
    await expect(page.locator("[data-media-role]")).toHaveCount(1);
    await expect(page.locator("[data-motion-overlay]")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  expect(await page.evaluate(() => window.history.length)).toBe(length);
});

test("failed full-body portrait falls back to a reviewed headshot", async ({
  page,
}) => {
  const media = JSON.parse(readFileSync(`${base}/media.json`, "utf8"));
  const mediaFighter = light.defaultFighterId;
  const roles = media.fighters[mediaFighter];
  expect(roles.full_body).not.toBeNull();
  expect(roles.headshot).not.toBeNull();
  await page.route(`**${roles.full_body.variants.at(-1).url}`, (route) =>
    route.abort(),
  );
  await page.goto(detail("featherweight", mediaFighter));
  await settle(page, mediaFighter);
  await expect(page.locator("[data-media-role]")).toHaveAttribute(
    "data-media-role",
    "headshot",
  );
  await expect(page.locator("[data-media-role] img")).toHaveAttribute(
    "src",
    roles.headshot.variants.at(-1).url,
  );
});

test("late preview responses stay closed and duplicate route events do not restart a pending request", async ({
  page,
}) => {
  await page.goto(detail("featherweight", feather.defaultFighterId));
  await settle(page, feather.defaultFighterId);
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`**/fighters/${ranked}.json`, async (route) => {
    await gate;
    await route.continue().catch(() => {});
  });
  await opponent(page, ranked).hover();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.mouse.move(0, 0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  release();
  await page.waitForTimeout(100);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await settle(page, feather.defaultFighterId);
  await page.unroute(`**/fighters/${ranked}.json`);
  await page.goto(detail("featherweight", feather.defaultFighterId));
  await settle(page, feather.defaultFighterId);
  let releaseNavigation: () => void = () => {};
  const navigationGate = new Promise<void>((resolve) => {
    releaseNavigation = resolve;
  });
  let requests = 0;
  await page.route(`**/fighters/${ranked}.json`, async (route) => {
    requests++;
    await navigationGate;
    await route.continue().catch(() => {});
  });
  await opponent(page, ranked).evaluate((el) =>
    (el as HTMLAnchorElement).click(),
  );
  await expect.poll(() => requests).toBe(1);
  await page.evaluate(() => {
    window.dispatchEvent(
      new PopStateEvent("popstate", { state: window.history.state }),
    );
    window.dispatchEvent(
      new PopStateEvent("popstate", { state: window.history.state }),
    );
  });
  releaseNavigation();
  await settle(page, ranked);
  expect(requests).toBe(1);
});

test("touch preview and navigation remain accessible on a narrow screen", async ({
  browser,
}) => {
  const context = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(
    `http://127.0.0.1:3000${detail("featherweight", feather.defaultFighterId)}`,
  );
  await settle(page, feather.defaultFighterId);
  await page
    .getByRole("button", {
      name: `Preview ${bundle(ranked).profile.displayName}`,
      exact: true,
    })
    .first()
    .tap();
  const preview = page.getByRole("dialog");
  await expect(preview).toBeVisible();
  await expect(
    preview.getByRole("heading", { name: bundle(ranked).profile.displayName }),
  ).toBeVisible();
  const box = (await preview.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  expect(box.y + box.height).toBeLessThanOrEqual(844);
  await preview.getByRole("link", { name: "Open recorded history" }).tap();
  await settle(page, ranked);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Back to rankings" }).tap();
  await expect(figure(page)).toHaveAttribute("data-selected-fighter", ranked);
  await context.close();
});
