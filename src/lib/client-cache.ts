import { LOGIN_NEXT_COOKIE_NAME } from "@/lib/redirect";

const WEP_PRAY_STORAGE_PREFIX = "wepray:";

export function clearWePrayClientCache() {
  if (typeof window === "undefined") return;

  clearStorage(window.localStorage);
  clearStorage(window.sessionStorage);
  clearCookie(LOGIN_NEXT_COOKIE_NAME);
}

function clearStorage(storage: Storage) {
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(WEP_PRAY_STORAGE_PREFIX)) keysToRemove.push(key);
    }

    keysToRemove.forEach((key) => storage.removeItem(key));
  } catch {
    // Storage can be unavailable in private browsing or restricted webviews.
  }
}

function clearCookie(name: string) {
  try {
    document.cookie = name + "=; Max-Age=0; Path=/; SameSite=Lax";
  } catch {
    // Cookie access can be unavailable in restricted webviews.
  }
}
