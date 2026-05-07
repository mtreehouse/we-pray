import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      nickname: null,
      deletedAt: new Date()
    }
  });

  return NextResponse.json({ ok: true });
}
