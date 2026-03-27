import { asRecord as n, asString as i, asStringArray as C, asBoolean as c, asNumber as _, asOptionalString as t, asOptionalNumber as s } from "../shared/coercion.js";
const P = {
  /** Fingerprint status cannot be determined from the available lineage data */
  UNKNOWN: "unknown",
  /** Fingerprint extraction completed successfully; evidence is available */
  READY: "ready",
  /** Fingerprint extraction is in progress; evidence not yet available */
  PENDING: "pending",
  /** Fingerprint extraction failed; error details may be available */
  FAILED: "failed",
  /** Fingerprint extraction not applicable (e.g., upload-only documents) */
  NOT_APPLICABLE: "not_applicable"
}, x = {
  /** Candidate relationship is awaiting operator review */
  PENDING_REVIEW: "pending_review",
  /** Candidate relationship has been confirmed by operator */
  CONFIRMED: "confirmed",
  /** Candidate relationship has been rejected by operator */
  REJECTED: "rejected",
  /** Candidate relationship has been superseded by a newer evaluation */
  SUPERSEDED: "superseded",
  /** Candidate relationship was auto-linked due to exact match */
  AUTO_LINKED: "auto_linked"
};
function ne(r) {
  return Object.values(x).includes(r);
}
const ie = {
  /** Document was copied from another source */
  COPIED_FROM: "copied_from",
  /** Document is a potential predecessor to another */
  PREDECESSOR_OF: "predecessor_of",
  /** Document is a potential successor to another */
  SUCCESSOR_OF: "successor_of",
  /** Document migrated from another account/drive */
  MIGRATED_FROM: "migrated_from",
  /** Document is an exact duplicate */
  EXACT_DUPLICATE: "exact_duplicate"
}, oe = {
  /** High confidence - likely a true match */
  HIGH: "high",
  /** Medium confidence - may require review */
  MEDIUM: "medium",
  /** Low confidence - likely a false positive */
  LOW: "low",
  /** Exact match - artifact or identifier match */
  EXACT: "exact"
};
function se(r) {
  return Object.values(P).includes(r);
}
function I(r) {
  if (!(!r || typeof r != "object" || Array.isArray(r)))
    return r;
}
function a(r) {
  const e = n(r), o = i(e.id);
  return o ? {
    id: o,
    label: t(e.label),
    url: t(e.url)
  } : null;
}
function u(r) {
  const e = n(r), o = i(e.id);
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
  const e = n(r), o = i(e.id);
  return o ? {
    id: o,
    artifact_kind: i(e.artifact_kind),
    object_key: t(e.object_key),
    sha256: t(e.sha256),
    page_count: s(e.page_count),
    size_bytes: s(e.size_bytes),
    compatibility_tier: t(e.compatibility_tier),
    compatibility_reason: t(e.compatibility_reason),
    normalization_status: t(e.normalization_status)
  } : null;
}
function f(r) {
  const e = n(r), o = i(e.external_file_id);
  return o ? {
    account_id: i(e.account_id),
    external_file_id: o,
    drive_id: t(e.drive_id),
    web_url: i(e.web_url),
    modified_time: t(e.modified_time),
    source_version_hint: i(e.source_version_hint),
    source_mime_type: i(e.source_mime_type),
    source_ingestion_mode: i(e.source_ingestion_mode),
    title_hint: i(e.title_hint),
    page_count_hint: _(e.page_count_hint),
    owner_email: t(e.owner_email),
    parent_id: t(e.parent_id)
  } : null;
}
function N(r) {
  const e = n(r);
  return {
    status: i(e.status),
    extract_version: t(e.extract_version),
    evidence_available: c(e.evidence_available),
    error_message: t(e.error_message),
    error_code: t(e.error_code)
  };
}
function D(r) {
  const e = n(r);
  return {
    code: i(e.code),
    label: i(e.label),
    details: t(e.details)
  };
}
function v(r) {
  const e = n(r);
  return {
    id: i(e.id),
    relationship_type: i(e.relationship_type),
    status: i(e.status),
    confidence_band: i(e.confidence_band),
    confidence_score: s(e.confidence_score),
    summary: i(e.summary),
    evidence: Array.isArray(e.evidence) ? e.evidence.map(D) : [],
    review_action_visible: t(e.review_action_visible)
  };
}
function O(r) {
  const e = n(r);
  return {
    id: i(e.id),
    type: i(e.type),
    severity: i(e.severity),
    title: i(e.title),
    description: i(e.description),
    action_label: t(e.action_label),
    action_url: t(e.action_url),
    review_action_visible: t(e.review_action_visible),
    evidence: Array.isArray(e.evidence) ? e.evidence.map(D) : []
  };
}
function d(r) {
  const e = n(r);
  return {
    kind: i(e.kind),
    title: t(e.title),
    description: t(e.description)
  };
}
function L(r) {
  const e = n(r);
  return Object.keys(e).length === 0 ? null : {
    exists: c(e.exists),
    pinned_source_revision_id: t(e.pinned_source_revision_id),
    latest_source_revision_id: t(e.latest_source_revision_id),
    summary: t(e.summary)
  };
}
function z(r) {
  const e = n(r);
  return {
    document_id: i(e.document_id),
    source_document: a(e.source_document),
    source_revision: u(e.source_revision),
    source_artifact: p(e.source_artifact),
    google_source: f(e.google_source),
    fingerprint_status: N(e.fingerprint_status),
    candidate_warning_summary: Array.isArray(e.candidate_warning_summary) ? e.candidate_warning_summary.map(v) : [],
    presentation_warnings: Array.isArray(e.presentation_warnings) ? e.presentation_warnings.map(O) : [],
    diagnostics_url: t(e.diagnostics_url),
    empty_state: d(e.empty_state)
  };
}
function w(r) {
  const e = n(r);
  return {
    agreement_id: i(e.agreement_id),
    pinned_source_revision_id: t(e.pinned_source_revision_id),
    source_document: a(e.source_document),
    source_revision: u(e.source_revision),
    linked_document_artifact: p(e.linked_document_artifact),
    google_source: f(e.google_source),
    newer_source_exists: c(e.newer_source_exists),
    newer_source_summary: L(e.newer_source_summary),
    candidate_warning_summary: Array.isArray(e.candidate_warning_summary) ? e.candidate_warning_summary.map(v) : [],
    presentation_warnings: Array.isArray(e.presentation_warnings) ? e.presentation_warnings.map(O) : [],
    diagnostics_url: t(e.diagnostics_url),
    empty_state: d(e.empty_state)
  };
}
function g(r) {
  const e = n(r);
  return {
    import_run_id: i(e.import_run_id),
    lineage_status: i(e.lineage_status),
    source_document: a(e.source_document),
    source_revision: u(e.source_revision),
    source_artifact: p(e.source_artifact),
    fingerprint_status: N(e.fingerprint_status),
    candidate_status: Array.isArray(e.candidate_status) ? e.candidate_status.map(v) : [],
    document_detail_url: t(e.document_detail_url) ?? null,
    agreement_detail_url: t(e.agreement_detail_url) ?? null
  };
}
function R(r) {
  const e = n(r), o = i(e.id);
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
function ae(r) {
  const e = n(r);
  return {
    import_run_id: i(e.import_run_id),
    status: i(e.status),
    status_url: t(e.status_url) ?? null
  };
}
function ce(r) {
  const e = n(r), o = g(e), m = n(e.error), k = I(m.details), b = i(m.code), E = i(m.message);
  return {
    ...o,
    status: i(e.status),
    status_url: t(e.status_url) ?? null,
    document: R(e.document),
    agreement: R(e.agreement),
    source_document_id: t(e.source_document_id) ?? null,
    source_revision_id: t(e.source_revision_id) ?? null,
    source_artifact_id: t(e.source_artifact_id) ?? null,
    source_mime_type: t(e.source_mime_type) ?? null,
    ingestion_mode: t(e.ingestion_mode) ?? null,
    error: b || E ? {
      code: b,
      message: E,
      ...k ? { details: k } : {}
    } : null
  };
}
function _e(r) {
  return r === "succeeded" || r === "failed";
}
function ue(r, e) {
  return r.agreement_detail_url ? r.agreement_detail_url : r.document_detail_url ? r.document_detail_url : r.agreement?.id && e.agreements ? `${e.agreements}/${encodeURIComponent(r.agreement.id)}` : r.document?.id ? `${e.documents}/${encodeURIComponent(r.document.id)}` : e.fallback;
}
function de(r) {
  const e = n(r), o = n(e.states), m = f(e.metadata_baseline);
  return {
    schema_version: _(e.schema_version),
    presentation_rules: {
      frontend_presentation_only: c(n(e.presentation_rules).frontend_presentation_only),
      diagnostics_owned_by_backend: c(n(e.presentation_rules).diagnostics_owned_by_backend),
      warning_precedence: C(n(e.presentation_rules).warning_precedence),
      candidate_review_visibility: i(n(e.presentation_rules).candidate_review_visibility)
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
      import_running: g(o.import_running),
      import_linked: g(o.import_linked)
    }
  };
}
const me = {
  OVERVIEW: "overview",
  TIMELINE: "timeline",
  AGREEMENTS: "agreements",
  ARTIFACTS: "artifacts",
  COMMENTS: "comments",
  HANDLES: "handles"
}, M = {
  /** Comment sync not configured for this source/provider */
  NOT_CONFIGURED: "not_configured",
  /** Comment sync is pending; data may be incomplete */
  PENDING_SYNC: "pending_sync",
  /** Comments are fully synced from provider */
  SYNCED: "synced",
  /** Comment sync failed; check error details */
  FAILED: "failed",
  /** Synced data is stale; resync may be needed */
  STALE: "stale"
};
function le(r) {
  return Object.values(M).includes(r);
}
const pe = {
  /** Result is a source document */
  SOURCE_DOCUMENT: "source_document",
  /** Result is a source revision */
  SOURCE_REVISION: "source_revision"
};
function U(r) {
  const e = n(r);
  return {
    query: i(e.query),
    provider_kind: t(e.provider_kind),
    status: t(e.status),
    sort: t(e.sort),
    page: s(e.page),
    page_size: s(e.page_size),
    result_kind: t(e.result_kind),
    relationship_state: t(e.relationship_state),
    comment_sync_status: t(e.comment_sync_status),
    revision_hint: t(e.revision_hint),
    has_comments: typeof e.has_comments == "boolean" ? e.has_comments : void 0
  };
}
function T(r) {
  if (!r || typeof r != "object")
    return;
  const e = n(r);
  return {
    display_name: t(e.display_name),
    email: t(e.email),
    type: t(e.type)
  };
}
function F(r) {
  const e = n(r);
  return {
    id: i(e.id),
    provider_message_id: t(e.provider_message_id),
    message_kind: t(e.message_kind),
    body_preview: t(e.body_preview),
    author: T(e.author),
    created_at: t(e.created_at)
  };
}
function G(r) {
  if (!r || typeof r != "object")
    return;
  const e = n(r);
  return {
    status: i(e.status),
    thread_count: _(e.thread_count),
    message_count: _(e.message_count),
    last_attempt_at: t(e.last_attempt_at),
    last_synced_at: t(e.last_synced_at),
    error_code: t(e.error_code),
    error_message: t(e.error_message)
  };
}
function j(r) {
  const e = n(r), o = n(e.anchor);
  return {
    id: i(e.id),
    provider_comment_id: t(e.provider_comment_id),
    thread_id: t(e.thread_id),
    status: t(e.status),
    anchor: {
      kind: t(o.kind),
      label: t(o.label)
    },
    author_name: t(e.author_name),
    author: T(e.author),
    body_preview: t(e.body_preview),
    message_count: _(e.message_count),
    reply_count: _(e.reply_count),
    resolved_at: t(e.resolved_at),
    last_synced_at: t(e.last_synced_at),
    last_activity_at: t(e.last_activity_at),
    sync_status: t(e.sync_status),
    source: a(e.source) ?? void 0,
    revision: u(e.revision) ?? void 0,
    messages: Array.isArray(e.messages) ? e.messages.map(F) : void 0,
    links: n(e.links)
  };
}
function W(r) {
  const e = n(r);
  return {
    result_kind: i(e.result_kind),
    source: a(e.source),
    revision: u(e.revision),
    provider: A(e.provider),
    matched_fields: C(e.matched_fields),
    summary: t(e.summary),
    relationship_state: t(e.relationship_state),
    comment_sync_status: t(e.comment_sync_status),
    comment_count: s(e.comment_count),
    has_comments: typeof e.has_comments == "boolean" ? e.has_comments : void 0,
    artifact_hash: t(e.artifact_hash),
    drill_in: h(e.drill_in),
    links: n(e.links)
  };
}
function h(r) {
  const e = n(r), o = t(e.href), m = t(e.panel);
  if (!(!o || !m))
    return {
      panel: m,
      anchor: t(e.anchor),
      href: o
    };
}
function ye(r) {
  const e = n(r);
  return {
    panel: t(e.panel),
    anchor: t(e.anchor)
  };
}
function H(r) {
  const e = n(r);
  return {
    agreement: a(e.agreement),
    document: a(e.document),
    pinned_source_revision: u(e.pinned_source_revision),
    status: t(e.status),
    workflow_kind: t(e.workflow_kind),
    is_pinned_latest: c(e.is_pinned_latest),
    links: n(e.links)
  };
}
function q(r) {
  const e = n(r);
  return {
    status: t(e.status),
    source_revision_id: t(e.source_revision_id),
    sort: t(e.sort),
    page: s(e.page),
    page_size: s(e.page_size)
  };
}
function V(r) {
  const e = n(r);
  return {
    source: a(e.source),
    items: Array.isArray(e.items) ? e.items.map(H) : [],
    page_info: y(e.page_info),
    applied_query: q(e.applied_query),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: n(e.links)
  };
}
function B(r) {
  const e = n(r);
  return {
    id: i(e.id),
    label: i(e.label),
    item_count: s(e.item_count),
    links: n(e.links)
  };
}
function K(r) {
  const e = n(r);
  return {
    revision: u(e.revision),
    handle: S(e.handle),
    primary_artifact: p(e.primary_artifact),
    comment_count: s(e.comment_count),
    agreement_count: s(e.agreement_count),
    artifact_count: s(e.artifact_count),
    is_latest: c(e.is_latest),
    is_repeated_handle: c(e.is_repeated_handle),
    continuity_summary: t(e.continuity_summary),
    drill_in: h(e.drill_in),
    links: n(e.links)
  };
}
function Y(r) {
  const e = n(r);
  return {
    entries: Array.isArray(e.entries) ? e.entries.map(K) : [],
    repeated_handle_count: s(e.repeated_handle_count),
    handle_transition_count: s(e.handle_transition_count),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: n(e.links)
  };
}
function Q(r) {
  const e = n(r);
  return {
    artifact: p(e.artifact),
    revision: u(e.revision),
    provider: A(e.provider),
    drill_in: h(e.drill_in),
    links: n(e.links)
  };
}
function $(r) {
  const e = n(r);
  return {
    source: a(e.source),
    items: Array.isArray(e.items) ? e.items.map(Q) : [],
    page_info: y(e.page_info),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: n(e.links)
  };
}
function J(r) {
  const e = n(r);
  return {
    status: t(e.status),
    summary: t(e.summary),
    continuation: a(e.continuation),
    predecessors: Array.isArray(e.predecessors) ? e.predecessors.map((o) => a(o)).filter((o) => o !== null) : [],
    successors: Array.isArray(e.successors) ? e.successors.map((o) => a(o)).filter((o) => o !== null) : [],
    links: n(e.links)
  };
}
function ge(r) {
  const e = n(r);
  return {
    source: a(e.source),
    status: i(e.status),
    lineage_confidence: i(e.lineage_confidence),
    provider: A(e.provider),
    active_handle: S(e.active_handle),
    latest_revision: u(e.latest_revision),
    revision_count: _(e.revision_count),
    handle_count: _(e.handle_count),
    relationship_count: _(e.relationship_count),
    pending_candidate_count: _(e.pending_candidate_count),
    active_panel: t(e.active_panel),
    active_anchor: t(e.active_anchor),
    panels: Array.isArray(e.panels) ? e.panels.map(B) : [],
    continuity: J(e.continuity),
    timeline: Y(e.timeline),
    agreements: V(e.agreements),
    artifacts: $(e.artifacts),
    comments: X(e.comments),
    handles: ee(e.handles),
    permissions: l(e.permissions),
    links: n(e.links),
    empty_state: d(e.empty_state)
  };
}
function X(r) {
  const e = n(r);
  return {
    source: a(e.source) ?? void 0,
    revision: u(e.revision) ?? void 0,
    items: Array.isArray(e.items) ? e.items.map(j) : [],
    applied_query: Z(e.applied_query),
    page_info: y(e.page_info),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    sync_status: i(e.sync_status),
    sync: G(e.sync),
    links: n(e.links)
  };
}
function fe(r) {
  const e = n(r);
  return {
    items: Array.isArray(e.items) ? e.items.map(W) : [],
    page_info: y(e.page_info),
    applied_query: U(e.applied_query),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: n(e.links)
  };
}
function Z(r) {
  const e = n(r);
  return {
    status: t(e.status),
    sync_status: t(e.sync_status),
    page: s(e.page),
    page_size: s(e.page_size)
  };
}
function y(r) {
  const e = n(r);
  return {
    mode: i(e.mode) || "page",
    page: _(e.page) || 1,
    page_size: _(e.page_size) || 20,
    total_count: _(e.total_count),
    has_more: c(e.has_more),
    sort: t(e.sort)
  };
}
function l(r) {
  const e = n(r);
  return {
    can_view_diagnostics: c(e.can_view_diagnostics),
    can_open_provider_links: c(e.can_open_provider_links),
    can_review_candidates: c(e.can_review_candidates),
    can_view_comments: c(e.can_view_comments)
  };
}
function S(r) {
  if (!r || typeof r != "object")
    return null;
  const e = n(r), o = i(e.id);
  return o ? {
    id: o,
    provider_kind: i(e.provider_kind),
    external_file_id: i(e.external_file_id),
    account_id: t(e.account_id),
    drive_id: t(e.drive_id),
    web_url: t(e.web_url),
    handle_status: i(e.handle_status),
    valid_from: t(e.valid_from),
    valid_to: t(e.valid_to),
    links: n(e.links)
  } : null;
}
function ee(r) {
  const e = n(r);
  return {
    source: a(e.source),
    items: Array.isArray(e.items) ? e.items.map((o) => S(o)).filter((o) => o !== null) : [],
    page_info: y(e.page_info),
    permissions: l(e.permissions),
    empty_state: d(e.empty_state),
    links: n(e.links)
  };
}
function A(r) {
  if (!r || typeof r != "object")
    return null;
  const e = n(r), o = i(e.kind);
  return o ? {
    kind: o,
    label: i(e.label),
    external_file_id: t(e.external_file_id),
    account_id: t(e.account_id),
    drive_id: t(e.drive_id),
    web_url: t(e.web_url),
    extension: re(e.extension)
  } : null;
}
function re(r) {
  if (!r || typeof r != "object")
    return;
  const e = n(r), o = i(e.schema);
  if (o)
    return {
      schema: o,
      values: I(e.values)
    };
}
export {
  K as A,
  Y as B,
  x as C,
  Q as D,
  $ as E,
  P as F,
  J as G,
  T as H,
  F as I,
  G as J,
  M as K,
  me as L,
  le as M,
  pe as S,
  de as a,
  z as b,
  w as c,
  v as d,
  O as e,
  g as f,
  ae as g,
  ce as h,
  _e as i,
  se as j,
  ie as k,
  oe as l,
  ne as m,
  ge as n,
  U as o,
  W as p,
  fe as q,
  ue as r,
  j as s,
  X as t,
  h as u,
  ye as v,
  H as w,
  q as x,
  V as y,
  B as z
};
//# sourceMappingURL=lineage-contracts-BR7-TggW.js.map
