import { NextResponse } from "next/server";
import { parseDateKey, toDateKey } from "@/lib/bible-plan";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ roomId: string }>;
};

function verseKey(bookCode: string, chapter: number, verse: number) {
  return `${bookCode}:${chapter}:${verse}`;
}

export async function GET(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 조회할 수 있습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const readingDate = parseDateKey(searchParams.get("date") ?? "");

  if (!readingDate) {
    return NextResponse.json({ error: "조회할 날짜를 YYYY-MM-DD 형식으로 입력해주세요." }, { status: 400 });
  }

  const plans = await prisma.biblePlan.findMany({
    where: { roomId, readingDate },
    select: {
      id: true,
      bookCode: true,
      startChapter: true,
      endChapter: true
    },
    orderBy: [{ bookCode: "asc" }, { startChapter: "asc" }]
  });

  if (plans.length === 0) {
    return NextResponse.json({ date: toDateKey(readingDate), plans: [], chapters: [] });
  }

  const planFilters = plans.map((plan) => ({
    bookCode: plan.bookCode,
    chapter: { gte: plan.startChapter, lte: plan.endChapter }
  }));

  const [verses, reflectionCounts, myReflections] = await Promise.all([
    prisma.bibleVerse.findMany({
      where: { OR: planFilters },
      select: {
        bookNumber: true,
        bookCode: true,
        bookName: true,
        chapter: true,
        verse: true,
        content: true
      },
      orderBy: [{ bookNumber: "asc" }, { chapter: "asc" }, { verse: "asc" }]
    }),
    prisma.bibleReflection.groupBy({
      by: ["bookCode", "chapter", "verse"],
      where: {
        roomId,
        deletedAt: null,
        OR: planFilters
      },
      _count: { _all: true }
    }),
    prisma.bibleReflection.findMany({
      where: {
        roomId,
        userId: user.id,
        deletedAt: null,
        OR: planFilters
      },
      select: {
        id: true,
        bookCode: true,
        chapter: true,
        verse: true
      }
    })
  ]);

  const reflectionMap = new Map<string, { count: number; myReflectionId: string | null }>();
  for (const reflection of reflectionCounts) {
    reflectionMap.set(verseKey(reflection.bookCode, reflection.chapter, reflection.verse), {
      count: reflection._count._all,
      myReflectionId: null
    });
  }
  for (const reflection of myReflections) {
    const key = verseKey(reflection.bookCode, reflection.chapter, reflection.verse);
    const current = reflectionMap.get(key) ?? { count: 0, myReflectionId: null };
    current.myReflectionId = reflection.id;
    reflectionMap.set(key, current);
  }

  const chapterMap = new Map<string, {
    bookCode: string;
    bookName: string;
    chapter: number;
    verses: Array<{
      verse: number;
      content: unknown;
      reflectionCount: number;
      myReflectionId: string | null;
    }>;
  }>();

  for (const verse of verses) {
    const chapterKey = `${verse.bookCode}:${verse.chapter}`;
    const grouped = chapterMap.get(chapterKey) ?? {
      bookCode: verse.bookCode,
      bookName: verse.bookName,
      chapter: verse.chapter,
      verses: []
    };
    const reflection = reflectionMap.get(verseKey(verse.bookCode, verse.chapter, verse.verse));

    grouped.verses.push({
      verse: verse.verse,
      content: verse.content,
      reflectionCount: reflection?.count ?? 0,
      myReflectionId: reflection?.myReflectionId ?? null
    });
    chapterMap.set(chapterKey, grouped);
  }

  return NextResponse.json({
    date: toDateKey(readingDate),
    plans,
    chapters: [...chapterMap.values()]
  });
}
