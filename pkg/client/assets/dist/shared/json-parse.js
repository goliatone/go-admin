function u(t, e, r = {}) {
  const n = typeof t == "string" ? t.trim() : "";
  if (!n)
    return e;
  try {
    return JSON.parse(n);
  } catch (o) {
    return r.onError?.(o), e;
  }
}
function c(t, e, r = {}) {
  const n = u(t, null, r);
  return Array.isArray(n) ? n : e;
}
function l(t, e = null, r = {}) {
  const o = (r.root ?? document).getElementById(t);
  return u(o?.textContent, e, r);
}
function a(t, e = null, r = {}) {
  const o = (r.root ?? document).querySelector(t);
  return u(o?.textContent, e, r);
}
export {
  c as parseJSONArray,
  u as parseJSONValue,
  l as readJSONScriptValue,
  a as readJSONSelectorValue
};
//# sourceMappingURL=json-parse.js.map
