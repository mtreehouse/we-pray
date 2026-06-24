import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ADMIN_ROOM_PAGE_SIZE = 50;

export type AdminRoomFilter = "all" | "pray" | "bible";
export type AdminRoomKind = "pray" | "bible";

export type AdminRoomMemberView = {
  id: string;
  userId: string;
  nickname: string | null;
  role: string;
  joinedAt: string;
  leftAt: string | null;
  kickedAt: string | null;
  status: "active" | "left" | "kicked";
};

export type AdminRoomView = {
  kind: AdminRoomKind;
  id: string;
  title: string;
  description: string;
  creatorUserId: string;
  creatorNickname: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  activeMemberCount: number;
  contentCount: number;
  members: AdminRoomMemberView[];
  bibleInfo?: {
    scope: string;
    durationMonths: number;
    excludeSunday: boolean;
    planType: string;
    planCount: number;
  };
};

type AdminRoomInternal = AdminRoomView & {
  sortTime: number;
};

export type AdminRoomListResult = {
  rooms: AdminRoomView[];
  nextCursor: string | null;
};

function offsetFromCursor(cursor: string | null) {
  if (!cursor) return 0;
  const offset = Number.parseInt(cursor, 10);
  return Number.isFinite(offset) && offset > 0 ? offset : 0;
}

function searchText(query: string) {
  return query.trim().toLowerCase();
}

function prayerWhere(query: string): Prisma.PrayerRoomWhereInput {
  const baseWhere: Prisma.PrayerRoomWhereInput = { deletedAt: null };
  const q = searchText(query);
  if (!q) return baseWhere;

  return {
    AND: [
      baseWhere,
      {
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { creator: { nickname: { contains: q, mode: "insensitive" } } }
        ]
      }
    ]
  };
}

function bibleWhere(query: string): Prisma.BibleRoomWhereInput {
  const baseWhere: Prisma.BibleRoomWhereInput = { deletedAt: null };
  const q = searchText(query);
  if (!q) return baseWhere;

  return {
    AND: [
      baseWhere,
      {
        OR: [
          { id: { contains: q, mode: "insensitive" } },
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { creator: { nickname: { contains: q, mode: "insensitive" } } }
        ]
      }
    ]
  };
}

function memberStatus(member: { leftAt: Date | null; kickedAt: Date | null }): AdminRoomMemberView["status"] {
  if (member.kickedAt) return "kicked";
  if (member.leftAt) return "left";
  return "active";
}

function mapMember(member: {
  id: string;
  userId: string;
  role: string;
  joinedAt: Date;
  leftAt: Date | null;
  kickedAt: Date | null;
  user: { nickname: string | null };
}): AdminRoomMemberView {
  return {
    id: member.id,
    userId: member.userId,
    nickname: member.user.nickname,
    role: member.role,
    joinedAt: member.joinedAt.toISOString(),
    leftAt: member.leftAt?.toISOString() ?? null,
    kickedAt: member.kickedAt?.toISOString() ?? null,
    status: memberStatus(member)
  };
}

function withoutSort(room: AdminRoomInternal): AdminRoomView {
  const { sortTime, ...view } = room;
  return view;
}

async function listPrayerRooms(query: string, take: number, skip: number) {
  const rows = await prisma.prayerRoom.findMany({
    where: prayerWhere(query),
    select: {
      id: true,
      title: true,
      description: true,
      creatorUserId: true,
      createdAt: true,
      updatedAt: true,
      creator: { select: { nickname: true } },
      members: {
        where: { user: { deletedAt: null } },
        select: {
          id: true,
          userId: true,
          role: true,
          joinedAt: true,
          leftAt: true,
          kickedAt: true,
          user: { select: { nickname: true } }
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
      },
      _count: { select: { members: true, posts: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    skip
  });

  return rows.map((room): AdminRoomInternal => {
    const members = room.members.map(mapMember);
    return {
      kind: "pray",
      id: room.id,
      title: room.title,
      description: room.description,
      creatorUserId: room.creatorUserId,
      creatorNickname: room.creator.nickname,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      memberCount: room._count.members,
      activeMemberCount: members.filter((member) => member.status === "active").length,
      contentCount: room._count.posts,
      members,
      sortTime: room.createdAt.getTime()
    };
  });
}

async function listBibleRooms(query: string, take: number, skip: number) {
  const rows = await prisma.bibleRoom.findMany({
    where: bibleWhere(query),
    select: {
      id: true,
      title: true,
      description: true,
      creatorUserId: true,
      scope: true,
      durationMonths: true,
      excludeSunday: true,
      planType: true,
      createdAt: true,
      updatedAt: true,
      creator: { select: { nickname: true } },
      members: {
        where: { user: { deletedAt: null } },
        select: {
          id: true,
          userId: true,
          role: true,
          joinedAt: true,
          leftAt: true,
          kickedAt: true,
          user: { select: { nickname: true } }
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }]
      },
      _count: { select: { members: true, reflections: true, plans: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    skip
  });

  return rows.map((room): AdminRoomInternal => {
    const members = room.members.map(mapMember);
    return {
      kind: "bible",
      id: room.id,
      title: room.title,
      description: room.description,
      creatorUserId: room.creatorUserId,
      creatorNickname: room.creator.nickname,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
      memberCount: room._count.members,
      activeMemberCount: members.filter((member) => member.status === "active").length,
      contentCount: room._count.reflections,
      members,
      bibleInfo: {
        scope: room.scope,
        durationMonths: room.durationMonths,
        excludeSunday: room.excludeSunday,
        planType: room.planType,
        planCount: room._count.plans
      },
      sortTime: room.createdAt.getTime()
    };
  });
}

export async function listAdminRooms({
  filter,
  query,
  cursor,
  pageSize = ADMIN_ROOM_PAGE_SIZE
}: {
  filter: AdminRoomFilter;
  query: string;
  cursor: string | null;
  pageSize?: number;
}): Promise<AdminRoomListResult> {
  const offset = offsetFromCursor(cursor);

  if (filter === "pray") {
    const rows = await listPrayerRooms(query, pageSize + 1, offset);
    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
    return {
      rooms: pageRows.map(withoutSort),
      nextCursor: hasMore ? String(offset + pageRows.length) : null
    };
  }

  if (filter === "bible") {
    const rows = await listBibleRooms(query, pageSize + 1, offset);
    const hasMore = rows.length > pageSize;
    const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
    return {
      rooms: pageRows.map(withoutSort),
      nextCursor: hasMore ? String(offset + pageRows.length) : null
    };
  }

  const take = offset + pageSize + 1;
  const [prayerRooms, bibleRooms] = await Promise.all([
    listPrayerRooms(query, take, 0),
    listBibleRooms(query, take, 0)
  ]);
  const merged = [...prayerRooms, ...bibleRooms].sort((a, b) => {
    if (b.sortTime !== a.sortTime) return b.sortTime - a.sortTime;
    return b.id.localeCompare(a.id);
  });
  const pageWindow = merged.slice(offset, offset + pageSize + 1);
  const hasMore = pageWindow.length > pageSize;
  const pageRows = hasMore ? pageWindow.slice(0, pageSize) : pageWindow;

  return {
    rooms: pageRows.map(withoutSort),
    nextCursor: hasMore ? String(offset + pageRows.length) : null
  };
}

export function normalizeAdminRoomFilter(value: string | null): AdminRoomFilter {
  if (value === "pray" || value === "bible") return value;
  return "all";
}
