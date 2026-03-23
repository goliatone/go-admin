var D = {
  UNKNOWN: "unknown",
  READY: "ready",
  PENDING: "pending",
  FAILED: "failed",
  NOT_APPLICABLE: "not_applicable"
}, O = {
  PENDING_REVIEW: "pending_review",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  SUPERSEDED: "superseded",
  AUTO_LINKED: "auto_linked"
};
function W(r) {
  return Object.values(O).includes(r);
}
var B = {
  COPIED_FROM: "copied_from",
  PREDECESSOR_OF: "predecessor_of",
  SUCCESSOR_OF: "successor_of",
  MIGRATED_FROM: "migrated_from",
  EXACT_DUPLICATE: "exact_duplicate"
}, V = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  EXACT: "exact"
};
function Y(r) {
  return Object.values(D).includes(r);
}
function i(r) {
  return r && typeof r == "object" ? r : {};
}
function n(r) {
  return typeof r == "string" ? r.trim() : "";
}
function t(r) {
  return n(r) || void 0;
}
function a(r) {
  return typeof r == "number" && Number.isFinite(r) ? r : 0;
}
function c(r) {
  return typeof r == "number" && Number.isFinite(r) ? r : void 0;
}
function s(r) {
  return r === !0;
}
function E(r) {
  return Array.isArray(r) ? r.map((e) => n(e)).filter(Boolean) : [];
}
function w(r) {
  if (!(!r || typeof r != "object" || Array.isArray(r)))
    return r;
}
function u(r) {
  const e = i(r), o = n(e.id);
  return o ? {
    id: o,
    label: t(e.label),
    url: t(e.url)
  } : null;
}
function d(r) {
  const e = i(r), o = n(e.id);
  return o ? {
    id: o,
    provider_revision_hint: t(e.provider_revision_hint),
    modified_time: t(e.modified_time),
    exported_at: t(e.exported_at),
    exported_by_user_id: t(e.exported_by_user_id),
    source_mime_type: t(e.source_mime_type)
  } : null;
}
function p(r) {
  const e = i(r), o = n(e.id);
  return o ? {
    id: o,
    artifact_kind: n(e.artifact_kind),
    object_key: t(e.object_key),
    sha256: t(e.sha256),
    page_count: c(e.page_count),
    size_bytes: c(e.size_bytes),
    compatibility_tier: t(e.compatibility_tier),
    compatibility_reason: t(e.compatibility_reason),
    normalization_status: t(e.normalization_status)
  } : null;
}
function y(r) {
  const e = i(r), o = n(e.external_file_id);
  return o ? {
    account_id: n(e.account_id),
    external_file_id: o,
    drive_id: t(e.drive_id),
    web_url: n(e.web_url),
    modified_time: t(e.modified_time),
    source_version_hint: n(e.source_version_hint),
    source_mime_type: n(e.source_mime_type),
    source_ingestion_mode: n(e.source_ingestion_mode),
    title_hint: n(e.title_hint),
    page_count_hint: a(e.page_count_hint),
    owner_email: t(e.owner_email),
    parent_id: t(e.parent_id)
  } : null;
}
function z(r) {
  const e = i(r);
  return {
    status: n(e.status),
    extract_version: t(e.extract_version),
    evidence_available: s(e.evidence_available),
    error_message: t(e.error_message),
    error_code: t(e.error_code)
  };
}
function k(r) {
  const e = i(r);
  return {
    code: n(e.code),
    label: n(e.label),
    details: t(e.details)
  };
}
function g(r) {
  const e = i(r);
  return {
    id: n(e.id),
    relationship_type: n(e.relationship_type),
    status: n(e.status),
    confidence_band: n(e.confidence_band),
    confidence_score: c(e.confidence_score),
    summary: n(e.summary),
    evidence: Array.isArray(e.evidence) ? e.evidence.map(k) : [],
    review_action_visible: t(e.review_action_visible)
  };
}
function C(r) {
  const e = i(r);
  return {
    id: n(e.id),
    type: n(e.type),
    severity: n(e.severity),
    title: n(e.title),
    description: n(e.description),
    action_label: t(e.action_label),
    action_url: t(e.action_url),
    review_action_visible: t(e.review_action_visible),
    evidence: Array.isArray(e.evidence) ? e.evidence.map(k) : []
  };
}
function m(r) {
  const e = i(r);
  return {
    kind: n(e.kind),
    title: t(e.title),
    description: t(e.description)
  };
}
function x(r) {
  const e = i(r);
  return Object.keys(e).length === 0 ? null : {
    exists: s(e.exists),
    pinned_source_revision_id: t(e.pinned_source_revision_id),
    latest_source_revision_id: t(e.latest_source_revision_id),
    summary: t(e.summary)
  };
}
function S(r) {
  const e = i(r);
  return {
    document_id: n(e.document_id),
    source_document: u(e.source_document),
    source_revision: d(e.source_revision),
    source_artifact: p(e.source_artifact),
    google_source: y(e.google_source),
    fingerprint_status: z(e.fingerprint_status),
    candidate_warning_summary: Array.isArray(e.candidate_warning_summary) ? e.candidate_warning_summary.map(g) : [],
    presentation_warnings: Array.isArray(e.presentation_warnings) ? e.presentation_warnings.map(C) : [],
    diagnostics_url: t(e.diagnostics_url),
    empty_state: m(e.empty_state)
  };
}
function b(r) {
  const e = i(r);
  return {
    agreement_id: n(e.agreement_id),
    pinned_source_revision_id: t(e.pinned_source_revision_id),
    source_document: u(e.source_document),
    source_revision: d(e.source_revision),
    linked_document_artifact: p(e.linked_document_artifact),
    google_source: y(e.google_source),
    newer_source_exists: s(e.newer_source_exists),
    newer_source_summary: x(e.newer_source_summary),
    candidate_warning_summary: Array.isArray(e.candidate_warning_summary) ? e.candidate_warning_summary.map(g) : [],
    presentation_warnings: Array.isArray(e.presentation_warnings) ? e.presentation_warnings.map(C) : [],
    diagnostics_url: t(e.diagnostics_url),
    empty_state: m(e.empty_state)
  };
}
function l(r) {
  const e = i(r);
  return {
    import_run_id: n(e.import_run_id),
    lineage_status: n(e.lineage_status),
    source_document: u(e.source_document),
    source_revision: d(e.source_revision),
    source_artifact: p(e.source_artifact),
    fingerprint_status: z(e.fingerprint_status),
    candidate_status: Array.isArray(e.candidate_status) ? e.candidate_status.map(g) : [],
    document_detail_url: t(e.document_detail_url) ?? null,
    agreement_detail_url: t(e.agreement_detail_url) ?? null
  };
}
function A(r) {
  const e = i(r), o = n(e.id);
  return o ? {
    id: o,
    document_id: t(e.document_id),
    title: t(e.title),
    source_type: t(e.source_type),
    source_google_file_id: t(e.source_google_file_id),
    source_google_doc_url: t(e.source_google_doc_url),
    source_modified_time: t(e.source_modified_time),
    source_exported_at: t(e.source_exported_at),
    source_exported_by_user_id: t(e.source_exported_by_user_id),
    source_mime_type: t(e.source_mime_type),
    source_ingestion_mode: t(e.source_ingestion_mode),
    source_document_id: t(e.source_document_id),
    source_revision_id: t(e.source_revision_id),
    source_artifact_id: t(e.source_artifact_id)
  } : null;
}
function $(r) {
  const e = i(r);
  return {
    import_run_id: n(e.import_run_id),
    status: n(e.status),
    status_url: t(e.status_url) ?? null
  };
}
function K(r) {
  const e = i(r), o = l(e), _ = i(e.error), f = w(_.details), v = n(_.code), h = n(_.message);
  return {
    ...o,
    status: n(e.status),
    status_url: t(e.status_url) ?? null,
    document: A(e.document),
    agreement: A(e.agreement),
    source_document_id: t(e.source_document_id) ?? null,
    source_revision_id: t(e.source_revision_id) ?? null,
    source_artifact_id: t(e.source_artifact_id) ?? null,
    source_mime_type: t(e.source_mime_type) ?? null,
    ingestion_mode: t(e.ingestion_mode) ?? null,
    error: v || h ? {
      code: v,
      message: h,
      ...f ? { details: f } : {}
    } : null
  };
}
function Q(r) {
  return r === "succeeded" || r === "failed";
}
function X(r, e) {
  return r.agreement_detail_url ? r.agreement_detail_url : r.document_detail_url ? r.document_detail_url : r.agreement?.id && e.agreements ? `${e.agreements}/${encodeURIComponent(r.agreement.id)}` : r.document?.id ? `${e.documents}/${encodeURIComponent(r.document.id)}` : e.fallback;
}
function J(r) {
  const e = i(r), o = i(e.states), _ = y(e.metadata_baseline);
  return {
    schema_version: a(e.schema_version),
    presentation_rules: {
      frontend_presentation_only: s(i(e.presentation_rules).frontend_presentation_only),
      diagnostics_owned_by_backend: s(i(e.presentation_rules).diagnostics_owned_by_backend),
      warning_precedence: E(i(e.presentation_rules).warning_precedence),
      candidate_review_visibility: n(i(e.presentation_rules).candidate_review_visibility)
    },
    metadata_baseline: _ ?? {
      account_id: "",
      external_file_id: "",
      web_url: "",
      source_version_hint: "",
      source_mime_type: "",
      source_ingestion_mode: "",
      title_hint: "",
      page_count_hint: 0
    },
    states: {
      document_native: S(o.document_native),
      document_empty: S(o.document_empty),
      agreement_native: b(o.agreement_native),
      agreement_empty: b(o.agreement_empty),
      import_running: l(o.import_running),
      import_linked: l(o.import_linked)
    }
  };
}
var T = {
  NOT_CONFIGURED: "not_configured",
  PENDING_SYNC: "pending_sync",
  SYNCED: "synced",
  FAILED: "failed",
  STALE: "stale"
};
function Z(r) {
  return Object.values(T).includes(r);
}
var ee = {
  SOURCE_DOCUMENT: "source_document",
  SOURCE_REVISION: "source_revision"
};
function P(r) {
  const e = i(r);
  return {
    query: n(e.query),
    provider_kind: t(e.provider_kind),
    status: t(e.status),
    sort: t(e.sort),
    page: c(e.page),
    page_size: c(e.page_size),
    result_kind: t(e.result_kind),
    relationship_state: t(e.relationship_state),
    comment_sync_status: t(e.comment_sync_status),
    revision_hint: t(e.revision_hint),
    has_comments: typeof e.has_comments == "boolean" ? e.has_comments : void 0
  };
}
function I(r) {
  if (!r || typeof r != "object") return;
  const e = i(r);
  return {
    display_name: t(e.display_name),
    email: t(e.email),
    type: t(e.type)
  };
}
function L(r) {
  const e = i(r);
  return {
    id: n(e.id),
    provider_message_id: t(e.provider_message_id),
    message_kind: t(e.message_kind),
    body_preview: t(e.body_preview),
    author: I(e.author),
    created_at: t(e.created_at)
  };
}
function U(r) {
  if (!r || typeof r != "object") return;
  const e = i(r);
  return {
    status: n(e.status),
    thread_count: a(e.thread_count),
    message_count: a(e.message_count),
    last_attempt_at: t(e.last_attempt_at),
    last_synced_at: t(e.last_synced_at),
    error_code: t(e.error_code),
    error_message: t(e.error_message)
  };
}
function F(r) {
  const e = i(r), o = i(e.anchor);
  return {
    id: n(e.id),
    provider_comment_id: t(e.provider_comment_id),
    thread_id: t(e.thread_id),
    status: t(e.status),
    anchor: {
      kind: t(o.kind),
      label: t(o.label)
    },
    author_name: t(e.author_name),
    author: I(e.author),
    body_preview: t(e.body_preview),
    message_count: a(e.message_count),
    reply_count: a(e.reply_count),
    resolved_at: t(e.resolved_at),
    last_synced_at: t(e.last_synced_at),
    last_activity_at: t(e.last_activity_at),
    sync_status: t(e.sync_status),
    source: u(e.source) ?? void 0,
    revision: d(e.revision) ?? void 0,
    messages: Array.isArray(e.messages) ? e.messages.map(L) : void 0,
    links: i(e.links)
  };
}
function M(r) {
  const e = i(r);
  return {
    result_kind: n(e.result_kind),
    source: u(e.source),
    revision: d(e.revision),
    provider: q(e.provider),
    matched_fields: E(e.matched_fields),
    summary: t(e.summary),
    relationship_state: t(e.relationship_state),
    comment_sync_status: t(e.comment_sync_status),
    comment_count: c(e.comment_count),
    has_comments: typeof e.has_comments == "boolean" ? e.has_comments : void 0,
    artifact_hash: t(e.artifact_hash),
    drill_in: j(e.drill_in),
    links: i(e.links)
  };
}
function j(r) {
  const e = i(r), o = t(e.href), _ = t(e.panel);
  if (!(!o || !_))
    return {
      panel: _,
      anchor: t(e.anchor),
      href: o
    };
}
function re(r) {
  const e = i(r);
  return {
    source: u(e.source) ?? void 0,
    revision: d(e.revision) ?? void 0,
    items: Array.isArray(e.items) ? e.items.map(F) : [],
    applied_query: G(e.applied_query),
    page_info: R(e.page_info),
    permissions: N(e.permissions),
    empty_state: m(e.empty_state),
    sync_status: n(e.sync_status),
    sync: U(e.sync),
    links: i(e.links)
  };
}
function te(r) {
  const e = i(r);
  return {
    items: Array.isArray(e.items) ? e.items.map(M) : [],
    page_info: R(e.page_info),
    applied_query: P(e.applied_query),
    permissions: N(e.permissions),
    empty_state: m(e.empty_state),
    links: i(e.links)
  };
}
function G(r) {
  const e = i(r);
  return {
    status: t(e.status),
    sync_status: t(e.sync_status),
    page: c(e.page),
    page_size: c(e.page_size)
  };
}
function R(r) {
  const e = i(r);
  return {
    mode: n(e.mode) || "page",
    page: a(e.page) || 1,
    page_size: a(e.page_size) || 20,
    total_count: a(e.total_count),
    has_more: s(e.has_more),
    sort: t(e.sort)
  };
}
function N(r) {
  const e = i(r);
  return {
    can_view_diagnostics: s(e.can_view_diagnostics),
    can_open_provider_links: s(e.can_open_provider_links),
    can_review_candidates: s(e.can_review_candidates),
    can_view_comments: s(e.can_view_comments)
  };
}
function q(r) {
  if (!r || typeof r != "object") return null;
  const e = i(r), o = n(e.kind);
  return o ? {
    kind: o,
    label: n(e.label),
    external_file_id: t(e.external_file_id),
    account_id: t(e.account_id),
    drive_id: t(e.drive_id),
    web_url: t(e.web_url),
    extension: H(e.extension)
  } : null;
}
function H(r) {
  if (!r || typeof r != "object") return;
  const e = i(r), o = n(e.schema);
  if (o)
    return {
      schema: o,
      values: w(e.values)
    };
}
export {
  J as C,
  X as D,
  U as E,
  te as S,
  L as T,
  C as _,
  D as a,
  P as b,
  W as c,
  b as d,
  g as f,
  $ as g,
  K as h,
  V as i,
  Z as l,
  l as m,
  B as n,
  ee as o,
  S as p,
  T as r,
  Q as s,
  O as t,
  Y as u,
  re as v,
  I as w,
  M as x,
  F as y
};

//# sourceMappingURL=lineage-contracts-RFw4HNlm.js.map