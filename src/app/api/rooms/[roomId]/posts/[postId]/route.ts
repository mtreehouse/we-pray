import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNickname, requireRoomMember } from "@/lib/permissions";
import { validatePrayerPost } from "@/lib/validation";

type Params = {
  params: Promise<{
    roomId: string;
    postId: string;
  }>;
};

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId, postId } = await params;
  const member = await requireRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "방 멤버만 수정할 수 있습니다." }, { status: 403 });
  }

  const body = (await req.json()) as { content?: string };
  const content = body.content?.trim() ?? "";
  const error = validatePrayerPost(content);

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const post = await prisma.prayerPost.findFirst({
    where: {
      id: postId,
      roomId,
      userId: user.id,
      deletedAt: null
    }
  });

  if (!post) {
    return NextResponse.json({ error: "수정할 수 없는 기도제목입니다." }, { status: 404 });
  }

  await prisma.prayerPost.update({
    where: { id: post.id },
    data: { content }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId, postId } = await params;
  const member = await requireRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "방 멤버만 삭제할 수 있습니다." }, { status: 403 });
  }

  const post = await prisma.prayerPost.findFirst({
    where: {
      id: postId,
      roomId,
      userId: user.id,
      deletedAt: null
    }
  });

  if (!post) {
    return NextResponse.json({ error: "삭제할 수 없는 기도제목입니다." }, { status: 404 });
  }

  await prisma.prayerPost.update({
    where: { id: post.id },
    data: { deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
