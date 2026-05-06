import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user?.id) return null;

  return prisma.user.findFirst({
    where: {
      id: session.user.id,
      deletedAt: null
    }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireNickname() {
  const user = await requireUser();
  if (!user.nickname) redirect("/nickname");
  return user;
}

export async function requireAdmin() {
  const user = await requireNickname();
  if (user.role !== "admin") redirect("/");
  return user;
}

export async function requireRoomMember(roomId: string, userId: string) {
  return prisma.roomMember.findFirst({
    where: {
      roomId,
      userId,
      leftAt: null,
      kickedAt: null,
      room: {
        deletedAt: null
      },
      user: {
        deletedAt: null
      }
    },
    include: {
      room: true
    }
  });
}
