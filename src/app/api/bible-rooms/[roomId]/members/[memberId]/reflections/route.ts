import { NextResponse } from "next/server";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    roomId: string;
    memberId: string;
  }>;
};

export async function GET(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId, memberId } = await params;
  const requester = await requireBibleRoomMember(roomId, user.id);

  if (!requester) {
    return NextResponse.json({ error: "성경방 멤버만 조회할 수 있습니다." }, { status: 403 });
  }

  const target = await prisma.bibleRoomMember.findFirst({
    where: {
      id: memberId,
      roomId,
      leftAt: null,
      kickedAt: null,
      user: { deletedAt: null }
    },
    select: { userId: true, user: { select: { nickname: true } } }
  });

  if (!target) {
    return NextResponse.json({ error: "조회할 수 없는 멤버입니다." }, { status: 404 });
  }

  const reflections = await prisma.bibleReflection.findMany({
    where: { roomId, userId: target.userId, deletedAt: null },
    select: {
      id: true,
      bookCode: true,
      chapter: true,
      verse: true,
      content: true,
      createdAt: true,
      userId: true
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  const passageFilters = reflections.map((reflection) => ({
    bookCode: reflection.bookCode,
    chapter: reflection.chapter,
    verse: reflection.verse
  }));
  const verses = passageFilters.length
    ? await prisma.bibleVerse.findMany({
        where: { OR: passageFilters },
        select: { bookCode: true, bookName: true, chapter: true, verse: true, content: true }
      })
    : [];
  const verseMap = new Map(verses.map((verse) => [`${verse.bookCode}:${verse.chapter}:${verse.verse}`, verse]));

  return NextResponse.json({
    reflections: reflections.map((reflection) => {
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
        userId: reflection.userId,
        authorNickname: target.user.nickname,
        isMine: reflection.userId === user.id
      };
    })
  });
}
