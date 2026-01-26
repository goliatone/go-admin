const se = {
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
}, ae = "actor_display", re = "object_display", oe = "object_deleted", le = "actor_type", ce = "actor_email", de = "session_id", fe = "enriched_at", ue = "enricher_version", P = {
  user: "user",
  system: "settings",
  job: "clock",
  api: "cloud",
  unknown: "help-circle"
}, pe = {
  user: "User",
  system: "System",
  job: "Job",
  api: "API",
  unknown: "Unknown"
};
function U(e) {
  if (typeof e != "string" || !e) return !1;
  const t = e.trim();
  if (/^\[(REDACTED|HIDDEN|MASKED|REMOVED)\]$/i.test(t) || /^\*+$/.test(t) || /^[^*]+\*{3,}[^*]+$/.test(t))
    return !0;
  const i = t.replace(/-/g, "");
  return !!/^[0-9a-f]{64,}$/i.test(i);
}
function F(e) {
  if (!e || typeof e != "object") return !0;
  const t = Object.keys(e);
  return t.length === 0 ? !0 : t.every((i) => {
    const n = e[i];
    return n == null || n === "";
  });
}
const Y = {
  created: "plus",
  updated: "edit-pencil",
  deleted: "trash",
  auth: "key",
  viewed: "eye",
  system: "settings"
}, he = {
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
function K(e, t) {
  if (!e) return "";
  if (!t) return e;
  const i = e.trim();
  if (!i) return e;
  const n = t[i];
  return typeof n == "string" && n.trim() !== "" ? n : e;
}
function G(e, t) {
  if (!e)
    return { namespace: "", action: "", icon: "activity", category: "system" };
  const i = K(e, t);
  if (e.includes(".")) {
    const a = e.split("."), r = a[0].toLowerCase(), o = a.slice(1).join("."), c = he[r] || "activity", f = a[a.length - 1], h = V(f);
    return { namespace: r, action: i !== e ? i : o, icon: c, category: h };
  }
  const n = V(e);
  return {
    namespace: "",
    action: i !== e ? i : e,
    icon: Y[n],
    category: n
  };
}
function V(e) {
  if (!e) return "system";
  const t = e.toLowerCase().trim().replace(/-/g, "_");
  return se[t] || "system";
}
function me(e) {
  if (!e) return { type: "", id: "" };
  if (!e.includes(":"))
    return { type: e, id: "" };
  const t = e.indexOf(":");
  return {
    type: e.substring(0, t),
    id: e.substring(t + 1)
  };
}
function E(e, t) {
  if (!e || typeof e != "object") return "";
  const i = e[t];
  return i == null ? "" : typeof i == "string" ? i.trim() : typeof i == "number" || typeof i == "boolean" ? String(i) : "";
}
function ge(...e) {
  for (const t of e) {
    if (!t) continue;
    const i = t.trim();
    if (i) return i;
  }
  return "";
}
function J(e) {
  return ge(E(e.metadata, ae), e.actor);
}
function be(e) {
  return E(e.metadata, re);
}
function ye(e) {
  return !e.metadata || typeof e.metadata != "object" ? !1 : e.metadata[oe] === !0;
}
function N(e) {
  if (!e.metadata || typeof e.metadata != "object") return "unknown";
  const t = e.metadata[le];
  if (typeof t == "string") {
    const i = t.toLowerCase();
    if (i in P)
      return i;
  }
  return "unknown";
}
function qe(e) {
  return E(e.metadata, ce);
}
function W(e) {
  return E(e.metadata, de);
}
function ve(e) {
  const t = E(e.metadata, fe), i = E(e.metadata, ue);
  return !t && !i ? null : { enrichedAt: t, enricherVersion: i };
}
function we(e) {
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
function R(e) {
  return e ? e.split(/[_-]/).map(we).join(" ") : "";
}
function l(e) {
  const t = document.createElement("div");
  return t.textContent = e, t.innerHTML;
}
function I(e, t = 7) {
  if (!e) return "";
  const i = e.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(i) || e.length > t + 3 ? e.substring(0, t) : e;
}
function Q(e) {
  if (!e) return !1;
  const t = e.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(t);
}
function A(e, t = 8) {
  if (!e) return "";
  const i = I(e, t);
  return i === e ? l(e) : `<span class="activity-id-short" title="${l(e)}" style="cursor: help; border-bottom: 1px dotted #9ca3af;">${l(i)}</span>`;
}
function X(e, t, i) {
  const { showActorTypeBadge: n = !1 } = i || {}, s = J(e) || "Unknown", a = e.action || "performed action on", r = K(a, t);
  let o = "";
  if (n) {
    const d = N(e);
    d !== "user" && d !== "unknown" && (o = B(d, { badge: !0, size: "sm" }) + " ");
  }
  const c = Q(s) ? `${o}${A(s, 8)}` : `${o}<strong>${l(s)}</strong>`, h = ye(e) ? ' <span class="activity-deleted-marker" title="This object has been deleted">(deleted)</span>' : "";
  let u = "";
  const m = be(e);
  if (m)
    u = l(m) + h;
  else {
    const { type: d, id: p } = me(e.object);
    if (d && p) {
      const g = A(p, 8);
      u = `${l(R(d))} #${g}${h}`;
    } else d ? u = l(R(d)) + h : p && (u = `#${A(p, 8)}${h}`);
  }
  if (V(a) === "auth") {
    const d = e.metadata?.ip || e.metadata?.IP;
    return d ? `${c} ${l(r)} from ${l(String(d))}` : `${c} ${l(r)}`;
  }
  return u ? `${c} ${l(r)} <strong>${u}</strong>` : `${c} ${l(r)}`;
}
function xe(e) {
  if (!e) return "-";
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleString();
}
function Ee(e) {
  if (!e) return "";
  const t = new Date(e);
  if (Number.isNaN(t.getTime())) return e;
  const n = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), s = Math.floor(n / 1e3), a = Math.floor(s / 60), r = Math.floor(a / 60), o = Math.floor(r / 24);
  return s < 60 ? "just now" : a < 60 ? `${a}m ago` : r < 24 ? `${r}h ago` : o < 7 ? `${o}d ago` : t.toLocaleDateString();
}
function Se(e) {
  if (!e) return "";
  const t = new Date(e);
  if (Number.isNaN(t.getTime())) return e;
  const n = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), s = Math.floor(n / 1e3), a = Math.floor(s / 60), r = Math.floor(a / 60), o = Math.floor(r / 24), c = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (s < 60) return "just now";
  if (a < 60) return c.format(-a, "minute");
  if (r < 24) return c.format(-r, "hour");
  if (o < 7) return c.format(-o, "day");
  if (o < 30) {
    const f = Math.floor(o / 7);
    return c.format(-f, "week");
  }
  return t.toLocaleDateString();
}
function Z(e) {
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
function ee(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate());
}
function S(e) {
  const t = e.getFullYear(), i = String(e.getMonth() + 1).padStart(2, "0"), n = String(e.getDate()).padStart(2, "0");
  return `${t}-${i}-${n}`;
}
function Te(e) {
  return !e || typeof e != "object" ? 0 : Object.keys(e).length;
}
function te(e) {
  if (e === null) return "hidden";
  if (e === void 0 || typeof e != "object") return "";
  const t = Te(e);
  return t === 0 || F(e) ? "hidden" : t === 1 ? "1 field" : `${t} fields`;
}
function ie(e) {
  if (e === null)
    return `
      <div class="activity-metadata-hidden" style="padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; text-align: center;">
        <span style="color: #9ca3af; font-size: 12px; font-style: italic;">Metadata hidden</span>
      </div>
    `;
  if (e === void 0 || typeof e != "object") return "";
  const t = Object.entries(e);
  return t.length === 0 || F(e) ? `
      <div class="activity-metadata-hidden" style="padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; text-align: center;">
        <span style="color: #9ca3af; font-size: 12px; font-style: italic;">Metadata hidden</span>
      </div>
    ` : t.map(([n, s]) => {
    const a = l(n);
    let r, o = !1;
    if (U(s))
      o = !0, r = `<span class="activity-masked-value" title="This value is masked">${l(String(s))}</span>`;
    else if (n.endsWith("_old") || n.endsWith("_new"))
      r = l(O(s));
    else if (typeof s == "object" && s !== null) {
      const f = JSON.stringify(s), h = f.length > 100 ? f.substring(0, 100) + "..." : f;
      r = `<code style="font-size: 11px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${l(h)}</code>`;
    } else
      r = l(O(s));
    return `
      <div class="activity-metadata-item${o ? " activity-metadata-item--masked" : ""}" style="display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
        <span style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${a}</span>
        <span style="color: #111827; font-size: 12px; font-weight: 500; word-break: break-word;">${r}</span>
      </div>
    `;
  }).join("");
}
function ne(e) {
  const t = ve(e);
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
function O(e) {
  return e == null ? "-" : typeof e == "boolean" ? e ? "Yes" : "No" : typeof e == "number" ? String(e) : typeof e == "string" ? e.length > 100 ? e.substring(0, 100) + "..." : e : JSON.stringify(e);
}
function $e(e) {
  return e ? I(e, 7) : "";
}
function He(e) {
  return `activity-action--${e}`;
}
function Pe(e) {
  return `<i class="iconoir-${Y[e]} activity-action-icon"></i>`;
}
function B(e, t) {
  const { badge: i = !1, size: n = "md" } = t || {}, s = P[e], a = pe[e], r = {
    sm: "font-size: 12px;",
    md: "font-size: 14px;",
    lg: "font-size: 16px;"
  };
  return i ? `
      <span class="activity-actor-type-badge activity-actor-type-badge--${e}" title="${l(a)}">
        <i class="iconoir-${s}" style="${r[n]}"></i>
      </span>
    ` : `<i class="iconoir-${s} activity-actor-type-icon activity-actor-type-icon--${e}" style="${r[n]}" title="${l(a)}"></i>`;
}
function Ue(e) {
  const t = J(e) || "Unknown", i = N(e), n = Q(t) ? A(t, 8) : l(t);
  return `${i !== "user" && i !== "unknown" ? B(i, { badge: !0, size: "sm" }) + " " : ""}<strong>${n}</strong>`;
}
function Ae(e, t = 10) {
  return e ? I(e, t) : "";
}
function Ie(e) {
  return e ? U(e) ? "Session (masked)" : `Session ${Ae(e, 8)}` : "No session";
}
const ke = {
  container: "#activity-view-switcher",
  tableTab: '[data-view-tab="table"]',
  timelineTab: '[data-view-tab="timeline"]',
  tableView: "#activity-table-container",
  timelineView: "#activity-timeline-container",
  paginationContainer: "#activity-pagination"
}, j = "activity-view-preference", x = "view";
class z {
  constructor(t = {}, i) {
    this.currentView = "table", this.container = null, this.tableTab = null, this.timelineTab = null, this.tableView = null, this.timelineView = null, this.paginationContainer = null, this.handleTableClick = () => {
      this.setView("table");
    }, this.handleTimelineClick = () => {
      this.setView("timeline");
    }, this.selectors = { ...ke, ...t }, this.onViewChange = i;
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
    const n = localStorage.getItem(j);
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
      localStorage.setItem(j, this.currentView);
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
const q = {
  created: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
  updated: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
  deleted: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
  auth: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
  viewed: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe" },
  system: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" }
};
function Ce(e) {
  if (!e || e.length === 0)
    return [];
  const t = /* @__PURE__ */ new Map();
  return e.forEach((i) => {
    const n = new Date(i.created_at);
    if (Number.isNaN(n.getTime())) return;
    const s = S(n), a = ee(n);
    t.has(s) || t.set(s, {
      date: a,
      label: Z(n),
      entries: [],
      collapsed: !1
    }), t.get(s).entries.push(i);
  }), Array.from(t.values()).sort(
    (i, n) => n.date.getTime() - i.date.getTime()
  );
}
function Le(e) {
  if (!e || e.length === 0)
    return [];
  const t = /* @__PURE__ */ new Map();
  e.forEach((n) => {
    const s = W(n) || "", a = s || "__no_session__";
    t.has(a) || t.set(a, {
      sessionId: s,
      label: Ie(s),
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
function Me(e, t) {
  if (!t || t.length === 0)
    return e;
  const i = /* @__PURE__ */ new Map();
  e.forEach((s) => {
    i.set(S(s.date), { ...s, entries: [...s.entries] });
  }), t.forEach((s) => {
    const a = new Date(s.created_at);
    if (Number.isNaN(a.getTime())) return;
    const r = S(a), o = ee(a);
    i.has(r) || i.set(r, {
      date: o,
      label: Z(a),
      entries: [],
      collapsed: !1
    });
    const c = i.get(r);
    c.entries.some((f) => f.id === s.id) || c.entries.push(s);
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
function _e(e) {
  if (!e) return "?";
  const t = e.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/i.test(t))
    return e.substring(0, 2).toUpperCase();
  const i = e.split(/[\s._-]+/).filter(Boolean);
  return i.length >= 2 ? (i[0][0] + i[1][0]).toUpperCase() : e.substring(0, 2).toUpperCase();
}
function M(e, t, i) {
  const { showDebugInfo: n = !1 } = i || {}, s = G(e.action, t), a = X(e, t), r = Se(e.created_at), o = te(e.metadata), c = ie(e.metadata), f = n ? ne(e) : "", h = q[s.category] || q.system, u = _e(e.actor), m = N(e), y = m !== "user" && m !== "unknown" ? B(m, { badge: !0, size: "sm" }) : "", d = document.createElement("div");
  d.className = `timeline-entry timeline-entry--${s.category}`, d.dataset.entryId = e.id;
  let p = "";
  o === "hidden" ? p = `
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
          ${f}
        </div>
      </div>
    ` : o ? p = `
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
          ${f}
        </div>
      </div>
    ` : f && (p = `
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
          ${f}
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
          ${l(u)}
          ${g}
        </div>
        <div class="timeline-entry-content">
          <div class="timeline-entry-action">
            <span class="timeline-action-badge" style="background-color: ${h.bg}; color: ${h.color}; border-color: ${h.border};">
              <i class="iconoir-${s.icon}"></i>
              <span>${l(s.action || e.action)}</span>
            </span>
          </div>
          <div class="timeline-entry-sentence">${a}</div>
          <div class="timeline-entry-time">${l(r)}</div>
        </div>
      </div>
      ${p}
    </div>
  `, d;
}
function De(e, t, i) {
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
function Ve(e, t) {
  const i = S(e.date), n = document.createElement("div");
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
function Ne(e, t, i, n) {
  const {
    groupBySession: s = !0,
    showDebugInfo: a = !1,
    onSessionToggle: r,
    collapsedSessions: o = /* @__PURE__ */ new Set()
  } = n || {}, c = S(e.date), f = document.createElement("div");
  f.className = "timeline-group", f.dataset.dateGroup = c;
  const h = Ve(e, i);
  f.appendChild(h);
  const u = document.createElement("div");
  if (u.className = "timeline-entries", e.collapsed && u.classList.add("collapsed"), s) {
    const m = Le(e.entries), y = m.length > 1 || m.length === 1 && m[0].sessionId;
    m.forEach((d) => {
      const p = `${c}__${d.sessionId || "no-session"}`;
      if (d.collapsed = o.has(p), y) {
        const g = De(d, c, r);
        u.appendChild(g);
        const b = document.createElement("div");
        b.className = "timeline-session-entries", b.dataset.sessionEntries = p, d.collapsed && b.classList.add("collapsed"), d.entries.forEach((T) => {
          const $ = M(T, t, { showDebugInfo: a });
          b.appendChild($);
        }), u.appendChild(b);
      } else
        d.entries.forEach((g) => {
          const b = M(g, t, { showDebugInfo: a });
          u.appendChild(b);
        });
    });
  } else
    e.entries.forEach((m) => {
      const y = M(m, t, { showDebugInfo: a });
      u.appendChild(y);
    });
  return f.appendChild(u), f;
}
class Be {
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
    if (this.groups = Ce(t), this.container.innerHTML = "", this.groups.length === 0) {
      this.renderEmptyState();
      return;
    }
    const i = document.createElement("div");
    i.className = "timeline", this.groups.forEach((n) => {
      const s = S(n.date);
      n.collapsed = this.collapsedGroups.has(s);
      const a = Ne(
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
    this.groups = Me(this.groups, t);
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
function Re() {
  const e = document.createElement("div");
  return e.className = "timeline-loading", e.innerHTML = `
    <div class="timeline-loading-spinner"></div>
    <span>Loading more entries...</span>
  `, e;
}
function Oe() {
  const e = document.createElement("div");
  return e.className = "timeline-end", e.innerHTML = `
    <span>No more entries</span>
  `, e;
}
function Fe() {
  const e = document.createElement("div");
  return e.className = "timeline-sentinel", e.setAttribute("aria-hidden", "true"), e;
}
const je = {
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
}, _ = ["q", "verb", "channels", "object_type", "object_id"], D = ["since", "until"], ze = ["user_id", "actor_id"];
class Ye {
  constructor(t, i = {}, n) {
    this.form = null, this.tableBody = null, this.emptyState = null, this.disabledState = null, this.errorState = null, this.countEl = null, this.prevBtn = null, this.nextBtn = null, this.refreshBtn = null, this.clearBtn = null, this.limitInput = null, this.viewSwitcher = null, this.timelineRenderer = null, this.timelineContainer = null, this.timelineSentinel = null, this.infiniteScrollObserver = null, this.isLoadingMore = !1, this.allEntriesLoaded = !1, this.cachedEntries = [], this.state = {
      limit: 50,
      offset: 0,
      total: 0,
      nextOffset: 0,
      hasMore: !1,
      extraParams: {}
    }, this.config = t, this.selectors = { ...je, ...i }, this.toast = n || window.toastManager || null;
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
    this.viewSwitcher = new z(
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
    this.timelineContainer = document.querySelector(H.container), this.timelineSentinel = document.querySelector(H.sentinel), this.timelineContainer && (this.timelineRenderer = new Be(
      this.timelineContainer,
      this.config.actionLabels
    )), this.setupInfiniteScroll();
  }
  /**
   * Handle view change from switcher
   */
  handleViewChange(t) {
    t === "timeline" ? (this.allEntriesLoaded = !1, this.isLoadingMore = !1, this.timelineRenderer && this.cachedEntries.length > 0 && this.timelineRenderer.render(this.cachedEntries), this.enableInfiniteScroll()) : this.disableInfiniteScroll();
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
    const t = Re();
    this.timelineSentinel?.parentElement?.insertBefore(t, this.timelineSentinel);
    try {
      this.state.offset = this.state.nextOffset;
      const i = this.buildParams(), n = `${this.config.apiPath}?${i.toString()}`, s = await fetch(n, { headers: { Accept: "application/json" } });
      if (!s.ok)
        throw new Error(`Failed to load more entries (${s.status})`);
      const a = await s.json(), r = Array.isArray(a.entries) ? a.entries : [];
      if (this.state.hasMore = !!a.has_more, this.state.nextOffset = typeof a.next_offset == "number" ? a.next_offset : this.state.offset + r.length, r.length === 0 ? this.allEntriesLoaded = !0 : (this.cachedEntries = [...this.cachedEntries, ...r], this.timelineRenderer && this.timelineRenderer.appendEntries(r)), !this.state.hasMore) {
        this.allEntriesLoaded = !0;
        const o = Oe();
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
      _.forEach((t) => this.setInputValue(t, "")), D.forEach((t) => this.setInputValue(t, "")), this.state.offset = 0, this.loadActivity();
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
    !Number.isNaN(i) && i > 0 && (this.state.limit = i), !Number.isNaN(n) && n >= 0 && (this.state.offset = n), this.limitInput && (this.limitInput.value = String(this.state.limit)), _.forEach((s) => this.setInputValue(s, t.get(s) || "")), D.forEach((s) => this.setInputValue(s, this.toLocalInput(t.get(s) || ""))), ze.forEach((s) => {
      const a = t.get(s);
      a && (this.state.extraParams[s] = a);
    });
  }
  buildParams() {
    const t = new URLSearchParams();
    return t.set("limit", String(this.state.limit)), t.set("offset", String(this.state.offset)), _.forEach((i) => {
      const n = this.getInputValue(i);
      n && t.set(i, n);
    }), D.forEach((i) => {
      const n = this.toRFC3339(this.getInputValue(i));
      n && t.set(i, n);
    }), Object.entries(this.state.extraParams).forEach(([i, n]) => {
      n && t.set(i, n);
    }), t;
  }
  syncUrl(t) {
    this.viewSwitcher && z.addViewToParams(t, this.viewSwitcher.getView());
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
      const s = W(n);
      s && s !== i ? (this.tableBody.appendChild(this.createSessionRow(s)), i = s) : s || (i = "");
      const { mainRow: a, detailsRow: r } = this.createRowPair(n);
      this.tableBody.appendChild(a), r && this.tableBody.appendChild(r);
    }), this.wireMetadataToggles();
  }
  createRowPair(t) {
    const i = this.config.actionLabels || {}, n = G(t.action, i), s = X(t, i, { showActorTypeBadge: !0 }), a = xe(t.created_at), r = Ee(t.created_at), o = te(t.metadata), c = ie(t.metadata), f = ne(t), h = $e(t.channel), u = !!o, m = !!f, y = u || m, d = {
      created: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
      updated: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
      deleted: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
      auth: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
      viewed: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe" },
      system: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" }
    }, p = d[n.category] || d.system, g = document.createElement("tr");
    g.className = `activity-row activity-row--${n.category}`;
    let b = "";
    n.namespace ? b = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #f3f4f6; border-radius: 6px; color: #6b7280;" title="${l(n.namespace)}">
            <i class="iconoir-${n.icon}" style="font-size: 14px;"></i>
          </span>
          <span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${p.bg}; color: ${p.color}; border: 1px solid ${p.border};">
            ${l(n.action)}
          </span>
        </div>
      ` : b = `
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${p.bg}; color: ${p.color}; border: 1px solid ${p.border};">
          <i class="iconoir-${n.icon}" style="font-size: 14px;"></i>
          <span>${l(n.action || "-")}</span>
        </span>
      `;
    let T = "";
    t.channel ? T = `
        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 11px; font-weight: 500; font-family: ui-monospace, monospace; color: #6b7280; background: #f3f4f6; border-radius: 4px; cursor: default;" title="${l(t.channel)}">
          ${l(h)}
        </span>
      ` : T = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    let $ = "";
    if (y) {
      let v = o || "", k = "activity-metadata-toggle", C = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #6b7280; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer;", L = "";
      o === "hidden" ? (v = "Hidden", k += " activity-metadata-toggle--hidden", C = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #9ca3af; background: transparent; border: 1px dashed #d1d5db; border-radius: 6px; cursor: pointer;", L = '<i class="iconoir-eye-off" style="font-size: 12px;"></i>') : !u && m && (v = "Debug", k += " activity-metadata-toggle--debug", C = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #9ca3af; background: transparent; border: 1px dashed #d1d5db; border-radius: 6px; cursor: pointer;", L = '<i class="iconoir-info-circle" style="font-size: 12px;"></i>'), $ = `
        <button type="button"
                class="${k}"
                style="${C}"
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
      $ = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    g.innerHTML = `
      <td style="padding: 12px 16px; vertical-align: middle; border-left: 3px solid ${p.color};">
        <div style="font-size: 13px; color: #374151; white-space: nowrap;">${a}</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${r}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle;">${b}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">
        <div style="font-size: 13px; line-height: 1.5; color: #374151;">${s}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle; text-align: center;">${T}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">${$}</td>
    `;
    let w = null;
    if (y) {
      w = document.createElement("tr"), w.className = "activity-details-row", w.style.display = "none", w.dataset.metadataContent = t.id;
      let v = "";
      u && (v += `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px 24px;">
            ${c}
          </div>
        `), m && (v += f), w.innerHTML = `
        <td colspan="5" style="padding: 0; background: #f9fafb; border-left: 3px solid ${p.color};">
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
    const n = I(t, 10);
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
  Y as ACTION_ICONS,
  P as ACTOR_TYPE_ICONS,
  pe as ACTOR_TYPE_LABELS,
  Ye as ActivityManager,
  z as ActivityViewSwitcher,
  he as NAMESPACE_ICONS,
  Be as TimelineRenderer,
  Te as countMetadataFields,
  Oe as createEndIndicator,
  Re as createLoadingIndicator,
  Fe as createScrollSentinel,
  l as escapeHtml,
  X as formatActivitySentence,
  Ue as formatActorWithType,
  $e as formatChannel,
  ne as formatEnrichmentDebugInfo,
  ie as formatMetadataExpanded,
  Ee as formatRelativeTime,
  Se as formatRelativeTimeIntl,
  Ae as formatSessionId,
  xe as formatTimestamp,
  V as getActionCategory,
  He as getActionClass,
  Pe as getActionIconHtml,
  qe as getActorEmail,
  N as getActorType,
  B as getActorTypeIconHtml,
  Z as getDateGroupLabel,
  S as getDateKey,
  ve as getEnrichmentInfo,
  te as getMetadataSummary,
  Ie as getSessionGroupLabel,
  W as getSessionId,
  ee as getStartOfDay,
  Ce as groupEntriesByDate,
  Le as groupEntriesBySession,
  U as isMaskedValue,
  F as isMetadataHidden,
  ye as isObjectDeleted,
  Me as mergeEntriesIntoGroups,
  G as parseActionString,
  me as parseObject,
  Ne as renderDateGroup,
  Ve as renderDateGroupHeader,
  De as renderSessionGroupHeader,
  M as renderTimelineEntry,
  K as resolveActionLabel,
  J as resolveActorLabel,
  be as resolveObjectDisplay,
  I as shortenId
};
//# sourceMappingURL=index.js.map
