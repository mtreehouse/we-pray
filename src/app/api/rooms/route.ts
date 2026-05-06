import { NextResponse } from "next/server";
import { RoomMemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { requireNickname } from "@/lib/permissions";
import { validateRoomInput } from "@/lib/validation";

export async function GET() {
  const user = await requireNickname();

  const rooms = await prisma.roomMember.findMany({
    where: {
      userId: user.id,
      leftAt: null,
      kickedAt: null,
      room: { deletedAt: null }
    },
    include: {
      room: {
        include: {
          creator: {
            select: { nickname: true }
          }
        }
      }
    },
    orderBy: {
      joinedAt: "desc"
    }
  });

  return NextResponse.json({
    rooms: rooms.map((member) => ({
      id: member.room.id,
      title: member.room.title,
      description: member.room.description,
      creatorNickname: member.room.creator.nickname,
      role: member.role
    }))
  });
}

export async function POST(req: Request) {
  const user = await requireNickname();
  const body = (await req.json()) as {
    title?: string;
    description?: string;
    password?: string;
  };
  const error = validateRoomInput(body);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.password!.trim());

  const room = await prisma.$transaction(async (tx) => {
    const created = await tx.prayerRoom.create({
      data: {
        title: body.title!.trim(),
        description: body.description!.trim(),
        passwordHash,
        creatorUserId: user.id
      }
    });

    await tx.roomMember.create({
      data: {
        roomId: created.id,
        userId: user.id,
        role: RoomMemberRole.creator
      }
    });

    return created;
  });

  return NextResponse.json({ roomId: room.id });
}
