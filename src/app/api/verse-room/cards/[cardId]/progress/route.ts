import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isBibleMemoryMastery, masteryProgress } from "@/lib/verse-room";

type Params = {
  params: Promise<{ cardId: string }>;
};

function unauthorized() {
  return NextResponse.json({ error: "로그인 후 성경 암송을 사용할 수 있습니다." }, { status: 401 });
}

export async function PATCH(request: Request, { params }: Params) {
  const user = await getCurrentUser();
  if (!user?.nickname) return unauthorized();

  const { cardId } = await params;
  const body = await request.json().catch(() => ({})) as { mastery?: unknown };
  if (!isBibleMemoryMastery(body.mastery)) {
    return NextResponse.json({ error: "암송 상태를 선택해주세요." }, { status: 400 });
  }

  const card = await prisma.bibleMemoryCard.findFirst({
    where: { id: cardId, userId: user.id },
    select: { id: true }
  });

  if (!card) {
    return NextResponse.json({ error: "말씀카드를 찾을 수 없습니다." }, { status: 404 });
  }

  const progress = await prisma.bibleMemoryProgress.upsert({
    where: { cardId },
    update: {
      mastery: body.mastery,
      progressPercent: masteryProgress(body.mastery),
      lastReviewedAt: new Date()
    },
    create: {
      cardId,
      userId: user.id,
      mastery: body.mastery,
      progressPercent: masteryProgress(body.mastery),
      lastReviewedAt: new Date()
    },
    select: {
      mastery: true,
      progressPercent: true,
      lastReviewedAt: true
    }
  });

  return NextResponse.json({
    progress: {
      mastery: progress.mastery,
      progressPercent: progress.progressPercent,
      lastReviewedAt: progress.lastReviewedAt?.toISOString() ?? null
    }
  });
}
