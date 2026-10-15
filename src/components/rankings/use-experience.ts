"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { MotionController } from "@/lib/motion/controller";
import { prepareFighter } from "@/lib/motion/prepare";
import type { FighterBundle } from "@/lib/domain/contracts";
import { sameRoute, type ExperienceRoute } from "@/lib/domain/routes";
import { FighterStore, UnknownFighterError } from "@/lib/data/fighter-store";
import { RouteController } from "@/lib/navigation/controller";
import type { FighterSummary, RankingsData } from "./types";
type Target = { route: ExperienceRoute; write: boolean };
type State = {
  route: ExperienceRoute;
  bundle: FighterBundle | null;
  fighter: FighterSummary | null;
  phase: "rankings" | "history" | "preparing" | "transitioning" | "error";
  error: "unknown" | "request" | null;
  target: Target | null;
  generation: number;
  focus: "history" | "dial" | null;
};
type Action =
  | { type: "prepare"; generation: number; target: Target }
  | {
      type: "commit";
      generation: number;
      route: ExperienceRoute;
      bundle: FighterBundle;
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
  const [motion] = useState(() => new MotionController());
  const [store] = useState(() => new FighterStore(data, initialBundle));
  const [state, dispatch] = useReducer(reducer, {
    route: initialRoute,
    bundle: initialBundle,
    fighter: initialBundle ? data.fighters[initialBundle.profile.id] : null,
    phase: initialBundle ? "rankings" : "preparing",
    error: null,
    target: null,
    generation: 0,
    focus: null,
  });
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
      if (
        write &&
        (motion.categoryBusy ||
          (r.pending &&
            r.pending.route.divisionId !== live.current.route.divisionId))
      )
        return;
      if (
        r.pending &&
        sameRoute(r.pending.route, route) &&
        r.pending.write === write
      )
        return;
      if (
        !r.pending &&
        live.current.bundle &&
        sameRoute(live.current.route, route) &&
        live.current.phase !== "error"
      ) {
        if (write && route.view === "rankings")
          routeController.current?.commit(route);
        return;
      }
      r.controller?.abort();
      motion.cancel();
      const generation = ++r.generation;
      const controller = new AbortController();
      r.controller = controller;
      const target = { route, write };
      r.pending = target;
      dispatch({ type: "prepare", generation, target });
      try {
        const bundle = await store.load(
          route.fighterId,
          controller.signal,
          route.view === "history",
        );
        const summary = await store.summary(bundle, controller.signal);
        const fighter = await prepareFighter(
          summary,
          route.view === "history",
          controller.signal,
        );
        if (generation !== r.generation || controller.signal.aborted) return;
        if (
          !(await motion.depart(live.current.route, route, controller.signal))
        )
          return;
        if (generation !== r.generation || controller.signal.aborted) return;
        if (write) routeController.current?.commit(route);
        const focus =
          route.view === "history"
            ? "history"
            : live.current.route.view === "history"
              ? "dial"
              : null;
        motion.beforeCommit();
        flushSync(() =>
          dispatch({
            type: "commit",
            generation,
            route,
            bundle,
            fighter,
            focus,
          }),
        );
      } catch (error) {
        if (generation === r.generation && !controller.signal.aborted)
          dispatch({
            type: "error",
            generation,
            error: error instanceof UnknownFighterError ? "unknown" : "request",
          });
      } finally {
        if (generation === r.generation) r.pending = null;
      }
    },
    [store, motion],
  );
  const cancel = useCallback(() => {
    const r = lifecycle.current;
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
  useEffect(() => {
    const requests = lifecycle.current;
    const controller = new RouteController(
      window,
      data.divisions,
      data.defaultDivisionId,
    );
    routeController.current = controller;
    const route = controller.initialize();
    if (route.view === "history") void navigate(route, false);
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
      requests.controller?.abort();
      motion.cancel();
      requests.pending = null;
      requests.generation++;
      routeController.current = null;
    };
  }, [data, cancel, navigate, motion]);
  const retry = () => {
    const target = state.target;
    if (target) void navigate(target.route, target.write);
  };
  const finish = useCallback(
    (generation: number) => dispatch({ type: "finish", generation }),
    [],
  );
  return { state, navigate, returnHome, retry, store, motion, finish };
}
