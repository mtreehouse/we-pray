import { NextResponse } from "next/server";
import { RoomMemberRole } from "@prisma/client";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    roomId: string;
    memberId: string;
  }>;
};

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId, memberId } = await params;
  const requester = await requireBibleRoomMember(roomId, user.id);

  if (!requester || requester.role !== RoomMemberRole.creator) {
    return NextResponse.json({ error: "성경방 생성자만 내보낼 수 있습니다." }, { status: 403 });
  }

  const target = await prisma.bibleRoomMember.findFirst({
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

  await prisma.bibleRoomMember.update({
    where: { id: target.id },
    data: { kickedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
