import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageSquareText, Users } from "lucide-react";
import { requireAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const menuItems = [
  {
    href: "/admin/feedbacks",
    icon: MessageSquareText,
    title: "문의 / 피드백",
    description: "접수된 문의를 확인하고 상태를 관리합니다."
  },
  {
    href: "/admin/users",
    icon: Users,
    title: "사용자 관리",
    description: "가입한 사용자 목록과 계정 상태를 확인합니다."
  }
];

export default async function AdminPage() {
  await requireAdmin();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <ChevronLeft size={18} />
          홈으로
        </Link>
      </div>
      <header className="mb-5">
        <h1 className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">관리자 화면</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">문의와 사용자 관리를 한 곳에서 바로 이동할 수 있습니다.</p>
      </header>

      <section className="grid gap-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg bg-white px-4 py-4 shadow-soft transition hover:-translate-y-0.5 dark:border dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300">
                <Icon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-black text-slate-950 dark:text-slate-50">{item.title}</span>
                <span className="mt-1 block text-sm font-semibold text-slate-500 dark:text-slate-400">{item.description}</span>
              </span>
              <ChevronRight size={18} className="shrink-0 text-slate-400" />
            </Link>
          );
        })}
      </section>
    </main>
  );
}
