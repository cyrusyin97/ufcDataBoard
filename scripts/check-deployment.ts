import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import {
  registrySchema,
  mediaSchema,
  bundleSchema,
  indexSchema,
} from "../src/lib/domain/contracts.ts";

const base = new URL(process.argv[2] ?? "http://127.0.0.1:3000");
if (
  base.username ||
  base.password ||
  base.search ||
  base.hash ||
  base.pathname !== "/" ||
  (base.protocol !== "https:" &&
    !(
      base.protocol === "http:" &&
      ["127.0.0.1", "localhost"].includes(base.hostname)
    ))
)
  throw new Error("Use an HTTPS deployment origin or a local HTTP origin.");
const descriptor = JSON.parse(readFileSync("data/release.json", "utf8"));
const checks: { path: string; status: number; cache: string | null }[] = [];
async function request(path: string, immutable = false) {
  const response = await fetch(new URL(path, base), {
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok || new URL(response.url).origin !== base.origin)
    throw new Error(`Deployment response failed: ${path}`);
  const cache = response.headers.get("cache-control");
  if (
    immutable &&
    (!cache?.includes("immutable") || !cache.includes("max-age=31536000"))
  )
    throw new Error(`Immutable cache header differs: ${path}`);
  checks.push({ path, status: response.status, cache });
  return response;
}
const pointerResponse = await request("/data/current.json");
if (!pointerResponse.headers.get("cache-control")?.includes("no-store"))
  throw new Error("Dataset pointer must use no-store.");
const pointer = await pointerResponse.json();
if (pointer.datasetVersion !== descriptor.datasetVersion)
  throw new Error("Deployment dataset differs from release descriptor.");
const data = `/data/v1/${descriptor.datasetVersion}`;
const registry = registrySchema.parse(
  await (await request(`${data}/divisions.json`, true)).json(),
);
const media = mediaSchema.parse(
  await (await request(`${data}/media.json`, true)).json(),
);
const index = indexSchema.parse(
  await (await request(`${data}/index.json`, true)).json(),
);
const home = await request("/");
if (new URL(home.url).pathname !== "/rankings")
  throw new Error("Home redirect differs.");
await home.arrayBuffer();
const published = registry.divisions.filter(
  (d) => d.publicationState === "published",
);
const ranked = new Set(
  published.flatMap((d) => d.entries.map((e) => e.fighterId)),
);
const archive = index.fighters.find((f) => !ranked.has(f.id));
for (const division of published) {
  const id = division.defaultFighterId;
  if (!id) throw new Error("Published division has no default fighter.");
  await (
    await request(`/rankings?division=${division.id}&selected=${id}`)
  ).arrayBuffer();
  for (const fighter of [id, archive?.id].filter((v): v is string => !!v)) {
    await (
      await request(
        `/rankings?division=${division.id}&fighter=${fighter}&view=history`,
      )
    ).arrayBuffer();
    const bundle = bundleSchema.parse(
      await (await request(`${data}/fighters/${fighter}.json`, true)).json(),
    );
    if (
      bundle.profile.id !== fighter ||
      bundle.datasetVersion !== descriptor.datasetVersion
    )
      throw new Error("Fighter response identity differs.");
  }
  const roles = media.fighters[id];
  const image = (
    roles.half_body ??
    roles.full_body ??
    roles.headshot
  )?.variants.at(-1);
  if (image) {
    const response = await request(image.url, true);
    if (!response.headers.get("content-type")?.startsWith("image/webp"))
      throw new Error("Media response type differs.");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (createHash("sha256").update(bytes).digest("hex") !== image.sha256)
      throw new Error("Media response checksum differs.");
  }
}
const report = {
  status: "passed",
  origin: base.origin,
  runtime: process.version,
  datasetVersion: descriptor.datasetVersion,
  checks,
  scope:
    "HTTP responses, contracts, identity, redirects, and cache headers. Run the browser matrix separately for hydration and interactions.",
};
mkdirSync("outputs/releases", { recursive: true });
writeFileSync(
  "outputs/releases/http-validation.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
