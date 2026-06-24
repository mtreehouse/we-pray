"use client";

import { useEffect, useState } from "react";

const kakaoTalkUserAgent = /KAKAOTALK/i;
const redirectStoragePrefix = "wepray:kakao-external-browser:";

function externalBrowserUrl(url: string) {
  return "kakaotalk://web/openExternal?url=" + encodeURIComponent(url);
}

export function KakaoExternalBrowserRedirect() {
  const [showFallback, setShowFallback] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");

  useEffect(() => {
    if (!kakaoTalkUserAgent.test(navigator.userAgent)) return;
    if (!/^https?:$/.test(window.location.protocol)) return;

    const currentUrl = window.location.href;
    const nextExternalUrl = externalBrowserUrl(currentUrl);
    const storageKey = redirectStoragePrefix + currentUrl;
    setExternalUrl(nextExternalUrl);

    try {
      if (window.sessionStorage.getItem(storageKey) === "1") {
        setShowFallback(true);
        return;
      }
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Keep redirecting even when sessionStorage is unavailable.
    }

    const fallbackTimer = window.setTimeout(() => setShowFallback(true), 1200);
    window.location.href = nextExternalUrl;

    return () => window.clearTimeout(fallbackTimer);
  }, []);

  if (!showFallback) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 px-5 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-center shadow-2xl dark:bg-slate-900">
        <p className="text-base font-bold text-slate-950 dark:text-white">외부 브라우저로 이동해 주세요</p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          카카오톡 안에서는 사이트 기능이 제한될 수 있어요.
        </p>
        <a
          href={externalUrl}
          className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-[#637EE1] px-4 py-3 text-sm font-bold text-white shadow-soft"
        >
          기본 브라우저로 열기
        </a>
      </div>
    </div>
  );
}
