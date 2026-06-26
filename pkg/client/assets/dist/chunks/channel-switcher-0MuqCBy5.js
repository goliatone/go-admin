import { r as x } from "./modal-C7iNT0ae.js";
var g = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500", h = "px-3 py-2 text-sm border-gray-300", f = "px-2 py-1 text-[12px] border-gray-200";
function y(t = "sm") {
  return t === "xs" ? `${g} ${f}` : `${g} ${h}`;
}
function k(t = "sm") {
  const e = "w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white";
  return t === "xs" ? `${e} ${f}` : `${e} ${h}`;
}
function v(t = {}) {
  const e = t.size ?? "sm", n = t.resize ?? "y", a = n === "none" ? "resize-none" : n === "x" ? "resize-x" : n === "both" ? "resize" : "resize-y";
  return `${y(e)} ${a}`;
}
function S() {
  return "w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500";
}
function z(t = "sm") {
  return t === "xs" ? "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" : "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
}
function L(t = "sm") {
  return `<svg class="${t === "xs" ? "w-3 h-3" : "w-4 h-4"}" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>`;
}
function b(t) {
  return String(t ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
}
function w(t, e) {
  if (Array.from(t.options).some((a) => a.value === e)) return;
  const n = document.createElement("option");
  n.value = e, n.textContent = e.charAt(0).toUpperCase() + e.slice(1), t.appendChild(n);
}
function $(t = document) {
  const e = t.querySelector("[data-content-types-channel-wrapper]");
  if (!e || e.dataset.channelInit === "true") return;
  const n = e.querySelector("[data-content-types-channel]"), a = e.querySelector("[data-content-types-channel-reset]"), m = e.querySelector("[data-content-types-channel-add]"), i = document.querySelector("[data-content-types-empty-reset-channel]");
  if (!n || !a) return;
  e.dataset.channelInit = "true";
  const o = (e.getAttribute("data-default-channel") || "default").trim().toLowerCase() || "default", l = (s) => String(s ?? "").trim().toLowerCase() || o, c = (s) => {
    const r = new URL(window.location.href), u = l(s);
    u === o ? r.searchParams.delete("channel") : r.searchParams.set("channel", u), window.location.href = r.toString();
  }, p = (s) => {
    const r = s === o;
    a.classList.toggle("hidden", r), i?.classList.toggle("hidden", r);
  }, d = l(new URL(window.location.href).searchParams.get("channel") || e.getAttribute("data-active-channel"));
  n.value = d, p(d), n.addEventListener("change", () => c(l(n.value))), a.addEventListener("click", () => c(o)), i?.addEventListener("click", () => c(o)), m?.addEventListener("click", () => {
    new x({
      title: "Add Channel",
      label: "Channel name",
      placeholder: "e.g. staging",
      confirmLabel: "Add",
      inputClass: y(),
      onConfirm: (s) => {
        const r = b(s);
        r && (w(n, r), n.value = r, c(r));
      }
    }).show();
  });
}
export {
  y as a,
  v as c,
  L as i,
  b as n,
  z as o,
  S as r,
  k as s,
  $ as t
};

//# sourceMappingURL=channel-switcher-0MuqCBy5.js.map