import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import KakaoProvider from "next-auth/providers/kakao";
import NaverProvider from "next-auth/providers/naver";
import { prisma } from "@/lib/prisma";
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
    async signIn({ account }) {
      if (!account?.providerAccountId) return false;

      const provider = providerFromId(account.provider);
      const admin = isAdminOAuth(provider, account.providerAccountId);

      await prisma.user.upsert({
        where: {
          provider_providerUserId: {
            provider,
            providerUserId: account.providerAccountId
          }
        },
        create: {
          provider,
          providerUserId: account.providerAccountId,
          role: admin ? "admin" : "user"
        },
        update: {
          deletedAt: null,
          ...(admin ? { role: "admin" } : {})
        }
      });

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
