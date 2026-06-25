"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, CalendarDays, Crown, Info, Plus, Search } from "lucide-react";
import { RoomListGuide } from "@/components/RoomListGuide";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { noBrowserInputSuggestions, noBrowserPasswordSuggestions } from "@/lib/browser-input";

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
  isJoined?: boolean;
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
  MCHEYNE: "맥체인",
  정주행: "정주행",
  연대기순: "연대기순",
  병행: "병행",
  맥체인: "맥체인"
};

export function BibleRoomList({ rooms }: { rooms: BibleRoomSummary[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [toast, setToast] = useState("");

  return (
    <div className="pb-24">
      <Toast message={toast} onClose={() => setToast("")} />
      <RoomListGuide />
      <div className="grid gap-3">
        {rooms.length ? (
          rooms.map((room) => (
            <Link
              key={room.id}
              href={`/bible-room/${room.id}`}
              className="block rounded-lg border border-white/80 bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 active:translate-y-0 dark:border-slate-800 dark:bg-slate-900/85 dark:hover:border-teal-700 dark:hover:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-black text-slate-950 dark:text-slate-50">{room.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{room.description}</p>
                </div>
                {room.role === "creator" ? <Crown className="shrink-0 text-amber-500" size={20} /> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">{scopeLabels[room.scope] ?? room.scope}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800 dark:text-slate-200">{room.durationMonths}개월</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 dark:bg-slate-800 dark:text-slate-200">{planTypeLabels[room.planType] ?? room.planType}</span>
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                방장 {room.creatorNickname ?? "알 수 없음"} · 멤버 {room.memberCount}명
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            아직 입장한 성경방이 없습니다.
          </div>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 safe-bottom">
        <div className="mx-auto flex w-full max-w-xl justify-end px-4 pb-4">
          <div data-room-list-guide="actions" className="flex items-center gap-2 rounded-full border border-white/80 bg-white/90 p-1.5 shadow-[0_16px_42px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <button
              type="button"
              onClick={() => setFindOpen(true)}
              className="grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              aria-label="성경방 찾기"
              title="성경방 찾기"
            >
              <Search size={21} />
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.28)] transition hover:bg-emerald-700 active:scale-95"
              aria-label="성경방 생성"
              title="성경방 생성"
            >
              <Plus size={26} />
            </button>
          </div>
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
      <FindBibleRoomModal open={findOpen} onClose={() => setFindOpen(false)} onToast={setToast} />
    </div>
  );
}

function FindBibleRoomModal({
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
  const [selectedRoom, setSelectedRoom] = useState<BibleRoomSummary | null>(null);
  const [results, setResults] = useState<BibleRoomSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPassword("");
    setSelectedRoom(null);
  }, [open]);

  async function search() {
    setLoading(true);
    setPassword("");
    setSelectedRoom(null);
    const res = await fetch(`/api/bible-rooms/search?q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as { rooms?: BibleRoomSummary[]; error?: string };
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
    const res = await fetch("/api/bible-rooms/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId: selectedRoom.id, password })
    });
    const data = (await res.json()) as { roomId?: string; error?: string };
    setLoading(false);

    if (!res.ok || !data.roomId) {
      onToast(data.error ?? "성경방 입장에 실패했습니다.");
      return;
    }

    onClose();
    router.push(`/bible-room/${data.roomId}`);
    router.refresh();
  }

  function openJoinedRoom() {
    if (!selectedRoom) return;
    onClose();
    router.push(`/bible-room/${selectedRoom.id}`);
    router.refresh();
  }

  return (
    <Modal title="성경방 찾기" open={open} onClose={onClose}>
      <div className="grid gap-3">
        <div className="flex gap-2">
          <input
            {...noBrowserInputSuggestions}
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void search();
            }}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="방 제목 또는 방장"
          />
          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-60 dark:bg-slate-700"
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
              className={`mb-2 w-full rounded-lg border p-3 text-left ${
                selectedRoom?.id === room.id ? "border-teal-500 bg-teal-50 dark:bg-teal-950/40" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <span className="block font-bold text-slate-900 dark:text-slate-100">{room.title}</span>
              <span className="mt-1 line-clamp-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">{room.description}</span>
              <span className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">{scopeLabels[room.scope] ?? room.scope}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800 dark:text-slate-200">{room.durationMonths}개월</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800 dark:text-slate-200">멤버 {room.memberCount}명</span>
              </span>
              <span className="mt-2 block text-xs text-slate-500 dark:text-slate-400">방장 {room.creatorNickname ?? "알 수 없음"}</span>
            </button>
          ))}
          {!loading && q && results.length === 0 ? (
            <p className="py-6 text-center text-sm font-bold text-slate-400 dark:text-slate-500">검색 결과가 없습니다.</p>
          ) : null}
        </div>

        {selectedRoom ? (
          <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
            {selectedRoom.isJoined ? (
              <>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">이미 참여중인 성경방입니다.</p>
                <button
                  type="button"
                  onClick={openJoinedRoom}
                  className="mt-3 w-full rounded-lg bg-teal-700 px-4 py-3 font-bold text-white"
                >
                  들어가기
                </button>
              </>
            ) : (
              <>
                <p className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">{selectedRoom.title} 입장</p>
                <input
                  {...noBrowserPasswordSuggestions}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
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
              </>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
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
  const [planInfoOpen, setPlanInfoOpen] = useState(false);
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
          {...noBrowserInputSuggestions}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="방 제목"
          maxLength={40}
        />
        <textarea
          {...noBrowserInputSuggestions}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          placeholder="방 설명"
          maxLength={300}
        />
        <input
          {...noBrowserPasswordSuggestions}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
          <label className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-700 dark:text-slate-300">
            <CalendarDays size={16} />
            통독 기간
          </label>
          <select
            value={durationMonths}
            onChange={(event) => setDurationMonths(Number(event.target.value))}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            {[1, 2, 3, 6, 12].map((month) => (
              <option key={month} value={month}>{month}개월</option>
            ))}
          </select>
        </div>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700 dark:bg-slate-900">
          <span>
            <span className="block text-sm font-black text-slate-800 dark:text-slate-100">주일 제외</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">체크하면 주일에는 플랜을 배정하지 않습니다.</span>
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
            ["PARALLEL", "병행"],
            ["MCHEYNE", "맥체인"]
          ]}
          onChange={setPlanType}
          labelAction={
            <button
              type="button"
              onClick={() => setPlanInfoOpen(true)}
              className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-teal-50 hover:text-teal-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-teal-950/40 dark:hover:text-teal-200"
              aria-label="통독 방식 설명"
            >
              <Info size={14} />
            </button>
          }
        />

        <PlanTypeInfoModal open={planInfoOpen} onClose={() => setPlanInfoOpen(false)} />

        <p className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
          생성한 날 기준으로 플랜이 시작됩니다!
        </p>

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

function PlanTypeInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = [
    ["정주행", "창세기부터 요한계시록까지 성경책 순서대로 장을 균등하게 나눕니다."],
    ["연대기순", "창세기, 욥기, 출애굽기처럼 사건 흐름에 가깝게 책 순서를 재배열해 나눕니다."],
    ["병행", "전체 범위에서는 구약 3장과 신약 1장을 번갈아 섞습니다. 구약/신약만 선택하면 해당 범위 순서대로 갑니다."],
    ["맥체인", "4개 트랙을 병렬로 배정합니다: 창세기 계열, 마태복음부터 신약, 에스라/시편/예언서, 사도행전부터 신약 재독과 시편 재독."]
  ];

  return (
    <Modal title="통독 방식 안내" open={open} onClose={onClose}>
      <div className="grid gap-3">
        {items.map(([title, description]) => (
          <section key={title} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">{title}</h3>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{description}</p>
          </section>
        ))}
      </div>
    </Modal>
  );
}

function OptionGroup({
  label,
  icon,
  value,
  options,
  onChange,
  labelAction
}: {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: Array<[string, string]>;
  onChange: (value: string) => void;
  labelAction?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5 text-sm font-black text-slate-700 dark:text-slate-300">
        {icon}
        <span>{label}</span>
        {labelAction}
      </div>
      <div className={`grid gap-2 ${options.length > 3 ? "grid-cols-2" : "grid-cols-3"}`}>
        {options.map(([optionValue, text]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`min-h-11 rounded-lg border px-2 text-sm font-black ${
              value === optionValue
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
