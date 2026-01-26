const q = {
  // Created
  created: "created",
  added: "created",
  inserted: "created",
  registered: "created",
  signed_up: "created",
  imported: "created",
  // Updated
  updated: "updated",
  modified: "updated",
  changed: "updated",
  edited: "updated",
  saved: "updated",
  enabled: "updated",
  disabled: "updated",
  activated: "updated",
  deactivated: "updated",
  // Deleted
  deleted: "deleted",
  removed: "deleted",
  destroyed: "deleted",
  purged: "deleted",
  archived: "deleted",
  // Auth
  login: "auth",
  logout: "auth",
  logged_in: "auth",
  logged_out: "auth",
  authenticated: "auth",
  password_reset: "auth",
  password_changed: "auth",
  token_refreshed: "auth",
  session_expired: "auth",
  // Viewed
  viewed: "viewed",
  accessed: "viewed",
  read: "viewed",
  downloaded: "viewed",
  exported: "viewed"
}, V = {
  created: "plus",
  updated: "edit-pencil",
  deleted: "trash",
  auth: "key",
  viewed: "eye",
  system: "settings"
}, U = {
  debug: "terminal",
  user: "user",
  users: "group",
  auth: "key",
  admin: "settings",
  system: "cpu",
  api: "cloud",
  db: "database",
  cache: "archive",
  file: "folder",
  email: "mail",
  notification: "bell",
  webhook: "link",
  job: "clock",
  queue: "list",
  export: "download",
  import: "upload",
  report: "page",
  log: "clipboard",
  config: "adjustments",
  settings: "settings",
  security: "shield",
  tenant: "building",
  org: "community",
  media: "media-image",
  content: "page-edit",
  repl: "terminal"
};
function A(t, e) {
  if (!t) return "";
  if (!e) return t;
  const i = t.trim();
  if (!i) return t;
  const n = e[i];
  return typeof n == "string" && n.trim() !== "" ? n : t;
}
function k(t, e) {
  if (!t)
    return { namespace: "", action: "", icon: "activity", category: "system" };
  const i = A(t, e);
  if (t.includes(".")) {
    const a = t.split("."), o = a[0].toLowerCase(), r = a.slice(1).join("."), c = U[o] || "activity", d = a[a.length - 1], h = x(d);
    return { namespace: o, action: i !== t ? i : r, icon: c, category: h };
  }
  const n = x(t);
  return {
    namespace: "",
    action: i !== t ? i : t,
    icon: V[n],
    category: n
  };
}
function x(t) {
  if (!t) return "system";
  const e = t.toLowerCase().trim().replace(/-/g, "_");
  return q[e] || "system";
}
function P(t) {
  if (!t) return { type: "", id: "" };
  if (!t.includes(":"))
    return { type: t, id: "" };
  const e = t.indexOf(":");
  return {
    type: t.substring(0, e),
    id: t.substring(e + 1)
  };
}
function F(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function T(t) {
  return t ? t.split(/[_-]/).map(F).join(" ") : "";
}
function l(t) {
  const e = document.createElement("div");
  return e.textContent = t, e.innerHTML;
}
function N(t, e = 7) {
  if (!t) return "";
  const i = t.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(i) || t.length > e + 3 ? t.substring(0, e) : t;
}
function j(t) {
  const e = t.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(e);
}
function v(t, e = 8) {
  if (!t) return "";
  const i = N(t, e);
  return i === t ? l(t) : `<span class="activity-id-short" title="${l(t)}" style="cursor: help; border-bottom: 1px dotted #9ca3af;">${l(i)}</span>`;
}
function D(t, e) {
  const i = t.actor || "Unknown", n = t.action || "performed action on", s = A(n, e), { type: a, id: o } = P(t.object), r = j(i) ? v(i, 8) : `<strong>${l(i)}</strong>`;
  let c = "";
  if (a && o) {
    const h = v(o, 8);
    c = `${T(a)} #${h}`;
  } else a ? c = T(a) : o && (c = `#${v(o, 8)}`);
  if (x(n) === "auth") {
    const h = t.metadata?.ip || t.metadata?.IP;
    return h ? `${r} ${l(s)} from ${l(String(h))}` : `${r} ${l(s)}`;
  }
  return c ? `${r} ${l(s)} <strong>${c}</strong>` : `${r} ${l(s)}`;
}
function H(t) {
  if (!t) return "-";
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? t : e.toLocaleString();
}
function z(t) {
  if (!t) return "";
  const e = new Date(t);
  if (Number.isNaN(e.getTime())) return t;
  const n = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), s = Math.floor(n / 1e3), a = Math.floor(s / 60), o = Math.floor(a / 60), r = Math.floor(o / 24);
  return s < 60 ? "just now" : a < 60 ? `${a}m ago` : o < 24 ? `${o}h ago` : r < 7 ? `${r}d ago` : e.toLocaleDateString();
}
function G(t) {
  if (!t) return "";
  const e = new Date(t);
  if (Number.isNaN(e.getTime())) return t;
  const n = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), s = Math.floor(n / 1e3), a = Math.floor(s / 60), o = Math.floor(a / 60), r = Math.floor(o / 24), c = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (s < 60) return "just now";
  if (a < 60) return c.format(-a, "minute");
  if (o < 24) return c.format(-o, "hour");
  if (r < 7) return c.format(-r, "day");
  if (r < 30) {
    const d = Math.floor(r / 7);
    return c.format(-d, "week");
  }
  return e.toLocaleDateString();
}
function _(t) {
  const e = /* @__PURE__ */ new Date(), i = new Date(e.getFullYear(), e.getMonth(), e.getDate()), n = new Date(i);
  n.setDate(n.getDate() - 1);
  const s = new Date(t.getFullYear(), t.getMonth(), t.getDate());
  return s.getTime() === i.getTime() ? "Today" : s.getTime() === n.getTime() ? "Yesterday" : new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: s.getFullYear() !== e.getFullYear() ? "numeric" : void 0
  }).format(t);
}
function B(t) {
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
function p(t) {
  const e = t.getFullYear(), i = String(t.getMonth() + 1).padStart(2, "0"), n = String(t.getDate()).padStart(2, "0");
  return `${e}-${i}-${n}`;
}
function Y(t) {
  return !t || typeof t != "object" ? 0 : Object.keys(t).length;
}
function R(t) {
  const e = Y(t);
  return e === 0 ? "" : e === 1 ? "1 field" : `${e} fields`;
}
function O(t) {
  if (!t || typeof t != "object") return "";
  const e = Object.entries(t);
  return e.length === 0 ? "" : e.map(([n, s]) => {
    const a = l(n);
    let o;
    if (n.endsWith("_old") || n.endsWith("_new"))
      o = l($(s));
    else if (typeof s == "object" && s !== null) {
      const r = JSON.stringify(s), c = r.length > 100 ? r.substring(0, 100) + "..." : r;
      o = `<code style="font-size: 11px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${l(c)}</code>`;
    } else
      o = l($(s));
    return `
      <div style="display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
        <span style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${a}</span>
        <span style="color: #111827; font-size: 12px; font-weight: 500; word-break: break-word;">${o}</span>
      </div>
    `;
  }).join("");
}
function $(t) {
  return t == null ? "-" : typeof t == "boolean" ? t ? "Yes" : "No" : typeof t == "number" ? String(t) : typeof t == "string" ? t.length > 100 ? t.substring(0, 100) + "..." : t : JSON.stringify(t);
}
function K(t) {
  return t ? N(t, 7) : "";
}
function oe(t) {
  return `activity-action--${t}`;
}
function le(t) {
  return `<i class="iconoir-${V[t]} activity-action-icon"></i>`;
}
const W = {
  container: "#activity-view-switcher",
  tableTab: '[data-view-tab="table"]',
  timelineTab: '[data-view-tab="timeline"]',
  tableView: "#activity-table-container",
  timelineView: "#activity-timeline-container",
  paginationContainer: "#activity-pagination"
}, L = "activity-view-preference", m = "view";
class C {
  constructor(e = {}, i) {
    this.currentView = "table", this.container = null, this.tableTab = null, this.timelineTab = null, this.tableView = null, this.timelineView = null, this.paginationContainer = null, this.handleTableClick = () => {
      this.setView("table");
    }, this.handleTimelineClick = () => {
      this.setView("timeline");
    }, this.selectors = { ...W, ...e }, this.onViewChange = i;
  }
  /**
   * Initialize the view switcher
   */
  init() {
    this.cacheElements(), this.bindEvents(), this.restoreView();
  }
  /**
   * Get the current view mode
   */
  getView() {
    return this.currentView;
  }
  /**
   * Set the view mode programmatically
   */
  setView(e, i = {}) {
    const { persist: n = !0, updateUrl: s = !0 } = i;
    e !== "table" && e !== "timeline" && (e = "table"), this.currentView = e, this.updateUI(), n && this.persistView(), s && this.updateUrlParam(), this.emitViewChange();
  }
  /**
   * Destroy the view switcher and clean up event listeners
   */
  destroy() {
    this.tableTab?.removeEventListener("click", this.handleTableClick), this.timelineTab?.removeEventListener("click", this.handleTimelineClick);
  }
  cacheElements() {
    this.container = document.querySelector(this.selectors.container), this.tableTab = document.querySelector(this.selectors.tableTab), this.timelineTab = document.querySelector(this.selectors.timelineTab), this.tableView = document.querySelector(this.selectors.tableView), this.timelineView = document.querySelector(this.selectors.timelineView), this.paginationContainer = document.querySelector(this.selectors.paginationContainer);
  }
  bindEvents() {
    this.tableTab?.addEventListener("click", this.handleTableClick), this.timelineTab?.addEventListener("click", this.handleTimelineClick);
  }
  /**
   * Restore view from URL param or localStorage
   */
  restoreView() {
    const i = new URLSearchParams(window.location.search).get(m);
    if (i === "table" || i === "timeline") {
      this.setView(i, { persist: !0, updateUrl: !1 });
      return;
    }
    const n = localStorage.getItem(L);
    if (n === "table" || n === "timeline") {
      this.setView(n, { persist: !1, updateUrl: !0 });
      return;
    }
    this.setView("table", { persist: !1, updateUrl: !1 });
  }
  /**
   * Update UI elements to reflect current view
   */
  updateUI() {
    const e = this.currentView === "table";
    this.tableTab && (this.tableTab.setAttribute("aria-selected", e ? "true" : "false"), this.tableTab.classList.toggle("active", e)), this.timelineTab && (this.timelineTab.setAttribute("aria-selected", e ? "false" : "true"), this.timelineTab.classList.toggle("active", !e)), this.tableView && this.tableView.classList.toggle("hidden", !e), this.timelineView && this.timelineView.classList.toggle("hidden", e), this.paginationContainer && this.paginationContainer.classList.toggle("hidden", !e);
  }
  /**
   * Persist view preference to localStorage
   */
  persistView() {
    try {
      localStorage.setItem(L, this.currentView);
    } catch {
    }
  }
  /**
   * Update URL parameter without page reload
   */
  updateUrlParam() {
    const e = new URLSearchParams(window.location.search);
    this.currentView === "table" ? e.delete(m) : e.set(m, this.currentView);
    const i = e.toString(), n = i ? `${window.location.pathname}?${i}` : window.location.pathname;
    window.history.replaceState({}, "", n);
  }
  /**
   * Emit view change event
   */
  emitViewChange() {
    this.onViewChange && this.onViewChange(this.currentView);
    const e = new CustomEvent("activity:viewchange", {
      bubbles: !0,
      detail: { view: this.currentView }
    });
    document.dispatchEvent(e);
  }
  /**
   * Get view param for inclusion in API requests
   */
  static getViewFromUrl() {
    return new URLSearchParams(window.location.search).get(m) === "timeline" ? "timeline" : "table";
  }
  /**
   * Add view param to existing URLSearchParams (for query sync)
   */
  static addViewToParams(e, i) {
    i === "timeline" ? e.set(m, i) : e.delete(m);
  }
}
const M = {
  created: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
  updated: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  deleted: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
  auth: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
  viewed: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe" },
  system: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" }
};
function J(t) {
  if (!t || t.length === 0)
    return [];
  const e = /* @__PURE__ */ new Map();
  return t.forEach((i) => {
    const n = new Date(i.created_at);
    if (Number.isNaN(n.getTime())) return;
    const s = p(n), a = B(n);
    e.has(s) || e.set(s, {
      date: a,
      label: _(n),
      entries: [],
      collapsed: !1
    }), e.get(s).entries.push(i);
  }), Array.from(e.values()).sort(
    (i, n) => n.date.getTime() - i.date.getTime()
  );
}
function Q(t, e) {
  if (!e || e.length === 0)
    return t;
  const i = /* @__PURE__ */ new Map();
  t.forEach((s) => {
    i.set(p(s.date), { ...s, entries: [...s.entries] });
  }), e.forEach((s) => {
    const a = new Date(s.created_at);
    if (Number.isNaN(a.getTime())) return;
    const o = p(a), r = B(a);
    i.has(o) || i.set(o, {
      date: r,
      label: _(a),
      entries: [],
      collapsed: !1
    });
    const c = i.get(o);
    c.entries.some((d) => d.id === s.id) || c.entries.push(s);
  });
  const n = Array.from(i.values()).sort(
    (s, a) => a.date.getTime() - s.date.getTime()
  );
  return n.forEach((s) => {
    s.entries.sort(
      (a, o) => new Date(o.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }), n;
}
function X(t) {
  if (!t) return "?";
  const e = t.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/i.test(e))
    return t.substring(0, 2).toUpperCase();
  const i = t.split(/[\s._-]+/).filter(Boolean);
  return i.length >= 2 ? (i[0][0] + i[1][0]).toUpperCase() : t.substring(0, 2).toUpperCase();
}
function Z(t, e) {
  const i = k(t.action, e), n = D(t, e), s = G(t.created_at), a = R(t.metadata), o = O(t.metadata), r = M[i.category] || M.system, c = X(t.actor), d = document.createElement("div");
  d.className = `timeline-entry timeline-entry--${i.category}`, d.dataset.entryId = t.id;
  let h = "";
  return a && (h = `
      <div class="timeline-entry-metadata">
        <button type="button"
                class="timeline-metadata-toggle"
                aria-expanded="false"
                data-timeline-metadata="${t.id}">
          <span>${a}</span>
          <svg class="timeline-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div class="timeline-metadata-content" data-timeline-metadata-content="${t.id}">
          <div class="timeline-metadata-grid">
            ${o}
          </div>
        </div>
      </div>
    `), d.innerHTML = `
    <div class="timeline-entry-connector">
      <div class="timeline-entry-dot" style="background-color: ${r.color}; border-color: ${r.border};"></div>
    </div>
    <div class="timeline-entry-card">
      <div class="timeline-entry-header">
        <div class="timeline-entry-avatar" style="background-color: ${r.bg}; color: ${r.color};">
          ${l(c)}
        </div>
        <div class="timeline-entry-content">
          <div class="timeline-entry-action">
            <span class="timeline-action-badge" style="background-color: ${r.bg}; color: ${r.color}; border-color: ${r.border};">
              <i class="iconoir-${i.icon}"></i>
              <span>${l(i.action || t.action)}</span>
            </span>
          </div>
          <div class="timeline-entry-sentence">${n}</div>
          <div class="timeline-entry-time">${l(s)}</div>
        </div>
      </div>
      ${h}
    </div>
  `, d;
}
function ee(t, e) {
  const i = p(t.date), n = document.createElement("div");
  n.className = "timeline-date-header", n.dataset.dateGroup = i, n.innerHTML = `
    <button type="button" class="timeline-date-toggle" aria-expanded="${!t.collapsed}">
      <span class="timeline-date-label">${l(t.label)}</span>
      <span class="timeline-date-count">${t.entries.length} ${t.entries.length === 1 ? "entry" : "entries"}</span>
      <svg class="timeline-date-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
  `;
  const s = n.querySelector(".timeline-date-toggle");
  return s && e && s.addEventListener("click", () => {
    const a = !t.collapsed;
    t.collapsed = a, s.setAttribute("aria-expanded", (!a).toString()), e(i, a);
  }), n;
}
function te(t, e, i) {
  const n = document.createElement("div");
  n.className = "timeline-group", n.dataset.dateGroup = p(t.date);
  const s = ee(t, i);
  n.appendChild(s);
  const a = document.createElement("div");
  return a.className = "timeline-entries", t.collapsed && a.classList.add("collapsed"), t.entries.forEach((o) => {
    const r = Z(o, e);
    a.appendChild(r);
  }), n.appendChild(a), n;
}
class ie {
  constructor(e, i) {
    this.collapsedGroups = /* @__PURE__ */ new Set(), this.groups = [], this.container = e, this.actionLabels = i;
  }
  /**
   * Render the full timeline
   */
  render(e) {
    if (this.groups = J(e), this.container.innerHTML = "", this.groups.length === 0) {
      this.renderEmptyState();
      return;
    }
    const i = document.createElement("div");
    i.className = "timeline", this.groups.forEach((n) => {
      const s = p(n.date);
      n.collapsed = this.collapsedGroups.has(s);
      const a = te(n, this.actionLabels, (o, r) => {
        this.handleGroupToggle(o, r);
      });
      i.appendChild(a);
    }), this.container.appendChild(i), this.wireMetadataToggles();
  }
  /**
   * Append more entries (for infinite scroll)
   */
  appendEntries(e) {
    this.groups = Q(this.groups, e);
    const i = this.groups.flatMap((n) => n.entries);
    this.render(i);
  }
  /**
   * Clear the timeline
   */
  clear() {
    this.container.innerHTML = "", this.groups = [];
  }
  /**
   * Get current groups
   */
  getGroups() {
    return this.groups;
  }
  renderEmptyState() {
    const e = document.createElement("div");
    e.className = "timeline-empty", e.innerHTML = `
      <div class="timeline-empty-icon">
        <i class="iconoir-clipboard-check"></i>
      </div>
      <p class="timeline-empty-title">No activity found</p>
      <p class="timeline-empty-subtitle">Activity entries will appear here when actions are logged.</p>
    `, this.container.appendChild(e);
  }
  handleGroupToggle(e, i) {
    i ? this.collapsedGroups.add(e) : this.collapsedGroups.delete(e);
    const s = this.container.querySelector(`[data-date-group="${e}"]`)?.querySelector(".timeline-entries");
    s && s.classList.toggle("collapsed", i);
  }
  wireMetadataToggles() {
    this.container.querySelectorAll("[data-timeline-metadata]").forEach((i) => {
      i.addEventListener("click", () => {
        const n = i.dataset.timelineMetadata, s = this.container.querySelector(
          `[data-timeline-metadata-content="${n}"]`
        );
        if (!s) return;
        const o = !(i.getAttribute("aria-expanded") === "true");
        i.setAttribute("aria-expanded", o.toString()), s.classList.toggle("expanded", o);
        const r = i.querySelector(".timeline-metadata-chevron");
        r && (r.style.transform = o ? "rotate(180deg)" : "rotate(0deg)");
      });
    });
  }
}
function ne() {
  const t = document.createElement("div");
  return t.className = "timeline-loading", t.innerHTML = `
    <div class="timeline-loading-spinner"></div>
    <span>Loading more entries...</span>
  `, t;
}
function se() {
  const t = document.createElement("div");
  return t.className = "timeline-end", t.innerHTML = `
    <span>No more entries</span>
  `, t;
}
function ce() {
  const t = document.createElement("div");
  return t.className = "timeline-sentinel", t.setAttribute("aria-hidden", "true"), t;
}
const ae = {
  form: "#activity-filters",
  tableBody: "#activity-table-body",
  emptyState: "#activity-empty",
  disabledState: "#activity-disabled",
  errorState: "#activity-error",
  countEl: "#activity-count",
  prevBtn: "#activity-prev",
  nextBtn: "#activity-next",
  refreshBtn: "#activity-refresh",
  clearBtn: "#activity-clear",
  limitInput: "#filter-limit"
}, I = {
  container: "#activity-timeline",
  sentinel: "#activity-timeline-sentinel"
}, S = ["q", "verb", "channels", "object_type", "object_id"], E = ["since", "until"], re = ["user_id", "actor_id"];
class de {
  constructor(e, i = {}, n) {
    this.form = null, this.tableBody = null, this.emptyState = null, this.disabledState = null, this.errorState = null, this.countEl = null, this.prevBtn = null, this.nextBtn = null, this.refreshBtn = null, this.clearBtn = null, this.limitInput = null, this.viewSwitcher = null, this.timelineRenderer = null, this.timelineContainer = null, this.timelineSentinel = null, this.infiniteScrollObserver = null, this.isLoadingMore = !1, this.allEntriesLoaded = !1, this.cachedEntries = [], this.state = {
      limit: 50,
      offset: 0,
      total: 0,
      nextOffset: 0,
      hasMore: !1,
      extraParams: {}
    }, this.config = e, this.selectors = { ...ae, ...i }, this.toast = n || window.toastManager || null;
  }
  /**
   * Initialize the activity manager
   */
  init() {
    this.cacheElements(), this.initViewSwitcher(), this.initTimeline(), this.bindEvents(), this.syncFromQuery(), this.loadActivity();
  }
  /**
   * Initialize the view switcher
   */
  initViewSwitcher() {
    this.viewSwitcher = new C(
      {
        container: "#activity-view-switcher",
        tableTab: '[data-view-tab="table"]',
        timelineTab: '[data-view-tab="timeline"]',
        tableView: "#activity-table-container",
        timelineView: "#activity-timeline-container",
        paginationContainer: "#activity-pagination"
      },
      (e) => this.handleViewChange(e)
    ), this.viewSwitcher.init();
  }
  /**
   * Initialize the timeline renderer
   */
  initTimeline() {
    this.timelineContainer = document.querySelector(I.container), this.timelineSentinel = document.querySelector(I.sentinel), this.timelineContainer && (this.timelineRenderer = new ie(
      this.timelineContainer,
      this.config.actionLabels
    )), this.setupInfiniteScroll();
  }
  /**
   * Handle view change from switcher
   */
  handleViewChange(e) {
    e === "timeline" ? (this.allEntriesLoaded = !1, this.isLoadingMore = !1, this.timelineRenderer && this.cachedEntries.length > 0 && this.timelineRenderer.render(this.cachedEntries), this.enableInfiniteScroll()) : this.disableInfiniteScroll();
  }
  /**
   * Set up infinite scroll for timeline view
   */
  setupInfiniteScroll() {
    this.timelineSentinel && (this.infiniteScrollObserver = new IntersectionObserver(
      (e) => {
        e[0].isIntersecting && !this.isLoadingMore && !this.allEntriesLoaded && this.loadMoreEntries();
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0
      }
    ));
  }
  /**
   * Enable infinite scroll observation
   */
  enableInfiniteScroll() {
    this.infiniteScrollObserver && this.timelineSentinel && this.infiniteScrollObserver.observe(this.timelineSentinel);
  }
  /**
   * Disable infinite scroll observation
   */
  disableInfiniteScroll() {
    this.infiniteScrollObserver && this.timelineSentinel && this.infiniteScrollObserver.unobserve(this.timelineSentinel);
  }
  /**
   * Load more entries for infinite scroll
   */
  async loadMoreEntries() {
    if (this.isLoadingMore || this.allEntriesLoaded || !this.state.hasMore)
      return;
    this.isLoadingMore = !0;
    const e = ne();
    this.timelineSentinel?.parentElement?.insertBefore(e, this.timelineSentinel);
    try {
      this.state.offset = this.state.nextOffset;
      const i = this.buildParams(), n = `${this.config.apiPath}?${i.toString()}`, s = await fetch(n, { headers: { Accept: "application/json" } });
      if (!s.ok)
        throw new Error(`Failed to load more entries (${s.status})`);
      const a = await s.json(), o = Array.isArray(a.entries) ? a.entries : [];
      if (this.state.hasMore = !!a.has_more, this.state.nextOffset = typeof a.next_offset == "number" ? a.next_offset : this.state.offset + o.length, o.length === 0 ? this.allEntriesLoaded = !0 : (this.cachedEntries = [...this.cachedEntries, ...o], this.timelineRenderer && this.timelineRenderer.appendEntries(o)), !this.state.hasMore) {
        this.allEntriesLoaded = !0;
        const r = se();
        this.timelineSentinel?.parentElement?.insertBefore(r, this.timelineSentinel);
      }
    } catch (i) {
      console.error("Failed to load more entries:", i);
    } finally {
      e.remove(), this.isLoadingMore = !1;
    }
  }
  cacheElements() {
    this.form = document.querySelector(this.selectors.form), this.tableBody = document.querySelector(this.selectors.tableBody), this.emptyState = document.querySelector(this.selectors.emptyState), this.disabledState = document.querySelector(this.selectors.disabledState), this.errorState = document.querySelector(this.selectors.errorState), this.countEl = document.querySelector(this.selectors.countEl), this.prevBtn = document.querySelector(this.selectors.prevBtn), this.nextBtn = document.querySelector(this.selectors.nextBtn), this.refreshBtn = document.querySelector(this.selectors.refreshBtn), this.clearBtn = document.querySelector(this.selectors.clearBtn), this.limitInput = document.querySelector(this.selectors.limitInput);
  }
  bindEvents() {
    this.form?.addEventListener("submit", (e) => {
      e.preventDefault(), this.state.limit = parseInt(this.limitInput?.value || "50", 10) || 50, this.state.offset = 0, this.loadActivity();
    }), this.clearBtn?.addEventListener("click", () => {
      S.forEach((e) => this.setInputValue(e, "")), E.forEach((e) => this.setInputValue(e, "")), this.state.offset = 0, this.loadActivity();
    }), this.prevBtn?.addEventListener("click", () => {
      this.state.offset = Math.max(0, this.state.offset - this.state.limit), this.loadActivity();
    }), this.nextBtn?.addEventListener("click", () => {
      this.state.hasMore && (this.state.offset = this.state.nextOffset, this.loadActivity());
    }), this.refreshBtn?.addEventListener("click", () => {
      this.loadActivity();
    });
  }
  getInputValue(e) {
    const i = document.getElementById(`filter-${e.replace(/_/g, "-")}`);
    return i ? String(i.value || "").trim() : "";
  }
  setInputValue(e, i) {
    const n = document.getElementById(`filter-${e.replace(/_/g, "-")}`);
    n && (n.value = i || "");
  }
  toLocalInput(e) {
    if (!e) return "";
    const i = new Date(e);
    if (Number.isNaN(i.getTime())) return e;
    const n = i.getTimezoneOffset() * 6e4;
    return new Date(i.getTime() - n).toISOString().slice(0, 16);
  }
  toRFC3339(e) {
    if (!e) return "";
    const i = new Date(e);
    return Number.isNaN(i.getTime()) ? "" : i.toISOString();
  }
  syncFromQuery() {
    const e = new URLSearchParams(window.location.search), i = parseInt(e.get("limit") || "", 10), n = parseInt(e.get("offset") || "", 10);
    !Number.isNaN(i) && i > 0 && (this.state.limit = i), !Number.isNaN(n) && n >= 0 && (this.state.offset = n), this.limitInput && (this.limitInput.value = String(this.state.limit)), S.forEach((s) => this.setInputValue(s, e.get(s) || "")), E.forEach((s) => this.setInputValue(s, this.toLocalInput(e.get(s) || ""))), re.forEach((s) => {
      const a = e.get(s);
      a && (this.state.extraParams[s] = a);
    });
  }
  buildParams() {
    const e = new URLSearchParams();
    return e.set("limit", String(this.state.limit)), e.set("offset", String(this.state.offset)), S.forEach((i) => {
      const n = this.getInputValue(i);
      n && e.set(i, n);
    }), E.forEach((i) => {
      const n = this.toRFC3339(this.getInputValue(i));
      n && e.set(i, n);
    }), Object.entries(this.state.extraParams).forEach(([i, n]) => {
      n && e.set(i, n);
    }), e;
  }
  syncUrl(e) {
    this.viewSwitcher && C.addViewToParams(e, this.viewSwitcher.getView());
    const i = e.toString(), n = i ? `${window.location.pathname}?${i}` : window.location.pathname;
    window.history.replaceState({}, "", n);
  }
  resetStates() {
    this.disabledState?.classList.add("hidden"), this.errorState?.classList.add("hidden");
  }
  showError(e) {
    this.errorState && (this.errorState.textContent = e, this.errorState.classList.remove("hidden"));
  }
  showDisabled(e) {
    this.disabledState && (this.disabledState.textContent = e, this.disabledState.classList.remove("hidden"));
  }
  async loadActivity() {
    this.resetStates();
    const e = this.buildParams();
    this.syncUrl(e);
    const i = `${this.config.apiPath}?${e.toString()}`;
    try {
      const n = await fetch(i, { headers: { Accept: "application/json" } });
      if (!n.ok) {
        let r = null;
        try {
          r = await n.json();
        } catch {
          r = null;
        }
        if (n.status === 404 && r?.text_code === "FEATURE_DISABLED") {
          this.showDisabled(r.message || "Activity feature disabled."), this.renderRows([]), this.updatePagination(0);
          return;
        }
        this.showError(r?.message || `Failed to load activity (${n.status})`);
        return;
      }
      const s = await n.json(), a = Array.isArray(s.entries) ? s.entries : [];
      this.state.total = typeof s.total == "number" ? s.total : a.length, this.state.hasMore = !!s.has_more, this.state.nextOffset = typeof s.next_offset == "number" ? s.next_offset : this.state.offset + a.length, this.cachedEntries = a, this.allEntriesLoaded = !this.state.hasMore, this.isLoadingMore = !1, (this.viewSwitcher?.getView() || "table") === "timeline" ? this.renderTimeline(a) : this.renderRows(a), this.updatePagination(a.length);
    } catch {
      this.showError("Failed to load activity.");
    }
  }
  /**
   * Render entries in timeline view
   */
  renderTimeline(e) {
    if (!this.timelineRenderer) return;
    this.timelineContainer?.parentElement?.querySelector(".timeline-end")?.remove(), this.timelineRenderer.render(e), this.enableInfiniteScroll();
  }
  renderRows(e) {
    if (this.tableBody) {
      if (this.tableBody.innerHTML = "", !e || e.length === 0) {
        this.emptyState?.classList.remove("hidden");
        return;
      }
      this.emptyState?.classList.add("hidden"), e.forEach((i) => {
        const { mainRow: n, detailsRow: s } = this.createRowPair(i);
        this.tableBody.appendChild(n), s && this.tableBody.appendChild(s);
      }), this.wireMetadataToggles();
    }
  }
  createRowPair(e) {
    const i = this.config.actionLabels || {}, n = k(e.action, i), s = D(e, i), a = H(e.created_at), o = z(e.created_at), r = R(e.metadata), c = O(e.metadata), d = K(e.channel), h = {
      created: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
      updated: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
      deleted: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
      auth: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
      viewed: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe" },
      system: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" }
    }, u = h[n.category] || h.system, g = document.createElement("tr");
    g.className = `activity-row activity-row--${n.category}`;
    let b = "";
    n.namespace ? b = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #f3f4f6; border-radius: 6px; color: #6b7280;" title="${l(n.namespace)}">
            <i class="iconoir-${n.icon}" style="font-size: 14px;"></i>
          </span>
          <span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${u.bg}; color: ${u.color}; border: 1px solid ${u.border};">
            ${l(n.action)}
          </span>
        </div>
      ` : b = `
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${u.bg}; color: ${u.color}; border: 1px solid ${u.border};">
          <i class="iconoir-${n.icon}" style="font-size: 14px;"></i>
          <span>${l(n.action || "-")}</span>
        </span>
      `;
    let y = "";
    e.channel ? y = `
        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 11px; font-weight: 500; font-family: ui-monospace, monospace; color: #6b7280; background: #f3f4f6; border-radius: 4px; cursor: default;" title="${l(e.channel)}">
          ${l(d)}
        </span>
      ` : y = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    let w = "";
    r ? w = `
        <button type="button"
                class="activity-metadata-toggle"
                style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #6b7280; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer;"
                aria-expanded="false"
                data-metadata-toggle="${e.id}">
          <span>${r}</span>
          <svg class="activity-metadata-chevron" style="width: 12px; height: 12px; transition: transform 0.15s ease;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      ` : w = '<span style="color: #9ca3af; font-size: 12px;">-</span>', g.innerHTML = `
      <td style="padding: 12px 16px; vertical-align: middle; border-left: 3px solid ${u.color};">
        <div style="font-size: 13px; color: #374151; white-space: nowrap;">${a}</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${o}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle;">${b}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">
        <div style="font-size: 13px; line-height: 1.5; color: #374151;">${s}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle; text-align: center;">${y}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">${w}</td>
    `;
    let f = null;
    return r && (f = document.createElement("tr"), f.className = "activity-details-row", f.style.display = "none", f.dataset.metadataContent = e.id, f.innerHTML = `
        <td colspan="5" style="padding: 0; background: #f9fafb; border-left: 3px solid ${u.color};">
          <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px 24px;">
              ${c}
            </div>
          </div>
        </td>
      `), { mainRow: g, detailsRow: f };
  }
  wireMetadataToggles() {
    document.querySelectorAll("[data-metadata-toggle]").forEach((i) => {
      i.addEventListener("click", () => {
        const n = i.dataset.metadataToggle, s = document.querySelector(`tr[data-metadata-content="${n}"]`);
        if (!s) return;
        const o = !(i.getAttribute("aria-expanded") === "true");
        s.style.display = o ? "table-row" : "none", i.setAttribute("aria-expanded", o ? "true" : "false"), i.style.background = o ? "#e5e7eb" : "#f3f4f6";
        const r = i.querySelector(".activity-metadata-chevron");
        r && (r.style.transform = o ? "rotate(180deg)" : "rotate(0deg)");
      });
    });
  }
  updatePagination(e) {
    const i = Number.isFinite(this.state.total) ? this.state.total : 0, n = e > 0 ? this.state.offset + 1 : 0, s = this.state.offset + e;
    this.countEl && (i > 0 ? this.countEl.textContent = `Showing ${n}-${s} of ${i}` : e > 0 ? this.countEl.textContent = `Showing ${n}-${s}` : this.countEl.textContent = "No activity entries"), this.prevBtn && (this.prevBtn.disabled = this.state.offset <= 0), this.nextBtn && (this.nextBtn.disabled = !this.state.hasMore);
  }
}
export {
  V as ACTION_ICONS,
  de as ActivityManager,
  C as ActivityViewSwitcher,
  U as NAMESPACE_ICONS,
  ie as TimelineRenderer,
  Y as countMetadataFields,
  se as createEndIndicator,
  ne as createLoadingIndicator,
  ce as createScrollSentinel,
  l as escapeHtml,
  D as formatActivitySentence,
  K as formatChannel,
  O as formatMetadataExpanded,
  z as formatRelativeTime,
  G as formatRelativeTimeIntl,
  H as formatTimestamp,
  x as getActionCategory,
  oe as getActionClass,
  le as getActionIconHtml,
  _ as getDateGroupLabel,
  p as getDateKey,
  R as getMetadataSummary,
  B as getStartOfDay,
  J as groupEntriesByDate,
  Q as mergeEntriesIntoGroups,
  k as parseActionString,
  P as parseObject,
  te as renderDateGroup,
  ee as renderDateGroupHeader,
  Z as renderTimelineEntry,
  A as resolveActionLabel,
  N as shortenId
};
//# sourceMappingURL=index.js.map
