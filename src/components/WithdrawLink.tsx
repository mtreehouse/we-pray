"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function WithdrawLink() {
  const [loading, setLoading] = useState(false);

  async function withdraw() {
    if (loading) return;
    if (!confirm("정말 탈퇴하시겠습니까?")) return;

    setLoading(true);
    const res = await fetch("/api/account", { method: "DELETE" });

    if (!res.ok) {
      alert("탈퇴 처리에 실패했습니다.");
      setLoading(false);
      return;
    }

    await signOut({ callbackUrl: "/" });
  }

  return (
    <button
      type="button"
      onClick={withdraw}
      disabled={loading}
      className="text-xs font-semibold text-slate-400 underline underline-offset-2 disabled:opacity-60"
    >
      탈퇴하기
    </button>
  );
}
