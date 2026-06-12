import { NextResponse } from "next/server";
import { parseDateKey, startOfUtcDay, toDateKey } from "@/lib/bible-plan";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ roomId: string }>;
};

async function buildProgressSummary(roomId: string) {
  const [members, planDates, completed] = await Promise.all([
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
      distinct: ["readingDate"],
      select: { readingDate: true },
      orderBy: { readingDate: "asc" }
    }),
    prisma.bibleProgress.findMany({
      where: { roomId, isCompleted: true },
      select: { userId: true, readingDate: true }
    })
  ]);

  const allDateKeys = planDates.map((plan) => toDateKey(plan.readingDate));
  const completedKeys = new Set(
    completed.map((item) => `${item.userId}:${toDateKey(item.readingDate)}`)
  );
  let completedTotal = 0;
  let denominatorTotal = 0;

  const memberProgress = members.map((member) => {
    // 중도 참여자는 합류일 이후 배정된 플랜 날짜만 분모에 포함한다.
    // 합류 전 통독 분량은 공동체 기록에는 남지만 개인 달성률 책임에서는 제외한다.
    const joinedDateKey = toDateKey(member.joinedAt);
    const eligibleDates = allDateKeys.filter((dateKey) => dateKey >= joinedDateKey);
    const completedCount = eligibleDates.filter((dateKey) =>
      completedKeys.has(`${member.userId}:${dateKey}`)
    ).length;
    const totalCount = eligibleDates.length;
    const rate = totalCount === 0 ? 100 : Math.round((completedCount / totalCount) * 100);

    completedTotal += completedCount;
    denominatorTotal += totalCount;

    return {
      userId: member.userId,
      nickname: member.user.nickname,
      role: member.role,
      joinedAt: member.joinedAt,
      completedCount,
      totalCount,
      rate
    };
  });

  return {
    totalPlanDays: allDateKeys.length,
    completedCount: completedTotal,
    totalCount: denominatorTotal,
    overallRate:
      denominatorTotal === 0 ? 100 : Math.round((completedTotal / denominatorTotal) * 100),
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

  // 중도 참여자는 합류일 이전 플랜을 개인 완료 처리할 수 없다.
  // 달성률 분모와 동일하게 개인 책임 범위를 합류일 이후로 맞춘다.
  if (toDateKey(readingDate) < toDateKey(member.joinedAt)) {
    return NextResponse.json({ error: "합류일 이전 플랜은 완료 처리할 수 없습니다." }, { status: 400 });
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
