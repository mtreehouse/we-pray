import { NextResponse } from "next/server";
import { RoomMemberRole } from "@prisma/client";
import { buildBiblePlanRows } from "@/lib/bible-plan";
import { normalizeBiblePlanType, normalizeBibleScope, numericBodyValue } from "@/lib/bible-api";
import { hashPassword } from "@/lib/password";
import { requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateBibleRoomInput } from "@/lib/validation";

export async function GET() {
  const user = await requireNickname();

  const rooms = await prisma.bibleRoomMember.findMany({
    where: {
      userId: user.id,
      leftAt: null,
      kickedAt: null,
      room: { deletedAt: null }
    },
    select: {
      role: true,
      joinedAt: true,
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
          _count: { select: { members: true, plans: true } }
        }
      }
    },
    orderBy: { joinedAt: "desc" }
  });

  return NextResponse.json({
    rooms: rooms.map((member) => ({
      id: member.room.id,
      title: member.room.title,
      description: member.room.description,
      scope: member.room.scope,
      durationMonths: member.room.durationMonths,
      excludeSunday: member.room.excludeSunday,
      planType: member.room.planType,
      creatorNickname: member.room.creator.nickname,
      memberCount: member.room._count.members,
      planRowCount: member.room._count.plans,
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
    scope?: unknown;
    durationMonths?: unknown;
    excludeSunday?: unknown;
    planType?: unknown;
  };
  const scope = normalizeBibleScope(body.scope);
  const planType = normalizeBiblePlanType(body.planType);
  const durationMonths = numericBodyValue(body.durationMonths);
  const error = validateBibleRoomInput({
    title: body.title,
    description: body.description,
    password: body.password,
    scope: scope ?? undefined,
    planType: planType ?? undefined,
    durationMonths
  });

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const passwordHash = await hashPassword(body.password!.trim());

  try {
    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.bibleRoom.create({
        data: {
          title: body.title!.trim(),
          description: body.description!.trim(),
          passwordHash,
          scope: scope!,
          durationMonths,
          excludeSunday: Boolean(body.excludeSunday),
          planType: planType!,
          creatorUserId: user.id
        },
        select: { id: true }
      });

      await tx.bibleRoomMember.create({
        data: {
          roomId: created.id,
          userId: user.id,
          role: RoomMemberRole.creator
        }
      });

      const planRows = await buildBiblePlanRows(tx, {
        roomId: created.id,
        scope: scope!,
        durationMonths,
        excludeSunday: Boolean(body.excludeSunday),
        planType: planType!,
        startDate: new Date()
      });

      await tx.biblePlan.createMany({
        data: planRows,
        skipDuplicates: true
      });

      return { id: created.id, planRowCount: planRows.length };
    });

    return NextResponse.json({ roomId: room.id, planRowCount: room.planRowCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "성경 통독 방을 생성하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
