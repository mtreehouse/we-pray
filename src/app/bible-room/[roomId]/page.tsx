import { notFound } from "next/navigation";
import { BibleRoomDetail } from "@/components/BibleRoomDetail";
import { toDateKey } from "@/lib/bible-plan";
import { prisma } from "@/lib/prisma";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export default async function BibleRoomDetailPage({ params }: PageProps) {
  const user = await requireNickname();
  const { roomId } = await params;
  const membership = await requireBibleRoomMember(roomId, user.id);

  if (!membership) notFound();

  const [room, firstPlan] = await Promise.all([
    prisma.bibleRoom.findFirst({
      where: { id: roomId, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        scope: true,
        durationMonths: true,
        excludeSunday: true,
        planType: true,
        createdAt: true,
        creator: { select: { nickname: true } },
        members: {
          where: { leftAt: null, kickedAt: null, user: { deletedAt: null } },
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
            user: { select: { nickname: true } }
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
        }
      }
    }),
    prisma.biblePlan.findFirst({
      where: { roomId },
      select: { readingDate: true },
      orderBy: { readingDate: "asc" }
    })
  ]);

  if (!room) notFound();

  return (
    <BibleRoomDetail
      currentUserId={user.id}
      initialDate={firstPlan ? toDateKey(firstPlan.readingDate) : toDateKey(new Date())}
      room={{
        id: room.id,
        title: room.title,
        description: room.description,
        scope: room.scope,
        durationMonths: room.durationMonths,
        excludeSunday: room.excludeSunday,
        planType: room.planType,
        creatorNickname: room.creator.nickname,
        createdAt: room.createdAt.toISOString(),
        isCreator: membership.role === "creator"
      }}
      members={room.members.map((member) => ({
        id: member.id,
        userId: member.userId,
        nickname: member.user.nickname,
        role: member.role,
        joinedAt: member.joinedAt.toISOString()
      }))}
    />
  );
}
