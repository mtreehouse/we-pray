import type { Prisma } from "@prisma/client";
import { defaultBibleTranslationCode, defaultBibleTranslationSettings, isBibleTranslationCode, normalizeBibleTranslationSettings, type BibleTranslationCode, type BibleTranslationSettingView } from "@/lib/bible-translations";
import { prisma } from "@/lib/prisma";
import { passageLabel, VERSE_MEMORY_PAGE_SIZE, verseText, type BibleMemoryMasteryValue, type VerseMemoryCardView, type VerseMemoryFilter } from "@/lib/verse-room";

export async function getBibleTranslationOptions() {
  const rows = await prisma.bibleTranslationSetting.findMany({
    select: {
      code: true,
      label: true,
      isVisible: true,
      requiresCopyright: true,
      sortOrder: true
    },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }]
  });

  return normalizeBibleTranslationSettings(rows);
}

export function resolveVerseMemoryTranslation({
  translations,
  preferred,
  copyrightAllowed
}: {
  translations: BibleTranslationSettingView[];
  preferred?: string | null;
  copyrightAllowed: boolean;
}) {
  const options = translations.length > 0 ? translations : defaultBibleTranslationSettings;
  const preferredOption = isBibleTranslationCode(preferred) ? options.find((item) => item.code === preferred) : null;
  const fallback = options.find((item) => item.code === defaultBibleTranslationCode) ?? options[0];
  const option = preferredOption ?? fallback;

  if (!option || !option.isVisible || (option.requiresCopyright && !copyrightAllowed)) {
    const allowed = options.find((item) => item.isVisible && (!item.requiresCopyright || copyrightAllowed));
    return allowed?.code ?? defaultBibleTranslationCode;
  }

  return option.code;
}

export function translationLabel(translations: BibleTranslationSettingView[], code: BibleTranslationCode) {
  return translations.find((item) => item.code === code)?.label ?? code;
}

export async function getVerseMemoryBooks() {
  const rows = await prisma.bibleVerse.groupBy({
    by: ["bookNumber", "bookCode", "bookName", "chapter"],
    orderBy: [{ bookNumber: "asc" }, { chapter: "asc" }]
  });

  const byBook = new Map<string, { bookNumber: number; bookCode: string; bookName: string; chapters: number[] }>();
  for (const row of rows) {
    const current = byBook.get(row.bookCode) ?? {
      bookNumber: row.bookNumber,
      bookCode: row.bookCode,
      bookName: row.bookName,
      chapters: []
    };
    current.chapters.push(row.chapter);
    byBook.set(row.bookCode, current);
  }

  return [...byBook.values()].map((book) => ({
    ...book,
    chapters: [...new Set(book.chapters)].sort((a, b) => a - b)
  }));
}

export async function getUserVerseMemoryTranslation(userId: string | null, translations: BibleTranslationSettingView[], copyrightAllowed: boolean) {
  if (!userId) return resolveVerseMemoryTranslation({ translations, copyrightAllowed, preferred: null });

  const setting = await prisma.bibleMemorySetting.findUnique({
    where: { userId },
    select: { translationCode: true }
  });

  return resolveVerseMemoryTranslation({
    translations,
    copyrightAllowed,
    preferred: setting?.translationCode ?? null
  });
}

export async function getVerseMemoryCardsPage({
  userId,
  translationCode,
  translationName,
  cursor,
  filter = "incomplete"
}: {
  userId: string;
  translationCode: BibleTranslationCode;
  translationName: string;
  cursor?: string | null;
  filter?: VerseMemoryFilter;
}) {
  const statusWhere: Prisma.BibleMemoryCardWhereInput = filter === "completed"
    ? { progress: { is: { mastery: "MEMORIZED" } } }
    : filter === "incomplete"
      ? {
        OR: [
          { progress: { is: null } },
          { progress: { is: { mastery: { not: "MEMORIZED" } } } }
        ]
      }
      : {};

  const rows = await prisma.bibleMemoryCard.findMany({
    where: { userId, ...statusWhere },
    select: {
      id: true,
      bookCode: true,
      bookName: true,
      chapter: true,
      startVerse: true,
      endVerse: true,
      createdAt: true,
      updatedAt: true,
      progress: {
        select: {
          mastery: true,
          progressPercent: true,
          lastReviewedAt: true
        }
      }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: VERSE_MEMORY_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  const hasMore = rows.length > VERSE_MEMORY_PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, VERSE_MEMORY_PAGE_SIZE) : rows;
  const cards = await serializeVerseMemoryCards(pageRows, translationCode, translationName);

  return {
    cards,
    nextCursor: hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null
  };
}

export async function getVerseMemoryCard({
  cardId,
  userId,
  translationCode,
  translationName
}: {
  cardId: string;
  userId: string;
  translationCode: BibleTranslationCode;
  translationName: string;
}) {
  const row = await prisma.bibleMemoryCard.findFirst({
    where: { id: cardId, userId },
    select: {
      id: true,
      bookCode: true,
      bookName: true,
      chapter: true,
      startVerse: true,
      endVerse: true,
      createdAt: true,
      updatedAt: true,
      progress: {
        select: {
          mastery: true,
          progressPercent: true,
          lastReviewedAt: true
        }
      }
    }
  });

  if (!row) return null;
  const [card] = await serializeVerseMemoryCards([row], translationCode, translationName);
  return card ?? null;
}

export async function serializeVerseMemoryCards(
  cards: Array<{
    id: string;
    bookCode: string;
    bookName: string;
    chapter: number;
    startVerse: number;
    endVerse: number;
    createdAt: Date;
    updatedAt: Date;
    progress: {
      mastery: BibleMemoryMasteryValue;
      progressPercent: number;
      lastReviewedAt: Date | null;
    } | null;
  }>,
  translationCode: BibleTranslationCode,
  translationName: string
): Promise<VerseMemoryCardView[]> {
  if (cards.length === 0) return [];

  const verses = await prisma.bibleVerse.findMany({
    where: {
      OR: cards.map((card) => ({
        bookCode: card.bookCode,
        chapter: card.chapter,
        verse: { gte: card.startVerse, lte: card.endVerse }
      }))
    },
    select: {
      bookCode: true,
      chapter: true,
      verse: true,
      content: true
    },
    orderBy: [{ bookNumber: "asc" }, { chapter: "asc" }, { verse: "asc" }]
  });

  const verseMap = new Map<string, string>();
  for (const verse of verses) {
    verseMap.set(verse.bookCode + ":" + verse.chapter + ":" + verse.verse, verseText(verse.content, translationCode));
  }

  return cards.map((card) => ({
    id: card.id,
    bookCode: card.bookCode,
    bookName: card.bookName,
    chapter: card.chapter,
    startVerse: card.startVerse,
    endVerse: card.endVerse,
    label: passageLabel(card.bookName, card.chapter, card.startVerse, card.endVerse),
    translationCode,
    translationLabel: translationName,
    verses: Array.from({ length: card.endVerse - card.startVerse + 1 }, (_, index) => {
      const verse = card.startVerse + index;
      return {
        verse,
        text: verseMap.get(card.bookCode + ":" + card.chapter + ":" + verse) ?? ""
      };
    }),
    progress: {
      mastery: card.progress?.mastery ?? "DIFFICULT",
      progressPercent: card.progress?.progressPercent ?? 0,
      lastReviewedAt: card.progress?.lastReviewedAt?.toISOString() ?? null
    },
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString()
  }));
}
