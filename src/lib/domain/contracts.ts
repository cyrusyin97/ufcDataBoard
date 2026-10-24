import { z } from "zod";

export const idSchema = z.string().regex(/^[a-f0-9]{16}$/);
const hashSchema = z.string().regex(/^[a-f0-9]{64}$/);
const versionSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}-[a-f0-9]{16}$/);
const nullableText = z.string().nullable();
const nullableCount = z.number().int().nonnegative().nullable();
const schemaVersion = z.literal(1);

export const profileSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1),
    displayName: z.string().min(1),
    ufcSlug: nullableText,
    nickname: nullableText,
    careerRecord: z
      .object({
        wins: nullableCount,
        losses: nullableCount,
        draws: nullableCount,
        noContests: nullableCount,
      })
      .strict(),
    birthDate: z.iso.date().nullable(),
    ageAtSnapshot: nullableCount,
    heightCm: z.number().positive().nullable(),
    reachCm: z.number().positive().nullable(),
    stance: nullableText,
    placeOfBirth: nullableText,
    trainingGym: nullableText,
    fightingStyle: nullableText,
    status: nullableText,
    finishCounts: z
      .object({ knockout: nullableCount, submission: nullableCount })
      .strict(),
    fieldSources: z
      .object({
        careerRecord: z.url(),
        birthDate: z.url(),
        heightCm: z.url(),
        reachCm: z.url(),
        finishCounts: z.url().nullable(),
        biography: z.url().nullable(),
      })
      .strict(),
    sourceObservations: z
      .object({
        ufcCom: z
          .object({
            capturedAt: z.iso.date(),
            sourceUrl: z.url(),
            values: z.record(z.string(), z.unknown()),
          })
          .strict()
          .nullable(),
        ufcstats: z
          .object({ sourceUrl: z.url(), scrapedAt: nullableText })
          .strict(),
      })
      .strict(),
    sourceUrl: z.url(),
  })
  .strict();

export const fightSchema = z
  .object({
    id: idSchema,
    fighterId: idSchema,
    opponentId: idSchema,
    opponentName: nullableText,
    eventId: z.string().min(1),
    eventName: z.string().min(1),
    date: z.iso.date().nullable(),
    location: nullableText,
    result: z.enum(["W", "L", "D", "NC"]),
    method: nullableText,
    round: z.number().int().positive().nullable(),
    time: nullableText,
    sourceUrl: z.url().nullable(),
  })
  .strict();
export const bundleSchema = z
  .object({
    schemaVersion,
    datasetVersion: versionSchema,
    profile: profileSchema,
    records: z.array(fightSchema),
  })
  .strict();

export const divisionSchema = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/),
    label: z.string().min(1),
    weightLb: z.number().positive().nullable(),
    publicationState: z.enum(["published", "draft"]),
    snapshotAt: z.iso.date(),
    sourceUrl: z.url(),
    defaultFighterId: idSchema.nullable(),
    entries: z.array(
      z
        .object({
          fighterId: idSchema,
          rank: z.number().int().nonnegative(),
          isChampion: z.boolean(),
        })
        .strict(),
    ),
  })
  .strict();
export const registrySchema = z
  .object({
    schemaVersion,
    datasetVersion: versionSchema,
    defaultDivisionId: z.string(),
    divisions: z.array(divisionSchema),
  })
  .strict();
export const indexSchema = z
  .object({
    schemaVersion,
    datasetVersion: versionSchema,
    fighters: z.array(
      z
        .object({
          id: idSchema,
          name: z.string().min(1),
          displayName: z.string().min(1),
          ufcSlug: nullableText,
        })
        .strict(),
    ),
  })
  .strict();
export const mediaRoleSchema = z.enum(["headshot", "half_body", "full_body"]);
export const mediaAssetSchema = z
  .object({
    sourceUrl: z.url(),
    sourceSha256: hashSchema,
    role: mediaRoleSchema,
    reviewedAt: z.iso.date(),
    rightsStatus: z.enum(["unknown", "approved", "restricted"]),
    variants: z
      .array(
        z
          .object({
            url: z
              .string()
              .regex(
                /^\/data\/v1\/\d{4}-\d{2}-\d{2}-[a-f0-9]{16}\/media\/[a-f0-9]{64}\.webp$/,
              ),
            width: z.number().int().positive(),
            height: z.number().int().positive(),
            bytes: z.number().int().positive(),
            sha256: hashSchema,
            mime: z.literal("image/webp"),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export const mediaSchema = z
  .object({
    schemaVersion,
    datasetVersion: versionSchema,
    fighters: z.record(
      idSchema,
      z
        .object({
          headshot: mediaAssetSchema.nullable(),
          half_body: mediaAssetSchema.nullable(),
          full_body: mediaAssetSchema.nullable(),
        })
        .strict(),
    ),
  })
  .strict();
export const manifestSchema = z
  .object({
    schemaVersion,
    datasetVersion: versionSchema,
    asOf: z.iso.date(),
    sourceDatabaseSha256: hashSchema,
    boutAnalysis: z
      .object({
        schemaVersion: z.literal(1),
        formulaVersion: z.literal("1.1"),
        policyVersion: z.string().min(1),
        boutCount: z.number().int().nonnegative(),
        referenceCount: z.number().int().nonnegative(),
      })
      .strict()
      .optional(),
    sourceCounts: z
      .object({
        fighters: z.number().int(),
        events: z.number().int(),
        fights: z.number().int(),
        fight_details: z.number().int(),
      })
      .strict(),
    counts: z
      .object({
        fighters: z.number().int(),
        records: z.number().int(),
        bouts: z.number().int(),
        divisions: z.number().int(),
        mediaAssets: z.number().int(),
        fieldConflicts: z.number().int(),
      })
      .strict(),
    files: z.record(
      z.string(),
      z
        .object({ sha256: hashSchema, bytes: z.number().int().positive() })
        .strict(),
    ),
  })
  .strict();
export type FighterBundle = z.infer<typeof bundleSchema>;
export type DivisionRegistry = z.infer<typeof registrySchema>;

export const conflictsSchema = z
  .object({
    schemaVersion,
    datasetVersion: versionSchema,
    observations: z.array(
      z.union([
        z
          .object({
            fighterId: idSchema,
            field: z.literal("careerRecord"),
            ufcstats: profileSchema.shape.careerRecord,
            ufcCom: z
              .object({
                wins: z.number().int().nonnegative(),
                losses: z.number().int().nonnegative(),
                draws: z.number().int().nonnegative(),
              })
              .strict(),
          })
          .strict(),
        z
          .object({
            fighterId: idSchema,
            field: z.enum(["height", "reach"]),
            ufcstatsInches: z.number().positive(),
            ufcComInches: z.number().positive(),
          })
          .strict(),
      ]),
    ),
  })
  .strict();
