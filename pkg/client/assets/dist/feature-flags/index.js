import { S as B, E as d, c, U as u } from "../chunks/entity-renderer-DxPxigz0.js";
import { escapeHTML as l } from "../shared/html.js";
import { readHTTPError as g } from "../shared/transport/http-client.js";
class v {
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
    t ? (this.searchBox = new B({
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
function E(n) {
  const e = (n || "").trim().replace(/\/+$/, ""), t = /\/api(\/|$)/.test(e) ? e : `${e || ""}/api`;
  return [
    {
      scope: "tenant",
      resolver: c(`${t}/tenants`, {
        labelField: (s) => String(s.name || ""),
        descriptionField: (s) => String(s.slug || ""),
        searchParam: "q"
      }),
      renderer: new d({
        badgeField: "status"
      }),
      placeholder: "Search tenants by name..."
    },
    {
      scope: "org",
      resolver: c(`${t}/organizations`, {
        labelField: (s) => String(s.name || ""),
        searchParam: "q"
      }),
      renderer: new d({
        badgeField: "status"
      }),
      placeholder: "Search organizations..."
    },
    {
      scope: "user",
      resolver: c(`${t}/users`, {
        labelField: (s) => String(s.displayName || s.username || s.email || ""),
        descriptionField: (s) => String(s.email || ""),
        searchParam: "q"
      }),
      renderer: new u({
        avatarField: "avatar",
        emailField: "email",
        roleField: "role"
      }),
      placeholder: "Search users..."
    }
  ];
}
function P(n) {
  const t = [
    {
      scope: "tenant",
      resolver: c(`${n.basePath}/crud/tenants`, {
        labelField: (s) => String(s.name || ""),
        descriptionField: (s) => String(s.slug || ""),
        searchParam: "q"
      }),
      renderer: new d({
        badgeField: "status"
      }),
      placeholder: "Search tenants..."
    },
    {
      scope: "org",
      resolver: c(`${n.basePath}/crud/organizations`, {
        labelField: (s) => String(s.name || ""),
        searchParam: "q"
      }),
      renderer: new d({
        badgeField: "status"
      }),
      placeholder: "Search organizations..."
    },
    {
      scope: "user",
      resolver: c(`${n.basePath}/crud/users`, {
        labelField: (s) => String(s.display_name || s.username || s.email || ""),
        descriptionField: (s) => String(s.email || ""),
        searchParam: "q"
      }),
      renderer: new u({
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
  return new v({
    input: n.inputSelector,
    scopeSelect: n.scopeSelectSelector,
    container: n.containerSelector,
    scopeConfigs: t,
    onSelect: n.onSelect,
    onScopeChange: n.onScopeChange
  });
}
const C = {
  scopeSelect: "#flag-scope",
  scopeIdInput: "#flag-scope-id",
  applyScopeBtn: "#apply-scope",
  refreshBtn: "#refresh-flags",
  searchInput: "#flag-search",
  mutableState: "#mutable-state",
  tableBody: "#flags-table",
  emptyState: "#flags-empty"
}, f = [
  { value: "unset", label: "Default", icon: "minus" },
  { value: "enabled", label: "Enabled", icon: "check" },
  { value: "disabled", label: "Disabled", icon: "x" }
], y = {
  check: '<svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
  x: '<svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
  minus: '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>',
  chevronDown: '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>'
};
class L {
  constructor(e, t = {}, s) {
    this.scopeSelect = null, this.scopeIdInput = null, this.applyScopeBtn = null, this.refreshBtn = null, this.searchInput = null, this.mutableStateEl = null, this.tableBody = null, this.emptyState = null, this.allFlags = [], this.isMutable = !1, this.documentClickHandler = null, this.scopeSearchBox = null, this.config = e, this.selectors = { ...C, ...t }, this.toast = s || window.toastManager || null;
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
    t && (t.style.position = "relative", this.scopeSearchBox = new v({
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
        resolver: c(`${e}/crud/tenants`, {
          labelField: (t) => String(t.name || ""),
          descriptionField: (t) => String(t.slug || ""),
          searchParam: "q"
        }),
        renderer: new d({
          badgeField: "status"
        }),
        placeholder: "Search tenants...",
        minChars: 1
      },
      {
        scope: "org",
        resolver: c(`${e}/crud/organizations`, {
          labelField: (t) => String(t.name || ""),
          searchParam: "q"
        }),
        renderer: new d({
          badgeField: "status"
        }),
        placeholder: "Search organizations...",
        minChars: 1
      },
      {
        scope: "user",
        resolver: c(`${e}/crud/users`, {
          labelField: (t) => String(t.display_name || t.username || t.email || "Unknown"),
          descriptionField: (t) => String(t.email || ""),
          searchParam: "q"
        }),
        renderer: new u({
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
        const o = await g(s, "Failed to load flags.", {
          appendStatusToFallback: !1
        });
        this.toast?.error(o);
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
        const h = await g(i, "Failed to update flag.", {
          appendStatusToFallback: !1
        });
        this.toast?.error(h);
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
    const s = e.effective ? "Enabled" : "Disabled", r = this.badge(s, e.effective ? "on" : "off"), o = e.source || "unknown", a = e.default && e.default.set ? e.default.value ? "Enabled" : "Disabled" : "—", i = this.normalizeOverrideState(e), h = e.override && e.override.value !== void 0 ? e.override.value ? "Enabled" : "Disabled" : "—", b = i === "enabled" || i === "disabled" ? h : "Default", w = this.badge(
      b,
      i === "enabled" ? "on" : i === "disabled" ? "off" : "neutral"
    ), x = this.currentOverrideValue(e), p = e.key || "", S = e.description ? l(e.description) : "", F = S ? `<div class="mt-1 text-xs text-gray-500">${S}</div>` : "", m = document.createElement("tr");
    return m.innerHTML = `
      <td class="px-5 py-4 text-sm">
        <div class="text-gray-900 font-mono">${l(p)}</div>
        ${F}
      </td>
      <td class="px-5 py-4 text-sm">${r}</td>
      <td class="px-5 py-4 text-sm text-gray-600 capitalize">${l(o)}</td>
      <td class="px-5 py-4 text-sm text-gray-600">${a}</td>
      <td class="px-5 py-4 text-sm">${w}</td>
      <td class="px-5 py-4 text-sm">${this.renderActionMenu(p, x, !t)}</td>
    `, m;
  }
  badge(e, t) {
    const s = "status-badge";
    return t === "on" ? `<span class="${s} status-active">${l(e)}</span>` : t === "off" ? `<span class="${s} status-disabled">${l(e)}</span>` : `<span class="${s} status-draft">${l(e)}</span>`;
  }
  normalizeOverrideState(e) {
    return (e.override?.state ? String(e.override.state) : "missing").toLowerCase();
  }
  currentOverrideValue(e) {
    const t = this.normalizeOverrideState(e);
    return t === "enabled" ? "enabled" : t === "disabled" ? "disabled" : "unset";
  }
  renderActionMenu(e, t, s) {
    const r = s ? "opacity-50 pointer-events-none" : "", o = f.find((a) => a.value === t);
    return `
      <div class="relative action-menu ${r}" data-flag-key="${l(e)}">
        <button type="button" class="action-menu-trigger inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-0" ${s ? "disabled" : ""}>
          <span class="action-menu-label">${o?.label || "Default"}</span>
          ${y.chevronDown}
        </button>
        <div class="action-menu-dropdown hidden absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
          ${f.map(
      (a) => `
            <button type="button" data-value="${a.value}" class="action-menu-item w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${a.value === t ? "bg-gray-50 font-medium" : ""}">
              ${y[a.icon] || ""}
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
          const h = a.dataset.value;
          s.classList.add("hidden"), await this.updateFlag(o, h);
        });
      }));
    });
  }
}
export {
  L as FeatureFlagsManager,
  v as ScopeSearchBox,
  E as createDefaultScopeConfigs,
  P as createScopeSearchBox
};
//# sourceMappingURL=index.js.map
