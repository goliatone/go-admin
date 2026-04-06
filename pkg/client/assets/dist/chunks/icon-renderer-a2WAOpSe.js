import { escapeAttribute as o, escapeHTML as u } from "../shared/html.js";
var l = "iconoir", d = "var(--sidebar-icon-size, 20px)", p = ["https:"], m = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
], g = 131072, h = {
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
function f(e) {
  const t = e;
  if (e = e.trim(), !e) return {
    type: "library",
    value: "",
    raw: t
  };
  if (e.startsWith("emoji:")) return {
    type: "emoji",
    value: e.slice(6),
    raw: t
  };
  if (e.startsWith("svg:")) return {
    type: "svg",
    value: e.slice(4),
    raw: t
  };
  if (e.startsWith("url:")) return {
    type: "url",
    value: e.slice(4),
    raw: t
  };
  if (e.startsWith("<svg") || e.startsWith("<?xml")) return {
    type: "svg",
    value: e,
    raw: t
  };
  if (e.startsWith("http://") || e.startsWith("https://") || e.startsWith("data:")) return {
    type: "url",
    value: e,
    raw: t
  };
  if (L(e)) return {
    type: "emoji",
    value: e,
    raw: t
  };
  if (e.includes(":") && !e.includes("://")) {
    const n = e.indexOf(":");
    return {
      type: "library",
      library: e.slice(0, n),
      value: e.slice(n + 1),
      raw: t
    };
  }
  if (e.startsWith("iconoir-")) return {
    type: "library",
    library: "iconoir",
    value: e.slice(8),
    raw: t
  };
  const r = h[e];
  return r ? {
    type: "library",
    library: "iconoir",
    value: r,
    raw: t
  } : {
    type: "library",
    library: l,
    value: e,
    raw: t
  };
}
function S(e, t) {
  return v(f(e), t);
}
function v(e, t) {
  if (!e.value && e.type === "library") return "";
  const r = t?.size ?? d, n = t?.extraClass ?? "";
  switch (e.type) {
    case "emoji":
      return y(e.value, r, n);
    case "library":
      return b(e.library ?? l, e.value, r, n);
    case "svg":
      return t?.trusted ? w(e.value, r, n) : (console.warn("[icon-renderer] SVG content blocked for untrusted source"), "");
    case "url":
      return $(e.value, r, n, t?.trusted);
    default:
      return "";
  }
}
function y(e, t, r) {
  const n = `font-size: ${t}; line-height: 1; text-align: center; width: 1.25em;`;
  return `<span class="${`flex-shrink-0${r ? " " + r : ""}`}" style="${n}">${u(e)}</span>`;
}
function b(e, t, r, n) {
  const i = c(e), a = c(t), s = `font-size: ${r};`;
  return `<i class="${`${i}-${a} flex-shrink-0${n ? " " + n : ""}`}" style="${s}"></i>`;
}
function w(e, t, r) {
  const n = k(e);
  return n ? `<span class="${`flex-shrink-0${r ? " " + r : ""}`}" style="${`width: ${t}; height: ${t};`}">${n}</span>` : "";
}
function $(e, t, r, n) {
  const i = x(e, n);
  if (!i)
    return console.warn("[icon-renderer] URL blocked:", e), "";
  const a = `flex-shrink-0${r ? " " + r : ""}`, s = `width: ${t}; height: ${t}; object-fit: contain;`;
  return `<img src="${o(i)}" class="${a}" style="${s}" alt="" aria-hidden="true">`;
}
function x(e, t) {
  if (e = e.trim(), !e || e.toLowerCase().startsWith("javascript:")) return null;
  if (e.startsWith("data:")) return I(e, t);
  try {
    const r = new URL(e);
    return p.includes(r.protocol) ? t ? e : (console.warn("[icon-renderer] External URL blocked for untrusted source"), null) : null;
  } catch {
    return null;
  }
}
function I(e, t) {
  if (!e.startsWith("data:")) return null;
  if (e.length > g)
    return console.warn("[icon-renderer] Data URI exceeds size limit"), null;
  const r = e.slice(5), n = r.indexOf(",");
  if (n < 0) return null;
  const i = r.slice(0, n).split(";")[0].trim();
  return m.includes(i.toLowerCase()) ? !t && i.toLowerCase() === "image/svg+xml" ? (console.warn("[icon-renderer] SVG data URI blocked for untrusted source"), null) : e : (console.warn("[icon-renderer] Data URI MIME type not allowed:", i), null);
}
function k(e) {
  if (!e.toLowerCase().includes("<svg")) return null;
  let t = e;
  return t = t.replace(/<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, ""), t = t.replace(/<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*\/?>/gi, ""), t = t.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, ""), t = t.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, ""), t = t.replace(/(href|xlink:href)\s*=\s*["']?\s*javascript:[^"'\s>]*["']?/gi, ""), t = t.replace(/(href|xlink:href|src)\s*=\s*["']?\s*(https?:|\/\/)[^"'\s>]*["']?/gi, ""), t = t.replace(/<!ENTITY\s+[^>]+>/gi, ""), t = t.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/gi, ""), t = t.replace(/<\?[\s\S]*?\?>/g, ""), t.toLowerCase().includes("<svg") ? t.trim() : null;
}
function L(e) {
  for (const t of e) {
    const r = t.codePointAt(0);
    if (r !== void 0 && (r === 65039 || r === 8205 || r >= 9728 && r <= 10175 || r >= 127744 && r <= 129791 || r >= 127995 && r <= 127999))
      return !0;
  }
  return !1;
}
function c(e) {
  return e.replace(/[^a-zA-Z0-9_-]/g, "");
}
export {
  S as t
};

//# sourceMappingURL=icon-renderer-a2WAOpSe.js.map