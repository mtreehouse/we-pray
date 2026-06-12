import { NextResponse } from "next/server";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ roomId: string }>;
};

export async function GET(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 조회할 수 있습니다." }, { status: 403 });
  }

  const room = await prisma.bibleRoom.findFirst({
    where: { id: roomId, deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      scope: true,
      durationMonths: true,
      excludeSunday: true,
      planType: true,
      createdAt: true,
      creator: { select: { id: true, nickname: true } },
      members: {
        where: { leftAt: null, kickedAt: null, user: { deletedAt: null } },
        select: {
          id: true,
          role: true,
          joinedAt: true,
          user: { select: { id: true, nickname: true } }
        },
        orderBy: { joinedAt: "asc" }
      },
      _count: { select: { plans: true, reflections: true } }
    }
  });

  if (!room) {
    return NextResponse.json({ error: "삭제되었거나 존재하지 않는 성경방입니다." }, { status: 404 });
  }

  return NextResponse.json({
    room: {
      ...room,
      currentUserRole: member.role,
      planRowCount: room._count.plans,
      reflectionCount: room._count.reflections,
      _count: undefined
    }
  });
}
