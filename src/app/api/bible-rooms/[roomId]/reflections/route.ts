import { NextResponse } from "next/server";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateBibleReflection } from "@/lib/validation";

type Params = {
  params: Promise<{ roomId: string }>;
};

export async function GET(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 조회할 수 있습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") || undefined;
  const requestedTake = Number(searchParams.get("take") ?? 50);
  const take = Number.isFinite(requestedTake) ? Math.min(Math.max(requestedTake, 1), 50) : 50;

  const reflections = await prisma.bibleReflection.findMany({
    where: { roomId, deletedAt: null },
    select: {
      id: true,
      bookCode: true,
      chapter: true,
      verse: true,
      content: true,
      createdAt: true,
      userId: true,
      user: { select: { nickname: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  const hasMore = reflections.length > take;
  const items = hasMore ? reflections.slice(0, take) : reflections;
  const passageFilters = items.map((reflection) => ({
    bookCode: reflection.bookCode,
    chapter: reflection.chapter,
    verse: reflection.verse
  }));
  const verses = passageFilters.length
    ? await prisma.bibleVerse.findMany({
        where: { OR: passageFilters },
        select: {
          bookCode: true,
          bookName: true,
          chapter: true,
          verse: true,
          content: true
        }
      })
    : [];
  const verseMap = new Map(
    verses.map((verse) => [`${verse.bookCode}:${verse.chapter}:${verse.verse}`, verse])
  );

  return NextResponse.json({
    reflections: items.map((reflection) => {
      const verse = verseMap.get(`${reflection.bookCode}:${reflection.chapter}:${reflection.verse}`);

      return {
        id: reflection.id,
        bookCode: reflection.bookCode,
        bookName: verse?.bookName ?? reflection.bookCode,
        chapter: reflection.chapter,
        verse: reflection.verse,
        verseContent: verse?.content ?? null,
        content: reflection.content,
        createdAt: reflection.createdAt,
        authorNickname: reflection.user.nickname,
        isMine: reflection.userId === user.id
      };
    }),
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null
  });
}

export async function POST(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 작성할 수 있습니다." }, { status: 403 });
  }

  const body = (await req.json()) as {
    bookCode?: string;
    chapter?: number;
    verse?: number;
    content?: string;
  };
  const content = body.content?.trim() ?? "";
  const error = validateBibleReflection(content);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!body.bookCode || !Number.isInteger(body.chapter) || !Number.isInteger(body.verse)) {
    return NextResponse.json({ error: "묵상할 구절을 선택해주세요." }, { status: 400 });
  }

  const verse = await prisma.bibleVerse.findUnique({
    where: {
      bookCode_chapter_verse: {
        bookCode: body.bookCode,
        chapter: body.chapter!,
        verse: body.verse!
      }
    },
    select: { bookCode: true, bookName: true, chapter: true, verse: true, content: true }
  });

  if (!verse) {
    return NextResponse.json({ error: "존재하지 않는 성경 구절입니다." }, { status: 404 });
  }

  const planExists = await prisma.biblePlan.findFirst({
    where: {
      roomId,
      bookCode: verse.bookCode,
      startChapter: { lte: verse.chapter },
      endChapter: { gte: verse.chapter }
    },
    select: { id: true }
  });

  if (!planExists) {
    return NextResponse.json({ error: "이 성경방의 통독 플랜에 포함되지 않은 구절입니다." }, { status: 400 });
  }

  const reflection = await prisma.bibleReflection.create({
    data: {
      roomId,
      userId: user.id,
      bookCode: verse.bookCode,
      chapter: verse.chapter,
      verse: verse.verse,
      content
    },
    select: { id: true }
  });

  return NextResponse.json({
    reflectionId: reflection.id,
    reflection: {
      id: reflection.id,
      bookCode: verse.bookCode,
      bookName: verse.bookName,
      chapter: verse.chapter,
      verse: verse.verse,
      verseContent: verse.content,
      content,
      createdAt: new Date().toISOString(),
      authorNickname: user.nickname,
      isMine: true
    }
  });
}
