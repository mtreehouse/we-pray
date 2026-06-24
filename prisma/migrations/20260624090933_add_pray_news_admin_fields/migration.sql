-- AlterTable
ALTER TABLE "PrayNews" ADD COLUMN     "authorUserId" TEXT,
ADD COLUMN     "imageUrl" TEXT;

-- CreateIndex
CREATE INDEX "PrayNews_authorUserId_idx" ON "PrayNews"("authorUserId");

-- AddForeignKey
ALTER TABLE "PrayNews" ADD CONSTRAINT "PrayNews_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
