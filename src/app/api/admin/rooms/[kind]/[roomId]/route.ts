import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const kinds = ["pray", "bible"] as const;
type RoomKind = typeof kinds[number];

type Params = {
  params: Promise<{
    kind: string;
    roomId: string;
  }>;
};

function isRoomKind(value: string): value is RoomKind {
  return kinds.includes(value as RoomKind);
}

export async function PATCH(request: Request, { params }: Params) {
  await requireAdmin();
  const { kind, roomId } = await params;

  if (!isRoomKind(kind)) {
    return NextResponse.json({ error: "방 유형이 올바르지 않습니다." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({})) as { action?: string };
  if (body.action !== "resetPassword") {
    return NextResponse.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
  }

  const passwordHash = await hashPassword("0000");

  if (kind === "pray") {
    const room = await prisma.prayerRoom.findFirst({
      where: { id: roomId, deletedAt: null },
      select: { id: true }
    });

    if (!room) {
      return NextResponse.json({ error: "기도방을 찾을 수 없습니다." }, { status: 404 });
    }

    const updated = await prisma.prayerRoom.update({
      where: { id: room.id },
      data: { passwordHash },
      select: { updatedAt: true }
    });

    return NextResponse.json({ ok: true, updatedAt: updated.updatedAt.toISOString() });
  }

  const room = await prisma.bibleRoom.findFirst({
    where: { id: roomId, deletedAt: null },
    select: { id: true }
  });

  if (!room) {
    return NextResponse.json({ error: "성경방을 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.bibleRoom.update({
    where: { id: room.id },
    data: { passwordHash },
    select: { updatedAt: true }
  });

  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt.toISOString() });
}

export async function DELETE(request: Request, { params }: Params) {
  await requireAdmin();
  const { kind, roomId } = await params;

  if (!isRoomKind(kind)) {
    return NextResponse.json({ error: "방 유형이 올바르지 않습니다." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({})) as { title?: string };
  const inputTitle = body.title ?? "";

  if (kind === "pray") {
    const room = await prisma.prayerRoom.findFirst({
      where: { id: roomId, deletedAt: null },
      select: { id: true, title: true }
    });

    if (!room) {
      return NextResponse.json({ error: "기도방을 찾을 수 없습니다." }, { status: 404 });
    }

    if (inputTitle !== room.title) {
      return NextResponse.json({ error: "방 이름이 일치하지 않습니다." }, { status: 400 });
    }

    await prisma.prayerRoom.update({
      where: { id: room.id },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ ok: true });
  }

  const room = await prisma.bibleRoom.findFirst({
    where: { id: roomId, deletedAt: null },
    select: { id: true, title: true }
  });

  if (!room) {
    return NextResponse.json({ error: "성경방을 찾을 수 없습니다." }, { status: 404 });
  }

  if (inputTitle !== room.title) {
    return NextResponse.json({ error: "방 이름이 일치하지 않습니다." }, { status: 400 });
  }

  await prisma.bibleRoom.update({
    where: { id: room.id },
    data: { deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
