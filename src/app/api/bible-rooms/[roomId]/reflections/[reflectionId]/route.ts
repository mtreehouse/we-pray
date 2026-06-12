import { NextResponse } from "next/server";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateBibleReflection } from "@/lib/validation";

type Params = {
  params: Promise<{
    roomId: string;
    reflectionId: string;
  }>;
};

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId, reflectionId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 수정할 수 있습니다." }, { status: 403 });
  }

  const body = (await req.json()) as { content?: string };
  const content = body.content?.trim() ?? "";
  const error = validateBibleReflection(content);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const reflection = await prisma.bibleReflection.findFirst({
    where: { id: reflectionId, roomId, userId: user.id, deletedAt: null },
    select: { id: true }
  });

  if (!reflection) {
    return NextResponse.json({ error: "수정할 수 없는 묵상입니다." }, { status: 404 });
  }

  await prisma.bibleReflection.update({
    where: { id: reflection.id },
    data: { content }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId, reflectionId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 삭제할 수 있습니다." }, { status: 403 });
  }

  const reflection = await prisma.bibleReflection.findFirst({
    where: { id: reflectionId, roomId, userId: user.id, deletedAt: null },
    select: { id: true }
  });

  if (!reflection) {
    return NextResponse.json({ error: "삭제할 수 없는 묵상입니다." }, { status: 404 });
  }

  await prisma.bibleReflection.update({
    where: { id: reflection.id },
    data: { deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
