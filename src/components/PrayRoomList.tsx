"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crown } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

type RoomSummary = {
  id: string;
  title: string;
  description: string;
  creatorNickname: string | null;
  role?: "creator" | "member";
};

export function PrayRoomList({ rooms }: { rooms: RoomSummary[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [toast, setToast] = useState("");

  return (
    <div className="pb-24">
      <Toast message={toast} />
      <div className="grid gap-3">
        {rooms.length ? (
          rooms.map((room) => (
            <Link
              key={room.id}
              href={`/pray-room/${room.id}`}
              className="block rounded-lg border border-white/80 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 active:translate-y-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-black text-slate-950">{room.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{room.description}</p>
                </div>
                {room.role === "creator" ? <Crown className="shrink-0 text-amber-500" size={20} /> : null}
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">
                생성자 {room.creatorNickname ?? "알 수 없음"}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm leading-6 text-slate-500">
            아직 입장한 방이 없습니다.
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 safe-bottom">
        <div className="mx-auto flex w-full max-w-xl justify-end gap-3 px-4 pb-4">
          <button
            type="button"
            onClick={() => setFindOpen(true)}
            className="grid h-14 w-14 place-items-center rounded-full bg-slate-900 text-2xl text-white shadow-soft"
            aria-label="방 찾기"
          >
            🔍
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="grid h-14 w-14 place-items-center rounded-full bg-teal-700 text-3xl text-white shadow-soft"
            aria-label="방 생성"
          >
            +
          </button>
        </div>
      </div>

      <CreateRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onToast={setToast}
        onCreated={(roomId) => {
          setCreateOpen(false);
          router.push(`/pray-room/${roomId}`);
          router.refresh();
        }}
      />
      <FindRoomModal open={findOpen} onClose={() => setFindOpen(false)} onToast={setToast} />
    </div>
  );
}

function CreateRoomModal({
  open,
  onClose,
  onToast,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
  onCreated: (roomId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, password })
    });
    const data = (await res.json()) as { roomId?: string; error?: string };
    setLoading(false);

    if (!res.ok || !data.roomId) {
      onToast(data.error ?? "방 생성에 실패했습니다.");
      return;
    }

    setTitle("");
    setDescription("");
    setPassword("");
    onCreated(data.roomId);
  }

  return (
    <Modal title="방 생성" open={open} onClose={onClose}>
      <div className="grid gap-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
          placeholder="방 제목"
          maxLength={40}
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
          placeholder="방 설명"
          maxLength={300}
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
          placeholder="입장 비밀번호"
          type="password"
          maxLength={40}
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="rounded-lg bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60"
        >
          생성
        </button>
      </div>
    </Modal>
  );
}

function FindRoomModal({
  open,
  onClose,
  onToast
}: {
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<RoomSummary | null>(null);
  const [results, setResults] = useState<RoomSummary[]>([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    setLoading(true);
    const res = await fetch(`/api/rooms/search?q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as { rooms?: RoomSummary[]; error?: string };
    setLoading(false);

    if (!res.ok) {
      onToast(data.error ?? "검색에 실패했습니다.");
      return;
    }

    setResults(data.rooms ?? []);
  }

  async function join() {
    if (!selectedRoom) return;

    setLoading(true);
    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: selectedRoom.id, password })
    });
    const data = (await res.json()) as { roomId?: string; error?: string };
    setLoading(false);

    if (!res.ok || !data.roomId) {
      onToast(data.error ?? "방 입장에 실패했습니다.");
      return;
    }

    onClose();
    router.push(`/pray-room/${data.roomId}`);
    router.refresh();
  }

  return (
    <Modal title="방 찾기" open={open} onClose={onClose}>
      <div className="grid gap-3">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
            placeholder="방 제목 또는 생성자"
          />
          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-60"
          >
            검색
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto">
          {results.map((room) => (
            <button
              key={room.id}
              type="button"
              onClick={() => {
                setSelectedRoom(room);
                setPassword("");
              }}
              className="mb-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-left"
            >
              <span className="block font-bold text-slate-900">{room.title}</span>
              <span className="text-xs text-slate-500">생성자 {room.creatorNickname ?? "알 수 없음"}</span>
            </button>
          ))}
        </div>

        {selectedRoom ? (
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="mb-2 text-sm font-bold text-slate-800">{selectedRoom.title} 입장</p>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
              placeholder="입장 비밀번호"
              type="password"
            />
            <button
              type="button"
              onClick={join}
              disabled={loading}
              className="mt-3 w-full rounded-lg bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60"
            >
              입장
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
