async function p(n, s = {}) {
  const { json: e, idempotencyKey: c, accept: i, headers: o, ...r } = s, t = new Headers(o || {});
  i ? t.set("Accept", i) : t.has("Accept") || t.set("Accept", "application/json"), c && c.trim() && t.set("X-Idempotency-Key", c.trim());
  let a = r.body;
  return e !== void 0 && (t.has("Content-Type") || t.set("Content-Type", "application/json"), a = JSON.stringify(e)), fetch(n, {
    ...r,
    headers: t,
    body: a
  });
}
async function d(n, s = "Request failed") {
  try {
    const e = await n.text();
    if (e && e.trim()) return e.trim();
  } catch {
  }
  return `${s}: ${n.status}`;
}
export {
  d as n,
  p as t
};

//# sourceMappingURL=http-client-DiXyH5DW.js.map