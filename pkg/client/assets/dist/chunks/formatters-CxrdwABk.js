import { escapeHTML as s } from "../shared/html.js";
function d(t) {
  if (t == null || t === "" || t === 0) return "-";
  const n = typeof t == "string" ? parseInt(t, 10) : t;
  return !Number.isFinite(n) || n <= 0 ? "-" : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
function g(t) {
  if (!t) return "-";
  const n = typeof t == "string" ? parseInt(t, 10) : t;
  return !Number.isFinite(n) || n <= 0 ? "-" : n === 1 ? "1 page" : `${n} pages`;
}
function D(t, n) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    if (isNaN(e.getTime())) return "-";
    const r = {
      dateStyle: "short",
      timeStyle: "short"
    };
    return e.toLocaleString(void 0, n || r);
  } catch {
    return String(t);
  }
}
function h(t) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    return isNaN(n.getTime()) ? "-" : n.toLocaleDateString() + " " + n.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(t);
  }
}
function T(t, n) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    if (isNaN(e.getTime())) return "-";
    const r = {
      dateStyle: "medium"
    };
    return e.toLocaleDateString(void 0, n || r);
  } catch {
    return String(t);
  }
}
function N(t, n) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    if (isNaN(e.getTime())) return "-";
    const r = {
      hour: "2-digit",
      minute: "2-digit"
    };
    return e.toLocaleTimeString(void 0, n || r);
  } catch {
    return String(t);
  }
}
function p(t) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    if (isNaN(n.getTime())) return "-";
    const e = /* @__PURE__ */ new Date(), r = n.getTime() - e.getTime(), i = Math.round(r / 1e3), o = Math.round(i / 60), a = Math.round(o / 60), c = Math.round(a / 24), f = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(c) >= 1 ? f.format(c, "day") : Math.abs(a) >= 1 ? f.format(a, "hour") : Math.abs(o) >= 1 ? f.format(o, "minute") : f.format(i, "second");
  } catch {
    return String(t);
  }
}
function S(t) {
  const n = String(t ?? "").trim();
  if (!n) return "-";
  const e = t instanceof Date ? t : new Date(n);
  return Number.isNaN(e.getTime()) ? s(n) : s(e.toLocaleString());
}
function w(t) {
  if (!t) return "";
  const n = t instanceof Date ? t : new Date(t);
  if (Number.isNaN(n.getTime())) return "";
  const r = Date.now() - n.getTime(), i = Math.floor(r / 6e4), o = Math.floor(r / 36e5), a = Math.floor(r / 864e5);
  return i < 1 ? "just now" : i < 60 ? `${i}m ago` : o < 24 ? `${o}h ago` : a < 7 ? `${a}d ago` : n.toLocaleDateString();
}
function M(t) {
  if (t)
    try {
      const n = t instanceof Date ? t : new Date(t);
      return Number.isNaN(n.getTime()) ? void 0 : n.toLocaleString();
    } catch {
      return;
    }
}
function y(t) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    return Number.isNaN(n.getTime()) ? "-" : n.toLocaleDateString();
  } catch {
    return String(t);
  }
}
function L(t) {
  return t == null ? "0 recipients" : t === 1 ? "1 recipient" : `${t} recipients`;
}
function u(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function $(t) {
  return t ? t.split("_").map((n) => u(n)).join(" ") : "";
}
function F(t, n) {
  return !t || t.length <= n ? t : `${t.slice(0, n - 3)}...`;
}
export {
  M as a,
  d as b,
  g as c,
  D as d,
  T as e,
  y as f,
  N as g,
  p as h,
  S as i,
  w as j,
  L as k,
  u as l,
  h as m,
  $ as s,
  F as t
};
//# sourceMappingURL=formatters-CxrdwABk.js.map
