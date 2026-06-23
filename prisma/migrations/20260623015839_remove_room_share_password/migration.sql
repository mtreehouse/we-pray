/*
  Warnings:

  - You are about to drop the column `sharePassword` on the `BibleRoom` table. All the data in the column will be lost.
  - You are about to drop the column `sharePassword` on the `PrayerRoom` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BibleRoom" DROP COLUMN "sharePassword";

-- AlterTable
ALTER TABLE "PrayerRoom" DROP COLUMN "sharePassword";
