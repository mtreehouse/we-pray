import { BiblePlanType, BibleScope, Prisma } from "@prisma/client";

const MCHEYNE_PLAN_TYPE = "MCHEYNE" as BiblePlanType;

export type BibleChapterRef = {
  bookNumber: number;
  bookCode: string;
  bookName: string;
  chapter: number;
};

type BiblePlanCreateRow = {
  roomId: string;
  readingDate: Date;
  bookCode: string;
  startChapter: number;
  endChapter: number;
};

const CHRONOLOGICAL_BOOK_ORDER = [
  "GEN",
  "JOB",
  "EXO",
  "LEV",
  "NUM",
  "DEU",
  "JOS",
  "JDG",
  "RUT",
  "1SA",
  "2SA",
  "1CH",
  "PSA",
  "1KI",
  "PRO",
  "ECC",
  "SNG",
  "2CH",
  "2KI",
  "OBA",
  "JOL",
  "JON",
  "AMO",
  "HOS",
  "ISA",
  "MIC",
  "NAH",
  "ZEP",
  "HAB",
  "JER",
  "LAM",
  "EZK",
  "DAN",
  "EZR",
  "EST",
  "HAG",
  "ZEC",
  "NEH",
  "MAL",
  "MAT",
  "MRK",
  "LUK",
  "JHN",
  "ACT",
  "JAS",
  "GAL",
  "1TH",
  "2TH",
  "1CO",
  "2CO",
  "ROM",
  "EPH",
  "PHP",
  "COL",
  "PHM",
  "HEB",
  "1TI",
  "TIT",
  "1PE",
  "2TI",
  "2PE",
  "JUD",
  "1JN",
  "2JN",
  "3JN",
  "REV"
];

const chronologicalRank = new Map(
  CHRONOLOGICAL_BOOK_ORDER.map((bookCode, index) => [bookCode, index])
);

const NEW_TESTAMENT_ORDER = [
  "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV"
];

