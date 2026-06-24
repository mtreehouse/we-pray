import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type DeleteBody = {
  nickname?: unknown;
};

export async function DELETE(req: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as DeleteBody;
  const expectedNickname = user.nickname ?? "닉네임 없음";

  if (body.nickname !== expectedNickname) {
    return NextResponse.json({ error: "현재 닉네임이 일치하지 않습니다." }, { status: 400 });
  }

  const [ownedPrayerRoom, ownedBibleRoom] = await Promise.all([
    prisma.prayerRoom.findFirst({
      where: {
        creatorUserId: user.id,
        deletedAt: null
      },
      select: { id: true }
    }),
    prisma.bibleRoom.findFirst({
      where: {
        creatorUserId: user.id,
        deletedAt: null
      },
      select: { id: true }
    })
  ]);

  if (ownedPrayerRoom || ownedBibleRoom) {
    return NextResponse.json(
      { error: "방장인 방이 있으면 탈퇴할 수 없습니다. 방을 삭제하거나 방장 권한을 정리해주세요." },
      { status: 409 }
    );
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
