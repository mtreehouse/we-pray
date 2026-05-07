"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

const providers = [
  { id: "google", name: "Google", label: "Google로 로그인", className: "border-slate-200 bg-white text-slate-900" },
  { id: "kakao", name: "Kakao", label: "Kakao로 로그인", className: "border-yellow-300 bg-yellow-300 text-slate-950" },
  { id: "naver", name: "Naver", label: "Naver로 로그인", className: "border-emerald-500 bg-emerald-500 text-white" }
];

const LAST_LOGIN_PROVIDER_KEY = "wepray:last-login-provider";

export function LoginButtonGroup() {
  const { data: session, status } = useSession();
  const [lastProviderId, setLastProviderId] = useState<string | null>(null);

  useEffect(() => {
    setLastProviderId(window.localStorage.getItem(LAST_LOGIN_PROVIDER_KEY));
  }, []);

  function startLogin(providerId: string) {
    window.localStorage.setItem(LAST_LOGIN_PROVIDER_KEY, providerId);
    setLastProviderId(providerId);
    void signIn(providerId, { callbackUrl: "/auth/complete" });
  }

  if (status === "loading") {
    return <p className="text-sm text-slate-500">로그인 상태를 확인 중입니다.</p>;
  }

  if (session?.user) {
    return (
      <div className="grid gap-3">
        <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-soft">
          현재 {session.user.nickname ?? "닉네임 미설정"} 계정으로 로그인되어 있습니다.
        </p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-lg bg-slate-900 px-4 py-3 font-bold text-white shadow-soft"
        >
          로그아웃
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {providers.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => startLogin(provider.id)}
          className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-3 font-bold shadow-soft ${provider.className}`}
        >
          <span>{provider.label}</span>
          {lastProviderId === provider.id ? (
            <span className="shrink-0 rounded-full bg-white/70 px-2 py-1 text-[11px] font-black text-slate-700">
              최근 로그인 수단
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
