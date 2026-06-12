"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Edit3,
  Heart,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  X
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";

type RoomMember = {
  id: string;
  userId: string;
  nickname: string | null;
  role: "creator" | "member";
  joinedAt: string;
};

type RoomDetail = {
  id: string;
  title: string;
  description: string;
  scope: string;
  durationMonths: number;
  excludeSunday: boolean;
  planType: string;
  creatorNickname: string | null;
  createdAt: string;
  isCreator: boolean;
};

type PlanRange = {
  id: string;
  bookCode: string;
  bookName?: string;
  startChapter: number;
  endChapter: number;
};

type PlanDay = {
  date: string;
  isCompleted: boolean;
  plans: PlanRange[];
};

type ReadingVerse = {
  verse: number;
  content: unknown;
  reflectionCount: number;
  myReflectionId: string | null;
};

type ReadingChapter = {
  bookCode: string;
  bookName: string;
  chapter: number;
  verses: ReadingVerse[];
};

type Reflection = {
  id: string;
  bookCode: string;
  bookName?: string;
  chapter: number;
  verse: number;
  verseContent?: unknown;
  content: string;
  createdAt: string;
  authorNickname: string | null;
  isMine: boolean;
};

type ProgressSummary = {
  totalPlanDays: number;
  completedCount: number;
  totalCount: number;
  overallRate: number;
  members: Array<{
    userId: string;
    nickname: string | null;
    role: "creator" | "member";
    joinedAt: string;
    completedCount: number;
    totalCount: number;
    rate: number;
  }>;
};

type Passage = {
  bookCode: string;
  bookName: string;
  chapter: number;
  focusVerse: number | null;
  verses: Array<{ verse: number; content: unknown }>;
};

type VerseTarget = {
  bookCode: string;
  bookName: string;
  chapter: number;
  verse: number;
  text: string;
};

const scopeLabels: Record<string, string> = {
  OLD_TESTAMENT: "구약",
  NEW_TESTAMENT: "신약",
  ALL: "전체",
  구약: "구약",
  신약: "신약",
  전체: "전체"
};

const planTypeLabels: Record<string, string> = {
  SEQUENTIAL: "정주행",
  CHRONOLOGICAL: "연대기순",
  PARALLEL: "병행",
  정주행: "정주행",
  연대기순: "연대기순",
  병행: "병행"
};

