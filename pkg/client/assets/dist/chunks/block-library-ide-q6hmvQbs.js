import { createLogger as O } from "../shared/logger.js";
import { escapeHTML as o } from "../shared/html.js";
import { i as L, t as H } from "./modal-ClEsOn-S.js";
import { parseJSONValue as R } from "../shared/json-parse.js";
import { capitalizeLabel as $, nameToSlug as U, titleCaseWords as C } from "../content-type-builder/shared/text.js";
import { C as V, F as T, I as K, M as G, N as P, P as W, R as A, _ as D, a as Q, b as J, c as Y, d as Z, f as X, g as ee, h as te, i as ae, j as B, k as se, l as I, m as ie, n as re, r as ne, s as oe, t as le, u as de, v as q, w as ce, y as he } from "./schema-preview-CmnuWQks.js";
import { i as pe, l as E, r as ue, s as u, t as ge } from "./channel-validation-BBf_63LY.js";
import { renderBlockStatusBadge as fe } from "../content-type-builder/shared/status-badges.js";
var k = "main", z = "application/x-field-reorder", ve = class {
  constructor(s) {
    this.expandedFieldId = null, this.sectionStates = /* @__PURE__ */ new Map(), this.moveMenuFieldId = null, this.dropHighlight = !1, this.dragReorder = null, this.dropTargetFieldId = null, this.saveState = "idle", this.saveMessage = "", this.saveDisplayTimer = null, this.cachedBlocks = null, this.blocksLoading = !1, this.blockPickerModes = /* @__PURE__ */ new Map(), this.previewHtml = null, this.previewError = null, this.isPreviewing = !1, this.previewCollapsed = !1, this.previewRequestSeq = 0, this.previewDebounceTimer = null, this.lastPreviewSignature = null, this.config = s, this.block = { ...s.block }, this.fields = s.block.schema ? A(s.block.schema) : [];
  }
  render() {
    J(), this.config.container.innerHTML = "";
    const s = document.createElement("div");
    s.className = "flex flex-col h-full overflow-hidden", s.setAttribute("data-block-editor-panel", ""), s.innerHTML = `
      ${this.renderHeader()}
      <div class="flex-1 overflow-y-auto" data-editor-scroll>
        ${this.renderMetadataSection()}
        ${this.renderFieldsSection()}
        ${this.renderPreviewSection()}
      </div>
    `, this.config.container.appendChild(s), this.bindEvents(s), this.ensureInlineBlocksPicker(), this.maybeSchedulePreview();
  }
  update(s) {
    this.block = { ...s }, this.fields = s.schema ? A(s.schema) : [], this.expandedFieldId = null, this.moveMenuFieldId = null, this.previewHtml = null, this.previewError = null, this.isPreviewing = !1, this.previewRequestSeq++, this.lastPreviewSignature = null, this.render();
  }
  getFields() {
    return [...this.fields];
  }
  addField(s) {
    this.fields.push(s), this.expandedFieldId = s.id, this.render();
  }
  renderHeader() {
    return oe({
      name: this.block.name || "Untitled",
      subtitle: this.block.slug || this.block.type || "",
      subtitleMono: !0,
      status: this.block.status || "draft",
      saveState: this.saveState,
      saveMessage: this.saveMessage,
      compact: !0
    });
  }
  updateSaveState(s, e) {
    this.saveDisplayTimer && (clearTimeout(this.saveDisplayTimer), this.saveDisplayTimer = null), this.saveState = s, this.saveMessage = e ?? "";
    const t = this.config.container.querySelector("[data-entity-save-indicator]");
    t && (t.innerHTML = Y(this.saveState, this.saveMessage)), s === "saved" && (this.saveDisplayTimer = setTimeout(() => {
      this.saveState = "idle", this.saveMessage = "";
      const a = this.config.container.querySelector("[data-entity-save-indicator]");
      a && (a.innerHTML = "");
    }, 2e3));
  }
  revertStatus(s) {
    const e = this.config.container.querySelector('[data-meta-field="status"]');
    e && (e.value = s ?? "draft"), this.block.status = s ?? "draft";
  }
  renderMetadataSection() {
    const s = this.block, e = s.slug || s.type || "", t = s.slug && s.type && s.slug !== s.type ? `<p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Internal type: ${o(s.type)}</p>` : "";
    return `
      <div class="border-b border-gray-200 dark:border-gray-700" data-editor-metadata>
        <button type="button" data-toggle-metadata
                class="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-indigo-400"></span>
            <span>Block Metadata</span>
          </div>
          <span data-metadata-chevron class="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </span>
        </button>
        <div class="px-5 pb-4 space-y-3" data-metadata-body>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name</label>
              <input type="text" data-meta-field="name" value="${o(s.name)}"
                     class="${u()}" />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Slug</label>
              <input type="text" data-meta-field="slug" value="${o(e)}" pattern="^[a-z][a-z0-9_\\-]*$"
                     class="${u()} font-mono" />
              ${t}
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Description</label>
            <textarea data-meta-field="description" rows="2"
                      placeholder="Short description for other editors..."
                      class="${u()} resize-none">${o(s.description ?? "")}</textarea>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Category</label>
              <select data-meta-field="category" class="${E()}">
                ${this.config.categories.map((a) => `<option value="${o(a)}" ${a === (s.category ?? "") ? "selected" : ""}>${o(C(a))}</option>`).join("")}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Icon</label>
              ${V(s.icon ?? "", 'data-meta-field="icon"', !0)}
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
              <select data-meta-field="status" class="${E()}">
                <option value="draft" ${s.status === "draft" ? "selected" : ""}>Draft</option>
                <option value="active" ${s.status === "active" ? "selected" : ""}>Active</option>
                <option value="deprecated" ${s.status === "deprecated" ? "selected" : ""}>Deprecated</option>
              </select>
            </div>
          </div>
        </div>
      </div>`;
  }
  renderFieldsSection() {
    const s = this.groupFieldsBySection(), e = Array.from(s.keys());
    if (this.fields.length === 0) return `
        <div class="px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Fields</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500">0 fields</span>
          </div>
          <button type="button" data-block-add-field
                  class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add Field
          </button>
        </div>
        <div data-field-drop-zone
             class="flex flex-col items-center justify-center py-16 px-5 text-center border-2 border-dashed ${this.dropHighlight ? "border-blue-400 bg-blue-50/50" : "border-transparent"} rounded-lg mx-3 my-2 transition-colors">
          <svg class="w-12 h-12 text-gray-200 dark:text-gray-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"></path>
          </svg>
          <p class="text-sm text-gray-400 dark:text-gray-500">No fields defined.</p>
          <p class="text-xs text-gray-300 dark:text-gray-600 mt-1">Drag fields from the palette or click a field type to add.</p>
        </div>`;
    let t = `
      <div class="px-5 py-3 border-b border-gray-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-1 h-4 rounded-full bg-emerald-400"></span>
          <span class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fields</span>
          <span class="text-[11px] text-gray-400 dark:text-gray-500">${this.fields.length} field${this.fields.length !== 1 ? "s" : ""}</span>
        </div>
        <button type="button" data-block-add-field
                class="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Field
        </button>
      </div>`;
    for (const a of e) {
      const r = s.get(a), i = this.getSectionState(a).collapsed;
      t += `
        <div data-section="${o(a)}" class="border-b border-gray-100 dark:border-gray-800">
          <button type="button" data-toggle-section="${o(a)}"
                  class="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group">
            <span class="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 flex items-center justify-center" data-section-chevron="${o(a)}">
              ${i ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
            </span>
            <span class="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">${o(C(a))}</span>
            <span class="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">${r.length}</span>
          </button>

          <div class="${i ? "hidden" : ""}" data-section-body="${o(a)}">
            <div class="px-3 pb-2 space-y-1" data-section-fields="${o(a)}">
              ${r.map((n) => this.renderFieldCard(n, e, r)).join("")}
            </div>
          </div>
        </div>`;
    }
    return t += ae({ highlight: this.dropHighlight }), t;
  }
  renderFieldCard(s, e, t) {
    const a = s.section || k, r = t.indexOf(s), i = [];
    s.validation?.minLength !== void 0 && i.push(`min: ${s.validation.minLength}`), s.validation?.maxLength !== void 0 && i.push(`max: ${s.validation.maxLength}`), s.validation?.min !== void 0 && i.push(`>= ${s.validation.min}`), s.validation?.max !== void 0 && i.push(`<= ${s.validation.max}`), s.validation?.pattern && i.push("pattern");
    const n = `
          <div class="relative flex-shrink-0">
            <button type="button" data-field-actions="${o(s.id)}"
                    class="p-1.5 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Field actions">
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
              </svg>
            </button>
            ${this.moveMenuFieldId === s.id ? this.renderMoveToSectionMenu(s, e, a) : ""}
          </div>`;
    return Q({
      field: s,
      isExpanded: s.id === this.expandedFieldId,
      isDropTarget: this.dropTargetFieldId === s.id,
      showReorderButtons: !0,
      isFirst: r === 0,
      isLast: r === t.length - 1,
      compact: !1,
      sectionName: a,
      actionsHtml: n,
      constraintBadges: i,
      renderExpandedContent: () => this.renderFieldProperties(s, e)
    });
  }
  renderFieldProperties(s, e) {
    return B(s.type) === "blocks" ? this.renderBlocksFieldProperties(s, e) : this.renderStandardFieldProperties(s, e);
  }
  renderStandardFieldProperties(s, e) {
    const t = s.validation ?? {}, a = B(s.type), r = [
      "text",
      "textarea",
      "rich-text",
      "markdown",
      "code",
      "slug"
    ].includes(a), i = [
      "number",
      "integer",
      "currency",
      "percentage"
    ].includes(a), n = s.section || k;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${o(s.id)}">
        <!-- General -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
            <input type="text" data-field-prop="${o(s.id)}" data-prop-key="name"
                   value="${o(s.name)}" pattern="^[a-z][a-z0-9_]*$"
                   class="${u("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
            <input type="text" data-field-prop="${o(s.id)}" data-prop-key="label"
                   value="${o(s.label)}"
                   class="${u("xs")}" />
          </div>
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
          <input type="text" data-field-prop="${o(s.id)}" data-prop-key="description"
                 value="${o(s.description ?? "")}" placeholder="Help text for editors"
                 class="${u("xs")}" />
        </div>

        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Placeholder</label>
          <input type="text" data-field-prop="${o(s.id)}" data-prop-key="placeholder"
                 value="${o(s.placeholder ?? "")}"
                 class="${u("xs")}" />
        </div>

        <!-- Flags -->
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${o(s.id)}" data-check-key="required"
                   ${s.required ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${o(s.id)}" data-check-key="readonly"
                   ${s.readonly ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
          </label>
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-field-check="${o(s.id)}" data-check-key="hidden"
                   ${s.hidden ? "checked" : ""}
                   class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
            <span class="text-[11px] text-gray-600 dark:text-gray-400">Hidden</span>
          </label>
        </div>

        <!-- Validation (conditional) -->
        ${r ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Min Length</label>
            <input type="number" data-field-prop="${o(s.id)}" data-prop-key="validation.minLength"
                   value="${t.minLength ?? ""}" min="0"
                   class="${u("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Length</label>
            <input type="number" data-field-prop="${o(s.id)}" data-prop-key="validation.maxLength"
                   value="${t.maxLength ?? ""}" min="0"
                   class="${u("xs")}" />
          </div>
        </div>
        <div>
          <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Pattern (RegEx)</label>
          <input type="text" data-field-prop="${o(s.id)}" data-prop-key="validation.pattern"
                 value="${o(t.pattern ?? "")}" placeholder="^[a-z]+$"
                 class="${u("xs")} font-mono" />
        </div>` : ""}

        ${i ? `
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Minimum</label>
            <input type="number" data-field-prop="${o(s.id)}" data-prop-key="validation.min"
                   value="${t.min ?? ""}" step="any"
                   class="${u("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Maximum</label>
            <input type="number" data-field-prop="${o(s.id)}" data-prop-key="validation.max"
                   value="${t.max ?? ""}" step="any"
                   class="${u("xs")}" />
          </div>
        </div>` : ""}

        <!-- Appearance (Phase 10 — Task 10.3: section dropdown) -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
            <select data-field-section-select="${o(s.id)}"
                    class="${E("xs")}">
              ${e.map((l) => `<option value="${o(l)}" ${l === n ? "selected" : ""}>${o(C(l))}</option>`).join("")}
              <option value="__new__">+ New section...</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
            <input type="number" data-field-prop="${o(s.id)}" data-prop-key="gridSpan"
                   value="${s.gridSpan ?? ""}" min="1" max="12" placeholder="12"
                   class="${u("xs")}" />
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${o(s.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }
  renderBlocksFieldProperties(s, e) {
    const t = s.config ?? {}, a = s.section || k, r = this.getBlocksPickerMode(s.id) === "allowed", i = new Set(r ? t.allowedBlocks ?? [] : t.deniedBlocks ?? []), n = "px-2 py-1 text-[10px] font-semibold uppercase tracking-wider rounded", l = r ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800", d = r ? "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300", c = r ? "Allowed Blocks" : "Denied Blocks", p = r ? "blue" : "red", m = r ? "All blocks allowed (no restrictions)" : "No blocks denied";
    let y;
    if (this.cachedBlocks) {
      const b = D(i, this.cachedBlocks);
      y = q({
        availableBlocks: this.cachedBlocks,
        selectedBlocks: b,
        onSelectionChange: () => {
        },
        label: c,
        accent: p,
        emptySelectionText: m
      });
    } else y = `
        <div class="flex items-center justify-center py-6" data-blocks-loading="${o(s.id)}">
          <div class="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span class="ml-2 text-xs text-gray-400 dark:text-gray-500">Loading blocks...</span>
        </div>`;
    return `
      <div class="px-3 pb-3 space-y-3 border-t border-gray-100 dark:border-gray-800 mt-1 pt-3" data-field-props="${o(s.id)}">
        <!-- Block Selection (primary) -->
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-1 p-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button type="button" data-blocks-mode-toggle="${o(s.id)}" data-blocks-mode="allowed"
                    class="${n} ${l}">
              Allowed
            </button>
            <button type="button" data-blocks-mode-toggle="${o(s.id)}" data-blocks-mode="denied"
                    class="${n} ${d}">
              Denied
            </button>
          </div>
          <button type="button" data-blocks-open-library="${o(s.id)}"
                  class="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Open Block Library
          </button>
        </div>
        <div data-blocks-picker-container="${o(s.id)}">
          ${y}
        </div>
        <div class="flex items-center justify-between">
          <button type="button" data-blocks-advanced="${o(s.id)}"
                  class="text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium">
            Advanced settings...
          </button>
        </div>

        <!-- Min/Max Blocks -->
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Min Blocks</label>
            <input type="number" data-field-prop="${o(s.id)}" data-prop-key="config.minBlocks"
                   value="${t.minBlocks ?? ""}" min="0" placeholder="0"
                   class="${u("xs")}" />
          </div>
          <div>
            <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Max Blocks</label>
            <input type="number" data-field-prop="${o(s.id)}" data-prop-key="config.maxBlocks"
                   value="${t.maxBlocks ?? ""}" min="1" placeholder="No limit"
                   class="${u("xs")}" />
          </div>
        </div>

        <!-- Field Settings (secondary — collapsed by default) -->
        <div class="border-t border-gray-100 dark:border-gray-800 pt-2">
          <button type="button" data-blocks-settings-toggle="${o(s.id)}"
                  class="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium">
            <span data-blocks-settings-chevron="${o(s.id)}">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </span>
            Field Settings
          </button>

          <div class="hidden mt-2 space-y-3" data-blocks-settings-body="${o(s.id)}">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Field Name</label>
                <input type="text" data-field-prop="${o(s.id)}" data-prop-key="name"
                       value="${o(s.name)}" pattern="^[a-z][a-z0-9_]*$"
                       class="${u("xs")}" />
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Label</label>
                <input type="text" data-field-prop="${o(s.id)}" data-prop-key="label"
                       value="${o(s.label)}"
                       class="${u("xs")}" />
              </div>
            </div>
            <div>
              <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Description</label>
              <input type="text" data-field-prop="${o(s.id)}" data-prop-key="description"
                     value="${o(s.description ?? "")}" placeholder="Help text for editors"
                     class="${u("xs")}" />
            </div>
            <div class="flex items-center gap-4">
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${o(s.id)}" data-check-key="required"
                       ${s.required ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Required</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${o(s.id)}" data-check-key="readonly"
                       ${s.readonly ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Read-only</span>
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" data-field-check="${o(s.id)}" data-check-key="hidden"
                       ${s.hidden ? "checked" : ""}
                       class="w-3.5 h-3.5 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500" />
                <span class="text-[11px] text-gray-600 dark:text-gray-400">Hidden</span>
              </label>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Section</label>
                <select data-field-section-select="${o(s.id)}"
                        class="${E("xs")}">
                  ${e.map((b) => `<option value="${o(b)}" ${b === a ? "selected" : ""}>${o(C(b))}</option>`).join("")}
                  <option value="__new__">+ New section...</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5">Grid Span (1-12)</label>
                <input type="number" data-field-prop="${o(s.id)}" data-prop-key="gridSpan"
                       value="${s.gridSpan ?? ""}" min="1" max="12" placeholder="12"
                       class="${u("xs")}" />
              </div>
            </div>
          </div>
        </div>

        <!-- Remove field -->
        <div class="pt-2 border-t border-gray-100 dark:border-gray-800">
          <button type="button" data-field-remove="${o(s.id)}"
                  class="text-[11px] text-red-500 hover:text-red-700 font-medium transition-colors">
            Remove field
          </button>
        </div>
      </div>`;
  }
  renderMoveToSectionMenu(s, e, t) {
    const a = e.filter((r) => r !== t);
    return a.length === 0 ? `
        <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
          <div class="px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500">Only one section exists.</div>
          <button type="button" data-move-new-section="${o(s.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            + Create new section
          </button>
        </div>` : `
      <div data-move-menu class="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm">
        <div class="px-3 py-1 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Move to section</div>
        ${a.map((r) => `
          <button type="button" data-move-to="${o(r)}" data-move-field="${o(s.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
            <svg class="w-3 h-3 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
            ${o(C(r))}
          </button>`).join("")}
        <div class="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
          <button type="button" data-move-new-section="${o(s.id)}"
                  class="w-full text-left px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
            + Create new section
          </button>
        </div>
      </div>`;
  }
  groupFieldsBySection() {
    const s = /* @__PURE__ */ new Map();
    for (const e of this.fields) {
      const t = e.section || k;
      s.has(t) || s.set(t, []), s.get(t).push(e);
    }
    if (s.has(k)) {
      const e = s.get(k);
      s.delete(k);
      const t = /* @__PURE__ */ new Map();
      t.set(k, e);
      for (const [a, r] of s) t.set(a, r);
      return t;
    }
    return s;
  }
  getSectionState(s) {
    return this.sectionStates.has(s) || this.sectionStates.set(s, { collapsed: !1 }), this.sectionStates.get(s);
  }
  getBlocksPickerMode(s) {
    return this.blockPickerModes.get(s) ?? "allowed";
  }
  ensureInlineBlocksPicker() {
    if (!this.expandedFieldId) return;
    const s = this.fields.find((e) => e.id === this.expandedFieldId);
    s && B(s.type) === "blocks" && this.loadBlocksForField(s);
  }
  bindEvents(s) {
    s.querySelector("[data-toggle-metadata]")?.addEventListener("click", () => {
      const e = s.querySelector("[data-metadata-body]"), t = s.querySelector("[data-metadata-chevron]");
      if (e) {
        const a = e.classList.toggle("hidden");
        t && (t.innerHTML = a ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      }
    }), s.querySelectorAll("[data-meta-field]").forEach((e) => {
      const t = e.dataset.metaField;
      e.tagName === "SELECT" ? e.addEventListener("change", () => this.handleMetadataChange(t, e.value)) : (e.tagName === "TEXTAREA" || e.tagName === "INPUT") && e.addEventListener("input", () => this.handleMetadataChange(t, e.value));
    }), he(s, "[data-icon-trigger]", (e) => {
      const t = e.querySelector('[data-meta-field="icon"]');
      return {
        value: t?.value ?? "",
        onSelect: (a) => {
          t && (t.value = a, t.dispatchEvent(new Event("input", { bubbles: !0 })));
        },
        onClear: () => {
          t && (t.value = "", t.dispatchEvent(new Event("input", { bubbles: !0 })));
        },
        compact: !0
      };
    }), s.addEventListener("click", (e) => this.handleClick(e, s)), s.addEventListener("input", (e) => this.handleInput(e)), s.addEventListener("change", (e) => this.handleChange(e, s)), document.addEventListener("click", (e) => {
      if (this.moveMenuFieldId) {
        const t = e.target;
        !t.closest("[data-move-menu]") && !t.closest("[data-field-actions]") && (this.moveMenuFieldId = null, this.render());
      }
    }), this.bindDropZoneEvents(s), this.bindFieldReorderEvents(s), this.bindSectionSelectEvents(s), s.querySelector("[data-toggle-preview]")?.addEventListener("click", () => this.togglePreviewCollapsed()), s.querySelector("[data-block-expand-preview]")?.addEventListener("click", () => this.openInteractivePreview()), s.querySelector("[data-block-refresh-preview]")?.addEventListener("click", () => {
      this.lastPreviewSignature = this.computeSchemaSignature(), this.previewSchema();
    });
  }
  bindDropZoneEvents(s) {
    s.querySelectorAll("[data-field-drop-zone]").forEach((e) => {
      e.addEventListener("dragover", (t) => {
        t.preventDefault(), t.dataTransfer.dropEffect = "copy", this.dropHighlight || (this.dropHighlight = !0, e.classList.remove("border-gray-200", "hover:border-gray-300", "border-transparent"), e.classList.add("border-blue-400", "bg-blue-50/50"));
      }), e.addEventListener("dragleave", (t) => {
        e.contains(t.relatedTarget) || (this.dropHighlight = !1, e.classList.remove("border-blue-400", "bg-blue-50/50"), e.classList.add("border-gray-200", "hover:border-gray-300"));
      }), e.addEventListener("drop", (t) => {
        if (t.preventDefault(), this.dropHighlight = !1, e.classList.remove("border-blue-400", "bg-blue-50/50"), e.classList.add("border-gray-200", "hover:border-gray-300"), this.config.onFieldDrop) {
          const a = t.dataTransfer?.getData(de);
          if (a) {
            const i = R(a, null);
            if (i && i.type) {
              this.config.onFieldDrop(i);
              return;
            }
          }
          const r = t.dataTransfer?.getData(Z);
          if (r) {
            const i = B(r), n = se(i) ?? {
              type: i,
              label: C(i),
              description: "",
              icon: "",
              category: "advanced"
            };
            this.config.onFieldDrop(n);
          }
        }
      });
    });
  }
  handleClick(s, e) {
    const t = s.target;
    if (t.closest("[data-block-add-field]")) {
      this.config.onAddFieldClick && this.config.onAddFieldClick();
      return;
    }
    const a = t.closest("[data-toggle-section]");
    if (a) {
      const h = a.dataset.toggleSection, g = this.getSectionState(h);
      g.collapsed = !g.collapsed, this.sectionStates.set(h, g);
      const v = e.querySelector(`[data-section-body="${h}"]`), w = e.querySelector(`[data-section-chevron="${h}"]`);
      v && v.classList.toggle("hidden", g.collapsed), w && (w.innerHTML = g.collapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      return;
    }
    const r = t.closest("[data-field-actions]");
    if (r) {
      s.stopPropagation();
      const h = r.dataset.fieldActions;
      this.moveMenuFieldId = this.moveMenuFieldId === h ? null : h, this.render();
      return;
    }
    const i = t.closest("[data-move-to]");
    if (i) {
      s.stopPropagation();
      const h = i.dataset.moveTo, g = i.dataset.moveField;
      this.moveFieldToSection(g, h);
      return;
    }
    const n = t.closest("[data-move-new-section]");
    if (n) {
      s.stopPropagation();
      const h = n.dataset.moveNewSection;
      new L({
        title: "Create New Section",
        label: "Section name",
        placeholder: "e.g. sidebar",
        confirmLabel: "Create",
        inputClass: u(),
        onConfirm: (g) => {
          const v = g.trim().toLowerCase().replace(/\s+/g, "_");
          v && this.moveFieldToSection(h, v);
        }
      }).show();
      return;
    }
    const l = t.closest("[data-field-move-up]");
    if (l) {
      s.stopPropagation();
      const h = l.dataset.fieldMoveUp;
      l.hasAttribute("disabled") || this.moveFieldInSection(h, -1);
      return;
    }
    const d = t.closest("[data-field-move-down]");
    if (d) {
      s.stopPropagation();
      const h = d.dataset.fieldMoveDown;
      d.hasAttribute("disabled") || this.moveFieldInSection(h, 1);
      return;
    }
    const c = t.closest("[data-field-remove]");
    if (c) {
      const h = c.dataset.fieldRemove, g = this.fields.find((v) => v.id === h);
      g && H.confirm(`Remove field "${g.label || g.name}"?`, {
        title: "Remove Field",
        confirmText: "Remove",
        confirmVariant: "danger"
      }).then((v) => {
        v && (this.fields = this.fields.filter((w) => w.id !== h), this.expandedFieldId === h && (this.expandedFieldId = null), this.notifySchemaChange(), this.render());
      });
      return;
    }
    const p = t.closest("[data-blocks-settings-toggle]");
    if (p) {
      const h = p.dataset.blocksSettingsToggle, g = e.querySelector(`[data-blocks-settings-body="${h}"]`), v = e.querySelector(`[data-blocks-settings-chevron="${h}"]`);
      if (g) {
        const w = g.classList.toggle("hidden");
        v && (v.innerHTML = w ? '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
      }
      return;
    }
    const m = t.closest("[data-blocks-mode-toggle]");
    if (m) {
      s.stopPropagation();
      const h = m.dataset.blocksModeToggle, g = m.dataset.blocksMode ?? "allowed";
      this.blockPickerModes.set(h, g), this.render();
      return;
    }
    if (t.closest("[data-blocks-open-library]")) {
      s.stopPropagation();
      const h = this.config.api.getBasePath();
      window.location.href = `${h}/content/block-library`;
      return;
    }
    const y = t.closest("[data-blocks-advanced]");
    if (y) {
      s.stopPropagation();
      const h = y.dataset.blocksAdvanced, g = this.fields.find((v) => v.id === h);
      g && this.openFieldConfigModal(g);
      return;
    }
    const b = t.closest("[data-field-expand-toggle]");
    if (b) {
      s.stopPropagation();
      const h = b.dataset.fieldExpandToggle;
      this.toggleFieldExpansion(h);
      return;
    }
    const M = t.closest("[data-field-toggle]");
    if (M) {
      if (t.closest("[data-field-grip]")) return;
      const h = M.dataset.fieldToggle;
      this.toggleFieldExpansion(h);
      return;
    }
  }
  toggleFieldExpansion(s) {
    if (this.expandedFieldId = this.expandedFieldId === s ? null : s, this.render(), !this.expandedFieldId) return;
    const e = this.fields.find((t) => t.id === this.expandedFieldId);
    e && B(e.type) === "blocks" && this.loadBlocksForField(e);
  }
  handleInput(s) {
    const e = s.target.closest("[data-field-prop]");
    if (e) {
      const t = e.dataset.fieldProp, a = e.dataset.propKey;
      this.updateFieldProp(t, a, e.value);
      return;
    }
  }
  handleChange(s, e) {
    const t = s.target.closest("[data-field-check]");
    if (t) {
      const a = t.dataset.fieldCheck, r = t.dataset.checkKey;
      this.updateFieldProp(a, r, t.checked);
      return;
    }
  }
  handleMetadataChange(s, e) {
    if (s === "status" && this.config.onStatusChange) {
      this.config.onStatusChange(this.block.id, e);
      return;
    }
    const t = {}, a = this.block;
    switch (s) {
      case "name":
        t.name = e, a.name = e;
        break;
      case "slug": {
        const r = (this.block.slug || this.block.type || "").toString();
        t.slug = e, a.slug = e, (!a.type || a.type === r) && (t.type = e, a.type = e);
        break;
      }
      case "description":
        t.description = e, a.description = e;
        break;
      case "category":
        t.category = e, a.category = e;
        break;
      case "icon":
        t.icon = e, a.icon = e;
        break;
      case "status":
        t.status = e, a.status = e;
    }
    this.config.onMetadataChange(this.block.id, t);
  }
  updateFieldProp(s, e, t) {
    const a = this.fields.find((i) => i.id === s);
    if (!a) return;
    const r = e.split(".");
    if (r.length === 1) {
      const i = r[0], n = a;
      typeof t == "boolean" ? n[i] = t : i === "gridSpan" ? n[i] = t ? parseInt(t, 10) : void 0 : n[i] = t || void 0;
    } else if (r[0] === "config") {
      a.config || (a.config = {});
      const i = r[1], n = a.config;
      typeof t == "string" && (t === "" ? delete n[i] : ["minBlocks", "maxBlocks"].includes(i) ? n[i] = parseInt(t, 10) : n[i] = t), Object.keys(a.config).length === 0 && (a.config = void 0);
    } else if (r[0] === "validation") {
      a.validation || (a.validation = {});
      const i = r[1];
      typeof t == "string" && (t === "" ? delete a.validation[i] : ["minLength", "maxLength"].includes(i) ? a.validation[i] = parseInt(t, 10) : ["min", "max"].includes(i) ? a.validation[i] = parseFloat(t) : a.validation[i] = t), Object.keys(a.validation).length === 0 && (a.validation = void 0);
    }
    this.notifySchemaChange();
  }
  async loadBlocksForField(s) {
    if (this.cachedBlocks) {
      this.renderInlineBlockPickerForField(s);
      return;
    }
    this.blocksLoading || (this.blocksLoading = !0, this.cachedBlocks = await ee(this.config.api), this.blocksLoading = !1, this.expandedFieldId === s.id && this.renderInlineBlockPickerForField(s));
  }
  renderInlineBlockPickerForField(s) {
    const e = this.config.container.querySelector(`[data-blocks-picker-container="${s.id}"]`);
    if (!e || !this.cachedBlocks) return;
    const t = s.config ?? {}, a = this.getBlocksPickerMode(s.id) === "allowed", r = D(new Set(a ? t.allowedBlocks ?? [] : t.deniedBlocks ?? []), this.cachedBlocks), i = a ? "Allowed Blocks" : "Denied Blocks", n = a ? "blue" : "red", l = a ? "All blocks allowed (no restrictions)" : "No blocks denied";
    e.innerHTML = q({
      availableBlocks: this.cachedBlocks,
      selectedBlocks: r,
      onSelectionChange: (d) => {
        s.config || (s.config = {});
        const c = s.config;
        a ? d.size > 0 ? c.allowedBlocks = Array.from(d) : delete c.allowedBlocks : d.size > 0 ? c.deniedBlocks = Array.from(d) : delete c.deniedBlocks, Object.keys(s.config).length === 0 && (s.config = void 0), this.notifySchemaChange();
      },
      label: i,
      accent: n,
      emptySelectionText: l
    }), te(e, {
      availableBlocks: this.cachedBlocks,
      selectedBlocks: r,
      onSelectionChange: (d) => {
        s.config || (s.config = {});
        const c = s.config;
        a ? d.size > 0 ? c.allowedBlocks = Array.from(d) : delete c.allowedBlocks : d.size > 0 ? c.deniedBlocks = Array.from(d) : delete c.deniedBlocks, Object.keys(s.config).length === 0 && (s.config = void 0), this.notifySchemaChange();
      },
      label: i,
      accent: n,
      emptySelectionText: l
    });
  }
  openFieldConfigModal(s) {
    new X({
      field: s,
      existingFieldNames: this.fields.filter((e) => e.id !== s.id).map((e) => e.name),
      apiBasePath: this.config.api.getBasePath(),
      onSave: (e) => {
        const t = this.fields.findIndex((a) => a.id === s.id);
        t !== -1 && (this.fields[t] = e, this.notifySchemaChange(), this.render());
      },
      onCancel: () => {
      }
    }).show();
  }
  moveFieldToSection(s, e) {
    const t = this.fields.find((a) => a.id === s);
    t && (t.section = e === k ? void 0 : e, this.moveMenuFieldId = null, this.notifySchemaChange(), this.render());
  }
  moveFieldInSection(s, e) {
    const t = this.fields.find((c) => c.id === s);
    if (!t) return;
    const a = t.section || k, r = this.fields.filter((c) => (c.section || k) === a), i = r.findIndex((c) => c.id === s), n = i + e;
    if (n < 0 || n >= r.length) return;
    const l = this.fields.indexOf(r[i]), d = this.fields.indexOf(r[n]);
    [this.fields[l], this.fields[d]] = [this.fields[d], this.fields[l]], this.notifySchemaChange(), this.render();
  }
  reorderFieldBefore(s, e) {
    if (s === e) return;
    const t = this.fields.find((n) => n.id === s), a = this.fields.find((n) => n.id === e);
    if (!t || !a || (t.section || k) !== (a.section || k)) return;
    const r = this.fields.indexOf(t);
    this.fields.splice(r, 1);
    const i = this.fields.indexOf(a);
    this.fields.splice(i, 0, t), this.notifySchemaChange(), this.render();
  }
  bindFieldReorderEvents(s) {
    s.querySelectorAll("[data-field-card]").forEach((e) => {
      const t = e.dataset.fieldCard, a = e.dataset.fieldSection;
      let r = !1;
      e.addEventListener("mousedown", (i) => {
        r = !!i.target.closest("[data-field-grip]");
      }), e.addEventListener("dragstart", (i) => {
        if (!r) {
          i.preventDefault();
          return;
        }
        this.dragReorder = {
          fieldId: t,
          sectionName: a
        }, i.dataTransfer.effectAllowed = "move", i.dataTransfer.setData(z, t), e.classList.add("opacity-50");
      }), e.addEventListener("dragend", () => {
        this.dragReorder = null, this.dropTargetFieldId = null, e.classList.remove("opacity-50"), s.querySelectorAll("[data-field-card]").forEach((i) => {
          i.classList.remove("border-t-2", "border-t-blue-400");
        });
      }), e.addEventListener("dragover", (i) => {
        this.dragReorder && this.dragReorder.sectionName === a && this.dragReorder.fieldId !== t && (i.preventDefault(), i.dataTransfer.dropEffect = "move", this.dropTargetFieldId !== t && (s.querySelectorAll("[data-field-card]").forEach((n) => {
          n.classList.remove("border-t-2", "border-t-blue-400");
        }), e.classList.add("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = t));
      }), e.addEventListener("dragleave", () => {
        this.dropTargetFieldId === t && (e.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null);
      }), e.addEventListener("drop", (i) => {
        i.preventDefault();
        const n = i.dataTransfer?.getData(z);
        e.classList.remove("border-t-2", "border-t-blue-400"), this.dropTargetFieldId = null, this.dragReorder = null, n && n !== t && this.reorderFieldBefore(n, t);
      });
    });
  }
  bindSectionSelectEvents(s) {
    s.querySelectorAll("[data-field-section-select]").forEach((e) => {
      e.addEventListener("change", () => {
        const t = e.dataset.fieldSectionSelect, a = e.value;
        if (a === "__new__") {
          const r = this.fields.find((i) => i.id === t)?.section || k;
          new L({
            title: "Create New Section",
            label: "Section name",
            placeholder: "e.g. sidebar",
            confirmLabel: "Create",
            inputClass: u(),
            onConfirm: (i) => {
              const n = i.trim().toLowerCase().replace(/\s+/g, "_");
              n && this.moveFieldToSection(t, n);
            },
            onCancel: () => {
              e.value = r;
            }
          }).show();
          return;
        }
        this.moveFieldToSection(t, a);
      });
    });
  }
  notifySchemaChange() {
    this.config.onSchemaChange(this.block.id, [...this.fields]), this.lastPreviewSignature = this.computeSchemaSignature(), this.schedulePreview();
  }
  previewSlug() {
    return this.block.slug || this.block.type || "";
  }
  renderPreviewSection() {
    return `
      <div class="border-b border-gray-200 dark:border-gray-700" data-block-preview-section>
        <button type="button" data-toggle-preview aria-expanded="${this.previewCollapsed ? "false" : "true"}"
                class="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
          <div class="flex items-center gap-2">
            <span class="w-1 h-4 rounded-full bg-sky-400"></span>
            <span>Preview</span>
            <span data-block-preview-loading class="${this.isPreviewing ? "" : "hidden"} inline-flex items-center" role="status" aria-label="Updating preview">
              <svg class="w-3.5 h-3.5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            </span>
          </div>
          <span data-preview-chevron class="w-4 h-4 text-gray-400 dark:text-gray-500 flex items-center justify-center">
            ${this.previewCollapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>'}
          </span>
        </button>
        <div class="px-5 pb-4 ${this.previewCollapsed ? "hidden" : ""}" data-preview-body-wrap>
          <div class="flex items-center justify-end gap-3 mb-2">
            <button type="button" data-block-expand-preview
                    class="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    aria-label="Open interactive preview" title="Open a larger, interactive preview">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path>
              </svg>
              Expand
            </button>
            <button type="button" data-block-refresh-preview
                    class="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"${this.isPreviewing ? " disabled" : ""}>
              Refresh
            </button>
          </div>
          <p class="mb-2 text-[11px] text-gray-400 dark:text-gray-500">Live, read-only preview. Use Expand to interact.</p>
          <div data-block-preview-container
               class="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 min-h-[160px]">
            ${this.renderPreviewBodyContent()}
          </div>
        </div>
      </div>`;
  }
  renderPreviewBodyContent() {
    return this.previewError ? `
        <div class="flex flex-col items-center justify-center h-32 text-red-400">
          <svg class="w-9 h-9 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <p class="text-sm font-medium">Preview failed</p>
          <p class="text-xs text-red-300 mt-1 max-w-xs text-center">${o(this.previewError)}</p>
        </div>` : this.previewHtml ? ne(this.previewHtml) : `
      <div class="flex flex-col items-center justify-center h-32 text-gray-400">
        <svg class="w-9 h-9 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
        </svg>
        <p class="text-sm">Add fields to see a live preview</p>
      </div>`;
  }
  renderPreviewBody() {
    const s = this.config.container.querySelector("[data-block-preview-container]");
    s && (s.innerHTML = this.renderPreviewBodyContent());
  }
  updatePreviewProgress() {
    const s = this.config.container.querySelector("[data-block-preview-loading]");
    s && s.classList.toggle("hidden", !this.isPreviewing);
    const e = this.config.container.querySelector("[data-block-refresh-preview]");
    e && (e.disabled = this.isPreviewing);
  }
  computeSchemaSignature() {
    try {
      return JSON.stringify(T(this.fields, this.previewSlug()));
    } catch {
      return `len:${this.fields.length}`;
    }
  }
  maybeSchedulePreview() {
    const s = this.computeSchemaSignature();
    s !== this.lastPreviewSignature && (this.lastPreviewSignature = s, this.schedulePreview());
  }
  schedulePreview(s = 400) {
    this.previewDebounceTimer && clearTimeout(this.previewDebounceTimer), this.previewDebounceTimer = setTimeout(() => {
      this.previewDebounceTimer = null, this.previewSchema();
    }, s);
  }
  async previewSchema() {
    if (this.fields.length === 0) {
      this.previewRequestSeq++, this.previewHtml = null, this.previewError = null, this.isPreviewing = !1, this.updatePreviewProgress(), this.renderPreviewBody();
      return;
    }
    const s = T(this.fields, this.previewSlug()), e = ++this.previewRequestSeq;
    this.isPreviewing = !0, this.updatePreviewProgress();
    try {
      const t = await this.config.api.previewSchema({
        schema: s,
        slug: this.previewSlug()
      });
      if (e !== this.previewRequestSeq) return;
      this.previewHtml = t.html, this.previewError = null, this.renderPreviewBody();
    } catch (t) {
      if (e !== this.previewRequestSeq) return;
      this.previewHtml = null, this.previewError = t instanceof Error ? t.message : "Preview failed", this.renderPreviewBody();
    } finally {
      e === this.previewRequestSeq && (this.isPreviewing = !1, this.updatePreviewProgress());
    }
  }
  togglePreviewCollapsed() {
    this.previewCollapsed = !this.previewCollapsed;
    const s = this.config.container.querySelector("[data-preview-body-wrap]"), e = this.config.container.querySelector("[data-preview-chevron]"), t = this.config.container.querySelector("[data-toggle-preview]");
    s && s.classList.toggle("hidden", this.previewCollapsed), t && t.setAttribute("aria-expanded", this.previewCollapsed ? "false" : "true"), e && (e.innerHTML = this.previewCollapsed ? '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
  }
  openInteractivePreview() {
    this.previewHtml && new le(this.previewHtml, () => re()).show();
  }
}, j, x = O("BlockLibraryIDE"), F = [
  "content",
  "media",
  "layout",
  "interactive",
  "custom"
], f = "default", _ = class N {
  constructor(e) {
    this.listEl = null, this.searchInput = null, this.categorySelect = null, this.countEl = null, this.createBtn = null, this.editorEl = null, this.paletteEl = null, this.activeMenu = null, this.editorPanel = null, this.palettePanel = null, this.autosaveTimers = /* @__PURE__ */ new Map(), this.boundVisibilityChange = null, this.boundBeforeUnload = null, this.paletteAsideEl = null, this.addFieldBar = null, this.paletteTriggerBtn = null, this.mediaQueryLg = null, this.popoverPalettePanel = null, this.channelSelectEl = null, this.channelResetBtn = null, this.channelAddBtn = null, this.backToContentTypesLink = null, this.currentChannel = f, this.availableChannels = [f], this.channelDiagnostics = null;
    const t = ie(e.dataset.apiBasePath, e.dataset.basePath);
    this.root = e, this.api = new G({ basePath: t }), this.state = {
      blocks: [],
      selectedBlockId: null,
      isLoading: !1,
      error: null,
      search: "",
      categoryFilter: null,
      categories: [],
      isCreating: !1,
      renamingBlockId: null,
      dirtyBlocks: /* @__PURE__ */ new Set(),
      savingBlocks: /* @__PURE__ */ new Set(),
      saveErrors: /* @__PURE__ */ new Map()
    };
  }
  async init() {
    this.bindDOM(), this.bindEvents(), this.initPalette(), this.bindAutosaveListeners(), this.bindResponsive(), this.initChannel(), await Promise.all([this.loadBlocks(), this.loadCategories()]);
  }
  initPalette() {
    this.paletteEl && (this.palettePanel = new I({
      container: this.paletteEl,
      api: this.api,
      onAddField: (e) => this.handlePaletteAddField(e)
    }), this.palettePanel.init());
  }
  bindAutosaveListeners() {
    this.root.addEventListener("keydown", (e) => {
      (e.ctrlKey || e.metaKey) && e.key === "s" && (e.preventDefault(), this.saveCurrentBlock());
    }), this.boundVisibilityChange = () => {
      document.hidden && this.saveAllDirty();
    }, document.addEventListener("visibilitychange", this.boundVisibilityChange), this.boundBeforeUnload = (e) => {
      this.state.dirtyBlocks.size > 0 && (e.preventDefault(), e.returnValue = "");
    }, window.addEventListener("beforeunload", this.boundBeforeUnload);
  }
  async saveBlock(e) {
    if (!this.state.dirtyBlocks.has(e)) return !0;
    const t = this.state.blocks.find((a) => a.id === e);
    if (!t) return !1;
    this.cancelScheduledSave(e), this.markSaving(e), this.notifySaveState(e, "saving");
    try {
      const a = await this.api.updateBlockDefinition(e, {
        name: t.name,
        slug: t.slug,
        type: t.type,
        description: t.description,
        category: t.category,
        icon: t.icon,
        schema: t.schema,
        ui_schema: t.ui_schema
      });
      return this.updateBlockInState(e, a), this.markClean(e), this.notifySaveState(e, "saved"), !0;
    } catch (a) {
      const r = a instanceof Error ? a.message : "Save failed";
      return this.markSaveError(e, r), this.notifySaveState(e, "error", r), !1;
    }
  }
  scheduleSave(e) {
    this.cancelScheduledSave(e);
    const t = setTimeout(() => {
      this.autosaveTimers.delete(e), this.saveBlock(e);
    }, N.AUTOSAVE_DELAY);
    this.autosaveTimers.set(e, t);
  }
  cancelScheduledSave(e) {
    const t = this.autosaveTimers.get(e);
    t && (clearTimeout(t), this.autosaveTimers.delete(e));
  }
  async saveCurrentBlock() {
    this.state.selectedBlockId && await this.saveBlock(this.state.selectedBlockId);
  }
  async saveAllDirty() {
    const e = [...this.state.dirtyBlocks];
    await Promise.all(e.map((t) => this.saveBlock(t)));
  }
  notifySaveState(e, t, a) {
    this.editorPanel && this.state.selectedBlockId === e && this.editorPanel.updateSaveState(t, a);
  }
  async handleEditorStatusChange(e, t) {
    const a = this.state.blocks.find((i) => i.id === e);
    if (!a) return;
    const r = a.status;
    if (r !== t) {
      if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
        this.showToast("Please fix save errors before changing status.", "error"), this.editorPanel?.revertStatus(r);
        return;
      }
      try {
        let i;
        if (t === "active" ? (i = await this.api.publishBlockDefinition(e), this.showToast("Block published.", "success")) : t === "deprecated" ? (i = await this.api.deprecateBlockDefinition(e), this.showToast("Block deprecated.", "info")) : (i = await this.api.updateBlockDefinition(e, { status: "draft" }), this.showToast("Block reverted to draft.", "info")), this.updateBlockInState(e, i), this.renderBlockList(), this.editorPanel && this.state.selectedBlockId === e) {
          const n = this.state.blocks.find((l) => l.id === e);
          n && this.editorPanel.update(n);
        }
      } catch (i) {
        const n = t === "active" ? "Block published." : t === "deprecated" ? "Block deprecated." : "Block reverted to draft.";
        if (i instanceof P && [
          404,
          405,
          501
        ].includes(i.status)) try {
          const d = await this.api.updateBlockDefinition(e, { status: t });
          if (this.updateBlockInState(e, d), this.renderBlockList(), this.editorPanel && this.state.selectedBlockId === e) {
            const c = this.state.blocks.find((p) => p.id === e);
            c && this.editorPanel.update(c);
          }
          this.showToast(n, t === "active" ? "success" : "info");
          return;
        } catch (d) {
          x.error("Status change fallback failed:", d);
        }
        const l = i instanceof Error ? i.message : "Status change failed";
        x.error("Status change failed:", i), this.showToast(l, "error"), this.editorPanel?.revertStatus(r);
      }
    }
  }
  bindResponsive() {
    this.paletteTriggerBtn?.addEventListener("click", () => {
      this.paletteTriggerBtn && this.openPalettePopover(this.paletteTriggerBtn);
    }), this.mediaQueryLg = window.matchMedia("(min-width: 1024px)"), this.mediaQueryLg.addEventListener("change", () => this.handleBreakpointChange());
  }
  handleBreakpointChange() {
    (this.mediaQueryLg?.matches ?? !0) && this.closePalettePopover();
  }
  openPalettePopover(e) {
    this.closePalettePopover();
    const t = document.createElement("div");
    t.className = "fixed inset-0 z-40", t.dataset.paletteBackdrop = "", t.addEventListener("click", () => this.closePalettePopover());
    const a = document.createElement("div");
    a.className = "fixed z-50 w-72 max-h-[60vh] bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden", a.dataset.palettePopover = "", a.innerHTML = `
      <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
        <h3 class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Add Field</h3>
        <button type="button" data-palette-popover-close
                class="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto" data-palette-popover-content></div>
    `, a.querySelector("[data-palette-popover-close]")?.addEventListener("click", () => this.closePalettePopover());
    const r = e.getBoundingClientRect(), i = 288;
    let n = r.left, l = r.top - 8;
    n + i > window.innerWidth - 16 && (n = window.innerWidth - i - 16), n < 16 && (n = 16);
    const d = Math.min(window.innerHeight * 0.6, 480);
    l - d < 16 ? l = r.bottom + 8 : l = l - d, a.style.top = `${l}px`, a.style.left = `${n}px`, document.body.appendChild(t), document.body.appendChild(a);
    const c = a.querySelector("[data-palette-popover-content]");
    c && (this.popoverPalettePanel = new I({
      container: c,
      api: this.api,
      onAddField: (p) => {
        this.handlePaletteAddField(p), this.closePalettePopover();
      }
    }), this.popoverPalettePanel.init(), this.state.selectedBlockId && this.popoverPalettePanel.enable());
  }
  closePalettePopover() {
    document.querySelector("[data-palette-backdrop]")?.remove(), document.querySelector("[data-palette-popover]")?.remove(), this.popoverPalettePanel = null;
  }
  updateAddFieldBar() {
    this.addFieldBar && this.addFieldBar.classList.toggle("hidden", !this.state.selectedBlockId);
  }
  initChannel() {
    const e = new URLSearchParams(window.location.search).get("channel");
    this.currentChannel = this.normalizeChannel(e), this.api.setChannel(this.currentChannel), this.refreshChannelOptions(), this.updateChannelStatus(), this.updateBackLink(), this.channelSelectEl?.addEventListener("change", () => {
      const t = this.channelSelectEl?.value ?? f;
      this.setChannel(t);
    }), this.channelResetBtn?.addEventListener("click", () => {
      this.setChannel(f);
    }), this.channelAddBtn?.addEventListener("click", () => {
      this.promptForChannel();
    }), this.api.setChannelSession(this.currentChannel).catch(() => {
    });
  }
  async setChannel(e) {
    const t = this.normalizeChannel(e);
    this.currentChannel = t, this.api.setChannel(t), this.refreshChannelOptions(), this.updateChannelStatus();
    try {
      await this.api.setChannelSession(t);
    } catch {
    }
    this.updateUrlChannel(t), this.state.selectedBlockId = null, this.state.dirtyBlocks.clear(), this.state.savingBlocks.clear(), this.state.saveErrors.clear(), this.editorPanel = null, this.renderEditor(), await Promise.all([this.loadBlocks(), this.loadCategories()]);
  }
  updateUrlChannel(e) {
    const t = new URL(window.location.href);
    e && e !== f ? t.searchParams.set("channel", e) : t.searchParams.delete("channel"), window.history.replaceState({}, "", t.toString());
  }
  promptForChannel() {
    if (!this.channelSelectEl) return;
    const e = this.currentChannel;
    new L({
      title: "Add Channel",
      label: "Channel name",
      placeholder: "e.g. staging",
      confirmLabel: "Add",
      helpText: ge,
      inputClass: u(),
      onConfirm: (t) => {
        const a = pe(t);
        if (!a.ok) return a.error;
        this.upsertChannelOption(a.value), this.channelSelectEl.value = a.value, this.setChannel(a.value);
      },
      onCancel: () => {
        this.channelSelectEl.value = e;
      }
    }).show();
  }
  normalizeChannel(e) {
    return ue(e, f);
  }
  refreshChannelOptions() {
    if (!this.channelSelectEl) return;
    const e = this.normalizeChannel(this.currentChannel), t = /* @__PURE__ */ new Set([f]);
    for (const r of this.availableChannels) t.add(this.normalizeChannel(r));
    t.add(e);
    const a = Array.from(t).sort((r, i) => r === f ? -1 : i === f ? 1 : r.localeCompare(i));
    this.channelSelectEl.innerHTML = "";
    for (const r of a) {
      const i = document.createElement("option");
      i.value = r, i.textContent = this.channelLabel(r), this.channelSelectEl.appendChild(i);
    }
    this.channelSelectEl.value = e;
  }
  channelLabel(e) {
    const t = this.normalizeChannel(e);
    return t === f ? "Default" : t;
  }
  upsertChannelOption(e) {
    const t = this.normalizeChannel(e);
    this.availableChannels.includes(t) || this.availableChannels.push(t), this.refreshChannelOptions();
  }
  updateChannelStatus() {
    const e = this.normalizeChannel(this.currentChannel) === f;
    this.channelResetBtn && this.channelResetBtn.classList.toggle("hidden", e), this.updateBackLink();
  }
  updateBackLink() {
    if (!this.backToContentTypesLink) return;
    const e = this.normalizeChannel(this.currentChannel), t = `${this.root.dataset.basePath || ""}/content/types`;
    e && e !== f ? this.backToContentTypesLink.href = `${t}?channel=${encodeURIComponent(e)}` : this.backToContentTypesLink.href = t;
  }
  getSelectedBlock() {
    return this.state.selectedBlockId ? this.state.blocks.find((e) => e.id === this.state.selectedBlockId) ?? null : null;
  }
  selectBlock(e) {
    const t = this.state.selectedBlockId;
    t && t !== e && this.state.dirtyBlocks.has(t) && (this.cancelScheduledSave(t), this.saveBlock(t)), this.state.selectedBlockId = e, this.editorPanel && t !== e && this.editorPanel.updateSaveState("idle"), this.renderBlockList(), this.renderEditor();
  }
  markDirty(e) {
    this.state.dirtyBlocks.add(e), this.updateBlockIndicator(e);
  }
  markClean(e) {
    this.state.dirtyBlocks.delete(e), this.state.saveErrors.delete(e), this.state.savingBlocks.delete(e), this.updateBlockIndicator(e);
  }
  markSaving(e) {
    this.state.savingBlocks.add(e), this.updateBlockIndicator(e);
  }
  markSaveError(e, t) {
    this.state.savingBlocks.delete(e), this.state.saveErrors.set(e, t), this.updateBlockIndicator(e);
  }
  async refreshBlocks() {
    await this.loadBlocks();
  }
  bindDOM() {
    this.listEl = this.root.querySelector("[data-block-ide-list]"), this.searchInput = this.root.querySelector("[data-block-ide-search]"), this.categorySelect = this.root.querySelector("[data-block-ide-category-filter]"), this.countEl = this.root.querySelector("[data-block-ide-count]"), this.createBtn = this.root.querySelector("[data-block-ide-create]"), this.editorEl = this.root.querySelector("[data-block-ide-editor]"), this.paletteEl = this.root.querySelector("[data-block-ide-palette]"), this.paletteAsideEl = this.root.querySelector("[data-block-ide-palette-aside]"), this.addFieldBar = this.root.querySelector("[data-block-ide-add-field-bar]"), this.paletteTriggerBtn = this.root.querySelector("[data-block-ide-palette-trigger]"), this.channelSelectEl = document.querySelector("[data-block-ide-channel], [data-block-ide-env]"), this.channelResetBtn = document.querySelector("[data-block-ide-channel-reset], [data-block-ide-env-reset]"), this.channelAddBtn = document.querySelector("[data-block-ide-channel-add], [data-block-ide-env-add]"), this.backToContentTypesLink = document.querySelector("[data-back-to-content-types]");
  }
  bindEvents() {
    this.searchInput?.addEventListener("input", () => {
      this.state.search = this.searchInput.value, this.renderBlockList();
    }), this.categorySelect?.addEventListener("change", () => {
      this.state.categoryFilter = this.categorySelect.value || null, this.renderBlockList();
    }), this.createBtn?.addEventListener("click", () => {
      this.showCreateForm();
    }), this.root.addEventListener("click", (e) => {
      e.target.closest("[data-block-ide-create-first]") && this.showCreateForm();
    }), this.listEl?.addEventListener("click", (e) => {
      this.handleListClick(e);
    }), document.addEventListener("click", (e) => {
      if (this.activeMenu) {
        const t = e.target;
        !t.closest("[data-block-context-menu]") && !t.closest("[data-block-actions]") && this.closeContextMenu();
      }
    }), this.root.addEventListener("keydown", (e) => {
      e.key === "Escape" && (this.state.isCreating && this.cancelCreate(), this.state.renamingBlockId && this.cancelRename(), this.closeContextMenu());
    });
  }
  async loadBlocks() {
    this.state.isLoading = !0, this.state.error = null, this.renderBlockList();
    try {
      const [e, t] = await Promise.all([this.api.listBlockDefinitions(), this.api.getBlockDefinitionDiagnostics()]);
      this.state.blocks = e.items.map((i) => this.normalizeBlockDefinition(i)), this.channelDiagnostics = t;
      const a = Array.isArray(t?.available_channels) ? t.available_channels : [];
      a.length > 0 && (this.availableChannels = a.map((i) => this.normalizeChannel(i)).filter((i, n, l) => i && l.indexOf(i) === n));
      const r = t?.effective_channel;
      if (r) {
        const i = this.normalizeChannel(r);
        i !== this.currentChannel && (this.currentChannel = i, this.api.setChannel(i), this.updateUrlChannel(i));
      }
      this.refreshChannelOptions(), this.updateChannelStatus();
    } catch (e) {
      this.state.blocks = [], this.channelDiagnostics = null, this.availableChannels = [f], this.state.error = this.formatBlockLoadError(e), this.refreshChannelOptions(), this.updateChannelStatus();
    } finally {
      this.state.isLoading = !1, this.refreshCategoriesFromBlocks(), this.renderBlockList(), this.updateCount(), this.autoSelectInitialBlock();
    }
  }
  autoSelectInitialBlock() {
    this.state.error || (this.state.selectedBlockId && !this.state.blocks.some((e) => e.id === this.state.selectedBlockId) && (this.state.selectedBlockId = null), !this.state.selectedBlockId && (this.state.blocks.length > 0 ? this.selectBlock(this.state.blocks[0].id) : this.renderEditor()));
  }
  formatBlockLoadError(e) {
    return e instanceof P ? e.status === 404 ? `Block Library API route not found. Expected GET ${this.api.getBasePath()}/panels/block_definitions.` : e.status === 403 ? "Access denied while loading block definitions. Check your admin permissions." : e.message ? `Failed to load block definitions: ${e.message}` : `Failed to load block definitions (HTTP ${e.status}).` : e instanceof Error && e.message ? `Failed to load block definitions: ${e.message}` : "Failed to load block definitions.";
  }
  async loadCategories() {
    this.state.categories = [], this.mergeCategories(F), this.mergeCategories(this.loadUserCategories());
    try {
      const e = await this.api.getBlockCategories();
      this.mergeCategories(e);
    } catch {
    }
    this.renderCategoryOptions(), this.updateCreateCategorySelect();
  }
  refreshCategoriesFromBlocks() {
    this.state.categories.length === 0 && (this.mergeCategories(F), this.mergeCategories(this.loadUserCategories()));
    const e = new Set(this.state.categories.map((t) => this.normalizeCategory(t)));
    this.state.categories = Array.from(e);
    for (const t of this.state.blocks) {
      const a = this.normalizeCategory(t.category || "");
      a && !e.has(a) && (e.add(a), this.state.categories.push(a));
    }
    this.renderCategoryOptions(), this.updateCreateCategorySelect();
  }
  normalizeCategory(e) {
    return e.trim().toLowerCase();
  }
  mergeCategories(e) {
    for (const t of e) {
      const a = this.normalizeCategory(t);
      a && (this.state.categories.includes(a) || this.state.categories.push(a));
    }
  }
  loadUserCategories() {
    const e = sessionStorage.getItem("block-library-user-categories"), t = R(e, []);
    return Array.isArray(t) ? t.map((a) => this.normalizeCategory(a)).filter((a) => a.length > 0) : [];
  }
  persistUserCategories() {
    const e = this.state.categories.filter((t) => !F.includes(t));
    try {
      sessionStorage.setItem("block-library-user-categories", JSON.stringify(e));
    } catch {
    }
  }
  addCategory(e) {
    const t = this.normalizeCategory(e);
    return t ? (this.state.categories.includes(t) || (this.state.categories.push(t), this.persistUserCategories(), this.renderCategoryOptions(), this.updateCreateCategorySelect(t), this.renderEditor()), t) : null;
  }
  updateCreateCategorySelect(e) {
    const t = this.listEl?.querySelector("[data-create-category]");
    if (!t) return;
    const a = e ?? t.value;
    t.innerHTML = this.state.categories.map((r) => `<option value="${o(r)}">${o($(r))}</option>`).join(""), t.innerHTML += '<option value="__add__">Add category...</option>', a && this.state.categories.includes(a) && (t.value = a);
  }
  promptForCategory(e, t) {
    new L({
      title: "Add Category",
      label: "Category name",
      placeholder: "e.g. marketing",
      confirmLabel: "Add",
      inputClass: u(),
      onConfirm: (a) => {
        const r = this.addCategory(a);
        if (r) {
          this.updateCreateCategorySelect(r), e.value = r, e.dataset.prevValue = r;
          return;
        }
        e.value = t;
      },
      onCancel: () => {
        e.value = t;
      }
    }).show();
  }
  renderBlockList() {
    if (!this.listEl) return;
    if (this.state.isLoading) {
      this.listEl.innerHTML = `
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        </div>`;
      return;
    }
    if (this.state.error) {
      this.listEl.innerHTML = `
        <div class="mx-4 my-6 rounded-md border border-red-200 bg-red-50 px-3 py-3 dark:border-red-800/70 dark:bg-red-900/20">
          <div class="flex items-start gap-2">
            <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p class="text-xs text-red-700 dark:text-red-300">${o(this.state.error)}</p>
          </div>
          <button type="button" data-block-ide-retry
                  class="mt-2 ml-6 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Retry
          </button>
        </div>`;
      return;
    }
    const e = this.getFilteredBlocks();
    if (e.length === 0) {
      const a = this.state.search || this.state.categoryFilter, r = this.normalizeChannel(this.currentChannel), i = r === f, n = a ? "" : i ? `No block definitions were found in the "${f}" channel.` : `No block definitions were found in channel "${r}".`, l = !a && !i ? `<button type="button"
                 data-block-ide-empty-reset-channel
                 class="mt-2 inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-100 transition-colors">
               Reset to Default Channel
             </button>` : "", d = !a && this.channelDiagnostics ? `<p class="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Visible in active channel: ${this.channelDiagnostics.total_effective}. Default channel total: ${this.channelDiagnostics.total_default}.</p>` : "";
      this.listEl.innerHTML = `
        <div class="px-4 py-8 text-center">
          <svg class="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-sm text-gray-500 dark:text-gray-400">${a ? "No blocks match your filters." : "No blocks yet."}</p>
          ${a ? "" : '<p class="text-xs text-gray-400 dark:text-gray-500 mt-1">Click "New Block" to create your first block definition.</p>'}
          ${n ? `<p class="text-[11px] text-gray-400 dark:text-gray-500 mt-2">${o(n)}</p>` : ""}
          ${d}
          ${l}
        </div>`;
      return;
    }
    let t = "";
    this.state.isCreating && (t += this.renderCreateForm()), t += '<ul class="p-2 space-y-0.5">';
    for (const a of e) t += this.renderBlockItem(a);
    if (t += "</ul>", this.listEl.innerHTML = t, this.state.isCreating) {
      const a = this.listEl.querySelector("[data-create-name]"), r = this.listEl.querySelector("[data-create-slug]"), i = this.listEl.querySelector("[data-create-category]");
      a?.focus(), a && r && (a.addEventListener("input", () => {
        r.dataset.userModified || (r.value = U(a.value));
      }), r.addEventListener("input", () => {
        r.dataset.userModified = "true";
      })), i && (i.dataset.prevValue = i.value, i.addEventListener("change", () => {
        const n = i.value;
        if (n === "__add__") {
          const l = i.dataset.prevValue ?? "";
          this.promptForCategory(i, l);
          return;
        }
        i.dataset.prevValue = n;
      }));
    }
    if (this.state.renamingBlockId) {
      const a = this.listEl.querySelector("[data-rename-input]");
      a?.focus(), a?.select();
    }
  }
  renderBlockItem(e) {
    const t = e.id === this.state.selectedBlockId, a = e.id === this.state.renamingBlockId, r = this.state.dirtyBlocks.has(e.id), i = this.state.savingBlocks.has(e.id), n = this.state.saveErrors.get(e.id), l = e.slug || e.type || "", d = t ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200" : "hover:bg-gray-50 dark:hover:bg-gray-800 border-transparent", c = a ? `<input type="text" data-rename-input data-rename-block-id="${o(e.id)}"
               value="${o(e.name)}"
               class="block w-full text-[13px] font-medium text-gray-800 dark:text-gray-100 bg-white dark:bg-slate-800 border border-blue-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500" />` : `<span class="block font-medium text-gray-800 dark:text-gray-100 truncate text-[13px]">${o(e.name || "Untitled")}</span>`;
    let p = "";
    return n ? p = `<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" title="Save failed: ${o(n)}"></span>` : i ? p = '<span class="flex-shrink-0 w-2 h-2 rounded-full border border-blue-400 border-t-transparent animate-spin" title="Saving..."></span>' : r ? p = '<span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-orange-400" title="Unsaved changes"></span>' : p = fe(e.status, { size: "sm" }), `
      <li>
        <div data-block-id="${o(e.id)}"
             class="relative group w-full text-left px-3 py-2 text-sm rounded-lg border ${d} transition-colors flex items-center gap-2.5 cursor-pointer">
          <span class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            ${e.icon ? ce(e.icon) : '<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z"></path></svg>'}
          </span>
          <span class="flex-1 min-w-0">
            ${c}
            <span class="block text-[11px] text-gray-400 dark:text-gray-500 font-mono truncate">${o(l)}</span>
          </span>
          ${p}
          <button type="button" data-block-actions="${o(e.id)}"
                  class="flex-shrink-0 p-0.5 rounded text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label="Block actions" title="Actions" aria-haspopup="true">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
            </svg>
          </button>
        </div>
      </li>`;
  }
  renderCreateForm() {
    return `
      <div class="p-2 mb-1" data-block-create-form>
        <div class="p-3 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50/50 dark:bg-blue-900/20 space-y-2">
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Name</label>
            <input type="text" data-create-name placeholder="e.g. Hero Section"
                   class="${u()}" />
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Slug</label>
            <input type="text" data-create-slug placeholder="e.g. hero_section" pattern="^[a-z][a-z0-9_\\-]*$"
                   class="${u()} font-mono" />
            <p class="mt-0.5 text-[10px] text-gray-400 dark:text-gray-500">Lowercase, numbers, hyphens, underscores.</p>
          </div>
          <div>
            <label class="block text-[11px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Category</label>
            <select data-create-category
                    class="${E()}">
              ${this.state.categories.map((e) => `<option value="${o(e)}">${o($(e))}</option>`).join("")}
              <option value="__add__">Add category...</option>
            </select>
          </div>
          <div data-create-error class="hidden text-xs text-red-600 dark:text-red-400"></div>
          <div class="flex items-center gap-2 pt-1">
            <button type="button" data-create-save
                    class="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
              Create
            </button>
            <button type="button" data-create-cancel
                    class="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>`;
  }
  renderContextMenu(e, t) {
    this.closeContextMenu();
    const a = this.state.blocks.find((p) => p.id === e);
    if (!a) return;
    const r = document.createElement("div");
    r.setAttribute("data-block-context-menu", e), r.className = "absolute z-50 w-44 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 text-sm text-gray-700 dark:text-gray-300";
    const i = [{
      label: "Rename",
      action: "rename",
      icon: S.rename
    }, {
      label: "Duplicate",
      action: "duplicate",
      icon: S.duplicate
    }];
    a.status === "draft" ? i.push({
      label: "Publish",
      action: "publish",
      icon: S.publish
    }) : a.status === "active" && i.push({
      label: "Deprecate",
      action: "deprecate",
      icon: S.deprecate
    }), i.push({
      label: "Delete",
      action: "delete",
      icon: S.delete,
      danger: !0
    }), r.innerHTML = i.map((p) => `
        <button type="button" data-menu-action="${p.action}" data-menu-block-id="${o(e)}"
                class="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${p.danger ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20" : ""}">
          ${p.icon}
          <span>${p.label}</span>
        </button>`).join("");
    const n = t.getBoundingClientRect(), l = 176;
    r.style.position = "fixed", r.style.top = `${n.bottom + 4}px`;
    let d = n.left;
    d + l > window.innerWidth - 8 && (d = window.innerWidth - l - 8), d < 8 && (d = 8), r.style.left = `${d}px`, document.body.appendChild(r);
    const c = r.getBoundingClientRect();
    c.bottom > window.innerHeight - 8 && (r.style.top = `${n.top - c.height - 4}px`), r.addEventListener("click", (p) => {
      const m = p.target.closest("[data-menu-action]");
      if (!m) return;
      const y = m.dataset.menuAction, b = m.dataset.menuBlockId;
      this.closeContextMenu(), this.handleAction(y, b);
    }), this.activeMenu = () => {
      r.remove(), this.activeMenu = null;
    };
  }
  closeContextMenu() {
    this.activeMenu && this.activeMenu();
  }
  renderCategoryOptions() {
    if (this.categorySelect) {
      this.categorySelect.innerHTML = '<option value="">All Categories</option>';
      for (const e of this.state.categories) {
        const t = document.createElement("option");
        t.value = e, t.textContent = $(e), e === this.state.categoryFilter && (t.selected = !0), this.categorySelect.appendChild(t);
      }
    }
  }
  updateCount() {
    this.countEl && (this.countEl.textContent = String(this.state.blocks.length));
  }
  updateBlockIndicator(e) {
    this.listEl?.querySelector(`[data-block-id="${e}"]`) && this.renderBlockList();
  }
  renderEditor() {
    if (!this.editorEl) return;
    const e = this.getSelectedBlock();
    if (!e) {
      this.editorPanel = null;
      const t = !this.state.isLoading && !this.state.error && this.state.blocks.length === 0;
      this.editorEl.innerHTML = t ? `
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <svg class="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2z"></path>
          </svg>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">No blocks yet</p>
          <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">Reusable blocks let editors compose content. Create one to get started.</p>
          <button type="button" data-block-ide-create-first
                  class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Create your first block
          </button>
        </div>` : `
        <div class="flex flex-col items-center justify-center h-full p-8 text-center">
          <svg class="w-16 h-16 text-gray-200 dark:text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          <p class="text-sm text-gray-400 dark:text-gray-500">Select a block from the list to edit</p>
          <p class="text-xs text-gray-300 dark:text-gray-600 mt-1">or create a new block to get started</p>
        </div>`, this.palettePanel?.disable(), this.updateAddFieldBar();
      return;
    }
    this.editorPanel ? this.editorPanel.update(e) : (this.editorPanel = new ve({
      container: this.editorEl,
      block: e,
      categories: this.state.categories,
      api: this.api,
      onMetadataChange: (t, a) => this.handleEditorMetadataChange(t, a),
      onSchemaChange: (t, a) => this.handleEditorSchemaChange(t, a),
      onFieldDrop: (t) => this.handlePaletteAddField(t),
      onAddFieldClick: () => this.handleAddFieldClick(),
      onStatusChange: (t, a) => this.handleEditorStatusChange(t, a),
      onSave: (t) => this.saveBlock(t)
    }), this.editorPanel.render()), this.palettePanel?.enable(), this.updateAddFieldBar();
  }
  handleEditorMetadataChange(e, t) {
    const a = this.state.blocks.findIndex((n) => n.id === e);
    if (a < 0) return;
    const r = this.state.blocks[a], i = {
      ...r,
      ...t
    };
    if (t.slug !== void 0 && t.slug !== r.slug) {
      const n = (t.slug ?? "").trim();
      n && (!t.type && (!r.type || r.type === r.slug) && (i.type = n, t.type = n), i.schema && typeof i.schema == "object" && (i.schema = {
        ...i.schema,
        $id: n
      }));
    }
    this.state.blocks[a] = i, this.markDirty(e), (t.name !== void 0 || t.status !== void 0 || t.slug !== void 0 || t.type !== void 0) && this.updateBlockItemDOM(e, i), this.scheduleSave(e);
  }
  handleEditorSchemaChange(e, t) {
    const a = this.state.blocks.findIndex((l) => l.id === e);
    if (a < 0) return;
    const r = this.state.blocks[a].schema, i = this.state.blocks[a].slug || this.state.blocks[a].type;
    let n = W(t, i);
    n = this.mergeSchemaExtras(r, n), this.state.blocks[a] = {
      ...this.state.blocks[a],
      schema: n
    }, this.markDirty(e), this.scheduleSave(e);
  }
  handleAddFieldClick() {
    this.paletteEl && this.paletteEl.offsetParent !== null ? this.paletteEl.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    }) : this.paletteTriggerBtn && this.openPalettePopover(this.paletteTriggerBtn);
  }
  handlePaletteAddField(e) {
    if (!this.editorPanel || !this.state.selectedBlockId) return;
    const t = e.type === "blocks", a = t ? "Content Blocks" : e?.label ?? $(e.type), r = t ? "content_blocks" : e.type.replace(/-/g, "_"), i = new Set(this.editorPanel.getFields().map((c) => c.name));
    let n = r, l = 1;
    for (; i.has(n); ) n = t ? `content_blocks_${l++}` : `${r}_${l++}`;
    const d = {
      id: K(),
      name: n,
      type: e.type,
      label: l > 1 && t ? `Content Blocks ${l - 1}` : a,
      required: !1,
      ...e.defaultConfig ?? {}
    };
    this.editorPanel.addField(d), this.handleEditorSchemaChange(this.state.selectedBlockId, this.editorPanel.getFields());
  }
  getFilteredBlocks() {
    let e = [...this.state.blocks];
    if (this.state.search) {
      const t = this.state.search.toLowerCase();
      e = e.filter((a) => a.name.toLowerCase().includes(t) || a.type.toLowerCase().includes(t) || (a.slug?.toLowerCase().includes(t) ?? !1) || (a.description?.toLowerCase().includes(t) ?? !1));
    }
    if (this.state.categoryFilter) {
      const t = this.state.categoryFilter.toLowerCase().trim();
      e = e.filter((a) => (a.category || "custom").toLowerCase().trim() === t);
    }
    return e;
  }
  handleListClick(e) {
    const t = e.target;
    if (t.closest("[data-block-ide-retry]")) {
      this.loadBlocks();
      return;
    }
    if (t.closest("[data-block-ide-empty-reset-channel], [data-block-ide-empty-reset-env]")) {
      this.setChannel(f);
      return;
    }
    if (t.closest("[data-create-save]")) {
      this.handleCreateSave();
      return;
    }
    if (t.closest("[data-create-cancel]")) {
      this.cancelCreate();
      return;
    }
    const a = t.closest("[data-block-actions]");
    if (a) {
      e.stopPropagation();
      const i = a.dataset.blockActions;
      this.renderContextMenu(i, a);
      return;
    }
    if (t.closest("[data-rename-input]")) {
      e.stopPropagation();
      return;
    }
    const r = t.closest("[data-block-id]");
    if (r) {
      const i = r.dataset.blockId;
      this.selectBlock(i);
      return;
    }
  }
  handleAction(e, t) {
    switch (e) {
      case "rename":
        this.startRename(t);
        break;
      case "duplicate":
        this.duplicateBlock(t);
        break;
      case "publish":
        this.publishBlock(t);
        break;
      case "deprecate":
        this.deprecateBlock(t);
        break;
      case "delete":
        this.deleteBlock(t);
    }
  }
  showCreateForm() {
    this.state.isCreating = !0, this.renderBlockList();
  }
  cancelCreate() {
    this.state.isCreating = !1, this.renderBlockList();
  }
  async handleCreateSave() {
    const e = this.listEl?.querySelector("[data-create-name]"), t = this.listEl?.querySelector("[data-create-slug]"), a = this.listEl?.querySelector("[data-create-category]"), r = this.listEl?.querySelector("[data-create-error]"), i = e?.value.trim() ?? "", n = t?.value.trim() ?? "";
    let l = a?.value ?? "custom";
    if (l === "__add__" && (l = "custom"), !i) {
      this.showCreateError(r, "Name is required."), e?.focus();
      return;
    }
    if (!n) {
      this.showCreateError(r, "Slug is required."), t?.focus();
      return;
    }
    if (!/^[a-z][a-z0-9_\-]*$/.test(n)) {
      this.showCreateError(r, "Slug must start with a letter and contain only lowercase, numbers, hyphens, underscores."), t?.focus();
      return;
    }
    const d = this.listEl?.querySelector("[data-create-save]");
    d && (d.disabled = !0, d.textContent = "Creating...");
    try {
      const c = await this.api.createBlockDefinition({
        name: i,
        slug: n,
        type: n,
        category: l,
        status: "draft",
        schema: {
          $schema: "https://json-schema.org/draft/2020-12/schema",
          type: "object",
          properties: {}
        }
      });
      c.slug || (c.slug = n), c.type || (c.type = c.slug || n);
      const p = this.normalizeBlockDefinition(c);
      this.state.isCreating = !1, this.state.blocks.unshift(p), this.state.selectedBlockId = p.id, this.updateCount(), this.renderBlockList(), this.renderEditor();
    } catch (c) {
      const p = c instanceof P ? c.message : "Failed to create block.";
      this.showCreateError(r, p), d && (d.disabled = !1, d.textContent = "Create");
    }
  }
  showCreateError(e, t) {
    e && (e.textContent = t, e.classList.remove("hidden"));
  }
  startRename(e) {
    this.state.renamingBlockId = e, this.renderBlockList();
    const t = this.listEl?.querySelector("[data-rename-input]");
    t && (t.addEventListener("keydown", (a) => {
      a.key === "Enter" && (a.preventDefault(), this.commitRename(e, t.value.trim())), a.key === "Escape" && (a.preventDefault(), this.cancelRename());
    }), t.addEventListener("blur", () => {
      const a = this.state.blocks.find((r) => r.id === e);
      a && t.value.trim() && t.value.trim() !== a.name ? this.commitRename(e, t.value.trim()) : this.cancelRename();
    }));
  }
  async commitRename(e, t) {
    if (!t) {
      this.cancelRename();
      return;
    }
    const a = this.state.blocks.find((r) => r.id === e);
    if (!a || a.name === t) {
      this.cancelRename();
      return;
    }
    try {
      const r = await this.api.updateBlockDefinition(e, { name: t });
      this.updateBlockInState(e, r);
    } catch (r) {
      x.error("Rename failed:", r);
    } finally {
      this.state.renamingBlockId = null, this.renderBlockList();
    }
  }
  cancelRename() {
    this.state.renamingBlockId = null, this.renderBlockList();
  }
  async duplicateBlock(e) {
    const t = this.state.blocks.find((i) => i.id === e);
    if (!t) return;
    const a = `${(t.slug || t.type || "block").trim()}_copy`, r = a;
    try {
      const i = await this.api.cloneBlockDefinition(e, r, a), n = this.normalizeBlockDefinition(i);
      this.state.blocks.unshift(n), this.state.selectedBlockId = n.id, this.updateCount(), this.renderBlockList(), this.renderEditor();
    } catch (i) {
      x.error("Duplicate failed:", i), this.showToast(i instanceof Error ? i.message : "Failed to duplicate block.", "error");
    }
  }
  async publishBlock(e) {
    if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
      this.showToast("Please fix save errors before publishing.", "error");
      return;
    }
    try {
      const t = await this.api.publishBlockDefinition(e);
      if (this.updateBlockInState(e, t), this.renderBlockList(), this.showToast("Block published.", "success"), this.state.selectedBlockId === e && this.editorPanel) {
        const a = this.state.blocks.find((r) => r.id === e);
        a && this.editorPanel.update(a);
      }
    } catch (t) {
      x.error("Publish failed:", t), this.showToast(t instanceof Error ? t.message : "Failed to publish block.", "error");
    }
  }
  async deprecateBlock(e) {
    if (this.state.dirtyBlocks.has(e) && !await this.saveBlock(e)) {
      this.showToast("Please fix save errors before deprecating.", "error");
      return;
    }
    try {
      const t = await this.api.deprecateBlockDefinition(e);
      if (this.updateBlockInState(e, t), this.renderBlockList(), this.showToast("Block deprecated.", "info"), this.state.selectedBlockId === e && this.editorPanel) {
        const a = this.state.blocks.find((r) => r.id === e);
        a && this.editorPanel.update(a);
      }
    } catch (t) {
      x.error("Deprecate failed:", t), this.showToast(t instanceof Error ? t.message : "Failed to deprecate block.", "error");
    }
  }
  async deleteBlock(e) {
    const t = this.state.blocks.find((a) => a.id === e);
    if (t && await H.confirm(`Delete "${t.name}"? This cannot be undone.`, {
      title: "Delete Block",
      confirmText: "Delete",
      confirmVariant: "danger"
    }))
      try {
        await this.api.deleteBlockDefinition(e), this.state.blocks = this.state.blocks.filter((a) => a.id !== e), this.state.dirtyBlocks.delete(e), this.state.savingBlocks.delete(e), this.state.saveErrors.delete(e), this.state.selectedBlockId === e && (this.state.selectedBlockId = null, this.renderEditor()), this.updateCount(), this.renderBlockList();
      } catch (a) {
        x.error("Delete failed:", a), this.showToast(a instanceof Error ? a.message : "Failed to delete block.", "error");
      }
  }
  updateBlockItemDOM(e, t) {
    const a = this.listEl?.querySelector(`[data-block-id="${e}"]`);
    if (!a) return;
    const r = a.querySelector(".flex-1.min-w-0");
    if (!r) return;
    const i = r.querySelectorAll(":scope > span");
    i.length >= 1 && !this.state.renamingBlockId && (i[0].textContent = t.name || "Untitled"), i.length >= 2 && (i[1].textContent = t.slug || t.type || "");
  }
  updateBlockInState(e, t) {
    const a = this.state.blocks.findIndex((r) => r.id === e);
    if (a >= 0) {
      const r = this.state.blocks[a], i = this.mergeBlockDefinition(r, t);
      this.state.blocks[a] = i;
    }
  }
  normalizeBlockDefinition(e) {
    const t = { ...e }, a = (t.slug ?? "").trim(), r = (t.type ?? "").trim();
    return !a && r && (t.slug = r), !r && a && (t.type = a), t;
  }
  mergeBlockDefinition(e, t) {
    const a = {
      ...e,
      ...t
    };
    t.icon == null && e.icon && (a.icon = e.icon), t.description == null && e.description && (a.description = e.description), t.category == null && e.category && (a.category = e.category);
    const r = (t.slug ?? "").trim(), i = (t.type ?? "").trim();
    !r && e.slug && (a.slug = e.slug), !i && e.type && (a.type = e.type);
    const n = (a.slug ?? "").trim(), l = (a.type ?? "").trim();
    return !n && l && (a.slug = l), !l && n && (a.type = n), a;
  }
  mergeSchemaExtras(e, t) {
    if (!e || typeof e != "object") return t;
    const a = { ...t }, r = /* @__PURE__ */ new Set([
      "properties",
      "required",
      "type",
      "$schema"
    ]);
    for (const [i, n] of Object.entries(e))
      if (!r.has(i)) {
        if (i === "$id") {
          !a.$id && n && (a.$id = n);
          continue;
        }
        i in a || (a[i] = n);
      }
    return a;
  }
  showToast(e, t = "info") {
    const a = window.notify?.[t];
    if (typeof a == "function") {
      a(e);
      return;
    }
    const r = this.root.querySelector("[data-ide-toast]");
    r && r.remove();
    const i = t === "error" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800" : t === "success" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800" : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800", n = document.createElement("div");
    n.setAttribute("data-ide-toast", ""), n.className = `fixed top-4 right-4 z-[100] px-4 py-2.5 rounded-lg border text-sm font-medium shadow-lg ${i} transition-opacity`, n.textContent = e, document.body.appendChild(n), setTimeout(() => {
      n.style.opacity = "0", setTimeout(() => n.remove(), 300);
    }, 3e3);
  }
};
j = _;
j.AUTOSAVE_DELAY = 1500;
var S = {
  rename: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>',
  duplicate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>',
  publish: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>',
  deprecate: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path></svg>',
  delete: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>'
};
function Se(s = document) {
  Array.from(s.querySelectorAll("[data-block-library-ide]")).forEach((e) => {
    if (e.dataset.ideInitialized !== "true")
      try {
        new _(e).init(), e.dataset.ideInitialized = "true";
      } catch (t) {
        x.error("Block Library IDE failed to initialize:", t);
      }
  });
}
export {
  Se as n,
  ve as r,
  _ as t
};

//# sourceMappingURL=block-library-ide-q6hmvQbs.js.map