import { escapeHTML as m } from "../shared/html.js";
import { f as b } from "./formatters-CxrdwABk.js";
const u = "application/vnd.google-apps.document", f = "application/vnd.google-apps.spreadsheet", h = "application/vnd.google-apps.presentation", x = "application/vnd.google-apps.folder", y = "application/pdf", v = [u, y], g = "esign.google.account_id";
function T(e) {
  return e.mimeType === u;
}
function I(e) {
  return e.mimeType === y;
}
function c(e) {
  return e.mimeType === x;
}
function w(e) {
  return v.includes(e.mimeType);
}
function G(e) {
  return e.mimeType === u || e.mimeType === f || e.mimeType === h;
}
function S(e) {
  return {
    id: e.id || "",
    name: e.name || "Untitled",
    mimeType: e.mimeType || "application/octet-stream",
    size: typeof e.size == "string" ? parseInt(e.size, 10) || 0 : e.size || 0,
    modifiedTime: e.modifiedTime || (/* @__PURE__ */ new Date()).toISOString(),
    iconLink: e.iconLink,
    thumbnailLink: e.thumbnailLink,
    webViewLink: e.webViewLink,
    parents: e.parents
  };
}
function D(e) {
  return e.map(S);
}
function $(e) {
  return {
    [u]: "Google Doc",
    [f]: "Google Sheet",
    [h]: "Google Slides",
    [x]: "Folder",
    [y]: "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[e] || "File";
}
function _(e) {
  return c(e) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : T(e) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : I(e) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : e.mimeType === f ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : e.mimeType === h ? {
    icon: "iconoir-presentation",
    bgClass: "bg-orange-100",
    textClass: "text-orange-600"
  } : e.mimeType.startsWith("image/") ? {
    icon: "iconoir-media-image",
    bgClass: "bg-purple-100",
    textClass: "text-purple-600"
  } : {
    icon: "iconoir-page",
    bgClass: "bg-gray-100",
    textClass: "text-gray-600"
  };
}
function C(e) {
  return !e || e <= 0 ? "-" : e < 1024 ? `${e} B` : e < 1024 * 1024 ? `${(e / 1024).toFixed(1)} KB` : `${(e / (1024 * 1024)).toFixed(2)} MB`;
}
function z(e, t) {
  const o = d(e.get("account_id"));
  if (o)
    return o;
  const n = d(t);
  if (n)
    return n;
  try {
    return d(localStorage.getItem(g));
  } catch {
    return "";
  }
}
function d(e) {
  if (!e) return "";
  const t = e.trim();
  return t === "null" || t === "undefined" || t === "0" ? "" : t;
}
function A(e) {
  const t = d(e);
  try {
    t ? localStorage.setItem(g, t) : localStorage.removeItem(g);
  } catch {
  }
}
function O(e, t) {
  const o = d(t);
  try {
    const n = new URL(e, window.location.origin);
    return o ? n.searchParams.set("account_id", o) : n.searchParams.delete("account_id"), `${n.pathname}${n.search}${n.hash}`;
  } catch {
    const [n, i = ""] = e.split("#", 2), [a, r = ""] = n.split("?", 2), s = new URLSearchParams(r);
    o ? s.set("account_id", o) : s.delete("account_id");
    const l = s.toString(), p = i ? `#${i}` : "";
    return `${a}${l ? `?${l}` : ""}${p}`;
  }
}
function P(e, t, o) {
  const n = new URL(t, window.location.origin);
  return n.pathname.startsWith(e) || (n.pathname = `${e}${t}`), o && n.searchParams.set("account_id", o), n;
}
function k(e) {
  const t = new URL(window.location.href), o = t.searchParams.get("account_id"), n = d(e);
  n && o !== n ? (t.searchParams.set("account_id", n), window.history.replaceState({}, "", t.toString())) : !n && o && (t.searchParams.delete("account_id"), window.history.replaceState({}, "", t.toString()));
}
function E(e) {
  const t = _(e);
  return `
    <div class="w-10 h-10 ${t.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${t.icon} ${t.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function R(e, t) {
  if (e.length === 0)
    return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const o = [
    { id: "", name: "My Drive" },
    ...e
  ];
  return o.map((n, i) => {
    const a = i === o.length - 1, r = i > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return a ? `${r}<span class="text-gray-900 font-medium">${m(n.name)}</span>` : `${r}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${m(n.name)}</button>`;
  }).join("");
}
function F(e, t = {}) {
  const { selectable: o = !0, showSize: n = !0, showDate: i = !0 } = t, a = E(e), r = c(e), s = w(e), l = r ? "cursor-pointer hover:bg-gray-50" : s ? "cursor-pointer hover:bg-blue-50" : "opacity-60", p = r ? `data-folder-id="${e.id}" data-folder-name="${m(e.name)}"` : s && o ? `data-file-id="${e.id}" data-file-name="${m(e.name)}" data-mime-type="${e.mimeType}"` : "";
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${l} file-item"
      ${p}
      role="listitem"
      ${s ? 'tabindex="0"' : ""}
    >
      ${a}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${m(e.name)}</p>
        <p class="text-xs text-gray-500">
          ${$(e.mimeType)}
          ${n && e.size > 0 ? ` &middot; ${C(e.size)}` : ""}
          ${i && e.modifiedTime ? ` &middot; ${b(e.modifiedTime)}` : ""}
        </p>
      </div>
      ${s && o ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function U(e, t = {}) {
  const { emptyMessage: o = "No files found", selectable: n = !0 } = t;
  return e.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${m(o)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...e].sort((a, r) => c(a) && !c(r) ? -1 : !c(a) && c(r) ? 1 : a.name.localeCompare(r.name)).map((a) => F(a, { selectable: n })).join("")}
    </div>
  `;
}
function N(e) {
  return {
    id: e.id,
    name: e.name,
    mimeType: e.mimeType,
    typeName: $(e.mimeType)
  };
}
export {
  g as G,
  v as I,
  u as M,
  f as a,
  h as b,
  x as c,
  y as d,
  I as e,
  c as f,
  w as g,
  G as h,
  T as i,
  D as j,
  $ as k,
  _ as l,
  C as m,
  S as n,
  d as o,
  O as p,
  P as q,
  z as r,
  A as s,
  k as t,
  E as u,
  R as v,
  F as w,
  U as x,
  N as y
};
//# sourceMappingURL=google-drive-utils-Ds4hfRZV.js.map
