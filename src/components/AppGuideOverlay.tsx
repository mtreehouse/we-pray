"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Edit3,
  MessageCircle,
  Pencil,
  Settings,
  X
} from "lucide-react";

export type GuideKind = "bible" | "prayer";

type GuideDemo =
  | "bible-date"
  | "bible-swipe"
  | "bible-complete"
  | "bible-verse"
  | "bible-sharing"
  | "bible-plan"
  | "bible-settings"
  | "prayer-room"
  | "prayer-write"
  | "prayer-select"
  | "prayer-pray"
  | "prayer-settings";

type GuideStep = {
  label: string;
  title: string;
  description: string;
  bullets: string[];
  demo: GuideDemo;
  icon: ReactNode;
};

const bibleGuideSteps: GuideStep[] = [
  {
    label: "성경",
    title: "날짜를 고르고 말씀을 읽어요",
    description: "상단 날짜를 눌러 읽을 플랜을 고르고, 오늘 읽을 장을 바로 확인할 수 있어요.",
    bullets: ["날짜 버튼은 성경 탭 안에서만 움직여요.", "성경과 플랜 달력은 서로 독립적으로 선택돼요."],
    demo: "bible-date",
    icon: <BookOpen size={16} />
  },
  {
    label: "이동",
    title: "좌우 슬라이드로 장을 넘겨요",
    description: "말씀 영역을 좌우로 밀면 이전 장과 다음 장으로 넘어가고, 아래 버튼으로도 이동할 수 있어요.",
    bullets: ["이동 후에는 현재 장 제목이 위에 고정돼요.", "처음/끝 버튼으로 첫 장과 마지막 장도 바로 갈 수 있어요."],
    demo: "bible-swipe",
    icon: <ChevronRight size={16} />
  },
  {
    label: "완료",
    title: "맨 아래에서 이동하고 완료해요",
    description: "말씀 영역 맨 아래에서도 이전/다음 장으로 이동할 수 있고, 마지막 장에서는 말씀 읽기 완료 버튼이 나타나요.",
    bullets: ["처음과 끝 버튼으로 플랜의 첫 장과 마지막 장으로 바로 이동할 수 있어요.", "말씀 읽기 완료는 마지막 장 맨 아래에서만 눌러요."],
    demo: "bible-complete",
    icon: <Check size={16} />
  },
  {
    label: "묵상",
    title: "구절을 눌러 묵상을 작성해요",
    description: "구절을 한 번 누르면 아래에 복사와 묵상 작성 버튼이 떠요. 내가 쓴 묵상이 있는 절에는 하트가 보여요.",
    bullets: ["구절 번호도 함께 보여서 위치를 놓치지 않아요.", "묵상 저장 후에도 읽던 창과 스크롤을 유지해요."],
    demo: "bible-verse",
    icon: <Pencil size={16} />
  },
  {
    label: "나눔",
    title: "나눔은 플랜 날짜별로 모여요",
    description: "나중에 작성해도 해당 말씀의 플랜 날짜 구역에 들어가고, 카드를 누르면 복사/수정/삭제를 사용할 수 있어요.",
    bullets: ["좋아요와 하트 반응은 카드에서 바로 누를 수 있어요.", "구절을 누르면 해당 말씀 팝업이 그 절 위치로 열려요."],
    demo: "bible-sharing",
    icon: <MessageCircle size={16} />
  },
  {
    label: "플랜",
    title: "달력에서 진행 상황을 확인해요",
    description: "플랜 탭은 항상 오늘 날짜를 기본으로 보여주고, 완료와 나눔 여부는 점으로 표시돼요.",
    bullets: ["초록 점은 말씀 읽기 완료, 노란 점은 나눔 작성이에요.", "달성률은 오늘까지 읽기 50%, 나눔 50% 기준이에요."],
    demo: "bible-plan",
    icon: <CalendarDays size={16} />
  },
  {
    label: "설정",
    title: "읽기 환경은 설정에서 바꿔요",
    description: "번역본, 글씨 크기, 줄 간격, 성경방 다크모드와 멤버 목록은 설정에서 관리해요.",
    bullets: ["설정한 번역본과 줄 간격은 다시 들어와도 기억돼요.", "방 정보와 멤버 history도 설정에서 확인할 수 있어요."],
    demo: "bible-settings",
    icon: <Settings size={16} />
  }
];

