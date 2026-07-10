"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BookMarked, BookOpen, Check, ChevronDown, ChevronRight, Plus, Settings, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { defaultBibleTranslationSettings, type BibleTranslationCode, type BibleTranslationSettingView } from "@/lib/bible-translations";
import { groupConsecutiveVerseRefs, masteryLabel, passageLabel, type VerseMemoryCardView, type VerseMemoryFilter, type VerseReference } from "@/lib/verse-room";

type VerseBookOption = {
  bookNumber: number;
  bookCode: string;
  bookName: string;
  chapters: number[];
};

type VerseSelection = VerseReference & {
  bookName: string;
  bookNumber: number;
  text: string;
};

type VerseLookupResponse = {
  error?: string;
  translationCode?: BibleTranslationCode;
  verses?: VerseSelection[];
};

type CardListResponse = {
  cards?: VerseMemoryCardView[];
  nextCursor?: string | null;
  translationCode?: BibleTranslationCode;
  error?: string;
};

type VerseRoomProps = {
  isLoggedIn: boolean;
  needsNickname: boolean;
  bibleCopyrightAllowed: boolean;
  books: VerseBookOption[];
  translations: BibleTranslationSettingView[];
  initialTranslation: BibleTranslationCode;
  initialCards: VerseMemoryCardView[];
  initialNextCursor: string | null;
};

const FILTERS: Array<{ value: VerseMemoryFilter; label: string }> = [
  { value: "incomplete", label: "암송 중" },
  { value: "completed", label: "완료" },
  { value: "all", label: "전체" }
];

