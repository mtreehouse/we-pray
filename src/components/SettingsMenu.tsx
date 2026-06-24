"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, Download, HelpCircle, Info, LogIn, LogOut, MessageCircle, Moon, Pencil, Save, Send, Share2, Sun, Trash2, UserRound } from "lucide-react";
import { AppGuideOverlay, type GuideKind } from "@/components/AppGuideOverlay";
import { Modal } from "@/components/ui/Modal";
import { Toast } from "@/components/ui/Toast";
import { noBrowserInputSuggestions } from "@/lib/browser-input";
import { clearWePrayClientCache } from "@/lib/client-cache";
import { SiteShareModal } from "@/components/SiteShareModal";
import { WithdrawLink } from "@/components/WithdrawLink";
import { APP_DARK_MODE_CHANGE_EVENT, APP_DARK_MODE_STORAGE_KEY } from "@/lib/ui-settings";

const REQUEST_PWA_INSTALL_EVENT = "wepray:pwa-install-request";
const PWA_INSTALLED_KEY = "wepray:pwa-installed:v1";
type SettingsMenuProps = {
  isLoggedIn: boolean;
  currentNickname?: string | null;
  currentProvider?: string | null;
  appVersion: string;
};

const wePrayInfoSections = [
  {
    title: "서비스 소개",
    body: "WePray는 기도제목을 함께 나누고, 성경 통독과 묵상을 기록하며 서로 격려하는 기독교 커뮤니티 앱입니다."
  },
  {
    title: "개인정보 / 로그인 안내",
    body: "로그인은 Google, Kakao, Naver 계정을 사용하며, 서비스 이용에 필요한 기본 계정 정보와 닉네임만 사용합니다."
  },
  {
    title: "주의사항",
    body: "공개된 방의 글은 참여 멤버가 볼 수 있습니다. 민감한 개인정보나 타인의 권리를 침해하는 내용은 작성하지 말아 주세요."
  },
  {
    title: "문의 / 피드백",
    body: "사용 중 불편한 점이나 개선 의견이 있다면 운영자에게 문의해 주세요. 더 편안한 공동체 도구가 되도록 반영하겠습니다."
  }
];

function isIosDevice() {
  const userAgent = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) || (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
}

function isIosSafari() {
  const userAgent = window.navigator.userAgent;
  return isIosDevice() && /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
}

