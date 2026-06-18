import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { NicknameSetup } from "@/components/NicknameSetup";
import { requireUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function NicknamePage() {
  const user = await requireUser();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6 dark:text-slate-100">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <section className="rounded-lg bg-white p-5 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85">
        <h1 className="text-2xl font-black text-slate-950 dark:text-slate-50">닉네임 설정</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          방과 기도제목에 표시될 이름입니다. 중복 닉네임은 사용할 수 없습니다.
        </p>
        <div className="mt-6">
          <NicknameSetup currentNickname={user.nickname} />
        </div>
      </section>
    </main>
  );
}
