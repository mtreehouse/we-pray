import { NextResponse } from "next/server";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toDateKey } from "@/lib/bible-plan";

type Params = {
  params: Promise<{ roomId: string }>;
};

export async function GET(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 조회할 수 있습니다." }, { status: 403 });
  }

  const [plans, progress] = await Promise.all([
    prisma.biblePlan.findMany({
      where: { roomId },
      select: {
        id: true,
        readingDate: true,
        bookCode: true,
        startChapter: true,
        endChapter: true
      },
      orderBy: [{ readingDate: "asc" }, { id: "asc" }]
    }),
    prisma.bibleProgress.findMany({
      where: { roomId, userId: user.id, isCompleted: true },
      select: { readingDate: true }
    })
  ]);

  const completedDates = new Set(progress.map((item) => toDateKey(item.readingDate)));
  const byDate = new Map<string, Array<(typeof plans)[number]>>();

  for (const plan of plans) {
    const dateKey = toDateKey(plan.readingDate);
    byDate.set(dateKey, [...(byDate.get(dateKey) ?? []), plan]);
  }

  return NextResponse.json({
    days: [...byDate.entries()].map(([date, items]) => ({
      date,
      isCompleted: completedDates.has(date),
      plans: items.map((item) => ({
        id: item.id,
        bookCode: item.bookCode,
        startChapter: item.startChapter,
        endChapter: item.endChapter
      }))
    }))
  });
}
