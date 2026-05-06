"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center">
      <section className="w-full max-w-md rounded-lg bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
