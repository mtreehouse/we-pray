import { NextResponse } from "next/server";
import { RoomMemberRole } from "@prisma/client";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ roomId: string }>;
};

export async function POST(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버가 아닙니다." }, { status: 403 });
  }

  if (member.role === RoomMemberRole.creator) {
    return NextResponse.json({ error: "방장은 방 나가기 대신 방 삭제만 가능합니다." }, { status: 400 });
  }

  await prisma.bibleRoomMember.update({
    where: { id: member.id },
    data: { leftAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
