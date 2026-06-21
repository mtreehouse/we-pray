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
    return NextResponse.json({ error: "방 멤버만 응답 표시할 수 있습니다." }, { status: 403 });
  }

  const post = await prisma.prayerPost.findFirst({
    where: {
      id: postId,
      roomId,
      userId: user.id,
      deletedAt: null
    },
    select: { id: true, answeredAt: true }
  });

  if (!post) {
    return NextResponse.json({ error: "응답 표시할 수 없는 기도제목입니다." }, { status: 404 });
  }

  const answeredAt = post.answeredAt ? null : new Date();
  const updated = await prisma.prayerPost.update({
    where: { id: post.id },
    data: { answeredAt },
    select: { answeredAt: true }
  });

  return NextResponse.json({ answeredAt: updated.answeredAt?.toISOString() ?? null });
}
