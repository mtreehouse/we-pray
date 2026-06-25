"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, Search, Trash2, X } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import type { AdminRoomFilter, AdminRoomView } from "@/lib/admin-rooms";

type RoomListResponse = {
  rooms?: AdminRoomView[];
  nextCursor?: string | null;
  error?: string;
};

const kindLabels: Record<AdminRoomView["kind"], string> = { pray: "기도방", bible: "성경방" };
const typeLabels: Record<AdminRoomFilter, string> = { all: "전체", pray: "기도", bible: "성경" };
const scopeLabels: Record<string, string> = { OLD_TESTAMENT: "구약", NEW_TESTAMENT: "신약", ALL: "전체" };
const planTypeLabels: Record<string, string> = { SEQUENTIAL: "정주행", CHRONOLOGICAL: "연대기순", PARALLEL: "병행", MCHEYNE: "맥체인" };
const memberStatusLabels: Record<string, string> = { active: "참여중", left: "나감", kicked: "내보냄" };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(new Date(value));
}

function roleLabel(role: string) {
  return role === "creator" ? "방장" : "멤버";
}

function roomHref(room: AdminRoomView) {
  return room.kind === "pray" ? "/pray-room/" + room.id : "/bible-room/" + room.id;
}

function contentLabel(room: AdminRoomView) {
  return room.kind === "pray" ? "기도제목" : "나눔";
}

