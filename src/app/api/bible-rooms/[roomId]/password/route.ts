import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/password";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ roomId: string }>;
};

export async function POST(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 공유할 수 있습니다." }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password?.trim() ?? "";

  if (!password) {
    return NextResponse.json({ error: "입장 비밀번호를 입력해주세요." }, { status: 400 });
  }

  const room = await prisma.bibleRoom.findFirst({
    where: { id: roomId, deletedAt: null },
    select: { id: true, passwordHash: true }
  });

  if (!room) {
    return NextResponse.json({ error: "삭제되었거나 존재하지 않는 성경방입니다." }, { status: 404 });
  }

  const passwordOk = await verifyPassword(password, room.passwordHash);
  if (!passwordOk) {
    return NextResponse.json({ error: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
