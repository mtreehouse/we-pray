"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-700 shadow-soft transition active:scale-[0.99]"
    >
      <LogOut size={18} className="text-slate-500" />
      로그아웃
    </button>
  );
}
