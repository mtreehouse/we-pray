import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { AdminBibleTranslationList } from "@/components/AdminBibleTranslationList";
import { normalizeBibleTranslationSettings } from "@/lib/bible-translations";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminBibleTranslationsPage() {
  await requireAdmin();
  const rows = await prisma.bibleTranslationSetting.findMany({
    select: {
      code: true,
      label: true,
      isVisible: true,
      requiresCopyright: true,
      sortOrder: true
    },
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }]
  });
  const translations = normalizeBibleTranslationSettings(rows);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <ChevronLeft size={18} />
          관리자 메뉴
        </Link>
        <Link href="/admin/users" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <Users size={15} />
          사용자 관리
        </Link>
      </div>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950 dark:text-slate-50">성경 번역본 관리</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">번역본 노출 여부와 저작권 권한 필요 여부를 관리합니다.</p>
      </header>
      <AdminBibleTranslationList translations={translations} />
    </main>
  );
}
