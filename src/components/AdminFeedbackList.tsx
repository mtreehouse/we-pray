"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Mail, MessageSquareText, RotateCcw, Save, Search } from "lucide-react";
import { Toast } from "@/components/ui/Toast";

type FeedbackStatus = "NEW" | "READ" | "REPLIED" | "CLOSED";
type FeedbackFilter = "open" | "closed" | "all";

type AdminFeedback = {
  id: string;
  feedbackNumber: number;
  title: string;
  content: string;
  replyEmail: string | null;
  status: FeedbackStatus;
  adminMemo: string | null;
  emailTo: string;
  emailSentAt: string | null;
  emailError: string | null;
  createdAt: string;
  closedAt: string | null;
  userNickname: string | null;
  userProvider: string;
};

type FeedbackListResponse = {
  feedbacks?: AdminFeedback[];
  nextCursor?: string | null;
  error?: string;
};

const filterLabels: Array<{ value: FeedbackFilter; label: string }> = [
  { value: "open", label: "미종료" },
  { value: "closed", label: "종료" },
  { value: "all", label: "전체" }
];

function isClosed(feedback: AdminFeedback) {
  return feedback.status === "CLOSED";
}

function statusLabel(feedback: AdminFeedback) {
  return isClosed(feedback) ? "종료" : "미종료";
}

function formatFeedbackNumber(value: number) {
  return "FB" + String(value).padStart(4, "0");
}

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul"
  }).format(new Date(value));
}

function mergeMemoState(current: Record<string, string>, feedbacks: AdminFeedback[]) {
  return {
    ...current,
    ...Object.fromEntries(feedbacks.map((feedback) => [feedback.id, feedback.adminMemo ?? current[feedback.id] ?? ""]))
  };
}

