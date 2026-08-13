import { escapeHTML as l } from "../shared/html.js";
import { i as v, r as u, t as f } from "../chunks/modal-ClEsOn-S.js";
import { t as p } from "../chunks/badge-uRjgR9qC.js";
import { onReady as y } from "../shared/dom-ready.js";
import { capitalizeLabel as h } from "./shared/text.js";
import { A as O, C as m, D as U, E as G, F as Y, I as x, M as b, N as Z, O as w, P as B, R as C, S as J, T as Q, a as W, d as X, f as L, i as ee, k as te, l as re, m as E, n as ae, o as se, p as $, r as ie, t as oe, w as M, x as ne, y as S } from "../chunks/schema-preview-CmnuWQks.js";
import { c, l as k, n as de, s as g, u as F } from "../chunks/channel-validation-BBf_63LY.js";
import { a as he, i as ge, n as ue, o as be, r as pe, t as T } from "../chunks/content-editor-runtime-BKzt9Yyx.js";
import { formatContentTypeDate as P } from "./shared/date-formatters.js";
import { initContentTypeChannelSwitcher as ve } from "./shared/channel-switcher.js";
import { renderBlockStatusBadge as q } from "./shared/status-badges.js";
import { n as j, r as xe, t as we } from "../chunks/block-library-ide-q6hmvQbs.js";
var A = class extends u {
  constructor(e) {
    super({
      size: "4xl",
      ariaLabel: "Block library",
      backdropDataAttr: "data-block-library-backdrop"
    }), this.categories = [], this.config = e, this.api = new b({ basePath: e.apiBasePath }), this.state = {
      blocks: [],
      selectedBlockId: null,
      isLoading: !1,
      isSaving: !1,
      error: null,
      filter: "",
      categoryFilter: null
    };
  }
  onBeforeHide() {
    return this.config.onClose?.(), !0;
  }
  async onAfterShow() {
    this.container?.setAttribute("data-block-library-manager", "true"), await this.loadBlocks(), await this.loadCategories();
  }
  renderContent() {
    const e = this.config.mode !== "picker";
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <span class="flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
            </svg>
          </span>
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">${e ? "Block Library" : "Select Block Type"}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              ${e ? "Create, edit, and manage reusable block definitions" : "Choose a block type to add"}
            </p>
          </div>
        </div>
        <button type="button" data-block-library-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex items-center gap-4 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div class="flex-1 relative">
          <input
            type="text"
            data-block-filter
            placeholder="Search blocks..."
            class="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </div>
        <select
          data-block-category-filter
          class="${k()}"
        >
          <option value="">All Categories</option>
        </select>
        ${e ? `
          <button
            type="button"
            data-block-create
            class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            New Block
          </button>
        ` : ""}
      </div>

      <div class="flex-1 overflow-y-auto">
        <div data-block-list class="p-4">
          <div data-block-loading class="flex items-center justify-center py-12">
            <div class="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>

      <div data-block-error class="hidden px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <p class="text-sm text-red-600 dark:text-red-400"></p>
      </div>

      ${this.config.mode === "picker" ? `
        <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            data-block-library-cancel
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      ` : ""}
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-block-library-close]")?.addEventListener("click", () => {
      this.requestHide();
    }), this.container?.querySelector("[data-block-library-cancel]")?.addEventListener("click", () => {
      this.requestHide();
    });
    const e = this.container?.querySelector("[data-block-filter]");
    e?.addEventListener("input", () => {
      this.state.filter = e.value, this.renderBlockList();
    });
    const t = this.container?.querySelector("[data-block-category-filter]");
    t?.addEventListener("change", () => {
      this.state.categoryFilter = t.value || null, this.renderBlockList();
    }), this.container?.querySelector("[data-block-create]")?.addEventListener("click", () => {
      this.showBlockEditor(null);
    }), this.container?.querySelector("[data-block-list]")?.addEventListener("click", (r) => {
      const a = r.target, i = a.closest("[data-block-id]");
      if (i && this.config.mode === "picker") {
        const o = i.getAttribute("data-block-id"), s = this.state.blocks.find((n) => n.id === o);
        if (s && this.isBlockAllowed(s)) {
          const n = this.blockKey(s);
          this.config.onSelect?.({
            id: s.id,
            name: s.name,
            slug: s.slug,
            type: n || s.type,
            description: s.description,
            icon: s.icon,
            category: s.category,
            schema_version: s.schema_version,
            status: s.status
          }), this.hide();
        }
        return;
      }
      if (a.closest("[data-block-edit]")) {
        const o = a.closest("[data-block-id]")?.getAttribute("data-block-id"), s = this.state.blocks.find((n) => n.id === o);
        s && this.showBlockEditor(s);
        return;
      }
      if (a.closest("[data-block-delete]")) {
        const o = a.closest("[data-block-id]")?.getAttribute("data-block-id"), s = this.state.blocks.find((n) => n.id === o);
        s && this.confirmDeleteBlock(s);
        return;
      }
      if (a.closest("[data-block-clone]")) {
        const o = a.closest("[data-block-id]")?.getAttribute("data-block-id"), s = this.state.blocks.find((n) => n.id === o);
        s && this.cloneBlock(s);
        return;
      }
      if (a.closest("[data-block-publish]")) {
        const o = a.closest("[data-block-id]")?.getAttribute("data-block-id"), s = this.state.blocks.find((n) => n.id === o);
        s && this.publishBlock(s);
        return;
      }
      if (a.closest("[data-block-versions]")) {
        const o = a.closest("[data-block-id]")?.getAttribute("data-block-id"), s = this.state.blocks.find((n) => n.id === o);
        s && this.showVersionHistory(s);
        return;
      }
    });
  }
  async loadBlocks() {
    this.state.isLoading = !0, this.state.error = null, this.renderBlockList();
    try {
      const e = await this.api.listBlockDefinitions();
      this.state.blocks = e.items;
    } catch (e) {
      this.state.error = e instanceof Error ? e.message : "Failed to load blocks";
    } finally {
      this.state.isLoading = !1, this.refreshCategoriesFromBlocks(), this.renderBlockList();
    }
  }
  async loadCategories() {
    try {
      const e = await this.api.getBlockCategories();
      e.length > 0 && (this.categories = e);
    } catch {
    }
    this.renderCategoryOptions();
  }
  refreshCategoriesFromBlocks() {
    const e = new Set(this.categories);
    for (const t of this.state.blocks) {
      const r = (t.category || "").trim().toLowerCase();
      r && !e.has(r) && (e.add(r), this.categories.push(r));
    }
    this.renderCategoryOptions();
  }
  renderCategoryOptions() {
    const e = this.container?.querySelector("[data-block-category-filter]");
    if (e) {
      e.innerHTML = '<option value="">All Categories</option>';
      for (const t of this.categories) {
        const r = document.createElement("option");
        r.value = t, r.textContent = h(t), e.appendChild(r);
      }
    }
  }
  renderBlockList() {
    const e = this.container?.querySelector("[data-block-list]");
    if (!e) return;
    if (this.state.isLoading) {
      e.innerHTML = `
        <div data-block-loading class="flex items-center justify-center py-12">
          <div class="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      `;
      return;
    }
    const t = this.getFilteredBlocks();
    if (t.length === 0) {
      e.innerHTML = `
        <div class="flex flex-col items-center justify-center py-12 text-center">
          <svg class="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-gray-500 dark:text-gray-400">
            ${this.state.filter || this.state.categoryFilter ? "No blocks match your filters" : "No blocks defined yet"}
          </p>
          ${this.config.mode !== "picker" && !this.state.filter && !this.state.categoryFilter ? `
            <button
              type="button"
              data-block-create-empty
              class="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Create your first block
            </button>
          ` : ""}
        </div>
      `, e.querySelector("[data-block-create-empty]")?.addEventListener("click", () => {
        this.showBlockEditor(null);
      });
      return;
    }
    const r = /* @__PURE__ */ new Map();
    for (const i of t) {
      const o = i.category || "custom";
      r.has(o) || r.set(o, []), r.get(o).push(i);
    }
    let a = "";
    for (const [i, o] of r) a += `
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">${h(i)}</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${o.map((s) => this.renderBlockCard(s)).join("")}
          </div>
        </div>
      `;
    e.innerHTML = a;
  }
  renderBlockCard(e) {
    const t = this.config.mode !== "picker", r = this.isBlockAllowed(e), a = q(e.status), i = this.blockKey(e);
    return `
      <div
        data-block-id="${e.id}"
        class="relative p-4 border rounded-lg ${r ? "border-gray-200 dark:border-gray-700 bg-white dark:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60 cursor-not-allowed"} transition-colors"
      >
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-lg font-medium">
            ${e.icon ? M(e.icon) : i.charAt(0).toUpperCase()}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${l(e.name)}</h4>
              ${a}
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">${l(i)}</p>
            ${e.description ? `<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">${l(e.description)}</p>` : ""}
            ${e.schema_version ? `<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">v${l(e.schema_version)}</p>` : ""}
          </div>
        </div>

        ${t ? `
          <div class="absolute top-2 right-2 flex items-center gap-1">
            <button
              type="button"
              data-block-versions
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Version history"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </button>
            ${e.status === "draft" ? `
              <button
                type="button"
                data-block-publish
                class="p-1.5 text-green-500 hover:text-green-600 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                title="Publish"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </button>
            ` : ""}
            <button
              type="button"
              data-block-clone
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Clone"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
              </svg>
            </button>
            <button
              type="button"
              data-block-edit
              class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Edit"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
            <button
              type="button"
              data-block-delete
              class="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
          </div>
        ` : ""}

        ${r ? "" : '<div class="absolute inset-0 flex items-center justify-center bg-gray-100/50 dark:bg-gray-900/50 rounded-lg"><span class="text-xs text-gray-500 dark:text-gray-400">Not allowed</span></div>'}
      </div>
    `;
  }
  getFilteredBlocks() {
    let e = [...this.state.blocks];
    if (this.state.filter) {
      const t = this.state.filter.toLowerCase();
      e = e.filter((r) => r.name.toLowerCase().includes(t) || r.type.toLowerCase().includes(t) || (r.slug?.toLowerCase().includes(t) ?? !1) || (r.description?.toLowerCase().includes(t) ?? !1));
    }
    return this.state.categoryFilter && (e = e.filter((t) => t.category === this.state.categoryFilter)), e;
  }
  blockKey(e) {
    return (e.slug || e.type || "").trim();
  }
  blockInList(e, t) {
    if (!e || e.length === 0) return !1;
    const r = this.blockKey(t);
    return !!(r && e.includes(r) || t.slug && e.includes(t.type));
  }
  isBlockAllowed(e) {
    const { allowedBlocks: t, deniedBlocks: r } = this.config;
    return this.blockInList(r, e) ? !1 : t && t.length > 0 ? this.blockInList(t, e) : !0;
  }
  showBlockEditor(e) {
    new I({
      apiBasePath: this.config.apiBasePath,
      block: e,
      categories: this.categories,
      onSave: async (t) => {
        await this.loadBlocks();
      },
      onCancel: () => {
      }
    }).show();
  }
  async confirmDeleteBlock(e) {
    if (await f.confirm(`Are you sure you want to delete the block "${e.name}"? This action cannot be undone.`, {
      title: "Delete Block",
      confirmText: "Delete",
      confirmVariant: "danger"
    }))
      try {
        await this.api.deleteBlockDefinition(e.id), await this.loadBlocks();
      } catch (t) {
        this.showError(t instanceof Error ? t.message : "Failed to delete block");
      }
  }
  cloneBlock(e) {
    const t = (e.slug || e.type || "block").trim();
    new v({
      title: "Clone Block",
      label: "Enter a unique slug for the cloned block",
      placeholder: "e.g. hero_copy",
      initialValue: `${t}_copy`,
      confirmLabel: "Clone",
      inputClass: g(),
      onConfirm: async (r) => {
        const a = r.trim();
        if (a)
          try {
            await this.api.cloneBlockDefinition(e.id, a, a), await this.loadBlocks();
          } catch (i) {
            this.showError(i instanceof Error ? i.message : "Failed to clone block");
          }
      }
    }).show();
  }
  async publishBlock(e) {
    try {
      await this.api.publishBlockDefinition(e.id), await this.loadBlocks();
    } catch (t) {
      this.showError(t instanceof Error ? t.message : "Failed to publish block");
    }
  }
  async showVersionHistory(e) {
    new H({
      apiBasePath: this.config.apiBasePath,
      block: e
    }).show();
  }
  showError(e) {
    const t = this.container?.querySelector("[data-block-error]");
    if (!t) return;
    t.classList.remove("hidden");
    const r = t.querySelector("p");
    r && (r.textContent = e), setTimeout(() => {
      t.classList.add("hidden");
    }, 5e3);
  }
}, I = class extends u {
  constructor(e) {
    super({
      size: "3xl",
      ariaLabel: "Block definition editor"
    }), this.fields = [], this.config = e, this.api = new b({ basePath: e.apiBasePath }), this.isNew = !e.block, e.block?.schema && (this.fields = C(e.block.schema));
  }
  onBeforeHide() {
    return this.config.onCancel(), !0;
  }
  renderContent() {
    const e = this.config.block;
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          ${this.isNew ? "Create Block Definition" : "Edit Block Definition"}
        </h2>
        <button type="button" data-editor-close class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto px-6 py-4">
        <form data-block-form class="space-y-6">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${c()}">
                Name <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value="${l(e?.name ?? "")}"
                placeholder="Hero Section"
                required
                class="${g()}"
              />
            </div>
            <div>
              <label class="${c()}">
                Type <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="type"
                value="${l(e?.type ?? "")}"
                placeholder="hero"
                pattern="^[a-z][a-z0-9_\\-]*$"
                required
                ${e ? "readonly" : ""}
                class="${g()} ${e ? "bg-gray-50 dark:bg-gray-800 cursor-not-allowed" : ""}"
              />
              <p class="mt-1 text-xs text-gray-500">Unique identifier. Lowercase, numbers, hyphens, underscores.</p>
            </div>
          </div>

          <div>
            <label class="${c()}">
              Description
            </label>
            <textarea
              name="description"
              rows="2"
              placeholder="A description of this block type"
              class="${F()}"
            >${l(e?.description ?? "")}</textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="${c()}">
                Category
              </label>
              <select
                name="category"
                class="${k()}"
              >
                ${this.config.categories.map((t) => `<option value="${t}" ${e?.category === t ? "selected" : ""}>${h(t)}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="${c()}">
                Icon
              </label>
              ${m(e?.icon ?? "", 'name="icon"')}
            </div>
          </div>

          <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-sm font-medium text-gray-900 dark:text-white">Block Fields</h3>
              <button
                type="button"
                data-add-field
                class="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                </svg>
                Add Field
              </button>
            </div>
            <div data-fields-list class="space-y-2">
              ${this.renderFieldsList()}
            </div>
          </div>
        </form>
      </div>

      <div data-editor-error class="hidden px-6 py-3 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
        <p class="text-sm text-red-600 dark:text-red-400"></p>
      </div>

      <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          data-editor-cancel
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="button"
          data-editor-save
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          ${this.isNew ? "Create Block" : "Save Changes"}
        </button>
      </div>
    `;
  }
  renderFieldsList() {
    return this.fields.length === 0 ? `
        <div class="text-center py-8 text-gray-500 dark:text-gray-400">
          <p class="text-sm">No fields defined. Click "Add Field" to start.</p>
        </div>
      ` : this.fields.map((e, t) => `
        <div class="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50" data-field-index="${t}">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium text-gray-900 dark:text-white">${l(e.label)}</span>
              <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">${l(e.name)}</span>
              <span class="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${e.type}</span>
              ${e.required ? '<span class="text-xs text-red-500">required</span>' : ""}
            </div>
          </div>
          <button type="button" data-edit-field="${t}" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
          <button type="button" data-remove-field="${t}" class="p-1 text-gray-400 hover:text-red-500">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      `).join("");
  }
  bindContentEvents() {
    this.container?.querySelector("[data-editor-close]")?.addEventListener("click", () => {
      this.requestHide();
    }), this.container?.querySelector("[data-editor-cancel]")?.addEventListener("click", () => {
      this.requestHide();
    }), this.container?.querySelector("[data-editor-save]")?.addEventListener("click", () => {
      this.handleSave();
    }), this.container?.querySelector("[data-add-field]")?.addEventListener("click", () => {
      this.showFieldTypePicker();
    }), this.container && S(this.container, "[data-icon-trigger]", (e) => {
      const t = e.querySelector('[name="icon"]');
      return {
        value: t?.value ?? "",
        onSelect: (r) => {
          t && (t.value = r);
        },
        onClear: () => {
          t && (t.value = "");
        }
      };
    }), this.container?.querySelector("[data-fields-list]")?.addEventListener("click", (e) => {
      const t = e.target, r = t.closest("[data-edit-field]");
      if (r) {
        const i = parseInt(r.getAttribute("data-edit-field") ?? "-1", 10);
        i >= 0 && this.fields[i] && this.showFieldConfigForm(this.fields[i], i);
        return;
      }
      const a = t.closest("[data-remove-field]");
      if (a) {
        const i = parseInt(a.getAttribute("data-remove-field") ?? "-1", 10);
        i >= 0 && (this.fields.splice(i, 1), this.updateFieldsList());
        return;
      }
    });
  }
  showFieldTypePicker() {
    new w({
      onSelect: (e) => {
        const t = {
          id: x(),
          name: "",
          type: e,
          label: "",
          required: !1
        };
        this.showFieldConfigForm(t, -1);
      },
      onCancel: () => {
      },
      excludeTypes: ["blocks", "repeater"]
    }).show();
  }
  showFieldConfigForm(e, t) {
    new L({
      field: e,
      existingFieldNames: this.fields.filter((r, a) => a !== t).map((r) => r.name),
      apiBasePath: this.config.apiBasePath,
      onSave: (r) => {
        t >= 0 ? this.fields[t] = r : this.fields.push(r), this.updateFieldsList();
      },
      onCancel: () => {
      }
    }).show();
  }
  updateFieldsList() {
    const e = this.container?.querySelector("[data-fields-list]");
    e && (e.innerHTML = this.renderFieldsList());
  }
  async handleSave() {
    const e = this.container?.querySelector("[data-block-form]");
    if (!e) return;
    const t = new FormData(e), r = t.get("name")?.trim(), a = t.get("type")?.trim();
    if (!r || !a) {
      this.showEditorError("Name and Type are required");
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(a)) {
      this.showEditorError("Invalid type format. Use lowercase letters, numbers, hyphens, underscores. Must start with a letter.");
      return;
    }
    const i = B(this.fields, a), o = t.get("description"), s = t.get("icon"), n = {
      name: r,
      type: a,
      description: typeof o == "string" ? o.trim() : void 0,
      category: t.get("category") || "custom",
      icon: typeof s == "string" ? s.trim() : void 0,
      schema: i,
      status: this.config.block?.status ?? "draft"
    };
    try {
      let d;
      this.isNew ? d = await this.api.createBlockDefinition(n) : d = await this.api.updateBlockDefinition(this.config.block.id, n), this.config.onSave(d), this.hide();
    } catch (d) {
      this.showEditorError(d instanceof Error ? d.message : "Failed to save block");
    }
  }
  showEditorError(e) {
    const t = this.container?.querySelector("[data-editor-error]");
    if (!t) return;
    t.classList.remove("hidden");
    const r = t.querySelector("p");
    r && (r.textContent = e), setTimeout(() => t.classList.add("hidden"), 5e3);
  }
}, H = class extends u {
  constructor(e) {
    super({
      size: "2xl",
      maxHeight: "max-h-[80vh]",
      ariaLabel: "Block version history"
    }), this.versions = [], this.config = e, this.api = new b({ basePath: e.apiBasePath });
  }
  async onAfterShow() {
    await this.loadVersions();
  }
  renderContent() {
    return `
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Version History</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">${l(this.config.block.name)} (${l(this.config.block.slug || this.config.block.type)})</p>
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
      const e = await this.api.getBlockDefinitionVersions(this.config.block.id);
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
          <p class="text-xs mt-2">Current version: ${l(this.config.block.schema_version ?? "1.0.0")}</p>
        </div>
      `;
        return;
      }
      e.innerHTML = `
      <div class="space-y-3">
        ${this.versions.map((t) => `
          <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-gray-900 dark:text-white">v${l(t.version)}</span>
                ${t.is_breaking ? p("Breaking", "status", "breaking") : ""}
                ${this.getMigrationBadge(t.migration_status)}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">${P(t.created_at)}</span>
            </div>
            ${t.migration_status && t.total_count ? `
              <div class="mt-2">
                <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>Migration Progress</span>
                  <span>${t.migrated_count ?? 0}/${t.total_count}</span>
                </div>
                <div class="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-blue-600 rounded-full" style="width: ${(t.migrated_count ?? 0) / t.total_count * 100}%"></div>
                </div>
              </div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    `;
    }
  }
  getMigrationBadge(e) {
    const t = e ? {
      pending: ["Pending", "pending"],
      in_progress: ["Migrating", "migrating"],
      completed: ["Migrated", "migrated"],
      failed: ["Failed", "failed"]
    }[e] : void 0;
    return t ? p(t[0], "status", t[1]) : "";
  }
};
function D(e = document) {
  Array.from(e.querySelectorAll("[data-block-library-trigger]")).forEach((t) => {
    if (t.dataset.initialized === "true") return;
    const r = E(t.dataset.apiBasePath, t.dataset.basePath), a = $(r, t.dataset.basePath), i = t.dataset.mode ?? "manage";
    if (i === "manage") t.addEventListener("click", () => {
      window.location.href = `${a}/content/block-library`;
    });
    else {
      const o = {
        apiBasePath: r,
        mode: i
      };
      t.addEventListener("click", () => {
        new A(o).show();
      });
    }
    t.dataset.initialized = "true";
  });
}
y(() => D());
y(() => {
  T(), j();
});
export {
  xe as BlockEditorPanel,
  we as BlockLibraryIDE,
  A as BlockLibraryManager,
  b as ContentTypeAPIClient,
  Z as ContentTypeAPIError,
  pe as ContentTypeEditor,
  G as FIELD_CATEGORIES,
  ge as FIELD_SET_PRESETS,
  U as FIELD_TYPES,
  L as FieldConfigForm,
  re as FieldPalettePanel,
  w as FieldTypePicker,
  be as LayoutEditor,
  X as PALETTE_DRAG_MIME,
  oe as PreviewModal,
  Y as fieldsToSchema,
  x as generateFieldId,
  he as getFieldSetPreset,
  te as getFieldTypeMetadata,
  O as getFieldTypesByCategory,
  ne as getIconTabs,
  j as initBlockLibraryIDE,
  D as initBlockLibraryManagers,
  ve as initContentTypeChannelSwitcher,
  ue as initContentTypeEditors,
  ae as initPreviewEditors,
  de as normalizeChannelName,
  J as registerIconTab,
  ee as renderDropZone,
  W as renderFieldCard,
  se as renderFieldKebab,
  M as resolveIcon,
  C as schemaToFields,
  Q as unregisterIconTab,
  ie as wrapReadonlyPreview
};

//# sourceMappingURL=index.js.map