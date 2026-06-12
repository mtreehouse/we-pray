import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BibleRoomList } from "@/components/BibleRoomList";
import { prisma } from "@/lib/prisma";
import { requireNickname } from "@/lib/permissions";

export const dynamic = "force-dynamic";

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
          _count: { select: { members: true } }
        }
      }
    },
    orderBy: { joinedAt: "desc" }
  });

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
    memberCount: membership.room._count.members
  }));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">Bible Room</h1>
        <p className="mt-2 text-sm text-slate-600">함께 성경을 읽고 묵상을 나누는 통독 방입니다.</p>
      </header>
      <BibleRoomList rooms={rooms} />
    </main>
  );
}
