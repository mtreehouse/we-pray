import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PrayRoomList } from "@/components/PrayRoomList";
import { prisma } from "@/lib/prisma";
import { requireNickname } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function PrayRoomPage() {
  const user = await requireNickname();
  const memberships = await prisma.roomMember.findMany({
    where: {
      userId: user.id,
      leftAt: null,
      kickedAt: null,
      room: { deletedAt: null }
    },
    include: {
      room: {
        include: {
          creator: { select: { nickname: true } }
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
    role: membership.role
  }));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">Pray Room</h1>
        <p className="mt-2 text-sm text-slate-600">내가 입장한 방 목록입니다.</p>
      </header>
      <PrayRoomList rooms={rooms} />
    </main>
  );
}