const prayerGuideSteps: GuideStep[] = [
  {
    label: "입장",
    title: "기도방을 만들거나 찾아 들어가요",
    description: "기도방 목록에서 새 방을 만들거나, 방 찾기로 초대받은 방에 들어갈 수 있어요.",
    bullets: ["방마다 멤버와 작성 내역이 따로 관리돼요.", "상단 설정에서 방 정보와 멤버 목록을 확인해요."],
    demo: "prayer-room",
    icon: <MessageCircle size={16} />
  },
  {
    label: "작성",
    title: "기도제목을 빠르게 남겨요",
    description: "하단 작성 버튼을 누르면 기도제목 입력창이 열리고, 저장하면 목록에 바로 반영돼요.",
    bullets: ["비어 있는 내용은 저장되지 않아요.", "기도제목은 날짜별로 묶여서 보여요."],
    demo: "prayer-write",
    icon: <Pencil size={16} />
  },
  {
    label: "선택",
    title: "카드를 눌러 복사와 수정을 해요",
    description: "기도제목 카드를 한 번 누르면 하단에 액션바가 떠요. 내가 쓴 글은 수정 버튼도 함께 보여요.",
    bullets: ["복사는 [작성자] [날짜] 내용 형식으로 저장돼요.", "카드를 다시 누르면 선택이 해제돼요."],
    demo: "prayer-select",
    icon: <Clipboard size={16} />
  },
  {
    label: "기도",
    title: "함께 기도 버튼으로 마음을 전해요",
    description: "기도 이모티콘 버튼을 누르면 참여 인원 수가 올라가고, 작은 응원 효과가 아래에서 올라와요.",
    bullets: ["다시 누르면 함께 기도 표시를 취소할 수 있어요.", "카드 선택과 기도 버튼은 서로 따로 동작해요."],
    demo: "prayer-pray",
    icon: <Check size={16} />
  },
  {
    label: "설정",
    title: "멤버와 방 관리는 설정에서 해요",
    description: "방 설정에서는 방 정보, 멤버 목록, 내 작성 내역, 방 관리와 나가기를 확인할 수 있어요.",
    bullets: ["내 계정은 멤버 목록에서 ME 표시로 구분돼요.", "방장에게는 관리 메뉴가 함께 보여요."],
    demo: "prayer-settings",
    icon: <Settings size={16} />
  }
];

