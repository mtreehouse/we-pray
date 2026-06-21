"use client";

import type { CSSProperties, ReactNode } from "react";
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
  Crown,
  Edit3,
  Heart,
  History,
  Info,
  MessageCircle,
  Pencil,
  Send,
  Settings,
  Trash2,
  X
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { APP_DARK_MODE_STORAGE_KEY } from "@/lib/ui-settings";

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
  hasReflection: boolean;
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

type BibleReflectionReactionType = "PRAY" | "LIKE" | "HEART";

type ReflectionReactionState = {
  prayCount: number;
  likeCount: number;
  heartCount: number;
  isPrayedByMe: boolean;
  isLikedByMe: boolean;
  isHeartedByMe: boolean;
};

type Reflection = {
  id: string;
  bookCode: string;
  bookName?: string;
  chapter: number;
  verse: number;
  verseContent?: unknown;
  planDate?: string | null;
  content: string;
  createdAt: string;
  userId: string;
  authorNickname: string | null;
  isMine: boolean;
} & ReflectionReactionState;

type ProgressSummary = {
  totalPlanDays: number;
  currentPlanDays: number;
  completedCount: number;
  totalCount: number;
  earnedPoints: number;
  possiblePoints: number;
  overallRate: number;
  members: Array<{
    userId: string;
    nickname: string | null;
    role: "creator" | "member";
    joinedAt: string;
    completedCount: number;
    reflectionCount: number;
    totalCount: number;
    earnedPoints: number;
    possiblePoints: number;
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

type ReadingLocation = {
  date: string;
  bookCode: string;
  chapter: number;
};

type DateRange = {
  startDate: string;
  endDate: string;
};

type BibleTranslationCode = "ko_krv" | "ko_nkrv";
type BibleFontSize = "small" | "normal" | "large" | "xlarge";
type BibleLineHeight = "compact" | "normal" | "relaxed" | "spacious";

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

const bibleTranslationLabels: Record<BibleTranslationCode, string> = {
  ko_krv: "개역한글",
  ko_nkrv: "개역개정"
};

const bibleFontSizeLabels: Record<BibleFontSize, string> = {
  small: "작게",
  normal: "기본",
  large: "크게",
  xlarge: "아주 크게"
};

const bibleFontSizeClasses: Record<BibleFontSize, string> = {
  small: "text-[14px]",
  normal: "text-[15px]",
  large: "text-[17px]",
  xlarge: "text-[19px]"
};

const bibleLineHeightLabels: Record<BibleLineHeight, string> = {
  compact: "좁게",
  normal: "기본",
  relaxed: "넓게",
  spacious: "아주 넓게"
};

const bibleLineHeightClasses: Record<BibleLineHeight, string> = {
  compact: "leading-6",
  normal: "leading-7",
  relaxed: "leading-8",
  spacious: "leading-9"
};

const DEFAULT_BIBLE_TRANSLATION: BibleTranslationCode = "ko_krv";
const DEFAULT_BIBLE_FONT_SIZE: BibleFontSize = "normal";
const DEFAULT_BIBLE_LINE_HEIGHT: BibleLineHeight = "normal";
const BIBLE_TRANSLATION_STORAGE_KEY = "wepray:bible-translation";
const BIBLE_FONT_SIZE_STORAGE_KEY = "wepray:bible-font-size";
const BIBLE_LINE_HEIGHT_STORAGE_KEY = "wepray:bible-line-height";
const BIBLE_DARK_MODE_STORAGE_PREFIX = "wepray:bible-room-dark-mode";
const BIBLE_GUIDE_STORAGE_KEY = "wepray:bible-room-guide:v5";

function isBibleTranslationCode(value: unknown): value is BibleTranslationCode {
  return value === "ko_krv" || value === "ko_nkrv";
}

function isBibleFontSize(value: unknown): value is BibleFontSize {
  return value === "small" || value === "normal" || value === "large" || value === "xlarge";
}

function isBibleLineHeight(value: unknown): value is BibleLineHeight {
  return value === "compact" || value === "normal" || value === "relaxed" || value === "spacious";
}


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
  const [readingDate, setReadingDate] = useState(initialDate);
  const [planSelectedDate, setPlanSelectedDate] = useState(initialDate);
  const [chapters, setChapters] = useState<ReadingChapter[]>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [readingLoading, setReadingLoading] = useState(false);
  const [loadedReadingDate, setLoadedReadingDate] = useState<string | null>(null);
  const [storedLocationLoaded, setStoredLocationLoaded] = useState(false);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [reflectionTarget, setReflectionTarget] = useState<VerseTarget | null>(null);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);
  const [passage, setPassage] = useState<Passage | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideStepIndex, setGuideStepIndex] = useState(0);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translation, setTranslation] = useState<BibleTranslationCode>(DEFAULT_BIBLE_TRANSLATION);
  const [bibleFontSize, setBibleFontSize] = useState<BibleFontSize>(DEFAULT_BIBLE_FONT_SIZE);
  const [bibleLineHeight, setBibleLineHeight] = useState<BibleLineHeight>(DEFAULT_BIBLE_LINE_HEIGHT);
  const [darkMode, setDarkMode] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [historyMember, setHistoryMember] = useState<RoomMember | null>(null);
  const [historyReflections, setHistoryReflections] = useState<Reflection[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [headerCollapseProgress, setHeaderCollapseProgress] = useState(0);
  const roomHeaderRef = useRef<HTMLElement | null>(null);
  const lastScrollYRef = useRef(0);
  const forceCompactHeaderUntilRef = useRef(0);
  const restoredLocationRef = useRef<ReadingLocation | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const bibleScrollYRef = useRef(0);
  const previousActiveTabRef = useRef<"bible" | "sharing" | "plan">(activeTab);
  const readingLocationStorageKey = useMemo(() => `wepray:bible-room:${room.id}:reading-location`, [room.id]);
  const bibleDarkModeStorageKey = useMemo(() => `${BIBLE_DARK_MODE_STORAGE_PREFIX}:${room.id}`, [room.id]);
  const bibleGuideStorageKey = useMemo(() => `${BIBLE_GUIDE_STORAGE_KEY}:${currentUserId}`, [currentUserId]);

  const selectedPlanDay = useMemo(
    () => planDays.find((day) => day.date === readingDate) ?? null,
    [planDays, readingDate]
  );
  const planDateRange = useMemo(() => getPlanDateRange(room, planDays), [planDays, room]);
  const currentChapter = chapters[chapterIndex] ?? null;
  const activeBibleGuideSteps = bibleActionGuideSteps;

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }, []);

  const selectTab = useCallback((nextTab: "bible" | "sharing" | "plan") => {
    if (activeTab === "bible" && nextTab !== "bible") {
      bibleScrollYRef.current = window.scrollY;
    }

    if (nextTab === "plan") {
      setPlanSelectedDate(initialDate);
    }

    setActiveTab(nextTab);
  }, [activeTab, initialDate]);

  const holdCompactReadingHeader = useCallback(() => {
    forceCompactHeaderUntilRef.current = Date.now() + 900;
    setHeaderCollapseProgress(1);
  }, []);

  const selectTranslation = useCallback((nextTranslation: BibleTranslationCode) => {
    setTranslation(nextTranslation);
    try {
      window.localStorage.setItem(BIBLE_TRANSLATION_STORAGE_KEY, nextTranslation);
    } catch {
      // localStorage may be unavailable in private browsing or restricted webviews.
    }
  }, []);

  const selectBibleFontSize = useCallback((nextFontSize: BibleFontSize) => {
    setBibleFontSize(nextFontSize);
    try {
      window.localStorage.setItem(BIBLE_FONT_SIZE_STORAGE_KEY, nextFontSize);
    } catch {
      // localStorage may be unavailable in private browsing or restricted webviews.
    }
  }, []);

  const selectBibleLineHeight = useCallback((nextLineHeight: BibleLineHeight) => {
    setBibleLineHeight(nextLineHeight);
    try {
      window.localStorage.setItem(BIBLE_LINE_HEIGHT_STORAGE_KEY, nextLineHeight);
    } catch {
      // localStorage may be unavailable in private browsing or restricted webviews.
    }
  }, []);

  const markGuideDone = useCallback(() => {
    try {
      window.localStorage.setItem(bibleGuideStorageKey, "done");
    } catch {
      // localStorage may be unavailable in private browsing or restricted webviews.
    }
  }, [bibleGuideStorageKey]);

  const closeGuide = useCallback(() => {
    setGuideOpen(false);
    setGuideStepIndex(0);
    markGuideDone();
  }, [markGuideDone]);

  const finishGuide = useCallback(() => {
    setGuideOpen(false);
    setGuideStepIndex(0);
    setSettingsOpen(false);
    bibleScrollYRef.current = 0;
    setHeaderCollapseProgress(0);
    selectTab("bible");
    markGuideDone();

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
    window.requestAnimationFrame(scrollToTop);
    window.setTimeout(scrollToTop, 180);
  }, [markGuideDone, selectTab]);

  const advanceGuide = useCallback(() => {
    setGuideStepIndex((index) => {
      if (index >= activeBibleGuideSteps.length - 1) {
        finishGuide();
        return index;
      }

      return index + 1;
    });
  }, [activeBibleGuideSteps.length, finishGuide]);

  const selectDarkMode = useCallback((enabled: boolean) => {
    setDarkMode(enabled);
    try {
      window.localStorage.setItem(bibleDarkModeStorageKey, enabled ? "true" : "false");
    } catch {
      // localStorage may be unavailable in private browsing or restricted webviews.
    }
  }, [bibleDarkModeStorageKey]);

  const loadPlans = useCallback(async () => {
    const res = await fetch(`/api/bible-rooms/${room.id}/plans`);
    const data = (await res.json()) as { days?: PlanDay[]; error?: string };

    if (!res.ok) {
      showToast(data.error ?? "플랜을 불러오지 못했습니다.");
      return;
    }

    setPlanDays(data.days ?? []);
  }, [room.id, showToast]);

  const loadReading = useCallback(async () => {
    setReadingLoading(true);
    setLoadedReadingDate(null);
    const res = await fetch(`/api/bible-rooms/${room.id}/reading?date=${readingDate}`);
    const data = (await res.json()) as { chapters?: ReadingChapter[]; error?: string };
    setReadingLoading(false);

    if (!res.ok) {
      showToast(data.error ?? "본문을 불러오지 못했습니다.");
      return;
    }

    const nextChapters = data.chapters ?? [];
    const restoredLocation = restoredLocationRef.current;
    const restoredIndex = restoredLocation?.date === readingDate
      ? nextChapters.findIndex((chapter) => chapter.bookCode === restoredLocation.bookCode && chapter.chapter === restoredLocation.chapter)
      : -1;

    setChapters(nextChapters);
    setChapterIndex(restoredIndex >= 0 ? restoredIndex : 0);
    setLoadedReadingDate(readingDate);
  }, [room.id, readingDate, showToast]);

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
    try {
      const raw = window.localStorage.getItem(readingLocationStorageKey);
      const location = raw ? (JSON.parse(raw) as Partial<ReadingLocation>) : null;

      if (location?.date && location.bookCode && typeof location.chapter === "number" && Number.isInteger(location.chapter)) {
        const restoredLocation: ReadingLocation = {
          date: location.date,
          bookCode: location.bookCode,
          chapter: location.chapter
        };
        restoredLocationRef.current = restoredLocation;
        setReadingDate(restoredLocation.date);
      }
    } catch {
      restoredLocationRef.current = null;
    } finally {
      setStoredLocationLoaded(true);
    }
  }, [readingLocationStorageKey]);

  useEffect(() => {
    try {
      const savedTranslation = window.localStorage.getItem(BIBLE_TRANSLATION_STORAGE_KEY);
      const savedFontSize = window.localStorage.getItem(BIBLE_FONT_SIZE_STORAGE_KEY);
      const savedLineHeight = window.localStorage.getItem(BIBLE_LINE_HEIGHT_STORAGE_KEY);
      const savedDarkMode = window.localStorage.getItem(bibleDarkModeStorageKey);
      const savedAppDarkMode = window.localStorage.getItem(APP_DARK_MODE_STORAGE_KEY);
      if (isBibleTranslationCode(savedTranslation)) setTranslation(savedTranslation);
      if (isBibleFontSize(savedFontSize)) setBibleFontSize(savedFontSize);
      if (isBibleLineHeight(savedLineHeight)) setBibleLineHeight(savedLineHeight);
      if (savedDarkMode === "true" || savedDarkMode === "false") setDarkMode(savedDarkMode === "true");
      else if (savedAppDarkMode === "true" || savedAppDarkMode === "false") setDarkMode(savedAppDarkMode === "true");
    } catch {
      // Keep the default display settings when localStorage cannot be read.
    }
  }, [bibleDarkModeStorageKey]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);

    return () => {
      try {
        const enabled = window.localStorage.getItem(APP_DARK_MODE_STORAGE_KEY) === "true";
        document.documentElement.classList.toggle("dark", enabled);
      } catch {
        document.documentElement.classList.remove("dark");
      }
    };
  }, [darkMode]);

  useEffect(() => {
    void loadPlans();
    void loadProgress();
    void loadReflections(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    try {
      if (window.localStorage.getItem(bibleGuideStorageKey) !== "done") {
        setGuideStepIndex(0);
        setGuideOpen(true);
      }
    } catch {
      // Keep the guide closed when localStorage is unavailable.
    }
  }, [bibleGuideStorageKey]);

  useEffect(() => {
    if (!guideOpen) return;
    if (guideStepIndex <= activeBibleGuideSteps.length - 1) return;
    setGuideStepIndex(Math.max(0, activeBibleGuideSteps.length - 1));
  }, [activeBibleGuideSteps.length, guideOpen, guideStepIndex]);

  useEffect(() => {
    if (!guideOpen) return;

    const step = activeBibleGuideSteps[guideStepIndex];
    if (!step) return;

    if (step.key === "sharing") {
      selectTab("sharing");
    } else if (step.key === "plan") {
      selectTab("plan");
    } else {
      selectTab("bible");
    }

    if (step.key === "settings") {
      setSettingsOpen(false);
    }

    const scrollToGuideTarget = () => {
      const target = queryGuideElement(step.selector);
      if (!target) return;

      const block = step.key === "complete" || step.key === "verse" || step.key === "sharing" || step.key === "plan" ? "center" : "nearest";
      target.scrollIntoView({ block, behavior: "smooth" });
    };

    const timers = [90, 260, 520, 900].map((delay) => window.setTimeout(scrollToGuideTarget, delay));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [activeBibleGuideSteps, guideOpen, guideStepIndex, selectTab]);

  useEffect(() => {
    const previousTab = previousActiveTabRef.current;

    if (activeTab === "bible" && previousTab !== "bible") {
      window.requestAnimationFrame(() => window.scrollTo({ top: bibleScrollYRef.current }));
    }

    previousActiveTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!settingsOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [settingsOpen]);


  useEffect(() => {
    if (!storedLocationLoaded || !readingDate) return;
    void loadReading();
  }, [loadReading, readingDate, storedLocationLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!storedLocationLoaded || loadedReadingDate !== readingDate || !currentChapter) return;

    try {
      window.localStorage.setItem(
        readingLocationStorageKey,
        JSON.stringify({
          date: readingDate,
          bookCode: currentChapter.bookCode,
          chapter: currentChapter.chapter
        })
      );
    } catch {
      // localStorage may be unavailable in private browsing or restricted webviews.
    }
  }, [currentChapter, loadedReadingDate, readingLocationStorageKey, readingDate, storedLocationLoaded]);

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

  async function leaveRoom() {
    if (!confirm("성경방에서 나가시겠습니까?")) return;

    const res = await fetch(`/api/bible-rooms/${room.id}/leave`, { method: "POST" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      showToast(data.error ?? "성경방 나가기에 실패했습니다.");
      return;
    }

    router.push("/bible-room");
    router.refresh();
  }

  async function toggleComplete() {
    if (!selectedPlanDay) return;

    const scrollY = window.scrollY;
    const nextCompleted = !selectedPlanDay.isCompleted;
    setCompleting(true);
    setPlanDays((days) => days.map((day) => day.date === readingDate ? { ...day, isCompleted: nextCompleted } : day));

    try {
      const res = await fetch(`/api/bible-rooms/${room.id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: readingDate, isCompleted: nextCompleted })
      });
      const data = (await res.json()) as { isCompleted?: boolean; progress?: ProgressSummary; error?: string };

      if (!res.ok) {
        setPlanDays((days) => days.map((day) => day.date === readingDate ? { ...day, isCompleted: selectedPlanDay.isCompleted } : day));
        showToast(data.error ?? "완료 처리에 실패했습니다.");
        return;
      }

      setPlanDays((days) => days.map((day) => day.date === readingDate ? { ...day, isCompleted: Boolean(data.isCompleted) } : day));
      setProgress(data.progress ?? null);
    } finally {
      setCompleting(false);
      window.requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
    }
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
      if (data.reflection.planDate) {
        setPlanDays((days) => days.map((day) => day.date === data.reflection!.planDate ? { ...day, hasReflection: true } : day));
      }
    }
    void loadProgress();
    window.requestAnimationFrame(() => window.scrollTo({ top: scrollY }));
    return true;
  }

  async function updateReflection(content: string) {
    if (!editingReflection) return false;

    if (content.trim() === editingReflection.content.trim()) {
      showToast("수정된 내용이 없습니다.");
      return false;
    }

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

    await Promise.all([loadPlans(), loadReading(), loadReflections(true), loadProgress()]);
  }

  async function openMemberHistory(member: RoomMember) {
    setHistoryMember(member);
    setHistoryReflections([]);
    setHistoryLoading(true);
    const res = await fetch(`/api/bible-rooms/${room.id}/members/${member.id}/reflections`);
    const data = (await res.json()) as { reflections?: Reflection[]; error?: string };
    setHistoryLoading(false);

    if (!res.ok) {
      showToast(data.error ?? "묵상 history를 불러오지 못했습니다.");
      return;
    }

    setHistoryReflections(data.reflections ?? []);
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

  function updateReflectionReactionState(reflectionId: string, state: ReflectionReactionState) {
    const update = (reflection: Reflection) => reflection.id === reflectionId ? { ...reflection, ...state } : reflection;

    setReflections((items) => items.map(update));
    setHistoryReflections((items) => items.map(update));
    setEditingReflection((reflection) => reflection ? update(reflection) : reflection);
  }

  async function toggleReflectionReaction(reflection: Reflection, type: BibleReflectionReactionType) {
    try {
      const res = await fetch(`/api/bible-rooms/${room.id}/reflections/${reflection.id}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type })
      });
      const data = (await res.json()) as Partial<ReflectionReactionState> & { error?: string };

      if (!res.ok
        || typeof data.prayCount !== "number"
        || typeof data.likeCount !== "number"
        || typeof data.heartCount !== "number"
        || typeof data.isPrayedByMe !== "boolean"
        || typeof data.isLikedByMe !== "boolean"
        || typeof data.isHeartedByMe !== "boolean") {
        showToast(data.error ?? "반응 저장에 실패했습니다.");
        return false;
      }

      updateReflectionReactionState(reflection.id, {
        prayCount: data.prayCount,
        likeCount: data.likeCount,
        heartCount: data.heartCount,
        isPrayedByMe: data.isPrayedByMe,
        isLikedByMe: data.isLikedByMe,
        isHeartedByMe: data.isHeartedByMe
      });
      return true;
    } catch {
      showToast("반응 저장에 실패했습니다.");
      return false;
    }
  }

  return (
    <main className={`mx-auto flex min-h-dvh w-full max-w-xl flex-col ${darkMode ? "dark bg-slate-950 text-slate-100" : "bg-white/55 text-slate-900"}`}>
      <Toast message={toast} />
      <header
        ref={roomHeaderRef}
        className={`sticky top-0 z-20 bg-white/95 px-4 backdrop-blur will-change-transform dark:bg-slate-950/95 ${
          activeTab === "bible" ? "border-b border-transparent" : "border-b border-white/70 dark:border-slate-800"
        }`}
        style={{ transform: `translateY(${-headerCollapseProgress * 100}%)` }}
      >
        <div className="grid h-14 grid-cols-[2.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
          <Link
            href="/bible-room"
            data-guide="bible-back-button"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            aria-label="성경방 목록으로"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="min-w-0 truncate text-center text-lg font-black text-slate-950 dark:text-slate-50">{room.title}</h1>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            data-guide="bible-settings-button"
            className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            aria-label="성경방 설정"
            title="성경방 설정"
          >
            <Settings size={19} />
          </button>
        </div>
        <nav className="grid grid-cols-3 gap-2 pb-3">
          <TabButton dataGuide="bible-tab-bible" active={activeTab === "bible"} onClick={() => selectTab("bible")} icon={<BookOpen size={16} />} label="성경" />
          <TabButton dataGuide="bible-tab-sharing" active={activeTab === "sharing"} onClick={() => selectTab("sharing")} icon={<MessageCircle size={16} />} label="나눔" />
          <TabButton dataGuide="bible-tab-plan" active={activeTab === "plan"} onClick={() => selectTab("plan")} icon={<CalendarDays size={16} />} label="플랜" />
        </nav>
      </header>

      {activeTab === "bible" && currentChapter ? (
        <div
          className="fixed left-1/2 top-0 z-30 flex h-11 w-full max-w-xl items-center justify-center border-b border-slate-200 bg-white/95 px-4 text-sm font-black text-slate-950 shadow-soft backdrop-blur will-change-transform dark:border-slate-800 dark:bg-slate-950/95 dark:text-slate-50"
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
          selectedDate={readingDate}
          planDateRange={planDateRange}
          onSelectDate={setReadingDate}
          chapters={chapters}
          currentChapter={currentChapter}
          chapterIndex={chapterIndex}
          readingLoading={readingLoading}
          isCompleted={Boolean(selectedPlanDay?.isCompleted)}
          completing={completing}
          onToggleComplete={selectedPlanDay ? toggleComplete : undefined}
          onPrev={() => setChapterIndex((index) => Math.max(0, index - 1))}
          onNext={() => setChapterIndex((index) => Math.min(chapters.length - 1, index + 1))}
          onFirst={() => setChapterIndex(0)}
          onLast={() => setChapterIndex(Math.max(0, chapters.length - 1))}
          onChapterJump={holdCompactReadingHeader}
          translation={translation}
          fontSize={bibleFontSize}
          lineHeight={bibleLineHeight}
          onReflect={setReflectionTarget}
          onToast={showToast}
          guideStepKey={guideOpen ? activeBibleGuideSteps[guideStepIndex]?.key : null}
        />
      ) : null}

      {activeTab === "sharing" ? (
        <SharingTab
          reflections={reflections}
          loading={feedLoading}
          nextCursor={nextCursor}
          sentinelRef={sentinelRef}
          translation={translation}
          onOpenPassage={openPassage}
          onEdit={setEditingReflection}
          onDelete={deleteReflection}
          onToast={showToast}
          onToggleReaction={toggleReflectionReaction}
          guideActive={guideOpen && activeBibleGuideSteps[guideStepIndex]?.key === "sharing"}
        />
      ) : null}

      {activeTab === "plan" ? (
        <PlanTab
          members={members}
          days={planDays}
          selectedDate={planSelectedDate}
          planDateRange={planDateRange}
          progress={progress}
          onSelectDate={setPlanSelectedDate}
        />
      ) : null}

      <BibleRoomSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        room={room}
        currentUserId={currentUserId}
        members={members}
        reflections={reflections}
        translationLabel={bibleTranslationLabels[translation]}
        fontSize={bibleFontSize}
        lineHeight={bibleLineHeight}
        darkMode={darkMode}
        onFontSizeChange={selectBibleFontSize}
        onLineHeightChange={selectBibleLineHeight}
        onDarkModeChange={selectDarkMode}
        onInfo={() => setInfoOpen(true)}
        onTranslation={() => setTranslationOpen(true)}
        onManage={() => setManageOpen(true)}
        onLeave={leaveRoom}
        onHistory={openMemberHistory}
        onToast={showToast}
      />
      <BibleRoomActionGuide
        open={guideOpen}
        steps={activeBibleGuideSteps}
        stepIndex={guideStepIndex}
        onClose={finishGuide}
        onBack={() => setGuideStepIndex((index) => Math.max(0, index - 1))}
        onNext={advanceGuide}
      />
      <BibleTranslationModal
        open={translationOpen}
        selected={translation}
        onClose={() => setTranslationOpen(false)}
        onSelect={selectTranslation}
      />
      <BibleRoomInfoModal room={room} open={infoOpen} onClose={() => setInfoOpen(false)} />
      <BibleRoomManageModal
        room={room}
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        onToast={showToast}
      />
      <MemberReflectionHistoryModal
        member={historyMember}
        reflections={historyReflections}
        loading={historyLoading}
        onClose={() => {
          setHistoryMember(null);
          setHistoryReflections([]);
        }}
      />

      <ReflectionComposeScreen
        target={reflectionTarget}
        onClose={() => setReflectionTarget(null)}
        onSubmit={saveReflection}
      />
      <ReflectionEditScreen
        reflection={editingReflection}
        translation={translation}
        onClose={() => setEditingReflection(null)}
        onSubmit={updateReflection}
      />
      <PassageModal passage={passage} translation={translation} onClose={() => setPassage(null)} />
    </main>
  );
}



