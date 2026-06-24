import Link from "next/link";
import { ChevronLeft, Newspaper } from "lucide-react";
import { AdminPrayNewsList } from "@/components/AdminPrayNewsList";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPrayNewsPage() {
  await requireAdmin();
  const rows = await prisma.prayNews.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      authorUserId: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { nickname: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51
  });
  const news = rows.slice(0, 50);
  const nextCursor = rows.length > 50 ? news[news.length - 1]?.id ?? null : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <ChevronLeft size={18} />
          관리자 메뉴
        </Link>
        <Link href="/pray-news" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Newspaper size={15} />
          공개 보기
        </Link>
      </div>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950 dark:text-slate-50">Pray News 관리</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">공지사항처럼 표시할 Pray News를 작성하고 관리합니다.</p>
      </header>
      <AdminPrayNewsList
        news={news.map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          imageUrl: item.imageUrl,
          authorUserId: item.authorUserId,
          authorNickname: item.author?.nickname ?? null,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString()
        }))}
        initialNextCursor={nextCursor}
      />
    </main>
  );
}
