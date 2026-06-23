"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Toast } from "@/components/ui/Toast";
import { noBrowserInputSuggestions } from "@/lib/browser-input";

export function NicknameSetup({ currentNickname, nextPath = "/" }: { currentNickname?: string | null; nextPath?: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState(currentNickname ?? "");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  async function submit() {
    setLoading(true);
    setToast("");

    const res = await fetch("/api/nickname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname })
    });
    const data = (await res.json()) as { error?: string };

    setLoading(false);
    if (!res.ok) {
      setToast(data.error ?? "닉네임 저장에 실패했습니다.");
      return;
    }

    router.push(nextPath);
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <Toast message={toast} />
      <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
        닉네임
        <input
          {...noBrowserInputSuggestions}
          value={nickname}
          onChange={(event) => setNickname(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          placeholder="공백 없이 2~16글자"
          maxLength={16}
        />
      </label>
      <button
        type="button"
        onClick={submit}
        disabled={loading}
        className="rounded-lg bg-teal-700 px-4 py-3 font-bold text-white shadow-soft disabled:opacity-60"
      >
        저장
      </button>
    </div>
  );
}
