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
    <div className="fixed left-1/2 top-4 z-[120] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg border border-[#8FA0F0]/45 bg-[#637EE1] px-4 py-3 text-center text-sm font-bold text-white shadow-[0_14px_34px_rgba(99,126,225,0.32)]">
      {message}
    </div>
  );
}
