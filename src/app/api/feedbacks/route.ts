import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { sendFeedbackNotification } from "@/lib/feedback-mail";

const TITLE_MAX_LENGTH = 80;
const CONTENT_MAX_LENGTH = 2000;
const EMAIL_MAX_LENGTH = 120;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인 후 문의를 작성할 수 있습니다." }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { title?: unknown; content?: unknown; replyEmail?: unknown } | null;
    const title = textValue(body?.title);
    const content = textValue(body?.content);
    const replyEmail = textValue(body?.replyEmail);

    if (!title) {
      return NextResponse.json({ error: "문의 제목을 입력해주세요." }, { status: 400 });
    }

    if (title.length > TITLE_MAX_LENGTH) {
      return NextResponse.json({ error: "문의 제목은 80자 이하로 입력해주세요." }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: "문의 내용을 입력해주세요." }, { status: 400 });
    }

    if (content.length > CONTENT_MAX_LENGTH) {
      return NextResponse.json({ error: "문의 내용은 2000자 이하로 입력해주세요." }, { status: 400 });
    }

    if (replyEmail && (replyEmail.length > EMAIL_MAX_LENGTH || !isValidEmail(replyEmail))) {
      return NextResponse.json({ error: "회신 이메일 형식을 확인해주세요." }, { status: 400 });
    }

    const emailTo = process.env.FEEDBACK_EMAIL_TO || "wepray.support@gmail.com";
    const createdAt = new Date();
    const feedback = await prisma.feedback.create({
      data: {
        userId: user.id,
        title,
        content,
        replyEmail: replyEmail || null,
        emailTo
      }
    });

    const mailResult = await sendFeedbackNotification({
      feedbackId: feedback.id,
      title,
      content,
      nickname: user.nickname,
      replyEmail: replyEmail || null,
      createdAt
    });

    await prisma.feedback.update({
      where: { id: feedback.id },
      data: mailResult.ok
        ? {
            emailTo: mailResult.emailTo,
            emailSentAt: new Date(),
            emailMessageId: mailResult.messageId ?? null,
            emailError: null
          }
        : {
            emailTo: mailResult.emailTo,
            emailError: mailResult.error ?? "메일 발송에 실패했습니다."
          }
    }).catch((error) => {
      console.error("[feedbacks] failed to update mail result", error);
    });

    if (!mailResult.ok) {
      console.error("[feedbacks] mail send failed", mailResult.error);
    }

    return NextResponse.json({ ok: true, feedbackId: feedback.id, mailSent: mailResult.ok });
  } catch (error) {
    console.error("[feedbacks] unexpected error", error);
    return NextResponse.json({ error: "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
