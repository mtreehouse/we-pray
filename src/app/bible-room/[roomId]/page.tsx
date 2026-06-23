import { notFound, redirect } from "next/navigation";
import { BibleRoomDetail } from "@/components/BibleRoomDetail";
import { todayDateKey } from "@/lib/bible-plan";
import { normalizeBibleTranslationSettings } from "@/lib/bible-translations";
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

  if (!membership) {
    const roomExists = await prisma.bibleRoom.findFirst({
      where: { id: roomId, deletedAt: null },
      select: { id: true }
    });

    if (roomExists) {
      redirect("/join/bible-room/" + roomId);
    }

    notFound();
  }

  const room = await prisma.bibleRoom.findFirst({
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
    });

  if (!room) notFound();

  const translationRows = await prisma.bibleTranslationSetting.findMany({
    select: {
      code: true,
      label: true,
      isVisible: true,
      requiresCopyright: true,
      sortOrder: true
    },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }]
  });
  const translations = normalizeBibleTranslationSettings(translationRows);

  return (
    <BibleRoomDetail
      currentUserId={user.id}
      bibleCopyrightAllowed={user.bibleCopyrightAllowed}
      translations={translations}
      initialDate={todayDateKey()}
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
