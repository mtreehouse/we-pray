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
          <span className="flex min-w-0 items-center gap-3">
            <ProviderIcon providerId={provider.id} />
            <span>{provider.label}</span>
          </span>
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

function ProviderIcon({ providerId }: { providerId: string }) {
  if (providerId === "google") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
        <path
          fill="#4285F4"
          d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.4h3.2c1.9-1.7 3-4.2 3-7.1z"
        />
        <path
          fill="#34A853"
          d="M12 22c2.7 0 5-.9 6.6-2.6l-3.2-2.4c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.5A10 10 0 0 0 12 22z"
        />
        <path
          fill="#FBBC05"
          d="M6.4 13.8a6 6 0 0 1 0-3.6V7.7H3.1a10 10 0 0 0 0 8.6l3.3-2.5z"
        />
        <path
          fill="#EA4335"
          d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.8A9.5 9.5 0 0 0 12 2a10 10 0 0 0-8.9 5.7l3.3 2.5c.8-2.3 3-4.1 5.6-4.1z"
        />
      </svg>
    );
  }

  if (providerId === "kakao") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
        <path
          fill="#191919"
          d="M12 3.5c5 0 9 3.1 9 7 0 3.8-4 7-9 7-.6 0-1.2 0-1.8-.1l-3.3 2.2c-.5.3-1.1-.1-.9-.7l.8-2.9C4.5 14.8 3 12.8 3 10.5c0-3.9 4-7 9-7z"
        />
      </svg>
    );
  }

  return (
    <span
      aria-hidden="true"
      className="grid h-5 w-5 shrink-0 place-items-center rounded-sm bg-white text-[12px] font-black text-emerald-600"
    >
      N
    </span>
  );
}
