type FeedbackNotificationInput = {
  feedbackId: string;
  title: string;
  content: string;
  nickname: string | null;
  replyEmail: string | null;
  createdAt: Date;
};

type FeedbackMailResult = {
  ok: boolean;
  emailTo: string;
  messageId?: string;
  error?: string;
};

const DEFAULT_FEEDBACK_EMAIL_TO = "wepray.support@gmail.com";
const DEFAULT_RESEND_FROM_EMAIL = "WePray <noreply@imbyel.cloud>";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? value.slice(0, maxLength - 1) + "..." : value;
}

export async function sendFeedbackNotification(input: FeedbackNotificationInput): Promise<FeedbackMailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const emailTo = process.env.FEEDBACK_EMAIL_TO || DEFAULT_FEEDBACK_EMAIL_TO;
  const from = process.env.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM_EMAIL;

  if (!apiKey) {
    return { ok: false, emailTo, error: "RESEND_API_KEY is not configured." };
  }

  const adminUrlBase = process.env.NEXTAUTH_URL || process.env.APP_URL || "";
  const adminUrl = adminUrlBase ? adminUrlBase.replace(/\/$/, "") + "/admin/feedbacks" : "/admin/feedbacks";
  const createdAt = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(input.createdAt);
  const subject = "[WePray 문의] " + truncate(input.title, 80);
  const replyEmail = input.replyEmail || "미입력";
  const nickname = input.nickname || "닉네임 없음";
  const text = [
    "새 문의가 접수되었습니다.",
    "",
    "문의 ID: " + input.feedbackId,
    "작성자: " + nickname,
    "회신 이메일: " + replyEmail,
    "작성 시각: " + createdAt,
    "제목: " + input.title,
    "",
    input.content,
    "",
    "관리자 화면: " + adminUrl
  ].join("\n");
  const html = [
    '<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033">',
    '<h2 style="margin:0 0 12px">새 문의가 접수되었습니다.</h2>',
    '<p><strong>문의 ID</strong><br>' + escapeHtml(input.feedbackId) + '</p>',
    '<p><strong>작성자</strong><br>' + escapeHtml(nickname) + '</p>',
    '<p><strong>회신 이메일</strong><br>' + escapeHtml(replyEmail) + '</p>',
    '<p><strong>작성 시각</strong><br>' + escapeHtml(createdAt) + '</p>',
    '<p><strong>제목</strong><br>' + escapeHtml(input.title) + '</p>',
    '<p><strong>내용</strong></p>',
    '<div style="white-space:pre-wrap;border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#f8fafc">' + escapeHtml(input.content) + '</div>',
    '<p style="margin-top:16px"><a href="' + escapeHtml(adminUrl) + '">관리자 화면에서 확인하기</a></p>',
    '</div>'
  ].join("");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: emailTo, subject, text, html })
    });

    const responseText = await response.text();
    if (!response.ok) {
      return { ok: false, emailTo, error: truncate(responseText || "Resend request failed with " + response.status, 1000) };
    }

    const data = responseText ? JSON.parse(responseText) as { id?: string } : {};
    return { ok: true, emailTo, messageId: data.id };
  } catch (error) {
    return { ok: false, emailTo, error: truncate(error instanceof Error ? error.message : "Unknown email error", 1000) };
  }
}
