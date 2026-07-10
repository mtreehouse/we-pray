import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getBibleTranslationOptions, getUserVerseMemoryTranslation, getVerseMemoryCardsPage, translationLabel } from "@/lib/verse-room-data";
import { groupConsecutiveVerseRefs, isVerseMemoryFilter, refKey, VERSE_MEMORY_PAGE_SIZE, type VerseReference } from "@/lib/verse-room";

function unauthorized() {
  return NextResponse.json({ error: "로그인 후 성경 암송을 사용할 수 있습니다." }, { status: 401 });
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user?.nickname) return unauthorized();

  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const requestedFilter = url.searchParams.get("filter");
  const filter = isVerseMemoryFilter(requestedFilter) ? requestedFilter : "incomplete";
  const translations = await getBibleTranslationOptions();
  const translationCode = await getUserVerseMemoryTranslation(user.id, translations, user.bibleCopyrightAllowed);
  const page = await getVerseMemoryCardsPage({
    userId: user.id,
    translationCode,
    translationName: translationLabel(translations, translationCode),
    cursor,
    filter
  });

  return NextResponse.json({
    ...page,
    pageSize: VERSE_MEMORY_PAGE_SIZE,
    translationCode
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.nickname) return unauthorized();

  const body = await request.json().catch(() => ({})) as { refs?: unknown };
  if (!Array.isArray(body.refs) || body.refs.length === 0) {
    return NextResponse.json({ error: "추가할 말씀을 선택해주세요." }, { status: 400 });
  }

  const rawRefs = body.refs.slice(0, 300).flatMap((item): VerseReference[] => {
    if (!item || typeof item !== "object") return [];
    const ref = item as Record<string, unknown>;
    const bookCode = typeof ref.bookCode === "string" ? ref.bookCode.trim() : "";
    const chapter = Number(ref.chapter);
    const verse = Number(ref.verse);
    if (!bookCode || !Number.isInteger(chapter) || chapter < 1 || !Number.isInteger(verse) || verse < 1) return [];
    return [{ bookCode, chapter, verse }];
  });

  if (rawRefs.length === 0) {
    return NextResponse.json({ error: "추가할 말씀을 선택해주세요." }, { status: 400 });
  }

  const groupedByChapter = new Map<string, { bookCode: string; chapter: number; verses: number[] }>();
  for (const ref of rawRefs) {
    const key = ref.bookCode + ":" + ref.chapter;
    const current = groupedByChapter.get(key) ?? { bookCode: ref.bookCode, chapter: ref.chapter, verses: [] };
    current.verses.push(ref.verse);
    groupedByChapter.set(key, current);
  }

  const verseRows = await prisma.bibleVerse.findMany({
    where: {
      OR: [...groupedByChapter.values()].map((group) => ({
        bookCode: group.bookCode,
        chapter: group.chapter,
        verse: { in: [...new Set(group.verses)] }
      }))
    },
    select: {
      bookNumber: true,
      bookCode: true,
      bookName: true,
      chapter: true,
      verse: true
    },
    orderBy: [{ bookNumber: "asc" }, { chapter: "asc" }, { verse: "asc" }]
  });

  const foundKeys = new Set(verseRows.map((verse) => refKey(verse)));
  const requestedKeys = new Set(rawRefs.map((ref) => refKey(ref)));
  if (foundKeys.size !== requestedKeys.size) {
    return NextResponse.json({ error: "선택한 말씀 중 찾을 수 없는 구절이 있습니다." }, { status: 400 });
  }

  const groups = groupConsecutiveVerseRefs(verseRows);
  if (groups.length === 0) {
    return NextResponse.json({ error: "추가할 말씀을 선택해주세요." }, { status: 400 });
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    for (const group of groups) {
      const card = await tx.bibleMemoryCard.upsert({
        where: {
          userId_bookCode_chapter_startVerse_endVerse: {
            userId: user.id,
            bookCode: group.bookCode,
            chapter: group.chapter,
            startVerse: group.startVerse,
            endVerse: group.endVerse
          }
        },
        update: { updatedAt: now },
        create: {
          userId: user.id,
          bookCode: group.bookCode,
          bookName: group.bookName,
          chapter: group.chapter,
          startVerse: group.startVerse,
          endVerse: group.endVerse
        },
        select: { id: true }
      });

      await tx.bibleMemoryProgress.upsert({
        where: { cardId: card.id },
        update: {},
        create: {
          cardId: card.id,
          userId: user.id
        }
      });
    }
  });

  return NextResponse.json({ ok: true, createdGroups: groups.length });
}

export async function PATCH() {
  const user = await getCurrentUser();
  if (!user?.nickname) return unauthorized();

  const result = await prisma.bibleMemoryProgress.updateMany({
    where: { userId: user.id },
    data: {
      mastery: "DIFFICULT",
      progressPercent: 0,
      lastReviewedAt: null
    }
  });

  return NextResponse.json({ ok: true, resetCount: result.count });
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user?.nickname) return unauthorized();

  await prisma.bibleMemoryCard.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
