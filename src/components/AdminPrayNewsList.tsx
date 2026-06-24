"use client";

import { useEffect, useRef, useState, type ClipboardEvent, type MouseEvent } from "react";
import { Bold, ImageIcon, Italic, Link2, List, ListOrdered, Pencil, Plus, Quote, Save, Trash2, Underline, X } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { noBrowserInputSuggestions } from "@/lib/browser-input";
import { PRAY_NEWS_CONTENT_HTML_LIMIT, getPrayNewsPlainText, normalizePrayNewsContentHtml, toPrayNewsDisplayHtml } from "@/lib/pray-news-content";

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

const editorButtonClass = "grid h-9 w-9 place-items-center rounded-lg bg-white text-slate-600 shadow-sm transition active:scale-95 dark:bg-slate-900 dark:text-slate-200";
const MAX_PASTED_IMAGE_SIZE_BYTES = 1_500_000;

function richContentClass(className = "") {
  return (
    "break-words text-sm leading-6 text-slate-700 dark:text-slate-300 " +
    "[&_a]:font-bold [&_a]:text-[#637EE1] [&_a]:underline [&_a]:decoration-[#637EE1]/30 [&_a]:underline-offset-4 " +
    "[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-[#637EE1]/30 [&_blockquote]:pl-3 [&_blockquote]:font-semibold [&_blockquote]:text-slate-600 [&_blockquote]:dark:text-slate-300 " +
    "[&_h2]:my-2 [&_h2]:text-lg [&_h2]:font-black [&_h3]:my-2 [&_h3]:text-base [&_h3]:font-black " +
    "[&_figure]:my-3 [&_figcaption]:mt-1 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:font-semibold [&_figcaption]:text-slate-400 " +
        "[&_img]:mx-auto [&_img]:my-2 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg " +
        "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-2 [&_th]:font-black [&_td]:dark:border-slate-700 [&_th]:dark:border-slate-700 [&_th]:dark:bg-slate-800 " +
        "[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-100 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:dark:bg-slate-800 " +
        "[&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-1 [&_strong]:font-black [&_u]:underline " +
    className
  ).trim();
}

function PrayNewsContent({ content, className = "" }: { content: string; className?: string }) {
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("a")) event.stopPropagation();
  }

  return (
    <div
      onClick={handleClick}
      className={richContentClass(className)}
      dangerouslySetInnerHTML={{ __html: toPrayNewsDisplayHtml(content) }}
    />
  );
}

