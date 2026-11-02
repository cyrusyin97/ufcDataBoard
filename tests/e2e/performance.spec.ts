import { test, expect } from "@playwright/test";
import type {} from "../../src/lib/performance/client";
const home = "/rankings?division=featherweight&selected=e1248941344b3288";
const history =
  "/rankings?division=featherweight&fighter=e1248941344b3288&view=history";
test("diagnostics are opt-in, bounded, local, and reset on reload", async ({
  page,
}) => {
  const telemetry: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") telemetry.push(r.url());
  });
  await page.goto(home);
  await page.waitForFunction(() => !!window.__ufcPerf);
  expect(await page.evaluate(() => window.__ufcPerf!.status())).toMatchObject({
    enabled: false,
    active: 0,
    retained: 0,
  });
  await page.evaluate(() => window.__ufcPerf!.start());
  await page.getByRole("button", { name: "Next fighter", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-phase", "rankings");
  await expect(page).toHaveURL(/selected=76e2870ffafbe38f/);
  await expect(page.locator("main")).toHaveAttribute(
    "data-motion-stage",
    "idle",
  );
  const capture = (await page.evaluate(() => {
    window.__ufcPerf!.stop();
    return window.__ufcPerf!.export();
  })) as {
    records: {
      scene: string;
      outcome: string;
      spans: { stage: string }[];
      commitLatency: number | null;
    }[];
  };
  expect(capture.records).toHaveLength(1);
  expect(capture.records[0]).toMatchObject({
    scene: "dial",
    outcome: "completed",
  });
  expect(capture.records[0].commitLatency).not.toBeNull();
  expect(capture.records[0].spans.map((s) => s.stage)).toEqual(
    expect.arrayContaining([
      "prepare",
      "fighter",
      "decode",
      "commit",
      "arrival",
    ]),
  );
  expect(telemetry).toEqual([]);
  await page.reload();
  expect(await page.evaluate(() => window.__ufcPerf!.status())).toMatchObject({
    enabled: false,
    retained: 0,
  });
});
test("immediate round commits finish spans and preserve target proxy", async ({
  page,
}) => {
  await page.goto(
    "/rankings?division=featherweight&fighter=e1248941344b3288&view=bout&bout=18f1b88d8977c216&round=all",
  );
  await expect(page.locator("main")).toHaveAttribute("data-phase", "bout");
  await page.evaluate(() => window.__ufcPerf!.start());
  await page.getByRole("button", { name: "R1", exact: true }).click();
  await expect(page).toHaveURL(/round=1/);
  await expect(page.locator("main")).toHaveAttribute("data-phase", "bout");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
  );
  const capture = (await page.evaluate(() => {
    window.__ufcPerf!.stop();
    return window.__ufcPerf!.export();
  })) as {
    records: {
      scene: string;
      outcome: string;
      marks: Record<string, number>;
      spans: { stage: string; outcome: string }[];
    }[];
  };
  const r = capture.records[0];
  expect(r.scene).toBe("period");
  expect(r.outcome).toBe("completed");
  expect(r.marks.committed).toBeGreaterThanOrEqual(0);
  expect(r.marks.targetProxy).toBeGreaterThanOrEqual(r.marks.committed);
  expect(r.spans.find((s) => s.stage === "commit")?.outcome).toBe("completed");
});
test("capture stops safely on resize and allows another session", async ({
  page,
}) => {
  await page.goto(history);
  await expect(page.locator("main")).toHaveAttribute("data-phase", "history");
  await page.evaluate(() => window.__ufcPerf!.start());
  await page.setViewportSize({ width: 800, height: 800 });
  await expect
    .poll(() => page.evaluate(() => window.__ufcPerf!.status()))
    .toMatchObject({ enabled: false });
  expect(await page.evaluate(() => window.__ufcPerf!.status())).toMatchObject({
    enabled: false,
    active: 0,
  });
  await page.evaluate(() => window.__ufcPerf!.start());
  await page.evaluate(() => window.__ufcPerf!.stop());
  expect(await page.evaluate(() => window.__ufcPerf!.status())).toMatchObject({
    enabled: false,
    active: 0,
  });
});

