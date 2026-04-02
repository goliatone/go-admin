"use strict";
(() => {
  // src/shared/transport/http-client.ts
  var unsafeMethods = /* @__PURE__ */ new Set(["POST", "PUT", "PATCH", "DELETE"]);
  function readCSRFToken() {
    if (typeof document === "undefined" || !document?.querySelector) {
      return "";
    }
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content")?.trim() || "";
  }
  function isUnsafeMethod(method) {
    const normalized = String(method || "GET").trim().toUpperCase() || "GET";
    return unsafeMethods.has(normalized);
  }
  function isSameOriginRequest(input) {
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(input)) {
      return true;
    }
    if (typeof location === "undefined" || !location?.origin) {
      return false;
    }
    try {
      return new URL(input, location.origin).origin === location.origin;
    } catch {
      return false;
    }
  }
  function appendCSRFHeader(input, options, headers) {
    if (!isUnsafeMethod(options.method) || headers.has("X-CSRF-Token") || !isSameOriginRequest(input)) {
      return;
    }
    const token = readCSRFToken();
    if (token) {
      headers.set("X-CSRF-Token", token);
    }
  }

  // src/shared/transport/browser-globals.ts
  function resolveRequestURL(input) {
    if (typeof input === "string") {
      return input;
    }
    if (input instanceof URL) {
      return input.toString();
    }
    if (typeof Request !== "undefined" && input instanceof Request) {
      return input.url;
    }
    if (input && typeof input === "object" && "url" in input && typeof input.url === "string") {
      return input.url;
    }
    return "";
  }
  function resolveRequestMethod(input, init) {
    if (typeof init?.method === "string" && init.method.trim()) {
      return init.method;
    }
    if (typeof Request !== "undefined" && input instanceof Request) {
      return input.method;
    }
    if (input && typeof input === "object" && "method" in input && typeof input.method === "string") {
      return input.method;
    }
    return "GET";
  }
  function requestHeaders(input, init) {
    if (init?.headers) {
      return new Headers(init.headers);
    }
    if (typeof Request !== "undefined" && input instanceof Request) {
      return new Headers(input.headers);
    }
    if (input && typeof input === "object" && "headers" in input && input.headers) {
      return new Headers(input.headers);
    }
    return new Headers();
  }
  function goAdminCSRFHeaders(headers) {
    const merged = new Headers(headers || {});
    const token = readCSRFToken();
    if (token && !merged.has("X-CSRF-Token")) {
      merged.set("X-CSRF-Token", token);
    }
    return merged;
  }
  function goAdminFetch(input, init) {
    const options = init ? { ...init } : {};
    const headers = requestHeaders(input, options);
    appendCSRFHeader(resolveRequestURL(input), { method: resolveRequestMethod(input, options) }, headers);
    options.headers = headers;
    return fetch(input, options);
  }
  function installBrowserCSRFGlobals(target = window) {
    target.goAdminGetCSRFToken = readCSRFToken;
    target.goAdminCSRFHeaders = goAdminCSRFHeaders;
    target.goAdminFetch = goAdminFetch;
    return target;
  }
  if (typeof window !== "undefined" && typeof fetch === "function") {
    installBrowserCSRFGlobals(window);
  }
})();
