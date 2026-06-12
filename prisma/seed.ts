import { Prisma, PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

type BibleJsonVerse = {
  book_number: number;
  book_code: string;
  book_name: string;
  chapter: number;
  verse: number | string;
  translations: Prisma.InputJsonObject;
};

const prisma = new PrismaClient();
const BATCH_SIZE = 1_000;

function resolveBibleJsonPath() {
  const candidates = [
    process.env.BIBLE_JSON_PATH,
    path.join(process.cwd(), "prisma", "bible.json"),
    path.join(process.cwd(), "bible.json"),
    path.join(process.cwd(), "..", "bible.json")
  ].filter((candidate): candidate is string => Boolean(candidate));

  const bibleJsonPath = candidates.find((candidate) => fs.existsSync(candidate));

  if (!bibleJsonPath) {
    throw new Error(
      `bible.json 파일을 찾을 수 없습니다. 확인한 경로: ${candidates.join(", ")}`
    );
  }

  return bibleJsonPath;
}

function readBibleJson(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("bible.json 최상위 구조는 배열이어야 합니다.");
  }

  return parsed as BibleJsonVerse[];
}

function sanitizeJson(value: Prisma.InputJsonValue): Prisma.InputJsonValue {
  if (typeof value === "string") return value.replace(/\u0000/g, "");
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, sanitizeJson(item as Prisma.InputJsonValue)])
    );
  }

  return value;
}

function normalizeVerseNumber(value: number | string) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return { verseNumber: value, verseLabel: String(value) };
  }

  if (typeof value === "string") {
    const match = value.trim().match(/^(\d+)(?:\s*-\s*\d+)?$/);
    if (match) return { verseNumber: Number(match[1]), verseLabel: value.trim() };
  }

  return null;
}

function toBibleVerseCreateInput(verse: BibleJsonVerse) {
  const normalizedVerse = normalizeVerseNumber(verse.verse);

  if (
    typeof verse.book_number !== "number" ||
    typeof verse.book_code !== "string" ||
    typeof verse.book_name !== "string" ||
    typeof verse.chapter !== "number" ||
    !normalizedVerse ||
    !verse.translations ||
    typeof verse.translations !== "object" ||
    Array.isArray(verse.translations)
  ) {
    throw new Error(`잘못된 bible.json verse 데이터: ${JSON.stringify(verse)}`);
  }

  return {
    bookNumber: verse.book_number,
    bookCode: verse.book_code,
    bookName: verse.book_name,
    chapter: verse.chapter,
    verse: normalizedVerse.verseNumber,
    content: sanitizeJson({
      ...verse.translations,
      ...(normalizedVerse.verseLabel !== String(normalizedVerse.verseNumber)
        ? { verse_label: normalizedVerse.verseLabel }
        : {})
    })
  };
}

async function main() {
  const bibleJsonPath = resolveBibleJsonPath();
  const verses = readBibleJson(bibleJsonPath).map(toBibleVerseCreateInput);
  let inserted = 0;

  for (let index = 0; index < verses.length; index += BATCH_SIZE) {
    const batch = verses.slice(index, index + BATCH_SIZE);
    const result = await prisma.bibleVerse.createMany({
      data: batch,
      skipDuplicates: true
    });

    inserted += result.count;
  }

  console.log(
    `Bible seed 완료: ${inserted}개 신규 절 입력, ${verses.length - inserted}개 중복 건너뜀`
  );
}

main()
  .catch((error) => {
    console.error("Bible seed 실패", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
