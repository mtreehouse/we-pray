import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { AdminUserList } from "@/components/AdminUserList";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const currentUser = await requireAdmin();
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" }
  });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
        <ChevronLeft size={18} />
        홈으로
      </Link>
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
      />
    </main>
  );
}
