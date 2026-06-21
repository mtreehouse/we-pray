import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { WithdrawLink } from "@/components/WithdrawLink";

const sections = [
  {
    title: "로그인",
    content: "Google, Kakao, Naver 중 하나로 로그인합니다. 첫 로그인 후 닉네임을 설정해야 Pray Room을 사용할 수 있습니다."
  },
  {
    title: "닉네임 설정",
    content: "닉네임은 필수이며 중복과 공백을 허용하지 않습니다. 2~16글자 범위로 입력합니다."
  },
  {
    title: "Pray Room",
    content: "입장한 방 목록에서 방을 열거나, + 버튼으로 새 방을 만들고, 🔍 버튼으로 방 제목 또는 방장 닉네임을 검색합니다."
  },
  {
    title: "방 생성",
    content: "방 제목, 설명, 입장 비밀번호를 입력합니다. 방장은 자동 입장되며 왕관으로 표시됩니다."
  },
  {
    title: "방 찾기 및 입장",
    content: "검색 결과에서 방을 선택하고 비밀번호를 입력합니다. 이미 입장한 방이면 바로 이동합니다."
  },
  {
    title: "기도제목",
    content: "방 상세 하단의 ✏️ 버튼으로 작성합니다. 작성자 본인의 글만 수정하거나 삭제할 수 있습니다."
  },
  {
    title: "방 설정",
    content: "상단 설정 버튼에서 방 정보, 멤버 목록, 멤버 history, 방 나가기, 방 관리를 사용할 수 있습니다."
  },
  {
    title: "Pray News",
    content: "로그인 여부와 관계없이 읽을 수 있습니다. 작성, 수정, 삭제 기능은 관리자 확장 기능으로 준비합니다."
  },
  {
    title: "관리자",
    content: "관리자만 사용자 관리에 접근할 수 있습니다. 사용자는 soft delete 방식으로 삭제되며, 관리자는 자기 자신을 삭제할 수 없습니다."
  }
];

export default function UsagePage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
        <ChevronLeft size={18} />
        홈으로
      </Link>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">사용법</h1>
        <p className="mt-2 text-sm text-slate-600">메뉴별 주요 사용 흐름입니다.</p>
      </header>
      <section className="grid gap-3">
        {sections.map((section) => (
          <article key={section.title} className="rounded-lg bg-white p-4 shadow-soft">
            <h2 className="font-black text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{section.content}</p>
          </article>
        ))}
      </section>
      <div className="mt-8 flex justify-center">
        <WithdrawLink />
      </div>
    </main>
  );
}
