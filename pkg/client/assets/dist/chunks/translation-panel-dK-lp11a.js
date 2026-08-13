import { createLogger as m } from "../shared/logger.js";
import { escapeAttribute as d, escapeHTML as l } from "../shared/html.js";
import { r as L } from "./modal-BwzAtNla.js";
import { executeActionRequest as $ } from "../toast/error-helpers.js";
var C = m("DataGrid"), S = class y extends L {
  constructor(e) {
    super({
      size: "lg",
      initialFocus: "[data-blocker-action]",
      labelledBy: "blocker-title",
      describedBy: "blocker-description",
      lockBodyScroll: !0,
      dismissOnBackdropClick: !0,
      dismissOnEscape: !0
    }), this.localeStates = /* @__PURE__ */ new Map(), this.resolved = !1, this.config = e;
    for (const i of e.missingLocales) this.localeStates.set(i, {
      loading: !1,
      created: !1
    });
  }
  getContentChannel() {
    return String(this.config.channel ?? "").trim() || null;
  }
  static showBlocker(e) {
    return new Promise((i) => {
      const s = e.onDismiss;
      new y({
        ...e,
        onDismiss: () => {
          s?.(), i();
        }
      }).show();
    });
  }
  renderContent() {
    const e = this.config.transition || "complete action", i = this.config.entityType || "content", s = this.config.missingFieldsByLocale !== null && Object.keys(this.config.missingFieldsByLocale).length > 0;
    return `
      <div class="flex flex-col">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800/40">
              <svg class="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <div>
              <h2 id="blocker-title" class="text-lg font-semibold text-gray-900 dark:text-white">
                Cannot ${l(e)} ${l(i)}
              </h2>
              <p id="blocker-description" class="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                ${this.renderDescription(s)}
              </p>
            </div>
          </div>
        </div>

        <!-- Missing Locales List -->
        <div class="px-6 py-4 max-h-[50vh] overflow-y-auto">
          <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3" id="locales-heading">
            Missing translations (${this.config.missingLocales.length}):
          </p>
          <ul class="space-y-3" role="list" aria-labelledby="locales-heading">
            ${this.config.missingLocales.map((a) => this.renderLocaleItem(a)).join("")}
          </ul>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button type="button"
                  data-blocker-dismiss
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors">
            Close
          </button>
          <button type="button"
                  data-blocker-retry
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-describedby="retry-hint">
            Retry ${l(e)}
          </button>
        </div>
        <p id="retry-hint" class="sr-only">Retry the blocked action after creating missing translations</p>
      </div>
    `;
  }
  renderDescription(e) {
    return e ? "Required translations are missing or incomplete. Create or complete the translations listed below." : "Required translations are missing. Create the translations listed below to continue.";
  }
  renderLocaleItem(e) {
    const i = this.localeStates.get(e) || {
      loading: !1,
      created: !1
    }, s = this.config.missingFieldsByLocale?.[e], a = Array.isArray(s) && s.length > 0, r = this.getLocaleLabel(e), n = i.loading ? "disabled" : "";
    return `
      <li class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${i.loading ? "opacity-50" : ""}"
          data-locale-item="${l(e)}"
          role="listitem">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase tracking-wide"
                    aria-label="Locale code">
                ${l(e)}
              </span>
              <span class="text-sm font-medium text-gray-900 dark:text-white">
                ${l(r)}
              </span>
              ${i.created ? `
                <span class="inline-flex items-center text-xs text-green-600 dark:text-green-400" role="status">
                  <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                  Created
                </span>
              ` : ""}
            </div>
            ${a ? `
              <div class="mt-2">
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missing required fields:</p>
                <div class="flex flex-wrap gap-1.5">
                  ${s.map((c) => `
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      ${l(c)}
                    </span>
                  `).join("")}
                </div>
              </div>
            ` : ""}
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${i.created ? this.renderOpenButton(e, i.newRecordId) : this.renderCreateButton(e, n)}
            ${this.renderOpenButton(e, void 0, i.created)}
          </div>
        </div>
        ${i.loading ? `
          <div class="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
            <svg class="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
            </svg>
            Creating translation...
          </div>
        ` : ""}
      </li>
    `;
  }
  renderCreateButton(e, i) {
    return `
      <button type="button"
              data-blocker-action="create"
              data-locale="${l(e)}"
              ${i}
              class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
              aria-label="Create ${this.getLocaleLabel(e)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
        </svg>
        Create
      </button>
    `;
  }
  renderOpenButton(e, i, s = !1) {
    if (s) return "";
    const a = this.config.navigationBasePath, r = i || this.config.recordId, n = new URLSearchParams();
    n.set("locale", e);
    const c = this.getContentChannel();
    c && n.set("channel", c);
    const o = `${a}/${r}/edit?${n.toString()}`;
    return `
      <a href="${l(o)}"
         data-blocker-action="open"
         data-locale="${l(e)}"
         class="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer transition-colors"
         aria-label="Open ${this.getLocaleLabel(e)} translation">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
        </svg>
        Open
      </a>
    `;
  }
  getLocaleLabel(e) {
    return {
      en: "English",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ar: "Arabic",
      ru: "Russian",
      nl: "Dutch",
      pl: "Polish",
      sv: "Swedish",
      da: "Danish",
      no: "Norwegian",
      fi: "Finnish"
    }[e.toLowerCase()] || e.toUpperCase();
  }
  bindContentEvents() {
    this.container?.querySelector("[data-blocker-dismiss]")?.addEventListener("click", () => {
      this.dismiss();
    }), this.container?.querySelector("[data-blocker-retry]")?.addEventListener("click", async () => {
      await this.handleRetry();
    }), this.container?.querySelectorAll('[data-blocker-action="create"]')?.forEach((i) => {
      i.addEventListener("click", () => {
        const s = i.getAttribute("data-locale");
        s && this.handleCreateTranslation(s);
      });
    });
    const e = this.container?.querySelectorAll("[data-locale-item]");
    e?.forEach((i, s) => {
      i.addEventListener("keydown", (a) => {
        a.key === "ArrowDown" && s < e.length - 1 ? (a.preventDefault(), e[s + 1].querySelector("[data-blocker-action]")?.focus()) : a.key === "ArrowUp" && s > 0 && (a.preventDefault(), e[s - 1].querySelector("[data-blocker-action]")?.focus());
      });
    });
  }
  async handleCreateTranslation(e) {
    const i = this.localeStates.get(e);
    if (!(!i || i.loading || i.created)) {
      i.loading = !0, this.updateLocaleItemUI(e);
      try {
        const s = {
          id: this.config.recordId,
          locale: e
        }, a = this.getContentChannel();
        a && (s.channel = a), this.config.panelName && (s.policy_entity = this.config.panelName);
        const r = `${this.config.apiEndpoint}/actions/create_translation`, n = await $(r, s);
        if (n.success) {
          i.loading = !1, i.created = !0, n.data?.id && (i.newRecordId = String(n.data.id)), this.updateLocaleItemUI(e);
          const c = {
            id: i.newRecordId || this.config.recordId,
            locale: e,
            status: String(n.data?.status || "draft"),
            family_id: n.data?.family_id ? String(n.data.family_id) : void 0
          };
          this.config.onCreateSuccess?.(e, c);
        } else {
          i.loading = !1, this.updateLocaleItemUI(e);
          const c = n.error?.message || "Failed to create translation";
          this.config.onError?.(c);
        }
      } catch (s) {
        i.loading = !1, this.updateLocaleItemUI(e);
        const a = s instanceof Error ? s.message : "Failed to create translation";
        this.config.onError?.(a);
      }
    }
  }
  updateLocaleItemUI(e) {
    const i = this.container?.querySelector(`[data-locale-item="${e}"]`);
    if (!i || !this.localeStates.get(e)) return;
    const s = i.parentElement;
    if (!s) return;
    const a = document.createElement("div");
    a.innerHTML = this.renderLocaleItem(e);
    const r = a.firstElementChild;
    r && (s.replaceChild(r, i), r.querySelector('[data-blocker-action="create"]')?.addEventListener("click", () => {
      this.handleCreateTranslation(e);
    }));
  }
  async handleRetry() {
    if (this.resolved = !0, this.hide(), !!this.config.onRetry)
      try {
        await this.config.onRetry();
      } catch (e) {
        const i = e instanceof Error ? e.message : "Retry failed";
        this.config.onError?.(i);
      }
  }
  dismiss() {
    this.resolved = !0, this.config.onDismiss?.(), this.hide();
  }
  onBeforeHide() {
    return this.resolved || (this.resolved = !0, this.config.onDismiss?.()), !0;
  }
};
async function H(t) {
  try {
    await S.showBlocker(t);
  } catch (e) {
    C.error("[TranslationBlockerModal] Render failed, using fallback:", e);
    const i = `Cannot ${t.transition || "complete action"}: Missing translations for ${t.missingLocales.join(", ")}`;
    typeof window < "u" && "toastManager" in window ? window.toastManager.error(i) : alert(i);
  }
}
var g = m("DataGrid"), b = [
  {
    key: "all",
    label: "All",
    field: "",
    value: "",
    icon: "○",
    tone: "neutral",
    description: "Show all records"
  },
  {
    key: "ready",
    label: "Ready",
    field: "readiness_state",
    value: "ready",
    icon: "●",
    tone: "success",
    description: "All translations complete"
  },
  {
    key: "missing_locales",
    label: "Missing",
    field: "readiness_state",
    value: "missing_locales",
    icon: "○",
    tone: "warning",
    description: "Missing required locale translations"
  },
  {
    key: "missing_fields",
    label: "Incomplete",
    field: "readiness_state",
    value: "missing_fields",
    icon: "◐",
    tone: "warning",
    description: "Has translations but missing required fields"
  },
  {
    key: "fallback",
    label: "Fallback",
    field: "fallback_used",
    value: "true",
    icon: "⚠",
    tone: "warning",
    description: "Records currently viewed in fallback mode"
  }
], A = class {
  constructor(t) {
    if (this.container = null, this.config = t, this.container = typeof t.container == "string" ? document.querySelector(t.container) : t.container, this.state = {
      activeKey: null,
      capabilities: /* @__PURE__ */ new Map()
    }, t.capabilities) for (const e of t.capabilities) this.state.capabilities.set(e.key, e);
    for (const e of t.filters) this.state.capabilities.has(e.key) || this.state.capabilities.set(e.key, {
      key: e.key,
      supported: !0
    });
    this.render();
  }
  render() {
    if (!this.container) {
      g.warn("[QuickFilters] Container not found");
      return;
    }
    const { size: t = "default", containerClass: e = "" } = this.config, i = this.config.filters.map((s) => this.renderFilterButton(s, t)).join("");
    this.container.innerHTML = `
      <div class="quick-filters ${e}"
           role="group"
           aria-label="Quick filters">
        ${i}
      </div>
    `, this.bindEventListeners();
  }
  renderFilterButton(t, e) {
    const i = this.state.capabilities.get(t.key), s = i?.supported !== !1, a = this.state.activeKey === t.key, r = i?.disabledReason || "Filter not available";
    let n;
    s ? a ? n = 'aria-pressed="true"' : n = 'aria-pressed="false"' : n = `aria-disabled="true" aria-pressed="false" title="${d(r)}"`;
    const c = t.icon ? `<span aria-hidden="true">${t.icon}</span>` : "";
    return `
      <button type="button"
              class="quick-filter quick-filter--${e} ${d(t.styleClass || "")}"
              data-quick-filter-value="${d(t.value)}"
              data-quick-filter-key="${d(t.key)}"
              data-filter-key="${d(t.key)}"
              data-tone="${d(t.tone || "neutral")}"
              data-state="${s ? a ? "active" : "inactive" : "disabled"}"
              ${n}
              ${s ? "" : "disabled"}>
        ${c}
        <span>${l(t.label)}</span>
      </button>
    `;
  }
  bindEventListeners() {
    this.container && this.container.querySelectorAll("[data-quick-filter-value]").forEach((t) => {
      t.addEventListener("click", () => {
        const e = t.dataset.quickFilterKey || t.dataset.filterKey;
        e && !t.disabled && this.selectFilter(e);
      });
    });
  }
  selectFilter(t) {
    const e = this.config.filters.find((i) => i.key === t);
    if (!e) {
      g.warn(`[QuickFilters] Filter not found: ${t}`);
      return;
    }
    if (this.state.capabilities.get(t)?.supported === !1) {
      g.warn(`[QuickFilters] Filter not supported: ${t}`);
      return;
    }
    if (this.state.activeKey === t) {
      this.clearFilter();
      return;
    }
    this.state.activeKey = t, this.render(), e.field === "" ? this.config.onFilterSelect(null) : this.config.onFilterSelect(e);
  }
  clearFilter() {
    this.state.activeKey = null, this.render(), this.config.onFilterSelect(null);
  }
  updateCapabilities(t) {
    for (const e of t) this.state.capabilities.set(e.key, e);
    this.render();
  }
  setCapability(t, e, i) {
    this.state.capabilities.set(t, {
      key: t,
      supported: e,
      disabledReason: i
    }), this.render();
  }
  getActiveFilter() {
    return this.state.activeKey && this.config.filters.find((t) => t.key === this.state.activeKey) || null;
  }
  setActiveFilter(t) {
    this.state.activeKey = t, this.render();
  }
  destroy() {
    this.container && (this.container.innerHTML = ""), this.container = null;
  }
};
function I(t, e, i = {}) {
  return new A({
    container: t,
    filters: b,
    onFilterSelect: e,
    ...i
  });
}
function D(t) {
  const e = document.querySelectorAll("[data-quick-filters]"), i = [];
  return e.forEach((s) => {
    if (s.hasAttribute("data-quick-filters-init")) return;
    const a = I(s, (r) => t(r, s), { size: s.dataset.size || "default" });
    s.setAttribute("data-quick-filters-init", "true"), i.push(a);
  }), i;
}
function K(t = {}) {
  const { filters: e = b, activeKey: i = null, capabilities: s = [], size: a = "default", containerClass: r = "" } = t, n = /* @__PURE__ */ new Map();
  for (const o of s) n.set(o.key, o);
  const c = e.map((o) => {
    const f = n.get(o.key), u = f?.supported !== !1, p = i === o.key, v = f?.disabledReason || "Filter not available", k = o.icon ? `<span aria-hidden="true">${l(o.icon)}</span>` : "", w = u ? "" : `title="${d(v)}"`, x = u ? "" : 'aria-disabled="true"', B = p ? 'aria-current="true"' : "", E = u ? p ? "active" : "inactive" : "disabled";
    return `<span class="quick-filter quick-filter--${a} ${d(o.styleClass || "")}" data-quick-filter-value="${d(o.value)}" data-quick-filter-key="${d(o.key)}" data-tone="${d(o.tone || "neutral")}" data-state="${E}" ${x} ${B} ${w}>${k}<span>${l(o.label)}</span></span>`;
  }).join("");
  return `<div class="quick-filters ${d(r)}" data-quick-filters role="group" aria-label="Quick filters">${c}</div>`;
}
var h = "go-admin:translation-panel-expanded", F = class {
  constructor(t) {
    this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [], this.expanded = !1, this.boundToggleHandler = null, this.config = {
      ...t,
      storageKey: t.storageKey || h
    };
  }
  init() {
    if (this.toggleButton = document.getElementById(this.config.toggleButtonId), this.panelElement = document.getElementById(this.config.panelId), this.expandAllButton = this.config.expandAllBtnId ? document.getElementById(this.config.expandAllBtnId) : null, this.collapseAllButton = this.config.collapseAllBtnId ? document.getElementById(this.config.collapseAllBtnId) : null, this.groupControls = this.config.groupControlsId ? document.getElementById(this.config.groupControlsId) : null, this.viewModeButtons = Array.from(document.querySelectorAll(this.config.viewModeSelector)), !this.toggleButton || !this.panelElement) return;
    this.boundToggleHandler = (e) => {
      e.preventDefault(), this.toggle();
    }, this.toggleButton.addEventListener("click", this.boundToggleHandler);
    const t = this.getPersistedExpandedState();
    this.setExpanded(t, !1);
  }
  toggle() {
    this.setExpanded(!this.expanded, !0);
  }
  expand() {
    this.setExpanded(!0, !0);
  }
  collapse() {
    this.setExpanded(!1, !0);
  }
  isExpanded() {
    return this.expanded;
  }
  onViewModeChange(t) {
    const e = t === "grouped" || t === "matrix";
    this.groupControls ? this.groupControls.classList.toggle("hidden", !e) : (this.expandAllButton && this.expandAllButton.classList.toggle("hidden", !e), this.collapseAllButton && this.collapseAllButton.classList.toggle("hidden", !e)), this.dispatchViewModeEvent(t);
  }
  destroy() {
    this.toggleButton && this.boundToggleHandler && this.toggleButton.removeEventListener("click", this.boundToggleHandler), this.boundToggleHandler = null, this.toggleButton = null, this.panelElement = null, this.expandAllButton = null, this.collapseAllButton = null, this.groupControls = null, this.viewModeButtons = [];
  }
  setExpanded(t, e) {
    if (this.expanded = t, this.panelElement && this.panelElement.classList.toggle("hidden", !t), this.toggleButton) {
      this.toggleButton.setAttribute("aria-expanded", t ? "true" : "false"), this.toggleButton.classList.toggle("bg-blue-50", t), this.toggleButton.classList.toggle("border-blue-300", t), this.toggleButton.classList.toggle("text-blue-700", t), this.toggleButton.classList.toggle("bg-white", !t), this.toggleButton.classList.toggle("border-gray-200", !t), this.toggleButton.classList.toggle("text-gray-800", !t);
      const i = this.toggleButton.querySelector("[data-chevron]");
      i && i.classList.toggle("rotate-180", t);
    }
    e && this.persistExpandedState(t), this.dispatchToggleEvent(t);
  }
  getPersistedExpandedState() {
    if (typeof window > "u" || !window.localStorage) return !1;
    try {
      return window.localStorage.getItem(this.config.storageKey || h) === "true";
    } catch {
      return !1;
    }
  }
  persistExpandedState(t) {
    if (!(typeof window > "u" || !window.localStorage))
      try {
        window.localStorage.setItem(this.config.storageKey || h, t ? "true" : "false");
      } catch {
      }
  }
  dispatchToggleEvent(t) {
    !this.panelElement || typeof CustomEvent > "u" || this.panelElement.dispatchEvent(new CustomEvent("translation-panel:toggle", { detail: { expanded: t } }));
  }
  dispatchViewModeEvent(t) {
    !this.panelElement || typeof CustomEvent > "u" || this.panelElement.dispatchEvent(new CustomEvent("translation-panel:view-mode", { detail: {
      mode: t,
      buttonCount: this.viewModeButtons.length
    } }));
  }
};
function _(t) {
  return new F(t);
}
export {
  I as a,
  S as c,
  A as i,
  H as l,
  _ as n,
  D as o,
  b as r,
  K as s,
  F as t
};

//# sourceMappingURL=translation-panel-dK-lp11a.js.map