function RichTextEditor({ value, onChange, onNotice }: { value: string; onChange: (value: string) => void; onNotice?: (message: string) => void }) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastHtmlRef = useRef(value);
  const plainText = getPrayNewsPlainText(value);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value !== lastHtmlRef.current && editor.innerHTML !== value) {
      editor.innerHTML = value;
      lastHtmlRef.current = value;
    }
  }, [value]);

  function emitChange() {
    const html = editorRef.current?.innerHTML ?? "";
    lastHtmlRef.current = html;
    onChange(html);
  }

  function insertHtml(html: string) {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, normalizePrayNewsContentHtml(html));
    setTimeout(emitChange, 0);
  }

  function runCommand(command: string, commandValue?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  }

  function setBlock(block: "p" | "h2" | "h3" | "blockquote") {
    runCommand("formatBlock", block);
  }

  function insertLink() {
    const url = window.prompt("링크 주소를 입력해주세요.");
    if (!url) return;
    try {
      const normalized = new URL(url.trim());
      if (normalized.protocol !== "http:" && normalized.protocol !== "https:") return;
      runCommand("createLink", normalized.toString());
    } catch {
      return;
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const html = event.clipboardData.getData("text/html");
    const text = event.clipboardData.getData("text/plain");
    const imageFiles = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith("image/"));

    if (html || text) {
      insertHtml(html || text);
    }

    if (!html && imageFiles.length > 0) {
      for (const file of imageFiles) {
        if (file.size > MAX_PASTED_IMAGE_SIZE_BYTES) {
          onNotice?.("붙여넣은 이미지는 1.5MB 이하만 본문에 포함할 수 있습니다.");
          continue;
        }

        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result !== "string") return;
          insertHtml('<figure><img src="' + reader.result + '" alt=""><figcaption></figcaption></figure>');
        };
        reader.readAsDataURL(file);
      }
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/70">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 p-2 dark:border-slate-800">
        <button type="button" onMouseDown={(event) => { event.preventDefault(); runCommand("bold"); }} className={editorButtonClass} aria-label="굵게"><Bold size={15} /></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); runCommand("italic"); }} className={editorButtonClass} aria-label="기울임"><Italic size={15} /></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); runCommand("underline"); }} className={editorButtonClass} aria-label="밑줄"><Underline size={15} /></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); setBlock("h2"); }} className={editorButtonClass + " text-xs font-black"} aria-label="큰 제목">H2</button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); setBlock("h3"); }} className={editorButtonClass + " text-xs font-black"} aria-label="작은 제목">H3</button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); setBlock("blockquote"); }} className={editorButtonClass} aria-label="인용"><Quote size={15} /></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); runCommand("insertUnorderedList"); }} className={editorButtonClass} aria-label="목록"><List size={15} /></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); runCommand("insertOrderedList"); }} className={editorButtonClass} aria-label="번호 목록"><ListOrdered size={15} /></button>
        <button type="button" onMouseDown={(event) => { event.preventDefault(); insertLink(); }} className={editorButtonClass} aria-label="링크"><Link2 size={15} /></button>
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          onPaste={handlePaste}
          className={richContentClass("min-h-44 px-3 py-3 outline-none focus:bg-white dark:focus:bg-slate-950")}
        />
        {!plainText ? (
          <span className="pointer-events-none absolute left-3 top-3 text-sm font-semibold text-slate-400 dark:text-slate-600">내용</span>
        ) : null}
      </div>
    </div>
  );
}

function formFromNews(news: AdminPrayNews): FormState {
  return { title: news.title, content: normalizePrayNewsContentHtml(news.content), imageUrl: news.imageUrl ?? "" };
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
    const content = normalizePrayNewsContentHtml(form.content);
    const contentText = getPrayNewsPlainText(content);
    const imageUrl = form.imageUrl.trim();

    if (!title) {
      setToast("제목을 입력해주세요.");
      return;
    }
    if (!contentText) {
      setToast("내용을 입력해주세요.");
      return;
    }

    if (contentText.length > 5000) {
      setToast("내용은 5000자 이하로 입력해주세요.");
      return;
    }
    if (content.length > PRAY_NEWS_CONTENT_HTML_LIMIT) {
      setToast("본문 HTML 용량이 너무 큽니다. 이미지를 줄이거나 일부 내용을 정리해주세요.");
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
          <RichTextEditor value={form.content} onChange={(content) => updateForm("content", content)} onNotice={setToast} />
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
          <div className="p-4">
            {item.imageUrl ? (
              <div className="float-left mb-2 mr-3 aspect-square w-[88px] overflow-hidden rounded-lg bg-slate-100 sm:w-[112px] dark:bg-slate-800">
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              </div>
            ) : null}
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
                <PrayNewsContent content={item.content} className="mt-3" />
            {item.imageUrl ? null : (
              <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300"><ImageIcon size={12} /> 이미지 없음</p>
            )}
            <div className="clear-both" />
          </div>
        </article>
      ))}

      <div ref={loadMoreRef} className="min-h-4" />
      {loading ? <p className="py-3 text-center text-sm font-bold text-slate-400">불러오는 중</p> : null}
      {!loading && items.length > 0 && !nextCursor ? <p className="py-3 text-center text-xs font-bold text-slate-400">마지막 소식입니다.</p> : null}
    </div>
  );
}
