const l = {
  profile: "none",
  capability_mode: "none",
  supported_profiles: ["none", "core", "core+exchange", "core+queue", "full"],
  schema_version: 1,
  modules: {
    exchange: {
      enabled: !1,
      visible: !1,
      entry: { enabled: !1 },
      actions: {}
    },
    queue: {
      enabled: !1,
      visible: !1,
      entry: { enabled: !1 },
      actions: {}
    }
  },
  features: {
    cms: !1,
    dashboard: !1
  },
  routes: {},
  panels: [],
  resolver_keys: [],
  warnings: []
}, y = [
  "export",
  "import_validate",
  "import_apply"
], _ = [
  "running",
  "completed",
  "failed"
], b = [
  "idle",
  "selected",
  "uploading",
  "validated",
  "error"
], m = [
  "missing_linkage",
  "duplicate_row",
  "stale_source_hash"
];
function c(t) {
  if (typeof t != "string") return "none";
  const e = t.toLowerCase().trim();
  return [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full"
  ].includes(e) ? e : "none";
}
function f(t) {
  if (!t || typeof t != "object") return null;
  const e = t;
  return {
    enabled: e.enabled === !0,
    reason: typeof e.reason == "string" ? e.reason : void 0,
    reason_code: typeof e.reason_code == "string" ? e.reason_code : void 0,
    permission: typeof e.permission == "string" ? e.permission : void 0
  };
}
function p(t) {
  if (typeof t == "boolean")
    return {
      enabled: t,
      visible: t,
      entry: { enabled: t },
      actions: {}
    };
  if (!t || typeof t != "object")
    return {
      enabled: !1,
      visible: !1,
      entry: { enabled: !1 },
      actions: {}
    };
  const e = t, o = e.enabled === !0, n = f(e.entry), r = typeof e.visible == "boolean" ? e.visible : o && (n ? n.enabled : !0), s = e.actions && typeof e.actions == "object" ? e.actions : {}, i = {};
  for (const [a, u] of Object.entries(s)) {
    const d = f(u);
    d && (i[a] = d);
  }
  return {
    enabled: o,
    visible: r,
    entry: n ?? { enabled: o },
    actions: i
  };
}
function g(t) {
  if (!t || typeof t != "object")
    return {};
  const e = t, o = {};
  for (const [n, r] of Object.entries(e)) {
    const s = typeof r == "string" ? r.trim() : "";
    s && (o[n] = s);
  }
  return o;
}
function h(t) {
  if (!t || typeof t != "object")
    return { ...l };
  const e = t, o = typeof e.modules == "object" && e.modules ? e.modules : {}, n = typeof e.features == "object" && e.features ? e.features : {};
  return {
    profile: c(e.profile ?? e.capability_mode),
    capability_mode: c(
      e.capability_mode ?? e.profile
    ),
    supported_profiles: Array.isArray(e.supported_profiles) ? e.supported_profiles.map(c).filter((r, s, i) => i.indexOf(r) === s) : [...l.supported_profiles],
    schema_version: typeof e.schema_version == "number" ? e.schema_version : 1,
    modules: {
      exchange: p(o.exchange),
      queue: p(o.queue)
    },
    features: {
      cms: typeof n.cms == "boolean" ? n.cms : !1,
      dashboard: typeof n.dashboard == "boolean" ? n.dashboard : !1
    },
    routes: g(e.routes),
    panels: Array.isArray(e.panels) ? e.panels.filter((r) => typeof r == "string") : [],
    resolver_keys: Array.isArray(e.resolver_keys) ? e.resolver_keys.filter((r) => typeof r == "string") : [],
    warnings: Array.isArray(e.warnings) ? e.warnings.filter((r) => typeof r == "string") : [],
    contracts: typeof e.contracts == "object" && e.contracts ? e.contracts : void 0
  };
}
function v(t) {
  if (!t || typeof t != "object") return null;
  const e = t, o = typeof e.kind == "string" && y.includes(e.kind) ? e.kind : "export", n = typeof e.status == "string" && _.includes(e.status) ? e.status : "failed", r = e.progress && typeof e.progress == "object" ? e.progress : {};
  return {
    id: typeof e.id == "string" ? e.id : "",
    kind: o,
    status: n,
    poll_endpoint: typeof e.poll_endpoint == "string" ? e.poll_endpoint : "",
    progress: {
      total: typeof r.total == "number" ? r.total : void 0,
      processed: typeof r.processed == "number" ? r.processed : 0,
      succeeded: typeof r.succeeded == "number" ? r.succeeded : 0,
      failed: typeof r.failed == "number" ? r.failed : 0,
      conflicts: typeof r.conflicts == "number" ? r.conflicts : void 0,
      skipped: typeof r.skipped == "number" ? r.skipped : void 0
    },
    request: typeof e.request == "object" && e.request ? e.request : void 0,
    result: typeof e.result == "object" && e.result ? e.result : void 0,
    request_id: typeof e.request_id == "string" ? e.request_id : void 0,
    trace_id: typeof e.trace_id == "string" ? e.trace_id : void 0,
    error: typeof e.error == "string" ? e.error : void 0,
    created_at: typeof e.created_at == "string" ? e.created_at : void 0,
    updated_at: typeof e.updated_at == "string" ? e.updated_at : void 0
  };
}
function j(t) {
  const e = t && typeof t == "object" ? t : {}, o = e.summary && typeof e.summary == "object" ? e.summary : {}, n = Array.isArray(e.results) ? e.results : [];
  return {
    summary: {
      processed: typeof o.processed == "number" ? o.processed : 0,
      succeeded: typeof o.succeeded == "number" ? o.succeeded : 0,
      failed: typeof o.failed == "number" ? o.failed : 0,
      conflicts: typeof o.conflicts == "number" ? o.conflicts : void 0,
      skipped: typeof o.skipped == "number" ? o.skipped : void 0,
      partial_success: o.partial_success === !0,
      by_status: typeof o.by_status == "object" && o.by_status ? o.by_status : void 0,
      by_conflict: typeof o.by_conflict == "object" && o.by_conflict ? o.by_conflict : void 0
    },
    results: n.map((r) => {
      const s = r && typeof r == "object" ? r : {}, i = s.conflict && typeof s.conflict == "object" ? s.conflict : void 0, a = i && typeof i.type == "string" && m.includes(
        i.type
      ) ? i.type : void 0;
      return {
        index: typeof s.index == "number" ? s.index : 0,
        resource: typeof s.resource == "string" ? s.resource : "",
        entity_id: typeof s.entity_id == "string" ? s.entity_id : "",
        translation_group_id: typeof s.translation_group_id == "string" ? s.translation_group_id : "",
        target_locale: typeof s.target_locale == "string" ? s.target_locale : "",
        field_path: typeof s.field_path == "string" ? s.field_path : "",
        status: s.status === "success" || s.status === "error" || s.status === "conflict" || s.status === "skipped" ? s.status : "error",
        error: typeof s.error == "string" ? s.error : void 0,
        conflict: a ? {
          type: a,
          message: typeof i?.message == "string" ? i.message : void 0,
          current_source_hash: typeof i?.current_source_hash == "string" ? i.current_source_hash : void 0,
          provided_source_hash: typeof i?.provided_source_hash == "string" ? i.provided_source_hash : void 0
        } : void 0,
        metadata: typeof s.metadata == "object" && s.metadata ? s.metadata : void 0
      };
    }),
    total_rows: typeof e.total_rows == "number" ? e.total_rows : void 0,
    conflicts: typeof e.conflicts == "object" && e.conflicts ? e.conflicts : void 0,
    job: v(e.job) ?? void 0
  };
}
function A(t) {
  const e = t && typeof t == "object" ? t : {}, o = typeof e.state == "string" && b.includes(e.state) ? e.state : "idle", n = e.format === "csv" || e.format === "json" ? e.format : void 0;
  return {
    state: o,
    filename: typeof e.filename == "string" ? e.filename : void 0,
    format: n,
    row_count: typeof e.row_count == "number" ? e.row_count : void 0,
    message: typeof e.message == "string" ? e.message : void 0
  };
}
export {
  l as E,
  A as a,
  j as b,
  f as c,
  h as d,
  v as n
};
//# sourceMappingURL=index-BWO_nnyN.js.map
