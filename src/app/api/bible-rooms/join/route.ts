import { NextResponse } from "next/server";
import { RoomMemberRole } from "@prisma/client";
import { verifyPassword } from "@/lib/password";
import { requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const user = await requireNickname();
  const body = (await req.json()) as { roomId?: string; password?: string };

  if (!body.roomId) {
    return NextResponse.json({ error: "성경방을 선택해주세요." }, { status: 400 });
  }

  const room = await prisma.bibleRoom.findFirst({
    where: { id: body.roomId, deletedAt: null },
    select: { id: true, passwordHash: true }
  });

  if (!room) {
    return NextResponse.json({ error: "삭제되었거나 존재하지 않는 성경방입니다." }, { status: 404 });
  }

  const existingMember = await prisma.bibleRoomMember.findUnique({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: user.id
      }
    }
  });

  if (existingMember?.kickedAt) {
    return NextResponse.json({ error: "내보내기된 성경방에는 다시 입장할 수 없습니다." }, { status: 403 });
  }

  if (existingMember && !existingMember.leftAt) {
    return NextResponse.json({ roomId: room.id });
  }

  const passwordOk = await verifyPassword(body.password ?? "", room.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  if (existingMember) {
    await prisma.bibleRoomMember.update({
      where: { id: existingMember.id },
      data: {
        leftAt: null,
        joinedAt: new Date()
      }
    });
  } else {
    await prisma.bibleRoomMember.create({
      data: {
        roomId: room.id,
        userId: user.id,
        role: RoomMemberRole.member
      }
    });
  }

  return NextResponse.json({ roomId: room.id });
}
