function u(t) {
  if (t == null || t === "" || t === 0) return "-";
  const n = typeof t == "string" ? parseInt(t, 10) : t;
  return !Number.isFinite(n) || n <= 0 ? "-" : n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
function m(t) {
  if (!t) return "-";
  const n = typeof t == "string" ? parseInt(t, 10) : t;
  return !Number.isFinite(n) || n <= 0 ? "-" : n === 1 ? "1 page" : `${n} pages`;
}
function d(t, n) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    if (isNaN(e.getTime())) return "-";
    const i = {
      dateStyle: "short",
      timeStyle: "short"
    };
    return e.toLocaleString(void 0, n || i);
  } catch {
    return String(t);
  }
}
function g(t) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    return isNaN(n.getTime()) ? "-" : n.toLocaleDateString() + " " + n.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return String(t);
  }
}
function p(t, n) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    if (isNaN(e.getTime())) return "-";
    const i = {
      dateStyle: "medium"
    };
    return e.toLocaleDateString(void 0, n || i);
  } catch {
    return String(t);
  }
}
function h(t, n) {
  if (!t) return "-";
  try {
    const e = t instanceof Date ? t : new Date(t);
    if (isNaN(e.getTime())) return "-";
    const i = {
      hour: "2-digit",
      minute: "2-digit"
    };
    return e.toLocaleTimeString(void 0, n || i);
  } catch {
    return String(t);
  }
}
function D(t) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    if (isNaN(n.getTime())) return "-";
    const e = /* @__PURE__ */ new Date(), i = n.getTime() - e.getTime(), f = Math.round(i / 1e3), o = Math.round(f / 60), a = Math.round(o / 60), c = Math.round(a / 24), r = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(c) >= 1 ? r.format(c, "day") : Math.abs(a) >= 1 ? r.format(a, "hour") : Math.abs(o) >= 1 ? r.format(o, "minute") : r.format(f, "second");
  } catch {
    return String(t);
  }
}
function T(t) {
  return t == null ? "0 recipients" : t === 1 ? "1 recipient" : `${t} recipients`;
}
function s(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function S(t) {
  return t ? t.split("_").map((n) => s(n)).join(" ") : "";
}
function N(t, n) {
  return !t || t.length <= n ? t : `${t.slice(0, n - 3)}...`;
}
export {
  m as a,
  d as b,
  p as c,
  h as d,
  D as e,
  u as f,
  T as g,
  s as h,
  g as i,
  S as s,
  N as t
};
//# sourceMappingURL=formatters-Bx8onLEN.js.map
