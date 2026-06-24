"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { isRoomNextPath, LOGIN_NEXT_COOKIE_NAME, LOGIN_NEXT_STORAGE_KEY, safeNextPath } from "@/lib/redirect";

type StoredNextPath = {
  path?: unknown;
  expiresAt?: unknown;
};

export function PostLoginRedirect() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status !== "authenticated") return;

    const nextPath = readStoredNextPath();
    if (!nextPath) return;

    if (pathname !== "/" && pathname !== "/login") {
      if (matchesStoredDestination(pathname, nextPath)) clearStoredNextPath();
      return;
    }

    clearStoredNextPath();

    if (!session.user?.nickname) {
      router.replace("/nickname?next=" + encodeURIComponent(nextPath));
      return;
    }

    router.replace(nextPath);
  }, [pathname, router, session?.user?.nickname, status]);

  return null;
}

function matchesStoredDestination(pathname: string, nextPath: string) {
  if (pathname === nextPath) return true;

  const bibleInviteMatch = nextPath.match(/^\/join\/bible-room\/([^/?#]+)/);
  if (bibleInviteMatch && pathname === "/bible-room/" + bibleInviteMatch[1]) return true;

  const prayInviteMatch = nextPath.match(/^\/join\/pray-room\/([^/?#]+)/);
  if (prayInviteMatch && pathname === "/pray-room/" + prayInviteMatch[1]) return true;

  return false;
}

function readStoredNextPath() {
  try {
    const rawValue = window.localStorage.getItem(LOGIN_NEXT_STORAGE_KEY);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as StoredNextPath;
    const path = safeNextPath(parsed.path);
    const expiresAt = typeof parsed.expiresAt === "number" ? parsed.expiresAt : 0;

    if (path === "/" || !isRoomNextPath(path) || expiresAt < Date.now()) {
      clearStoredNextPath();
      return null;
    }

    return path;
  } catch {
    clearStoredNextPath();
    return null;
  }
}

function clearStoredNextPath() {
  try {
    window.localStorage.removeItem(LOGIN_NEXT_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }

  document.cookie = `${LOGIN_NEXT_COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
}
