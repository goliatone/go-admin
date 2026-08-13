var s = "w-full border rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white dark:placeholder-gray-500", t = "px-3 py-2 text-sm border-gray-300", n = "px-2 py-1 text-[12px] border-gray-200";
function l(e = "sm") {
  return e === "xs" ? `${s} ${n}` : `${s} ${t}`;
}
function i(e = "sm") {
  const r = "w-full border rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-slate-800 dark:text-white";
  return e === "xs" ? `${r} ${n}` : `${r} ${t}`;
}
function d(e = {}) {
  const r = e.size ?? "sm", a = e.resize ?? "y", c = a === "none" ? "resize-none" : a === "x" ? "resize-x" : a === "both" ? "resize" : "resize-y";
  return `${l(r)} ${c}`;
}
function x() {
  return "w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500";
}
function g(e = "sm") {
  return e === "xs" ? "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" : "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";
}
function b(e = "sm") {
  return `<svg class="${e === "xs" ? "w-3 h-3" : "w-4 h-4"}" viewBox="0 0 24 24" fill="currentColor"><circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/></svg>`;
}
var u = "default", f = "Use letters, numbers, underscores, or dashes. Spaces become dashes.";
function o(e) {
  return String(e ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
}
function y(e, r = u) {
  return o(e) || r;
}
function m(e) {
  const r = o(e);
  return r ? {
    ok: !0,
    value: r
  } : {
    ok: !1,
    value: "",
    error: "Enter a channel name with at least one letter or number."
  };
}
export {
  x as a,
  g as c,
  m as i,
  i as l,
  o as n,
  b as o,
  y as r,
  l as s,
  f as t,
  d as u
};

//# sourceMappingURL=channel-validation-BBf_63LY.js.map