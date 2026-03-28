import { escapeHTML as s } from "../shared/html.js";
import { formatByteSize as m } from "../shared/size-formatters.js";
function D(t) {
  return m(t, {
    emptyFallback: "-",
    zeroFallback: "-",
    invalidFallback: "-",
    precisionByUnit: [0, 1, 2, 2]
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
    if (isNaN(n.getTime())) return "-";
    const r = {
      dateStyle: "short",
      timeStyle: "short"
    };
    return n.toLocaleString(void 0, e || r);
  } catch {
    return String(t);
  }
}
function p(t) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    return isNaN(e.getTime()) ? "-" : e.toLocaleDateString() + " " + e.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(t);
  }
}
function S(t, e) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    if (isNaN(n.getTime())) return "-";
    const r = {
      dateStyle: "medium"
    };
    return n.toLocaleDateString(void 0, e || r);
  } catch {
    return String(t);
  }
}
function N(t, e) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    if (isNaN(n.getTime())) return "-";
    const r = {
      hour: "2-digit",
      minute: "2-digit"
    };
    return n.toLocaleTimeString(void 0, e || r);
  } catch {
    return String(t);
  }
}
function y(t) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    if (isNaN(e.getTime())) return "-";
    const n = /* @__PURE__ */ new Date(), r = e.getTime() - n.getTime(), i = Math.round(r / 1e3), o = Math.round(i / 60), a = Math.round(o / 60), c = Math.round(a / 24), f = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(c) >= 1 ? f.format(c, "day") : Math.abs(a) >= 1 ? f.format(a, "hour") : Math.abs(o) >= 1 ? f.format(o, "minute") : f.format(i, "second");
  } catch {
    return String(t);
  }
}
function w(t) {
  const e = String(t ?? "").trim();
  if (!e) return "-";
  const n = t instanceof Date ? t : new Date(e);
  return Number.isNaN(n.getTime()) ? s(e) : s(n.toLocaleString());
}
function M(t) {
  if (!t) return "";
  const e = t instanceof Date ? t : new Date(t);
  if (Number.isNaN(e.getTime())) return "";
  const r = Date.now() - e.getTime(), i = Math.floor(r / 6e4), o = Math.floor(r / 36e5), a = Math.floor(r / 864e5);
  return i < 1 ? "just now" : i < 60 ? `${i}m ago` : o < 24 ? `${o}h ago` : a < 7 ? `${a}d ago` : e.toLocaleDateString();
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
function l(t) {
  return t == null ? "0 recipients" : t === 1 ? "1 recipient" : `${t} recipients`;
}
function u(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function F(t) {
  return t ? t.split("_").map((e) => u(e)).join(" ") : "";
}
function $(t, e) {
  return !t || t.length <= e ? t : `${t.slice(0, e - 3)}...`;
}
export {
  b as a,
  D as b,
  h as c,
  T as d,
  S as e,
  L as f,
  N as g,
  y as h,
  w as i,
  M as j,
  l as k,
  u as l,
  p as m,
  F as s,
  $ as t
};
//# sourceMappingURL=formatters-DYQo8z6P.js.map
