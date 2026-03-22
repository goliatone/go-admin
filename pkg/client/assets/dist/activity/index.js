import { t as E } from "../chunks/icon-renderer-BSHLmdoQ.js";
var ae = {
  created: "created",
  added: "created",
  inserted: "created",
  registered: "created",
  signed_up: "created",
  imported: "created",
  updated: "updated",
  modified: "updated",
  changed: "updated",
  edited: "updated",
  saved: "updated",
  enabled: "updated",
  disabled: "updated",
  activated: "updated",
  deactivated: "updated",
  deleted: "deleted",
  removed: "deleted",
  destroyed: "deleted",
  purged: "deleted",
  archived: "deleted",
  login: "auth",
  logout: "auth",
  logged_in: "auth",
  logged_out: "auth",
  authenticated: "auth",
  password_reset: "auth",
  password_changed: "auth",
  token_refreshed: "auth",
  session_expired: "auth",
  viewed: "viewed",
  accessed: "viewed",
  read: "viewed",
  downloaded: "viewed",
  exported: "viewed"
}, re = "actor_display", oe = "object_display", le = "object_deleted", ce = "actor_type", de = "actor_email", fe = "session_id", ue = "enriched_at", pe = "enricher_version", U = {
  user: "user",
  system: "settings",
  job: "clock",
  api: "cloud",
  unknown: "help-circle"
}, he = {
  user: "User",
  system: "System",
  job: "Job",
  api: "API",
  unknown: "Unknown"
};
function F(e) {
  if (typeof e != "string" || !e) return !1;
  const t = e.trim();
  if (/^\[(REDACTED|HIDDEN|MASKED|REMOVED)\]$/i.test(t) || /^\*+$/.test(t) || /^[^*]+\*{3,}[^*]+$/.test(t)) return !0;
  const i = t.replace(/-/g, "");
  return !!/^[0-9a-f]{64,}$/i.test(i);
}
function Y(e) {
  if (!e || typeof e != "object") return !0;
  const t = Object.keys(e);
  return t.length === 0 ? !0 : t.every((i) => {
    const n = e[i];
    return n == null || n === "";
  });
}
var K = {
  created: "plus",
  updated: "edit-pencil",
  deleted: "trash",
  auth: "key",
  viewed: "eye",
  system: "settings"
}, me = {
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
function G(e, t) {
  if (!e) return "";
  if (!t) return e;
  const i = e.trim();
  if (!i) return e;
  const n = t[i];
  return typeof n == "string" && n.trim() !== "" ? n : e;
}
function J(e, t) {
  if (!e) return {
    namespace: "",
    action: "",
    icon: "activity",
    category: "system"
  };
  const i = G(e, t);
  if (e.includes(".")) {
    const s = e.split("."), a = s[0].toLowerCase(), r = s.slice(1).join("."), l = me[a] || "activity", c = s[s.length - 1], u = V(c);
    return {
      namespace: a,
      action: i !== e ? i : r,
      icon: l,
      category: u
    };
  }
  const n = V(e);
  return {
    namespace: "",
    action: i !== e ? i : e,
    icon: K[n],
    category: n
  };
}
function V(e) {
  return e && ae[e.toLowerCase().trim().replace(/-/g, "_")] || "system";
}
function ge(e) {
  if (!e) return {
    type: "",
    id: ""
  };
  if (!e.includes(":")) return {
    type: e,
    id: ""
  };
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
function be(...e) {
  for (const t of e) {
    if (!t) continue;
    const i = t.trim();
    if (i) return i;
  }
  return "";
}
function W(e) {
  return be(S(e.metadata, re), e.actor);
}
function ye(e) {
  return S(e.metadata, oe);
}
function ve(e) {
  return !e.metadata || typeof e.metadata != "object" ? !1 : e.metadata[le] === !0;
}
function N(e) {
  if (!e.metadata || typeof e.metadata != "object") return "unknown";
  const t = e.metadata[ce];
  if (typeof t == "string") {
    const i = t.toLowerCase();
    if (i in U) return i;
  }
  return "unknown";
}
function Ue(e) {
  return S(e.metadata, de);
}
function Q(e) {
  return S(e.metadata, fe);
}
function we(e) {
  const t = S(e.metadata, ue), i = S(e.metadata, pe);
  return !t && !i ? null : {
    enrichedAt: t,
    enricherVersion: i
  };
}
function xe(e) {
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
function O(e) {
  return e ? e.split(/[_-]/).map(xe).join(" ") : "";
}
function o(e) {
  const t = document.createElement("div");
  return t.textContent = e, t.innerHTML;
}
function C(e, t = 7) {
  if (!e) return "";
  const i = e.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(i) || e.length > t + 3 ? e.substring(0, t) : e;
}
function X(e) {
  if (!e) return !1;
  const t = e.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(t);
}
function A(e, t = 8) {
  if (!e) return "";
  const i = C(e, t);
  return i === e ? o(e) : `<span class="activity-id-short" title="${o(e)}" style="cursor: help; border-bottom: 1px dotted #9ca3af;">${o(i)}</span>`;
}
function Z(e, t, i) {
  const { showActorTypeBadge: n = !1 } = i || {}, s = W(e) || "Unknown", a = e.action || "performed action on", r = G(a, t);
  let l = "";
  if (n) {
    const d = N(e);
    d !== "user" && d !== "unknown" && (l = B(d, {
      badge: !0,
      size: "sm"
    }) + " ");
  }
  const c = X(s) ? `${l}${A(s, 8)}` : `${l}<strong>${o(s)}</strong>`, u = ve(e) ? ' <span class="activity-deleted-marker" title="This object has been deleted">(deleted)</span>' : "";
  let p = "";
  const h = ye(e);
  if (h) p = o(h) + u;
  else {
    const { type: d, id: m } = ge(e.object);
    if (d && m) {
      const f = A(m, 8);
      p = `${o(O(d))} #${f}${u}`;
    } else d ? p = o(O(d)) + u : m && (p = `#${A(m, 8)}${u}`);
  }
  if (V(a) === "auth") {
    const d = e.metadata?.ip || e.metadata?.IP;
    return d ? `${c} ${o(r)} from ${o(String(d))}` : `${c} ${o(r)}`;
  }
  return p ? `${c} ${o(r)} <strong>${p}</strong>` : `${c} ${o(r)}`;
}
function Ee(e) {
  if (!e) return "-";
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleString();
}
function Se(e) {
  if (!e) return "";
  const t = new Date(e);
  if (Number.isNaN(t.getTime())) return e;
  const i = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), n = Math.floor(i / 1e3), s = Math.floor(n / 60), a = Math.floor(s / 60), r = Math.floor(a / 24);
  return n < 60 ? "just now" : s < 60 ? `${s}m ago` : a < 24 ? `${a}h ago` : r < 7 ? `${r}d ago` : t.toLocaleDateString();
}
function Te(e) {
  if (!e) return "";
  const t = new Date(e);
  if (Number.isNaN(t.getTime())) return e;
  const i = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), n = Math.floor(i / 1e3), s = Math.floor(n / 60), a = Math.floor(s / 60), r = Math.floor(a / 24), l = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (n < 60) return "just now";
  if (s < 60) return l.format(-s, "minute");
  if (a < 24) return l.format(-a, "hour");
  if (r < 7) return l.format(-r, "day");
  if (r < 30) {
    const c = Math.floor(r / 7);
    return l.format(-c, "week");
  }
  return t.toLocaleDateString();
}
function ee(e) {
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
function te(e) {
  return new Date(e.getFullYear(), e.getMonth(), e.getDate());
}
function T(e) {
  return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, "0")}-${String(e.getDate()).padStart(2, "0")}`;
}
function $e(e) {
  return !e || typeof e != "object" ? 0 : Object.keys(e).length;
}
function ie(e) {
  if (e === null) return "hidden";
  if (e === void 0 || typeof e != "object") return "";
  const t = $e(e);
  return t === 0 || Y(e) ? "hidden" : t === 1 ? "1 field" : `${t} fields`;
}
function ne(e) {
  if (e === null) return `
      <div class="activity-metadata-hidden" style="padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; text-align: center;">
        <span style="color: #9ca3af; font-size: 12px; font-style: italic;">Metadata hidden</span>
      </div>
    `;
  if (e === void 0 || typeof e != "object") return "";
  const t = Object.entries(e);
  return t.length === 0 || Y(e) ? `
      <div class="activity-metadata-hidden" style="padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; text-align: center;">
        <span style="color: #9ca3af; font-size: 12px; font-style: italic;">Metadata hidden</span>
      </div>
    ` : t.map(([i, n]) => {
    const s = o(i);
    let a, r = !1;
    if (F(n))
      r = !0, a = `<span class="activity-masked-value" title="This value is masked">${o(String(n))}</span>`;
    else if (i.endsWith("_old") || i.endsWith("_new")) a = o(R(n));
    else if (typeof n == "object" && n !== null) {
      const l = JSON.stringify(n);
      a = `<code style="font-size: 11px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${o(l.length > 100 ? l.substring(0, 100) + "..." : l)}</code>`;
    } else a = o(R(n));
    return `
      <div class="activity-metadata-item${r ? " activity-metadata-item--masked" : ""}" style="display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
        <span style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${s}</span>
        <span style="color: #111827; font-size: 12px; font-weight: 500; word-break: break-word;">${a}</span>
      </div>
    `;
  }).join("");
}
function se(e) {
  const t = we(e);
  if (!t) return "";
  const i = [];
  if (t.enrichedAt) {
    const n = new Date(t.enrichedAt), s = Number.isNaN(n.getTime()) ? t.enrichedAt : n.toLocaleString();
    i.push(`
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <span style="color: #9ca3af; font-size: 11px;">Enriched at:</span>
        <span style="color: #6b7280; font-size: 11px; font-family: ui-monospace, monospace;">${o(s)}</span>
      </div>
    `);
  }
  return t.enricherVersion && i.push(`
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <span style="color: #9ca3af; font-size: 11px;">Enricher version:</span>
        <span style="color: #6b7280; font-size: 11px; font-family: ui-monospace, monospace;">${o(t.enricherVersion)}</span>
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
function R(e) {
  return e == null ? "-" : typeof e == "boolean" ? e ? "Yes" : "No" : typeof e == "number" ? String(e) : typeof e == "string" ? e.length > 100 ? e.substring(0, 100) + "..." : e : JSON.stringify(e);
}
function Ae(e) {
  return e ? C(e, 7) : "";
}
function Fe(e) {
  return `activity-action--${e}`;
}
function Ye(e) {
  const t = K[e];
  return E(`iconoir:${t}`, { extraClass: "activity-action-icon" });
}
function B(e, t) {
  const { badge: i = !1, size: n = "md" } = t || {}, s = U[e], a = he[e], r = {
    sm: "12px",
    md: "14px",
    lg: "16px"
  };
  if (i) {
    const l = E(`iconoir:${s}`, { size: r[n] });
    return `
      <span class="activity-actor-type-badge activity-actor-type-badge--${e}" title="${o(a)}">
        ${l}
      </span>
    `;
  }
  return E(`iconoir:${s}`, {
    size: r[n],
    extraClass: `activity-actor-type-icon activity-actor-type-icon--${e}`
  });
}
function Ke(e) {
  const t = W(e) || "Unknown", i = N(e), n = X(t) ? A(t, 8) : o(t);
  return `${i !== "user" && i !== "unknown" ? B(i, {
    badge: !0,
    size: "sm"
  }) + " " : ""}<strong>${n}</strong>`;
}
function Ce(e, t = 10) {
  return e ? C(e, t) : "";
}
function Ie(e) {
  return e ? F(e) ? "Session (masked)" : `Session ${Ce(e, 8)}` : "No session";
}
var Le = {
  container: "#activity-view-switcher",
  tableTab: '[data-view-tab="table"]',
  timelineTab: '[data-view-tab="timeline"]',
  tableView: "#activity-table-container",
  timelineView: "#activity-timeline-container",
  paginationContainer: "#activity-pagination"
}, j = "activity-view-preference", x = "view", z = class {
  constructor(e = {}, t) {
    this.currentView = "table", this.container = null, this.tableTab = null, this.timelineTab = null, this.tableView = null, this.timelineView = null, this.paginationContainer = null, this.handleTableClick = () => {
      this.setView("table");
    }, this.handleTimelineClick = () => {
      this.setView("timeline");
    }, this.selectors = {
      ...Le,
      ...e
    }, this.onViewChange = t;
  }
  init() {
    this.cacheElements(), this.bindEvents(), this.restoreView();
  }
  getView() {
    return this.currentView;
  }
  setView(e, t = {}) {
    const { persist: i = !0, updateUrl: n = !0 } = t;
    e !== "table" && e !== "timeline" && (e = "table"), this.currentView = e, this.updateUI(), i && this.persistView(), n && this.updateUrlParam(), this.emitViewChange();
  }
  destroy() {
    this.tableTab?.removeEventListener("click", this.handleTableClick), this.timelineTab?.removeEventListener("click", this.handleTimelineClick);
  }
  cacheElements() {
    this.container = document.querySelector(this.selectors.container), this.tableTab = document.querySelector(this.selectors.tableTab), this.timelineTab = document.querySelector(this.selectors.timelineTab), this.tableView = document.querySelector(this.selectors.tableView), this.timelineView = document.querySelector(this.selectors.timelineView), this.paginationContainer = document.querySelector(this.selectors.paginationContainer);
  }
  bindEvents() {
    this.tableTab?.addEventListener("click", this.handleTableClick), this.timelineTab?.addEventListener("click", this.handleTimelineClick);
  }
  restoreView() {
    const e = new URLSearchParams(window.location.search).get(x);
    if (e === "table" || e === "timeline") {
      this.setView(e, {
        persist: !0,
        updateUrl: !1
      });
      return;
    }
    const t = localStorage.getItem(j);
    if (t === "table" || t === "timeline") {
      this.setView(t, {
        persist: !1,
        updateUrl: !0
      });
      return;
    }
    this.setView("table", {
      persist: !1,
      updateUrl: !1
    });
  }
  updateUI() {
    const e = this.currentView === "table";
    this.tableTab && (this.tableTab.setAttribute("aria-selected", e ? "true" : "false"), this.tableTab.classList.toggle("active", e)), this.timelineTab && (this.timelineTab.setAttribute("aria-selected", e ? "false" : "true"), this.timelineTab.classList.toggle("active", !e)), this.tableView && this.tableView.classList.toggle("hidden", !e), this.timelineView && this.timelineView.classList.toggle("hidden", e), this.paginationContainer && this.paginationContainer.classList.toggle("hidden", !e);
  }
  persistView() {
    try {
      localStorage.setItem(j, this.currentView);
    } catch {
    }
  }
  updateUrlParam() {
    const e = new URLSearchParams(window.location.search);
    this.currentView === "table" ? e.delete(x) : e.set(x, this.currentView);
    const t = e.toString(), i = t ? `${window.location.pathname}?${t}` : window.location.pathname;
    window.history.replaceState({}, "", i);
  }
  emitViewChange() {
    this.onViewChange && this.onViewChange(this.currentView);
    const e = new CustomEvent("activity:viewchange", {
      bubbles: !0,
      detail: { view: this.currentView }
    });
    document.dispatchEvent(e);
  }
  static getViewFromUrl() {
    return new URLSearchParams(window.location.search).get(x) === "timeline" ? "timeline" : "table";
  }
  static addViewToParams(e, t) {
    t === "timeline" ? e.set(x, t) : e.delete(x);
  }
}, q = {
  created: {
    bg: "#ecfdf5",
    color: "#10b981",
    border: "#a7f3d0"
  },
  updated: {
    bg: "#eff6ff",
    color: "#3b82f6",
    border: "#bfdbfe"
  },
  deleted: {
    bg: "#fef2f2",
    color: "#ef4444",
    border: "#fecaca"
  },
  auth: {
    bg: "#fffbeb",
    color: "#f59e0b",
    border: "#fde68a"
  },
  viewed: {
    bg: "#f5f3ff",
    color: "#8b5cf6",
    border: "#ddd6fe"
  },
  system: {
    bg: "#f9fafb",
    color: "#6b7280",
    border: "#e5e7eb"
  }
};
function ke(e) {
  if (!e || e.length === 0) return [];
  const t = /* @__PURE__ */ new Map();
  return e.forEach((i) => {
    const n = new Date(i.created_at);
    if (Number.isNaN(n.getTime())) return;
    const s = T(n), a = te(n);
    t.has(s) || t.set(s, {
      date: a,
      label: ee(n),
      entries: [],
      collapsed: !1
    }), t.get(s).entries.push(i);
  }), Array.from(t.values()).sort((i, n) => n.date.getTime() - i.date.getTime());
}
function Me(e) {
  if (!e || e.length === 0) return [];
  const t = /* @__PURE__ */ new Map();
  e.forEach((n) => {
    const s = Q(n) || "", a = s || "__no_session__";
    t.has(a) || t.set(a, {
      sessionId: s,
      label: Ie(s),
      entries: [],
      collapsed: !1
    }), t.get(a).entries.push(n);
  });
  const i = Array.from(t.values());
  return i.forEach((n) => {
    n.entries.sort((s, a) => new Date(a.created_at).getTime() - new Date(s.created_at).getTime());
  }), i.sort((n, s) => {
    if (!n.sessionId && s.sessionId) return 1;
    if (n.sessionId && !s.sessionId) return -1;
    const a = n.entries[0] ? new Date(n.entries[0].created_at).getTime() : 0;
    return (s.entries[0] ? new Date(s.entries[0].created_at).getTime() : 0) - a;
  });
}
function _e(e, t) {
  if (!t || t.length === 0) return e;
  const i = /* @__PURE__ */ new Map();
  e.forEach((s) => {
    i.set(T(s.date), {
      ...s,
      entries: [...s.entries]
    });
  }), t.forEach((s) => {
    const a = new Date(s.created_at);
    if (Number.isNaN(a.getTime())) return;
    const r = T(a), l = te(a);
    i.has(r) || i.set(r, {
      date: l,
      label: ee(a),
      entries: [],
      collapsed: !1
    });
    const c = i.get(r);
    c.entries.some((u) => u.id === s.id) || c.entries.push(s);
  });
  const n = Array.from(i.values()).sort((s, a) => a.date.getTime() - s.date.getTime());
  return n.forEach((s) => {
    s.entries.sort((a, r) => new Date(r.created_at).getTime() - new Date(a.created_at).getTime());
  }), n;
}
function De(e) {
  if (!e) return "?";
  const t = e.replace(/-/g, "");
  if (/^[0-9a-f]{32}$/i.test(t)) return e.substring(0, 2).toUpperCase();
  const i = e.split(/[\s._-]+/).filter(Boolean);
  return i.length >= 2 ? (i[0][0] + i[1][0]).toUpperCase() : e.substring(0, 2).toUpperCase();
}
function M(e, t, i) {
  const { showDebugInfo: n = !1 } = i || {}, s = J(e.action, t), a = Z(e, t), r = Te(e.created_at), l = ie(e.metadata), c = ne(e.metadata), u = n ? se(e) : "", p = q[s.category] || q.system, h = De(e.actor), d = N(e), m = d !== "user" && d !== "unknown" ? B(d, {
    badge: !0,
    size: "sm"
  }) : "", f = document.createElement("div");
  f.className = `timeline-entry timeline-entry--${s.category}`, f.dataset.entryId = e.id;
  let g = "";
  l === "hidden" ? g = `
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
    ` : l ? g = `
      <div class="timeline-entry-metadata">
        <button type="button"
                class="timeline-metadata-toggle"
                aria-expanded="false"
                data-timeline-metadata="${e.id}">
          <span>${l}</span>
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
    ` : u && (g = `
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
  const y = m ? `<div class="timeline-entry-actor-type">${m}</div>` : "";
  return f.innerHTML = `
    <div class="timeline-entry-connector">
      <div class="timeline-entry-dot" style="background-color: ${p.color}; border-color: ${p.border};"></div>
    </div>
    <div class="timeline-entry-card">
      <div class="timeline-entry-header">
        <div class="timeline-entry-avatar" style="background-color: ${p.bg}; color: ${p.color};">
          ${o(h)}
          ${y}
        </div>
        <div class="timeline-entry-content">
          <div class="timeline-entry-action">
            <span class="timeline-action-badge" style="background-color: ${p.bg}; color: ${p.color}; border-color: ${p.border};">
              ${E(`iconoir:${s.icon}`)}
              <span>${o(s.action || e.action)}</span>
            </span>
          </div>
          <div class="timeline-entry-sentence">${a}</div>
          <div class="timeline-entry-time">${o(r)}</div>
        </div>
      </div>
      ${g}
    </div>
  `, f;
}
function Ve(e, t, i) {
  const n = `${t}__${e.sessionId || "no-session"}`, s = document.createElement("div");
  s.className = "timeline-session-header", s.dataset.sessionGroup = n;
  const a = e.entries.length, r = a === 1 ? "1 entry" : `${a} entries`;
  s.innerHTML = `
    <button type="button" class="timeline-session-toggle" aria-expanded="${!e.collapsed}">
      <i class="iconoir-link" style="font-size: 12px; color: #9ca3af;"></i>
      <span class="timeline-session-label">${o(e.label)}</span>
      <span class="timeline-session-count">${r}</span>
      <svg class="timeline-session-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </button>
  `;
  const l = s.querySelector(".timeline-session-toggle");
  return l && i && l.addEventListener("click", () => {
    const c = !e.collapsed;
    e.collapsed = c, l.setAttribute("aria-expanded", (!c).toString()), i(n, c);
  }), s;
}
function Ne(e, t) {
  const i = T(e.date), n = document.createElement("div");
  n.className = "timeline-date-header", n.dataset.dateGroup = i, n.innerHTML = `
    <button type="button" class="timeline-date-toggle" aria-expanded="${!e.collapsed}">
      <span class="timeline-date-label">${o(e.label)}</span>
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
function Be(e, t, i, n) {
  const { groupBySession: s = !0, showDebugInfo: a = !1, onSessionToggle: r, collapsedSessions: l = /* @__PURE__ */ new Set() } = n || {}, c = T(e.date), u = document.createElement("div");
  u.className = "timeline-group", u.dataset.dateGroup = c;
  const p = Ne(e, i);
  u.appendChild(p);
  const h = document.createElement("div");
  if (h.className = "timeline-entries", e.collapsed && h.classList.add("collapsed"), s) {
    const d = Me(e.entries), m = d.length > 1 || d.length === 1 && d[0].sessionId;
    d.forEach((f) => {
      const g = `${c}__${f.sessionId || "no-session"}`;
      if (f.collapsed = l.has(g), m) {
        const y = Ve(f, c, r);
        h.appendChild(y);
        const b = document.createElement("div");
        b.className = "timeline-session-entries", b.dataset.sessionEntries = g, f.collapsed && b.classList.add("collapsed"), f.entries.forEach(($) => {
          const v = M($, t, { showDebugInfo: a });
          b.appendChild(v);
        }), h.appendChild(b);
      } else f.entries.forEach((y) => {
        const b = M(y, t, { showDebugInfo: a });
        h.appendChild(b);
      });
    });
  } else e.entries.forEach((d) => {
    const m = M(d, t, { showDebugInfo: a });
    h.appendChild(m);
  });
  return u.appendChild(h), u;
}
var Oe = class {
  constructor(e, t, i) {
    this.collapsedGroups = /* @__PURE__ */ new Set(), this.collapsedSessions = /* @__PURE__ */ new Set(), this.groups = [], this.container = e, this.actionLabels = t, this.options = {
      groupBySession: !0,
      showDebugInfo: !1,
      ...i
    };
  }
  setOptions(e) {
    this.options = {
      ...this.options,
      ...e
    };
  }
  render(e) {
    if (this.groups = ke(e), this.container.innerHTML = "", this.groups.length === 0) {
      this.renderEmptyState();
      return;
    }
    const t = document.createElement("div");
    t.className = "timeline", this.groups.forEach((i) => {
      const n = T(i.date);
      i.collapsed = this.collapsedGroups.has(n);
      const s = Be(i, this.actionLabels, (a, r) => {
        this.handleGroupToggle(a, r);
      }, {
        groupBySession: this.options.groupBySession,
        showDebugInfo: this.options.showDebugInfo,
        onSessionToggle: (a, r) => {
          this.handleSessionToggle(a, r);
        },
        collapsedSessions: this.collapsedSessions
      });
      t.appendChild(s);
    }), this.container.appendChild(t), this.wireMetadataToggles();
  }
  appendEntries(e) {
    this.groups = _e(this.groups, e);
    const t = this.groups.flatMap((i) => i.entries);
    this.render(t);
  }
  clear() {
    this.container.innerHTML = "", this.groups = [];
  }
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
  handleGroupToggle(e, t) {
    t ? this.collapsedGroups.add(e) : this.collapsedGroups.delete(e);
    const i = this.container.querySelector(`[data-date-group="${e}"]`)?.querySelector(".timeline-entries");
    i && i.classList.toggle("collapsed", t);
  }
  handleSessionToggle(e, t) {
    t ? this.collapsedSessions.add(e) : this.collapsedSessions.delete(e);
    const i = this.container.querySelector(`[data-session-entries="${e}"]`);
    i && i.classList.toggle("collapsed", t);
  }
  wireMetadataToggles() {
    this.container.querySelectorAll("[data-timeline-metadata]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.timelineMetadata, i = this.container.querySelector(`[data-timeline-metadata-content="${t}"]`);
        if (!i) return;
        const n = e.getAttribute("aria-expanded") !== "true";
        e.setAttribute("aria-expanded", n.toString()), i.classList.toggle("expanded", n);
        const s = e.querySelector(".timeline-metadata-chevron");
        s && (s.style.transform = n ? "rotate(180deg)" : "rotate(0deg)");
      });
    });
  }
};
function Re() {
  const e = document.createElement("div");
  return e.className = "timeline-loading", e.innerHTML = `
    <div class="timeline-loading-spinner"></div>
    <span>Loading more entries...</span>
  `, e;
}
function je() {
  const e = document.createElement("div");
  return e.className = "timeline-end", e.innerHTML = `
    <span>No more entries</span>
  `, e;
}
function Ge() {
  const e = document.createElement("div");
  return e.className = "timeline-sentinel", e.setAttribute("aria-hidden", "true"), e;
}
var ze = {
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
}, _ = [
  "q",
  "verb",
  "channels",
  "object_type",
  "object_id"
], D = ["since", "until"], qe = ["user_id", "actor_id"];
function P(e) {
  return e !== null && typeof e == "object" && !Array.isArray(e);
}
function He(e) {
  if (!P(e)) return {
    textCode: "",
    message: ""
  };
  const t = P(e.error) ? e.error : e;
  return {
    textCode: typeof t.text_code == "string" ? t.text_code.trim() : "",
    message: typeof t.message == "string" ? t.message.trim() : ""
  };
}
var Je = class {
  constructor(e, t = {}, i) {
    this.form = null, this.tableBody = null, this.emptyState = null, this.disabledState = null, this.errorState = null, this.countEl = null, this.prevBtn = null, this.nextBtn = null, this.refreshBtn = null, this.clearBtn = null, this.limitInput = null, this.viewSwitcher = null, this.timelineRenderer = null, this.timelineContainer = null, this.timelineSentinel = null, this.infiniteScrollObserver = null, this.isLoadingMore = !1, this.allEntriesLoaded = !1, this.cachedEntries = [], this.state = {
      limit: 50,
      offset: 0,
      total: 0,
      nextOffset: 0,
      hasMore: !1,
      extraParams: {}
    }, this.config = e, this.selectors = {
      ...ze,
      ...t
    }, this.toast = i || window.toastManager || null;
  }
  init() {
    this.cacheElements(), this.initViewSwitcher(), this.initTimeline(), this.bindEvents(), this.syncFromQuery(), this.loadActivity();
  }
  initViewSwitcher() {
    this.viewSwitcher = new z({
      container: "#activity-view-switcher",
      tableTab: '[data-view-tab="table"]',
      timelineTab: '[data-view-tab="timeline"]',
      tableView: "#activity-table-container",
      timelineView: "#activity-timeline-container",
      paginationContainer: "#activity-pagination"
    }, (e) => this.handleViewChange(e)), this.viewSwitcher.init();
  }
  initTimeline() {
    this.timelineContainer = document.querySelector(H.container), this.timelineSentinel = document.querySelector(H.sentinel), this.timelineContainer && (this.timelineRenderer = new Oe(this.timelineContainer, this.config.actionLabels)), this.setupInfiniteScroll();
  }
  handleViewChange(e) {
    e === "timeline" ? (this.allEntriesLoaded = !1, this.isLoadingMore = !1, this.state.offset = 0, this.loadActivity(), this.enableInfiniteScroll()) : (this.disableInfiniteScroll(), this.state.offset = 0, this.loadActivity());
  }
  setupInfiniteScroll() {
    this.timelineSentinel && (this.infiniteScrollObserver = new IntersectionObserver((e) => {
      e[0].isIntersecting && !this.isLoadingMore && !this.allEntriesLoaded && this.loadMoreEntries();
    }, {
      root: null,
      rootMargin: "200px",
      threshold: 0
    }));
  }
  enableInfiniteScroll() {
    this.infiniteScrollObserver && this.timelineSentinel && this.infiniteScrollObserver.observe(this.timelineSentinel);
  }
  disableInfiniteScroll() {
    this.infiniteScrollObserver && this.timelineSentinel && this.infiniteScrollObserver.unobserve(this.timelineSentinel);
  }
  async loadMoreEntries() {
    if (this.isLoadingMore || this.allEntriesLoaded || !this.state.hasMore) return;
    this.isLoadingMore = !0;
    const e = Re();
    this.timelineSentinel?.parentElement?.insertBefore(e, this.timelineSentinel);
    try {
      this.state.offset = this.state.nextOffset;
      const t = this.buildParams(), i = `${this.config.apiPath}?${t.toString()}`, n = await fetch(i, { headers: { Accept: "application/json" } });
      if (!n.ok) throw new Error(`Failed to load more entries (${n.status})`);
      const s = await n.json(), a = Array.isArray(s.entries) ? s.entries : [];
      if (this.state.hasMore = !!s.has_more, this.state.nextOffset = typeof s.next_offset == "number" ? s.next_offset : this.state.offset + a.length, a.length === 0 ? this.allEntriesLoaded = !0 : (this.cachedEntries = [...this.cachedEntries, ...a], this.timelineRenderer && this.timelineRenderer.appendEntries(a)), !this.state.hasMore) {
        this.allEntriesLoaded = !0;
        const r = je();
        this.timelineSentinel?.parentElement?.insertBefore(r, this.timelineSentinel);
      }
    } catch (t) {
      console.error("Failed to load more entries:", t);
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
      _.forEach((e) => this.setInputValue(e, "")), D.forEach((e) => this.setInputValue(e, "")), this.state.offset = 0, this.loadActivity();
    }), this.prevBtn?.addEventListener("click", () => {
      this.state.offset = Math.max(0, this.state.offset - this.state.limit), this.loadActivity();
    }), this.nextBtn?.addEventListener("click", () => {
      this.state.hasMore && (this.state.offset = this.state.nextOffset, this.loadActivity());
    }), this.refreshBtn?.addEventListener("click", () => {
      this.loadActivity();
    });
  }
  getInputValue(e) {
    const t = document.getElementById(`filter-${e.replace(/_/g, "-")}`);
    return t ? String(t.value || "").trim() : "";
  }
  setInputValue(e, t) {
    const i = document.getElementById(`filter-${e.replace(/_/g, "-")}`);
    i && (i.value = t || "");
  }
  toLocalInput(e) {
    if (!e) return "";
    const t = new Date(e);
    if (Number.isNaN(t.getTime())) return e;
    const i = t.getTimezoneOffset() * 6e4;
    return new Date(t.getTime() - i).toISOString().slice(0, 16);
  }
  toRFC3339(e) {
    if (!e) return "";
    const t = new Date(e);
    return Number.isNaN(t.getTime()) ? "" : t.toISOString();
  }
  syncFromQuery() {
    const e = new URLSearchParams(window.location.search), t = parseInt(e.get("limit") || "", 10), i = parseInt(e.get("offset") || "", 10);
    !Number.isNaN(t) && t > 0 && (this.state.limit = t), !Number.isNaN(i) && i >= 0 && (this.state.offset = i), this.limitInput && (this.limitInput.value = String(this.state.limit)), _.forEach((n) => this.setInputValue(n, e.get(n) || "")), D.forEach((n) => this.setInputValue(n, this.toLocalInput(e.get(n) || ""))), qe.forEach((n) => {
      const s = e.get(n);
      s && (this.state.extraParams[n] = s);
    });
  }
  buildParams() {
    const e = new URLSearchParams();
    return e.set("limit", String(this.state.limit)), e.set("offset", String(this.state.offset)), _.forEach((t) => {
      const i = this.getInputValue(t);
      i && e.set(t, i);
    }), D.forEach((t) => {
      const i = this.toRFC3339(this.getInputValue(t));
      i && e.set(t, i);
    }), Object.entries(this.state.extraParams).forEach(([t, i]) => {
      i && e.set(t, i);
    }), e;
  }
  syncUrl(e) {
    this.viewSwitcher && z.addViewToParams(e, this.viewSwitcher.getView());
    const t = e.toString(), i = t ? `${window.location.pathname}?${t}` : window.location.pathname;
    window.history.replaceState({}, "", i);
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
    const t = `${this.config.apiPath}?${e.toString()}`;
    try {
      const i = await fetch(t, { headers: { Accept: "application/json" } });
      if (!i.ok) {
        let a = null;
        try {
          a = await i.json();
        } catch {
          a = null;
        }
        const r = He(a);
        if (i.status === 404 && r.textCode === "FEATURE_DISABLED") {
          this.showDisabled(r.message || "Activity feature disabled."), this.renderRows([]), this.updatePagination(0);
          return;
        }
        this.showError(r.message || `Failed to load activity (${i.status})`);
        return;
      }
      const n = await i.json(), s = Array.isArray(n.entries) ? n.entries : [];
      this.state.total = typeof n.total == "number" ? n.total : s.length, this.state.hasMore = !!n.has_more, this.state.nextOffset = typeof n.next_offset == "number" ? n.next_offset : this.state.offset + s.length, this.cachedEntries = s, this.allEntriesLoaded = !this.state.hasMore, this.isLoadingMore = !1, (this.viewSwitcher?.getView() || "table") === "timeline" ? this.renderTimeline(s) : this.renderRows(s), this.updatePagination(s.length);
    } catch {
      this.showError("Failed to load activity.");
    }
  }
  renderTimeline(e) {
    this.timelineRenderer && (this.timelineContainer?.parentElement?.querySelector(".timeline-end")?.remove(), this.timelineRenderer.render(e), this.enableInfiniteScroll());
  }
  renderRows(e) {
    if (!this.tableBody) return;
    if (this.tableBody.innerHTML = "", !e || e.length === 0) {
      this.emptyState?.classList.remove("hidden");
      return;
    }
    this.emptyState?.classList.add("hidden");
    let t = "";
    e.forEach((i) => {
      const n = Q(i);
      n && n !== t ? (this.tableBody.appendChild(this.createSessionRow(n)), t = n) : n || (t = "");
      const { mainRow: s, detailsRow: a } = this.createRowPair(i);
      this.tableBody.appendChild(s), a && this.tableBody.appendChild(a);
    }), this.wireMetadataToggles();
  }
  createRowPair(e) {
    const t = this.config.actionLabels || {}, i = J(e.action, t), n = Z(e, t, { showActorTypeBadge: !0 }), s = Ee(e.created_at), a = Se(e.created_at), r = ie(e.metadata), l = ne(e.metadata), c = se(e), u = Ae(e.channel), p = !!r, h = !!c, d = p || h, m = {
      created: {
        bg: "#ecfdf5",
        color: "#10b981",
        border: "#a7f3d0"
      },
      updated: {
        bg: "#eff6ff",
        color: "#3b82f6",
        border: "#bfdbfe"
      },
      deleted: {
        bg: "#fef2f2",
        color: "#ef4444",
        border: "#fecaca"
      },
      auth: {
        bg: "#fffbeb",
        color: "#f59e0b",
        border: "#fde68a"
      },
      viewed: {
        bg: "#f5f3ff",
        color: "#8b5cf6",
        border: "#ddd6fe"
      },
      system: {
        bg: "#f9fafb",
        color: "#6b7280",
        border: "#e5e7eb"
      }
    }, f = m[i.category] || m.system, g = document.createElement("tr");
    g.className = `activity-row activity-row--${i.category}`;
    let y = "";
    i.namespace ? y = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #f3f4f6; border-radius: 6px; color: #6b7280;" title="${o(i.namespace)}">
            ${E(`iconoir:${i.icon}`, { size: "14px" })}
          </span>
          <span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${f.bg}; color: ${f.color}; border: 1px solid ${f.border};">
            ${o(i.action)}
          </span>
        </div>
      ` : y = `
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${f.bg}; color: ${f.color}; border: 1px solid ${f.border};">
          ${E(`iconoir:${i.icon}`, { size: "14px" })}
          <span>${o(i.action || "-")}</span>
        </span>
      `;
    let b = "";
    e.channel ? b = `
        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 11px; font-weight: 500; font-family: ui-monospace, monospace; color: #6b7280; background: #f3f4f6; border-radius: 4px; cursor: default;" title="${o(e.channel)}">
          ${o(u)}
        </span>
      ` : b = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    let $ = "";
    if (d) {
      let w = r || "", I = "activity-metadata-toggle", L = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #6b7280; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer;", k = "";
      r === "hidden" ? (w = "Hidden", I += " activity-metadata-toggle--hidden", L = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #9ca3af; background: transparent; border: 1px dashed #d1d5db; border-radius: 6px; cursor: pointer;", k = '<i class="iconoir-eye-off" style="font-size: 12px;"></i>') : !p && h && (w = "Debug", I += " activity-metadata-toggle--debug", L = "display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #9ca3af; background: transparent; border: 1px dashed #d1d5db; border-radius: 6px; cursor: pointer;", k = '<i class="iconoir-info-circle" style="font-size: 12px;"></i>'), $ = `
        <button type="button"
                class="${I}"
                style="${L}"
                aria-expanded="false"
                data-metadata-toggle="${e.id}">
          ${k}
          <span>${w}</span>
          <svg class="activity-metadata-chevron" style="width: 12px; height: 12px; transition: transform 0.15s ease;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      `;
    } else $ = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    g.innerHTML = `
      <td style="padding: 12px 16px; vertical-align: middle; border-left: 3px solid ${f.color};">
        <div style="font-size: 13px; color: #374151; white-space: nowrap;">${s}</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${a}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle;">${y}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">
        <div style="font-size: 13px; line-height: 1.5; color: #374151;">${n}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle; text-align: center;">${b}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">${$}</td>
    `;
    let v = null;
    if (d) {
      v = document.createElement("tr"), v.className = "activity-details-row", v.style.display = "none", v.dataset.metadataContent = e.id;
      let w = "";
      p && (w += `
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px 24px;">
            ${l}
          </div>
        `), h && (w += c), v.innerHTML = `
        <td colspan="5" style="padding: 0; background: #f9fafb; border-left: 3px solid ${f.color};">
          <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb;">
            ${w}
          </div>
        </td>
      `;
    }
    return {
      mainRow: g,
      detailsRow: v
    };
  }
  createSessionRow(e) {
    const t = document.createElement("tr");
    t.className = "activity-session-row";
    const i = C(e, 10);
    return t.innerHTML = `
      <td colspan="5" style="padding: 8px 16px; background: #f8fafc; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em;">
          <span>Session</span>
          <span style="font-family: ui-monospace, monospace; font-weight: 600; color: #374151;" title="${o(e)}">${o(i)}</span>
        </div>
      </td>
    `, t;
  }
  wireMetadataToggles() {
    document.querySelectorAll("[data-metadata-toggle]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.dataset.metadataToggle, i = document.querySelector(`tr[data-metadata-content="${t}"]`);
        if (!i) return;
        const n = e.getAttribute("aria-expanded") !== "true";
        i.style.display = n ? "table-row" : "none", e.setAttribute("aria-expanded", n ? "true" : "false"), e.style.background = n ? "#e5e7eb" : "#f3f4f6";
        const s = e.querySelector(".activity-metadata-chevron");
        s && (s.style.transform = n ? "rotate(180deg)" : "rotate(0deg)");
      });
    });
  }
  updatePagination(e) {
    const t = Number.isFinite(this.state.total) ? this.state.total : 0, i = e > 0 ? this.state.offset + 1 : 0, n = this.state.offset + e;
    this.countEl && (t > 0 ? this.countEl.textContent = `Showing ${i}-${n} of ${t}` : e > 0 ? this.countEl.textContent = `Showing ${i}-${n}` : this.countEl.textContent = "No activity entries"), this.prevBtn && (this.prevBtn.disabled = this.state.offset <= 0), this.nextBtn && (this.nextBtn.disabled = !this.state.hasMore);
  }
};
export {
  K as ACTION_ICONS,
  U as ACTOR_TYPE_ICONS,
  he as ACTOR_TYPE_LABELS,
  Je as ActivityManager,
  z as ActivityViewSwitcher,
  me as NAMESPACE_ICONS,
  Oe as TimelineRenderer,
  $e as countMetadataFields,
  je as createEndIndicator,
  Re as createLoadingIndicator,
  Ge as createScrollSentinel,
  o as escapeHtml,
  Z as formatActivitySentence,
  Ke as formatActorWithType,
  Ae as formatChannel,
  se as formatEnrichmentDebugInfo,
  ne as formatMetadataExpanded,
  Se as formatRelativeTime,
  Te as formatRelativeTimeIntl,
  Ce as formatSessionId,
  Ee as formatTimestamp,
  V as getActionCategory,
  Fe as getActionClass,
  Ye as getActionIconHtml,
  Ue as getActorEmail,
  N as getActorType,
  B as getActorTypeIconHtml,
  ee as getDateGroupLabel,
  T as getDateKey,
  we as getEnrichmentInfo,
  ie as getMetadataSummary,
  Ie as getSessionGroupLabel,
  Q as getSessionId,
  te as getStartOfDay,
  ke as groupEntriesByDate,
  Me as groupEntriesBySession,
  F as isMaskedValue,
  Y as isMetadataHidden,
  ve as isObjectDeleted,
  _e as mergeEntriesIntoGroups,
  J as parseActionString,
  ge as parseObject,
  Be as renderDateGroup,
  Ne as renderDateGroupHeader,
  Ve as renderSessionGroupHeader,
  M as renderTimelineEntry,
  G as resolveActionLabel,
  W as resolveActorLabel,
  ye as resolveObjectDisplay,
  C as shortenId
};

//# sourceMappingURL=index.js.map