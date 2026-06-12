-- CreateEnum
CREATE TYPE "BibleScope" AS ENUM ('구약', '신약', '전체');

-- CreateEnum
CREATE TYPE "BiblePlanType" AS ENUM ('정주행', '연대기순', '병행');

-- CreateTable
CREATE TABLE "BibleVerse" (
    "id" TEXT NOT NULL,
    "bookNumber" INTEGER NOT NULL,
    "bookCode" TEXT NOT NULL,
    "bookName" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "content" JSONB NOT NULL,

    CONSTRAINT "BibleVerse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleRoom" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "scope" "BibleScope" NOT NULL,
    "durationMonths" INTEGER NOT NULL,
    "excludeSunday" BOOLEAN NOT NULL DEFAULT false,
    "planType" "BiblePlanType" NOT NULL DEFAULT '정주행',
    "creatorUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BibleRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleRoomMember" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "RoomMemberRole" NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kickedAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "BibleRoomMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiblePlan" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "readingDate" TIMESTAMP(3) NOT NULL,
    "bookCode" TEXT NOT NULL,
    "startChapter" INTEGER NOT NULL,
    "endChapter" INTEGER NOT NULL,

    CONSTRAINT "BiblePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleReflection" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookCode" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BibleReflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleProgress" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readingDate" TIMESTAMP(3) NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BibleProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BibleVerse_bookCode_chapter_verse_key" ON "BibleVerse"("bookCode", "chapter", "verse");

-- CreateIndex
CREATE INDEX "BibleVerse_bookCode_idx" ON "BibleVerse"("bookCode");

-- CreateIndex
CREATE INDEX "BibleVerse_bookNumber_chapter_verse_idx" ON "BibleVerse"("bookNumber", "chapter", "verse");

-- CreateIndex
CREATE INDEX "BibleRoom_creatorUserId_idx" ON "BibleRoom"("creatorUserId");

-- CreateIndex
CREATE INDEX "BibleRoom_deletedAt_idx" ON "BibleRoom"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BibleRoomMember_roomId_userId_key" ON "BibleRoomMember"("roomId", "userId");

-- CreateIndex
CREATE INDEX "BibleRoomMember_roomId_idx" ON "BibleRoomMember"("roomId");

-- CreateIndex
CREATE INDEX "BibleRoomMember_userId_idx" ON "BibleRoomMember"("userId");

-- CreateIndex
CREATE INDEX "BibleRoomMember_joinedAt_idx" ON "BibleRoomMember"("joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BiblePlan_roomId_readingDate_bookCode_startChapter_endChapter_key" ON "BiblePlan"("roomId", "readingDate", "bookCode", "startChapter", "endChapter");

-- CreateIndex
CREATE INDEX "BiblePlan_roomId_readingDate_idx" ON "BiblePlan"("roomId", "readingDate");

-- CreateIndex
CREATE INDEX "BiblePlan_bookCode_startChapter_endChapter_idx" ON "BiblePlan"("bookCode", "startChapter", "endChapter");

-- CreateIndex
CREATE INDEX "BibleReflection_roomId_createdAt_idx" ON "BibleReflection"("roomId", "createdAt");

-- CreateIndex
CREATE INDEX "BibleReflection_roomId_bookCode_chapter_verse_idx" ON "BibleReflection"("roomId", "bookCode", "chapter", "verse");

-- CreateIndex
CREATE INDEX "BibleReflection_userId_idx" ON "BibleReflection"("userId");

-- CreateIndex
CREATE INDEX "BibleReflection_deletedAt_idx" ON "BibleReflection"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BibleProgress_roomId_userId_readingDate_key" ON "BibleProgress"("roomId", "userId", "readingDate");

-- CreateIndex
CREATE INDEX "BibleProgress_roomId_readingDate_idx" ON "BibleProgress"("roomId", "readingDate");

-- CreateIndex
CREATE INDEX "BibleProgress_userId_idx" ON "BibleProgress"("userId");

-- AddForeignKey
ALTER TABLE "BibleRoom" ADD CONSTRAINT "BibleRoom_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleRoomMember" ADD CONSTRAINT "BibleRoomMember_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "BibleRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleRoomMember" ADD CONSTRAINT "BibleRoomMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiblePlan" ADD CONSTRAINT "BiblePlan_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "BibleRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleReflection" ADD CONSTRAINT "BibleReflection_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "BibleRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleReflection" ADD CONSTRAINT "BibleReflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleProgress" ADD CONSTRAINT "BibleProgress_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "BibleRoom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleProgress" ADD CONSTRAINT "BibleProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
