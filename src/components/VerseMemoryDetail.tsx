"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { BookMarked, Check, ChevronLeft, ChevronRight, Eraser, Eye, EyeOff, Keyboard, ListChecks, RotateCcw, Settings, Trash2, X } from "lucide-react";
import { Toast } from "@/components/ui/Toast";
import { noBrowserInputSuggestions } from "@/lib/browser-input";
import { masteryLabel, type BibleMemoryMasteryValue, type VerseMemoryCardView } from "@/lib/verse-room";

type VerseMemoryFontSize = "small" | "normal" | "large" | "xlarge";

const CHO = ["ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];
const STEPS = ["전체 보기", "절별 보기", "빈칸 보기", "첫 글자 힌트", "직접 입력", "암송 완료"];
const VERSE_MEMORY_FONT_SIZE_STORAGE_KEY = "wepray:verse-room-font-size";
const VERSE_MEMORY_FONT_SIZE_LABELS: Record<VerseMemoryFontSize, string> = {
  small: "작게",
  normal: "기본",
  large: "크게",
  xlarge: "아주 크게"
};
const VERSE_MEMORY_FONT_SIZE_CLASSES: Record<VerseMemoryFontSize, string> = {
  small: "text-[14px]",
  normal: "text-[15px]",
  large: "text-[17px]",
  xlarge: "text-[19px]"
};

function isVerseMemoryFontSize(value: unknown): value is VerseMemoryFontSize {
  return value === "small" || value === "normal" || value === "large" || value === "xlarge";
}

export function VerseMemoryDetail({ card }: { card: VerseMemoryCardView }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [verseIndex, setVerseIndex] = useState(0);
  const [blankLevel, setBlankLevel] = useState(1);
  const [typedVerses, setTypedVerses] = useState<Record<number, string>>(() => Object.fromEntries(card.verses.map((verse) => [verse.verse, ""])));
  const [progress, setProgress] = useState(card.progress);
  const [fontSize, setFontSize] = useState<VerseMemoryFontSize>("normal");
  const [fullTextHidden, setFullTextHidden] = useState(false);
  const [singleVerseHidden, setSingleVerseHidden] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingMastery, setSavingMastery] = useState<BibleMemoryMasteryValue | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");

  const fullText = card.verses.map((verse) => verse.text).join("\n");
  const typedFullText = card.verses.map((verse) => typedVerses[verse.verse] ?? "").join("\n");
  const currentVerse = card.verses[verseIndex] ?? card.verses[0];
  const scriptureFontClass = VERSE_MEMORY_FONT_SIZE_CLASSES[fontSize];

  useEffect(() => {
    try {
      const savedFontSize = window.localStorage.getItem(VERSE_MEMORY_FONT_SIZE_STORAGE_KEY);
      if (isVerseMemoryFontSize(savedFontSize)) setFontSize(savedFontSize);
    } catch {
      // Keep the default size when browser storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!settingsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [settingsOpen]);

  function selectFontSize(nextFontSize: VerseMemoryFontSize) {
    setFontSize(nextFontSize);
    try {
      window.localStorage.setItem(VERSE_MEMORY_FONT_SIZE_STORAGE_KEY, nextFontSize);
    } catch {
      // The in-memory setting still applies for this visit.
    }
  }

  async function saveProgress(mastery: BibleMemoryMasteryValue) {
    if (savingMastery) return;
    setSavingMastery(mastery);

    const res = await fetch("/api/verse-room/cards/" + card.id + "/progress", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mastery })
    });
    const data = await res.json().catch(() => ({})) as { progress?: VerseMemoryCardView["progress"]; error?: string };
    setSavingMastery(null);

    if (!res.ok || !data.progress) {
      setToast(data.error ?? "암송 상태를 저장하지 못했습니다.");
      return;
    }

    setProgress(data.progress);
    setToast("암송 상태를 저장했습니다.");
    router.refresh();
  }

  async function deleteCard() {
    if (deleting || !confirm("이 말씀카드를 삭제하시겠습니까?\n삭제하면 복구할 수 없습니다.")) return;
    setDeleting(true);

    const res = await fetch("/api/verse-room/cards/" + card.id, { method: "DELETE" });
    const data = await res.json().catch(() => ({})) as { error?: string };

    if (!res.ok) {
      setDeleting(false);
      setToast(data.error ?? "말씀카드를 삭제하지 못했습니다.");
      return;
    }

    router.replace("/verse-room");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <Toast message={toast} onClose={() => setToast("")} />

      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto grid min-h-16 w-full max-w-xl grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2 px-3">
          <Link href="/verse-room" prefetch={false} className="grid h-10 w-10 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900" aria-label="암송 목록으로">
            <ChevronLeft size={23} />
          </Link>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-black text-slate-950 dark:text-slate-50">{card.label}</h1>
            <p className="mt-0.5 truncate text-[11px] font-bold text-teal-700 dark:text-teal-300">{card.translationLabel}</p>
          </div>
          <button type="button" onClick={() => setSettingsOpen(true)} className="grid h-10 w-10 place-items-center rounded-full text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900" aria-label="성경 암송 설정">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 pb-10 pt-5">
        <section className="rounded-lg border border-teal-100 bg-teal-50/80 p-4 dark:border-teal-900/60 dark:bg-teal-950/30">
          <div>
            <p className="text-sm font-black text-teal-950 dark:text-teal-100">{STEPS[step]}</p>
            <p className="mt-1 text-xs font-bold text-teal-700 dark:text-teal-300">{masteryLabel(progress.mastery)} · 진행률 {progress.progressPercent}%</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/80 dark:bg-slate-900/80">
            <div className="h-full rounded-full bg-teal-600 transition-[width] duration-300 dark:bg-teal-400" style={{ width: progress.progressPercent + "%" }} />
          </div>
        </section>

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {STEPS.map((label, index) => (
            <button key={label} type="button" onClick={() => setStep(index)} className={`min-h-10 rounded-lg px-2 text-[11px] font-black transition ${step === index ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4">
          {step === 0 ? (
            <StudyPanel
              icon={<Eye size={18} />}
              title="전체 보기"
              action={<VisibilityToggleButton hidden={fullTextHidden} onToggle={() => setFullTextHidden((hidden) => !hidden)} />}
            >
              <VerseBlock verses={card.verses} fontSize={fontSize} hidden={fullTextHidden} />
            </StudyPanel>
          ) : null}

          {step === 1 && currentVerse ? (
            <StudyPanel
              icon={<ListChecks size={18} />}
              title={(verseIndex + 1) + " / " + card.verses.length + "절"}
              action={<VisibilityToggleButton hidden={singleVerseHidden} onToggle={() => setSingleVerseHidden((hidden) => !hidden)} />}
            >
              <p className={`rounded-lg bg-white p-4 font-bold leading-9 text-slate-900 shadow-soft dark:bg-slate-900 dark:text-slate-100 ${scriptureFontClass}`}>
                <span aria-hidden={singleVerseHidden} className={`block transition duration-200 ${singleVerseHidden ? "select-none blur-[6px] opacity-35" : ""}`}>
                  <span className="mr-2 text-sm font-black text-slate-400">{currentVerse.verse}</span>
                  {currentVerse.text}
                </span>
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setVerseIndex(Math.max(0, verseIndex - 1))} disabled={verseIndex === 0} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-white text-sm font-black text-slate-700 shadow-sm disabled:opacity-40 dark:bg-slate-900 dark:text-slate-200"><ChevronLeft size={16} />이전 절</button>
                <button type="button" onClick={() => setVerseIndex(Math.min(card.verses.length - 1, verseIndex + 1))} disabled={verseIndex >= card.verses.length - 1} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg bg-white text-sm font-black text-slate-700 shadow-sm disabled:opacity-40 dark:bg-slate-900 dark:text-slate-200">다음 절<ChevronRight size={16} /></button>
              </div>
            </StudyPanel>
          ) : null}

          {step === 2 ? (
            <StudyPanel icon={<RotateCcw size={18} />} title="빈칸 보기">
              <div className="mb-3 grid grid-cols-3 gap-2">
                {[1, 2, 3].map((level) => (
                  <button key={level} type="button" onClick={() => setBlankLevel(level)} className={`min-h-10 rounded-lg text-xs font-black ${blankLevel === level ? "bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950" : "bg-white text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-300"}`}>{level}단계</button>
                ))}
              </div>
              <p className={`whitespace-pre-line rounded-lg bg-white p-4 font-bold leading-9 text-slate-900 shadow-soft dark:bg-slate-900 dark:text-slate-100 ${scriptureFontClass}`}>{maskWords(fullText, blankLevel)}</p>
            </StudyPanel>
          ) : null}

          {step === 3 ? (
            <StudyPanel icon={<BookMarked size={18} />} title="첫 글자 힌트">
              <p className={`whitespace-pre-line rounded-lg bg-white p-4 font-black leading-9 text-slate-900 shadow-soft dark:bg-slate-900 dark:text-slate-100 ${scriptureFontClass}`}>{initialHint(fullText)}</p>
            </StudyPanel>
          ) : null}

          {step === 4 ? (
            <StudyPanel
              icon={<Keyboard size={18} />}
              title="직접 입력"
              action={(
                <button
                  type="button"
                  onClick={() => setTypedVerses(Object.fromEntries(card.verses.map((verse) => [verse.verse, ""])))}
                  disabled={!Object.values(typedVerses).some((value) => value.length > 0)}
                  className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 text-[11px] font-black text-slate-600 shadow-sm transition active:scale-95 disabled:cursor-default disabled:opacity-40 dark:bg-slate-900 dark:text-slate-300"
                >
                  <Eraser size={14} />
                  입력 전체 초기화
                </button>
              )}
            >
              <div className="grid gap-3">
                {card.verses.map((verse) => {
                  const value = typedVerses[verse.verse] ?? "";
                  return (
                    <label key={verse.verse} className="block rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <span className="mb-2 flex items-center justify-between gap-3">
                        <strong className="text-sm font-black text-slate-900 dark:text-slate-100">{verse.verse}절</strong>
                        <span className="text-xs font-black text-teal-700 dark:text-teal-300">유사도 {similarityScore(value, verse.text)}%</span>
                      </span>
                      <textarea
                        {...noBrowserInputSuggestions}
                        value={value}
                        onChange={(event) => setTypedVerses((current) => ({ ...current, [verse.verse]: event.target.value }))}
                        rows={3}
                        className={`min-h-24 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 p-3 font-semibold leading-7 text-slate-900 outline-none focus:border-teal-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 ${scriptureFontClass}`}
                        placeholder={verse.verse + "절 말씀을 입력해보세요."}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 rounded-lg bg-white p-3 shadow-sm dark:bg-slate-900">
                <p className="text-sm font-black text-slate-900 dark:text-slate-100">전체 유사도 {similarityScore(typedFullText, fullText)}%</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">띄어쓰기와 문장부호를 제외해 비교합니다. 각 절을 떠올린 만큼 차근차근 입력해보세요.</p>
              </div>
            </StudyPanel>
          ) : null}

          {step === 5 ? (
            <StudyPanel icon={<Check size={18} />} title="암송 완료 체크">
              <div className="grid gap-2">
                {(["DIFFICULT", "ALMOST", "MEMORIZED"] as BibleMemoryMasteryValue[]).map((mastery) => {
                  const active = progress.mastery === mastery && Boolean(progress.lastReviewedAt);
                  return (
                    <button
                      key={mastery}
                      type="button"
                      onClick={() => void saveProgress(mastery)}
                      disabled={Boolean(savingMastery)}
                      className={`flex min-h-14 items-center justify-between gap-3 rounded-lg border px-4 text-left text-sm font-black shadow-sm transition disabled:opacity-60 ${active
                        ? "border-teal-600 bg-teal-50 text-teal-900 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-100"
                        : "border-slate-200 bg-white text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                      }`}
                    >
                      <span>{masteryLabel(mastery)}</span>
                      {savingMastery === mastery ? <span className="text-xs">저장 중</span> : active ? <Check size={18} /> : null}
                    </button>
                  );
                })}
              </div>
            </StudyPanel>
          ) : null}
        </div>
      </main>

      <VerseMemorySettingsDrawer
        open={settingsOpen}
        fontSize={fontSize}
        deleting={deleting}
        onClose={() => setSettingsOpen(false)}
        onFontSizeChange={selectFontSize}
        onDelete={() => void deleteCard()}
      />
    </div>
  );
}

