"use client";
/* The reviewed role remains explicit even when the figure uses a fallback. */
/* eslint-disable @next/next/no-img-element */
import { MotionText } from "@/lib/motion/text";
import { useState } from "react";
import type { FighterSummary, Variant } from "./types";
export function FighterImage({
  image,
  name,
  className,
  eager = false,
  onFailure,
}: {
  image: Variant | null;
  name: string;
  className: string;
  eager?: boolean;
  onFailure?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  return image && !failed ? (
    <img
      ref={(node) => {
        if (node?.complete && node.naturalWidth === 0) {
          setFailed(true);
          onFailure?.();
        }
      }}
      src={image.url}
      width={image.width}
      height={image.height}
      alt={name}
      draggable={false}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      onError={() => {
        setFailed(true);
        onFailure?.();
      }}
      className={className}
    />
  ) : (
    <span
      aria-label={`${name} image unavailable`}
      className="grid h-full w-full place-items-center font-display text-5xl text-muted"
    >
      {name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function FighterFigure({
  fighter,
  rank,
  weight,
  nickname,
  place,
  detail = false,
  onReturn,
}: {
  fighter: FighterSummary;
  rank: number | null;
  weight: number | null;
  nickname: string | null;
  place: string | null;
  detail?: boolean;
  onReturn?: () => void;
}) {
  const names = fighter.name.split(" ");
  return (
    <section
      aria-label="Selected fighter figure"
      data-selected-fighter={fighter.id}
      className={`relative isolate min-h-[520px] overflow-hidden group-data-[motion-kind=opponent]/experience:group-data-[motion-stage=arriving]/experience:overflow-visible group-data-[motion-kind=opponent]/experience:group-data-[motion-stage=arriving]/experience:z-40 bg-[radial-gradient(ellipse_at_55%_64%,#292728_0,transparent_64%)] ${detail ? "ml-0" : "-ml-3 max-[900px]:ml-0"}`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div
          aria-hidden="true"
          className="absolute top-[140px] left-1/2 -z-20 size-[420px] -translate-x-1/2 rounded-full border border-[#292929]"
        />
        <div
          aria-hidden="true"
          className="absolute top-[136px] left-1/2 -z-10 -translate-x-1/2 font-display font-extrabold text-[250px] leading-none tracking-[-8px] text-transparent [-webkit-text-stroke:1px_#333132]"
        >
          {weight}
        </div>
      </div>
      {detail && (
        <button
          className="absolute top-[27px] left-0 z-40 cursor-pointer text-[10px] tracking-[1.2px] uppercase hover:text-accent"
          onClick={onReturn}
        >
          ← Back to rankings
        </button>
      )}
      <div
        data-figure-heading="true"
        data-final-text="true"
        className={`relative z-30 ${detail ? "pt-[77px] pl-0" : "pt-7 pl-6"}`}
      >
        <p className="flex items-center gap-2 text-[10px] tracking-[1.25px] uppercase">
          <i className="h-[2px] w-[17px] bg-accent" />
          {rank === 0
            ? "World champion"
            : rank === null
              ? "Fighter archive"
              : `Rank #${rank}`}
        </p>
        <h2
          className={`mt-[17px] mb-[11px] font-display font-bold leading-[.88] tracking-[-1.2px] uppercase [text-shadow:0_2px_22px_#1118] ${detail ? "text-[44px] max-[1100px]:text-[37px]" : fighter.name.length > 22 ? "text-[clamp(40px,4.2vw,62px)]" : "text-[clamp(49px,5.1vw,76px)]"}`}
        >
          <span className="block text-[.48em] leading-[1.3] tracking-[.4px]">
            <MotionText field="name" text={names[0]} />
          </span>
          <MotionText
            field="name"
            text={names.slice(1).join(" ")}
            offset={names[0].length + 1}
          />
        </h2>
        <p className="text-[10px] text-[#b1ada7]">
          {nickname ? `“${nickname}”` : "—"}
        </p>
      </div>
      <FigurePortrait
        key={`${fighter.id}-${detail}`}
        fighter={fighter}
        detail={detail}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-[110px] bg-[linear-gradient(transparent,#111112_84%)]"
      />
      <p
        data-figure-caption="true"
        className="absolute right-2 bottom-[29px] left-6 z-50 flex items-center gap-[9px] text-[10px] tracking-[1.2px] uppercase text-[#bbb5ac]"
      >
        <span className="h-px w-[25px] bg-accent" />
        {place ?? "—"}
      </p>
    </section>
  );
}

function FigurePortrait({
  fighter,
  detail,
}: {
  fighter: FighterSummary;
  detail: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const image =
    attempt === 0
      ? fighter.figure
      : attempt === 1
        ? fighter.headshotFallback
        : null;
  const role = image
    ? attempt === 0
      ? fighter.figureRole
      : "headshot"
    : "initials";
  return (
    <div
      className={`pointer-events-none absolute z-20 flex items-end justify-center ${detail ? "inset-x-0 top-[177px] bottom-[49px]" : "inset-x-[-8px] top-[134px] bottom-[6px]"}`}
      data-media-role={role}
    >
      <FighterImage
        key={image?.url ?? "initials"}
        image={image}
        name={fighter.name}
        eager
        onFailure={() =>
          setAttempt(
            attempt === 0 &&
              fighter.figureRole !== "headshot" &&
              fighter.headshotFallback
              ? 1
              : 2,
          )
        }
        className={`h-full w-auto max-w-[116%] object-contain object-bottom [filter:saturate(.78)_contrast(1.04)] ${role === "headshot" ? "!h-auto !max-w-[85%] self-center" : ""}`}
      />
    </div>
  );
}
