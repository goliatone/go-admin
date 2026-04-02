import { readCSRFToken as t, appendCSRFHeader as d } from "./http-client.js";
function s(e) {
  return typeof e == "string" ? e : e instanceof URL ? e.toString() : typeof Request < "u" && e instanceof Request || e && typeof e == "object" && "url" in e && typeof e.url == "string" ? e.url : "";
}
function f(e, r) {
  return typeof r?.method == "string" && r.method.trim() ? r.method : typeof Request < "u" && e instanceof Request || e && typeof e == "object" && "method" in e && typeof e.method == "string" ? e.method : "GET";
}
function a(e, r) {
  return r?.headers ? new Headers(r.headers) : typeof Request < "u" && e instanceof Request ? new Headers(e.headers) : e && typeof e == "object" && "headers" in e && e.headers ? new Headers(e.headers) : new Headers();
}
function c(e) {
  const r = new Headers(e || {}), o = t();
  return o && !r.has("X-CSRF-Token") && r.set("X-CSRF-Token", o), r;
}
function h(e, r) {
  const o = r ? { ...r } : {}, n = a(e, o);
  return d(s(e), { method: f(e, o) }, n), o.headers = n, fetch(e, o);
}
function R(e = window) {
  return e.goAdminGetCSRFToken = t, e.goAdminCSRFHeaders = c, e.goAdminFetch = h, e;
}
typeof window < "u" && typeof fetch == "function" && R(window);
export {
  c as goAdminCSRFHeaders,
  h as goAdminFetch,
  R as installBrowserCSRFGlobals
};
//# sourceMappingURL=browser-globals.js.map
