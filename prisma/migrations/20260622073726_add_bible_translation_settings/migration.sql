-- CreateTable
CREATE TABLE "BibleTranslationSetting" (
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "requiresCopyright" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BibleTranslationSetting_pkey" PRIMARY KEY ("code")
);


INSERT INTO "BibleTranslationSetting" ("code", "label", "isVisible", "requiresCopyright", "sortOrder", "updatedAt") VALUES
  ('ko_krv', '개역한글', true, false, 10, CURRENT_TIMESTAMP),
  ('ko_nkrv', '개역개정', true, true, 20, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
