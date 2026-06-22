export type BibleTranslationCode = "ko_krv" | "ko_nkrv";

export type BibleTranslationSettingView = {
  code: BibleTranslationCode;
  label: string;
  isVisible: boolean;
  requiresCopyright: boolean;
  sortOrder: number;
};

export const defaultBibleTranslationSettings: BibleTranslationSettingView[] = [
  { code: "ko_krv", label: "개역한글", isVisible: true, requiresCopyright: false, sortOrder: 10 },
  { code: "ko_nkrv", label: "개역개정", isVisible: true, requiresCopyright: true, sortOrder: 20 }
];

export const defaultBibleTranslationCode: BibleTranslationCode = "ko_krv";

export function isBibleTranslationCode(value: unknown): value is BibleTranslationCode {
  return value === "ko_krv" || value === "ko_nkrv";
}

export function normalizeBibleTranslationSettings(rows: Array<{
  code: string;
  label: string;
  isVisible: boolean;
  requiresCopyright: boolean;
  sortOrder: number;
}>): BibleTranslationSettingView[] {
  const byCode = new Map(rows.map((row) => [row.code, row]));

  return defaultBibleTranslationSettings.map((fallback) => {
    const row = byCode.get(fallback.code);
    if (!row || !isBibleTranslationCode(row.code)) return fallback;

    return {
      code: row.code,
      label: row.label || fallback.label,
      isVisible: row.isVisible,
      requiresCopyright: row.requiresCopyright,
      sortOrder: row.sortOrder
    };
  }).sort((a, b) => a.sortOrder - b.sortOrder);
}
