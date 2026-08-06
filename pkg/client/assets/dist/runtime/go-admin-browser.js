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
    return "";
  }
  function resolveRequestMethod(input, options) {
    if (typeof options.method === "string" && options.method.trim()) {
      return options.method;
    }
    if (typeof Request !== "undefined" && input instanceof Request) {
      return input.method;
    }
    return "GET";
  }
  function resolveRequestHeaders(input, headers) {
    if (headers !== void 0) {
      return new Headers(headers);
    }
    if (typeof Request !== "undefined" && input instanceof Request) {
      return new Headers(input.headers);
    }
    return new Headers();
  }
  function isSameOriginRequest(input) {
    const target = resolveRequestURL(input).trim();
    if (!target) {
      return false;
    }
    if (typeof location === "undefined" || !location?.origin) {
      return !/^(?:[a-zA-Z][a-zA-Z\d+\-.]*:|[/\\]{2})/.test(target);
    }
    try {
      const base = typeof location.href === "string" && location.href ? location.href : `${location.origin}/`;
      return new URL(target, base).origin === location.origin;
    } catch {
      return false;
    }
  }
  function appendCSRFHeader(input, options, headers) {
    if (!isUnsafeMethod(resolveRequestMethod(input, options)) || headers.has("X-CSRF-Token") || !isSameOriginRequest(input)) {
      return;
    }
    const token = readCSRFToken();
    if (token) {
      headers.set("X-CSRF-Token", token);
    }
  }
  async function httpRequestWith(fetchImpl, input, options = {}) {
    const {
      json,
      idempotencyKey,
      accept,
      headers,
      ...rest
    } = options;
    const mergedHeaders = resolveRequestHeaders(input, headers);
    if (accept) {
      mergedHeaders.set("Accept", accept);
    } else if (!mergedHeaders.has("Accept")) {
      mergedHeaders.set("Accept", "application/json");
    }
    if (idempotencyKey && idempotencyKey.trim()) {
      mergedHeaders.set("X-Idempotency-Key", idempotencyKey.trim());
    }
    if (json !== void 0) {
      if (!mergedHeaders.has("Content-Type")) {
        mergedHeaders.set("Content-Type", "application/json");
      }
      rest.body = JSON.stringify(json);
    }
    appendCSRFHeader(input, rest, mergedHeaders);
    return fetchImpl(input, {
      ...rest,
      headers: mergedHeaders
    });
  }

  // src/shared/transport/browser-globals.ts
  function goAdminCSRFHeaders(headers) {
    const merged = new Headers(headers || {});
    const token = readCSRFToken();
    if (token && !merged.has("X-CSRF-Token")) {
      merged.set("X-CSRF-Token", token);
    }
    return merged;
  }
  function goAdminFetch(input, init) {
    return httpRequestWith(fetch.bind(globalThis), input, init);
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
