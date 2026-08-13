function y(t, o, i) {
  return t == null || t === "" ? o : i === "__ORIGINAL__" ? String(t) : i;
}
function p(t) {
  if (t == null || t === "") return null;
  const o = t instanceof Date ? t : new Date(t);
  return Number.isNaN(o.getTime()) ? null : o;
}
function $(t, o = {}) {
  const { emptyFallback: i = "", invalidFallback: l = "__ORIGINAL__" } = o, e = p(t);
  return e ? new Intl.DateTimeFormat(void 0, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(e) : y(t, i, l);
}
function k(t, o = {}) {
  return F(t, {
    ...o,
    pastImmediateLabel: "just now"
  });
}
function F(t, o = {}) {
  const { emptyFallback: i = "", invalidFallback: l = "__ORIGINAL__", allowFuture: e = !1, pastImmediateLabel: d = "just now", futureImmediateLabel: s = "soon" } = o, r = p(t);
  if (!r) return y(t, i, l);
  const a = e ? r.getTime() - Date.now() : Date.now() - r.getTime(), n = e && a > 0, h = Math.floor((e ? Math.abs(a) : a) / 1e3), u = Math.floor(h / 60), c = Math.floor(u / 60), m = Math.floor(c / 24);
  return h < 60 ? n ? s : d : u < 60 ? n ? `in ${u}m` : `${u}m ago` : c < 24 ? n ? `in ${c}h` : `${c}h ago` : m < 7 ? n ? `in ${m}d` : `${m}d ago` : r.toLocaleDateString();
}
function L(t, o = {}) {
  const { emptyFallback: i = "", invalidFallback: l = "__ORIGINAL__", locale: e, numeric: d = "auto", direction: s = "bidirectional", maxRelativeDays: r } = o, a = p(t);
  if (!a) return y(t, i, l);
  const n = s === "past-only" ? Date.now() - a.getTime() : a.getTime() - Date.now(), h = Math.floor(n / 1e3), u = Math.floor(h / 60), c = Math.floor(u / 60), m = Math.floor(c / 24), f = new Intl.RelativeTimeFormat(e, { numeric: d });
  if (s === "past-only") {
    if (h < 60) return "just now";
    if (u < 60) return f.format(-u, "minute");
    if (c < 24) return f.format(-c, "hour");
    if (m < 7) return f.format(-m, "day");
    if (typeof r == "number" && m < r) {
      const T = Math.floor(m / 7);
      return f.format(-T, "week");
    }
    return a.toLocaleDateString();
  }
  const M = Math.abs(n), w = 1e3, D = 60 * w, g = 60 * D, b = 24 * g, _ = 30 * b, I = 365 * b;
  return M < D ? f.format(Math.round(n / w), "second") : M < g ? f.format(Math.round(n / D), "minute") : M < b ? f.format(Math.round(n / g), "hour") : M < _ ? f.format(Math.round(n / b), "day") : M < I ? f.format(Math.round(n / _), "month") : f.format(Math.round(n / I), "year");
}
function R(t, o = {}) {
  const { emptyFallback: i = "unknown", invalidFallback: l = "Invalid Date" } = o, e = p(t);
  if (!e) return y(t, i, l);
  const d = Date.now() - e.getTime(), s = Math.floor(d / 6e4), r = Math.floor(d / 36e5), a = Math.floor(r / 24);
  return s < 1 ? "just now" : s < 60 ? `${s} minute${s !== 1 ? "s" : ""} ago` : r < 24 ? `${r} hour${r !== 1 ? "s" : ""} ago` : a < 7 ? `${a} day${a !== 1 ? "s" : ""} ago` : e.toLocaleDateString();
}
export {
  $ as formatAbsoluteDateTime,
  F as formatRelativeTimeCompact,
  k as formatRelativeTimeCompactPast,
  L as formatRelativeTimeNatural,
  R as formatRelativeTimeVerbosePast,
  p as parseTimeValue
};

//# sourceMappingURL=time-formatters.js.map