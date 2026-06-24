"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { noBrowserInputSuggestions } from "@/lib/browser-input";

type AdminPrayNews = {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  authorUserId: string | null;
  authorNickname: string | null;
  createdAt: string;
  updatedAt: string;
};

type PrayNewsResponse = {
  news?: AdminPrayNews[];
  nextCursor?: string | null;
  error?: string;
};

type FormState = {
  title: string;
  content: string;
  imageUrl: string;
};

const emptyForm: FormState = { title: "", content: "", imageUrl: "" };

function formatKoreanDateTime(value: string) {
  const date = new Date(value);
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const hour = String(kst.getUTCHours()).padStart(2, "0");
  const minute = String(kst.getUTCMinutes()).padStart(2, "0");
  return year + "." + month + "." + day + " " + hour + ":" + minute;
}

function formFromNews(news: AdminPrayNews): FormState {
  return { title: news.title, content: news.content, imageUrl: news.imageUrl ?? "" };
}

export function AdminPrayNewsList({ news, initialNextCursor }: { news: AdminPrayNews[]; initialNextCursor: string | null }) {
  const [items, setItems] = useState(news);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const editingItem = editingId ? items.find((item) => item.id === editingId) ?? null : null;

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEdit(news: AdminPrayNews) {
    setEditingId(news.id);
    setForm(formFromNews(news));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function loadMore() {
    if (loading || !nextCursor) return;
    setLoading(true);

    const params = new URLSearchParams({ cursor: nextCursor });
    const res = await fetch("/api/admin/pray-news?" + params.toString());
    const data = await res.json().catch(() => ({})) as PrayNewsResponse;
    setLoading(false);

    if (!res.ok) {
      setToast(data.error ?? "소식 목록을 불러오지 못했습니다.");
      return;
    }

    setItems((current) => [...current, ...(data.news ?? [])]);
    setNextCursor(data.nextCursor ?? null);
  }

  async function submit() {
    if (saving) return;
    const title = form.title.trim();
    const content = form.content.trim();
    const imageUrl = form.imageUrl.trim();

    if (!title) {
      setToast("제목을 입력해주세요.");
      return;
    }
    if (!content) {
      setToast("내용을 입력해주세요.");
      return;
    }

    if (editingItem) {
      const original = formFromNews(editingItem);
      if (title === original.title && content === original.content && imageUrl === original.imageUrl) {
        setToast("변경된 내용이 없습니다.");
        return;
      }
    }

    setSaving(true);
    const endpoint = editingId ? "/api/admin/pray-news/" + editingId : "/api/admin/pray-news";
    const res = await fetch(endpoint, {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, imageUrl })
    });
    const data = await res.json().catch(() => ({})) as { error?: string; news?: AdminPrayNews };
    setSaving(false);

    if (!res.ok || !data.news) {
      setToast(data.error ?? "소식 저장에 실패했습니다.");
      return;
    }

    if (editingId) {
      setItems((current) => current.map((item) => item.id === data.news?.id ? data.news! : item));
      setToast("소식을 수정했습니다.");
    } else {
      setItems((current) => [data.news!, ...current]);
      setToast("소식을 등록했습니다.");
    }
    resetForm();
  }

  async function remove(news: AdminPrayNews) {
    const confirmed = confirm("'" + news.title + "' 소식을 삭제할까요?");
    if (!confirmed) return;

    const res = await fetch("/api/admin/pray-news/" + news.id, { method: "DELETE" });
    const data = await res.json().catch(() => ({})) as { error?: string };

    if (!res.ok) {
      setToast(data.error ?? "소식 삭제에 실패했습니다.");
      return;
    }

    setItems((current) => current.filter((item) => item.id !== news.id));
    if (editingId === news.id) resetForm();
    setToast("소식을 삭제했습니다.");
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

  return (
    <div className="grid gap-3">
      <Toast message={toast} onClose={() => setToast("")} />

      <section className="rounded-lg bg-white p-4 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-950 dark:text-slate-50">{editingId ? "Pray News 수정" : "Pray News 작성"}</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">공지사항처럼 사용자에게 보여줄 소식을 작성합니다.</p>
          </div>
          {editingId ? (
            <button type="button" onClick={resetForm} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300" aria-label="수정 취소">
              <X size={17} />
            </button>
          ) : null}
        </div>

        <div className="grid gap-2">
          <input
            {...noBrowserInputSuggestions}
            value={form.title}
            onChange={(event) => updateForm("title", event.target.value)}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="제목"
            maxLength={80}
          />
          <input
            {...noBrowserInputSuggestions}
            value={form.imageUrl}
            onChange={(event) => updateForm("imageUrl", event.target.value)}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="이미지 링크 선택 입력"
          />
          <textarea
            {...noBrowserInputSuggestions}
            value={form.content}
            onChange={(event) => updateForm("content", event.target.value)}
            className="min-h-36 resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            placeholder="내용"
            maxLength={5000}
          />
          {form.imageUrl.trim() ? (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950/60">
              <div className="aspect-square h-16 overflow-hidden rounded-lg bg-slate-200 dark:bg-slate-800">
                <img src={form.imageUrl.trim()} alt="" className="h-full w-full object-cover" />
              </div>
              <p className="min-w-0 flex-1 break-all text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">이미지 미리보기</p>
            </div>
          ) : null}
          <button type="button" onClick={() => void submit()} disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-soft disabled:opacity-60">
            {editingId ? <Save size={17} /> : <Plus size={17} />}
            {saving ? "저장 중" : editingId ? "수정 저장" : "공지 등록"}
          </button>
        </div>
      </section>

      {!items.length && !loading ? <div className="rounded-lg bg-white p-6 text-center text-sm font-bold text-slate-500 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">등록된 소식이 없습니다.</div> : null}

      {items.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-lg bg-white shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900">
          <div className={item.imageUrl ? "grid grid-cols-[88px_minmax(0,1fr)] gap-3 p-3 sm:grid-cols-[112px_minmax(0,1fr)]" : "p-4"}>
            {item.imageUrl ? (
              <div className="aspect-square overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ) : null}
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words font-black text-slate-950 dark:text-slate-50">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
                    {item.authorNickname ?? "관리자"} · {formatKoreanDateTime(item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => startEdit(item)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200" aria-label="수정">
                    <Pencil size={15} />
                  </button>
                  <button type="button" onClick={() => void remove(item)} className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300" aria-label="삭제">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{item.content}</p>
              {item.imageUrl ? null : (
                <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300"><ImageIcon size={12} /> 이미지 없음</p>
              )}
            </div>
          </div>
        </article>
      ))}

      <div ref={loadMoreRef} className="min-h-4" />
      {loading ? <p className="py-3 text-center text-sm font-bold text-slate-400">불러오는 중</p> : null}
      {!loading && items.length > 0 && !nextCursor ? <p className="py-3 text-center text-xs font-bold text-slate-400">마지막 소식입니다.</p> : null}
    </div>
  );
}
