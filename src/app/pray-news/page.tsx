import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PrayNewsList } from "@/components/PrayNewsList";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PrayNewsPage() {
  const rows = await prisma.prayNews.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      createdAt: true
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51
  });
  const news = rows.slice(0, 50);
  const nextCursor = rows.length > 50 ? news[news.length - 1]?.id ?? null : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6 dark:text-slate-100">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950 dark:text-slate-50">Pray News</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">WePray 소식과 공지사항을 읽을 수 있습니다.</p>
      </header>
      <PrayNewsList
        news={news.map((item) => ({
          id: item.id,
          title: item.title,
          content: item.content,
          imageUrl: item.imageUrl,
          createdAt: item.createdAt.toISOString()
        }))}
        initialNextCursor={nextCursor}
      />
    </main>
  );
}
