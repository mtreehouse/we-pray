import { NextResponse } from "next/server";
import { isBibleTranslationCode } from "@/lib/bible-translations";
import { getCurrentUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getBibleTranslationOptions, getUserVerseMemoryTranslation, translationLabel } from "@/lib/verse-room-data";

function unauthorized() {
  return NextResponse.json({ error: "로그인 후 성경 암송 설정을 저장할 수 있습니다." }, { status: 401 });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.nickname) return unauthorized();

  const translations = await getBibleTranslationOptions();
  const translationCode = await getUserVerseMemoryTranslation(user.id, translations, user.bibleCopyrightAllowed);

  return NextResponse.json({
    translationCode,
    translationLabel: translationLabel(translations, translationCode),
    translations
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user?.nickname) return unauthorized();

  const body = await request.json().catch(() => ({})) as { translationCode?: unknown };
  if (!isBibleTranslationCode(body.translationCode)) {
    return NextResponse.json({ error: "번역본을 선택해주세요." }, { status: 400 });
  }

  const translations = await getBibleTranslationOptions();
  const setting = translations.find((item) => item.code === body.translationCode);
  if (!setting?.isVisible) {
    return NextResponse.json({ error: "현재 노출되지 않는 번역본입니다." }, { status: 400 });
  }

  if (setting.requiresCopyright && !user.bibleCopyrightAllowed) {
    return NextResponse.json({ error: setting.label + "은 저작권 허용 후 선택할 수 있습니다." }, { status: 403 });
  }

  await prisma.bibleMemorySetting.upsert({
    where: { userId: user.id },
    update: { translationCode: body.translationCode },
    create: { userId: user.id, translationCode: body.translationCode }
  });

  return NextResponse.json({
    translationCode: body.translationCode,
    translationLabel: setting.label
  });
}