function isPwaInstalled() {
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  if (window.matchMedia("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true) return true;

  try {
    return window.localStorage.getItem(PWA_INSTALLED_KEY) === "true";
  } catch {
    return false;
  }
}

function providerLabel(provider?: string | null) {
  if (provider === "google") return "Google";
  if (provider === "kakao") return "Kakao";
  if (provider === "naver") return "Naver";
  return "SNS";
}

export function SettingsMenu({ isLoggedIn, currentNickname, currentProvider, appVersion }: SettingsMenuProps) {
  const router = useRouter();
  const [appDarkMode, setAppDarkMode] = useState(false);
  const [nickname, setNickname] = useState(currentNickname ?? "");
  const [nicknameInput, setNicknameInput] = useState(currentNickname ?? "");
  const [nicknameOpen, setNicknameOpen] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState("");
  const [nicknameMessageType, setNicknameMessageType] = useState<"success" | "error">("success");
  const [toast, setToast] = useState("");
  const [infoOpen, setInfoOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackReplyEmail, setFeedbackReplyEmail] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [usageOpen, setUsageOpen] = useState(false);
  const [guideKind, setGuideKind] = useState<GuideKind | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    setNickname(currentNickname ?? "");
    setNicknameInput(currentNickname ?? "");
  }, [currentNickname]);

  useEffect(() => {
    try {
      const enabled = window.localStorage.getItem(APP_DARK_MODE_STORAGE_KEY) === "true";
      setAppDarkMode(enabled);
      document.documentElement.classList.toggle("dark", enabled);
    } catch {
      setAppDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  function setAppDarkModePreference(enabled: boolean) {
    setAppDarkMode(enabled);
    try {
      window.localStorage.setItem(APP_DARK_MODE_STORAGE_KEY, enabled ? "true" : "false");
    } catch {
      // Keep the visible preference for this session only.
    }
    document.documentElement.classList.toggle("dark", enabled);
    window.dispatchEvent(new Event(APP_DARK_MODE_CHANGE_EVENT));
  }

  function resetCachedUiState() {
    clearWePrayClientCache();
    setAppDarkMode(false);
    document.documentElement.classList.remove("dark");
    window.dispatchEvent(new Event(APP_DARK_MODE_CHANGE_EVENT));
  }

  function clearAppCache() {
    const confirmed = confirm("이 브라우저에 저장된 WePray 기억 내용을 모두 삭제할까요? 다크모드, 성경방 보기 설정, 마지막 읽던 위치, 사용법 확인 기록이 초기화됩니다.");
    if (confirmed === false) return;

    resetCachedUiState();
    setToast("저장된 기억 내용을 삭제했습니다.");
  }

  async function logout() {
    resetCachedUiState();
    await signOut({ callbackUrl: "/" });
  }

  function openShareModal() {
    setShareOpen(true);
  }

  function requestPwaInstall() {
    if (isPwaInstalled()) {
      setToast("이미 앱으로 설치되어 있습니다.");
      return;
    }

    if (isIosDevice() && !isIosSafari()) {
      setToast("iPhone에서는 Safari에서 열어 홈 화면에 추가해주세요.");
      return;
    }

    window.dispatchEvent(new Event(REQUEST_PWA_INSTALL_EVENT));
  }

  function openNicknameModal() {
    setNicknameInput(nickname);
    setNicknameMessage("");
    setNicknameMessageType("success");
    setNicknameOpen(true);
  }

  function openFeedbackModal() {
    if (!isLoggedIn) {
      setToast("로그인 후 문의를 작성할 수 있습니다.");
      return;
    }

    setFeedbackTitle("");
    setFeedbackContent("");
    setFeedbackReplyEmail("");
    setFeedbackMessage("");
    setFeedbackOpen(true);
  }

  async function submitFeedback() {
    if (feedbackSaving) return;
    const title = feedbackTitle.trim();
    const content = feedbackContent.trim();
    const replyEmail = feedbackReplyEmail.trim();

    if (!title) {
      setFeedbackMessage("문의 제목을 입력해주세요.");
      return;
    }

    if (!content) {
      setFeedbackMessage("문의 내용을 입력해주세요.");
      return;
    }

    setFeedbackSaving(true);
    setFeedbackMessage("");
    const res = await fetch("/api/feedbacks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, replyEmail })
    });
    const data = (await res.json()) as { error?: string };
    setFeedbackSaving(false);

    if (!res.ok) {
      setFeedbackMessage(data.error ?? "문의 접수에 실패했습니다.");
      return;
    }

    setFeedbackOpen(false);
    setToast("문의가 접수되었습니다.");
  }

  async function saveNickname() {
    if (nicknameSaving) return;
    const nextNickname = nicknameInput.trim();

    setNicknameSaving(true);
    setNicknameMessage("");
    const res = await fetch("/api/nickname", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname: nextNickname })
    });
    const data = (await res.json()) as { error?: string };
    setNicknameSaving(false);

    if (!res.ok) {
      setNicknameMessageType("error");
      setNicknameMessage(data.error ?? "닉네임 저장에 실패했습니다.");
      return;
    }

    setNickname(nextNickname);
    setNicknameInput(nextNickname);
    setNicknameMessage("");
    setNicknameOpen(false);
    setToast("닉네임이 저장되었습니다.");
    router.refresh();
  }

  return (
    <>
      <Toast message={toast} onClose={() => setToast("")} />
      <div className="grid gap-4">
        <section className="rounded-lg bg-white/90 p-4 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-black text-slate-950 dark:text-slate-50">앱 다크모드</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                Bible Room은 별도 설정이 없을 때 이 값을 기본값으로 사용합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAppDarkModePreference(!appDarkMode)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition ${appDarkMode ? "bg-teal-600" : "bg-slate-300"}`}
              aria-pressed={appDarkMode}
              aria-label="앱 다크모드"
            >
              <span
                className={`absolute top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-slate-600 shadow transition ${appDarkMode ? "left-7" : "left-1"
                  }`}
              >
                {appDarkMode ? <Moon size={14} /> : <Sun size={14} />}
              </span>
            </button>
          </div>
        </section>

        {isLoggedIn ? (
          <section className="rounded-lg bg-white/90 p-4 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <UserRound size={17} className="text-teal-700 dark:text-teal-300" />
                  <p className="font-black text-slate-950 dark:text-slate-50">닉네임</p>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-bold text-slate-600 dark:text-slate-300">{nickname || "닉네임 미설정"}</p>
                  <span className={"inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black " + (currentProvider === "google" ? "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300" : currentProvider === "kakao" ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : currentProvider === "naver" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {providerLabel(currentProvider)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={openNicknameModal}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-100 px-3 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <Pencil size={14} />
                변경
              </button>
            </div>
          </section>
        ) : null}

        <button
          type="button"
          onClick={() => setUsageOpen(true)}
          className="flex items-center justify-between gap-3 rounded-lg bg-white/90 px-4 py-4 text-left shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-black text-slate-950 dark:text-slate-50">
              <HelpCircle size={17} className="text-teal-700 dark:text-teal-300" />
              사용법
            </span>
            <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">성경방과 기도방 가이드를 확인합니다.</span>
          </span>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          className="flex items-center justify-between gap-3 rounded-lg bg-white/90 px-4 py-4 text-left shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-black text-slate-950 dark:text-slate-50">
              <Info size={17} className="text-sky-700 dark:text-sky-300" />
              WePray 란?
            </span>
            <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">서비스 정보와 안내를 확인합니다.</span>
          </span>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        <button
          type="button"
          onClick={openShareModal}
          className="flex items-center justify-between gap-3 rounded-lg bg-white/90 px-4 py-4 text-left shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-black text-slate-950 dark:text-slate-50">
              <Share2 size={17} className="text-teal-700 dark:text-teal-300" />
              WePray 공유
            </span>
            <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">사이트 링크를 공유합니다.</span>
          </span>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        <button
          type="button"
          onClick={requestPwaInstall}
          className="flex items-center justify-between gap-3 rounded-lg bg-white/90 px-4 py-4 text-left shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-black text-slate-950 dark:text-slate-50">
              <Download size={17} className="text-violet-700 dark:text-violet-300" />
              앱 화면으로 설치
            </span>
            <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">홈 화면에 바로 추가할 수 있어요.</span>
          </span>
          <ChevronRight size={18} className="text-slate-400" />
        </button>

        <button
          type="button"
          onClick={clearAppCache}
          className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/95 px-4 py-4 text-left shadow-soft dark:border-amber-900/70 dark:bg-amber-950/30"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 font-black text-amber-900 dark:text-amber-100">
              <Trash2 size={17} className="text-amber-700 dark:text-amber-300" />
              캐시 삭제
            </span>
            <span className="mt-1 block text-xs font-bold leading-5 text-amber-700/80 dark:text-amber-300/80">다크모드, 성경방 보기 설정, 마지막 읽던 위치를 초기화합니다.</span>
          </span>
          <ChevronRight size={18} className="shrink-0 text-amber-500 dark:text-amber-300" />
        </button>

        {isLoggedIn ? (
          <section className="grid gap-2 rounded-lg bg-white/90 p-4 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900/85">
            <button
              type="button"
              onClick={() => void logout()}
              className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-soft dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <LogOut size={17} className="text-slate-500 dark:text-slate-400" />
              로그아웃
            </button>
            <div className="flex justify-center pt-2">
              <WithdrawLink currentNickname={currentNickname ?? "닉네임 없음"} />
            </div>
          </section>
        ) : (
          <Link
            href="/login"
            className="flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white shadow-soft"
          >
            <LogIn size={17} />
            로그인
          </Link>
        )}
      </div>

      <Modal title="사용법" open={usageOpen} onClose={() => setUsageOpen(false)}>
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => {
              setUsageOpen(false);
              setGuideKind("bible");
            }}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-4 text-left dark:bg-slate-900"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-200">
                <BookOpen size={18} />
              </span>
              <span className="min-w-0">
                <span className="block font-black text-slate-950 dark:text-slate-50">성경방 사용법</span>
                <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">성경 읽기, 묵상, 나눔, 플랜 안내</span>
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-400" />
          </button>
          <button
            type="button"
            onClick={() => {
              setUsageOpen(false);
              setGuideKind("prayer");
            }}
            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-4 py-4 text-left dark:bg-slate-900"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-200">
                <MessageCircle size={18} />
              </span>
              <span className="min-w-0">
                <span className="block font-black text-slate-950 dark:text-slate-50">기도방 사용법</span>
                <span className="mt-1 block text-xs font-bold text-slate-500 dark:text-slate-400">기도제목 작성, 선택, 함께 기도 안내</span>
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-slate-400" />
          </button>
        </div>
      </Modal>

      {guideKind ? <AppGuideOverlay kind={guideKind} open={Boolean(guideKind)} onClose={() => setGuideKind(null)} /> : null}
      <SiteShareModal open={shareOpen} onClose={() => setShareOpen(false)} onToast={setToast} />

      <Modal title="닉네임 변경" open={nicknameOpen} onClose={() => setNicknameOpen(false)}>
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            새 닉네임
            <input
              {...noBrowserInputSuggestions}
              value={nicknameInput}
              onChange={(event) => {
                setNicknameInput(event.target.value);
                setNicknameMessage("");
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="공백 없이 2~16글자"
              maxLength={16}
              autoFocus
            />
          </label>
          {nicknameMessage ? (
            <p
              className={`rounded-lg px-3 py-2 text-sm font-bold ${nicknameMessageType === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200"
                }`}
            >
              {nicknameMessage}
            </p>
          ) : null}
          <button
            type="button"
            onClick={saveNickname}
            disabled={nicknameSaving}
            className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-soft disabled:opacity-60"
          >
            <Save size={17} />
            저장
          </button>
        </div>
      </Modal>

      <Modal title="WePray 란?" open={infoOpen} onClose={() => setInfoOpen(false)}>
        <div className="grid gap-3">
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <p className="text-xs font-black text-teal-700 dark:text-teal-300">WePray v{appVersion}</p>
            <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-slate-50">함께 기도하고 말씀을 나누는 공간</h3>
          </div>
          <div className="grid gap-2">
            {wePrayInfoSections.map((section) => (
              <section key={section.title} className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900">
                <h4 className="font-black text-slate-950 dark:text-slate-50">{section.title}</h4>
                <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{section.body}</p>
                {section.title === "문의 / 피드백" ? (
                  <button
                    type="button"
                    onClick={openFeedbackModal}
                    className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-black text-white shadow-soft disabled:bg-slate-200 disabled:text-slate-500"
                  >
                    <Send size={15} />
                    {isLoggedIn ? "문의하기" : "로그인 후 문의 가능"}
                  </button>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </Modal>

      <Modal title="문의하기" open={feedbackOpen} onClose={() => {
        if (!feedbackSaving) setFeedbackOpen(false);
      }}>
        <div className="grid gap-3">
          <label className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            제목
            <input
              {...noBrowserInputSuggestions}
              value={feedbackTitle}
              onChange={(event) => {
                setFeedbackTitle(event.target.value);
                setFeedbackMessage("");
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="문의 제목"
              maxLength={80}
              autoFocus
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            회신 이메일 <span className="text-xs font-bold text-slate-400">선택</span>
            <input
              {...noBrowserInputSuggestions}
              value={feedbackReplyEmail}
              onChange={(event) => {
                setFeedbackReplyEmail(event.target.value);
                setFeedbackMessage("");
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="reply@example.com"
              maxLength={120}
              inputMode="email"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
            내용
            <textarea
              {...noBrowserInputSuggestions}
              value={feedbackContent}
              onChange={(event) => {
                setFeedbackContent(event.target.value);
                setFeedbackMessage("");
              }}
              className="min-h-36 resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-semibold leading-7 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="불편한 점이나 개선 의견을 적어주세요."
              maxLength={2000}
            />
          </label>
          {feedbackMessage ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
              {feedbackMessage}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void submitFeedback()}
            disabled={feedbackSaving}
            className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-black text-white shadow-soft disabled:opacity-60"
          >
            <Send size={17} />
            {feedbackSaving ? "접수 중" : "문의 접수"}
          </button>
        </div>
      </Modal>
    </>
  );
}
