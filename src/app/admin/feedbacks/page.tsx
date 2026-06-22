import Link from "next/link";
import { ChevronLeft, Users } from "lucide-react";
import { AdminFeedbackList } from "@/components/AdminFeedbackList";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AdminFeedbacksPage() {
  await requireAdmin();
  const rows = await prisma.feedback.findMany({
    where: { status: { not: "CLOSED" } },
    select: {
      id: true,
      feedbackNumber: true,
      title: true,
      content: true,
      replyEmail: true,
      status: true,
      adminMemo: true,
      emailTo: true,
      emailSentAt: true,
      emailError: true,
      createdAt: true,
      closedAt: true,
      user: { select: { nickname: true, provider: true } }
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 51
  });
  const feedbacks = rows.slice(0, 50);
  const nextCursor = rows.length > 50 ? feedbacks[feedbacks.length - 1]?.id ?? null : null;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link href="/admin" className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
          <ChevronLeft size={18} />
          관리자 메뉴
        </Link>
        <Link href="/admin/users" className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-soft">
          <Users size={15} />
          사용자 관리
        </Link>
      </div>
      <header className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">문의 / 피드백</h1>
        <p className="mt-2 text-sm text-slate-600">최근 접수된 문의를 확인하고 처리 상태를 관리합니다.</p>
      </header>
      <AdminFeedbackList
        feedbacks={feedbacks.map((feedback) => ({
          id: feedback.id,
          feedbackNumber: feedback.feedbackNumber,
          title: feedback.title,
          content: feedback.content,
          replyEmail: feedback.replyEmail,
          status: feedback.status,
          adminMemo: feedback.adminMemo,
          emailTo: feedback.emailTo,
          emailSentAt: feedback.emailSentAt?.toISOString() ?? null,
          emailError: feedback.emailError,
          createdAt: feedback.createdAt.toISOString(),
          closedAt: feedback.closedAt?.toISOString() ?? null,
          userNickname: feedback.user.nickname,
          userProvider: feedback.user.provider
        }))}
        initialNextCursor={nextCursor}
      />
    </main>
  );
}
