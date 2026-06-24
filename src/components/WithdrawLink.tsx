"use client";

import { X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { noBrowserInputSuggestions } from "@/lib/browser-input";
import { clearWePrayClientCache } from "@/lib/client-cache";

type WithdrawLinkProps = {
  currentNickname: string;
};

export function WithdrawLink({ currentNickname }: WithdrawLinkProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [nicknameInput, setNicknameInput] = useState("");
  const [message, setMessage] = useState("");

  function openWithdrawModal() {
    if (loading) return;

    setNicknameInput("");
    setMessage("");
    setOpen(true);
  }

  function closeWithdrawModal() {
    if (loading) return;

    setOpen(false);
    setNicknameInput("");
    setMessage("");
  }

  async function withdraw() {
    if (loading) return;
    const confirmedNickname = currentNickname.trim();
    const typedNickname = nicknameInput.trim();

    if (!typedNickname) {
      setMessage("현재 닉네임을 입력해주세요.");
      return;
    }

    if (typedNickname !== confirmedNickname) {
      setMessage("닉네임이 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    setMessage("");
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: confirmedNickname })
    });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      alert(data.error ?? "탈퇴 처리에 실패했습니다.");
      setLoading(false);
      return;
    }

    clearWePrayClientCache();
    await signOut({ callbackUrl: "/" });
  }

  return (
    <>
      <button
        type="button"
        onClick={openWithdrawModal}
        disabled={loading}
        className="text-xs font-semibold text-slate-400 underline underline-offset-2 disabled:opacity-60"
      >
        탈퇴하기
      </button>

      <Modal title="탈퇴 확인" open={open} onClose={closeWithdrawModal}>
        <div className="grid gap-4">
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            탈퇴하려면 현재 닉네임 <span className="font-bold text-slate-900 dark:text-slate-50">{currentNickname}</span>을 입력해주세요.
          </p>
          <div className="grid gap-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="withdraw-nickname">
              현재 닉네임
            </label>
            <input
              id="withdraw-nickname"
              type="text"
              value={nicknameInput}
              onChange={(event) => setNicknameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void withdraw();
                }
              }}
              {...noBrowserInputSuggestions}
              className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none ring-0 placeholder:text-slate-400 focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50"
              placeholder="닉네임 입력"
            />
          </div>
          {message ? <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{message}</p> : null}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={closeWithdrawModal}
              disabled={loading}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-soft dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <X size={16} />
              취소
            </button>
            <button
              type="button"
              onClick={() => void withdraw()}
              disabled={loading}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-3 text-sm font-black text-white shadow-soft disabled:opacity-60"
            >
              탈퇴하기
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
