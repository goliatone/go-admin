const S = {
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
}, b = {
  created: "plus",
  updated: "edit-pencil",
  deleted: "trash",
  auth: "key",
  viewed: "eye",
  system: "settings"
};
function g(e) {
  if (!e) return "system";
  const t = e.toLowerCase().trim().replace(/-/g, "_");
  return S[t] || "system";
}
function w(e) {
  if (!e) return { type: "", id: "" };
  if (!e.includes(":"))
    return { type: e, id: "" };
  const t = e.indexOf(":");
  return {
    type: e.substring(0, t),
    id: e.substring(t + 1)
  };
}
function x(e) {
  return e ? e.charAt(0).toUpperCase() + e.slice(1) : "";
}
function m(e) {
  return e ? e.split(/[_-]/).map(x).join(" ") : "";
}
function $(e) {
  const t = e.actor || "Unknown", s = e.action || "performed action on", { type: i, id: a } = w(e.object);
  let n = "";
  if (i && a ? n = `${m(i)} #${a}` : i ? n = m(i) : a && (n = `#${a}`), g(s) === "auth") {
    const c = e.metadata?.ip || e.metadata?.IP;
    return c ? `<strong>${o(t)}</strong> ${o(s)} from ${o(String(c))}` : `<strong>${o(t)}</strong> ${o(s)}`;
  }
  return n ? `<strong>${o(t)}</strong> ${o(s)} <strong>${o(n)}</strong>` : `<strong>${o(t)}</strong> ${o(s)}`;
}
function E(e) {
  if (!e) return "-";
  const t = new Date(e);
  return Number.isNaN(t.getTime()) ? e : t.toLocaleString();
}
function B(e) {
  if (!e) return "";
  const t = new Date(e);
  if (Number.isNaN(t.getTime())) return e;
  const i = (/* @__PURE__ */ new Date()).getTime() - t.getTime(), a = Math.floor(i / 1e3), n = Math.floor(a / 60), r = Math.floor(n / 60), c = Math.floor(r / 24);
  return a < 60 ? "just now" : n < 60 ? `${n}m ago` : r < 24 ? `${r}h ago` : c < 7 ? `${c}d ago` : t.toLocaleDateString();
}
function I(e) {
  return !e || typeof e != "object" ? 0 : Object.keys(e).length;
}
function _(e) {
  const t = I(e);
  return t === 0 ? "" : t === 1 ? "1 field" : `${t} fields`;
}
function A(e) {
  if (!e || typeof e != "object") return "";
  const t = Object.entries(e);
  return t.length === 0 ? "" : t.map(([i, a]) => {
    const n = o(i);
    let r;
    return i.endsWith("_old") || i.endsWith("_new") ? r = o(p(a)) : typeof a == "object" && a !== null ? r = `<code class="text-xs">${o(JSON.stringify(a))}</code>` : r = o(p(a)), `
      <div class="flex items-start justify-between gap-2 py-1">
        <span class="text-gray-500 text-xs">${n}</span>
        <span class="text-gray-900 text-xs font-medium text-right">${r}</span>
      </div>
    `;
  }).join("");
}
function p(e) {
  return e == null ? "-" : typeof e == "boolean" ? e ? "Yes" : "No" : typeof e == "number" ? String(e) : typeof e == "string" ? e.length > 100 ? e.substring(0, 100) + "..." : e : JSON.stringify(e);
}
function o(e) {
  const t = document.createElement("div");
  return t.textContent = e, t.innerHTML;
}
function M(e) {
  return `activity-action--${e}`;
}
function L(e) {
  return `<i class="iconoir-${b[e]} activity-action-icon"></i>`;
}
const N = {
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
}, u = ["q", "verb", "channels", "object_type", "object_id"], h = ["since", "until"], T = ["user_id", "actor_id"];
class C {
  constructor(t, s = {}, i) {
    this.form = null, this.tableBody = null, this.emptyState = null, this.disabledState = null, this.errorState = null, this.countEl = null, this.prevBtn = null, this.nextBtn = null, this.refreshBtn = null, this.clearBtn = null, this.limitInput = null, this.state = {
      limit: 50,
      offset: 0,
      total: 0,
      nextOffset: 0,
      hasMore: !1,
      extraParams: {}
    }, this.config = t, this.selectors = { ...N, ...s }, this.toast = i || window.toastManager || null;
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
      u.forEach((t) => this.setInputValue(t, "")), h.forEach((t) => this.setInputValue(t, "")), this.state.offset = 0, this.loadActivity();
    }), this.prevBtn?.addEventListener("click", () => {
      this.state.offset = Math.max(0, this.state.offset - this.state.limit), this.loadActivity();
    }), this.nextBtn?.addEventListener("click", () => {
      this.state.hasMore && (this.state.offset = this.state.nextOffset, this.loadActivity());
    }), this.refreshBtn?.addEventListener("click", () => {
      this.loadActivity();
    });
  }
  getInputValue(t) {
    const s = document.getElementById(`filter-${t.replace(/_/g, "-")}`);
    return s ? String(s.value || "").trim() : "";
  }
  setInputValue(t, s) {
    const i = document.getElementById(`filter-${t.replace(/_/g, "-")}`);
    i && (i.value = s || "");
  }
  toLocalInput(t) {
    if (!t) return "";
    const s = new Date(t);
    if (Number.isNaN(s.getTime())) return t;
    const i = s.getTimezoneOffset() * 6e4;
    return new Date(s.getTime() - i).toISOString().slice(0, 16);
  }
  toRFC3339(t) {
    if (!t) return "";
    const s = new Date(t);
    return Number.isNaN(s.getTime()) ? "" : s.toISOString();
  }
  syncFromQuery() {
    const t = new URLSearchParams(window.location.search), s = parseInt(t.get("limit") || "", 10), i = parseInt(t.get("offset") || "", 10);
    !Number.isNaN(s) && s > 0 && (this.state.limit = s), !Number.isNaN(i) && i >= 0 && (this.state.offset = i), this.limitInput && (this.limitInput.value = String(this.state.limit)), u.forEach((a) => this.setInputValue(a, t.get(a) || "")), h.forEach((a) => this.setInputValue(a, this.toLocalInput(t.get(a) || ""))), T.forEach((a) => {
      const n = t.get(a);
      n && (this.state.extraParams[a] = n);
    });
  }
  buildParams() {
    const t = new URLSearchParams();
    return t.set("limit", String(this.state.limit)), t.set("offset", String(this.state.offset)), u.forEach((s) => {
      const i = this.getInputValue(s);
      i && t.set(s, i);
    }), h.forEach((s) => {
      const i = this.toRFC3339(this.getInputValue(s));
      i && t.set(s, i);
    }), Object.entries(this.state.extraParams).forEach(([s, i]) => {
      i && t.set(s, i);
    }), t;
  }
  syncUrl(t) {
    const s = t.toString(), i = s ? `${window.location.pathname}?${s}` : window.location.pathname;
    window.history.replaceState({}, "", i);
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
    const s = `${this.config.apiPath}?${t.toString()}`;
    try {
      const i = await fetch(s, { headers: { Accept: "application/json" } });
      if (!i.ok) {
        let r = null;
        try {
          r = await i.json();
        } catch {
          r = null;
        }
        if (i.status === 404 && r?.text_code === "FEATURE_DISABLED") {
          this.showDisabled(r.message || "Activity feature disabled."), this.renderRows([]), this.updatePagination(0);
          return;
        }
        this.showError(r?.message || `Failed to load activity (${i.status})`);
        return;
      }
      const a = await i.json(), n = Array.isArray(a.entries) ? a.entries : [];
      this.state.total = typeof a.total == "number" ? a.total : n.length, this.state.hasMore = !!a.has_more, this.state.nextOffset = typeof a.next_offset == "number" ? a.next_offset : this.state.offset + n.length, this.renderRows(n), this.updatePagination(n.length);
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
      this.emptyState?.classList.add("hidden"), t.forEach((s) => {
        const i = this.createRow(s);
        this.tableBody.appendChild(i);
      }), this.wireMetadataToggles();
    }
  }
  createRow(t) {
    const s = g(t.action), i = $(t), a = E(t.created_at), n = B(t.created_at), r = _(t.metadata), c = A(t.metadata), d = document.createElement("tr");
    d.className = `activity-row activity-row--${s}`;
    const y = `
      <span class="activity-action-badge activity-action-badge--${s}">
        ${L(s)}
        <span>${o(t.action || "-")}</span>
      </span>
    `;
    let l = "";
    if (r) {
      const f = `metadata-${t.id}`;
      l = `
        <div class="activity-metadata">
          <button type="button"
                  class="activity-metadata-toggle"
                  aria-expanded="false"
                  aria-controls="${f}"
                  data-metadata-toggle="${t.id}">
            <span>${r}</span>
            <svg class="activity-metadata-chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          <div id="${f}"
               class="activity-metadata-content"
               data-expanded="false"
               data-metadata-content="${t.id}">
            ${c}
          </div>
        </div>
      `;
    } else
      l = '<span class="activity-metadata-empty">-</span>';
    const v = t.channel ? `<span class="activity-channel">${o(t.channel)}</span>` : '<span class="text-gray-400">-</span>';
    return d.innerHTML = `
      <td class="px-4 py-3">
        <div class="activity-timestamp">${a}</div>
        <div class="activity-timestamp-relative">${n}</div>
      </td>
      <td class="px-4 py-3">${y}</td>
      <td class="px-4 py-3">
        <div class="activity-sentence">${i}</div>
      </td>
      <td class="px-4 py-3">${v}</td>
      <td class="px-4 py-3">${l}</td>
    `, d;
  }
  wireMetadataToggles() {
    document.querySelectorAll("[data-metadata-toggle]").forEach((s) => {
      s.addEventListener("click", () => {
        const i = s.dataset.metadataToggle, a = document.querySelector(`[data-metadata-content="${i}"]`);
        if (!a) return;
        const n = a.dataset.expanded === "true";
        a.dataset.expanded = n ? "false" : "true", s.setAttribute("aria-expanded", n ? "false" : "true");
      });
    });
  }
  updatePagination(t) {
    const s = Number.isFinite(this.state.total) ? this.state.total : 0, i = t > 0 ? this.state.offset + 1 : 0, a = this.state.offset + t;
    this.countEl && (s > 0 ? this.countEl.textContent = `Showing ${i}-${a} of ${s}` : t > 0 ? this.countEl.textContent = `Showing ${i}-${a}` : this.countEl.textContent = "No activity entries"), this.prevBtn && (this.prevBtn.disabled = this.state.offset <= 0), this.nextBtn && (this.nextBtn.disabled = !this.state.hasMore);
  }
}
export {
  b as ACTION_ICONS,
  C as ActivityManager,
  I as countMetadataFields,
  o as escapeHtml,
  $ as formatActivitySentence,
  A as formatMetadataExpanded,
  B as formatRelativeTime,
  E as formatTimestamp,
  g as getActionCategory,
  M as getActionClass,
  L as getActionIconHtml,
  _ as getMetadataSummary,
  w as parseObject
};
//# sourceMappingURL=index.js.map
