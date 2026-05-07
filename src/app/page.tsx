import { MainMenu } from "@/components/MainMenu";
import { LogoutButton } from "@/components/LogoutButton";
import { getCurrentUser } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 py-8">
      {user ? (
        <div
          className="absolute right-4 top-6 grid h-11 w-11 place-items-center rounded-full border border-white/80 bg-white/90 px-1 text-center text-[11px] font-black leading-tight text-teal-800 shadow-soft"
          title={user.nickname ?? "닉네임 미설정"}
          aria-label={`현재 사용자: ${user.nickname ?? "닉네임 미설정"}`}
        >
          <span className="max-w-9 truncate">{user.nickname ?? "미설정"}</span>
        </div>
      ) : null}
      <header className="mb-8">
        <p className="text-sm font-bold text-teal-700">함께 기도하는 공간</p>
        <h1 className="mt-2 text-4xl font-black tracking-normal text-slate-950">WePray</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          기도방을 만들고 멤버들과 기도제목을 나눠보세요.
        </p>
      </header>
      <MainMenu isLoggedIn={Boolean(user)} role={user?.role} />
      {user ? <LogoutButton /> : null}
    </main>
  );
}
