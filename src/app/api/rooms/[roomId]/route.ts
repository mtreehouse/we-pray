import { NextResponse } from "next/server";
import { RoomMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireNickname, requireRoomMember } from "@/lib/permissions";

type Params = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireRoomMember(roomId, user.id);

  if (!member || member.role !== RoomMemberRole.creator) {
    return NextResponse.json({ error: "방장만 관리할 수 있습니다." }, { status: 403 });
  }

  const body = (await req.json()) as {
    title?: string;
    description?: string;
    password?: string;
  };

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "방 제목을 입력해주세요." }, { status: 400 });
  }

  if (!body.description?.trim()) {
    return NextResponse.json({ error: "방 설명을 입력해주세요." }, { status: 400 });
  }

  await prisma.prayerRoom.update({
    where: { id: roomId },
    data: {
      title: body.title.trim(),
      description: body.description.trim(),
      ...(body.password?.trim() ? { passwordHash: await hashPassword(body.password.trim()) } : {})
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireRoomMember(roomId, user.id);

  if (!member || member.role !== RoomMemberRole.creator) {
    return NextResponse.json({ error: "방장만 삭제할 수 있습니다." }, { status: 403 });
  }

  await prisma.prayerRoom.update({
    where: { id: roomId },
    data: { deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