export function BibleRoomDetail({
  room,
  currentUserId,
  members,
  initialDate
}: {
  room: RoomDetail;
  currentUserId: string;
  members: RoomMember[];
  initialDate: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"bible" | "sharing" | "plan">("bible");
  const [toast, setToast] = useState("");
  const [planDays, setPlanDays] = useState<PlanDay[]>([]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [chapters, setChapters] = useState<ReadingChapter[]>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [readingLoading, setReadingLoading] = useState(false);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [reflectionTarget, setReflectionTarget] = useState<VerseTarget | null>(null);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [completing, setCompleting] = useState(false);
  const [headerCollapseProgress, setHeaderCollapseProgress] = useState(0);
  const roomHeaderRef = useRef<HTMLElement | null>(null);
  const lastScrollYRef = useRef(0);
  const forceCompactHeaderUntilRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const selectedPlanDay = useMemo(
    () => planDays.find((day) => day.date === selectedDate) ?? null,
    [planDays, selectedDate]
  );
  const currentChapter = chapters[chapterIndex] ?? null;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const holdCompactReadingHeader = useCallback(() => {
    forceCompactHeaderUntilRef.current = Date.now() + 900;
    setHeaderCollapseProgress(1);
  }, []);

  const loadPlans = useCallback(async () => {
    const res = await fetch(`/api/bible-rooms/${room.id}/plans`);
    const data = (await res.json()) as { days?: PlanDay[]; error?: string };

    if (!res.ok) {
      showToast(data.error ?? "플랜을 불러오지 못했습니다.");
      return;
    }

    setPlanDays(data.days ?? []);
    if (!data.days?.some((day) => day.date === selectedDate) && data.days?.[0]) {
      setSelectedDate(data.days[0].date);
    }
  }, [room.id, selectedDate, showToast]);

  const loadReading = useCallback(async () => {
    setReadingLoading(true);
    const res = await fetch(`/api/bible-rooms/${room.id}/reading?date=${selectedDate}`);
    const data = (await res.json()) as { chapters?: ReadingChapter[]; error?: string };
    setReadingLoading(false);

    if (!res.ok) {
      showToast(data.error ?? "본문을 불러오지 못했습니다.");
      return;
    }

    setChapters(data.chapters ?? []);
    setChapterIndex(0);
  }, [room.id, selectedDate, showToast]);

  const loadProgress = useCallback(async () => {
    const res = await fetch(`/api/bible-rooms/${room.id}/progress`);
    const data = (await res.json()) as { progress?: ProgressSummary; error?: string };

    if (!res.ok) {
      showToast(data.error ?? "달성률을 불러오지 못했습니다.");
      return;
    }

    setProgress(data.progress ?? null);
  }, [room.id, showToast]);

  const loadReflections = useCallback(async (reset = false) => {
    setFeedLoading(true);
    const cursor = reset ? "" : nextCursor ?? "";
    const res = await fetch(`/api/bible-rooms/${room.id}/reflections?take=50${cursor ? `&cursor=${cursor}` : ""}`);
    const data = (await res.json()) as { reflections?: Reflection[]; nextCursor?: string | null; error?: string };
    setFeedLoading(false);

    if (!res.ok) {
      showToast(data.error ?? "나눔을 불러오지 못했습니다.");
      return;
    }

    setReflections((items) => (reset ? data.reflections ?? [] : [...items, ...(data.reflections ?? [])]));
    setNextCursor(data.nextCursor ?? null);
  }, [nextCursor, room.id, showToast]);

  useEffect(() => {
    void loadPlans();
    void loadProgress();
    void loadReflections(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (selectedDate) void loadReading();
  }, [loadReading, selectedDate]);

  useEffect(() => {
    if (activeTab !== "sharing" || !sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && nextCursor && !feedLoading) {
        void loadReflections(false);
      }
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [activeTab, feedLoading, loadReflections, nextCursor]);

  useEffect(() => {
    if (activeTab !== "bible" || !currentChapter) {
      setHeaderCollapseProgress(0);
      return;
    }

    function handleScroll() {
      const currentY = window.scrollY;
      const previousY = lastScrollYRef.current;
      const scrollingDown = currentY > previousY + 1;
      const scrollingUp = currentY < previousY - 1;
      const readingArea = document.querySelector<HTMLElement>("[data-reading-area='true']");
      const headerHeight = roomHeaderRef.current?.offsetHeight ?? 104;
      const readingTop = readingArea?.getBoundingClientRect().top ?? headerHeight;
      const overlap = Math.max(0, headerHeight - readingTop);
      const progress = Math.min(1, overlap / headerHeight);

      if (Date.now() < forceCompactHeaderUntilRef.current) {
        setHeaderCollapseProgress(1);
      } else if (scrollingUp || currentY < 24) {
        setHeaderCollapseProgress(0);
      } else if (scrollingDown) {
        setHeaderCollapseProgress(progress);
      } else if (progress === 0) {
        setHeaderCollapseProgress(0);
      }

      lastScrollYRef.current = currentY;
    }

    lastScrollYRef.current = window.scrollY;
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [activeTab, currentChapter]);

  async function toggleComplete() {
    if (!selectedPlanDay) return;
    setCompleting(true);
    const res = await fetch(`/api/bible-rooms/${room.id}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, isCompleted: !selectedPlanDay.isCompleted })
    });
    const data = (await res.json()) as { isCompleted?: boolean; progress?: ProgressSummary; error?: string };
    setCompleting(false);

    if (!res.ok) {
      showToast(data.error ?? "완료 처리에 실패했습니다.");
      return;
    }

    setPlanDays((days) => days.map((day) => day.date === selectedDate ? { ...day, isCompleted: Boolean(data.isCompleted) } : day));
    setProgress(data.progress ?? null);
  }

  async function saveReflection(target: VerseTarget, content: string) {
    const res = await fetch(`/api/bible-rooms/${room.id}/reflections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookCode: target.bookCode,
        chapter: target.chapter,
        verse: target.verse,
        content
      })
    });
    const data = (await res.json()) as { reflectionId?: string; reflection?: Reflection; error?: string };

    if (!res.ok || !data.reflectionId) {
      showToast(data.error ?? "묵상 저장에 실패했습니다.");
      return false;
    }

    const scrollY = window.scrollY;
    setReflectionTarget(null);
    setChapters((items) =>
      items.map((chapter) => {
        if (chapter.bookCode !== target.bookCode || chapter.chapter !== target.chapter) return chapter;

        return {
          ...chapter,
          verses: chapter.verses.map((verse) =>
            verse.verse === target.verse
              ? {
                  ...verse,
                  reflectionCount: verse.reflectionCount + 1,
                  myReflectionId: data.reflectionId ?? verse.myReflectionId
                }
              : verse
          )
        };
      })
    );
    if (data.reflection) {
      setReflections((items) => [data.reflection!, ...items.filter((item) => item.id !== data.reflection!.id)]);
    }
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
    return true;
  }

  async function updateReflection(content: string) {
    if (!editingReflection) return false;

    const res = await fetch(`/api/bible-rooms/${room.id}/reflections/${editingReflection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content })
    });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      showToast(data.error ?? "묵상 수정에 실패했습니다.");
      return false;
    }

    setEditingReflection(null);
    await loadReflections(true);
    return true;
  }

  async function deleteReflection(reflection: Reflection) {
    if (!confirm("묵상을 삭제하시겠습니까?")) return;

    const res = await fetch(`/api/bible-rooms/${room.id}/reflections/${reflection.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      showToast(data.error ?? "묵상 삭제에 실패했습니다.");
      return;
    }

    await Promise.all([loadReading(), loadReflections(true)]);
  }

  async function openPassage(reflection: Pick<Reflection, "bookCode" | "chapter" | "verse">) {
    const query = new URLSearchParams({
      bookCode: reflection.bookCode,
      chapter: String(reflection.chapter),
      verse: String(reflection.verse)
    });
    const res = await fetch(`/api/bible-rooms/${room.id}/verse?${query.toString()}`);
    const data = (await res.json()) as { passage?: Passage; error?: string };

    if (!res.ok || !data.passage) {
      showToast(data.error ?? "본문을 열지 못했습니다.");
      return;
    }

    setPassage(data.passage);
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col bg-white/55">
      <Toast message={toast} />
      <header
        ref={roomHeaderRef}
        className="sticky top-0 z-20 border-b border-white/70 bg-white/90 px-4 backdrop-blur will-change-transform"
        style={{ transform: `translateY(${-headerCollapseProgress * 100}%)` }}
      >
        <div className="grid h-14 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
          <Link
            href="/bible-room"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="성경방 목록으로"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="min-w-0 truncate text-center text-lg font-black text-slate-950">{room.title}</h1>
          <button
            type="button"
            onClick={() => router.refresh()}
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="새로고침"
            title="새로고침"
          >
            <CalendarDays size={18} />
          </button>
        </div>
        <nav className="grid grid-cols-3 gap-2 pb-3">
          <TabButton active={activeTab === "bible"} onClick={() => setActiveTab("bible")} icon={<BookOpen size={16} />} label="성경" />
          <TabButton active={activeTab === "sharing"} onClick={() => setActiveTab("sharing")} icon={<MessageCircle size={16} />} label="나눔" />
          <TabButton active={activeTab === "plan"} onClick={() => setActiveTab("plan")} icon={<CalendarDays size={16} />} label="플랜" />
        </nav>
      </header>

      {activeTab === "bible" && currentChapter ? (
        <div
          className="fixed left-1/2 top-0 z-30 flex h-11 w-full max-w-xl items-center justify-center border-b border-slate-200 bg-white/95 px-4 text-sm font-black text-slate-950 shadow-soft backdrop-blur will-change-transform"
          style={{
            opacity: headerCollapseProgress,
            pointerEvents: headerCollapseProgress > 0.95 ? "auto" : "none",
            transform: `translate(-50%, ${-100 + headerCollapseProgress * 100}%)`
          }}
        >
          {currentChapter.bookName} {currentChapter.chapter}장
        </div>
      ) : null}

      {activeTab === "bible" ? (
        <BibleTab
          days={planDays}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          chapters={chapters}
          currentChapter={currentChapter}
          chapterIndex={chapterIndex}
          readingLoading={readingLoading}
          isCompleted={Boolean(selectedPlanDay?.isCompleted)}
          completing={completing}
          onToggleComplete={selectedPlanDay ? toggleComplete : undefined}
          onPrev={() => setChapterIndex((index) => Math.max(0, index - 1))}
          onNext={() => setChapterIndex((index) => Math.min(chapters.length - 1, index + 1))}
          onChapterJump={holdCompactReadingHeader}
          onReflect={setReflectionTarget}
          onToast={showToast}
        />
      ) : null}

      {activeTab === "sharing" ? (
        <SharingTab
          reflections={reflections}
          loading={feedLoading}
          nextCursor={nextCursor}
          sentinelRef={sentinelRef}
          onOpenPassage={openPassage}
          onEdit={setEditingReflection}
          onDelete={deleteReflection}
        />
      ) : null}

      {activeTab === "plan" ? (
        <PlanTab
          room={room}
          members={members}
          days={planDays}
          selectedDate={selectedDate}
          progress={progress}
          onSelectDate={setSelectedDate}
        />
      ) : null}

      <ReflectionComposeScreen
        target={reflectionTarget}
        onClose={() => setReflectionTarget(null)}
        onSubmit={saveReflection}
      />
      <ReflectionEditModal
        reflection={editingReflection}
        onClose={() => setEditingReflection(null)}
        onSubmit={updateReflection}
      />
      <PassageModal passage={passage} onClose={() => setPassage(null)} />
    </main>
  );
}

function TabButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-black ${
        active ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BibleTab({
  days,
  selectedDate,
  onSelectDate,
  chapters,
  currentChapter,
  chapterIndex,
  readingLoading,
  isCompleted,
  completing,
  onToggleComplete,
  onPrev,
  onNext,
  onChapterJump,
  onReflect,
  onToast
}: {
  days: PlanDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  chapters: ReadingChapter[];
  currentChapter: ReadingChapter | null;
  chapterIndex: number;
  readingLoading: boolean;
  isCompleted: boolean;
  completing: boolean;
  onToggleComplete?: () => void;
  onPrev: () => void;
  onNext: () => void;
  onChapterJump: () => void;
  onReflect: (target: VerseTarget) => void;
  onToast: (message: string) => void;
}) {
  const touchStartRef = useRef<number | null>(null);
  const readingTopRef = useRef<HTMLDivElement | null>(null);
  const firstVerseRef = useRef<HTMLDivElement | null>(null);
  const pendingChapterScrollRef = useRef(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  function scrollToFirstVerse() {
    window.requestAnimationFrame(() => {
      firstVerseRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  }

  useEffect(() => {
    if (!pendingChapterScrollRef.current || !currentChapter) return;
    pendingChapterScrollRef.current = false;
    onChapterJump();
    scrollToFirstVerse();
  }, [chapterIndex, currentChapter]);

  function goPrev() {
    if (chapterIndex === 0) return;
    pendingChapterScrollRef.current = true;
    onPrev();
  }

  function goNext() {
    if (chapterIndex >= chapters.length - 1) return;
    pendingChapterScrollRef.current = true;
    onNext();
  }

  return (
    <section className="flex-1 px-4 pb-8 pt-4">
      <div className="rounded-lg bg-white p-3 shadow-soft">
        <button
          type="button"
          onClick={() => setDatePickerOpen((open) => !open)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-50 px-4 text-base font-black text-slate-900"
          aria-expanded={datePickerOpen}
        >
          <CalendarDays size={17} className="text-teal-700" />
          {formatDateKey(selectedDate)}
        </button>
        {datePickerOpen ? (
          <div className="mt-3">
            <PlanCalendar
              days={days}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                onSelectDate(date);
                setDatePickerOpen(false);
              }}
              compact
            />
          </div>
        ) : null}
      </div>

      <div
        ref={readingTopRef}
        data-reading-area="true"
        className="mt-4 scroll-mt-12"
        onTouchStart={(event) => {
          touchStartRef.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const startX = touchStartRef.current;
          const endX = event.changedTouches[0]?.clientX ?? null;
          touchStartRef.current = null;
          if (startX === null || endX === null) return;
          if (startX - endX > 45) goNext();
          if (endX - startX > 45) goPrev();
        }}
      >
        {readingLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">본문을 불러오는 중입니다.</div>
        ) : currentChapter ? (
          <article className="rounded-lg bg-white p-4 shadow-soft">
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrev}
                disabled={chapterIndex === 0}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-700 disabled:opacity-30"
                aria-label="이전 장"
                title="이전 장"
              >
                <ChevronLeft size={19} />
              </button>
              <div className="min-w-0 text-center">
                <h2 className="truncate text-lg font-black text-slate-950">{currentChapter.bookName} {currentChapter.chapter}장</h2>
                <p className="text-xs font-bold text-slate-400">{chapterIndex + 1} / {chapters.length}</p>
              </div>
              <button
                type="button"
                onClick={goNext}
                disabled={chapterIndex >= chapters.length - 1}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-700 disabled:opacity-30"
                aria-label="다음 장"
                title="다음 장"
              >
                <ChevronRight size={19} />
              </button>
            </div>
            <div ref={firstVerseRef} className="grid scroll-mt-12 gap-1.5">
              {currentChapter.verses.map((verse) => (
                <VerseRow
                  key={verse.verse}
                  chapter={currentChapter}
                  verse={verse}
                  onReflect={onReflect}
                  onToast={onToast}
                />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={goPrev}
                disabled={chapterIndex === 0}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 disabled:opacity-35"
              >
                <ChevronLeft size={17} />
                이전 장
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={chapterIndex >= chapters.length - 1}
                className="flex min-h-12 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 disabled:opacity-35"
              >
                다음 장
                <ChevronRight size={17} />
              </button>
            </div>
            {chapterIndex >= chapters.length - 1 && onToggleComplete ? (
              <button
                type="button"
                onClick={onToggleComplete}
                disabled={completing}
                className={`mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 font-black transition disabled:opacity-60 ${
                  isCompleted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full ${
                    isCompleted ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-400"
                  }`}
                >
                  <Check size={15} strokeWidth={3} />
                </span>
                말씀 읽기 완료
              </button>
            ) : null}
          </article>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm leading-6 text-slate-500">
            선택한 날짜에 배정된 본문이 없습니다.
          </div>
        )}
      </div>
    </section>
  );
}

function VerseRow({
  chapter,
  verse,
  onReflect,
  onToast
}: {
  chapter: ReadingChapter;
  verse: ReadingVerse;
  onReflect: (target: VerseTarget) => void;
  onToast: (message: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const text = verseText(verse.content);

  function clearTimer() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  async function copy() {
    const citation = `${chapter.bookName} ${chapter.chapter}:${verse.verse}`;
    await navigator.clipboard.writeText(`${citation} ${text}`);
    setMenuOpen(false);
    onToast("구절을 복사했습니다.");
  }

  return (
    <div className="relative rounded-md px-1 py-1.5 transition hover:bg-slate-50">
      <button
        type="button"
        onContextMenu={(event) => {
          event.preventDefault();
          setMenuOpen(true);
        }}
        onPointerDown={() => {
          clearTimer();
          timerRef.current = window.setTimeout(() => setMenuOpen(true), 550);
        }}
        onPointerUp={clearTimer}
        onPointerCancel={clearTimer}
        onPointerLeave={clearTimer}
        className="w-full text-left text-[15px] leading-7 text-slate-800"
      >
        <span className="mr-2 align-baseline text-xs font-black text-teal-700">{verseLabel(verse.content, verse.verse)}</span>
        {text}
        {verse.reflectionCount > 0 ? <span className="ml-1 align-baseline">❤️</span> : null}
      </button>
      {menuOpen ? (
        <div className="absolute left-6 top-8 z-10 flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onReflect({
                bookCode: chapter.bookCode,
                bookName: chapter.bookName,
                chapter: chapter.chapter,
                verse: verse.verse,
                text
              });
            }}
            className="flex h-11 items-center gap-1.5 px-3 text-sm font-black text-teal-700"
          >
            <Pencil size={15} />
            묵상 작성
          </button>
          <button type="button" onClick={copy} className="flex h-11 items-center gap-1.5 px-3 text-sm font-black text-slate-700">
            <Clipboard size={15} />
            복사
          </button>
          <button type="button" onClick={() => setMenuOpen(false)} className="grid h-11 w-10 place-items-center text-slate-400" aria-label="닫기">
            <X size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SharingTab({
  reflections,
  loading,
  nextCursor,
  sentinelRef,
  onOpenPassage,
  onEdit,
  onDelete
}: {
  reflections: Reflection[];
  loading: boolean;
  nextCursor: string | null;
  sentinelRef: React.RefObject<HTMLDivElement>;
  onOpenPassage: (reflection: Reflection) => void;
  onEdit: (reflection: Reflection) => void;
  onDelete: (reflection: Reflection) => void;
}) {
  const grouped = useMemo(() => {
    return reflections.reduce<Record<string, Reflection[]>>((acc, reflection) => {
      const key = formatDate(reflection.createdAt);
      acc[key] = acc[key] ?? [];
      acc[key].push(reflection);
      return acc;
    }, {});
  }, [reflections]);

  return (
    <section className="flex-1 px-4 pb-8 pt-4">
      {Object.entries(grouped).length ? (
        Object.entries(grouped).map(([date, items]) => (
          <div key={date} className="mb-6">
            <div className="mb-3 flex justify-center">
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600">{date}</span>
            </div>
            <div className="grid gap-3">
              {items.map((reflection) => (
                <article key={reflection.id} className="rounded-lg bg-white p-4 shadow-soft">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`truncate font-bold ${reflection.isMine ? "text-teal-700" : "text-slate-900"}`}>
                        {reflection.authorNickname ?? "알 수 없음"}
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenPassage(reflection)}
                        className="mt-1 text-left text-xs font-black text-slate-500 underline decoration-slate-300 underline-offset-2"
                      >
                        {reflection.bookName ?? reflection.bookCode} {reflection.chapter}:{verseLabel(reflection.verseContent, reflection.verse)}
                      </button>
                    </div>
                    <time className="shrink-0 text-xs font-semibold text-slate-400">
                      {new Intl.DateTimeFormat("ko-KR", { timeStyle: "short" }).format(new Date(reflection.createdAt))}
                    </time>
                  </div>
                  {reflection.verseContent ? (
                    <button
                      type="button"
                      onClick={() => onOpenPassage(reflection)}
                      className="mb-3 block w-full rounded-lg bg-teal-50 px-3 py-2 text-left text-sm leading-6 text-teal-950"
                    >
                      {verseText(reflection.verseContent)}
                    </button>
                  ) : null}
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{reflection.content}</p>
                  {reflection.isMine ? (
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => onEdit(reflection)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700" aria-label="묵상 수정" title="묵상 수정">
                        <Edit3 size={16} />
                      </button>
                      <button type="button" onClick={() => onDelete(reflection)} className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-700" aria-label="묵상 삭제" title="묵상 삭제">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm leading-6 text-slate-500">
          아직 작성된 묵상이 없습니다.
        </div>
      )}
      <div ref={sentinelRef} className="h-8" />
      {loading ? <p className="text-center text-sm font-bold text-slate-400">불러오는 중입니다.</p> : null}
      {!nextCursor && reflections.length ? <p className="text-center text-xs font-bold text-slate-300">마지막 나눔입니다.</p> : null}
    </section>
  );
}

function PlanTab({
  room,
  members,
  days,
  selectedDate,
  progress,
  onSelectDate
}: {
  room: RoomDetail;
  members: RoomMember[];
  days: PlanDay[];
  selectedDate: string;
  progress: ProgressSummary | null;
  onSelectDate: (date: string) => void;
}) {
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
  const progressByUser = new Map(progress?.members.map((member) => [member.userId, member]) ?? []);

  return (
    <section className="flex-1 px-4 pb-8 pt-4">
      <div className="mb-4 rounded-lg bg-white p-4 shadow-soft">
        <h2 className="font-black text-slate-950">{room.title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{room.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-800">{scopeLabels[room.scope] ?? room.scope}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{room.durationMonths}개월</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{planTypeLabels[room.planType] ?? room.planType}</span>
          {room.excludeSunday ? <span className="rounded-full bg-slate-100 px-2.5 py-1">주일 제외</span> : null}
        </div>
      </div>

      <PlanCalendar days={days} selectedDate={selectedDate} onSelectDate={onSelectDate} />

      <div className="mt-4 rounded-lg bg-white p-4 shadow-soft">
        <h3 className="mb-3 font-black text-slate-950">{formatDate(selectedDate)} 플랜</h3>
        {selectedDay?.plans.length ? (
          <div className="grid gap-2">
            {selectedDay.plans.map((plan) => (
              <div key={plan.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                {plan.bookName ?? plan.bookCode} {plan.startChapter === plan.endChapter ? `${plan.startChapter}장` : `${plan.startChapter}-${plan.endChapter}장`}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">선택한 날짜에 배정된 플랜이 없습니다.</p>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-black text-slate-950">달성률</h3>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
            {progress?.overallRate ?? 0}%
          </span>
        </div>
        <div className="grid gap-2">
          {members.map((member) => {
            const item = progressByUser.get(member.userId);
            return (
              <div key={member.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-teal-50 text-sm font-black text-teal-800">
                  {(member.nickname ?? "?").slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900">{member.nickname ?? "닉네임 없음"}</p>
                  <p className="text-xs font-semibold text-slate-400">
                    {item?.completedCount ?? 0}/{item?.totalCount ?? 0}일
                  </p>
                </div>
                <span className="shrink-0 text-sm font-black text-slate-700">{item?.rate ?? 0}%</span>
                <span className="shrink-0" aria-label={(item?.rate ?? 0) >= 100 ? "완료" : "진행중"}>
                  {(item?.rate ?? 0) >= 100 ? "✅" : "▫️"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function PlanCalendar({
  days,
  selectedDate,
  onSelectDate,
  compact = false
}: {
  days: PlanDay[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  compact?: boolean;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate.slice(0, 7));
  const dayMap = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);
  const cells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);

  useEffect(() => {
    setVisibleMonth(selectedDate.slice(0, 7));
  }, [selectedDate]);

  function moveMonth(delta: number) {
    const next = new Date(`${visibleMonth}-01T00:00:00.000Z`);
    next.setUTCMonth(next.getUTCMonth() + delta);
    setVisibleMonth(next.toISOString().slice(0, 7));
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => moveMonth(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700" aria-label="이전 달" title="이전 달">
          <ChevronLeft size={17} />
        </button>
        <p className="font-black text-slate-950">{visibleMonth.replace("-", ".")}</p>
        <button type="button" onClick={() => moveMonth(1)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700" aria-label="다음 달" title="다음 달">
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-black text-slate-400">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className={compact ? "h-9" : "h-10"} />;
          const plan = dayMap.get(date);
          const active = selectedDate === date;
          return (
            <button
              key={date}
              type="button"
              onClick={() => plan && onSelectDate(date)}
              disabled={!plan}
              className={`${compact ? "h-9" : "h-10"} rounded-lg text-sm font-black transition ${
                active
                  ? "bg-teal-700 text-white"
                  : plan?.isCompleted
                    ? "bg-emerald-50 text-emerald-700"
                    : plan
                      ? "bg-slate-100 text-slate-700"
                      : "bg-transparent text-slate-300"
              } disabled:cursor-default`}
            >
              {Number(date.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ReflectionComposeScreen({
  target,
  onClose,
  onSubmit
}: {
  target: VerseTarget | null;
  onClose: () => void;
  onSubmit: (target: VerseTarget, content: string) => Promise<boolean>;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (target) setContent("");
  }, [target]);

  if (!target) return null;

  async function submit() {
    if (!target) return;
    setLoading(true);
    const ok = await onSubmit(target, content);
    setLoading(false);
    if (ok) setContent("");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-700" aria-label="닫기">
          <X size={18} />
        </button>
        <h2 className="text-base font-black text-slate-950">묵상 작성</h2>
        <button type="button" onClick={submit} disabled={loading} className="grid h-10 w-10 place-items-center rounded-full bg-teal-700 text-white disabled:opacity-60" aria-label="저장">
          <Send size={17} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 rounded-lg bg-teal-50 p-4">
          <p className="mb-2 text-sm font-black text-teal-800">{target.bookName} {target.chapter}:{target.verse}</p>
          <p className="text-sm leading-6 text-slate-700">{target.text}</p>
        </div>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-[45dvh] w-full rounded-lg border border-slate-200 px-4 py-3 leading-7 outline-none focus:border-teal-500"
          placeholder="묵상을 기록해보세요."
          maxLength={2000}
        />
      </div>
    </div>
  );
}

function ReflectionEditModal({
  reflection,
  onClose,
  onSubmit
}: {
  reflection: Reflection | null;
  onClose: () => void;
  onSubmit: (content: string) => Promise<boolean>;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setContent(reflection?.content ?? "");
  }, [reflection]);

  async function submit() {
    setLoading(true);
    const ok = await onSubmit(content);
    setLoading(false);
    if (ok) setContent("");
  }

  return (
    <Modal title="묵상 수정" open={Boolean(reflection)} onClose={onClose}>
      <div className="grid gap-3">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          className="min-h-40 rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
          maxLength={2000}
        />
        <button type="button" onClick={submit} disabled={loading} className="rounded-lg bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60">
          저장
        </button>
      </div>
    </Modal>
  );
}

function PassageModal({ passage, onClose }: { passage: Passage | null; onClose: () => void }) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const focusVerseRef = useRef<HTMLParagraphElement | null>(null);

  useEffect(() => {
    if (!passage || !focusVerseRef.current || !scrollContainerRef.current) return;

    window.requestAnimationFrame(() => {
      focusVerseRef.current?.scrollIntoView({ block: "center" });
    });
  }, [passage]);

  return (
    <Modal title={passage ? `${passage.bookName} ${passage.chapter}장` : "말씀"} open={Boolean(passage)} onClose={onClose}>
      <div ref={scrollContainerRef} className="max-h-[65dvh] overflow-y-auto pr-1">
        {passage?.verses.map((verse) => {
          const focused = verse.verse === passage.focusVerse;

          return (
            <p
              key={verse.verse}
              ref={focused ? focusVerseRef : undefined}
              className={`scroll-mt-6 rounded-md px-2 py-1.5 text-sm leading-7 ${
                focused ? "bg-teal-50 text-teal-950" : "text-slate-700"
              }`}
            >
              <span className="mr-2 text-xs font-black text-teal-700">{verseLabel(verse.content, verse.verse)}</span>
              {verseText(verse.content)}
            </p>
          );
        })}
      </div>
    </Modal>
  );
}

function buildCalendarCells(monthKey: string) {
  const firstDate = new Date(`${monthKey}-01T00:00:00.000Z`);
  const firstDay = firstDate.getUTCDay();
  const nextMonth = new Date(firstDate);
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  nextMonth.setUTCDate(0);
  const totalDays = nextMonth.getUTCDate();
  const cells: Array<string | null> = Array.from({ length: firstDay }, () => null);

  for (let day = 1; day <= totalDays; day += 1) {
    cells.push(`${monthKey}-${String(day).padStart(2, "0")}`);
  }

  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function verseLabel(content: unknown, fallback: number) {
  if (content && typeof content === "object") {
    const translations = content as Record<string, unknown>;
    if (typeof translations.verse_label === "string") return translations.verse_label;
  }

  return String(fallback);
}

function verseText(content: unknown) {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const translations = content as Record<string, unknown>;
    const koKrv = translations.ko_krv;
    if (typeof koKrv === "string") return koKrv;
    const first = Object.values(translations).find((value) => typeof value === "string");
    if (typeof first === "string") return first;
  }
  return "";
}

function formatDateKey(date: string) {
  return date.slice(0, 10).replaceAll("-", ".");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(`${date.slice(0, 10)}T00:00:00.000Z`));
}
