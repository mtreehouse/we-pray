import { NextResponse } from "next/server";
import { requireBibleRoomMember, requireNickname } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ roomId: string }>;
};

export async function GET(req: Request, { params }: Params) {
  const user = await requireNickname();
  const { roomId } = await params;
  const member = await requireBibleRoomMember(roomId, user.id);

  if (!member) {
    return NextResponse.json({ error: "성경방 멤버만 조회할 수 있습니다." }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const bookCode = searchParams.get("bookCode") ?? "";
  const chapter = Number(searchParams.get("chapter"));
  const focusVerse = Number(searchParams.get("verse"));

  if (!bookCode || !Number.isInteger(chapter) || chapter < 1) {
    return NextResponse.json({ error: "조회할 본문을 선택해주세요." }, { status: 400 });
  }

  const verses = await prisma.bibleVerse.findMany({
    where: { bookCode, chapter },
    select: {
      bookCode: true,
      bookName: true,
      chapter: true,
      verse: true,
      content: true
    },
    orderBy: { verse: "asc" }
  });

  if (!verses.length) {
    return NextResponse.json({ error: "본문을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    passage: {
      bookCode,
      bookName: verses[0].bookName,
      chapter,
      focusVerse: Number.isInteger(focusVerse) ? focusVerse : null,
      verses: verses.map((verse) => ({
        verse: verse.verse,
        content: verse.content
      }))
    }
  });
}
