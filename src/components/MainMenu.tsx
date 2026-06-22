import Link from "next/link";
import { BookOpen, HeartHandshake, LogIn, MessageSquareText, Newspaper, Settings } from "lucide-react";
import type { UserRole } from "@prisma/client";

type MainMenuProps = {
  isLoggedIn: boolean;
  role?: UserRole;
};

export function MainMenu({ isLoggedIn, role }: MainMenuProps) {
  const itemClass =
    "flex min-h-20 w-full items-center gap-3 rounded-lg border border-white/80 bg-white/90 p-4 text-left shadow-soft transition active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900/85";
  const mutedItemClass =
    "flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white/60 p-4 text-left text-slate-400 shadow-soft dark:border-slate-800 dark:bg-slate-900/55 dark:text-slate-500";

  return (
    <nav className="grid gap-3">
      {!isLoggedIn ? (
        <Link href="/login" className={itemClass}>
          <LogIn className="text-teal-700 dark:text-teal-300" size={22} />
          <span>
            <span className="block font-bold text-slate-900 dark:text-slate-50">로그인</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">Google, Kakao, Naver</span>
          </span>
        </Link>
      ) : null}

      {isLoggedIn ? (
        <Link href="/pray-room" className={itemClass}>
          <HeartHandshake className="text-emerald-700 dark:text-emerald-300" size={22} />
          <span>
            <span className="block font-bold text-slate-900 dark:text-slate-50">Pray Room</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">함께 기도제목 나누기</span>
          </span>
        </Link>
      ) : (
        <div className={mutedItemClass}>
          <HeartHandshake size={22} />
          <span>
            <span className="block font-bold">Pray Room</span>
            <span className="text-sm">로그인 후 이용 가능</span>
          </span>
        </div>
      )}

      {isLoggedIn ? (
        <Link href="/bible-room" className={itemClass}>
          <BookOpen className="text-teal-700 dark:text-teal-300" size={22} />
          <span>
            <span className="block font-bold text-slate-900 dark:text-slate-50">Bible Room</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">함께 성경 통독하기</span>
          </span>
        </Link>
      ) : (
        <div className={mutedItemClass}>
          <BookOpen size={22} />
          <span>
            <span className="block font-bold">Bible Room</span>
            <span className="text-sm">로그인 후 이용 가능</span>
          </span>
        </div>
      )}

      <Link href="/pray-news" className={itemClass}>
        <Newspaper className="text-sky-700 dark:text-sky-300" size={22} />
        <span>
          <span className="block font-bold text-slate-900 dark:text-slate-50">Pray News</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">소식 읽기</span>
        </span>
      </Link>

      <Link href="/settings" className={itemClass}>
        <Settings className="text-slate-700 dark:text-slate-200" size={22} />
        <span className="min-w-0">
          <span className="block font-bold text-slate-900 dark:text-slate-50">설정</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">계정과 앱 설정</span>
        </span>
      </Link>

      {role === "admin" ? (
        <Link href="/admin" className={itemClass}>
          <MessageSquareText className="text-indigo-700 dark:text-indigo-300" size={22} />
          <span>
            <span className="block font-bold text-slate-900 dark:text-slate-50">관리자 화면</span>
            <span className="text-sm text-slate-500 dark:text-slate-400">문의 / 피드백 · 사용자 관리</span>
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
