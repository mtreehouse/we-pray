import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BibleRoomList } from "@/components/BibleRoomList";
import { prisma } from "@/lib/prisma";
import { requireNickname } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function seoulDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return value.year + "-" + value.month + "-" + value.day;
}

export default async function BibleRoomPage() {
  const user = await requireNickname();
  const memberships = await prisma.bibleRoomMember.findMany({
    where: {
      userId: user.id,
      leftAt: null,
      kickedAt: null,
      room: { deletedAt: null }
    },
    select: {
      role: true,
      room: {
        select: {
          id: true,
          title: true,
          description: true,
          scope: true,
          durationMonths: true,
          excludeSunday: true,
          planType: true,
          creator: { select: { nickname: true } },
          plans: {
            select: { readingDate: true },
            orderBy: { readingDate: "desc" },
            take: 1
          },
          _count: { select: { members: true } }
        }
      }
    },
    orderBy: { joinedAt: "desc" }
  });

  const todayDateKey = seoulDateKey(new Date());
  const rooms = memberships.map((membership) => ({
    id: membership.room.id,
    title: membership.room.title,
    description: membership.room.description,
    creatorNickname: membership.room.creator.nickname,
    role: membership.role,
    scope: membership.room.scope,
    durationMonths: membership.room.durationMonths,
    excludeSunday: membership.room.excludeSunday,
    planType: membership.room.planType,
    memberCount: membership.room._count.members,
    isPlanCompleted: Boolean(membership.room.plans[0] && seoulDateKey(membership.room.plans[0].readingDate) < todayDateKey)
  }));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6 dark:text-slate-100">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950 dark:text-slate-50">Bible Room</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">함께 성경을 읽고 묵상을 나누는 통독 방입니다.</p>
      </header>
      <BibleRoomList rooms={rooms} />
    </main>
  );
}
