"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";

const ROOM_LIST_GUIDE_STORAGE_KEY = "wepray:room-list-guide:v1";

type GuideRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function RoomListGuide() {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<GuideRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  const closeGuide = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(ROOM_LIST_GUIDE_STORAGE_KEY, "done");
    } catch {
      // Keep the guide session-only when browser storage is unavailable.
    }
  }, []);

  const updateRect = useCallback(() => {
    if (!open) return;

    setViewport((current) => (
      current.width === window.innerWidth && current.height === window.innerHeight
        ? current
        : { width: window.innerWidth, height: window.innerHeight }
    ));

    const target = document.querySelector<HTMLElement>('[data-room-list-guide="actions"]');
    if (!target) {
      setRect(null);
      return;
    }

    const padding = 10;
    const box = target.getBoundingClientRect();
    const width = Math.min(window.innerWidth - 16, box.width + padding * 2);
    const height = Math.min(window.innerHeight - 16, box.height + padding * 2);
    setRect({
      top: clamp(box.top - padding, 8, Math.max(8, window.innerHeight - height - 8)),
      left: clamp(box.left - padding, 8, Math.max(8, window.innerWidth - width - 8)),
      width,
      height
    });
  }, [open]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(ROOM_LIST_GUIDE_STORAGE_KEY) !== "done") {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousTop = document.body.style.top;
    const previousWidth = document.body.style.width;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = "100%";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.top = previousTop;
      document.body.style.width = previousWidth;
      document.body.style.touchAction = previousTouchAction;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const update = () => updateRect();
    const timers = [30, 120, 260, 520].map((delay) => window.setTimeout(update, delay));
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [open, updateRect]);

  if (!open) return null;

  const pulseStyle: CSSProperties | null = rect
    ? {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        borderRadius: 999
      }
    : null;
  const cardWidth = Math.min(340, Math.max(0, viewport.width - 32));
  const cardLeft = rect
    ? clamp(rect.left + rect.width / 2 - cardWidth / 2, 16, Math.max(16, viewport.width - cardWidth - 16))
    : 16;
  const estimatedCardHeight = 156;
  const cardGap = 28;
  const cardTop = rect
    ? clamp(rect.top - estimatedCardHeight - cardGap, 16, Math.max(16, viewport.height - estimatedCardHeight - 16))
    : 96;
  const cardStyle: CSSProperties = viewport.width
    ? { width: cardWidth, left: cardLeft, top: cardTop }
    : { left: 16, right: 16, bottom: 104 };
  const blurBlockers: CSSProperties[] = rect && viewport.width && viewport.height
    ? [
        { left: 0, top: 0, width: viewport.width, height: rect.top },
        { left: 0, top: rect.top, width: rect.left, height: rect.height },
        { left: rect.left + rect.width, top: rect.top, width: Math.max(0, viewport.width - rect.left - rect.width), height: rect.height },
        { left: 0, top: rect.top + rect.height, width: viewport.width, height: Math.max(0, viewport.height - rect.top - rect.height) }
      ]
    : [{ left: 0, top: 0, width: viewport.width, height: viewport.height }];

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {blurBlockers.map((blocker, index) => (
        <div
          key={`room-list-guide-blur-${index}`}
          className="pointer-events-auto fixed bg-white/10 backdrop-blur-[2px] dark:bg-slate-950/20"
          style={blocker}
          onClick={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.preventDefault()}
          onWheel={(event) => event.preventDefault()}
        />
      ))}
      {rect ? (
        <div
          className="pointer-events-auto fixed"
          style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 999 }}
          onClick={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.preventDefault()}
          onWheel={(event) => event.preventDefault()}
          aria-hidden
        />
      ) : null}
      {pulseStyle ? (
        <div className="absolute" style={pulseStyle} aria-hidden>
          <div className="absolute inset-0 rounded-[inherit] border-2 border-[#637EE1]/90 shadow-[0_0_24px_rgba(99,126,225,0.5)] room-list-guide-pulse" />
          <div className="absolute -inset-2 rounded-[inherit] border-2 border-[#8FA0F0]/60 room-list-guide-ripple" />
        </div>
      ) : null}
      <div className="pointer-events-auto fixed max-w-[calc(100%-2rem)]" style={cardStyle}>
        <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3 text-amber-950 shadow-[0_16px_38px_rgba(217,119,6,0.28)] ring-1 ring-white/70 backdrop-blur dark:border-amber-500/70 dark:bg-amber-950/95 dark:text-amber-50 dark:ring-amber-300/10">
          <div className="mb-2 flex items-center gap-2 text-sm font-black">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-amber-700 shadow-sm dark:bg-slate-900/70 dark:text-amber-200">
              <Search size={16} />
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5">
              방 찾기와
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/80 text-amber-700 shadow-sm dark:bg-slate-900/70 dark:text-amber-200">
                <Plus size={15} />
              </span>
              생성
            </span>
          </div>
          <p className="text-sm font-bold leading-6 text-amber-900/85 dark:text-amber-100/85">
            돋보기로 이미 만들어진 방을 찾고,<br />+ 버튼으로 새 방을 만들 수 있어요.
          </p>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={closeGuide}
              className="guide-cta-animated h-9 rounded-full px-4 text-xs font-black text-white"
            >
              확인
            </button>
          </div>
        </div>
      </div>
      <style jsx global>{`
        @keyframes room-list-guide-pulse {
          0%, 100% { transform: scale(1); opacity: 0.96; }
          50% { transform: scale(1.045); opacity: 0.58; }
        }
        @keyframes room-list-guide-ripple {
          0% { transform: scale(0.98); opacity: 0.7; }
          100% { transform: scale(1.14); opacity: 0; }
        }
        .room-list-guide-pulse { animation: room-list-guide-pulse 1.15s ease-in-out infinite; }
        .room-list-guide-ripple { animation: room-list-guide-ripple 1.15s ease-out infinite; }
      `}</style>
    </div>
  );
}
