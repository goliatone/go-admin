var b = {
  profile: "none",
  capability_mode: "none",
  supported_profiles: [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full"
  ],
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
], j = [
  "idle",
  "selected",
  "uploading",
  "validated",
  "error"
], A = [
  "missing_linkage",
  "duplicate_row",
  "stale_source_hash"
];
function u(s) {
  if (typeof s != "string") return "none";
  const e = s.toLowerCase().trim();
  return [
    "none",
    "core",
    "core+exchange",
    "core+queue",
    "full"
  ].includes(e) ? e : "none";
}
function g(s) {
  if (!s || typeof s != "object") return null;
  const e = s;
  return {
    enabled: e.enabled === !0,
    reason: typeof e.reason == "string" ? e.reason : void 0,
    reason_code: typeof e.reason_code == "string" ? e.reason_code : void 0,
    permission: typeof e.permission == "string" ? e.permission : void 0
  };
}
function v(s) {
  if (typeof s == "boolean") return {
    enabled: s,
    visible: s,
    entry: { enabled: s },
    actions: {}
  };
  if (!s || typeof s != "object") return {
    enabled: !1,
    visible: !1,
    entry: { enabled: !1 },
    actions: {}
  };
  const e = s, o = e.enabled === !0, n = g(e.entry), t = typeof e.visible == "boolean" ? e.visible : o && (n ? n.enabled : !0), r = e.actions && typeof e.actions == "object" ? e.actions : {}, i = {};
  for (const [d, f] of Object.entries(r)) {
    const a = g(f);
    a && (i[d] = a);
  }
  return {
    enabled: o,
    visible: t,
    entry: n ?? { enabled: o },
    actions: i
  };
}
function w(s) {
  if (!s || typeof s != "object") return {};
  const e = s, o = {};
  for (const [n, t] of Object.entries(e)) {
    const r = typeof t == "string" ? t.trim() : "";
    r && (o[n] = r);
  }
  return o;
}
function k(s) {
  if (!s || typeof s != "object") return { ...b };
  const e = s, o = typeof e.modules == "object" && e.modules ? e.modules : {}, n = typeof e.features == "object" && e.features ? e.features : {};
  return {
    profile: u(e.profile ?? e.capability_mode),
    capability_mode: u(e.capability_mode ?? e.profile),
    supported_profiles: Array.isArray(e.supported_profiles) ? e.supported_profiles.map(u).filter((t, r, i) => i.indexOf(t) === r) : [...b.supported_profiles],
    schema_version: typeof e.schema_version == "number" ? e.schema_version : 1,
    modules: {
      exchange: v(o.exchange),
      queue: v(o.queue)
    },
    features: {
      cms: typeof n.cms == "boolean" ? n.cms : !1,
      dashboard: typeof n.dashboard == "boolean" ? n.dashboard : !1
    },
    routes: w(e.routes),
    panels: Array.isArray(e.panels) ? e.panels.filter((t) => typeof t == "string") : [],
    resolver_keys: Array.isArray(e.resolver_keys) ? e.resolver_keys.filter((t) => typeof t == "string") : [],
    warnings: Array.isArray(e.warnings) ? e.warnings.filter((t) => typeof t == "string") : [],
    contracts: typeof e.contracts == "object" && e.contracts ? e.contracts : void 0
  };
}
function h(s) {
  if (!s || typeof s != "object") return null;
  const e = s, o = typeof e.kind == "string" && y.includes(e.kind) ? e.kind : "export", n = typeof e.status == "string" && _.includes(e.status) ? e.status : "failed", t = e.progress && typeof e.progress == "object" ? e.progress : {}, r = e.actor && typeof e.actor == "object" ? e.actor : void 0, i = e.file && typeof e.file == "object" ? e.file : void 0, d = e.downloads && typeof e.downloads == "object" ? e.downloads : e.result && typeof e.result == "object" ? e.result.downloads ?? void 0 : void 0, f = {};
  if (d && typeof d == "object") for (const [l, p] of Object.entries(d)) {
    if (!p || typeof p != "object") continue;
    const c = p, m = typeof c.href == "string" ? c.href : "";
    m && (f[l] = {
      kind: typeof c.kind == "string" ? c.kind : l,
      label: typeof c.label == "string" ? c.label : "Download artifact",
      filename: typeof c.filename == "string" ? c.filename : `${l}.dat`,
      content_type: typeof c.content_type == "string" ? c.content_type : "application/octet-stream",
      href: m
    });
  }
  const a = e.retention && typeof e.retention == "object" ? e.retention : void 0;
  return {
    id: typeof e.id == "string" ? e.id : "",
    kind: o,
    status: n,
    poll_endpoint: typeof e.poll_endpoint == "string" ? e.poll_endpoint : "",
    progress: {
      total: typeof t.total == "number" ? t.total : void 0,
      processed: typeof t.processed == "number" ? t.processed : 0,
      succeeded: typeof t.succeeded == "number" ? t.succeeded : 0,
      failed: typeof t.failed == "number" ? t.failed : 0,
      conflicts: typeof t.conflicts == "number" ? t.conflicts : void 0,
      skipped: typeof t.skipped == "number" ? t.skipped : void 0
    },
    actor: r && typeof r.id == "string" ? {
      id: r.id,
      label: typeof r.label == "string" ? r.label : void 0
    } : void 0,
    file: i ? {
      name: typeof i.name == "string" ? i.name : void 0,
      format: typeof i.format == "string" ? i.format : void 0,
      row_count: typeof i.row_count == "number" ? i.row_count : void 0
    } : void 0,
    summary: typeof e.summary == "object" && e.summary ? e.summary : void 0,
    downloads: Object.keys(f).length > 0 ? f : void 0,
    fixture: e.fixture === !0,
    request_hash: typeof e.request_hash == "string" ? e.request_hash : void 0,
    request: typeof e.request == "object" && e.request ? e.request : void 0,
    result: typeof e.result == "object" && e.result ? e.result : void 0,
    retention: a ? {
      hard_delete_supported: a.hard_delete_supported === !0,
      hard_delete_path: typeof a.hard_delete_path == "string" ? a.hard_delete_path : void 0,
      download_kinds: Array.isArray(a.download_kinds) ? a.download_kinds.filter((l) => typeof l == "string" && !!l) : void 0,
      artifact_count: typeof a.artifact_count == "number" ? a.artifact_count : void 0,
      retained: a.retained === !0
    } : void 0,
    request_id: typeof e.request_id == "string" ? e.request_id : void 0,
    trace_id: typeof e.trace_id == "string" ? e.trace_id : void 0,
    error: typeof e.error == "string" ? e.error : void 0,
    created_at: typeof e.created_at == "string" ? e.created_at : void 0,
    updated_at: typeof e.updated_at == "string" ? e.updated_at : void 0
  };
}
function x(s) {
  const e = s && typeof s == "object" ? s : {}, o = e.history && typeof e.history == "object" ? e.history : {}, n = e.meta && typeof e.meta == "object" ? e.meta : {};
  return {
    history: {
      items: (Array.isArray(o.items) ? o.items : []).map((t) => h(t)).filter((t) => t !== null),
      page: typeof o.page == "number" ? o.page : 1,
      per_page: typeof o.per_page == "number" ? o.per_page : 20,
      total: typeof o.total == "number" ? o.total : 0,
      has_more: o.has_more === !0,
      counts: typeof o.counts == "object" && o.counts ? o.counts : void 0
    },
    meta: {
      job_kinds: Array.isArray(n.job_kinds) ? n.job_kinds.map((t) => typeof t == "string" && y.includes(t) ? t : null).filter((t) => t !== null) : [...y],
      job_statuses: Array.isArray(n.job_statuses) ? n.job_statuses.map((t) => typeof t == "string" && _.includes(t) ? t : null).filter((t) => t !== null) : [..._],
      download_kinds: Array.isArray(n.download_kinds) ? n.download_kinds.filter((t) => typeof t == "string" && !!t) : [],
      retention_fields: Array.isArray(n.retention_fields) ? n.retention_fields.filter((t) => typeof t == "string" && !!t) : void 0,
      include_examples: n.include_examples === !0
    }
  };
}
function T(s) {
  const e = s && typeof s == "object" ? s : {}, o = e.summary && typeof e.summary == "object" ? e.summary : {}, n = Array.isArray(e.results) ? e.results : [];
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
    results: n.map((t) => {
      const r = t && typeof t == "object" ? t : {}, i = r.conflict && typeof r.conflict == "object" ? r.conflict : void 0, d = i && typeof i.type == "string" && A.includes(i.type) ? i.type : void 0;
      return {
        index: typeof r.index == "number" ? r.index : 0,
        resource: typeof r.resource == "string" ? r.resource : "",
        entity_id: typeof r.entity_id == "string" ? r.entity_id : "",
        family_id: typeof r.family_id == "string" ? r.family_id : "",
        target_locale: typeof r.target_locale == "string" ? r.target_locale : "",
        field_path: typeof r.field_path == "string" ? r.field_path : "",
        status: r.status === "success" || r.status === "error" || r.status === "conflict" || r.status === "skipped" ? r.status : "error",
        error: typeof r.error == "string" ? r.error : void 0,
        conflict: d ? {
          type: d,
          message: typeof i?.message == "string" ? i.message : void 0,
          current_source_hash: typeof i?.current_source_hash == "string" ? i.current_source_hash : void 0,
          provided_source_hash: typeof i?.provided_source_hash == "string" ? i.provided_source_hash : void 0
        } : void 0,
        metadata: typeof r.metadata == "object" && r.metadata ? r.metadata : void 0
      };
    }),
    total_rows: typeof e.total_rows == "number" ? e.total_rows : void 0,
    conflicts: typeof e.conflicts == "object" && e.conflicts ? e.conflicts : void 0,
    job: h(e.job) ?? void 0
  };
}
function E(s) {
  const e = s && typeof s == "object" ? s : {}, o = typeof e.state == "string" && j.includes(e.state) ? e.state : "idle", n = e.format === "csv" || e.format === "json" ? e.format : void 0;
  return {
    state: o,
    filename: typeof e.filename == "string" ? e.filename : void 0,
    format: n,
    row_count: typeof e.row_count == "number" ? e.row_count : void 0,
    message: typeof e.message == "string" ? e.message : void 0
  };
}
export {
  h as a,
  x as i,
  g as n,
  E as o,
  k as r,
  T as s,
  b as t
};

//# sourceMappingURL=translation-contracts-Ct_EG7JJ.js.map