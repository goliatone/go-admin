function u(e, t, r = {}) {
  const n = typeof e == "string" ? e.trim() : "";
  if (!n) return t;
  try {
    return JSON.parse(n);
  } catch (o) {
    return r.onError?.(o), t;
  }
}
function c(e, t, r = {}) {
  const n = u(e, null, r);
  return Array.isArray(n) ? n : t;
}
function a(e, t = null, r = {}) {
  return u((r.root ?? document).getElementById(e)?.textContent, t, r);
}
function l(e, t = null, r = {}) {
  return u((r.root ?? document).querySelector(e)?.textContent, t, r);
}
export {
  c as parseJSONArray,
  u as parseJSONValue,
  a as readJSONScriptValue,
  l as readJSONSelectorValue
};

//# sourceMappingURL=json-parse.js.map