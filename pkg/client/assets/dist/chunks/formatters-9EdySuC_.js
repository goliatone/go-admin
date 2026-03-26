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
    const r = {
      dateStyle: "short",
      timeStyle: "short"
    };
    return e.toLocaleString(void 0, n || r);
  } catch {
    return String(t);
  }
}
function g(t, n) {
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
function p(t, n) {
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
function h(t) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    if (isNaN(n.getTime())) return "-";
    const e = /* @__PURE__ */ new Date(), r = n.getTime() - e.getTime(), f = Math.round(r / 1e3), o = Math.round(f / 60), a = Math.round(o / 60), c = Math.round(a / 24), i = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(c) >= 1 ? i.format(c, "day") : Math.abs(a) >= 1 ? i.format(a, "hour") : Math.abs(o) >= 1 ? i.format(o, "minute") : i.format(f, "second");
  } catch {
    return String(t);
  }
}
function D(t) {
  return t == null ? "0 recipients" : t === 1 ? "1 recipient" : `${t} recipients`;
}
function s(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function T(t) {
  return t ? t.split("_").map((n) => s(n)).join(" ") : "";
}
function S(t, n) {
  return !t || t.length <= n ? t : `${t.slice(0, n - 3)}...`;
}
export {
  m as a,
  d as b,
  g as c,
  p as d,
  h as e,
  u as f,
  D as g,
  s as h,
  T as s,
  S as t
};
//# sourceMappingURL=formatters-9EdySuC_.js.map
