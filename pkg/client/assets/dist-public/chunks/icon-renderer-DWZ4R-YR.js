import { escapeAttribute as d, escapeHTML as p } from "../shared/html.js";
import { createLogger as g } from "../shared/logger.js";
var a = g("IconRenderer"), s = "iconoir", m = "var(--sidebar-icon-size, 20px)", f = ["https:"], h = [
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif"
], v = 131072, y = {
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
}, I = {
  "alert-triangle": "warning-triangle",
  file: "page",
  "file-text": "page"
}, b = /* @__PURE__ */ new Set([
  s,
  "lucide",
  "feather"
]);
function w(e) {
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
  if (W(e)) return {
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
  const r = y[e];
  return r ? {
    type: "library",
    library: "iconoir",
    value: r,
    raw: t
  } : {
    type: "library",
    library: s,
    value: e,
    raw: t
  };
}
function T(e, t) {
  return L(w(e), t);
}
function L(e, t) {
  if (!e.value && e.type === "library") return "";
  const r = t?.size ?? m, n = t?.extraClass ?? "";
  switch (e.type) {
    case "emoji":
      return x(e.value, r, n);
    case "library":
      return $(e.library ?? s, e.value, r, n);
    case "svg":
      return t?.trusted ? A(e.value, r, n) : (a.warn("[icon-renderer] SVG content blocked for untrusted source"), "");
    case "url":
      return E(e.value, r, n, t?.trusted);
    default:
      return "";
  }
}
function x(e, t, r) {
  const n = `font-size: ${t}; line-height: 1; text-align: center; width: 1.25em;`;
  return `<span class="${`flex-shrink-0${r ? " " + r : ""}`}" style="${n}">${p(e)}</span>`;
}
function $(e, t, r, n) {
  const i = k(e, t);
  e = i.library, t = i.name;
  const c = o(e), l = o(t), u = `font-size: ${r};`;
  return `<i class="${`${c}-${l} flex-shrink-0${n ? " " + n : ""}`}" style="${u}"></i>`;
}
function k(e, t) {
  const r = e.trim().toLowerCase();
  if (!b.has(r)) return {
    library: e,
    name: t
  };
  const n = I[t.trim().toLowerCase()];
  return n ? {
    library: s,
    name: n
  } : {
    library: e,
    name: t
  };
}
function A(e, t, r) {
  const n = R(e);
  return n ? `<span class="${`flex-shrink-0${r ? " " + r : ""}`}" style="${`width: ${t}; height: ${t};`}">${n}</span>` : "";
}
function E(e, t, r, n) {
  const i = S(e, n);
  if (!i)
    return a.warn("[icon-renderer] URL blocked:", e), "";
  const c = `flex-shrink-0${r ? " " + r : ""}`, l = `width: ${t}; height: ${t}; object-fit: contain;`;
  return `<img src="${d(i)}" class="${c}" style="${l}" alt="" aria-hidden="true">`;
}
function S(e, t) {
  if (e = e.trim(), !e || e.toLowerCase().startsWith("javascript:")) return null;
  if (e.startsWith("data:")) return _(e, t);
  try {
    const r = new URL(e);
    return f.includes(r.protocol) ? t ? e : (a.warn("[icon-renderer] External URL blocked for untrusted source"), null) : null;
  } catch {
    return null;
  }
}
function _(e, t) {
  if (!e.startsWith("data:")) return null;
  if (e.length > v)
    return a.warn("[icon-renderer] Data URI exceeds size limit"), null;
  const r = e.slice(5), n = r.indexOf(",");
  if (n < 0) return null;
  const i = r.slice(0, n).split(";")[0].trim();
  return h.includes(i.toLowerCase()) ? !t && i.toLowerCase() === "image/svg+xml" ? (a.warn("[icon-renderer] SVG data URI blocked for untrusted source"), null) : e : (a.warn("[icon-renderer] Data URI MIME type not allowed:", i), null);
}
function R(e) {
  if (!e.toLowerCase().includes("<svg")) return null;
  let t = e;
  return t = t.replace(/<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, ""), t = t.replace(/<\s*(script|foreignObject|set|animate|animateMotion|animateTransform|use|image|feImage)[^>]*\/?>/gi, ""), t = t.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, ""), t = t.replace(/\s+on\w+\s*=\s*[^\s>]+/gi, ""), t = t.replace(/(href|xlink:href)\s*=\s*["']?\s*javascript:[^"'\s>]*["']?/gi, ""), t = t.replace(/(href|xlink:href|src)\s*=\s*["']?\s*(https?:|\/\/)[^"'\s>]*["']?/gi, ""), t = t.replace(/<!ENTITY\s+[^>]+>/gi, ""), t = t.replace(/<!DOCTYPE[^>]*\[[\s\S]*?\]>/gi, ""), t = t.replace(/<\?[\s\S]*?\?>/g, ""), t.toLowerCase().includes("<svg") ? t.trim() : null;
}
function W(e) {
  for (const t of e) {
    const r = t.codePointAt(0);
    if (r !== void 0 && (r === 65039 || r === 8205 || r >= 9728 && r <= 10175 || r >= 127744 && r <= 129791 || r >= 127995 && r <= 127999))
      return !0;
  }
  return !1;
}
function o(e) {
  return e.replace(/[^a-zA-Z0-9_-]/g, "");
}
export {
  T as t
};

//# sourceMappingURL=icon-renderer-DWZ4R-YR.js.map