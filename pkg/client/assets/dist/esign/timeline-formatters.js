function a(t) {
  if (!t) return "-";
  try {
    const e = new Date(t);
    return e.toLocaleDateString() + " at " + e.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return t;
  }
}
function f(t) {
  if (!t) return "";
  try {
    const e = new Date(t), r = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), n = Math.floor(r / 6e4), o = Math.floor(r / 36e5), i = Math.floor(r / 864e5);
    return n < 1 ? "just now" : n < 60 ? `${n}m ago` : o < 24 ? `${o}h ago` : i < 7 ? `${i}d ago` : a(t);
  } catch {
    return t;
  }
}
export {
  f as formatRelativeTime,
  a as formatTimestamp
};

//# sourceMappingURL=timeline-formatters.js.map