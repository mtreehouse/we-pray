-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bibleCopyrightAllowed" BOOLEAN NOT NULL DEFAULT false;

-- RenameIndex
ALTER INDEX "BiblePlan_roomId_readingDate_bookCode_startChapter_endChapter_k" RENAME TO "BiblePlan_roomId_readingDate_bookCode_startChapter_endChapt_key";
