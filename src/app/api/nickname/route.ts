import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { validateNickname } from "@/lib/validation";

export async function POST(req: Request) {
  const user = await requireUser();
  const body = (await req.json()) as { nickname?: string };
  const nickname = body.nickname?.trim() ?? "";
  const error = validateNickname(nickname);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { nickname }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "이미 사용 중인 닉네임입니다." }, { status: 409 });
    }

    return NextResponse.json({ error: "닉네임 저장에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
