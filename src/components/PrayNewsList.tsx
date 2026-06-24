"use client";

import { useEffect, useRef, useState } from "react";

type PrayNewsItem = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
};

type PrayNewsResponse = {
  news?: PrayNewsItem[];
  nextCursor?: string | null;
  error?: string;
};

function formatKoreanDate(value: string) {
  const date = new Date(value);
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCFullYear() + ". " + (kst.getUTCMonth() + 1) + ". " + kst.getUTCDate() + ".";
}

export function PrayNewsList({ news, initialNextCursor }: { news: PrayNewsItem[]; initialNextCursor: string | null }) {
  const [items, setItems] = useState(news);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  async function loadMore() {
    if (loading || !nextCursor) return;
    setLoading(true);
    setError("");

    const params = new URLSearchParams({ cursor: nextCursor });
    const res = await fetch("/api/pray-news?" + params.toString());
    const data = await res.json().catch(() => ({})) as PrayNewsResponse;
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "소식을 불러오지 못했습니다.");
      return;
    }

    setItems((current) => [...current, ...(data.news ?? [])]);
    setNextCursor(data.nextCursor ?? null);
  }

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) void loadMore();
    }, { rootMargin: "240px" });

    observer.observe(target);
    return () => observer.disconnect();
  }, [nextCursor, loading]);

  if (!items.length && !loading) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
        등록된 소식이 없습니다.
      </div>
    );
  }

  return (
    <section className="grid gap-3">
      {items.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-lg bg-white shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85">
          <div className={item.imageUrl ? "grid grid-cols-[88px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_minmax(0,1fr)]" : "p-4"}>
            {item.imageUrl ? (
              <div className="aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ) : null}
            <div className="min-w-0 py-1">
              <h2 className="break-words font-black text-slate-950 dark:text-slate-50">{item.title}</h2>
              <time className="mt-1 block text-xs font-bold text-slate-400 dark:text-slate-500">{formatKoreanDate(item.createdAt)}</time>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{item.content}</p>
            </div>
          </div>
        </article>
      ))}

      <div ref={loadMoreRef} className="min-h-4" />
      {loading ? <p className="py-3 text-center text-sm font-bold text-slate-400">불러오는 중</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">{error}</p> : null}
      {!loading && items.length > 0 && !nextCursor ? <p className="py-3 text-center text-xs font-bold text-slate-400">마지막 소식입니다.</p> : null}
    </section>
  );
}