type BibleActionGuideStepKey = "date" | "reading" | "verse" | "complete" | "sharing" | "plan" | "settings";

type BibleActionGuideStep = {
  key: BibleActionGuideStepKey;
  selector: string;
  extraSelector?: string;
  description: string;
};

const bibleActionGuideSteps: BibleActionGuideStep[] = [
  {
    key: "date",
    selector: '[data-guide="bible-date"]',
    description: "상단 날짜에서 읽을 플랜 날짜를 고를 수 있어요."
  },
  {
    key: "reading",
    selector: '[data-guide="bible-chapter-header"], [data-guide="bible-reading"]',
    description: "말씀 영역은 좌우로 밀거나 아래 버튼으로 장을 넘길 수 있어요."
  },
  {
    key: "verse",
    selector: '[data-guide="bible-verse"], [data-guide="bible-chapter-header"]',
    extraSelector: '[data-guide="bible-verse-tools"]',
    description: "구절을 누르면 복사와 묵상 작성 버튼을 사용할 수 있어요."
  },
  {
    key: "complete",
    selector: '[data-guide="bible-complete"], [data-guide="bible-bottom-nav"], [data-guide="bible-chapter-header"]',
    description: "말씀 맨 아래에서 장을 이동하고, 마지막 장에서는 읽기 완료를 체크해요."
  },
  {
    key: "sharing",
    selector: '[data-guide="sharing-actions"], [data-guide="sharing-card"], [data-guide="sharing-feed"]',
    description: "나눔 카드를 누르면 복사, 수정, 삭제 버튼이 아래에 열려요."
  },
  {
    key: "plan",
    selector: '[data-guide="plan-calendar"]',
    description: "플랜 탭에서는 완료와 나눔 여부, 달성률을 확인해요."
  },
  {
    key: "settings",
    selector: '[data-guide="bible-settings-button"]',
    description: "설정에서 번역본, 글씨 크기, 줄 간격과 다크모드를 바꿔요."
  }
];

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function queryGuideElement(selector: string) {
  const selectors = selector.split(",").map((part) => part.trim()).filter(Boolean);

  for (const currentSelector of selectors) {
    const element = document.querySelector<HTMLElement>(currentSelector);
    if (element) return element;
  }

  return null;
}

