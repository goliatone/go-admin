import { S as b, E as c, c as l, U as h } from "../chunks/entity-renderer-Ck4g7jIm.js";
class g {
  constructor(e) {
    if (this.searchBox = null, this.scopeConfigs = /* @__PURE__ */ new Map(), this.currentScope = "system", this.selectedResult = null, this.config = e, typeof e.input == "string") {
      const t = document.querySelector(e.input);
      if (!t) throw new Error(`ScopeSearchBox: Input element not found: ${e.input}`);
      this.input = t;
    } else
      this.input = e.input;
    if (typeof e.scopeSelect == "string") {
      const t = document.querySelector(e.scopeSelect);
      if (!t) throw new Error(`ScopeSearchBox: Scope select not found: ${e.scopeSelect}`);
      this.scopeSelect = t;
    } else
      this.scopeSelect = e.scopeSelect;
    if (e.container)
      if (typeof e.container == "string") {
        const t = document.querySelector(e.container);
        if (!t) throw new Error(`ScopeSearchBox: Container not found: ${e.container}`);
        this.container = t;
      } else
        this.container = e.container;
    else
      this.container = this.input.parentElement || document.body;
    for (const t of e.scopeConfigs)
      this.scopeConfigs.set(t.scope, t);
  }
  /**
   * Initialize the scope search box
   */
  init() {
    this.bindScopeSelect(), this.currentScope = this.scopeSelect.value || "system", this.updateForScope(this.currentScope);
  }
  /**
   * Destroy and clean up
   */
  destroy() {
    this.searchBox && (this.searchBox.destroy(), this.searchBox = null);
  }
  /**
   * Get the currently selected scope type
   */
  getScope() {
    return this.currentScope;
  }
  /**
   * Get the currently selected scope ID
   */
  getScopeId() {
    return this.input.value.trim();
  }
  /**
   * Get the selected result data
   */
  getSelectedResult() {
    return this.selectedResult;
  }
  /**
   * Programmatically set the scope
   */
  setScope(e) {
    this.scopeSelect.value = e, this.updateForScope(e);
  }
  /**
   * Programmatically set the scope ID
   */
  setScopeId(e) {
    this.input.value = e, this.searchBox && this.searchBox.setValue(e);
  }
  /**
   * Clear the scope ID
   */
  clear() {
    this.selectedResult = null, this.searchBox ? this.searchBox.clear() : this.input.value = "", this.config.onClear?.();
  }
  bindScopeSelect() {
    this.scopeSelect.addEventListener("change", () => {
      const e = this.scopeSelect.value;
      this.updateForScope(e), this.config.onScopeChange?.(e);
    });
  }
  updateForScope(e) {
    if (this.currentScope = e, this.selectedResult = null, this.searchBox && (this.searchBox.destroy(), this.searchBox = null), e === "system") {
      this.input.value = "", this.input.disabled = !0, this.input.placeholder = "N/A (System scope)";
      return;
    }
    this.input.disabled = !1, this.input.value = "";
    const t = this.scopeConfigs.get(e);
    t ? (this.searchBox = new b({
      input: this.input,
      container: this.container,
      resolver: t.resolver,
      renderer: t.renderer,
      placeholder: t.placeholder || this.getDefaultPlaceholder(e),
      minChars: t.minChars ?? 2,
      onSelect: (s) => {
        this.selectedResult = s, this.config.onSelect?.(e, s);
      },
      onClear: () => {
        this.selectedResult = null, this.config.onClear?.();
      }
    }), this.searchBox.init()) : this.input.placeholder = this.getDefaultPlaceholder(e);
  }
  getDefaultPlaceholder(e) {
    const t = {
      system: "N/A",
      tenant: "Search tenants...",
      org: "Search organizations...",
      user: "Search users..."
    };
    return this.config.defaultPlaceholder || t[e] || "Enter ID...";
  }
}
function F(n) {
  return [
    {
      scope: "tenant",
      resolver: l(`${n}/api/tenants`, {
        labelField: (e) => String(e.name || ""),
        descriptionField: (e) => String(e.slug || ""),
        searchParam: "q"
      }),
      renderer: new c({
        badgeField: "status"
      }),
      placeholder: "Search tenants by name..."
    },
    {
      scope: "org",
      resolver: l(`${n}/api/organizations`, {
        labelField: (e) => String(e.name || ""),
        searchParam: "q"
      }),
      renderer: new c({
        badgeField: "status"
      }),
      placeholder: "Search organizations..."
    },
    {
      scope: "user",
      resolver: l(`${n}/api/users`, {
        labelField: (e) => String(e.displayName || e.username || e.email || ""),
        descriptionField: (e) => String(e.email || ""),
        searchParam: "q"
      }),
      renderer: new h({
        avatarField: "avatar",
        emailField: "email",
        roleField: "role"
      }),
      placeholder: "Search users..."
    }
  ];
}
function B(n) {
  const t = [
    {
      scope: "tenant",
      resolver: l(`${n.basePath}/crud/tenants`, {
        labelField: (s) => String(s.name || ""),
        descriptionField: (s) => String(s.slug || ""),
        searchParam: "q"
      }),
      renderer: new c({
        badgeField: "status"
      }),
      placeholder: "Search tenants..."
    },
    {
      scope: "org",
      resolver: l(`${n.basePath}/crud/organizations`, {
        labelField: (s) => String(s.name || ""),
        searchParam: "q"
      }),
      renderer: new c({
        badgeField: "status"
      }),
      placeholder: "Search organizations..."
    },
    {
      scope: "user",
      resolver: l(`${n.basePath}/crud/users`, {
        labelField: (s) => String(s.display_name || s.username || s.email || ""),
        descriptionField: (s) => String(s.email || ""),
        searchParam: "q"
      }),
      renderer: new h({
        avatarField: "avatar",
        emailField: "email",
        roleField: "role"
      }),
      placeholder: "Search users..."
    }
  ].map((s) => {
    const r = n.customConfigs?.[s.scope];
    return r ? { ...s, ...r } : s;
  });
  return new g({
    input: n.inputSelector,
    scopeSelect: n.scopeSelectSelector,
    container: n.containerSelector,
    scopeConfigs: t,
    onSelect: n.onSelect,
    onScopeChange: n.onScopeChange
  });
}
const w = {
  scopeSelect: "#flag-scope",
  scopeIdInput: "#flag-scope-id",
  applyScopeBtn: "#apply-scope",
  refreshBtn: "#refresh-flags",
  searchInput: "#flag-search",
  mutableState: "#mutable-state",
  tableBody: "#flags-table",
  emptyState: "#flags-empty"
}, S = [
  { value: "unset", label: "Default", icon: "minus" },
  { value: "enabled", label: "Enabled", icon: "check" },
  { value: "disabled", label: "Disabled", icon: "x" }
], m = {
  check: '<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
  x: '<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
  minus: '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>',
  chevronDown: '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
};
class C {
  constructor(e, t = {}, s) {
    this.scopeSelect = null, this.scopeIdInput = null, this.applyScopeBtn = null, this.refreshBtn = null, this.searchInput = null, this.mutableStateEl = null, this.tableBody = null, this.emptyState = null, this.allFlags = [], this.isMutable = !1, this.documentClickHandler = null, this.scopeSearchBox = null, this.config = e, this.selectors = { ...w, ...t }, this.toast = s || window.toastManager || null;
  }
  /**
   * Initialize the feature flags manager
   */
  init() {
    this.cacheElements(), this.bindEvents(), this.initScopeSearch(), this.syncFromQuery(), this.loadFlags();
  }
  /**
   * Destroy the manager and clean up event listeners
   */
  destroy() {
    this.documentClickHandler && (document.removeEventListener("click", this.documentClickHandler), this.documentClickHandler = null), this.scopeSearchBox && (this.scopeSearchBox.destroy(), this.scopeSearchBox = null);
  }
  cacheElements() {
    this.scopeSelect = document.querySelector(this.selectors.scopeSelect), this.scopeIdInput = document.querySelector(this.selectors.scopeIdInput), this.applyScopeBtn = document.querySelector(this.selectors.applyScopeBtn), this.refreshBtn = document.querySelector(this.selectors.refreshBtn), this.searchInput = document.querySelector(this.selectors.searchInput), this.mutableStateEl = document.querySelector(this.selectors.mutableState), this.tableBody = document.querySelector(this.selectors.tableBody), this.emptyState = document.querySelector(this.selectors.emptyState);
  }
  bindEvents() {
    this.applyScopeBtn?.addEventListener("click", () => this.loadFlags()), this.refreshBtn?.addEventListener("click", () => this.loadFlags()), this.searchInput?.addEventListener("input", () => this.renderFlags(this.allFlags, this.isMutable)), this.documentClickHandler = () => {
      document.querySelectorAll(".action-menu-dropdown").forEach((e) => e.classList.add("hidden"));
    }, document.addEventListener("click", this.documentClickHandler);
  }
  initScopeSearch() {
    if (!this.scopeSelect || !this.scopeIdInput) return;
    const e = this.buildScopeConfigs(), t = this.scopeIdInput.parentElement;
    t && (t.style.position = "relative", this.scopeSearchBox = new g({
      input: this.scopeIdInput,
      scopeSelect: this.scopeSelect,
      container: t,
      scopeConfigs: e,
      onSelect: (s, r) => {
        this.scopeIdInput && (this.scopeIdInput.value = r.id);
      },
      onScopeChange: (s) => {
        s === "system" && this.loadFlags();
      },
      onClear: () => {
      }
    }), this.scopeSearchBox.init());
  }
  buildScopeConfigs() {
    const e = this.config.basePath;
    return [
      {
        scope: "tenant",
        resolver: l(`${e}/crud/tenants`, {
          labelField: (t) => String(t.name || ""),
          descriptionField: (t) => String(t.slug || ""),
          searchParam: "q"
        }),
        renderer: new c({
          badgeField: "status"
        }),
        placeholder: "Search tenants...",
        minChars: 1
      },
      {
        scope: "org",
        resolver: l(`${e}/crud/organizations`, {
          labelField: (t) => String(t.name || ""),
          searchParam: "q"
        }),
        renderer: new c({
          badgeField: "status"
        }),
        placeholder: "Search organizations...",
        minChars: 1
      },
      {
        scope: "user",
        resolver: l(`${e}/crud/users`, {
          labelField: (t) => String(t.display_name || t.username || t.email || "Unknown"),
          descriptionField: (t) => String(t.email || ""),
          searchParam: "q"
        }),
        renderer: new h({
          avatarField: "avatar",
          emailField: "email",
          roleField: "role"
        }),
        placeholder: "Search users...",
        minChars: 1
      }
    ];
  }
  syncFromQuery() {
    const e = new URLSearchParams(window.location.search), t = e.get("scope"), s = e.get("scope_id");
    t && this.scopeSearchBox ? (this.scopeSearchBox.setScope(t), s && this.scopeSearchBox.setScopeId(s)) : (t && this.scopeSelect && (this.scopeSelect.value = t), s && this.scopeIdInput && (this.scopeIdInput.value = s));
  }
  syncUrl() {
    const e = new URLSearchParams(), t = this.scopeSelect?.value || "system";
    e.set("scope", t), t !== "system" && this.scopeIdInput?.value.trim() && e.set("scope_id", this.scopeIdInput.value.trim());
    const s = e.toString(), r = s ? `${window.location.pathname}?${s}` : window.location.pathname;
    window.history.replaceState({}, "", r);
  }
  buildScopeParams() {
    const e = this.scopeSearchBox?.getScope() || this.scopeSelect?.value || "system", t = this.scopeSearchBox?.getScopeId() || this.scopeIdInput?.value.trim() || "", s = new URLSearchParams();
    return s.set("scope", e), e !== "system" && t && s.set("scope_id", t), { scope: e, scopeId: t, params: s };
  }
  async loadFlags() {
    const { params: e } = this.buildScopeParams();
    this.syncUrl();
    const t = `${this.config.apiPath}?${e.toString()}`;
    try {
      const s = await fetch(t, { headers: { Accept: "application/json" } });
      if (!s.ok) {
        const o = await s.text();
        this.toast?.error(o || "Failed to load flags.");
        return;
      }
      const r = await s.json();
      this.isMutable = !!r.mutable, this.mutableStateEl && (this.mutableStateEl.textContent = this.isMutable ? "Yes" : "No"), this.allFlags = r.flags || [], this.renderFlags(this.allFlags, this.isMutable);
    } catch {
      this.toast?.error("Failed to load flags.");
    }
  }
  async updateFlag(e, t) {
    const { scope: s, scopeId: r } = this.buildScopeParams();
    if (s !== "system" && !r) {
      this.toast?.error("Scope ID required for tenant/org/user scopes."), await this.loadFlags();
      return;
    }
    const o = { key: e, scope: s };
    r && (o.scope_id = r);
    let a = "POST";
    t === "unset" ? a = "DELETE" : o.enabled = t === "enabled";
    try {
      const i = await fetch(this.config.apiPath, {
        method: a,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o)
      });
      if (i.ok)
        this.toast?.success("Flag updated.");
      else {
        const d = await i.text();
        this.toast?.error(d || "Failed to update flag.");
      }
    } catch {
      this.toast?.error("Failed to update flag.");
    }
    await this.loadFlags();
  }
  renderFlags(e, t) {
    if (!this.tableBody || !this.emptyState) return;
    this.tableBody.innerHTML = "";
    const s = (this.searchInput?.value || "").toLowerCase().trim(), r = s ? e.filter((o) => o.key && o.key.toLowerCase().includes(s)) : e;
    if (r.length === 0) {
      this.emptyState.classList.remove("hidden");
      return;
    }
    this.emptyState.classList.add("hidden"), r.forEach((o) => {
      const a = this.createFlagRow(o, t);
      this.tableBody.appendChild(a);
    }), this.wireActionMenus();
  }
  createFlagRow(e, t) {
    const s = e.effective ? "Enabled" : "Disabled", r = this.badge(s, e.effective ? "on" : "off"), o = e.source || "unknown", a = e.default && e.default.set ? e.default.value ? "Enabled" : "Disabled" : "—", i = this.normalizeOverrideState(e), d = e.override && e.override.value !== void 0 ? e.override.value ? "Enabled" : "Disabled" : "—", f = i === "enabled" || i === "disabled" ? d : "Default", y = this.badge(
      f,
      i === "enabled" ? "on" : i === "disabled" ? "off" : "neutral"
    ), v = this.currentOverrideValue(e), u = e.key || "", p = document.createElement("tr");
    return p.innerHTML = `
      <td class="px-5 py-4 text-sm text-gray-900 font-mono">${this.escapeHtml(u)}</td>
      <td class="px-5 py-4 text-sm">${r}</td>
      <td class="px-5 py-4 text-sm text-gray-600 capitalize">${this.escapeHtml(o)}</td>
      <td class="px-5 py-4 text-sm text-gray-600">${a}</td>
      <td class="px-5 py-4 text-sm">${y}</td>
      <td class="px-5 py-4 text-sm">${this.renderActionMenu(u, v, !t)}</td>
    `, p;
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
    const r = s ? "opacity-50 pointer-events-none" : "", o = S.find((a) => a.value === t);
    return `
      <div class="relative action-menu ${r}" data-flag-key="${this.escapeHtml(e)}">
        <button type="button" class="action-menu-trigger inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-0" ${s ? "disabled" : ""}>
          <span class="action-menu-label">${o?.label || "Default"}</span>
          ${m.chevronDown}
        </button>
        <div class="action-menu-dropdown hidden absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          ${S.map(
      (a) => `
            <button type="button" data-value="${a.value}" class="action-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${a.value === t ? "bg-gray-50 font-medium" : ""}">
              ${m[a.icon] || ""}
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
      const t = e.querySelector(".action-menu-trigger"), s = e.querySelector(".action-menu-dropdown"), r = e.querySelectorAll(".action-menu-item"), o = e.dataset.flagKey;
      !t || !s || !o || (t.addEventListener("click", (a) => {
        a.stopPropagation(), document.querySelectorAll(".action-menu-dropdown").forEach((i) => {
          i !== s && i.classList.add("hidden");
        }), s.classList.toggle("hidden");
      }), r.forEach((a) => {
        a.addEventListener("click", async (i) => {
          i.stopPropagation();
          const d = a.dataset.value;
          s.classList.add("hidden"), await this.updateFlag(o, d);
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
  C as FeatureFlagsManager,
  g as ScopeSearchBox,
  F as createDefaultScopeConfigs,
  B as createScopeSearchBox
};
//# sourceMappingURL=index.js.map
