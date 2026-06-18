import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNickname, requireRoomMember } from "@/lib/permissions";

type Params = {
  params: Promise<{
    roomId: string;
    postId: string;
  }>;
};

export async function POST(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId, postId } = await params;
  const member = await requireRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "방 멤버만 함께 기도할 수 있습니다." }, { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const post = await tx.prayerPost.findFirst({
      where: {
        id: postId,
        roomId,
        deletedAt: null
      },
      select: { id: true }
    });

    if (!post) return null;

    const existing = await tx.prayerPostPrayer.findUnique({
      where: { postId_userId: { postId: post.id, userId: user.id } },
      select: { id: true }
    });

    const prayed = !existing;

    if (existing) {
      await tx.prayerPostPrayer.delete({ where: { id: existing.id } });
    } else {
      await tx.prayerPostPrayer.create({
        data: {
          postId: post.id,
          userId: user.id
        }
      });
    }

    const prayerCount = await tx.prayerPostPrayer.count({ where: { postId: post.id } });

    return { prayed, prayerCount };
  });

  if (!result) {
    return NextResponse.json({ error: "기도제목을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(result);
}
