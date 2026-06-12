"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BookOpen, CalendarDays, Crown, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

type BibleRoomSummary = {
  id: string;
  title: string;
  description: string;
  creatorNickname: string | null;
  role?: "creator" | "member";
  scope: string;
  durationMonths: number;
  excludeSunday: boolean;
  planType: string;
  memberCount: number;
};

const scopeLabels: Record<string, string> = {
  OLD_TESTAMENT: "구약",
  NEW_TESTAMENT: "신약",
  ALL: "전체",
  구약: "구약",
  신약: "신약",
  전체: "전체"
};

const planTypeLabels: Record<string, string> = {
  SEQUENTIAL: "정주행",
  CHRONOLOGICAL: "연대기순",
  PARALLEL: "병행",
  정주행: "정주행",
  연대기순: "연대기순",
  병행: "병행"
};

export function BibleRoomList({ rooms }: { rooms: BibleRoomSummary[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [toast, setToast] = useState("");

  return (
    <div className="pb-24">
      <Toast message={toast} />
      <div className="grid gap-3">
        {rooms.length ? (
          rooms.map((room) => (
            <Link
              key={room.id}
              href={`/bible-room/${room.id}`}
              className="block rounded-lg border border-white/80 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 active:translate-y-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-black text-slate-950">{room.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{room.description}</p>
                </div>
                {room.role === "creator" ? <Crown className="shrink-0 text-amber-500" size={20} /> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-800">{scopeLabels[room.scope] ?? room.scope}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{room.durationMonths}개월</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1">{planTypeLabels[room.planType] ?? room.planType}</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500">
                생성자 {room.creatorNickname ?? "알 수 없음"} · 멤버 {room.memberCount}명
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm leading-6 text-slate-500">
            아직 입장한 성경방이 없습니다.
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 safe-bottom">
        <div className="mx-auto flex w-full max-w-xl justify-end px-4 pb-4">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="grid h-14 w-14 place-items-center rounded-full bg-teal-700 text-white shadow-soft"
            aria-label="성경방 생성"
            title="성경방 생성"
          >
            <Plus size={28} />
          </button>
        </div>
      </div>

      <CreateBibleRoomModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onToast={setToast}
        onCreated={(roomId) => {
          setCreateOpen(false);
          router.push(`/bible-room/${roomId}`);
          router.refresh();
        }}
      />
    </div>
  );
}

function CreateBibleRoomModal({
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
  const [scope, setScope] = useState("ALL");
  const [durationMonths, setDurationMonths] = useState(12);
  const [excludeSunday, setExcludeSunday] = useState(false);
  const [planType, setPlanType] = useState("SEQUENTIAL");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/bible-rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, password, scope, durationMonths, excludeSunday, planType })
    });
    const data = (await res.json()) as { roomId?: string; error?: string };
    setLoading(false);

    if (!res.ok || !data.roomId) {
      onToast(data.error ?? "성경방 생성에 실패했습니다.");
      return;
    }

    setTitle("");
    setDescription("");
    setPassword("");
    setScope("ALL");
    setDurationMonths(12);
    setExcludeSunday(false);
    setPlanType("SEQUENTIAL");
    onCreated(data.roomId);
  }

  return (
    <Modal title="성경방 생성" open={open} onClose={onClose}>
      <div className="grid max-h-[75dvh] gap-4 overflow-y-auto pr-1">
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

        <OptionGroup
          label="통독 범위"
          icon={<BookOpen size={16} />}
          value={scope}
          options={[
            ["ALL", "전체"],
            ["OLD_TESTAMENT", "구약"],
            ["NEW_TESTAMENT", "신약"]
          ]}
          onChange={setScope}
        />

        <div>
          <label className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-700">
            <CalendarDays size={16} />
            통독 기간
          </label>
          <select
            value={durationMonths}
            onChange={(event) => setDurationMonths(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-teal-500"
          >
            {[1, 2, 3, 6, 12].map((month) => (
              <option key={month} value={month}>{month}개월</option>
            ))}
          </select>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
          <span>
            <span className="block text-sm font-black text-slate-800">주일 제외</span>
            <span className="text-xs text-slate-500">체크하면 주일에는 플랜을 배정하지 않습니다.</span>
          </span>
          <input
            type="checkbox"
            checked={excludeSunday}
            onChange={(event) => setExcludeSunday(event.target.checked)}
            className="h-5 w-5 accent-teal-700"
          />
        </label>

        <OptionGroup
          label="통독 방식"
          value={planType}
          options={[
            ["SEQUENTIAL", "정주행"],
            ["CHRONOLOGICAL", "연대기순"],
            ["PARALLEL", "병행"]
          ]}
          onChange={setPlanType}
        />

        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="rounded-lg bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60"
        >
          {loading ? "생성 중" : "생성"}
        </button>
      </div>
    </Modal>
  );
}

function OptionGroup({
  label,
  icon,
  value,
  options,
  onChange
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-700">
        {icon}
        {label}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {options.map(([optionValue, text]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`min-h-11 rounded-lg border px-2 text-sm font-black ${
              value === optionValue
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