function VerseMemorySettingsDrawer({
  open,
  fontSize,
  deleting,
  onClose,
  onFontSizeChange,
  onDelete
}: {
  open: boolean;
  fontSize: VerseMemoryFontSize;
  deleting: boolean;
  onClose: () => void;
  onFontSizeChange: (fontSize: VerseMemoryFontSize) => void;
  onDelete: () => void;
}) {
  return (
    <div className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}>
      <button type="button" onClick={onClose} className={`absolute inset-0 bg-slate-950/30 transition-opacity dark:bg-slate-950/60 ${open ? "opacity-100" : "opacity-0"}`} aria-label="설정 닫기" />
      <aside className={`absolute right-0 top-0 h-full w-[86%] max-w-sm overflow-y-auto overscroll-contain bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-soft transition-transform dark:bg-slate-950 ${open ? "translate-x-0" : "translate-x-full"}`}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">성경 암송 설정</h2>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200" aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-2">
          <section className="rounded-lg bg-slate-100 px-4 py-3 dark:bg-slate-900">
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">말씀 글씨 크기</h3>
              <span className="shrink-0 text-xs font-black text-teal-700 dark:text-teal-300">{VERSE_MEMORY_FONT_SIZE_LABELS[fontSize]}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(VERSE_MEMORY_FONT_SIZE_LABELS) as VerseMemoryFontSize[]).map((size) => (
                <button key={size} type="button" onClick={() => onFontSizeChange(size)} className={`min-h-9 rounded-lg text-xs font-black transition ${fontSize === size ? "bg-teal-700 text-white dark:bg-teal-500 dark:text-slate-950" : "bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                  {size === "small" ? "A-" : size === "normal" ? "A" : size === "large" ? "A+" : "A++"}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
          <h3 className="text-sm font-black text-rose-700 dark:text-rose-300">현재 말씀카드 삭제</h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">이 카드와 암송 진행 상태를 완전히 삭제합니다.</p>
          <button type="button" onClick={onDelete} disabled={deleting} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-rose-600 px-3 text-sm font-black text-white disabled:opacity-50">
            <Trash2 size={16} />
            {deleting ? "삭제 중" : "말씀카드 삭제"}
          </button>
        </section>
      </aside>
    </div>
  );
}

function VisibilityToggleButton({ hidden, onToggle }: { hidden: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={hidden}
      className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 text-[11px] font-black text-slate-600 shadow-sm transition active:scale-95 dark:bg-slate-900 dark:text-slate-300"
    >
      {hidden ? <Eye size={14} /> : <EyeOff size={14} />}
      {hidden ? "말씀 보기" : "가리기"}
    </button>
  );
}

function StudyPanel({ icon, title, action, children }: { icon: ReactNode; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900/60">
      <div className="mb-3 flex min-h-8 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-100">{icon}{title}</div>
        {action}
      </div>
      {children}
    </section>
  );
}

function VerseBlock({ verses, fontSize, hidden }: { verses: VerseMemoryCardView["verses"]; fontSize: VerseMemoryFontSize; hidden: boolean }) {
  return (
    <div className="grid gap-2 rounded-lg bg-white p-4 shadow-soft dark:bg-slate-900">
      {verses.map((verse) => (
        <p key={verse.verse} className={`font-semibold leading-8 text-slate-800 dark:text-slate-100 ${VERSE_MEMORY_FONT_SIZE_CLASSES[fontSize]}`}>
          <span aria-hidden={hidden} className={`block transition duration-200 ${hidden ? "select-none blur-[6px] opacity-35" : ""}`}>
            <span className="mr-2 font-black text-slate-400">{verse.verse}</span>
            {verse.text}
          </span>
        </p>
      ))}
    </div>
  );
}

function maskWords(text: string, level: number) {
  const interval = level === 1 ? 5 : level === 2 ? 3 : 2;
  return text.split(/(\s+)/).map((part, index) => {
    if (/^\s+$/.test(part) || !part.trim()) return part;
    return index % interval === 0 ? "____" : part;
  }).join("");
}

function initialHint(text: string) {
  return text.replace(/[가-힣]/g, (char) => {
    const code = char.charCodeAt(0) - 0xac00;
    if (code < 0 || code > 11171) return char;
    return CHO[Math.floor(code / 588)] ?? char;
  }).replace(/[A-Za-z0-9]/g, (char) => char[0] ?? char);
}

function similarityScore(input: string, target: string) {
  const normalize = (value: string) => value.replace(/[\s\p{P}\p{S}]/gu, "").toLowerCase();
  const a = normalize(input);
  const b = normalize(target);
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const max = Math.max(a.length, b.length);
  let same = 0;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] === b[index]) same += 1;
  }
  return Math.round((same / max) * 100);
}