export function VerseRoom({
  isLoggedIn,
  needsNickname,
  bibleCopyrightAllowed,
  books,
  translations,
  initialTranslation,
  initialCards,
  initialNextCursor
}: VerseRoomProps) {
  const translationOptions = translations.length > 0 ? translations : defaultBibleTranslationSettings;
  const [cards, setCards] = useState(initialCards);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [filter, setFilter] = useState<VerseMemoryFilter>("incomplete");
  const [selectedTranslation, setSelectedTranslation] = useState(initialTranslation);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedBookCode, setSelectedBookCode] = useState(books[0]?.bookCode ?? "");
  const [selectedChapter, setSelectedChapter] = useState(books[0]?.chapters[0] ?? 1);
  const [chapterVerses, setChapterVerses] = useState<VerseSelection[]>([]);
  const [verseLoading, setVerseLoading] = useState(false);
  const [selectedRefs, setSelectedRefs] = useState<Record<string, VerseSelection>>({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const cardsAbortRef = useRef<AbortController | null>(null);
  const cardsLoadingRef = useRef(false);

  const currentBook = books.find((book) => book.bookCode === selectedBookCode) ?? books[0];
  const chapters = currentBook?.chapters ?? [];
  const selectedGroups = groupConsecutiveVerseRefs(Object.values(selectedRefs));

  function showLoginToast() {
    setToast(needsNickname ? "닉네임을 설정한 뒤 성경 암송을 저장할 수 있습니다." : "로그인 후 성경 암송을 저장할 수 있습니다.");
  }

  const loadCards = useCallback(async (targetFilter: VerseMemoryFilter, cursor: string | null, append: boolean) => {
    if (!isLoggedIn || (append && cardsLoadingRef.current)) return;

    cardsAbortRef.current?.abort();
    const controller = new AbortController();
    cardsAbortRef.current = controller;
    cardsLoadingRef.current = true;
    setCardsLoading(true);

    const params = new URLSearchParams({ filter: targetFilter });
    if (cursor) params.set("cursor", cursor);

    try {
      const res = await fetch("/api/verse-room/cards?" + params.toString(), { signal: controller.signal });
      const data = await res.json().catch(() => ({})) as CardListResponse;

      if (!res.ok) {
        setToast(data.error ?? "암송 카드를 불러오지 못했습니다.");
        return;
      }

      setCards((current) => append ? [...current, ...(data.cards ?? [])] : data.cards ?? []);
      setNextCursor(data.nextCursor ?? null);
      if (data.translationCode) setSelectedTranslation(data.translationCode);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        setToast("암송 카드를 불러오지 못했습니다.");
      }
    } finally {
      if (cardsAbortRef.current === controller) {
        cardsLoadingRef.current = false;
        setCardsLoading(false);
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !isLoggedIn) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && nextCursor && !cardsLoadingRef.current) {
        void loadCards(filter, nextCursor, true);
      }
    }, { rootMargin: "240px" });

    observer.observe(target);
    return () => observer.disconnect();
  }, [filter, isLoggedIn, loadCards, nextCursor]);

  useEffect(() => {
    if (!addOpen || !selectedBookCode || !selectedChapter) return;
    let ignore = false;

    async function loadVerses() {
      setVerseLoading(true);
      const params = new URLSearchParams({
        bookCode: selectedBookCode,
        chapter: String(selectedChapter),
        translation: selectedTranslation
      });
      const res = await fetch("/api/verse-room/verses?" + params.toString());
      const data = await res.json().catch(() => ({})) as VerseLookupResponse;
      if (ignore) return;
      setVerseLoading(false);

      if (!res.ok) {
        setChapterVerses([]);
        setToast(data.error ?? "본문을 불러오지 못했습니다.");
        return;
      }

      setChapterVerses(data.verses ?? []);
    }

    void loadVerses();
    return () => {
      ignore = true;
    };
  }, [addOpen, selectedBookCode, selectedChapter, selectedTranslation]);

  useEffect(() => () => cardsAbortRef.current?.abort(), []);

  function selectFilter(nextFilter: VerseMemoryFilter) {
    if (nextFilter === filter) return;
    setFilter(nextFilter);
    setCards([]);
    setNextCursor(null);
    void loadCards(nextFilter, null, false);
  }

  function closeAddModal() {
    setAddOpen(false);
    setSelectedRefs({});
  }

  function changeBook(bookCode: string) {
    const nextBook = books.find((book) => book.bookCode === bookCode);
    setSelectedBookCode(bookCode);
    setSelectedChapter(nextBook?.chapters[0] ?? 1);
  }

  function toggleVerse(verse: VerseSelection) {
    const key = verse.bookCode + ":" + verse.chapter + ":" + verse.verse;
    setSelectedRefs((current) => {
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: verse };
    });
  }

  async function addSelectedVerses() {
    if (!isLoggedIn) {
      showLoginToast();
      return;
    }

    const refs = Object.values(selectedRefs).map((ref) => ({
      bookCode: ref.bookCode,
      chapter: ref.chapter,
      verse: ref.verse
    }));

    if (refs.length === 0) {
      setToast("추가할 말씀을 선택해주세요.");
      return;
    }

    const res = await fetch("/api/verse-room/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refs })
    });
    const data = await res.json().catch(() => ({})) as { error?: string; createdGroups?: number };

    if (!res.ok) {
      setToast(data.error ?? "말씀카드를 추가하지 못했습니다.");
      return;
    }

    setToast((data.createdGroups ?? selectedGroups.length) + "개의 말씀카드를 추가했습니다.");
    closeAddModal();
    setFilter("incomplete");
    void loadCards("incomplete", null, false);
  }

  async function saveTranslation(code: BibleTranslationCode) {
    const option = translationOptions.find((item) => item.code === code);
    if (!option?.isVisible) {
      setToast("현재 노출되지 않는 번역본입니다.");
      return;
    }
    if (option.requiresCopyright && !bibleCopyrightAllowed) {
      setToast(option.label + "은 저작권 허용 후 선택할 수 있습니다.");
      return;
    }

    setSelectedTranslation(code);
    setSelectedRefs({});

    if (!isLoggedIn) {
      setSettingsOpen(false);
      setToast("로그인하면 선택한 번역본이 저장됩니다.");
      return;
    }

    const res = await fetch("/api/verse-room/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ translationCode: code })
    });
    const data = await res.json().catch(() => ({})) as { error?: string };

    if (!res.ok) {
      setToast(data.error ?? "번역본 설정을 저장하지 못했습니다.");
      return;
    }

    setSettingsOpen(false);
    setToast("번역본 설정을 저장했습니다.");
    void loadCards(filter, null, false);
  }

  async function resetAllProgress() {
    if (!isLoggedIn) {
      showLoginToast();
      return;
    }
    if (!confirm("모든 말씀카드의 암송 진행률을 초기화하시겠습니까?\n말씀카드는 삭제되지 않습니다.")) return;

    const res = await fetch("/api/verse-room/cards", { method: "PATCH" });
    const data = await res.json().catch(() => ({})) as { error?: string };

    if (!res.ok) {
      setToast(data.error ?? "암송 진행률 초기화에 실패했습니다.");
      return;
    }

    setFilter("incomplete");
    setSettingsOpen(false);
    setToast("모든 암송 진행률을 초기화했습니다.");
    void loadCards("incomplete", null, false);
  }

  async function deleteAllCards() {
    if (!isLoggedIn) {
      showLoginToast();
      return;
    }
    if (!confirm("모든 말씀카드를 삭제하시겠습니까?\n삭제하면 복구할 수 없습니다.")) return;

    const res = await fetch("/api/verse-room/cards", { method: "DELETE" });
    const data = await res.json().catch(() => ({})) as { error?: string };

    if (!res.ok) {
      setToast(data.error ?? "말씀카드 전체 삭제에 실패했습니다.");
      return;
    }

    setCards([]);
    setNextCursor(null);
    setSettingsOpen(false);
    setToast("모든 말씀카드를 삭제했습니다.");
  }

  const emptyMessage = filter === "completed"
    ? "완료한 암송 카드가 없습니다."
    : filter === "all"
      ? "아직 암송 카드가 없습니다. 외우고 싶은 말씀을 추가해보세요."
      : "암송 중인 카드가 없습니다. 새로운 말씀을 추가해보세요.";

  return (
    <>
      <Toast message={toast} onClose={() => setToast("")} />
      <header className="mb-5">
        <p className="text-sm font-bold text-teal-700 dark:text-teal-300">Verse Room</p>
        <div className="mt-1 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-950 dark:text-slate-50">성경 암송하기</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">외우고 싶은 말씀을 차곡차곡 익혀보세요.</p>
          </div>
          <button type="button" onClick={() => setSettingsOpen(true)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-slate-700 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100" aria-label="성경 암송 설정">
            <Settings size={19} />
          </button>
        </div>
      </header>

      {!isLoggedIn ? (
        <section className="mb-4 rounded-lg border border-dashed border-slate-300 bg-white/85 p-5 text-center shadow-soft dark:border-slate-700 dark:bg-slate-900/70">
          <BookMarked className="mx-auto text-teal-700 dark:text-teal-300" size={30} />
          <p className="mt-3 font-black text-slate-950 dark:text-slate-50">로그인 후 암송 카드를 저장할 수 있어요.</p>
          <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">말씀은 둘러볼 수 있지만 카드 저장과 암송 기록은 계정이 필요합니다.</p>
          <Link href={needsNickname ? "/nickname?next=/verse-room" : "/login?next=/verse-room"} className="mt-4 inline-flex min-h-10 items-center rounded-full bg-slate-950 px-4 text-sm font-black text-white dark:bg-white dark:text-slate-950">
            {needsNickname ? "닉네임 설정하기" : "로그인하기"}
          </Link>
        </section>
      ) : null}

      <section className="mb-4">
        <div role="tablist" aria-label="암송 카드 필터" className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              onClick={() => selectFilter(option.value)}
              className={`min-h-10 rounded-md px-3 text-sm font-black transition ${filter === option.value
                ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-end px-1">
          <p className="text-xs font-bold text-slate-400">{cards.length}개 표시 중</p>
        </div>
      </section>

      <div className="grid gap-3 pb-24">
        {cards.map((card) => <MemoryCard key={card.id} card={card} />)}
        {isLoggedIn && cards.length === 0 && !cardsLoading ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-6 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-400">
            {emptyMessage}
          </div>
        ) : null}
        <div ref={loadMoreRef} className="min-h-4" />
        {cardsLoading ? <p className="py-3 text-center text-sm font-bold text-slate-400">불러오는 중</p> : null}
        {isLoggedIn && cards.length > 0 && !nextCursor && !cardsLoading ? <p className="py-3 text-center text-xs font-bold text-slate-400">마지막 암송 카드입니다.</p> : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 safe-bottom">
        <div className="mx-auto flex w-full max-w-xl justify-end px-4 pb-4">
          <div className="flex items-center rounded-full border border-white/80 bg-white/90 p-1.5 shadow-[0_16px_42px_rgba(15,23,42,0.18)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-white shadow-[0_10px_24px_rgba(5,150,105,0.28)] transition hover:bg-emerald-700 active:scale-95"
              aria-label="말씀 추가"
              title="말씀 추가"
            >
              <Plus size={26} />
            </button>
          </div>
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        selectedTranslation={selectedTranslation}
        translations={translationOptions}
        copyrightAllowed={bibleCopyrightAllowed}
        onClose={() => setSettingsOpen(false)}
        onSelectTranslation={(code) => void saveTranslation(code)}
        onResetProgress={() => void resetAllProgress()}
        onDeleteAll={() => void deleteAllCards()}
      />
      <AddVerseModal
        open={addOpen}
        books={books}
        chapters={chapters}
        selectedBookCode={selectedBookCode}
        selectedChapter={selectedChapter}
        chapterVerses={chapterVerses}
        selectedRefs={selectedRefs}
        selectedGroups={selectedGroups}
        loading={verseLoading}
        canSave={isLoggedIn}
        onClose={closeAddModal}
        onBookChange={changeBook}
        onChapterChange={setSelectedChapter}
        onToggleVerse={toggleVerse}
        onAdd={() => void addSelectedVerses()}
        onLoginRequired={showLoginToast}
      />
    </>
  );
}

function MemoryCard({ card }: { card: VerseMemoryCardView }) {
  const completed = card.progress.mastery === "MEMORIZED";

  return (
    <Link href={`/verse-room/${card.id}`} className="group block rounded-lg border border-white/80 bg-white p-4 shadow-soft transition active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900/85">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-black text-slate-950 dark:text-slate-50">{card.label}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${completed
            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
          }`}>
            {completed ? "완료" : masteryLabel(card.progress.mastery)}
          </span>
          <ChevronRight size={18} className="text-slate-300 transition group-hover:translate-x-0.5 dark:text-slate-600" />
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-teal-600 dark:bg-teal-400" style={{ width: Math.max(0, Math.min(100, card.progress.progressPercent)) + "%" }} />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold">
          <p className="text-slate-500 dark:text-slate-400">진행률 {card.progress.progressPercent}%</p>
          <p className="text-slate-400 dark:text-slate-500">시작 {formatDate(card.createdAt)}</p>
        </div>
      </div>
    </Link>
  );
}

