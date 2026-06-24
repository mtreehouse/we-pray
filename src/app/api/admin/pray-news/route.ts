import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

type PrayNewsInput = {
  title?: unknown;
  content?: unknown;
  imageUrl?: unknown;
};

function normalizeImageUrl(value: unknown) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new Error("이미지 링크가 올바르지 않습니다.");

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > 1000) throw new Error("이미지 링크가 너무 깁니다.");

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("이미지 링크는 http 또는 https 주소만 사용할 수 있습니다.");
    }
  } catch {
    throw new Error("이미지 링크 형식이 올바르지 않습니다.");
  }

  return trimmed;
}

function normalizeInput(body: PrayNewsInput | null) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!title) throw new Error("제목을 입력해주세요.");
  if (title.length > 80) throw new Error("제목은 80자 이하로 입력해주세요.");
  if (!content) throw new Error("내용을 입력해주세요.");
  if (content.length > 5000) throw new Error("내용은 5000자 이하로 입력해주세요.");

  return { title, content, imageUrl: normalizeImageUrl(body?.imageUrl) };
}

function serializeNews(item: {
  id: string;
  title: string;
  content: string;
  imageUrl: string | null;
  authorUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  author: { nickname: string | null } | null;
}) {
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    imageUrl: item.imageUrl,
    authorUserId: item.authorUserId,
    authorNickname: item.author?.nickname ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  const rows = await prisma.prayNews.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      authorUserId: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { nickname: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return NextResponse.json({
    news: pageRows.map(serializeNews),
    nextCursor: hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null
  });
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const body = await request.json().catch(() => null) as PrayNewsInput | null;

  let input: ReturnType<typeof normalizeInput>;
  try {
    input = normalizeInput(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const created = await prisma.prayNews.create({
    data: {
      title: input.title,
      content: input.content,
      imageUrl: input.imageUrl,
      authorUserId: admin.id
    },
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      authorUserId: true,
      createdAt: true,
      updatedAt: true,
      author: { select: { nickname: true } }
    }
  });

  return NextResponse.json({ news: serializeNews(created) });
}
