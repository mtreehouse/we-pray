"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Trash2, X } from "lucide-react";
import { Toast } from "@/components/ui/Toast";

type AdminUser = {
  id: string;
  nickname: string | null;
  provider: string;
  role: string;
  createdAt: string;
  isMe: boolean;
};

type UserListResponse = {
  users?: AdminUser[];
  nextCursor?: string | null;
  error?: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul"
  }).format(new Date(value));
}

function confirmationName(user: AdminUser) {
  return user.nickname ?? "닉네임 없음";
}

export function AdminUserList({ users, initialNextCursor }: { users: AdminUser[]; initialNextCursor: string | null }) {
  const [items, setItems] = useState(users);
  const [search, setSearch] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  async function loadUsers(query: string, cursor: string | null, reset: boolean) {
    if (loading) return;
    setLoading(true);

    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set("q", trimmedQuery);
    if (cursor) params.set("cursor", cursor);

    const res = await fetch("/api/admin/users" + (params.toString() ? "?" + params.toString() : ""));
    const data = await res.json().catch(() => ({})) as UserListResponse;
    setLoading(false);

    if (!res.ok) {
      setToast(data.error ?? "사용자 목록을 불러오지 못했습니다.");
      return;
    }

    const nextItems = data.users ?? [];
    setItems((current) => reset ? nextItems : [...current, ...nextItems]);
    setNextCursor(data.nextCursor ?? null);
  }

  function searchUsers() {
    if (loading) return;
    setItems([]);
    setNextCursor(null);
    void loadUsers(search, null, true);
  }

  function openDeleteModal(user: AdminUser) {
    if (user.isMe) {
      setToast("관리자는 자기 자신을 삭제할 수 없습니다.");
      return;
    }
    setDeleteTarget(user);
    setDeleteInput("");
  }

  function closeDeleteModal() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteInput("");
  }

  async function removeUser() {
    if (!deleteTarget || deleting) return;
    const expectedName = confirmationName(deleteTarget);
    if (deleteInput !== expectedName) {
      setToast("삭제할 사용자의 닉네임을 정확히 입력해주세요.");
      return;
    }

    setDeleting(true);
    const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: deleteInput })
    });
    const data = await res.json().catch(() => ({})) as { error?: string };
    setDeleting(false);

    if (!res.ok) {
      setToast(data.error ?? "사용자 삭제에 실패했습니다.");
      return;
    }

    setItems((current) => current.filter((user) => user.id !== deleteTarget.id));
    setDeleteTarget(null);
    setDeleteInput("");
    setToast("사용자를 삭제 처리했습니다.");
  }

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && nextCursor && !loading) {
        void loadUsers(search, nextCursor, false);
      }
    }, { rootMargin: "240px" });

    observer.observe(target);
    return () => observer.disconnect();
  }, [search, nextCursor, loading]);

  const expectedDeleteName = deleteTarget ? confirmationName(deleteTarget) : "";
  const canDelete = Boolean(deleteTarget && deleteInput === expectedDeleteName && !deleting);

  return (
    <div className="grid gap-3">
      <Toast message={toast} onClose={() => setToast("")} />

      <div className="grid gap-2 rounded-lg bg-white p-3 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900">
        <label className="relative min-w-0" htmlFor="admin-user-search">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            id="admin-user-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") searchUsers();
            }}
            className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="닉네임, 로그인, 권한 검색"
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          onClick={searchUsers}
          disabled={loading}
          className="min-h-10 rounded-lg bg-teal-700 px-3 text-sm font-black text-white disabled:opacity-60"
        >
          검색
        </button>
      </div>

      {!items.length && !loading ? (
        <div className="rounded-lg bg-white p-6 text-center text-sm font-bold text-slate-500 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          표시할 사용자가 없습니다.
        </div>
      ) : null}

      {items.map((user) => (
        <article key={user.id} className="rounded-lg bg-white p-4 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate font-black text-slate-950 dark:text-slate-50">{user.nickname ?? "닉네임 없음"}</h2>
                {user.isMe ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-black text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">ME</span> : null}
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                {user.provider} · {user.role}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                가입 {formatDate(user.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openDeleteModal(user)}
              disabled={user.isMe}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-700 disabled:bg-slate-100 disabled:text-slate-300 dark:bg-rose-500/15 dark:text-rose-300 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
              aria-label="사용자 삭제"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </article>
      ))}

      <div ref={loadMoreRef} className="min-h-4" />
      {loading ? <p className="py-3 text-center text-sm font-bold text-slate-400">불러오는 중</p> : null}
      {!loading && items.length > 0 && !nextCursor ? <p className="py-3 text-center text-xs font-bold text-slate-400">마지막 사용자입니다.</p> : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">사용자 삭제</h2>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500 dark:text-slate-400">
                  삭제 처리할 사용자의 닉네임을 똑같이 입력해주세요.
                </p>
              </div>
              <button type="button" onClick={closeDeleteModal} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200" aria-label="닫기">
                <X size={18} />
              </button>
            </div>
            <div className="mb-3 rounded-lg bg-rose-50 p-3 text-sm font-black text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
              {expectedDeleteName}
            </div>
            <input
              value={deleteInput}
              onChange={(event) => setDeleteInput(event.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-rose-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="닉네임 입력"
              autoComplete="off"
              autoFocus
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={closeDeleteModal} disabled={deleting} className="min-h-10 rounded-lg bg-slate-100 px-3 text-sm font-black text-slate-700 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100">
                취소
              </button>
              <button type="button" onClick={removeUser} disabled={!canDelete} className="min-h-10 rounded-lg bg-rose-600 px-3 text-sm font-black text-white disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600">
                삭제
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
