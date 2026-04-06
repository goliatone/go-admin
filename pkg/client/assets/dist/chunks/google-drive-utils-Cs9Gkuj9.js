import { escapeHTML as p } from "../shared/html.js";
import { formatByteSize as h } from "../shared/size-formatters.js";
import { o as v } from "./formatters-oZ3pO-Hk.js";
var u = "application/vnd.google-apps.document", G = "application/vnd.google-apps.spreadsheet", z = "application/vnd.google-apps.presentation", b = "application/vnd.google-apps.folder", g = "application/pdf", x = [u, g], d = "esign.google.account_id";
function $(e) {
  return e.mimeType === u;
}
function T(e) {
  return e.mimeType === g;
}
function c(e) {
  return e.mimeType === b;
}
function w(e) {
  return x.includes(e.mimeType);
}
function M(e) {
  return e.mimeType === "application/vnd.google-apps.document" || e.mimeType === "application/vnd.google-apps.spreadsheet" || e.mimeType === "application/vnd.google-apps.presentation";
}
function I(e) {
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
function O(e) {
  return e.map(I);
}
function y(e) {
  return {
    "application/vnd.google-apps.document": "Google Doc",
    "application/vnd.google-apps.spreadsheet": "Google Sheet",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.folder": "Folder",
    "application/pdf": "PDF",
    "application/msword": "Word Document",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "Word Document",
    "application/vnd.ms-excel": "Excel Spreadsheet",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel Spreadsheet",
    "image/png": "PNG Image",
    "image/jpeg": "JPEG Image",
    "text/plain": "Text File"
  }[e] || "File";
}
function S(e) {
  return c(e) ? {
    icon: "iconoir-folder",
    bgClass: "bg-yellow-100",
    textClass: "text-yellow-600"
  } : $(e) ? {
    icon: "iconoir-google-docs",
    bgClass: "bg-blue-100",
    textClass: "text-blue-600"
  } : T(e) ? {
    icon: "iconoir-page",
    bgClass: "bg-red-100",
    textClass: "text-red-600"
  } : e.mimeType === "application/vnd.google-apps.spreadsheet" ? {
    icon: "iconoir-table",
    bgClass: "bg-green-100",
    textClass: "text-green-600"
  } : e.mimeType === "application/vnd.google-apps.presentation" ? {
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
function _(e) {
  return h(e, {
    emptyFallback: "-",
    zeroFallback: "-",
    invalidFallback: "-",
    precisionByUnit: [
      0,
      1,
      2,
      2
    ]
  });
}
function P(e, t) {
  const a = l(e.get("account_id"));
  if (a) return a;
  const n = l(t);
  if (n) return n;
  try {
    return l(localStorage.getItem(d));
  } catch {
    return "";
  }
}
function l(e) {
  if (!e) return "";
  const t = e.trim();
  return t === "null" || t === "undefined" || t === "0" ? "" : t;
}
function A(e) {
  const t = l(e);
  try {
    t ? localStorage.setItem(d, t) : localStorage.removeItem(d);
  } catch {
  }
}
function k(e, t) {
  const a = l(t);
  try {
    const n = new URL(e, window.location.origin);
    return a ? n.searchParams.set("account_id", a) : n.searchParams.delete("account_id"), `${n.pathname}${n.search}${n.hash}`;
  } catch {
    const [n, o = ""] = e.split("#", 2), [i, s = ""] = n.split("?", 2), r = new URLSearchParams(s);
    a ? r.set("account_id", a) : r.delete("account_id");
    const m = r.toString(), f = o ? `#${o}` : "";
    return `${i}${m ? `?${m}` : ""}${f}`;
  }
}
function U(e, t, a) {
  const n = new URL(t, window.location.origin);
  return n.pathname.startsWith(e) || (n.pathname = `${e}${t}`), a && n.searchParams.set("account_id", a), n;
}
function R(e) {
  const t = new URL(window.location.href), a = t.searchParams.get("account_id"), n = l(e);
  n && a !== n ? (t.searchParams.set("account_id", n), window.history.replaceState({}, "", t.toString())) : !n && a && (t.searchParams.delete("account_id"), window.history.replaceState({}, "", t.toString()));
}
function E(e) {
  const t = S(e);
  return `
    <div class="w-10 h-10 ${t.bgClass} rounded-lg flex items-center justify-center flex-shrink-0">
      <i class="${t.icon} ${t.textClass}" aria-hidden="true"></i>
    </div>
  `;
}
function N(e, t) {
  if (e.length === 0) return '<span class="text-gray-600 text-sm font-medium">My Drive</span>';
  const a = [{
    id: "",
    name: "My Drive"
  }, ...e];
  return a.map((n, o) => {
    const i = o === a.length - 1, s = o > 0 ? '<span class="text-gray-400 mx-1">/</span>' : "";
    return i ? `${s}<span class="text-gray-900 font-medium">${p(n.name)}</span>` : `${s}<button
        type="button"
        class="text-blue-600 hover:text-blue-800 hover:underline breadcrumb-nav-btn"
        data-folder-id="${n.id}"
      >${p(n.name)}</button>`;
  }).join("");
}
function C(e, t = {}) {
  const { selectable: a = !0, showSize: n = !0, showDate: o = !0 } = t, i = E(e), s = c(e), r = w(e);
  return `
    <div
      class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 ${s ? "cursor-pointer hover:bg-gray-50" : r ? "cursor-pointer hover:bg-blue-50" : "opacity-60"} file-item"
      ${s ? `data-folder-id="${e.id}" data-folder-name="${p(e.name)}"` : r && a ? `data-file-id="${e.id}" data-file-name="${p(e.name)}" data-mime-type="${e.mimeType}"` : ""}
      role="listitem"
      ${r ? 'tabindex="0"' : ""}
    >
      ${i}
      <div class="flex-1 min-w-0">
        <p class="font-medium text-gray-900 truncate">${p(e.name)}</p>
        <p class="text-xs text-gray-500">
          ${y(e.mimeType)}
          ${n && e.size > 0 ? ` &middot; ${_(e.size)}` : ""}
          ${o && e.modifiedTime ? ` &middot; ${v(e.modifiedTime)}` : ""}
        </p>
      </div>
      ${r && a ? '<i class="iconoir-nav-arrow-right text-gray-400" aria-hidden="true"></i>' : ""}
    </div>
  `;
}
function W(e, t = {}) {
  const { emptyMessage: a = "No files found", selectable: n = !0 } = t;
  return e.length === 0 ? `
      <div class="text-center py-8 text-gray-500">
        <i class="iconoir-folder text-4xl mb-2" aria-hidden="true"></i>
        <p>${p(a)}</p>
      </div>
    ` : `
    <div class="space-y-2" role="list">
      ${[...e].sort((o, i) => c(o) && !c(i) ? -1 : !c(o) && c(i) ? 1 : o.name.localeCompare(i.name)).map((o) => C(o, { selectable: n })).join("")}
    </div>
  `;
}
function j(e) {
  return {
    id: e.id,
    name: e.name,
    mimeType: e.mimeType,
    typeName: y(e.mimeType)
  };
}
export {
  E as C,
  A as D,
  P as E,
  R as O,
  N as S,
  W as T,
  w as _,
  G as a,
  I as b,
  k as c,
  _ as d,
  S as f,
  M as g,
  $ as h,
  b as i,
  U as l,
  c as m,
  x as n,
  z as o,
  y as p,
  u as r,
  g as s,
  d as t,
  j as u,
  T as v,
  C as w,
  O as x,
  l as y
};

//# sourceMappingURL=google-drive-utils-Cs9Gkuj9.js.map