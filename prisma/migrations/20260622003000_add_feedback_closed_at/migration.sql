-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "closedAt" TIMESTAMP(3);

-- Backfill existing closed feedbacks so old rows still have a close timestamp.
UPDATE "Feedback"
SET "closedAt" = COALESCE("repliedAt", "readAt", "updatedAt")
WHERE "status" = 'CLOSED' AND "closedAt" IS NULL;

-- CreateIndex
CREATE INDEX "Feedback_status_closedAt_idx" ON "Feedback"("status", "closedAt");
