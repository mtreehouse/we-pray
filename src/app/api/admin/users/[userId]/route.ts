import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    userId: string;
  }>;
};

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  const { userId } = await params;

  if (admin.id === userId) {
    return NextResponse.json({ error: "관리자는 자기 자신을 삭제할 수 없습니다." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
