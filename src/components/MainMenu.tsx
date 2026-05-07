import Link from "next/link";
import { HeartHandshake, LogIn, Newspaper, Shield, Sparkles } from "lucide-react";
import type { UserRole } from "@prisma/client";

type MainMenuProps = {
  isLoggedIn: boolean;
  role?: UserRole;
};

export function MainMenu({ isLoggedIn, role }: MainMenuProps) {
  const itemClass =
    "flex min-h-20 items-center gap-3 rounded-lg border border-white/80 bg-white/90 p-4 text-left shadow-soft transition active:scale-[0.99]";

  return (
    <nav className="grid gap-3">
      {!isLoggedIn ? (
        <Link href="/login" className={itemClass}>
          <LogIn className="text-teal-700" size={22} />
          <span>
            <span className="block font-bold text-slate-900">로그인</span>
            <span className="text-sm text-slate-500">Google, Kakao, Naver</span>
          </span>
        </Link>
      ) : null}

      {isLoggedIn ? (
        <Link href="/pray-room" className={itemClass}>
          <HeartHandshake className="text-emerald-700" size={22} />
          <span>
            <span className="block font-bold text-slate-900">Pray Room</span>
            <span className="text-sm text-slate-500">함께 기도제목 나누기</span>
          </span>
        </Link>
      ) : (
        <div className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white/60 p-4 text-left text-slate-400 shadow-soft">
          <HeartHandshake size={22} />
          <span>
            <span className="block font-bold">Pray Room</span>
            <span className="text-sm">로그인 후 이용 가능</span>
          </span>
        </div>
      )}

      <Link href="/pray-news" className={itemClass}>
        <Newspaper className="text-sky-700" size={22} />
        <span>
          <span className="block font-bold text-slate-900">Pray News</span>
          <span className="text-sm text-slate-500">소식 읽기</span>
        </span>
      </Link>

      <Link href="/usage" className={itemClass}>
        <Sparkles className="text-rose-700" size={22} />
        <span>
          <span className="block font-bold text-slate-900">사용법</span>
          <span className="text-sm text-slate-500">메뉴별 안내</span>
        </span>
      </Link>

      {role === "admin" ? (
        <Link href="/admin/users" className={itemClass}>
          <Shield className="text-indigo-700" size={22} />
          <span>
            <span className="block font-bold text-slate-900">관리자 화면</span>
            <span className="text-sm text-slate-500">사용자 관리</span>
          </span>
        </Link>
      ) : null}
    </nav>
  );
}
