import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PrayNewsPage() {
  const news = await prisma.prayNews.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 30
  });

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">Pray News</h1>
        <p className="mt-2 text-sm text-slate-600">WePray 소식을 읽을 수 있습니다.</p>
      </header>
      <section className="grid gap-3">
        {news.length ? (
          news.map((item) => (
            <article key={item.id} className="rounded-lg bg-white p-4 shadow-soft">
              <h2 className="font-black text-slate-950">{item.title}</h2>
              <time className="mt-1 block text-xs font-bold text-slate-400">
                {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(item.createdAt)}
              </time>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{item.content}</p>
            </article>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
            등록된 소식이 없습니다.
          </div>
        )}
      </section>
    </main>
  );
}
