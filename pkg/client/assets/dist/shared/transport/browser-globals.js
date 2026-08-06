import { httpRequestWith as t, readCSRFToken as i } from "./http-client.js";
function d(n) {
  const e = new Headers(n || {}), o = i();
  return o && !e.has("X-CSRF-Token") && e.set("X-CSRF-Token", o), e;
}
function r(n, e) {
  return t(fetch.bind(globalThis), n, e);
}
function f(n = window) {
  return n.goAdminGetCSRFToken = i, n.goAdminCSRFHeaders = d, n.goAdminFetch = r, n;
}
typeof window < "u" && typeof fetch == "function" && f(window);
export {
  d as goAdminCSRFHeaders,
  r as goAdminFetch,
  f as installBrowserCSRFGlobals
};

//# sourceMappingURL=browser-globals.js.map