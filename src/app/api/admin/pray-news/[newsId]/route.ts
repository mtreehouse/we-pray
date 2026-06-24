import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PRAY_NEWS_CONTENT_HTML_LIMIT, getPrayNewsPlainText, normalizePrayNewsContentHtml } from "@/lib/pray-news-content";

type Params = {
  params: Promise<{ newsId: string }>;
};

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
  const content = normalizePrayNewsContentHtml(typeof body?.content === "string" ? body.content : "");
  const contentText = getPrayNewsPlainText(content);

  if (!title) throw new Error("제목을 입력해주세요.");
  if (title.length > 80) throw new Error("제목은 80자 이하로 입력해주세요.");
  if (!contentText) throw new Error("내용을 입력해주세요.");
  if (contentText.length > 5000) throw new Error("내용은 5000자 이하로 입력해주세요.");
  if (content.length > PRAY_NEWS_CONTENT_HTML_LIMIT) throw new Error("본문 HTML 용량이 너무 큽니다. 이미지를 줄이거나 일부 내용을 정리해주세요.");

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

export async function PATCH(request: Request, { params }: Params) {
  await requireAdmin();
  const { newsId } = await params;
  const body = await request.json().catch(() => null) as PrayNewsInput | null;

  const news = await prisma.prayNews.findFirst({
    where: { id: newsId, deletedAt: null },
    select: { id: true }
  });

  if (!news) {
    return NextResponse.json({ error: "소식을 찾을 수 없습니다." }, { status: 404 });
  }

  let input: ReturnType<typeof normalizeInput>;
  try {
    input = normalizeInput(body);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "입력값이 올바르지 않습니다." }, { status: 400 });
  }

  const updated = await prisma.prayNews.update({
    where: { id: news.id },
    data: input,
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

  return NextResponse.json({ news: serializeNews(updated) });
}

export async function DELETE(_request: Request, { params }: Params) {
  await requireAdmin();
  const { newsId } = await params;

  const news = await prisma.prayNews.findFirst({
    where: { id: newsId, deletedAt: null },
    select: { id: true }
  });

  if (!news) {
    return NextResponse.json({ error: "소식을 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.prayNews.update({
    where: { id: news.id },
    data: { deletedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
