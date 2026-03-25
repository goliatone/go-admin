var f = /* @__PURE__ */ new Set([
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
]);
function u() {
  return typeof document > "u" || !document?.querySelector ? "" : document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")?.trim() || "";
}
function d(e) {
  const r = String(e || "GET").trim().toUpperCase() || "GET";
  return f.has(r);
}
function m(e) {
  if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(e)) return !0;
  if (typeof location > "u" || !location?.origin) return !1;
  try {
    return new URL(e, location.origin).origin === location.origin;
  } catch {
    return !1;
  }
}
function p(e, r, t) {
  if (!d(r.method) || t.has("X-CSRF-Token") || !m(e)) return;
  const o = u();
  o && t.set("X-CSRF-Token", o);
}
async function y(e, r = {}) {
  const { json: t, idempotencyKey: o, accept: a, headers: s, ...i } = r, n = new Headers(s || {});
  a ? n.set("Accept", a) : n.has("Accept") || n.set("Accept", "application/json"), o && o.trim() && n.set("X-Idempotency-Key", o.trim());
  let c = i.body;
  return t !== void 0 && (n.has("Content-Type") || n.set("Content-Type", "application/json"), c = JSON.stringify(t)), p(e, i, n), fetch(e, {
    ...i,
    headers: n,
    body: c
  });
}
async function l(e, r = "Request failed") {
  try {
    const t = await e.text();
    if (t && t.trim()) return t.trim();
  } catch {
  }
  return `${r}: ${e.status}`;
}
export {
  l as n,
  y as t
};

//# sourceMappingURL=http-client-D9Z2A1Pg.js.map