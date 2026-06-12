import { NextResponse } from "next/server";
import { requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await requireNickname();

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();

  if (!q) {
    return NextResponse.json({ rooms: [] });
  }

  const rooms = await prisma.prayerRoom.findMany({
    where: {
      deletedAt: null,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { creator: { nickname: { contains: q, mode: "insensitive" } } }
      ]
    },
    include: {
      creator: { select: { nickname: true } },
      members: {
        where: {
          userId: user.id,
          leftAt: null,
          kickedAt: null
        },
        select: { id: true }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 20
  });

  return NextResponse.json({
    rooms: rooms.map((room) => ({
      id: room.id,
      title: room.title,
      description: room.description,
      creatorNickname: room.creator.nickname,
      isJoined: room.members.length > 0
    }))
  });
}
