import { escapeHTML as l } from "../shared/html.js";
import { formatByteSize as S } from "../shared/size-formatters.js";
import { httpRequest as k } from "../shared/transport/http-client.js";
import { r as C, t as v } from "../chunks/modal-nXs4C8ko.js";
var I = class extends Error {
  constructor(t, e = "unknown") {
    super(t), this.name = "ImportTransportError", this.outcome = e;
  }
}, u = {
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
  discard: "Discard and continue",
  cancel: "Cancel"
}, x = {
  browse: "Choose a file or drag and drop it here",
  guidance: "Select a supported import file.",
  remove: "Remove selected file",
  invalid: "The selected file is not supported.",
  tooLarge: "The selected file exceeds the client-visible size limit.",
  samplesLabel: "Import samples"
}, E = 0;
function A(t) {
  return S(t, {
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
function R(t, e) {
  const i = e.split(",").map((o) => o.trim().toLowerCase()).filter(Boolean);
  if (i.length === 0) return !0;
  const s = t.name.toLowerCase(), r = t.type.toLowerCase();
  return i.some((o) => o.startsWith(".") ? s.endsWith(o) : o.endsWith("/*") ? r.startsWith(o.slice(0, -1)) : r === o);
}
function h(t, e, i) {
  return t.addEventListener(e, i), () => t.removeEventListener(e, i);
}
function M(t, e) {
  return Object.entries(e).reduce((i, [s, r]) => i.split(`{${s}}`).join(String(r)), t);
}
var _ = class {
  constructor(t) {
    this.cleanup = [], this.input = null, this.selected = null, this.dragDepth = 0, this.disabled = !1, this.options = t, this.copy = {
      ...x,
      ...t.copy
    }, this.render(), this.bind();
  }
  get file() {
    return this.selected;
  }
  setFile(t, e = !0) {
    return t && this.options.maxBytes && t.size > this.options.maxBytes ? (this.options.onInvalid?.(this.copy.tooLarge), !1) : t && this.options.accept && !R(t, this.options.accept) ? (this.options.onInvalid?.(this.copy.invalid), !1) : (this.selected = t, this.update(), e && this.options.onChange?.(t), !0);
  }
  reset() {
    this.input && (this.input.value = ""), this.setFile(null);
  }
  setDisabled(t) {
    this.disabled = t, this.input && (this.input.disabled = t), this.options.root.setAttribute("aria-disabled", String(t)), this.options.root.querySelectorAll("button").forEach((e) => {
      e.disabled = t;
    });
  }
  destroy() {
    this.cleanup.splice(0).forEach((t) => t()), this.selected = null, this.input = null, this.dragDepth = 0, this.options.root.removeAttribute("data-drag-active");
  }
  render() {
    const t = this.options.guidance || this.copy.guidance, e = (this.options.samples || []).map((i) => `<a class="go-admin-import__sample" href="${l(i.href)}">${l(i.label)}</a>`).join("");
    this.options.root.innerHTML = `
      <div class="go-admin-import__dropzone" data-import-dropzone tabindex="0" role="button">
        <input data-import-file type="file" class="go-admin-import__file-input" accept="${l(this.options.accept || "")}">
        <div data-import-empty>
          <strong>${l(this.copy.browse)}</strong>
          <span>${l(t)}</span>
        </div>
        <div data-import-selected hidden>
          <strong data-import-file-name></strong>
          <span data-import-file-size></span>
          <button data-import-remove type="button">${l(this.copy.remove)}</button>
        </div>
      </div>
      ${e ? `<nav class="go-admin-import__samples" aria-label="${l(this.copy.samplesLabel)}">${e}</nav>` : ""}
    `, this.input = this.options.root.querySelector("[data-import-file]");
  }
  bind() {
    const t = this.options.root.querySelector("[data-import-dropzone]"), e = this.options.root.querySelector("[data-import-remove]");
    if (!(!t || !this.input)) {
      this.cleanup.push(h(this.input, "change", () => {
        this.setFile(this.input?.files?.[0] || null);
      })), this.cleanup.push(h(t, "keydown", (i) => {
        const s = i;
        !this.disabled && (s.key === "Enter" || s.key === " ") && (s.preventDefault(), this.input?.click());
      })), this.cleanup.push(h(t, "click", (i) => {
        !this.disabled && i.target === t && this.input?.click();
      }));
      for (const i of ["dragenter", "dragover"]) this.cleanup.push(h(t, i, (s) => {
        s.preventDefault(), !this.disabled && (i === "dragenter" && (this.dragDepth += 1), this.options.root.setAttribute("data-drag-active", "true"));
      }));
      this.cleanup.push(h(t, "dragleave", (i) => {
        i.preventDefault(), this.dragDepth = Math.max(0, this.dragDepth - 1), this.dragDepth === 0 && this.options.root.removeAttribute("data-drag-active");
      })), this.cleanup.push(h(t, "drop", (i) => {
        const s = i;
        s.preventDefault(), this.dragDepth = 0, this.options.root.removeAttribute("data-drag-active"), this.disabled || this.setFile(s.dataTransfer?.files?.[0] || null);
      })), e && this.cleanup.push(h(e, "click", (i) => {
        i.preventDefault(), i.stopPropagation(), this.disabled || this.reset();
      }));
    }
  }
  update() {
    const t = this.options.root.querySelector("[data-import-empty]"), e = this.options.root.querySelector("[data-import-selected]"), i = this.options.root.querySelector("[data-import-file-name]"), s = this.options.root.querySelector("[data-import-file-size]");
    t && (t.hidden = !!this.selected), e && (e.hidden = !this.selected), i && (i.textContent = this.selected?.name || ""), s && (s.textContent = this.selected ? A(this.selected.size) : "");
  }
};
function z(t, e) {
  if (e.value) return e.value(t);
  switch (e.key) {
    case "reference":
      return t.reference;
    case "outcome":
      return t.outcome;
    case "action":
      return t.action || "";
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
function D(t, e) {
  return e.predicate ? !!e.predicate(t) : !(e.outcome && t.outcome !== e.outcome || e.action && t.action !== e.action || e.code && !(t.codes || []).includes(e.code));
}
var $ = class {
  constructor(t, e = {}) {
    this.report = null, this.activeFilter = "all", this.root = t, this.columns = e.columns || [
      {
        key: "reference",
        label: "Row"
      },
      {
        key: "outcome",
        label: "Outcome"
      },
      {
        key: "action",
        label: "Action"
      },
      {
        key: "message",
        label: "Details"
      }
    ], this.filters = e.filters || [], this.noRows = e.noRows || u.noRows, this.copy = {
      reportFiltersLabel: u.reportFiltersLabel,
      allRows: u.allRows,
      reportBounds: u.reportBounds,
      reportTruncated: u.reportTruncated,
      partialResult: u.partialResult,
      replayedResult: u.replayedResult,
      ...e.copy
    };
  }
  render(t) {
    const e = Array.isArray(t.rows) ? t.rows.slice() : [], i = Math.max(e.length, Number(t.bounds?.totalRows) || 0);
    this.report = {
      ...t,
      metrics: Array.isArray(t.metrics) ? t.metrics.slice() : [],
      rows: e,
      bounds: {
        returnedRows: e.length,
        totalRows: i,
        truncated: !!(t.bounds?.truncated || i > e.length),
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
    this.root.replaceChildren(), this.root.setAttribute("data-phase", t.phase);
    const e = document.createElement("div");
    e.className = "go-admin-import__metrics";
    for (const a of t.metrics) {
      const n = document.createElement("button");
      n.type = "button", n.className = "go-admin-import__metric", n.dataset.tone = a.tone || "neutral", n.disabled = !a.filter, n.append(Object.assign(document.createElement("strong"), { textContent: String(a.value) })), n.append(Object.assign(document.createElement("span"), { textContent: a.label })), a.filter && n.addEventListener("click", () => {
        this.activeFilter = a.filter.key, this.draw();
      }), e.appendChild(n);
    }
    this.root.appendChild(e);
    const i = [
      {
        key: "all",
        label: this.copy.allRows
      },
      ...this.filters,
      ...t.metrics.flatMap((a) => a.filter ? [a.filter] : [])
    ].filter((a, n, p) => p.findIndex((y) => y.key === a.key) === n);
    if (i.length > 1) {
      const a = document.createElement("div");
      a.className = "go-admin-import__filters", a.setAttribute("role", "toolbar"), a.setAttribute("aria-label", this.copy.reportFiltersLabel);
      for (const n of i) {
        const p = document.createElement("button");
        p.type = "button", p.textContent = n.label, p.dataset.active = String(n.key === this.activeFilter), p.addEventListener("click", () => {
          this.activeFilter = n.key, this.draw();
        }), a.appendChild(p);
      }
      this.root.appendChild(a);
    }
    const s = i.find((a) => a.key === this.activeFilter), r = s && s.key !== "all" ? t.rows.filter((a) => D(a, s)) : t.rows, o = document.createElement("p");
    o.className = "go-admin-import__bounds", o.textContent = [M(this.copy.reportBounds, {
      visible: r.length,
      returned: t.bounds.returnedRows,
      total: t.bounds.totalRows
    }), t.bounds.truncated ? this.copy.reportTruncated : ""].filter(Boolean).join(" "), this.root.appendChild(o);
    const c = document.createElement("div");
    c.className = "go-admin-import__report-scroll", c.tabIndex = 0;
    const d = document.createElement("table");
    d.className = "go-admin-import__report-table";
    const m = document.createElement("thead"), w = document.createElement("tr");
    for (const a of this.columns) {
      const n = document.createElement("th");
      n.scope = "col", n.textContent = a.label, w.appendChild(n);
    }
    m.appendChild(w), d.appendChild(m);
    const f = document.createElement("tbody");
    if (r.length === 0) {
      const a = document.createElement("tr"), n = document.createElement("td");
      n.colSpan = Math.max(1, this.columns.length), n.textContent = this.noRows, a.appendChild(n), f.appendChild(a);
    } else for (const a of r) {
      const n = document.createElement("tr");
      n.dataset.outcome = a.outcome || "unknown", n.dataset.action = a.action || "";
      for (const p of this.columns) {
        const y = document.createElement("td"), g = z(a, p);
        y.textContent = g === null ? "" : String(g), n.appendChild(y);
      }
      f.appendChild(n);
    }
    d.appendChild(f), c.appendChild(d), this.root.appendChild(c);
    const b = [t.partial ? this.copy.partialResult : "", t.replayed ? this.copy.replayedResult : ""].filter(Boolean);
    if (t.bounds.continuation?.available && t.bounds.continuation.label && b.push(t.bounds.continuation.label), b.length) {
      const a = document.createElement("p");
      a.className = "go-admin-import__flags", a.textContent = b.join(" · "), this.root.appendChild(a);
    }
  }
};
function q() {
  const t = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return Object.freeze({
    attemptId: t,
    idempotencyKey: t
  });
}
var F = class extends C {
  constructor(t) {
    if (!t.root || t.sources.length === 0) throw new Error("BulkImportModal requires a root and at least one source.");
    super({
      size: "4xl",
      ariaLabel: t.copy?.title || u.title,
      initialFocus: "[data-import-source-tab]",
      maximizable: !0,
      containerClass: "go-admin-import"
    }), this.instanceID = `go-admin-bulk-import-${++E}`, this.workflowState = "idle", this.sourceIndex = 0, this.currentInput = null, this.previewState = null, this.eligibility = { allowed: !1 }, this.attempt = null, this.attemptTerminal = !0, this.report = null, this.response = null, this.aborter = null, this.dropzone = null, this.panelCleanup = null, this.reportView = null, this.busy = !1, this.config = t, this.copy = {
      ...u,
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
    this.attempt && !this.attemptTerminal && this.source.onReconcileAttempt?.(this.attempt), this.aborter?.abort(), this.releasePanel(), super.destroy();
  }
  renderContent() {
    const t = this.copy.description ? `<p id="${this.instanceID}-description">${l(this.copy.description)}</p>` : "";
    return `
      <header class="go-admin-modal__header go-admin-import__header">
        <div><h2 id="${this.instanceID}-title">${l(this.copy.title)}</h2>${t}</div>
        <div class="go-admin-import__header-actions">
          <button type="button" data-import-maximize aria-expanded="${String(this.isMaximized)}">${l(this.isMaximized ? this.copy.restore : this.copy.maximize)}</button>
          <button type="button" class="go-admin-modal__close" data-import-close aria-label="${l(this.copy.close)}">×</button>
        </div>
      </header>
      <div class="go-admin-import__sources" role="tablist" aria-label="${l(this.copy.sourceTabsLabel)}">
        ${this.config.sources.map((e, i) => `<button id="${this.instanceID}-source-tab-${i}" type="button" role="tab" data-import-source-tab="${i}" aria-controls="${this.instanceID}-source-panel" aria-selected="${String(i === this.sourceIndex)}" ${e.available === !1 ? "disabled" : ""}>${l(e.label)}</button>`).join("")}
      </div>
      <div class="go-admin-modal__body go-admin-import__body">
        <section id="${this.instanceID}-source-panel" role="tabpanel" aria-labelledby="${this.instanceID}-source-tab-${this.sourceIndex}" data-import-source-panel>
          <section class="go-admin-import__mode" data-import-mode></section>
          <section class="go-admin-import__input" data-import-input></section>
        </section>
        <section class="go-admin-import__report" data-import-report hidden></section>
        <p class="go-admin-import__error" data-import-error role="alert" hidden></p>
      </div>
      <footer class="go-admin-modal__footer go-admin-import__footer">
        <p data-import-status role="status" aria-live="polite">${l(this.copy.idleStatus)}</p>
        <div>
          <button type="button" data-import-reset hidden>${l(this.copy.importAnother)}</button>
          <button type="button" data-import-primary disabled>${l(this.copy.preview)}</button>
        </div>
      </footer>
    `;
  }
  bindContentEvents() {
    this.container?.querySelector("[data-import-close]")?.addEventListener("click", () => this.requestClose()), this.container?.querySelector("[data-import-maximize]")?.addEventListener("click", () => this.toggleFullscreen()), this.container?.querySelectorAll("[data-import-source-tab]").forEach((e) => {
      e.addEventListener("click", () => {
        this.activateSource(Number(e.dataset.importSourceTab));
      }), e.addEventListener("keydown", (i) => this.onSourceKeydown(i));
    }), this.container?.querySelector("[data-import-primary]")?.addEventListener("click", () => {
      this.advance();
    }), this.container?.querySelector("[data-import-reset]")?.addEventListener("click", () => {
      this.reset();
    });
    const t = this.container?.querySelector("[data-import-report]");
    t && (this.reportView = new $(t, {
      columns: this.config.columns,
      filters: this.config.filters,
      noRows: this.copy.noRows,
      copy: this.copy
    })), this.renderSourcePanel(), this.report && this.showReport(this.report), this.updateActions();
  }
  onAfterHide() {
    this.releasePanel(), this.reportView = null;
  }
  onMaximizedChange() {
    this.updateMaximizeControl();
  }
  onBeforeHide() {
    return !this.busy;
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
  setError(t = "") {
    const e = this.container?.querySelector("[data-import-error]");
    e && (e.hidden = !t, e.textContent = t);
  }
  updateMaximizeControl() {
    const t = this.container?.querySelector("[data-import-maximize]");
    t && (t.textContent = this.isMaximized ? this.copy.restore : this.copy.maximize, t.setAttribute("aria-expanded", String(this.isMaximized)));
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
    i.kind === "file" ? this.mountFileSource(i, t) : i.mountInput && this.mountCustomSource(i, t), this.updateActions();
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
  async reconcileAttempt() {
    if (!this.attempt || this.attemptTerminal) return !0;
    const t = this.source.onReconcileAttempt;
    return !t || !await t(this.attempt) ? (this.setStatus(this.copy.reconcileRequired), !1) : (this.attemptTerminal = !0, !0);
  }
  clearWorkflow() {
    this.aborter?.abort(), this.aborter = null, this.attempt = null, this.attemptTerminal = !0, this.previewState = null, this.eligibility = { allowed: !1 }, this.report = null, this.response = null, this.currentInput = null, this.setState("idle"), this.reportView?.clear();
  }
  invalidatePreview(t) {
    this.aborter?.abort(), this.aborter = null, this.previewState = null, this.eligibility = { allowed: !1 }, this.report = null, this.response = null, this.attemptTerminal && (this.attempt = null), this.reportView?.clear();
    const e = this.inputReady(this.currentInput);
    this.setState(e ? "selected" : "idle"), this.setError(), this.setStatus(t || (e ? this.copy.selectedStatus : this.copy.idleStatus)), this.updateActions();
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
    return i ? !!await i(e) : v.confirm(this.copy.discardSourceChange, {
      title: this.copy.discardTitle,
      confirmText: this.copy.discard,
      cancelText: this.copy.cancel
    });
  }
  async activateSource(t) {
    const e = this.config.sources[t];
    !e || e.available === !1 || t === this.sourceIndex || this.busy || await this.confirmSourceDiscard(e) && (this.clearWorkflow(), this.sourceIndex = t, this.selectedMode = this.resolveModes(e)[0], this.container?.querySelectorAll("[data-import-source-tab]").forEach((i) => {
      const s = Number(i.dataset.importSourceTab) === t;
      i.setAttribute("aria-selected", String(s)), i.tabIndex = s ? 0 : -1;
    }), this.container?.querySelector("[data-import-source-panel]")?.setAttribute("aria-labelledby", `${this.instanceID}-source-tab-${t}`), this.renderSourcePanel(), this.setStatus(e.help || this.copy.idleStatus));
  }
  onSourceKeydown(t) {
    if (![
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End"
    ].includes(t.key)) return;
    t.preventDefault();
    const e = this.config.sources.map((o, c) => o.available === !1 ? -1 : c).filter((o) => o >= 0), i = e.indexOf(this.sourceIndex), s = t.key === "ArrowRight" ? 1 : -1, r = t.key === "Home" ? e[0] : t.key === "End" ? e[e.length - 1] : e[(i + s + e.length) % e.length];
    this.activateSource(r).then(() => this.container?.querySelector(`[data-import-source-tab="${r}"]`)?.focus());
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
    return this.busy = !0, this.aborter?.abort(), this.aborter = new AbortController(), this.setState(t), this.setStatus(e), this.setError(), this.dropzone?.setDisabled(!0), this.updateActions(), this.aborter.signal;
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
    if (!this.source.apply || !this.source.adaptApply || this.previewState === null || !this.eligibility.allowed || !await v.confirm(this.selectedMode.confirmation || this.copy.confirmApply, {
      title: this.selectedMode.label,
      confirmText: this.copy.apply,
      cancelText: this.copy.cancel
    })) return;
    (!this.attempt || this.attemptTerminal) && (this.attempt = Object.freeze((this.config.attemptFactory || q)())), this.attemptTerminal = !1;
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
    const i = (t instanceof I ? t : null)?.outcome === "terminal";
    e && i && (this.attemptTerminal = !0), this.setState(i ? "terminal-error" : "recoverable-error");
    const s = t instanceof Error ? t.message : this.copy.importFailed;
    this.setError(s), this.setStatus(e && !i ? this.copy.unknownOutcome : s);
  }
  showReport(t) {
    const e = this.container?.querySelector("[data-import-report]");
    e && (e.hidden = !1), this.reportView?.render(t);
  }
  updateActions() {
    const t = this.container?.querySelector("[data-import-primary]"), e = this.container?.querySelector("[data-import-reset]");
    if (!t || !e) return;
    const i = this.hasUnresolvedAttempt() ? this.currentInput : this.readInput(), s = this.inputReady(i) && this.source.available !== !1, r = ["complete", "terminal-error"].includes(this.workflowState), o = this.busy || this.hasUnresolvedAttempt() || r;
    t.disabled = this.busy || r || !s || this.source.workflow === "preview-apply" && this.workflowState === "preview-ready" && !this.eligibility.allowed, this.busy ? t.textContent = this.workflowState === "previewing" ? this.copy.previewingStatus : this.copy.applyingStatus : this.workflowState === "recoverable-error" ? t.textContent = this.copy.retry : this.source.workflow === "single" ? t.textContent = this.copy.submit : this.workflowState === "preview-ready" ? t.textContent = this.copy.apply : t.textContent = this.copy.preview, e.hidden = !["complete", "terminal-error"].includes(this.workflowState), this.dropzone?.setDisabled(o);
    const c = this.container?.querySelector("[data-import-input]");
    c && this.source.setInputDisabled?.(c, o), this.container?.querySelectorAll("[data-import-source-tab]").forEach((d, m) => {
      d.disabled = this.busy || this.config.sources[m].available === !1;
    }), this.container?.querySelectorAll("[data-import-mode] select").forEach((d) => {
      d.disabled = o;
    });
  }
}, N = class extends F {
  constructor(t = {}) {
    const e = t.resourceName || "items", i = t.endpoint || `${(t.apiBasePath || "/api").replace(/\/+$/, "")}/import`, s = document.getElementById(t.modalId || "import-modal") || document.body;
    super({
      root: s,
      copy: {
        title: `Import ${e}`,
        submit: `Import ${e}`
      },
      columns: [
        {
          key: "reference",
          label: "#"
        },
        {
          key: "email",
          label: "Email"
        },
        {
          key: "user_id",
          label: "User ID"
        },
        {
          key: "outcome",
          label: "Status"
        },
        {
          key: "message",
          label: "Error"
        }
      ],
      filters: [{
        key: "succeeded",
        label: "Succeeded",
        outcome: "succeeded"
      }, {
        key: "failed",
        label: "Failed",
        outcome: "failed"
      }],
      sources: [{
        key: "file",
        label: "File",
        workflow: "single",
        kind: "file",
        mode: {
          key: "users-owned",
          label: "Users import policy"
        },
        file: { accept: ".csv,.json,text/csv,application/json" },
        submit: async (r, o) => {
          const c = new FormData();
          c.set("file", r);
          const d = await k(i, {
            method: "POST",
            body: c,
            signal: o.signal
          });
          return {
            response: d,
            payload: await d.json()
          };
        },
        adaptSubmit: ({ payload: r }) => T(r),
        onComplete: ({ report: r, response: o }) => {
          const c = Object.fromEntries(r.metrics.map((d) => [d.key, d.value]));
          t.onSuccess?.(c), Number(c.failed || 0) > 0 ? t.notifier?.error(String(o?.payload?.error || "Import completed with errors.")) : t.notifier?.success(`${e} imported successfully.`);
        }
      }]
    });
  }
};
function T(t) {
  const e = t?.summary || {}, i = (Array.isArray(t?.results) ? t.results : []).map((s, r) => {
    const o = !!String(s?.error || "").trim();
    return {
      reference: String(Number.isFinite(s?.index) ? s.index + 1 : r + 1),
      outcome: o ? "failed" : "succeeded",
      action: o ? "rejected" : String(s?.status || "imported"),
      message: o ? String(s.error) : "",
      metadata: {
        email: s?.email ? String(s.email) : "",
        user_id: s?.user_id ? String(s.user_id) : ""
      }
    };
  });
  return {
    phase: "complete",
    mode: "users-owned",
    metrics: [
      {
        key: "processed",
        label: "Processed",
        value: Number(e.processed) || 0
      },
      {
        key: "succeeded",
        label: "Succeeded",
        value: Number(e.succeeded) || 0,
        tone: "success",
        filter: {
          key: "succeeded",
          label: "Succeeded",
          outcome: "succeeded"
        }
      },
      {
        key: "failed",
        label: "Failed",
        value: Number(e.failed) || 0,
        tone: "danger",
        filter: {
          key: "failed",
          label: "Failed",
          outcome: "failed"
        }
      }
    ],
    rows: i,
    bounds: {
      returnedRows: i.length,
      totalRows: Number(e.processed) || i.length,
      truncated: !1
    },
    partial: Number(e.failed) > 0
  };
}
var O = Object.freeze({
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
  F as BulkImportModal,
  O as COMMON_IMPORT_MODES,
  _ as FileDropzone,
  N as ImportModal,
  $ as ImportReportView,
  I as ImportTransportError,
  F as default,
  A as formatFileSize,
  T as legacyUsersReport
};

//# sourceMappingURL=import-modal.js.map