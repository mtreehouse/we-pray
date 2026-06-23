import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SharedRoomJoin } from "@/components/SharedRoomJoin";
import { getCurrentUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ roomId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roomId } = await params;
  const room = await prisma.bibleRoom.findFirst({
    where: { id: roomId, deletedAt: null },
    select: { title: true }
  });
  const title = room ? room.title + " | WePray 성경방 초대" : "WePray 성경방 초대";
  const description = "함께 말씀을 읽을 성경방에 초대합니다.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: "/pwa-icon-512.png", width: 512, height: 512, alt: "WePray" }]
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: ["/pwa-icon-512.png"]
    }
  };
}

export default async function SharedBibleRoomPage({ params }: PageProps) {
  const { roomId } = await params;
  const nextPath = "/join/bible-room/" + roomId;
  const user = await getCurrentUser();

  if (!user) redirect("/login?next=" + encodeURIComponent(nextPath));
  if (!user.nickname) redirect("/nickname?next=" + encodeURIComponent(nextPath));

  const room = await prisma.bibleRoom.findFirst({
    where: { id: roomId, deletedAt: null },
    select: {
      id: true,
      title: true,
      members: {
        where: { userId: user.id, leftAt: null, kickedAt: null },
        select: { id: true },
        take: 1
      }
    }
  });

  if (!room) notFound();
  if (room.members.length > 0) redirect("/bible-room/" + room.id);

  return <SharedRoomJoin kind="bible" roomId={room.id} roomTitle={room.title} />;
}
