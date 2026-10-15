import { MotionText } from "@/lib/motion/text";
import type { FighterBundle } from "@/lib/domain/contracts";
import { en } from "@/messages/en";
import { normalClick } from "./history";
import {
  recordText,
  snapshotAge,
  heightText,
  reachText,
} from "@/lib/domain/format";
export function FighterProfile({
  bundle,
  rank,
  asOf,
  historyHref,
  onHistory,
  historyOpen = false,
}: {
  bundle: FighterBundle;
  rank: number | null;
  asOf: string;
  historyHref?: string;
  onHistory?: () => void;
  historyOpen?: boolean;
}) {
  const p = bundle.profile,
    record = p.careerRecord;
  const facts = [
    ["AGE", snapshotAge(p.birthDate, asOf), "YEARS", p.fieldSources.birthDate],
    ["HEIGHT", heightText(p.heightCm), "", p.fieldSources.heightCm],
    ["REACH", reachText(p.reachCm), "", p.fieldSources.reachCm],
  ];
  return (
    <aside
      aria-label="Fighter profile"
      data-profile-fighter={p.id}
      data-final-text="true"
      className="relative z-10 flex flex-col border-l border-line pt-[22px] pb-5 pl-7 max-[900px]:col-span-full max-[900px]:border-t max-[900px]:border-l-0 max-[900px]:pl-0"
    >
      <div className="flex justify-between text-[10px] tracking-[1.4px]">
        <span>{en.profile}</span>
        <span className="text-accent">
          {rank === 0 ? "CHAMPION" : rank === null ? "ARCHIVE" : `#${rank}`}
        </span>
      </div>
      <a
        href={historyHref}
        aria-label={
          historyOpen
            ? "Close fight history"
            : `Open recorded history for ${p.displayName}`
        }
        aria-expanded={historyOpen}
        aria-controls="records-panel"
        onClick={(e) => {
          if (onHistory && normalClick(e)) {
            e.preventDefault();
            onHistory();
          }
        }}
        className="mt-[22px] block hover:text-accent"
        title={`Career record source: ${p.fieldSources.careerRecord}`}
      >
        <p className="flex items-center justify-between text-[10px] tracking-[1.2px] text-muted">
          {en.careerRecord}
          <span aria-hidden="true" className="text-[16px] leading-[.5]">
            {historyOpen ? "↙" : "↗"}
          </span>
        </p>
        <div
          className="mt-3 mb-2 flex items-center gap-2 font-display text-[clamp(43px,4.5vw,68px)] leading-none tracking-[-1px]"
          aria-label={`Career record ${recordText(record)}`}
        >
          {[record.wins, record.losses, record.draws].map((value, i) => (
            <span key={i} className="contents">
              {i > 0 && (
                <span aria-hidden="true" className="text-[#696560]">
                  -
                </span>
              )}
              <span className="min-w-[35px] text-center">
                <MotionText
                  field={`record-${["wins", "losses", "draws"][i]}`}
                  text={String(value ?? "—")}
                />
              </span>
            </span>
          ))}
        </div>
        <div className="flex gap-5 text-[10px] tracking-[1.2px] text-muted">
          <span>WINS</span>
          <span>LOSSES</span>
          <span>DRAWS</span>
        </div>
        {record.noContests !== null && record.noContests > 0 && (
          <p className="mt-2 text-[10px] text-muted">
            {record.noContests} NO CONTESTS
          </p>
        )}
      </a>
      <div className="my-[18px] grid gap-3">
        {(
          [
            ["KNOCKOUT WINS", p.finishCounts.knockout],
            ["SUBMISSION WINS", p.finishCounts.submission],
          ] as const
        ).map(([label, count]) => (
          <div
            key={label}
            title={`Source: ${p.fieldSources.finishCounts ?? "Unavailable"}`}
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] tracking-[1.1px] text-[#c0bbb4]">
                {label}
              </span>
              <strong className="font-display text-[26px] leading-none font-normal">
                {count === null ? "—" : String(count).padStart(2, "0")}
              </strong>
            </div>
            <div className="mt-[9px] h-[2px] bg-[#343232]">
              <span
                className="block h-full bg-accent"
                style={{
                  width:
                    count === null || record.wins === null
                      ? "0%"
                      : `${Math.min(100, (count / Math.max(record.wins, 1)) * 100)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <dl className="grid gap-[10px] border-y border-line py-3">
        {facts.map(([label, value, unit, source]) => (
          <div
            key={String(label)}
            className="flex items-baseline justify-between"
            title={`Source: ${source}`}
          >
            <dt className="text-[10px] tracking-[1.3px] text-muted">
              <MotionText
                field={`label-${String(label).toLowerCase()}`}
                text={String(label)}
              />
            </dt>
            <dd className="font-display text-[19px] leading-none tracking-[.3px]">
              <MotionText
                field={String(label).toLowerCase()}
                text={String(value ?? "—")}
              />{" "}
              {value !== null && (
                <small className="font-body text-[8px] text-muted">
                  {unit}
                </small>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <div className="flex justify-between text-[10px] tracking-[1.1px]">
          <span>{en.recent}</span>
          <span className="text-muted">LATEST FIRST</span>
        </div>
        <div className="mt-[10px] flex gap-5">
          {bundle.records.slice(0, 3).map((r) => (
            <a
              key={r.id}
              href={r.sourceUrl ?? p.sourceUrl}
              target="_blank"
              rel="noreferrer"
              title={`${r.opponentName ?? "—"} · ${r.method ?? "—"}`}
              className="flex flex-col items-start gap-[7px]"
              data-recent-result={r.result}
            >
              <span
                className={`grid size-[26px] place-items-center border font-display text-[15px] ${r.result === "L" ? "border-[#784441] bg-[#342221] text-[#ed8880]" : "border-[#66635e] bg-[#252625]"}`}
              >
                {r.result}
              </span>
              <time
                className="text-[10px] leading-[1.5] whitespace-pre-line text-[#a7a19a]"
                dateTime={r.date ?? undefined}
              >
                {r.date
                  ? new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(`${r.date}T00:00:00Z`)) +
                    "\n" +
                    r.date.slice(0, 4)
                  : "—"}
              </time>
            </a>
          ))}
        </div>
        {!bundle.records.length && (
          <p className="mt-3 text-xs text-muted">{en.noResults}</p>
        )}
      </div>
      <a
        href={p.sourceObservations.ufcCom?.sourceUrl ?? p.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-[18px] flex items-center justify-between border-t border-line pt-[14px] text-[10px] tracking-[1.3px] hover:text-accent"
      >
        {p.sourceObservations.ufcCom ? en.officialProfile : en.statsProfile}
        <span aria-hidden="true">↗</span>
      </a>
    </aside>
  );
}
