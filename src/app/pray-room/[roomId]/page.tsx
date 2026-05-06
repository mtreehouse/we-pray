import { notFound } from "next/navigation";
import { PrayerRoomDetail } from "@/components/PrayerRoomDetail";
import { prisma } from "@/lib/prisma";
import { requireNickname, requireRoomMember } from "@/lib/permissions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    roomId: string;
  }>;
};

export default async function PrayerRoomDetailPage({ params }: PageProps) {
  const user = await requireNickname();
  const { roomId } = await params;
  const membership = await requireRoomMember(roomId, user.id);

  if (!membership) {
    notFound();
  }

  const room = await prisma.prayerRoom.findFirst({
    where: { id: roomId, deletedAt: null },
    include: {
      creator: { select: { nickname: true } },
      members: {
        where: {
          leftAt: null,
          kickedAt: null,
          user: { deletedAt: null }
        },
        include: {
          user: { select: { id: true, nickname: true } }
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
      },
      posts: {
        where: { deletedAt: null },
        include: {
          user: { select: { nickname: true } }
        },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!room) {
    notFound();
  }

  return (
    <PrayerRoomDetail
      currentUserId={user.id}
      room={{
        id: room.id,
        title: room.title,
        description: room.description,
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
      posts={room.posts.map((post) => ({
        id: post.id,
        userId: post.userId,
        authorNickname: post.user.nickname,
        content: post.content,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString()
      }))}
    />
  );
}
