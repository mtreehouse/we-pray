import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SettingsMenu } from "@/components/SettingsMenu";
import { getCurrentUser } from "@/lib/permissions";
import packageJson from "../../../package.json";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-6 dark:text-slate-100">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <header className="mb-5">
        <p className="text-sm font-bold text-teal-700 dark:text-teal-300">WePray</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950 dark:text-slate-50">설정</h1>
      </header>
      <SettingsMenu isLoggedIn={Boolean(user)} currentNickname={user?.nickname} appVersion={packageJson.version} />
      <footer className="mt-auto px-2 pt-8 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        Copyright © 2026 Yunwoo Kim. All rights reserved.
      </footer>
    </main>
  );
}
