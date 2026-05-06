"use client";

export function Toast({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-lg bg-slate-950 px-4 py-3 text-center text-sm font-medium text-white shadow-soft">
      {message}
    </div>
  );
}
