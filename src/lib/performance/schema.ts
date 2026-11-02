import { z } from "zod";
const number = z.number().finite().nonnegative();
const outcome = z.enum([
  "completed",
  "cancelled",
  "error",
  "ignored",
  "incomplete",
]);
const reason = z.enum([
  "superseded",
  "resize",
  "hidden",
  "stop",
  "unmount",
  "timeout",
  "duplicate",
  "busy",
  "request",
  "collector",
  "return",
]);
const input = z.enum([
  "click",
  "keyboard",
  "wheel",
  "drag",
  "pointer",
  "traverse",
  "programmatic",
]);
const route = z
  .object({
    view: z.enum(["rankings", "history", "bout"]),
    division: z
      .string()
      .regex(/^[a-z-]{1,48}$/)
      .nullable(),
    fighter: z
      .string()
      .regex(/^[a-f0-9]{16}$/)
      .nullable(),
    bout: z
      .string()
      .regex(/^[a-f0-9]{16}$/)
      .nullable(),
    period: z.union([number, z.literal("all")]).nullable(),
  })
  .strict();
const distribution = z
  .object({
    count: number,
    median: number.nullable(),
    p95: number.nullable(),
    max: number.nullable(),
    above33: number,
    above50: number,
  })
  .strict();
export const captureSchema = z
  .object({
    schemaVersion: z.literal(1),
    metricDefinitionVersion: z.literal(1),
    mode: z.literal("diagnostic"),
    percentileMethod: z.literal("nearest-rank"),
    records: z
      .array(
        z
          .object({
            id: number,
            generation: number.nullable(),
            gestureId: number.nullable(),
            parentId: number.nullable(),
            scene: z.enum([
              "navigation",
              "division",
              "dial",
              "history-open",
              "history-return",
              "bout-open",
              "bout-return",
              "participant",
              "period",
              "opponent",
              "preview",
            ]),
            input,
            from: route.nullable(),
            to: route.nullable(),
            start: number,
            end: number.nullable(),
            outcome: outcome.nullable(),
            reason: reason.nullable(),
            handlerDelay: number.nullable(),
            marks: z
              .object({
                pendingProxy: number.optional(),
                targetProxy: number.optional(),
                committed: number.optional(),
              })
              .strict(),
            spans: z
              .array(
                z
                  .object({
                    stage: z.enum([
                      "prepare",
                      "fighter",
                      "index",
                      "media",
                      "bout",
                      "reference",
                      "decode",
                      "fonts",
                      "departure",
                      "commit",
                      "arrival",
                    ]),
                    start: number,
                    end: number.nullable(),
                    cache: z.enum(["hit", "miss", "unknown"]),
                    outcome: outcome.nullable(),
                    detail: z.enum(["timeout", "decode-failed"]).nullable(),
                  })
                  .strict(),
              )
              .max(64),
            frameTruncated: number,
            spanTruncated: number,
            longFrames: z
              .object({ count: number, duration: number })
              .strict()
              .nullable(),
            frameSummary: distribution,
            windowMs: number.nullable(),
            commitLatency: number.nullable(),
            settleLatency: number.nullable(),
          })
          .strict(),
      )
      .max(200),
    gestures: z
      .array(
        z
          .object({
            id: number,
            input,
            start: number,
            end: number.nullable(),
            count: number,
            latest: number.nullable(),
            outcome: outcome.nullable(),
          })
          .strict(),
      )
      .max(200),
    runFrameSummary: distribution,
    losses: z
      .object({
        evicted: number,
        skipped: number,
        failures: number,
        gestures: number,
        frames: number,
      })
      .strict(),
  })
  .strict();
