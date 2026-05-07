import { MainMenu } from "@/components/MainMenu";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-8">
      <header className="mb-8">
        <p className="text-sm font-bold text-teal-700">함께 기도하는 공간</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal text-slate-950">WePray</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          기도방을 만들고 멤버들과 기도제목을 나눠보세요.
        </p>
      </header>
      {user ? (
        <div className="mb-3 flex justify-center">
          <p className="max-w-full rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-center text-xs font-black text-teal-800 shadow-soft">
            {user.nickname ?? "닉네임 미설정"}님
          </p>
        </div>
      ) : null}
      <MainMenu isLoggedIn={Boolean(user)} role={user?.role} />
      {user ? <LogoutButton /> : null}
    </main>
  );
}
