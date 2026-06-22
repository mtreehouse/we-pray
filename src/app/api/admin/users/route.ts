import { AuthProvider, Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 50;

function providerFromQuery(query: string): AuthProvider | null {
  if (query === "google" || query === "kakao" || query === "naver") return query;
  return null;
}

function roleFromQuery(query: string): UserRole | null {
  if (query === "admin" || query === "user") return query;
  return null;
}

function userWhere(query: string): Prisma.UserWhereInput {
  const baseWhere: Prisma.UserWhereInput = { deletedAt: null };
  if (!query) return baseWhere;

  const provider = providerFromQuery(query);
  const role = roleFromQuery(query);
  const searchOr: Prisma.UserWhereInput[] = [
    { id: { contains: query, mode: "insensitive" } },
    { providerUserId: { contains: query, mode: "insensitive" } },
    { nickname: { contains: query, mode: "insensitive" } }
  ];
  if (provider) searchOr.push({ provider });
  if (role) searchOr.push({ role });

  return {
    AND: [
      baseWhere,
      { OR: searchOr }
    ]
  };
}

export async function GET(request: Request) {
  const currentUser = await requireAdmin();
  const url = new URL(request.url);
  const cursor = url.searchParams.get("cursor");
  const query = (url.searchParams.get("q") ?? "").trim().toLowerCase();

  const rows = await prisma.user.findMany({
    where: userWhere(query),
    select: {
      id: true,
      nickname: true,
      provider: true,
      role: true,
      bibleCopyrightAllowed: true,
      createdAt: true
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {})
  });

  const hasMore = rows.length > PAGE_SIZE;
  const pageRows = hasMore ? rows.slice(0, PAGE_SIZE) : rows;
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.id ?? null : null;

  return NextResponse.json({
    users: pageRows.map((user) => ({
      id: user.id,
      nickname: user.nickname,
      provider: user.provider,
      role: user.role,
      bibleCopyrightAllowed: user.bibleCopyrightAllowed,
      createdAt: user.createdAt.toISOString(),
      isMe: user.id === currentUser.id
    })),
    nextCursor
  });
}