function BibleRoomActionGuide({
  open,
  steps,
  stepIndex,
  onClose,
  onBack,
  onNext
}: {
  open: boolean;
  steps: BibleActionGuideStep[];
  stepIndex: number;
  onClose: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [extraRect, setExtraRect] = useState<SpotlightRect | null>(null);
  const [backRect, setBackRect] = useState<SpotlightRect | null>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  const updateSpotlight = useCallback(() => {
    if (!open || !step) return;

    setViewport((current) => (
      current.width === window.innerWidth && current.height === window.innerHeight
        ? current
        : { width: window.innerWidth, height: window.innerHeight }
    ));

    const getRect = (element: HTMLElement) => {
      const padding = 10;
      const box = element.getBoundingClientRect();
      const width = Math.min(window.innerWidth - 16, box.width + padding * 2);
      const height = Math.min(window.innerHeight - 16, box.height + padding * 2);

      return {
        top: clamp(box.top - padding, 8, Math.max(8, window.innerHeight - height - 8)),
        left: clamp(box.left - padding, 8, Math.max(8, window.innerWidth - width - 8)),
        width,
        height
      };
    };

    const setStableRect = (setter: typeof setRect, nextRect: SpotlightRect | null) => {
      setter((current) => {
        if (!nextRect) return current === null ? current : null;
        return current
          && Math.abs(current.top - nextRect.top) < 1
          && Math.abs(current.left - nextRect.left) < 1
          && Math.abs(current.width - nextRect.width) < 1
          && Math.abs(current.height - nextRect.height) < 1
            ? current
            : nextRect;
      });
    };

    const element = queryGuideElement(step.selector);
    setStableRect(setRect, element ? getRect(element) : null);

    const extraElement = step.extraSelector ? queryGuideElement(step.extraSelector) : null;
    setStableRect(setExtraRect, extraElement ? getRect(extraElement) : null);

    const backElement = queryGuideElement('[data-guide="bible-back-button"]');
    setStableRect(setBackRect, backElement ? getRect(backElement) : null);
  }, [open, step]);

  useEffect(() => {
    if (!open) return;

    const update = () => updateSpotlight();
    const timers = [30, 120, 260, 520, 900, 1400].map((delay) => window.setTimeout(update, delay));
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update);
    };
  }, [open, stepIndex, updateSpotlight]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [open]);

  if (!open || !step) return null;

  const pulseStyles = [rect, extraRect]
    .filter((target): target is SpotlightRect => Boolean(target))
    .map((target) => ({
      top: target.top,
      left: target.left,
      width: target.width,
      height: target.height,
      borderRadius: 16
    } satisfies CSSProperties));

  const tipWidth = Math.min(340, Math.max(0, viewport.width - 32));
  const tipLeft = rect
    ? clamp(rect.left + rect.width / 2 - tipWidth / 2, 16, Math.max(16, viewport.width - tipWidth - 16))
    : 16;
  const estimatedTipHeight = step.key === "reading" ? 198 : 118;
  const preferredTipTop = rect
    ? rect.top + rect.height + 10 <= viewport.height - estimatedTipHeight
      ? rect.top + rect.height + 10
      : rect.top - estimatedTipHeight - 10
    : 96;
  const tipStyle: CSSProperties = viewport.width
    ? {
        width: tipWidth,
        left: tipLeft,
        top: clamp(preferredTipTop, 16, Math.max(16, viewport.height - estimatedTipHeight - 16))
      }
    : { left: 16, right: 16, bottom: 16 };

  return (
    <div className="pointer-events-none fixed inset-0 z-[80]">
      {(backRect
        ? [
            { left: 0, top: 0, width: viewport.width, height: backRect.top },
            { left: 0, top: backRect.top, width: backRect.left, height: backRect.height },
            { left: backRect.left + backRect.width, top: backRect.top, width: Math.max(0, viewport.width - backRect.left - backRect.width), height: backRect.height },
            { left: 0, top: backRect.top + backRect.height, width: viewport.width, height: Math.max(0, viewport.height - backRect.top - backRect.height) }
          ]
        : [{ left: 0, top: 0, width: viewport.width, height: viewport.height }]
      ).map((blocker, index) => (
        <div
          key={`guide-blocker-${index}`}
          className="pointer-events-auto fixed"
          style={blocker}
          onClick={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.preventDefault()}
          onWheel={(event) => event.preventDefault()}
        />
      ))}
      {pulseStyles.map((pulseStyle, index) => (
        <div key={`${step.key}-${index}`} className="absolute" style={pulseStyle}>
          <div className="absolute inset-0 rounded-[inherit] border-2 border-teal-400/90 shadow-[0_0_20px_rgba(45,212,191,0.55)] guide-target-pulse" />
          <div className="absolute -inset-2 rounded-[inherit] border-2 border-teal-300/55 guide-target-ripple" />
        </div>
      ))}
      <div className="pointer-events-auto fixed max-w-[calc(100%-2rem)]" style={tipStyle}>
        <div className="rounded-xl border border-teal-200 bg-teal-50/95 p-3 text-teal-950 shadow-[0_16px_38px_rgba(13,148,136,0.28)] ring-1 ring-white/70 backdrop-blur dark:border-teal-700/70 dark:bg-teal-950/95 dark:text-teal-50 dark:shadow-[0_16px_40px_rgba(0,0,0,0.45)] dark:ring-teal-400/10">
          <p className="text-sm font-black leading-5">{step.description}</p>
          <div className="mt-2.5 grid grid-cols-[auto_1fr_auto] items-center gap-2">
            <button type="button" onClick={onClose} className="text-xs font-black text-teal-700/70 dark:text-teal-200/70">
              건너뛰기
            </button>
            <div className="justify-self-center rounded-full bg-white/75 px-2 py-0.5 text-[11px] font-black text-teal-700 shadow-sm dark:bg-slate-900/70 dark:text-teal-200">
              {stepIndex + 1}/{steps.length}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onBack}
                disabled={stepIndex === 0}
                className="grid h-8 w-8 place-items-center rounded-full bg-white/80 text-teal-800 shadow-sm disabled:opacity-30 dark:bg-slate-900/80 dark:text-teal-100"
                aria-label="이전 사용법"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={onNext}
                className="inline-flex h-8 min-w-[4.2rem] items-center justify-center whitespace-nowrap rounded-full bg-teal-700 px-3 text-xs font-black text-white shadow-sm dark:bg-teal-500 dark:text-slate-950"
              >
                {isLast ? "시작" : "다음"}
              </button>
            </div>
          </div>
        </div>
        {step.key === "reading" ? (
          <div
            className="pointer-events-none relative mx-auto mt-3 flex h-16 w-64 max-w-[calc(100vw-3rem)] items-center justify-between rounded-full px-8"
            aria-hidden
          >
            <div className="absolute inset-0 rounded-full border-2 border-teal-400/90 shadow-[0_0_24px_rgba(45,212,191,0.55)] guide-swipe-pulse" />
            <div className="absolute -inset-2 rounded-full border-2 border-teal-300/55 guide-swipe-ripple" />
            <div className="relative grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-white/95 text-teal-700 shadow-lg backdrop-blur guide-swipe-hint-left dark:border-slate-700 dark:bg-slate-900/95 dark:text-teal-200">
              <ChevronLeft size={28} strokeWidth={2.8} />
            </div>
            <div className="relative grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-white/95 text-teal-700 shadow-lg backdrop-blur guide-swipe-hint-right dark:border-slate-700 dark:bg-slate-900/95 dark:text-teal-200">
              <ChevronRight size={28} strokeWidth={2.8} />
            </div>
          </div>
        ) : null}
      </div>
      <style jsx global>{`
        @keyframes bible-guide-target-pulse {
          0%, 100% { transform: scale(1); opacity: 0.95; }
          50% { transform: scale(1.045); opacity: 0.55; }
        }
        @keyframes bible-guide-target-ripple {
          0% { transform: scale(0.98); opacity: 0.7; }
          100% { transform: scale(1.16); opacity: 0; }
        }
        @keyframes bible-guide-swipe-left {
          0%, 100% { transform: translateX(0) scale(1); opacity: 0.62; }
          50% { transform: translateX(-18px) scale(1.08); opacity: 0.98; }
        }
        @keyframes bible-guide-swipe-right {
          0%, 100% { transform: translateX(0) scale(1); opacity: 0.62; }
          50% { transform: translateX(18px) scale(1.08); opacity: 0.98; }
        }
        .guide-target-pulse { animation: bible-guide-target-pulse 1.1s ease-in-out infinite; }
        .guide-target-ripple { animation: bible-guide-target-ripple 1.1s ease-out infinite; }
        .guide-swipe-pulse { animation: bible-guide-target-pulse 1.1s ease-in-out infinite; }
        .guide-swipe-ripple { animation: bible-guide-target-ripple 1.1s ease-out infinite; }
        .guide-swipe-hint-left { animation: bible-guide-swipe-left 1.2s ease-in-out infinite; }
        .guide-swipe-hint-right { animation: bible-guide-swipe-right 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function TabButton({ active, icon, label, dataGuide, onClick }: { active: boolean; icon: ReactNode; label: string; dataGuide?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-guide={dataGuide}
      className={`flex h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-black ${
        active ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BibleRoomSettingsDrawer({
  open,
  onClose,
  room,
  currentUserId,
  members,
  reflections,
  translationLabel,
  fontSize,
  lineHeight,
  darkMode,
  onFontSizeChange,
  onLineHeightChange,
  onDarkModeChange,
  onInfo,
  onTranslation,
  onManage,
  onLeave,
  onHistory,
  onToast
}: {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  room: RoomDetail;
  members: RoomMember[];
  reflections: Reflection[];
  translationLabel: string;
  fontSize: BibleFontSize;
  lineHeight: BibleLineHeight;
  darkMode: boolean;
  onFontSizeChange: (fontSize: BibleFontSize) => void;
  onLineHeightChange: (lineHeight: BibleLineHeight) => void;
  onDarkModeChange: (enabled: boolean) => void;
  onInfo: () => void;
  onTranslation: () => void;
  onManage: () => void;
  onLeave: () => void;
  onHistory: (member: RoomMember) => void;
  onToast: (message: string) => void;
}) {
  const router = useRouter();

  async function kick(member: RoomMember) {
    if (!confirm(`${member.nickname ?? "멤버"}님을 내보내시겠습니까?`)) return;

    const res = await fetch(`/api/bible-rooms/${room.id}/members/${member.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      onToast(data.error ?? "멤버 내보내기에 실패했습니다.");
      return;
    }

    router.refresh();
  }

  return (
    <div className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}>
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 z-0 bg-slate-950/30 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        aria-label="설정 닫기"
      />
      <aside
        data-guide="bible-settings"
        className={`absolute right-0 top-0 z-10 h-full w-[86%] max-w-sm overflow-y-auto overscroll-contain bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft transition-transform dark:bg-slate-950 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">성경방 설정</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 dark:border-slate-700 dark:text-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="mb-6 grid gap-2">
          <button type="button" onClick={onInfo} className="rounded-lg bg-slate-100 px-4 py-3 text-left font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
            방 정보
          </button>
          <button
            type="button"
            onClick={onTranslation}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-4 py-3 text-left font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <span>번역본 설정</span>
            <span className="shrink-0 text-xs font-black text-teal-700 dark:text-teal-300">{translationLabel}</span>
          </button>
          <div className="rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-bold text-slate-800 dark:text-slate-100">성경본문 글씨 크기</p>
              <span className="shrink-0 text-xs font-black text-teal-700 dark:text-teal-300">{bibleFontSizeLabels[fontSize]}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(bibleFontSizeLabels) as BibleFontSize[]).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => onFontSizeChange(size)}
                  className={`min-h-9 rounded-lg text-xs font-black transition ${
                    fontSize === size
                      ? "bg-teal-700 text-white"
                      : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {size === "small" ? "A-" : size === "normal" ? "A" : size === "large" ? "A+" : "A++"}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-bold text-slate-800 dark:text-slate-100">성경본문 줄 간격</p>
              <span className="shrink-0 text-xs font-black text-teal-700 dark:text-teal-300">{bibleLineHeightLabels[lineHeight]}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(bibleLineHeightLabels) as BibleLineHeight[]).map((height) => (
                <button
                  key={height}
                  type="button"
                  onClick={() => onLineHeightChange(height)}
                  className={`min-h-9 rounded-lg text-xs font-black transition ${
                    lineHeight === height
                      ? "bg-teal-700 text-white"
                      : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {height === "compact" ? "좁게" : height === "normal" ? "기본" : height === "relaxed" ? "넓게" : "아주 넓게"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-900">
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-100">다크모드</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">이 성경방에서만 유지됩니다.</p>
            </div>
            <button
              type="button"
              onClick={() => onDarkModeChange(!darkMode)}
              className={`relative h-7 w-12 rounded-full transition ${darkMode ? "bg-teal-600" : "bg-slate-300"}`}
              aria-pressed={darkMode}
              aria-label="성경방 다크모드"
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${darkMode ? "left-6" : "left-1"}`}
              />
            </button>
          </div>
          {room.isCreator ? (
            <button type="button" onClick={onManage} className="rounded-lg bg-slate-100 px-4 py-3 text-left font-bold text-slate-800 dark:bg-slate-900 dark:text-slate-100">
              방 관리
            </button>
          ) : null}
          {!room.isCreator ? (
            <button type="button" onClick={onLeave} className="touch-manipulation rounded-lg bg-rose-50 px-4 py-3 text-left font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              방 나가기
            </button>
          ) : null}
        </div>

        <h3 className="mb-3 text-sm font-black text-slate-500 dark:text-slate-400">멤버 {members.length}</h3>
        <div className="grid gap-2">
          {members.map((member) => {
            const isMe = member.userId === currentUserId;

            return (
              <div key={member.id} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                    <span className="truncate">{member.nickname ?? "닉네임 없음"}</span>
                    {member.role === "creator" ? <Crown className="shrink-0 text-amber-500" size={16} /> : null}
                    {isMe ? (
                      <span className="shrink-0 rounded-full bg-teal-50 px-1.5 py-0.5 text-[10px] font-black leading-none text-teal-700 ring-1 ring-teal-100 dark:bg-teal-950/50 dark:text-teal-200 dark:ring-teal-900">
                        ME
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">묵상 {reflections.filter((reflection) => reflection.userId === member.userId).length}개</p>
                </div>
                <button
                  type="button"
                  onClick={() => onHistory(member)}
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label="묵상 history"
                >
                  <History size={17} />
                </button>
                {room.isCreator && member.role !== "creator" ? (
                  <button
                    type="button"
                    onClick={() => kick(member)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                    aria-label="멤버 내보내기"
                  >
                    <Trash2 size={17} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}

function BibleRoomInfoModal({ room, open, onClose }: { room: RoomDetail; open: boolean; onClose: () => void }) {
  const scopeLabel = scopeLabels[room.scope] ?? room.scope;
  const planTypeLabel = planTypeLabels[room.planType] ?? room.planType;
  const createdDate = new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(room.createdAt));

  return (
    <Modal title="성경방 정보" open={open} onClose={onClose}>
      <div className="grid gap-4">
        <section className="rounded-xl border border-teal-100 bg-teal-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-[11px] font-black text-teal-700 dark:text-teal-300">BIBLE ROOM</p>
          <h3 className="mt-1 break-words text-xl font-black text-slate-950 dark:text-slate-50">{room.title}</h3>
          {room.description ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">{room.description}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-white px-3 py-1.5 text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">{scopeLabel}</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{room.durationMonths}개월</span>
            <span className="rounded-full bg-white px-3 py-1.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200">{planTypeLabel}</span>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 text-sm">
          <InfoTile label="방장" value={room.creatorNickname ?? "알 수 없음"} />
          <InfoTile label="주일 제외" value={room.excludeSunday ? "예" : "아니오"} />
          <InfoTile label="통독 범위" value={scopeLabel} />
          <InfoTile label="통독 방식" value={planTypeLabel} />
        </section>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-black text-slate-400 dark:text-slate-500">생성일자</p>
          <p className="mt-1 font-bold text-slate-900 dark:text-slate-100">{createdDate}</p>
        </div>
      </div>
    </Modal>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-transparent bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-black text-slate-400 dark:text-slate-500">{label}</p>
      <p className="mt-1 break-words font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function BibleTranslationModal({
  open,
  selected,
  onClose,
  onSelect
}: {
  open: boolean;
  selected: BibleTranslationCode;
  onClose: () => void;
  onSelect: (translation: BibleTranslationCode) => void;
}) {
  const options = Object.entries(bibleTranslationLabels) as Array<[BibleTranslationCode, string]>;

  return (
    <Modal title="번역본 설정" open={open} onClose={onClose}>
      <div className="grid gap-2">
        {options.map(([code, label]) => {
          const active = selected === code;

          return (
            <button
              key={code}
              type="button"
              onClick={() => {
                onSelect(code);
                onClose();
              }}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition ${
                active
                  ? "border-teal-200 bg-teal-50 text-teal-900"
                  : "border-slate-200 bg-white text-slate-800"
              }`}
            >
              <span className="font-black">{label}</span>
              {active ? (
                <span className="grid h-6 w-6 place-items-center rounded-full bg-teal-700 text-white">
                  <Check size={15} strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function BibleRoomManageModal({
  room,
  open,
  onClose,
  onToast
}: {
  room: RoomDetail;
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(room.title);
  const [description, setDescription] = useState(room.description);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await fetch(`/api/bible-rooms/${room.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, password })
    });
    const data = (await res.json()) as { error?: string };
    setLoading(false);

    if (!res.ok) {
      onToast(data.error ?? "성경방 관리 저장에 실패했습니다.");
      return;
    }

    onClose();
    router.refresh();
  }

  async function deleteRoom() {
    if (!confirm("성경방을 삭제하시겠습니까? 모든 멤버의 목록에서 제거됩니다.")) return;

    const res = await fetch(`/api/bible-rooms/${room.id}`, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      onToast(data.error ?? "성경방 삭제에 실패했습니다.");
      return;
    }

    router.push("/bible-room");
    router.refresh();
  }

  return (
    <Modal title="성경방 관리" open={open} onClose={onClose}>
      <div className="grid gap-3">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
          placeholder="방 제목"
          maxLength={40}
        />
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-24 rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
          placeholder="방 설명"
          maxLength={300}
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-teal-500"
          placeholder="새 비밀번호, 변경하지 않으면 비워두세요"
          type="password"
        />
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="rounded-lg bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-60"
        >
          저장
        </button>
        <button
          type="button"
          onClick={deleteRoom}
          className="rounded-lg border border-rose-200 px-4 py-3 font-bold text-rose-700"
        >
          성경방 삭제
        </button>
      </div>
    </Modal>
  );
}

function MemberReflectionHistoryModal({
  member,
  reflections,
  loading,
  onClose
}: {
  member: RoomMember | null;
  reflections: Reflection[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal title={`${member?.nickname ?? "멤버"} history`} open={Boolean(member)} onClose={onClose}>
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">묵상 내역을 불러오는 중입니다.</p>
        ) : reflections.length ? (
          <div className="grid gap-3">
            {reflections.map((reflection) => (
              <article key={reflection.id} className="rounded-lg bg-slate-50 p-3">
                <time className="text-xs font-bold text-slate-400">
                  {new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(reflection.createdAt))}
                </time>
                <p className="mt-1 text-xs font-black text-teal-700">
                  {reflection.bookName ?? reflection.bookCode} {reflection.chapter}:{reflection.verse}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{reflection.content}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-slate-50 p-4 text-center text-sm text-slate-500">불러온 묵상 내역이 없습니다.</p>
        )}
      </div>
    </Modal>
  );
}

const BIBLE_GUIDE_SAMPLE_CHAPTER: ReadingChapter = {
  bookCode: "MAT",
  bookName: "마태복음",
  chapter: 7,
  verses: [
    {
      verse: 1,
      content: {
        ko_krv: "비판을 받지 아니하려거든 비판하지 말라",
        ko_nkrv: "비판을 받지 아니하려거든 비판하지 말라"
      },
      reflectionCount: 0,
      myReflectionId: null
    },
    {
      verse: 2,
      content: {
        ko_krv: "너희의 비판하는 그 비판으로 너희가 비판을 받을 것이요 너희의 헤아리는 그 헤아림으로 너희가 헤아림을 받을 것이니라",
        ko_nkrv: "너희가 비판하는 그 비판으로 너희가 비판을 받을 것이요 너희가 헤아리는 그 헤아림으로 너희가 헤아림을 받을 것이니라"
      },
      reflectionCount: 0,
      myReflectionId: null
    },
    {
      verse: 3,
      content: {
        ko_krv: "어찌하여 형제의 눈 속에 있는 티는 보고 네 눈 속에 있는 들보는 깨닫지 못하느냐",
        ko_nkrv: "어찌하여 형제의 눈 속에 있는 티는 보고 네 눈 속에 있는 들보는 깨닫지 못하느냐"
      },
      reflectionCount: 0,
      myReflectionId: null
    }
  ]
};

function BibleTab({
  days,
  selectedDate,
  planDateRange,
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
  onFirst,
  onLast,
  onChapterJump,
  translation,
  fontSize,
  lineHeight,
  onReflect,
  onToast,
  guideStepKey = null
}: {
  days: PlanDay[];
  selectedDate: string;
  planDateRange: DateRange | null;
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
  onFirst: () => void;
  onLast: () => void;
  onChapterJump: () => void;
  translation: BibleTranslationCode;
  fontSize: BibleFontSize;
  lineHeight: BibleLineHeight;
  onReflect: (target: VerseTarget) => void;
  onToast: (message: string) => void;
  guideStepKey?: BibleActionGuideStepKey | null;
}) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const readingTopRef = useRef<HTMLDivElement | null>(null);
  const firstVerseRef = useRef<HTMLDivElement | null>(null);
  const pendingChapterScrollRef = useRef(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<VerseTarget | null>(null);
  const [swipeHint, setSwipeHint] = useState<{ direction: "prev" | "next"; strength: number; offset: number } | null>(null);
  const isGuideSampleChapter = !currentChapter && (guideStepKey === "reading" || guideStepKey === "verse" || guideStepKey === "complete");
  const displayChapter = currentChapter ?? (isGuideSampleChapter ? BIBLE_GUIDE_SAMPLE_CHAPTER : null);
  const displayChapterIndex = isGuideSampleChapter ? 0 : chapterIndex;
  const displayChapterCount = isGuideSampleChapter ? 1 : chapters.length;
  const showCompleteButton = isGuideSampleChapter || (displayChapterIndex >= displayChapterCount - 1 && Boolean(onToggleComplete));

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

  useEffect(() => {
    setSelectedVerse(null);
  }, [currentChapter?.bookCode, currentChapter?.chapter, selectedDate, translation]);

  useEffect(() => {
    if (!guideStepKey) return;

    if (guideStepKey !== "verse") {
      setSelectedVerse(null);
      return;
    }

    if (!displayChapter?.verses.length) return;

    const firstVerse = displayChapter.verses[0];
    setSelectedVerse({
      bookCode: displayChapter.bookCode,
      bookName: displayChapter.bookName,
      chapter: displayChapter.chapter,
      verse: firstVerse.verse,
      text: verseText(firstVerse.content, translation)
    });

    window.requestAnimationFrame(() => {
      firstVerseRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [displayChapter, guideStepKey, translation]);

  function goPrev() {
    if (chapterIndex === 0) return;
    setSwipeHint(null);
    pendingChapterScrollRef.current = true;
    onPrev();
  }

  function goNext() {
    if (chapterIndex >= chapters.length - 1) return;
    setSwipeHint(null);
    pendingChapterScrollRef.current = true;
    onNext();
  }

  function goFirst() {
    if (chapterIndex === 0) return;
    setSwipeHint(null);
    pendingChapterScrollRef.current = true;
    onFirst();
  }

  function goLast() {
    if (chapterIndex >= chapters.length - 1) return;
    setSwipeHint(null);
    pendingChapterScrollRef.current = true;
    onLast();
  }

  function goPrevInPlace() {
    if (chapterIndex === 0) return;
    setSwipeHint(null);
    onPrev();
  }

  function goNextInPlace() {
    if (chapterIndex >= chapters.length - 1) return;
    setSwipeHint(null);
    onNext();
  }

  function clearSwipeHint() {
    setSwipeHint(null);
  }

  function toggleSelectedVerse(target: VerseTarget) {
    setSelectedVerse((current) => {
      const sameVerse = current
        && current.bookCode === target.bookCode
        && current.chapter === target.chapter
        && current.verse === target.verse;

      return sameVerse ? null : target;
    });
  }

  async function copySelectedVerse() {
    if (!selectedVerse) return;

    const citation = `${selectedVerse.bookName} ${selectedVerse.chapter}:${selectedVerse.verse}`;
    await navigator.clipboard.writeText(`${citation} ${selectedVerse.text}`);
    setSelectedVerse(null);
    onToast("구절을 복사했습니다.");
  }

  function reflectSelectedVerse() {
    if (!selectedVerse) return;
    onReflect(selectedVerse);
    setSelectedVerse(null);
  }

  return (
    <section className={`flex-1 bg-white pt-0 dark:bg-slate-950 ${selectedVerse ? "pb-28" : "pb-8"}`}>
      <div className="relative bg-white px-4 pb-1 pt-1 dark:bg-slate-950">
        <button
          type="button"
          onClick={() => {
            setDatePickerOpen((open) => !open);
          }}
          data-guide="bible-date"
          className="flex min-h-11 w-full items-center justify-center gap-2 bg-white px-4 text-base font-black text-slate-900 dark:bg-slate-950 dark:text-slate-50"
          aria-expanded={datePickerOpen}
        >
          <CalendarDays size={17} className="text-teal-700 dark:text-teal-300" />
          {formatDateKey(selectedDate)}
        </button>
        {datePickerOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40 cursor-default bg-transparent"
              onClick={() => setDatePickerOpen(false)}
              aria-label="달력 닫기"
              tabIndex={-1}
            />
            <div data-guide="bible-date-calendar" className="absolute left-4 right-4 top-full z-50 mt-2 rounded-lg border border-slate-200 bg-white p-3 shadow-[0_18px_45px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900">
              <PlanCalendar
                days={days}
                selectedDate={selectedDate}
                planDateRange={planDateRange}
                onSelectDate={(date) => {
                  onSelectDate(date);
                  setDatePickerOpen(false);
                }}
                compact
              />
            </div>
          </>
        ) : null}
      </div>

      <div
        ref={readingTopRef}
        data-reading-area="true"
        className="scroll-mt-12"
        onTouchStart={(event) => {
          const touch = event.touches[0];
          touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
        }}
        onTouchMove={(event) => {
          const start = touchStartRef.current;
          const touch = event.touches[0];
          if (!start || !touch) return;

          const deltaX = touch.clientX - start.x;
          const deltaY = touch.clientY - start.y;
          if (Math.abs(deltaX) < 16 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) {
            setSwipeHint(null);
            return;
          }

          const direction = deltaX > 0 ? "prev" : "next";
          const canMove = direction === "prev" ? chapterIndex > 0 : chapterIndex < chapters.length - 1;
          if (!canMove) {
            setSwipeHint(null);
            return;
          }

          const distance = Math.abs(deltaX);
          setSwipeHint({
            direction,
            strength: Math.min(1, Math.max(0.2, distance / 110)),
            offset: Math.min(54, distance * 0.45)
          });
        }}
        onTouchCancel={() => {
          touchStartRef.current = null;
          setSwipeHint(null);
        }}
        onTouchEnd={(event) => {
          const start = touchStartRef.current;
          const touch = event.changedTouches[0];
          touchStartRef.current = null;
          if (!start || !touch) {
            setSwipeHint(null);
            return;
          }

          const deltaX = touch.clientX - start.x;
          const deltaY = touch.clientY - start.y;
          if (Math.abs(deltaX) > 45 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
            event.preventDefault();
            if (deltaX < 0) goNext();
            if (deltaX > 0) goPrev();
          }
          clearSwipeHint();
        }}
      >
        {readingLoading ? (
          <div data-guide="bible-reading" className="border-b border-slate-100 bg-white p-6 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">본문을 불러오는 중입니다.</div>
        ) : displayChapter ? (
          <article data-guide="bible-reading" className="bg-white px-4 pb-4 pt-3 dark:bg-slate-950">
            {swipeHint ? (
              <div
                className="pointer-events-none fixed top-1/2 z-40 grid h-12 w-12 place-items-center rounded-full border border-white/80 bg-white/95 text-teal-700 shadow-lg backdrop-blur"
                style={{
                  left: `calc(50% + ${swipeHint.direction === "next" ? 74 + swipeHint.offset : -122 - swipeHint.offset}px)`,
                  opacity: Math.min(0.95, swipeHint.strength),
                  transform: "translateY(-50%)"
                }}
                aria-hidden
              >
                {swipeHint.direction === "prev" ? <ChevronLeft size={28} strokeWidth={2.8} /> : <ChevronRight size={28} strokeWidth={2.8} />}
              </div>
            ) : null}
            <div data-guide="bible-chapter-header" className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goPrevInPlace}
                disabled={displayChapterIndex === 0}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-700 dark:text-slate-200"
                aria-label="이전 장"
                title="이전 장"
              >
                <ChevronLeft size={19} />
              </button>
              <div className="min-w-0 text-center">
                <h2 className="truncate text-lg font-black text-slate-950 dark:text-slate-50">{displayChapter.bookName} {displayChapter.chapter}장</h2>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">{displayChapterIndex + 1} / {displayChapterCount}</p>
              </div>
              <button
                type="button"
                onClick={goNextInPlace}
                disabled={displayChapterIndex >= displayChapterCount - 1}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-700 disabled:opacity-30 dark:border-slate-700 dark:text-slate-200"
                aria-label="다음 장"
                title="다음 장"
              >
                <ChevronRight size={19} />
              </button>
            </div>
            <div ref={firstVerseRef} className={`grid scroll-mt-12 ${lineHeight === "compact" ? "gap-0" : "gap-1.5"}`}>
              {displayChapter.verses.map((verse, index) => (
                <VerseRow
                  key={verse.verse}
                  chapter={displayChapter}
                  verse={verse}
                  translation={translation}
                  fontSize={fontSize}
                  lineHeight={lineHeight}
                  selected={Boolean(
                    selectedVerse
                      && selectedVerse.bookCode === displayChapter.bookCode
                      && selectedVerse.chapter === displayChapter.chapter
                      && selectedVerse.verse === verse.verse
                  )}
                  guideTarget={index === 0}
                  onToggle={toggleSelectedVerse}
                />
              ))}
            </div>
            <div data-guide="bible-bottom-nav" className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              {displayChapterIndex > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    goFirst();
                  }}
                  className="min-h-12 w-12 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  시작
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  goPrev();
                }}
                disabled={displayChapterIndex === 0}
                className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <ChevronLeft size={17} />
                이전 장
              </button>
              <button
                type="button"
                onClick={() => {
                  goNext();
                }}
                disabled={displayChapterIndex >= displayChapterCount - 1}
                className="flex min-h-12 flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-black text-slate-700 disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                다음 장
                <ChevronRight size={17} />
              </button>
              {displayChapterIndex < displayChapterCount - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    goLast();
                  }}
                  className="min-h-12 w-12 rounded-lg border border-slate-200 bg-white px-2 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  끝
                </button>
              ) : null}
            </div>
            {showCompleteButton ? (
              <button
                type="button"
                onClick={isGuideSampleChapter ? undefined : onToggleComplete}
                disabled={completing}
                data-guide="bible-complete"
                className={`mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 font-black transition disabled:opacity-60 ${
                  isCompleted
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
                    : "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400"
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
          <div data-guide="bible-reading">
            <RestDayMessage />
          </div>
        )}
      </div>

      {selectedVerse ? (
        <div
          data-guide="bible-verse-tools"
          className="fixed left-1/2 z-30 w-[15.5rem] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.20)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <p className="mb-1 truncate text-center text-[11px] font-black text-slate-500 dark:text-slate-400">
            {selectedVerse.bookName} {selectedVerse.chapter}:{selectedVerse.verse}
          </p>
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={copySelectedVerse}
              data-guide="bible-verse-copy"
              className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-slate-100 px-2.5 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            >
              <Clipboard size={14} />
              복사
            </button>
            <button
              type="button"
              onClick={reflectSelectedVerse}
              className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-teal-700 px-2.5 text-xs font-black text-white"
            >
              <Pencil size={14} />
              묵상 작성
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function VerseRow({
  chapter,
  verse,
  translation,
  fontSize,
  lineHeight,
  selected,
  guideTarget = false,
  onToggle
}: {
  chapter: ReadingChapter;
  verse: ReadingVerse;
  translation: BibleTranslationCode;
  fontSize: BibleFontSize;
  lineHeight: BibleLineHeight;
  selected: boolean;
  guideTarget?: boolean;
  onToggle: (target: VerseTarget) => void;
}) {
  const text = verseText(verse.content, translation);

  return (
    <div data-guide={guideTarget ? "bible-verse" : undefined} className={`rounded-md px-1 transition ${lineHeight === "compact" ? "py-0.5" : "py-1.5"} ${selected ? "bg-teal-50 dark:bg-teal-950/50" : "hover:bg-slate-50 dark:hover:bg-slate-900/70"}`}>
      <button
        type="button"
        onClick={() => {
          onToggle({
            bookCode: chapter.bookCode,
            bookName: chapter.bookName,
            chapter: chapter.chapter,
            verse: verse.verse,
            text
          });
        }}
        className={`w-full rounded-md px-1 text-left transition ${bibleFontSizeClasses[fontSize]} ${bibleLineHeightClasses[lineHeight]} ${selected ? "text-teal-950 dark:text-teal-100" : "text-slate-800 dark:text-slate-100"}`}
      >
        <span className="mr-2 align-baseline text-xs font-black text-teal-700 dark:text-teal-300">{verseLabel(verse.content, verse.verse)}</span>
        {text}
        {verse.myReflectionId ? <span className="ml-1 align-baseline">❤️</span> : null}
      </button>
    </div>
  );
}

function SharingTab({
  reflections,
  loading,
  nextCursor,
  sentinelRef,
  translation,
  onOpenPassage,
  onEdit,
  onDelete,
  onToast,
  onToggleReaction,
  guideActive = false
}: {
  reflections: Reflection[];
  loading: boolean;
  nextCursor: string | null;
  sentinelRef: React.RefObject<HTMLDivElement>;
  translation: BibleTranslationCode;
  onOpenPassage: (reflection: Reflection) => void;
  onEdit: (reflection: Reflection) => void;
  onDelete: (reflection: Reflection) => void;
  onToast: (message: string) => void;
  onToggleReaction: (reflection: Reflection, type: BibleReflectionReactionType) => Promise<boolean>;
  guideActive?: boolean;
}) {
  const [selectedReflectionId, setSelectedReflectionId] = useState<string | null>(null);
  const selectedReflection = useMemo(
    () => reflections.find((reflection) => reflection.id === selectedReflectionId) ?? null,
    [reflections, selectedReflectionId]
  );
  const guideSampleReflection = useMemo<Reflection>(() => ({
    id: "bible-guide-sample-reflection",
    bookCode: "MAT",
    bookName: "마태복음",
    chapter: 7,
    verse: 3,
    verseContent: {
      ko_krv: "어찌하여 형제의 눈 속에 있는 티는 보고 네 눈 속에 있는 들보는 깨닫지 못하느냐",
      ko_nkrv: "어찌하여 형제의 눈 속에 있는 티는 보고 네 눈 속에 있는 들보는 깨닫지 못하느냐"
    },
    planDate: null,
    content: "이 말씀을 붙들고 내 마음을 먼저 돌아보려 합니다.",
    createdAt: "2026-06-20T00:00:00.000Z",
    userId: "guide-sample-user",
    authorNickname: "가이드",
    isMine: true,
    prayCount: 1,
    likeCount: 1,
    heartCount: 1,
    isPrayedByMe: false,
    isLikedByMe: false,
    isHeartedByMe: false
  }), []);
  const guideHasSample = guideActive && reflections.length === 0;
  const actionReflection = selectedReflection ?? (guideHasSample ? guideSampleReflection : null);
  const grouped = useMemo(() => {
    return reflections.reduce<Record<string, Reflection[]>>((acc, reflection) => {
      const key = reflection.planDate ?? reflection.createdAt.slice(0, 10);
      acc[key] = acc[key] ?? [];
      acc[key].push(reflection);
      return acc;
    }, {});
  }, [reflections]);
  const groupedEntries = useMemo(() => {
    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([date, items]) => [
        date,
        [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      ] as const);
  }, [grouped]);

  useEffect(() => {
    if (!selectedReflectionId || selectedReflection) return;
    setSelectedReflectionId(null);
  }, [selectedReflection, selectedReflectionId]);

  useEffect(() => {
    if (!guideActive) return;
    setSelectedReflectionId((current) => current ?? reflections[0]?.id ?? null);
  }, [guideActive, reflections]);

  const copySelectedReflection = useCallback(async () => {
    if (!selectedReflection) return;

    const bookName = selectedReflection.bookName ?? selectedReflection.bookCode;
    const verseNumber = verseLabel(selectedReflection.verseContent, selectedReflection.verse);
    const passageText = verseText(selectedReflection.verseContent, translation);
    const copyText = `[${bookName} ${selectedReflection.chapter}:${verseNumber}]
${passageText}

${selectedReflection.content}`;

    try {
      await navigator.clipboard.writeText(copyText);
      onToast("나눔을 복사했습니다.");
      setSelectedReflectionId(null);
    } catch {
      onToast("복사에 실패했습니다.");
    }
  }, [onToast, selectedReflection, translation]);

  const editSelectedReflection = useCallback(() => {
    if (!selectedReflection || !selectedReflection.isMine) return;
    setSelectedReflectionId(null);
    onEdit(selectedReflection);
  }, [onEdit, selectedReflection]);

  const deleteSelectedReflection = useCallback(() => {
    if (!selectedReflection || !selectedReflection.isMine) return;
    setSelectedReflectionId(null);
    onDelete(selectedReflection);
  }, [onDelete, selectedReflection]);

  return (
    <section data-guide="sharing-feed" className={`flex-1 px-4 pt-4 dark:bg-slate-950 ${actionReflection ? "pb-28" : "pb-8"}`}>
      {groupedEntries.length ? (
        groupedEntries.map(([date, items]) => (
          <div key={date} className="mb-6">
            <div className="mb-3 flex justify-center">
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{formatDate(date)}</span>
            </div>
            <div className="grid gap-3">
              {items.map((reflection, index) => (
                <SharingReflectionCard
                  key={reflection.id}
                  reflection={reflection}
                  guideTarget={guideActive && index === 0}
                  selected={selectedReflection?.id === reflection.id}
                  translation={translation}
                  onSelect={() => setSelectedReflectionId((current) => (current === reflection.id ? null : reflection.id))}
                  onOpenPassage={onOpenPassage}
                  onToggleReaction={onToggleReaction}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        guideHasSample ? (
          <div className="grid gap-3">
            <div className="mb-1 flex justify-center">
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">가이드 예시</span>
            </div>
            <SharingReflectionCard
              reflection={guideSampleReflection}
              guideTarget
              selected
              translation={translation}
              onSelect={() => undefined}
              onOpenPassage={() => undefined}
              onToggleReaction={async () => false}
            />
          </div>
        ) : (
          <div data-guide="sharing-card" className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm leading-6 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
            아직 작성된 묵상이 없습니다.
          </div>
        )
      )}
      <div ref={sentinelRef} className="h-8" />
      {loading ? <p className="text-center text-sm font-bold text-slate-400">불러오는 중입니다.</p> : null}
      {!nextCursor && reflections.length ? <p className="text-center text-xs font-bold text-slate-300">마지막 나눔입니다.</p> : null}

      {actionReflection ? (
        <div
          data-guide="sharing-actions"
          className="fixed left-1/2 z-30 w-[15rem] max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl border border-slate-200/80 bg-white/95 p-2 shadow-[0_14px_40px_rgba(15,23,42,0.20)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <p className="mb-1 truncate text-center text-[11px] font-black text-slate-500 dark:text-slate-400">
            {actionReflection.authorNickname ?? "알 수 없음"}
          </p>
          <div className={`grid gap-1 ${actionReflection.isMine || guideActive ? "grid-cols-3" : "grid-cols-1"}`}>
            <button
              type="button"
              onClick={() => void copySelectedReflection()}
              className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-slate-100 px-2.5 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-100"
            >
              <Clipboard size={14} />
              복사
            </button>
            {actionReflection.isMine || guideActive ? (
              <button
                type="button"
                onClick={editSelectedReflection}
                disabled={!selectedReflection?.isMine}
                className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-teal-700 px-2.5 text-xs font-black text-white disabled:bg-teal-100 disabled:text-teal-700 dark:disabled:bg-teal-950/60 dark:disabled:text-teal-200"
              >
                <Edit3 size={14} />
                수정
              </button>
            ) : null}
            {actionReflection.isMine || guideActive ? (
              <button
                type="button"
                onClick={deleteSelectedReflection}
                disabled={!selectedReflection?.isMine}
                className="flex min-h-10 items-center justify-center gap-1 rounded-xl bg-rose-50 px-2.5 text-xs font-black text-rose-700 disabled:bg-rose-50 disabled:text-rose-400 dark:bg-rose-950/50 dark:text-rose-200 dark:disabled:bg-rose-950/30 dark:disabled:text-rose-300"
              >
                <Trash2 size={14} />
                삭제
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SharingReflectionCard({
  reflection,
  selected,
  translation,
  guideTarget = false,
  onSelect,
  onOpenPassage,
  onToggleReaction
}: {
  reflection: Reflection;
  selected: boolean;
  translation: BibleTranslationCode;
  guideTarget?: boolean;
  onSelect: () => void;
  onOpenPassage: (reflection: Reflection) => void;
  onToggleReaction: (reflection: Reflection, type: BibleReflectionReactionType) => Promise<boolean>;
}) {
  const burstTimerRef = useRef<number | null>(null);
  const [reactionLoading, setReactionLoading] = useState<BibleReflectionReactionType | null>(null);
  const [reactionBurst, setReactionBurst] = useState<{ emoji: string; variant: "pray" | "celebrate"; key: number } | null>(null);

  const showReactionBurst = useCallback((emoji: string, variant: "pray" | "celebrate" = "celebrate") => {
    if (burstTimerRef.current) {
      window.clearTimeout(burstTimerRef.current);
    }

    setReactionBurst({ emoji, variant, key: Date.now() });
    burstTimerRef.current = window.setTimeout(() => {
      setReactionBurst(null);
      burstTimerRef.current = null;
    }, variant === "pray" ? 1550 : 1250);
  }, []);

  async function toggleReaction(type: BibleReflectionReactionType) {
    if (reactionLoading) return;

    const wasActive = type === "PRAY" ? reflection.isPrayedByMe : type === "LIKE" ? reflection.isLikedByMe : reflection.isHeartedByMe;
    setReactionLoading(type);
    try {
      const ok = await onToggleReaction(reflection, type);
      if (ok && !wasActive) showReactionBurst(type === "PRAY" ? "🙏" : type === "LIKE" ? "👍" : "❤️", type === "PRAY" ? "pray" : "celebrate");
    } finally {
      setReactionLoading(null);
    }
  }

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) window.clearTimeout(burstTimerRef.current);
    };
  }, []);

  return (
    <article
      data-guide={guideTarget ? "sharing-card" : undefined}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`cursor-pointer rounded-lg bg-white p-4 shadow-soft transition dark:bg-slate-900 dark:shadow-none ${
        selected ? "ring-2 ring-teal-500 dark:ring-teal-400" : ""
      }`}
    >
      {reactionBurst ? <ReactionEmojiBurst key={reactionBurst.key} emoji={reactionBurst.emoji} variant={reactionBurst.variant} /> : null}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`truncate font-bold ${selected || reflection.isMine ? "text-teal-700 dark:text-teal-300" : "text-slate-900 dark:text-slate-100"}`}>
            {reflection.authorNickname ?? "알 수 없음"}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenPassage(reflection);
            }}
            className="mt-1 text-left text-xs font-black text-slate-500 underline decoration-slate-300 underline-offset-2 dark:text-slate-400 dark:decoration-slate-600"
          >
            {reflection.bookName ?? reflection.bookCode} {reflection.chapter}:{verseLabel(reflection.verseContent, reflection.verse)}
          </button>
        </div>
        <time className="shrink-0 text-xs font-semibold text-slate-400 dark:text-slate-500">
          {new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(reflection.createdAt))}
        </time>
      </div>
      {reflection.verseContent ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenPassage(reflection);
          }}
          className="mb-3 block w-full rounded-lg bg-teal-50 px-3 py-2 text-left text-sm leading-6 text-teal-950 dark:bg-teal-950/50 dark:text-teal-100"
        >
          {verseText(reflection.verseContent, translation)}
        </button>
      ) : null}
      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-300">{reflection.content}</p>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs font-black">
        <ReactionButton
          emoji="🙏"
          label="기도할게요"
          count={reflection.prayCount}
          active={reflection.isPrayedByMe}
          tone="pray"
          loading={reactionLoading === "PRAY"}
          onClick={() => void toggleReaction("PRAY")}
        />
        <ReactionButton
          emoji="👍"
          label="좋아요"
          count={reflection.likeCount}
          active={reflection.isLikedByMe}
          tone="like"
          loading={reactionLoading === "LIKE"}
          onClick={() => void toggleReaction("LIKE")}
        />
        <ReactionButton
          emoji="❤️"
          label="하트"
          count={reflection.heartCount}
          active={reflection.isHeartedByMe}
          tone="heart"
          loading={reactionLoading === "HEART"}
          onClick={() => void toggleReaction("HEART")}
        />
      </div>
    </article>
  );
}

function ReactionButton({
  emoji,
  label,
  count,
  active,
  tone,
  loading,
  onClick
}: {
  emoji: string;
  label: string;
  count: number;
  active: boolean;
  tone: "pray" | "like" | "heart";
  loading: boolean;
  onClick: () => void;
}) {
  const activeClasses = tone === "pray"
    ? "border-amber-200 bg-amber-50 text-amber-800 shadow-[0_6px_16px_rgba(245,158,11,0.14)] dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-200"
    : tone === "like"
      ? "border-sky-200 bg-sky-50 text-sky-700 shadow-[0_6px_16px_rgba(14,165,233,0.16)] dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200"
      : "border-rose-200 bg-rose-50 text-rose-700 shadow-[0_6px_16px_rgba(244,63,94,0.16)] dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200";

  return (
    <button
      type="button"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      disabled={loading}
      aria-pressed={active}
      aria-label={`${label} ${active ? "취소" : "추가"}`}
      title={label}
      className={`inline-flex h-8 items-center gap-1 rounded-full border px-2.5 transition disabled:opacity-60 ${
        active ? activeClasses : "border-slate-200 bg-slate-100 text-slate-500 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      }`}
    >
      <span className="text-sm leading-none" aria-hidden="true">{emoji}</span>
      <span>{count}</span>
    </button>
  );
}

function ReactionEmojiBurst({ emoji, variant = "celebrate" }: { emoji: string; variant?: "pray" | "celebrate" }) {
  const particles = [
    { x: -72, delay: 0, scale: 1.1 },
    { x: -42, delay: 70, scale: 0.9 },
    { x: -12, delay: 20, scale: 1.2 },
    { x: 18, delay: 110, scale: 0.95 },
    { x: 48, delay: 40, scale: 1.15 },
    { x: 78, delay: 150, scale: 0.9 }
  ];

  const isPrayer = variant === "pray";

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-12 z-[60] flex justify-center">
        <div className={isPrayer ? "relative h-36 w-48" : "relative h-32 w-52"}>
          {particles.map((particle, index) => (
            <span
              key={`${particle.x}-${index}`}
              className={`${isPrayer ? "prayer-burst-particle text-3xl" : "reaction-burst-particle text-2xl"} absolute left-1/2 bottom-0 drop-shadow-[0_8px_14px_rgba(15,23,42,0.18)]`}
              style={{
                "--burst-x": `${particle.x}px`,
                "--burst-scale": particle.scale,
                animationDelay: `${particle.delay}ms`
              } as CSSProperties}
              aria-hidden="true"
            >
              {emoji}
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes prayerBurstRise {
          0% { opacity: 0; transform: translate3d(-50%, 24px, 0) scale(0.82); filter: blur(1px); }
          22% { opacity: 0.95; transform: translate3d(calc(-50% + var(--burst-x) * 0.08), 2px, 0) scale(calc(var(--burst-scale) * 0.98)); filter: blur(0); }
          78% { opacity: 0.72; transform: translate3d(calc(-50% + var(--burst-x) * 0.34), -72px, 0) scale(var(--burst-scale)); }
          100% { opacity: 0; transform: translate3d(calc(-50% + var(--burst-x) * 0.45), -104px, 0) scale(0.88); filter: blur(1px); }
        }

        @keyframes reactionBurstRise {
          0% { opacity: 0; transform: translate3d(-50%, 28px, 0) scale(0.72); }
          16% { opacity: 1; transform: translate3d(calc(-50% + var(--burst-x) * 0.22), 0, 0) scale(calc(var(--burst-scale) * 1.08)); }
          72% { opacity: 1; transform: translate3d(calc(-50% + var(--burst-x)), -76px, 0) scale(var(--burst-scale)); }
          100% { opacity: 0; transform: translate3d(calc(-50% + var(--burst-x) * 1.18), -120px, 0) scale(0.82); }
        }

        .reaction-burst-particle {
          animation: reactionBurstRise 1050ms cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
        }

        .prayer-burst-particle {
          animation: prayerBurstRise 1450ms ease-out forwards;
        }
      `}</style>
    </>
  );
}

function PlanTab({
  members,
  days,
  selectedDate,
  planDateRange,
  progress,
  onSelectDate
}: {
  members: RoomMember[];
  days: PlanDay[];
  selectedDate: string;
  planDateRange: DateRange | null;
  progress: ProgressSummary | null;
  onSelectDate: (date: string) => void;
}) {
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
  const progressByUser = new Map(progress?.members.map((member) => [member.userId, member]) ?? []);
  const [progressInfoOpen, setProgressInfoOpen] = useState(false);

  return (
    <section className="flex-1 px-4 pb-8 pt-4 dark:bg-slate-950">
      <div data-guide="plan-calendar">
        <PlanCalendar days={days} selectedDate={selectedDate} planDateRange={planDateRange} onSelectDate={onSelectDate} showLegend />
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 shadow-soft dark:bg-slate-900 dark:shadow-none">
        <h3 className="mb-3 font-black text-slate-950 dark:text-slate-50">{formatDate(selectedDate)} 플랜</h3>
        {selectedDay?.plans.length ? (
          <div className="grid gap-2">
            {selectedDay.plans.map((plan) => (
              <div key={plan.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {plan.bookName ?? plan.bookCode} {plan.startChapter === plan.endChapter ? `${plan.startChapter}장` : `${plan.startChapter}-${plan.endChapter}장`}
              </div>
            ))}
          </div>
        ) : (
          <RestDayMessage />
        )}
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 shadow-soft dark:bg-slate-900 dark:shadow-none">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h3 className="font-black text-slate-950 dark:text-slate-50">달성률</h3>
            <button
              type="button"
              onClick={() => setProgressInfoOpen(true)}
              className="grid h-7 w-7 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="달성률 계산 안내"
              title="달성률 계산 안내"
            >
              <Info size={16} />
            </button>
          </div>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-200">
            전체 {progress?.overallRate ?? 0}%
          </span>
        </div>
        <div className="grid gap-2">
          {members.map((member) => {
            const item = progressByUser.get(member.userId);
            return (
              <div key={member.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-teal-50 text-sm font-black text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
                  {(member.nickname ?? "?").slice(0, 1)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-900 dark:text-slate-100">{member.nickname ?? "닉네임 없음"}</p>
                  <p className="text-xs font-semibold text-slate-400">
                    읽기 {item?.completedCount ?? 0}/{item?.totalCount ?? 0} · 나눔 {item?.reflectionCount ?? 0}/{item?.totalCount ?? 0}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-black text-slate-700 dark:text-slate-200">{item?.rate ?? 0}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <ProgressInfoModal open={progressInfoOpen} onClose={() => setProgressInfoOpen(false)} />
    </section>
  );
}

function ProgressInfoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal title="달성률 계산" open={open} onClose={onClose}>
      <div className="space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
        <p>달성률은 플랜 시작일부터 오늘까지 도달한 날짜만 기준으로 계산합니다.</p>
        <p>각 날짜는 말씀 읽기 완료 50%, 나눔 작성 50%로 반영됩니다.</p>
        <p>전체 퍼센트는 모든 참여자의 기준 점수 합계 대비 획득 점수 합계입니다.</p>
        <p>중도 참여자는 합류일 이후 날짜만 개인 기준에 포함됩니다.</p>
      </div>
    </Modal>
  );
}

function CalendarLegend() {
  return (
    <div className="mt-3 flex items-center justify-center gap-4 border-t border-slate-100 pt-3 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-teal-50 ring-1 ring-teal-100 dark:bg-teal-950/40 dark:ring-teal-800" aria-hidden />
        오늘
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
        읽기 완료
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
        나눔 작성
      </span>
    </div>
  );
}

function RestDayMessage() {
  return (
    <div className="grid min-h-40 place-items-center bg-white px-6 py-10 text-center dark:bg-slate-950">
      <div>
        <p className="text-base font-black text-slate-950 dark:text-slate-50">[쉬어가는 날]</p>
        <p className="mt-3 text-sm font-bold leading-6 text-slate-500 dark:text-slate-400">참된 쉼과 은혜가 있는 하루 되세요!</p>
      </div>
    </div>
  );
}

function PlanCalendar({
  days,
  selectedDate,
  planDateRange,
  onSelectDate,
  compact = false,
  showLegend = false
}: {
  days: PlanDay[];
  selectedDate: string;
  planDateRange: DateRange | null;
  onSelectDate: (date: string) => void;
  compact?: boolean;
  showLegend?: boolean;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate.slice(0, 7));
  const todayKey = dateKeyInTimeZone(new Date());
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
    <div className={compact ? "bg-transparent pb-2 pt-1" : "rounded-lg bg-white p-4 shadow-soft dark:bg-slate-900 dark:shadow-none"}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => moveMonth(-1)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" aria-label="이전 달" title="이전 달">
          <ChevronLeft size={17} />
        </button>
        <p className="font-black text-slate-950 dark:text-slate-50">{visibleMonth.replace("-", ".")}</p>
        <button type="button" onClick={() => moveMonth(1)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200" aria-label="다음 달" title="다음 달">
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-black text-slate-400 dark:text-slate-500">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} className={compact ? "h-9" : "h-10"} />;
          const plan = dayMap.get(date);
          const selectable = Boolean(planDateRange && isDateInRange(date, planDateRange));
          const active = selectable && selectedDate === date;
          const isToday = date === todayKey;
          return (
            <button
              key={date}
              type="button"
              onClick={() => {
                if (selectable) onSelectDate(date);
              }}
              disabled={!selectable}
              className={`${compact ? "h-9" : "h-10"} relative rounded-lg pb-2 text-sm font-black transition ${
                !selectable
                  ? "bg-transparent text-slate-200 dark:text-slate-700"
                  : isToday
                    ? "bg-teal-50 text-teal-900 dark:bg-teal-950/40 dark:text-teal-100"
                    : plan
                      ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      : "bg-transparent text-slate-400 dark:text-slate-600"
              } ${active ? "ring-2 ring-inset ring-teal-600 dark:ring-teal-400" : ""} disabled:cursor-default`}
            >
              <span>{Number(date.slice(8, 10))}</span>
              {selectable && (plan?.isCompleted || plan?.hasReflection) ? (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5" aria-hidden>
                  {plan?.isCompleted ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                  {plan?.hasReflection ? <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {showLegend ? <CalendarLegend /> : null}
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

  async function submit() {
    if (!target) return;
    setLoading(true);
    const ok = await onSubmit(target, content);
    setLoading(false);
    if (ok) setContent("");
  }

  return (
    <ReflectionEditorScreen
      open={Boolean(target)}
      title="묵상 작성"
      citation={target ? `${target.bookName} ${target.chapter}:${target.verse}` : ""}
      verseText={target?.text ?? ""}
      content={content}
      loading={loading}
      onContentChange={setContent}
      onClose={onClose}
      onSubmit={submit}
    />
  );
}

function ReflectionEditScreen({
  reflection,
  translation,
  onClose,
  onSubmit
}: {
  reflection: Reflection | null;
  translation: BibleTranslationCode;
  onClose: () => void;
  onSubmit: (content: string) => Promise<boolean>;
}) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setContent(reflection?.content ?? "");
  }, [reflection]);

  async function submit() {
    if (!reflection) return;
    setLoading(true);
    const ok = await onSubmit(content);
    setLoading(false);
    if (ok) setContent("");
  }

  const verseNumber = reflection ? verseLabel(reflection.verseContent, reflection.verse) : "";
  const citation = reflection ? `${reflection.bookName ?? reflection.bookCode} ${reflection.chapter}:${verseNumber}` : "";
  const passageText = reflection?.verseContent ? verseText(reflection.verseContent, translation) : "선택한 구절 본문을 불러오지 못했습니다.";

  return (
    <ReflectionEditorScreen
      open={Boolean(reflection)}
      title="묵상 수정"
      citation={citation}
      verseText={passageText}
      content={content}
      loading={loading}
      onContentChange={setContent}
      onClose={onClose}
      onSubmit={submit}
    />
  );
}

function ReflectionEditorScreen({
  open,
  title,
  citation,
  verseText: passageText,
  content,
  loading,
  onContentChange,
  onClose,
  onSubmit
}: {
  open: boolean;
  title: string;
  citation: string;
  verseText: string;
  content: string;
  loading: boolean;
  onContentChange: (content: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-950">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
        <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200" aria-label="닫기">
          <X size={18} />
        </button>
        <h2 className="text-base font-black text-slate-950 dark:text-slate-50">{title}</h2>
        <button type="button" onClick={onSubmit} disabled={loading} className="grid h-10 w-10 place-items-center rounded-full bg-teal-700 text-white disabled:opacity-60" aria-label="저장">
          <Send size={17} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-4 rounded-lg bg-teal-50 p-4 dark:bg-teal-950/50">
          <p className="mb-2 text-sm font-black text-teal-800 dark:text-teal-200">{citation}</p>
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{passageText}</p>
        </div>
        <textarea
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          className="min-h-[45dvh] w-full rounded-lg border border-slate-200 bg-white px-4 py-3 leading-7 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          placeholder="묵상을 기록해보세요."
          maxLength={2000}
        />
      </div>
    </div>
  );
}

function PassageModal({
  passage,
  translation,
  onClose
}: {
  passage: Passage | null;
  translation: BibleTranslationCode;
  onClose: () => void;
}) {
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
              {verseText(verse.content, translation)}
            </p>
          );
        })}
      </div>
    </Modal>
  );
}

function getPlanDateRange(room: RoomDetail, days: PlanDay[]): DateRange | null {
  if (!days.length) return null;

  const dates = days.map((day) => day.date).sort();
  const firstPlanDate = dates[0];
  const lastPlanDate = dates[dates.length - 1];
  const createdDate = dateKeyInTimeZone(room.createdAt);
  const startDate = createdDate < firstPlanDate ? createdDate : firstPlanDate;
  const durationEndDate = addDaysToDateKey(addMonthsToDateKey(startDate, room.durationMonths), -1);
  const endDate = durationEndDate > lastPlanDate ? durationEndDate : lastPlanDate;

  return { startDate, endDate };
}

function isDateInRange(date: string, range: DateRange) {
  return date >= range.startDate && date <= range.endDate;
}

function dateKeyInTimeZone(value: string | Date, timeZone = "Asia/Seoul") {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function addMonthsToDateKey(dateKey: string, months: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function addDaysToDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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
    const verse = content as Record<string, unknown>;
    if (typeof verse.verse_label === "string") return verse.verse_label;
  }

  return String(fallback);
}

function verseText(content: unknown, translation: BibleTranslationCode = DEFAULT_BIBLE_TRANSLATION) {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const verse = content as Record<string, unknown>;
    const translations = verse.translations && typeof verse.translations === "object" && !Array.isArray(verse.translations)
      ? verse.translations as Record<string, unknown>
      : verse;
    const selected = translations[translation];
    if (typeof selected === "string") return selected;
    const fallback = translations[DEFAULT_BIBLE_TRANSLATION];
    if (typeof fallback === "string") return fallback;
    const first = Object.entries(translations).find(([key, value]) => key !== "verse_label" && typeof value === "string")?.[1];
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
