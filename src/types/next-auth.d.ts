import type { AuthProvider, UserRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      nickname: string | null;
      role: UserRole;
      provider: AuthProvider;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    nickname?: string | null;
    role?: UserRole;
    provider?: AuthProvider;
    providerUserId?: string;
  }
}
