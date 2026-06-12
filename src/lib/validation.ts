const BLOCKED_NICKNAME_WORDS = ["admin", "관리자", "운영자"];

export function validateNickname(nickname: string) {
  const value = nickname.trim();

  if (!value) return "닉네임을 입력해주세요.";
  if (/\s/.test(value)) return "닉네임에는 공백을 사용할 수 없습니다.";
  if (value.length < 2) return "닉네임은 최소 2글자 이상이어야 합니다.";
  if (value.length > 16) return "닉네임은 최대 16글자까지 가능합니다.";
  if (BLOCKED_NICKNAME_WORDS.some((word) => value.toLowerCase().includes(word))) {
    return "사용할 수 없는 단어가 포함되어 있습니다.";
  }

  return null;
}

export function validateRoomInput(input: {
  title?: string;
  description?: string;
  password?: string;
}) {
  if (!input.title?.trim()) return "방 제목을 입력해주세요.";
  if (input.title.trim().length > 40) return "방 제목은 최대 40글자까지 가능합니다.";
  if (!input.description?.trim()) return "방 설명을 입력해주세요.";
  if (input.description.trim().length > 300) return "방 설명은 최대 300글자까지 가능합니다.";
  if (!input.password?.trim()) return "입장 비밀번호를 입력해주세요.";
  if (input.password.length < 4) return "비밀번호는 최소 4글자 이상이어야 합니다.";
  if (input.password.length > 40) return "비밀번호는 최대 40글자까지 가능합니다.";

  return null;
}

export function validatePrayerPost(content: string) {
  const value = content.trim();

  if (!value) return "기도제목 내용을 입력해주세요.";
  if (value.length > 1000) return "기도제목은 최대 1000글자까지 가능합니다.";

  return null;
}


export function validateBibleRoomInput(input: {
  title?: string;
  description?: string;
  password?: string;
  scope?: string;
  durationMonths?: number;
  planType?: string;
}) {
  if (!input.title?.trim()) return "방 제목을 입력해주세요.";
  if (input.title.trim().length > 40) return "방 제목은 최대 40글자까지 가능합니다.";
  if (!input.description?.trim()) return "방 설명을 입력해주세요.";
  if (input.description.trim().length > 300) return "방 설명은 최대 300글자까지 가능합니다.";
  if (!input.password?.trim()) return "입장 비밀번호를 입력해주세요.";
  if (input.password.length < 4) return "비밀번호는 최소 4글자 이상이어야 합니다.";
  if (input.password.length > 40) return "비밀번호는 최대 40글자까지 가능합니다.";
  if (!input.scope) return "통독 범위를 선택해주세요.";
  if (!input.planType) return "통독 방식을 선택해주세요.";
  if (!Number.isInteger(input.durationMonths)) return "통독 기간을 선택해주세요.";
  if ((input.durationMonths ?? 0) < 1) return "통독 기간은 최소 1개월 이상이어야 합니다.";
  if ((input.durationMonths ?? 0) > 36) return "통독 기간은 최대 36개월까지 가능합니다.";

  return null;
}

export function validateBibleReflection(content: string) {
  const value = content.trim();

  if (!value) return "묵상 내용을 입력해주세요.";
  if (value.length > 2000) return "묵상은 최대 2000글자까지 가능합니다.";

  return null;
}
