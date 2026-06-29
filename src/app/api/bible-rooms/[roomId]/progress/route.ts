import { NextResponse } from "next/server";
import { parseDateKey, startOfUtcDay, todayDateKey, toDateKey } from "@/lib/bible-plan";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ roomId: string }>;
};

async function buildProgressSummary(roomId: string) {
  const [members, planRows, completed, reflections] = await Promise.all([
    prisma.bibleRoomMember.findMany({
      where: { roomId, leftAt: null, kickedAt: null, user: { deletedAt: null } },
      select: {
        userId: true,
        role: true,
        joinedAt: true,
        user: { select: { nickname: true } }
      },
      orderBy: { joinedAt: "asc" }
    }),
    prisma.biblePlan.findMany({
      where: { roomId },
      select: { readingDate: true, bookCode: true, startChapter: true, endChapter: true },
      orderBy: { readingDate: "asc" }
    }),
    prisma.bibleProgress.findMany({
      where: { roomId, isCompleted: true },
      select: { userId: true, readingDate: true }
    }),
    prisma.bibleReflection.findMany({
      where: { roomId, deletedAt: null },
      select: { userId: true, bookCode: true, chapter: true }
    })
  ]);

  const todayKey = todayDateKey();
  const allDateKeys = [...new Set(planRows.map((plan) => toDateKey(plan.readingDate)))];
  const currentDateKeys = allDateKeys.filter((dateKey) => dateKey <= todayKey);
  const completedKeys = new Set(
    completed.map((item) => `${item.userId}:${toDateKey(item.readingDate)}`)
  );
  const reflectionKeys = new Set<string>();

  for (const reflection of reflections) {
    const plan = planRows.find((item) =>
      item.bookCode === reflection.bookCode
      && item.startChapter <= reflection.chapter
      && item.endChapter >= reflection.chapter
    );
    if (plan) reflectionKeys.add(`${reflection.userId}:${toDateKey(plan.readingDate)}`);
  }

  let earnedTotal = 0;
  let possibleTotal = 0;

  const memberProgress = members.map((member) => {
    // 중도 참여자는 합류일 이후이면서 오늘까지 도달한 플랜 날짜만 분모에 포함한다.
    // 각 날짜는 읽기 완료 50점, 나눔 작성 50점으로 계산한다.
    const joinedDateKey = toDateKey(member.joinedAt);
    const eligibleDates = currentDateKeys.filter((dateKey) => dateKey >= joinedDateKey);
    const completedCount = eligibleDates.filter((dateKey) =>
      completedKeys.has(`${member.userId}:${dateKey}`)
    ).length;
    const reflectionCount = eligibleDates.filter((dateKey) =>
      reflectionKeys.has(`${member.userId}:${dateKey}`)
    ).length;
    const totalCount = eligibleDates.length;
    const earnedPoints = completedCount * 50 + reflectionCount * 50;
    const possiblePoints = totalCount * 100;
    const rate = possiblePoints === 0 ? 100 : Math.round((earnedPoints / possiblePoints) * 100);

    earnedTotal += earnedPoints;
    possibleTotal += possiblePoints;

    return {
      userId: member.userId,
      nickname: member.user.nickname,
      role: member.role,
      joinedAt: member.joinedAt,
      completedCount,
      reflectionCount,
      totalCount,
      earnedPoints,
      possiblePoints,
      rate
    };
  });

  return {
    totalPlanDays: allDateKeys.length,
    currentPlanDays: currentDateKeys.length,
    completedCount: Math.round(earnedTotal / 100),
    totalCount: Math.round(possibleTotal / 100),
    earnedPoints: earnedTotal,
    possiblePoints: possibleTotal,
    overallRate: possibleTotal === 0 ? 100 : Math.round((earnedTotal / possibleTotal) * 100),
    members: memberProgress
  };
}

export async function GET(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 조회할 수 있습니다." }, { status: 403 });
  }

  return NextResponse.json({ progress: await buildProgressSummary(roomId) });
}

export async function POST(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 완료 처리할 수 있습니다." }, { status: 403 });
  }

  const body = (await req.json()) as { date?: string; isCompleted?: boolean };
  const readingDate = parseDateKey(body.date ?? "");

  if (!readingDate) {
    return NextResponse.json({ error: "완료 처리할 날짜를 YYYY-MM-DD 형식으로 입력해주세요." }, { status: 400 });
  }

  const planExists = await prisma.biblePlan.findFirst({
    where: { roomId, readingDate },
    select: { id: true }
  });

  if (!planExists) {
    return NextResponse.json({ error: "해당 날짜의 통독 플랜이 없습니다." }, { status: 404 });
  }

  const existing = await prisma.bibleProgress.findUnique({
    where: {
      roomId_userId_readingDate: {
        roomId,
        userId: user.id,
        readingDate
      }
    },
    select: { isCompleted: true }
  });
  const isCompleted = typeof body.isCompleted === "boolean" ? body.isCompleted : !existing?.isCompleted;

  await prisma.bibleProgress.upsert({
    where: {
      roomId_userId_readingDate: {
        roomId,
        userId: user.id,
        readingDate: startOfUtcDay(readingDate)
      }
    },
    create: {
      roomId,
      userId: user.id,
      readingDate,
      isCompleted
    },
    update: { isCompleted }
  });

  return NextResponse.json({
    date: toDateKey(readingDate),
    isCompleted,
    progress: await buildProgressSummary(roomId)
  });
}
