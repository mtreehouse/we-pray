import { NextResponse } from "next/server";
import { defaultBibleTranslationCode, isBibleTranslationCode } from "@/lib/bible-translations";
import { getCurrentUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getBibleTranslationOptions, resolveVerseMemoryTranslation } from "@/lib/verse-room-data";
import { verseText } from "@/lib/verse-room";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const url = new URL(request.url);
  const bookCode = url.searchParams.get("bookCode") ?? "";
  const chapter = Number(url.searchParams.get("chapter"));
  const requestedTranslation = url.searchParams.get("translation");

  if (!bookCode || !Number.isInteger(chapter) || chapter < 1) {
    return NextResponse.json({ error: "성경 권과 장을 선택해주세요." }, { status: 400 });
  }

  const translations = await getBibleTranslationOptions();
  const translationCode = resolveVerseMemoryTranslation({
    translations,
    preferred: isBibleTranslationCode(requestedTranslation) ? requestedTranslation : defaultBibleTranslationCode,
    copyrightAllowed: Boolean(user?.bibleCopyrightAllowed)
  });

  const verses = await prisma.bibleVerse.findMany({
    where: { bookCode, chapter },
    select: {
      bookNumber: true,
      bookCode: true,
      bookName: true,
      chapter: true,
      verse: true,
      content: true
    },
    orderBy: { verse: "asc" }
  });

  if (verses.length === 0) {
    return NextResponse.json({ error: "본문을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    book: {
      bookNumber: verses[0].bookNumber,
      bookCode: verses[0].bookCode,
      bookName: verses[0].bookName,
      chapter: verses[0].chapter
    },
    translationCode,
    verses: verses.map((verse) => ({
      bookNumber: verse.bookNumber,
      bookCode: verse.bookCode,
      bookName: verse.bookName,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verseText(verse.content, translationCode)
    }))
  });
}
