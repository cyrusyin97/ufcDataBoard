"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { beginMeasurement, installPerformance } from "@/lib/performance/client";
import type { Context } from "@/lib/performance/contracts";
import { flushSync } from "react-dom";
import { MotionController } from "@/lib/motion/controller";
import { prepareFighter } from "@/lib/motion/prepare";
import type { FighterBundle } from "@/lib/domain/contracts";
import { sameRoute, type ExperienceRoute } from "@/lib/domain/routes";
import { IntentPreloader } from "@/lib/data/intent-preloader";
import { parseRoute, routeUrl } from "@/lib/domain/routes";
import { FighterStore, UnknownFighterError } from "@/lib/data/fighter-store";
import {
  BoutStore,
  BoutRequestError,
  type BoutData,
} from "@/lib/data/bout-store";
import { RouteController } from "@/lib/navigation/controller";
import type { FighterSummary, RankingsData } from "./types";
export type BoutViewData = BoutData & {
  participants: { bundle: FighterBundle; summary: FighterSummary }[];
};
type Target = { route: ExperienceRoute; write: boolean };
type State = {
  route: ExperienceRoute;
  bundle: FighterBundle | null;
  boutData: BoutViewData | null;
  fighter: FighterSummary | null;
  phase:
    "rankings" | "history" | "bout" | "preparing" | "transitioning" | "error";
  error: "unknown" | "request" | "bout" | null;
  target: Target | null;
  generation: number;
  focus: "history" | "bout" | "dial" | null;
};
type Action =
  | { type: "prepare"; generation: number; target: Target }
  | {
      type: "commit";
      generation: number;
      route: ExperienceRoute;
      bundle: FighterBundle;
      boutData: BoutViewData | null;
      fighter: FighterSummary;
      focus: State["focus"];
    }
  | { type: "error"; generation: number; error: NonNullable<State["error"]> }
  | { type: "cancel"; generation: number }
  | { type: "finish"; generation: number };
