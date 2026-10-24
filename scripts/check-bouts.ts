import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  boutMetricKeys,
  boutBundleSchema,
  scoringReferenceSchema,
  type ScoringReference,
} from "../src/lib/domain/bout-contracts.ts";
import { axisWeights } from "../src/lib/domain/bout-scoring.ts";

export const boutPolicySchema = z
  .object({
    schemaVersion: z.literal(1),
    policyVersion: z.literal("1"),
    formulaVersion: z.literal("1.1"),
    historyYears: z.literal(5),
    minimumBoutCount: z.literal(50),
    shortPeriodSeconds: z.literal(60),
    referenceTimeFormats: z.tuple([
      z.literal("3 Rnd (5-5-5)"),
      z.literal("5 Rnd (5-5-5-5-5)"),
    ]),
    weights: z.record(
      z.enum(["striking", "clinching", "grappling", "damage", "tank"]),
      z.record(z.string(), z.number().positive()),
    ),
  })
  .strict();
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
export function checkBouts(
  directory: string,
  version: string,
  sourceHash: string,
  boutParticipants: Map<string, Set<string>>,
  descriptor: {
    boutCount: number;
    referenceCount: number;
    policyVersion: string;
  },
) {
  const read = (file: string) =>
    JSON.parse(readFileSync(path.join(directory, file), "utf8"));
  const policy = boutPolicySchema.parse(read("bout-policy.json"));
  assert(
    policy.policyVersion === descriptor.policyVersion,
    "Bout policy version differs",
  );
  for (const [axis, parts] of Object.entries(axisWeights)) {
    const weights = policy.weights[axis as keyof typeof axisWeights];
    assert(
      Object.keys(weights).length === parts.length &&
        parts.every(([key, value]) => weights[key] === value),
      "Export and UI scoring weights differ",
    );
  }
  const references = new Map<string, ScoringReference>();
  const files = readdirSync(path.join(directory, "bout-references"));
  assert(files.length === descriptor.referenceCount, "Reference count differs");
  for (const file of files) {
    const ref = scoringReferenceSchema.parse(read("bout-references/" + file));
    assert(
      file === ref.id + ".json" &&
        ref.datasetVersion === version &&
        ref.sourceDatabaseSha256 === sourceHash,
      "Reference identity or source differs",
    );
    assert(
      ref.policyVersion === policy.policyVersion &&
        ref.minimumBoutCount === policy.minimumBoutCount,
      "Reference policy differs",
    );
    const cutoff = new Date(ref.cutoffExclusive + "T00:00:00Z");
    const expected = new Date(cutoff);
    expected.setUTCFullYear(cutoff.getUTCFullYear() - policy.historyYears);
    if (expected.getUTCMonth() !== cutoff.getUTCMonth()) expected.setUTCDate(0);
    assert(
      ref.windowStart === expected.toISOString().slice(0, 10),
      "Reference lookback differs",
    );
    assert(
      ref.periods.bout.observationCount === 2 * ref.distinctBoutCount,
      "Reference bout observation count differs",
    );
    references.set(ref.id, ref);
  }
  const bouts = readdirSync(path.join(directory, "bouts"));
  assert(
    bouts.length === descriptor.boutCount &&
      bouts.length === boutParticipants.size,
    "Analysis bout coverage differs",
  );
  const used = new Set<string>();
  for (const file of bouts) {
    const bout = boutBundleSchema.parse(read("bouts/" + file));
    assert(
      file === bout.id + ".json" && bout.datasetVersion === version,
      "Bout identity or version differs",
    );
    const fighters = boutParticipants.get(bout.id);
    assert(
      fighters?.size === 2 && bout.fighterIds.every((id) => fighters.has(id)),
      "Analysis participants differ from fighter history",
    );
    const rounds = bout.periods.map((p) => p.round);
    assert(rounds.includes(0), "Bout total period missing");
    if (bout.endRound !== null)
      assert(
        rounds.length === bout.endRound + 1,
        "Expected bout periods missing",
      );
    for (const period of bout.periods) {
      if (period.elapsedSeconds === null)
        assert(
          bout.issues.includes("unknown-duration"),
          "Missing duration reason",
        );
      for (const p of period.participants) {
        if (p.stats === null)
          assert(
            bout.issues.includes("missing-period") ||
              bout.issues.includes("invalid-stats"),
            "Missing statistics reason",
          );
        else if (Object.values(p.stats).some((v) => v === null))
          assert(
            bout.issues.includes("incomplete-stats"),
            "Incomplete statistics reason",
          );
      }
    }
    const total = bout.periods.find((p) => p.round === 0)!;
    const roundsOnly = bout.periods.filter((p) => p.round > 0);
    if (bout.endRound !== null && roundsOnly.length === bout.endRound) {
      bout.fighterIds.forEach((_, i) => {
        for (const metric of boutMetricKeys) {
          const whole = total.participants[i].stats?.[metric];
          const values = roundsOnly.map(
            (p) => p.participants[i].stats?.[metric],
          );
          if (whole != null && values.every((value) => value != null))
            assert(
              values.reduce<number>((sum, value) => sum + value!, 0) === whole,
              "Bout total differs from complete rounds",
            );
        }
      });
    }
    if (bout.referenceId) {
      used.add(bout.referenceId);
      const ref = references.get(bout.referenceId);
      assert(
        ref &&
          ref.divisionId === bout.divisionId &&
          ref.cutoffExclusive === bout.eventDate,
        "Bout references another division or cutoff",
      );
    } else
      assert(
        bout.divisionId === null || bout.eventDate === null,
        "Scorable identity has no reference",
      );
  }
  assert(used.size === references.size, "Unreferenced cohort artifact");
}
