import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ cardId: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "로그인 후 성경 암송을 사용할 수 있습니다." }, { status: 401 });
}

export async function DELETE(_request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user?.nickname) return unauthorized();

  const { cardId } = await params;
  const result = await prisma.bibleMemoryCard.deleteMany({
    where: {
      id: cardId,
      userId: user.id
    }
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "삭제할 말씀카드를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
