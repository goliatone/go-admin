import { escapeHTML as s } from "../shared/html.js";
import { formatByteSize as m } from "../shared/size-formatters.js";
function D(t) {
  return m(t, {
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
function h(t) {
  if (!t) return "-";
  const e = typeof t == "string" ? parseInt(t, 10) : t;
  return !Number.isFinite(e) || e <= 0 ? "-" : e === 1 ? "1 page" : `${e} pages`;
}
function T(t, e) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    return isNaN(n.getTime()) ? "-" : n.toLocaleString(void 0, e || {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return String(t);
  }
}
function S(t) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    return isNaN(e.getTime()) ? "-" : e.toLocaleDateString() + " " + e.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(t);
  }
}
function N(t, e) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    return isNaN(n.getTime()) ? "-" : n.toLocaleDateString(void 0, e || { dateStyle: "medium" });
  } catch {
    return String(t);
  }
}
function p(t, e) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    return isNaN(n.getTime()) ? "-" : n.toLocaleTimeString(void 0, e || {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(t);
  }
}
function y(t) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    if (isNaN(e.getTime())) return "-";
    const n = /* @__PURE__ */ new Date(), i = e.getTime() - n.getTime(), o = Math.round(i / 1e3), r = Math.round(o / 60), f = Math.round(r / 60), c = Math.round(f / 24), a = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(c) >= 1 ? a.format(c, "day") : Math.abs(f) >= 1 ? a.format(f, "hour") : Math.abs(r) >= 1 ? a.format(r, "minute") : a.format(o, "second");
  } catch {
    return String(t);
  }
}
function M(t) {
  const e = String(t ?? "").trim();
  if (!e) return "-";
  const n = t instanceof Date ? t : new Date(e);
  return Number.isNaN(n.getTime()) ? s(e) : s(n.toLocaleString());
}
function w(t) {
  if (!t) return "";
  const e = t instanceof Date ? t : new Date(t);
  if (Number.isNaN(e.getTime())) return "";
  const n = Date.now() - e.getTime(), i = Math.floor(n / 6e4), o = Math.floor(n / 36e5), r = Math.floor(n / 864e5);
  return i < 1 ? "just now" : i < 60 ? `${i}m ago` : o < 24 ? `${o}h ago` : r < 7 ? `${r}d ago` : e.toLocaleDateString();
}
function b(t) {
  if (t)
    try {
      const e = t instanceof Date ? t : new Date(t);
      return Number.isNaN(e.getTime()) ? void 0 : e.toLocaleString();
    } catch {
      return;
    }
}
function L(t) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    return Number.isNaN(e.getTime()) ? "-" : e.toLocaleDateString();
  } catch {
    return String(t);
  }
}
function F(t) {
  return t == null ? "0 recipients" : t === 1 ? "1 recipient" : `${t} recipients`;
}
function u(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function $(t) {
  return t ? t.split("_").map((e) => u(e)).join(" ") : "";
}
function l(t, e) {
  return !t || t.length <= e ? t : `${t.slice(0, e - 3)}...`;
}
export {
  D as a,
  h as c,
  M as d,
  w as f,
  l as h,
  T as i,
  F as l,
  $ as m,
  S as n,
  L as o,
  p,
  N as r,
  b as s,
  u as t,
  y as u
};

//# sourceMappingURL=formatters-oZ3pO-Hk.js.map