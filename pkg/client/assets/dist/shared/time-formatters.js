function p(t, r, e) {
  return t == null || t === "" ? r : e === "__ORIGINAL__" ? String(t) : e;
}
function b(t) {
  if (t == null || t === "") return null;
  const r = t instanceof Date ? t : new Date(t);
  return Number.isNaN(r.getTime()) ? null : r;
}
function k(t, r = {}) {
  const {
    emptyFallback: e = "",
    invalidFallback: s = "__ORIGINAL__"
  } = r, a = b(t);
  return a ? new Intl.DateTimeFormat(void 0, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(a) : p(t, e, s);
}
function F(t, r = {}) {
  const {
    emptyFallback: e = "",
    invalidFallback: s = "__ORIGINAL__"
  } = r, a = b(t);
  if (!a) return p(t, e, s);
  const d = Date.now() - a.getTime(), c = Math.floor(d / 1e3), f = Math.floor(c / 60), i = Math.floor(f / 60), o = Math.floor(i / 24);
  return c < 60 ? "just now" : f < 60 ? `${f}m ago` : i < 24 ? `${i}h ago` : o < 7 ? `${o}d ago` : a.toLocaleDateString();
}
function N(t, r = {}) {
  const {
    emptyFallback: e = "",
    invalidFallback: s = "__ORIGINAL__",
    locale: a,
    numeric: d = "auto",
    direction: c = "bidirectional",
    maxRelativeDays: f
  } = r, i = b(t);
  if (!i) return p(t, e, s);
  const o = c === "past-only" ? Date.now() - i.getTime() : i.getTime() - Date.now(), D = Math.floor(o / 1e3), h = Math.floor(D / 60), M = Math.floor(h / 60), m = Math.floor(M / 24), n = new Intl.RelativeTimeFormat(a, { numeric: d });
  if (c === "past-only") {
    if (D < 60) return "just now";
    if (h < 60) return n.format(-h, "minute");
    if (M < 24) return n.format(-M, "hour");
    if (m < 7) return n.format(-m, "day");
    if (typeof f == "number" && m < f) {
      const T = Math.floor(m / 7);
      return n.format(-T, "week");
    }
    return i.toLocaleDateString();
  }
  const u = Math.abs(o), g = 1e3, y = 60 * g, _ = 60 * y, l = 24 * _, w = 30 * l, I = 365 * l;
  return u < y ? n.format(Math.round(o / g), "second") : u < _ ? n.format(Math.round(o / y), "minute") : u < l ? n.format(Math.round(o / _), "hour") : u < w ? n.format(Math.round(o / l), "day") : u < I ? n.format(Math.round(o / w), "month") : n.format(Math.round(o / I), "year");
}
export {
  k as formatAbsoluteDateTime,
  F as formatRelativeTimeCompactPast,
  N as formatRelativeTimeNatural,
  b as parseTimeValue
};
//# sourceMappingURL=time-formatters.js.map
