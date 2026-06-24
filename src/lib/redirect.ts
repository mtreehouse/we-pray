export const LOGIN_NEXT_COOKIE_NAME = "wepray_login_next_path";
export const LOGIN_NEXT_STORAGE_KEY = "wepray:login-next-path";

export function safeNextPath(value: unknown, fallback = "/") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function isRoomNextPath(path: string) {
  return (
    path.startsWith("/join/pray-room/") ||
    path.startsWith("/join/bible-room/") ||
    path.startsWith("/pray-room/") ||
    path.startsWith("/bible-room/")
  );
}
