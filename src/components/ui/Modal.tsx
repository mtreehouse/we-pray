"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { X } from "lucide-react";

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  stickyHeader?: boolean;
  hideScrollbar?: boolean;
};

let openModalCount = 0;
let originalBodyOverflow = "";
let originalBodyPosition = "";
let originalBodyTop = "";
let originalBodyWidth = "";
let lockedScrollY = 0;

export function Modal({ title, open, onClose, children, stickyHeader = false, hideScrollbar = false }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    if (openModalCount === 0) {
      lockedScrollY = window.scrollY;
      originalBodyOverflow = document.body.style.overflow;
      originalBodyPosition = document.body.style.position;
      originalBodyTop = document.body.style.top;
      originalBodyWidth = document.body.style.width;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.width = "100%";
    }
    openModalCount += 1;

    return () => {
      openModalCount = Math.max(0, openModalCount - 1);
      if (openModalCount === 0) {
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.position = originalBodyPosition;
        document.body.style.top = originalBodyTop;
        document.body.style.width = originalBodyWidth;
        window.scrollTo({ top: lockedScrollY });
      }
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center overscroll-contain bg-slate-950/40 p-3 dark:bg-slate-950/70 sm:items-center">
      <section className={"max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-lg bg-white shadow-soft dark:border dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_18px_48px_rgba(0,0,0,0.45)] " + (stickyHeader ? "p-0" : "p-5") + (hideScrollbar ? " [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" : "")}>
        <div className={(stickyHeader ? "sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950" : "mb-4") + " flex items-center justify-between gap-3"}>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>
        {stickyHeader ? <div className="p-5">{children}</div> : children}
      </section>
    </div>
  );
}
