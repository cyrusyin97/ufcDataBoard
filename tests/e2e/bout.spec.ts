import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
const fixture = JSON.parse(
  readFileSync("tests/fixtures/bout-analysis.json", "utf8"),
);
test.beforeEach(async ({ request }) => {
  const version =
    process.env.UFC_PREVIEW_DATASET_VERSION ??
    JSON.parse(readFileSync("public/data/current.json", "utf8")).datasetVersion;
  const response = await request.get(`/data/v1/${version}/manifest.json`);
  const manifest = await response.json();
  test.skip(
    !manifest.boutAnalysis,
    "This pinned dataset has no bout-analysis extension.",
  );
});
const bout = fixture.bout.id,
  volk = "e1248941344b3288",
  ortega = "def8166ff24bd237";
const url = (fighter = volk, round = "all", id = bout) =>
  `/rankings?division=featherweight&fighter=${fighter}&view=bout&bout=${id}&round=${round}`;
const panel = (p: Page) =>
  p.getByRole("region", { name: "Bout analysis", exact: true });
const settle = async (p: Page) => {
  await expect(panel(p)).toBeVisible();
  await expect(p.locator("main")).toHaveAttribute("data-phase", "bout");
};

test("direct entry, round refresh, selected participant, native Back and Forward", async ({
  page,
}) => {
  await page.goto(url());
  await settle(page);
  await expect(
    panel(page).getByRole("button", { name: "ALL", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await panel(page).getByRole("button", { name: "R3", exact: true }).click();
  await settle(page);
  await expect(page).toHaveURL(/round=3/);
  await panel(page)
    .getByRole("button", { name: "Select Brian Ortega in bout" })
    .click();
  await settle(page);
  await expect(page.locator("[data-profile-fighter]")).toHaveAttribute(
    "data-profile-fighter",
    ortega,
  );
  await page.reload();
  await settle(page);
  await panel(page)
    .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
    .click();
  await expect(page.locator("[data-history-fighter]")).toHaveAttribute(
    "data-history-fighter",
    ortega,
  );
  await expect(page).toHaveURL(/view=history/);
  await page.goForward();
  await settle(page);
  await expect(page).toHaveURL(/round=3/);
  await page.goBack();
  await expect(page.locator("[data-history-fighter]")).toHaveAttribute(
    "data-history-fighter",
    ortega,
  );
  await page
    .getByRole("button", { name: "Back to rankings", exact: false })
    .click();
  await expect(page.locator("[role=listbox]")).toBeVisible();
});

test("history event opens bout and profile record returns to history", async ({
  page,
}) => {
  await page.goto(
    `/rankings?division=featherweight&fighter=${volk}&view=history`,
  );
  await page
    .getByRole("link", {
      name: "Open bout analysis: UFC 266: Volkanovski vs. Ortega",
      exact: true,
    })
    .click();
  await settle(page);
  await page
    .getByRole("link", {
      name: "Open recorded history for Alexander Volkanovski",
      exact: true,
    })
    .click();
  await expect(page.locator("[data-history-fighter]")).toHaveAttribute(
    "data-history-fighter",
    volk,
  );
});

test("hover-only radar and complete keyboard-accessible score disclosure", async ({
  page,
}) => {
  await page.goto(url());
  await settle(page);
  const svg = panel(page).getByRole("img", { name: /Five-axis/ });
  await expect(svg).toBeVisible();
  await expect(svg.locator("[tabindex]")).toHaveCount(0);
  const before = page.url();
  await svg.locator("[data-radar-series]").first().click({ force: true });
  expect(page.url()).toBe(before);
  const summary = panel(page).locator("summary");
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(
    panel(page).getByRole("table", {
      name: "Alexander Volkanovski grappling score breakdown",
    }),
  ).toBeVisible();
  await expect(panel(page).getByRole("table")).toHaveCount(10);
  await expect(
    panel(page).getByRole("table", {
      name: "Alexander Volkanovski damage score breakdown",
    }),
  ).toContainText("72.0");
  expect(
    await svg
      .locator("[data-radar-series]")
      .evaluateAll((es) =>
        es.every((e) => !e.hasAttribute("stroke-dasharray")),
      ),
  ).toBe(true);
});

test("invalid period and nonparticipant are explicit errors with a history return", async ({
  page,
}) => {
  await page.goto(url(volk, "99"));
  await expect(
    page.getByRole("alert", { name: "Fighter navigation error" }),
  ).toContainText("Bout unavailable");
  await expect(panel(page)).toHaveCount(0);
  await page.goto(url("0000000000000000"));
  await expect(
    page.getByRole("alert", { name: "Fighter navigation error" }),
  ).toContainText("Bout unavailable");
});

test("failed bout request retains history and retry succeeds", async ({
  page,
}) => {
  let fail = true;
  await page.route(`**/bouts/${bout}.json`, (r) =>
    fail ? r.fulfill({ status: 503, body: "unavailable" }) : r.continue(),
  );
  await page.goto(
    `/rankings?division=featherweight&fighter=${volk}&view=history`,
  );
  await page
    .getByRole("link", {
      name: "Open bout analysis: UFC 266: Volkanovski vs. Ortega",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("alert", { name: "Fighter navigation error" }),
  ).toBeVisible();
  await expect(page.locator("[data-history-fighter]")).toHaveAttribute(
    "data-history-fighter",
    volk,
  );
  fail = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await settle(page);
});

test("missing values keep radar unavailable and do not create zero statistics", async ({
  page,
}) => {
  await page.route(`**/bouts/${bout}.json`, async (r) => {
    const response = await r.fetch();
    const value = await response.json();
    for (const p of value.periods)
      for (const f of p.participants) f.stats = null;
    value.issues = ["missing-stats", "missing-period"];
    await r.fulfill({ json: value });
  });
  await page.goto(url());
  await settle(page);
  await expect(panel(page)).toContainText("Radar unavailable");
  await expect(panel(page).locator("[data-radar-series]")).toHaveCount(0);
  await panel(page).locator("summary").click();
  await expect(panel(page).getByRole("table").first()).toContainText("—");
});

test("rapid round and participant changes settle on the newest target", async ({
  page,
}) => {
  await page.goto(url());
  await settle(page);
  await panel(page).getByRole("button", { name: "R2", exact: true }).click();
  await panel(page).getByRole("button", { name: "R4", exact: true }).click();
  await panel(page).getByRole("button", { name: "R5", exact: true }).click();
  await settle(page);
  await expect(page).toHaveURL(/round=5/);
  await expect(
    panel(page).getByRole("button", { name: "R5", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("mobile and reduced motion preserve portrait, disclosure and history return", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url());
  await settle(page);
  await expect(page.locator("[data-selected-fighter]")).toHaveAttribute(
    "data-selected-fighter",
    volk,
  );
  await panel(page).locator("summary").click();
  await expect(panel(page).getByRole("table")).toHaveCount(10);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await panel(page)
    .getByRole("button", { name: "← FIGHT HISTORY", exact: true })
    .click();
  await expect(page.locator("[data-history-fighter]")).toBeVisible();
});

test("insufficient cohorts expose raw data and short periods receive a label", async ({
  page,
}) => {
  await page.route(`**/bout-references/*.json`, async (r) => {
    const response = await r.fetch();
    await r.fulfill({
      json: {
        ...(await response.json()),
        distinctBoutCount: 49,
        status: "insufficient-cohort",
      },
    });
  });
  await page.goto(url());
  await settle(page);
  await expect(panel(page)).toContainText("Only 49 eligible historical bouts");
  await page.unrouteAll({ behavior: "wait" });
  await page.route(`**/bouts/${bout}.json`, async (r) => {
    const response = await r.fetch();
    const value = await response.json();
    value.endRound = 1;
    value.endTime = "0:30";
    value.periods = value.periods.filter(
      (p: { round: number }) => p.round <= 1,
    );
    for (const p of value.periods) {
      p.elapsedSeconds = 30;
      for (const f of p.participants)
        for (const key of Object.keys(f.stats)) f.stats[key] = 0;
    }
    await r.fulfill({ json: value });
  });
  await page.goto(url());
  await settle(page);
  await expect(panel(page)).toContainText("Short sample · 30 seconds");
});

test("direct bout errors have a safe history action and the figure returns home", async ({
  page,
}) => {
  await page.goto(url(volk, "99"));
  await page
    .getByRole("alert", { name: "Fighter navigation error" })
    .getByRole("button", { name: "Fight history", exact: true })
    .click();
  await expect(page.locator("[data-history-fighter]")).toHaveAttribute(
    "data-history-fighter",
    volk,
  );
  await page.goto(url());
  await settle(page);
  await page
    .getByRole("button", { name: "Back to rankings", exact: false })
    .click();
  await expect(page.locator("[role=listbox]")).toBeVisible();
  await expect(page.locator("[data-selected-fighter]")).toHaveAttribute(
    "data-selected-fighter",
    volk,
  );
});
