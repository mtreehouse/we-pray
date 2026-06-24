"use client";

import { useState } from "react";
import { MessageCircle, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { noBrowserPasswordSuggestions } from "@/lib/browser-input";
import { absoluteUrl, shareOrCopy } from "@/lib/client-share";

type RoomShareModalProps = {
  open: boolean;
  onClose: () => void;
  kind: "pray" | "bible";
  roomId: string;
  roomTitle: string;
  onToast: (message: string) => void;
};

const kindLabels = {
  pray: {
    title: "기도방 공유",
    label: "기도방",
    path: "/join/pray-room/"
  },
  bible: {
    title: "성경방 공유",
    label: "성경방",
    path: "/join/bible-room/"
  }
} as const;

const kakaoSdkUrl = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js";
const kakaoTemplateId = 134577;
const kakaoScriptId = "kakao-javascript-sdk";
const kakaoJavascriptKey = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY || "";

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Share?: {
        sendDefault: (options: unknown) => void;
        sendCustom: (options: unknown) => void;
      };
    };
  }
}

function loadKakaoSdk() {
  if (typeof window === "undefined") return Promise.reject(new Error("Kakao SDK is client-only."));
  if (window.Kakao) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(kakaoScriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Failed to load Kakao SDK.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = kakaoScriptId;
    script.src = kakaoSdkUrl;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Kakao SDK."));
    document.head.appendChild(script);
  });
}

export function RoomShareModal({ open, onClose, kind, roomId, roomTitle, onToast }: RoomShareModalProps) {
  const labels = kindLabels[kind];
  const [password, setPassword] = useState("");
  const [sharing, setSharing] = useState(false);
  const [kakaoSharing, setKakaoSharing] = useState(false);

  function buildShareContent() {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) return null;

    const roomPath = labels.path + roomId;
    const url = absoluteUrl(roomPath);
    const title = "함께 나누는 기도의 힘, WePray";
    const body = "[" + roomTitle + "] " + labels.label + "에 초대합니다!\n기도로 연결되고, 말씀으로 함께 성장해요!";
    const copyText = title + "\n\n" + body + "\n\n" + url;

    return { title, text: body, copyText, url, roomPath, password: trimmedPassword };
  }

  async function shareRoom() {
    const content = buildShareContent();
    if (!content) {
      onToast("공유할 입장 비밀번호를 입력해주세요.");
      return;
    }

    try {
      setSharing(true);
      const result = await shareOrCopy({ title: content.title, text: content.text, url: content.url, copyText: content.copyText });
      setSharing(false);
      setPassword("");
      onClose();
      onToast(result === "shared" ? "공유했습니다." : "공유 내용을 복사했습니다.");
    } catch {
      setSharing(false);
      onToast("공유에 실패했습니다.");
    }
  }

  async function shareToKakao() {
    const content = buildShareContent();
    if (!content) {
      onToast("공유할 입장 비밀번호를 입력해주세요.");
      return;
    }

    if (!kakaoJavascriptKey) {
      onToast("카카오 JavaScript 키를 설정해주세요.");
      return;
    }

    try {
      setKakaoSharing(true);
      await loadKakaoSdk();
      if (!window.Kakao) throw new Error("Kakao SDK is not ready.");
      if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoJavascriptKey);

      window.Kakao.Share?.sendCustom({
        templateId: kakaoTemplateId,
        templateArgs: {
          room_title: roomTitle,
          roomTitle,
          room_kind: labels.label,
          roomKind: labels.label,
          room_url: content.roomPath,
          roomUrl: content.roomPath,
          password: content.password,
          invite_password: content.password,
          title: content.title,
          text: content.text
        }
      });
      setKakaoSharing(false);
    } catch {
      setKakaoSharing(false);
      onToast("카카오톡 공유에 실패했습니다.");
    }
  }

  return (
    <Modal title={labels.title} open={open} onClose={onClose}>
      <div className="grid gap-3">
        <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900">
          <p className="text-xs font-black text-teal-700 dark:text-teal-300">{labels.label}</p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-slate-50">{roomTitle}</p>
        </div>
        <label className="grid gap-2 text-sm font-black text-slate-700 dark:text-slate-200">
          입장 비밀번호
          <input
            {...noBrowserPasswordSuggestions}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            placeholder="공유할 비밀번호 입력"
            type="password"
            maxLength={40}
            autoFocus
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={shareToKakao}
            disabled={kakaoSharing || sharing}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-3 py-3 font-black text-[#191919] shadow-soft disabled:opacity-60"
          >
            <MessageCircle size={17} fill="currentColor" strokeWidth={2.4} />
            {kakaoSharing ? "공유 중" : "카카오톡"}
          </button>
          <button
            type="button"
            onClick={shareRoom}
            disabled={sharing || kakaoSharing}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-3 font-black text-white shadow-soft disabled:opacity-60"
          >
            <Share2 size={17} />
            {sharing ? "공유 중" : "공유하기"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
