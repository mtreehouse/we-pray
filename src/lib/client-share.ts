type SharePayload = {
  title: string;
  text: string;
  url: string;
  copyText?: string;
};

export async function shareOrCopy(payload: SharePayload) {
  const shareData = payload.copyText
    ? { text: payload.copyText }
    : { title: payload.title, text: payload.text, url: payload.url };

  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share(shareData);
    return "shared" as const;
  }

  const fallbackText = payload.copyText ?? [payload.title, payload.text, payload.url].filter(Boolean).join("\n");
  await navigator.clipboard.writeText(fallbackText);
  return "copied" as const;
}

export function absoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}
