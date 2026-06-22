import Link from "next/link";
import { ChevronLeft, MessageSquareText } from "lucide-react";
import { AdminUserList } from "@/components/AdminUserList";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin();
  const rows = await prisma.user.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      nickname: true,
      provider: true,
      role: true,
      createdAt: true
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51
  });
  const users = rows.slice(0, 50);
  const nextCursor = rows.length > 50 ? users[users.length - 1]?.id ?? null : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
          <ChevronLeft size={18} />
          관리자 메뉴
        </Link>
        <Link href="/admin/feedbacks" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-soft">
          <MessageSquareText size={15} />
          문의 관리
        </Link>
      </div>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">사용자 관리</h1>
        <p className="mt-2 text-sm text-slate-600">가입한 사용자 목록입니다.</p>
      </header>
      <AdminUserList
        users={users.map((user) => ({
          id: user.id,
          nickname: user.nickname,
          provider: user.provider,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          isMe: user.id === currentUser.id
        }))}
        initialNextCursor={nextCursor}
      />
    </main>
  );
}