export function AdminRoomList({ rooms, initialNextCursor }: { rooms: AdminRoomView[]; initialNextCursor: string | null }) {
  const [items, setItems] = useState(rooms);
  const [filter, setFilter] = useState<AdminRoomFilter>("all");
  const [search, setSearch] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [deleteTarget, setDeleteTarget] = useState<AdminRoomView | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  async function loadRooms(nextFilter: AdminRoomFilter, query: string, cursor: string | null, reset: boolean) {
    if (loading) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.set("type", nextFilter);
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set("q", trimmedQuery);
    if (cursor) params.set("cursor", cursor);

    const res = await fetch("/api/admin/rooms?" + params.toString());
    const data = await res.json().catch(() => ({})) as RoomListResponse;
    setLoading(false);

    if (!res.ok) {
      setToast(data.error ?? "방 목록을 불러오지 못했습니다.");
      return;
    }

    const nextItems = data.rooms ?? [];
    setItems((current) => reset ? nextItems : [...current, ...nextItems]);
    setNextCursor(data.nextCursor ?? null);
    if (reset) setExpandedIds({});
  }

  function searchRooms() {
    if (loading) return;
    setItems([]);
    setNextCursor(null);
    setExpandedIds({});
    void loadRooms(filter, search, null, true);
  }

  function changeFilter(nextFilter: AdminRoomFilter) {
    if (loading || nextFilter === filter) return;
    setFilter(nextFilter);
    setItems([]);
    setNextCursor(null);
    setExpandedIds({});
    void loadRooms(nextFilter, search, null, true);
  }

  function openDeleteModal(room: AdminRoomView) {
    setDeleteTarget(room);
    setDeleteInput("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteInput("");
  }

  async function removeRoom() {
    if (!deleteTarget || deleting) return;
    if (deleteInput !== deleteTarget.title) {
      setToast("삭제할 방 이름을 정확히 입력해주세요.");
      return;
    }

    setDeleting(true);
    const res = await fetch("/api/admin/rooms/" + deleteTarget.kind + "/" + deleteTarget.id, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: deleteInput })
    });
    const data = await res.json().catch(() => ({})) as { error?: string };
    setDeleting(false);

    if (!res.ok) {
      setToast(data.error ?? "방 삭제에 실패했습니다.");
      return;
    }

    setItems((current) => current.filter((room) => !(room.kind === deleteTarget.kind && room.id === deleteTarget.id)));
    setDeleteTarget(null);
    setDeleteInput("");
    setToast("방을 삭제 처리했습니다.");
  }

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && nextCursor && !loading) {
        void loadRooms(filter, search, nextCursor, false);
      }
    }, { rootMargin: "240px" });

    observer.observe(target);
    return () => observer.disconnect();
  }, [filter, search, nextCursor, loading]);

  const expectedDeleteName = deleteTarget?.title ?? "";
  const canDelete = Boolean(deleteTarget && deleteInput === expectedDeleteName && !deleting);

  return (
    <div className="grid gap-3">
      <Toast message={toast} onClose={() => setToast("")} />

      <div className="grid gap-2 rounded-lg bg-white p-3 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
          <select value={filter} onChange={(event) => changeFilter(event.target.value as AdminRoomFilter)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" aria-label="방 유형">
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <label className="relative min-w-0" htmlFor="admin-room-search">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input id="admin-room-search" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchRooms(); }} className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder="방 이름, 설명, 방장 검색" autoComplete="off" />
          </label>
        </div>
        <button type="button" onClick={searchRooms} disabled={loading} className="min-h-10 rounded-lg bg-teal-700 px-3 text-sm font-black text-white disabled:opacity-60">검색</button>
      </div>

      {!items.length && !loading ? <div className="rounded-lg bg-white p-6 text-center text-sm font-bold text-slate-500 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">표시할 방이 없습니다.</div> : null}

      {items.map((room) => {
        const expandedKey = room.kind + room.id;
        const expanded = Boolean(expandedIds[expandedKey]);
        const badgeClass = room.kind === "pray" ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" : "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300";

        return (
          <article key={expandedKey} className="overflow-hidden rounded-lg bg-white shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="p-4">
              <button type="button" onClick={() => setExpandedIds((current) => ({ ...current, [expandedKey]: !expanded }))} className="flex w-full min-w-0 items-start justify-between gap-3 text-left">
                <span className="min-w-0 flex-1">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={"shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black " + badgeClass}>{kindLabels[room.kind]}</span>
                    <h2 className="truncate font-black text-slate-950 dark:text-slate-50">{room.title}</h2>
                  </span>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-slate-500 dark:text-slate-400">{room.description || "설명 없음"}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500">방장 {room.creatorNickname ?? "닉네임 없음"} · 생성 {formatDate(room.createdAt)}</p>
                </span>
                <span className="mt-1 shrink-0 text-slate-400">{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
              </button>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="멤버" value={room.activeMemberCount + "/" + room.memberCount} />
                <Stat label={contentLabel(room)} value={String(room.contentCount)} />
                <Stat label="업데이트" value={formatDate(room.updatedAt)} small />
              </div>
            </div>

            {expanded ? <ExpandedRoom room={room} onDelete={() => openDeleteModal(room)} /> : null}
          </article>
        );
      })}

      <div ref={loadMoreRef} className="min-h-4" />
      {loading ? <p className="py-3 text-center text-sm font-bold text-slate-400">불러오는 중</p> : null}
      {!loading && items.length > 0 && !nextCursor ? <p className="py-3 text-center text-xs font-bold text-slate-400">마지막 방입니다.</p> : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">방 삭제</h2>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500 dark:text-slate-400">삭제할 방 이름을 똑같이 입력해주세요.</p>
              </div>
              <button type="button" onClick={closeDeleteModal} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200" aria-label="닫기"><X size={18} /></button>
            </div>
            <div className="mb-3 rounded-lg bg-rose-50 p-3 text-sm font-black text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">{expectedDeleteName}</div>
            <input value={deleteInput} onChange={(event) => setDeleteInput(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" placeholder="방 이름 입력" autoComplete="off" autoFocus />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={closeDeleteModal} disabled={deleting} className="min-h-10 rounded-lg bg-slate-100 px-3 text-sm font-black text-slate-700 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100">취소</button>
              <button type="button" onClick={removeRoom} disabled={!canDelete} className="min-h-10 rounded-lg bg-rose-600 px-3 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600">삭제</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExpandedRoom({ room, onDelete }: { room: AdminRoomView; onDelete: () => void }) {
  return (
    <div className="grid gap-3 border-t border-slate-100 px-4 py-4 dark:border-slate-800">
      <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950/60">
        <InfoRow label="방 ID" value={room.id} />
        <InfoRow label="방장 ID" value={room.creatorUserId} />
        <InfoRow label="유형" value={kindLabels[room.kind]} />
        {room.bibleInfo ? (
          <>
            <InfoRow label="범위" value={scopeLabels[room.bibleInfo.scope] ?? room.bibleInfo.scope} />
            <InfoRow label="기간" value={room.bibleInfo.durationMonths + "개월"} />
            <InfoRow label="주일 제외" value={room.bibleInfo.excludeSunday ? "예" : "아니오"} />
            <InfoRow label="통독 방식" value={planTypeLabels[room.bibleInfo.planType] ?? room.bibleInfo.planType} />
            <InfoRow label="플랜 수" value={String(room.bibleInfo.planCount)} />
          </>
        ) : null}
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">멤버 목록</h3>
          <Link href={roomHref(room)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300"><ExternalLink size={13} />열기</Link>
        </div>
        <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
          {room.members.length ? room.members.map((member) => {
            const statusClass = member.status === "active" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : member.status === "kicked" ? "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300";
            return (
              <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm shadow-soft dark:border dark:border-slate-800 dark:bg-slate-950">
                <div className="min-w-0">
                  <p className="truncate font-black text-slate-900 dark:text-slate-100">{member.nickname ?? "닉네임 없음"}</p>
                  <p className="mt-0.5 text-xs font-semibold text-slate-400 dark:text-slate-500">{roleLabel(member.role)} · {formatDate(member.joinedAt)}</p>
                </div>
                <span className={"shrink-0 rounded-full px-2 py-1 text-[10px] font-black " + statusClass}>{memberStatusLabels[member.status] ?? member.status}</span>
              </div>
            );
          }) : <div className="rounded-lg bg-white px-3 py-4 text-center text-sm font-bold text-slate-400 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-950">멤버가 없습니다.</div>}
        </div>
      </div>

      <button type="button" onClick={onDelete} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white shadow-soft"><Trash2 size={16} />방 삭제</button>
    </div>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-950/60">
      <p className="text-[10px] font-black text-slate-400">{label}</p>
      <p className={(small ? "mt-1 truncate text-xs" : "mt-1 text-sm") + " font-black text-slate-900 dark:text-slate-100"}>{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-2">
      <span className="font-black text-slate-500 dark:text-slate-400">{label}</span>
      <span className="break-all font-bold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}
