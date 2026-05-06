import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNickname, requireRoomMember } from "@/lib/permissions";
import { validatePrayerPost } from "@/lib/validation";

type Params = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function POST(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "방 멤버만 작성할 수 있습니다." }, { status: 403 });
  }

  const body = (await req.json()) as { content?: string };
  const content = body.content?.trim() ?? "";
  const error = validatePrayerPost(content);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  await prisma.prayerPost.create({
    data: {
      roomId,
      userId: user.id,
      content
    }
  });

  return NextResponse.json({ ok: true });
}
