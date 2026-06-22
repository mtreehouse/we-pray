import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(req: Request, { params }: Params) {
  await requireAdmin();
  const { userId } = await params;
  const body = await req.json().catch(() => ({})) as { bibleCopyrightAllowed?: unknown };

  if (typeof body.bibleCopyrightAllowed !== "boolean") {
    return NextResponse.json({ error: "저작권 허용 값이 올바르지 않습니다." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true }
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { bibleCopyrightAllowed: body.bibleCopyrightAllowed },
    select: { bibleCopyrightAllowed: true }
  });

  return NextResponse.json({ user: updated });
}

export async function DELETE(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  const { userId } = await params;

  if (admin.id === userId) {
    return NextResponse.json({ error: "관리자는 자기 자신을 삭제할 수 없습니다." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({})) as { nickname?: string };
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, nickname: true }
  });

  if (!user) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  const expectedNickname = user.nickname ?? "닉네임 없음";
  if (body.nickname !== expectedNickname) {
    return NextResponse.json({ error: "삭제할 사용자의 닉네임이 일치하지 않습니다." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
