import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(scriptDir, "..");
const repoDir = path.resolve(appDir, "..");
const sourcePath = path.join(repoDir, ".env");
const targetPath = path.join(appDir, ".env");
const targetExamplePath = path.join(appDir, ".env.example");
const sourceExamplePath = path.join(repoDir, ".env.example");

const sharedKeys = [
  "DATABASE_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "ADMIN_OAUTH_IDS",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "KAKAO_CLIENT_ID",
  "KAKAO_CLIENT_SECRET",
  "KAKAO_JAVASCRIPT_KEY",
  "NAVER_CLIENT_ID",
  "NAVER_CLIENT_SECRET",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "FEEDBACK_EMAIL_TO"
];

function parseEnv(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2] ?? "";
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    result[match[1]] = value;
  }
  return result;
}

function quote(value) {

  return JSON.stringify(value ?? "");
}

function loadFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function localDatabaseUrl(source, fallback) {
  const base = source.DATABASE_URL || fallback.DATABASE_URL || "postgresql://wp:wp_password@localhost:55432/wp?schema=public";
  try {
    const url = new URL(base);
    if (url.hostname === "db" || url.hostname === "postgres" || url.hostname === "wepray-db") {
      url.hostname = "localhost";
      url.port = source.POSTGRES_HOST_PORT || fallback.POSTGRES_HOST_PORT || "55432";
    }
    return url.toString();
  } catch {
    return base;
  }
}

const sourceEnv = parseEnv(loadFile(sourcePath));
const currentTarget = parseEnv(loadFile(targetPath));
const sourceExample = parseEnv(loadFile(sourceExamplePath));
const targetExample = parseEnv(loadFile(targetExamplePath));

const values = {
  DATABASE_URL: localDatabaseUrl(sourceEnv, currentTarget),
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: sourceEnv.NEXTAUTH_SECRET || currentTarget.NEXTAUTH_SECRET || sourceExample.NEXTAUTH_SECRET || targetExample.NEXTAUTH_SECRET || "",
  ADMIN_OAUTH_IDS: sourceEnv.ADMIN_OAUTH_IDS || currentTarget.ADMIN_OAUTH_IDS || sourceExample.ADMIN_OAUTH_IDS || targetExample.ADMIN_OAUTH_IDS || "",
  GOOGLE_CLIENT_ID: sourceEnv.GOOGLE_CLIENT_ID || currentTarget.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: sourceEnv.GOOGLE_CLIENT_SECRET || currentTarget.GOOGLE_CLIENT_SECRET || "",
  KAKAO_CLIENT_ID: sourceEnv.KAKAO_CLIENT_ID || currentTarget.KAKAO_CLIENT_ID || "",
  KAKAO_CLIENT_SECRET: sourceEnv.KAKAO_CLIENT_SECRET || currentTarget.KAKAO_CLIENT_SECRET || "",
  KAKAO_JAVASCRIPT_KEY: sourceEnv.KAKAO_JAVASCRIPT_KEY || currentTarget.KAKAO_JAVASCRIPT_KEY || "",
  NAVER_CLIENT_ID: sourceEnv.NAVER_CLIENT_ID || currentTarget.NAVER_CLIENT_ID || "",
  NAVER_CLIENT_SECRET: sourceEnv.NAVER_CLIENT_SECRET || currentTarget.NAVER_CLIENT_SECRET || "",
  RESEND_API_KEY: sourceEnv.RESEND_API_KEY || currentTarget.RESEND_API_KEY || "",
  RESEND_FROM_EMAIL: sourceEnv.RESEND_FROM_EMAIL || currentTarget.RESEND_FROM_EMAIL || "",
  FEEDBACK_EMAIL_TO: sourceEnv.FEEDBACK_EMAIL_TO || currentTarget.FEEDBACK_EMAIL_TO || ""
};

const linesOut = [
  "# Auto-generated from /opt/we-pray/.env for local development.",
  "# Edit /opt/we-pray/.env and rerun npm scripts to refresh this file.",
  ""
];

for (const key of sharedKeys) {
  linesOut.push(key + "=" + quote(values[key]));
}

const nextText = linesOut.join("\n") + "\n";
if (loadFile(targetPath) !== nextText) {
  fs.writeFileSync(targetPath, nextText);
}
