function h(t, o, i) {
  return t == null || t === "" ? o : i === "__ORIGINAL__" ? String(t) : i;
}
function M(t) {
  if (t == null || t === "") return null;
  const o = t instanceof Date ? t : new Date(t);
  return Number.isNaN(o.getTime()) ? null : o;
}
function I(t, o = {}) {
  const {
    emptyFallback: i = "",
    invalidFallback: c = "__ORIGINAL__"
  } = o, n = M(t);
  return n ? new Intl.DateTimeFormat(void 0, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(n) : h(t, i, c);
}
function F(t, o = {}) {
  const {
    emptyFallback: i = "",
    invalidFallback: c = "__ORIGINAL__"
  } = o, n = M(t);
  if (!n) return h(t, i, c);
  const u = Date.now() - n.getTime(), f = Math.floor(u / 1e3), e = Math.floor(f / 60), r = Math.floor(e / 60), a = Math.floor(r / 24);
  return f < 60 ? "just now" : e < 60 ? `${e}m ago` : r < 24 ? `${r}h ago` : a < 7 ? `${a}d ago` : n.toLocaleDateString();
}
function R(t, o = {}) {
  const {
    emptyFallback: i = "",
    invalidFallback: c = "__ORIGINAL__",
    locale: n,
    numeric: u = "auto",
    direction: f = "bidirectional",
    maxRelativeDays: e
  } = o, r = M(t);
  if (!r) return h(t, i, c);
  const a = f === "past-only" ? Date.now() - r.getTime() : r.getTime() - Date.now(), g = Math.floor(a / 1e3), y = Math.floor(g / 60), D = Math.floor(y / 60), m = Math.floor(D / 24), s = new Intl.RelativeTimeFormat(n, { numeric: u });
  if (f === "past-only") {
    if (g < 60) return "just now";
    if (y < 60) return s.format(-y, "minute");
    if (D < 24) return s.format(-D, "hour");
    if (m < 7) return s.format(-m, "day");
    if (typeof e == "number" && m < e) {
      const k = Math.floor(m / 7);
      return s.format(-k, "week");
    }
    return r.toLocaleDateString();
  }
  const l = Math.abs(a), p = 1e3, _ = 60 * p, b = 60 * _, d = 24 * b, w = 30 * d, T = 365 * d;
  return l < _ ? s.format(Math.round(a / p), "second") : l < b ? s.format(Math.round(a / _), "minute") : l < d ? s.format(Math.round(a / b), "hour") : l < w ? s.format(Math.round(a / d), "day") : l < T ? s.format(Math.round(a / w), "month") : s.format(Math.round(a / T), "year");
}
function $(t, o = {}) {
  const {
    emptyFallback: i = "unknown",
    invalidFallback: c = "Invalid Date"
  } = o, n = M(t);
  if (!n) return h(t, i, c);
  const u = Date.now() - n.getTime(), f = Math.floor(u / 6e4), e = Math.floor(u / 36e5), r = Math.floor(e / 24);
  return f < 1 ? "just now" : f < 60 ? `${f} minute${f !== 1 ? "s" : ""} ago` : e < 24 ? `${e} hour${e !== 1 ? "s" : ""} ago` : r < 7 ? `${r} day${r !== 1 ? "s" : ""} ago` : n.toLocaleDateString();
}
export {
  I as formatAbsoluteDateTime,
  F as formatRelativeTimeCompactPast,
  R as formatRelativeTimeNatural,
  $ as formatRelativeTimeVerbosePast,
  M as parseTimeValue
};
//# sourceMappingURL=time-formatters.js.map
