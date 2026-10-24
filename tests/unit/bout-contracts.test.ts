import { describe, expect, it } from "vitest";
import {
  boutBundleSchema,
  boutMetricKeys,
  type BoutBundle,
} from "../../src/lib/domain/bout-contracts";
const a = "a".repeat(16),
  b = "b".repeat(16);
const zero = Object.fromEntries(boutMetricKeys.map((k) => [k, 0]));
function fixture() {
  return {
    schemaVersion: 1,
    datasetVersion: "2026-10-14-17c85108758d31ec",
    id: "c".repeat(16),
    fighterIds: [a, b],
    divisionId: "featherweight",
    boutType: "Featherweight Bout",
    eventName: "UFC fixture",
    eventDate: "2021-09-25",
    sourceUrl: null,
    capturedAt: null,
    timeFormat: "3 Rnd (5-5-5)",
    endRound: 1,
    endTime: "1:00",
    method: null,
    outcomes: ["W", "L"],
    periods: [
      {
        round: 0,
        elapsedSeconds: 60,
        participants: [
          { fighterId: a, stats: { ...zero } },
          { fighterId: b, stats: { ...zero } },
        ],
      },
    ],
    issues: [],
    referenceId: null,
  };
}
describe("planned bout bundle boundary", () => {
  it("accepts missing statistics without inventing zeros", () => {
    const v = boutBundleSchema.parse(fixture());
    v.periods[0].participants[0].stats = null;
    v.issues = ["missing-stats"];
    expect(
      boutBundleSchema.parse(v).periods[0].participants[0].stats,
    ).toBeNull();
  });
  it("rejects mixed identities and duplicate periods", () => {
    const v = fixture();
    v.periods[0].participants[1].fighterId = a;
    expect(boutBundleSchema.safeParse(v).success).toBe(false);
    const duplicate = fixture();
    duplicate.periods.push(duplicate.periods[0]);
    expect(boutBundleSchema.safeParse(duplicate).success).toBe(false);
  });
  it("rejects impossible counts, durations, and strike partitions", () => {
    for (const patch of [
      { td_landed: 1 },
      { ctrl_seconds: 61 },
      { sig_landed: 1 },
      { kd: -1 },
    ]) {
      const v = fixture();
      Object.assign(v.periods[0].participants[0].stats, patch);
      expect(boutBundleSchema.safeParse(v).success).toBe(false);
    }
  });
  it("preserves a partially missing component", () => {
    const v = boutBundleSchema.parse(fixture());
    (
      v.periods[0].participants[0].stats as NonNullable<
        BoutBundle["periods"][number]["participants"][number]["stats"]
      >
    ).ctrl_seconds = null;
    expect(
      boutBundleSchema.parse(v).periods[0].participants[0].stats?.ctrl_seconds,
    ).toBeNull();
  });
});
