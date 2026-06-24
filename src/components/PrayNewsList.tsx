"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { getPrayNewsPlainText, toPrayNewsDisplayHtml } from "@/lib/pray-news-content";

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

function PrayNewsContent({ content, className = "" }: { content: string; className?: string }) {
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a")) event.stopPropagation();
  }

  return (
    <div
      onClick={handleClick}
      className={(
        "break-words text-sm leading-6 text-slate-700 dark:text-slate-300 " +
        "[&_a]:font-bold [&_a]:text-[#637EE1] [&_a]:underline [&_a]:decoration-[#637EE1]/30 [&_a]:underline-offset-4 " +
        "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-[#637EE1]/30 [&_blockquote]:pl-3 [&_blockquote]:font-semibold [&_blockquote]:text-slate-600 [&_blockquote]:dark:text-slate-300 " +
        "[&_br]:block [&_h2]:my-2 [&_h2]:text-lg [&_h2]:font-black [&_h3]:my-2 [&_h3]:text-base [&_h3]:font-black " +
        "[&_figure]:my-3 [&_figcaption]:mt-1 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:font-semibold [&_figcaption]:text-slate-400 " +
        "[&_img]:mx-auto [&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg " +
        "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-2 [&_th]:font-black [&_td]:dark:border-slate-700 [&_th]:dark:border-slate-700 [&_th]:dark:bg-slate-800 " +
        "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:dark:bg-slate-800 " +
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_strong]:font-black [&_u]:underline " +
        className
      ).trim()}
      dangerouslySetInnerHTML={{ __html: toPrayNewsDisplayHtml(content) }}
    />
  );
}

export function PrayNewsList({ news, initialNextCursor }: { news: PrayNewsItem[]; initialNextCursor: string | null }) {
  const [items, setItems] = useState(news);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  function toggleExpanded(itemId: string) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

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
      {items.map((item) => {
        const expanded = expandedIds.has(item.id);
        const previewText = getPrayNewsPlainText(item.content);

        return (
          <article
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => toggleExpanded(item.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                toggleExpanded(item.id);
              }
            }}
            className="cursor-pointer overflow-hidden rounded-lg bg-white shadow-soft transition active:scale-[0.995] dark:border dark:border-slate-800 dark:bg-slate-900/85"
          >
            {expanded ? (
              <div className="p-4">
                {item.imageUrl ? (
                  <div className="mb-4 flex max-h-[70vh] min-h-44 w-full items-center justify-center overflow-hidden rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                    <img src={item.imageUrl} alt="" className="h-auto max-h-[70vh] max-w-full object-contain" loading="lazy" />
                  </div>
                ) : null}
                <h2 className="break-words font-black text-slate-950 dark:text-slate-50">{item.title}</h2>
                <time className="mt-1 block text-xs font-bold text-slate-400 dark:text-slate-500">{formatKoreanDate(item.createdAt)}</time>
                <PrayNewsContent content={item.content} className="mt-3" />
              </div>
            ) : (
              <div className="p-4">
                {item.imageUrl ? (
                  <>
                    <div className="float-left mb-2 mr-3 aspect-square w-[88px] overflow-hidden rounded-lg bg-slate-100 sm:w-[112px] dark:bg-slate-800">
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <h2 className="break-words text-sm font-black text-slate-950 dark:text-slate-50">{item.title}</h2>
                    <time className="mt-1 block text-xs font-bold text-slate-400 dark:text-slate-500">{formatKoreanDate(item.createdAt)}</time>
                    <p
                      className="mt-3 overflow-hidden break-words text-sm leading-6 text-slate-700 [display:-webkit-box] [text-overflow:ellipsis] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] dark:text-slate-300"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {previewText}
                    </p>
                    <div className="clear-both" />
                  </>
                ) : (
                  <>
                    <h2 className="break-words font-black text-slate-950 dark:text-slate-50">{item.title}</h2>
                    <time className="mt-1 block text-xs font-bold text-slate-400 dark:text-slate-500">{formatKoreanDate(item.createdAt)}</time>
                    <p
                      className="mt-3 overflow-hidden break-words text-sm leading-6 text-slate-700 [display:-webkit-box] [text-overflow:ellipsis] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] dark:text-slate-300"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {previewText}
                    </p>
                  </>
                )}
              </div>
            )}
          </article>
        );
      })}

      <div ref={loadMoreRef} className="min-h-4" />
      {loading ? <p className="py-3 text-center text-sm font-bold text-slate-400">불러오는 중</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-center text-sm font-bold text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">{error}</p> : null}
      {!loading && items.length > 0 && !nextCursor ? <p className="py-3 text-center text-xs font-bold text-slate-400">마지막 소식입니다.</p> : null}
    </section>
  );
}
