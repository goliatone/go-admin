function s(t) {
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
    const r = t instanceof Date ? t : new Date(t);
    return isNaN(r.getTime()) ? "-" : r.toLocaleString(void 0, n || {
      dateStyle: "short",
      timeStyle: "short"
    });
  } catch {
    return String(t);
  }
}
function g(t, n) {
  if (!t) return "-";
  try {
    const r = t instanceof Date ? t : new Date(t);
    return isNaN(r.getTime()) ? "-" : r.toLocaleDateString(void 0, n || { dateStyle: "medium" });
  } catch {
    return String(t);
  }
}
function h(t, n) {
  if (!t) return "-";
  try {
    const r = t instanceof Date ? t : new Date(t);
    return isNaN(r.getTime()) ? "-" : r.toLocaleTimeString(void 0, n || {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return String(t);
  }
}
function p(t) {
  if (!t) return "-";
  try {
    const n = t instanceof Date ? t : new Date(t);
    if (isNaN(n.getTime())) return "-";
    const r = /* @__PURE__ */ new Date(), u = n.getTime() - r.getTime(), a = Math.round(u / 1e3), i = Math.round(a / 60), o = Math.round(i / 60), f = Math.round(o / 24), e = new Intl.RelativeTimeFormat(void 0, { numeric: "auto" });
    return Math.abs(f) >= 1 ? e.format(f, "day") : Math.abs(o) >= 1 ? e.format(o, "hour") : Math.abs(i) >= 1 ? e.format(i, "minute") : e.format(a, "second");
  } catch {
    return String(t);
  }
}
function D(t) {
  return t == null ? "0 recipients" : t === 1 ? "1 recipient" : `${t} recipients`;
}
function c(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function T(t) {
  return t ? t.split("_").map((n) => c(n)).join(" ") : "";
}
function S(t, n) {
  return !t || t.length <= n ? t : `${t.slice(0, n - 3)}...`;
}
export {
  m as a,
  h as c,
  s as i,
  T as l,
  g as n,
  D as o,
  d as r,
  p as s,
  c as t,
  S as u
};

//# sourceMappingURL=formatters-CcW2Edf9.js.map