function reducer(state: State, action: Action): State {
  if (action.type === "prepare")
    return {
      ...state,
      phase: "preparing",
      error: null,
      generation: action.generation,
      target: action.target,
      focus: null,
    };
  if (action.type === "cancel")
    return {
      ...state,
      phase: state.route.view,
      error: null,
      target: null,
      generation: action.generation,
      focus: null,
    };
  if (state.generation !== action.generation) return state;
  if (action.type === "finish") return { ...state, phase: state.route.view };
  if (action.type === "error")
    return { ...state, phase: "error", error: action.error };
  return {
    ...state,
    route: action.route,
    bundle: action.bundle,
    boutData: action.boutData,
    fighter: action.fighter,
    phase: "transitioning",
    error: null,
    target: null,
    focus: action.focus,
  };
}
export function useExperience(
  data: RankingsData,
  initialRoute: ExperienceRoute,
  initialBundle: FighterBundle | null,
) {
  const [boutStore] = useState(
    () =>
      new BoutStore(
        data.datasetVersion,
        !!data.boutAnalysis,
        undefined,
        data.boutSourceHash,
      ),
  );
  const [motion] = useState(() => new MotionController());
  const [preloader] = useState(() => new IntentPreloader());
  const [store] = useState(() => new FighterStore(data, initialBundle));
  const [state, dispatch] = useReducer(reducer, {
    route: initialRoute,
    bundle: initialBundle,
    boutData: null,
    fighter: initialBundle ? data.fighters[initialBundle.profile.id] : null,
    phase: initialBundle ? "rankings" : "preparing",
    error: null,
    target: null,
    generation: 0,
    focus: null,
  });
  const measurement = useRef<{
    generation: number;
    context: Context;
    commitDone?: boolean;
    finished?: boolean;
    arrival?: (outcome?: "completed") => void;
  } | null>(null);
  useEffect(
    () => installPerformance(data.datasetVersion),
    [data.datasetVersion],
  );
  const live = useRef(state);
  const lifecycle = useRef<{
    generation: number;
    controller: AbortController | null;
    pending: Target | null;
  }>({ generation: 0, controller: null, pending: null });
  const routeController = useRef<RouteController | null>(null);
  useLayoutEffect(() => {
    live.current = state;
  }, [state]);
  const navigate = useCallback(
    async (route: ExperienceRoute, write = true) => {
      const r = lifecycle.current;
      const trace = beginMeasurement(live.current.route, route, false, !write);
      if (
        write &&
        (motion.categoryBusy ||
          (r.pending &&
            r.pending.route.divisionId !== live.current.route.divisionId))
      ) {
        trace?.end("ignored", "busy");
        return;
      }
      if (
        r.pending &&
        sameRoute(r.pending.route, route) &&
        r.pending.write === write
      ) {
        trace?.end("ignored", "duplicate");
        return;
      }
      if (
        !r.pending &&
        live.current.bundle &&
        sameRoute(live.current.route, route) &&
        live.current.phase !== "error"
      ) {
        if (write && route.view === "rankings")
          routeController.current?.commit(route);
        trace?.end("ignored", "duplicate");
        return;
      }
      measurement.current?.context.end("cancelled", "superseded");
      r.controller?.abort();
      motion.cancel(
        live.current.route.view === "rankings" &&
          route.view === "rankings" &&
          live.current.route.divisionId === route.divisionId,
      );
      const generation = ++r.generation;
      trace?.generation(generation);
      measurement.current = trace ? { generation, context: trace } : null;
      const preparation = trace?.span("prepare");
      const controller = new AbortController();
      r.controller = controller;
      const target = { route, write };
      r.pending = target;
      dispatch({ type: "prepare", generation, target });
      try {
        await preloader.take(routeUrl(route), controller.signal);
        controller.signal.throwIfAborted();
        // Data and image readiness for the selected fighter do not depend on
        // the bout/reference response. Start them together and join before commit.
        const selectedReady = (async () => {
          const bundleReady = store.load(
            route.fighterId,
            controller.signal,
            route.view !== "rankings",
            trace,
          );
          const summaryReady = data.fighters[route.fighterId]
            ? Promise.resolve(data.fighters[route.fighterId])
            : bundleReady.then((bundle) =>
                store.summary(bundle, controller.signal, trace),
              );
          const fighterReady = summaryReady.then((summary) =>
            prepareFighter(
              summary,
              route.view !== "rankings",
              controller.signal,
              trace,
            ),
          );
          const [bundle, summary, fighter] = await Promise.all([
            bundleReady,
            summaryReady,
            fighterReady,
          ]);
          return { bundle, summary, fighter };
        })();
        const boutReady =
          route.view === "bout"
            ? boutStore
                .load(
                  route.boutId,
                  route.fighterId,
                  route.round,
                  controller.signal,
                  trace,
                )
                .then(async (data) => {
                  const participants = await Promise.all(
                    data.bout.fighterIds.map(async (id) => {
                      if (id === route.fighterId) {
                        const { bundle, summary } = await selectedReady;
                        return { bundle, summary };
                      }
                      const bundle = await store.load(
                        id,
                        controller.signal,
                        true,
                        trace,
                      );
                      return {
                        bundle,
                        summary: await store.summary(
                          bundle,
                          controller.signal,
                          trace,
                        ),
                      };
                    }),
                  );
                  return { ...data, participants };
                })
            : Promise.resolve(null);
        const [boutData, { bundle, fighter }] = await Promise.all([
          boutReady,
          selectedReady,
        ]);
        preparation?.();
        const departure = trace?.span("departure");
        if (generation !== r.generation || controller.signal.aborted) return;
        if (
          !(await motion.depart(live.current.route, route, controller.signal))
        )
          return;
        if (generation !== r.generation || controller.signal.aborted) return;
        departure?.();
        if (write) routeController.current?.commit(route);
        const focus =
          route.view === "bout"
            ? "bout"
            : route.view !== "rankings"
              ? "history"
              : live.current.route.view !== "rankings"
                ? "dial"
                : null;
        motion.beforeCommit();
        const commit = trace?.span("commit");
        flushSync(() =>
          dispatch({
            type: "commit",
            generation,
            route,
            bundle,
            boutData,
            fighter,
            focus,
          }),
        );
        commit?.();
        trace?.mark("committed");
        trace?.mark("target");
        const measured = measurement.current;
        if (measured?.generation === generation) {
          measured.commitDone = true;
          if (measured.finished) trace?.end("completed");
        }
      } catch (error) {
        trace?.end(
          controller.signal.aborted ? "cancelled" : "error",
          controller.signal.aborted ? "superseded" : "request",
        );
        if (generation === r.generation && !controller.signal.aborted)
          dispatch({
            type: "error",
            generation,
            error:
              error instanceof BoutRequestError
                ? "bout"
                : error instanceof UnknownFighterError
                  ? "unknown"
                  : "request",
          });
        // A failed branch must also cancel independent preparation still running.
        controller.abort();
      } finally {
        if (generation === r.generation) r.pending = null;
      }
    },
    [store, boutStore, motion, data.fighters, preloader],
  );
  const cancel = useCallback(() => {
    const r = lifecycle.current;
    measurement.current?.context.end("cancelled", "return");
    r.controller?.abort();
    motion.cancel();
    r.pending = null;
    dispatch({ type: "cancel", generation: ++r.generation });
  }, [motion]);
  const returnHome = useCallback(() => {
    cancel();
    const route = routeController.current?.returnHome();
    if (route) void navigate(route, false);
  }, [cancel, navigate]);
  const returnHistory = useCallback(() => {
    cancel();
    const route = routeController.current?.returnHistory();
    if (route) void navigate(route, false);
  }, [cancel, navigate]);
  useEffect(() => {
    const requests = lifecycle.current;
    const controller = new RouteController(
      window,
      data.divisions,
      data.defaultDivisionId,
    );
    routeController.current = controller;
    const route = controller.initialize();
    if (route.view !== "rankings") void navigate(route, false);
    const pop = () => {
      const route = controller.traverse();
      if (route) {
        cancel();
        void navigate(route, false);
      }
    };
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      measurement.current?.context.end("cancelled", "unmount");
      requests.controller?.abort();
      motion.cancel();
      requests.pending = null;
      requests.generation++;
      routeController.current = null;
    };
  }, [data, cancel, navigate, motion]);
  useEffect(() => {
    const root = document.querySelector("main");
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      clearTimeout(timer);
      preloader.cancel();
    };
    const anchor = (target: EventTarget | null) =>
      target instanceof Element ? target.closest("a[href]") : null;
    const begin = (event: Event) => {
      if (event instanceof PointerEvent && event.pointerType !== "mouse")
        return;
      const link = anchor(event.target);
      if (
        !link ||
        link.contains((event as MouseEvent).relatedTarget as Node | null)
      )
        return;
      const url = new URL(link.getAttribute("href")!, location.href);
      if (
        url.origin !== location.origin ||
        url.pathname !== "/rankings" ||
        !["history", "bout"].includes(url.searchParams.get("view") ?? "")
      )
        return;
      const connection = (
        navigator as Navigator & { connection?: { saveData?: boolean } }
      ).connection;
      if (document.hidden || connection?.saveData) return;
      const target = parseRoute(
        url.searchParams,
        data.divisions,
        data.defaultDivisionId,
      );
      if (preloader.has(routeUrl(target))) return;
      stop();
      timer = setTimeout(
        () =>
          preloader.start(routeUrl(target), async (signal) => {
            const fighterReady = async (id: string, portrait: boolean) => {
              const bundle = await store.load(id, signal);
              const summary = await store.summary(bundle, signal);
              if (portrait) await prepareFighter(summary, true, signal);
            };
            await Promise.all([
              fighterReady(target.fighterId, true),
              target.view === "bout"
                ? boutStore
                    .load(target.boutId, target.fighterId, target.round, signal)
                    .then((result) =>
                      Promise.all(
                        result.bout.fighterIds
                          .filter((id) => id !== target.fighterId)
                          .map((id) => fighterReady(id, false)),
                      ),
                    )
                : Promise.resolve(),
            ]);
          }),
        150,
      );
    };
    const leave = (event: Event) => {
      const link = anchor(event.target);
      if (
        link &&
        !link.contains((event as MouseEvent).relatedTarget as Node | null)
      )
        stop();
    };
    const visibility = () => {
      if (document.hidden) stop();
    };
    const click = () => clearTimeout(timer);
    root.addEventListener("click", click);
    root.addEventListener("pointerover", begin);
    root.addEventListener("pointerout", leave);
    root.addEventListener("focusin", begin);
    root.addEventListener("focusout", leave);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stop();
      root.removeEventListener("click", click);
      root.removeEventListener("pointerover", begin);
      root.removeEventListener("pointerout", leave);
      root.removeEventListener("focusin", begin);
      root.removeEventListener("focusout", leave);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [data, store, boutStore, preloader]);
  const retry = () => {
    const target = state.target;
    if (target) void navigate(target.route, target.write);
  };
  const finish = useCallback((generation: number) => {
    const m = measurement.current;
    if (m?.generation === generation) {
      m.arrival?.();
      m.finished = true;
      if (m.commitDone) m.context.end("completed");
    }
    dispatch({ type: "finish", generation });
  }, []);
  const beginArrival = useCallback((generation: number) => {
    const m = measurement.current;
    if (m?.generation === generation) m.arrival = m.context.span("arrival");
  }, []);
  useLayoutEffect(() => {
    if (state.phase === "preparing")
      measurement.current?.context.mark("pending");
  }, [state.phase, state.generation]);
  return {
    beginArrival,
    state,
    navigate,
    returnHome,
    returnHistory,
    retry,
    store,
    motion,
    finish,
  };
}
