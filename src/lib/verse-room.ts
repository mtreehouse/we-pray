import { defaultBibleTranslationCode, type BibleTranslationCode } from "@/lib/bible-translations";

export const VERSE_MEMORY_PAGE_SIZE = 50;

export type BibleMemoryMasteryValue = "DIFFICULT" | "ALMOST" | "MEMORIZED";
export type VerseMemoryFilter = "incomplete" | "completed" | "all";

export type VerseReference = {
  bookCode: string;
  bookName?: string;
  bookNumber?: number;
  chapter: number;
  verse: number;
};

export type VerseMemoryCardView = {
  id: string;
  bookCode: string;
  bookName: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  label: string;
  translationCode: BibleTranslationCode;
  translationLabel: string;
  verses: Array<{ verse: number; text: string }>;
  progress: {
    mastery: BibleMemoryMasteryValue;
    progressPercent: number;
    lastReviewedAt: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export function verseText(content: unknown, translation: BibleTranslationCode = defaultBibleTranslationCode) {
  if (typeof content === "string") return content;
  if (content && typeof content === "object") {
    const verse = content as Record<string, unknown>;
    const translations = verse.translations && typeof verse.translations === "object" && !Array.isArray(verse.translations)
      ? verse.translations as Record<string, unknown>
      : verse;
    const selected = translations[translation];
    if (typeof selected === "string") return selected;
    const fallback = translations[defaultBibleTranslationCode];
    if (typeof fallback === "string") return fallback;
    const first = Object.entries(translations).find(([key, value]) => key !== "verse_label" && typeof value === "string")?.[1];
    if (typeof first === "string") return first;
  }
  return "";
}

export function passageLabel(bookName: string, chapter: number, startVerse: number, endVerse: number) {
  return startVerse === endVerse
    ? bookName + " " + chapter + ":" + startVerse
    : bookName + " " + chapter + ":" + startVerse + "-" + endVerse;
}

export function refKey(ref: Pick<VerseReference, "bookCode" | "chapter" | "verse">) {
  return ref.bookCode + ":" + ref.chapter + ":" + ref.verse;
}

export function groupConsecutiveVerseRefs(refs: VerseReference[]) {
  const unique = new Map<string, VerseReference>();
  for (const ref of refs) {
    if (!ref.bookCode || !Number.isInteger(ref.chapter) || !Number.isInteger(ref.verse)) continue;
    unique.set(refKey(ref), ref);
  }

  const sorted = [...unique.values()].sort((a, b) => {
    if ((a.bookNumber ?? 0) !== (b.bookNumber ?? 0)) return (a.bookNumber ?? 0) - (b.bookNumber ?? 0);
    if (a.bookCode !== b.bookCode) return a.bookCode.localeCompare(b.bookCode);
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  const groups: Array<{
    bookCode: string;
    bookName: string;
    bookNumber: number;
    chapter: number;
    startVerse: number;
    endVerse: number;
    refs: VerseReference[];
  }> = [];

  for (const ref of sorted) {
    const last = groups[groups.length - 1];
    if (
      last &&
      last.bookCode === ref.bookCode &&
      last.chapter === ref.chapter &&
      last.endVerse + 1 === ref.verse
    ) {
      last.endVerse = ref.verse;
      last.refs.push(ref);
      continue;
    }

    groups.push({
      bookCode: ref.bookCode,
      bookName: ref.bookName ?? ref.bookCode,
      bookNumber: ref.bookNumber ?? 0,
      chapter: ref.chapter,
      startVerse: ref.verse,
      endVerse: ref.verse,
      refs: [ref]
    });
  }

  return groups;
}

export function masteryLabel(mastery: BibleMemoryMasteryValue) {
  if (mastery === "MEMORIZED") return "완전히 외웠어요";
  if (mastery === "ALMOST") return "거의 외웠어요";
  return "아직 어려워요";
}

export function masteryProgress(mastery: BibleMemoryMasteryValue) {
  if (mastery === "MEMORIZED") return 100;
  if (mastery === "ALMOST") return 70;
  return 25;
}

export function isBibleMemoryMastery(value: unknown): value is BibleMemoryMasteryValue {
  return value === "DIFFICULT" || value === "ALMOST" || value === "MEMORIZED";
}

export function isVerseMemoryFilter(value: unknown): value is VerseMemoryFilter {
  return value === "incomplete" || value === "completed" || value === "all";
}
