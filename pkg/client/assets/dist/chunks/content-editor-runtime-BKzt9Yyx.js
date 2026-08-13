import { createLogger as D } from "../shared/logger.js";
import { escapeHTML as d } from "../shared/html.js";
import { r as S, t as E } from "./modal-ClEsOn-S.js";
import { parseJSONValue as j } from "../shared/json-parse.js";
import { nameToSlug as L, titleCaseIdentifier as T } from "../content-type-builder/shared/text.js";
import { deepCloneJSON as N } from "../shared/deep-clone.js";
import { C as H, F as B, I as C, L as U, M as _, O as Q, R as G, _ as F, a as W, b as V, d as Y, f as M, g as J, h as Z, i as I, j as k, k as P, l as K, m as X, n as ee, o as te, p as $, r as ae, s as re, t as se, u as ie, v as A, y as z } from "./schema-preview-CmnuWQks.js";
import { c as f, s as w, u as ne } from "./channel-validation-BBf_63LY.js";
import { formatContentTypeDate as oe } from "../content-type-builder/shared/date-formatters.js";
import { initContentTypeChannelSwitcher as de } from "../content-type-builder/shared/channel-switcher.js";
var le = class extends S {
  constructor(e) {
    super({
      size: "3xl",
      ariaLabel: "Layout editor",
      backdropDataAttr: "data-layout-editor-backdrop"
    }), this.dragState = null, this.config = e, this.layout = N(e.layout ?? {
      type: "flat",
      gridColumns: 12
    }), this.layout.tabs || (this.layout.tabs = []);
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Layout Settings</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Configure tabs, sections, and grid layout</p>
        </div>
        <button type="button" data-layout-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        ${this.renderLayoutTypeSection()}
        ${this.renderGridSection()}
        ${this.renderTabsSection()}
        ${this.renderFieldAssignment()}
      </div>

      <div data-layout-error class="hidden px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <p class="text-sm text-red-600 dark:text-red-400"></p>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-layout-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-layout-save
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Apply Layout
        </button>
      </div>
    `;
  }
  renderLayoutTypeSection() {
    return `
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Layout Type</h3>

        <div class="grid grid-cols-3 gap-3">
          <button
            type="button"
            data-layout-type="flat"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${this.layout.type === "flat" || !this.layout.type ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}"
          >
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Flat</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">All fields in one view</span>
          </button>

          <button
            type="button"
            data-layout-type="tabs"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${this.layout.type === "tabs" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}"
          >
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Tabs</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Organize with tabs</span>
          </button>

          <button
            type="button"
            data-layout-type="sections"
            class="flex flex-col items-center gap-2 p-4 border rounded-lg transition-colors ${this.layout.type === "sections" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"}"
          >
            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path>
            </svg>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Sections</span>
            <span class="text-xs text-gray-500 dark:text-gray-400">Collapsible sections</span>
          </button>
        </div>
      </div>
    `;
  }
  renderGridSection() {
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Grid Settings</h3>

        <div class="flex items-center gap-4">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Grid Columns
            </label>
            <select
              data-grid-columns
              class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1" ${this.layout.gridColumns === 1 ? "selected" : ""}>1 Column</option>
              <option value="2" ${this.layout.gridColumns === 2 ? "selected" : ""}>2 Columns</option>
              <option value="3" ${this.layout.gridColumns === 3 ? "selected" : ""}>3 Columns</option>
              <option value="4" ${this.layout.gridColumns === 4 ? "selected" : ""}>4 Columns</option>
              <option value="6" ${this.layout.gridColumns === 6 ? "selected" : ""}>6 Columns</option>
              <option value="12" ${this.layout.gridColumns === 12 || !this.layout.gridColumns ? "selected" : ""}>12 Columns (default)</option>
            </select>
          </div>

          <div class="flex-1">
            <div class="text-sm text-gray-500 dark:text-gray-400 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              Fields use <code class="text-xs">gridSpan</code> to control width. Set per-field in field settings.
            </div>
          </div>
        </div>
      </div>
    `;
  }
  renderTabsSection() {
    if (this.layout.type !== "tabs" && this.layout.type !== "sections") return "";
    const e = this.layout.tabs ?? [], t = this.layout.type === "tabs" ? "Tab" : "Section";
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-medium text-gray-900 dark:text-white">${t}s</h3>
          <button
            type="button"
            data-add-tab
            class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add ${t}
          </button>
        </div>

        <div data-tabs-list class="space-y-2">
          ${e.length === 0 ? `
            <div class="text-sm text-gray-500 dark:text-gray-400 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
              No ${t.toLowerCase()}s defined. Fields without a section will appear in a default "${t.toLowerCase()}".
            </div>
          ` : e.map((a, r) => this.renderTabRow(a, r)).join("")}
        </div>
      </div>
    `;
  }
  renderTabRow(e, t) {
    return `
      <div
        class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-900"
        data-tab-row="${e.id}"
        data-tab-index="${t}"
        draggable="true"
      >
        <div class="flex-shrink-0 cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" data-tab-drag-handle>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"></path>
          </svg>
        </div>

        <div class="flex-1 grid grid-cols-3 gap-3">
          <input
            type="text"
            data-tab-id="${e.id}"
            name="tab_id_${t}"
            value="${d(e.id)}"
            placeholder="section_id"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <input
            type="text"
            name="tab_label_${t}"
            value="${d(e.label)}"
            placeholder="Tab Label"
            class="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          ${H(e.icon ?? "", `name="tab_icon_${t}"`)}
        </div>

        <button
          type="button"
          data-remove-tab="${e.id}"
          class="p-2 text-gray-400 hover:text-red-500"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
  }
  renderFieldAssignment() {
    if (this.layout.type !== "tabs" && this.layout.type !== "sections") return "";
    const e = this.layout.tabs ?? [], t = this.layout.type === "tabs" ? "tab" : "section", a = /* @__PURE__ */ new Map();
    a.set("", []);
    for (const r of e) a.set(r.id, []);
    for (const r of this.config.fields) {
      const s = r.section ?? "";
      a.has(s) || a.set(s, []), a.get(s).push(r);
    }
    return `
      <div class="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h3 class="text-sm font-medium text-gray-900 dark:text-white">Field Assignment</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Fields are assigned to ${t}s via the "Section/Tab" setting in each field's configuration.
        </p>

        <div class="grid grid-cols-2 gap-4">
          ${Array.from(a.entries()).map(([r, s]) => `
            <div class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ${r || "(Unassigned)"}
              </div>
              <div class="space-y-1">
                ${s.length === 0 ? '<div class="text-xs text-gray-400">No fields</div>' : s.map((i) => `<div class="text-xs text-gray-500 dark:text-gray-400 truncate">${d(i.label)} <span class="font-mono">(${d(i.name)})</span></div>`).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    this.container && (this.container.querySelector("[data-layout-close]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-layout-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container.querySelector("[data-layout-save]")?.addEventListener("click", () => {
      this.handleSave();
    }), this.container.querySelectorAll("[data-layout-type]").forEach((e) => {
      e.addEventListener("click", () => {
        const t = e.getAttribute("data-layout-type");
        this.layout.type = t, this.updateView();
      });
    }), this.container.querySelector("[data-grid-columns]")?.addEventListener("change", (e) => {
      const t = e.target.value;
      this.layout.gridColumns = parseInt(t, 10);
    }), this.container.querySelector("[data-add-tab]")?.addEventListener("click", () => {
      this.addTab();
    }), this.bindTabEvents());
  }
  bindTabEvents() {
    if (!this.container) return;
    this.container.querySelectorAll("[data-remove-tab]").forEach((t) => {
      t.addEventListener("click", () => {
        const a = t.getAttribute("data-remove-tab");
        a && this.removeTab(a);
      });
    }), this.container.querySelectorAll('input[name^="tab_id_"]').forEach((t) => {
      t.addEventListener("input", () => {
        this.updateTabsFromForm();
      });
    }), z(this.container, "[data-icon-trigger]", (t) => {
      const a = t.querySelector('input[name^="tab_icon_"]');
      return {
        value: a?.value ?? "",
        onSelect: (r) => {
          a && (a.value = r);
        },
        onClear: () => {
          a && (a.value = "");
        }
      };
    });
    const e = this.container.querySelector("[data-tabs-list]");
    e && (e.addEventListener("dragstart", (t) => {
      const a = t.target.closest("[data-tab-row]");
      a && (this.dragState = {
        tabId: a.getAttribute("data-tab-row") ?? "",
        startIndex: parseInt(a.getAttribute("data-tab-index") ?? "0", 10)
      }, a.classList.add("opacity-50"));
    }), e.addEventListener("dragover", (t) => {
      t.preventDefault();
    }), e.addEventListener("drop", (t) => {
      if (t.preventDefault(), !this.dragState) return;
      const a = t.target.closest("[data-tab-row]");
      if (!a) return;
      const r = parseInt(a.getAttribute("data-tab-index") ?? "0", 10);
      this.moveTab(this.dragState.tabId, r), this.dragState = null;
    }), e.addEventListener("dragend", () => {
      e.querySelectorAll(".opacity-50").forEach((t) => t.classList.remove("opacity-50")), this.dragState = null;
    }));
  }
  addTab() {
    const e = {
      id: `section_${(this.layout.tabs?.length ?? 0) + 1}`,
      label: `Section ${(this.layout.tabs?.length ?? 0) + 1}`,
      order: this.layout.tabs?.length ?? 0
    };
    this.layout.tabs || (this.layout.tabs = []), this.layout.tabs.push(e), this.updateView();
  }
  removeTab(e) {
    this.layout.tabs && (this.layout.tabs = this.layout.tabs.filter((t) => t.id !== e), this.updateView());
  }
  moveTab(e, t) {
    if (!this.layout.tabs) return;
    const a = this.layout.tabs.findIndex((s) => s.id === e);
    if (a === -1 || a === t) return;
    const r = this.layout.tabs.splice(a, 1)[0];
    this.layout.tabs.splice(t, 0, r), this.layout.tabs.forEach((s, i) => {
      s.order = i;
    }), this.updateView();
  }
  updateTabsFromForm() {
    !this.container || !this.layout.tabs || this.layout.tabs.forEach((e, t) => {
      const a = this.container.querySelector(`input[name="tab_id_${t}"]`), r = this.container.querySelector(`input[name="tab_label_${t}"]`), s = this.container.querySelector(`input[name="tab_icon_${t}"]`);
      a && (e.id = a.value.trim()), r && (e.label = r.value.trim()), s && (e.icon = s.value.trim() || void 0);
    });
  }
  updateView() {
    if (!this.container) return;
    V();
    const e = this.container.querySelector(".overflow-y-auto");
    e && (e.innerHTML = `
        ${this.renderLayoutTypeSection()}
        ${this.renderGridSection()}
        ${this.renderTabsSection()}
        ${this.renderFieldAssignment()}
      `, this.container.querySelectorAll("[data-layout-type]").forEach((t) => {
      t.addEventListener("click", () => {
        const a = t.getAttribute("data-layout-type");
        this.layout.type = a, this.updateView();
      });
    }), this.container.querySelector("[data-grid-columns]")?.addEventListener("change", (t) => {
      const a = t.target.value;
      this.layout.gridColumns = parseInt(a, 10);
    }), this.container.querySelector("[data-add-tab]")?.addEventListener("click", () => {
      this.addTab();
    }), this.bindTabEvents());
  }
  handleSave() {
    if (this.updateTabsFromForm(), this.layout.tabs && this.layout.tabs.length > 0) {
      const e = /* @__PURE__ */ new Set();
      for (const t of this.layout.tabs) {
        if (!t.id.trim()) {
          this.showLayoutError("All tabs must have an ID");
          return;
        }
        if (e.has(t.id)) {
          this.showLayoutError(`Duplicate tab ID: ${t.id}`);
          return;
        }
        e.add(t.id);
      }
    }
    this.config.onSave(this.layout), this.hide();
  }
  showLayoutError(e) {
    const t = this.container?.querySelector("[data-layout-error]");
    if (!t) return;
    t.classList.remove("hidden");
    const a = t.querySelector("p");
    a && (a.textContent = e), setTimeout(() => t.classList.add("hidden"), 5e3);
  }
}, ce = '<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>', he = '<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a2 2 0 012-2h8l6 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 3v6h6"></path></svg>', ue = '<svg class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m0 0h2a2 2 0 012 2v9a2 2 0 11-4 0V7zM9 9h4m-4 3h4m-4 3h2"></path></svg>', R = [
  {
    id: "basic",
    label: "Basic",
    description: "Title and description",
    icon: ce,
    fields: [{
      name: "title",
      type: "text",
      label: "Title",
      required: !0
    }, {
      name: "description",
      type: "textarea",
      label: "Description"
    }]
  },
  {
    id: "page",
    label: "Page",
    description: "Title, slug, and body",
    icon: he,
    fields: [
      {
        name: "title",
        type: "text",
        label: "Title",
        required: !0
      },
      {
        name: "slug",
        type: "slug",
        label: "Slug",
        required: !0
      },
      {
        name: "body",
        type: "rich-text",
        label: "Body"
      }
    ]
  },
  {
    id: "blog-post",
    label: "Blog Post",
    description: "Title, slug, excerpt, cover, body, date",
    icon: ue,
    fields: [
      {
        name: "title",
        type: "text",
        label: "Title",
        required: !0
      },
      {
        name: "slug",
        type: "slug",
        label: "Slug",
        required: !0
      },
      {
        name: "excerpt",
        type: "textarea",
        label: "Excerpt"
      },
      {
        name: "cover_image",
        type: "media-picker",
        label: "Cover Image"
      },
      {
        name: "body",
        type: "rich-text",
        label: "Body"
      },
      {
        name: "published_at",
        type: "datetime",
        label: "Published At"
      }
    ]
  }
];
function ge(e) {
  return R.find((t) => t.id === e);
}
var v = D("ContentTypeEditor"), y = "main", pe = class {
  constructor(e, t) {
    this.dragState = null, this.dropIndicator = null, this.dragOverRAF = null, this.staticEventsBound = !1, this.previewDebounceTimer = null, this.previewRequestSeq = 0, this.palettePanel = null, this.paletteVisible = !1, this.sectionStates = /* @__PURE__ */ new Map(), this.lifecycleOutsideClickHandler = null, this.cachedBlocks = null, this.blocksLoading = !1, this.blockPickerModes = /* @__PURE__ */ new Map(), this.fieldActionsMenuId = null, this.container = e, this.config = t, this.api = new _({ basePath: t.apiBasePath });
    const a = this.normalizeChannel(t.channel);
    a && this.api.setChannel(a), this.state = {
      contentType: null,
      fields: [],
      isDirty: !1,
      isLoading: !1,
      isSaving: !1,
      isPreviewing: !1,
      validationErrors: [],
      selectedFieldId: null,
      previewHtml: null,
      previewError: null,
      layout: {
        type: "flat",
        gridColumns: 12,
        tabs: []
      },
      originalSchema: null,
      initialFieldsSignature: ""
    };
  }
  normalizeChannel(e) {
    return String(e ?? "").trim().toLowerCase();
  }
  blockLibraryURL() {
    const e = `${$(this.config.apiBasePath, this.config.basePath)}/content/block-library`, t = this.normalizeChannel(this.config.channel);
    return !t || t === "default" ? e : `${e}?channel=${encodeURIComponent(t)}`;
  }
  shellRoot() {
    return this.container.closest("[data-dashboard-shell]");
  }
  previewHost() {
    return this.shellRoot()?.querySelector("[data-content-type-preview-region]") ?? this.container;
  }
  previewQuery(e) {
    return this.previewHost().querySelector(e);
  }
  async init() {
    this.render(), this.bindEvents(), this.config.contentTypeId && await this.loadContentType(this.config.contentTypeId);
  }
  async loadContentType(e) {
    this.state.isLoading = !0, this.updateLoadingState();
    try {
      const t = await this.api.get(e);
      this.state.contentType = t, this.state.fields = G(t.schema), this.state.originalSchema = t.schema ?? null, this.state.initialFieldsSignature = this.serializeFields(this.state.fields), t.ui_schema?.layout && (this.state.layout = {
        type: t.ui_schema.layout.type ?? "flat",
        tabs: t.ui_schema.layout.tabs ?? [],
        gridColumns: t.ui_schema.layout.gridColumns ?? 12
      }), this.state.isDirty = !1, this.render(), this.bindEvents(), this.schedulePreview();
    } catch (t) {
      v.error("Failed to load content type:", t), this.showToast("Failed to load content type", "error");
    } finally {
      this.state.isLoading = !1, this.updateLoadingState();
    }
  }
  async save() {
    if (this.state.isSaving) return;
    const e = this.container.querySelector("[data-ct-name]"), t = e?.value?.trim();
    if (!t) {
      this.showToast("Name is required", "error"), e?.focus();
      return;
    }
    const a = this.buildSchemaPayload(), r = {
      name: t,
      slug: this.getSlug(),
      description: this.getDescription(),
      icon: this.getIcon(),
      schema: a,
      ui_schema: this.buildUISchema(),
      capabilities: this.getCapabilities()
    };
    this.state.isSaving = !0, this.updateSavingState();
    try {
      let s;
      this.state.contentType?.id ? s = await this.api.update(this.state.contentType.id, r) : s = await this.api.create(r), this.state.contentType = s, this.state.originalSchema = s.schema ?? null, this.state.initialFieldsSignature = this.serializeFields(this.state.fields), this.state.isDirty = !1, this.showToast("Content type saved successfully", "success"), this.config.onSave?.(s);
    } catch (s) {
      v.error("Failed to save content type:", s);
      const i = s instanceof Error ? s.message : "Failed to save content type";
      this.showToast(i, "error");
    } finally {
      this.state.isSaving = !1, this.updateSavingState();
    }
  }
  buildSchemaPayload() {
    const e = B(this.state.fields, this.getSlug());
    return !this.schemaHasChanges() && this.state.originalSchema ? this.state.originalSchema : U(this.state.originalSchema, e);
  }
  schemaHasChanges() {
    return this.state.initialFieldsSignature ? this.serializeFields(this.state.fields) !== this.state.initialFieldsSignature : !0;
  }
  serializeFields(e) {
    const t = e.map((a) => ({
      name: a.name,
      type: a.type,
      label: a.label,
      description: a.description,
      placeholder: a.placeholder,
      helpText: a.helpText,
      required: a.required,
      readonly: a.readonly,
      hidden: a.hidden,
      filterable: a.filterable,
      defaultValue: a.defaultValue,
      section: a.section,
      gridSpan: a.gridSpan,
      order: a.order,
      validation: a.validation,
      config: a.config
    }));
    return JSON.stringify(t);
  }
  addField(e) {
    const t = P(e);
    if (e === "blocks") {
      const r = new Set(this.state.fields.map((c) => c.name));
      let s = "content_blocks", i = "Content Blocks", n = 1;
      for (; r.has(s); )
        s = `content_blocks_${n}`, i = `Content Blocks ${n}`, n++;
      const o = {
        id: C(),
        name: s,
        type: e,
        label: i,
        required: !1,
        order: this.state.fields.length,
        ...t?.defaultConfig ?? {}
      };
      this.state.fields.push(o), this.state.selectedFieldId = o.id, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview(), this.loadBlocksForField(o);
      return;
    }
    const a = {
      id: C(),
      name: `new_${e}_${this.state.fields.length + 1}`,
      type: e,
      label: t?.label ?? e,
      required: !1,
      order: this.state.fields.length,
      ...t?.defaultConfig ?? {}
    };
    new M({
      field: a,
      existingFieldNames: this.state.fields.map((r) => r.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (r) => {
        this.state.fields.push(r), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
      },
      onCancel: () => {
      }
    }).show();
  }
  editField(e) {
    const t = this.state.fields.find((a) => a.id === e);
    t && new M({
      field: t,
      existingFieldNames: this.state.fields.filter((a) => a.id !== e).map((a) => a.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (a) => {
        const r = this.state.fields.findIndex((s) => s.id === e);
        r !== -1 && (this.state.fields[r] = a, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview());
      },
      onCancel: () => {
      }
    }).show();
  }
  addFieldSet(e) {
    const t = ge(e);
    if (!t) return;
    const a = new Set(this.state.fields.map((s) => s.name));
    let r = this.state.fields.length;
    for (const s of t.fields) {
      let i = s.name, n = 1;
      for (; a.has(i); ) i = `${s.name}_${n++}`;
      a.add(i);
      const o = P(s.type), c = {
        id: C(),
        name: i,
        type: s.type,
        label: s.label,
        required: s.required ?? !1,
        order: r++,
        ...o?.defaultConfig ?? {}
      };
      this.state.fields.push(c);
    }
    this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview(), this.showToast(`Added ${t.fields.length} fields from the "${t.label}" template.`, "success");
  }
  async removeField(e) {
    const t = this.state.fields.findIndex((r) => r.id === e);
    if (t === -1) return;
    const a = this.state.fields[t];
    await E.confirm(`Remove field "${a.label}"?`, {
      title: "Remove Field",
      confirmText: "Remove",
      confirmVariant: "danger"
    }) && (this.state.fields.splice(t, 1), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview());
  }
  moveField(e, t, a) {
    const r = this.state.fields.findIndex((b) => b.id === e);
    if (r === -1) return;
    const s = this.state.fields[r], i = s.section || y, n = t || y, o = this.groupFieldsBySection(), c = o.get(i);
    if (!c) return;
    const l = c.findIndex((b) => b.id === e);
    if (l === -1) return;
    c.splice(l, 1), c.length === 0 && o.delete(i), o.has(n) || o.set(n, []);
    const u = o.get(n);
    let g = Math.max(0, Math.min(a, u.length));
    i === n && l < g && (g -= 1), u.splice(g, 0, s), s.section = n === y ? void 0 : n;
    const p = /* @__PURE__ */ new Map();
    o.has(y) && p.set(y, o.get(y));
    for (const [b, h] of o)
      b !== y && p.set(b, h);
    this.state.fields = Array.from(p.values()).flat(), this.state.fields.forEach((b, h) => {
      b.order = h;
    }), this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
  }
  moveFieldByDirection(e, t) {
    const a = this.state.fields.find((l) => l.id === e);
    if (!a) return;
    const r = a.section || y, s = this.state.fields.filter((l) => (l.section || y) === r), i = s.findIndex((l) => l.id === e), n = i + t;
    if (n < 0 || n >= s.length) return;
    const o = this.state.fields.indexOf(s[i]), c = this.state.fields.indexOf(s[n]);
    [this.state.fields[o], this.state.fields[c]] = [this.state.fields[c], this.state.fields[o]], this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
  }
  async validateSchema() {
    const e = this.buildSchemaPayload();
    try {
      const t = await this.api.validateSchema({
        schema: e,
        slug: this.getSlug(),
        ui_schema: this.buildUISchema()
      });
      t.valid ? (this.state.validationErrors = [], this.showToast("Schema is valid", "success")) : (this.state.validationErrors = t.errors ?? [], this.showToast("Schema has validation errors", "error"));
    } catch (t) {
      v.error("Validation failed:", t);
      const a = t instanceof Error ? t.message : "Validation failed";
      this.showToast(a, "error");
    }
    this.renderValidationErrors();
  }
  async previewSchema() {
    if (this.state.fields.length === 0) {
      this.previewRequestSeq++, this.state.previewHtml = null, this.state.previewError = null, this.state.isPreviewing = !1, this.updatePreviewState();
      const a = this.previewQuery("[data-ct-preview-container]");
      a && (a.innerHTML = `
          <div class="flex flex-col items-center justify-center h-40 text-gray-400">
            <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            </svg>
            <p class="text-sm">Add fields to preview the form</p>
          </div>
        `);
      return;
    }
    const e = B(this.state.fields, this.getSlug()), t = ++this.previewRequestSeq;
    this.state.isPreviewing = !0, this.updatePreviewState();
    try {
      const a = await this.api.previewSchema({
        schema: e,
        slug: this.getSlug(),
        ui_schema: this.buildUISchema()
      });
      if (t !== this.previewRequestSeq) return;
      this.state.previewHtml = a.html, this.state.previewError = null, this.renderPreview();
    } catch (a) {
      if (t !== this.previewRequestSeq) return;
      v.error("Preview failed:", a);
      const r = a instanceof Error ? a.message : "Preview failed";
      this.state.previewHtml = null, this.state.previewError = r, this.renderPreview();
    } finally {
      t === this.previewRequestSeq && (this.state.isPreviewing = !1, this.updatePreviewState());
    }
  }
  render() {
    V(), this.palettePanel = null, this.container.innerHTML = `
      <div class="content-type-editor flex flex-col h-full" data-content-type-editor>
        <!-- Header -->
        ${this.renderHeader()}

        <!-- Main Content -->
        <div class="flex-1 flex flex-col overflow-hidden min-h-0" data-ct-editor-layout>
          <!-- Left Panel: Basic Info + Fields -->
          <div class="flex-1 min-h-0 overflow-y-auto p-6 space-y-6" data-ct-editor-main>
            ${this.renderBasicInfo()}
            ${this.renderFieldsSection()}
            ${this.renderCapabilitiesSection()}
          </div>
        </div>

        <!-- Validation Errors -->
        <div data-ct-validation-errors class="hidden"></div>
      </div>
    `, this.renderPreviewRegion(), this.refreshDashboardShell();
  }
  renderPreviewRegion() {
    const e = this.previewHost(), t = `
      <div data-ct-palette class="${this.paletteVisible ? "" : "hidden"} shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Field Palette</h3>
        </div>
        <div data-ct-palette-container class="h-[260px] overflow-y-auto"></div>
      </div>
      <div class="flex-1 overflow-y-auto min-h-0">
        ${this.renderPreviewPanel()}
      </div>
    `;
    if (e === this.container) {
      this.container.insertAdjacentHTML("beforeend", `<aside data-content-type-preview-region class="hidden">${t}</aside>`), this.syncDynamicShellControls();
      return;
    }
    e.innerHTML = t, this.syncDynamicShellControls();
  }
  refreshDashboardShell() {
    const e = this.shellRoot(), t = window.DashboardShell;
    e && t?.initShell && e.getAttribute("data-dashboard-shell-init") !== "true" && t.initShell(e);
  }
  syncDynamicShellControls() {
    const e = this.shellRoot();
    if (!e || e.getAttribute("data-dashboard-shell-init") !== "true") return;
    const t = e.querySelector('[data-shell-region="preview"]');
    if (t) {
      const r = t.getAttribute("data-collapsed") === "true";
      e.querySelectorAll('[data-shell-toggle="preview"]').forEach((s) => {
        s.setAttribute("aria-expanded", r ? "false" : "true"), s.setAttribute("data-shell-collapsed", r ? "true" : "false");
      });
    }
    const a = e.getAttribute("data-shell-focus") || "";
    e.querySelectorAll("[data-shell-focus-toggle]").forEach((r) => {
      const s = r.getAttribute("data-shell-focus-toggle") || "";
      r.setAttribute("aria-pressed", a === s ? "true" : "false");
    });
  }
  renderBasicInfo() {
    const e = this.state.contentType;
    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Basic Information</h2>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="${f()}">
              Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              data-ct-name
              value="${d(e?.name ?? "")}"
              placeholder="Blog Post"
              required
              class="${w()}"
            />
          </div>

          <div>
            <label class="${f()}">
              Slug
            </label>
            <input
              type="text"
              data-ct-slug
              value="${d(e?.slug ?? "")}"
              placeholder="blog-post"
              pattern="^[a-z][a-z0-9_\\-]*$"
              class="${w()}"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Auto-generated from name if empty</p>
          </div>
        </div>

        <div class="mt-4">
          <label class="${f()}">
            Description
          </label>
          <textarea
            data-ct-description
            rows="2"
            placeholder="Describe this content type"
            class="${ne()}"
          >${d(e?.description ?? "")}</textarea>
        </div>

        <div class="mt-4">
          <label class="${f()}">
            Icon
          </label>
          ${H(e?.icon ?? "", "data-ct-icon")}
        </div>
      </div>
    `;
  }
  renderFieldsSection() {
    const e = this.state.layout.type ?? "flat", t = e === "tabs" ? "Tabs" : e === "sections" ? "Sections" : "Flat";
    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-4">
            <h2 class="text-sm font-medium text-gray-900 dark:text-white">
              Fields (${this.state.fields.length})
            </h2>
            <button
              type="button"
              data-ct-layout
              class="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"></path>
              </svg>
              Layout: ${t}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              data-shell-toggle="preview"
              aria-expanded="true"
              class="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4h11v16H9M4 8l4 4-4 4"></path>
              </svg>
              Preview
            </button>
            <button
              type="button"
              data-ct-toggle-palette
              aria-expanded="${this.paletteVisible ? "true" : "false"}"
              class="flex items-center gap-1 px-2 py-1 text-xs ${this.paletteVisible ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800"} rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h8m-8 6h16"></path>
              </svg>
              Palette
            </button>
            <button
              type="button"
              data-ct-add-field
              class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
              </svg>
              Add Field
            </button>
          </div>
        </div>

        <div data-ct-field-list class="p-4">
          ${this.renderFieldListHTML()}
        </div>
      </div>
    `;
  }
  renderFieldListHTML() {
    return this.renderFieldListContent();
  }
  toggleFieldExpansion(e) {
    if (this.state.selectedFieldId = this.state.selectedFieldId === e ? null : e, this.renderFieldList(), !this.state.selectedFieldId) return;
    const t = this.state.fields.find((a) => a.id === this.state.selectedFieldId);
    t && k(t.type) === "blocks" && this.loadBlocksForField(t);
  }
  renderFieldCard(e, t, a) {
    const r = k(e.type) === "blocks", s = r && this.state.selectedFieldId === e.id, i = this.state.validationErrors.filter((p) => p.path.includes(`/${e.name}`) || p.path.includes(`properties.${e.name}`)), n = i.length > 0, o = [];
    e.validation?.minLength !== void 0 && o.push(`min: ${e.validation.minLength}`), e.validation?.maxLength !== void 0 && o.push(`max: ${e.validation.maxLength}`), e.validation?.min !== void 0 && o.push(`>= ${e.validation.min}`), e.validation?.max !== void 0 && o.push(`<= ${e.validation.max}`), e.validation?.pattern && o.push("pattern");
    const c = a ?? this.state.fields, l = c.indexOf(e), u = this.fieldActionsMenuId === e.id, g = `
          <div class="relative flex-shrink-0">
            ${te(e.id)}
            ${u ? this.renderFieldActionsMenu(e) : ""}
          </div>`;
    return W({
      field: e,
      sectionName: e.section || y,
      isSelected: this.state.selectedFieldId === e.id,
      isExpanded: s,
      hasErrors: n,
      errorMessages: i.map((p) => p.message),
      constraintBadges: o,
      index: t,
      actionsHtml: g,
      showReorderButtons: !0,
      isFirst: l === 0,
      isLast: l === c.length - 1,
      compact: !1,
      renderExpandedContent: r ? () => this.renderBlocksInlineContent(e) : void 0
    });
  }
  renderFieldActionsMenu(e) {
    const t = "w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2";
    return `
      <div data-ct-field-actions-menu class="absolute right-0 top-full mt-1 z-30 w-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
        <button type="button" data-field-action-edit="${d(e.id)}" class="${t}">
          <svg class="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit
        </button>
        <button type="button" data-field-action-remove="${d(e.id)}" class="${t} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          Remove
        </button>
      </div>`;
  }
  renderBlocksInlineContent(e) {
    const t = e.config ?? {}, a = this.getBlocksPickerMode(e.id) === "allowed", r = new Set(a ? t.allowedBlocks ?? [] : t.deniedBlocks ?? []), s = "px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded", i = a ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800", n = a ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300", o = a ? "Allowed Blocks" : "Denied Blocks", c = a ? "blue" : "red", l = a ? "All blocks allowed (no restrictions)" : "No blocks denied";
    let u;
    if (this.cachedBlocks) {
      const g = F(r, this.cachedBlocks);
      u = A({
        availableBlocks: this.cachedBlocks,
        selectedBlocks: g,
        onSelectionChange: () => {
        },
        label: o,
        accent: c,
        emptySelectionText: l
      });
    } else u = `
        <div class="flex items-center justify-center py-6" data-ct-blocks-loading="${d(e.id)}">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">Loading blocks...</span>
        </div>`;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${d(e.id)}">
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1 p-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button type="button" data-ct-blocks-mode-toggle="${d(e.id)}" data-ct-blocks-mode="allowed"
                    class="${s} ${i}">
              Allowed
            </button>
            <button type="button" data-ct-blocks-mode-toggle="${d(e.id)}" data-ct-blocks-mode="denied"
                    class="${s} ${n}">
              Denied
            </button>
          </div>
          <a href="${d(this.blockLibraryURL())}" data-ct-blocks-open-library="${d(e.id)}"
             class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Open Block Library
          </a>
        </div>
        <div data-ct-blocks-picker-container="${d(e.id)}">
          ${u}
        </div>
        <div class="flex items-center justify-between">
          <button type="button" data-ct-blocks-advanced="${d(e.id)}"
                  class="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium">
            Advanced settings...
          </button>
        </div>
      </div>`;
  }
  renderCapabilitiesSection() {
    const e = this.state.contentType?.capabilities ?? {}, t = typeof e.navigation == "object" && e.navigation !== null ? e.navigation : {}, a = t.enabled === !0, r = Array.isArray(t.eligible_locations) ? t.eligible_locations.map((l) => String(l).trim()).filter(Boolean).join(", ") : "", s = Array.isArray(t.default_locations) ? t.default_locations.map((l) => String(l).trim()).filter(Boolean).join(", ") : "", i = t.allow_instance_override !== !1, n = t.default_visible !== !1, o = String(t.merge_mode ?? "append").trim().toLowerCase(), c = [
      "append",
      "prepend",
      "replace"
    ].includes(o) ? o : "append";
    return `
      <div class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 class="text-sm font-medium text-gray-900 dark:text-white mb-4">Capabilities</h2>

        <div class="grid grid-cols-2 gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="versioning"
              ${e.versioning ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Versioning</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="scheduling"
              ${e.scheduling ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Scheduling</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="seo"
              ${e.seo ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">SEO Fields</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="localization"
              ${e.localization ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Localization</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-ct-cap="blocks"
              ${e.blocks ? "checked" : ""}
              class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">Block Editor</span>
          </label>
        </div>

        <div class="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700 space-y-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Navigation Settings</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">Configure eligible/default locations and per-entry override policy.</p>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                data-ct-navigation-enabled
                ${a ? "checked" : ""}
                class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              Enabled
            </label>
          </div>

          <div class="grid gap-3 md:grid-cols-2">
            <label class="text-xs text-gray-600 dark:text-gray-300">
              Eligible Locations (csv)
              <input
                type="text"
                data-ct-navigation-eligible
                value="${d(r)}"
                placeholder="site.main, site.footer"
                class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-slate-800"
              />
            </label>
            <label class="text-xs text-gray-600 dark:text-gray-300">
              Default Locations (csv)
              <input
                type="text"
                data-ct-navigation-defaults
                value="${d(s)}"
                placeholder="site.main"
                class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-slate-800"
              />
            </label>
            <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                data-ct-navigation-allow-override
                ${i ? "checked" : ""}
                class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              Allow instance override
            </label>
            <label class="inline-flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                data-ct-navigation-default-visible
                ${n ? "checked" : ""}
                class="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
              />
              Default visible
            </label>
            <label class="text-xs text-gray-600 dark:text-gray-300 md:col-span-2">
              Merge Mode
              <select
                data-ct-navigation-merge-mode
                class="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1.5 text-sm bg-white dark:bg-slate-800"
              >
                <option value="append" ${c === "append" ? "selected" : ""}>append</option>
                <option value="prepend" ${c === "prepend" ? "selected" : ""}>prepend</option>
                <option value="replace" ${c === "replace" ? "selected" : ""}>replace</option>
              </select>
            </label>
          </div>
          <p class="text-[11px] text-gray-500 dark:text-gray-400">Default Locations must be a subset of the Eligible Locations listed above.</p>
        </div>
      </div>
    `;
  }
  renderPreviewPanel() {
    return `
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-medium text-gray-900 dark:text-white">Form Preview</h2>
            <span data-ct-preview-loading class="hidden inline-flex items-center" role="status" aria-label="Updating preview">
              <svg class="w-3.5 h-3.5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </span>
          </div>
          <div class="flex items-center gap-3">
            <button
              type="button"
              data-shell-focus-toggle="preview"
              class="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Focus form preview"
              aria-pressed="false"
              title="Focus preview"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3m8 0h3a2 2 0 002-2v-3"></path>
              </svg>
              Focus
            </button>
            <button
              type="button"
              data-ct-expand-preview
              class="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Open interactive preview"
              title="Open a larger, interactive preview"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
              </svg>
              Expand
            </button>
            <button
              type="button"
              data-shell-toggle="preview"
              class="text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Collapse form preview"
              aria-expanded="true"
              title="Collapse preview"
            >
              Hide
            </button>
            <button
              type="button"
              data-ct-refresh-preview
              class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Refresh
            </button>
          </div>
        </div>

        <p class="mb-2 text-[11px] text-gray-400 dark:text-gray-500">Live, read-only preview. Use Expand to interact.</p>

        <div
          data-ct-preview-container
          class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 min-h-[200px]"
        >
          ${this.state.previewHtml ? this.wrapReadonlyPreview(this.state.previewHtml) : `
            <div class="flex flex-col items-center justify-center h-40 text-gray-400">
              <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              <p class="text-sm">Add fields to see a live preview</p>
            </div>
          `}
        </div>
      </div>
    `;
  }
  wrapReadonlyPreview(e) {
    return ae(e);
  }
  renderHeader() {
    const e = this.state.contentType;
    return re({
      name: e ? "Edit Content Type" : "Create Content Type",
      subtitle: e ? `Editing: ${e.name}` : "Define fields and configure your content type",
      status: e?.status,
      version: e?.schema_version,
      actions: this.renderHeaderActions()
    });
  }
  renderHeaderActions() {
    const e = this.state.contentType, t = "px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700";
    return `
      ${this.state.validationErrors.length > 0 ? `
        <span class="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          ${this.state.validationErrors.length} error${this.state.validationErrors.length > 1 ? "s" : ""}
        </span>
      ` : ""}
      ${e ? this.renderLifecycleActions(e) : ""}
      <button type="button" data-ct-validate class="${t}">Validate</button>
      <button type="button" data-ct-cancel class="${t}">Cancel</button>
      <button type="button" data-ct-save class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
        ${e ? "Save Changes" : "Create Content Type"}
      </button>
    `;
  }
  renderLifecycleActions(e) {
    const t = (e.status ?? "").toLowerCase();
    return `
      <div class="relative" data-ct-lifecycle-menu>
        <button
          type="button"
          data-ct-lifecycle-trigger
          class="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"></path>
          </svg>
          Actions
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div
          data-ct-lifecycle-dropdown
          class="hidden absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
        >
          <div class="py-1">
            ${t === "" || t === "draft" ? `
              <button
                type="button"
                data-ct-publish
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Publish
              </button>
            ` : t === "active" || t === "published" ? `
              <button
                type="button"
                data-ct-deprecate
                class="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
                Deprecate
              </button>
            ` : ""}
            <button
              type="button"
              data-ct-clone
              class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
              Clone
            </button>
            <div class="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button
              type="button"
              data-ct-versions
              class="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Version History
            </button>
          </div>
        </div>
      </div>
    `;
  }
  async publishContentType() {
    if (!this.state.contentType?.id) return;
    const e = this.buildSchemaPayload();
    let t = null, a = null;
    try {
      t = await this.api.checkCompatibility(this.state.contentType.id, e, this.buildUISchema());
    } catch (r) {
      a = r instanceof Error ? r.message : "Compatibility check failed";
    }
    new ye({
      contentType: this.state.contentType,
      compatibilityResult: t,
      compatibilityError: a ?? void 0,
      onConfirm: async (r) => {
        try {
          const s = await this.api.publish(this.state.contentType.id, r);
          this.state.contentType = s, this.state.isDirty = !1, this.render(), this.bindEvents(), this.showToast("Content type published successfully", "success"), this.config.onSave?.(s);
        } catch (s) {
          const i = s instanceof Error ? s.message : "Failed to publish content type";
          this.showToast(i, "error");
        }
      },
      onCancel: () => {
      }
    }).show();
  }
  async deprecateContentType() {
    if (this.state.contentType?.id && await E.confirm(`Are you sure you want to deprecate "${this.state.contentType.name}"? Deprecated content types can still be used but are hidden from new content creation.`, {
      title: "Deprecate Content Type",
      confirmText: "Deprecate",
      confirmVariant: "danger"
    }))
      try {
        const e = await this.api.deprecate(this.state.contentType.id);
        this.state.contentType = e, this.render(), this.bindEvents(), this.showToast("Content type deprecated successfully", "success"), this.config.onSave?.(e);
      } catch (e) {
        const t = e instanceof Error ? e.message : "Failed to deprecate content type";
        this.showToast(t, "error");
      }
  }
  async cloneContentType() {
    this.state.contentType?.id && new be({
      contentType: this.state.contentType,
      onConfirm: async (e, t) => {
        try {
          const a = await this.api.clone(this.state.contentType.id, e, t);
          this.showToast(`Content type cloned as "${a.name}"`, "success"), this.config.onSave && this.config.onSave(a);
        } catch (a) {
          const r = a instanceof Error ? a.message : "Failed to clone content type";
          this.showToast(r, "error");
        }
      },
      onCancel: () => {
      }
    }).show();
  }
  showVersionHistory() {
    this.state.contentType?.id && new ve({
      apiBasePath: this.config.apiBasePath,
      contentType: this.state.contentType
    }).show();
  }
  bindEvents() {
    this.staticEventsBound || (this.bindStaticEvents(), this.staticEventsBound = !0), this.bindDynamicEvents();
  }
  bindStaticEvents() {
    this.container.addEventListener("click", (e) => {
      const t = e.target, a = t.closest("[data-ct-preset]");
      if (a) {
        this.addFieldSet(a.dataset.ctPreset);
        return;
      }
      const r = t.closest("[data-field-actions]");
      if (r) {
        e.stopPropagation();
        const h = r.dataset.fieldActions;
        this.fieldActionsMenuId = this.fieldActionsMenuId === h ? null : h, this.renderFieldList();
        return;
      }
      const s = t.closest("[data-field-action-edit]");
      if (s) {
        const h = s.dataset.fieldActionEdit;
        this.fieldActionsMenuId = null, this.editField(h);
        return;
      }
      const i = t.closest("[data-field-action-remove]");
      if (i) {
        const h = i.dataset.fieldActionRemove;
        this.fieldActionsMenuId = null, this.removeField(h);
        return;
      }
      const n = t.closest("[data-field-move-up]");
      if (n && !n.hasAttribute("disabled")) {
        e.stopPropagation();
        const h = n.dataset.fieldMoveUp;
        this.moveFieldByDirection(h, -1);
        return;
      }
      const o = t.closest("[data-field-move-down]");
      if (o && !o.hasAttribute("disabled")) {
        e.stopPropagation();
        const h = o.dataset.fieldMoveDown;
        this.moveFieldByDirection(h, 1);
        return;
      }
      const c = t.closest("[data-ct-blocks-mode-toggle]");
      if (c) {
        const h = c.dataset.ctBlocksModeToggle, x = c.dataset.ctBlocksMode ?? "allowed";
        this.blockPickerModes.set(h, x), this.renderFieldList();
        const m = this.state.fields.find((O) => O.id === h);
        m && k(m.type) === "blocks" && this.loadBlocksForField(m);
        return;
      }
      const l = t.closest("[data-ct-blocks-advanced]");
      if (l) {
        const h = l.dataset.ctBlocksAdvanced;
        h && this.editField(h);
        return;
      }
      const u = t.closest("[data-ct-blocks-retry]");
      if (u) {
        const h = u.dataset.ctBlocksRetry, x = this.state.fields.find((m) => m.id === h);
        x && (this.cachedBlocks = null, this.loadBlocksForField(x));
        return;
      }
      const g = t.closest("[data-field-expand-toggle]");
      if (g) {
        e.stopPropagation();
        const h = g.dataset.fieldExpandToggle;
        this.toggleFieldExpansion(h);
        return;
      }
      const p = t.closest("[data-field-toggle]");
      if (p && !t.closest("button")) {
        const h = p.dataset.fieldToggle;
        this.toggleFieldExpansion(h);
        return;
      }
      const b = t.closest("[data-field-card]");
      if (b && !t.closest("button") && !t.closest("[data-field-props]")) {
        const h = b.getAttribute("data-field-card");
        h && (this.state.selectedFieldId = this.state.selectedFieldId === h ? null : h, this.renderFieldList());
      }
      this.fieldActionsMenuId && !t.closest("[data-field-actions]") && !t.closest("[data-ct-field-actions-menu]") && (this.fieldActionsMenuId = null, this.renderFieldList());
    }), this.container.addEventListener("input", (e) => {
      const t = e.target;
      if ((t.matches("[data-ct-name], [data-ct-slug], [data-ct-description], [data-ct-icon]") || t.matches("[data-ct-cap]")) && (this.state.isDirty = !0, this.updateDirtyState()), t.matches("[data-ct-name]")) {
        const a = t, r = this.container.querySelector("[data-ct-slug]");
        r && !r.dataset.userModified && !this.state.contentType?.slug && (r.value = L(a.value)), this.schedulePreview();
        return;
      }
      if (t.matches("[data-ct-slug]")) {
        const a = t;
        a.dataset.userModified = "true", this.schedulePreview();
        return;
      }
    });
  }
  bindDynamicEvents() {
    this.container.querySelector("[data-ct-save]")?.addEventListener("click", () => this.save()), this.container.querySelector("[data-ct-validate]")?.addEventListener("click", () => this.validateSchema()), this.container.querySelector("[data-ct-cancel]")?.addEventListener("click", () => this.config.onCancel?.()), this.bindLifecycleMenuEvents(), this.container.querySelector("[data-ct-add-field]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-add-field-empty]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-toggle-palette]")?.addEventListener("click", () => this.togglePalette()), this.initPaletteIfNeeded(), this.container.querySelector("[data-ct-layout]")?.addEventListener("click", () => this.showLayoutEditor()), this.previewQuery("[data-ct-refresh-preview]")?.addEventListener("click", () => this.previewSchema()), this.previewQuery("[data-ct-expand-preview]")?.addEventListener("click", () => this.openInteractivePreview()), z(this.container, "[data-icon-trigger]", (e) => {
      const t = e.querySelector("[data-ct-icon]");
      return {
        value: t?.value ?? "",
        onSelect: (a) => {
          t && (t.value = a, this.state.isDirty = !0, this.updateDirtyState());
        },
        onClear: () => {
          t && (t.value = "", this.state.isDirty = !0, this.updateDirtyState());
        }
      };
    }), this.bindSectionToggleEvents(), this.bindDragEvents();
  }
  removeDropIndicator() {
    this.dropIndicator && this.dropIndicator.parentNode && this.dropIndicator.parentNode.removeChild(this.dropIndicator), this.dropIndicator = null;
  }
  getOrCreateDropIndicator() {
    return this.dropIndicator || (this.dropIndicator = document.createElement("div"), this.dropIndicator.className = "drop-indicator h-0.5 bg-blue-500 rounded-full my-1 pointer-events-none"), this.dropIndicator;
  }
  bindDragEvents() {
    const e = this.container.querySelector("[data-ct-field-list]");
    e && (e.addEventListener("dragstart", (t) => {
      const a = t, r = a.target.closest("[data-field-card]");
      if (!r) return;
      const s = r.getAttribute("data-field-card"), i = parseInt(r.getAttribute("data-field-index") ?? "0", 10), n = r.getAttribute("data-field-section") ?? y;
      this.dragState = {
        fieldId: s ?? "",
        startSection: n,
        currentSection: n,
        startIndex: i,
        currentIndex: i
      }, r.classList.add("opacity-50"), a.dataTransfer?.setData("text/plain", s ?? ""), a.dataTransfer && (a.dataTransfer.effectAllowed = "move");
    }), e.addEventListener("dragenter", (t) => {
      t.preventDefault();
    }), e.addEventListener("dragover", (t) => {
      t.preventDefault();
      const a = t;
      if (!this.dragState) return;
      const r = a.clientY, s = a.target;
      this.dragOverRAF || (this.dragOverRAF = requestAnimationFrame(() => {
        if (this.dragOverRAF = null, !this.dragState) return;
        const i = s.closest("[data-field-card]");
        if (!i || i.getAttribute("data-field-card") === this.dragState.fieldId) return;
        const n = i.getBoundingClientRect(), o = n.top + n.height / 2, c = r < o, l = this.getOrCreateDropIndicator(), u = c ? i : i.nextSibling;
        (l.nextSibling !== u || l.parentNode !== i.parentElement) && i.parentElement?.insertBefore(l, u);
        const g = parseInt(i.getAttribute("data-field-index") ?? "0", 10), p = i.getAttribute("data-field-section") ?? y;
        this.dragState.currentSection = p, this.dragState.currentIndex = c ? g : g + 1;
      }));
    }), e.addEventListener("dragleave", (t) => {
      const a = t.relatedTarget;
      (!a || !e.contains(a)) && this.removeDropIndicator();
    }), e.addEventListener("drop", (t) => {
      if (t.preventDefault(), this.removeDropIndicator(), !this.dragState) return;
      const { fieldId: a, startIndex: r, currentIndex: s, startSection: i, currentSection: n } = this.dragState;
      (r !== s || i !== n) && this.moveField(a, n, s), this.dragState = null;
    }), e.addEventListener("dragend", () => {
      e.querySelectorAll(".opacity-50").forEach((t) => t.classList.remove("opacity-50")), this.removeDropIndicator(), this.dragOverRAF && (cancelAnimationFrame(this.dragOverRAF), this.dragOverRAF = null), this.dragState = null;
    }));
  }
  bindFieldDropZoneEvents(e) {
    e.querySelectorAll("[data-field-drop-zone]").forEach((t) => {
      t.addEventListener("dragover", (a) => {
        a.preventDefault(), a.dataTransfer.dropEffect = "copy", t.classList.remove("border-gray-200", "hover:border-gray-300", "border-transparent"), t.classList.add("border-blue-400", "bg-blue-50/50");
      }), t.addEventListener("dragleave", (a) => {
        t.contains(a.relatedTarget) || (t.classList.remove("border-blue-400", "bg-blue-50/50"), t.classList.add("border-gray-200", "hover:border-gray-300"));
      }), t.addEventListener("drop", (a) => {
        a.preventDefault(), t.classList.remove("border-blue-400", "bg-blue-50/50"), t.classList.add("border-gray-200", "hover:border-gray-300");
        const r = a.dataTransfer?.getData(ie);
        if (r) {
          const i = j(r, null);
          if (i?.type) {
            this.addField(i.type);
            return;
          }
        }
        const s = a.dataTransfer?.getData(Y);
        s && this.addField(s);
      });
    });
  }
  bindLifecycleMenuEvents() {
    const e = this.container.querySelector("[data-ct-lifecycle-menu]");
    if (!e) {
      this.lifecycleOutsideClickHandler && (document.removeEventListener("click", this.lifecycleOutsideClickHandler), this.lifecycleOutsideClickHandler = null);
      return;
    }
    const t = e.querySelector("[data-ct-lifecycle-trigger]"), a = e.querySelector("[data-ct-lifecycle-dropdown]");
    t && a && (t.addEventListener("click", (r) => {
      r.stopPropagation(), a.classList.toggle("hidden");
    }), this.lifecycleOutsideClickHandler && document.removeEventListener("click", this.lifecycleOutsideClickHandler), this.lifecycleOutsideClickHandler = (r) => {
      e.contains(r.target) || a.classList.add("hidden");
    }, document.addEventListener("click", this.lifecycleOutsideClickHandler)), this.container.querySelector("[data-ct-publish]")?.addEventListener("click", () => {
      a?.classList.add("hidden"), this.publishContentType();
    }), this.container.querySelector("[data-ct-deprecate]")?.addEventListener("click", () => {
      a?.classList.add("hidden"), this.deprecateContentType();
    }), this.container.querySelector("[data-ct-clone]")?.addEventListener("click", () => {
      a?.classList.add("hidden"), this.cloneContentType();
    }), this.container.querySelector("[data-ct-versions]")?.addEventListener("click", () => {
      a?.classList.add("hidden"), this.showVersionHistory();
    });
  }
  togglePalette() {
    this.paletteVisible = !this.paletteVisible;
    const e = this.previewQuery("[data-ct-palette]");
    e && e.classList.toggle("hidden", !this.paletteVisible);
    const t = this.container.querySelector("[data-ct-toggle-palette]");
    t && t.setAttribute("aria-expanded", String(this.paletteVisible)), this.initPaletteIfNeeded();
  }
  initPaletteIfNeeded() {
    if (!this.paletteVisible || this.palettePanel) return;
    const e = this.previewQuery("[data-ct-palette-container]");
    e && (this.palettePanel = new K({
      container: e,
      api: this.api,
      onAddField: (t) => this.addField(t.type)
    }), this.palettePanel.init(), this.palettePanel.enable());
  }
  showFieldTypePicker() {
    new Q({
      onSelect: (e) => this.addField(e),
      onCancel: () => {
      }
    }).show();
  }
  showLayoutEditor() {
    new le({
      layout: this.state.layout,
      fields: this.state.fields,
      onSave: (e) => {
        this.state.layout = e, this.state.isDirty = !0, this.renderFieldList(), this.updateDirtyState(), this.schedulePreview();
        const t = this.container.querySelector("[data-ct-field-list]")?.closest(".rounded-lg");
        if (t) {
          const a = document.createElement("div");
          a.innerHTML = this.renderFieldsSection(), t.replaceWith(a.firstElementChild), this.bindFieldsEvents();
        }
      },
      onCancel: () => {
      }
    }).show();
  }
  bindFieldsEvents() {
    this.container.querySelector("[data-ct-add-field]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-add-field-empty]")?.addEventListener("click", () => this.showFieldTypePicker()), this.container.querySelector("[data-ct-layout]")?.addEventListener("click", () => this.showLayoutEditor()), this.container.querySelector("[data-ct-toggle-palette]")?.addEventListener("click", () => this.togglePalette()), this.palettePanel = null, this.initPaletteIfNeeded(), this.bindSectionToggleEvents(), this.bindDragEvents();
  }
  bindSectionToggleEvents() {
    this.container.querySelectorAll("[data-ct-toggle-section]").forEach((e) => {
      const t = e.getAttribute("data-ct-toggle-section");
      t && e.addEventListener("click", () => this.toggleSection(t));
    });
  }
  getSlug() {
    const e = this.container.querySelector("[data-ct-slug]"), t = this.container.querySelector("[data-ct-name]"), a = e?.value?.trim();
    return a || L(t?.value ?? "");
  }
  getDescription() {
    const e = this.container.querySelector("[data-ct-description]");
    if (e)
      return e.value.trim();
  }
  getIcon() {
    const e = this.container.querySelector("[data-ct-icon]");
    if (e)
      return e.value.trim();
  }
  getCapabilities() {
    const e = this.state.contentType?.capabilities, t = e && typeof e == "object" ? { ...e } : {};
    this.container.querySelectorAll("[data-ct-cap]").forEach((l) => {
      const u = l.getAttribute("data-ct-cap");
      u && (t[u] = l.checked);
    });
    const a = (l) => l.split(",").map((u) => u.trim()).filter(Boolean).filter((u, g, p) => p.indexOf(u) === g).sort(), r = this.container.querySelector("[data-ct-navigation-enabled]"), s = this.container.querySelector("[data-ct-navigation-eligible]"), i = this.container.querySelector("[data-ct-navigation-defaults]"), n = this.container.querySelector("[data-ct-navigation-allow-override]"), o = this.container.querySelector("[data-ct-navigation-default-visible]"), c = this.container.querySelector("[data-ct-navigation-merge-mode]");
    if (r) {
      const l = a(s?.value ?? ""), u = a(i?.value ?? ""), g = new Set(l), p = u.filter((b) => !g.has(b));
      p.length > 0 && this.showToast(`Navigation defaults must be a subset of eligible locations. Invalid: ${p.join(", ")}`, "error"), t.navigation = {
        enabled: r.checked,
        eligible_locations: l,
        default_locations: u.filter((b) => g.has(b)),
        allow_instance_override: n ? n.checked : !0,
        default_visible: o ? o.checked : !0,
        merge_mode: c?.value || "append"
      };
    }
    return t;
  }
  buildUISchema() {
    const e = {}, t = {
      type: this.state.layout.type ?? "flat",
      gridColumns: this.state.layout.gridColumns ?? 12
    };
    if (t.type === "tabs" || t.type === "sections") {
      const r = /* @__PURE__ */ new Map();
      (this.state.layout.tabs ?? []).forEach((s, i) => {
        r.set(s.id, {
          id: s.id,
          label: s.label,
          order: s.order ?? i,
          icon: s.icon
        });
      }), this.state.fields.forEach((s) => {
        s.section && !r.has(s.section) && r.set(s.section, {
          id: s.section,
          label: T(s.section),
          order: r.size
        });
      }), r.size > 0 && (t.tabs = Array.from(r.values()).sort((s, i) => s.order - i.order));
    }
    e.layout = t;
    const a = [];
    if (this.state.fields.forEach((r) => {
      const s = { path: `#/properties/${r.name}` }, i = {};
      r.section && (i.section = r.section), r.gridSpan && (i.grid = { span: r.gridSpan }), r.order !== void 0 && (i.order = r.order), r.readonly && (i.readonly = !0), r.hidden && (i.hidden = !0), Object.keys(i).length > 0 && (s["x-formgen"] = i, a.push(s));
    }), a.length > 0 && (e.overrides = a), !(t.type === "flat" && !t.tabs?.length && a.length === 0 || !e.layout && !e.overrides))
      return e;
  }
  updateLoadingState() {
    const e = this.container.querySelector("[data-ct-save]");
    e && (e.disabled = this.state.isLoading);
  }
  updateSavingState() {
    const e = this.container.querySelector("[data-ct-save]");
    e && (e.disabled = this.state.isSaving, e.textContent = this.state.isSaving ? "Saving..." : this.state.contentType ? "Save Changes" : "Create Content Type");
  }
  updatePreviewState() {
    const e = this.previewQuery("[data-ct-preview-loading]");
    e && e.classList.toggle("hidden", !this.state.isPreviewing);
    const t = this.previewQuery("[data-ct-refresh-preview]");
    t && (t.disabled = this.state.isPreviewing);
  }
  openInteractivePreview() {
    if (!this.state.previewHtml) {
      this.showToast("Add fields and wait for the preview to load first.", "info");
      return;
    }
    new se(this.state.previewHtml, () => this.initPreviewEditors()).show();
  }
  updateDirtyState() {
    const e = this.container.querySelector("[data-ct-save]");
    if (e) {
      let a = e.querySelector("[data-dirty-dot]");
      this.state.isDirty ? a || (a = document.createElement("span"), a.setAttribute("data-dirty-dot", ""), a.className = "inline-block w-2 h-2 rounded-full bg-orange-400 ml-1.5 align-middle", a.setAttribute("title", "Unsaved changes"), e.appendChild(a)) : a?.remove();
    }
    const t = this.container.querySelector("[data-content-type-editor] h1");
    if (t) {
      let a = t.parentElement?.querySelector("[data-dirty-badge]");
      this.state.isDirty ? a || (a = document.createElement("span"), a.setAttribute("data-dirty-badge", ""), a.className = "px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", a.textContent = "Modified", t.parentElement?.appendChild(a)) : a?.remove();
    }
  }
  renderFieldList() {
    const e = this.container.querySelector("[data-ct-field-list]");
    if (e) {
      e.innerHTML = this.renderFieldListContent(), this.bindSectionToggleEvents(), this.bindDragEvents(), this.bindFieldDropZoneEvents(e);
      const t = this.state.fields.find((a) => a.id === this.state.selectedFieldId);
      t && k(t.type) === "blocks" && this.cachedBlocks && this.renderInlineBlockPickerForField(t);
    }
  }
  renderFieldListContent() {
    if (this.state.fields.length === 0) return `
        <div class="flex flex-col items-center justify-center py-10 px-4 text-center">
          <svg class="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
          </svg>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">No fields yet</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mb-4">Start from a template or add fields one at a time.</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-xl mb-4">
            ${R.map((r) => `
            <button type="button" data-ct-preset="${d(r.id)}"
                    class="flex flex-col items-start gap-1 p-3 text-left rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors">
              <span class="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-100">
                ${r.icon}
                ${d(r.label)}
              </span>
              <span class="text-[11px] text-gray-400 dark:text-gray-500">${d(r.description)}</span>
            </button>`).join("")}
          </div>
          <button
            type="button"
            data-ct-add-field-empty
            class="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            + Add a field manually
          </button>
        </div>
      `;
    const e = this.groupFieldsBySection(), t = Array.from(e.keys());
    if (t.length <= 1) {
      const r = this.state.fields;
      return `
        <div class="space-y-2">
          ${r.map((s, i) => this.renderFieldCard(s, i, r)).join("")}
        </div>
        ${I({ highlight: !1 })}
      `;
    }
    let a = "";
    for (const r of t) {
      const s = e.get(r), i = this.getSectionState(r).collapsed;
      a += `
        <div data-ct-section="${d(r)}" class="border-b border-gray-100 dark:border-gray-800 last:border-b-0">
          <button type="button" data-ct-toggle-section="${d(r)}"
                  class="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
            <span class="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
              ${i ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${d(T(r))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${s.length}</span>
          </button>

          <div class="${i ? "hidden" : ""}" data-ct-section-body="${d(r)}">
            <div class="space-y-2 px-1 pb-2">
              ${s.map((n, o) => this.renderFieldCard(n, o, s)).join("")}
            </div>
          </div>
        </div>`;
    }
    return a += I({ highlight: !1 }), a;
  }
  groupFieldsBySection() {
    const e = /* @__PURE__ */ new Map();
    for (const t of this.state.fields) {
      const a = t.section || y;
      e.has(a) || e.set(a, []), e.get(a).push(t);
    }
    if (e.has(y)) {
      const t = e.get(y);
      e.delete(y);
      const a = /* @__PURE__ */ new Map();
      a.set(y, t);
      for (const [r, s] of e) a.set(r, s);
      return a;
    }
    return e;
  }
  getSectionState(e) {
    return this.sectionStates.has(e) || this.sectionStates.set(e, { collapsed: !1 }), this.sectionStates.get(e);
  }
  toggleSection(e) {
    const t = this.getSectionState(e);
    t.collapsed = !t.collapsed;
    const a = this.container.querySelector(`[data-ct-section-body="${e}"]`);
    a && a.classList.toggle("hidden", t.collapsed);
    const r = this.container.querySelector(`[data-ct-toggle-section="${e}"]`)?.querySelector("span:first-child");
    r && (r.innerHTML = t.collapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
  }
  getBlocksPickerMode(e) {
    return this.blockPickerModes.get(e) ?? "allowed";
  }
  async loadBlocksForField(e) {
    if (this.cachedBlocks) {
      this.renderInlineBlockPickerForField(e);
      return;
    }
    if (!this.blocksLoading) {
      this.blocksLoading = !0;
      try {
        this.cachedBlocks = await J(this.api), this.state.selectedFieldId === e.id && this.renderInlineBlockPickerForField(e);
      } catch (t) {
        const a = t instanceof Error ? t.message : "Failed to load block definitions";
        this.renderInlineBlockPickerError(e.id, a), this.showToast(`Failed to load block definitions: ${a}`, "error");
      } finally {
        this.blocksLoading = !1;
      }
    }
  }
  renderInlineBlockPickerError(e, t) {
    const a = this.container.querySelector(`[data-ct-blocks-picker-container="${e}"]`);
    a && (a.innerHTML = `
      <div class="rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-800/70 dark:bg-red-900/20">
        <div class="flex items-start gap-2">
          <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p class="text-xs text-red-700 dark:text-red-300">${d(t)}</p>
        </div>
        <button type="button" data-ct-blocks-retry="${d(e)}"
                class="mt-2 ml-6 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
          Retry
        </button>
      </div>
    `);
  }
  renderInlineBlockPickerForField(e) {
    const t = this.container.querySelector(`[data-ct-blocks-picker-container="${e.id}"]`);
    if (!t || !this.cachedBlocks) return;
    const a = e.config ?? {}, r = this.getBlocksPickerMode(e.id), s = r === "allowed", i = F(new Set(s ? a.allowedBlocks ?? [] : a.deniedBlocks ?? []), this.cachedBlocks), n = s ? "Allowed Blocks" : "Denied Blocks", o = s ? "blue" : "red", c = s ? "All blocks allowed (no restrictions)" : "No blocks denied";
    t.innerHTML = A({
      availableBlocks: this.cachedBlocks,
      selectedBlocks: i,
      onSelectionChange: (l) => this.applyBlockSelection(e, r, l),
      label: n,
      accent: o,
      emptySelectionText: c
    }), Z(t, {
      availableBlocks: this.cachedBlocks,
      selectedBlocks: i,
      onSelectionChange: (l) => this.applyBlockSelection(e, r, l),
      label: n,
      accent: o,
      emptySelectionText: c
    });
  }
  applyBlockSelection(e, t, a) {
    e.config || (e.config = {});
    const r = e.config;
    t === "allowed" ? a.size > 0 ? r.allowedBlocks = Array.from(a) : delete r.allowedBlocks : a.size > 0 ? r.deniedBlocks = Array.from(a) : delete r.deniedBlocks, Object.keys(e.config).length === 0 && (e.config = void 0), this.state.isDirty = !0, this.updateDirtyState(), this.schedulePreview();
  }
  renderPreview() {
    const e = this.previewQuery("[data-ct-preview-container]");
    e && (this.state.previewError ? e.innerHTML = `
        <div class="flex flex-col items-center justify-center h-40 text-red-400">
          <svg class="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p class="text-sm font-medium">Preview failed</p>
          <p class="text-xs text-red-300 mt-1 max-w-xs text-center">${this.state.previewError}</p>
        </div>
      ` : this.state.previewHtml && (e.innerHTML = this.wrapReadonlyPreview(this.state.previewHtml)));
  }
  initPreviewEditors() {
    ee();
  }
  renderValidationErrors() {
    const e = this.container.querySelector("[data-ct-validation-errors]");
    if (!e) return;
    if (this.state.validationErrors.length === 0) {
      e.classList.add("hidden"), e.innerHTML = "", this.renderFieldList();
      return;
    }
    const t = /* @__PURE__ */ new Map(), a = [];
    for (const r of this.state.validationErrors) {
      const s = r.path.match(/properties[./](\w+)/);
      if (s) {
        const i = s[1];
        t.has(i) || t.set(i, []), t.get(i).push(r);
      } else a.push(r);
    }
    e.classList.remove("hidden"), e.innerHTML = `
      <div class="fixed bottom-4 right-4 max-w-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-lg overflow-hidden z-40">
        <div class="flex items-center justify-between px-4 py-2 bg-red-100 dark:bg-red-900/40 border-b border-red-200 dark:border-red-800">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span class="text-sm font-medium text-red-800 dark:text-red-200">
              ${this.state.validationErrors.length} Validation Error${this.state.validationErrors.length > 1 ? "s" : ""}
            </span>
          </div>
          <button type="button" class="text-red-400 hover:text-red-600" data-close-validation-errors>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="px-4 py-3 max-h-64 overflow-y-auto">
          ${a.length > 0 ? `
            <div class="mb-3">
              <div class="text-xs font-medium text-red-700 dark:text-red-300 uppercase mb-1">Schema</div>
              <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                ${a.map((r) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${d(r.message)}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          ${Array.from(t.entries()).map(([r, s]) => {
      const i = this.state.fields.find((n) => n.name === r);
      return `
              <div class="mb-3 last:mb-0">
                <div class="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
                  ${d(i?.label ?? r)} <span class="font-mono">(${d(r)})</span>
                </div>
                <ul class="text-sm text-red-600 dark:text-red-400 space-y-1">
                  ${s.map((n) => `<li class="flex items-start gap-2"><span class="text-red-400">•</span>${d(n.message)}</li>`).join("")}
                </ul>
              </div>
            `;
    }).join("")}
        </div>
      </div>
    `, e.querySelector("[data-close-validation-errors]")?.addEventListener("click", () => {
      e.classList.add("hidden");
    }), this.renderFieldList();
  }
  showToast(e, t) {
    const a = window.notify?.[t];
    if (typeof a == "function") {
      a(e);
      return;
    }
    t === "error" ? v.error(e) : v.debug(e);
  }
  schedulePreview(e = 400) {
    this.previewDebounceTimer && clearTimeout(this.previewDebounceTimer), this.previewDebounceTimer = setTimeout(() => {
      this.previewDebounceTimer = null, this.previewSchema();
    }, e);
  }
}, ye = class extends S {
  constructor(e) {
    super({
      size: "lg",
      flexColumn: !1,
      ariaLabel: "Publish content type"
    }), this.config = e;
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const { contentType: e, compatibilityResult: t, compatibilityError: a } = this.config, r = !!a, s = (t?.breaking_changes?.length ?? 0) > 0, i = (t?.warnings?.length ?? 0) > 0, n = t?.affected_entries_count ?? 0, o = r || s, c = r ? "bg-gray-400 cursor-not-allowed" : s ? "bg-red-600 hover:bg-red-700 disabled:opacity-50" : "bg-green-600 hover:bg-green-700";
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Publish Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          You are about to publish <strong class="text-gray-900 dark:text-white">${d(e.name)}</strong>.
          ${e.status === "draft" ? "This will make it available for content creation." : "This will create a new version of the schema."}
        </p>

        ${r ? `
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm font-medium text-red-800 dark:text-red-200">Compatibility Check Failed</span>
            </div>
            <p class="ml-7 text-sm text-red-700 dark:text-red-300">
              Publishing is blocked until compatibility can be verified.
            </p>
            ${a ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${d(a)}
              </p>
            ` : ""}
          </div>
        ` : ""}

        ${!r && s ? `
          <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
              <span class="text-sm font-medium text-red-800 dark:text-red-200">Breaking Changes Detected</span>
            </div>
            <ul class="text-sm text-red-700 dark:text-red-300 space-y-1 ml-7">
              ${t.breaking_changes.map((l) => `
                <li>• ${d(l.description || `${l.type}: ${l.path}`)}</li>
              `).join("")}
            </ul>
            ${n > 0 ? `
              <p class="mt-2 ml-7 text-xs text-red-600 dark:text-red-400">
                ${n} content ${n === 1 ? "entry" : "entries"} will require migration.
              </p>
            ` : ""}
          </div>
        ` : ""}

        ${!r && i ? `
          <div class="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <svg class="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings</span>
            </div>
            <ul class="text-sm text-yellow-700 dark:text-yellow-300 space-y-1 ml-7">
              ${t.warnings.map((l) => `
                <li>• ${d(l.description || `${l.type}: ${l.path}`)}</li>
              `).join("")}
            </ul>
          </div>
        ` : ""}

        ${!r && !s && !i ? `
          <div class="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-sm font-medium text-green-800 dark:text-green-200">Schema is compatible</span>
            </div>
            <p class="mt-1 ml-7 text-sm text-green-700 dark:text-green-300">
              No breaking changes detected. Publishing is safe.
            </p>
          </div>
        ` : ""}

        ${!r && s ? `
          <label class="flex items-start gap-2">
            <input
              type="checkbox"
              data-publish-force
              class="mt-0.5 w-4 h-4 text-red-600 border-gray-300 dark:border-gray-600 rounded focus:ring-red-500"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300">
              I understand there are breaking changes and want to publish anyway
            </span>
          </label>
        ` : ""}
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-publish-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-publish-confirm
          class="px-4 py-2 text-sm font-medium text-white rounded-lg ${c}"
          ${o ? "disabled" : ""}
        >
          ${s ? "Publish with Breaking Changes" : "Publish"}
        </button>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-publish-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    });
    const e = this.container?.querySelector("[data-publish-confirm]"), t = this.container?.querySelector("[data-publish-force]"), a = !!this.config.compatibilityError;
    t?.addEventListener("change", () => {
      e && !a && (e.disabled = !t.checked);
    }), e?.addEventListener("click", () => {
      if (a) return;
      const r = t?.checked ?? !1;
      this.config.onConfirm(r), this.hide();
    });
  }
}, be = class extends S {
  constructor(e) {
    super({
      size: "md",
      initialFocus: "[data-clone-slug]",
      ariaLabel: "Clone content type"
    }), this.config = e;
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const { contentType: e } = this.config, t = `${e.slug}-copy`, a = `${e.name} (Copy)`;
    return `
      <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Clone Content Type
        </h2>
      </div>

      <div class="px-6 py-4 space-y-4">
        <p class="text-sm text-gray-600 dark:text-gray-400">
          Create a copy of <strong class="text-gray-900 dark:text-white">${d(e.name)}</strong> with a new slug and name.
        </p>

        <div>
          <label class="${f()}">
            New Slug <span class="text-red-500">*</span>
          </label>
          <input
            type="text"
            data-clone-slug
            value="${d(t)}"
            placeholder="my-content-type"
            pattern="^[a-z][a-z0-9_\\-]*$"
            required
            class="${w()}"
          />
          <p class="mt-1 text-xs text-gray-500">Lowercase letters, numbers, hyphens, underscores</p>
          <div data-clone-error class="hidden text-xs text-red-600 dark:text-red-400 mt-1"></div>
        </div>

        <div>
          <label class="${f()}">
            New Name
          </label>
          <input
            type="text"
            data-clone-name
            value="${d(a)}"
            placeholder="My Content Type"
            class="${w()}"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-clone-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-clone-confirm
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          Clone
        </button>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-clone-cancel]")?.addEventListener("click", () => {
      this.config.onCancel(), this.hide();
    }), this.container?.querySelector("[data-clone-confirm]")?.addEventListener("click", () => {
      const e = this.container?.querySelector("[data-clone-slug]"), t = this.container?.querySelector("[data-clone-name]"), a = e?.value?.trim(), r = t?.value?.trim(), s = this.container?.querySelector("[data-clone-error]"), i = (n) => {
        s && (s.textContent = n, s.classList.remove("hidden"));
      };
      if (!a) {
        i("Slug is required"), e?.focus();
        return;
      }
      if (!/^[a-z][a-z0-9_\-]*$/.test(a)) {
        i("Invalid slug format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter."), e?.focus();
        return;
      }
      this.config.onConfirm(a, r || void 0), this.hide();
    }), this.container?.addEventListener("keydown", (e) => {
      e.key === "Enter" && (e.preventDefault(), this.container?.querySelector("[data-clone-confirm]")?.click());
    });
  }
}, ve = class extends S {
  constructor(e) {
    super({
      size: "2xl",
      maxHeight: "max-h-[80vh]",
      ariaLabel: "Content type version history"
    }), this.versions = [], this.expandedVersions = /* @__PURE__ */ new Set(), this.config = e, this.api = new _({ basePath: e.apiBasePath });
  }
  async onAfterShow() {
    await this.loadVersions();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${d(this.config.contentType.name)} (${d(this.config.contentType.slug)})</p>
        </div>
        <button type="button" data-viewer-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div data-versions-list class="p-4">
          <div class="flex items-center justify-center py-8">
            <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-viewer-close]")?.addEventListener("click", () => {
      this.hide();
    });
  }
  async loadVersions() {
    try {
      const e = await this.api.getVersionHistory(this.config.contentType.id);
      this.versions = e.versions, this.renderVersionsList();
    } catch {
      this.renderVersionsList();
    }
  }
  renderVersionsList() {
    const e = this.container?.querySelector("[data-versions-list]");
    if (e) {
      if (this.versions.length === 0) {
        e.innerHTML = `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No version history available.</p>
          <p class="text-xs mt-2">Current version: ${d(this.config.contentType.schema_version ?? "1.0.0")}</p>
        </div>
      `;
        return;
      }
      e.innerHTML = `
      <div class="space-y-3">
        ${this.versions.map((t, a) => this.renderVersionCard(t, a === 0)).join("")}
      </div>
    `, e.querySelectorAll("[data-toggle-version]").forEach((t) => {
        t.addEventListener("click", () => {
          const a = t.getAttribute("data-toggle-version");
          a && (this.expandedVersions.has(a) ? this.expandedVersions.delete(a) : this.expandedVersions.add(a), this.renderVersionsList());
        });
      });
    }
  }
  renderVersionCard(e, t) {
    const a = this.expandedVersions.has(e.version), r = (e.changes?.length ?? 0) > 0, s = e.is_breaking || e.changes?.some((i) => i.is_breaking);
    return `
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div class="p-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">v${d(e.version)}</span>
              ${t ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Current</span>' : ""}
              ${s ? '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Breaking</span>' : ""}
              ${this.getMigrationBadge(e.migration_status)}
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 dark:text-gray-400">${oe(e.created_at)}</span>
            ${r ? `
              <button
                type="button"
                data-toggle-version="${d(e.version)}"
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <svg class="w-4 h-4 transition-transform ${a ? "rotate-180" : ""}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            ` : ""}
          </div>
        </div>

        ${e.migration_status && e.total_count ? `
          <div class="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
            <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>Migration Progress</span>
              <span>${e.migrated_count ?? 0}/${e.total_count}</span>
            </div>
            <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div class="h-full bg-blue-600 rounded-full" style="width: ${(e.migrated_count ?? 0) / e.total_count * 100}%"></div>
            </div>
          </div>
        ` : ""}

        ${a && r ? `
          <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-900">
            <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Changes</h4>
            <ul class="space-y-2">
              ${e.changes.map((i) => this.renderChangeItem(i)).join("")}
            </ul>
          </div>
        ` : ""}
      </div>
    `;
  }
  renderChangeItem(e) {
    return `
      <li class="flex items-start gap-2 text-sm">
        <span class="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded ${{
      added: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      removed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      modified: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
    }[e.type]}">
          <svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${{
      added: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>',
      removed: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path>',
      modified: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>'
    }[e.type]}
          </svg>
          ${e.type}
        </span>
        <div class="flex-1">
          <span class="font-mono text-xs text-gray-600 dark:text-gray-400">${d(e.path)}</span>
          ${e.field ? `<span class="text-gray-500 dark:text-gray-400"> (${d(e.field)})</span>` : ""}
          ${e.description ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">${d(e.description)}</p>` : ""}
          ${e.is_breaking ? '<span class="ml-1 text-xs text-red-500 dark:text-red-400">Breaking</span>' : ""}
        </div>
      </li>
    `;
  }
  getMigrationBadge(e) {
    switch (e) {
      case "pending":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</span>';
      case "in_progress":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Migrating</span>';
      case "completed":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Migrated</span>';
      case "failed":
        return '<span class="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Failed</span>';
      default:
        return "";
    }
  }
}, q = D("ContentTypeBuilder");
function fe(e = document) {
  Array.from(e.querySelectorAll("[data-content-type-editor-root]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const a = me(t);
    if (!a.apiBasePath) {
      q.warn("Content type editor missing apiBasePath", t);
      return;
    }
    const r = a.basePath ?? $(a.apiBasePath), s = String(a.channel ?? "").trim().toLowerCase(), i = s && s !== "default" ? `channel=${encodeURIComponent(s)}` : "";
    a.onCancel || (a.onCancel = () => {
      const n = `${r}/content/types`;
      window.location.href = i ? `${n}?${i}` : n;
    }), a.onSave || (a.onSave = (n) => {
      const o = n.slug ?? n.id;
      if (o) {
        const c = [`slug=${encodeURIComponent(o)}`];
        i && c.push(i), window.location.href = `${r}/content/types?${c.join("&")}`;
      }
    });
    try {
      new pe(t, a).init(), t.dataset.initialized = "true";
    } catch (n) {
      q.error("Content type editor failed to initialize:", n), t.innerHTML = `
        <div class="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <svg class="w-12 h-12 mb-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">Editor failed to load</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            ${n instanceof Error ? n.message : "An unexpected error occurred while initializing the editor."}
          </p>
          <button type="button" onclick="window.location.reload()"
            class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50">
            Reload page
          </button>
        </div>
      `;
    }
  });
}
function me(e) {
  let t = {};
  const a = e.getAttribute("data-content-type-editor-config");
  a && (t = j(a, {}));
  const r = X(t.apiBasePath, e.dataset.apiBasePath, e.dataset.basePath), s = t.basePath ?? $(r, e.dataset.basePath);
  return {
    ...t,
    apiBasePath: r,
    basePath: s,
    contentTypeId: t.contentTypeId ?? e.dataset.contentTypeId,
    channel: t.channel ?? e.dataset.channel,
    locale: t.locale ?? e.dataset.locale
  };
}
function Fe(e = document) {
  de(e), fe(e);
}
export {
  ge as a,
  R as i,
  fe as n,
  le as o,
  pe as r,
  Fe as t
};

//# sourceMappingURL=content-editor-runtime-BKzt9Yyx.js.map