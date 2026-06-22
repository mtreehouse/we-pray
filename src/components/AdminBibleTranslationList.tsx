"use client";

import { useState } from "react";
import { BookOpen, ShieldCheck } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import type { BibleTranslationSettingView } from "@/lib/bible-translations";

type TranslationPatchResponse = {
  translation?: BibleTranslationSettingView;
  error?: string;
};

export function AdminBibleTranslationList({ translations }: { translations: BibleTranslationSettingView[] }) {
  const [items, setItems] = useState(translations);
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  async function updateTranslation(translation: BibleTranslationSettingView, patch: Partial<Pick<BibleTranslationSettingView, "isVisible" | "requiresCopyright">>) {
    if (savingCode) return;
    setSavingCode(translation.code);

    const res = await fetch("/api/admin/bible-translations/" + translation.code, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => ({})) as TranslationPatchResponse;
    setSavingCode(null);

    if (!res.ok || !data.translation) {
      setToast(data.error ?? "번역본 설정을 저장하지 못했습니다.");
      return;
    }

    setItems((current) => current.map((item) => item.code === translation.code ? data.translation! : item));
    setToast("번역본 설정을 저장했습니다.");
  }

  return (
    <div className="grid gap-3">
      <Toast message={toast} onClose={() => setToast("")} />
      {items.map((translation) => {
        const saving = savingCode === translation.code;

        return (
          <article key={translation.code} className="rounded-lg bg-white p-4 shadow-soft dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <BookOpen size={18} className="text-teal-700 dark:text-teal-300" />
                  <h2 className="font-black text-slate-950 dark:text-slate-50">{translation.label}</h2>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-400 dark:text-slate-500">{translation.code}</p>
              </div>
              {translation.requiresCopyright ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                  <ShieldCheck size={12} />
                  저작권 필요
                </span>
              ) : null}
            </div>

            <div className="grid gap-2">
              <ToggleRow
                label="노출 여부"
                description="성경방 번역본 선택 목록에 표시합니다."
                checked={translation.isVisible}
                disabled={saving}
                onChange={() => updateTranslation(translation, { isVisible: !translation.isVisible })}
              />
              <ToggleRow
                label="저작권 여부"
                description="켜면 저작권 허용된 사용자만 선택할 수 있습니다."
                checked={translation.requiresCopyright}
                disabled={saving}
                onChange={() => updateTranslation(translation, { requiresCopyright: !translation.requiresCopyright })}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-3 dark:bg-slate-950/60">
      <div className="min-w-0">
        <p className="font-black text-slate-900 dark:text-slate-100">{label}</p>
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={"relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60 " + (checked ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700")}
        aria-pressed={checked}
      >
        <span className={"absolute top-1 h-6 w-6 rounded-full bg-white shadow transition " + (checked ? "left-7" : "left-1")} />
      </button>
    </div>
  );
}
