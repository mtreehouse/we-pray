'use client';

import { useState } from "react";
import { MessageCircle, Share2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { absoluteUrl, shareOrCopy } from "@/lib/client-share";

const kakaoSdkUrl = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js";
const kakaoTemplateId = 134585;
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

type SiteShareModalProps = {
  open: boolean;
  onClose: () => void;
  onToast: (message: string) => void;
};

export function SiteShareModal({ open, onClose, onToast }: SiteShareModalProps) {
  const [sharing, setSharing] = useState(false);
  const [kakaoSharing, setKakaoSharing] = useState(false);

  async function shareGeneral() {
    try {
      setSharing(true);
      const url = absoluteUrl("/");
      const title = "함께 나누는 기도의 힘, WePray";
      const body = "기도로 연결되고, 말씀으로 함께 성장해요!";
      const copyText = title + "\n\n" + body + "\n\n" + url;

      const result = await shareOrCopy({
        title,
        text: body,
        url,
        copyText
      });
      setSharing(false);
      onClose();
      onToast(result === "shared" ? "공유했습니다." : "사이트 공유 내용을 복사했습니다.");
    } catch {
      setSharing(false);
      onToast("공유에 실패했습니다.");
    }
  }

  async function shareKakao() {
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
        templateId: kakaoTemplateId
      });
      setKakaoSharing(false);
      onClose();
      onToast("카카오톡으로 공유했습니다.");
    } catch {
      setKakaoSharing(false);
      onToast("카카오톡 공유에 실패했습니다.");
    }
  }

  return (
    <Modal title="WePray 공유" open={open} onClose={onClose}>
      <div className="grid gap-3">
        <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-900">
          <p className="text-xs font-black text-teal-700 dark:text-teal-300">WePray</p>
          <p className="mt-1 break-words font-black text-slate-950 dark:text-slate-50">함께 기도하고 말씀을 나누는 공간</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={shareKakao}
            disabled={kakaoSharing || sharing}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#FEE500] px-3 py-3 font-black text-[#191919] shadow-soft disabled:opacity-60"
          >
            <MessageCircle size={17} fill="currentColor" strokeWidth={2.4} />
            {kakaoSharing ? "공유 중" : "카카오톡"}
          </button>
          <button
            type="button"
            onClick={shareGeneral}
            disabled={sharing || kakaoSharing}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-teal-700 px-3 py-3 font-black text-white shadow-soft disabled:opacity-60"
          >
            <Share2 size={17} />
            {sharing ? "공유 중" : "일반공유"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
