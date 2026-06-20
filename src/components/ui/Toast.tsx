"use client";

import { useEffect } from "react";

type ToastProps = {
  message: string;
  duration?: number;
  onClose?: () => void;
};

export function Toast({ message, duration = 2400, onClose }: ToastProps) {
  useEffect(() => {
    if (!message || !onClose) return;

    const timer = window.setTimeout(onClose, duration);
    return () => window.clearTimeout(timer);
  }, [duration, message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[120] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-medium text-white shadow-soft">
      {message}
    </div>
  );
}
