import { r as w } from "./modal-Dzqx5T1M.js";
var h = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500", f = "px-3 py-2 text-sm border-gray-300", m = "px-2 py-1 text-[12px] border-gray-200";
function p(t = "sm") {
  return t === "xs" ? `${h} ${m}` : `${h} ${f}`;
}
function z(t = "sm") {
  const e = "w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white";
  return t === "xs" ? `${e} ${m}` : `${e} ${f}`;
}
function S(t = {}) {
  const e = t.size ?? "sm", n = t.resize ?? "y", a = n === "none" ? "resize-none" : n === "x" ? "resize-x" : n === "both" ? "resize" : "resize-y";
  return `${p(e)} ${a}`;
}
function $() {
  return "w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500";
}
function A(t = "sm") {
  return t === "xs" ? "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" : "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
}
function N(t = "sm") {
  return `<svg class="${t === "xs" ? "w-3 h-3" : "w-4 h-4"}" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>`;
}
var C = "default", v = "Use letters, numbers, underscores, or dashes. Spaces become dashes.";
function y(t) {
  return String(t ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function g(t, e = C) {
  return y(t) || e;
}
function k(t) {
  const e = y(t);
  return e ? {
    ok: !0,
    value: e
  } : {
    ok: !1,
    value: "",
    error: "Enter a channel name with at least one letter or number."
  };
}
function E(t, e) {
  if (Array.from(t.options).some((a) => a.value === e)) return;
  const n = document.createElement("option");
  n.value = e, n.textContent = e.charAt(0).toUpperCase() + e.slice(1), t.appendChild(n);
}
function T(t = document) {
  const e = t.querySelector("[data-content-types-channel-wrapper]");
  if (!e || e.dataset.channelInit === "true") return;
  const n = e.querySelector("[data-content-types-channel]"), a = e.querySelector("[data-content-types-channel-reset]"), x = e.querySelector("[data-content-types-channel-add]"), i = document.querySelector("[data-content-types-empty-reset-channel]");
  if (!n || !a) return;
  e.dataset.channelInit = "true";
  const o = g(e.getAttribute("data-default-channel")), l = (s) => g(s, o), c = (s) => {
    const r = new URL(window.location.href), u = l(s);
    u === o ? r.searchParams.delete("channel") : r.searchParams.set("channel", u), window.location.href = r.toString();
  }, b = (s) => {
    const r = s === o;
    a.classList.toggle("hidden", r), i?.classList.toggle("hidden", r);
  }, d = l(new URL(window.location.href).searchParams.get("channel") || e.getAttribute("data-active-channel"));
  n.value = d, b(d), n.addEventListener("change", () => c(l(n.value))), a.addEventListener("click", () => c(o)), i?.addEventListener("click", () => c(o)), x?.addEventListener("click", () => {
    new w({
      title: "Add Channel",
      label: "Channel name",
      placeholder: "e.g. staging",
      confirmLabel: "Add",
      helpText: v,
      inputClass: p(),
      onConfirm: (s) => {
        const r = k(s);
        if (!r.ok) return r.error;
        E(n, r.value), n.value = r.value, c(r.value);
      }
    }).show();
  });
}
export {
  k as a,
  p as c,
  S as d,
  g as i,
  A as l,
  v as n,
  $ as o,
  y as r,
  N as s,
  T as t,
  z as u
};

//# sourceMappingURL=channel-switcher-CrUwAyMa.js.map