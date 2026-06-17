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

  const [plans, progress, myReflections] = await Promise.all([
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
    }),
    prisma.bibleReflection.findMany({
      where: { roomId, userId: user.id, deletedAt: null },
      select: { bookCode: true, chapter: true }
    })
  ]);

  const bookCodes = [...new Set(plans.map((plan) => plan.bookCode))];
  const books = bookCodes.length
    ? await prisma.bibleVerse.groupBy({
        by: ["bookCode", "bookName"],
        where: { bookCode: { in: bookCodes } }
      })
    : [];
  const bookNameByCode = new Map(books.map((book) => [book.bookCode, book.bookName]));
  const completedDates = new Set(progress.map((item) => toDateKey(item.readingDate)));
  const reflectedDates = new Set<string>();
  const byDate = new Map<string, Array<(typeof plans)[number]>>();

  for (const plan of plans) {
    const dateKey = toDateKey(plan.readingDate);
    byDate.set(dateKey, [...(byDate.get(dateKey) ?? []), plan]);
  }

  for (const reflection of myReflections) {
    const plan = plans.find((item) =>
      item.bookCode === reflection.bookCode
      && item.startChapter <= reflection.chapter
      && item.endChapter >= reflection.chapter
    );
    if (plan) reflectedDates.add(toDateKey(plan.readingDate));
  }

  return NextResponse.json({
    days: [...byDate.entries()].map(([date, items]) => ({
      date,
      isCompleted: completedDates.has(date),
      hasReflection: reflectedDates.has(date),
      plans: items.map((item) => ({
        id: item.id,
        bookCode: item.bookCode,
        bookName: bookNameByCode.get(item.bookCode) ?? item.bookCode,
        startChapter: item.startChapter,
        endChapter: item.endChapter
      }))
    }))
  });
}
