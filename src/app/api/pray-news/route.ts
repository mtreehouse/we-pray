import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");

  const rows = await prisma.prayNews.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      createdAt: true
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return NextResponse.json({
    news: pageRows.map((item) => ({
      id: item.id,
      title: item.title,
      content: item.content,
      imageUrl: item.imageUrl,
      createdAt: item.createdAt.toISOString()
    })),
    nextCursor: hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null
  });
}
