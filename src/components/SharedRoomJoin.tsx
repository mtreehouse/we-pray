"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { noBrowserPasswordSuggestions } from "@/lib/browser-input";

type RoomKind = "pray" | "bible";

type SharedRoomJoinProps = {
  kind: RoomKind;
  roomId: string;
  roomTitle: string;
};

const kindLabels: Record<RoomKind, { title: string; api: string; path: string; emptyPassword: string; joining: string }> = {
  pray: {
    title: "기도방 입장",
    api: "/api/rooms/join",
    path: "/pray-room",
    emptyPassword: "공유받은 비밀번호를 입력해주세요.",
    joining: "기도방에 입장하는 중입니다."
  },
  bible: {
    title: "성경방 입장",
    api: "/api/bible-rooms/join",
    path: "/bible-room",
    emptyPassword: "공유받은 성경방 비밀번호를 입력해주세요.",
    joining: "성경방에 입장하는 중입니다."
  }
};

export function SharedRoomJoin({ kind, roomId, roomTitle }: SharedRoomJoinProps) {
  const router = useRouter();
  const config = kindLabels[kind];
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(config.emptyPassword);
  const [loading, setLoading] = useState(false);

  async function joinRoom(nextPassword: string) {
    if (loading) return;
    const trimmedPassword = nextPassword.trim();
    if (!trimmedPassword) {
      setMessage(config.emptyPassword);
      return;
    }

    setLoading(true);
    setMessage(config.joining);
    const res = await fetch(config.api, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, password: trimmedPassword })
    });
    const data = await res.json().catch(() => ({})) as { roomId?: string; error?: string };
    setLoading(false);

    if (!res.ok || !data.roomId) {
      setMessage(data.error ?? "입장에 실패했습니다.");
      return;
    }

    router.replace(config.path + "/" + data.roomId);
    router.refresh();
  }

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-xl place-items-center px-4 py-6 dark:text-slate-100">
      <section className="w-full rounded-lg bg-white p-5 text-center shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
          <KeyRound size={22} />
        </div>
        <p className="text-sm font-black text-teal-700 dark:text-teal-300">{config.title}</p>
        <h1 className="mt-2 break-words text-2xl font-black text-slate-950 dark:text-slate-50">{roomTitle}</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">{message}</p>

        {!loading ? (
          <div className="mt-5 grid gap-2 text-left">
            <input
              {...noBrowserPasswordSuggestions}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="입장 비밀번호"
              type="password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => joinRoom(password)}
              disabled={loading}
              className="rounded-lg bg-teal-700 px-4 py-3 font-black text-white disabled:opacity-60"
            >
              입장
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
