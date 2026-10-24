"use client";
import { useLayoutEffect, useRef } from "react";
import type { FighterBundle } from "@/lib/domain/contracts";
import { detailUrl, boutUrl } from "@/lib/domain/routes";
import { BoutTitleText } from "@/lib/motion/bout-title";
import { en } from "@/messages/en";
export type PreviewAnchor = {
  id: string;
  name: string;
  element: HTMLElement;
  pinned: boolean;
  intent: "hover" | "focus" | "button";
};
export function normalClick(event: React.MouseEvent) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    !event.defaultPrevented
  );
}
export function FightHistory({
  bundle,
  divisionId,
  onNavigate,
  onPreview,
  onLeave,
  onBout,
  restoreBout,
}: {
  bundle: FighterBundle;
  divisionId: string;
  onNavigate: (id: string) => void;
  onPreview: (anchor: PreviewAnchor) => void;
  onLeave: () => void;
  onBout?: (id: string) => void;
  restoreBout?: { id: string; scrollTop: number | null } | null;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  const restoreId = restoreBout?.id,
    restoreTop = restoreBout?.scrollTop;
  useLayoutEffect(() => {
    const region = scroll.current;
    if (!region) return;
    region.scrollTop = restoreTop ?? 0;
    if (restoreId) {
      const row = region.querySelector<HTMLElement>(
        `[data-fight-id="${restoreId}"]`,
      );
      if (row) {
        const rowRect = row.getBoundingClientRect(),
          view = region.getBoundingClientRect();
        if (rowRect.top < view.top || rowRect.bottom > view.bottom)
          region.scrollTop += rowRect.top - view.top - 20;
      }
    }
  }, [bundle.profile.id, restoreId, restoreTop]);
  return (
    <section
      id="records-panel"
      aria-label="Recorded fight history"
      className="relative z-10 my-[27px] mr-6 ml-[18px] flex min-h-0 min-w-0 flex-col border border-[#363636] bg-[#19191a] max-[1100px]:mr-5 max-[1100px]:ml-[10px] max-[900px]:mx-0 max-[600px]:my-0 max-[600px]:min-h-[440px] max-[600px]:max-h-[540px]"
      data-history-fighter={bundle.profile.id}
    >
      <div
        data-bout-fade="true"
        className="flex items-end justify-between gap-2 px-6 pt-6 pb-5 max-[1100px]:px-4"
      >
        <div>
          <p className="text-[8px] tracking-[1.4px] text-muted">
            UFCSTATS · RECORDED BOUTS
          </p>
          <h3
            id="history-heading"
            tabIndex={-1}
            className="mt-[9px] font-display text-[35px] leading-none tracking-[.4px] uppercase"
          >
            {en.history}
          </h3>
        </div>
        <p
          className="font-display text-[33px] leading-none"
          aria-label={`${bundle.records.length} recorded fights`}
        >
          {bundle.records.length}{" "}
          <small className="font-body text-[8px] tracking-[.8px] text-muted">
            FIGHTS
          </small>
        </p>
      </div>
      <div
        data-bout-fade="true"
        className="flex justify-between border-y border-[#343434] px-6 py-[13px] text-[8px] tracking-[1.1px] text-muted max-[1100px]:px-4"
      >
        <span>RESULT / OPPONENT</span>
        <span>DATE / METHOD</span>
      </div>
      <div
        ref={scroll}
        data-history-scroll="true"
        tabIndex={0}
        aria-label="Recorded fights"
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[23px] [scrollbar-color:#595451_transparent] [scrollbar-width:thin] max-[1100px]:px-4"
      >
        {bundle.records.length === 0 && (
          <p className="py-8 text-sm text-muted">{en.emptyHistory}</p>
        )}
        {bundle.records.map((record) => (
          <article
            key={record.id}
            data-fight-id={record.id}
            className="grid grid-cols-[28px_minmax(0,1fr)_88px] items-start gap-[14px] border-b border-[#353535] pt-[19px] pb-[17px] max-[1100px]:grid-cols-[24px_minmax(0,1fr)_74px] max-[1100px]:gap-[9px]"
          >
            <a
              data-bout-fade="true"
              href={
                onBout
                  ? boutUrl(divisionId, bundle.profile.id, record.id)
                  : (record.sourceUrl ?? undefined)
              }
              aria-label={`Open bout result: ${record.eventName}`}
              className={`mt-[2px] grid h-7 w-[27px] place-items-center border font-display text-[15px] hover:border-accent focus-visible:outline-accent ${record.result === "L" ? "border-[#76433f] bg-[#372321] text-[#ed8880]" : "border-[#68645e] bg-[#292a28]"}`}
              onClick={(e) => {
                if (onBout && normalClick(e)) {
                  e.preventDefault();
                  onBout(record.id);
                }
              }}
            >
              {record.result}
            </a>
            <div className="min-w-0">
              <a
                href={detailUrl(divisionId, record.opponentId)}
                data-bout-fade="true"
                data-opponent-id={record.opponentId}
                className="inline-block font-display text-[22px] leading-[1.05] tracking-[.1px] uppercase hover:text-accent focus-visible:text-accent max-[1100px]:text-[19px]"
                onClick={(e) => {
                  if (normalClick(e)) {
                    e.preventDefault();
                    onNavigate(record.opponentId);
                  }
                }}
                onPointerEnter={(e) => {
                  if (e.pointerType !== "touch")
                    onPreview({
                      id: record.opponentId,
                      name: record.opponentName ?? "—",
                      element: e.currentTarget,
                      pinned: false,
                      intent: "hover",
                    });
                }}
                onPointerMove={(e) => {
                  if (e.pointerType !== "touch" && (e.movementX || e.movementY))
                    onPreview({
                      id: record.opponentId,
                      name: record.opponentName ?? "—",
                      element: e.currentTarget,
                      pinned: false,
                      intent: "hover",
                    });
                }}
                onPointerLeave={onLeave}
                onFocus={(e) =>
                  onPreview({
                    id: record.opponentId,
                    name: record.opponentName ?? "—",
                    element: e.currentTarget,
                    pinned: false,
                    intent: "focus",
                  })
                }
                onBlur={onLeave}
              >
                {record.opponentName ?? "—"} <span aria-hidden="true">↗</span>
              </a>
              <button
                data-bout-fade="true"
                aria-label={`Preview ${record.opponentName ?? "opponent"}`}
                aria-haspopup="dialog"
                className="ml-2 cursor-pointer px-1 text-[13px] text-muted hover:text-accent"
                onClick={(e) =>
                  onPreview({
                    id: record.opponentId,
                    name: record.opponentName ?? "—",
                    element: e.currentTarget,
                    pinned: true,
                    intent: "button",
                  })
                }
              >
                ⓘ
              </button>
              <p className="mt-2 font-display text-[13px] leading-[1.45] uppercase text-[#c2bcb4]">
                {onBout ? (
                  <a
                    data-bout-title={record.id}
                    data-bout-fade="true"
                    href={boutUrl(divisionId, bundle.profile.id, record.id)}
                    aria-label={`Open bout analysis: ${record.eventName}`}
                    className="hover:text-accent focus-visible:text-accent"
                    onClick={(e) => {
                      if (normalClick(e)) {
                        e.preventDefault();
                        onBout(record.id);
                      }
                    }}
                  >
                    <BoutTitleText id={record.id} text={record.eventName} />{" "}
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  record.eventName
                )}
              </p>
              <p
                data-bout-fade="true"
                className="mt-1 text-[9px] leading-[1.45] text-[#a8a29a]"
              >
                {record.location ?? "—"}
              </p>
            </div>
            <div
              data-bout-fade="true"
              className="flex flex-col items-end gap-[7px] pt-[3px] text-right"
            >
              <time
                dateTime={record.date ?? undefined}
                className="text-[9px] whitespace-nowrap text-[#ded8ce]"
              >
                {record.date ?? "—"}
              </time>
              <span className="mt-1 text-[9px] tracking-[.6px] text-[#c8c2b8]">
                {record.method ?? "—"}
              </span>
              <span className="text-[9px] text-[#aaa39a]">
                R{record.round ?? "—"} · {record.time ?? "—"}
              </span>
            </div>
          </article>
        ))}
      </div>
      <p
        data-bout-fade="true"
        className="flex min-h-10 items-center border-t border-[#343434] px-6 text-[8px] tracking-[.9px] text-muted max-[1100px]:px-4"
      >
        {en.coverage}
      </p>
    </section>
  );
}
