const j = {
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
}, A = {
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
function k(t, e) {
  if (!t) return "";
  if (!e) return t;
  const i = t.trim();
  if (!i) return t;
  const n = e[i];
  return typeof n == "string" && n.trim() !== "" ? n : t;
}
function N(t, e) {
  if (!t)
    return { namespace: "", action: "", icon: "activity", category: "system" };
  const i = k(t, e);
  if (t.includes(".")) {
    const a = t.split("."), r = a[0].toLowerCase(), o = a.slice(1).join("."), d = U[r] || "activity", c = a[a.length - 1], h = E(c);
    return { namespace: r, action: i !== t ? i : o, icon: d, category: h };
  }
  const n = E(t);
  return {
    namespace: "",
    action: i !== t ? i : t,
    icon: A[n],
    category: n
  };
}
function E(t) {
  if (!t) return "system";
  const e = t.toLowerCase().trim().replace(/-/g, "_");
  return j[e] || "system";
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
function D(t, e) {
  if (!t || typeof t != "object") return "";
  const i = t[e];
  return i == null ? "" : typeof i == "string" ? i.trim() : typeof i == "number" || typeof i == "boolean" ? String(i) : "";
}
function F(...t) {
  for (const e of t) {
    if (!e) continue;
    const i = e.trim();
    if (i) return i;
  }
  return "";
}
function H(t) {
  return F(D(t.metadata, "actor_display"), t.actor);
}
function z(t) {
  return D(t.metadata, "object_display");
}
function G(t) {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}
function T(t) {
  return t ? t.split(/[_-]/).map(G).join(" ") : "";
}
function l(t) {
  const e = document.createElement("div");
  return e.textContent = t, e.innerHTML;
}
function $(t, e = 7) {
  if (!t) return "";
  const i = t.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(i) || t.length > e + 3 ? t.substring(0, e) : t;
}
function Y(t) {
  const e = t.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(e);
}
function v(t, e = 8) {
  if (!t) return "";
  const i = $(t, e);
  return i === t ? l(t) : `<span class="activity-id-short" title="${l(t)}" style="cursor: help; border-bottom: 1px dotted #9ca3af;">${l(i)}</span>`;
}
function _(t, e) {
  const i = H(t) || "Unknown", n = t.action || "performed action on", s = k(n, e), a = Y(i) ? v(i, 8) : `<strong>${l(i)}</strong>`;
  let r = "";
  const o = z(t);
  if (o)
    r = l(o);
  else {
    const { type: c, id: h } = P(t.object);
    if (c && h) {
      const f = v(h, 8);
      r = `${T(c)} #${f}`;
    } else c ? r = T(c) : h && (r = `#${v(h, 8)}`);
  }
  if (E(n) === "auth") {
    const c = t.metadata?.ip || t.metadata?.IP;
    return c ? `${a} ${l(s)} from ${l(String(c))}` : `${a} ${l(s)}`;
  }
  return r ? `${a} ${l(s)} <strong>${r}</strong>` : `${a} ${l(s)}`;
}
function K(t) {
  if (!t) return "-";
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? t : e.toLocaleString();
}
function W(t) {
  if (!t) return "";
  const e = new Date(t);
  if (Number.isNaN(e.getTime())) return t;
  const n = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), s = Math.floor(n / 1e3), a = Math.floor(s / 60), r = Math.floor(a / 60), o = Math.floor(r / 24);
  return s < 60 ? "just now" : a < 60 ? `${a}m ago` : r < 24 ? `${r}h ago` : o < 7 ? `${o}d ago` : e.toLocaleDateString();
}
function J(t) {
  if (!t) return "";
  const e = new Date(t);
  if (Number.isNaN(e.getTime())) return t;
  const n = (/* @__PURE__ */ new Date()).getTime() - e.getTime(), s = Math.floor(n / 1e3), a = Math.floor(s / 60), r = Math.floor(a / 60), o = Math.floor(r / 24), d = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (s < 60) return "just now";
  if (a < 60) return d.format(-a, "minute");
  if (r < 24) return d.format(-r, "hour");
  if (o < 7) return d.format(-o, "day");
  if (o < 30) {
    const c = Math.floor(o / 7);
    return d.format(-c, "week");
  }
  return e.toLocaleDateString();
}
function B(t) {
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
function R(t) {
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}
function m(t) {
  const e = t.getFullYear(), i = String(t.getMonth() + 1).padStart(2, "0"), n = String(t.getDate()).padStart(2, "0");
  return `${e}-${i}-${n}`;
}
function Q(t) {
  return !t || typeof t != "object" ? 0 : Object.keys(t).length;
}
function O(t) {
  const e = Q(t);
  return e === 0 ? "" : e === 1 ? "1 field" : `${e} fields`;
}
function q(t) {
  if (!t || typeof t != "object") return "";
  const e = Object.entries(t);
  return e.length === 0 ? "" : e.map(([n, s]) => {
    const a = l(n);
    let r;
    if (n.endsWith("_old") || n.endsWith("_new"))
      r = l(L(s));
    else if (typeof s == "object" && s !== null) {
      const o = JSON.stringify(s), d = o.length > 100 ? o.substring(0, 100) + "..." : o;
      r = `<code style="font-size: 11px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${l(d)}</code>`;
    } else
      r = l(L(s));
    return `
      <div style="display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
        <span style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${a}</span>
        <span style="color: #111827; font-size: 12px; font-weight: 500; word-break: break-word;">${r}</span>
      </div>
    `;
  }).join("");
}
function L(t) {
  return t == null ? "-" : typeof t == "boolean" ? t ? "Yes" : "No" : typeof t == "number" ? String(t) : typeof t == "string" ? t.length > 100 ? t.substring(0, 100) + "..." : t : JSON.stringify(t);
}
function X(t) {
  return t ? $(t, 7) : "";
}
function fe(t) {
  return `activity-action--${t}`;
}
function ue(t) {
  return `<i class="iconoir-${A[t]} activity-action-icon"></i>`;
}
const Z = {
  container: "#activity-view-switcher",
  tableTab: '[data-view-tab="table"]',
  timelineTab: '[data-view-tab="timeline"]',
  tableView: "#activity-table-container",
  timelineView: "#activity-timeline-container",
  paginationContainer: "#activity-pagination"
}, C = "activity-view-preference", p = "view";
class M {
  constructor(e = {}, i) {
    this.currentView = "table", this.container = null, this.tableTab = null, this.timelineTab = null, this.tableView = null, this.timelineView = null, this.paginationContainer = null, this.handleTableClick = () => {
      this.setView("table");
    }, this.handleTimelineClick = () => {
      this.setView("timeline");
    }, this.selectors = { ...Z, ...e }, this.onViewChange = i;
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
    const i = new URLSearchParams(window.location.search).get(p);
    if (i === "table" || i === "timeline") {
      this.setView(i, { persist: !0, updateUrl: !1 });
      return;
    }
    const n = localStorage.getItem(C);
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
      localStorage.setItem(C, this.currentView);
    } catch {
    }
  }
  /**
   * Update URL parameter without page reload
   */
  updateUrlParam() {
    const e = new URLSearchParams(window.location.search);
    this.currentView === "table" ? e.delete(p) : e.set(p, this.currentView);
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
    return new URLSearchParams(window.location.search).get(p) === "timeline" ? "timeline" : "table";
  }
  /**
   * Add view param to existing URLSearchParams (for query sync)
   */
  static addViewToParams(e, i) {
    i === "timeline" ? e.set(p, i) : e.delete(p);
  }
}
const I = {
  created: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
  updated: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  deleted: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
  auth: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
  viewed: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe" },
  system: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" }
};
function ee(t) {
  if (!t || t.length === 0)
    return [];
  const e = /* @__PURE__ */ new Map();
  return t.forEach((i) => {
    const n = new Date(i.created_at);
    if (Number.isNaN(n.getTime())) return;
    const s = m(n), a = R(n);
    e.has(s) || e.set(s, {
      date: a,
      label: B(n),
      entries: [],
      collapsed: !1
    }), e.get(s).entries.push(i);
  }), Array.from(e.values()).sort(
    (i, n) => n.date.getTime() - i.date.getTime()
  );
}
function te(t, e) {
  if (!e || e.length === 0)
    return t;
  const i = /* @__PURE__ */ new Map();
  t.forEach((s) => {
    i.set(m(s.date), { ...s, entries: [...s.entries] });
  }), e.forEach((s) => {
    const a = new Date(s.created_at);
    if (Number.isNaN(a.getTime())) return;
    const r = m(a), o = R(a);
    i.has(r) || i.set(r, {
      date: o,
      label: B(a),
      entries: [],
      collapsed: !1
    });
    const d = i.get(r);
    d.entries.some((c) => c.id === s.id) || d.entries.push(s);
  });
  const n = Array.from(i.values()).sort(
    (s, a) => a.date.getTime() - s.date.getTime()
  );
  return n.forEach((s) => {
    s.entries.sort(
      (a, r) => new Date(r.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }), n;
}
function ie(t) {
  if (!t) return "?";
  const e = t.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/i.test(e))
    return t.substring(0, 2).toUpperCase();
  const i = t.split(/[\s._-]+/).filter(Boolean);
  return i.length >= 2 ? (i[0][0] + i[1][0]).toUpperCase() : t.substring(0, 2).toUpperCase();
}
function ne(t, e) {
  const i = N(t.action, e), n = _(t, e), s = J(t.created_at), a = O(t.metadata), r = q(t.metadata), o = I[i.category] || I.system, d = ie(t.actor), c = document.createElement("div");
  c.className = `timeline-entry timeline-entry--${i.category}`, c.dataset.entryId = t.id;
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
            ${r}
          </div>
        </div>
      </div>
    `), c.innerHTML = `
    <div class="timeline-entry-connector">
      <div class="timeline-entry-dot" style="background-color: ${o.color}; border-color: ${o.border};"></div>
    </div>
    <div class="timeline-entry-card">
      <div class="timeline-entry-header">
        <div class="timeline-entry-avatar" style="background-color: ${o.bg}; color: ${o.color};">
          ${l(d)}
        </div>
        <div class="timeline-entry-content">
          <div class="timeline-entry-action">
            <span class="timeline-action-badge" style="background-color: ${o.bg}; color: ${o.color}; border-color: ${o.border};">
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
  `, c;
}
function se(t, e) {
  const i = m(t.date), n = document.createElement("div");
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
function ae(t, e, i) {
  const n = document.createElement("div");
  n.className = "timeline-group", n.dataset.dateGroup = m(t.date);
  const s = se(t, i);
  n.appendChild(s);
  const a = document.createElement("div");
  return a.className = "timeline-entries", t.collapsed && a.classList.add("collapsed"), t.entries.forEach((r) => {
    const o = ne(r, e);
    a.appendChild(o);
  }), n.appendChild(a), n;
}
class re {
  constructor(e, i) {
    this.collapsedGroups = /* @__PURE__ */ new Set(), this.groups = [], this.container = e, this.actionLabels = i;
  }
  /**
   * Render the full timeline
   */
  render(e) {
    if (this.groups = ee(e), this.container.innerHTML = "", this.groups.length === 0) {
      this.renderEmptyState();
      return;
    }
    const i = document.createElement("div");
    i.className = "timeline", this.groups.forEach((n) => {
      const s = m(n.date);
      n.collapsed = this.collapsedGroups.has(s);
      const a = ae(n, this.actionLabels, (r, o) => {
        this.handleGroupToggle(r, o);
      });
      i.appendChild(a);
    }), this.container.appendChild(i), this.wireMetadataToggles();
  }
  /**
   * Append more entries (for infinite scroll)
   */
  appendEntries(e) {
    this.groups = te(this.groups, e);
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
        const r = !(i.getAttribute("aria-expanded") === "true");
        i.setAttribute("aria-expanded", r.toString()), s.classList.toggle("expanded", r);
        const o = i.querySelector(".timeline-metadata-chevron");
        o && (o.style.transform = r ? "rotate(180deg)" : "rotate(0deg)");
      });
    });
  }
}
function oe() {
  const t = document.createElement("div");
  return t.className = "timeline-loading", t.innerHTML = `
    <div class="timeline-loading-spinner"></div>
    <span>Loading more entries...</span>
  `, t;
}
function le() {
  const t = document.createElement("div");
  return t.className = "timeline-end", t.innerHTML = `
    <span>No more entries</span>
  `, t;
}
function pe() {
  const t = document.createElement("div");
  return t.className = "timeline-sentinel", t.setAttribute("aria-hidden", "true"), t;
}
const ce = {
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
}, V = {
  container: "#activity-timeline",
  sentinel: "#activity-timeline-sentinel"
}, S = ["q", "verb", "channels", "object_type", "object_id"], x = ["since", "until"], de = ["user_id", "actor_id"];
function he(t) {
  const e = t.metadata;
  if (!e || typeof e != "object") return "";
  const i = e.session_id;
  return typeof i == "string" ? i.trim() : typeof i == "number" || typeof i == "boolean" ? String(i) : "";
}
class me {
  constructor(e, i = {}, n) {
    this.form = null, this.tableBody = null, this.emptyState = null, this.disabledState = null, this.errorState = null, this.countEl = null, this.prevBtn = null, this.nextBtn = null, this.refreshBtn = null, this.clearBtn = null, this.limitInput = null, this.viewSwitcher = null, this.timelineRenderer = null, this.timelineContainer = null, this.timelineSentinel = null, this.infiniteScrollObserver = null, this.isLoadingMore = !1, this.allEntriesLoaded = !1, this.cachedEntries = [], this.state = {
      limit: 50,
      offset: 0,
      total: 0,
      nextOffset: 0,
      hasMore: !1,
      extraParams: {}
    }, this.config = e, this.selectors = { ...ce, ...i }, this.toast = n || window.toastManager || null;
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
    this.viewSwitcher = new M(
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
    this.timelineContainer = document.querySelector(V.container), this.timelineSentinel = document.querySelector(V.sentinel), this.timelineContainer && (this.timelineRenderer = new re(
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
    const e = oe();
    this.timelineSentinel?.parentElement?.insertBefore(e, this.timelineSentinel);
    try {
      this.state.offset = this.state.nextOffset;
      const i = this.buildParams(), n = `${this.config.apiPath}?${i.toString()}`, s = await fetch(n, { headers: { Accept: "application/json" } });
      if (!s.ok)
        throw new Error(`Failed to load more entries (${s.status})`);
      const a = await s.json(), r = Array.isArray(a.entries) ? a.entries : [];
      if (this.state.hasMore = !!a.has_more, this.state.nextOffset = typeof a.next_offset == "number" ? a.next_offset : this.state.offset + r.length, r.length === 0 ? this.allEntriesLoaded = !0 : (this.cachedEntries = [...this.cachedEntries, ...r], this.timelineRenderer && this.timelineRenderer.appendEntries(r)), !this.state.hasMore) {
        this.allEntriesLoaded = !0;
        const o = le();
        this.timelineSentinel?.parentElement?.insertBefore(o, this.timelineSentinel);
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
      S.forEach((e) => this.setInputValue(e, "")), x.forEach((e) => this.setInputValue(e, "")), this.state.offset = 0, this.loadActivity();
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
    !Number.isNaN(i) && i > 0 && (this.state.limit = i), !Number.isNaN(n) && n >= 0 && (this.state.offset = n), this.limitInput && (this.limitInput.value = String(this.state.limit)), S.forEach((s) => this.setInputValue(s, e.get(s) || "")), x.forEach((s) => this.setInputValue(s, this.toLocalInput(e.get(s) || ""))), de.forEach((s) => {
      const a = e.get(s);
      a && (this.state.extraParams[s] = a);
    });
  }
  buildParams() {
    const e = new URLSearchParams();
    return e.set("limit", String(this.state.limit)), e.set("offset", String(this.state.offset)), S.forEach((i) => {
      const n = this.getInputValue(i);
      n && e.set(i, n);
    }), x.forEach((i) => {
      const n = this.toRFC3339(this.getInputValue(i));
      n && e.set(i, n);
    }), Object.entries(this.state.extraParams).forEach(([i, n]) => {
      n && e.set(i, n);
    }), e;
  }
  syncUrl(e) {
    this.viewSwitcher && M.addViewToParams(e, this.viewSwitcher.getView());
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
        let o = null;
        try {
          o = await n.json();
        } catch {
          o = null;
        }
        if (n.status === 404 && o?.text_code === "FEATURE_DISABLED") {
          this.showDisabled(o.message || "Activity feature disabled."), this.renderRows([]), this.updatePagination(0);
          return;
        }
        this.showError(o?.message || `Failed to load activity (${n.status})`);
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
    if (!this.tableBody) return;
    if (this.tableBody.innerHTML = "", !e || e.length === 0) {
      this.emptyState?.classList.remove("hidden");
      return;
    }
    this.emptyState?.classList.add("hidden");
    let i = "";
    e.forEach((n) => {
      const s = he(n);
      s && s !== i ? (this.tableBody.appendChild(this.createSessionRow(s)), i = s) : s || (i = "");
      const { mainRow: a, detailsRow: r } = this.createRowPair(n);
      this.tableBody.appendChild(a), r && this.tableBody.appendChild(r);
    }), this.wireMetadataToggles();
  }
  createRowPair(e) {
    const i = this.config.actionLabels || {}, n = N(e.action, i), s = _(e, i), a = K(e.created_at), r = W(e.created_at), o = O(e.metadata), d = q(e.metadata), c = X(e.channel), h = {
      created: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
      updated: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
      deleted: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
      auth: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
      viewed: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe" },
      system: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" }
    }, f = h[n.category] || h.system, g = document.createElement("tr");
    g.className = `activity-row activity-row--${n.category}`;
    let b = "";
    n.namespace ? b = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #f3f4f6; border-radius: 6px; color: #6b7280;" title="${l(n.namespace)}">
            <i class="iconoir-${n.icon}" style="font-size: 14px;"></i>
          </span>
          <span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${f.bg}; color: ${f.color}; border: 1px solid ${f.border};">
            ${l(n.action)}
          </span>
        </div>
      ` : b = `
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${f.bg}; color: ${f.color}; border: 1px solid ${f.border};">
          <i class="iconoir-${n.icon}" style="font-size: 14px;"></i>
          <span>${l(n.action || "-")}</span>
        </span>
      `;
    let y = "";
    e.channel ? y = `
        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 11px; font-weight: 500; font-family: ui-monospace, monospace; color: #6b7280; background: #f3f4f6; border-radius: 4px; cursor: default;" title="${l(e.channel)}">
          ${l(c)}
        </span>
      ` : y = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    let w = "";
    o ? w = `
        <button type="button"
                class="activity-metadata-toggle"
                style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #6b7280; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer;"
                aria-expanded="false"
                data-metadata-toggle="${e.id}">
          <span>${o}</span>
          <svg class="activity-metadata-chevron" style="width: 12px; height: 12px; transition: transform 0.15s ease;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      ` : w = '<span style="color: #9ca3af; font-size: 12px;">-</span>', g.innerHTML = `
      <td style="padding: 12px 16px; vertical-align: middle; border-left: 3px solid ${f.color};">
        <div style="font-size: 13px; color: #374151; white-space: nowrap;">${a}</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${r}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle;">${b}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">
        <div style="font-size: 13px; line-height: 1.5; color: #374151;">${s}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle; text-align: center;">${y}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">${w}</td>
    `;
    let u = null;
    return o && (u = document.createElement("tr"), u.className = "activity-details-row", u.style.display = "none", u.dataset.metadataContent = e.id, u.innerHTML = `
        <td colspan="5" style="padding: 0; background: #f9fafb; border-left: 3px solid ${f.color};">
          <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px 24px;">
              ${d}
            </div>
          </div>
        </td>
      `), { mainRow: g, detailsRow: u };
  }
  createSessionRow(e) {
    const i = document.createElement("tr");
    i.className = "activity-session-row";
    const n = $(e, 10);
    return i.innerHTML = `
      <td colspan="5" style="padding: 8px 16px; background: #f8fafc; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em;">
          <span>Session</span>
          <span style="font-family: ui-monospace, monospace; font-weight: 600; color: #374151;" title="${l(e)}">${l(n)}</span>
        </div>
      </td>
    `, i;
  }
  wireMetadataToggles() {
    document.querySelectorAll("[data-metadata-toggle]").forEach((i) => {
      i.addEventListener("click", () => {
        const n = i.dataset.metadataToggle, s = document.querySelector(`tr[data-metadata-content="${n}"]`);
        if (!s) return;
        const r = !(i.getAttribute("aria-expanded") === "true");
        s.style.display = r ? "table-row" : "none", i.setAttribute("aria-expanded", r ? "true" : "false"), i.style.background = r ? "#e5e7eb" : "#f3f4f6";
        const o = i.querySelector(".activity-metadata-chevron");
        o && (o.style.transform = r ? "rotate(180deg)" : "rotate(0deg)");
      });
    });
  }
  updatePagination(e) {
    const i = Number.isFinite(this.state.total) ? this.state.total : 0, n = e > 0 ? this.state.offset + 1 : 0, s = this.state.offset + e;
    this.countEl && (i > 0 ? this.countEl.textContent = `Showing ${n}-${s} of ${i}` : e > 0 ? this.countEl.textContent = `Showing ${n}-${s}` : this.countEl.textContent = "No activity entries"), this.prevBtn && (this.prevBtn.disabled = this.state.offset <= 0), this.nextBtn && (this.nextBtn.disabled = !this.state.hasMore);
  }
}
export {
  A as ACTION_ICONS,
  me as ActivityManager,
  M as ActivityViewSwitcher,
  U as NAMESPACE_ICONS,
  re as TimelineRenderer,
  Q as countMetadataFields,
  le as createEndIndicator,
  oe as createLoadingIndicator,
  pe as createScrollSentinel,
  l as escapeHtml,
  _ as formatActivitySentence,
  X as formatChannel,
  q as formatMetadataExpanded,
  W as formatRelativeTime,
  J as formatRelativeTimeIntl,
  K as formatTimestamp,
  E as getActionCategory,
  fe as getActionClass,
  ue as getActionIconHtml,
  B as getDateGroupLabel,
  m as getDateKey,
  O as getMetadataSummary,
  R as getStartOfDay,
  ee as groupEntriesByDate,
  te as mergeEntriesIntoGroups,
  N as parseActionString,
  P as parseObject,
  ae as renderDateGroup,
  se as renderDateGroupHeader,
  ne as renderTimelineEntry,
  k as resolveActionLabel,
  H as resolveActorLabel,
  z as resolveObjectDisplay,
  $ as shortenId
};
//# sourceMappingURL=index.js.map
