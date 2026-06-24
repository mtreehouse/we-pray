export const PRAY_NEWS_CONTENT_HTML_LIMIT = 2_500_000;

const URL_PATTERN = /(https?:\/\/[^\s<]+)/g;
const TAG_PATTERN = /<\/?\s*([a-zA-Z0-9]+)(?:\s[^>]*)?>/g;

const ALLOWED_TAGS = new Set([
  "a",
  "article",
  "b",
  "blockquote",
  "br",
  "caption",
  "center",
  "code",
  "div",
  "em",
  "figcaption",
  "figure",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "i",
  "img",
  "li",
  "mark",
  "ol",
  "p",
  "pre",
  "s",
  "section",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "u",
  "ul"
]);

const VOID_TAGS = new Set(["br", "hr", "img"]);
const ALLOWED_STYLE_PROPERTIES = new Set([
  "background",
  "background-color",
  "border",
  "border-bottom",
  "border-color",
  "border-left",
  "border-radius",
  "border-right",
  "border-style",
  "border-top",
  "border-width",
  "color",
  "display",
  "font-size",
  "font-style",
  "font-weight",
  "height",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-bottom",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "padding",
  "padding-bottom",
  "padding-left",
  "padding-right",
  "padding-top",
  "text-align",
  "text-decoration",
  "vertical-align",
  "white-space",
  "width"
]);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/\`/g, "&#96;");
}

function decodeBasicEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#96;/g, "\`");
}

function normalizeTagName(tagName: string) {
  const name = tagName.toLowerCase();
  if (name === "b") return "strong";
  if (name === "i") return "em";
  if (name === "h1") return "h2";
  if (name === "h4") return "h3";
  return name;
}

function readAttribute(tag: string, name: string) {
  const pattern = new RegExp("\\s" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))", "i");
  const match = tag.match(pattern);
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function sanitizeHref(value: string) {
  const decoded = decodeBasicEntities(value).trim();
  try {
    const url = new URL(decoded);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

function sanitizeImageSrc(value: string) {
  const decoded = decodeBasicEntities(value).trim();
  if (/^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(decoded)) {
    return decoded.replace(/\s/g, "");
  }

  try {
    const url = new URL(decoded);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    return null;
  }
  return null;
}

function sanitizeLengthValue(value: string) {
  const decoded = decodeBasicEntities(value).trim();
  if (/^\d{1,4}(\.\d{1,2})?(px|em|rem|%|vh|vw)?$/i.test(decoded)) return decoded;
  return null;
}

function sanitizeStyle(value: string) {
  const decoded = decodeBasicEntities(value);
  const safeRules: string[] = [];

  for (const rawRule of decoded.split(";")) {
    const separatorIndex = rawRule.indexOf(":");
    if (separatorIndex <= 0) continue;

    const property = rawRule.slice(0, separatorIndex).trim().toLowerCase();
    const ruleValue = rawRule.slice(separatorIndex + 1).trim();
    if (!ALLOWED_STYLE_PROPERTIES.has(property)) continue;
    if (!ruleValue || /expression\s*\(|javascript:|url\s*\(|@import|behavior\s*:/i.test(ruleValue)) continue;
    if (ruleValue.length > 160) continue;

    safeRules.push(property + ": " + ruleValue);
  }

  return safeRules.join("; ");
}

function linkifyEscapedText(value: string) {
  return value.replace(URL_PATTERN, (url) => {
    const href = sanitizeHref(url);
    if (!href) return url;
    return '<a href="' + escapeAttribute(href) + '" target="_blank" rel="noreferrer">' + url + '</a>';
  });
}

function sanitizeCommonAttributes(tag: string, tagName: string) {
  const attrs: string[] = [];
  const style = readAttribute(tag, "style");
  const safeStyle = style ? sanitizeStyle(style) : "";
  if (safeStyle) attrs.push('style="' + escapeAttribute(safeStyle) + '"');

  const title = readAttribute(tag, "title");
  if (title) attrs.push('title="' + escapeAttribute(decodeBasicEntities(title).slice(0, 160)) + '"');

  if (tagName === "td" || tagName === "th") {
    const colspan = readAttribute(tag, "colspan");
    const rowspan = readAttribute(tag, "rowspan");
    if (colspan && /^\d{1,2}$/.test(colspan)) attrs.push('colspan="' + colspan + '"');
    if (rowspan && /^\d{1,2}$/.test(rowspan)) attrs.push('rowspan="' + rowspan + '"');
  }

  return attrs;
}

export function isPrayNewsHtml(value: string) {
  TAG_PATTERN.lastIndex = 0;
  return TAG_PATTERN.test(value);
}

export function plainTextToPrayNewsHtml(value: string) {
  return linkifyEscapedText(escapeHtml(value)).replace(/\r?\n/g, "<br>");
}

export function sanitizePrayNewsHtml(value: string) {
  return value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?<\/embed>/gi, "")
    .replace(/<svg[\s\S]*?<\/svg>/gi, "")
    .replace(/<[^>]*>/g, (tag) => {
      const match = tag.match(/^<\/?\s*([a-zA-Z0-9]+)/);
      if (!match) return "";

      const rawName = match[1].toLowerCase();
      const name = normalizeTagName(rawName);
      if (!ALLOWED_TAGS.has(name)) return "";

      const closing = /^<\//.test(tag);
      if (closing) {
        if (VOID_TAGS.has(name)) return "";
        return "</" + name + ">";
      }

      if (name === "br") return "<br>";
      if (name === "hr") return "<hr>";

      if (name === "a") {
        const href = sanitizeHref(readAttribute(tag, "href") ?? "");
        const attrs = sanitizeCommonAttributes(tag, name);
        if (!href) return "";
        return '<a href="' + escapeAttribute(href) + '" target="_blank" rel="noreferrer"' + (attrs.length ? " " + attrs.join(" ") : "") + ">";
      }

      if (name === "img") {
        const src = sanitizeImageSrc(readAttribute(tag, "src") ?? readAttribute(tag, "data-src") ?? "");
        if (!src) return "";
        const attrs = ['src="' + escapeAttribute(src) + '"'];
        const alt = readAttribute(tag, "alt");
        const width = sanitizeLengthValue(readAttribute(tag, "width") ?? "");
        const height = sanitizeLengthValue(readAttribute(tag, "height") ?? "");
        if (alt) attrs.push('alt="' + escapeAttribute(decodeBasicEntities(alt).slice(0, 200)) + '"');
        if (width) attrs.push('width="' + escapeAttribute(width) + '"');
        if (height) attrs.push('height="' + escapeAttribute(height) + '"');
        attrs.push('loading="lazy"');
        attrs.push('referrerpolicy="no-referrer"');
        const safeStyle = sanitizeStyle(readAttribute(tag, "style") ?? "");
        attrs.push('style="max-width: 100%; height: auto' + (safeStyle ? "; " + escapeAttribute(safeStyle) : "") + '"');
        return "<img " + attrs.join(" ") + ">";
      }

      const attrs = sanitizeCommonAttributes(tag, name);
      return "<" + name + (attrs.length ? " " + attrs.join(" ") : "") + ">";
    })
    .replace(/<p>\s*<\/p>/g, "")
    .replace(/<div>\s*<\/div>/g, "")
    .trim();
}

export function normalizePrayNewsContentHtml(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const html = isPrayNewsHtml(trimmed) ? trimmed : plainTextToPrayNewsHtml(trimmed);
  return sanitizePrayNewsHtml(html);
}

export function getPrayNewsPlainText(value: string) {
  const html = normalizePrayNewsContentHtml(value);
  return decodeBasicEntities(
    html
      .replace(/<img\b[^>]*\balt\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>/gi, (_match, doubleQuoted, singleQuoted, bare) => doubleQuoted ?? singleQuoted ?? bare ?? "이미지")
      .replace(/<img\b[^>]*>/gi, "이미지")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h2|h3|h4|blockquote|figure|figcaption|tr|table|section|article)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{3,}/g, "\n\n")
  ).trim();
}

export function toPrayNewsDisplayHtml(value: string) {
  return normalizePrayNewsContentHtml(value);
}
