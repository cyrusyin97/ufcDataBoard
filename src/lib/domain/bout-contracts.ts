import { z } from "zod";
import { idSchema } from "./contracts.ts";

export const boutMetricKeys = [
  "distance_landed",
  "distance_attempted",
  "clinch_landed",
  "clinch_attempted",
  "td_landed",
  "td_attempted",
  "sub_att",
  "ctrl_seconds",
  "ground_landed",
  "sig_landed",
  "kd",
] as const;
export type BoutMetric = (typeof boutMetricKeys)[number];
const count = z.number().int().nonnegative().nullable();
const version = z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-f0-9]{16}$/);
const hash = z.string().regex(/^[a-f0-9]{64}$/);
export const boutStatsSchema = z
  .object({
    distance_landed: count,
    distance_attempted: count,
    clinch_landed: count,
    clinch_attempted: count,
    td_landed: count,
    td_attempted: count,
    sub_att: count,
    ctrl_seconds: count,
    ground_landed: count,
    sig_landed: count,
    kd: count,
  })
  .strict();
export const boutPeriodSchema = z
  .object({
    round: z.number().int().nonnegative(),
    elapsedSeconds: z.number().int().positive().nullable(),
    participants: z.tuple([
      z
        .object({ fighterId: idSchema, stats: boutStatsSchema.nullable() })
        .strict(),
      z
        .object({ fighterId: idSchema, stats: boutStatsSchema.nullable() })
        .strict(),
    ]),
  })
  .strict();
export const boutIssueSchema = z.enum([
  "missing-stats",
  "missing-period",
  "unknown-duration",
  "unmapped-division",
  "event-conflict",
  "invalid-stats",
  "incomplete-stats",
]);
export const boutBundleSchema = z
  .object({
    schemaVersion: z.literal(1),
    datasetVersion: version,
    id: idSchema,
    fighterIds: z.tuple([idSchema, idSchema]),
    divisionId: z
      .string()
      .regex(/^[a-z][a-z0-9-]*$/)
      .nullable(),
    boutType: z.string().nullable(),
    eventName: z.string().nullable(),
    eventDate: z.iso.date().nullable(),
    sourceUrl: z.url().nullable(),
    capturedAt: z.string().nullable(),
    timeFormat: z.string().nullable(),
    endRound: z.number().int().positive().nullable(),
    endTime: z.string().nullable(),
    method: z.string().nullable(),
    outcomes: z.tuple([
      z.enum(["W", "L", "D", "NC"]).nullable(),
      z.enum(["W", "L", "D", "NC"]).nullable(),
    ]),
    periods: z.array(boutPeriodSchema),
    issues: z.array(boutIssueSchema),
    referenceId: hash.nullable(),
  })
  .strict()
  .superRefine((bout, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    if (bout.fighterIds[0] === bout.fighterIds[1])
      fail("Bout participants must differ");
    const rounds = bout.periods.map((p) => p.round);
    if (new Set(rounds).size !== rounds.length) fail("Duplicate bout period");
    if (rounds.some((r, i) => i > 0 && r < rounds[i - 1]))
      fail("Periods must be ordered");
    for (const period of bout.periods) {
      if (bout.endRound !== null && period.round > bout.endRound)
        fail("Period exceeds ending round");
      period.participants.forEach((p, index) => {
        if (p.fighterId !== bout.fighterIds[index])
          fail("Participant order differs from bout identity");
        if (!p.stats) return;
        for (const [landed, attempted] of [
          ["distance_landed", "distance_attempted"],
          ["clinch_landed", "clinch_attempted"],
          ["td_landed", "td_attempted"],
        ] as const) {
          const l = p.stats[landed],
            a = p.stats[attempted];
          if (l !== null && a !== null && l > a)
            fail("Landed count exceeds attempts");
        }
        if (
          p.stats.ctrl_seconds !== null &&
          period.elapsedSeconds !== null &&
          p.stats.ctrl_seconds > period.elapsedSeconds
        )
          fail("Control exceeds elapsed duration");
        const {
          sig_landed: sig,
          distance_landed: distance,
          clinch_landed: clinch,
          ground_landed: ground,
        } = p.stats;
        if (
          sig !== null &&
          distance !== null &&
          clinch !== null &&
          ground !== null &&
          sig !== distance + clinch + ground
        )
          fail("Significant strike partition differs");
      });
    }
  });

const bound = z
  .object({
    upper: z.number().positive().nullable(),
    method: z.enum(["P95", "P99", "MAX"]).nullable(),
  })
  .strict()
  .refine(
    (v) => (v.upper === null) === (v.method === null),
    "Bound and method must be present together",
  );
export const scoringReferenceSchema = z
  .object({
    schemaVersion: z.literal(1),
    datasetVersion: version,
    id: hash,
    formulaVersion: z.literal("1.1"),
    policyVersion: z.string().min(1),
    sourceDatabaseSha256: hash,
    divisionId: z.string().regex(/^[a-z][a-z0-9-]*$/),
    windowStart: z.iso.date(),
    cutoffExclusive: z.iso.date(),
    distinctBoutCount: z.number().int().nonnegative(),
    minimumBoutCount: z.number().int().positive(),
    status: z.enum(["available", "insufficient-cohort"]),
    periods: z
      .object({
        bout: z
          .object({
            observationCount: z.number().int().nonnegative(),
            bounds: z.record(z.enum(boutMetricKeys), bound),
          })
          .strict(),
        round: z
          .object({
            observationCount: z.number().int().nonnegative(),
            bounds: z.record(z.enum(boutMetricKeys), bound),
          })
          .strict(),
      })
      .strict(),
  })
  .strict()
  .superRefine((ref, ctx) => {
    if (ref.windowStart >= ref.cutoffExclusive)
      ctx.addIssue({ code: "custom", message: "Invalid reference window" });
    if (
      (ref.status === "available") !==
      ref.distinctBoutCount >= ref.minimumBoutCount
    )
      ctx.addIssue({
        code: "custom",
        message: "Cohort status disagrees with minimum sample",
      });
  });
export type BoutBundle = z.infer<typeof boutBundleSchema>;
export type BoutStats = z.infer<typeof boutStatsSchema>;
export type ScoringReference = z.infer<typeof scoringReferenceSchema>;