const MCHEYNE_TRACK_BOOK_ORDERS = [
  ["GEN", "EXO", "LEV", "NUM", "DEU", "JOS", "JDG", "RUT", "1SA", "2SA", "1KI", "2KI", "1CH", "2CH"],
  NEW_TESTAMENT_ORDER,
  ["EZR", "NEH", "EST", "JOB", "PSA", "PRO", "ECC", "SNG", "ISA", "JER", "LAM", "EZK", "DAN", "HOS", "JOL", "AMO", "OBA", "JON", "MIC", "NAH", "HAB", "ZEP", "HAG", "ZEC", "MAL"],
  ["ACT", "ROM", "1CO", "2CO", "GAL", "EPH", "PHP", "COL", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "HEB", "JAS", "1PE", "2PE", "1JN", "2JN", "3JN", "JUD", "REV", "PSA", "MAT", "MRK", "LUK", "JHN"]
];

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function parseDateKey(dateKey: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateKey(date: Date) {
  return startOfUtcDay(date).toISOString().slice(0, 10);
}

export function todayDateKey(timeZone = "Asia/Seoul") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function todayUtcDate(timeZone = "Asia/Seoul") {
  return parseDateKey(todayDateKey(timeZone)) ?? startOfUtcDay(new Date());
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function addUtcMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return startOfUtcDay(next);
}

function isSundayUtc(date: Date) {
  return date.getUTCDay() === 0;
}

export function createReadingDates(startDate: Date, durationMonths: number, excludeSunday: boolean) {
  const start = startOfUtcDay(startDate);
  const endExclusive = addUtcMonths(start, durationMonths);
  const dates: Date[] = [];

  for (let cursor = start; cursor < endExclusive; cursor = addUtcDays(cursor, 1)) {
    if (excludeSunday && isSundayUtc(cursor)) continue;
    dates.push(new Date(cursor));
  }

  return dates;
}

function scopeWhere(scope: BibleScope): Prisma.BibleVerseWhereInput {
  if (scope === BibleScope.OLD_TESTAMENT) return { bookNumber: { lte: 39 } };
  if (scope === BibleScope.NEW_TESTAMENT) return { bookNumber: { gte: 40 } };
  return {};
}

function orderChapters(chapters: BibleChapterRef[], planType: BiblePlanType, scope: BibleScope) {
  const canonical = [...chapters].sort(
    (a, b) => a.bookNumber - b.bookNumber || a.chapter - b.chapter
  );

  if (planType === BiblePlanType.CHRONOLOGICAL) {
    return canonical.sort((a, b) => {
      const aRank = chronologicalRank.get(a.bookCode) ?? a.bookNumber + 1000;
      const bRank = chronologicalRank.get(b.bookCode) ?? b.bookNumber + 1000;
      return aRank - bRank || a.chapter - b.chapter;
    });
  }

  if (planType === BiblePlanType.PARALLEL && scope === BibleScope.ALL) {
    const oldTestament = canonical.filter((chapter) => chapter.bookNumber <= 39);
    const newTestament = canonical.filter((chapter) => chapter.bookNumber >= 40);
    const interleaved: BibleChapterRef[] = [];
    let oldIndex = 0;
    let newIndex = 0;

    while (oldIndex < oldTestament.length || newIndex < newTestament.length) {
      for (let count = 0; count < 3 && oldIndex < oldTestament.length; count += 1) {
        interleaved.push(oldTestament[oldIndex]);
        oldIndex += 1;
      }

      if (newIndex < newTestament.length) {
        interleaved.push(newTestament[newIndex]);
        newIndex += 1;
      }
    }

    return interleaved;
  }

  return canonical;
}

function compactDailyChapters(roomId: string, readingDate: Date, chapters: BibleChapterRef[]) {
  const rows: BiblePlanCreateRow[] = [];

  for (const chapter of chapters) {
    const previous = rows[rows.length - 1];
    if (previous?.bookCode === chapter.bookCode && previous.endChapter + 1 === chapter.chapter) {
      previous.endChapter = chapter.chapter;
      continue;
    }

    rows.push({
      roomId,
      readingDate,
      bookCode: chapter.bookCode,
      startChapter: chapter.chapter,
      endChapter: chapter.chapter
    });
  }

  return rows;
}

function chaptersByBookOrder(chapters: BibleChapterRef[], bookCodes: string[]) {
  const chapterMap = new Map<string, BibleChapterRef[]>();

  for (const chapter of chapters) {
    const bookChapters = chapterMap.get(chapter.bookCode) ?? [];
    bookChapters.push(chapter);
    chapterMap.set(chapter.bookCode, bookChapters);
  }

  return bookCodes.flatMap((bookCode) => chapterMap.get(bookCode) ?? []);
}

function buildMcheynePlanRows(roomId: string, readingDates: Date[], chapters: BibleChapterRef[]) {
  const canonical = [...chapters].sort(
    (a, b) => a.bookNumber - b.bookNumber || a.chapter - b.chapter
  );
  const tracks = MCHEYNE_TRACK_BOOK_ORDERS
    .map((bookCodes) => chaptersByBookOrder(canonical, bookCodes))
    .filter((track) => track.length > 0);

  const rows: BiblePlanCreateRow[] = [];

  for (let dayIndex = 0; dayIndex < readingDates.length; dayIndex += 1) {
    const dailyChapters = tracks.flatMap((track) => {
      const start = Math.floor((dayIndex * track.length) / readingDates.length);
      const end = Math.floor(((dayIndex + 1) * track.length) / readingDates.length);
      return track.slice(start, end);
    });

    if (dailyChapters.length === 0) continue;
    rows.push(...compactDailyChapters(roomId, readingDates[dayIndex], dailyChapters));
  }

  return rows;
}

export async function getBibleChapters(
  client: Prisma.TransactionClient | PrismaClientLike,
  scope: BibleScope,
  planType: BiblePlanType
) {
  const chapters = await client.bibleVerse.groupBy({
    by: ["bookNumber", "bookCode", "bookName", "chapter"],
    where: scopeWhere(scope),
    orderBy: [{ bookNumber: "asc" }, { chapter: "asc" }]
  });

  return orderChapters(chapters, planType, scope);
}

export async function buildBiblePlanRows(
  client: Prisma.TransactionClient | PrismaClientLike,
  input: {
    roomId: string;
    scope: BibleScope;
    durationMonths: number;
    excludeSunday: boolean;
    planType: BiblePlanType;
    startDate?: Date;
  }
) {
  const readingDates = createReadingDates(
    input.startDate ?? new Date(),
    input.durationMonths,
    input.excludeSunday
  );
  const chapters = await getBibleChapters(client, input.scope, input.planType);

  if (chapters.length === 0) {
    throw new Error("성경 본문 데이터가 없어 통독 플랜을 생성할 수 없습니다. seed를 먼저 실행해주세요.");
  }

  if (readingDates.length === 0) {
    throw new Error("통독 기간에 배정 가능한 날짜가 없습니다.");
  }

  if (input.planType === MCHEYNE_PLAN_TYPE) {
    return buildMcheynePlanRows(input.roomId, readingDates, chapters);
  }

  const rows: BiblePlanCreateRow[] = [];

  for (let dayIndex = 0; dayIndex < readingDates.length; dayIndex += 1) {
    const start = Math.floor((dayIndex * chapters.length) / readingDates.length);
    const end = Math.floor(((dayIndex + 1) * chapters.length) / readingDates.length);
    const dailyChapters = chapters.slice(start, end);

    if (dailyChapters.length === 0) continue;
    rows.push(...compactDailyChapters(input.roomId, readingDates[dayIndex], dailyChapters));
  }

  return rows;
}

type PrismaClientLike = {
  bibleVerse: {
    groupBy: Prisma.BibleVerseDelegate["groupBy"];
  };
};
