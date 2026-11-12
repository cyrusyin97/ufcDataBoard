import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type {} from "../../src/lib/performance/client";

test("history starts its portrait while the fighter response is pending", async ({
  page,
}) => {
  const version =
    process.env.UFC_PREVIEW_DATASET_VERSION ??
    JSON.parse(readFileSync("public/data/current.json", "utf8")).datasetVersion;
  const media = JSON.parse(
    readFileSync(`public/data/v1/${version}/media.json`, "utf8"),
  );
  const portrait =
    media.fighters.e1248941344b3288.full_body.variants.at(-1).url;
  await page.goto("/rankings?division=featherweight&selected=e1248941344b3288");
  await page.waitForFunction(() => !!window.__ufcPerf);
  await page.evaluate(() => window.__ufcPerf!.start());
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/fighters/e1248941344b3288.json", async (route) => {
    await hold;
    await route.continue();
  });
  const requested = page.waitForRequest((request) =>
    request.url().endsWith(portrait),
  );
  try {
    await page
      .getByRole("link", {
        name: "Open recorded history for Alexander Volkanovski",
        exact: true,
      })
      .click();
    await requested;
    await expect(page.locator("main")).toHaveAttribute(
      "data-phase",
      "preparing",
    );
  } finally {
    release();
  }
  await expect(page.locator("main")).toHaveAttribute("data-phase", "history");
  const sample = await page.evaluate(() => {
    window.__ufcPerf!.stop();
    return window.__ufcPerf!.snapshot();
  });
  expect(sample.last?.total).toBeGreaterThan(0);
});

test("hover prepares history once and click reuses the completed bundle", async ({
  page,
}) => {
  const version = JSON.parse(
    readFileSync("public/data/current.json", "utf8"),
  ).datasetVersion;
  const media = JSON.parse(
    readFileSync(`public/data/v1/${version}/media.json`, "utf8"),
  );
  const portrait =
    media.fighters.e1248941344b3288.full_body.variants.at(-1).url;
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/fighters/e1248941344b3288.json")) requests++;
  });
  await page.goto("/rankings?division=featherweight&selected=e1248941344b3288");
  await page.waitForFunction(() => !!window.__ufcPerf);
  const ready = page.waitForEvent("requestfinished", (request) =>
    request.url().endsWith(portrait),
  );
  const link = page.getByRole("link", {
    name: "Open recorded history for Alexander Volkanovski",
    exact: true,
  });
  await link.hover();
  await ready;
  await page.evaluate(() => window.__ufcPerf!.start());
  await link.click();
  await expect(page.locator("main")).toHaveAttribute("data-phase", "history");
  expect(requests).toBe(1);
  const snapshot = await page.evaluate(() => {
    window.__ufcPerf!.stop();
    return window.__ufcPerf!.snapshot();
  });
  expect(snapshot.last?.prepare).toBeLessThan(150);
});

test("embedded bout reference avoids a second HTTP request", async ({
  page,
}) => {
  const version = JSON.parse(
    readFileSync("public/data/current.json", "utf8"),
  ).datasetVersion;
  const root = `public/data/v1/${version}`;
  const bout = JSON.parse(
    readFileSync(`${root}/bouts/18f1b88d8977c216.json`, "utf8"),
  );
  const reference = JSON.parse(
    readFileSync(`${root}/bout-references/${bout.referenceId}.json`, "utf8"),
  );
  let requests = 0;
  page.on("request", (request) => {
    if (request.url().includes("/bout-references/")) requests++;
  });
  await page.route("**/bouts/18f1b88d8977c216.json", (route) =>
    route.fulfill({ json: { ...bout, reference } }),
  );
  await page.goto(
    "/rankings?division=featherweight&fighter=e1248941344b3288&view=bout&bout=18f1b88d8977c216&round=all",
  );
  await expect(page.locator("main")).toHaveAttribute("data-phase", "bout");
  expect(requests).toBe(0);
  await expect(page.getByText("BOUT SIGNATURE", { exact: true })).toBeVisible();
});

test("embedded media opens an unranked fighter without the index or media manifest", async ({
  page,
}) => {
  const version = JSON.parse(
    readFileSync("public/data/current.json", "utf8"),
  ).datasetVersion;
  const root = `public/data/v1/${version}`;
  const ranked = new Set<string>(
    JSON.parse(
      readFileSync(`${root}/divisions.json`, "utf8"),
    ).divisions.flatMap((d: { entries: { fighterId: string }[] }) =>
      d.entries.map((e) => e.fighterId),
    ),
  );
  const id: string = JSON.parse(
    readFileSync(`${root}/index.json`, "utf8"),
  ).fighters.find((f: { id: string }) => !ranked.has(f.id)).id;
  const bundle = JSON.parse(
    readFileSync(`${root}/fighters/${id}.json`, "utf8"),
  );
  const media = JSON.parse(readFileSync(`${root}/media.json`, "utf8"));
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.route(`**/fighters/${id}.json`, (route) =>
    route.fulfill({ json: { ...bundle, media: media.fighters[id] } }),
  );
  await page.goto(
    `/rankings?division=featherweight&fighter=${id}&view=history`,
  );
  await expect(page.locator("main")).toHaveAttribute("data-phase", "history");
  await expect(page.locator("[data-selected-fighter]")).toHaveAttribute(
    "data-selected-fighter",
    id,
  );
  expect(
    requests.filter((url) => url.includes(`/fighters/${id}.json`)),
  ).toHaveLength(1);
  expect(
    requests.some(
      (url) => url.endsWith("/index.json") || url.endsWith("/media.json"),
    ),
  ).toBe(false);
});
