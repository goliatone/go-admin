const l = "iconoir", o = "var(--sidebar-icon-size, 20px)", u = ["https:"], d = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
];
const p = {
  text: "text",
  textarea: "text",
  "rich-text": "edit-pencil",
  markdown: "edit-pencil",
  code: "code",
  number: "calculator",
  integer: "calculator",
  currency: "credit-card",
  percentage: "percentage-round",
  select: "list",
  radio: "circle",
  checkbox: "check-circle",
  chips: "label",
  toggle: "switch-on",
  date: "calendar",
  time: "clock",
  datetime: "calendar",
  "media-picker": "media-image",
  "media-gallery": "media-image-list",
  "file-upload": "attachment",
  reference: "link",
  references: "link",
  user: "user",
  group: "folder",
  repeater: "refresh-double",
  blocks: "view-grid",
  json: "code-brackets",
  slug: "link",
  color: "color-picker",
  location: "pin-alt"
};
function g(e) {
  const t = e;
  if (e = e.trim(), !e)
    return { type: "library", value: "", raw: t };
  if (e.startsWith("emoji:"))
    return { type: "emoji", value: e.slice(6), raw: t };
  if (e.startsWith("svg:"))
    return { type: "svg", value: e.slice(4), raw: t };
  if (e.startsWith("url:"))
    return { type: "url", value: e.slice(4), raw: t };
  if (e.startsWith("<svg") || e.startsWith("<?xml"))
    return { type: "svg", value: e, raw: t };
  if (e.startsWith("http://") || e.startsWith("https://") || e.startsWith("data:"))
    return { type: "url", value: e, raw: t };
  if ($(e))
    return { type: "emoji", value: e, raw: t };
  if (e.includes(":") && !e.includes("://")) {
    const n = e.indexOf(":"), s = e.slice(0, n), i = e.slice(n + 1);
    return { type: "library", library: s, value: i, raw: t };
  }
  if (e.startsWith("iconoir-"))
    return { type: "library", library: "iconoir", value: e.slice(8), raw: t };
  const r = p[e];
  return r ? { type: "library", library: "iconoir", value: r, raw: t } : { type: "library", library: l, value: e, raw: t };
}
function L(e, t) {
  const r = g(e);
  return m(r, t);
}
function m(e, t) {
  if (!e.value && e.type === "library")
    return "";
  const r = t?.size ?? o, n = t?.extraClass ?? "";
  switch (e.type) {
    case "emoji":
      return h(e.value, r, n);
    case "library":
      return f(e.library ?? l, e.value, r, n);
    case "svg":
      return t?.trusted ? y(e.value, r, n) : (console.warn("[icon-renderer] SVG content blocked for untrusted source"), "");
    case "url":
      return v(e.value, r, n, t?.trusted);
    default:
      return "";
  }
}
function h(e, t, r) {
  const n = `font-size: ${t}; line-height: 1; text-align: center; width: 1.25em;`;
  return `<span class="${`flex-shrink-0${r ? " " + r : ""}`}" style="${n}">${x(e)}</span>`;
}
function f(e, t, r, n) {
  const s = a(e), i = a(t), c = `font-size: ${r};`;
  return `<i class="${`${s}-${i} flex-shrink-0${n ? " " + n : ""}`}" style="${c}"></i>`;
}
function y(e, t, r) {
  const n = I(e);
  if (!n)
    return "";
  const s = `flex-shrink-0${r ? " " + r : ""}`, i = `width: ${t}; height: ${t};`;
  return `<span class="${s}" style="${i}">${n}</span>`;
}
function v(e, t, r, n) {
  const s = b(e, n);
  if (!s)
    return console.warn("[icon-renderer] URL blocked:", e), "";
  const i = `flex-shrink-0${r ? " " + r : ""}`, c = `width: ${t}; height: ${t}; object-fit: contain;`;
  return `<img src="${k(s)}" class="${i}" style="${c}" alt="" aria-hidden="true">`;
}
function b(e, t) {
  if (e = e.trim(), !e || e.toLowerCase().startsWith("javascript:"))
    return null;
  if (e.startsWith("data:"))
    return w(e, t);
  try {
    const r = new URL(e);
    return u.includes(r.protocol) ? t ? e : (console.warn("[icon-renderer] External URL blocked for untrusted source"), null) : null;
  } catch {
    return null;
  }
}
function w(e, t) {
  if (!e.startsWith("data:"))
    return null;
  if (e.length > 131072)
    return console.warn("[icon-renderer] Data URI exceeds size limit"), null;
  const r = e.slice(5), n = r.indexOf(",");
  if (n < 0)
    return null;
  const i = r.slice(0, n).split(";")[0].trim();
  return d.includes(i.toLowerCase()) ? !t && i.toLowerCase() === "image/svg+xml" ? (console.warn("[icon-renderer] SVG data URI blocked for untrusted source"), null) : e : (console.warn("[icon-renderer] Data URI MIME type not allowed:", i), null);
}
function I(e) {
  if (!e.toLowerCase().includes("<svg"))
    return null;
  let t = e;
  return t = t.replace(
    /<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
    ""
  ), t = t.replace(
    /<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*\/?>/gi,
    ""
  ), t = t.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, ""), t = t.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, ""), t = t.replace(/(href|xlink:href)\s*=\s*["']?\s*javascript:[^"'\s>]*["']?/gi, ""), t = t.replace(/(href|xlink:href|src)\s*=\s*["']?\s*(https?:|\/\/)[^"'\s>]*["']?/gi, ""), t = t.replace(/<!ENTITY\s+[^>]+>/gi, ""), t = t.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/gi, ""), t = t.replace(/<\?[\s\S]*?\?>/g, ""), t.toLowerCase().includes("<svg") ? t.trim() : null;
}
function $(e) {
  for (const t of e) {
    const r = t.codePointAt(0);
    if (r !== void 0 && (r === 65039 || r === 8205 || r >= 9728 && r <= 10175 || r >= 127744 && r <= 129791 || r >= 127995 && r <= 127999))
      return !0;
  }
  return !1;
}
function x(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function k(e) {
  return e.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function a(e) {
  return e.replace(/[^a-zA-Z0-9_-]/g, "");
}
export {
  L as r
};
//# sourceMappingURL=icon-renderer-CRbgoQtj.js.map
