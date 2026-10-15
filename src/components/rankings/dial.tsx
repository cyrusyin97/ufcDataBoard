"use client";
import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { dialDistance, loopIndex } from "@/lib/domain/selection";
import type { Division } from "@/lib/domain/selection";
import type { FighterSummary } from "./types";
import { FighterImage } from "./media";
import { recordText } from "@/lib/domain/format";
export function RankingDial({
  division,
  fighters,
  selected,
  onSelect,
}: {
  division: Division;
  fighters: Record<string, FighterSummary>;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const active = division.entries.findIndex((e) => e.fighterId === selected);
  const intent = useRef(active);
  const drag = useRef<{ y: number; index: number; moved: boolean } | null>(
    null,
  );
  const selectRef = useRef(onSelect);
  useEffect(() => {
    selectRef.current = onSelect;
  });
  useEffect(() => {
    intent.current = active;
  }, [active, division.id]);
  const length = division.entries.length;
  const previous = useRef<{ division: string; active: number } | null>(null);
  useLayoutEffect(() => {
    const rows = Array.from(
      root.current!.querySelectorAll<HTMLElement>("[data-index]"),
    );
    const old = previous.current;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = rows.map((element, index) => {
      const distance = dialDistance(index, active, length),
        absolute = Math.abs(distance);
      return {
        element,
        x: -Math.pow(absolute, 1.7) * 13,
        y: distance * 92,
        scale: 1 - Math.min(absolute, 4) * 0.047,
        visibleBefore:
          old && Math.abs(dialDistance(index, old.active, length)) < 3.8,
        visible: absolute < 3.8,
      };
    });
    const settle = () =>
      targets.forEach(({ element, x, y, scale }) => {
        gsap.killTweensOf(element);
        gsap.set(element, { x, y, scale });
      });
    for (const { element, x, y, scale, visibleBefore, visible } of targets) {
      gsap.killTweensOf(element);
      if (old?.division === division.id && !reduced && visibleBefore && visible)
        gsap.to(element, { x, y, scale, duration: 0.38, ease: "power3.out" });
      else gsap.set(element, { x, y, scale });
    }
    previous.current = { division: division.id, active };
    const main = root.current!.closest("main");
    main?.addEventListener("ufc:motion-settle", settle);
    return () => {
      main?.removeEventListener("ufc:motion-settle", settle);
      rows.forEach((row) => gsap.killTweensOf(row));
    };
  }, [active, division, length]);
  const choose = (index: number) => {
    intent.current = loopIndex(index, length);
    selectRef.current(division.entries[intent.current].fighterId);
  };
  useEffect(() => {
    const element = root.current!;
    let delta = 0;
    let last = 0;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (drag.current) return;
      delta +=
        event.deltaY *
        (event.deltaMode === 1
          ? 20
          : event.deltaMode === 2
            ? element.clientHeight
            : 1);
      if (Math.abs(delta) < 60 || performance.now() - last < 150) return;
      intent.current = loopIndex(intent.current + Math.sign(delta), length);
      selectRef.current(division.entries[intent.current].fighterId);
      delta = 0;
      last = performance.now();
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", wheel);
      drag.current = null;
    };
  }, [division, length]);
  return (
    <>
      <div
        ref={root}
        role="listbox"
        tabIndex={0}
        aria-label="Fighter rankings. Drag, scroll or use arrow keys."
        aria-activedescendant={`fighter-${selected}`}
        className="relative -mr-[18px] -ml-12 mt-[2px] h-[376px] touch-none cursor-grab overflow-hidden select-none [mask-image:linear-gradient(to_bottom,transparent,#000_10%,#000_90%,transparent)] max-[900px]:-ml-[22px] max-[600px]:h-[294px] [@media(min-width:1000px)_and_(min-height:851px)]:h-[440px]"
        onKeyDown={(e) => {
          const steps: Record<string, number> = {
            ArrowDown: 1,
            ArrowRight: 1,
            ArrowUp: -1,
            ArrowLeft: -1,
          };
          if (e.key in steps) {
            e.preventDefault();
            choose(intent.current + steps[e.key]);
          }
          if (e.key === "Home" || e.key === "End") {
            e.preventDefault();
            choose(e.key === "Home" ? 0 : length - 1);
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          drag.current = { y: e.clientY, index: intent.current, moved: false };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.focus({ preventScroll: true });
        }}
        onPointerMove={(e) => {
          const current = drag.current;
          if (!current) return;
          const dy = e.clientY - current.y;
          if (Math.abs(dy) > 6) current.moved = true;
          const target = loopIndex(current.index - Math.round(dy / 92), length);
          if (current.moved && target !== intent.current) choose(target);
        }}
        onPointerUp={(e) => {
          const current = drag.current;
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          if (current && !current.moved) {
            const row = document
              .elementFromPoint(e.clientX, e.clientY)
              ?.closest<HTMLElement>("[data-index]");
            if (row) choose(Number(row.dataset.index));
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-[-592px] size-[760px] -translate-y-1/2 rounded-full border border-[#414141]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-[#3a3030]"
        />
        <span
          aria-hidden="true"
          className="absolute top-[calc(50%-4px)] left-0 z-30 size-2 bg-accent"
        />
        {division.entries.map((entry, index) => {
          const fighter = fighters[entry.fighterId];
          const d = dialDistance(index, active, length),
            abs = Math.abs(d),
            visible = abs < 3.8;
          const isSelected = entry.fighterId === selected;
          return (
            <div
              key={entry.fighterId}
              id={`fighter-${entry.fighterId}`}
              data-index={index}
              data-fighter-id={entry.fighterId}
              role="option"
              aria-selected={isSelected}
              aria-posinset={index + 1}
              aria-setsize={length}
              aria-label={`${entry.rank === 0 ? "Champion" : `Rank ${entry.rank}`}, ${fighter.name}`}
              onClick={(e) => {
                if (e.detail === 0) choose(index);
              }}
              className="absolute top-[calc(50%-41px)] right-2 left-[62px] h-[82px] origin-left [transform:var(--dial-transform)] max-[1100px]:left-10"
              style={
                {
                  "--dial-transform": `translate3d(${-Math.pow(abs, 1.7) * 13}px,${d * 92}px,0) scale(${1 - Math.min(abs, 4) * 0.047})`,
                  opacity: visible ? Math.max(0.18, 1 - abs * 0.255) : 0,
                  visibility: visible ? "visible" : "hidden",
                  zIndex: 20 - Math.round(abs * 2),
                } as CSSProperties
              }
            >
              <div
                data-row-drawer="true"
                className={`flex h-full w-full items-center gap-[14px] border-b px-[12px] py-[10px] pr-[15px] ${isSelected ? "border-transparent bg-cream text-[#151515] shadow-[0_8px_40px_#0003]" : "border-[#404041] hover:bg-[#232324]"}`}
              >
                <span
                  className={`min-w-6 font-display text-[26px] leading-none ${isSelected ? "text-[#c12a29]" : "text-[#a9a5a0]"}`}
                >
                  {entry.rank === 0 ? "C" : String(entry.rank).padStart(2, "0")}
                </span>
                <div
                  className={`h-[57px] w-12 shrink-0 self-end overflow-hidden ${isSelected ? "bg-[#d3cfc8]" : "bg-[#282829]"}`}
                >
                  {visible && (
                    <FighterImage
                      key={fighter.id}
                      image={fighter.thumbnail}
                      name={fighter.name}
                      className={`h-full w-full object-cover object-center ${isSelected ? "" : "grayscale"}`}
                    />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-display font-semibold text-[clamp(18px,1.65vw,25px)] leading-[1.05] tracking-[.1px] uppercase">
                    {fighter.name}
                  </span>
                  <span
                    className={`text-[10px] tracking-[1.2px] ${isSelected ? "text-[#595650]" : "text-[#b6b2ac]"}`}
                  >
                    {entry.rank === 0
                      ? "WORLD CHAMPION"
                      : `${recordText(fighter.record)} / W–L–D`}
                  </span>
                </div>
                <span
                  aria-hidden="true"
                  className={`ml-auto text-[23px] ${isSelected ? "opacity-100" : "opacity-0"}`}
                >
                  ↗
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 pt-2 pb-[17px]">
        <p className="text-[10px] tracking-[1.3px] text-muted">
          ◉ &nbsp; DRAG, SCROLL OR SELECT
        </p>
        <div className="flex gap-[7px]">
          {[-1, 1].map((step) => (
            <button
              key={step}
              aria-label={step < 0 ? "Previous fighter" : "Next fighter"}
              onClick={() => choose(intent.current + step)}
              className="grid size-[34px] cursor-pointer place-items-center border border-[#4b4947] hover:bg-cream hover:text-canvas"
            >
              {step < 0 ? "↑" : "↓"}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