export function AppGuideOverlay({ kind, open, onClose }: { kind: GuideKind; open: boolean; onClose: () => void }) {
  const steps = kind === "bible" ? bibleGuideSteps : prayerGuideSteps;
  const title = kind === "bible" ? "Bible Room 사용법" : "Pray Room 사용법";
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !step) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/62 px-4 pb-4 pt-10 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-amber-300 bg-amber-50 shadow-[0_24px_70px_rgba(120,53,15,0.38)] dark:border-amber-600/70 dark:bg-amber-950 dark:text-amber-50">
        <div className="border-b border-amber-200 bg-amber-100/70 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/55">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-amber-800 dark:text-amber-100">{title}</p>
              <h2 className="mt-0.5 truncate text-lg font-black text-amber-950 dark:text-amber-50">{step.title}</h2>
            </div>
            <button type="button" onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/80 text-amber-800 shadow-sm dark:bg-slate-900/70 dark:text-amber-100" aria-label="사용법 닫기">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-4">
          <GuideDemoView demo={step.demo} />
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-xs font-black text-amber-800 shadow-sm dark:bg-slate-900/70 dark:text-amber-100">
              {step.icon}
              {step.label}
            </div>
            <p className="text-sm font-bold leading-6 text-amber-900/85 dark:text-amber-100/85">{step.description}</p>
            <div className="mt-3 grid gap-2">
              {step.bullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-2 rounded-lg bg-white/75 px-3 py-2 text-xs font-bold leading-5 text-amber-900/85 dark:bg-slate-900/55 dark:text-amber-100/85">
                  <Check className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-200" size={14} />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-amber-200 bg-amber-100/60 px-4 py-3 dark:border-amber-800 dark:bg-amber-900/45">
          <button type="button" onClick={onClose} className="justify-self-start text-sm font-black text-amber-800/65 hover:text-amber-950 dark:text-amber-100/65 dark:hover:text-amber-50">
            건너뛰기
          </button>
          <div className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-black text-amber-800 shadow-sm dark:bg-slate-900/70 dark:text-amber-100">
            {stepIndex + 1}/{steps.length}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
              disabled={stepIndex === 0}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/80 text-amber-800 shadow-sm disabled:opacity-30 dark:bg-slate-900/70 dark:text-amber-100"
              aria-label="이전 사용법"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (isLast) onClose();
                else setStepIndex((index) => Math.min(steps.length - 1, index + 1));
              }}
              className="guide-cta-animated inline-flex h-10 min-w-[4.75rem] items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-black text-white"
            >
              {isLast ? "시작하기" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GuideDemoView({ demo }: { demo: GuideDemo }) {
  return (
    <div className="relative min-h-[13rem] overflow-hidden rounded-2xl bg-slate-950 p-4 text-white shadow-inner">
      {demo === "bible-date" ? <BibleDateDemo /> : null}
      {demo === "bible-swipe" ? <BibleSwipeDemo /> : null}
      {demo === "bible-complete" ? <BibleCompleteDemo /> : null}
      {demo === "bible-verse" ? <BibleVerseDemo /> : null}
      {demo === "bible-sharing" ? <BibleSharingDemo /> : null}
      {demo === "bible-plan" ? <BiblePlanDemo /> : null}
      {demo === "bible-settings" ? <BibleSettingsDemo /> : null}
      {demo === "prayer-room" ? <PrayerRoomDemo /> : null}
      {demo === "prayer-write" ? <PrayerWriteDemo /> : null}
      {demo === "prayer-select" ? <PrayerSelectDemo /> : null}
      {demo === "prayer-pray" ? <PrayerPrayDemo /> : null}
      {demo === "prayer-settings" ? <PrayerSettingsDemo /> : null}
      <GuideAnimationStyles />
    </div>
  );
}

function BibleDateDemo() {
  return (
    <div className="mx-auto max-w-[16rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl app-guide-rise">
      <div className="mb-2 grid grid-cols-3 gap-1 text-[11px] font-black">
        <span className="rounded-md bg-teal-700 px-2 py-1 text-center text-white">성경</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-center text-slate-400">나눔</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-center text-slate-400">플랜</span>
      </div>
      <div className="app-guide-pulse mx-auto mb-3 flex w-fit items-center gap-1 rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-800">
        <CalendarDays size={14} /> 2026.06.20
      </div>
      <div className="space-y-1.5 text-xs font-bold text-slate-600">
        <div className="h-3 rounded-full bg-slate-200" />
        <div className="h-3 w-10/12 rounded-full bg-slate-200" />
        <div className="h-3 w-8/12 rounded-full bg-slate-200" />
      </div>
    </div>
  );
}

function BibleSwipeDemo() {
  return (
    <div className="relative mx-auto max-w-[16rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <ChevronLeft className="text-slate-300" size={20} />
        <p className="text-sm font-black">누가복음 15장</p>
        <ChevronRight className="text-slate-300" size={20} />
      </div>
      <div className="space-y-2 text-xs leading-5 text-slate-600">
        <p><span className="font-black text-teal-700">1</span> 모든 세리와 죄인들이 말씀을 들으러 가까이 나아오니</p>
        <p><span className="font-black text-teal-700">2</span> 바리새인들이 수군거려 이르되...</p>
      </div>
      <div className="app-guide-swipe absolute top-1/2 grid h-11 w-11 place-items-center rounded-full bg-teal-700 text-white shadow-lg">
        <ChevronRight size={24} />
      </div>
    </div>
  );
}

function BibleCompleteDemo() {
  return (
    <div className="app-guide-rise mx-auto max-w-[17rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
      <div className="mb-3 text-center">
        <p className="text-sm font-black">누가복음 15장</p>
        <p className="text-[11px] font-bold text-slate-400">마지막 장</p>
      </div>
      <div className="mb-3 space-y-1.5">
        <div className="h-2.5 rounded-full bg-slate-200" />
        <div className="h-2.5 w-10/12 rounded-full bg-slate-200" />
        <div className="h-2.5 w-8/12 rounded-full bg-slate-200" />
      </div>
      <div className="mb-2 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-xs font-black">
        <span className="grid h-9 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500">시작</span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"><ChevronLeft size={13} />이전 장</span>
        <span className="flex h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700">다음 장<ChevronRight size={13} /></span>
      </div>
      <div className="app-guide-pulse flex h-11 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-black text-emerald-800">
        <Check size={16} />
        말씀 읽기 완료
      </div>
    </div>
  );
}

function BibleVerseDemo() {
  return (
    <div className="mx-auto max-w-[17rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
      <p className="mb-3 text-center text-sm font-black">마태복음 7장</p>
      <div className="app-guide-pulse rounded-lg bg-teal-50 px-2 py-2 text-sm leading-7 text-teal-950">
        <span className="mr-2 text-xs font-black text-teal-700">3</span>어찌하여 형제의 눈 속에 있는 티는 보고...
      </div>
      <div className="app-guide-float mx-auto mt-4 grid w-40 grid-cols-2 gap-1 rounded-2xl bg-white p-1.5 text-xs font-black text-slate-800 shadow-2xl ring-1 ring-slate-100">
        <span className="rounded-xl bg-slate-100 px-2 py-2 text-center"><Clipboard className="mx-auto mb-1" size={13} />복사</span>
        <span className="rounded-xl bg-teal-700 px-2 py-2 text-center text-white"><Pencil className="mx-auto mb-1" size={13} />묵상</span>
      </div>
    </div>
  );
}

function BibleSharingDemo() {
  return (
    <div className="mx-auto max-w-[17rem] space-y-2">
      <div className="text-center text-xs font-black text-slate-300">2026.06.20</div>
      <div className="app-guide-rise rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-black text-teal-700">윤우</p>
          <p className="text-[11px] font-bold text-slate-400">2026.06.20 오후 9:10</p>
        </div>
        <button type="button" className="mb-2 block rounded-lg bg-teal-50 px-2 py-1 text-left text-xs font-black text-teal-900">마태복음 7:3</button>
        <p className="text-xs leading-5 text-slate-600">나눔 내용이 날짜별로 모여 보여요.</p>
        <div className="mt-3 flex justify-end gap-1.5 text-xs font-black">
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-500 shadow-sm"><span className="text-sm" aria-hidden="true">👍</span><span>2</span></span>
          <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-600 shadow-sm"><span className="text-sm" aria-hidden="true">❤️</span><span>1</span></span>
        </div>
      </div>
    </div>
  );
}

function BiblePlanDemo() {
  return (
    <div className="mx-auto max-w-[17rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
      <div className="mb-2 flex items-center justify-between text-xs font-black">
        <ChevronLeft size={16} />
        <span>2026.06</span>
        <ChevronRight size={16} />
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-black">
        {Array.from({ length: 21 }).map((_, index) => (
          <div key={index} className={`relative grid h-7 place-items-center rounded-md ${index === 12 ? "bg-teal-50 text-teal-800 ring-2 ring-teal-600" : "bg-slate-100 text-slate-500"}`}>
            {index + 1}
            {(index === 5 || index === 12 || index === 16) ? <span className="absolute bottom-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
            {(index === 8 || index === 12) ? <span className="absolute bottom-0.5 ml-2 h-1.5 w-1.5 rounded-full bg-amber-500" /> : null}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-center text-xs font-black text-emerald-700">전체 64%</div>
    </div>
  );
}

function BibleSettingsDemo() {
  return (
    <div className="app-guide-rise mx-auto max-w-[17rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black">성경방 설정</p>
        <Settings size={17} className="text-teal-700" />
      </div>
      <div className="space-y-2 text-xs font-black">
        <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2"><span>번역본</span><span className="text-teal-700">개역개정</span></div>
        <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2"><span>글씨 크기</span><span className="text-teal-700">크게</span></div>
        <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2"><span>줄 간격</span><span className="text-teal-700">기본</span></div>
        <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2"><span>멤버</span><span className="text-teal-700">ME</span></div>
      </div>
    </div>
  );
}

function PrayerRoomDemo() {
  return (
    <div className="app-guide-rise mx-auto max-w-[17rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black">기도방</p>
        <Settings size={16} className="text-slate-400" />
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs font-black">
        <span className="rounded-lg bg-slate-100 px-3 py-3 text-center text-slate-700">방 찾기</span>
        <span className="rounded-lg bg-teal-700 px-3 py-3 text-center text-white">방 생성</span>
      </div>
      <div className="mt-3 rounded-lg bg-slate-50 p-3">
        <p className="font-black text-slate-900">금요 중보기도</p>
        <p className="mt-1 text-xs font-bold text-slate-500">함께 기도제목을 나눠요</p>
      </div>
    </div>
  );
}

function PrayerWriteDemo() {
  return (
    <div className="mx-auto max-w-[17rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black">기도제목</p>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-teal-700 text-white shadow-lg">✏️</span>
      </div>
      <div className="rounded-lg border border-slate-200 p-3">
        <p className="mb-2 text-xs font-black text-slate-500">기도제목 작성</p>
        <div className="h-16 rounded-lg bg-slate-100" />
        <div className="mt-2 flex justify-end">
          <span className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-black text-white">저장</span>
        </div>
      </div>
    </div>
  );
}

function PrayerSelectDemo() {
  return (
    <div className="mx-auto max-w-[17rem] space-y-3">
      <div className="rounded-2xl bg-white p-3 text-slate-900 shadow-xl ring-2 ring-teal-500">
        <div className="mb-2 flex justify-between gap-2">
          <p className="text-sm font-black text-teal-700">윤우</p>
          <p className="text-xs font-bold text-slate-400">오후 9:10</p>
        </div>
        <p className="text-xs leading-5 text-slate-600">함께 기도해주세요.</p>
      </div>
      <div className="app-guide-float mx-auto grid w-44 grid-cols-2 gap-1 rounded-2xl bg-white p-1.5 text-xs font-black text-slate-800 shadow-2xl ring-1 ring-slate-100">
        <span className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-2 py-2"><Clipboard size={13} />복사</span>
        <span className="flex items-center justify-center gap-1 rounded-xl bg-teal-700 px-2 py-2 text-white"><Edit3 size={13} />수정</span>
      </div>
    </div>
  );
}

function PrayerPrayDemo() {
  return (
    <div className="mx-auto max-w-[17rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
      <div className="mb-2 flex justify-between gap-2">
        <p className="text-sm font-black">윤우</p>
        <p className="text-xs font-bold text-slate-400">오후 9:10</p>
      </div>
      <p className="text-xs leading-5 text-slate-600">가족의 건강을 위해 기도해주세요.</p>
      <div className="mt-3 flex justify-end">
        <span className="app-guide-pulse inline-flex h-8 items-center justify-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 text-xs font-black text-teal-700 shadow-[0_6px_16px_rgba(13,148,136,0.18)]">
          <span className="text-sm" aria-hidden="true">🙏</span>
          <span>4</span>
        </span>
      </div>
      <div className="app-guide-prayer mt-4 mx-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 via-emerald-500 to-sky-500 px-4 py-2 text-xs font-black text-white shadow-lg">
        <span aria-hidden="true">🙏</span>
        함께 기도해요!
      </div>
    </div>
  );
}

function PrayerSettingsDemo() {
  return (
    <div className="app-guide-rise mx-auto max-w-[17rem] rounded-2xl bg-white p-3 text-slate-900 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black">기도방 설정</p>
        <Settings size={17} className="text-teal-700" />
      </div>
      <div className="space-y-2 text-xs font-black">
        <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2"><span>방 정보</span><ChevronRight size={14} /></div>
        <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2"><span>멤버</span><span className="rounded-full bg-teal-100 px-2 text-teal-700">ME</span></div>
        <div className="flex justify-between rounded-lg bg-slate-100 px-3 py-2"><span>작성 내역</span><span className="text-teal-700">12개</span></div>
      </div>
    </div>
  );
}

function GuideAnimationStyles() {
  return (
    <style>{`
      @keyframes appGuideRise { 0% { opacity: 0; transform: translateY(14px) scale(0.98); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
      @keyframes appGuidePulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.18); } 50% { box-shadow: 0 0 0 10px rgba(13, 148, 136, 0); } }
      @keyframes appGuideSwipe { 0% { left: 58%; opacity: 0; } 18% { opacity: 1; } 68% { left: 78%; opacity: 1; } 100% { left: 82%; opacity: 0; } }
      @keyframes appGuideFloat { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
      @keyframes appGuidePrayer { 0% { opacity: 0; transform: translateY(18px) scale(0.92); } 25% { opacity: 1; transform: translateY(0) scale(1.03); } 100% { opacity: 0; transform: translateY(-42px) scale(0.98); } }
      .app-guide-rise { animation: appGuideRise 420ms ease-out both; }
      .app-guide-pulse { animation: appGuidePulse 1500ms ease-in-out infinite; }
      .app-guide-swipe { animation: appGuideSwipe 1700ms ease-in-out infinite; }
      .app-guide-float { animation: appGuideFloat 520ms ease-out both; }
      .app-guide-prayer { animation: appGuidePrayer 1450ms cubic-bezier(0.19, 1, 0.22, 1) infinite; }
    `}</style>
  );
}
