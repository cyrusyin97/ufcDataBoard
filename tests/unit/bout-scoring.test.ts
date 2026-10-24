import { describe, expect, it } from "vitest";
import {
  boutMetricKeys,
  type BoutStats,
  type ScoringReference,
} from "../../src/lib/domain/bout-contracts";
import { axisWeights, scoreBout } from "../../src/lib/domain/bout-scoring";
const zero = Object.fromEntries(boutMetricKeys.map((k) => [k, 0])) as BoutStats;
const bounds = Object.fromEntries(
  boutMetricKeys.map((k) => [
    k,
    { upper: k === "ctrl_seconds" ? 1 : 10, method: "P95" },
  ]),
) as ScoringReference["periods"]["bout"]["bounds"];
const reference: ScoringReference = {
  schemaVersion: 1,
  datasetVersion: "2026-10-14-17c85108758d31ec",
  id: "a".repeat(64),
  formulaVersion: "1.1",
  policyVersion: "fixture",
  sourceDatabaseSha256: "b".repeat(64),
  divisionId: "featherweight",
  windowStart: "2016-09-25",
  cutoffExclusive: "2021-09-25",
  distinctBoutCount: 50,
  minimumBoutCount: 50,
  status: "available",
  periods: {
    bout: { observationCount: 100, bounds },
    round: { observationCount: 200, bounds },
  },
};
const score = (
  own: BoutStats | null,
  opp: BoutStats | null = zero,
  time: number | null = 300,
  ref: ScoringReference | null = reference,
) => scoreBout(own, opp, time, ref, "round");
describe("formula v1.1", () => {
  it("weights sum to one and zero stays zero", () => {
    Object.values(axisWeights).forEach((parts) =>
      expect(parts.reduce((s, [, w]) => s + w, 0)).toBeCloseTo(1),
    );
    expect(score(zero).map((a) => a.total)).toEqual([0, 0, 0, 0, 0]);
  });
  it("adds control and GNP without double-counting GNP in damage", () => {
    const result = score({
      ...zero,
      ctrl_seconds: 150,
      ground_landed: 10,
      sig_landed: 10,
    });
    expect(result[2].total).toBeCloseTo(27.5);
    expect(result[3].total).toBe(75);
  });
  it("caps KD contribution at 25 points and mirrors opponent damage in tank", () => {
    const own = { ...zero, kd: 10 },
      opp = { ...zero, sig_landed: 10 };
    expect(score(own, opp)[3].total).toBe(25);
    expect(score(own, opp)[4].total).toBe(score(opp, own)[3].total);
    expect(score({ ...zero, kd: 1000 })[3].total).toBe(25);
  });
  it("uses actual duration and control time share", () => {
    expect(
      score({ ...zero, distance_landed: 1, distance_attempted: 1 }, zero, 30)[0]
        .total,
    ).toBe(100);
    expect(score({ ...zero, ctrl_seconds: 15 }, zero, 30)[2].total).toBe(12.5);
  });
  it("does not reweight absent components or invent scores without reference/time", () => {
    const result = score({ ...zero, ctrl_seconds: null });
    expect(result[2].total).toBeNull();
    expect(result[0].total).toBe(0);
    for (const result of [
      score(zero, zero, null),
      score(zero, zero, 0),
      score(zero, zero, 300, null),
      score(zero, zero, 300, { ...reference, status: "insufficient-cohort" }),
    ])
      expect(result.every((a) => a.total === null)).toBe(true);
  });
  it("keeps full precision until display formatting", () => {
    expect(score({ ...zero, td_landed: 1 }, zero, 73)[2].total).toBeCloseTo(
      (30 * (300 / 73)) / 10,
    );
  });
});

import exported from "../fixtures/bout-analysis.json";
import {
  boutBundleSchema,
  scoringReferenceSchema,
} from "../../src/lib/domain/bout-contracts";
describe("exported UFC 266 reference", () => {
  it("matches the independently calculated V9 whole-bout fixture", () => {
    const bout = boutBundleSchema.parse(exported.bout);
    const ref = scoringReferenceSchema.parse(exported.reference);
    expect(ref.distinctBoutCount).toBe(271);
    const total = bout.periods.find((p) => p.round === 0)!;
    const volk = total.participants.find(
      (p) => p.fighterId === "e1248941344b3288",
    )!;
    const ortega = total.participants.find((p) => p !== volk)!;
    const values = scoreBout(
      volk.stats,
      ortega.stats,
      total.elapsedSeconds,
      ref,
      "bout",
    );
    expect(values.map((x) => Number(x.total?.toFixed(2)))).toEqual([
      81.06, 9.58, 17.41, 72.02, 29.62,
    ]);
    expect(
      values[2].components.find((c) => c.metric === "ctrl_seconds")!.raw,
    ).toBe(231);
  });
  it("rejects an available cohort with too few bouts and inconsistent bound metadata", () => {
    const ref = structuredClone(exported.reference);
    ref.distinctBoutCount = 49;
    expect(scoringReferenceSchema.safeParse(ref).success).toBe(false);
    const bad = structuredClone(exported.reference);
    (bad.periods.bout.bounds.kd as { upper: number | null }).upper = null;
    expect(scoringReferenceSchema.safeParse(bad).success).toBe(false);
  });
});
