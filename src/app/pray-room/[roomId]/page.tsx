import { notFound, redirect } from "next/navigation";
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
    const roomExists = await prisma.prayerRoom.findFirst({
      where: { id: roomId, deletedAt: null },
      select: { id: true }
    });

    if (roomExists) {
      redirect("/join/pray-room/" + roomId);
    }

    notFound();
  }

  const [room, postCounts, initialPostsWithExtra] = await Promise.all([
    prisma.prayerRoom.findFirst({
      where: { id: roomId, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        creator: { select: { nickname: true } },
        members: {
          where: {
            leftAt: null,
            kickedAt: null,
            user: { deletedAt: null }
          },
          select: {
            id: true,
            userId: true,
            role: true,
            joinedAt: true,
            user: { select: { id: true, nickname: true } }
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
        }
      }
    }),
    prisma.prayerPost.groupBy({
      by: ["userId"],
      where: { roomId, deletedAt: null },
      _count: { _all: true }
    }),
    prisma.prayerPost.findMany({
      where: { roomId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        answeredAt: true,
        user: { select: { nickname: true } },
        prayers: {
          where: { userId: user.id },
          select: { id: true },
          take: 1
        },
        _count: { select: { prayers: true } }
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 51
    })
  ]);

  if (!room) {
    notFound();
  }

  const initialPosts = initialPostsWithExtra.slice(0, 50);
  const postCountByUserId = new Map(postCounts.map((item) => [item.userId, item._count._all]));

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
        joinedAt: member.joinedAt.toISOString(),
        postCount: postCountByUserId.get(member.userId) ?? 0
      }))}
      posts={initialPosts.map((post) => ({
        id: post.id,
        userId: post.userId,
        authorNickname: post.user.nickname,
        content: post.content,
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
        answeredAt: post.answeredAt?.toISOString() ?? null,
        prayerCount: post._count.prayers,
        isPrayedByMe: post.prayers.length > 0
      }))}
      nextCursor={initialPostsWithExtra.length > 50 ? initialPosts[initialPosts.length - 1]?.id ?? null : null}
    />
  );
}