export function AdminFeedbackList({ feedbacks, initialNextCursor }: { feedbacks: AdminFeedback[]; initialNextCursor: string | null }) {
  const [items, setItems] = useState(feedbacks);
  const [filter, setFilter] = useState<FeedbackFilter>("open");
  const [search, setSearch] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [toast, setToast] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [memoById, setMemoById] = useState<Record<string, string>>(() => (
    Object.fromEntries(feedbacks.map((feedback) => [feedback.id, feedback.adminMemo ?? ""]))
  ));
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  async function loadFeedbacks(nextFilter: FeedbackFilter, query: string, cursor: string | null, reset: boolean) {
    if (loading) return;
    setLoading(true);
    const params = new URLSearchParams({ filter: nextFilter });
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set("q", trimmedQuery);
    if (cursor) params.set("cursor", cursor);

    const res = await fetch("/api/admin/feedbacks?" + params.toString());
    const data = await res.json().catch(() => ({})) as FeedbackListResponse;
    setLoading(false);

    if (!res.ok) {
      setToast(data.error ?? "문의 목록을 불러오지 못했습니다.");
      return;
    }

    const nextItems = data.feedbacks ?? [];
    setItems((current) => reset ? nextItems : [...current, ...nextItems]);
    setMemoById((current) => mergeMemoState(current, nextItems));
    setNextCursor(data.nextCursor ?? null);
    if (reset) setExpandedIds({});
  }

  function changeFilter(nextFilter: FeedbackFilter) {
    if (filter === nextFilter || loading) return;
    setFilter(nextFilter);
    setItems([]);
    setNextCursor(null);
    void loadFeedbacks(nextFilter, search, null, true);
  }



  function searchFeedbacks() {
    if (loading) return;
    setItems([]);
    setNextCursor(null);
    setExpandedIds({});
    void loadFeedbacks(filter, search, null, true);
  }

  async function updateFeedback(feedback: AdminFeedback, body: { status?: "NEW" | "CLOSED"; adminMemo?: string }) {
    if (savingId) return;
    setSavingId(feedback.id);

    const res = await fetch("/api/admin/feedbacks/" + feedback.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({})) as { error?: string; feedback?: { status: FeedbackStatus; adminMemo: string | null; closedAt: string | null } };
    setSavingId(null);

    if (!res.ok || !data.feedback) {
      setToast(data.error ?? "문의 업데이트에 실패했습니다.");
      return;
    }

    setMemoById((current) => ({ ...current, [feedback.id]: data.feedback?.adminMemo ?? "" }));
    setItems((current) => {
      const updated = current.map((item) => item.id === feedback.id ? {
        ...item,
        status: data.feedback?.status ?? item.status,
        adminMemo: data.feedback?.adminMemo ?? null,
        closedAt: data.feedback?.closedAt ?? null
      } : item);

      if (filter === "open") return updated.filter((item) => !isClosed(item));
      if (filter === "closed") return updated.filter((item) => isClosed(item));
      return updated;
    });
    setToast(body.status === "CLOSED" ? "문의를 종료했습니다." : body.status === "NEW" ? "문의 종료를 취소했습니다." : "메모를 저장했습니다.");
  }

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && nextCursor && !loading) {
        void loadFeedbacks(filter, search, nextCursor, false);
      }
    }, { rootMargin: "240px" });

    observer.observe(target);
    return () => observer.disconnect();
  }, [filter, search, nextCursor, loading]);

  return (
    <div className="grid min-w-0 gap-3">
      <Toast message={toast} onClose={() => setToast("")} />

      <div className="grid min-w-0 gap-2 rounded-lg bg-white p-3 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
          <label className="sr-only" htmlFor="feedback-filter">상태</label>
          <select
            id="feedback-filter"
            value={filter}
            onChange={(event) => changeFilter(event.target.value as FeedbackFilter)}
            className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            {filterLabels.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <label className="relative min-w-0" htmlFor="feedback-search">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              id="feedback-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") searchFeedbacks();
              }}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="FB0001, 내용, 사용자 검색"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={searchFeedbacks}
          disabled={loading}
          className="min-h-10 rounded-lg bg-teal-700 px-3 text-sm font-black text-white disabled:opacity-60"
        >
          검색
        </button>
      </div>

      {!items.length && !loading ? (
        <div className="rounded-lg bg-white p-6 text-center text-sm font-bold text-slate-500 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          표시할 문의가 없습니다.
        </div>
      ) : null}

      {items.map((feedback) => {
        const memo = memoById[feedback.id] ?? "";
        const isSaving = savingId === feedback.id;
        const expanded = Boolean(expandedIds[feedback.id]);
        const closed = isClosed(feedback);
        const mailClass = feedback.emailSentAt ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

        return (
          <article key={feedback.id} className="min-w-0 overflow-hidden rounded-lg bg-white p-4 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setExpandedIds((current) => ({ ...current, [feedback.id]: !expanded }))}
                className="min-w-0 flex-1 text-left"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={"rounded-full px-2.5 py-1 text-xs font-black " + (closed ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300")}>
                    {statusLabel(feedback)}
                  </span>
                  <span className={"rounded-full px-2.5 py-1 text-xs font-black " + mailClass}>
                    {feedback.emailSentAt ? "메일 발송" : "메일 확인 필요"}
                  </span>
                </div>
                <h2 className="break-words text-lg font-black text-slate-950 dark:text-slate-50"><span className="mr-2 align-middle text-xs font-black text-teal-700 dark:text-teal-300">{formatFeedbackNumber(feedback.feedbackNumber)}</span>{feedback.title}</h2>
                <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-400 dark:text-slate-500">
                  {feedback.userNickname ?? "닉네임 없음"} · {feedback.userProvider} · {formatDateTime(feedback.createdAt)}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-2 text-teal-700 dark:text-teal-300">
                <MessageSquareText size={21} />
                {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </div>

            {expanded ? (
              <div className="mt-4 grid min-w-0 gap-3">
                <p className="whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
                  {feedback.content}
                </p>

                <div className="grid min-w-0 gap-2 rounded-lg bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500 dark:bg-slate-950/60 dark:text-slate-400">
                  <p className="flex min-w-0 items-center gap-1.5 break-words">
                    <Mail size={14} className="shrink-0" />
                    <span className="min-w-0 break-words">회신 이메일: {feedback.replyEmail || "미입력"}</span>
                  </p>
                  {feedback.emailError ? <p className="break-words text-amber-700 dark:text-amber-300">메일 오류: {feedback.emailError}</p> : null}
                  <p>종료 일시: {formatDateTime(feedback.closedAt)}</p>
                </div>

                <label className="grid min-w-0 gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
                  관리자 메모
                  <textarea
                    value={memo}
                    onChange={(event) => setMemoById((current) => ({ ...current, [feedback.id]: event.target.value }))}
                    className="min-h-24 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    placeholder="처리 내용이나 답변 메모를 남겨주세요."
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateFeedback(feedback, { adminMemo: memo })}
                    disabled={isSaving}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-700 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-100"
                  >
                    <Save size={14} />
                    메모 저장
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFeedback(feedback, { status: closed ? "NEW" : "CLOSED", adminMemo: memo })}
                    disabled={isSaving}
                    className={"inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-black disabled:opacity-60 " + (closed ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-100" : "bg-teal-700 text-white")}
                  >
                    {closed ? <RotateCcw size={14} /> : <CheckCircle2 size={14} />}
                    {closed ? "종료 취소" : "종료"}
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}

      <div ref={loadMoreRef} className="min-h-4" />
      {loading ? <p className="py-3 text-center text-sm font-bold text-slate-400">불러오는 중</p> : null}
      {!loading && items.length > 0 && !nextCursor ? <p className="py-3 text-center text-xs font-bold text-slate-400">마지막 문의입니다.</p> : null}
    </div>
  );
}
