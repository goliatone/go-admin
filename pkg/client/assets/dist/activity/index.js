const B = {
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
}, E = {
  created: "plus",
  updated: "edit-pencil",
  deleted: "trash",
  auth: "key",
  viewed: "eye",
  system: "settings"
}, L = {
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
function I(e, t) {
  if (!e) return "";
  if (!t) return e;
  const i = e.trim();
  if (!i) return e;
  const s = t[i];
  return typeof s == "string" && s.trim() !== "" ? s : e;
}
function _(e, t) {
  if (!e)
    return { namespace: "", action: "", icon: "activity", category: "system" };
  const i = I(e, t);
  if (e.includes(".")) {
    const r = e.split("."), a = r[0].toLowerCase(), o = r.slice(1).join("."), d = L[a] || "activity", p = r[r.length - 1], l = w(p);
    return { namespace: a, action: i !== e ? i : o, icon: d, category: l };
  }
  const s = w(e);
  return {
    namespace: "",
    action: i !== e ? i : e,
    icon: E[s],
    category: s
  };
}
function w(e) {
  if (!e) return "system";
  const t = e.toLowerCase().trim().replace(/-/g, "_");
  return B[t] || "system";
}
function k(e) {
  if (!e) return { type: "", id: "" };
  if (!e.includes(":"))
    return { type: e, id: "" };
  const t = e.indexOf(":");
  return {
    type: e.substring(0, t),
    id: e.substring(t + 1)
  };
}
function C(e) {
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
function S(e) {
  return e ? e.split(/[_-]/).map(C).join(" ") : "";
}
function c(e) {
  const t = document.createElement("div");
  return t.textContent = e, t.innerHTML;
}
function A(e, t = 7) {
  if (!e) return "";
  const i = e.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(i) || e.length > t + 3 ? e.substring(0, t) : e;
}
function N(e) {
  const t = e.replace(/-/g, "");
  return /^[0-9a-f]{32}$/i.test(t);
}
function b(e, t = 8) {
  if (!e) return "";
  const i = A(e, t);
  return i === e ? c(e) : `<span class="activity-id-short" title="${c(e)}" style="cursor: help; border-bottom: 1px dotted #9ca3af;">${c(i)}</span>`;
}
function T(e, t) {
  const i = e.actor || "Unknown", s = e.action || "performed action on", n = I(s, t), { type: r, id: a } = k(e.object), o = N(i) ? b(i, 8) : `<strong>${c(i)}</strong>`;
  let d = "";
  if (r && a) {
    const l = b(a, 8);
    d = `${S(r)} #${l}`;
  } else r ? d = S(r) : a && (d = `#${b(a, 8)}`);
  if (w(s) === "auth") {
    const l = e.metadata?.ip || e.metadata?.IP;
    return l ? `${o} ${c(n)} from ${c(String(l))}` : `${o} ${c(n)}`;
  }
  return d ? `${o} ${c(n)} <strong>${d}</strong>` : `${o} ${c(n)}`;
}
function M(e) {
  if (!e) return "-";
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleString();
}
function O(e) {
  if (!e) return "";
  const t = new Date(e);
  if (Number.isNaN(t.getTime())) return e;
  const s = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), n = Math.floor(s / 1e3), r = Math.floor(n / 60), a = Math.floor(r / 60), o = Math.floor(a / 24);
  return n < 60 ? "just now" : r < 60 ? `${r}m ago` : a < 24 ? `${a}h ago` : o < 7 ? `${o}d ago` : t.toLocaleDateString();
}
function D(e) {
  return !e || typeof e != "object" ? 0 : Object.keys(e).length;
}
function R(e) {
  const t = D(e);
  return t === 0 ? "" : t === 1 ? "1 field" : `${t} fields`;
}
function j(e) {
  if (!e || typeof e != "object") return "";
  const t = Object.entries(e);
  return t.length === 0 ? "" : t.map(([s, n]) => {
    const r = c(s);
    let a;
    if (s.endsWith("_old") || s.endsWith("_new"))
      a = c($(n));
    else if (typeof n == "object" && n !== null) {
      const o = JSON.stringify(n), d = o.length > 100 ? o.substring(0, 100) + "..." : o;
      a = `<code style="font-size: 11px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${c(d)}</code>`;
    } else
      a = c($(n));
    return `
      <div style="display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
        <span style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${r}</span>
        <span style="color: #111827; font-size: 12px; font-weight: 500; word-break: break-word;">${a}</span>
      </div>
    `;
  }).join("");
}
function $(e) {
  return e == null ? "-" : typeof e == "boolean" ? e ? "Yes" : "No" : typeof e == "number" ? String(e) : typeof e == "string" ? e.length > 100 ? e.substring(0, 100) + "..." : e : JSON.stringify(e);
}
function q(e) {
  return e ? A(e, 7) : "";
}
function F(e) {
  return `activity-action--${e}`;
}
function H(e) {
  return `<i class="iconoir-${E[e]} activity-action-icon"></i>`;
}
const z = {
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
}, x = ["q", "verb", "channels", "object_type", "object_id"], v = ["since", "until"], P = ["user_id", "actor_id"];
class V {
  constructor(t, i = {}, s) {
    this.form = null, this.tableBody = null, this.emptyState = null, this.disabledState = null, this.errorState = null, this.countEl = null, this.prevBtn = null, this.nextBtn = null, this.refreshBtn = null, this.clearBtn = null, this.limitInput = null, this.state = {
      limit: 50,
      offset: 0,
      total: 0,
      nextOffset: 0,
      hasMore: !1,
      extraParams: {}
    }, this.config = t, this.selectors = { ...z, ...i }, this.toast = s || window.toastManager || null;
  }
  /**
   * Initialize the activity manager
   */
  init() {
    this.cacheElements(), this.bindEvents(), this.syncFromQuery(), this.loadActivity();
  }
  cacheElements() {
    this.form = document.querySelector(this.selectors.form), this.tableBody = document.querySelector(this.selectors.tableBody), this.emptyState = document.querySelector(this.selectors.emptyState), this.disabledState = document.querySelector(this.selectors.disabledState), this.errorState = document.querySelector(this.selectors.errorState), this.countEl = document.querySelector(this.selectors.countEl), this.prevBtn = document.querySelector(this.selectors.prevBtn), this.nextBtn = document.querySelector(this.selectors.nextBtn), this.refreshBtn = document.querySelector(this.selectors.refreshBtn), this.clearBtn = document.querySelector(this.selectors.clearBtn), this.limitInput = document.querySelector(this.selectors.limitInput);
  }
  bindEvents() {
    this.form?.addEventListener("submit", (t) => {
      t.preventDefault(), this.state.limit = parseInt(this.limitInput?.value || "50", 10) || 50, this.state.offset = 0, this.loadActivity();
    }), this.clearBtn?.addEventListener("click", () => {
      x.forEach((t) => this.setInputValue(t, "")), v.forEach((t) => this.setInputValue(t, "")), this.state.offset = 0, this.loadActivity();
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
    const s = document.getElementById(`filter-${t.replace(/_/g, "-")}`);
    s && (s.value = i || "");
  }
  toLocalInput(t) {
    if (!t) return "";
    const i = new Date(t);
    if (Number.isNaN(i.getTime())) return t;
    const s = i.getTimezoneOffset() * 6e4;
    return new Date(i.getTime() - s).toISOString().slice(0, 16);
  }
  toRFC3339(t) {
    if (!t) return "";
    const i = new Date(t);
    return Number.isNaN(i.getTime()) ? "" : i.toISOString();
  }
  syncFromQuery() {
    const t = new URLSearchParams(window.location.search), i = parseInt(t.get("limit") || "", 10), s = parseInt(t.get("offset") || "", 10);
    !Number.isNaN(i) && i > 0 && (this.state.limit = i), !Number.isNaN(s) && s >= 0 && (this.state.offset = s), this.limitInput && (this.limitInput.value = String(this.state.limit)), x.forEach((n) => this.setInputValue(n, t.get(n) || "")), v.forEach((n) => this.setInputValue(n, this.toLocalInput(t.get(n) || ""))), P.forEach((n) => {
      const r = t.get(n);
      r && (this.state.extraParams[n] = r);
    });
  }
  buildParams() {
    const t = new URLSearchParams();
    return t.set("limit", String(this.state.limit)), t.set("offset", String(this.state.offset)), x.forEach((i) => {
      const s = this.getInputValue(i);
      s && t.set(i, s);
    }), v.forEach((i) => {
      const s = this.toRFC3339(this.getInputValue(i));
      s && t.set(i, s);
    }), Object.entries(this.state.extraParams).forEach(([i, s]) => {
      s && t.set(i, s);
    }), t;
  }
  syncUrl(t) {
    const i = t.toString(), s = i ? `${window.location.pathname}?${i}` : window.location.pathname;
    window.history.replaceState({}, "", s);
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
      const s = await fetch(i, { headers: { Accept: "application/json" } });
      if (!s.ok) {
        let a = null;
        try {
          a = await s.json();
        } catch {
          a = null;
        }
        if (s.status === 404 && a?.text_code === "FEATURE_DISABLED") {
          this.showDisabled(a.message || "Activity feature disabled."), this.renderRows([]), this.updatePagination(0);
          return;
        }
        this.showError(a?.message || `Failed to load activity (${s.status})`);
        return;
      }
      const n = await s.json(), r = Array.isArray(n.entries) ? n.entries : [];
      this.state.total = typeof n.total == "number" ? n.total : r.length, this.state.hasMore = !!n.has_more, this.state.nextOffset = typeof n.next_offset == "number" ? n.next_offset : this.state.offset + r.length, this.renderRows(r), this.updatePagination(r.length);
    } catch {
      this.showError("Failed to load activity.");
    }
  }
  renderRows(t) {
    if (this.tableBody) {
      if (this.tableBody.innerHTML = "", !t || t.length === 0) {
        this.emptyState?.classList.remove("hidden");
        return;
      }
      this.emptyState?.classList.add("hidden"), t.forEach((i) => {
        const { mainRow: s, detailsRow: n } = this.createRowPair(i);
        this.tableBody.appendChild(s), n && this.tableBody.appendChild(n);
      }), this.wireMetadataToggles();
    }
  }
  createRowPair(t) {
    const i = this.config.actionLabels || {}, s = _(t.action, i), n = T(t, i), r = M(t.created_at), a = O(t.created_at), o = R(t.metadata), d = j(t.metadata), p = q(t.channel), l = {
      created: { bg: "#ecfdf5", color: "#10b981", border: "#a7f3d0" },
      updated: { bg: "#eff6ff", color: "#3b82f6", border: "#bfdbfe" },
      deleted: { bg: "#fef2f2", color: "#ef4444", border: "#fecaca" },
      auth: { bg: "#fffbeb", color: "#f59e0b", border: "#fde68a" },
      viewed: { bg: "#f5f3ff", color: "#8b5cf6", border: "#ddd6fe" },
      system: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" }
    }, f = l[s.category] || l.system, h = document.createElement("tr");
    h.className = `activity-row activity-row--${s.category}`;
    let m = "";
    s.namespace ? m = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #f3f4f6; border-radius: 6px; color: #6b7280;" title="${c(s.namespace)}">
            <i class="iconoir-${s.icon}" style="font-size: 14px;"></i>
          </span>
          <span style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${f.bg}; color: ${f.color}; border: 1px solid ${f.border};">
            ${c(s.action)}
          </span>
        </div>
      ` : m = `
        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500; background-color: ${f.bg}; color: ${f.color}; border: 1px solid ${f.border};">
          <i class="iconoir-${s.icon}" style="font-size: 14px;"></i>
          <span>${c(s.action || "-")}</span>
        </span>
      `;
    let g = "";
    t.channel ? g = `
        <span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; font-size: 11px; font-weight: 500; font-family: ui-monospace, monospace; color: #6b7280; background: #f3f4f6; border-radius: 4px; cursor: default;" title="${c(t.channel)}">
          ${c(p)}
        </span>
      ` : g = '<span style="color: #9ca3af; font-size: 12px;">-</span>';
    let y = "";
    o ? y = `
        <button type="button"
                class="activity-metadata-toggle"
                style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; font-size: 12px; color: #6b7280; background: #f3f4f6; border: none; border-radius: 6px; cursor: pointer;"
                aria-expanded="false"
                data-metadata-toggle="${t.id}">
          <span>${o}</span>
          <svg class="activity-metadata-chevron" style="width: 12px; height: 12px; transition: transform 0.15s ease;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      ` : y = '<span style="color: #9ca3af; font-size: 12px;">-</span>', h.innerHTML = `
      <td style="padding: 12px 16px; vertical-align: middle; border-left: 3px solid ${f.color};">
        <div style="font-size: 13px; color: #374151; white-space: nowrap;">${r}</div>
        <div style="font-size: 11px; color: #9ca3af; margin-top: 2px;">${a}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle;">${m}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">
        <div style="font-size: 13px; line-height: 1.5; color: #374151;">${n}</div>
      </td>
      <td style="padding: 12px 16px; vertical-align: middle; text-align: center;">${g}</td>
      <td style="padding: 12px 16px; vertical-align: middle;">${y}</td>
    `;
    let u = null;
    return o && (u = document.createElement("tr"), u.className = "activity-details-row", u.style.display = "none", u.dataset.metadataContent = t.id, u.innerHTML = `
        <td colspan="5" style="padding: 0; background: #f9fafb; border-left: 3px solid ${f.color};">
          <div style="padding: 16px 24px; border-top: 1px solid #e5e7eb;">
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px 24px;">
              ${d}
            </div>
          </div>
        </td>
      `), { mainRow: h, detailsRow: u };
  }
  wireMetadataToggles() {
    document.querySelectorAll("[data-metadata-toggle]").forEach((i) => {
      i.addEventListener("click", () => {
        const s = i.dataset.metadataToggle, n = document.querySelector(`tr[data-metadata-content="${s}"]`);
        if (!n) return;
        const a = !(i.getAttribute("aria-expanded") === "true");
        n.style.display = a ? "table-row" : "none", i.setAttribute("aria-expanded", a ? "true" : "false"), i.style.background = a ? "#e5e7eb" : "#f3f4f6";
        const o = i.querySelector(".activity-metadata-chevron");
        o && (o.style.transform = a ? "rotate(180deg)" : "rotate(0deg)");
      });
    });
  }
  updatePagination(t) {
    const i = Number.isFinite(this.state.total) ? this.state.total : 0, s = t > 0 ? this.state.offset + 1 : 0, n = this.state.offset + t;
    this.countEl && (i > 0 ? this.countEl.textContent = `Showing ${s}-${n} of ${i}` : t > 0 ? this.countEl.textContent = `Showing ${s}-${n}` : this.countEl.textContent = "No activity entries"), this.prevBtn && (this.prevBtn.disabled = this.state.offset <= 0), this.nextBtn && (this.nextBtn.disabled = !this.state.hasMore);
  }
}
export {
  E as ACTION_ICONS,
  V as ActivityManager,
  L as NAMESPACE_ICONS,
  D as countMetadataFields,
  c as escapeHtml,
  T as formatActivitySentence,
  q as formatChannel,
  j as formatMetadataExpanded,
  O as formatRelativeTime,
  M as formatTimestamp,
  w as getActionCategory,
  F as getActionClass,
  H as getActionIconHtml,
  R as getMetadataSummary,
  _ as parseActionString,
  k as parseObject,
  I as resolveActionLabel,
  A as shortenId
};
//# sourceMappingURL=index.js.map
