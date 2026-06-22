import { FeedbackStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    feedbackId: string;
  }>;
};

function isAllowedStatus(value: unknown): value is FeedbackStatus {
  return value === "NEW" || value === "CLOSED";
}

export async function PATCH(request: Request, { params }: Params) {
  await requireAdmin();
  const { feedbackId } = await params;
  const body = await request.json().catch(() => null) as { status?: unknown; adminMemo?: unknown } | null;
  const status = body && "status" in body ? body.status : undefined;
  const adminMemo = body && "adminMemo" in body ? body.adminMemo : undefined;

  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true }
  });

  if (!feedback) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const data: {
    status?: FeedbackStatus;
    adminMemo?: string | null;
    readAt?: Date | null;
    repliedAt?: Date | null;
    closedAt?: Date | null;
  } = {};

  if (status !== undefined) {
    if (!isAllowedStatus(status)) {
      return NextResponse.json({ error: "상태는 종료 또는 종료 취소만 변경할 수 있습니다." }, { status: 400 });
    }

    data.status = status;
    if (status === "CLOSED") {
      data.closedAt = new Date();
    } else {
      data.closedAt = null;
      data.readAt = null;
      data.repliedAt = null;
    }
  }

  if (adminMemo !== undefined) {
    if (typeof adminMemo !== "string") {
      return NextResponse.json({ error: "관리자 메모가 올바르지 않습니다." }, { status: 400 });
    }
    data.adminMemo = adminMemo.trim() || null;
  }

  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data,
    select: {
      id: true,
      status: true,
      adminMemo: true,
      closedAt: true,
      updatedAt: true
    }
  });

  return NextResponse.json({
    feedback: {
      ...updated,
      closedAt: updated.closedAt?.toISOString() ?? null,
      updatedAt: updated.updatedAt.toISOString()
    }
  });
}
