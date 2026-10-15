"use client";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { MotionText } from "@/lib/motion/text";
import type { FighterBundle } from "@/lib/domain/contracts";
import type { FighterStore } from "@/lib/data/fighter-store";
import { detailUrl } from "@/lib/domain/routes";
import { snapshotAge, heightText, reachText } from "@/lib/domain/format";
import type { FighterSummary } from "./types";
import { FighterImage } from "./media";
import { normalClick, type PreviewAnchor } from "./history";
import { en } from "@/messages/en";
export function OpponentPreview({
  anchor,
  triggerRef,
  store,
  divisionId,
  asOf,
  onNavigate,
  onClose,
  onEnter,
  onLeave,
}: {
  anchor: Omit<PreviewAnchor, "element">;
  triggerRef: RefObject<HTMLElement | null>;
  store: FighterStore;
  divisionId: string;
  asOf: string;
  onNavigate: (id: string) => void;
  onClose: () => void;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const [content, setContent] = useState<{
    bundle: FighterBundle;
    fighter: FighterSummary;
  } | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const card = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: 14, top: 14 });
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const bundle = await store.load(anchor.id, controller.signal);
        const fighter = await store.summary(bundle, controller.signal);
        if (!controller.signal.aborted) setContent({ bundle, fighter });
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, [anchor.id, store, attempt]);
  useLayoutEffect(() => {
    const place = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger || !card.current) return;
      const box = card.current.getBoundingClientRect();
      const left = Math.max(
        14,
        Math.min(window.innerWidth - box.width - 14, trigger.right + 12),
      );
      const below = trigger.bottom + 12;
      const top = Math.max(
        14,
        Math.min(window.innerHeight - box.height - 14, below),
      );
      setPosition({ left, top });
    };
    place();
    window.addEventListener("resize", place);
    const scroll = (event: Event) => {
      if (!card.current?.contains(event.target as Node)) onClose();
    };
    window.addEventListener("scroll", scroll, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", scroll, true);
    };
  }, [anchor, content, error, onClose, triggerRef]);
  useEffect(() => {
    const outside = (e: PointerEvent) => {
      if (
        !card.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      )
        onClose();
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [triggerRef, onClose]);
  const profile = content?.bundle.profile;
  return (
    <div
      ref={card}
      role="dialog"
      aria-label={`${anchor.name} brief profile`}
      data-preview-fighter={anchor.id}
      className="fixed z-50 max-h-[calc(100dvh-28px)] w-[320px] overflow-y-auto max-w-[calc(100vw-28px)] border border-[#5b5751] bg-[#242425] px-5 pt-[18px] pb-4 shadow-[0_14px_60px_#0009]"
      style={position}
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      onFocusCapture={onEnter}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) onLeave();
      }}
    >
      <div className="flex items-center justify-between text-[8px] tracking-[1.5px] text-muted">
        <span>OPPONENT PROFILE</span>
        <button
          aria-label="Close opponent profile"
          className="cursor-pointer text-xl"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      {content && profile ? (
        <>
          <div className="my-4 flex items-center gap-[17px]">
            <div className="h-[91px] w-[75px] shrink-0 overflow-hidden bg-[#363432]">
              <FighterImage
                image={content.fighter.thumbnail}
                name={profile.displayName}
                className="h-full w-full object-cover object-top"
                eager
              />
            </div>
            <div className="min-w-0">
              <p className="text-[8px] text-muted">{profile.nickname ?? "—"}</p>
              <h4 className="mt-[6px] mb-[10px] font-display text-[27px] leading-[1.05] uppercase">
                <MotionText field="name" text={profile.displayName} />
              </h4>
              <p className="font-display text-[25px] leading-none">
                {(["wins", "losses", "draws"] as const).map((field, i) => (
                  <span key={field}>
                    {i > 0 && "-"}
                    <MotionText
                      field={`record-${field}`}
                      text={String(profile.careerRecord[field] ?? "—")}
                    />
                  </span>
                ))}{" "}
                <small className="font-body text-[8px] text-muted">W–L–D</small>
              </p>
            </div>
          </div>
          <dl className="flex gap-7 border-y border-[#494540] py-[14px]">
            {[
              ["AGE", snapshotAge(profile.birthDate, asOf)],
              ["HEIGHT", heightText(profile.heightCm)],
              ["REACH", reachText(profile.reachCm)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col gap-[7px]">
                <dt className="text-[8px] text-muted">
                  <MotionText
                    field={`label-${String(label).toLowerCase()}`}
                    text={String(label)}
                  />
                </dt>
                <dd className="font-display text-[17px] leading-none">
                  <MotionText
                    field={String(label).toLowerCase()}
                    text={String(value ?? "—")}
                  />
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p role="status" className="py-5 text-sm text-muted">
          {error ? en.previewError : en.loading}
        </p>
      )}
      {error && (
        <button
          className="mb-3 cursor-pointer text-xs underline"
          onClick={() => {
            setError(false);
            setAttempt((n) => n + 1);
          }}
        >
          {en.retry}
        </button>
      )}
      <a
        href={detailUrl(divisionId, anchor.id)}
        className="mt-[13px] flex justify-between text-[10px] tracking-[1px] uppercase hover:text-accent"
        onClick={(e) => {
          if (normalClick(e)) {
            e.preventDefault();
            onNavigate(anchor.id);
          }
        }}
      >
        Open recorded history <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
