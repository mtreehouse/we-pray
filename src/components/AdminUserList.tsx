"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Toast } from "@/components/ui/Toast";

type AdminUser = {
  id: string;
  nickname: string | null;
  provider: string;
  role: string;
  createdAt: string;
  isMe: boolean;
};

export function AdminUserList({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [toast, setToast] = useState("");

  async function removeUser(user: AdminUser) {
    if (user.isMe) {
      setToast("관리자는 자기 자신을 삭제할 수 없습니다.");
      return;
    }

    if (!confirm(`${user.nickname ?? "닉네임 없음"} 사용자를 삭제하시겠습니까?`)) return;

    const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setToast(data.error ?? "사용자 삭제에 실패했습니다.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="grid gap-3">
      <Toast message={toast} />
      {users.map((user) => (
        <article key={user.id} className="rounded-lg bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-black text-slate-950">{user.nickname ?? "닉네임 없음"}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {user.provider} · {user.role}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                가입 {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(user.createdAt))}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeUser(user)}
              disabled={user.isMe}
              className="grid h-10 w-10 place-items-center rounded-full bg-rose-50 text-rose-700 disabled:bg-slate-100 disabled:text-slate-300"
              aria-label="사용자 삭제"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
