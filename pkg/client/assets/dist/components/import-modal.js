import { createLogger as f } from "../shared/logger.js";
import { escapeHTML as l } from "../shared/html.js";
import { r as b, t as h } from "../chunks/modal-ClEsOn-S.js";
import { formatByteSize as g } from "../shared/size-formatters.js";
var w = class extends Error {
  constructor(t, e = "unknown") {
    super(t), this.name = "ImportTransportError", this.outcome = e;
  }
}, c = {
  title: "Bulk import",
  description: "Choose a source, review the result, and apply only when the preview is eligible.",
  close: "Close bulk import",
  maximize: "Maximize report",
  restore: "Restore report size",
  preview: "Preview",
  apply: "Apply import",
  submit: "Import",
  retry: "Retry",
  importAnother: "Import another",
  idleStatus: "Choose an import source to begin.",
  selectedStatus: "Ready to continue.",
  previewingStatus: "Preparing preview…",
  applyingStatus: "Applying import…",
  completeStatus: "Import completed.",
  completionError: "Import completed, but the page could not refresh.",
  confirmApply: "Apply this import using the reviewed preview?",
  noRows: "No row details were returned.",
  sourceTabsLabel: "Import source",
  modeLabel: "Import mode",
  samplesLabel: "Import samples",
  reportFiltersLabel: "Filter import rows",
  allRows: "All",
  reportBounds: "Showing {visible} of {returned} returned rows ({total} total).",
  reportTruncated: "Details are truncated.",
  reportAggregate: "This source reports bounded totals only.",
  runDetailsLabel: "Run details",
  partialResult: "Partial result",
  replayedResult: "Idempotent replay",
  inputRequired: "Provide valid import input first.",
  previewReady: "Preview ready. Review the report before applying.",
  previewIneligible: "This preview cannot be applied.",
  reconcileRequired: "Reconcile the current import attempt before starting another.",
  unknownOutcome: "The apply outcome is unknown or retryable. Retrying will reuse the same attempt.",
  importFailed: "Import failed.",
  unavailableSource: "This import source is unavailable.",
  discardTitle: "Discard current import?",
  discardSourceChange: "Switching sources will discard the selected input and current preview.",
  discardOnClose: "Closing will discard the selected input and current preview.",
  discard: "Discard and continue",
  cancel: "Cancel",
  dismiss: "Close",
  change: "Change",
  summaryBounds: "{total} records",
  busyDismissBlocked: "An import is in progress. Wait for it to finish before closing."
}, v = {
  browse: "Choose a file or drag and drop it here",
  guidance: "Select a supported import file.",
  remove: "Remove selected file",
  replace: "Change file",
  acceptedTypes: "Accepts {types} files.",
  invalid: "The selected file is not supported.",
  tooLarge: "The selected file exceeds the client-visible size limit.",
  samplesLabel: "Import samples"
}, S = f("BulkImportModal"), C = 0;
function y(t) {
  return g(t, {
    zeroFallback: "0 Bytes",
    invalidFallback: "0 Bytes",
    unitLabels: [
      "Bytes",
      "KB",
      "MB",
      "GB"
    ],
    precisionByUnit: [
      0,
      2,
      2,
      2
    ],
    trimTrailingZeros: !0
  });
}
function k(t, e) {
  const i = e.split(",").map((o) => o.trim().toLowerCase()).filter(Boolean);
  if (i.length === 0) return !0;
  const s = t.name.toLowerCase(), r = t.type.toLowerCase();
  return i.some((o) => o.startsWith(".") ? s.endsWith(o) : o.endsWith("/*") ? r.startsWith(o.slice(0, -1)) : r === o);
}
function d(t, e, i) {
  return t.addEventListener(e, i), () => t.removeEventListener(e, i);
}
function m(t, e) {
  return Object.entries(e).reduce((i, [s, r]) => i.split(`{${s}}`).join(String(r)), t);
}
var _ = class {
  constructor(t) {
    this.cleanup = [], this.input = null, this.selected = null, this.dragDepth = 0, this.disabled = !1, this.options = t, this.copy = {
      ...v,
      ...t.copy
    }, this.render(), this.bind();
  }
  get file() {
    return this.selected;
  }
  setFile(t, e = !0) {
    return t && this.options.maxBytes && t.size > this.options.maxBytes ? (this.options.onInvalid?.(this.copy.tooLarge), !1) : t && this.options.accept && !k(t, this.options.accept) ? (this.options.onInvalid?.(this.copy.invalid), !1) : (this.selected = t, this.update(), e && this.options.onChange?.(t), !0);
  }
  reset() {
    this.input && (this.input.value = ""), this.setFile(null);
  }
  setDisabled(t) {
    this.disabled = t, this.input && (this.input.disabled = t), this.options.root.setAttribute("aria-disabled", String(t)), this.options.root.querySelectorAll("button").forEach((e) => {
      e.disabled = t;
    }), this.options.root.querySelectorAll(".go-admin-import__sample").forEach((e) => {
      e.setAttribute("aria-disabled", String(t)), t ? e.setAttribute("tabindex", "-1") : e.removeAttribute("tabindex");
    });
  }
  destroy() {
    this.cleanup.splice(0).forEach((t) => t()), this.selected = null, this.input = null, this.dragDepth = 0, this.options.root.removeAttribute("data-drag-active");
  }
  render() {
    const t = this.options.guidance || this.copy.guidance, e = (this.options.samples || []).map((s) => `<a class="go-admin-import__sample" href="${l(s.href)}">${l(s.label)}</a>`).join(""), i = this.acceptedTypesHint();
    this.options.root.innerHTML = `
      <div class="go-admin-import__dropzone" data-import-dropzone>
        <input data-import-file type="file" class="go-admin-import__file-input" accept="${l(this.options.accept || "")}">
        <div class="go-admin-import__chooser" data-import-empty>
          <span class="go-admin-import__chooser-icon" data-import-icon="upload" aria-hidden="true"></span>
          <button type="button" class="go-admin-import__action" data-import-browse data-import-priority="secondary">${l(this.copy.browse)}</button>
          <span class="go-admin-import__chooser-guidance">${l(t)}</span>
          ${i ? `<span class="go-admin-import__chooser-types">${l(i)}</span>` : ""}
        </div>
        <div class="go-admin-import__file-card" data-import-selected hidden>
          <span class="go-admin-import__chooser-icon" data-import-icon="file" aria-hidden="true"></span>
          <span class="go-admin-import__file-meta">
            <strong data-import-file-name dir="auto"></strong>
            <span data-import-file-size></span>
          </span>
          <button type="button" class="go-admin-import__action" data-import-replace data-import-priority="ghost">${l(this.copy.replace)}</button>
          <button type="button" class="go-admin-import__icon-action" data-import-remove aria-label="${l(this.copy.remove)}" title="${l(this.copy.remove)}">
            <span class="go-admin-import__action-icon" data-import-icon="close" aria-hidden="true"></span>
          </button>
        </div>
      </div>
      ${e ? `<nav class="go-admin-import__samples" aria-label="${l(this.copy.samplesLabel)}">${e}</nav>` : ""}
    `, this.input = this.options.root.querySelector("[data-import-file]"), this.options.root.dataset.importState = "empty";
  }
  acceptedTypesHint() {
    const t = (this.options.accept || "").split(",").map((e) => e.trim()).filter((e) => e.startsWith(".")).map((e) => e.slice(1).toUpperCase());
    return t.length ? m(this.copy.acceptedTypes, { types: [...new Set(t)].join(", ") }) : "";
  }
  bind() {
    const t = this.options.root.querySelector("[data-import-dropzone]"), e = this.options.root.querySelector("[data-import-remove]");
    if (!(!t || !this.input)) {
      this.cleanup.push(d(this.input, "change", () => {
        this.setFile(this.input?.files?.[0] || null);
      }));
      for (const i of ["[data-import-browse]", "[data-import-replace]"]) {
        const s = this.options.root.querySelector(i);
        s && this.cleanup.push(d(s, "click", (r) => {
          r.preventDefault(), r.stopPropagation(), this.disabled || this.input?.click();
        }));
      }
      for (const i of ["dragenter", "dragover"]) this.cleanup.push(d(t, i, (s) => {
        s.preventDefault(), !this.disabled && (i === "dragenter" && (this.dragDepth += 1), this.options.root.setAttribute("data-drag-active", "true"));
      }));
      this.cleanup.push(d(t, "dragleave", (i) => {
        i.preventDefault(), this.dragDepth = Math.max(0, this.dragDepth - 1), this.dragDepth === 0 && this.options.root.removeAttribute("data-drag-active");
      })), this.cleanup.push(d(t, "drop", (i) => {
        const s = i;
        s.preventDefault(), this.dragDepth = 0, this.options.root.removeAttribute("data-drag-active"), this.disabled || this.setFile(s.dataTransfer?.files?.[0] || null);
      })), e && this.cleanup.push(d(e, "click", (i) => {
        i.preventDefault(), i.stopPropagation(), this.disabled || this.reset();
      }));
    }
  }
  update() {
    const t = this.options.root.querySelector("[data-import-empty]"), e = this.options.root.querySelector("[data-import-selected]"), i = this.options.root.querySelector("[data-import-file-name]"), s = this.options.root.querySelector("[data-import-file-size]");
    t && (t.hidden = !!this.selected), e && (e.hidden = !this.selected), this.options.root.dataset.importState = this.selected ? "selected" : "empty", i && (i.textContent = this.selected?.name || ""), s && (s.textContent = this.selected ? y(this.selected.size) : "");
  }
};
function A(t, e, i = {}) {
  if (e.value) return e.value(t);
  switch (e.key) {
    case "reference":
      return t.reference;
    case "outcome":
      return i[t.outcome] ?? t.outcome;
    case "action":
      return t.action ? i[t.action] ?? t.action : "";
    case "fields":
      return (t.fields || []).join(", ");
    case "codes":
      return (t.codes || []).join(", ");
    case "message":
      return t.message || "";
    default:
      return t.metadata?.[e.key] ?? "";
  }
}
function x(t, e) {
  return e.predicate ? !!e.predicate(t) : !(e.outcome && t.outcome !== e.outcome || e.action && t.action !== e.action || e.code && !(t.codes || []).includes(e.code));
}
var I = Object.freeze([
  {
    key: "reference",
    label: "Row",
    priority: "primary"
  },
  {
    key: "outcome",
    label: "Outcome",
    priority: "primary"
  },
  {
    key: "action",
    label: "Action",
    priority: "secondary"
  },
  {
    key: "message",
    label: "Details",
    priority: "secondary"
  }
]), E = class {
  constructor(t, e = {}) {
    this.presentation = {}, this.report = null, this.activeFilter = "all", this.root = t, this.fallbackColumns = e.columns || I, this.fallbackFilters = e.filters || [], this.presentation = e.presentation || {}, this.noRows = e.noRows || c.noRows, this.copy = {
      reportFiltersLabel: c.reportFiltersLabel,
      allRows: c.allRows,
      reportBounds: c.reportBounds,
      reportTruncated: c.reportTruncated,
      reportAggregate: c.reportAggregate,
      runDetailsLabel: c.runDetailsLabel,
      partialResult: c.partialResult,
      replayedResult: c.replayedResult,
      ...e.copy
    };
  }
  setPresentation(t = {}) {
    this.presentation = t, this.activeFilter = "all", this.report && this.draw();
  }
  get columns() {
    return this.presentation.columns?.length ? this.presentation.columns : this.fallbackColumns;
  }
  get filters() {
    return this.presentation.filters?.length ? this.presentation.filters : this.fallbackFilters;
  }
  render(t) {
    const e = Array.isArray(t.rows) ? t.rows.slice() : [], i = t.detailMode === "aggregate", s = Number(t.bounds?.totalRows) || 0;
    i && e.length > 0 && S.warn("aggregate report declared with row detail; row detail is not rendered", {
      mode: t.mode,
      phase: t.phase,
      returnedRows: e.length
    });
    const r = i ? s : Math.max(e.length, s);
    this.report = {
      ...t,
      detailMode: i ? "aggregate" : "rows",
      metrics: Array.isArray(t.metrics) ? t.metrics.slice() : [],
      rows: i ? [] : e,
      bounds: {
        returnedRows: i ? 0 : e.length,
        totalRows: r,
        truncated: i ? !1 : !!(t.bounds?.truncated || r > e.length),
        continuation: t.bounds?.continuation
      }
    }, this.activeFilter = "all", this.draw();
  }
  clear() {
    this.report = null, this.root.replaceChildren();
  }
  draw() {
    const t = this.report;
    if (!t) return;
    if (this.root.replaceChildren(), this.root.setAttribute("data-phase", t.phase), this.root.dataset.detailMode = t.detailMode || "rows", this.root.appendChild(this.buildMetrics(t)), t.detailMode === "aggregate") {
      const a = document.createElement("p");
      a.className = "go-admin-import__aggregate", a.textContent = this.presentation.emptyState || this.copy.reportAggregate, this.root.appendChild(a), this.drawRunDetails(t);
      return;
    }
    const e = this.availableFilters(t);
    e.length > 1 && this.root.appendChild(this.buildFilters(e));
    const i = e.find((a) => a.key === this.activeFilter), s = i && i.key !== "all" ? t.rows.filter((a) => x(a, i)) : t.rows, r = document.createElement("p");
    r.className = "go-admin-import__bounds", r.textContent = [m(this.copy.reportBounds, {
      visible: s.length,
      returned: t.bounds.returnedRows,
      total: t.bounds.totalRows
    }), t.bounds.truncated ? this.copy.reportTruncated : ""].filter(Boolean).join(" "), this.root.appendChild(r);
    const o = document.createElement("div");
    o.className = "go-admin-import__report-scroll", o.tabIndex = 0, o.appendChild(this.buildTable(s)), this.root.appendChild(o), this.drawRunDetails(t);
  }
  buildMetrics(t) {
    const e = document.createElement("div");
    e.className = "go-admin-import__metrics";
    for (const i of t.metrics) {
      const s = document.createElement(i.filter ? "button" : "div");
      if (s.className = "go-admin-import__metric", s.dataset.tone = i.tone || "neutral", s.append(Object.assign(document.createElement("strong"), { textContent: String(i.value) })), s.append(Object.assign(document.createElement("span"), { textContent: i.label })), i.filter) {
        const r = s;
        r.type = "button", r.setAttribute("aria-pressed", String(i.filter.key === this.activeFilter)), r.addEventListener("click", () => {
          this.activeFilter = i.filter.key, this.draw();
        });
      }
      e.appendChild(s);
    }
    return e;
  }
  availableFilters(t) {
    return [
      {
        key: "all",
        label: this.copy.allRows
      },
      ...this.filters,
      ...t.metrics.flatMap((e) => e.filter ? [e.filter] : [])
    ].filter((e, i, s) => s.findIndex((r) => r.key === e.key) === i);
  }
  buildFilters(t) {
    const e = document.createElement("div");
    e.className = "go-admin-import__filters", e.setAttribute("role", "toolbar"), e.setAttribute("aria-label", this.copy.reportFiltersLabel);
    for (const i of t) {
      const s = document.createElement("button");
      s.type = "button", s.textContent = i.label;
      const r = i.key === this.activeFilter;
      s.dataset.active = String(r), s.setAttribute("aria-pressed", String(r)), s.addEventListener("click", () => {
        this.activeFilter = i.key, this.draw();
      }), e.appendChild(s);
    }
    return e;
  }
  buildTable(t) {
    const e = this.columns, i = document.createElement("table");
    i.className = "go-admin-import__report-table";
    const s = document.createElement("thead"), r = document.createElement("tr");
    for (const a of e) {
      const n = document.createElement("th");
      n.scope = "col", n.textContent = a.label, n.dataset.column = a.key, n.dataset.priority = a.priority || "primary", r.appendChild(n);
    }
    s.appendChild(r), i.appendChild(s);
    const o = document.createElement("tbody");
    if (t.length === 0) {
      const a = document.createElement("tr"), n = document.createElement("td");
      n.colSpan = Math.max(1, e.length), n.textContent = this.presentation.emptyState || this.noRows, a.appendChild(n), o.appendChild(a);
    } else for (const a of t) o.appendChild(this.buildRow(a, e));
    return i.appendChild(o), i;
  }
  buildRow(t, e) {
    const i = this.presentation.outcomeLabels || {}, s = this.presentation.outcomeTones || {}, r = document.createElement("tr");
    r.dataset.outcome = t.outcome || "unknown", r.dataset.action = t.action || "";
    for (const o of e) {
      const a = document.createElement("td");
      a.dataset.column = o.key, a.dataset.priority = o.priority || "primary";
      const n = A(t, o, i), p = n === null ? "" : String(n);
      if ((o.key === "outcome" || o.key === "action") && p) {
        const u = document.createElement("span");
        u.className = "go-admin-import__outcome", u.dataset.tone = s[o.key === "outcome" ? t.outcome : t.action || ""] || "neutral", u.textContent = p, a.appendChild(u);
      } else a.textContent = p;
      r.appendChild(a);
    }
    return r;
  }
  drawRunDetails(t) {
    const e = this.presentation.runFields || [];
    if (!e.length || !t.run) return;
    const i = e.map((r) => ({
      field: r,
      value: t.run?.[r.key]
    })).filter(({ value: r }) => r != null && r !== "");
    if (!i.length) return;
    const s = document.createElement("dl");
    s.className = "go-admin-import__run", s.dataset.importRun = "true", s.setAttribute("aria-label", this.copy.runDetailsLabel);
    for (const { field: r, value: o } of i) {
      const a = document.createElement("dt");
      a.textContent = r.label, a.dataset.runField = r.key;
      const n = document.createElement("dd"), p = r.format ? r.format(o) : o;
      n.textContent = p === null ? "" : String(p), s.append(a, n);
    }
    this.root.appendChild(s);
  }
};
function M() {
  const t = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return Object.freeze({
    attemptId: t,
    idempotencyKey: t
  });
}
var q = class extends b {
  constructor(t) {
    if (!t.root || t.sources.length === 0) throw new Error("BulkImportModal requires a root and at least one source.");
    super({
      size: "4xl",
      ariaLabel: t.copy?.title || c.title,
      initialFocus: t.sources.length > 1 ? "[data-import-source-tab]" : "[data-import-browse], [data-import-input] button, [data-import-input] input, [data-import-input] select, [data-import-primary]",
      maximizable: !0,
      containerClass: "go-admin-import"
    }), this.instanceID = `go-admin-bulk-import-${++C}`, this.workflowState = "idle", this.sourceIndex = 0, this.currentInput = null, this.previewState = null, this.eligibility = { allowed: !1 }, this.attempt = null, this.attemptTerminal = !0, this.report = null, this.response = null, this.aborter = null, this.dropzone = null, this.panelCleanup = null, this.reportView = null, this.busy = !1, this.closeAuthorized = !1, this.closePending = !1, this.sourceTransitionPending = !1, this.sourceTransitionGeneration = 0, this.config = t, this.copy = {
      ...c,
      ...t.copy
    }, this.sourceIndex = Math.max(0, t.sources.findIndex((e) => e.available !== !1)), this.selectedMode = this.resolveModes(this.source)[0];
  }
  get state() {
    return this.workflowState;
  }
  get activeAttempt() {
    return this.attempt;
  }
  get isFullscreen() {
    return this.isMaximized;
  }
  open() {
    this.show();
  }
  close() {
    this.hide();
  }
  toggleFullscreen() {
    const t = this.container?.querySelector("[data-import-maximize]"), e = this.toggleMaximized(t);
    return this.updateMaximizeControl(), e;
  }
  async reset() {
    return await this.reconcileAttempt() ? (this.clearWorkflow(), this.renderSourcePanel(), this.setStatus(this.copy.idleStatus), this.updateActions(), !0) : !1;
  }
  destroy() {
    this.sourceTransitionGeneration += 1, this.sourceTransitionPending = !1, this.attempt && !this.attemptTerminal && this.source.onReconcileAttempt?.(this.attempt), this.aborter?.abort(), this.releasePanel(), super.destroy();
  }
  renderContent() {
    const t = this.copy.description ? `<p id="${this.instanceID}-description">${l(this.copy.description)}</p>` : "", e = this.config.sources.length < 2, i = e ? `aria-label="${l(this.config.sources[this.sourceIndex]?.label || this.copy.sourceTabsLabel)}"` : `aria-labelledby="${this.instanceID}-source-tab-${this.sourceIndex}"`;
    return `
      <header class="go-admin-modal__header go-admin-import__header">
        <div class="go-admin-import__heading"><h2 id="${this.instanceID}-title">${l(this.copy.title)}</h2>${t}</div>
        <div class="go-admin-import__header-actions">
          <button type="button" class="go-admin-import__icon-action" data-import-maximize aria-label="${l(this.isMaximized ? this.copy.restore : this.copy.maximize)}" title="${l(this.isMaximized ? this.copy.restore : this.copy.maximize)}" aria-expanded="${String(this.isMaximized)}">
            <span class="go-admin-import__action-icon" data-import-maximize-icon="${this.isMaximized ? "collapse" : "expand"}" aria-hidden="true"></span>
          </button>
          <button type="button" class="go-admin-import__icon-action" data-import-close aria-label="${l(this.copy.close)}">
            <span class="go-admin-import__action-icon" data-import-icon="close" aria-hidden="true"></span>
          </button>
        </div>
      </header>
      <div class="go-admin-import__sources" role="tablist" aria-label="${l(this.copy.sourceTabsLabel)}" ${e ? "hidden" : ""}>
        ${this.config.sources.map((s, r) => `<button id="${this.instanceID}-source-tab-${r}" type="button" role="tab" data-import-source-tab="${r}" aria-controls="${this.instanceID}-source-panel" aria-selected="${String(r === this.sourceIndex)}" ${s.available === !1 ? "disabled" : ""}>${l(s.label)}</button>`).join("")}
      </div>
      <div class="go-admin-modal__body go-admin-import__body">
        <section id="${this.instanceID}-source-panel" role="tabpanel" ${i} data-import-source-panel>
          <div class="go-admin-import__compose" data-import-compose>
            <section class="go-admin-import__mode" data-import-mode></section>
            <section class="go-admin-import__input" data-import-input></section>
          </div>
          <div class="go-admin-import__summary" data-import-summary hidden></div>
        </section>
        <p class="go-admin-import__banner" data-import-banner data-import-error role="alert" hidden></p>
        <section class="go-admin-import__report" data-import-report hidden></section>
      </div>
      <footer class="go-admin-modal__footer go-admin-import__footer">
        <p data-import-status role="status" aria-live="polite">${l(this.copy.idleStatus)}</p>
        <div class="go-admin-import__actions">
          <button type="button" class="go-admin-import__action" data-import-dismiss data-import-priority="ghost">${l(this.copy.cancel)}</button>
          <button type="button" class="go-admin-import__action" data-import-reset data-import-priority="secondary" hidden>${l(this.copy.importAnother)}</button>
          <button type="button" class="go-admin-import__action" data-import-primary data-import-priority="primary" disabled>${l(this.copy.preview)}</button>
        </div>
      </footer>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-import-close]")?.addEventListener("click", () => this.requestClose()), this.container?.querySelector("[data-import-maximize]")?.addEventListener("click", () => this.toggleFullscreen()), this.container?.querySelectorAll("[data-import-source-tab]").forEach((e) => {
      e.addEventListener("click", () => {
        this.activateSource(Number(e.dataset.importSourceTab));
      }), e.addEventListener("keydown", (i) => this.onSourceKeydown(i));
    }), this.container?.querySelector("[data-import-dismiss]")?.addEventListener("click", () => this.requestClose()), this.container?.querySelector("[data-import-primary]")?.addEventListener("click", () => {
      this.advance();
    }), this.container?.querySelector("[data-import-reset]")?.addEventListener("click", () => {
      this.reset();
    });
    const t = this.container?.querySelector("[data-import-report]");
    t && (this.reportView = new E(t, {
      columns: this.config.columns,
      filters: this.config.filters,
      presentation: this.source.report,
      noRows: this.copy.noRows,
      copy: this.copy
    })), this.renderSourcePanel(), this.report && this.showReport(this.report), this.updatePhase(), this.updateActions();
  }
  onAfterHide() {
    this.releasePanel(), this.reportView = null;
  }
  onMaximizedChange() {
    this.updateMaximizeControl(), this.backdrop?.classList.toggle("go-admin-modal--import-fullbleed", this.isMaximized);
  }
  onBeforeHide() {
    return this.closeAuthorized ? (this.closeAuthorized = !1, !0) : this.busy ? (this.setStatus(this.copy.busyDismissBlocked), !1) : this.hasDiscardableEditableWork() ? (this.closePending || (this.closePending = !0, this.resolveDismissal()), !1) : !0;
  }
  async resolveDismissal() {
    try {
      const t = {
        reason: "close",
        state: this.workflowState,
        sourceKey: this.source.key,
        hasInput: this.currentInput !== null,
        hasPreview: this.previewState !== null,
        attempt: this.attempt || void 0
      }, e = this.source.confirmDiscard || this.config.confirmDiscard;
      if (!(e ? await e(t) : await h.confirm(this.copy.discardOnClose, {
        title: this.copy.discardTitle,
        confirmText: this.copy.discard,
        cancelText: this.copy.cancel
      }))) return;
      this.clearWorkflow(), this.renderSourcePanel(), this.closeAuthorized = !0, this.requestClose() || (this.closeAuthorized = !1);
    } finally {
      this.closePending = !1;
    }
  }
  get source() {
    return this.config.sources[this.sourceIndex];
  }
  resolveModes(t) {
    const e = t.modes?.length ? Array.from(t.modes) : [t.mode];
    return e.length ? e : [t.mode];
  }
  setState(t) {
    this.workflowState = t, this.container?.setAttribute("data-import-state", t), this.config.onStateChange?.(t);
  }
  setStatus(t) {
    const e = this.container?.querySelector("[data-import-status]");
    e && (e.textContent = t);
  }
  setBanner(t = "", e = "neutral") {
    const i = this.container?.querySelector("[data-import-banner]");
    i && (i.hidden = !t, i.textContent = t, i.dataset.tone = e, e === "danger" ? i.setAttribute("role", "alert") : i.removeAttribute("role"));
  }
  setError(t = "") {
    this.setBanner(t, t ? "danger" : "neutral");
  }
  refreshBanner() {
    const t = this.report;
    if (!t) return;
    const e = [];
    if (t.partial && e.push(this.copy.partialResult), t.replayed && e.push(this.copy.replayedResult), t.bounds?.continuation?.available && t.bounds.continuation.label && e.push(t.bounds.continuation.label), this.workflowState === "preview-ready" && !this.eligibility.allowed && e.unshift(this.eligibility.reason || this.copy.previewIneligible), !e.length) {
      this.workflowState === "complete" ? this.setBanner(this.copy.completeStatus, "success") : this.workflowState === "preview-ready" ? this.setBanner(this.copy.previewReady, "neutral") : this.setBanner();
      return;
    }
    const i = this.workflowState === "preview-ready" && !this.eligibility.allowed ? "danger" : "warning";
    this.setBanner(e.join(" · "), i);
  }
  updatePhase() {
    const t = this.container;
    if (!t) return;
    const e = this.report !== null;
    t.dataset.importPhase = e ? "review" : "compose", t.dataset.importSource = this.source.key;
    const i = t.querySelector("[data-import-compose]"), s = t.querySelector("[data-import-summary]");
    i && (i.hidden = e), s && (s.hidden = !e, e ? this.renderSummary(s) : s.replaceChildren());
    const r = t.querySelector("[data-import-report]");
    r && !e && (r.hidden = !0);
  }
  renderSummary(t) {
    t.replaceChildren();
    const e = document.createElement("div");
    e.className = "go-admin-import__summary-facts";
    const i = (o, a) => {
      if (!o) return;
      const n = document.createElement("span");
      n.dataset.summaryFact = a, n.textContent = o, a === "input" && n.setAttribute("dir", "auto"), e.appendChild(n);
    };
    i(this.source.label, "source");
    const s = this.currentInput;
    s instanceof File ? i(`${s.name} · ${y(s.size)}`, "input") : this.report && i(m(this.copy.summaryBounds, { total: this.report.bounds?.totalRows ?? 0 }), "input"), i(this.selectedMode.label, "mode"), t.appendChild(e);
    const r = document.createElement("button");
    r.type = "button", r.className = "go-admin-import__action", r.dataset.importChange = "true", r.dataset.importPriority = "secondary", r.textContent = this.copy.change, r.addEventListener("click", () => {
      this.requestChange();
    }), t.appendChild(r);
  }
  async requestChange() {
    if (this.busy) {
      this.setStatus(this.copy.busyDismissBlocked);
      return;
    }
    await this.reconcileAttempt() && this.invalidatePreview();
  }
  updateMaximizeControl() {
    const t = this.container?.querySelector("[data-import-maximize]");
    if (!t) return;
    const e = this.isMaximized ? this.copy.restore : this.copy.maximize, i = t.querySelector("[data-import-maximize-icon]");
    t.setAttribute("aria-label", e), t.title = e, t.setAttribute("aria-expanded", String(this.isMaximized)), i && (i.dataset.importMaximizeIcon = this.isMaximized ? "collapse" : "expand");
  }
  renderSourcePanel() {
    this.releasePanel();
    const t = this.container?.querySelector("[data-import-input]"), e = this.container?.querySelector("[data-import-mode]");
    if (!t || !e) return;
    t.replaceChildren(), e.replaceChildren();
    const i = this.source;
    if (this.renderModeControls(i, e), i.available === !1) {
      t.textContent = i.unavailableReason || this.copy.unavailableSource, this.updateActions();
      return;
    }
    i.kind === "file" ? this.mountFileSource(i, t) : i.mountInput && this.mountCustomSource(i, t), this.updatePhase(), this.updateActions();
  }
  renderModeControls(t, e) {
    const i = this.resolveModes(t);
    if (i.some((s) => s.key === this.selectedMode?.key) || (this.selectedMode = i[0]), t.selectableModes && i.length > 1) {
      const s = document.createElement("label");
      s.textContent = this.copy.modeLabel;
      const r = document.createElement("select");
      for (const o of i) r.appendChild(Object.assign(document.createElement("option"), {
        value: o.key,
        textContent: o.label
      }));
      r.value = this.selectedMode.key, r.addEventListener("change", () => {
        if (this.hasUnresolvedAttempt()) {
          r.value = this.selectedMode.key, this.setStatus(this.copy.reconcileRequired);
          return;
        }
        this.selectedMode = i.find((o) => o.key === r.value) || i[0], this.invalidatePreview(), this.renderModeDescription(e);
      }), s.appendChild(r), e.appendChild(s);
    }
    this.renderModeDescription(e);
  }
  mountFileSource(t, e) {
    this.dropzone = new _({
      root: e,
      ...t.file || {},
      copy: {
        ...t.file?.copy || {},
        samplesLabel: t.file?.copy?.samplesLabel || this.copy.samplesLabel
      },
      onChange: (i) => {
        if (this.hasUnresolvedAttempt()) {
          this.dropzone?.setFile(this.currentInput instanceof File ? this.currentInput : null, !1), this.setStatus(this.copy.reconcileRequired), this.updateActions();
          return;
        }
        this.currentInput = i, this.invalidatePreview(i ? this.copy.selectedStatus : this.copy.idleStatus);
      },
      onInvalid: (i) => this.setError(i)
    }), this.currentInput instanceof File && this.dropzone.setFile(this.currentInput, !1);
  }
  mountCustomSource(t, e) {
    let i = !0;
    const s = t.mountInput?.(e, {
      setReady: (r) => {
        this.currentInput = r ? t.readInput?.(e) : null, i && (this.workflowState === "idle" || this.workflowState === "selected") && this.setState(r ? "selected" : "idle"), this.updateActions();
      },
      inputChanged: (r = !0) => {
        if (this.hasUnresolvedAttempt()) {
          this.setStatus(this.copy.reconcileRequired), this.updateActions();
          return;
        }
        this.currentInput = r ? t.readInput?.(e) : null, this.invalidatePreview(r ? this.copy.selectedStatus : this.copy.idleStatus);
      },
      setStatus: (r) => this.setStatus(r)
    });
    i = !1, typeof s == "function" && (this.panelCleanup = s), this.currentInput = t.readInput?.(e) ?? this.currentInput, this.workflowState === "idle" && (t.isInputReady?.(this.currentInput) ?? this.currentInput !== null) && this.setState("selected");
  }
  renderModeDescription(t) {
    t.querySelector("[data-import-mode-display]")?.remove();
    const e = document.createElement("div");
    e.dataset.importModeDisplay = "true";
    const i = document.createElement("strong");
    i.textContent = this.selectedMode.label, e.appendChild(i), this.selectedMode.description && e.appendChild(Object.assign(document.createElement("p"), { textContent: this.selectedMode.description })), t.appendChild(e);
  }
  releasePanel() {
    this.dropzone?.destroy(), this.dropzone = null, this.panelCleanup?.(), this.panelCleanup = null;
  }
  hasUnresolvedAttempt() {
    return !!(this.attempt && !this.attemptTerminal);
  }
  hasDiscardableWork() {
    return ["complete", "terminal-error"].includes(this.workflowState) && !this.hasUnresolvedAttempt() ? !1 : this.currentInput !== null || this.previewState !== null || this.report !== null || this.attempt !== null || !["idle", "selected"].includes(this.workflowState);
  }
  hasDiscardableEditableWork() {
    return this.hasUnresolvedAttempt() || ["complete", "terminal-error"].includes(this.workflowState) ? !1 : this.currentInput !== null || this.previewState !== null || this.report !== null;
  }
  async reconcileAttempt() {
    if (!this.attempt || this.attemptTerminal) return !0;
    const t = this.source.onReconcileAttempt;
    return !t || !await t(this.attempt) ? (this.setStatus(this.copy.reconcileRequired), !1) : (this.attemptTerminal = !0, !0);
  }
  clearWorkflow() {
    this.aborter?.abort(), this.aborter = null, this.attempt = null, this.attemptTerminal = !0, this.previewState = null, this.eligibility = { allowed: !1 }, this.report = null, this.response = null, this.currentInput = null, this.setState("idle"), this.reportView?.clear(), this.updatePhase();
  }
  invalidatePreview(t) {
    this.aborter?.abort(), this.aborter = null, this.previewState = null, this.eligibility = { allowed: !1 }, this.report = null, this.response = null, this.attemptTerminal && (this.attempt = null), this.reportView?.clear();
    const e = this.inputReady(this.currentInput);
    this.setState(e ? "selected" : "idle"), this.setError(), this.setStatus(t || (e ? this.copy.selectedStatus : this.copy.idleStatus)), this.updatePhase(), this.updateActions();
  }
  async confirmSourceDiscard(t) {
    if (!this.hasDiscardableWork()) return !0;
    if (!await this.reconcileAttempt()) return !1;
    const e = {
      reason: "source-switch",
      state: this.workflowState,
      sourceKey: this.source.key,
      nextSourceKey: t.key,
      hasInput: this.currentInput !== null,
      hasPreview: this.previewState !== null,
      attempt: this.attempt || void 0
    }, i = this.source.confirmDiscard || this.config.confirmDiscard;
    return i ? !!await i(e) : h.confirm(this.copy.discardSourceChange, {
      title: this.copy.discardTitle,
      confirmText: this.copy.discard,
      cancelText: this.copy.cancel
    });
  }
  async activateSource(t) {
    const e = this.config.sources[t];
    if (!e || e.available === !1 || t === this.sourceIndex || this.busy || this.sourceTransitionPending) return !1;
    const i = ++this.sourceTransitionGeneration;
    this.sourceTransitionPending = !0;
    try {
      return !await this.confirmSourceDiscard(e) || i !== this.sourceTransitionGeneration || !this.container ? !1 : (this.clearWorkflow(), this.sourceIndex = t, this.selectedMode = this.resolveModes(e)[0], this.reportView?.setPresentation(e.report), this.container.querySelectorAll("[data-import-source-tab]").forEach((s) => {
        const r = Number(s.dataset.importSourceTab) === t;
        s.setAttribute("aria-selected", String(r)), s.tabIndex = r ? 0 : -1;
      }), this.container.querySelector("[data-import-source-panel]")?.setAttribute("aria-labelledby", `${this.instanceID}-source-tab-${t}`), this.renderSourcePanel(), this.setStatus(e.help || this.copy.idleStatus), !0);
    } finally {
      i === this.sourceTransitionGeneration && (this.sourceTransitionPending = !1);
    }
  }
  onSourceKeydown(t) {
    if (![
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End"
    ].includes(t.key)) return;
    t.preventDefault();
    const e = this.config.sources.map((o, a) => o.available === !1 ? -1 : a).filter((o) => o >= 0), i = e.indexOf(this.sourceIndex), s = t.key === "ArrowRight" ? 1 : -1, r = t.key === "Home" ? e[0] : t.key === "End" ? e[e.length - 1] : e[(i + s + e.length) % e.length];
    this.activateSource(r).then((o) => {
      o && this.container?.querySelector(`[data-import-source-tab="${r}"]`)?.focus();
    });
  }
  readInput() {
    const t = this.container?.querySelector("[data-import-input]");
    return this.source.kind === "file" ? this.dropzone?.file || this.currentInput : t ? this.source.readInput?.(t) ?? this.currentInput : this.currentInput;
  }
  inputReady(t) {
    return this.source.isInputReady ? this.source.isInputReady(t) : t != null;
  }
  async advance() {
    if (this.busy) return;
    const t = this.hasUnresolvedAttempt() ? this.currentInput : this.readInput();
    if (this.currentInput = t, !this.inputReady(t)) {
      this.setStatus(this.copy.inputRequired);
      return;
    }
    this.source.workflow === "single" ? await this.submitSingle(t) : (this.workflowState === "preview-ready" || this.workflowState === "recoverable-error") && this.previewState !== null && this.eligibility.allowed ? await this.applyPreview(t) : await this.preview(t);
  }
  startBusy(t, e) {
    return this.busy = !0, this.aborter?.abort(), this.aborter = new AbortController(), this.setState(t), this.setStatus(e), this.setBanner(e, "neutral"), this.dropzone?.setDisabled(!0), this.updateActions(), this.aborter.signal;
  }
  stopBusy() {
    this.busy = !1, this.updateActions();
  }
  async submitSingle(t) {
    if (!this.source.submit || !this.source.adaptSubmit) throw new Error("Single-step source is missing its transport adapter.");
    const e = this.startBusy("submitting", this.copy.applyingStatus);
    try {
      const i = await this.source.submit(t, {
        signal: e,
        mode: this.selectedMode
      }), s = this.source.adaptSubmit(i, this.selectedMode);
      await this.complete(i, s);
    } catch (i) {
      this.handleError(i, !1);
    } finally {
      this.stopBusy();
    }
  }
  async preview(t) {
    if (!this.source.preview || !this.source.adaptPreview) throw new Error("Preview source is missing its preview adapter.");
    const e = this.startBusy("previewing", this.copy.previewingStatus);
    try {
      const i = await this.source.preview(t, {
        signal: e,
        mode: this.selectedMode
      }), s = this.source.adaptPreview(i, this.selectedMode);
      this.previewState = s.state, this.eligibility = s.eligibility, this.response = i, this.report = s.report, this.setState("preview-ready"), this.setStatus(s.eligibility.allowed ? this.copy.previewReady : s.eligibility.reason || this.copy.previewIneligible), this.showReport(s.report);
    } catch (i) {
      this.handleError(i, !1);
    } finally {
      this.stopBusy();
    }
  }
  async applyPreview(t) {
    if (!this.source.apply || !this.source.adaptApply || this.previewState === null || !this.eligibility.allowed || !await h.confirm(this.selectedMode.confirmation || this.copy.confirmApply, {
      title: this.selectedMode.label,
      confirmText: this.copy.apply,
      cancelText: this.copy.cancel
    })) return;
    (!this.attempt || this.attemptTerminal) && (this.attempt = Object.freeze((this.config.attemptFactory || M)())), this.attemptTerminal = !1;
    const e = this.startBusy("applying", this.copy.applyingStatus);
    try {
      const i = await this.source.apply(t, this.previewState, {
        signal: e,
        mode: this.selectedMode,
        attempt: this.attempt
      }), s = this.source.adaptApply(i, this.selectedMode);
      this.attemptTerminal = !0, await this.complete(i, s);
    } catch (i) {
      this.handleError(i, !0);
    } finally {
      this.stopBusy();
    }
  }
  async complete(t, e) {
    this.response = t, this.report = e, this.setState("complete"), this.setStatus(this.copy.completeStatus), this.showReport(e);
    const i = {
      sourceKey: this.source.key,
      report: e,
      response: t,
      attempt: this.attempt || void 0
    }, s = [];
    for (const r of [this.source.onComplete, this.config.onComplete])
      if (r)
        try {
          await r(i);
        } catch (o) {
          s.push(o);
        }
    if (s.length !== 0) {
      this.setError(this.copy.completionError);
      for (const r of s) for (const o of [this.source.onCompletionError, this.config.onCompletionError]) try {
        await o?.(r, i);
      } catch {
      }
    }
  }
  handleError(t, e) {
    const i = (t instanceof w ? t : null)?.outcome === "terminal";
    e && i && (this.attemptTerminal = !0), this.setState(i ? "terminal-error" : "recoverable-error");
    const s = t instanceof Error ? t.message : this.copy.importFailed;
    this.setError(s), this.setStatus(e && !i ? this.copy.unknownOutcome : s);
  }
  showReport(t) {
    const e = this.container?.querySelector("[data-import-report]");
    e && (e.hidden = !1), this.reportView?.render(t), this.updatePhase(), this.refreshBanner();
  }
  updateActions() {
    const t = this.container?.querySelector("[data-import-primary]"), e = this.container?.querySelector("[data-import-reset]");
    if (!t || !e) return;
    const i = this.hasUnresolvedAttempt() ? this.currentInput : this.readInput(), s = this.inputReady(i) && this.source.available !== !1, r = ["complete", "terminal-error"].includes(this.workflowState), o = this.busy || this.hasUnresolvedAttempt() || r;
    this.updateFooterActions(t, e, {
      ready: s,
      settled: r
    }), this.dropzone?.setDisabled(o);
    const a = this.container?.querySelector("[data-import-input]");
    a && this.source.setInputDisabled?.(a, o), this.container?.querySelectorAll("[data-import-source-tab]").forEach((n, p) => {
      n.disabled = this.busy || this.config.sources[p].available === !1;
    }), this.container?.querySelectorAll("[data-import-mode] select").forEach((n) => {
      n.disabled = o;
    });
  }
  updateFooterActions(t, e, { ready: i, settled: s }) {
    t.hidden = s, t.disabled = this.busy || s || !i || this.source.workflow === "preview-apply" && this.workflowState === "preview-ready" && !this.eligibility.allowed, t.setAttribute("aria-busy", String(this.busy)), t.textContent = this.primaryActionLabel(), e.hidden = !s, e.dataset.importPriority = s ? "primary" : "secondary";
    const r = this.container?.querySelector("[data-import-dismiss]");
    r && (r.textContent = this.hasDiscardableEditableWork() ? this.copy.cancel : this.copy.dismiss);
  }
  primaryActionLabel() {
    return this.busy ? this.workflowState === "previewing" ? this.copy.previewingStatus : this.copy.applyingStatus : this.workflowState === "recoverable-error" ? this.copy.retry : this.source.workflow === "single" ? this.copy.submit : this.workflowState === "preview-ready" ? this.copy.apply : this.copy.preview;
  }
}, L = Object.freeze({
  createOnly: {
    key: "create-only",
    label: "Create only",
    description: "Create new records and leave existing records unchanged."
  },
  skipConflicts: {
    key: "skip-conflicts",
    label: "Skip conflicts",
    description: "Skip records that conflict with existing application data."
  },
  updateOnly: {
    key: "update-only",
    label: "Update only",
    description: "Update matching records without creating new records."
  },
  upsert: {
    key: "upsert",
    label: "Create or update",
    description: "Create missing records and update matching records."
  }
});
export {
  q as BulkImportModal,
  L as COMMON_IMPORT_MODES,
  _ as FileDropzone,
  E as ImportReportView,
  w as ImportTransportError,
  q as default,
  y as formatFileSize
};

//# sourceMappingURL=import-modal.js.map