function SettingsModal({
  open,
  selectedTranslation,
  translations,
  copyrightAllowed,
  onClose,
  onSelectTranslation,
  onResetProgress,
  onDeleteAll
}: {
  open: boolean;
  selectedTranslation: BibleTranslationCode;
  translations: BibleTranslationSettingView[];
  copyrightAllowed: boolean;
  onClose: () => void;
  onSelectTranslation: (code: BibleTranslationCode) => void;
  onResetProgress: () => void;
  onDeleteAll: () => void;
}) {
  return (
    <Modal title="성경 암송 설정" open={open} onClose={onClose}>
      <div className="grid gap-3">
        <section>
          <h3 className="mb-2 text-sm font-black text-slate-950 dark:text-slate-50">번역본 선택</h3>
          <div className="grid gap-2">
            {translations.filter((item) => item.isVisible).map((option) => {
              const active = selectedTranslation === option.code;
              const disabled = option.requiresCopyright && !copyrightAllowed;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => !disabled && onSelectTranslation(option.code)}
                  disabled={disabled}
                  className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-70 ${disabled
                    ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-500"
                    : active
                      ? "border-teal-200 bg-teal-50 text-teal-900 dark:border-teal-700 dark:bg-teal-950/50 dark:text-teal-100"
                      : "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                  }`}
                >
                  <span className="min-w-0 truncate font-black">{option.label}</span>
                  {disabled ? (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400">저작권 필요</span>
                  ) : active ? (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-700 text-white"><Check size={15} strokeWidth={3} /></span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border border-amber-100 bg-amber-50/70 p-3 dark:border-amber-900/60 dark:bg-amber-950/25">
          <h3 className="text-sm font-black text-amber-800 dark:text-amber-200">진행률 전체 초기화</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-amber-700 dark:text-amber-300">말씀카드는 유지하고 모든 카드의 암송 상태와 진행률만 처음으로 되돌립니다.</p>
          <button type="button" onClick={onResetProgress} className="mt-3 min-h-10 rounded-lg bg-amber-600 px-3 text-sm font-black text-white">
            진행률 전체 초기화
          </button>
        </section>

        <section className="rounded-lg border border-rose-100 bg-rose-50/70 p-3 dark:border-rose-900/60 dark:bg-rose-950/25">
          <h3 className="text-sm font-black text-rose-700 dark:text-rose-200">말씀카드 전체 삭제</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-rose-600 dark:text-rose-300">현재 계정의 암송 카드와 진행 상태를 모두 완전 삭제합니다.</p>
          <button type="button" onClick={onDeleteAll} className="mt-3 min-h-10 rounded-lg bg-rose-600 px-3 text-sm font-black text-white">
            전체 삭제
          </button>
        </section>
      </div>
    </Modal>
  );
}

function AddVerseModal({
  open,
  books,
  chapters,
  selectedBookCode,
  selectedChapter,
  chapterVerses,
  selectedRefs,
  selectedGroups,
  loading,
  canSave,
  onClose,
  onBookChange,
  onChapterChange,
  onToggleVerse,
  onAdd,
  onLoginRequired
}: {
  open: boolean;
  books: VerseBookOption[];
  chapters: number[];
  selectedBookCode: string;
  selectedChapter: number;
  chapterVerses: VerseSelection[];
  selectedRefs: Record<string, VerseSelection>;
  selectedGroups: ReturnType<typeof groupConsecutiveVerseRefs>;
  loading: boolean;
  canSave: boolean;
  onClose: () => void;
  onBookChange: (bookCode: string) => void;
  onChapterChange: (chapter: number) => void;
  onToggleVerse: (verse: VerseSelection) => void;
  onAdd: () => void;
  onLoginRequired: () => void;
}) {
  const [bookPickerOpen, setBookPickerOpen] = useState(false);
  const selectedBook = books.find((book) => book.bookCode === selectedBookCode);

  useEffect(() => {
    if (!open) setBookPickerOpen(false);
  }, [open]);

  return (
    <>
      <Modal title="말씀 추가" open={open} onClose={onClose} stickyHeader hideScrollbar>
        <div className="grid gap-4">
          <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
            <button type="button" onClick={() => setBookPickerOpen(true)} className="flex h-11 min-w-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-black text-slate-900 outline-none transition hover:border-teal-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              <BookOpen size={17} className="shrink-0 text-teal-700 dark:text-teal-300" />
              <span className="min-w-0 flex-1 truncate">{selectedBook?.bookName ?? "성경 선택"}</span>
              <ChevronDown size={16} className="shrink-0 text-slate-400" />
            </button>
            <select value={selectedChapter} onChange={(event) => onChapterChange(Number(event.target.value))} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
              {chapters.map((chapter) => <option key={chapter} value={chapter}>{chapter}장</option>)}
            </select>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-slate-800 dark:bg-slate-900">
            {loading ? <p className="px-4 py-6 text-center text-sm font-bold text-slate-400">본문을 불러오는 중</p> : null}
            {!loading && chapterVerses.map((verse) => {
              const key = verse.bookCode + ":" + verse.chapter + ":" + verse.verse;
              const checked = Boolean(selectedRefs[key]);
              return (
                <button key={key} type="button" onClick={() => onToggleVerse(verse)} className={`flex w-full items-start gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-b-0 dark:border-slate-800 ${checked ? "bg-teal-50/80 dark:bg-teal-950/30" : ""}`}>
                  <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border text-[11px] font-black ${checked ? "border-teal-600 bg-teal-600 text-white" : "border-slate-300 text-slate-400 dark:border-slate-700"}`}>
                    {checked ? <Check size={14} strokeWidth={3} /> : ""}
                  </span>
                  <span className="min-w-0 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                    <strong className="mr-2 font-black text-slate-400 dark:text-slate-500">{verse.verse}절</strong>
                    {verse.text}
                  </span>
                </button>
              );
            })}
          </div>

          <section className="rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
            <h3 className="text-sm font-black text-slate-950 dark:text-slate-50">선택한 말씀</h3>
            {selectedGroups.length ? (
              <div className="mt-2 grid gap-1.5">
                {selectedGroups.map((group) => (
                  <p key={group.bookCode + group.chapter + group.startVerse} className="text-sm font-bold text-slate-700 dark:text-slate-200">
                    {passageLabel(group.bookName, group.chapter, group.startVerse, group.endVerse)}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-400">절을 선택하면 추가될 카드 형태가 표시됩니다.</p>
            )}
          </section>

          <button type="button" onClick={canSave ? onAdd : onLoginRequired} className="min-h-12 rounded-lg bg-teal-700 px-4 text-sm font-black text-white dark:bg-teal-500 dark:text-slate-950">
            선택한 말씀 추가
          </button>
        </div>
      </Modal>

      <BookPickerModal
        open={bookPickerOpen}
        books={books}
        selectedBookCode={selectedBookCode}
        onClose={() => setBookPickerOpen(false)}
        onSelect={(bookCode) => {
          onBookChange(bookCode);
          setBookPickerOpen(false);
        }}
      />
    </>
  );
}

function BookPickerModal({
  open,
  books,
  selectedBookCode,
  onClose,
  onSelect
}: {
  open: boolean;
  books: VerseBookOption[];
  selectedBookCode: string;
  onClose: () => void;
  onSelect: (bookCode: string) => void;
}) {
  const selectedBook = books.find((book) => book.bookCode === selectedBookCode);
  const [testament, setTestament] = useState<"old" | "new">((selectedBook?.bookNumber ?? 1) <= 39 ? "old" : "new");

  useEffect(() => {
    if (open) setTestament((selectedBook?.bookNumber ?? 1) <= 39 ? "old" : "new");
  }, [open, selectedBook?.bookNumber]);

  if (!open) return null;
  const visibleBooks = books.filter((book) => testament === "old" ? book.bookNumber <= 39 : book.bookNumber > 39);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-3 dark:bg-slate-950/80 sm:items-center" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <section className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-soft [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border dark:border-slate-800 dark:bg-slate-950">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">성경 선택</h2>
            <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="닫기">
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
            <button type="button" onClick={() => setTestament("old")} className={`min-h-10 rounded-md text-sm font-black ${testament === "old" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>구약</button>
            <button type="button" onClick={() => setTestament("new")} className={`min-h-10 rounded-md text-sm font-black ${testament === "new" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-400"}`}>신약</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 p-5">
          {visibleBooks.map((book) => {
            const selected = book.bookCode === selectedBookCode;
            return (
              <button
                key={book.bookCode}
                type="button"
                onClick={() => onSelect(book.bookCode)}
                className={`min-h-11 rounded-lg border px-2 text-sm font-black transition ${selected
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                }`}
              >
                {book.bookName}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return values.year + "." + values.month + "." + values.day;
}
