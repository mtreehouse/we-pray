import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import { prisma } from "@/lib/prisma";
import { isRoomNextPath, LOGIN_NEXT_COOKIE_NAME, safeNextPath } from "@/lib/redirect";
import type { AuthProvider } from "@prisma/client";

function providerFromId(provider: string): AuthProvider {
  if (provider === "kakao" || provider === "naver") return provider;
  return "google";
}

function isAdminOAuth(provider: AuthProvider, providerUserId: string) {
  const ids = (process.env.ADMIN_OAUTH_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return ids.includes(`${provider}:${providerUserId}`);
}

async function loginNextPathFromCookie() {
  try {
    const cookieStore = await cookies();
    const path = safeNextPath(decodeCookieValue(cookieStore.get(LOGIN_NEXT_COOKIE_NAME)?.value));
    return path !== "/" && isRoomNextPath(path) ? path : null;
  } catch {
    return null;
  }
}

function decodeCookieValue(value: string | undefined) {
  if (!value) return undefined;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "missing-google-client-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "missing-google-client-secret"
    }),
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || "missing-kakao-client-id",
      clientSecret: process.env.KAKAO_CLIENT_SECRET || "missing-kakao-client-secret"
    }),
    NaverProvider({
      clientId: process.env.NAVER_CLIENT_ID || "missing-naver-client-id",
      clientSecret: process.env.NAVER_CLIENT_SECRET || "missing-naver-client-secret"
    })
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      const cookieNextPath = await loginNextPathFromCookie();

      if (cookieNextPath && (url === baseUrl || url === baseUrl + "/" || url === "/")) {
        return baseUrl + cookieNextPath;
      }

      if (url.startsWith("/")) return baseUrl + url;

      try {
        const parsedUrl = new URL(url);
        if (parsedUrl.origin === baseUrl) return url;
      } catch {
        // Fall through to the safe base URL.
      }

      return baseUrl;
    },
    async signIn({ account }) {
      if (!account?.providerAccountId) return false;

      const provider = providerFromId(account.provider);
      const admin = isAdminOAuth(provider, account.providerAccountId);

      const existingUser = await prisma.user.findUnique({
        where: {
          provider_providerUserId: {
            provider,
            providerUserId: account.providerAccountId
          }
        }
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            deletedAt: null,
            ...(existingUser.deletedAt ? { nickname: null } : {}),
            ...(admin ? { role: "admin" } : {})
          }
        });
      } else {
        await prisma.user.create({
          data: {
            provider,
            providerUserId: account.providerAccountId,
            role: admin ? "admin" : "user"
          }
        });
      }

      return true;
    },
    async jwt({ token, account }) {
      const provider = account?.provider ? providerFromId(account.provider) : token.provider;
      const providerUserId = account?.providerAccountId ?? token.providerUserId;

      if (provider && providerUserId) {
        const user = await prisma.user.findUnique({
          where: {
            provider_providerUserId: {
              provider: provider as AuthProvider,
              providerUserId: providerUserId as string
            }
          },
          select: {
            id: true,
            provider: true,
            providerUserId: true,
            nickname: true,
            role: true,
            deletedAt: true
          }
        });

        if (user && !user.deletedAt) {
          token.userId = user.id;
          token.provider = user.provider;
          token.providerUserId = user.providerUserId;
          token.nickname = user.nickname;
          token.role = user.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.nickname = (token.nickname as string | null) ?? null;
        session.user.role = token.role === "admin" ? "admin" : "user";
        session.user.provider = token.provider as AuthProvider;
      }

      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
};

export function getSession() {
  return getServerSession(authOptions);
}
