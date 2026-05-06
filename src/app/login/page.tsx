import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { LoginButtonGroup } from "@/components/LoginButtonGroup";

export default function LoginPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <section className="rounded-lg bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-black text-slate-950">로그인</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          SNS 로그인 후 처음 한 번 닉네임을 설정합니다.
        </p>
        <div className="mt-6">
          <LoginButtonGroup />
        </div>
      </section>
    </main>
  );
}
