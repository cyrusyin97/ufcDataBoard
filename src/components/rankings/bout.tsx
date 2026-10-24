"use client";
import { BoutTitleText } from "@/lib/motion/bout-title";
import { useState } from "react";
import type { ExperienceRoute } from "@/lib/domain/routes";
import { scoreBout, type AxisScore } from "@/lib/domain/bout-scoring";
import type { BoutMetric } from "@/lib/domain/bout-contracts";
import type { BoutViewData } from "./use-experience";
import { FighterImage } from "./media";
const colors = ["#e83c39", "#7eabc4"];
const metricNames: Record<BoutMetric, string> = {
  distance_landed: "Distance landed",
  distance_attempted: "Distance attempted",
  clinch_landed: "Clinch landed",
  clinch_attempted: "Clinch attempted",
  td_landed: "Takedowns landed",
  td_attempted: "Takedowns attempted",
  sub_att: "Submission attempts",
  ctrl_seconds: "Control time",
  ground_landed: "Ground landed",
  sig_landed: "Significant strikes",
  kd: "Knockdowns",
};
const number = (value: number | null | undefined) =>
  value == null ? "—" : value.toFixed(1);
const time = (value: number | null | undefined) =>
  value == null
    ? "—"
    : `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
export function BoutAnalysis({
  data,
  route,
  onNavigate,
  onReturn,
}: {
  data: BoutViewData;
  route: Extract<ExperienceRoute, { view: "bout" }>;
  onNavigate: (route: ExperienceRoute) => void;
  onReturn: () => void;
}) {
  const { bout, reference } = data;
  const participants = [...data.participants].sort(
    (a, b) =>
      a.bundle.profile.displayName.localeCompare(
        b.bundle.profile.displayName,
      ) || a.bundle.profile.id.localeCompare(b.bundle.profile.id),
  );
  const sourcePeriod = bout.periods.find(
    (p) => p.round === (route.round === "all" ? 0 : route.round),
  )!;
  const period = {
    ...sourcePeriod,
    participants: participants.map((p) =>
      sourcePeriod.participants.find(
        (s) => s.fighterId === p.bundle.profile.id,
      )!,
    ),
  };
  const scores = period.participants.map((p, i) =>
    scoreBout(
      p.stats,
      period.participants[1 - i].stats,
      period.elapsedSeconds,
      reference,
      period.round === 0 ? "bout" : "round",
    ),
  );
  const names = participants.map((p) => p.bundle.profile.displayName);
  const [hover, setHover] = useState<{
    fighter: number;
    axis: number | null;
  } | null>(null);
  const winner = participants.findIndex(
    (p) => bout.outcomes[bout.fighterIds.indexOf(p.bundle.profile.id)] === "W",
  );
  return (
    <section
      aria-label="Bout analysis"
      data-bout-id={bout.id}
      className="relative z-10 my-[27px] mr-6 ml-[18px] flex min-h-0 min-w-0 flex-col border border-[#363636] bg-[#19191a] max-[1100px]:mr-5 max-[1100px]:ml-[10px] max-[900px]:mx-0 max-[900px]:max-h-[740px] max-[600px]:my-0 max-[600px]:max-h-none"
    >
      <div className="sticky top-0 z-20 shrink-0 bg-[#19191a] px-6 pt-6 pb-5 max-[1100px]:px-4 max-[1100px]:pt-4">
        <button
          data-bout-fade="true"
          onClick={onReturn}
          className="cursor-pointer text-[10px] tracking-[1px] text-muted hover:text-accent"
        >
          ← FIGHT HISTORY
        </button>
      </div>
      <div
        data-bout-scroll="true"
        className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 [scrollbar-color:#595451_transparent] [scrollbar-width:thin] max-[1100px]:px-4"
        tabIndex={0}
        aria-label="Bout content"
      >
        <div
          data-bout-fade="true"
          className="flex justify-between gap-3 text-[10px] tracking-[1.2px] text-muted"
        >
          <span>BOUT STUDY</span>
          <time dateTime={bout.eventDate ?? undefined}>
            {bout.eventDate ?? "—"}
          </time>
        </div>
        <h3
          id="bout-heading"
          data-bout-title={bout.id}
          tabIndex={-1}
          className="mt-3 font-display text-[30px] leading-none uppercase"
        >
          <BoutTitleText
            id={bout.id}
            text={bout.eventName ?? "EVENT UNAVAILABLE"}
          />
        </h3>
        <div data-bout-fade="true">
          <p className="mt-2 text-[11px] text-muted">
            {bout.boutType ?? "Division unavailable"}
          </p>
          <div className="my-5 flex items-center justify-between gap-2">
            {participants.map((p, i) => (
              <button
                key={p.bundle.profile.id}
                aria-pressed={route.fighterId === p.bundle.profile.id}
                aria-label={`Select ${names[i]} in bout`}
                onClick={() =>
                  onNavigate({ ...route, fighterId: p.bundle.profile.id })
                }
                className={`flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-b-2 pb-2 text-left ${i === 1 ? "flex-row-reverse text-right" : ""}`}
                style={{
                  borderColor:
                    route.fighterId === p.bundle.profile.id
                      ? colors[i]
                      : "transparent",
                }}
              >
                <span className="block h-[62px] w-[52px] shrink-0 overflow-hidden bg-[#292929]">
                  <FighterImage
                    key={p.bundle.profile.id}
                    image={p.summary.headshotFallback}
                    name={names[i]}
                    className="h-full w-full object-cover object-center"
                  />
                </span>
                <span className="min-w-0">
                  <strong className="block font-display text-[22px] leading-none uppercase">
                    {names[i].split(" ").at(-1)}
                  </strong>
                  <span
                    className="mt-2 block text-[9px] uppercase"
                    style={{ color: colors[i] }}
                  >
                    {names[i].split(" ").slice(0, -1).join(" ")}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="border-y border-line py-3 text-[10px] text-muted">
            {winner >= 0
              ? `${names[winner]} wins`
              : bout.outcomes.includes("D")
                ? "Draw"
                : "Result unavailable"}{" "}
            · {bout.method ?? "—"} · R{bout.endRound ?? "—"} /{" "}
            {bout.endTime ?? "—"}
          </p>
          <div
            role="group"
            aria-label="Choose bout period"
            className="my-4 flex flex-wrap gap-1"
          >
            {bout.periods.map((p) => (
              <button
                key={p.round}
                aria-pressed={p.round === period.round}
                onClick={() =>
                  onNavigate({
                    ...route,
                    round: p.round === 0 ? "all" : p.round,
                  })
                }
                className={`min-w-9 flex-1 cursor-pointer border px-2 py-2 text-[10px] ${p.round === period.round ? "border-cream bg-cream text-[#111112]" : "border-line hover:border-muted"}`}
              >
                {p.round === 0 ? "ALL" : `R${p.round}`}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 border-b border-line pb-4">
            {(
              [
                ["SIG. STRIKES", "sig_landed"],
                ["TAKEDOWNS", "td_landed"],
                ["CONTROL", "ctrl_seconds"],
              ] as const
            ).map(([label, key]) => (
              <div className="text-center" key={key}>
                <span className="block text-[9px] tracking-[.6px] text-muted">
                  {label}
                </span>
                <p className="mt-2 font-display text-[25px]">
                  {period.participants.map((p, i) => (
                    <span key={i}>
                      {i === 1 && <span className="mx-2 text-muted">/</span>}
                      <span style={{ color: colors[i] }}>
                        {key === "ctrl_seconds"
                          ? time(p.stats?.[key])
                          : (p.stats?.[key] ?? "—")}
                      </span>
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
          {period.elapsedSeconds !== null && period.elapsedSeconds < 60 && (
            <p className="mt-3 text-xs text-[#d1ad79]" role="note">
              Short sample · {period.elapsedSeconds} seconds. Rates may be
              extreme.
            </p>
          )}
          <div className="mt-5 flex justify-between">
            <h4 className="font-display text-lg">BOUT SIGNATURE</h4>
            <span className="text-[9px] text-muted">
              {period.round === 0 ? "ALL ROUNDS" : `ROUND ${period.round}`} ·
              0–100
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] uppercase">
            {names.map((n, i) => (
              <span key={n}>
                <i
                  className="mr-1 inline-block h-px w-3 align-middle"
                  style={{ background: colors[i] }}
                />
                {n.split(" ").at(-1)}
              </span>
            ))}
            <span className="ml-auto text-muted">Weighted scores</span>
          </div>
          {scores.every((s) => s.every((a) => a.total !== null)) ? (
            <Radar
              key={`${bout.id}-${period.round}`}
              scores={scores}
              names={names}
              hover={hover}
              onHover={setHover}
            />
          ) : (
            <p
              className="my-8 border border-line p-4 text-sm leading-relaxed text-muted"
              role="status"
            >
              Radar unavailable.{" "}
              {reference?.status === "insufficient-cohort"
                ? `Only ${reference.distinctBoutCount} eligible historical bouts; at least ${reference.minimumBoutCount} are required.`
                : !reference
                  ? "No historical reference is available for this bout."
                  : "Some required statistics, elapsed times, or positive reference bounds are unavailable."}{" "}
              Available raw values remain below.
            </p>
          )}
          <div
            className="min-h-9 text-[10px] leading-relaxed text-muted"
            aria-live="polite"
            data-radar-inspection="true"
          >
            {hover ? (
              <>
                <p className="mb-2 text-cream">
                  {names[hover.fighter]} ·{" "}
                  {hover.axis === null
                    ? "ALL SCORES"
                    : `${scores[hover.fighter][hover.axis].axis.toUpperCase()} ${number(scores[hover.fighter][hover.axis].total)} / 100`}
                </p>
                <dl className="grid gap-1">
                  {hover.axis === null
                    ? scores[hover.fighter].map((score) => (
                        <div
                          key={score.axis}
                          className="flex justify-between gap-3"
                        >
                          <dt className="uppercase">{score.axis}</dt>
                          <dd>{number(score.total)} / 100</dd>
                        </div>
                      ))
                    : scores[hover.fighter][hover.axis].components.map((c) => (
                        <div
                          key={c.metric}
                          className="flex justify-between gap-3"
                        >
                          <dt>
                            {scores[hover.fighter][hover.axis!].axis ===
                              "tank" && c.metric === "kd"
                              ? "Times knocked down"
                              : scores[hover.fighter][hover.axis!].axis ===
                                    "tank" && c.metric === "sig_landed"
                                ? "Significant absorbed"
                                : metricNames[c.metric]}
                          </dt>
                          <dd>
                            {c.metric === "ctrl_seconds"
                              ? time(c.raw)
                              : (c.raw ?? "—")}
                          </dd>
                        </div>
                      ))}
                </dl>
              </>
            ) : (
              <p className="text-center">
                Hover a line or point to inspect the score.
              </p>
            )}
          </div>
          <details className="mt-2 border-t border-line pt-3 text-[11px] text-muted">
            <summary className="cursor-pointer text-[10px]">
              How to read this chart
            </summary>
            <p className="mt-4 leading-relaxed">
              Formula 1.1 · Counts per 5 minutes. Control uses elapsed-time
              share. Each component is normalized to its historical P95, then
              weighted. Zero P95 falls back to P99, then the maximum. Scores cap
              at 100 and are not percentile ranks.
            </p>
            <p className="mt-3 leading-relaxed">
              {reference
                ? `${reference.distinctBoutCount} complete same-division bouts · ${reference.windowStart} to before ${reference.cutoffExclusive}. Minimum 50 bouts. Separate round and whole-bout references.`
                : "A historical division or event date could not be resolved."}
            </p>
            <p className="mt-3 leading-relaxed">
              Tank means impacts absorbed, not durability. Significant strikes
              already include ground strikes. Ground strikes are a GNP proxy;
              control includes clinch and ground positions. Dimensions overlap.
              Do not sum them into an ability or medical injury score.
            </p>
            <p className="mt-3 leading-relaxed">
              Profile facts use the ranking snapshot date. They do not describe
              the fighter on this bout’s date.
            </p>
            {participants.map((p, i) => (
              <div key={p.bundle.profile.id} className="mt-5">
                <h4 className="font-display text-xl uppercase text-cream">
                  {names[i]}
                </h4>
                {scores[i].map((axis) => (
                  <div key={axis.axis} className="mt-4">
                    <p className="flex justify-between border-b border-line pb-2 font-display text-base uppercase text-cream">
                      <span>{axis.axis}</span>
                      <span>{number(axis.total)} / 100</span>
                    </p>
                    <table
                      className="mt-2 w-full table-fixed text-[9px]"
                      aria-label={`${names[i]} ${axis.axis} score breakdown`}
                    >
                      <thead>
                        <tr className="text-left text-muted">
                          <th className="w-[40%] py-2 font-normal">
                            COMPONENT
                          </th>
                          <th className="font-normal">RAW</th>
                          <th className="font-normal">NORM.</th>
                          <th className="font-normal">WEIGHT</th>
                          <th className="text-right font-normal">POINTS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {axis.components.map((c) => (
                          <tr key={c.metric}>
                            <th className="py-1 pr-2 text-left font-normal">
                              {axis.axis === "tank" && c.metric === "kd"
                                ? "Times knocked down"
                                : axis.axis === "tank" &&
                                    c.metric === "sig_landed"
                                  ? "Significant absorbed"
                                  : metricNames[c.metric]}
                            </th>
                            <td>
                              {c.metric === "ctrl_seconds"
                                ? time(c.raw)
                                : (c.raw ?? "—")}
                            </td>
                            <td>{number(c.normalized)}</td>
                            <td>{c.weight * 100}%</td>
                            <td className="text-right">
                              {number(c.contribution)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))}
            <p className="mt-4">
              Short periods below 60 seconds are flagged. Unknown values remain
              unavailable.
            </p>
          </details>
          {bout.sourceUrl && (
            <a
              href={bout.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block text-[9px] tracking-[1px] text-muted hover:text-accent"
            >
              BOUT DATA: UFCSTATS ↗
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
function Radar({
  scores,
  names,
  hover,
  onHover,
}: {
  scores: AxisScore[][];
  names: string[];
  hover: { fighter: number; axis: number | null } | null;
  onHover: (value: { fighter: number; axis: number | null } | null) => void;
}) {
  const xy = (axis: number, value: number) => [
    240 + Math.sin((axis * 2 * Math.PI) / 5) * 88 * value,
    126 - Math.cos((axis * 2 * Math.PI) / 5) * 88 * value,
  ];
  const points = (values: number[]) =>
    values.map((v, i) => xy(i, v).join(",")).join(" ");
  return (
    <svg
      viewBox="0 0 480 270"
      role="img"
      aria-label="Five-axis bout comparison. Exact scores and raw values are in How to read this chart."
      className="my-2 w-full"
      onPointerLeave={() => onHover(null)}
    >
      {[0.25, 0.5, 0.75, 1].map((v) => (
        <polygon
          key={v}
          points={points(Array(5).fill(v))}
          fill="none"
          stroke="#3d3c3b"
          strokeWidth=".7"
        />
      ))}
      {scores[0].map((axis, j) => (
        <line
          key={axis.axis}
          x1="240"
          y1="126"
          x2={xy(j, 1)[0]}
          y2={xy(j, 1)[1]}
          stroke="#343434"
          strokeWidth=".7"
        />
      ))}
      {scores.map((series, i) => (
        <g key={i} opacity={hover && hover.fighter !== i ? 0.3 : 1}>
          <polygon
            data-radar-series={i}
            points={points(series.map((a) => a.total! / 100))}
            fill={colors[i]}
            fillOpacity=".09"
            stroke={colors[i]}
            strokeWidth={hover?.fighter === i ? 1.5 : 1.1}
            onPointerEnter={(e) => {
              if (e.pointerType !== "touch")
                onHover({ fighter: i, axis: null });
            }}
          />
          {series.map((a, j) => (
            <g
              key={a.axis}
              onPointerEnter={(e) => {
                if (e.pointerType !== "touch") onHover({ fighter: i, axis: j });
              }}
            >
              <circle
                cx={xy(j, a.total! / 100)[0]}
                cy={xy(j, a.total! / 100)[1]}
                r="2"
                fill={colors[i]}
              />
              <circle
                cx={xy(j, a.total! / 100)[0]}
                cy={xy(j, a.total! / 100)[1]}
                r="7"
                fill="transparent"
              >
                <title>{`${names[i]} · ${a.axis}: ${number(a.total)} / 100`}</title>
              </circle>
            </g>
          ))}
        </g>
      ))}
      {scores[0].map((axis, j) => {
        const p = xy(j, 1.27);
        return (
          <text
            key={axis.axis}
            x={p[0]}
            y={p[1]}
            textAnchor={j === 0 ? "middle" : j < 3 ? "start" : "end"}
            fill="#dedad3"
            fontSize="10"
            fontFamily="Barlow"
          >
            <tspan className="uppercase">{axis.axis}</tspan>
            <tspan x={p[0]} dy="14" fill="#8f8c86" fontSize="9">
              {number(scores[0][j].total)} / {number(scores[1][j].total)}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
