const y = {
  scopeSelect: "#flag-scope",
  scopeIdInput: "#flag-scope-id",
  applyScopeBtn: "#apply-scope",
  refreshBtn: "#refresh-flags",
  searchInput: "#flag-search",
  mutableState: "#mutable-state",
  tableBody: "#flags-table",
  emptyState: "#flags-empty"
}, d = [
  { value: "unset", label: "Default", icon: "minus" },
  { value: "enabled", label: "Enabled", icon: "check" },
  { value: "disabled", label: "Disabled", icon: "x" }
], u = {
  check: '<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
  x: '<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
  minus: '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>',
  chevronDown: '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
};
class b {
  constructor(e, t = {}, s) {
    this.scopeSelect = null, this.scopeIdInput = null, this.applyScopeBtn = null, this.refreshBtn = null, this.searchInput = null, this.mutableStateEl = null, this.tableBody = null, this.emptyState = null, this.allFlags = [], this.isMutable = !1, this.documentClickHandler = null, this.config = e, this.selectors = { ...y, ...t }, this.toast = s || window.toastManager || null;
  }
  /**
   * Initialize the feature flags manager
   */
  init() {
    this.cacheElements(), this.bindEvents(), this.syncFromQuery(), this.loadFlags();
  }
  /**
   * Destroy the manager and clean up event listeners
   */
  destroy() {
    this.documentClickHandler && (document.removeEventListener("click", this.documentClickHandler), this.documentClickHandler = null);
  }
  cacheElements() {
    this.scopeSelect = document.querySelector(this.selectors.scopeSelect), this.scopeIdInput = document.querySelector(this.selectors.scopeIdInput), this.applyScopeBtn = document.querySelector(this.selectors.applyScopeBtn), this.refreshBtn = document.querySelector(this.selectors.refreshBtn), this.searchInput = document.querySelector(this.selectors.searchInput), this.mutableStateEl = document.querySelector(this.selectors.mutableState), this.tableBody = document.querySelector(this.selectors.tableBody), this.emptyState = document.querySelector(this.selectors.emptyState);
  }
  bindEvents() {
    this.applyScopeBtn?.addEventListener("click", () => this.loadFlags()), this.refreshBtn?.addEventListener("click", () => this.loadFlags()), this.searchInput?.addEventListener("input", () => this.renderFlags(this.allFlags, this.isMutable)), this.documentClickHandler = () => {
      document.querySelectorAll(".action-menu-dropdown").forEach((e) => e.classList.add("hidden"));
    }, document.addEventListener("click", this.documentClickHandler);
  }
  syncFromQuery() {
    const e = new URLSearchParams(window.location.search), t = e.get("scope"), s = e.get("scope_id");
    t && this.scopeSelect && (this.scopeSelect.value = t), s && this.scopeIdInput && (this.scopeIdInput.value = s);
  }
  syncUrl() {
    const e = new URLSearchParams(), t = this.scopeSelect?.value || "system";
    e.set("scope", t), t !== "system" && this.scopeIdInput?.value.trim() && e.set("scope_id", this.scopeIdInput.value.trim());
    const s = e.toString(), o = s ? `${window.location.pathname}?${s}` : window.location.pathname;
    window.history.replaceState({}, "", o);
  }
  buildScopeParams() {
    const e = this.scopeSelect?.value || "system", t = this.scopeIdInput?.value.trim() || "", s = new URLSearchParams();
    return s.set("scope", e), e !== "system" && t && s.set("scope_id", t), { scope: e, scopeId: t, params: s };
  }
  async loadFlags() {
    const { params: e } = this.buildScopeParams();
    this.syncUrl();
    const t = `${this.config.apiPath}?${e.toString()}`;
    try {
      const s = await fetch(t, { headers: { Accept: "application/json" } });
      if (!s.ok) {
        const n = await s.text();
        this.toast?.error(n || "Failed to load flags.");
        return;
      }
      const o = await s.json();
      this.isMutable = !!o.mutable, this.mutableStateEl && (this.mutableStateEl.textContent = this.isMutable ? "Yes" : "No"), this.allFlags = o.flags || [], this.renderFlags(this.allFlags, this.isMutable);
    } catch {
      this.toast?.error("Failed to load flags.");
    }
  }
  async updateFlag(e, t) {
    const { scope: s, scopeId: o } = this.buildScopeParams();
    if (s !== "system" && !o) {
      this.toast?.error("Scope ID required for tenant/org/user scopes."), await this.loadFlags();
      return;
    }
    const n = { key: e, scope: s };
    o && (n.scope_id = o);
    let a = "POST";
    t === "unset" ? a = "DELETE" : n.enabled = t === "enabled";
    try {
      const i = await fetch(this.config.apiPath, {
        method: a,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n)
      });
      if (i.ok)
        this.toast?.success("Flag updated.");
      else {
        const r = await i.text();
        this.toast?.error(r || "Failed to update flag.");
      }
    } catch {
      this.toast?.error("Failed to update flag.");
    }
    await this.loadFlags();
  }
  renderFlags(e, t) {
    if (!this.tableBody || !this.emptyState) return;
    this.tableBody.innerHTML = "";
    const s = (this.searchInput?.value || "").toLowerCase().trim(), o = s ? e.filter((n) => n.key && n.key.toLowerCase().includes(s)) : e;
    if (o.length === 0) {
      this.emptyState.classList.remove("hidden");
      return;
    }
    this.emptyState.classList.add("hidden"), o.forEach((n) => {
      const a = this.createFlagRow(n, t);
      this.tableBody.appendChild(a);
    }), this.wireActionMenus();
  }
  createFlagRow(e, t) {
    const s = e.effective ? "Enabled" : "Disabled", o = this.badge(s, e.effective ? "on" : "off"), n = e.source || "unknown", a = e.default && e.default.set ? e.default.value ? "Enabled" : "Disabled" : "—", i = this.normalizeOverrideState(e), r = e.override && e.override.value !== void 0 ? e.override.value ? "Enabled" : "Disabled" : "—", h = i === "enabled" || i === "disabled" ? r : "Default", p = this.badge(
      h,
      i === "enabled" ? "on" : i === "disabled" ? "off" : "neutral"
    ), m = this.currentOverrideValue(e), l = e.key || "", c = document.createElement("tr");
    return c.innerHTML = `
      <td class="px-5 py-4 text-sm text-gray-900 font-mono">${this.escapeHtml(l)}</td>
      <td class="px-5 py-4 text-sm">${o}</td>
      <td class="px-5 py-4 text-sm text-gray-600 capitalize">${this.escapeHtml(n)}</td>
      <td class="px-5 py-4 text-sm text-gray-600">${a}</td>
      <td class="px-5 py-4 text-sm">${p}</td>
      <td class="px-5 py-4 text-sm">${this.renderActionMenu(l, m, !t)}</td>
    `, c;
  }
  badge(e, t) {
    const s = "status-badge";
    return t === "on" ? `<span class="${s} status-active">${this.escapeHtml(e)}</span>` : t === "off" ? `<span class="${s} status-disabled">${this.escapeHtml(e)}</span>` : `<span class="${s} status-draft">${this.escapeHtml(e)}</span>`;
  }
  normalizeOverrideState(e) {
    return (e.override?.state ? String(e.override.state) : "missing").toLowerCase();
  }
  currentOverrideValue(e) {
    const t = this.normalizeOverrideState(e);
    return t === "enabled" ? "enabled" : t === "disabled" ? "disabled" : "unset";
  }
  renderActionMenu(e, t, s) {
    const o = s ? "opacity-50 pointer-events-none" : "", n = d.find((a) => a.value === t);
    return `
      <div class="relative action-menu ${o}" data-flag-key="${this.escapeHtml(e)}">
        <button type="button" class="action-menu-trigger inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-0" ${s ? "disabled" : ""}>
          <span class="action-menu-label">${n?.label || "Default"}</span>
          ${u.chevronDown}
        </button>
        <div class="action-menu-dropdown hidden absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          ${d.map(
      (a) => `
            <button type="button" data-value="${a.value}" class="action-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${a.value === t ? "bg-gray-50 font-medium" : ""}">
              ${u[a.icon] || ""}
              ${a.label}
            </button>
          `
    ).join("")}
        </div>
      </div>
    `;
  }
  wireActionMenus() {
    document.querySelectorAll(".action-menu").forEach((e) => {
      const t = e.querySelector(".action-menu-trigger"), s = e.querySelector(".action-menu-dropdown"), o = e.querySelectorAll(".action-menu-item"), n = e.dataset.flagKey;
      !t || !s || !n || (t.addEventListener("click", (a) => {
        a.stopPropagation(), document.querySelectorAll(".action-menu-dropdown").forEach((i) => {
          i !== s && i.classList.add("hidden");
        }), s.classList.toggle("hidden");
      }), o.forEach((a) => {
        a.addEventListener("click", async (i) => {
          i.stopPropagation();
          const r = a.dataset.value;
          s.classList.add("hidden"), await this.updateFlag(n, r);
        });
      }));
    });
  }
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
}
export {
  b as FeatureFlagsManager
};
//# sourceMappingURL=index.js.map
