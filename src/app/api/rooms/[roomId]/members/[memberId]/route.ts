import { NextResponse } from "next/server";
import { RoomMemberRole } from "@prisma/client";
import { requireNickname, requireRoomMember } from "@/lib/permissions";
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
  const requester = await requireRoomMember(roomId, user.id);

  if (!requester) {
    return NextResponse.json({ error: "방 멤버만 조회할 수 있습니다." }, { status: 403 });
  }

  const target = await prisma.roomMember.findFirst({
    where: {
      id: memberId,
      roomId,
      kickedAt: null,
      leftAt: null,
      user: { deletedAt: null }
    },
    select: {
      userId: true,
      user: { select: { nickname: true } }
    }
  });

  if (!target) {
    return NextResponse.json({ error: "멤버를 찾을 수 없습니다." }, { status: 404 });
  }

  const posts = await prisma.prayerPost.findMany({
    where: { roomId, userId: target.userId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { nickname: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }]
  });

  return NextResponse.json({
    posts: posts.map((post) => ({
      id: post.id,
      userId: post.userId,
      authorNickname: post.user.nickname,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt
    }))
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId, memberId } = await params;
  const requester = await requireRoomMember(roomId, user.id);

  if (!requester || requester.role !== RoomMemberRole.creator) {
    return NextResponse.json({ error: "방 생성자만 내보낼 수 있습니다." }, { status: 403 });
  }

  const target = await prisma.roomMember.findFirst({
    where: {
      id: memberId,
      roomId,
      kickedAt: null,
      leftAt: null
    }
  });

  if (!target || target.role === RoomMemberRole.creator) {
    return NextResponse.json({ error: "내보낼 수 없는 멤버입니다." }, { status: 400 });
  }

  await prisma.roomMember.update({
    where: { id: target.id },
    data: { kickedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
