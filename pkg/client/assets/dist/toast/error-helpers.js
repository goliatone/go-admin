async function p(t) {
  const e = t.headers.get("content-type") || "", r = e.includes("application/json") || e.includes("application/problem+json"), s = await t.clone().text().catch(() => ""), n = {
    textCode: null,
    message: `Request failed (${t.status})`,
    metadata: null,
    fields: null,
    validationErrors: null
  };
  if (!s)
    return n;
  if (r || s.trim().startsWith("{"))
    try {
      const o = JSON.parse(s);
      if (o.error && typeof o.error == "object") {
        const a = o.error;
        if (typeof a.text_code == "string" && (n.textCode = a.text_code), typeof a.message == "string" && a.message.trim() && (n.message = a.message.trim()), a.metadata && typeof a.metadata == "object" && (n.metadata = a.metadata), Array.isArray(a.validation_errors)) {
          const c = [], l = {};
          for (const f of a.validation_errors) {
            if (!f || typeof f != "object") continue;
            const u = f.field, d = f.message;
            typeof u == "string" && typeof d == "string" && (c.push({ field: u, message: d }), l[u] = d);
          }
          c.length > 0 && (n.validationErrors = c, n.fields = l);
        }
        if (n.metadata?.fields && typeof n.metadata.fields == "object" && !Array.isArray(n.metadata.fields)) {
          const c = n.metadata.fields;
          n.fields || (n.fields = {});
          for (const [l, f] of Object.entries(c))
            typeof f == "string" && (n.fields[l] = f);
        }
        return n;
      }
      if (typeof o.error == "string" && o.error.trim())
        return n.message = o.error.trim(), n;
      if (typeof o.detail == "string" && o.detail.trim())
        return n.message = o.detail.trim(), n;
      if (typeof o.title == "string" && o.title.trim())
        return n.message = o.title.trim(), n;
      if (typeof o.message == "string" && o.message.trim())
        return n.message = o.message.trim(), n;
    } catch {
    }
  if (s.includes("go-users:")) {
    const o = s.match(/go-users:\s*([^|]+)/);
    if (o)
      return n.message = o[1].trim(), n;
  }
  const i = s.match(/\|\s*([^|]+)$/);
  return i ? (n.message = i[1].trim(), n) : (s.trim().length > 0 && s.length < 200 && (n.message = s.trim()), n);
}
function R(t) {
  if (t.textCode !== "TRANSLATION_MISSING")
    return null;
  const e = t.metadata || {};
  let r = [];
  Array.isArray(e.missing_locales) && (r = e.missing_locales.filter((c) => typeof c == "string"));
  let s = null;
  if (e.missing_fields_by_locale && typeof e.missing_fields_by_locale == "object") {
    s = {};
    const c = e.missing_fields_by_locale;
    for (const [l, f] of Object.entries(c))
      Array.isArray(f) && (s[l] = f.filter((u) => typeof u == "string"));
    Object.keys(s).length === 0 && (s = null);
  }
  const n = typeof e.transition == "string" ? e.transition : null, i = typeof e.entity_type == "string" ? e.entity_type : typeof e.policy_entity == "string" ? e.policy_entity : null, o = typeof e.requested_locale == "string" ? e.requested_locale : null, a = typeof e.environment == "string" ? e.environment : null;
  return {
    missingLocales: r,
    missingFieldsByLocale: s,
    transition: n,
    entityType: i,
    requestedLocale: o,
    environment: a
  };
}
function O(t) {
  return t.textCode === "TRANSLATION_MISSING";
}
function m(t) {
  if (!t || typeof t != "object")
    return {
      success: !1,
      error: {
        textCode: null,
        message: "Invalid response format",
        metadata: null,
        fields: null,
        validationErrors: null
      }
    };
  const e = t;
  if (e.status === "ok") {
    const s = { success: !0 };
    return e.data && typeof e.data == "object" && (s.data = e.data), s;
  }
  if (e.error && typeof e.error == "object") {
    const s = e.error, n = {
      textCode: typeof s.text_code == "string" ? s.text_code : null,
      message: typeof s.message == "string" ? s.message : "Unknown error",
      metadata: s.metadata && typeof s.metadata == "object" ? s.metadata : null,
      fields: null,
      validationErrors: null
    };
    if (Array.isArray(s.validation_errors)) {
      const i = [], o = {};
      for (const a of s.validation_errors) {
        if (!a || typeof a != "object") continue;
        const c = a.field, l = a.message;
        typeof c == "string" && typeof l == "string" && (i.push({ field: c, message: l }), o[c] = l);
      }
      i.length > 0 && (n.validationErrors = i, n.fields = o);
    }
    return { success: !1, error: n };
  }
  let r = "Unknown response format";
  return typeof e.message == "string" ? r = e.message : typeof e.error == "string" && (r = e.error), {
    success: !1,
    error: {
      textCode: null,
      message: r,
      metadata: null,
      fields: null,
      validationErrors: null
    }
  };
}
function y(t) {
  return {
    textCode: null,
    message: t instanceof Error ? t.message : "Network error",
    metadata: null,
    fields: null,
    validationErrors: null
  };
}
async function g(t) {
  const e = await t.text().catch(() => "");
  if (e.trim())
    try {
      const r = JSON.parse(e);
      if (r && typeof r == "object" && !Array.isArray(r))
        return r;
    } catch {
    }
}
async function _(t, e, r) {
  try {
    const s = await fetch(t, e);
    return s.ok ? r ? { ...await r(s), status: s.status } : { success: !0, data: await g(s), status: s.status } : { success: !1, error: await p(s), status: s.status };
  } catch (s) {
    return {
      success: !1,
      error: y(s),
      status: 0
    };
  }
}
function S(t, e = "Request failed", r = !1) {
  const s = new Error(h(t, e));
  return s.structuredError = t, s.handled = r, s;
}
function I(t) {
  if (!t || typeof t != "object")
    return null;
  const e = t.structuredError;
  return !e || typeof e != "object" ? null : e;
}
function T(t) {
  return !!t && typeof t == "object" && t.handled === !0;
}
async function C(t, e, r) {
  const s = await _(t, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    ...r,
    body: JSON.stringify(e)
  }, async (n) => m(await n.json()));
  return s.success ? { success: !0, data: s.data } : { success: !1, error: s.error };
}
async function v(t) {
  const e = t.headers.get("content-type") || "", r = e.includes("application/json") || e.includes("application/problem+json"), s = await t.clone().text().catch(() => "");
  if (s) {
    if (r || s.trim().startsWith("{"))
      try {
        const i = JSON.parse(s);
        if (typeof i.error == "string" && i.error.trim()) return i.error.trim();
        if (i.error && typeof i.error == "object") {
          const o = i.error, a = typeof o.message == "string" ? o.message.trim() : "", c = [];
          if (Array.isArray(o.validation_errors))
            for (const f of o.validation_errors) {
              if (!f || typeof f != "object") continue;
              const u = f.field, d = f.message;
              typeof u == "string" && typeof d == "string" && c.push(`${u}: ${d}`);
            }
          const l = o.metadata;
          if (l && typeof l == "object") {
            const f = l.fields;
            if (f && typeof f == "object" && !Array.isArray(f))
              for (const [u, d] of Object.entries(f))
                typeof d == "string" && c.push(`${u}: ${d}`);
          }
          if (c.length > 0)
            return `${a && a.toLowerCase() !== "validation failed" ? `${a}: ` : "Validation failed: "}${c.join("; ")}`;
          if (a) return a;
        }
        if (typeof i.detail == "string" && i.detail.trim()) return i.detail.trim();
        if (typeof i.title == "string" && i.title.trim()) return i.title.trim();
        if (typeof i.message == "string" && i.message.trim()) return i.message.trim();
      } catch {
      }
    if (s.includes("go-users:")) {
      const i = s.match(/go-users:\s*([^|]+)/);
      if (i) return i[1].trim();
    }
    const n = s.match(/\|\s*([^|]+)$/);
    if (n) return n[1].trim();
    if (s.trim().length > 0 && s.length < 200) return s.trim();
  }
  return `Request failed (${t.status})`;
}
function N(t) {
  return t instanceof Error ? t.message : typeof t == "string" ? t : "An unexpected error occurred";
}
function h(t, e = "Request failed") {
  const r = (t.message || "").trim() || e, s = [], n = /* @__PURE__ */ new Set(), i = (a, c) => {
    const l = a.trim(), f = c.trim();
    if (!l || !f) return;
    const u = `${l}: ${f}`;
    n.has(u) || (n.add(u), s.push(u));
  };
  if (t.fields)
    for (const [a, c] of Object.entries(t.fields))
      typeof c == "string" && i(a, c);
  if (t.metadata?.fields && typeof t.metadata.fields == "object" && !Array.isArray(t.metadata.fields))
    for (const [a, c] of Object.entries(t.metadata.fields))
      typeof c == "string" && i(a, c);
  const o = s.length > 0 ? `: ${s.join("; ")}` : "";
  return t.textCode && !r.includes(t.textCode) ? `${t.textCode}: ${r}${o}` : `${r}${o}`;
}
function b(t) {
  const e = [
    "IMPORT_VALIDATION_FAILED",
    "IMPORT_CONFLICT",
    "IMPORT_LINKAGE_ERROR",
    "IMPORT_UNSUPPORTED_FORMAT",
    "IMPORT_STALE_SOURCE",
    "EXPORT_FAILED",
    "EXCHANGE_PERMISSION_DENIED"
  ];
  return t.textCode !== null && e.includes(t.textCode);
}
function $(t) {
  if (!b(t))
    return null;
  const e = t.metadata || {}, r = {
    code: t.textCode,
    message: t.message,
    resource: typeof e.resource == "string" ? e.resource : void 0,
    metadata: e
  };
  if (e.import_result && typeof e.import_result == "object") {
    const s = e.import_result;
    r.importResult = j(s);
  }
  return r;
}
function j(t) {
  const e = {
    summary: {
      processed: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      skipped: 0
    },
    results: [],
    truncated: !1
  };
  if (t.summary && typeof t.summary == "object") {
    const r = t.summary;
    e.summary = {
      processed: typeof r.processed == "number" ? r.processed : 0,
      succeeded: typeof r.succeeded == "number" ? r.succeeded : 0,
      failed: typeof r.failed == "number" ? r.failed : 0,
      conflicts: typeof r.conflicts == "number" ? r.conflicts : 0,
      skipped: typeof r.skipped == "number" ? r.skipped : 0
    };
  }
  return Array.isArray(t.results) && (e.results = t.results.filter((r) => r !== null && typeof r == "object").map((r) => x(r))), typeof t.truncated == "boolean" && (e.truncated = t.truncated), typeof t.total_rows == "number" && (e.totalRows = t.total_rows), e;
}
function x(t) {
  const e = {
    index: typeof t.index == "number" ? t.index : 0,
    resource: typeof t.resource == "string" ? t.resource : "",
    entityId: typeof t.entity_id == "string" ? t.entity_id : "",
    translationGroupId: typeof t.translation_group_id == "string" ? t.translation_group_id : "",
    targetLocale: typeof t.target_locale == "string" ? t.target_locale : "",
    fieldPath: typeof t.field_path == "string" ? t.field_path : "",
    status: E(t.status)
  };
  if (typeof t.error == "string" && (e.error = t.error), t.conflict && typeof t.conflict == "object") {
    const r = t.conflict;
    e.conflict = {
      type: A(r.type),
      expectedHash: typeof r.expected_hash == "string" ? r.expected_hash : void 0,
      actualHash: typeof r.actual_hash == "string" ? r.actual_hash : void 0,
      details: typeof r.details == "string" ? r.details : void 0
    };
  }
  return e;
}
function E(t) {
  return t === "success" || t === "error" || t === "conflict" || t === "skipped" ? t : "error";
}
function A(t) {
  return t === "stale_source" || t === "missing_linkage" || t === "duplicate" || t === "invalid_locale" ? t : "missing_linkage";
}
function k(t) {
  return {
    success: t.filter((e) => e.status === "success"),
    error: t.filter((e) => e.status === "error"),
    conflict: t.filter((e) => e.status === "conflict"),
    skipped: t.filter((e) => e.status === "skipped")
  };
}
function M(t, e = "json") {
  if (e === "json") {
    const i = JSON.stringify(t, null, 2);
    return new Blob([i], { type: "application/json" });
  }
  const r = ["index", "resource", "entity_id", "translation_group_id", "target_locale", "field_path", "status", "error", "conflict_type"], s = t.results.map((i) => [
    String(i.index),
    i.resource,
    i.entityId,
    i.translationGroupId,
    i.targetLocale,
    i.fieldPath,
    i.status,
    i.error || "",
    i.conflict?.type || ""
  ]), n = [
    r.join(","),
    ...s.map((i) => i.map((o) => `"${o.replace(/"/g, '""')}"`).join(","))
  ].join(`
`);
  return new Blob([n], { type: "text/csv" });
}
export {
  S as createStructuredActionError,
  C as executeActionRequest,
  _ as executeStructuredRequest,
  v as extractErrorMessage,
  $ as extractExchangeError,
  p as extractStructuredError,
  R as extractTranslationBlocker,
  h as formatStructuredErrorForDisplay,
  M as generateExchangeReport,
  N as getErrorMessage,
  I as getStructuredActionError,
  k as groupRowResultsByStatus,
  b as isExchangeError,
  T as isHandledActionError,
  O as isTranslationBlocker,
  m as parseActionResponse,
  j as parseImportResult
};
//# sourceMappingURL=error-helpers.js.map
