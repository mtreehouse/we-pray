import { NextResponse } from "next/server";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    roomId: string;
    memberId: string;
  }>;
};

function createReactionSummary(
  reflectionIds: string[],
  reactionCounts: Array<{ reflectionId: string; type: "LIKE" | "HEART" | "PRAY"; _count: { _all: number } }>,
  myReactions: Array<{ reflectionId: string; type: "LIKE" | "HEART" | "PRAY" }>
) {
  const summary = new Map<string, { prayCount: number; likeCount: number; heartCount: number; isPrayedByMe: boolean; isLikedByMe: boolean; isHeartedByMe: boolean }>();

  for (const reflectionId of reflectionIds) {
    summary.set(reflectionId, { prayCount: 0, likeCount: 0, heartCount: 0, isPrayedByMe: false, isLikedByMe: false, isHeartedByMe: false });
  }

  for (const item of reactionCounts) {
    const target = summary.get(item.reflectionId);
    if (!target) continue;
    if (item.type === "PRAY") target.prayCount = item._count._all;
    if (item.type === "LIKE") target.likeCount = item._count._all;
    if (item.type === "HEART") target.heartCount = item._count._all;
  }

  for (const item of myReactions) {
    const target = summary.get(item.reflectionId);
    if (!target) continue;
    if (item.type === "PRAY") target.isPrayedByMe = true;
    if (item.type === "LIKE") target.isLikedByMe = true;
    if (item.type === "HEART") target.isHeartedByMe = true;
  }

  return summary;
}

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
  const reflectionIds = reflections.map((reflection) => reflection.id);
  const [reactionCounts, myReactions] = await Promise.all([
    reflectionIds.length
      ? prisma.bibleReflectionReaction.groupBy({
          by: ["reflectionId", "type"],
          where: { reflectionId: { in: reflectionIds } },
          _count: { _all: true }
        })
      : Promise.resolve([]),
    reflectionIds.length
      ? prisma.bibleReflectionReaction.findMany({
          where: { reflectionId: { in: reflectionIds }, userId: user.id },
          select: { reflectionId: true, type: true }
        })
      : Promise.resolve([])
  ]);
  const reactionSummary = createReactionSummary(reflectionIds, reactionCounts, myReactions);

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
        isMine: reflection.userId === user.id,
        ...(reactionSummary.get(reflection.id) ?? { prayCount: 0, likeCount: 0, heartCount: 0, isPrayedByMe: false, isLikedByMe: false, isHeartedByMe: false })
      };
    })
  });
}
