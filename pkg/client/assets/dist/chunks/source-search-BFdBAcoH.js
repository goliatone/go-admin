import "./source-management-pages-Bzq4f4fH.js";
function c(e) {
  return {
    id: e?.id ?? "",
    label: e?.label ?? "",
    url: e?.url ?? ""
  };
}
function h(e) {
  return {
    kind: e?.kind ?? "",
    label: e?.label ?? "",
    externalFileId: e?.external_file_id ?? "",
    webUrl: e?.web_url ?? ""
  };
}
function m(e) {
  const n = e.kind ?? "none";
  return {
    isEmpty: n !== "none",
    kind: n,
    title: e.title ?? "",
    description: e.description ?? ""
  };
}
function u(e) {
  const n = e.page ?? 1, t = e.page_size ?? 20, s = e.total_count ?? 0, i = t > 0 ? Math.ceil(s / t) : 0, r = (n - 1) * t + 1, v = Math.min(n * t, s);
  return {
    mode: e.mode ?? "page",
    currentPage: n,
    pageSize: t,
    totalCount: s,
    totalPages: i,
    hasMore: e.has_more ?? !1,
    hasPrevious: n > 1,
    firstItemIndex: s > 0 ? r : 0,
    lastItemIndex: s > 0 ? v : 0,
    sort: e.sort ?? ""
  };
}
function y(e) {
  const n = c(e.source), t = h(e.provider), s = e.latest_revision;
  return {
    id: n.id,
    label: n.label || "(Untitled Source)",
    status: e.status ?? "unknown",
    statusLabel: S(e.status),
    confidence: e.lineage_confidence ?? "unknown",
    confidenceLabel: b(e.lineage_confidence),
    providerKind: t.kind,
    providerLabel: t.label,
    externalFileId: t.externalFileId,
    webUrl: t.webUrl,
    latestRevisionId: s?.id ?? "",
    latestModifiedTime: s?.modified_time ?? "",
    revisionCount: e.revision_count ?? 0,
    handleCount: e.handle_count ?? 0,
    relationshipCount: e.relationship_count ?? 0,
    pendingCandidateCount: e.pending_candidate_count ?? 0,
    hasPendingCandidates: (e.pending_candidate_count ?? 0) > 0,
    permissions: e.permissions ?? l(),
    links: e.links ?? {}
  };
}
function w(e) {
  const n = c(e.source), t = h(e.provider), s = e.active_handle, i = e.latest_revision, r = m(e.empty_state);
  return {
    id: n.id,
    label: n.label || "(Untitled Source)",
    status: e.status ?? "unknown",
    statusLabel: S(e.status),
    confidence: e.lineage_confidence ?? "unknown",
    confidenceLabel: b(e.lineage_confidence),
    providerKind: t.kind,
    providerLabel: t.label,
    externalFileId: t.externalFileId,
    webUrl: t.webUrl,
    activeHandleId: s?.id ?? "",
    activeHandleStatus: s?.handle_status ?? "",
    latestRevisionId: i?.id ?? "",
    latestModifiedTime: i?.modified_time ?? "",
    revisionCount: e.revision_count ?? 0,
    handleCount: e.handle_count ?? 0,
    relationshipCount: e.relationship_count ?? 0,
    pendingCandidateCount: e.pending_candidate_count ?? 0,
    hasPendingCandidates: (e.pending_candidate_count ?? 0) > 0,
    isEmpty: r.isEmpty,
    emptyStateKind: r.kind,
    emptyStateTitle: r.title,
    emptyStateDescription: r.description,
    permissions: e.permissions ?? l(),
    links: e.links ?? {}
  };
}
function k(e) {
  const n = e.revision, t = e.primary_artifact, s = e.fingerprint_status, i = e.fingerprint_processing;
  return {
    id: n?.id ?? "",
    providerRevisionHint: n?.provider_revision_hint ?? "",
    modifiedTime: n?.modified_time ?? "",
    exportedAt: n?.exported_at ?? "",
    sourceMimeType: n?.source_mime_type ?? "",
    primaryArtifactId: t?.id ?? "",
    primaryArtifactSha256: t?.sha256 ?? "",
    primaryArtifactPageCount: t?.page_count ?? 0,
    fingerprintStatus: s.status ?? "unknown",
    fingerprintStatusLabel: I(s.status),
    fingerprintProcessingState: i.state ?? "unknown",
    fingerprintProcessingLabel: P(i.state),
    fingerprintEvidenceAvailable: s.evidence_available ?? !1,
    isLatest: e.is_latest ?? !1,
    links: e.links ?? {}
  };
}
function C(e) {
  const n = c(e.counterpart_source), t = e.evidence ?? [];
  return {
    id: e.id ?? "",
    relationshipType: e.relationship_type ?? "unknown",
    relationshipTypeLabel: T(e.relationship_type),
    status: e.status ?? "unknown",
    statusLabel: D(e.status),
    confidenceBand: e.confidence_band ?? "unknown",
    confidenceBandLabel: F(e.confidence_band),
    confidenceScore: e.confidence_score ?? 0,
    summary: e.summary ?? "",
    counterpartSourceId: n.id,
    counterpartSourceLabel: n.label,
    counterpartSourceUrl: n.url,
    evidenceCount: t.length,
    evidenceLabels: t.map((s) => s.label),
    reviewActionVisible: e.review_action_visible ?? "hidden",
    canReview: e.review_action_visible !== "hidden",
    links: e.links ?? {}
  };
}
function L(e) {
  return {
    items: e.items.map(y),
    pagination: u(e.page_info),
    emptyState: m(e.empty_state),
    permissions: e.permissions ?? l(),
    links: e.links ?? {}
  };
}
function A(e) {
  return {
    source: c(e.source),
    items: e.items.map(k),
    pagination: u(e.page_info),
    emptyState: m(e.empty_state),
    permissions: e.permissions ?? l(),
    links: e.links ?? {}
  };
}
function R(e) {
  return {
    source: c(e.source),
    items: e.items.map(C),
    pagination: u(e.page_info),
    emptyState: m(e.empty_state),
    permissions: e.permissions ?? l(),
    links: e.links ?? {}
  };
}
function S(e) {
  const n = (e ?? "unknown").toLowerCase();
  return {
    active: "Active",
    archived: "Archived",
    merged: "Merged",
    unknown: "Unknown"
  }[n] ?? n;
}
function b(e) {
  const n = (e ?? "unknown").toLowerCase();
  return {
    high: "High Confidence",
    medium: "Medium Confidence",
    low: "Low Confidence",
    unknown: "Unknown"
  }[n] ?? n;
}
function I(e) {
  const n = (e ?? "unknown").toLowerCase();
  return {
    ready: "Ready",
    pending: "Pending",
    failed: "Failed",
    not_applicable: "Not Applicable",
    unknown: "Unknown"
  }[n] ?? n;
}
function P(e) {
  const n = (e ?? "unknown").toLowerCase();
  return {
    queued: "Queued",
    running: "Running",
    retrying: "Retrying",
    ready: "Ready",
    failed: "Failed",
    stale: "Stale",
    not_applicable: "Not Applicable",
    unknown: "Unknown"
  }[n] ?? n;
}
function T(e) {
  const n = (e ?? "unknown").toLowerCase();
  return {
    copied_from: "Copied From",
    predecessor_of: "Predecessor Of",
    successor_of: "Successor Of",
    migrated_from: "Migrated From",
    exact_duplicate: "Exact Duplicate",
    unknown: "Unknown"
  }[n] ?? n;
}
function D(e) {
  const n = (e ?? "unknown").toLowerCase();
  return {
    pending_review: "Pending Review",
    confirmed: "Confirmed",
    rejected: "Rejected",
    superseded: "Superseded",
    auto_linked: "Auto-Linked",
    unknown: "Unknown"
  }[n] ?? n;
}
function F(e) {
  const n = (e ?? "unknown").toLowerCase();
  return {
    exact: "Exact Match",
    high: "High Confidence",
    medium: "Medium Confidence",
    low: "Low Confidence",
    unknown: "Unknown"
  }[n] ?? n;
}
function l() {
  return {
    can_view_diagnostics: !1,
    can_open_provider_links: !1,
    can_review_candidates: !1,
    can_view_comments: !1
  };
}
function a(e) {
  return {
    metadata: {
      kind: "loading",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    loadingMessage: e?.loadingMessage ?? "Loading sources...",
    showProgress: e?.showProgress ?? !0,
    cancellable: e?.cancellable ?? !1
  };
}
function U(e) {
  const n = L(e);
  return {
    metadata: {
      kind: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    items: n.items,
    pagination: n.pagination,
    permissions: n.permissions,
    hasData: n.items.length > 0
  };
}
function x(e) {
  const n = w(e);
  return {
    metadata: {
      kind: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    source: n,
    permissions: e.permissions,
    hasData: !n.isEmpty
  };
}
function M(e) {
  const n = A(e);
  return {
    metadata: {
      kind: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    sourceId: n.source.id,
    sourceLabel: n.source.label,
    items: n.items,
    pagination: n.pagination,
    permissions: n.permissions,
    hasData: n.items.length > 0
  };
}
function G(e) {
  const n = R(e);
  return {
    metadata: {
      kind: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    sourceId: n.source.id,
    sourceLabel: n.source.label,
    items: n.items,
    pagination: n.pagination,
    permissions: n.permissions,
    hasData: n.items.length > 0
  };
}
function o(e, n) {
  const t = e.kind ?? "none";
  return {
    metadata: {
      kind: "empty",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    emptyState: {
      isEmpty: t !== "none",
      kind: t,
      title: e.title ?? "",
      description: e.description ?? ""
    },
    suggestedActions: n?.suggestedActions ?? [],
    actionable: n?.actionable ?? !1
  };
}
function d(e, n = !0) {
  const t = e.message.match(/HTTP (\d+):/), s = t ? `HTTP_${t[1]}` : void 0, i = [];
  return n && i.push({
    label: "Try Again",
    actionType: "retry",
    actionHandler: "retry"
  }), i.push({
    label: "Go Back",
    actionType: "navigate",
    actionHandler: "goBack"
  }), {
    metadata: {
      kind: "error",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      errorCode: s
    },
    title: "Unable to Load Data",
    message: e.message,
    code: s,
    retryable: n,
    suggestedActions: i
  };
}
function p(e) {
  return {
    metadata: {
      kind: "unauthorized",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    title: e?.title ?? "Access Denied",
    description: e?.description ?? "You do not have permission to view this resource. Contact your administrator if you believe this is an error.",
    requiredPermission: e?.requiredPermission,
    suggestedActions: [
      {
        label: "Go Back",
        actionType: "navigate",
        actionHandler: "goBack"
      },
      {
        label: "Request Access",
        actionType: "request_access",
        actionHandler: "requestAccess"
      }
    ]
  };
}
function _(e, n, t, s) {
  return {
    metadata: {
      kind: "degraded",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      warnings: [n]
    },
    successState: e,
    degradationReason: n,
    severity: t,
    suggestedActions: s?.suggestedActions ?? [
      {
        label: "Refresh",
        actionType: "refresh",
        actionHandler: "refresh"
      }
    ],
    stale: s?.stale ?? !1,
    lastSuccessfulFetch: s?.lastSuccessfulFetch
  };
}
function Y(e, n, t) {
  return e ? a({ loadingMessage: "Loading sources..." }) : n !== null ? n.message.includes("403") || n.message.includes("Forbidden") ? p() : d(n) : t === null ? a() : t.empty_state.kind !== "none" ? o(t.empty_state, {
    suggestedActions: [
      {
        label: "Clear Filters",
        actionType: "filter_reset",
        actionHandler: "clearFilters"
      }
    ],
    actionable: !0
  }) : U(t);
}
function Q(e, n, t) {
  return e ? a({ loadingMessage: "Loading source..." }) : n !== null ? n.message.includes("403") || n.message.includes("Forbidden") ? p() : n.message.includes("404") || n.message.includes("Not Found") ? o(
    {
      kind: "not_found",
      title: "Source Not Found",
      description: "The requested source document could not be found."
    },
    {
      suggestedActions: [
        {
          label: "View All Sources",
          actionType: "navigate",
          actionUrl: "/admin/sources"
        }
      ]
    }
  ) : d(n) : t === null ? a() : t.empty_state.kind !== "none" ? o(t.empty_state) : x(t);
}
function J(e, n, t) {
  return e ? a({ loadingMessage: "Loading revisions..." }) : n !== null ? n.message.includes("403") || n.message.includes("Forbidden") ? p() : d(n) : t === null ? a() : t.empty_state.kind !== "none" ? o(t.empty_state) : M(t);
}
function H(e) {
  return {
    source_document: "Source Document",
    source_revision: "Source Revision"
  }[e] ?? e;
}
function z(e) {
  const n = {
    canonical_title: "Title",
    external_file_id: "File ID",
    revision_hint: "Version",
    artifact_hash: "Content Hash",
    fingerprint_hash: "Fingerprint",
    comment_text: "Comment Text",
    provider_url: "URL",
    search_text: "Content"
  };
  return e.map((t) => n[t] ?? t);
}
function g(e) {
  return {
    not_configured: "Not Configured",
    pending_sync: "Syncing...",
    synced: "Synced",
    failed: "Sync Failed",
    stale: "Data May Be Outdated"
  }[e] ?? e;
}
function q(e) {
  switch (e) {
    case "synced":
      return "success";
    case "pending_sync":
      return "info";
    case "failed":
      return "error";
    case "stale":
      return "warning";
    case "not_configured":
    default:
      return "neutral";
  }
}
function O(e) {
  return {
    open: "Open",
    resolved: "Resolved",
    deleted: "Deleted"
  }[e] ?? e;
}
function E(e) {
  return {
    user: "User",
    bot: "Bot",
    service_account: "Service Account"
  }[e] ?? e;
}
function B(e) {
  return {
    id: e.source?.id ?? e.revision?.id ?? "",
    resultKind: e.result_kind ?? "unknown",
    resultKindLabel: H(e.result_kind ?? ""),
    sourceId: e.source?.id ?? "",
    sourceLabel: e.source?.label ?? "(Untitled)",
    sourceUrl: e.source?.url ?? "",
    revisionId: e.revision?.id ?? "",
    revisionHint: e.revision?.provider_revision_hint ?? "",
    modifiedTime: e.revision?.modified_time ?? "",
    providerKind: e.provider?.kind ?? "",
    providerLabel: e.provider?.label ?? "",
    webUrl: e.provider?.web_url ?? "",
    matchedFields: e.matched_fields ?? [],
    matchedFieldLabels: z(e.matched_fields ?? []),
    summary: e.summary ?? "",
    relationshipState: e.relationship_state ?? "",
    relationshipStateLabel: K(e.relationship_state),
    commentSyncStatus: e.comment_sync_status ?? "",
    commentSyncStatusLabel: g(e.comment_sync_status ?? ""),
    commentCount: e.comment_count ?? 0,
    hasComments: e.has_comments ?? !1,
    artifactHash: e.artifact_hash ?? ""
  };
}
function K(e) {
  const n = (e ?? "unknown").toLowerCase();
  return {
    pending_review: "Pending Review",
    confirmed: "Confirmed",
    rejected: "Rejected",
    superseded: "Superseded",
    auto_linked: "Auto-Linked",
    unknown: ""
  }[n] ?? n;
}
function N(e, n) {
  const t = n?.status ?? e;
  return {
    status: t,
    statusLabel: g(t),
    statusVariant: q(t),
    threadCount: n?.thread_count ?? 0,
    messageCount: n?.message_count ?? 0,
    lastSyncedAt: n?.last_synced_at ?? "",
    lastAttemptAt: n?.last_attempt_at ?? "",
    hasError: !!n?.error_code,
    errorCode: n?.error_code ?? "",
    errorMessage: n?.error_message ?? "",
    isStale: t === "stale",
    isPending: t === "pending_sync",
    isSynced: t === "synced"
  };
}
function j(e) {
  return {
    id: e.id ?? "",
    providerCommentId: e.provider_comment_id ?? "",
    threadId: e.thread_id ?? "",
    status: e.status ?? "unknown",
    statusLabel: O(e.status ?? ""),
    isResolved: !!e.resolved_at,
    anchorKind: e.anchor?.kind ?? "",
    anchorLabel: e.anchor?.label ?? "General",
    authorName: e.author?.display_name ?? e.author_name ?? "Unknown",
    authorEmail: e.author?.email ?? "",
    authorType: e.author?.type ?? "user",
    authorTypeLabel: E(e.author?.type ?? "user"),
    bodyPreview: e.body_preview ?? "",
    messageCount: e.message_count ?? 0,
    replyCount: e.reply_count ?? 0,
    hasReplies: (e.reply_count ?? 0) > 0,
    resolvedAt: e.resolved_at ?? "",
    lastSyncedAt: e.last_synced_at ?? "",
    lastActivityAt: e.last_activity_at ?? "",
    syncStatus: e.sync_status ?? "",
    syncStatusLabel: g(e.sync_status ?? "")
  };
}
function V(e) {
  const n = (e.items ?? []).map(B), t = e.applied_query, s = [];
  return t.query && s.push(`query: "${t.query}"`), t.has_comments !== void 0 && s.push(t.has_comments ? "has comments" : "no comments"), t.comment_sync_status && s.push(`sync: ${t.comment_sync_status}`), t.relationship_state && s.push(`relationship: ${t.relationship_state}`), {
    metadata: {
      kind: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    items: n,
    pagination: u(e.page_info),
    permissions: e.permissions,
    hasData: n.length > 0,
    hasFilters: s.length > 1 || s.length === 1 && !t.query,
    filterSummary: s.join(", ")
  };
}
function f(e) {
  const n = (e.items ?? []).map(j);
  return {
    metadata: {
      kind: "success",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    },
    sourceId: e.source?.id ?? "",
    sourceLabel: e.source?.label ?? "(Untitled)",
    revisionId: e.revision?.id ?? "",
    revisionHint: e.revision?.provider_revision_hint ?? "",
    items: n,
    pagination: u(e.page_info),
    permissions: e.permissions,
    syncStatus: N(e.sync_status, e.sync),
    hasData: n.length > 0
  };
}
function W(e, n, t) {
  return e ? a({ loadingMessage: "Searching sources..." }) : n !== null ? n.message.includes("403") || n.message.includes("Forbidden") ? p() : d(n) : t === null ? a() : t.empty_state.kind !== "none" ? o(t.empty_state, {
    suggestedActions: [
      {
        label: "Clear Search",
        actionType: "filter_reset",
        actionHandler: "clearSearch"
      }
    ],
    actionable: !0
  }) : V(t);
}
function X(e, n, t) {
  if (e)
    return a({ loadingMessage: "Loading comments..." });
  if (n !== null)
    return n.message.includes("403") || n.message.includes("Forbidden") ? p({
      title: "Comments Not Available",
      description: "You do not have permission to view comments for this source.",
      requiredPermission: "can_view_comments"
    }) : d(n);
  if (t === null)
    return a();
  const s = t.sync_status;
  return s === "failed" ? _(
    f(t),
    t.sync?.error_message ?? "Comment synchronization failed",
    "critical",
    {
      stale: !1,
      suggestedActions: [
        {
          label: "Retry Sync",
          actionType: "retry",
          actionHandler: "retrySync"
        }
      ]
    }
  ) : s === "stale" ? _(
    f(t),
    "Comment data may be outdated",
    "warning",
    {
      stale: !0,
      lastSuccessfulFetch: t.sync?.last_synced_at,
      suggestedActions: [
        {
          label: "Refresh",
          actionType: "refresh",
          actionHandler: "refresh"
        }
      ]
    }
  ) : t.empty_state.kind !== "none" ? s === "pending_sync" ? o(
    {
      kind: "pending_sync",
      title: "Comments syncing",
      description: "Comment synchronization is in progress. Comments will appear once sync completes."
    },
    {
      actionable: !1
    }
  ) : s === "not_configured" ? o(
    {
      kind: "not_configured",
      title: "Comments not configured",
      description: "Comment synchronization is not enabled for this source."
    },
    {
      actionable: !1
    }
  ) : o(t.empty_state, {
    suggestedActions: [
      {
        label: "View Source",
        actionType: "navigate",
        actionUrl: t.links?.source
      }
    ]
  }) : f(t);
}
export {
  W as A,
  X as B,
  w as a,
  A as b,
  u as c,
  R as d,
  a as e,
  f,
  V as g,
  G as h,
  M as i,
  x as j,
  U as k,
  o as l,
  d as m,
  m as n,
  y as o,
  k as p,
  C as q,
  L as r,
  p as s,
  _ as t,
  Y as u,
  Q as v,
  J as w,
  B as x,
  N as y,
  j as z
};
//# sourceMappingURL=source-search-BFdBAcoH.js.map
