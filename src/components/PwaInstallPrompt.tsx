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
const IOS_GUIDE_VISIBLE_KEY = "wepray:pwa-ios-install-guide-visible:v1";
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
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [installCompleteVisible, setInstallCompleteVisible] = useState(false);

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

  const completeNativeInstall = useCallback((markInstalled = false) => {
    try {
      if (markInstalled) {
        window.localStorage.setItem(INSTALLED_KEY, "true");
        window.localStorage.removeItem(IOS_GUIDE_VISIBLE_KEY);
      }
    } catch {
      // Ignore storage failures.
    }

    setVisible(false);
    setShowIosGuide(false);
    deferredPromptRef.current = null;
    setDeferredPrompt(null);

    if (!isStandalone()) {
      setInstallCompleteVisible(true);
    }
  }, []);

  const snooze = useCallback((duration = SNOOZE_MS) => {
    try {
      window.localStorage.setItem(DISMISSED_UNTIL_KEY, String(Date.now() + duration));
      window.localStorage.removeItem(IOS_GUIDE_VISIBLE_KEY);
    } catch {
      // Ignore storage failures.
    }
    setVisible(false);
    setShowIosGuide(false);
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
      completeNativeInstall(false);
      return;
    }

    snooze();
  }, [completeNativeInstall, snooze]);

  const install = useCallback(async () => {
    if (mode === "ios") {
      try {
        window.localStorage.setItem(IOS_GUIDE_VISIBLE_KEY, "true");
      } catch {
        // Ignore storage failures.
      }
      setVisible(false);
      setShowIosGuide(true);
      return;
    }

    await promptNativeInstall();
  }, [mode, promptNativeInstall]);

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
    const updateIosGuide = () => {
      if (isStandalone()) {
        try {
          window.localStorage.setItem(INSTALLED_KEY, "true");
          window.localStorage.removeItem(IOS_GUIDE_VISIBLE_KEY);
        } catch {
          // Ignore storage failures.
        }
        setShowIosGuide(false);
        setVisible(false);
        setInstallCompleteVisible(false);
        return;
      }

      try {
        setShowIosGuide(window.localStorage.getItem(IOS_GUIDE_VISIBLE_KEY) === "true");
      } catch {
        setShowIosGuide(false);
      }
    };

    updateIosGuide();
    window.addEventListener("focus", updateIosGuide);
    window.addEventListener("pageshow", updateIosGuide);
    document.addEventListener("visibilitychange", updateIosGuide);

    return () => {
      window.removeEventListener("focus", updateIosGuide);
      window.removeEventListener("pageshow", updateIosGuide);
      document.removeEventListener("visibilitychange", updateIosGuide);
    };
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      const promptEvent = event as BeforeInstallPromptEvent;
      try {
        window.localStorage.removeItem(INSTALLED_KEY);
      } catch {
        // Ignore storage failures.
      }
      deferredPromptRef.current = promptEvent;
      setDeferredPrompt(promptEvent);
    }

    function handleInstalled() {
      completeNativeInstall(true);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener(REQUEST_EVENT, requestInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener(REQUEST_EVENT, requestInstall);
    };
  }, [completeNativeInstall, requestInstall]);

  useEffect(() => {
    if (!guidesDone || !pathname || !isPromptAllowedPath(pathname) || isStandalone() || showIosGuide) return;

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
  }, [deferredPrompt, guidesDone, pathname, showIosGuide]);

  if (true) {
    return (
      <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/55 px-5 backdrop-blur-sm">
        <section className="w-full max-w-sm rounded-2xl border border-[#8FA0F0]/55 bg-white p-5 text-center shadow-[0_22px_60px_rgba(15,23,42,0.28)] dark:border-[#8FA0F0]/40 dark:bg-slate-950 dark:text-slate-50">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#637EE1]/12 text-[#637EE1] dark:bg-[#637EE1]/22 dark:text-[#AEBBFF]">
            <Download size={22} />
          </div>
          <p className="mt-3 text-base font-black text-slate-950 dark:text-slate-50">설치 중...</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            설치가 완료되면 홈 화면에서 앱으로 열어보세요!
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => setInstallCompleteVisible(false)}
              className="min-h-11 rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300"
            >
              닫기
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (showIosGuide) {
    return (
      <div className="fixed inset-x-0 bottom-4 z-[120] px-4 safe-bottom">
        <section className="mx-auto max-w-sm rounded-[2rem] border border-[#8FA0F0]/55 bg-white/95 p-4 text-slate-900 shadow-[0_22px_60px_rgba(15,23,42,0.28)] backdrop-blur dark:border-[#8FA0F0]/40 dark:bg-slate-950/95 dark:text-slate-50">
          <div className="text-center">
            <p className="text-sm font-black text-slate-950 dark:text-slate-50">Safari에서 홈 화면에 추가하기</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              하단의 <b>…</b> 버튼 → 공유 → 더보기 → 홈 화면에 추가
            </p>
          </div>

          <div className="relative mx-auto mt-4 h-[330px] w-[182px] overflow-hidden rounded-[2rem] border-[6px] border-slate-900 bg-slate-100 shadow-inner dark:border-slate-700 dark:bg-slate-900">
            <div className="absolute left-1/2 top-2 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900/80 dark:bg-slate-700" />

            <div className="absolute inset-x-3 top-10 rounded-2xl bg-white p-3 text-center shadow-sm dark:bg-slate-800">
              <p className="text-[11px] font-black">WePray</p>
              <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-300">Safari</p>
            </div>

            <div className="ios-guide-step ios-guide-menu absolute bottom-14 right-2 w-[132px] rounded-2xl bg-white p-2 shadow-[0_14px_36px_rgba(15,23,42,0.25)] dark:bg-slate-800">
              <div className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-[10px] font-black text-slate-800 dark:text-slate-100">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 dark:bg-slate-700">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="16 9 12 5 8 9" />
                    <line x1="12" y1="5" x2="12" y2="17" />
                    <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
                  </svg>
                </span>
                공유
              </div>
            </div>

            <div className="ios-guide-step ios-guide-share-sheet absolute inset-x-2 bottom-12 rounded-2xl bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.25)] dark:bg-slate-800">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-600" />
              <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-[10px] font-black text-white">
                <span>더보기</span>
                <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-700 text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
                    <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
                  </svg>
                </span>
              </div>
            </div>

            <div className="ios-guide-step ios-guide-more-sheet absolute inset-x-2 bottom-12 rounded-2xl bg-white p-3 shadow-[0_14px_36px_rgba(15,23,42,0.25)] dark:bg-slate-800">
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-600" />
              <div className="flex items-center gap-2 rounded-xl bg-[#637EE1]/10 px-3 py-2 text-[10px] font-black text-[#637EE1] dark:bg-[#637EE1]/20 dark:text-[#AEBBFF]">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[#637EE1] shadow-sm dark:bg-slate-900 dark:text-[#AEBBFF]">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="5" ry="5" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </span>
                <span>홈 화면에 추가</span>
              </div>
            </div>

            <div className="ios-guide-tap ios-guide-tap-dot absolute bottom-2 right-2 h-8 w-8 rounded-full border-2 border-[#637EE1] bg-[#637EE1]/20" />
            <div className="ios-guide-tap ios-guide-tap-share absolute bottom-[62px] left-[48px] h-8 w-8 rounded-full border-2 border-[#637EE1] bg-[#637EE1]/20" />
            <div className="ios-guide-tap ios-guide-tap-more absolute bottom-[58px] right-4 h-8 w-8 rounded-full border-2 border-[#637EE1] bg-[#637EE1]/20" />
            <div className="ios-guide-tap ios-guide-tap-add absolute bottom-[58px] left-[18px] h-8 w-8 rounded-full border-2 border-[#637EE1] bg-[#637EE1]/20" />

            <div className="absolute inset-x-0 bottom-0 flex h-12 items-center gap-2 bg-slate-300/95 px-2 dark:bg-slate-700/95">
              <div className="flex h-8 flex-1 items-center justify-center rounded-full bg-white px-2 text-[9px] font-black text-slate-700 shadow-sm">
                wepray.app
              </div>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[13px] font-black text-slate-900 shadow-sm">
                ↻
              </div>
              <div className="ios-guide-dot grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-sm font-black leading-none text-black shadow-sm">
                <span className="-translate-y-[1px]">…</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => snooze(IOS_SNOOZE_MS)}
            className="ml-auto mt-3 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300"
            aria-label="홈 화면 추가 가이드 닫기"
          >
            <X size={17} />
          </button>
        </section>

        <style>{`
        @keyframes iosGuideDotPulse {
          0%, 15%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.65); }
          8% { transform: scale(1.12); box-shadow: 0 0 0 9px rgba(255, 255, 255, 0); }
        }

        @keyframes iosGuideMenu {
          0%, 17%, 100% { opacity: 0; transform: translateY(14px) scale(0.96); }
          22%, 34% { opacity: 1; transform: translateY(0) scale(1); }
          39% { opacity: 0; transform: translateY(10px) scale(0.98); }
        }

        @keyframes iosGuideShareSheet {
          0%, 38%, 100% { opacity: 0; transform: translateY(72px); }
          44%, 58% { opacity: 1; transform: translateY(0); }
          63% { opacity: 0; transform: translateY(40px); }
        }

        @keyframes iosGuideMoreSheet {
          0%, 62%, 100% { opacity: 0; transform: translateY(72px); }
          68%, 90% { opacity: 1; transform: translateY(0); }
        }

        @keyframes iosGuideTapDot {
          0%, 5%, 100% { opacity: 0; transform: scale(0.72); }
          8%, 13% { opacity: 1; transform: scale(1); }
          16% { opacity: 0; transform: scale(1.35); }
        }

        @keyframes iosGuideTapShare {
          0%, 24%, 100% { opacity: 0; transform: scale(0.72); }
          27%, 32% { opacity: 1; transform: scale(1); }
          35% { opacity: 0; transform: scale(1.35); }
        }

        @keyframes iosGuideTapMore {
          0%, 48%, 100% { opacity: 0; transform: scale(0.72); }
          51%, 56% { opacity: 1; transform: scale(1); }
          59% { opacity: 0; transform: scale(1.35); }
        }

        @keyframes iosGuideTapAdd {
          0%, 72%, 100% { opacity: 0; transform: scale(0.72); }
          75%, 80% { opacity: 1; transform: scale(1); }
          83% { opacity: 0; transform: scale(1.35); }
        }

        .ios-guide-dot {
          animation: iosGuideDotPulse 4.8s ease-in-out infinite;
        }

        .ios-guide-menu {
          animation: iosGuideMenu 4.8s ease-in-out infinite;
        }

        .ios-guide-share-sheet {
          animation: iosGuideShareSheet 4.8s ease-in-out infinite;
        }

        .ios-guide-more-sheet {
          animation: iosGuideMoreSheet 4.8s ease-in-out infinite;
        }

        .ios-guide-tap {
          pointer-events: none;
          z-index: 20;
        }

        .ios-guide-tap-dot {
          animation: iosGuideTapDot 4.8s ease-in-out infinite;
        }

        .ios-guide-tap-share {
          animation: iosGuideTapShare 4.8s ease-in-out infinite;
        }

        .ios-guide-tap-more {
          animation: iosGuideTapMore 4.8s ease-in-out infinite;
        }

        .ios-guide-tap-add {
          animation: iosGuideTapAdd 4.8s ease-in-out infinite;
        }
      `}</style>
      </div>
    );
  }
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
              {isIos ? (
                <>
                  Safari에서 홈 화면에 추가할 수 있어요.
                  <br />
                  우측 하단 … → 공유 → 더보기 → 홈 화면에 추가
                </>
              ) : (
                "홈 화면에 설치하면 주소창 없이 바로 기도방과 성경방을 열 수 있어요."
              )}
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
