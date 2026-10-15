"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { FighterBundle } from "@/lib/domain/contracts";
import {
  detailUrl,
  routeUrl,
  returnRoute,
  type ExperienceRoute,
} from "@/lib/domain/routes";
import { resolveSelection } from "@/lib/domain/selection";
import { historyFigure } from "@/lib/data/summary";
import { CategoryDropdown, CategoryHeading } from "./category";
import { RankingDial } from "./dial";
import { FighterFigure } from "./media";
import { FighterProfile } from "./profile";
import { FightHistory, type PreviewAnchor } from "./history";
import { OpponentPreview } from "./preview";
import { useExperience } from "./use-experience";
import type { RankingsData } from "./types";
import { en } from "@/messages/en";
export function FighterExperience({
  data,
  initialRoute,
  initialBundle,
}: {
  data: RankingsData;
  initialRoute: ExperienceRoute;
  initialBundle: FighterBundle | null;
}) {
  const { state, navigate, returnHome, retry, store, motion, finish } =
    useExperience(data, initialRoute, initialBundle);
  const { route, bundle, fighter } = state;
  const pending = state.phase === "preparing";
  const detail = route.view === "history";
  const division = data.divisions.find((d) => d.id === route.divisionId)!;
  const entry = division.entries.find((e) => e.fighterId === route.fighterId);
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(
    () => (root.current ? motion.attach(root.current) : undefined),
    [motion],
  );
  useLayoutEffect(() => {
    if (state.phase === "transitioning")
      motion.arrive(() => finish(state.generation));
  }, [state.generation, state.phase, motion, finish]);
  const [preview, setPreview] = useState<Omit<PreviewAnchor, "element"> | null>(
    null,
  );
  const previewTrigger = useRef<HTMLElement | null>(null);
  const hoverBlocked = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepPreview = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);
  const closePreview = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setPreview(null);
  }, []);
  const leavePreview = useCallback(() => {
    const active = document.activeElement;
    if (
      previewTrigger.current === active ||
      root.current?.querySelector("[data-preview-fighter]")?.contains(active)
    )
      return;
    if (!preview?.pinned) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      closeTimer.current = setTimeout(closePreview, 200);
    }
  }, [preview, closePreview]);
  const showPreview = (anchor: PreviewAnchor) => {
    if (anchor.intent === "hover" && hoverBlocked.current) return;
    keepPreview();
    const sameElement = previewTrigger.current === anchor.element;
    previewTrigger.current = anchor.element;
    const value = {
      id: anchor.id,
      name: anchor.name,
      pinned: anchor.pinned,
      intent: anchor.intent,
    };
    setPreview((current) =>
      current?.id === anchor.id &&
      sameElement &&
      current.pinned === anchor.pinned
        ? current
        : value,
    );
  };
  const openOpponent = (id: string) => {
    motion.capturePreview(id);
    hoverBlocked.current = true;
    closePreview();
    void navigate({ view: "history", divisionId: division.id, fighterId: id });
  };
  const goHome = useCallback(() => {
    closePreview();
    returnHome();
  }, [closePreview, returnHome]);
  useLayoutEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (preview) {
        event.preventDefault();
        closePreview();
      } else if (detail || pending) {
        event.preventDefault();
        goHome();
      }
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [preview, detail, pending, closePreview, goHome]);
  useEffect(() => {
    const resume = (event: PointerEvent) => {
      if (event.movementX || event.movementY) hoverBlocked.current = false;
    };
    window.addEventListener("pointermove", resume, true);
    return () => window.removeEventListener("pointermove", resume, true);
  }, []);
  useEffect(() => {
    window.addEventListener("popstate", closePreview);
    return () => window.removeEventListener("popstate", closePreview);
  }, [closePreview]);
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);
  useEffect(() => {
    if (state.focus === "history")
      root.current
        ?.querySelector<HTMLElement>("#history-heading")
        ?.focus({ preventScroll: true });
    if (state.focus === "dial")
      root.current
        ?.querySelector<HTMLElement>("[role=listbox]")
        ?.focus({ preventScroll: true });
  }, [state.focus, route]);
  return (
    <main
      ref={root}
      data-phase={state.phase}
      className="group/experience mx-auto max-w-[1800px] overflow-hidden px-12 max-[1100px]:px-7 max-[900px]:px-[22px] max-[600px]:px-4"
    >
      <header className="flex h-[70px] items-center justify-between border-b border-line">
        <div className="flex items-center gap-[26px]">
          <span className="font-display text-[42px] leading-none tracking-[-2px] italic">
            UFC
          </span>
          <span className="h-5 w-px bg-[#555]" />
          <span className="text-[13px] tracking-[2.4px] uppercase max-[600px]:text-[10px]">
            Rankings
          </span>
        </div>
        <span className="text-[10px] tracking-[1.5px] text-muted max-[600px]:hidden">
          THE OCTAGON / BY THE NUMBERS
        </span>
      </header>
      <section
        className="flex items-end justify-between py-[23px]"
        aria-labelledby="division-heading"
      >
        <div>
          <p className="flex items-center gap-[9px] text-[10px] tracking-[1.6px] text-muted">
            <span className="size-[5px] bg-accent" />
            OFFICIAL UFC RANKINGS
          </p>
          <CategoryHeading division={division} />
        </div>
        <p className="flex items-center gap-3 pb-1 max-[600px]:hidden">
          <strong className="font-display text-[46px] leading-none font-normal">
            {division.entries.length}
          </strong>
          <span className="text-[10px] leading-[1.6] tracking-[1.2px] text-muted">
            RANKED
            <br />
            ATHLETES
          </span>
        </p>
      </section>
      <div
        data-region="experience"
        className={`relative grid border-t border-line max-[900px]:grid-cols-2 max-[600px]:flex max-[600px]:flex-col ${detail ? "h-[586px] grid-rows-[minmax(0,1fr)] max-[900px]:grid-rows-none grid-cols-[minmax(220px,26%)_minmax(0,1fr)_minmax(210px,24%)] [@media(min-width:1000px)_and_(max-height:850px)]:h-[554px] max-[1100px]:grid-cols-[minmax(220px,26%)_minmax(0,1fr)_minmax(210px,25%)] max-[900px]:h-auto" : "min-h-[520px] grid-cols-[minmax(325px,35%)_minmax(320px,1fr)_minmax(240px,24%)] max-[1100px]:grid-cols-[minmax(295px,34%)_minmax(265px,1fr)_minmax(210px,25%)]"}`}
        aria-busy={pending || state.phase === "transitioning"}
      >
        {!detail && (
          <section
            aria-label="Ranking selector"
            className="relative z-20 min-w-0 pt-[22px] pr-7 max-[1100px]:pr-[15px] max-[600px]:pr-0"
          >
            <CategoryDropdown
              divisions={data.divisions}
              active={division.id}
              disabled={pending || state.phase === "transitioning"}
              onChange={(id) => {
                closePreview();
                const target = resolveSelection(
                  data.divisions,
                  data.defaultDivisionId,
                  id,
                  null,
                );
                void navigate({
                  view: "rankings",
                  divisionId: target.division.id,
                  fighterId: target.entry.fighterId,
                });
              }}
            />
            <RankingDial
              division={division}
              fighters={data.fighters}
              selected={route.fighterId}
              onSelect={(id) => {
                void navigate({
                  view: "rankings",
                  divisionId: division.id,
                  fighterId: id,
                });
              }}
            />
          </section>
        )}
        {fighter && bundle ? (
          <>
            <FighterFigure
              fighter={detail ? historyFigure(fighter) : fighter}
              rank={entry?.rank ?? null}
              weight={division.weightLb}
              nickname={bundle.profile.nickname}
              place={bundle.profile.placeOfBirth}
              detail={detail}
              onReturn={goHome}
            />
            {detail && (
              <FightHistory
                bundle={bundle}
                divisionId={division.id}
                onNavigate={openOpponent}
                onPreview={showPreview}
                onLeave={leavePreview}
              />
            )}
            <FighterProfile
              bundle={bundle}
              rank={entry?.rank ?? null}
              asOf={division.snapshotAt}
              historyHref={
                detail
                  ? routeUrl(
                      returnRoute(
                        route,
                        data.divisions,
                        data.defaultDivisionId,
                      ),
                    )
                  : detailUrl(division.id, bundle.profile.id)
              }
              historyOpen={detail}
              onHistory={
                detail ? goHome : () => openOpponent(bundle.profile.id)
              }
            />
          </>
        ) : (
          <section className="col-span-full py-8" aria-label="Fighter loading">
            <button
              className="cursor-pointer text-xs uppercase hover:text-accent"
              onClick={goHome}
            >
              ← {en.returnRankings}
            </button>
            {!state.error && (
              <p className="mt-8 text-sm text-muted">{en.loading}</p>
            )}
          </section>
        )}
      </div>
      <footer className="flex min-h-12 items-center justify-between gap-3 border-t border-line text-[10px] tracking-[1.1px] text-[#aaa69f]">
        <span>
          {en.snapshot} · {division.snapshotAt}
        </span>
        <span className="max-[900px]:hidden">
          RECORDS: UFCSTATS · IMAGERY: UFC.COM
        </span>
        <span>
          {detail
            ? "FIGHTER ARCHIVE"
            : `${String(division.entries.findIndex((e) => e.fighterId === route.fighterId) + 1).padStart(2, "0")} / ${division.entries.length}`}
        </span>
      </footer>
      <div role="status" className="sr-only">
        {pending
          ? en.loading
          : fighter
            ? `${fighter.name}, ${entry?.rank === 0 ? en.champion : entry ? `rank ${entry.rank}` : "fighter archive"}`
            : state.error === "unknown"
              ? en.unknownFighter
              : ""}
      </div>
      {state.error && (
        <div
          role="alert"
          aria-label="Fighter navigation error"
          className="mb-4 flex flex-wrap items-center gap-4 border border-accent p-4 text-sm"
        >
          <span>
            {state.error === "unknown" ? en.unknownFighter : en.loadError}
          </span>
          {state.error !== "unknown" && (
            <button className="cursor-pointer underline" onClick={retry}>
              {en.retry}
            </button>
          )}
          <button className="cursor-pointer underline" onClick={goHome}>
            {en.returnRankings}
          </button>
        </div>
      )}
      {preview && detail && (
        <OpponentPreview
          key={preview.id}
          anchor={preview}
          triggerRef={previewTrigger}
          store={store}
          divisionId={division.id}
          asOf={division.snapshotAt}
          onNavigate={openOpponent}
          onClose={closePreview}
          onEnter={keepPreview}
          onLeave={leavePreview}
        />
      )}
    </main>
  );
}