test("rapid selections retain separate cancelled and completed measurements", async ({
  page,
}) => {
  await page.goto(home);
  await page.waitForFunction(() => !!window.__ufcPerf);
  await page.evaluate(() => window.__ufcPerf!.start());
  await page.evaluate(() => {
    const next = document.querySelector<HTMLButtonElement>(
      'button[aria-label="Next fighter"]',
    )!;
    next.click();
    next.click();
  });
  await expect(page.locator("main")).toHaveAttribute("data-phase", "rankings");
  await expect(page.locator("main")).toHaveAttribute(
    "data-motion-stage",
    "idle",
  );
  await expect(page).not.toHaveURL(/selected=e1248941344b3288/);
  const capture = (await page.evaluate(() => {
    window.__ufcPerf!.stop();
    return window.__ufcPerf!.export();
  })) as { records: { outcome: string; generation: number }[] };
  expect(capture.records.some((r) => r.outcome === "cancelled")).toBe(true);
  expect(capture.records.filter((r) => r.outcome === "completed")).toHaveLength(
    1,
  );
  expect(new Set(capture.records.map((r) => r.generation)).size).toBe(
    capture.records.length,
  );
});

test("repeated capture and clear retain bounded browser memory", async ({
  page,
  browserName,
  browser,
}) => {
  test.skip(browserName !== "chromium", "Heap counters require Chromium.");
  test.setTimeout(120000);
  await page.goto(home);
  await page.waitForFunction(() => !!window.__ufcPerf);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await page.evaluate(async () => {
    await window.__ufcPerf!.start();
    window.__ufcPerf!.stop();
    window.__ufcPerf!.clear();
  });
  const recorderCount = async () => {
    const chunks: string[] = [];
    const collect = (event: { chunk: string }) => chunks.push(event.chunk);
    cdp.on("HeapProfiler.addHeapSnapshotChunk", collect);
    await cdp.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
    cdp.off("HeapProfiler.addHeapSnapshotChunk", collect);
    const heap = JSON.parse(chunks.join("")) as {
      snapshot: {
        meta: {
          node_fields: string[];
          edge_fields: string[];
          edge_types: (string[] | string)[];
        };
      };
      nodes: number[];
      edges: number[];
      strings: string[];
    };
    const nf = heap.snapshot.meta.node_fields,
      ef = heap.snapshot.meta.edge_fields;
    const edgeCount = nf.indexOf("edge_count"),
      edgeType = ef.indexOf("type"),
      edgeName = ef.indexOf("name_or_index");
    const property = (
      heap.snapshot.meta.edge_types[edgeType] as string[]
    ).indexOf("property");
    const required = new Set([
      "enabled",
      "records",
      "active",
      "gestures",
      "losses",
    ]);
    let edge = 0,
      count = 0;
    for (let node = 0; node < heap.nodes.length; node += nf.length) {
      let matches = 0;
      for (
        let i = 0;
        i < heap.nodes[node + edgeCount];
        i++, edge += ef.length
      ) {
        if (
          heap.edges[edge + edgeType] === property &&
          required.has(heap.strings[heap.edges[edge + edgeName]])
        )
          matches++;
      }
      if (matches === required.size) count++;
    }
    return count;
  };
  const retainedBefore = await recorderCount();
  const samples: {
    cycle: number;
    heapBytes: number | null;
    status: unknown;
  }[] = [];
  for (let batch = 0; batch <= 5; batch++) {
    if (batch)
      for (let i = 0; i < 10; i++) {
        await page.evaluate(async () => {
          await window.__ufcPerf!.start();
          document
            .querySelector<HTMLButtonElement>(
              '[role="option"][aria-selected="true"]',
            )!
            .click();
          window.__ufcPerf!.stop();
          window.__ufcPerf!.clear();
        });
      }
    await cdp.send("HeapProfiler.collectGarbage");
    const metrics = await cdp.send("Performance.getMetrics");
    const status = await page.evaluate(() => window.__ufcPerf!.status());
    expect(status).toMatchObject({ enabled: false, active: 0, retained: 0 });
    samples.push({
      cycle: batch * 10,
      heapBytes:
        metrics.metrics.find((m) => m.name === "JSHeapUsedSize")?.value ?? null,
      status,
    });
  }
  const retainedAfter = await recorderCount();
  expect(retainedBefore).toBe(1);
  expect(retainedAfter).toBe(retainedBefore);
  const fs = await import("node:fs");
  fs.mkdirSync("work/m7", { recursive: true });
  fs.writeFileSync(
    "work/m7/retention.json",
    JSON.stringify(
      {
        scope:
          "50 capture/ignored-selection/stop/clear cycles; forced GC at checkpoints",
        browserVersion: browser.version(),
        recorderObjects: {
          before: retainedBefore,
          after: retainedAfter,
          method:
            "Heap snapshot own-property shape: enabled, records, active, gestures, losses",
        },
        samples,
      },
      null,
      2,
    ),
  );
});
