-- CreateEnum
CREATE TYPE "BibleMemoryMastery" AS ENUM ('DIFFICULT', 'ALMOST', 'MEMORIZED');

-- CreateTable
CREATE TABLE "BibleMemorySetting" (
    "userId" TEXT NOT NULL,
    "translationCode" TEXT NOT NULL DEFAULT 'ko_krv',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BibleMemorySetting_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BibleMemoryCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookCode" TEXT NOT NULL,
    "bookName" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "startVerse" INTEGER NOT NULL,
    "endVerse" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BibleMemoryCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleMemoryProgress" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mastery" "BibleMemoryMastery" NOT NULL DEFAULT 'DIFFICULT',
    "progressPercent" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BibleMemoryProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BibleMemoryCard_userId_bookCode_chapter_startVerse_endVerse_key" ON "BibleMemoryCard"("userId", "bookCode", "chapter", "startVerse", "endVerse");

-- CreateIndex
CREATE INDEX "BibleMemoryCard_userId_createdAt_idx" ON "BibleMemoryCard"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "BibleMemoryCard_bookCode_chapter_startVerse_endVerse_idx" ON "BibleMemoryCard"("bookCode", "chapter", "startVerse", "endVerse");

-- CreateIndex
CREATE UNIQUE INDEX "BibleMemoryProgress_cardId_key" ON "BibleMemoryProgress"("cardId");

-- CreateIndex
CREATE INDEX "BibleMemoryProgress_userId_lastReviewedAt_idx" ON "BibleMemoryProgress"("userId", "lastReviewedAt");

-- AddForeignKey
ALTER TABLE "BibleMemorySetting" ADD CONSTRAINT "BibleMemorySetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleMemoryCard" ADD CONSTRAINT "BibleMemoryCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleMemoryProgress" ADD CONSTRAINT "BibleMemoryProgress_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "BibleMemoryCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleMemoryProgress" ADD CONSTRAINT "BibleMemoryProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
