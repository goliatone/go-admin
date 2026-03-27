import { escapeHTML as l } from "../shared/html.js";
import { r as E } from "../chunks/icon-renderer-FL11lsYV.js";
import { formatRelativeTimeCompactPast as re, formatRelativeTimeNatural as oe } from "../shared/time-formatters.js";
const le = {
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
}, ce = "actor_display", de = "object_display", ue = "object_deleted", pe = "actor_type", fe = "actor_email", he = "session_id", me = "enriched_at", ge = "enricher_version", F = {
  user: "user",
  system: "settings",
  job: "clock",
  api: "cloud",
  unknown: "help-circle"
}, be = {
  user: "User",
  system: "System",
  job: "Job",
  api: "API",
  unknown: "Unknown"
};
function Y(e) {
  if (typeof e != "string" || !e) return !1;
  const t = e.trim();
  if (/^\[(REDACTED|HIDDEN|MASKED|REMOVED)\]$/i.test(t) || /^\*+$/.test(t) || /^[^*]+\*{3,}[^*]+$/.test(t))
    return !0;
  const i = t.replace(/-/g, "");
  return !!/^[0-9a-f]{64,}$/i.test(i);
}
function K(e) {
  if (!e || typeof e != "object") return !0;
  const t = Object.keys(e);
  return t.length === 0 ? !0 : t.every((i) => {
    const n = e[i];
    return n == null || n === "";
  });
}
const G = {
  created: "plus",
  updated: "edit-pencil",
  deleted: "trash",
  auth: "key",
  viewed: "eye",
  system: "settings"
}, ye = {
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
function J(e, t) {
  if (!e) return "";
  if (!t) return e;
  const i = e.trim();
  if (!i) return e;
  const n = t[i];
  return typeof n == "string" && n.trim() !== "" ? n : e;
}
function W(e, t) {
  if (!e)
    return { namespace: "", action: "", icon: "activity", category: "system" };
  const i = J(e, t);
  if (e.includes(".")) {
    const a = e.split("."), r = a[0].toLowerCase(), o = a.slice(1).join("."), c = ye[r] || "activity", u = a[a.length - 1], h = B(u);
    return { namespace: r, action: i !== e ? i : o, icon: c, category: h };
  }
  const n = B(e);
  return {
    namespace: "",
    action: i !== e ? i : e,
    icon: G[n],
    category: n
  };
}
function B(e) {
  if (!e) return "system";
  const t = e.toLowerCase().trim().replace(/-/g, "_");
  return le[t] || "system";
}
function ve(e) {
  if (!e) return { type: "", id: "" };
  if (!e.includes(":"))
    return { type: e, id: "" };
  const t = e.indexOf(":");
  return {
    type: e.substring(0, t),
    id: e.substring(t + 1)
  };
}
function S(e, t) {
  if (!e || typeof e != "object") return "";
  const i = e[t];
  return i == null ? "" : typeof i == "string" ? i.trim() : typeof i == "number" || typeof i == "boolean" ? String(i) : "";
}
function we(...e) {
  for (const t of e) {
    if (!t) continue;
    const i = t.trim();
    if (i) return i;
  }
  return "";
}
function Q(e) {
  return we(S(e.metadata, ce), e.actor);
}
function xe(e) {
  return S(e.metadata, de);
}
function Ee(e) {
  return !e.metadata || typeof e.metadata != "object" ? !1 : e.metadata[ue] === !0;
}
function N(e) {
  if (!e.metadata || typeof e.metadata != "object") return "unknown";
  const t = e.metadata[pe];
  if (typeof t == "string") {
    const i = t.toLowerCase();
    if (i in F)
      return i;
  }
  return "unknown";
}
function Je(e) {
  return S(e.metadata, fe);
}
function X(e) {
  return S(e.metadata, he);
}
function Se(e) {
  const t = S(e.metadata, me), i = S(e.metadata, ge);
  return !t && !i ? null : { enrichedAt: t, enricherVersion: i };
}
function Te(e) {
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
function O(e) {
  return e ? e.split(/[_-]/).map(Te).join(" ") : "";
}
function C(e, t = 7) {
  if (!e) return "";
  const i = e.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(i) || e.length > t + 3 ? e.substring(0, t) : e;
}
function Z(e) {
  if (!e) return !1;
  const t = e.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(t);
}
function I(e, t = 8) {
  if (!e) return "";
  const i = C(e, t);
  return i === e ? l(e) : `<span class="activity-id-short" title="${l(e)}" style="cursor: help; border-bottom: 1px dotted #9ca3af;">${l(i)}</span>`;
}
function ee(e, t, i) {
  const { showActorTypeBadge: n = !1 } = i || {}, s = Q(e) || "Unknown", a = e.action || "performed action on", r = J(a, t);
  let o = "";
  if (n) {
    const d = N(e);
    d !== "user" && d !== "unknown" && (o = R(d, { badge: !0, size: "sm" }) + " ");
  }
  const c = Z(s) ? `${o}${I(s, 8)}` : `${o}<strong>${l(s)}</strong>`, h = Ee(e) ? ' <span class="activity-deleted-marker" title="This object has been deleted">(deleted)</span>' : "";
  let p = "";
  const m = xe(e);
  if (m)
    p = l(m) + h;
  else {
    const { type: d, id: f } = ve(e.object);
    if (d && f) {
      const g = I(f, 8);
      p = `${l(O(d))} #${g}${h}`;
    } else d ? p = l(O(d)) + h : f && (p = `#${I(f, 8)}${h}`);
  }
  if (B(a) === "auth") {
    const d = e.metadata?.ip || e.metadata?.IP;
    return d ? `${c} ${l(r)} from ${l(String(d))}` : `${c} ${l(r)}`;
  }
  return p ? `${c} ${l(r)} <strong>${p}</strong>` : `${c} ${l(r)}`;
}
function $e(e) {
  if (!e) return "-";
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleString();
}
function Ae(e) {
  return re(e, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__"
  });
}
function Ie(e) {
  return oe(e, {
    emptyFallback: "",
    invalidFallback: "__ORIGINAL__",
    locale: "en",
    numeric: "auto",
    direction: "past-only",
    maxRelativeDays: 30
  });
}
function te(e) {
  const t = /* @__PURE__ */ new Date(), i = new Date(t.getFullYear(), t.getMonth(), t.getDate()), n = new Date(i);
  n.setDate(n.getDate() - 1);
  const s = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  return s.getTime() === i.getTime() ? "Today" : s.getTime() === n.getTime() ? "Yesterday" : new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: s.getFullYear() !== t.getFullYear() ? "numeric" : void 0
  }).format(e);
}
function ie(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate());
}
function T(e) {
  const t = e.getFullYear(), i = String(e.getMonth() + 1).padStart(2, "0"), n = String(e.getDate()).padStart(2, "0");
  return `${t}-${i}-${n}`;
}
function Ce(e) {
  return !e || typeof e != "object" ? 0 : Object.keys(e).length;
}
function ne(e) {
  if (e === null) return "hidden";
  if (e === void 0 || typeof e != "object") return "";
  const t = Ce(e);
  return t === 0 || K(e) ? "hidden" : t === 1 ? "1 field" : `${t} fields`;
}
function se(e) {
  if (e === null)
    return `
      <div class="activity-metadata-hidden" style="padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; text-align: center;">
        <span style="color: #9ca3af; font-size: 12px; font-style: italic;">Metadata hidden</span>
      </div>
    `;
  if (e === void 0 || typeof e != "object") return "";
  const t = Object.entries(e);
  return t.length === 0 || K(e) ? `
      <div class="activity-metadata-hidden" style="padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; text-align: center;">
        <span style="color: #9ca3af; font-size: 12px; font-style: italic;">Metadata hidden</span>
      </div>
    ` : t.map(([n, s]) => {
    const a = l(n);
    let r, o = !1;
    if (Y(s))
      o = !0, r = `<span class="activity-masked-value" title="This value is masked">${l(String(s))}</span>`;
    else if (n.endsWith("_old") || n.endsWith("_new"))
      r = l(j(s));
    else if (typeof s == "object" && s !== null) {
      const u = JSON.stringify(s), h = u.length > 100 ? u.substring(0, 100) + "..." : u;
      r = `<code style="font-size: 11px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${l(h)}</code>`;
    } else
      r = l(j(s));
    return `
      <div class="activity-metadata-item${o ? " activity-metadata-item--masked" : ""}" style="display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
        <span style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${a}</span>
        <span style="color: #111827; font-size: 12px; font-weight: 500; word-break: break-word;">${r}</span>
      </div>
    `;
  }).join("");
}
function ae(e) {
  const t = Se(e);
  if (!t) return "";
  const i = [];
  if (t.enrichedAt) {
    const n = new Date(t.enrichedAt), s = Number.isNaN(n.getTime()) ? t.enrichedAt : n.toLocaleString();
    i.push(`
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <span style="color: #9ca3af; font-size: 11px;">Enriched at:</span>
        <span style="color: #6b7280; font-size: 11px; font-family: ui-monospace, monospace;">${l(s)}</span>
      </div>
    `);
  }
  return t.enricherVersion && i.push(`
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <span style="color: #9ca3af; font-size: 11px;">Enricher version:</span>
        <span style="color: #6b7280; font-size: 11px; font-family: ui-monospace, monospace;">${l(t.enricherVersion)}</span>
      </div>
    `), i.length === 0 ? "" : `
    <div class="activity-enrichment-debug" style="margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 4px; border: 1px dashed #e5e7eb;">
      <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
        <i class="iconoir-info-circle" style="font-size: 12px; color: #9ca3af;"></i>
        <span style="color: #9ca3af; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Debug Info</span>
      </div>
      ${i.join("")}
    </div>
  `;
}
function j(e) {
  return e == null ? "-" : typeof e == "boolean" ? e ? "Yes" : "No" : typeof e == "number" ? String(e) : typeof e == "string" ? e.length > 100 ? e.substring(0, 100) + "..." : e : JSON.stringify(e);
}
function _e(e) {
  return e ? C(e, 7) : "";
}
function We(e) {
  return `activity-action--${e}`;
}
function Qe(e) {
  const t = G[e];
  return E(`iconoir:${t}`, { extraClass: "activity-action-icon" });
}
function R(e, t) {
  const { badge: i = !1, size: n = "md" } = t || {}, s = F[e], a = be[e], r = {
    sm: "12px",
    md: "14px",
    lg: "16px"
  };
  if (i) {
    const o = E(`iconoir:${s}`, { size: r[n] });
    return `
      <span class="activity-actor-type-badge activity-actor-type-badge--${e}" title="${l(a)}">
        ${o}
      </span>
    `;
  }
  return E(`iconoir:${s}`, {
    size: r[n],
    extraClass: `activity-actor-type-icon activity-actor-type-icon--${e}`
  });
}
function Xe(e) {
  const t = Q(e) || "Unknown", i = N(e), n = Z(t) ? I(t, 8) : l(t);
  return `${i !== "user" && i !== "unknown" ? R(i, { badge: !0, size: "sm" }) + " " : ""}<strong>${n}</strong>`;
}
function ke(e, t = 10) {
  return e ? C(e, t) : "";
}
function Le(e) {
  return e ? Y(e) ? "Session (masked)" : `Session ${ke(e, 8)}` : "No session";
}
const De = {
  container: "#activity-view-switcher",
  tableTab: '[data-view-tab="table"]',
  timelineTab: '[data-view-tab="timeline"]',
  tableView: "#activity-table-container",
  timelineView: "#activity-timeline-container",
  paginationContainer: "#activity-pagination"
}, z = "activity-view-preference", x = "view";
class q {
  constructor(t = {}, i) {
    this.currentView = "table", this.container = null, this.tableTab = null, this.timelineTab = null, this.tableView = null, this.timelineView = null, this.paginationContainer = null, this.handleTableClick = () => {
      this.setView("table");
    }, this.handleTimelineClick = () => {
      this.setView("timeline");
    }, this.selectors = { ...De, ...t }, this.onViewChange = i;
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
  setView(t, i = {}) {
    const { persist: n = !0, updateUrl: s = !0 } = i;
    t !== "table" && t !== "timeline" && (t = "table"), this.currentView = t, this.updateUI(), n && this.persistView(), s && this.updateUrlParam(), this.emitViewChange();
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
    const i = new URLSearchParams(window.location.search).get(x);
    if (i === "table" || i === "timeline") {
      this.setView(i, { persist: !0, updateUrl: !1 });
      return;
    }
    const n = localStorage.getItem(z);
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
    const t = this.currentView === "table";
    this.tableTab && (this.tableTab.setAttribute("aria-selected", t ? "true" : "false"), this.tableTab.classList.toggle("active", t)), this.timelineTab && (this.timelineTab.setAttribute("aria-selected", t ? "false" : "true"), this.timelineTab.classList.toggle("active", !t)), this.tableView && this.tableView.classList.toggle("hidden", !t), this.timelineView && this.timelineView.classList.toggle("hidden", t), this.paginationContainer && this.paginationContainer.classList.toggle("hidden", !t);
  }
  /**
   * Persist view preference to localStorage
   */
  persistView() {
    try {
      localStorage.setItem(z, this.currentView);
    } catch {
    }
  }
  /**
   * Update URL parameter without page reload
   */
  updateUrlParam() {
    const t = new URLSearchParams(window.location.search);
    this.currentView === "table" ? t.delete(x) : t.set(x, this.currentView);
    const i = t.toString(), n = i ? `${window.location.pathname}?${i}` : window.location.pathname;
    window.history.replaceState({}, "", n);
  }
  /**
   * Emit view change event
   */
  emitViewChange() {
    this.onViewChange && this.onViewChange(this.currentView);
    const t = new CustomEvent("activity:viewchange", {
      bubbles: !0,
      detail: { view: this.currentView }
    });
    document.dispatchEvent(t);
  }
  /**
   * Get view param for inclusion in API requests
   */
  static getViewFromUrl() {
    return new URLSearchParams(window.location.search).get(x) === "timeline" ? "timeline" : "table";
  }
  /**
   * Add view param to existing URLSearchParams (for query sync)
   */
  static addViewToParams(t, i) {
    i === "timeline" ? t.set(x, i) : t.delete(x);
  }
}
const P = {
  created: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
  updated: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  deleted: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
  auth: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
  viewed: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe" },
  system: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" }
};
function Me(e) {
  if (!e || e.length === 0)
    return [];
  const t = /* @__PURE__ */ new Map();
  return e.forEach((i) => {
    const n = new Date(i.created_at);
    if (Number.isNaN(n.getTime())) return;
    const s = T(n), a = ie(n);
    t.has(s) || t.set(s, {
      date: a,
      label: te(n),
      entries: [],
      collapsed: !1
    }), t.get(s).entries.push(i);
  }), Array.from(t.values()).sort(
    (i, n) => n.date.getTime() - i.date.getTime()
  );
}
function Ve(e) {
  if (!e || e.length === 0)
    return [];
  const t = /* @__PURE__ */ new Map();
  e.forEach((n) => {
    const s = X(n) || "", a = s || "__no_session__";
    t.has(a) || t.set(a, {
      sessionId: s,
      label: Le(s),
      entries: [],
      collapsed: !1
    }), t.get(a).entries.push(n);
  });
  const i = Array.from(t.values());
  return i.forEach((n) => {
    n.entries.sort(
      (s, a) => new Date(a.created_at).getTime() - new Date(s.created_at).getTime()
    );
  }), i.sort((n, s) => {
    if (!n.sessionId && s.sessionId) return 1;
    if (n.sessionId && !s.sessionId) return -1;
    const a = n.entries[0] ? new Date(n.entries[0].created_at).getTime() : 0;
    return (s.entries[0] ? new Date(s.entries[0].created_at).getTime() : 0) - a;
  });
}
function Be(e, t) {
  if (!t || t.length === 0)
    return e;
  const i = /* @__PURE__ */ new Map();
  e.forEach((s) => {
    i.set(T(s.date), { ...s, entries: [...s.entries] });
  }), t.forEach((s) => {
    const a = new Date(s.created_at);
    if (Number.isNaN(a.getTime())) return;
    const r = T(a), o = ie(a);
    i.has(r) || i.set(r, {
      date: o,
      label: te(a),
      entries: [],
      collapsed: !1
    });
    const c = i.get(r);
    c.entries.some((u) => u.id === s.id) || c.entries.push(s);
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
function Ne(e) {
  if (!e) return "?";
  const t = e.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/i.test(t))
    return e.substring(0, 2).toUpperCase();
  const i = e.split(/[\s._-]+/).filter(Boolean);
  return i.length >= 2 ? (i[0][0] + i[1][0]).toUpperCase() : e.substring(0, 2).toUpperCase();
}
function D(e, t, i) {
  const { showDebugInfo: n = !1 } = i || {}, s = W(e.action, t), a = ee(e, t), r = Ie(e.created_at), o = ne(e.metadata), c = se(e.metadata), u = n ? ae(e) : "", h = P[s.category] || P.system, p = Ne(e.actor), m = N(e), y = m !== "user" && m !== "unknown" ? R(m, { badge: !0, size: "sm" }) : "", d = document.createElement("div");
  d.className = `timeline-entry timeline-entry--${s.category}`, d.dataset.entryId = e.id;
  let f = "";
  o === "hidden" ? f = `
      <div class="timeline-entry-metadata">
        <button type="button"
                class="timeline-metadata-toggle timeline-metadata-toggle--hidden"
                aria-expanded="false"
                data-timeline-metadata="${e.id}">
          <i class="iconoir-eye-off" style="font-size: 12px;"></i>
          <span>Hidden</span>
          <svg class="timeline-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div class="timeline-metadata-content" data-timeline-metadata-content="${e.id}">
          <div class="timeline-metadata-grid">
            ${c}
          </div>
          ${u}
        </div>
      </div>
    ` : o ? f = `
      <div class="timeline-entry-metadata">
        <button type="button"
                class="timeline-metadata-toggle"
                aria-expanded="false"
                data-timeline-metadata="${e.id}">
          <span>${o}</span>
          <svg class="timeline-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div class="timeline-metadata-content" data-timeline-metadata-content="${e.id}">
          <div class="timeline-metadata-grid">
            ${c}
          </div>
          ${u}
        </div>
      </div>
    ` : u && (f = `
      <div class="timeline-entry-metadata">
        <button type="button"
                class="timeline-metadata-toggle timeline-metadata-toggle--debug"
                aria-expanded="false"
                data-timeline-metadata="${e.id}">
          <i class="iconoir-info-circle" style="font-size: 12px;"></i>
          <span>Debug</span>
          <svg class="timeline-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
        <div class="timeline-metadata-content" data-timeline-metadata-content="${e.id}">
          ${u}
        </div>
      </div>
    `);
  const g = y ? `<div class="timeline-entry-actor-type">${y}</div>` : "";
  return d.innerHTML = `
    <div class="timeline-entry-connector">
      <div class="timeline-entry-dot" style="background-color: ${h.color}; border-color: ${h.border};"></div>
    </div>
    <div class="timeline-entry-card">
      <div class="timeline-entry-header">
        <div class="timeline-entry-avatar" style="background-color: ${h.bg}; color: ${h.color};">
          ${l(p)}
          ${g}
        </div>
        <div class="timeline-entry-content">
          <div class="timeline-entry-action">
            <span class="timeline-action-badge" style="background-color: ${h.bg}; color: ${h.color}; border-color: ${h.border};">
              ${E(`iconoir:${s.icon}`)}
              <span>${l(s.action || e.action)}</span>
            </span>
          </div>
          <div class="timeline-entry-sentence">${a}</div>
          <div class="timeline-entry-time">${l(r)}</div>
        </div>
      </div>
      ${f}
    </div>
  `, d;
}
function Re(e, t, i) {
  const n = `${t}__${e.sessionId || "no-session"}`, s = document.createElement("div");
  s.className = "timeline-session-header", s.dataset.sessionGroup = n;
  const a = e.entries.length, r = a === 1 ? "1 entry" : `${a} entries`;
  s.innerHTML = `
    <button type="button" class="timeline-session-toggle" aria-expanded="${!e.collapsed}">
      <i class="iconoir-link" style="font-size: 12px; color: #9ca3af;"></i>
      <span class="timeline-session-label">${l(e.label)}</span>
      <span class="timeline-session-count">${r}</span>
      <svg class="timeline-session-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
  `;
  const o = s.querySelector(".timeline-session-toggle");
  return o && i && o.addEventListener("click", () => {
    const c = !e.collapsed;
    e.collapsed = c, o.setAttribute("aria-expanded", (!c).toString()), i(n, c);
  }), s;
}
function Oe(e, t) {
  const i = T(e.date), n = document.createElement("div");
  n.className = "timeline-date-header", n.dataset.dateGroup = i, n.innerHTML = `
    <button type="button" class="timeline-date-toggle" aria-expanded="${!e.collapsed}">
      <span class="timeline-date-label">${l(e.label)}</span>
      <span class="timeline-date-count">${e.entries.length} ${e.entries.length === 1 ? "entry" : "entries"}</span>
      <svg class="timeline-date-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
  `;
  const s = n.querySelector(".timeline-date-toggle");
  return s && t && s.addEventListener("click", () => {
    const a = !e.collapsed;
    e.collapsed = a, s.setAttribute("aria-expanded", (!a).toString()), t(i, a);
  }), n;
}
function je(e, t, i, n) {
  const {
    groupBySession: s = !0,
    showDebugInfo: a = !1,
    onSessionToggle: r,
    collapsedSessions: o = /* @__PURE__ */ new Set()
  } = n || {}, c = T(e.date), u = document.createElement("div");
  u.className = "timeline-group", u.dataset.dateGroup = c;
  const h = Oe(e, i);
  u.appendChild(h);
  const p = document.createElement("div");
  if (p.className = "timeline-entries", e.collapsed && p.classList.add("collapsed"), s) {
    const m = Ve(e.entries), y = m.length > 1 || m.length === 1 && m[0].sessionId;
    m.forEach((d) => {
      const f = `${c}__${d.sessionId || "no-session"}`;
      if (d.collapsed = o.has(f), y) {
        const g = Re(d, c, r);
        p.appendChild(g);
        const b = document.createElement("div");
        b.className = "timeline-session-entries", b.dataset.sessionEntries = f, d.collapsed && b.classList.add("collapsed"), d.entries.forEach(($) => {
          const A = D($, t, { showDebugInfo: a });
          b.appendChild(A);
        }), p.appendChild(b);
      } else
        d.entries.forEach((g) => {
          const b = D(g, t, { showDebugInfo: a });
          p.appendChild(b);
        });
    });
  } else
    e.entries.forEach((m) => {
      const y = D(m, t, { showDebugInfo: a });
      p.appendChild(y);
    });
  return u.appendChild(p), u;
}
class ze {
  constructor(t, i, n) {
    this.collapsedGroups = /* @__PURE__ */ new Set(), this.collapsedSessions = /* @__PURE__ */ new Set(), this.groups = [], this.container = t, this.actionLabels = i, this.options = {
      groupBySession: !0,
      showDebugInfo: !1,
      ...n
    };
  }
  /**
   * Update renderer options
   */
  setOptions(t) {
    this.options = { ...this.options, ...t };
  }
  /**
   * Render the full timeline
   */
  render(t) {
    if (this.groups = Me(t), this.container.innerHTML = "", this.groups.length === 0) {
      this.renderEmptyState();
      return;
    }
    const i = document.createElement("div");
    i.className = "timeline", this.groups.forEach((n) => {
      const s = T(n.date);
      n.collapsed = this.collapsedGroups.has(s);
      const a = je(
        n,
        this.actionLabels,
        (r, o) => {
          this.handleGroupToggle(r, o);
        },
        {
          groupBySession: this.options.groupBySession,
          showDebugInfo: this.options.showDebugInfo,
          onSessionToggle: (r, o) => {
            this.handleSessionToggle(r, o);
          },
          collapsedSessions: this.collapsedSessions
        }
      );
      i.appendChild(a);
    }), this.container.appendChild(i), this.wireMetadataToggles();
  }
  /**
   * Append more entries (for infinite scroll)
   */
  appendEntries(t) {
    this.groups = Be(this.groups, t);
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
    const t = document.createElement("div");
    t.className = "timeline-empty", t.innerHTML = `
      <div class="timeline-empty-icon">
        <i class="iconoir-clipboard-check"></i>
      </div>
      <p class="timeline-empty-title">No activity found</p>
      <p class="timeline-empty-subtitle">Activity entries will appear here when actions are logged.</p>
    `, this.container.appendChild(t);
  }
  handleGroupToggle(t, i) {
    i ? this.collapsedGroups.add(t) : this.collapsedGroups.delete(t);
    const s = this.container.querySelector(`[data-date-group="${t}"]`)?.querySelector(".timeline-entries");
    s && s.classList.toggle("collapsed", i);
  }
  handleSessionToggle(t, i) {
    i ? this.collapsedSessions.add(t) : this.collapsedSessions.delete(t);
    const n = this.container.querySelector(
      `[data-session-entries="${t}"]`
    );
    n && n.classList.toggle("collapsed", i);
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
function qe() {
  const e = document.createElement("div");
  return e.className = "timeline-loading", e.innerHTML = `
    <div class="timeline-loading-spinner"></div>
    <span>Loading more entries...</span>
  `, e;
}
function Pe() {
  const e = document.createElement("div");
  return e.className = "timeline-end", e.innerHTML = `
    <span>No more entries</span>
  `, e;
}
function Ze() {
  const e = document.createElement("div");
  return e.className = "timeline-sentinel", e.setAttribute("aria-hidden", "true"), e;
}
const He = {
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
}, H = {
  container: "#activity-timeline",
  sentinel: "#activity-timeline-sentinel"
}, M = ["q", "verb", "channels", "object_type", "object_id"], V = ["since", "until"], Ue = ["user_id", "actor_id"];
function U(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function Fe(e) {
  if (!U(e))
    return { textCode: "", message: "" };
  const t = U(e.error) ? e.error : e, i = typeof t.text_code == "string" ? t.text_code.trim() : "", n = typeof t.message == "string" ? t.message.trim() : "";
  return { textCode: i, message: n };
}
class et {
  constructor(t, i = {}, n) {
    this.form = null, this.tableBody = null, this.emptyState = null, this.disabledState = null, this.errorState = null, this.countEl = null, this.prevBtn = null, this.nextBtn = null, this.refreshBtn = null, this.clearBtn = null, this.limitInput = null, this.viewSwitcher = null, this.timelineRenderer = null, this.timelineContainer = null, this.timelineSentinel = null, this.infiniteScrollObserver = null, this.isLoadingMore = !1, this.allEntriesLoaded = !1, this.cachedEntries = [], this.state = {
      limit: 50,
      offset: 0,
      total: 0,
      nextOffset: 0,
      hasMore: !1,
      extraParams: {}
    }, this.config = t, this.selectors = { ...He, ...i }, this.toast = n || window.toastManager || null;
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
    this.viewSwitcher = new q(
      {
        container: "#activity-view-switcher",
        tableTab: '[data-view-tab="table"]',
        timelineTab: '[data-view-tab="timeline"]',
        tableView: "#activity-table-container",
        timelineView: "#activity-timeline-container",
        paginationContainer: "#activity-pagination"
      },
      (t) => this.handleViewChange(t)
    ), this.viewSwitcher.init();
  }
  /**
   * Initialize the timeline renderer
   */
  initTimeline() {
    this.timelineContainer = document.querySelector(H.container), this.timelineSentinel = document.querySelector(H.sentinel), this.timelineContainer && (this.timelineRenderer = new ze(
      this.timelineContainer,
      this.config.actionLabels
    )), this.setupInfiniteScroll();
  }
  /**
   * Handle view change from switcher
   */
  handleViewChange(t) {
    t === "timeline" ? (this.allEntriesLoaded = !1, this.isLoadingMore = !1, this.state.offset = 0, this.loadActivity(), this.enableInfiniteScroll()) : (this.disableInfiniteScroll(), this.state.offset = 0, this.loadActivity());
  }
  /**
   * Set up infinite scroll for timeline view
   */
  setupInfiniteScroll() {
    this.timelineSentinel && (this.infiniteScrollObserver = new IntersectionObserver(
      (t) => {
        t[0].isIntersecting && !this.isLoadingMore && !this.allEntriesLoaded && this.loadMoreEntries();
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
    const t = qe();
    this.timelineSentinel?.parentElement?.insertBefore(t, this.timelineSentinel);
    try {
      this.state.offset = this.state.nextOffset;
      const i = this.buildParams(), n = `${this.config.apiPath}?${i.toString()}`, s = await fetch(n, { headers: { Accept: "application/json" } });
      if (!s.ok)
        throw new Error(`Failed to load more entries (${s.status})`);
      const a = await s.json(), r = Array.isArray(a.entries) ? a.entries : [];
      if (this.state.hasMore = !!a.has_more, this.state.nextOffset = typeof a.next_offset == "number" ? a.next_offset : this.state.offset + r.length, r.length === 0 ? this.allEntriesLoaded = !0 : (this.cachedEntries = [...this.cachedEntries, ...r], this.timelineRenderer && this.timelineRenderer.appendEntries(r)), !this.state.hasMore) {
        this.allEntriesLoaded = !0;
        const o = Pe();
        this.timelineSentinel?.parentElement?.insertBefore(o, this.timelineSentinel);
      }
    } catch (i) {
      console.error("Failed to load more entries:", i);
    } finally {
      t.remove(), this.isLoadingMore = !1;
    }
  }
  cacheElements() {
    this.form = document.querySelector(this.selectors.form), this.tableBody = document.querySelector(this.selectors.tableBody), this.emptyState = document.querySelector(this.selectors.emptyState), this.disabledState = document.querySelector(this.selectors.disabledState), this.errorState = document.querySelector(this.selectors.errorState), this.countEl = document.querySelector(this.selectors.countEl), this.prevBtn = document.querySelector(this.selectors.prevBtn), this.nextBtn = document.querySelector(this.selectors.nextBtn), this.refreshBtn = document.querySelector(this.selectors.refreshBtn), this.clearBtn = document.querySelector(this.selectors.clearBtn), this.limitInput = document.querySelector(this.selectors.limitInput);
  }
  bindEvents() {
    this.form?.addEventListener("submit", (t) => {
      t.preventDefault(), this.state.limit = parseInt(this.limitInput?.value || "50", 10) || 50, this.state.offset = 0, this.loadActivity();
    }), this.clearBtn?.addEventListener("click", () => {
      M.forEach((t) => this.setInputValue(t, "")), V.forEach((t) => this.setInputValue(t, "")), this.state.offset = 0, this.loadActivity();
    }), this.prevBtn?.addEventListener("click", () => {
      this.state.offset = Math.max(0, this.state.offset - this.state.limit), this.loadActivity();
    }), this.nextBtn?.addEventListener("click", () => {
      this.state.hasMore && (this.state.offset = this.state.nextOffset, this.loadActivity());
    }), this.refreshBtn?.addEventListener("click", () => {
      this.loadActivity();
    });
  }
  getInputValue(t) {
    const i = document.getElementById(`filter-${t.replace(/_/g, "-")}`);
    return i ? String(i.value || "").trim() : "";
  }
  setInputValue(t, i) {
    const n = document.getElementById(`filter-${t.replace(/_/g, "-")}`);
    n && (n.value = i || "");
  }
  toLocalInput(t) {
    if (!t) return "";
    const i = new Date(t);
    if (Number.isNaN(i.getTime())) return t;
    const n = i.getTimezoneOffset() * 6e4;
    return new Date(i.getTime() - n).toISOString().slice(0, 16);
  }
  toRFC3339(t) {
    if (!t) return "";
    const i = new Date(t);
    return Number.isNaN(i.getTime()) ? "" : i.toISOString();
  }
  syncFromQuery() {
    const t = new URLSearchParams(window.location.search), i = parseInt(t.get("limit") || "", 10), n = parseInt(t.get("offset") || "", 10);
    !Number.isNaN(i) && i > 0 && (this.state.limit = i), !Number.isNaN(n) && n >= 0 && (this.state.offset = n), this.limitInput && (this.limitInput.value = String(this.state.limit)), M.forEach((s) => this.setInputValue(s, t.get(s) || "")), V.forEach((s) => this.setInputValue(s, this.toLocalInput(t.get(s) || ""))), Ue.forEach((s) => {
      const a = t.get(s);
      a && (this.state.extraParams[s] = a);
    });
  }
  buildParams() {
    const t = new URLSearchParams();
    return t.set("limit", String(this.state.limit)), t.set("offset", String(this.state.offset)), M.forEach((i) => {
      const n = this.getInputValue(i);
      n && t.set(i, n);
    }), V.forEach((i) => {
      const n = this.toRFC3339(this.getInputValue(i));
      n && t.set(i, n);
    }), Object.entries(this.state.extraParams).forEach(([i, n]) => {
      n && t.set(i, n);
    }), t;
  }
  syncUrl(t) {
    this.viewSwitcher && q.addViewToParams(t, this.viewSwitcher.getView());
    const i = t.toString(), n = i ? `${window.location.pathname}?${i}` : window.location.pathname;
    window.history.replaceState({}, "", n);
  }
  resetStates() {
    this.disabledState?.classList.add("hidden"), this.errorState?.classList.add("hidden");
  }
  showError(t) {
    this.errorState && (this.errorState.textContent = t, this.errorState.classList.remove("hidden"));
  }
  showDisabled(t) {
    this.disabledState && (this.disabledState.textContent = t, this.disabledState.classList.remove("hidden"));
  }
  async loadActivity() {
    this.resetStates();
    const t = this.buildParams();
    this.syncUrl(t);
    const i = `${this.config.apiPath}?${t.toString()}`;
    try {
      const n = await fetch(i, { headers: { Accept: "application/json" } });
      if (!n.ok) {
        let o = null;
        try {
          o = await n.json();
        } catch {
          o = null;
        }
        const c = Fe(o);
        if (n.status === 404 && c.textCode === "FEATURE_DISABLED") {
          this.showDisabled(c.message || "Activity feature disabled."), this.renderRows([]), this.updatePagination(0);
          return;
        }
        this.showError(c.message || `Failed to load activity (${n.status})`);
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
  renderTimeline(t) {
    if (!this.timelineRenderer) return;
    this.timelineContainer?.parentElement?.querySelector(".timeline-end")?.remove(), this.timelineRenderer.render(t), this.enableInfiniteScroll();
  }
  renderRows(t) {
    if (!this.tableBody) return;
    if (this.tableBody.innerHTML = "", !t || t.length === 0) {
      this.emptyState?.classList.remove("hidden");
      return;
    }
    this.emptyState?.classList.add("hidden");
    let i = "";
    t.forEach((n) => {
      const s = X(n);
      s && s !== i ? (this.tableBody.appendChild(this.createSessionRow(s)), i = s) : s || (i = "");
      const { mainRow: a, detailsRow: r } = this.createRowPair(n);
      this.tableBody.appendChild(a), r && this.tableBody.appendChild(r);
    }), this.wireMetadataToggles();
  }
  createRowPair(t) {
    const i = this.config.actionLabels || {}, n = W(t.action, i), s = ee(t, i, { showActorTypeBadge: !0 }), a = $e(t.created_at), r = Ae(t.created_at), o = ne(t.metadata), c = se(t.metadata), u = ae(t), h = _e(t.channel), p = !!o, m = !!u, y = p || m, d = {
      created: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
      updated: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
      deleted: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
      auth: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
      viewed: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe" },
      system: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" }
    }, f = d[n.category] || d.system, g = document.createElement("tr");
    g.className = `activity-row activity-row--${n.category}`;
    let b = "";
    n.namespace ? b = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #f3f4f6; border-radius: 6px; color: #6b7280;" title="${l(n.namespace)}">
            ${E(`iconoir:${n.icon}`, { size: "14px" })}
          </span>
          <span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${f.bg}; color: ${f.color}; border: 1px solid ${f.border};">
            ${l(n.action)}
          </span>
        </div>
      ` : b = `
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${f.bg}; color: ${f.color}; border: 1px solid ${f.border};">
          ${E(`iconoir:${n.icon}`, { size: "14px" })}
          <span>${l(n.action || "-")}</span>
        </span>
      `;
    let $ = "";
    t.channel ? $ = `
        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 11px; font-weight: 500; font-family: ui-monospace, monospace; color: #6b7280; background: #f3f4f6; border-radius: 4px; cursor: default;" title="${l(t.channel)}">
          ${l(h)}
        </span>
      ` : $ = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    let A = "";
    if (y) {
      let v = o || "", _ = "activity-metadata-toggle", k = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #6b7280; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer;", L = "";
      o === "hidden" ? (v = "Hidden", _ += " activity-metadata-toggle--hidden", k = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #9ca3af; background: transparent; border: 1px dashed #d1d5db; border-radius: 6px; cursor: pointer;", L = '<i class="iconoir-eye-off" style="font-size: 12px;"></i>') : !p && m && (v = "Debug", _ += " activity-metadata-toggle--debug", k = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #9ca3af; background: transparent; border: 1px dashed #d1d5db; border-radius: 6px; cursor: pointer;", L = '<i class="iconoir-info-circle" style="font-size: 12px;"></i>'), A = `
        <button type="button"
                class="${_}"
                style="${k}"
                aria-expanded="false"
                data-metadata-toggle="${t.id}">
          ${L}
          <span>${v}</span>
          <svg class="activity-metadata-chevron" style="width: 12px; height: 12px; transition: transform 0.15s ease;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      `;
    } else
      A = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    g.innerHTML = `
      <td style="padding: 12px 16px; vertical-align: middle; border-left: 3px solid ${f.color};">
        <div style="font-size: 13px; color: #374151; white-space: nowrap;">${a}</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${r}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle;">${b}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">
        <div style="font-size: 13px; line-height: 1.5; color: #374151;">${s}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle; text-align: center;">${$}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">${A}</td>
    `;
    let w = null;
    if (y) {
      w = document.createElement("tr"), w.className = "activity-details-row", w.style.display = "none", w.dataset.metadataContent = t.id;
      let v = "";
      p && (v += `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px 24px;">
            ${c}
          </div>
        `), m && (v += u), w.innerHTML = `
        <td colspan="5" style="padding: 0; background: #f9fafb; border-left: 3px solid ${f.color};">
          <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb;">
            ${v}
          </div>
        </td>
      `;
    }
    return { mainRow: g, detailsRow: w };
  }
  createSessionRow(t) {
    const i = document.createElement("tr");
    i.className = "activity-session-row";
    const n = C(t, 10);
    return i.innerHTML = `
      <td colspan="5" style="padding: 8px 16px; background: #f8fafc; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em;">
          <span>Session</span>
          <span style="font-family: ui-monospace, monospace; font-weight: 600; color: #374151;" title="${l(t)}">${l(n)}</span>
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
  updatePagination(t) {
    const i = Number.isFinite(this.state.total) ? this.state.total : 0, n = t > 0 ? this.state.offset + 1 : 0, s = this.state.offset + t;
    this.countEl && (i > 0 ? this.countEl.textContent = `Showing ${n}-${s} of ${i}` : t > 0 ? this.countEl.textContent = `Showing ${n}-${s}` : this.countEl.textContent = "No activity entries"), this.prevBtn && (this.prevBtn.disabled = this.state.offset <= 0), this.nextBtn && (this.nextBtn.disabled = !this.state.hasMore);
  }
}
export {
  G as ACTION_ICONS,
  F as ACTOR_TYPE_ICONS,
  be as ACTOR_TYPE_LABELS,
  et as ActivityManager,
  q as ActivityViewSwitcher,
  ye as NAMESPACE_ICONS,
  ze as TimelineRenderer,
  Ce as countMetadataFields,
  Pe as createEndIndicator,
  qe as createLoadingIndicator,
  Ze as createScrollSentinel,
  l as escapeHtml,
  ee as formatActivitySentence,
  Xe as formatActorWithType,
  _e as formatChannel,
  ae as formatEnrichmentDebugInfo,
  se as formatMetadataExpanded,
  Ae as formatRelativeTime,
  Ie as formatRelativeTimeIntl,
  ke as formatSessionId,
  $e as formatTimestamp,
  B as getActionCategory,
  We as getActionClass,
  Qe as getActionIconHtml,
  Je as getActorEmail,
  N as getActorType,
  R as getActorTypeIconHtml,
  te as getDateGroupLabel,
  T as getDateKey,
  Se as getEnrichmentInfo,
  ne as getMetadataSummary,
  Le as getSessionGroupLabel,
  X as getSessionId,
  ie as getStartOfDay,
  Me as groupEntriesByDate,
  Ve as groupEntriesBySession,
  Y as isMaskedValue,
  K as isMetadataHidden,
  Ee as isObjectDeleted,
  Be as mergeEntriesIntoGroups,
  W as parseActionString,
  ve as parseObject,
  je as renderDateGroup,
  Oe as renderDateGroupHeader,
  Re as renderSessionGroupHeader,
  D as renderTimelineEntry,
  J as resolveActionLabel,
  Q as resolveActorLabel,
  xe as resolveObjectDisplay,
  C as shortenId
};
//# sourceMappingURL=index.js.map
