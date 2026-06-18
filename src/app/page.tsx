import { MainMenu } from "@/components/MainMenu";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-8 dark:text-slate-100">
      <header className="mb-8">
        <p className="text-sm font-bold text-teal-700 dark:text-teal-300">함께 기도하는 공간</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal text-slate-950 dark:text-slate-50">WePray</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          기도방을 만들고 멤버들과 기도제목을 나눠보세요.
        </p>
      </header>
      {user ? (
        <div className="mb-3 flex justify-center">
          <p className="max-w-full rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-center text-xs font-black text-teal-800 shadow-soft dark:border-slate-800 dark:bg-slate-900/85 dark:text-teal-200">
            {user.nickname ?? "닉네임 미설정"}님
          </p>
        </div>
      ) : null}
      <MainMenu isLoggedIn={Boolean(user)} role={user?.role} />
      <footer className="mt-auto px-2 pt-8 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        Copyright © 2026 Yunwoo Kim. All rights reserved.
      </footer>
    </main>
  );
}
