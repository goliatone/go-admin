import { n as L } from "./rolldown-runtime-DpiKQypI.js";
import { createLogger as F } from "../shared/logger.js";
import { escapeHTML as a } from "../shared/html.js";
import { t as A } from "./toast-manager-CEA-8d8Y.js";
var q = /* @__PURE__ */ L({ FilterBuilder: () => E }), w = F("DataGrid"), P = {
  filtersTitle: "Filters",
  savedFilters: "Saved filters",
  editAsSQL: "Edit as SQL",
  previewLabel: "Preview:",
  noFiltersApplied: "No filters applied",
  filterName: "Filter name",
  filterNamePlaceholder: "Type a name here",
  saveFilter: "Save filter",
  clearAll: "Clear all",
  applyFilter: "Apply filter",
  addFilterGroup: "Add filter group",
  removeGroup: "Remove group",
  dragToReorder: "Drag to reorder",
  selectValue: "Select...",
  enterValue: "Enter value...",
  unavailable: "Unavailable",
  and: "AND",
  or: "OR",
  operatorContains: "contains",
  operatorIs: "is",
  operatorIsNot: "is not",
  operatorEquals: "equals",
  operatorNotEquals: "not equals",
  operatorGreaterThan: "greater than",
  operatorLessThan: "less than",
  operatorGreaterThanOrEqual: "greater than or equal",
  operatorLessThanOrEqual: "less than or equal",
  operatorBefore: "before",
  operatorAfter: "after",
  removeGroupLabel: (e) => `Remove filter group ${e}`,
  addConditionLabel: (e, t) => `Add ${e} condition to group ${t}`,
  unavailableOperatorOption: (e) => `Unavailable operator: ${e}`,
  missingFieldReason: (e) => `Field "${e}" is no longer available. Select a supported field to repair this condition.`,
  disabledFieldReason: (e) => `Field "${e}" is unavailable.`,
  missingOperatorReason: (e, t) => `Operator "${e}" is not available for ${t}. Select a supported operator.`,
  missingValueReason: (e, t) => `Value "${e}" is no longer available for ${t}. Select a supported value.`,
  fieldControlLabel: (e, t) => `Group ${e} filter ${t} field`,
  operatorControlLabel: (e, t) => `Group ${e} filter ${t} operator`,
  valueControlLabel: (e, t) => `Group ${e} filter ${t} value`,
  removeConditionLabel: (e) => `Remove filter ${e}`,
  addLogicConditionLabel: (e) => `Add ${e} condition`,
  unavailableFieldOption: (e) => `Unavailable field: ${e}`,
  disabledFieldOption: (e, t) => `${e} — ${t}`,
  unavailableValueOption: (e) => `Unavailable value: ${e}`,
  groupConnectorLabel: (e, t) => `Logic between filter groups ${e} and ${t}`,
  unavailableFieldPreview: (e) => `Unavailable field (${e})`,
  unavailableValuePreview: (e) => `Unavailable value (${e})`,
  saveNameRequired: "Please enter a name for the filter",
  filterSaved: (e) => `Filter "${e}" saved!`,
  groupLimitReached: (e) => `The maximum of ${e} filter groups has been reached.`,
  conditionsPerGroupLimitReached: (e) => `The maximum of ${e} conditions in this group has been reached.`,
  totalConditionsLimitReached: (e) => `The maximum of ${e} total conditions has been reached.`,
  structureExceedsLimits: (e) => `This filter exceeds the editing limits: ${e.join(" ")}`
}, S = 0;
function C(e) {
  return e == null ? e : typeof structuredClone == "function" ? structuredClone(e) : JSON.parse(JSON.stringify(e));
}
function v(e) {
  return {
    groups: e.groups.map((t) => ({
      logic: t.logic,
      conditions: t.conditions.map((i) => ({
        field: i.field,
        operator: i.operator,
        value: C(i.value)
      }))
    })),
    groupLogic: [...e.groupLogic]
  };
}
function f(e) {
  return e ? typeof e != "string" ? e : document.querySelector(e) : null;
}
var E = class {
  constructor(e) {
    if (this.cleanupListeners = [], this.panel = null, this.root = null, this.container = null, this.previewElement = null, this.sqlPreviewElement = null, this.overlay = null, this.toggleButton = null, this.appliedPreviewContainer = null, this.ownsPanelID = !1, this.previousPanelInstance = null, this.previousToggleAriaControls = null, this.previousToggleAriaExpanded = null, this.destroyed = !1, !Array.isArray(e.fields) || e.fields.length === 0) throw new Error("[FilterBuilder] At least one field is required");
    this.config = e, this.mode = e.mode ?? "overlay", this.messages = {
      ...P,
      ...e.messages
    }, this.limits = this.resolveLimits(e.limits), this.chrome = this.resolveChrome(e.chrome), this.actions = this.resolveActions(e.actions), this.instanceID = `filter-builder-${++S}`, this.notifier = e.notifier || new A(), this.structure = e.initialStructure ? this.normalizeStructure(e.initialStructure) : this.createDefaultStructure(), this.init();
  }
  resolveChrome(e) {
    const t = this.mode === "overlay" ? {
      header: !0,
      title: this.messages.filtersTitle,
      savedFilters: !0,
      sqlPreview: !0
    } : {
      header: !1,
      title: this.messages.filtersTitle,
      savedFilters: !1,
      sqlPreview: !1
    };
    return e === void 0 ? t : typeof e == "boolean" ? {
      header: e,
      title: t.title,
      savedFilters: e,
      sqlPreview: e
    } : {
      ...t,
      ...e
    };
  }
  resolveActions(e) {
    const t = this.mode === "overlay" ? {
      apply: !0,
      clear: !0,
      save: !0
    } : {
      apply: !1,
      clear: !1,
      save: !1
    };
    return e === void 0 ? t : typeof e == "boolean" ? {
      apply: e,
      clear: e,
      save: e
    } : {
      ...t,
      ...e
    };
  }
  resolveLimits(e) {
    const t = (i, s) => {
      if (i === void 0) return Number.POSITIVE_INFINITY;
      if (!Number.isInteger(i) || i < 1) throw new Error(`[FilterBuilder] ${s} must be a positive integer`);
      return i;
    };
    return {
      maxGroups: t(e?.maxGroups, "maxGroups"),
      maxConditionsPerGroup: t(e?.maxConditionsPerGroup, "maxConditionsPerGroup"),
      maxTotalConditions: t(e?.maxTotalConditions, "maxTotalConditions")
    };
  }
  init() {
    if (this.previewElement = f(this.config.previewElement), this.mode === "compact") {
      if (this.panel = f(this.config.host), !this.panel) throw new Error("[FilterBuilder] Compact mode requires a valid host");
    } else {
      if (this.panel = f(this.config.host) || document.getElementById("filter-panel"), !this.panel) {
        w.error("[FilterBuilder] Panel element not found");
        return;
      }
      this.toggleButton = f(this.config.toggleButton) || document.getElementById("filter-toggle-btn"), this.overlay = f(this.config.overlay) || document.getElementById("filter-overlay"), this.previewElement || (this.previewElement = document.getElementById("filter-preview-text")), this.appliedPreviewContainer = document.getElementById("applied-filter-preview");
    }
    if (Array.from(this.panel.children).some((e) => e.hasAttribute("data-filter-builder-root"))) throw new Error("[FilterBuilder] Host already contains a mounted FilterBuilder");
    this.previousPanelInstance = this.panel.getAttribute("data-filter-builder-instance"), this.panel.dataset.filterBuilderInstance = this.instanceID, this.mode === "overlay" && !this.panel.id && (this.panel.id = this.instanceID, this.ownsPanelID = !0), this.toggleButton && (this.previousToggleAriaControls = this.toggleButton.getAttribute("aria-controls"), this.previousToggleAriaExpanded = this.toggleButton.getAttribute("aria-expanded")), this.buildPanelStructure(), this.bindOwnedListeners(), this.mode === "overlay" && !this.config.initialStructure && (this.config.restoreFromURL ?? !0) && this.restoreFromURL();
  }
  buildPanelStructure() {
    if (!this.panel) return;
    this.root = document.createElement("div"), this.root.dataset.filterBuilderRoot = this.instanceID, this.panel.appendChild(this.root);
    const e = this.chrome.header ? `
      <div class="flex items-center justify-between mb-4" data-filter-builder-header>
        <h3 id="${this.instanceID}-title" class="text-base font-semibold text-gray-900">${a(this.chrome.title)}</h3>
        ${this.chrome.savedFilters ? `
          <div class="flex gap-2">
            <button type="button" data-filter-builder-saved-menu class="text-sm text-blue-600 hover:text-blue-800">
              ${a(this.messages.savedFilters)} ▾
            </button>
            <button type="button" data-filter-builder-edit-sql class="text-sm text-blue-600 hover:text-blue-800">
              ${a(this.messages.editAsSQL)}
            </button>
          </div>
        ` : ""}
      </div>
    ` : "", t = this.chrome.sqlPreview ? `
      <div class="border-t border-gray-200 pt-3 mb-4" data-filter-builder-preview-region>
        <div class="text-xs text-gray-500 mb-1">${a(this.messages.previewLabel)}</div>
        <div data-filter-builder-sql-preview aria-live="polite" class="text-xs font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-200 min-h-[40px] max-h-[100px] overflow-y-auto break-words">
          ${a(this.messages.noFiltersApplied)}
        </div>
      </div>
    ` : "", i = this.actions.apply || this.actions.clear || this.actions.save ? `
      <div class="flex items-center justify-between border-t border-gray-200 pt-4" data-filter-builder-actions>
        <div class="flex gap-2">
          ${this.actions.save ? `
            <label class="sr-only" for="${this.instanceID}-save-name">${a(this.messages.filterName)}</label>
            <input type="text" id="${this.instanceID}-save-name" data-filter-builder-save-name placeholder="${a(this.messages.filterNamePlaceholder)}" class="text-sm border border-gray-200 rounded px-3 py-1.5 w-48">
            <button type="button" data-filter-builder-action="save" class="text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded px-3 py-1.5">
              ${a(this.messages.saveFilter)}
            </button>
          ` : ""}
        </div>
        <div class="flex gap-2">
          ${this.actions.clear ? `
            <button type="button" data-filter-builder-action="clear" class="text-sm text-gray-700 hover:text-gray-900 px-4 py-2">
              ${a(this.messages.clearAll)}
            </button>
          ` : ""}
          ${this.actions.apply ? `
            <button type="button" data-filter-builder-action="apply" class="text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2">
              ${a(this.messages.applyFilter)}
            </button>
          ` : ""}
        </div>
      </div>
    ` : "";
    this.root.innerHTML = `
      ${e}
      <div data-filter-builder-groups class="space-y-3 mb-4"></div>
      <p data-filter-builder-limit-status class="hidden mb-3 text-xs text-amber-700" role="status" aria-live="polite"></p>
      <button type="button" data-filter-builder-action="add-group" class="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 mb-4" aria-label="${a(this.messages.addFilterGroup)}">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
          <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
        </svg>
        ${a(this.messages.and)}
      </button>
      ${t}
      ${i}
    `, this.container = this.root.querySelector("[data-filter-builder-groups]"), this.sqlPreviewElement = this.root.querySelector("[data-filter-builder-sql-preview]"), this.render();
  }
  bindOwnedListeners() {
    if (!this.root || (this.listen(this.root, "click", (t) => this.handleClick(t)), this.listen(this.root, "change", (t) => this.handleChange(t)), this.listen(this.root, "input", (t) => this.handleInput(t)), this.mode !== "overlay")) return;
    this.toggleButton && this.listen(this.toggleButton, "click", () => this.toggle());
    const e = document.getElementById("clear-filters-btn");
    e && this.listen(e, "click", () => this.clearFilters()), this.overlay && this.listen(this.overlay, "click", () => this.close(!0)), this.listen(document, "keydown", (t) => {
      t.key === "Escape" && this.panel && !this.panel.classList.contains("hidden") && this.close(!0);
    });
  }
  listen(e, t, i) {
    e.addEventListener(t, i), this.cleanupListeners.push(() => e.removeEventListener(t, i));
  }
  handleClick(e) {
    if (this.destroyed) return;
    const t = e.target?.closest("[data-filter-builder-action]");
    if (!(!t || !this.root?.contains(t)))
      switch (t.dataset.filterBuilderAction) {
        case "add-group":
          this.addGroup();
          return;
        case "remove-group":
          this.removeGroup(Number(t.dataset.groupIndex));
          return;
        case "add-condition":
          this.addCondition(Number(t.dataset.groupIndex));
          return;
        case "add-condition-and":
          this.setGroupLogicAndAddCondition(Number(t.dataset.groupIndex), "and");
          return;
        case "add-condition-or":
          this.setGroupLogicAndAddCondition(Number(t.dataset.groupIndex), "or");
          return;
        case "remove-condition":
          this.removeCondition(Number(t.dataset.groupIndex), Number(t.dataset.conditionIndex));
          return;
        case "group-logic":
          this.setGroupConnector(Number(t.dataset.groupIndex), t.dataset.logicValue);
          return;
        case "apply":
          this.applyFilters();
          return;
        case "clear":
          this.clearAll(!0);
          return;
        case "save":
          this.saveFilter();
      }
  }
  handleChange(e) {
    if (this.destroyed) return;
    const t = e.target;
    if (!t?.dataset.filterBuilderPart) return;
    const i = Number(t.dataset.groupIndex), s = Number(t.dataset.conditionIndex), r = this.structure.groups[i]?.conditions[s];
    if (r)
      switch (t.dataset.filterBuilderPart) {
        case "field": {
          const o = this.getField(t.value);
          if (!o || o.disabled) return;
          r.field = t.value, r.operator = this.getOperatorsForField(o)[0]?.value ?? "eq", r.value = "", this.render(), this.focusConditionPart(i, s, "operator"), this.emitChange();
          return;
        }
        case "operator": {
          const o = this.getField(r.field);
          if (!o || o.disabled) return;
          const l = this.getOperatorsForField(o);
          if (!l.some((u) => u.value === t.value)) return;
          const n = l.some((u) => u.value === r.operator);
          r.operator = t.value, n ? this.updatePreview() : (this.render(), this.focusConditionPart(i, s, "value")), this.emitChange();
          return;
        }
        case "value":
          if (t.tagName === "INPUT") return;
          {
            const o = this.getField(r.field);
            if (!o || o.disabled || !this.getOperatorsForField(o).some((n) => n.value === r.operator)) return;
            const l = this.isValueAvailable(o, r.value);
            r.value = t.value, l ? this.updatePreview() : (this.render(), this.focusConditionPart(i, s, "value")), this.emitChange();
            return;
          }
      }
  }
  handleInput(e) {
    if (this.destroyed) return;
    const t = e.target;
    if (t?.dataset.filterBuilderPart !== "value" || t.tagName === "SELECT") return;
    const i = Number(t.dataset.groupIndex), s = Number(t.dataset.conditionIndex), r = this.structure.groups[i]?.conditions[s];
    if (!r) return;
    const o = this.getField(r.field);
    !o || o.disabled || !this.getOperatorsForField(o).some((l) => l.value === r.operator) || (r.value = t.value, this.updatePreview(), this.emitChange());
  }
  createDefaultStructure() {
    return {
      groups: [{
        conditions: [this.createEmptyCondition()],
        logic: "or"
      }],
      groupLogic: []
    };
  }
  normalizeStructure(e) {
    const t = v(e);
    for (t.groups = t.groups.filter((i) => Array.isArray(i.conditions) && i.conditions.length > 0), t.groups.forEach((i) => {
      i.logic = i.logic === "and" ? "and" : "or";
    }), t.groupLogic = t.groupLogic.slice(0, Math.max(0, t.groups.length - 1)).map((i) => i === "or" ? "or" : "and"); t.groupLogic.length < Math.max(0, t.groups.length - 1); ) t.groupLogic.push("and");
    return t.groups.length > 0 ? t : this.createDefaultStructure();
  }
  createEmptyCondition() {
    const e = this.config.fields.find((t) => !t.disabled) || this.config.fields[0];
    return {
      field: e.name,
      operator: this.getOperatorsForField(e)[0]?.value ?? "eq",
      value: ""
    };
  }
  totalConditions() {
    return this.structure.groups.reduce((e, t) => e + t.conditions.length, 0);
  }
  addGroupLimitReason() {
    return this.structure.groups.length >= this.limits.maxGroups ? this.messages.groupLimitReached(this.limits.maxGroups) : this.totalConditions() >= this.limits.maxTotalConditions ? this.messages.totalConditionsLimitReached(this.limits.maxTotalConditions) : "";
  }
  addConditionLimitReason(e) {
    const t = this.structure.groups[e];
    return t ? t.conditions.length >= this.limits.maxConditionsPerGroup ? this.messages.conditionsPerGroupLimitReached(this.limits.maxConditionsPerGroup) : this.totalConditions() >= this.limits.maxTotalConditions ? this.messages.totalConditionsLimitReached(this.limits.maxTotalConditions) : "" : "";
  }
  structureLimitReasons() {
    const e = [];
    return this.structure.groups.length > this.limits.maxGroups && e.push(this.messages.groupLimitReached(this.limits.maxGroups)), this.structure.groups.some((t) => t.conditions.length > this.limits.maxConditionsPerGroup) && e.push(this.messages.conditionsPerGroupLimitReached(this.limits.maxConditionsPerGroup)), this.totalConditions() > this.limits.maxTotalConditions && e.push(this.messages.totalConditionsLimitReached(this.limits.maxTotalConditions)), e;
  }
  updateLimitState() {
    if (!this.root) return;
    const e = this.root.querySelector("[data-filter-builder-limit-status]"), t = this.structureLimitReasons();
    e && (e.textContent = t.length > 0 ? this.messages.structureExceedsLimits(t) : "", e.classList.toggle("hidden", t.length === 0));
    const i = this.root.querySelector('[data-filter-builder-action="add-group"]'), s = this.addGroupLimitReason();
    i && (i.disabled = s !== "", s ? i.title = s : i.removeAttribute("title"));
  }
  render() {
    !this.container || this.destroyed || (this.container.innerHTML = this.structure.groups.map((e, t) => {
      const i = t < this.structure.groups.length - 1 ? this.renderGroupConnector(t) : "";
      return `${this.renderGroup(e, t)}${i}`;
    }).join(""), this.updateLimitState(), this.updatePreview());
  }
  renderGroup(e, t) {
    const i = this.addConditionLimitReason(t), s = i ? ` disabled title="${a(i)}"` : "", r = e.logic === "and" ? this.messages.and : this.messages.or, o = e.conditions.map((l, n) => {
      const u = n < e.conditions.length - 1 ? `<div class="flex items-center justify-center my-1" aria-hidden="true">
            <span class="text-xs font-medium text-gray-500 px-2 py-0.5 bg-white border border-gray-200 rounded">${a(r)}</span>
          </div>` : "";
      return `${this.renderCondition(l, t, n)}${u}`;
    }).join("");
    return `
      <div class="border border-gray-200 rounded-lg p-3 bg-gray-50" data-filter-builder-group="${t}">
        <div class="flex justify-end mb-2">
          <button type="button" data-filter-builder-action="remove-group" data-group-index="${t}" class="text-xs text-red-600 hover:text-red-800" aria-label="${a(this.messages.removeGroupLabel(t + 1))}">
            ${a(this.messages.removeGroup)}
          </button>
        </div>
        ${o}
        <button type="button" data-filter-builder-action="add-condition" data-group-index="${t}" class="mt-2 inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${a(this.messages.addConditionLabel(r, t + 1))}"${s}>
          <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14"/><path d="M5 12h14"/>
          </svg>
          ${a(r)}
        </button>
      </div>
    `;
  }
  renderCondition(e, t, i) {
    const s = this.getField(e.field), r = i + 1, o = this.renderFieldOptions(e.field), l = s ? this.getOperatorsForField(s) : [], n = l.some((m) => m.value === e.operator), u = `${n ? "" : `
      <option value="${a(e.operator)}" selected disabled>
        ${a(this.messages.unavailableOperatorOption(e.operator))}
      </option>
    `}${l.map((m) => `
      <option value="${a(m.value)}" ${m.value === e.operator ? "selected" : ""}>${a(m.label)}</option>
    `).join("")}`, d = s ? s.disabled ? s.disabledReason || this.messages.disabledFieldReason(s.label) : "" : this.messages.missingFieldReason(e.field), h = s && !n ? this.messages.missingOperatorReason(e.operator, s.label) : "", $ = s ? this.isValueAvailable(s, e.value) : !0, b = s && n && !s.disabled && !$ ? this.messages.missingValueReason(String(e.value), s.label) : "", p = d || h || b, g = `${this.instanceID}-group-${t + 1}-condition-${i + 1}-status`, c = p ? ` aria-describedby="${g}"` : "", y = s || {
      name: e.field,
      label: e.field,
      type: "text"
    }, x = !s || s.disabled || !n;
    return `
      <div class="flex flex-wrap items-center gap-2 mb-2" data-filter-builder-condition="${t}-${i}">
        <div class="flex items-center text-gray-400 cursor-move" title="${a(this.messages.dragToReorder)}" aria-hidden="true">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/>
            <circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>
          </svg>
        </div>
        <select data-filter-builder-part="field" data-group-index="${t}" data-condition-index="${i}" aria-label="${a(this.messages.fieldControlLabel(t + 1, r))}"${c} class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-32">
          ${o}
        </select>
        <select data-filter-builder-part="operator" data-group-index="${t}" data-condition-index="${i}" aria-label="${a(this.messages.operatorControlLabel(t + 1, r))}"${c} ${!s || s.disabled ? "disabled" : ""} class="py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white w-36">
          ${u}
        </select>
        ${this.renderValueInput(y, e, t, i, r, x, c)}
        <button type="button" data-filter-builder-action="remove-condition" data-group-index="${t}" data-condition-index="${i}" class="text-red-600 hover:text-red-800" aria-label="${a(this.messages.removeConditionLabel(r))}">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
        </button>
        <button type="button" data-filter-builder-action="add-condition-or" data-group-index="${t}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${a(this.messages.addLogicConditionLabel(this.messages.or))}"${this.addConditionLimitReason(t) ? ` disabled title="${a(this.addConditionLimitReason(t))}"` : ""}>
          ${a(this.messages.or)}
        </button>
        <button type="button" data-filter-builder-action="add-condition-and" data-group-index="${t}" class="px-2 py-1 text-xs border border-blue-600 text-blue-600 rounded hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50" aria-label="${a(this.messages.addLogicConditionLabel(this.messages.and))}"${this.addConditionLimitReason(t) ? ` disabled title="${a(this.addConditionLimitReason(t))}"` : ""}>
          ${a(this.messages.and)}
        </button>
        ${p ? `
          <p id="${g}" data-filter-builder-field-status class="w-full text-xs text-amber-700" role="note">
            ${a(p)}
          </p>
        ` : ""}
      </div>
    `;
  }
  renderFieldOptions(e) {
    let t = "", i = "";
    this.getField(e) || (i += `
        <option value="${a(e)}" selected disabled>
          ${a(this.messages.unavailableFieldOption(e))}
        </option>
      `);
    for (const s of this.config.fields) {
      const r = s.group?.trim() || "";
      r !== t && (t && (i += "</optgroup>"), r && (i += `<optgroup label="${a(r)}">`), t = r);
      const o = s.disabled ? this.messages.disabledFieldOption(s.label, s.disabledReason || this.messages.unavailable) : s.label;
      i += `
        <option value="${a(s.name)}" ${s.name === e ? "selected" : ""} ${s.disabled ? "disabled" : ""}>
          ${a(o)}
        </option>
      `;
    }
    return t && (i += "</optgroup>"), i;
  }
  renderValueInput(e, t, i, s, r, o, l) {
    const n = `data-filter-builder-part="value" data-group-index="${i}" data-condition-index="${s}" aria-label="${a(this.messages.valueControlLabel(i + 1, r))}"${l} ${o ? "disabled" : ""}`;
    if (e.type === "select") {
      const u = this.isValueAvailable(e, t.value) ? "" : `
        <option value="${a(t.value)}" selected disabled>${a(this.messages.unavailableValueOption(String(t.value)))}</option>
      `, d = (e.options || []).map((h) => `
        <option value="${a(h.value)}" ${String(h.value) === String(t.value) ? "selected" : ""}>${a(h.label)}</option>
      `).join("");
      return `
        <select ${n} class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg bg-white">
          <option value="">${a(this.messages.selectValue)}</option>
          ${u}
          ${d}
        </select>
      `;
    }
    return `
      <input type="${e.type === "date" ? "date" : e.type === "number" ? "number" : "text"}" ${n} value="${a(t.value)}" placeholder="${a(this.messages.enterValue)}" class="flex-1 min-w-[200px] py-1.5 px-2 text-sm border-gray-200 rounded-lg">
    `;
  }
  isValueAvailable(e, t) {
    return e.type !== "select" || t === "" || t === null || t === void 0 ? !0 : (e.options || []).some((i) => String(i.value) === String(t));
  }
  renderGroupConnector(e) {
    const t = this.structure.groupLogic[e] || "and";
    return `
      <div class="flex items-center justify-center py-2" role="group" aria-label="${a(this.messages.groupConnectorLabel(e + 1, e + 2))}">
        <button type="button" data-filter-builder-action="group-logic" data-group-index="${e}" data-logic-value="and" aria-pressed="${t === "and"}" class="px-3 py-1 text-xs font-medium rounded-l border ${t === "and" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
          ${a(this.messages.and)}
        </button>
        <button type="button" data-filter-builder-action="group-logic" data-group-index="${e}" data-logic-value="or" aria-pressed="${t === "or"}" class="px-3 py-1 text-xs font-medium rounded-r border ${t === "or" ? "bg-green-600 text-white border-green-600" : "bg-gray-200 text-gray-800 border-gray-300 hover:bg-gray-300"}">
          ${a(this.messages.or)}
        </button>
      </div>
    `;
  }
  addGroup() {
    this.addGroupLimitReason() || (this.structure.groups.push({
      conditions: [this.createEmptyCondition()],
      logic: "or"
    }), this.structure.groups.length > 1 && this.structure.groupLogic.push("and"), this.render(), this.focusConditionPart(this.structure.groups.length - 1, 0, "field"), this.emitChange());
  }
  addCondition(e) {
    const t = this.structure.groups[e];
    !t || this.addConditionLimitReason(e) || (t.conditions.push(this.createEmptyCondition()), this.render(), this.focusConditionPart(e, t.conditions.length - 1, "field"), this.emitChange());
  }
  setGroupLogicAndAddCondition(e, t) {
    const i = this.structure.groups[e];
    !i || this.addConditionLimitReason(e) || (i.logic = t, i.conditions.push(this.createEmptyCondition()), this.render(), this.focusConditionPart(e, i.conditions.length - 1, "field"), this.emitChange());
  }
  removeCondition(e, t) {
    const i = this.structure.groups[e];
    if (i) {
      if (i.conditions.splice(t, 1), i.conditions.length === 0) {
        this.removeGroup(e);
        return;
      }
      this.render(), this.focusConditionPart(e, Math.min(t, i.conditions.length - 1), "field"), this.emitChange();
    }
  }
  removeGroup(e) {
    this.structure.groups[e] && (this.structure.groups.splice(e, 1), e < this.structure.groupLogic.length ? this.structure.groupLogic.splice(e, 1) : e > 0 && this.structure.groupLogic.splice(e - 1, 1), this.structure.groups.length === 0 && (this.structure = this.createDefaultStructure()), this.render(), this.focusConditionPart(Math.min(e, this.structure.groups.length - 1), 0, "field"), this.emitChange());
  }
  setGroupConnector(e, t) {
    t !== "and" && t !== "or" || !this.structure.groupLogic[e] || (this.structure.groupLogic[e] = t, this.render(), this.root?.querySelector(`[data-filter-builder-action="group-logic"][data-group-index="${e}"][data-logic-value="${t}"]`)?.focus(), this.emitChange());
  }
  focusConditionPart(e, t, i) {
    this.root?.querySelector(`[data-filter-builder-part="${i}"][data-group-index="${e}"][data-condition-index="${t}"]`)?.focus();
  }
  getField(e) {
    return this.config.fields.find((t) => t.name === e);
  }
  getOperatorsForField(e) {
    if (e.operators && e.operators.length > 0) return e.operators.map((i) => typeof i == "string" ? {
      label: i,
      value: i
    } : i);
    const t = {
      text: [
        {
          label: this.messages.operatorContains,
          value: "ilike"
        },
        {
          label: this.messages.operatorIs,
          value: "eq"
        },
        {
          label: this.messages.operatorIsNot,
          value: "ne"
        }
      ],
      number: [
        {
          label: this.messages.operatorEquals,
          value: "eq"
        },
        {
          label: this.messages.operatorNotEquals,
          value: "ne"
        },
        {
          label: this.messages.operatorGreaterThan,
          value: "gt"
        },
        {
          label: this.messages.operatorLessThan,
          value: "lt"
        },
        {
          label: this.messages.operatorGreaterThanOrEqual,
          value: "gte"
        },
        {
          label: this.messages.operatorLessThanOrEqual,
          value: "lte"
        }
      ],
      date: [
        {
          label: this.messages.operatorIs,
          value: "eq"
        },
        {
          label: this.messages.operatorBefore,
          value: "lt"
        },
        {
          label: this.messages.operatorAfter,
          value: "gt"
        }
      ],
      select: [{
        label: this.messages.operatorIs,
        value: "eq"
      }, {
        label: this.messages.operatorIsNot,
        value: "ne"
      }]
    };
    return t[e.type] || t.text;
  }
  updatePreview() {
    const e = this.generateSQLPreview(), t = this.generateTextPreview();
    this.sqlPreviewElement && (this.sqlPreviewElement.textContent = e || this.messages.noFiltersApplied), this.previewElement && (this.previewElement.textContent = t), this.appliedPreviewContainer && this.appliedPreviewContainer.classList.toggle("hidden", !this.hasActiveFilters());
  }
  hasActiveFilters() {
    return this.structure.groups.some((e) => e.conditions.some((t) => t.value !== "" && t.value !== null && t.value !== void 0));
  }
  generateSQLPreview() {
    const e = this.structure.groups.map((t, i) => {
      const s = t.conditions.filter((r) => r.value !== "" && r.value !== null && r.value !== void 0).map((r) => {
        const o = r.operator.toUpperCase(), l = typeof r.value == "string" ? `'${r.value}'` : r.value;
        return `${r.field} ${o === "ILIKE" ? "ILIKE" : o === "EQ" ? "=" : o} ${l}`;
      });
      return s.length === 0 ? null : {
        groupIndex: i,
        text: s.length === 1 ? s[0] : `( ${s.join(` ${t.logic.toUpperCase()} `)} )`
      };
    }).filter((t) => t !== null);
    return this.joinGroups(e);
  }
  generateTextPreview() {
    const e = this.structure.groups.map((t, i) => {
      const s = t.conditions.filter((r) => r.value !== "" && r.value !== null && r.value !== void 0).map((r) => {
        const o = this.getField(r.field), l = o ? this.getOperatorsForField(o).find((d) => d.value === r.operator) : void 0, n = o?.label || this.messages.unavailableFieldPreview(r.field), u = o && !this.isValueAvailable(o, r.value) ? this.messages.unavailableValuePreview(String(r.value)) : String(r.value);
        return `${n} ${l?.label || r.operator} "${u}"`;
      });
      return s.length === 0 ? null : {
        groupIndex: i,
        text: s.length === 1 ? s[0] : `( ${s.join(` ${t.logic === "and" ? this.messages.and : this.messages.or} `)} )`
      };
    }).filter((t) => t !== null);
    return this.joinGroups(e, !0);
  }
  joinGroups(e, t = !1) {
    return e.length < 2 ? e[0]?.text || "" : e.reduce((i, s, r) => {
      if (r === 0) return s.text;
      const o = Math.max(0, s.groupIndex - 1), l = this.structure.groupLogic[o] || "and";
      return `${i} ${t ? l === "and" ? this.messages.and : this.messages.or : l.toUpperCase()} ${s.text}`;
    }, "");
  }
  emitChange() {
    this.config.onChange?.(v(this.structure));
  }
  applyFilters() {
    this.config.onApply?.(v(this.structure)), this.mode === "overlay" && this.close(!0);
  }
  clearAll(e) {
    this.structure = this.createDefaultStructure(), this.render(), this.focusConditionPart(0, 0, "field"), e && this.emitChange();
  }
  clearFilters() {
    this.clearAll(!0), this.config.onClear?.();
  }
  saveFilter() {
    const e = this.root?.querySelector("[data-filter-builder-save-name]"), t = e?.value.trim();
    if (!t) {
      this.notifier.warning(this.messages.saveNameRequired);
      return;
    }
    const i = this.getSavedFilters();
    i[t] = v(this.structure), localStorage.setItem("saved_filters", JSON.stringify(i)), this.notifier.success(this.messages.filterSaved(t)), e && (e.value = "");
  }
  getSavedFilters() {
    try {
      const e = localStorage.getItem("saved_filters");
      return e ? JSON.parse(e) : {};
    } catch {
      return {};
    }
  }
  toggle() {
    this.panel?.classList.contains("hidden") ? this.open() : this.close(!0);
  }
  open() {
    if (this.mode !== "overlay" || !this.panel || !this.toggleButton || this.destroyed) return;
    const e = 8, t = window.visualViewport, i = t?.offsetLeft ?? 0, s = t?.offsetTop ?? 0, r = t?.width ?? window.innerWidth, o = t?.height ?? window.innerHeight, l = i + r, n = s + o, u = this.toggleButton.getBoundingClientRect();
    this.panel.classList.remove("hidden"), this.panel.style.visibility = "hidden";
    const d = this.panel.getBoundingClientRect(), h = Math.max(0, r - 16), $ = Math.min(d.width || 800, h), b = d.height || this.panel.scrollHeight, p = Math.min(Math.max(u.left, i + e), Math.max(i + e, l - e - $)), g = u.bottom + e, c = n - e - g, y = u.top - e - s, x = b > c && y > c ? Math.max(s + e, u.top - e - Math.min(b, y)) : Math.max(s + e, g);
    this.panel.style.left = `${p}px`, this.panel.style.top = `${x}px`, this.panel.style.maxWidth = `${h}px`, this.panel.style.maxHeight = `${Math.max(0, n - e - x)}px`, this.panel.style.visibility = "", this.toggleButton.setAttribute("aria-expanded", "true"), this.toggleButton.setAttribute("aria-controls", this.panel.id || this.instanceID), this.overlay?.classList.remove("hidden"), this.root?.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])')?.focus();
  }
  close(e = !1) {
    this.mode === "overlay" && (this.panel?.classList.add("hidden"), this.overlay?.classList.add("hidden"), this.toggleButton?.setAttribute("aria-expanded", "false"), e && this.toggleButton?.focus());
  }
  restoreFromURL() {
    const e = new URLSearchParams(window.location.search).get("filters");
    if (e)
      try {
        const t = JSON.parse(e);
        Array.isArray(t) && t.length > 0 ? (this.structure = this.normalizeStructure(this.convertLegacyFilters(t)), this.render()) : t && Array.isArray(t.groups) && Array.isArray(t.groupLogic) && (this.structure = this.normalizeStructure(t), this.render());
      } catch (t) {
        w.warn("[FilterBuilder] Failed to parse filters from URL:", t);
      }
  }
  convertLegacyFilters(e) {
    const t = /* @__PURE__ */ new Map();
    e.forEach((s) => {
      const r = t.get(s.column) || [];
      r.push(s), t.set(s.column, r);
    });
    const i = [];
    return t.forEach((s) => {
      i.push({
        conditions: s.map((r) => ({
          field: r.column,
          operator: r.operator || "ilike",
          value: C(r.value)
        })),
        logic: s.length > 1 ? "or" : "and"
      });
    }), {
      groups: i,
      groupLogic: new Array(Math.max(0, i.length - 1)).fill("and")
    };
  }
  getStructure() {
    return v(this.structure);
  }
  setStructure(e, t = !0) {
    this.destroyed || (this.structure = this.normalizeStructure(e), this.render(), t && this.emitChange());
  }
  destroy() {
    if (!this.destroyed) {
      for (this.close(!1), this.destroyed = !0; this.cleanupListeners.length > 0; ) this.cleanupListeners.pop()?.();
      this.root?.remove(), this.panel && (this.previousPanelInstance === null ? this.panel.removeAttribute("data-filter-builder-instance") : this.panel.setAttribute("data-filter-builder-instance", this.previousPanelInstance), this.ownsPanelID && this.panel.removeAttribute("id")), this.toggleButton && (this.previousToggleAriaControls === null ? this.toggleButton.removeAttribute("aria-controls") : this.toggleButton.setAttribute("aria-controls", this.previousToggleAriaControls), this.previousToggleAriaExpanded === null ? this.toggleButton.removeAttribute("aria-expanded") : this.toggleButton.setAttribute("aria-expanded", this.previousToggleAriaExpanded)), this.root = null, this.container = null, this.sqlPreviewElement = null, this.previewElement = null, this.appliedPreviewContainer = null, this.overlay = null, this.toggleButton = null, this.panel = null;
    }
  }
};
export {
  q as n,
  E as t
};

//# sourceMappingURL=filter-builder-DvTfRDsa.js.map