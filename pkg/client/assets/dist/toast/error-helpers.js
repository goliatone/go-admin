async function p(t) {
  const e = t.headers.get("content-type") || "", n = e.includes("application/json") || e.includes("application/problem+json"), s = await t.clone().text().catch(() => ""), r = {
    textCode: null,
    message: `Request failed (${t.status})`,
    metadata: null,
    fields: null,
    validationErrors: null
  };
  if (!s)
    return r;
  if (n || s.trim().startsWith("{"))
    try {
      const o = JSON.parse(s);
      if (o.error && typeof o.error == "object") {
        const a = o.error;
        if (typeof a.text_code == "string" && (r.textCode = a.text_code), typeof a.message == "string" && a.message.trim() && (r.message = a.message.trim()), a.metadata && typeof a.metadata == "object" && (r.metadata = a.metadata), Array.isArray(a.validation_errors)) {
          const l = [], f = {};
          for (const c of a.validation_errors) {
            if (!c || typeof c != "object") continue;
            const u = c.field, d = c.message;
            typeof u == "string" && typeof d == "string" && (l.push({ field: u, message: d }), f[u] = d);
          }
          l.length > 0 && (r.validationErrors = l, r.fields = f);
        }
        if (r.metadata?.fields && typeof r.metadata.fields == "object" && !Array.isArray(r.metadata.fields)) {
          const l = r.metadata.fields;
          r.fields || (r.fields = {});
          for (const [f, c] of Object.entries(l))
            typeof c == "string" && (r.fields[f] = c);
        }
        return r;
      }
      if (typeof o.error == "string" && o.error.trim())
        return r.message = o.error.trim(), r;
      if (typeof o.detail == "string" && o.detail.trim())
        return r.message = o.detail.trim(), r;
      if (typeof o.title == "string" && o.title.trim())
        return r.message = o.title.trim(), r;
      if (typeof o.message == "string" && o.message.trim())
        return r.message = o.message.trim(), r;
    } catch {
    }
  if (s.includes("go-users:")) {
    const o = s.match(/go-users:\s*([^|]+)/);
    if (o)
      return r.message = o[1].trim(), r;
  }
  const i = s.match(/\|\s*([^|]+)$/);
  return i ? (r.message = i[1].trim(), r) : (s.trim().length > 0 && s.length < 200 && (r.message = s.trim()), r);
}
function x(t) {
  if (t.textCode !== "TRANSLATION_MISSING")
    return null;
  const e = t.metadata || {};
  let n = [];
  Array.isArray(e.missing_locales) && (n = e.missing_locales.filter((l) => typeof l == "string"));
  let s = null;
  if (e.missing_fields_by_locale && typeof e.missing_fields_by_locale == "object") {
    s = {};
    const l = e.missing_fields_by_locale;
    for (const [f, c] of Object.entries(l))
      Array.isArray(c) && (s[f] = c.filter((u) => typeof u == "string"));
    Object.keys(s).length === 0 && (s = null);
  }
  const r = typeof e.transition == "string" ? e.transition : null, i = typeof e.entity_type == "string" ? e.entity_type : typeof e.policy_entity == "string" ? e.policy_entity : null, o = typeof e.requested_locale == "string" ? e.requested_locale : null, a = typeof e.environment == "string" ? e.environment : null;
  return {
    missingLocales: n,
    missingFieldsByLocale: s,
    transition: r,
    entityType: i,
    requestedLocale: o,
    environment: a
  };
}
function j(t) {
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
    const s = e.error, r = {
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
        const l = a.field, f = a.message;
        typeof l == "string" && typeof f == "string" && (i.push({ field: l, message: f }), o[l] = f);
      }
      i.length > 0 && (r.validationErrors = i, r.fields = o);
    }
    return { success: !1, error: r };
  }
  let n = "Unknown response format";
  return typeof e.message == "string" ? n = e.message : typeof e.error == "string" && (n = e.error), {
    success: !1,
    error: {
      textCode: null,
      message: n,
      metadata: null,
      fields: null,
      validationErrors: null
    }
  };
}
async function A(t, e, n) {
  try {
    const s = await fetch(t, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      ...n,
      body: JSON.stringify(e)
    });
    if (!s.ok)
      return { success: !1, error: await p(s) };
    const r = await s.json();
    return m(r);
  } catch (s) {
    return {
      success: !1,
      error: {
        textCode: null,
        message: s instanceof Error ? s.message : "Network error",
        metadata: null,
        fields: null,
        validationErrors: null
      }
    };
  }
}
async function E(t) {
  const e = t.headers.get("content-type") || "", n = e.includes("application/json") || e.includes("application/problem+json"), s = await t.clone().text().catch(() => "");
  if (s) {
    if (n || s.trim().startsWith("{"))
      try {
        const i = JSON.parse(s);
        if (typeof i.error == "string" && i.error.trim()) return i.error.trim();
        if (i.error && typeof i.error == "object") {
          const o = i.error, a = typeof o.message == "string" ? o.message.trim() : "", l = [];
          if (Array.isArray(o.validation_errors))
            for (const c of o.validation_errors) {
              if (!c || typeof c != "object") continue;
              const u = c.field, d = c.message;
              typeof u == "string" && typeof d == "string" && l.push(`${u}: ${d}`);
            }
          const f = o.metadata;
          if (f && typeof f == "object") {
            const c = f.fields;
            if (c && typeof c == "object" && !Array.isArray(c))
              for (const [u, d] of Object.entries(c))
                typeof d == "string" && l.push(`${u}: ${d}`);
          }
          if (l.length > 0)
            return `${a && a.toLowerCase() !== "validation failed" ? `${a}: ` : "Validation failed: "}${l.join("; ")}`;
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
    const r = s.match(/\|\s*([^|]+)$/);
    if (r) return r[1].trim();
    if (s.trim().length > 0 && s.length < 200) return s.trim();
  }
  return `Request failed (${t.status})`;
}
function R(t) {
  return t instanceof Error ? t.message : typeof t == "string" ? t : "An unexpected error occurred";
}
function y(t) {
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
function O(t) {
  if (!y(t))
    return null;
  const e = t.metadata || {}, n = {
    code: t.textCode,
    message: t.message,
    resource: typeof e.resource == "string" ? e.resource : void 0,
    metadata: e
  };
  if (e.import_result && typeof e.import_result == "object") {
    const s = e.import_result;
    n.importResult = g(s);
  }
  return n;
}
function g(t) {
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
    const n = t.summary;
    e.summary = {
      processed: typeof n.processed == "number" ? n.processed : 0,
      succeeded: typeof n.succeeded == "number" ? n.succeeded : 0,
      failed: typeof n.failed == "number" ? n.failed : 0,
      conflicts: typeof n.conflicts == "number" ? n.conflicts : 0,
      skipped: typeof n.skipped == "number" ? n.skipped : 0
    };
  }
  return Array.isArray(t.results) && (e.results = t.results.filter((n) => n !== null && typeof n == "object").map((n) => _(n))), typeof t.truncated == "boolean" && (e.truncated = t.truncated), typeof t.total_rows == "number" && (e.totalRows = t.total_rows), e;
}
function _(t) {
  const e = {
    index: typeof t.index == "number" ? t.index : 0,
    resource: typeof t.resource == "string" ? t.resource : "",
    entityId: typeof t.entity_id == "string" ? t.entity_id : "",
    translationGroupId: typeof t.translation_group_id == "string" ? t.translation_group_id : "",
    targetLocale: typeof t.target_locale == "string" ? t.target_locale : "",
    fieldPath: typeof t.field_path == "string" ? t.field_path : "",
    status: h(t.status)
  };
  if (typeof t.error == "string" && (e.error = t.error), t.conflict && typeof t.conflict == "object") {
    const n = t.conflict;
    e.conflict = {
      type: b(n.type),
      expectedHash: typeof n.expected_hash == "string" ? n.expected_hash : void 0,
      actualHash: typeof n.actual_hash == "string" ? n.actual_hash : void 0,
      details: typeof n.details == "string" ? n.details : void 0
    };
  }
  return e;
}
function h(t) {
  return t === "success" || t === "error" || t === "conflict" || t === "skipped" ? t : "error";
}
function b(t) {
  return t === "stale_source" || t === "missing_linkage" || t === "duplicate" || t === "invalid_locale" ? t : "missing_linkage";
}
function I(t) {
  return {
    success: t.filter((e) => e.status === "success"),
    error: t.filter((e) => e.status === "error"),
    conflict: t.filter((e) => e.status === "conflict"),
    skipped: t.filter((e) => e.status === "skipped")
  };
}
function T(t, e = "json") {
  if (e === "json") {
    const i = JSON.stringify(t, null, 2);
    return new Blob([i], { type: "application/json" });
  }
  const n = ["index", "resource", "entity_id", "translation_group_id", "target_locale", "field_path", "status", "error", "conflict_type"], s = t.results.map((i) => [
    String(i.index),
    i.resource,
    i.entityId,
    i.translationGroupId,
    i.targetLocale,
    i.fieldPath,
    i.status,
    i.error || "",
    i.conflict?.type || ""
  ]), r = [
    n.join(","),
    ...s.map((i) => i.map((o) => `"${o.replace(/"/g, '""')}"`).join(","))
  ].join(`
`);
  return new Blob([r], { type: "text/csv" });
}
export {
  A as executeActionRequest,
  E as extractErrorMessage,
  O as extractExchangeError,
  p as extractStructuredError,
  x as extractTranslationBlocker,
  T as generateExchangeReport,
  R as getErrorMessage,
  I as groupRowResultsByStatus,
  y as isExchangeError,
  j as isTranslationBlocker,
  m as parseActionResponse,
  g as parseImportResult
};
//# sourceMappingURL=error-helpers.js.map
