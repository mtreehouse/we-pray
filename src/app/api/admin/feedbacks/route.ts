import { AuthProvider, FeedbackStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

type FeedbackFilter = "open" | "closed" | "all";

function providerFromQuery(query: string): AuthProvider | null {
  if (query === "google" || query === "kakao" || query === "naver") return query;
  return null;
}

function feedbackNumberFromQuery(query: string) {
  const normalized = query.toUpperCase().replace(/^#/, "");
  const match = normalized.match(/^FB0*(\d+)$/);
  if (match) return Number(match[1]);

  const queryNumber = Number(query);
  if (Number.isInteger(queryNumber) && queryNumber > 0) return queryNumber;
  return null;
}

function feedbackWhere(filter: FeedbackFilter, query: string): Prisma.FeedbackWhereInput {
  const statusWhere = filter === "closed"
    ? { status: "CLOSED" as FeedbackStatus }
    : filter === "all"
      ? {}
      : { status: { not: "CLOSED" as FeedbackStatus } };

  if (!query) return statusWhere;

  const provider = providerFromQuery(query);
  const queryNumber = feedbackNumberFromQuery(query);
  const searchOr: Prisma.FeedbackWhereInput[] = [
    { id: { contains: query, mode: "insensitive" } },
    { title: { contains: query, mode: "insensitive" } },
    { content: { contains: query, mode: "insensitive" } },
    { replyEmail: { contains: query, mode: "insensitive" } },
    { user: { nickname: { contains: query, mode: "insensitive" } } }
  ];
  if (queryNumber) searchOr.push({ feedbackNumber: queryNumber });
  if (provider) searchOr.push({ user: { provider } });

  return {
    AND: [
      statusWhere,
      { OR: searchOr }
    ]
  };
}

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const filterParam = url.searchParams.get("filter");
  const filter: FeedbackFilter = filterParam === "closed" || filterParam === "all" ? filterParam : "open";
  const cursor = url.searchParams.get("cursor");
  const query = (url.searchParams.get("q") ?? "").trim();

  const rows = await prisma.feedback.findMany({
    where: feedbackWhere(filter, query),
    select: {
      id: true,
      feedbackNumber: true,
      title: true,
      content: true,
      replyEmail: true,
      status: true,
      adminMemo: true,
      emailTo: true,
      emailSentAt: true,
      emailError: true,
      createdAt: true,
      closedAt: true,
      user: { select: { nickname: true, provider: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null;

  return NextResponse.json({
    feedbacks: pageRows.map((feedback) => ({
      id: feedback.id,
      feedbackNumber: feedback.feedbackNumber,
      title: feedback.title,
      content: feedback.content,
      replyEmail: feedback.replyEmail,
      status: feedback.status,
      adminMemo: feedback.adminMemo,
      emailTo: feedback.emailTo,
      emailSentAt: feedback.emailSentAt?.toISOString() ?? null,
      emailError: feedback.emailError,
      createdAt: feedback.createdAt.toISOString(),
      closedAt: feedback.closedAt?.toISOString() ?? null,
      userNickname: feedback.user.nickname,
      userProvider: feedback.user.provider
    })),
    nextCursor
  });
}
