import Link from "next/link";
import { ChevronLeft, MessageSquareText, Users } from "lucide-react";
import { AdminRoomList } from "@/components/AdminRoomList";
import { listAdminRooms } from "@/lib/admin-rooms";
import { requireAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  await requireAdmin();
  const result = await listAdminRooms({ filter: "all", query: "", cursor: null });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <ChevronLeft size={18} />
          관리자 메뉴
        </Link>
        <div className="flex shrink-0 gap-2">
          <Link href="/admin/users" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <Users size={15} />
            사용자
          </Link>
          <Link href="/admin/feedbacks" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
            <MessageSquareText size={15} />
            문의
          </Link>
        </div>
      </div>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950 dark:text-slate-50">기도 / 성경 방 관리</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">생성된 방을 조회하고 멤버, 방 정보, 삭제 상태를 관리합니다.</p>
      </header>
      <AdminRoomList rooms={result.rooms} initialNextCursor={result.nextCursor} />
    </main>
  );
}
