const B = ["B", "KB", "MB", "GB"], f = [0, 1, 1, 1];
function h(e, t = {}) {
  const o = Object.prototype.hasOwnProperty.call(t, "emptyFallback"), b = Object.prototype.hasOwnProperty.call(t, "zeroFallback"), F = Object.prototype.hasOwnProperty.call(t, "invalidFallback"), r = o ? t.emptyFallback : "0 B", y = b ? t.zeroFallback : r, k = F ? t.invalidFallback : r, s = t.unitLabels ?? B, c = t.precisionByUnit ?? f, m = t.trimTrailingZeros ?? !1;
  if (e == null || e === "")
    return r;
  const l = typeof e == "string" ? Number(e) : e;
  if (!Number.isFinite(l) || l < 0)
    return k;
  if (l === 0)
    return y;
  let n = l, a = 0;
  for (; n >= 1024 && a < s.length - 1; )
    n /= 1024, a += 1;
  const p = c[a] ?? c[c.length - 1] ?? 0;
  let i = n.toFixed(p);
  return m && (i = String(Number(i))), `${i} ${s[a]}`;
}
export {
  h as formatByteSize
};
//# sourceMappingURL=size-formatters.js.map
