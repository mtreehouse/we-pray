import { BiblePlanType, BibleScope } from "@prisma/client";

const MCHEYNE_PLAN_TYPE = "MCHEYNE" as BiblePlanType;

export function normalizeBibleScope(value: unknown) {
  if (value === BibleScope.OLD_TESTAMENT || value === "구약") return BibleScope.OLD_TESTAMENT;
  if (value === BibleScope.NEW_TESTAMENT || value === "신약") return BibleScope.NEW_TESTAMENT;
  if (value === BibleScope.ALL || value === "전체") return BibleScope.ALL;
  return null;
}

export function normalizeBiblePlanType(value: unknown) {
  if (value === BiblePlanType.SEQUENTIAL || value === "정주행") return BiblePlanType.SEQUENTIAL;
  if (value === BiblePlanType.CHRONOLOGICAL || value === "연대기순") return BiblePlanType.CHRONOLOGICAL;
  if (value === BiblePlanType.PARALLEL || value === "병행") return BiblePlanType.PARALLEL;
  if (value === MCHEYNE_PLAN_TYPE || value === "MCHEYNE" || value === "맥체인" || value === "M\'Cheyne" || value === "M’Cheyne") {
    return MCHEYNE_PLAN_TYPE;
  }
  return null;
}

export function numericBodyValue(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return NaN;
}
