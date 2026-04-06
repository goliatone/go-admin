import { escapeHTML as n } from "../shared/html.js";
var u = {
  minChars: 2,
  debounceMs: 300,
  placeholder: "Search...",
  emptyText: "No results found",
  loadingText: "Searching...",
  maxResults: 10,
  dropdownClass: ""
}, v = class {
  constructor(e) {
    if (this.dropdown = null, this.debounceTimer = null, this.abortController = null, this.documentClickHandler = null, this.handleInput = () => {
      const t = this.input.value.trim();
      if (this.state.query = t, t.length < this.config.minChars) {
        this.state.results = [], this.closeDropdown();
        return;
      }
      this.debouncedSearch(t);
    }, this.handleKeydown = (t) => {
      if (!this.state.isOpen) {
        t.key === "ArrowDown" && this.state.results.length > 0 && (t.preventDefault(), this.openDropdown());
        return;
      }
      switch (t.key) {
        case "ArrowDown":
          t.preventDefault(), this.moveSelection(1);
          break;
        case "ArrowUp":
          t.preventDefault(), this.moveSelection(-1);
          break;
        case "Enter":
          t.preventDefault(), this.selectCurrent();
          break;
        case "Escape":
          t.preventDefault(), this.closeDropdown();
          break;
        case "Tab":
          this.closeDropdown();
          break;
      }
    }, this.handleFocus = () => {
      this.state.results.length > 0 && this.state.query.length >= this.config.minChars && this.openDropdown();
    }, this.config = {
      ...u,
      ...e
    }, typeof e.input == "string") {
      const t = document.querySelector(e.input);
      if (!t) throw new Error(`SearchBox: Input element not found: ${e.input}`);
      this.input = t;
    } else this.input = e.input;
    if (e.container) if (typeof e.container == "string") {
      const t = document.querySelector(e.container);
      if (!t) throw new Error(`SearchBox: Container element not found: ${e.container}`);
      this.container = t;
    } else this.container = e.container;
    else this.container = this.input.parentElement || document.body;
    this.state = {
      query: "",
      results: [],
      selectedIndex: -1,
      isOpen: !1,
      isLoading: !1,
      error: null
    };
  }
  init() {
    this.createDropdown(), this.bindEvents(), this.config.placeholder && (this.input.placeholder = this.config.placeholder);
  }
  destroy() {
    this.cancelPendingSearch(), this.removeDropdown(), this.unbindEvents();
  }
  getResolver() {
    return this.config.resolver;
  }
  setResolver(e) {
    this.config.resolver = e, this.clear();
  }
  getRenderer() {
    return this.config.renderer;
  }
  setRenderer(e) {
    this.config.renderer = e, this.state.results.length > 0 && this.renderResults();
  }
  clear() {
    this.input.value = "", this.state.query = "", this.state.results = [], this.state.selectedIndex = -1, this.state.error = null, this.closeDropdown(), this.config.onClear?.();
  }
  getSelectedResult() {
    return this.state.selectedIndex >= 0 && this.state.selectedIndex < this.state.results.length ? this.state.results[this.state.selectedIndex] : null;
  }
  getState() {
    return { ...this.state };
  }
  async search(e) {
    this.input.value = e, await this.performSearch(e);
  }
  setValue(e) {
    this.input.value = e, this.state.query = e;
  }
  createDropdown() {
    this.dropdown = document.createElement("div"), this.dropdown.className = `searchbox-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden hidden ${this.config.dropdownClass}`, this.dropdown.setAttribute("role", "listbox"), this.dropdown.setAttribute("aria-label", "Search results"), getComputedStyle(this.container).position === "static" && (this.container.style.position = "relative"), this.container.appendChild(this.dropdown);
  }
  removeDropdown() {
    this.dropdown && (this.dropdown.remove(), this.dropdown = null);
  }
  bindEvents() {
    this.input.addEventListener("input", this.handleInput), this.input.addEventListener("keydown", this.handleKeydown), this.input.addEventListener("focus", this.handleFocus), this.documentClickHandler = (e) => {
      this.container.contains(e.target) || this.closeDropdown();
    }, document.addEventListener("click", this.documentClickHandler);
  }
  unbindEvents() {
    this.input.removeEventListener("input", this.handleInput), this.input.removeEventListener("keydown", this.handleKeydown), this.input.removeEventListener("focus", this.handleFocus), this.documentClickHandler && (document.removeEventListener("click", this.documentClickHandler), this.documentClickHandler = null);
  }
  debouncedSearch(e) {
    this.cancelPendingSearch(), this.debounceTimer = setTimeout(() => {
      this.performSearch(e);
    }, this.config.debounceMs);
  }
  async performSearch(e) {
    if (this.cancelPendingSearch(), !(e.length < this.config.minChars)) {
      this.state.isLoading = !0, this.state.error = null, this.config.onSearchStart?.(e), this.renderLoading(), this.openDropdown(), this.abortController = new AbortController();
      try {
        let t = await this.config.resolver.search(e, this.abortController.signal);
        t.length > this.config.maxResults && (t = t.slice(0, this.config.maxResults)), this.state.results = t, this.state.selectedIndex = t.length > 0 ? 0 : -1, this.state.isLoading = !1, this.renderResults(), this.config.onSearchComplete?.(t);
      } catch (t) {
        if (t.name === "AbortError") return;
        this.state.error = t, this.state.isLoading = !1, this.renderError(), this.config.onError?.(t);
      }
    }
  }
  cancelPendingSearch() {
    this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null), this.abortController && (this.abortController.abort(), this.abortController = null);
  }
  moveSelection(e) {
    const { results: t, selectedIndex: s } = this.state;
    if (t.length === 0) return;
    let r = s + e;
    r < 0 && (r = t.length - 1), r >= t.length && (r = 0), this.state.selectedIndex = r, this.renderResults(), this.scrollToSelected();
  }
  selectCurrent() {
    const e = this.getSelectedResult();
    e && this.selectResult(e);
  }
  selectResult(e) {
    this.input.value = e.label, this.state.query = e.label, this.closeDropdown(), this.config.onSelect?.(e);
  }
  openDropdown() {
    this.dropdown && (this.state.isOpen = !0, this.dropdown.classList.remove("hidden"));
  }
  closeDropdown() {
    this.dropdown && (this.state.isOpen = !1, this.dropdown.classList.add("hidden"));
  }
  renderLoading() {
    this.dropdown && (this.dropdown.innerHTML = `
      <div class="searchbox-loading px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
        <svg class="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        ${n(this.config.loadingText)}
      </div>
    `);
  }
  renderError() {
    if (!this.dropdown) return;
    const e = this.state.error?.message || "An error occurred";
    this.dropdown.innerHTML = `
      <div class="searchbox-error px-4 py-3 text-sm text-red-600 flex items-center gap-2">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        ${n(e)}
      </div>
    `;
  }
  renderResults() {
    if (!this.dropdown) return;
    const { results: e, selectedIndex: t } = this.state;
    if (e.length === 0) {
      this.dropdown.innerHTML = `
        <div class="searchbox-empty px-4 py-3 text-sm text-gray-500">
          ${n(this.config.emptyText)}
        </div>
      `;
      return;
    }
    const s = e.map((r, i) => {
      const a = i === t;
      return `
        <div
          class="searchbox-item cursor-pointer"
          data-index="${i}"
          role="option"
          aria-selected="${a}"
        >
          ${this.config.renderer.render(r, a)}
        </div>
      `;
    });
    this.dropdown.innerHTML = s.join(""), this.dropdown.querySelectorAll(".searchbox-item").forEach((r) => {
      r.addEventListener("click", (i) => {
        i.stopPropagation();
        const a = e[parseInt(r.dataset.index || "0", 10)];
        a && this.selectResult(a);
      });
    });
  }
  scrollToSelected() {
    if (!this.dropdown) return;
    const e = this.dropdown.querySelector('[aria-selected="true"]');
    e && e.scrollIntoView({ block: "nearest" });
  }
}, g = {
  queryParam: "q",
  timeout: 5e3,
  params: {},
  headers: {}
}, p = class {
  constructor(e) {
    this.config = {
      ...g,
      ...e
    };
  }
  async search(e, t) {
    const s = this.buildUrl(e), r = setTimeout(() => {
      t && t.aborted;
    }, this.config.timeout);
    try {
      const i = await fetch(s, {
        method: "GET",
        headers: {
          Accept: "application/json",
          ...this.config.headers
        },
        signal: t
      });
      if (clearTimeout(r), !i.ok) throw new Error(`Search failed: ${i.status} ${i.statusText}`);
      const a = await i.json();
      return this.config.transform(a);
    } catch (i) {
      throw clearTimeout(r), i;
    }
  }
  buildUrl(e) {
    const t = new URL(this.config.endpoint, window.location.origin);
    t.searchParams.set(this.config.queryParam, e);
    for (const [s, r] of Object.entries(this.config.params)) t.searchParams.set(s, r);
    return t.toString();
  }
  setEndpoint(e) {
    this.config.endpoint = e;
  }
  setParams(e) {
    this.config.params = e;
  }
  setHeaders(e) {
    this.config.headers = e;
  }
};
function b(e, t) {
  return new p({
    endpoint: e,
    queryParam: t.searchParam || "q",
    headers: t.headers,
    transform: (s) => {
      const r = s.data || s;
      return (Array.isArray(r) ? r : []).map((i) => ({
        id: String(i.id || i.uuid || ""),
        label: typeof t.labelField == "function" ? t.labelField(i) : String(i[t.labelField] || ""),
        description: t.descriptionField ? typeof t.descriptionField == "function" ? t.descriptionField(i) : String(i[t.descriptionField] || "") : void 0,
        icon: t.iconField ? String(i[t.iconField] || "") : void 0,
        metadata: i,
        data: i
      }));
    }
  });
}
var f = {
  showDescription: !0,
  showIcon: !0,
  itemClass: "px-4 py-3 hover:bg-gray-50",
  selectedClass: "bg-blue-50",
  avatarField: "avatar",
  emailField: "email",
  roleField: "role",
  showAvatarPlaceholder: !0
}, w = class {
  constructor(e = {}) {
    this.config = {
      ...f,
      ...e
    };
  }
  render(e, t) {
    const s = `${this.config.itemClass || ""} ${t && this.config.selectedClass || ""}`.trim(), r = e.metadata || {}, i = this.getMetadataValue(r, this.config.avatarField || "avatar"), a = this.getMetadataValue(r, this.config.emailField || "email"), o = this.getMetadataValue(r, this.config.roleField || "role"), l = this.renderAvatar(i, e.label), d = o ? this.renderRole(o) : "", h = a ? `<p class="text-xs text-gray-500 truncate">${n(a)}</p>` : "";
    return `
      <div class="${s}">
        <div class="flex items-center gap-3">
          ${l}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-gray-900 truncate">${n(e.label)}</p>
              ${d}
            </div>
            ${h}
          </div>
        </div>
      </div>
    `;
  }
  renderAvatar(e, t) {
    if (e) return `<img src="${n(e)}" class="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />`;
    if (!this.config.showAvatarPlaceholder) return "";
    const s = this.getInitials(t);
    return `
      <div class="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm font-medium" style="background-color: ${this.getColorForName(t)}">
        ${n(s)}
      </div>
    `;
  }
  renderRole(e) {
    const t = {
      admin: "bg-purple-100 text-purple-800",
      owner: "bg-blue-100 text-blue-800",
      editor: "bg-green-100 text-green-800",
      viewer: "bg-gray-100 text-gray-800",
      default: "bg-gray-100 text-gray-600"
    };
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t[e.toLowerCase()] || t.default}">${n(e)}</span>`;
  }
  getInitials(e) {
    const t = e.trim().split(/\s+/);
    return t.length >= 2 ? (t[0][0] + t[t.length - 1][0]).toUpperCase() : e.slice(0, 2).toUpperCase();
  }
  getColorForName(e) {
    const t = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#F97316"
    ];
    let s = 0;
    for (let r = 0; r < e.length; r++) s = e.charCodeAt(r) + ((s << 5) - s);
    return t[Math.abs(s) % t.length];
  }
  getMetadataValue(e, t) {
    const s = e[t];
    if (s != null)
      return String(s);
  }
}, c = {
  showDescription: !0,
  showIcon: !0,
  itemClass: "px-4 py-3 hover:bg-gray-50",
  selectedClass: "bg-blue-50",
  badgeField: "status",
  badgeColors: {
    active: "bg-green-100 text-green-800",
    enabled: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-600",
    disabled: "bg-gray-100 text-gray-600",
    pending: "bg-yellow-100 text-yellow-800",
    draft: "bg-blue-100 text-blue-800",
    archived: "bg-red-100 text-red-800",
    default: "bg-gray-100 text-gray-600"
  },
  metadataFields: []
}, x = class {
  constructor(e = {}) {
    this.config = {
      ...c,
      ...e,
      badgeColors: {
        ...c.badgeColors,
        ...e.badgeColors
      }
    };
  }
  render(e, t) {
    const s = `${this.config.itemClass || ""} ${t && this.config.selectedClass || ""}`.trim(), r = e.metadata || {}, i = this.config.badgeField ? this.getMetadataValue(r, this.config.badgeField) : void 0, a = this.config.showIcon ? this.renderIcon(e.icon, e.label) : "", o = i ? this.renderBadge(i) : "", l = this.renderMetadataPills(r), d = this.config.showDescription && e.description ? `<p class="text-xs text-gray-500 mt-0.5 truncate">${n(e.description)}</p>` : "";
    return `
      <div class="${s}">
        <div class="flex items-center gap-3">
          ${a}
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p class="text-sm font-medium text-gray-900 truncate">${n(e.label)}</p>
              ${o}
            </div>
            ${d}
            ${l}
          </div>
        </div>
      </div>
    `;
  }
  renderIcon(e, t) {
    if (e)
      return e.startsWith("http") || e.startsWith("/") || e.startsWith("data:") ? `<img src="${n(e)}" class="w-10 h-10 rounded-lg object-cover flex-shrink-0" alt="" />` : `<span class="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-lg">${n(e)}</span>`;
    const s = t.charAt(0).toUpperCase();
    return `
      <div class="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-sm font-semibold" style="background-color: ${this.getColorForLabel(t)}">
        ${n(s)}
      </div>
    `;
  }
  renderBadge(e) {
    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${this.config.badgeColors?.[e.toLowerCase()] || this.config.badgeColors?.default || "bg-gray-100 text-gray-600"}">${n(e)}</span>`;
  }
  renderMetadataPills(e) {
    if (!this.config.metadataFields || this.config.metadataFields.length === 0) return "";
    const t = this.config.metadataFields.map((s) => {
      const r = this.getMetadataValue(e, s);
      return r ? `<span class="text-xs text-gray-400">${n(s.replace(/([A-Z])/g, " $1").replace(/^./, (i) => i.toUpperCase()))}: <span class="text-gray-600">${n(r)}</span></span>` : null;
    }).filter(Boolean);
    return t.length === 0 ? "" : `<div class="flex items-center gap-3 mt-1">${t.join("")}</div>`;
  }
  getColorForLabel(e) {
    const t = [
      "#3B82F6",
      "#10B981",
      "#F59E0B",
      "#EF4444",
      "#8B5CF6",
      "#EC4899",
      "#06B6D4",
      "#F97316"
    ];
    let s = 0;
    for (let r = 0; r < e.length; r++) s = e.charCodeAt(r) + ((s << 5) - s);
    return t[Math.abs(s) % t.length];
  }
  getMetadataValue(e, t) {
    const s = e[t];
    if (s != null)
      return String(s);
  }
};
export {
  v as a,
  b as i,
  w as n,
  p as r,
  x as t
};

//# sourceMappingURL=entity-renderer-GXMu3Nhg.js.map