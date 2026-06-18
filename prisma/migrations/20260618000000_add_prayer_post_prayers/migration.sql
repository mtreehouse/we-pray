-- CreateTable
CREATE TABLE "PrayerPostPrayer" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrayerPostPrayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrayerPostPrayer_postId_userId_key" ON "PrayerPostPrayer"("postId", "userId");

-- CreateIndex
CREATE INDEX "PrayerPostPrayer_postId_idx" ON "PrayerPostPrayer"("postId");

-- CreateIndex
CREATE INDEX "PrayerPostPrayer_userId_idx" ON "PrayerPostPrayer"("userId");

-- AddForeignKey
ALTER TABLE "PrayerPostPrayer" ADD CONSTRAINT "PrayerPostPrayer_postId_fkey" FOREIGN KEY ("postId") REFERENCES "PrayerPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrayerPostPrayer" ADD CONSTRAINT "PrayerPostPrayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
