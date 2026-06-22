import { NextResponse } from "next/server";
import { isBibleTranslationCode, normalizeBibleTranslationSettings } from "@/lib/bible-translations";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ code: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  await requireAdmin();
  const { code } = await params;

  if (!isBibleTranslationCode(code)) {
    return NextResponse.json({ error: "지원하지 않는 번역본입니다." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as { isVisible?: unknown; requiresCopyright?: unknown };
  const data: { isVisible?: boolean; requiresCopyright?: boolean } = {};

  if (body.isVisible !== undefined) {
    if (typeof body.isVisible !== "boolean") {
      return NextResponse.json({ error: "노출 여부 값이 올바르지 않습니다." }, { status: 400 });
    }
    data.isVisible = body.isVisible;
  }

  if (body.requiresCopyright !== undefined) {
    if (typeof body.requiresCopyright !== "boolean") {
      return NextResponse.json({ error: "저작권 여부 값이 올바르지 않습니다." }, { status: 400 });
    }
    data.requiresCopyright = body.requiresCopyright;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "변경할 설정이 없습니다." }, { status: 400 });
  }

  const fallback = normalizeBibleTranslationSettings([]).find((item) => item.code === code);
  if (!fallback) {
    return NextResponse.json({ error: "지원하지 않는 번역본입니다." }, { status: 404 });
  }

  const updated = await prisma.bibleTranslationSetting.upsert({
    where: { code },
    create: {
      code,
      label: fallback.label,
      isVisible: data.isVisible ?? fallback.isVisible,
      requiresCopyright: data.requiresCopyright ?? fallback.requiresCopyright,
      sortOrder: fallback.sortOrder
    },
    update: data,
    select: {
      code: true,
      label: true,
      isVisible: true,
      requiresCopyright: true,
      sortOrder: true
    }
  });

  return NextResponse.json({
    translation: normalizeBibleTranslationSettings([updated]).find((item) => item.code === code)
  });
}
