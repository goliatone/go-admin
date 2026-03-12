async function p(s, n = {}) {
  const {
    json: e,
    idempotencyKey: r,
    accept: c,
    headers: o,
    ...i
  } = n, t = new Headers(o || {});
  c ? t.set("Accept", c) : t.has("Accept") || t.set("Accept", "application/json"), r && r.trim() && t.set("X-Idempotency-Key", r.trim());
  let a = i.body;
  return e !== void 0 && (t.has("Content-Type") || t.set("Content-Type", "application/json"), a = JSON.stringify(e)), fetch(s, {
    ...i,
    headers: t,
    body: a
  });
}
async function d(s, n = "Request failed") {
  try {
    const e = await s.text();
    if (e && e.trim())
      return e.trim();
  } catch {
  }
  return `${n}: ${s.status}`;
}
export {
  p as h,
  d as r
};
//# sourceMappingURL=http-client-Dm229xuF.js.map
