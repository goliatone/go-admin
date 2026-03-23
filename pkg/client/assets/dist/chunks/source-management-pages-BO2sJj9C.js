function z(e) {
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
function A() {
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
function r(e, t) {
  const a = [], s = [];
  return t.includes(e.endpointFamily) || a.push(`Page ${e.pageId} consumes unapproved endpoint family: ${e.endpointFamily}. Allowed: ${t.join(", ")}`), e.contractVersion < 1 && s.push(`Page ${e.pageId} has invalid contract version: ${e.contractVersion}`), {
    valid: a.length === 0,
    errors: a,
    warnings: s
  };
}
function D(e) {
  const t = [
    "SourceListPage",
    "SourceDetail",
    "SourceRevisionPage",
    "SourceRelationshipPage",
    "SourceHandlePage",
    "SourceRevisionDetail",
    "SourceArtifactPage",
    "SourceCommentPage",
    "SourceSearchResults"
  ], a = ["DocumentLineageDetail", "AgreementLineageDetail"], s = e.some((l) => t.includes(l)), n = e.some((l) => a.includes(l));
  return s && n;
}
var L = {
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
}, T = {
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
}, E = {
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
};
async function c(e, t = {}) {
  const a = {
    "Content-Type": "application/json",
    ...t.headers
  }, s = {
    method: t.method ?? "GET",
    headers: a
  };
  t.body && (s.body = JSON.stringify(t.body));
  const n = await fetch(e, s);
  if (!n.ok) {
    const l = await n.text();
    throw new Error(`HTTP ${n.status}: ${l}`);
  }
  return n.json();
}
function i() {
  return typeof window > "u" ? new URLSearchParams() : new URLSearchParams(window.location.search);
}
function o(e) {
  if (typeof window > "u" || typeof history > "u") return;
  const t = new URL(window.location.href), a = t.searchParams;
  Object.entries(e).forEach(([s, n]) => {
    n == null || n === "" ? a.delete(s) : a.set(s, String(n));
  }), t.search = a.toString(), history.pushState({}, "", t.toString());
}
function g(e) {
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
function m(e) {
  const t = Number.parseInt(e.get("page") ?? "1", 10), a = Number.parseInt(e.get("page_size") ?? "20", 10);
  return {
    query: e.get("q") ?? e.get("query") ?? void 0,
    provider_kind: e.get("provider_kind") ?? void 0,
    status: e.get("status") ?? void 0,
    has_pending_candidates: e.get("has_pending_candidates") === "true" ? !0 : void 0,
    sort: e.get("sort") ?? void 0,
    page: t > 0 ? t : 1,
    page_size: a > 0 ? a : 20
  };
}
function f(e) {
  const t = Number.parseInt(e.get("page") ?? "1", 10), a = Number.parseInt(e.get("page_size") ?? "20", 10);
  return {
    sort: e.get("sort") ?? void 0,
    page: t > 0 ? t : 1,
    page_size: a > 0 ? a : 20
  };
}
function u(e) {
  const t = Number.parseInt(e.get("page") ?? "1", 10), a = Number.parseInt(e.get("page_size") ?? "20", 10);
  return {
    status: e.get("status") ?? void 0,
    sync_status: e.get("sync_status") ?? void 0,
    page: t > 0 ? t : 1,
    page_size: a > 0 ? a : 20
  };
}
function h(e) {
  const t = Number.parseInt(e.get("page") ?? "1", 10), a = Number.parseInt(e.get("page_size") ?? "20", 10);
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
    page_size: a > 0 ? a : 20,
    has_comments: e.get("has_comments") === "true" ? !0 : void 0
  };
}
function S(e) {
  const t = new URLSearchParams();
  return e.query && t.set("q", e.query), e.provider_kind && t.set("provider_kind", e.provider_kind), e.status && t.set("status", e.status), e.has_pending_candidates !== void 0 && t.set("has_pending_candidates", String(e.has_pending_candidates)), e.sort && t.set("sort", e.sort), e.page && e.page !== 1 && t.set("page", String(e.page)), e.page_size && e.page_size !== 20 && t.set("page_size", String(e.page_size)), t.toString();
}
function v(e) {
  const t = new URLSearchParams();
  return e.sort && t.set("sort", e.sort), e.page && e.page !== 1 && t.set("page", String(e.page)), e.page_size && e.page_size !== 20 && t.set("page_size", String(e.page_size)), t.toString();
}
function P(e) {
  const t = new URLSearchParams();
  return e.status && t.set("status", e.status), e.sync_status && t.set("sync_status", e.sync_status), e.page && e.page !== 1 && t.set("page", String(e.page)), e.page_size && e.page_size !== 20 && t.set("page_size", String(e.page_size)), t.toString();
}
function p(e) {
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
function _(e) {
  const t = new URLSearchParams();
  return e.query && t.set("q", e.query), e.provider_kind && t.set("provider_kind", e.provider_kind), e.status && t.set("status", e.status), e.result_kind && t.set("result_kind", e.result_kind), e.relationship_state && t.set("relationship_state", e.relationship_state), e.comment_sync_status && t.set("comment_sync_status", e.comment_sync_status), e.revision_hint && t.set("revision_hint", e.revision_hint), e.has_comments !== void 0 && t.set("has_comments", String(e.has_comments)), e.sort && t.set("sort", e.sort), e.page && e.page !== 1 && t.set("page", String(e.page)), e.page_size && e.page_size !== 20 && t.set("page_size", String(e.page_size)), t.toString();
}
var w = class {
  constructor(e) {
    this.config = e, this.metadata = {
      pageId: "source-browser",
      apiBasePath: e.apiBasePath,
      endpointFamily: "sources",
      contractVersion: 1
    };
    const t = r(this.metadata, ["sources"]);
    t.valid || console.error("[SourceBrowserPage] Composition validation failed:", t.errors), t.warnings.length > 0 && console.warn("[SourceBrowserPage] Composition warnings:", t.warnings), this.state = {
      loading: !1,
      error: null,
      contracts: null
    };
  }
  async init() {
    const e = m(i());
    await this.fetchSources(e);
  }
  async fetchSources(e) {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const t = S(e), a = await c(`${this.config.apiBasePath}/sources?${t}`), s = {
        listSources: a,
        query: e,
        permissions: a.permissions
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
    o(g(t)), await this.fetchSources(t);
  }
  async applyFilters(e) {
    const t = {
      ...this.state.contracts?.query ?? {},
      ...e,
      page: 1
    };
    o(g(t)), await this.fetchSources(t);
  }
  getState() {
    return this.state;
  }
  setState(e) {
    this.state = e, this.config.onStateChange && this.config.onStateChange(e);
  }
};
function F(e) {
  const t = new w(e);
  return t.init().catch((a) => {
    console.error("[SourceBrowserPage] Initialization failed:", a);
  }), t;
}
var y = class {
  constructor(e) {
    this.config = e, this.metadata = {
      pageId: "source-detail",
      apiBasePath: e.apiBasePath,
      endpointFamily: "sources/:id",
      contractVersion: 1
    };
    const t = r(this.metadata, ["sources/:id"]);
    t.valid || console.error("[SourceDetailPage] Composition validation failed:", t.errors), this.state = {
      loading: !1,
      error: null,
      contracts: null
    };
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
  getState() {
    return this.state;
  }
  setState(e) {
    this.state = e, this.config.onStateChange && this.config.onStateChange(e);
  }
};
function N(e) {
  const t = new y(e);
  return t.init().catch((a) => {
    console.error("[SourceDetailPage] Initialization failed:", a);
  }), t;
}
var C = class {
  constructor(e) {
    this.config = e, this.metadata = {
      pageId: "source-revision-timeline",
      apiBasePath: e.apiBasePath,
      endpointFamily: "sources/:id/revisions",
      contractVersion: 1
    };
    const t = r(this.metadata, ["sources/:id/revisions"]);
    t.valid || console.error("[SourceRevisionTimelinePage] Composition validation failed:", t.errors), this.state = {
      loading: !1,
      error: null,
      contracts: null
    };
  }
  async init() {
    const e = f(i());
    await this.fetchRevisions(e);
  }
  async fetchRevisions(e) {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const t = v(e), a = await c(`${this.config.apiBasePath}/sources/${encodeURIComponent(this.config.sourceId)}/revisions?${t}`), s = {
        revisionPage: a,
        query: e,
        links: a.links
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
  getState() {
    return this.state;
  }
  setState(e) {
    this.state = e, this.config.onStateChange && this.config.onStateChange(e);
  }
};
function B(e) {
  const t = new C(e);
  return t.init().catch((a) => {
    console.error("[SourceRevisionTimelinePage] Initialization failed:", a);
  }), t;
}
var b = class {
  constructor(e) {
    this.config = e, this.metadata = {
      pageId: "source-revision-inspector",
      apiBasePath: e.apiBasePath,
      endpointFamily: "source-revisions/:id",
      contractVersion: 1
    };
    const t = r(this.metadata, ["source-revisions/:id"]);
    t.valid || console.error("[SourceRevisionInspectorPage] Composition validation failed:", t.errors), this.state = {
      loading: !1,
      error: null,
      contracts: null
    };
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
  getState() {
    return this.state;
  }
  setState(e) {
    this.state = e, this.config.onStateChange && this.config.onStateChange(e);
  }
};
function M(e) {
  const t = new b(e);
  return t.init().catch((a) => {
    console.error("[SourceRevisionInspectorPage] Initialization failed:", a);
  }), t;
}
var I = class {
  constructor(e) {
    this.config = e, this.metadata = {
      pageId: "source-comment-inspector",
      apiBasePath: e.apiBasePath,
      endpointFamily: "source-revisions/:id/comments",
      contractVersion: 1
    };
    const t = r(this.metadata, ["source-revisions/:id/comments"]);
    t.valid || console.error("[SourceCommentInspectorPage] Composition validation failed:", t.errors), this.state = {
      loading: !1,
      error: null,
      contracts: null
    };
  }
  async init() {
    const e = u(i());
    await this.fetchComments(e);
  }
  async fetchComments(e) {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const t = P(e), a = await c(`${this.config.apiBasePath}/source-revisions/${encodeURIComponent(this.config.sourceRevisionId)}/comments?${t}`), s = {
        commentPage: a,
        links: a.links
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
      ...this.state.contracts?.commentPage.page_info ? u(i()) : {},
      page: e
    };
    o({ page: e }), await this.fetchComments(t);
  }
  async refresh() {
    const e = u(i());
    await this.fetchComments(e);
  }
  getState() {
    return this.state;
  }
  setState(e) {
    this.state = e, this.config.onStateChange && this.config.onStateChange(e);
  }
};
function O(e) {
  const t = new I(e);
  return t.init().catch((a) => {
    console.error("[SourceCommentInspectorPage] Initialization failed:", a);
  }), t;
}
var R = class {
  constructor(e) {
    this.config = e, this.metadata = {
      pageId: "source-artifact-inspector",
      apiBasePath: e.apiBasePath,
      endpointFamily: "source-revisions/:id/artifacts",
      contractVersion: 1
    };
    const t = r(this.metadata, ["source-revisions/:id/artifacts"]);
    t.valid || console.error("[SourceArtifactInspectorPage] Composition validation failed:", t.errors), this.state = {
      loading: !1,
      error: null,
      contracts: null
    };
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
  getState() {
    return this.state;
  }
  setState(e) {
    this.state = e, this.config.onStateChange && this.config.onStateChange(e);
  }
};
function x(e) {
  const t = new R(e);
  return t.init().catch((a) => {
    console.error("[SourceArtifactInspectorPage] Initialization failed:", a);
  }), t;
}
var k = class {
  constructor(e) {
    this.config = e, this.metadata = {
      pageId: "source-search",
      apiBasePath: e.apiBasePath,
      endpointFamily: "source-search",
      contractVersion: 1
    };
    const t = r(this.metadata, ["source-search"]);
    t.valid || console.error("[SourceSearchPage] Composition validation failed:", t.errors), this.state = {
      loading: !1,
      error: null,
      contracts: null
    };
  }
  async init() {
    const e = h(i());
    await this.search(e);
  }
  async search(e) {
    this.setState({
      loading: !0,
      error: null,
      contracts: null
    });
    try {
      const t = _(e), a = await c(`${this.config.apiBasePath}/source-search?${t}`), s = {
        searchResults: a,
        query: e,
        links: a.links
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
    o(p(t)), await this.search(t);
  }
  async applyFilters(e) {
    const t = {
      ...this.state.contracts?.query ?? {},
      ...e,
      page: 1
    };
    o(p(t)), await this.search(t);
  }
  async refresh() {
    const e = this.state.contracts?.query ?? h(i());
    await this.search(e);
  }
  getState() {
    return this.state;
  }
  setState(e) {
    this.state = e, this.config.onStateChange && this.config.onStateChange(e);
  }
};
function U(e) {
  const t = new k(e);
  return t.init().catch((a) => {
    console.error("[SourceSearchPage] Initialization failed:", a);
  }), t;
}
var d = /* @__PURE__ */ new Map();
function $(e, t) {
  d.set(e, t);
}
function Q(e) {
  return d.get(e);
}
function G() {
  return Array.from(d.keys());
}
export {
  D as C,
  A as S,
  $ as _,
  b as a,
  E as b,
  x as c,
  N as d,
  M as f,
  G as g,
  Q as h,
  y as i,
  F as l,
  U as m,
  w as n,
  C as o,
  B as p,
  I as r,
  k as s,
  R as t,
  O as u,
  T as v,
  r as w,
  z as x,
  L as y
};

//# sourceMappingURL=source-management-pages-BO2sJj9C.js.map