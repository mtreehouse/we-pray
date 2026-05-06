import { NextResponse } from "next/server";
import { RoomMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { requireNickname } from "@/lib/permissions";

export async function POST(req: Request) {
  const user = await requireNickname();
  const body = (await req.json()) as { roomId?: string; password?: string };

  if (!body.roomId) {
    return NextResponse.json({ error: "방을 선택해주세요." }, { status: 400 });
  }

  const room = await prisma.prayerRoom.findFirst({
    where: { id: body.roomId, deletedAt: null }
  });

  if (!room) {
    return NextResponse.json({ error: "삭제되었거나 존재하지 않는 방입니다." }, { status: 404 });
  }

  const existingMember = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: user.id
      }
    }
  });

  if (existingMember?.kickedAt) {
    return NextResponse.json({ error: "내보내기된 방에는 다시 입장할 수 없습니다." }, { status: 403 });
  }

  if (existingMember && !existingMember.leftAt) {
    return NextResponse.json({ roomId: room.id });
  }

  const passwordOk = await verifyPassword(body.password ?? "", room.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  if (existingMember) {
    await prisma.roomMember.update({
      where: { id: existingMember.id },
      data: {
        leftAt: null,
        joinedAt: new Date()
      }
    });
  } else {
    await prisma.roomMember.create({
      data: {
        roomId: room.id,
        userId: user.id,
        role: RoomMemberRole.member
      }
    });
  }

  return NextResponse.json({ roomId: room.id });
}
