-- CreateEnum
CREATE TYPE "BibleReflectionReactionType" AS ENUM ('LIKE', 'HEART');

-- CreateTable
CREATE TABLE "BibleReflectionReaction" (
    "id" TEXT NOT NULL,
    "reflectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BibleReflectionReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BibleReflectionReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BibleReflectionReaction_reflectionId_userId_type_key" ON "BibleReflectionReaction"("reflectionId", "userId", "type");

-- CreateIndex
CREATE INDEX "BibleReflectionReaction_reflectionId_idx" ON "BibleReflectionReaction"("reflectionId");

-- CreateIndex
CREATE INDEX "BibleReflectionReaction_userId_idx" ON "BibleReflectionReaction"("userId");

-- CreateIndex
CREATE INDEX "BibleReflectionReaction_type_idx" ON "BibleReflectionReaction"("type");

-- AddForeignKey
ALTER TABLE "BibleReflectionReaction" ADD CONSTRAINT "BibleReflectionReaction_reflectionId_fkey" FOREIGN KEY ("reflectionId") REFERENCES "BibleReflection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleReflectionReaction" ADD CONSTRAINT "BibleReflectionReaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
