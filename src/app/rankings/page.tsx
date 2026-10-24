import { readInitialFighter, readRankings } from "@/lib/data/rankings";
import { parseRoute } from "@/lib/domain/routes";
import { FighterExperience } from "@/components/rankings/experience";
export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const data = readRankings();
  const single = (value: string | string[] | undefined) =>
    typeof value === "string" ? value : null;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const item = single(value);
    if (item !== null) params.set(key, item);
  }
  const route = parseRoute(params, data.divisions, data.defaultDivisionId);
  return (
    <FighterExperience
      key={data.datasetVersion}
      data={data}
      initialRoute={route}
      initialBundle={
        route.view === "rankings"
          ? readInitialFighter(data.datasetVersion, route.fighterId)
          : null
      }
    />
  );
}
