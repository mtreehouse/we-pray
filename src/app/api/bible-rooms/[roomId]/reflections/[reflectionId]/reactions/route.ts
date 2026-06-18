import { NextResponse } from "next/server";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    roomId: string;
    reflectionId: string;
  }>;
};

type ReactionType = "LIKE" | "HEART";

function isReactionType(value: unknown): value is ReactionType {
  return value === "LIKE" || value === "HEART";
}

function toReactionState(
  reactionCounts: Array<{ type: ReactionType; _count: { _all: number } }>,
  myReactions: Array<{ type: ReactionType }>
) {
  return {
    likeCount: reactionCounts.find((item) => item.type === "LIKE")?._count._all ?? 0,
    heartCount: reactionCounts.find((item) => item.type === "HEART")?._count._all ?? 0,
    isLikedByMe: myReactions.some((item) => item.type === "LIKE"),
    isHeartedByMe: myReactions.some((item) => item.type === "HEART")
  };
}

export async function POST(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId, reflectionId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 반응할 수 있습니다." }, { status: 403 });
  }

  const body = (await req.json()) as { type?: unknown };
  if (!isReactionType(body.type)) {
    return NextResponse.json({ error: "지원하지 않는 반응입니다." }, { status: 400 });
  }
  const reactionType = body.type;

  const result = await prisma.$transaction(async (tx) => {
    const reflection = await tx.bibleReflection.findFirst({
      where: { id: reflectionId, roomId, deletedAt: null },
      select: { id: true }
    });

    if (!reflection) return null;

    const existing = await tx.bibleReflectionReaction.findUnique({
      where: { reflectionId_userId_type: { reflectionId: reflection.id, userId: user.id, type: reactionType } },
      select: { id: true }
    });

    if (existing) {
      await tx.bibleReflectionReaction.delete({ where: { id: existing.id } });
    } else {
      await tx.bibleReflectionReaction.create({
        data: {
          reflectionId: reflection.id,
          userId: user.id,
          type: reactionType
        }
      });
    }

    const [reactionCounts, myReactions] = await Promise.all([
      tx.bibleReflectionReaction.groupBy({
        by: ["type"],
        where: { reflectionId: reflection.id },
        _count: { _all: true }
      }),
      tx.bibleReflectionReaction.findMany({
        where: { reflectionId: reflection.id, userId: user.id },
        select: { type: true }
      })
    ]);

    return toReactionState(reactionCounts, myReactions);
  });

  if (!result) {
    return NextResponse.json({ error: "나눔을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(result);
}
