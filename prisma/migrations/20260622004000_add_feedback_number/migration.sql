-- CreateSequence
CREATE SEQUENCE IF NOT EXISTS "Feedback_feedbackNumber_seq";

-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "feedbackNumber" INTEGER;

-- Backfill existing feedbacks in creation order.
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, "id" ASC)::integer AS rn
  FROM "Feedback"
)
UPDATE "Feedback"
SET "feedbackNumber" = numbered.rn
FROM numbered
WHERE "Feedback"."id" = numbered."id";

-- Sync sequence with the backfilled max value.
SELECT setval(
  '"Feedback_feedbackNumber_seq"',
  GREATEST((SELECT COALESCE(MAX("feedbackNumber"), 0) FROM "Feedback"), 1),
  (SELECT COUNT(*) > 0 FROM "Feedback")
);

-- SetDefault
ALTER TABLE "Feedback" ALTER COLUMN "feedbackNumber" SET DEFAULT nextval('"Feedback_feedbackNumber_seq"');

-- SetNotNull
ALTER TABLE "Feedback" ALTER COLUMN "feedbackNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_feedbackNumber_key" ON "Feedback"("feedbackNumber");
