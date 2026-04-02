import { n as S } from "./lineage-contracts-BR7-TggW.js";
import { StatefulController as v } from "../shared/stateful-controller.js";
import { httpRequest as P, readHTTPError as w, readHTTPJSON as y } from "../shared/transport/http-client.js";
function W(t) {
  return {
    workspaceId: t,
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
      currentRoute: `/sources/${t}`,
      backTarget: "/sources",
      breadcrumbs: [
        { label: "Sources", url: "/sources", isCurrent: !1 },
        { label: "Loading...", url: `/sources/${t}`, isCurrent: !0 }
      ],
      availablePanels: ["detail", "revisions", "relationships", "handles", "comments"],
      activePanel: "detail"
    },
    loading: !0,
    error: null
  };
}
function B() {
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
      breadcrumbs: [{ label: "Search", url: "/source-search", isCurrent: !0 }],
      availablePanels: ["results", "preview"],
      activePanel: "results"
    },
    loading: !1,
    error: null
  };
}
function _(t, e) {
  const n = [], s = [];
  return e.includes(t.endpointFamily) || n.push(
    `Page ${t.pageId} consumes unapproved endpoint family: ${t.endpointFamily}. Allowed: ${e.join(", ")}`
  ), t.contractVersion < 1 && s.push(`Page ${t.pageId} has invalid contract version: ${t.contractVersion}`), {
    valid: n.length === 0,
    errors: n,
    warnings: s
  };
}
function G(t) {
  const e = [
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
  ], n = ["DocumentLineageDetail", "AgreementLineageDetail"], s = t.some((r) => e.includes(r)), a = t.some((r) => n.includes(r));
  return s && a;
}
const H = {
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
}, V = {
  version: 1,
  phase: 13,
  enforcementLevel: "strict",
  approvedContracts: [
    // Phase 11/12 contracts
    "SourceListPage",
    "SourceDetail",
    "SourceRevisionPage",
    "SourceRelationshipPage",
    "SourceHandlePage",
    "SourceRevisionDetail",
    "SourceArtifactPage",
    "SourceCommentPage",
    "SourceSearchResults",
    // Phase 13 contracts
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
    // Existing prohibitions
    "DocumentLineageDetail + SourceManagementContracts",
    "AgreementLineageDetail + SourceManagementContracts",
    "Multiple source-management endpoints in single page",
    // Phase 13 prohibitions
    "AgreementReviewComment + SourceComment",
    "GoogleDriveComment (raw) + SourceComment",
    "Multiple search contract families in single page",
    "Cross-workspace comment merging"
  ],
  architecturalInvariants: [
    // Existing invariants
    "Backend owns semantics",
    "Frontend owns presentation",
    "One canonical contract family per page",
    "No client-side lineage computation",
    "Provider-neutral by default",
    // Phase 13 invariants
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
}, j = {
  version: 2,
  phase: 14,
  documentationDate: "2025-03-22",
  /**
   * Invariant 1: Backend owns all semantic decisions
   */
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
  /**
   * Invariant 2: Frontend owns all presentation concerns
   */
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
  /**
   * Invariant 3: One canonical contract family per page
   */
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
  /**
   * Invariant 4: Contract consumption through approved modules only
   */
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
  /**
   * Invariant 5: No raw Google-specific fields at page level
   */
  noRawGoogleFields: {
    description: "Pages must not directly access raw Google-specific fields",
    forbiddenFields: [
      "Google Drive API fields (kind, htmlContent, quotedFileContent)",
      "KIX anchors and internal references",
      "Raw Google user/account identifiers",
      "Google-specific metadata (exportLinks, thumbnailLink)"
    ],
    approvedAdapters: [
      "source-management-adapters.ts",
      "lineage-contracts.ts (normalization functions)"
    ],
    rationale: "Ensures provider-neutrality and supports multi-provider expansion"
  },
  /**
   * Invariant 6: Visual implementation after contract attachment
   */
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
  /**
   * Pre-implementation checklist for new pages/components
   */
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
};
class c extends v {
  constructor(e, n) {
    super(
      {
        loading: !1,
        error: null,
        contracts: null
      },
      e.onStateChange
    ), this.config = e, this.metadata = {
      pageId: n.pageId,
      apiBasePath: e.apiBasePath,
      endpointFamily: n.endpointFamily,
      contractVersion: 1
    };
    const s = _(this.metadata, n.dependencies);
    s.valid || console.error(`[${n.label}] Composition validation failed:`, s.errors), n.logWarnings && s.warnings.length > 0 && console.warn(`[${n.label}] Composition warnings:`, s.warnings);
  }
}
async function l(t, e = {}) {
  const n = {
    "Content-Type": "application/json",
    ...e.headers
  }, s = {
    method: e.method ?? "GET",
    headers: n
  };
  e.body && (s.body = JSON.stringify(e.body));
  const a = await P(t, s);
  if (!a.ok) {
    const r = await w(a, `HTTP ${a.status}`, {
      appendStatusToFallback: !1
    });
    throw new Error(
      r.startsWith(`HTTP ${a.status}`) ? r : `HTTP ${a.status}: ${r}`
    );
  }
  return y(a);
}
function o() {
  return typeof window > "u" ? new URLSearchParams() : new URLSearchParams(window.location.search);
}
function i(t) {
  if (typeof window > "u" || typeof history > "u")
    return;
  const e = new URL(window.location.href), n = e.searchParams;
  Object.entries(t).forEach(([s, a]) => {
    a == null || a === "" ? n.delete(s) : n.set(s, String(a));
  }), e.search = n.toString(), history.pushState({}, "", e.toString());
}
function p(t) {
  return {
    q: t.query,
    query: void 0,
    provider_kind: t.provider_kind,
    status: t.status,
    has_pending_candidates: t.has_pending_candidates,
    sort: t.sort,
    page: t.page,
    page_size: t.page_size
  };
}
function b(t) {
  const e = Number.parseInt(t.get("page") ?? "1", 10), n = Number.parseInt(t.get("page_size") ?? "20", 10);
  return {
    query: t.get("q") ?? t.get("query") ?? void 0,
    provider_kind: t.get("provider_kind") ?? void 0,
    status: t.get("status") ?? void 0,
    has_pending_candidates: t.get("has_pending_candidates") === "true" ? !0 : void 0,
    sort: t.get("sort") ?? void 0,
    page: e > 0 ? e : 1,
    page_size: n > 0 ? n : 20
  };
}
function k(t) {
  const e = Number.parseInt(t.get("page") ?? "1", 10), n = Number.parseInt(t.get("page_size") ?? "20", 10);
  return {
    sort: t.get("sort") ?? void 0,
    page: e > 0 ? e : 1,
    page_size: n > 0 ? n : 20
  };
}
function u(t) {
  const e = Number.parseInt(t.get("page") ?? "1", 10), n = Number.parseInt(t.get("page_size") ?? "20", 10);
  return {
    status: t.get("status") ?? void 0,
    sync_status: t.get("sync_status") ?? void 0,
    page: e > 0 ? e : 1,
    page_size: n > 0 ? n : 20
  };
}
function m(t) {
  const e = Number.parseInt(t.get("page") ?? "1", 10), n = Number.parseInt(t.get("page_size") ?? "20", 10);
  return {
    query: t.get("q") ?? t.get("query") ?? void 0,
    provider_kind: t.get("provider_kind") ?? void 0,
    status: t.get("status") ?? void 0,
    result_kind: t.get("result_kind") ?? void 0,
    relationship_state: t.get("relationship_state") ?? void 0,
    comment_sync_status: t.get("comment_sync_status") ?? void 0,
    revision_hint: t.get("revision_hint") ?? void 0,
    sort: t.get("sort") ?? void 0,
    page: e > 0 ? e : 1,
    page_size: n > 0 ? n : 20,
    has_comments: t.get("has_comments") === "true" ? !0 : void 0
  };
}
function C(t) {
  const e = new URLSearchParams();
  return t.query && e.set("q", t.query), t.provider_kind && e.set("provider_kind", t.provider_kind), t.status && e.set("status", t.status), t.has_pending_candidates !== void 0 && e.set("has_pending_candidates", String(t.has_pending_candidates)), t.sort && e.set("sort", t.sort), t.page && t.page !== 1 && e.set("page", String(t.page)), t.page_size && t.page_size !== 20 && e.set("page_size", String(t.page_size)), e.toString();
}
function I(t) {
  const e = new URLSearchParams();
  return t.sort && e.set("sort", t.sort), t.page && t.page !== 1 && e.set("page", String(t.page)), t.page_size && t.page_size !== 20 && e.set("page_size", String(t.page_size)), e.toString();
}
function R(t) {
  const e = new URLSearchParams();
  return t.status && e.set("status", t.status), t.sync_status && e.set("sync_status", t.sync_status), t.page && t.page !== 1 && e.set("page", String(t.page)), t.page_size && t.page_size !== 20 && e.set("page_size", String(t.page_size)), e.toString();
}
function h(t) {
  return {
    q: t.query,
    query: void 0,
    provider_kind: t.provider_kind,
    status: t.status,
    result_kind: t.result_kind,
    relationship_state: t.relationship_state,
    comment_sync_status: t.comment_sync_status,
    revision_hint: t.revision_hint,
    has_comments: t.has_comments,
    sort: t.sort,
    page: t.page,
    page_size: t.page_size
  };
}
function T(t) {
  const e = new URLSearchParams();
  return t.query && e.set("q", t.query), t.provider_kind && e.set("provider_kind", t.provider_kind), t.status && e.set("status", t.status), t.result_kind && e.set("result_kind", t.result_kind), t.relationship_state && e.set("relationship_state", t.relationship_state), t.comment_sync_status && e.set("comment_sync_status", t.comment_sync_status), t.revision_hint && e.set("revision_hint", t.revision_hint), t.has_comments !== void 0 && e.set("has_comments", String(t.has_comments)), t.sort && e.set("sort", t.sort), t.page && t.page !== 1 && e.set("page", String(t.page)), t.page_size && t.page_size !== 20 && e.set("page_size", String(t.page_size)), e.toString();
}
function d(t) {
  return {
    panel: t.get("panel") ?? void 0,
    anchor: t.get("anchor") ?? void 0
  };
}
function z(t) {
  return {
    panel: t.panel,
    anchor: t.anchor
  };
}
function L(t) {
  const e = new URLSearchParams();
  return t.panel && e.set("panel", t.panel), t.anchor && e.set("anchor", t.anchor), e.toString();
}
class A extends c {
  constructor(e) {
    super(e, {
      pageId: "source-browser",
      endpointFamily: "sources",
      dependencies: ["sources"],
      label: "SourceBrowserPage",
      logWarnings: !0
    });
  }
  /**
   * Initialize page from current URL state.
   */
  async init() {
    const e = o(), n = b(e);
    await this.fetchSources(n);
  }
  /**
   * Fetch sources from backend.
   */
  async fetchSources(e) {
    this.setState({ loading: !0, error: null, contracts: null });
    try {
      const n = C(e), s = `${this.config.apiBasePath}/sources?${n}`, a = await l(s), r = {
        listSources: a,
        query: e,
        permissions: a.permissions
      };
      this.setState({ loading: !1, error: null, contracts: r });
    } catch (n) {
      this.setState({
        loading: !1,
        error: n instanceof Error ? n : new Error(String(n)),
        contracts: null
      });
    }
  }
  /**
   * Navigate to a specific page.
   */
  async goToPage(e) {
    const s = { ...this.state.contracts?.query ?? {}, page: e };
    i(p(s)), await this.fetchSources(s);
  }
  /**
   * Apply filters and reset to page 1.
   */
  async applyFilters(e) {
    const s = { ...this.state.contracts?.query ?? {}, ...e, page: 1 };
    i(p(s)), await this.fetchSources(s);
  }
}
function Y(t) {
  const e = new A(t);
  return e.init().catch((n) => {
    console.error("[SourceBrowserPage] Initialization failed:", n);
  }), e;
}
class D extends c {
  constructor(e) {
    super(e, {
      pageId: "source-detail",
      endpointFamily: "sources/:id",
      dependencies: ["sources/:id"],
      label: "SourceDetailPage"
    });
  }
  /**
   * Initialize page.
   */
  async init() {
    await this.fetchSource();
  }
  /**
   * Fetch source detail from backend.
   */
  async fetchSource() {
    this.setState({ loading: !0, error: null, contracts: null });
    try {
      const e = `${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}`, n = await l(e), s = {
        sourceDetail: n,
        links: n.links,
        permissions: n.permissions
      };
      this.setState({ loading: !1, error: null, contracts: s });
    } catch (e) {
      this.setState({
        loading: !1,
        error: e instanceof Error ? e : new Error(String(e)),
        contracts: null
      });
    }
  }
  /**
   * Refresh source detail.
   */
  async refresh() {
    await this.fetchSource();
  }
}
function J(t) {
  const e = new D(t);
  return e.init().catch((n) => {
    console.error("[SourceDetailPage] Initialization failed:", n);
  }), e;
}
class Q extends c {
  constructor(e) {
    super(e, {
      pageId: "source-workspace",
      endpointFamily: "sources/:id/workspace",
      dependencies: ["sources/:id/workspace"],
      label: "SourceWorkspacePage"
    });
  }
  async init() {
    const e = o(), n = d(e);
    await this.fetchWorkspace(n);
  }
  async fetchWorkspace(e) {
    this.setState({ loading: !0, error: null, contracts: null });
    try {
      const n = L(e), s = n ? `?${n}` : "", a = `${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}/workspace${s}`, r = S(await l(a)), f = {
        workspace: r,
        query: e,
        links: r.links,
        permissions: r.permissions
      };
      this.setState({ loading: !1, error: null, contracts: f });
    } catch (n) {
      this.setState({
        loading: !1,
        error: n instanceof Error ? n : new Error(String(n)),
        contracts: null
      });
    }
  }
  async refresh() {
    const e = this.state.contracts?.query ?? d(o());
    await this.fetchWorkspace(e);
  }
  async navigateToHref(e) {
    const n = String(e ?? "").trim();
    if (!n || typeof window > "u")
      return;
    const s = new URL(window.location.href), a = new URL(n, s.origin);
    if (s.pathname !== a.pathname) {
      window.location.assign(a.toString());
      return;
    }
    const r = d(a.searchParams);
    i(z(r)), await this.fetchWorkspace(r);
  }
}
function K(t) {
  const e = new Q(t);
  return e.init().catch((n) => {
    console.error("[SourceWorkspacePage] Initialization failed:", n);
  }), e;
}
class E extends c {
  constructor(e) {
    super(e, {
      pageId: "source-revision-timeline",
      endpointFamily: "sources/:id/revisions",
      dependencies: ["sources/:id/revisions"],
      label: "SourceRevisionTimelinePage"
    });
  }
  /**
   * Initialize page from current URL state.
   */
  async init() {
    const e = o(), n = k(e);
    await this.fetchRevisions(n);
  }
  /**
   * Fetch revisions from backend.
   */
  async fetchRevisions(e) {
    this.setState({ loading: !0, error: null, contracts: null });
    try {
      const n = I(e), s = `${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}/revisions?${n}`, a = await l(s), r = {
        revisionPage: a,
        query: e,
        links: a.links
      };
      this.setState({ loading: !1, error: null, contracts: r });
    } catch (n) {
      this.setState({
        loading: !1,
        error: n instanceof Error ? n : new Error(String(n)),
        contracts: null
      });
    }
  }
  /**
   * Navigate to a specific page.
   */
  async goToPage(e) {
    const s = { ...this.state.contracts?.query ?? {}, page: e };
    i({ page: e }), await this.fetchRevisions(s);
  }
  /**
   * Change sort order.
   */
  async changeSort(e) {
    const s = { ...this.state.contracts?.query ?? {}, sort: e, page: 1 };
    i({ sort: e, page: 1 }), await this.fetchRevisions(s);
  }
}
function X(t) {
  const e = new E(t);
  return e.init().catch((n) => {
    console.error("[SourceRevisionTimelinePage] Initialization failed:", n);
  }), e;
}
class x extends c {
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
    this.setState({ loading: !0, error: null, contracts: null });
    try {
      const e = `${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}`, n = await l(e), s = {
        revisionDetail: n,
        links: n.links,
        permissions: n.permissions
      };
      this.setState({ loading: !1, error: null, contracts: s });
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
}
function Z(t) {
  const e = new x(t);
  return e.init().catch((n) => {
    console.error("[SourceRevisionInspectorPage] Initialization failed:", n);
  }), e;
}
class F extends c {
  constructor(e) {
    super(e, {
      pageId: "source-comment-inspector",
      endpointFamily: "source-revisions/:id/comments",
      dependencies: ["source-revisions/:id/comments"],
      label: "SourceCommentInspectorPage"
    });
  }
  async init() {
    const e = o(), n = u(e);
    await this.fetchComments(n);
  }
  async fetchComments(e) {
    this.setState({ loading: !0, error: null, contracts: null });
    try {
      const n = R(e), s = `${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}/comments?${n}`, a = await l(s), r = {
        commentPage: a,
        links: a.links
      };
      this.setState({ loading: !1, error: null, contracts: r });
    } catch (n) {
      this.setState({
        loading: !1,
        error: n instanceof Error ? n : new Error(String(n)),
        contracts: null
      });
    }
  }
  async goToPage(e) {
    const s = { ...this.state.contracts?.commentPage.page_info ? u(o()) : {}, page: e };
    i({ page: e }), await this.fetchComments(s);
  }
  async refresh() {
    const e = u(o());
    await this.fetchComments(e);
  }
}
function q(t) {
  const e = new F(t);
  return e.init().catch((n) => {
    console.error("[SourceCommentInspectorPage] Initialization failed:", n);
  }), e;
}
class $ extends c {
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
    this.setState({ loading: !0, error: null, contracts: null });
    try {
      const e = `${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}/artifacts`, n = await l(e), s = {
        artifactPage: n,
        links: n.links
      };
      this.setState({ loading: !1, error: null, contracts: s });
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
}
function ee(t) {
  const e = new $(t);
  return e.init().catch((n) => {
    console.error("[SourceArtifactInspectorPage] Initialization failed:", n);
  }), e;
}
class N extends c {
  constructor(e) {
    super(e, {
      pageId: "source-search",
      endpointFamily: "source-search",
      dependencies: ["source-search"],
      label: "SourceSearchPage"
    });
  }
  async init() {
    const e = o(), n = m(e);
    await this.search(n);
  }
  async search(e) {
    this.setState({ loading: !0, error: null, contracts: null });
    try {
      const n = T(e), s = `${this.config.apiBasePath}/source-search?${n}`, a = await l(s), r = {
        searchResults: a,
        query: e,
        links: a.links
      };
      this.setState({ loading: !1, error: null, contracts: r });
    } catch (n) {
      this.setState({
        loading: !1,
        error: n instanceof Error ? n : new Error(String(n)),
        contracts: null
      });
    }
  }
  async goToPage(e) {
    const s = { ...this.state.contracts?.query ?? {}, page: e };
    i(h(s)), await this.search(s);
  }
  async applyFilters(e) {
    const s = { ...this.state.contracts?.query ?? {}, ...e, page: 1 };
    i(h(s)), await this.search(s);
  }
  async refresh() {
    const e = this.state.contracts?.query ?? m(o());
    await this.search(e);
  }
}
function te(t) {
  const e = new N(t);
  return e.init().catch((n) => {
    console.error("[SourceSearchPage] Initialization failed:", n);
  }), e;
}
const g = /* @__PURE__ */ new Map();
function ne(t, e) {
  g.set(t, e);
}
function se(t) {
  return g.get(t);
}
function ae() {
  return Array.from(g.keys());
}
export {
  V as P,
  A as S,
  j as V,
  F as a,
  D as b,
  Q as c,
  G as d,
  x as e,
  E as f,
  $ as g,
  N as h,
  Y as i,
  q as j,
  J as k,
  K as l,
  Z as m,
  X as n,
  ee as o,
  te as p,
  se as q,
  ne as r,
  ae as s,
  W as t,
  B as u,
  _ as v,
  H as w
};
//# sourceMappingURL=source-management-pages-sYyJ6Mld.js.map
