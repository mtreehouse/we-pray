import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireNickname, requireRoomMember } from "@/lib/permissions";
import { validatePrayerPost } from "@/lib/validation";

type Params = {
  params: Promise<{
    roomId: string;
  }>;
};

export async function GET(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "방 멤버만 조회할 수 있습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor") || undefined;
  const requestedTake = Number(searchParams.get("take") ?? 50);
  const take = Number.isFinite(requestedTake) ? Math.min(Math.max(requestedTake, 1), 50) : 50;

  const posts = await prisma.prayerPost.findMany({
    where: { roomId, deletedAt: null },
    select: {
      id: true,
      userId: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { nickname: true } },
      prayers: {
        where: { userId: user.id },
        select: { id: true },
        take: 1
      },
      _count: { select: { prayers: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  const hasMore = posts.length > take;
  const items = hasMore ? posts.slice(0, take) : posts;

  return NextResponse.json({
    posts: items.map((post) => ({
      id: post.id,
      userId: post.userId,
      authorNickname: post.user.nickname,
      content: post.content,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      prayerCount: post._count.prayers,
      isPrayedByMe: post.prayers.length > 0
    })),
    nextCursor: hasMore ? items[items.length - 1]?.id ?? null : null
  });
}

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
