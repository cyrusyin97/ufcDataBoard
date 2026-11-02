import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { distribution } from "../src/lib/performance/export.ts";
const input = process.argv[2] ?? "work/m7/overhead.json";
const receipt = JSON.parse(readFileSync(input, "utf8")) as {
  date: string;
  datasetVersion: string;
  browser: string;
  viewport: unknown;
  limitations: string[];
  rows: {
    scene: string;
    enabled: boolean;
    iteration: number;
    probe: { duration: number; frames: number[]; timeout: boolean };
    before?: { name: string; value: number }[];
    after?: { name: string; value: number }[];
  }[];
};
const scenes = [...new Set(receipt.rows.map((r) => r.scene))];
const comparisons = scenes.map((scene) => {
  const groups = [false, true].map((enabled) => {
    const rows = receipt.rows.filter(
      (r) => r.scene === scene && r.enabled === enabled,
    );
    const counter = (name: string) =>
      rows.flatMap((r) => {
        const a = r.before?.find((x) => x.name === name)?.value,
          b = r.after?.find((x) => x.name === name)?.value;
        return a === undefined || b === undefined ? [] : [(b - a) * 1000];
      });
    return {
      enabled,
      samples: rows.length,
      latency: distribution(rows.map((r) => r.probe.duration)),
      frameIntervals: distribution(rows.flatMap((r) => r.probe.frames)),
      scriptMs: distribution(counter("ScriptDuration")),
      layoutMs: distribution(counter("LayoutDuration")),
    };
  });
  const [off, on] = groups;
  const medianDelta = on.latency.median! - off.latency.median!,
    p95Delta = on.latency.p95! - off.latency.p95!,
    frameP95Delta = on.frameIntervals.p95! - off.frameIntervals.p95!;
  return {
    scene,
    groups,
    medianDelta,
    p95Delta,
    frameP95Delta,
    numericLimitsPass:
      medianDelta <= Math.max(10, off.latency.median! * 0.05) &&
      p95Delta <= Math.max(10, off.latency.p95! * 0.05) &&
      frameP95Delta <= 2,
  };
});
const summary = {
  date: receipt.date,
  datasetVersion: receipt.datasetVersion,
  browser: receipt.browser,
  viewport: receipt.viewport,
  status: "partial evidence; not full PM09 acceptance",
  limitations: receipt.limitations,
  comparisons,
};
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  process.argv[3] ?? "docs/evidence/m7-overhead-summary.json",
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    comparisons.map((c) => ({
      scene: c.scene,
      pass: c.numericLimitsPass,
      medianDelta: c.medianDelta,
      p95Delta: c.p95Delta,
      frameP95Delta: c.frameP95Delta,
    })),
    null,
    2,
  ),
);
