import { httpRequest as f, readHTTPError as S, readHTTPJSON as v } from "../shared/transport/http-client.js";
import { StatefulController as P } from "../shared/stateful-controller.js";
import { P as w } from "./lineage-contracts-Ix6WeIZs.js";
function Q(e) {
  return {
    workspaceId: e,
    panels: {
      detail: {
        panelId: "detail",
        label: "Overview",
        contracts: null,
        loading: !0,
        error: null,
        active: !0,
        visibilityCondition: { requiresData: !1 }
      },
      revisions: {
        panelId: "revisions",
        label: "Revisions",
        contracts: null,
        loading: !1,
        error: null,
        active: !1,
        visibilityCondition: { requiresData: !1 }
      },
      relationships: {
        panelId: "relationships",
        label: "Relationships",
        contracts: null,
        loading: !1,
        error: null,
        active: !1,
        visibilityCondition: { requiredPermission: "can_review_candidates" }
      },
      handles: {
        panelId: "handles",
        label: "Handles",
        contracts: null,
        loading: !1,
        error: null,
        active: !1,
        visibilityCondition: { requiresData: !1 }
      },
      comments: {
        panelId: "comments",
        label: "Comments",
        contracts: null,
        loading: !1,
        error: null,
        active: !1,
        visibilityCondition: { requiredPermission: "can_view_comments" }
      }
    },
    permissions: {
      can_view_diagnostics: !1,
      can_open_provider_links: !1,
      can_review_candidates: !1,
      can_view_comments: !1
    },
    navigationContext: {
      currentRoute: `/sources/${e}`,
      backTarget: "/sources",
      breadcrumbs: [{
        label: "Sources",
        url: "/sources",
        isCurrent: !1
      }, {
        label: "Loading...",
        url: `/sources/${e}`,
        isCurrent: !0
      }],
      availablePanels: [
        "detail",
        "revisions",
        "relationships",
        "handles",
        "comments"
      ],
      activePanel: "detail"
    },
    loading: !0,
    error: null
  };
}
function W() {
  return {
    workspaceId: "source-search",
    panels: {
      results: {
        panelId: "results",
        label: "Search Results",
        contracts: null,
        loading: !1,
        error: null,
        active: !0,
        visibilityCondition: { requiresData: !1 }
      },
      preview: {
        panelId: "preview",
        label: "Preview",
        contracts: null,
        loading: !1,
        error: null,
        active: !1,
        visibilityCondition: { requiresData: !0 }
      }
    },
    permissions: {
      can_view_diagnostics: !1,
      can_open_provider_links: !1,
      can_review_candidates: !1,
      can_view_comments: !1
    },
    navigationContext: {
      currentRoute: "/source-search",
      breadcrumbs: [{
        label: "Search",
        url: "/source-search",
        isCurrent: !0
      }],
      availablePanels: ["results", "preview"],
      activePanel: "results"
    },
    loading: !1,
    error: null
  };
}
function _(e, t) {
  const n = [], s = [];
  return t.includes(e.endpointFamily) || n.push(`Page ${e.pageId} consumes unapproved endpoint family: ${e.endpointFamily}. Allowed: ${t.join(", ")}`), e.contractVersion < 1 && s.push(`Page ${e.pageId} has invalid contract version: ${e.contractVersion}`), {
    valid: n.length === 0,
    errors: n,
    warnings: s
  };
}
function B(e) {
  const t = [
    "SourceListPage",
    "SourceDetail",
    "SourceWorkspace",
    "SourceRevisionPage",
    "SourceRelationshipPage",
    "SourceHandlePage",
    "SourceRevisionDetail",
    "SourceArtifactPage",
    "SourceCommentPage",
    "SourceSearchResults"
  ], n = ["DocumentLineageDetail", "AgreementLineageDetail"], s = e.some((l) => t.includes(l)), a = e.some((l) => n.includes(l));
  return s && a;
}
var G = {
  version: 1,
  enforcementLevel: "strict",
  approvedContracts: [
    "SourceListPage",
    "SourceDetail",
    "SourceRevisionPage",
    "SourceRelationshipPage",
    "SourceHandlePage",
    "SourceRevisionDetail",
    "SourceArtifactPage",
    "SourceCommentPage",
    "SourceSearchResults"
  ],
  prohibitedMixing: [
    "DocumentLineageDetail + SourceManagementContracts",
    "AgreementLineageDetail + SourceManagementContracts",
    "Multiple source-management endpoints in single page"
  ],
  architecturalInvariants: [
    "Backend owns semantics",
    "Frontend owns presentation",
    "One canonical contract family per page",
    "No client-side lineage computation",
    "Provider-neutral by default"
  ]
}, H = {
  version: 1,
  phase: 13,
  enforcementLevel: "strict",
  approvedContracts: [
    "SourceListPage",
    "SourceDetail",
    "SourceRevisionPage",
    "SourceRelationshipPage",
    "SourceHandlePage",
    "SourceRevisionDetail",
    "SourceArtifactPage",
    "SourceCommentPage",
    "SourceSearchResults",
    "Phase13SourceSearchQuery",
    "Phase13SourceSearchResults",
    "Phase13SourceSearchResultSummary",
    "Phase13SourceCommentPage",
    "Phase13SourceCommentThreadSummary",
    "SourceCommentAuthorSummary",
    "SourceCommentMessageSummary",
    "SourceCommentSyncSummary",
    "SourceCommentListQuery"
  ],
  prohibitedMixing: [
    "DocumentLineageDetail + SourceManagementContracts",
    "AgreementLineageDetail + SourceManagementContracts",
    "Multiple source-management endpoints in single page",
    "AgreementReviewComment + SourceComment",
    "GoogleDriveComment (raw) + SourceComment",
    "Multiple search contract families in single page",
    "Cross-workspace comment merging"
  ],
  architecturalInvariants: [
    "Backend owns semantics",
    "Frontend owns presentation",
    "One canonical contract family per page",
    "No client-side lineage computation",
    "Provider-neutral by default",
    "Workspace orchestration over direct panel communication",
    "Source comments distinct from agreement-review comments",
    "Sync status is backend-computed display state",
    "Search ranking is backend responsibility",
    "Comment threading is backend-authored"
  ],
  workspacePatterns: {
    sourceDetailWorkspace: {
      primaryContract: "SourceDetail",
      panelContracts: {
        revisions: "SourceRevisionPage",
        relationships: "SourceRelationshipPage",
        handles: "SourceHandlePage",
        comments: "Phase13SourceCommentPage"
      },
      orchestrationMode: "single-source"
    },
    sourceSearchWorkspace: {
      primaryContract: "Phase13SourceSearchResults",
      panelContracts: {
        results: "Phase13SourceSearchResults",
        preview: "SourceDetail"
      },
      orchestrationMode: "search-driven"
    }
  }
}, V = {
  version: 2,
  phase: 14,
  documentationDate: "2025-03-22",
  backendOwnsSemantics: {
    description: "The backend is the single source of truth for all semantic decisions",
    examples: [
      "Lineage semantics (newer source exists, source continuity, canonical identity)",
      "Warning precedence (which warnings to show, in what order, with what severity)",
      "Source continuity (whether sources are related, relationship computation)",
      "Search ranking (relevance scores, result ordering, match strength)",
      "Candidate scoring (confidence scores, relationship strength, match evidence)",
      "Revision ordering (which revision is latest, temporal ordering)",
      "Sync state derivation (comment sync status, stale detection, retry logic)"
    ],
    prohibitions: [
      "Frontend must NOT compute any of the above semantics client-side",
      "Frontend must NOT infer semantic state from presence/absence of data",
      "Frontend must NOT reconstruct semantic state by stitching multiple endpoints",
      "Frontend must NOT override or adjust backend-authored semantic decisions"
    ]
  },
  frontendOwnsPresentation: {
    description: "The frontend has full autonomy over all presentation concerns",
    examples: [
      "Visual design (colors, typography, spacing, layout)",
      "Interaction patterns (hover states, focus indicators, animations)",
      "Accessibility (ARIA labels, screen reader text, keyboard navigation)",
      "Loading indicators (skeletons, spinners, progress bars)",
      "Error messages (user-friendly error text, retry affordances)",
      "Empty state presentation (illustrations, suggested actions)",
      "Responsive behavior (breakpoints, mobile adaptations)"
    ],
    permissions: [
      "Frontend MAY decide how to visually represent backend-authored state",
      "Frontend MAY add cosmetic UI enhancements (animations, transitions)",
      "Frontend MAY implement any interaction pattern without semantic computation",
      "Frontend MAY transform display labels (formatting, truncation, localization)"
    ],
    requirements: [
      "Frontend MUST accept backend semantic decisions without modification",
      "Frontend MUST use backend-authored labels when provided",
      "Frontend MUST display backend-computed values without recomputation"
    ]
  },
  oneContractFamilyPerPage: {
    description: "Every page must attach to exactly ONE canonical contract family",
    canonicalFamilies: [
      "SourceListPage",
      "SourceDetail",
      "SourceRevisionPage",
      "SourceRelationshipPage",
      "SourceHandlePage",
      "SourceRevisionDetail",
      "SourceArtifactPage",
      "SourceCommentPage",
      "SourceSearchResults",
      "Phase13SourceSearchResults",
      "Phase13SourceCommentPage"
    ],
    preImplementationChecklist: [
      "Page consumes exactly one contract family from canonical list",
      "Page does not mix multiple contract families",
      "Page does not depend on contracts outside approved modules",
      "Contract consumption is validated by Phase 14 guards"
    ]
  },
  approvedModulesOnly: {
    description: "Pages must consume contracts through approved modules",
    approvedModules: [
      "lineage-contracts.ts",
      "source-management-adapters.ts",
      "source-management-composition.ts",
      "source-management-fixtures.ts",
      "source-management-guards.ts",
      "source-management-pages.ts",
      "source-management-rendering-states.ts"
    ],
    prohibitions: [
      "Pages must NOT import contracts from unapproved modules",
      "Pages must NOT construct contract types directly outside approved modules",
      "Pages must NOT access internal/private contract implementation details",
      "Pages must NOT create alternative contract type definitions"
    ]
  },
  noRawGoogleFields: {
    description: "Pages must not directly access raw Google-specific fields",
    forbiddenFields: [
      "Google Drive API fields (kind, htmlContent, quotedFileContent)",
      "KIX anchors and internal references",
      "Raw Google user/account identifiers",
      "Google-specific metadata (exportLinks, thumbnailLink)"
    ],
    approvedAdapters: ["source-management-adapters.ts", "lineage-contracts.ts (normalization functions)"],
    rationale: "Ensures provider-neutrality and supports multi-provider expansion"
  },
  implementationSequence: {
    description: "Implementation sequence for new pages/components",
    steps: [
      {
        order: 1,
        name: "Attach to canonical contract family",
        tasks: [
          "Determine which single contract family the page consumes",
          "Verify contract is available from approved modules",
          "Define page composition metadata (pageId, endpointFamily, contractVersion)"
        ]
      },
      {
        order: 2,
        name: "Implement data flow",
        tasks: [
          "Create page controller with URL state management",
          "Wire up contract fetching through approved patterns",
          "Implement rendering state resolution"
        ]
      },
      {
        order: 3,
        name: "Run architectural guards",
        tasks: [
          "Call runPhase14PageGuards() with page config",
          "Fix any violations before proceeding",
          "All guards must pass before visual implementation"
        ]
      },
      {
        order: 4,
        name: "Implement visual presentation",
        tasks: [
          "Build UI components using rendering state view models",
          "Apply visual design and interaction patterns",
          "Add accessibility and responsiveness"
        ]
      }
    ],
    warning: "Do not start visual implementation until steps 1-3 are complete"
  },
  preImplementationChecklist: [
    "Page attaches to exactly ONE canonical contract family",
    "Contract is imported from approved modules only",
    "Page does not access raw Google-specific fields",
    "Page does not compute backend-owned semantics",
    "Page uses rendering state factory functions",
    "Page controller manages URL state appropriately",
    "All Phase 14 guards pass for page configuration",
    "Page composition is validated by validatePageComposition()"
  ]
}, i = class extends P {
  constructor(e, t) {
    super({
      loading: !1,
      error: null,
      contracts: null
    }, e.onStateChange), this.config = e, this.metadata = {
      pageId: t.pageId,
      apiBasePath: e.apiBasePath,
      endpointFamily: t.endpointFamily,
      contractVersion: 1
    };
    const n = _(this.metadata, t.dependencies);
    n.valid || console.error(`[${t.label}] Composition validation failed:`, n.errors), t.logWarnings && n.warnings.length > 0 && console.warn(`[${t.label}] Composition warnings:`, n.warnings);
  }
};
async function c(e, t = {}) {
  const n = {
    "Content-Type": "application/json",
    ...t.headers
  }, s = {
    method: t.method ?? "GET",
    headers: n
  };
  t.body && (s.body = JSON.stringify(t.body));
  const a = await f(e, s);
  if (!a.ok) {
    const l = await S(a, `HTTP ${a.status}`, { appendStatusToFallback: !1 });
    throw new Error(l.startsWith(`HTTP ${a.status}`) ? l : `HTTP ${a.status}: ${l}`);
  }
  return v(a);
}
function r() {
  return typeof window > "u" ? new URLSearchParams() : new URLSearchParams(window.location.search);
}
function o(e) {
  if (typeof window > "u" || typeof history > "u") return;
  const t = new URL(window.location.href), n = t.searchParams;
  Object.entries(e).forEach(([s, a]) => {
    a == null || a === "" ? n.delete(s) : n.set(s, String(a));
  }), t.search = n.toString(), history.pushState({}, "", t.toString());
}
function p(e) {
  return {
    q: e.query,
    query: void 0,
    provider_kind: e.provider_kind,
    status: e.status,
    has_pending_candidates: e.has_pending_candidates,
    sort: e.sort,
    page: e.page,
    page_size: e.page_size
  };
}
function y(e) {
  const t = Number.parseInt(e.get("page") ?? "1", 10), n = Number.parseInt(e.get("page_size") ?? "20", 10);
  return {
    query: e.get("q") ?? e.get("query") ?? void 0,
    provider_kind: e.get("provider_kind") ?? void 0,
    status: e.get("status") ?? void 0,
    has_pending_candidates: e.get("has_pending_candidates") === "true" ? !0 : void 0,
    sort: e.get("sort") ?? void 0,
    page: t > 0 ? t : 1,
    page_size: n > 0 ? n : 20
  };
}
function b(e) {
  const t = Number.parseInt(e.get("page") ?? "1", 10), n = Number.parseInt(e.get("page_size") ?? "20", 10);
  return {
    sort: e.get("sort") ?? void 0,
    page: t > 0 ? t : 1,
    page_size: n > 0 ? n : 20
  };
}
function u(e) {
  const t = Number.parseInt(e.get("page") ?? "1", 10), n = Number.parseInt(e.get("page_size") ?? "20", 10);
  return {
    status: e.get("status") ?? void 0,
    sync_status: e.get("sync_status") ?? void 0,
    page: t > 0 ? t : 1,
    page_size: n > 0 ? n : 20
  };
}
function m(e) {
  const t = Number.parseInt(e.get("page") ?? "1", 10), n = Number.parseInt(e.get("page_size") ?? "20", 10);
  return {
    query: e.get("q") ?? e.get("query") ?? void 0,
    provider_kind: e.get("provider_kind") ?? void 0,
    status: e.get("status") ?? void 0,
    result_kind: e.get("result_kind") ?? void 0,
    relationship_state: e.get("relationship_state") ?? void 0,
    comment_sync_status: e.get("comment_sync_status") ?? void 0,
    revision_hint: e.get("revision_hint") ?? void 0,
    sort: e.get("sort") ?? void 0,
    page: t > 0 ? t : 1,
    page_size: n > 0 ? n : 20,
    has_comments: e.get("has_comments") === "true" ? !0 : void 0
  };
}
function k(e) {
  const t = new URLSearchParams();
  return e.query && t.set("q", e.query), e.provider_kind && t.set("provider_kind", e.provider_kind), e.status && t.set("status", e.status), e.has_pending_candidates !== void 0 && t.set("has_pending_candidates", String(e.has_pending_candidates)), e.sort && t.set("sort", e.sort), e.page && e.page !== 1 && t.set("page", String(e.page)), e.page_size && e.page_size !== 20 && t.set("page_size", String(e.page_size)), t.toString();
}
function C(e) {
  const t = new URLSearchParams();
  return e.sort && t.set("sort", e.sort), e.page && e.page !== 1 && t.set("page", String(e.page)), e.page_size && e.page_size !== 20 && t.set("page_size", String(e.page_size)), t.toString();
}
function I(e) {
  const t = new URLSearchParams();
  return e.status && t.set("status", e.status), e.sync_status && t.set("sync_status", e.sync_status), e.page && e.page !== 1 && t.set("page", String(e.page)), e.page_size && e.page_size !== 20 && t.set("page_size", String(e.page_size)), t.toString();
}
function h(e) {
  return {
    q: e.query,
    query: void 0,
    provider_kind: e.provider_kind,
    status: e.status,
    result_kind: e.result_kind,
    relationship_state: e.relationship_state,
    comment_sync_status: e.comment_sync_status,
    revision_hint: e.revision_hint,
    has_comments: e.has_comments,
    sort: e.sort,
    page: e.page,
    page_size: e.page_size
  };
}
function R(e) {
  const t = new URLSearchParams();
  return e.query && t.set("q", e.query), e.provider_kind && t.set("provider_kind", e.provider_kind), e.status && t.set("status", e.status), e.result_kind && t.set("result_kind", e.result_kind), e.relationship_state && t.set("relationship_state", e.relationship_state), e.comment_sync_status && t.set("comment_sync_status", e.comment_sync_status), e.revision_hint && t.set("revision_hint", e.revision_hint), e.has_comments !== void 0 && t.set("has_comments", String(e.has_comments)), e.sort && t.set("sort", e.sort), e.page && e.page !== 1 && t.set("page", String(e.page)), e.page_size && e.page_size !== 20 && t.set("page_size", String(e.page_size)), t.toString();
}
function d(e) {
  return {
    panel: e.get("panel") ?? void 0,
    anchor: e.get("anchor") ?? void 0
  };
}
function T(e) {
  return {
    panel: e.panel,
    anchor: e.anchor
  };
}
function z(e) {
  const t = new URLSearchParams();
  return e.panel && t.set("panel", e.panel), e.anchor && t.set("anchor", e.anchor), t.toString();
}
var L = class extends i {
  constructor(e) {
    super(e, {
      pageId: "source-browser",
      endpointFamily: "sources",
      dependencies: ["sources"],
      label: "SourceBrowserPage",
      logWarnings: !0
    });
  }
  async init() {
    const e = y(r());
    await this.fetchSources(e);
  }
  async fetchSources(e) {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const t = k(e), n = await c(`${this.config.apiBasePath}/sources?${t}`), s = {
        listSources: n,
        query: e,
        permissions: n.permissions
      };
      this.setState({
        loading: !1,
        error: null,
        contracts: s
      });
    } catch (t) {
      this.setState({
        loading: !1,
        error: t instanceof Error ? t : new Error(String(t)),
        contracts: null
      });
    }
  }
  async goToPage(e) {
    const t = {
      ...this.state.contracts?.query ?? {},
      page: e
    };
    o(p(t)), await this.fetchSources(t);
  }
  async applyFilters(e) {
    const t = {
      ...this.state.contracts?.query ?? {},
      ...e,
      page: 1
    };
    o(p(t)), await this.fetchSources(t);
  }
};
function Y(e) {
  const t = new L(e);
  return t.init().catch((n) => {
    console.error("[SourceBrowserPage] Initialization failed:", n);
  }), t;
}
var A = class extends i {
  constructor(e) {
    super(e, {
      pageId: "source-detail",
      endpointFamily: "sources/:id",
      dependencies: ["sources/:id"],
      label: "SourceDetailPage"
    });
  }
  async init() {
    await this.fetchSource();
  }
  async fetchSource() {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const e = await c(`${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}`), t = {
        sourceDetail: e,
        links: e.links,
        permissions: e.permissions
      };
      this.setState({
        loading: !1,
        error: null,
        contracts: t
      });
    } catch (e) {
      this.setState({
        loading: !1,
        error: e instanceof Error ? e : new Error(String(e)),
        contracts: null
      });
    }
  }
  async refresh() {
    await this.fetchSource();
  }
};
function j(e) {
  const t = new A(e);
  return t.init().catch((n) => {
    console.error("[SourceDetailPage] Initialization failed:", n);
  }), t;
}
var D = class extends i {
  constructor(e) {
    super(e, {
      pageId: "source-workspace",
      endpointFamily: "sources/:id/workspace",
      dependencies: ["sources/:id/workspace"],
      label: "SourceWorkspacePage"
    });
  }
  async init() {
    const e = d(r());
    await this.fetchWorkspace(e);
  }
  async fetchWorkspace(e) {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const t = z(e), n = t ? `?${t}` : "", s = w(await c(`${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}/workspace${n}`)), a = {
        workspace: s,
        query: e,
        links: s.links,
        permissions: s.permissions
      };
      this.setState({
        loading: !1,
        error: null,
        contracts: a
      });
    } catch (t) {
      this.setState({
        loading: !1,
        error: t instanceof Error ? t : new Error(String(t)),
        contracts: null
      });
    }
  }
  async refresh() {
    const e = this.state.contracts?.query ?? d(r());
    await this.fetchWorkspace(e);
  }
  async navigateToHref(e) {
    const t = String(e ?? "").trim();
    if (!t || typeof window > "u") return;
    const n = new URL(window.location.href), s = new URL(t, n.origin);
    if (n.pathname !== s.pathname) {
      window.location.assign(s.toString());
      return;
    }
    const a = d(s.searchParams);
    o(T(a)), await this.fetchWorkspace(a);
  }
};
function J(e) {
  const t = new D(e);
  return t.init().catch((n) => {
    console.error("[SourceWorkspacePage] Initialization failed:", n);
  }), t;
}
var E = class extends i {
  constructor(e) {
    super(e, {
      pageId: "source-revision-timeline",
      endpointFamily: "sources/:id/revisions",
      dependencies: ["sources/:id/revisions"],
      label: "SourceRevisionTimelinePage"
    });
  }
  async init() {
    const e = b(r());
    await this.fetchRevisions(e);
  }
  async fetchRevisions(e) {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const t = C(e), n = await c(`${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}/revisions?${t}`), s = {
        revisionPage: n,
        query: e,
        links: n.links
      };
      this.setState({
        loading: !1,
        error: null,
        contracts: s
      });
    } catch (t) {
      this.setState({
        loading: !1,
        error: t instanceof Error ? t : new Error(String(t)),
        contracts: null
      });
    }
  }
  async goToPage(e) {
    const t = {
      ...this.state.contracts?.query ?? {},
      page: e
    };
    o({ page: e }), await this.fetchRevisions(t);
  }
  async changeSort(e) {
    const t = {
      ...this.state.contracts?.query ?? {},
      sort: e,
      page: 1
    };
    o({
      sort: e,
      page: 1
    }), await this.fetchRevisions(t);
  }
};
function K(e) {
  const t = new E(e);
  return t.init().catch((n) => {
    console.error("[SourceRevisionTimelinePage] Initialization failed:", n);
  }), t;
}
var x = class extends i {
  constructor(e) {
    super(e, {
      pageId: "source-revision-inspector",
      endpointFamily: "source-revisions/:id",
      dependencies: ["source-revisions/:id"],
      label: "SourceRevisionInspectorPage"
    });
  }
  async init() {
    await this.fetchRevision();
  }
  async fetchRevision() {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const e = await c(`${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}`), t = {
        revisionDetail: e,
        links: e.links,
        permissions: e.permissions
      };
      this.setState({
        loading: !1,
        error: null,
        contracts: t
      });
    } catch (e) {
      this.setState({
        loading: !1,
        error: e instanceof Error ? e : new Error(String(e)),
        contracts: null
      });
    }
  }
  async refresh() {
    await this.fetchRevision();
  }
};
function X(e) {
  const t = new x(e);
  return t.init().catch((n) => {
    console.error("[SourceRevisionInspectorPage] Initialization failed:", n);
  }), t;
}
var F = class extends i {
  constructor(e) {
    super(e, {
      pageId: "source-comment-inspector",
      endpointFamily: "source-revisions/:id/comments",
      dependencies: ["source-revisions/:id/comments"],
      label: "SourceCommentInspectorPage"
    });
  }
  async init() {
    const e = u(r());
    await this.fetchComments(e);
  }
  async fetchComments(e) {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const t = I(e), n = await c(`${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}/comments?${t}`), s = {
        commentPage: n,
        links: n.links
      };
      this.setState({
        loading: !1,
        error: null,
        contracts: s
      });
    } catch (t) {
      this.setState({
        loading: !1,
        error: t instanceof Error ? t : new Error(String(t)),
        contracts: null
      });
    }
  }
  async goToPage(e) {
    const t = {
      ...this.state.contracts?.commentPage.page_info ? u(r()) : {},
      page: e
    };
    o({ page: e }), await this.fetchComments(t);
  }
  async refresh() {
    const e = u(r());
    await this.fetchComments(e);
  }
};
function Z(e) {
  const t = new F(e);
  return t.init().catch((n) => {
    console.error("[SourceCommentInspectorPage] Initialization failed:", n);
  }), t;
}
var $ = class extends i {
  constructor(e) {
    super(e, {
      pageId: "source-artifact-inspector",
      endpointFamily: "source-revisions/:id/artifacts",
      dependencies: ["source-revisions/:id/artifacts"],
      label: "SourceArtifactInspectorPage"
    });
  }
  async init() {
    await this.fetchArtifacts();
  }
  async fetchArtifacts() {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const e = await c(`${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}/artifacts`), t = {
        artifactPage: e,
        links: e.links
      };
      this.setState({
        loading: !1,
        error: null,
        contracts: t
      });
    } catch (e) {
      this.setState({
        loading: !1,
        error: e instanceof Error ? e : new Error(String(e)),
        contracts: null
      });
    }
  }
  async refresh() {
    await this.fetchArtifacts();
  }
};
function q(e) {
  const t = new $(e);
  return t.init().catch((n) => {
    console.error("[SourceArtifactInspectorPage] Initialization failed:", n);
  }), t;
}
var N = class extends i {
  constructor(e) {
    super(e, {
      pageId: "source-search",
      endpointFamily: "source-search",
      dependencies: ["source-search"],
      label: "SourceSearchPage"
    });
  }
  async init() {
    const e = m(r());
    await this.search(e);
  }
  async search(e) {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const t = R(e), n = await c(`${this.config.apiBasePath}/source-search?${t}`), s = {
        searchResults: n,
        query: e,
        links: n.links
      };
      this.setState({
        loading: !1,
        error: null,
        contracts: s
      });
    } catch (t) {
      this.setState({
        loading: !1,
        error: t instanceof Error ? t : new Error(String(t)),
        contracts: null
      });
    }
  }
  async goToPage(e) {
    const t = {
      ...this.state.contracts?.query ?? {},
      page: e
    };
    o(h(t)), await this.search(t);
  }
  async applyFilters(e) {
    const t = {
      ...this.state.contracts?.query ?? {},
      ...e,
      page: 1
    };
    o(h(t)), await this.search(t);
  }
  async refresh() {
    const e = this.state.contracts?.query ?? m(r());
    await this.search(e);
  }
};
function ee(e) {
  const t = new N(e);
  return t.init().catch((n) => {
    console.error("[SourceSearchPage] Initialization failed:", n);
  }), t;
}
var g = /* @__PURE__ */ new Map();
function te(e, t) {
  g.set(e, t);
}
function ne(e) {
  return g.get(e);
}
function se() {
  return Array.from(g.keys());
}
export {
  Q as C,
  _ as E,
  V as S,
  B as T,
  ne as _,
  x as a,
  H as b,
  D as c,
  Z as d,
  j as f,
  J as g,
  ee as h,
  A as i,
  q as l,
  K as m,
  L as n,
  E as o,
  X as p,
  F as r,
  N as s,
  $ as t,
  Y as u,
  se as v,
  W as w,
  G as x,
  te as y
};

//# sourceMappingURL=source-management-pages-DQyM2WtD.js.map