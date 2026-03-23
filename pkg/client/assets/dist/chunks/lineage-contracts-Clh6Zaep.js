var P = {
  UNKNOWN: "unknown",
  READY: "ready",
  PENDING: "pending",
  FAILED: "failed",
  NOT_APPLICABLE: "not_applicable"
}, x = {
  PENDING_REVIEW: "pending_review",
  CONFIRMED: "confirmed",
  REJECTED: "rejected",
  SUPERSEDED: "superseded",
  AUTO_LINKED: "auto_linked"
};
function ne(r) {
  return Object.values(x).includes(r);
}
var te = {
  COPIED_FROM: "copied_from",
  PREDECESSOR_OF: "predecessor_of",
  SUCCESSOR_OF: "successor_of",
  MIGRATED_FROM: "migrated_from",
  EXACT_DUPLICATE: "exact_duplicate"
}, ie = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  EXACT: "exact"
};
function oe(r) {
  return Object.values(P).includes(r);
}
function t(r) {
  return r && typeof r == "object" ? r : {};
}
function i(r) {
  return typeof r == "string" ? r.trim() : "";
}
function n(r) {
  return i(r) || void 0;
}
function c(r) {
  return typeof r == "number" && Number.isFinite(r) ? r : 0;
}
function s(r) {
  return typeof r == "number" && Number.isFinite(r) ? r : void 0;
}
function _(r) {
  return r === !0;
}
function C(r) {
  return Array.isArray(r) ? r.map((e) => i(e)).filter(Boolean) : [];
}
function I(r) {
  if (!(!r || typeof r != "object" || Array.isArray(r)))
    return r;
}
function a(r) {
  const e = t(r), o = i(e.id);
  return o ? {
    id: o,
    label: n(e.label),
    url: n(e.url)
  } : null;
}
function u(r) {
  const e = t(r), o = i(e.id);
  return o ? {
    id: o,
    provider_revision_hint: n(e.provider_revision_hint),
    modified_time: n(e.modified_time),
    exported_at: n(e.exported_at),
    exported_by_user_id: n(e.exported_by_user_id),
    source_mime_type: n(e.source_mime_type)
  } : null;
}
function p(r) {
  const e = t(r), o = i(e.id);
  return o ? {
    id: o,
    artifact_kind: i(e.artifact_kind),
    object_key: n(e.object_key),
    sha256: n(e.sha256),
    page_count: s(e.page_count),
    size_bytes: s(e.size_bytes),
    compatibility_tier: n(e.compatibility_tier),
    compatibility_reason: n(e.compatibility_reason),
    normalization_status: n(e.normalization_status)
  } : null;
}
function g(r) {
  const e = t(r), o = i(e.external_file_id);
  return o ? {
    account_id: i(e.account_id),
    external_file_id: o,
    drive_id: n(e.drive_id),
    web_url: i(e.web_url),
    modified_time: n(e.modified_time),
    source_version_hint: i(e.source_version_hint),
    source_mime_type: i(e.source_mime_type),
    source_ingestion_mode: i(e.source_ingestion_mode),
    title_hint: i(e.title_hint),
    page_count_hint: c(e.page_count_hint),
    owner_email: n(e.owner_email),
    parent_id: n(e.parent_id)
  } : null;
}
function N(r) {
  const e = t(r);
  return {
    status: i(e.status),
    extract_version: n(e.extract_version),
    evidence_available: _(e.evidence_available),
    error_message: n(e.error_message),
    error_code: n(e.error_code)
  };
}
function D(r) {
  const e = t(r);
  return {
    code: i(e.code),
    label: i(e.label),
    details: n(e.details)
  };
}
function v(r) {
  const e = t(r);
  return {
    id: i(e.id),
    relationship_type: i(e.relationship_type),
    status: i(e.status),
    confidence_band: i(e.confidence_band),
    confidence_score: s(e.confidence_score),
    summary: i(e.summary),
    evidence: Array.isArray(e.evidence) ? e.evidence.map(D) : [],
    review_action_visible: n(e.review_action_visible)
  };
}
function O(r) {
  const e = t(r);
  return {
    id: i(e.id),
    type: i(e.type),
    severity: i(e.severity),
    title: i(e.title),
    description: i(e.description),
    action_label: n(e.action_label),
    action_url: n(e.action_url),
    review_action_visible: n(e.review_action_visible),
    evidence: Array.isArray(e.evidence) ? e.evidence.map(D) : []
  };
}
function d(r) {
  const e = t(r);
  return {
    kind: i(e.kind),
    title: n(e.title),
    description: n(e.description)
  };
}
function L(r) {
  const e = t(r);
  return Object.keys(e).length === 0 ? null : {
    exists: _(e.exists),
    pinned_source_revision_id: n(e.pinned_source_revision_id),
    latest_source_revision_id: n(e.latest_source_revision_id),
    summary: n(e.summary)
  };
}
function z(r) {
  const e = t(r);
  return {
    document_id: i(e.document_id),
    source_document: a(e.source_document),
    source_revision: u(e.source_revision),
    source_artifact: p(e.source_artifact),
    google_source: g(e.google_source),
    fingerprint_status: N(e.fingerprint_status),
    candidate_warning_summary: Array.isArray(e.candidate_warning_summary) ? e.candidate_warning_summary.map(v) : [],
    presentation_warnings: Array.isArray(e.presentation_warnings) ? e.presentation_warnings.map(O) : [],
    diagnostics_url: n(e.diagnostics_url),
    empty_state: d(e.empty_state)
  };
}
function w(r) {
  const e = t(r);
  return {
    agreement_id: i(e.agreement_id),
    pinned_source_revision_id: n(e.pinned_source_revision_id),
    source_document: a(e.source_document),
    source_revision: u(e.source_revision),
    linked_document_artifact: p(e.linked_document_artifact),
    google_source: g(e.google_source),
    newer_source_exists: _(e.newer_source_exists),
    newer_source_summary: L(e.newer_source_summary),
    candidate_warning_summary: Array.isArray(e.candidate_warning_summary) ? e.candidate_warning_summary.map(v) : [],
    presentation_warnings: Array.isArray(e.presentation_warnings) ? e.presentation_warnings.map(O) : [],
    diagnostics_url: n(e.diagnostics_url),
    empty_state: d(e.empty_state)
  };
}
function f(r) {
  const e = t(r);
  return {
    import_run_id: i(e.import_run_id),
    lineage_status: i(e.lineage_status),
    source_document: a(e.source_document),
    source_revision: u(e.source_revision),
    source_artifact: p(e.source_artifact),
    fingerprint_status: N(e.fingerprint_status),
    candidate_status: Array.isArray(e.candidate_status) ? e.candidate_status.map(v) : [],
    document_detail_url: n(e.document_detail_url) ?? null,
    agreement_detail_url: n(e.agreement_detail_url) ?? null
  };
}
function R(r) {
  const e = t(r), o = i(e.id);
  return o ? {
    id: o,
    document_id: n(e.document_id),
    title: n(e.title),
    source_type: n(e.source_type),
    source_google_file_id: n(e.source_google_file_id),
    source_google_doc_url: n(e.source_google_doc_url),
    source_modified_time: n(e.source_modified_time),
    source_exported_at: n(e.source_exported_at),
    source_exported_by_user_id: n(e.source_exported_by_user_id),
    source_mime_type: n(e.source_mime_type),
    source_ingestion_mode: n(e.source_ingestion_mode),
    source_document_id: n(e.source_document_id),
    source_revision_id: n(e.source_revision_id),
    source_artifact_id: n(e.source_artifact_id)
  } : null;
}
function se(r) {
  const e = t(r);
  return {
    import_run_id: i(e.import_run_id),
    status: i(e.status),
    status_url: n(e.status_url) ?? null
  };
}
function ae(r) {
  const e = t(r), o = f(e), m = t(e.error), b = I(m.details), k = i(m.code), E = i(m.message);
  return {
    ...o,
    status: i(e.status),
    status_url: n(e.status_url) ?? null,
    document: R(e.document),
    agreement: R(e.agreement),
    source_document_id: n(e.source_document_id) ?? null,
    source_revision_id: n(e.source_revision_id) ?? null,
    source_artifact_id: n(e.source_artifact_id) ?? null,
    source_mime_type: n(e.source_mime_type) ?? null,
    ingestion_mode: n(e.ingestion_mode) ?? null,
    error: k || E ? {
      code: k,
      message: E,
      ...b ? { details: b } : {}
    } : null
  };
}
function ce(r) {
  return r === "succeeded" || r === "failed";
}
function _e(r, e) {
  return r.agreement_detail_url ? r.agreement_detail_url : r.document_detail_url ? r.document_detail_url : r.agreement?.id && e.agreements ? `${e.agreements}/${encodeURIComponent(r.agreement.id)}` : r.document?.id ? `${e.documents}/${encodeURIComponent(r.document.id)}` : e.fallback;
}
function ue(r) {
  const e = t(r), o = t(e.states), m = g(e.metadata_baseline);
  return {
    schema_version: c(e.schema_version),
    presentation_rules: {
      frontend_presentation_only: _(t(e.presentation_rules).frontend_presentation_only),
      diagnostics_owned_by_backend: _(t(e.presentation_rules).diagnostics_owned_by_backend),
      warning_precedence: C(t(e.presentation_rules).warning_precedence),
      candidate_review_visibility: i(t(e.presentation_rules).candidate_review_visibility)
    },
    metadata_baseline: m ?? {
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
      document_native: z(o.document_native),
      document_empty: z(o.document_empty),
      agreement_native: w(o.agreement_native),
      agreement_empty: w(o.agreement_empty),
      import_running: f(o.import_running),
      import_linked: f(o.import_linked)
    }
  };
}
var de = {
  OVERVIEW: "overview",
  TIMELINE: "timeline",
  AGREEMENTS: "agreements",
  ARTIFACTS: "artifacts",
  COMMENTS: "comments",
  HANDLES: "handles"
}, M = {
  NOT_CONFIGURED: "not_configured",
  PENDING_SYNC: "pending_sync",
  SYNCED: "synced",
  FAILED: "failed",
  STALE: "stale"
};
function me(r) {
  return Object.values(M).includes(r);
}
var le = {
  SOURCE_DOCUMENT: "source_document",
  SOURCE_REVISION: "source_revision"
};
function F(r) {
  const e = t(r);
  return {
    query: i(e.query),
    provider_kind: n(e.provider_kind),
    status: n(e.status),
    sort: n(e.sort),
    page: s(e.page),
    page_size: s(e.page_size),
    result_kind: n(e.result_kind),
    relationship_state: n(e.relationship_state),
    comment_sync_status: n(e.comment_sync_status),
    revision_hint: n(e.revision_hint),
    has_comments: typeof e.has_comments == "boolean" ? e.has_comments : void 0
  };
}
function T(r) {
  if (!r || typeof r != "object") return;
  const e = t(r);
  return {
    display_name: n(e.display_name),
    email: n(e.email),
    type: n(e.type)
  };
}
function U(r) {
  const e = t(r);
  return {
    id: i(e.id),
    provider_message_id: n(e.provider_message_id),
    message_kind: n(e.message_kind),
    body_preview: n(e.body_preview),
    author: T(e.author),
    created_at: n(e.created_at)
  };
}
function j(r) {
  if (!r || typeof r != "object") return;
  const e = t(r);
  return {
    status: i(e.status),
    thread_count: c(e.thread_count),
    message_count: c(e.message_count),
    last_attempt_at: n(e.last_attempt_at),
    last_synced_at: n(e.last_synced_at),
    error_code: n(e.error_code),
    error_message: n(e.error_message)
  };
}
function G(r) {
  const e = t(r), o = t(e.anchor);
  return {
    id: i(e.id),
    provider_comment_id: n(e.provider_comment_id),
    thread_id: n(e.thread_id),
    status: n(e.status),
    anchor: {
      kind: n(o.kind),
      label: n(o.label)
    },
    author_name: n(e.author_name),
    author: T(e.author),
    body_preview: n(e.body_preview),
    message_count: c(e.message_count),
    reply_count: c(e.reply_count),
    resolved_at: n(e.resolved_at),
    last_synced_at: n(e.last_synced_at),
    last_activity_at: n(e.last_activity_at),
    sync_status: n(e.sync_status),
    source: a(e.source) ?? void 0,
    revision: u(e.revision) ?? void 0,
    messages: Array.isArray(e.messages) ? e.messages.map(U) : void 0,
    links: t(e.links)
  };
}
function W(r) {
  const e = t(r);
  return {
    result_kind: i(e.result_kind),
    source: a(e.source),
    revision: u(e.revision),
    provider: A(e.provider),
    matched_fields: C(e.matched_fields),
    summary: n(e.summary),
    relationship_state: n(e.relationship_state),
    comment_sync_status: n(e.comment_sync_status),
    comment_count: s(e.comment_count),
    has_comments: typeof e.has_comments == "boolean" ? e.has_comments : void 0,
    artifact_hash: n(e.artifact_hash),
    drill_in: h(e.drill_in),
    links: t(e.links)
  };
}
function h(r) {
  const e = t(r), o = n(e.href), m = n(e.panel);
  if (!(!o || !m))
    return {
      panel: m,
      anchor: n(e.anchor),
      href: o
    };
}
function pe(r) {
  const e = t(r);
  return {
    panel: n(e.panel),
    anchor: n(e.anchor)
  };
}
function H(r) {
  const e = t(r);
  return {
    agreement: a(e.agreement),
    document: a(e.document),
    pinned_source_revision: u(e.pinned_source_revision),
    status: n(e.status),
    workflow_kind: n(e.workflow_kind),
    is_pinned_latest: _(e.is_pinned_latest),
    links: t(e.links)
  };
}
function q(r) {
  const e = t(r);
  return {
    status: n(e.status),
    source_revision_id: n(e.source_revision_id),
    sort: n(e.sort),
    page: s(e.page),
    page_size: s(e.page_size)
  };
}
function V(r) {
  const e = t(r);
  return {
    source: a(e.source),
    items: Array.isArray(e.items) ? e.items.map(H) : [],
    page_info: y(e.page_info),
    applied_query: q(e.applied_query),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: t(e.links)
  };
}
function B(r) {
  const e = t(r);
  return {
    id: i(e.id),
    label: i(e.label),
    item_count: s(e.item_count),
    links: t(e.links)
  };
}
function Y(r) {
  const e = t(r);
  return {
    revision: u(e.revision),
    handle: S(e.handle),
    primary_artifact: p(e.primary_artifact),
    comment_count: s(e.comment_count),
    agreement_count: s(e.agreement_count),
    artifact_count: s(e.artifact_count),
    is_latest: _(e.is_latest),
    is_repeated_handle: _(e.is_repeated_handle),
    continuity_summary: n(e.continuity_summary),
    drill_in: h(e.drill_in),
    links: t(e.links)
  };
}
function K(r) {
  const e = t(r);
  return {
    entries: Array.isArray(e.entries) ? e.entries.map(Y) : [],
    repeated_handle_count: s(e.repeated_handle_count),
    handle_transition_count: s(e.handle_transition_count),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: t(e.links)
  };
}
function Q(r) {
  const e = t(r);
  return {
    artifact: p(e.artifact),
    revision: u(e.revision),
    provider: A(e.provider),
    drill_in: h(e.drill_in),
    links: t(e.links)
  };
}
function $(r) {
  const e = t(r);
  return {
    source: a(e.source),
    items: Array.isArray(e.items) ? e.items.map(Q) : [],
    page_info: y(e.page_info),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: t(e.links)
  };
}
function X(r) {
  const e = t(r);
  return {
    status: n(e.status),
    summary: n(e.summary),
    continuation: a(e.continuation),
    predecessors: Array.isArray(e.predecessors) ? e.predecessors.map((o) => a(o)).filter((o) => o !== null) : [],
    successors: Array.isArray(e.successors) ? e.successors.map((o) => a(o)).filter((o) => o !== null) : [],
    links: t(e.links)
  };
}
function ye(r) {
  const e = t(r);
  return {
    source: a(e.source),
    status: i(e.status),
    lineage_confidence: i(e.lineage_confidence),
    provider: A(e.provider),
    active_handle: S(e.active_handle),
    latest_revision: u(e.latest_revision),
    revision_count: c(e.revision_count),
    handle_count: c(e.handle_count),
    relationship_count: c(e.relationship_count),
    pending_candidate_count: c(e.pending_candidate_count),
    active_panel: n(e.active_panel),
    active_anchor: n(e.active_anchor),
    panels: Array.isArray(e.panels) ? e.panels.map(B) : [],
    continuity: X(e.continuity),
    timeline: K(e.timeline),
    agreements: V(e.agreements),
    artifacts: $(e.artifacts),
    comments: J(e.comments),
    handles: ee(e.handles),
    permissions: l(e.permissions),
    links: t(e.links),
    empty_state: d(e.empty_state)
  };
}
function J(r) {
  const e = t(r);
  return {
    source: a(e.source) ?? void 0,
    revision: u(e.revision) ?? void 0,
    items: Array.isArray(e.items) ? e.items.map(G) : [],
    applied_query: Z(e.applied_query),
    page_info: y(e.page_info),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    sync_status: i(e.sync_status),
    sync: j(e.sync),
    links: t(e.links)
  };
}
function fe(r) {
  const e = t(r);
  return {
    items: Array.isArray(e.items) ? e.items.map(W) : [],
    page_info: y(e.page_info),
    applied_query: F(e.applied_query),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: t(e.links)
  };
}
function Z(r) {
  const e = t(r);
  return {
    status: n(e.status),
    sync_status: n(e.sync_status),
    page: s(e.page),
    page_size: s(e.page_size)
  };
}
function y(r) {
  const e = t(r);
  return {
    mode: i(e.mode) || "page",
    page: c(e.page) || 1,
    page_size: c(e.page_size) || 20,
    total_count: c(e.total_count),
    has_more: _(e.has_more),
    sort: n(e.sort)
  };
}
function l(r) {
  const e = t(r);
  return {
    can_view_diagnostics: _(e.can_view_diagnostics),
    can_open_provider_links: _(e.can_open_provider_links),
    can_review_candidates: _(e.can_review_candidates),
    can_view_comments: _(e.can_view_comments)
  };
}
function S(r) {
  if (!r || typeof r != "object") return null;
  const e = t(r), o = i(e.id);
  return o ? {
    id: o,
    provider_kind: i(e.provider_kind),
    external_file_id: i(e.external_file_id),
    account_id: n(e.account_id),
    drive_id: n(e.drive_id),
    web_url: n(e.web_url),
    handle_status: i(e.handle_status),
    valid_from: n(e.valid_from),
    valid_to: n(e.valid_to),
    links: t(e.links)
  } : null;
}
function ee(r) {
  const e = t(r);
  return {
    source: a(e.source),
    items: Array.isArray(e.items) ? e.items.map((o) => S(o)).filter((o) => o !== null) : [],
    page_info: y(e.page_info),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: t(e.links)
  };
}
function A(r) {
  if (!r || typeof r != "object") return null;
  const e = t(r), o = i(e.kind);
  return o ? {
    kind: o,
    label: i(e.label),
    external_file_id: n(e.external_file_id),
    account_id: n(e.account_id),
    drive_id: n(e.drive_id),
    web_url: n(e.web_url),
    extension: re(e.extension)
  } : null;
}
function re(r) {
  if (!r || typeof r != "object") return;
  const e = t(r), o = i(e.schema);
  if (o)
    return {
      schema: o,
      values: I(e.values)
    };
}
export {
  j as A,
  _e as B,
  fe as C,
  H as D,
  V as E,
  $ as F,
  Q as I,
  h as L,
  K as M,
  Y as N,
  T as O,
  ye as P,
  B as R,
  W as S,
  q as T,
  se as _,
  P as a,
  G as b,
  ce as c,
  oe as d,
  w as f,
  ae as g,
  f as h,
  ie as i,
  X as j,
  U as k,
  ne as l,
  z as m,
  te as n,
  le as o,
  v as p,
  M as r,
  de as s,
  x as t,
  me as u,
  O as v,
  ue as w,
  F as x,
  J as y,
  pe as z
};

//# sourceMappingURL=lineage-contracts-Clh6Zaep.js.map