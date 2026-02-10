import { parseImportResult as d, groupRowResultsByStatus as u, generateExchangeReport as m } from "../toast/error-helpers.js";
const y = {
  // Tabs
  tabExport: "#tab-export",
  tabImport: "#tab-import",
  panelExport: "#panel-export",
  panelImport: "#panel-import",
  // Export
  exportForm: "#export-form",
  sourceLocale: "#source-locale",
  exportStatus: "#export-status",
  // Import
  importFile: "#import-file",
  importOptions: "#import-options",
  fileName: "#file-name",
  validateBtn: "#validate-btn",
  applyBtn: "#apply-btn",
  // Import options
  allowCreateMissing: "#allow-create-missing",
  allowHashOverride: "#allow-hash-override",
  continueOnError: "#continue-on-error",
  dryRun: "#dry-run",
  // Results
  validationResults: "#validation-results",
  downloadReport: "#download-report",
  resultsSummary: "#results-summary",
  resultsTable: "#results-table",
  resultsEmpty: "#results-empty",
  summaryProcessed: "#summary-processed",
  summarySucceeded: "#summary-succeeded",
  summaryFailed: "#summary-failed",
  summaryConflicts: "#summary-conflicts"
}, p = {
  success: { class: "bg-green-100 text-green-800", label: "Success" },
  error: { class: "bg-red-100 text-red-800", label: "Error" },
  conflict: { class: "bg-yellow-100 text-yellow-800", label: "Conflict" },
  skipped: { class: "bg-gray-100 text-gray-800", label: "Skipped" }
};
class g {
  constructor(t, e = {}, s) {
    this.tabExport = null, this.tabImport = null, this.panelExport = null, this.panelImport = null, this.exportForm = null, this.exportStatus = null, this.importFile = null, this.importOptions = null, this.fileNameEl = null, this.validateBtn = null, this.applyBtn = null, this.validationResults = null, this.downloadReportBtn = null, this.resultsTable = null, this.resultsEmpty = null, this.importState = {
      file: null,
      validated: !1,
      validationResult: null
    }, this.config = t, this.selectors = { ...y, ...e }, this.toast = s || window.toastManager || null;
  }
  /**
   * Initialize the translation exchange manager
   */
  init() {
    this.cacheElements(), this.bindEvents();
  }
  /**
   * Destroy the manager and clean up
   */
  destroy() {
  }
  cacheElements() {
    this.tabExport = document.querySelector(this.selectors.tabExport), this.tabImport = document.querySelector(this.selectors.tabImport), this.panelExport = document.querySelector(this.selectors.panelExport), this.panelImport = document.querySelector(this.selectors.panelImport), this.exportForm = document.querySelector(this.selectors.exportForm), this.exportStatus = document.querySelector(this.selectors.exportStatus), this.importFile = document.querySelector(this.selectors.importFile), this.importOptions = document.querySelector(this.selectors.importOptions), this.fileNameEl = document.querySelector(this.selectors.fileName), this.validateBtn = document.querySelector(this.selectors.validateBtn), this.applyBtn = document.querySelector(this.selectors.applyBtn), this.validationResults = document.querySelector(this.selectors.validationResults), this.downloadReportBtn = document.querySelector(this.selectors.downloadReport), this.resultsTable = document.querySelector(this.selectors.resultsTable), this.resultsEmpty = document.querySelector(this.selectors.resultsEmpty);
  }
  bindEvents() {
    this.tabExport?.addEventListener("click", () => this.switchTab("export")), this.tabImport?.addEventListener("click", () => this.switchTab("import")), this.exportForm?.addEventListener("submit", (e) => this.handleExport(e)), this.importFile?.addEventListener("change", (e) => this.handleFileSelect(e));
    const t = this.importFile?.closest(".border-dashed");
    t && (t.addEventListener("dragover", (e) => {
      e.preventDefault(), t.classList.add("border-admin-primary", "bg-admin-primary/5");
    }), t.addEventListener("dragleave", () => {
      t.classList.remove("border-admin-primary", "bg-admin-primary/5");
    }), t.addEventListener("drop", (e) => {
      e.preventDefault(), t.classList.remove("border-admin-primary", "bg-admin-primary/5");
      const s = e.dataTransfer?.files;
      s && s.length > 0 && this.handleFile(s[0]);
    })), this.validateBtn?.addEventListener("click", () => this.handleValidate()), this.applyBtn?.addEventListener("click", () => this.handleApply()), this.downloadReportBtn?.addEventListener("click", () => this.handleDownloadReport());
  }
  switchTab(t) {
    const e = document.querySelectorAll(".tab-btn"), s = document.querySelectorAll(".tab-panel");
    e.forEach((r) => {
      r.classList.remove("border-admin-primary", "text-admin-primary"), r.classList.add("border-transparent", "text-gray-500");
    }), s.forEach((r) => r.classList.add("hidden")), t === "export" ? (this.tabExport?.classList.remove("border-transparent", "text-gray-500"), this.tabExport?.classList.add("border-admin-primary", "text-admin-primary"), this.panelExport?.classList.remove("hidden")) : (this.tabImport?.classList.remove("border-transparent", "text-gray-500"), this.tabImport?.classList.add("border-admin-primary", "text-admin-primary"), this.panelImport?.classList.remove("hidden"));
  }
  async handleExport(t) {
    if (t.preventDefault(), !this.exportForm) return;
    const e = new FormData(this.exportForm), s = e.getAll("resources"), r = e.get("source_locale"), o = e.getAll("target_locales"), i = e.has("include_source_hash");
    if (s.length === 0) {
      this.showError("Please select at least one resource to export.");
      return;
    }
    if (o.length === 0) {
      this.showError("Please select at least one target locale.");
      return;
    }
    this.setExportStatus("Exporting...");
    try {
      const a = {
        filter: {
          resources: s,
          source_locale: r,
          target_locales: o,
          include_source_hash: i
        }
      }, l = await fetch(`${this.config.apiPath}/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a)
      });
      if (!l.ok) {
        const c = await l.json(), h = c?.error?.message || c?.message || "Export failed";
        throw new Error(h);
      }
      const n = await l.json();
      this.downloadExportResult(n, r, o), this.setExportStatus(`Exported ${n.row_count} rows`), this.toast?.success(`Exported ${n.row_count} translation rows`);
    } catch (a) {
      const l = a instanceof Error ? a.message : "Export failed";
      this.setExportStatus(""), this.showError(l);
    }
  }
  downloadExportResult(t, e, s) {
    const r = this.convertToCSV(t.rows), o = new Blob([r], { type: "text/csv;charset=utf-8;" }), i = URL.createObjectURL(o), a = document.createElement("a"), l = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    a.href = i, a.download = `translations_${e}_to_${s.join("-")}_${l}.csv`, document.body.appendChild(a), a.click(), document.body.removeChild(a), URL.revokeObjectURL(i);
  }
  convertToCSV(t) {
    if (t.length === 0) return "";
    const e = [
      "resource",
      "entity_id",
      "translation_group_id",
      "source_locale",
      "target_locale",
      "field_path",
      "source_text",
      "translated_text",
      "source_hash",
      "path",
      "title",
      "status",
      "notes"
    ], s = [e.join(",")];
    for (const r of t) {
      const o = e.map((i) => {
        const a = r[i] ?? "", l = String(a);
        return l.includes(",") || l.includes('"') || l.includes(`
`) ? `"${l.replace(/"/g, '""')}"` : l;
      });
      s.push(o.join(","));
    }
    return s.join(`
`);
  }
  handleFileSelect(t) {
    const e = t.target;
    e.files && e.files.length > 0 && this.handleFile(e.files[0]);
  }
  handleFile(t) {
    const e = t.name.split(".").pop()?.toLowerCase();
    if (e !== "csv" && e !== "json") {
      this.showError("Please upload a CSV or JSON file.");
      return;
    }
    this.importState.file = t, this.importState.validated = !1, this.importState.validationResult = null, this.fileNameEl && (this.fileNameEl.textContent = `Selected: ${t.name}`, this.fileNameEl.classList.remove("hidden")), this.importOptions?.classList.remove("hidden"), this.applyBtn && (this.applyBtn.disabled = !0), this.validationResults?.classList.add("hidden");
  }
  async handleValidate() {
    if (!this.importState.file) {
      this.showError("Please select a file first.");
      return;
    }
    this.setButtonLoading(this.validateBtn, !0);
    try {
      const t = new FormData();
      t.append("file", this.importState.file);
      const e = await fetch(`${this.config.apiPath}/import/validate`, {
        method: "POST",
        body: t
      }), s = await e.json();
      if (!e.ok) {
        const o = s?.error?.message || s?.message || "Validation failed";
        throw new Error(o);
      }
      const r = d(s);
      this.importState.validated = !0, this.importState.validationResult = r, this.displayExchangeResults(r), this.applyBtn && r.summary.succeeded > 0 && (this.applyBtn.disabled = !1), this.toast?.info(`Validation complete: ${r.summary.succeeded}/${r.summary.processed} rows valid`);
    } catch (t) {
      const e = t instanceof Error ? t.message : "Validation failed";
      this.showError(e);
    } finally {
      this.setButtonLoading(this.validateBtn, !1);
    }
  }
  async handleApply() {
    if (!this.importState.file) {
      this.showError("Please select a file first.");
      return;
    }
    document.querySelector(this.selectors.dryRun)?.checked && this.toast?.info("Dry run mode - no changes will be applied"), this.setButtonLoading(this.applyBtn, !0);
    try {
      const e = new FormData();
      e.append("file", this.importState.file);
      const s = this.getImportOptions();
      for (const [a, l] of Object.entries(s))
        e.append(a, String(l));
      const r = await fetch(`${this.config.apiPath}/import/apply`, {
        method: "POST",
        body: e
      }), o = await r.json();
      if (!r.ok) {
        const a = o?.error?.message || o?.message || "Apply failed";
        throw new Error(a);
      }
      const i = d(o);
      this.importState.validationResult = i, this.displayExchangeResults(i), i.summary.succeeded > 0 && this.toast?.success(`Applied ${i.summary.succeeded} translations successfully`), i.summary.failed > 0 && this.toast?.warning(`${i.summary.failed} rows failed to apply`);
    } catch (e) {
      const s = e instanceof Error ? e.message : "Apply failed";
      this.showError(s);
    } finally {
      this.setButtonLoading(this.applyBtn, !1);
    }
  }
  getImportOptions() {
    return {
      allow_create_missing: document.querySelector(this.selectors.allowCreateMissing)?.checked ?? !1,
      allow_source_hash_override: document.querySelector(this.selectors.allowHashOverride)?.checked ?? !1,
      continue_on_error: document.querySelector(this.selectors.continueOnError)?.checked ?? !0,
      dry_run: document.querySelector(this.selectors.dryRun)?.checked ?? !1
    };
  }
  displayExchangeResults(t) {
    this.validationResults?.classList.remove("hidden");
    const e = document.querySelector(this.selectors.summaryProcessed), s = document.querySelector(this.selectors.summarySucceeded), r = document.querySelector(this.selectors.summaryFailed), o = document.querySelector(this.selectors.summaryConflicts);
    e && (e.textContent = String(t.summary.processed)), s && (s.textContent = String(t.summary.succeeded)), r && (r.textContent = String(t.summary.failed));
    const i = u(t.results);
    o && (o.textContent = String(i.conflict.length)), this.renderResultsTable(t.results);
  }
  renderResultsTable(t) {
    if (!this.resultsTable) return;
    if (t.length === 0) {
      this.resultsTable.innerHTML = "", this.resultsEmpty?.classList.remove("hidden");
      return;
    }
    this.resultsEmpty?.classList.add("hidden");
    const e = t.map((s) => {
      const r = p[s.status] || p.error, o = s.error || s.conflict?.type || "";
      return `
        <tr>
          <td class="px-4 py-3 text-gray-500">${s.index + 1}</td>
          <td class="px-4 py-3">${this.escapeHtml(s.resource)}</td>
          <td class="px-4 py-3 font-mono text-xs">${this.escapeHtml(s.entityId)}</td>
          <td class="px-4 py-3">${this.escapeHtml(s.fieldPath)}</td>
          <td class="px-4 py-3">${this.escapeHtml(s.targetLocale)}</td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${r.class}">
              ${r.label}
            </span>
          </td>
          <td class="px-4 py-3 text-xs text-gray-500">${this.escapeHtml(o)}</td>
        </tr>
      `;
    });
    this.resultsTable.innerHTML = e.join("");
  }
  handleDownloadReport() {
    if (!this.importState.validationResult) {
      this.showError("No results to download.");
      return;
    }
    const t = m(this.importState.validationResult, "csv"), e = URL.createObjectURL(t), s = document.createElement("a"), r = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    s.href = e, s.download = `translation_import_report_${r}.csv`, document.body.appendChild(s), s.click(), document.body.removeChild(s), URL.revokeObjectURL(e), this.toast?.info("Report downloaded");
  }
  setExportStatus(t) {
    this.exportStatus && (this.exportStatus.textContent = t);
  }
  setButtonLoading(t, e) {
    t && (e ? (t.disabled = !0, t.dataset.originalText = t.textContent || "", t.textContent = "Processing...") : (t.disabled = !1, t.textContent = t.dataset.originalText || t.textContent));
  }
  showError(t) {
    this.toast ? this.toast.error(t) : (console.error(t), alert(t));
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t, e.innerHTML;
  }
}
export {
  g as TranslationExchangeManager
};
//# sourceMappingURL=index.js.map
