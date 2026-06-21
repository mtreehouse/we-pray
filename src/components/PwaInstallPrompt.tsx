"use client";

import { usePathname } from "next/navigation";
import { Download, Share2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type PromptMode = "native" | "ios";

const DISMISSED_UNTIL_KEY = "wepray:pwa-install-dismissed-until:v1";
const INSTALLED_KEY = "wepray:pwa-installed:v1";
const VISIT_COUNT_KEY = "wepray:pwa-install-visit-count:v1";
const ROOM_LIST_GUIDE_STORAGE_KEY = "wepray:room-list-guide:v1";
const BIBLE_ROOM_GUIDE_STORAGE_PREFIX = "wepray:bible-room-guide:v5:";
const GUIDE_COMPLETED_EVENT = "wepray:guide-completed";
const REQUEST_EVENT = "wepray:pwa-install-request";
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const IOS_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

function isIosSafari() {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && isSafari;
}

function isPromptAllowedPath(pathname: string) {
  return !pathname.startsWith("/login") && !pathname.startsWith("/nickname") && !pathname.startsWith("/auth") && !pathname.startsWith("/admin");
}

function readNumber(key: string) {
  const value = window.localStorage.getItem(key);
  const parsed = value ? Number(value) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasDoneKeyStartingWith(prefix: string) {
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(prefix) && window.localStorage.getItem(key) === "done") return true;
  }
  return false;
}

function areRequiredGuidesDone() {
  try {
    return window.localStorage.getItem(ROOM_LIST_GUIDE_STORAGE_KEY) === "done" && hasDoneKeyStartingWith(BIBLE_ROOM_GUIDE_STORAGE_PREFIX);
  } catch {
    return false;
  }
}

export function PwaInstallPrompt() {
  const pathname = usePathname();
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<PromptMode | null>(null);
  const [guidesDone, setGuidesDone] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !window.isSecureContext) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA installation remains optional; keep the app usable if registration fails.
    });
  }, []);

  useEffect(() => {
    const updateGuidesDone = () => setGuidesDone(areRequiredGuidesDone());

    updateGuidesDone();
    window.addEventListener("storage", updateGuidesDone);
    window.addEventListener(GUIDE_COMPLETED_EVENT, updateGuidesDone);
    window.addEventListener("focus", updateGuidesDone);

    return () => {
      window.removeEventListener("storage", updateGuidesDone);
      window.removeEventListener(GUIDE_COMPLETED_EVENT, updateGuidesDone);
      window.removeEventListener("focus", updateGuidesDone);
    };
  }, []);

  const snooze = useCallback((duration = SNOOZE_MS) => {
    try {
      window.localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + duration));
    } catch {
      // Ignore storage failures.
    }
    setVisible(false);
  }, []);

  const promptNativeInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) {
      snooze();
      return;
    }

    deferredPromptRef.current = null;
    setDeferredPrompt(null);
    try {
      await prompt.prompt();
    } catch {
      snooze();
      return;
    }

    const choice = await prompt.userChoice;

    if (choice.outcome === "accepted") {
      try {
        window.localStorage.setItem(INSTALLED_KEY, "true");
      } catch {
        // Ignore storage failures.
      }
      setVisible(false);
      return;
    }

    snooze();
  }, [snooze]);

  const install = useCallback(async () => {
    if (mode === "ios") {
      snooze(IOS_SNOOZE_MS);
      return;
    }

    await promptNativeInstall();
  }, [mode, promptNativeInstall, snooze]);

  const requestInstall = useCallback(() => {
    if (isStandalone()) return;

    if (deferredPromptRef.current) {
      setMode("native");
      setVisible(true);
      void promptNativeInstall();
      return;
    }

    if (isIosSafari()) {
      setMode("ios");
      setVisible(true);
    }
  }, [promptNativeInstall]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      const promptEvent = event as BeforeInstallPromptEvent;
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
    }

    function handleInstalled() {
      try {
        window.localStorage.setItem(INSTALLED_KEY, "true");
      } catch {
        // Ignore storage failures.
      }
      setVisible(false);
      deferredPromptRef.current = null;
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener(REQUEST_EVENT, requestInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener(REQUEST_EVENT, requestInstall);
    };
  }, [requestInstall]);

  useEffect(() => {
    if (!guidesDone || !pathname || !isPromptAllowedPath(pathname) || isStandalone()) return;

    try {
      if (window.localStorage.getItem(INSTALLED_KEY) === "true") return;
      if (readNumber(DISMISSED_UNTIL_KEY) > Date.now()) return;

      const nextVisitCount = Math.min(readNumber(VISIT_COUNT_KEY) + 1, 999);
      window.localStorage.setItem(VISIT_COUNT_KEY, String(nextVisitCount));

      const promptMode: PromptMode | null = deferredPrompt ? "native" : isIosSafari() ? "ios" : null;
      if (!promptMode || nextVisitCount < 2) return;

      const timer = window.setTimeout(() => {
        setMode(promptMode);
        setVisible(true);
      }, 1000);

      return () => window.clearTimeout(timer);
    } catch {
      // Local storage can be disabled in private browsing; avoid interrupting the app.
      return;
    }
  }, [deferredPrompt, guidesDone, pathname]);

  if (!visible || !mode) return null;

  const isIos = mode === "ios";

  return (
    <div className="fixed inset-x-0 bottom-4 z-[110] px-4 safe-bottom">
      <section className="pwa-install-float mx-auto max-w-sm rounded-2xl border border-[#8FA0F0]/55 bg-white/95 p-3 text-slate-900 shadow-[0_18px_48px_rgba(15,23,42,0.24)] backdrop-blur dark:border-[#8FA0F0]/40 dark:bg-slate-950/95 dark:text-slate-50">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#637EE1]/12 text-[#637EE1] dark:bg-[#637EE1]/22 dark:text-[#AEBBFF]">
            {isIos ? <Share2 size={19} /> : <Download size={19} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-950 dark:text-slate-50">WePray를 앱으로 열어보세요</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              {isIos ? "Safari 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하면 됩니다." : "홈 화면에 설치하면 주소창 없이 바로 기도방과 성경방을 열 수 있어요."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => snooze()}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300"
            aria-label="설치 안내 닫기"
          >
            <X size={16} />
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 items-center gap-2">
          <button
            type="button"
            onClick={() => snooze()}
            className="min-h-10 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={() => void install()}
            className="guide-cta-animated min-h-10 rounded-xl px-4 text-xs font-black text-white"
          >
            {isIos ? "확인" : "설치"}
          </button>
        </div>
      </section>
      <style>{`
        @keyframes pwaInstallFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-7px); }
        }

        .pwa-install-float {
          animation: pwaInstallFloat 3.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
