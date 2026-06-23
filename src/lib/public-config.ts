type PublicConfig = {
  kakaoJavascriptKey: string;
};

let cachedConfig: PublicConfig | null = null;

export async function getPublicConfig() {
  if (cachedConfig) return cachedConfig;

  const res = await fetch('/api/public-config', { cache: 'no-store' });
  if (!res.ok) {
    cachedConfig = { kakaoJavascriptKey: '' };
    return cachedConfig;
  }

  cachedConfig = (await res.json()) as PublicConfig;
  return cachedConfig;
}

export async function getKakaoJavascriptKey() {
  const config = await getPublicConfig();
  return config.kakaoJavascriptKey;
}
