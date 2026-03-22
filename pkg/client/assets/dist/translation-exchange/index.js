import { a as T, i as M, o as g, s as A } from "../chunks/translation-contracts-NuS3GLjo.js";
import { S as F, T as _, W as S, d as P, et as U, f as V, l as m, q as B, r as w, s as E, t as $, w as x, x as W } from "../chunks/translation-shared-BSLmw_rJ.js";
var q = { root: "#translation-exchange-app" };
function o(t) {
  return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function k(t) {
  switch (t) {
    case "completed":
      return "success";
    case "running":
      return "info";
    case "failed":
      return "error";
    default:
      return "neutral";
  }
}
function b(t) {
  switch (t) {
    case "success":
      return "success";
    case "conflict":
      return "warning";
    case "error":
      return "error";
    default:
      return "neutral";
  }
}
function u(t) {
  return `rounded-full px-3 py-1 text-xs font-medium ${U(t)}`;
}
var y = `${P} p-5`, z = `${P} p-4`, C = `${S} border ${w} ${$} p-5`, j = `${S} border ${w} ${$} p-4`, D = `${S} border ${w} ${$} px-4 py-3`, L = `${S} border ${w} ${$} px-6 py-10 text-center text-sm text-gray-600`, f = "text-xs uppercase tracking-wider text-gray-500", G = `mt-2 text-2xl font-bold ${B}`;
function I(t) {
  if (!t) return "Pending";
  const e = new Date(t);
  return Number.isNaN(e.getTime()) ? t : new Intl.DateTimeFormat(void 0, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(e);
}
function K(t, e) {
  const a = typeof window < "u" && typeof window.btoa == "function" ? window.btoa.bind(window) : typeof globalThis.btoa == "function" ? globalThis.btoa.bind(globalThis) : null;
  return a ? `data:${t};base64,${a(encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, (s, i) => String.fromCharCode(parseInt(i, 16))))}` : `data:${t},${encodeURIComponent(e)}`;
}
function Y(t) {
  return new Promise((e) => setTimeout(e, Math.max(0, t)));
}
function H(t) {
  return !t || !t.progress.total || t.progress.total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(t.progress.processed / t.progress.total * 100)));
}
function X(t, e) {
  return t?.downloads ? t.downloads[e]?.href ?? t.downloads.artifact?.href ?? "" : "";
}
function Q(t, e) {
  return t?.downloads ? t.downloads[e]?.label ?? t.downloads.artifact?.label ?? "Download artifact" : "";
}
function O(t) {
  const e = [];
  return t.resources.length === 0 && e.push("Select at least one resource."), t.targetLocales.length === 0 && e.push("Select at least one target locale."), t.targetLocales.includes(t.sourceLocale) && e.push("Target locales cannot include the source locale."), t.includeSourceHash || e.push("Conflict detection is weaker when source hashes are excluded."), e;
}
function Z(t) {
  const e = {};
  if (!t) return e;
  for (const a of t.results) e[a.index] = a.status === "success" ? "accepted" : "rejected";
  return e;
}
function J(t, e) {
  const a = {};
  for (const [s, i] of t.entries()) a[typeof i.index == "number" ? i.index : s] = "apply";
  if (!e) return a;
  for (const s of e.results) a[s.index] = s.status === "success" ? "apply" : "skip";
  return a;
}
function N(t) {
  const e = /* @__PURE__ */ new Map();
  for (const a of t?.results ?? []) e.set(a.index, a);
  return e;
}
function R(t) {
  return t?.result ? {
    ...A({
      ...t.result,
      job: t
    }),
    job: t
  } : null;
}
function tt(t) {
  const e = String(t ?? "").match(/^data:([^,]*?),(.*)$/i);
  if (!e) return "";
  const [, a, s] = e;
  if (a.includes(";base64")) {
    const i = typeof window < "u" && typeof window.atob == "function" ? window.atob.bind(window) : typeof globalThis.atob == "function" ? globalThis.atob.bind(globalThis) : null;
    if (!i) return "";
    const n = i(s);
    return decodeURIComponent(Array.from(n).map((r) => `%${r.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  }
  return decodeURIComponent(s);
}
function v(t, e) {
  return {
    ...t,
    index: typeof t.index == "number" ? t.index : e
  };
}
var at = class {
  constructor(t, e = {}, a) {
    this.root = null, this.step = "export", this.exportState = {
      draft: {
        resources: ["pages"],
        sourceLocale: "en",
        targetLocales: ["es", "fr"],
        includeSourceHash: !0
      },
      status: "idle",
      job: null,
      downloadHref: "",
      downloadLabel: "",
      message: ""
    }, this.validateState = {
      upload: g({ state: "idle" }),
      file: null,
      parsedRows: [],
      result: null,
      decisions: {},
      status: "idle",
      message: ""
    }, this.applyState = {
      rows: [],
      sourceLabel: "",
      retryJobId: "",
      resolutions: {},
      allowCreateMissing: !1,
      allowSourceHashOverride: !1,
      continueOnError: !0,
      dryRun: !1,
      status: "idle",
      message: "",
      result: null,
      job: null
    }, this.historyState = {
      status: "idle",
      response: null,
      kind: "all",
      jobStatus: "all",
      selectedJobId: "",
      message: ""
    }, this.handleClick = (s) => {
      const i = s.target;
      if (!i) return;
      const n = i.closest("[data-exchange-step]");
      if (n) {
        this.step = n.dataset.exchangeStep, this.render(), this.step === "history" && this.historyState.status === "idle" && this.loadHistory();
        return;
      }
      const r = i.closest("[data-stage-row]");
      if (r) {
        const c = Number(r.dataset.stageRow ?? "-1"), p = r.dataset.stageDecision;
        c >= 0 && (p === "accepted" || p === "rejected") && (this.validateState.decisions[c] = p, this.applyState.resolutions[c] = p === "accepted" ? "apply" : "skip", this.render());
        return;
      }
      const l = i.closest("[data-apply-row]");
      if (l) {
        const c = Number(l.dataset.applyRow ?? "-1"), p = l.dataset.applyDecision;
        c >= 0 && p && (this.applyState.resolutions[c] = p, this.render());
        return;
      }
      if (i.closest("[data-history-refresh]")) {
        this.loadHistory(!0);
        return;
      }
      const d = i.closest("[data-history-job]");
      if (d) {
        this.historyState.selectedJobId = String(d.dataset.historyJob ?? "").trim(), this.render();
        return;
      }
      const h = i.closest("[data-history-load-apply]");
      if (h) {
        const c = this.activeHistoryJob();
        if (!c) return;
        const p = h.dataset.historyLoadApply === "conflicts";
        this.loadHistoryJobIntoApply(c, p);
      }
    }, this.handleChange = (s) => {
      const i = s.target;
      if (i) {
        if (i.matches('[data-export-form="true"] input, [data-export-form="true"] select')) {
          const n = i.closest("form");
          n && (this.exportState.draft = this.readExportDraft(n), this.render());
          return;
        }
        if (i.id === "exchange-import-file" && i instanceof HTMLInputElement) {
          const n = i.files?.[0] ?? null;
          this.stageImportFile(n);
          return;
        }
        if (i.matches("[data-history-kind]")) {
          this.historyState.kind = i.value || "all", this.render();
          return;
        }
        if (i.matches("[data-history-status]")) {
          this.historyState.jobStatus = i.value || "all", this.render();
          return;
        }
        if (i.matches("[data-apply-option]")) {
          const n = String(i.dataset.applyOption ?? ""), r = i instanceof HTMLInputElement ? i.checked === !0 : !1;
          switch (n) {
            case "allowCreateMissing":
              this.applyState.allowCreateMissing = r;
              break;
            case "allowSourceHashOverride":
              this.applyState.allowSourceHashOverride = r;
              break;
            case "continueOnError":
              this.applyState.continueOnError = r;
              break;
            case "dryRun":
              this.applyState.dryRun = r;
              break;
            default:
              return;
          }
          this.render();
        }
      }
    }, this.handleSubmit = (s) => {
      const i = s.target;
      if (i) {
        if (i.matches('[data-export-form="true"]')) {
          s.preventDefault(), this.submitExport(i);
          return;
        }
        if (i.matches('[data-validate-form="true"]')) {
          s.preventDefault(), this.submitValidate();
          return;
        }
        i.matches('[data-apply-form="true"]') && (s.preventDefault(), this.submitApply());
      }
    }, this.config = t, this.selectors = {
      ...q,
      ...e
    }, this.toast = a ?? window.toastManager ?? null;
  }
  init() {
    this.root = document.querySelector(this.selectors.root), this.root && (this.root.addEventListener("click", this.handleClick), this.root.addEventListener("change", this.handleChange), this.root.addEventListener("submit", this.handleSubmit), this.render(), this.loadHistory());
  }
  destroy() {
    this.root?.removeEventListener("click", this.handleClick), this.root?.removeEventListener("change", this.handleChange), this.root?.removeEventListener("submit", this.handleSubmit);
  }
  get historyEndpoint() {
    return this.config.historyPath ?? `${this.config.apiPath}/jobs`;
  }
  get includeExamples() {
    return this.config.includeExamples !== !1;
  }
  buildApplyRequest(t, e = {}) {
    return {
      rows: t,
      allow_create_missing: e.allow_create_missing === !0,
      allow_source_hash_override: e.allow_source_hash_override === !0,
      continue_on_error: e.continue_on_error === !0,
      dry_run: e.dry_run === !0,
      async: e.async !== !1,
      retry_job_id: typeof e.retry_job_id == "string" ? e.retry_job_id : void 0,
      resolutions: Array.isArray(e.resolutions) ? e.resolutions : void 0
    };
  }
  async applyImport(t) {
    this.emitAnalytics("exchange_apply_start", {
      row_count: t.rows.length,
      allow_create_missing: t.allow_create_missing,
      allow_source_hash_override: t.allow_source_hash_override,
      continue_on_error: t.continue_on_error,
      dry_run: t.dry_run,
      retry_job_id: t.retry_job_id
    }), Array.isArray(t.resolutions) && t.resolutions.length > 0 && this.emitAnalytics("exchange_conflict_resolved", {
      row_count: t.rows.length,
      resolution_count: t.resolutions.length
    }), t.retry_job_id && this.emitAnalytics("exchange_apply_retry", {
      retry_job_id: t.retry_job_id,
      row_count: t.rows.length
    });
    const e = await this.postJSON(`${this.config.apiPath}/import/apply`, {
      ...t,
      async: t.async !== !1
    }), a = A(e);
    return a.job && this.loadHistory(!0), this.emitAnalytics("exchange_apply_completion", {
      processed: a.summary.processed,
      succeeded: a.summary.succeeded,
      failed: a.summary.failed,
      conflicts: a.summary.conflicts ?? 0,
      status: a.job?.status ?? "completed"
    }), {
      ...a,
      job: a.job,
      meta: e.meta && typeof e.meta == "object" ? e.meta : void 0
    };
  }
  async pollJobUntilTerminal(t, e = {}) {
    const a = typeof t == "string" ? t : t.poll_endpoint;
    if (!a) throw new Error("Poll endpoint is required.");
    const s = e.intervalMs ?? 250, i = e.timeoutMs ?? 15e3, n = Date.now();
    let r = 0;
    for (; ; ) {
      if (e.signal?.aborted) throw new Error("Polling aborted.");
      r > 0 && this.emitAnalytics("exchange_apply_retry", {
        poll_endpoint: a,
        attempt: r
      });
      const l = await this.fetchJSON(a), d = T(l.job && typeof l.job == "object" ? l.job : l);
      if (!d) throw new Error("Job payload missing.");
      if (e.onTick?.(d, r), d.status !== "running")
        return this.emitAnalytics("exchange_apply_completion", {
          job_id: d.id,
          status: d.status,
          processed: d.progress.processed,
          failed: d.progress.failed
        }), d;
      if (Date.now() - n >= i) throw new Error("Polling timed out.");
      r += 1, await Y(s);
    }
  }
  readExportDraft(t) {
    const e = new FormData(t);
    return {
      resources: e.getAll("resources").map(String),
      sourceLocale: String(e.get("source_locale") ?? "en"),
      targetLocales: e.getAll("target_locales").map(String),
      includeSourceHash: e.has("include_source_hash")
    };
  }
  async submitExport(t) {
    const e = this.readExportDraft(t);
    this.exportState.draft = e;
    const a = O(e);
    if (e.resources.length === 0 || e.targetLocales.length === 0 || a.some((s) => s.includes("cannot include"))) {
      this.exportState.status = "error", this.exportState.message = a[0] ?? "Complete the export filters before continuing.", this.render();
      return;
    }
    this.exportState.status = "submitting", this.exportState.message = "Preparing export package...", this.render();
    try {
      const s = await this.postJSON(`${this.config.apiPath}/export`, {
        filter: {
          resources: e.resources,
          source_locale: e.sourceLocale,
          target_locales: e.targetLocales,
          include_source_hash: e.includeSourceHash
        },
        async: !0
      }), i = s.job && typeof s.job == "object" ? s.job : s.data && typeof s.data == "object" ? s.data.job : void 0, n = Array.isArray(s.rows) ? s.rows : s.data && typeof s.data == "object" && Array.isArray(s.data.rows) ? s.data.rows ?? [] : [], r = T(i);
      if (this.exportState.job = r, r?.status === "running") {
        this.exportState.status = "polling", this.exportState.message = "Export job running. Polling for artifact...", this.render();
        const l = await this.pollJobUntilTerminal(r, {
          intervalMs: 250,
          timeoutMs: 15e3,
          onTick: (d) => {
            this.exportState.job = d, this.exportState.message = `Export job running: ${d.progress.processed} / ${d.progress.total ?? 0} processed.`, this.render();
          }
        });
        this.exportState.job = l;
      }
      this.exportState.downloadHref = X(this.exportState.job, "artifact") || this.createRowsDownload(n), this.exportState.downloadLabel = Q(this.exportState.job, "artifact") || "Download export JSON", this.exportState.status = "completed", this.exportState.message = `${this.exportState.job?.summary?.row_count ?? s.row_count ?? 0} rows ready for handoff.`, this.toast?.success(this.exportState.message), this.loadHistory(!0);
    } catch (s) {
      const i = s instanceof Error ? s.message : "Export failed.";
      this.exportState.status = "error", this.exportState.message = i, this.toast?.error(i);
    }
    this.render();
  }
  async stageImportFile(t) {
    if (this.validateState.file = t, this.validateState.parsedRows = [], this.validateState.result = null, this.validateState.decisions = {}, this.applyState = {
      ...this.applyState,
      rows: [],
      sourceLabel: "",
      retryJobId: "",
      resolutions: {},
      status: "idle",
      result: null,
      job: null,
      message: t ? "Reading import file..." : ""
    }, this.validateState.upload = g({
      state: t ? "uploading" : "idle",
      filename: t?.name,
      format: t?.name.endsWith(".csv") ? "csv" : "json",
      message: t ? "Reading import file..." : ""
    }), this.validateState.status = t ? "loading_file" : "idle", this.validateState.message = t ? "Reading import file..." : "", this.render(), !!t) {
      try {
        const e = await this.parseImportFile(t);
        this.validateState.parsedRows = e, this.validateState.upload = g({
          state: "selected",
          filename: t.name,
          format: t.name.endsWith(".csv") ? "csv" : "json",
          row_count: e.length,
          message: "Ready to validate."
        }), this.validateState.status = "idle", this.validateState.message = `${e.length} rows loaded and ready to validate.`, this.applyState.message = "";
      } catch (e) {
        const a = e instanceof Error ? e.message : "Unable to read import file.";
        this.validateState.upload = g({
          state: "error",
          filename: t.name,
          format: t.name.endsWith(".csv") ? "csv" : "json",
          message: a
        }), this.validateState.status = "error", this.validateState.message = a, this.toast?.error(a);
      }
      this.render();
    }
  }
  async submitValidate() {
    if (!this.validateState.file) {
      this.validateState.status = "error", this.validateState.message = "Choose a file before validating.", this.render();
      return;
    }
    this.validateState.status === "loading_file" && await this.stageImportFile(this.validateState.file), this.validateState.status = "validating", this.validateState.message = "Validating translation package...", this.render();
    try {
      const t = new FormData();
      t.set("file", this.validateState.file);
      const e = A(await this.postForm(`${this.config.apiPath}/import/validate`, t));
      this.validateState.result = e, this.validateState.decisions = Z(e), this.validateState.upload = g({
        state: "validated",
        filename: this.validateState.file.name,
        format: this.validateState.file.name.endsWith(".csv") ? "csv" : "json",
        row_count: e.summary.processed
      }), this.validateState.status = "validated", this.validateState.message = "Validation completed. Review conflicts, then continue to apply.", this.applyState = {
        ...this.applyState,
        rows: this.validateState.parsedRows.map(v),
        sourceLabel: this.validateState.file.name,
        retryJobId: "",
        resolutions: J(this.validateState.parsedRows, e),
        status: "ready",
        message: "Validation finished. Configure apply decisions and submit.",
        result: null,
        job: null
      }, this.toast?.info("Validation completed."), this.loadHistory(!0);
    } catch (t) {
      const e = t instanceof Error ? t.message : "Validation failed.";
      this.validateState.status = "error", this.validateState.message = e, this.toast?.error(e);
    }
    this.render();
  }
  async submitApply() {
    if (this.applyState.rows.length === 0) {
      this.applyState.status = "error", this.applyState.message = "Validate a package or load a history job before applying.", this.render();
      return;
    }
    const t = this.buildApplyRequest(this.applyState.rows.map(v), {
      allow_create_missing: this.applyState.allowCreateMissing,
      allow_source_hash_override: this.applyState.allowSourceHashOverride,
      continue_on_error: this.applyState.continueOnError,
      dry_run: this.applyState.dryRun,
      retry_job_id: this.applyState.retryJobId || void 0,
      resolutions: this.buildApplyResolutions()
    });
    this.applyState.status = "submitting", this.applyState.message = t.dry_run ? "Running dry-run apply..." : "Submitting apply job...", this.applyState.result = null, this.render();
    try {
      const e = await this.applyImport(t);
      if (this.applyState.result = e, this.applyState.job = e.job ?? null, e.job?.status === "running") {
        this.applyState.status = "polling", this.applyState.message = "Apply job running. Polling for terminal state...", this.render();
        const a = await this.pollJobUntilTerminal(e.job, {
          intervalMs: 250,
          timeoutMs: 15e3,
          onTick: (s) => {
            this.applyState.job = s, this.applyState.message = `Apply job running: ${s.progress.processed} / ${s.progress.total ?? 0} processed.`, this.render();
          }
        });
        this.applyState.job = a, this.applyState.result = R(a);
      }
      this.applyState.status = "completed", this.applyState.message = this.applyState.dryRun ? "Dry-run apply completed." : "Apply completed.", this.toast?.success(this.applyState.message), this.loadHistory(!0);
    } catch (e) {
      const a = e instanceof Error ? e.message : "Apply failed.";
      this.applyState.status = "error", this.applyState.message = a, this.toast?.error(a);
    }
    this.render();
  }
  buildApplyResolutions() {
    const t = [], e = new Set(this.applyState.rows.map((a, s) => typeof a.index == "number" ? a.index : s));
    for (const [a, s] of Object.entries(this.applyState.resolutions)) {
      const i = Number(a);
      !e.has(i) || !s || s === "apply" || t.push({
        row: i,
        decision: s
      });
    }
    return t.length > 0 ? t : void 0;
  }
  async loadHistory(t = !1) {
    if (!(!t && this.historyState.status === "loading")) {
      this.historyState.status = "loading", this.historyState.message = "Loading history...", this.render();
      try {
        const e = new URL(this.historyEndpoint, window.location.origin);
        this.includeExamples && e.searchParams.set("include_examples", "true");
        const a = await this.fetchJSON(e.pathname + e.search);
        this.historyState.response = M(a), this.historyState.status = "ready", this.historyState.message = "", this.historyState.selectedJobId || (this.historyState.selectedJobId = this.historyState.response.history.items[0]?.id ?? ""), this.historyState.selectedJobId && !this.historyState.response.history.items.some((s) => s.id === this.historyState.selectedJobId) && (this.historyState.selectedJobId = this.historyState.response.history.items[0]?.id ?? "");
      } catch (e) {
        this.historyState.status = "error", this.historyState.message = e instanceof Error ? e.message : "Unable to load history.";
      }
      this.render();
    }
  }
  filteredHistoryItems() {
    return (this.historyState.response?.history.items ?? []).filter((t) => !(this.historyState.kind !== "all" && t.kind !== this.historyState.kind || this.historyState.jobStatus !== "all" && t.status !== this.historyState.jobStatus));
  }
  historyExamples() {
    return (this.historyState.response?.history.items ?? []).filter((t) => t.fixture);
  }
  activeHistoryJob() {
    const t = this.filteredHistoryItems();
    return t.length === 0 ? null : t.find((e) => e.id === this.historyState.selectedJobId) ?? t[0] ?? null;
  }
  async loadHistoryJobIntoApply(t, e) {
    const a = t.downloads?.input?.href ?? t.downloads?.artifact?.href ?? "";
    if (!a) {
      this.toast?.error("Selected history job does not retain an input artifact.");
      return;
    }
    try {
      const s = tt(a);
      let i = String(t.file?.format ?? "json").toLowerCase() === "csv" ? this.parseCSVText(s) : this.parseJSONRows(s);
      i = i.map(v);
      const n = R(t);
      if (e && n) {
        const r = new Set(n.results.filter((l) => l.status === "conflict" || l.status === "error").map((l) => l.index));
        i = i.filter((l, d) => r.has(typeof l.index == "number" ? l.index : d));
      }
      this.applyState = {
        ...this.applyState,
        rows: i,
        sourceLabel: t.file?.name ?? t.id,
        retryJobId: t.id,
        resolutions: J(i, n),
        allowCreateMissing: t.request?.allow_create_missing === !0,
        allowSourceHashOverride: t.request?.allow_source_hash_override === !0,
        continueOnError: t.request?.continue_on_error !== !1,
        dryRun: t.request?.dry_run === !0,
        status: "ready",
        message: e ? "Loaded conflict rows from history into the apply step." : "Loaded history job into the apply step.",
        result: null,
        job: null
      }, this.validateState.result = n, this.step = "apply", this.toast?.info(this.applyState.message);
    } catch (s) {
      const i = s instanceof Error ? s.message : "Unable to load the selected history artifact.";
      this.toast?.error(i);
    }
    this.render();
  }
  createRowsDownload(t) {
    return K("application/json", JSON.stringify(t, null, 2));
  }
  async parseImportFile(t) {
    const e = await this.readFileText(t);
    return ((t.name.toLowerCase().endsWith(".csv") ? "csv" : "json") == "csv" ? this.parseCSVText(e) : this.parseJSONRows(e)).map(v);
  }
  async readFileText(t) {
    const e = t;
    if (typeof e.text == "function") return e.text();
    if (typeof e.arrayBuffer == "function" && typeof TextDecoder < "u") {
      const s = await e.arrayBuffer();
      return new TextDecoder().decode(s);
    }
    const a = typeof window < "u" ? window.FileReader : void 0;
    if (a) return new Promise((s, i) => {
      const n = new a();
      n.onerror = () => i(/* @__PURE__ */ new Error("Unable to read import file.")), n.onload = () => s(String(n.result ?? "")), n.readAsText(t);
    });
    if (typeof Response < "u") return new Response(t).text();
    throw new Error("File text reader is not available in this environment.");
  }
  parseJSONRows(t) {
    const e = JSON.parse(t);
    if (Array.isArray(e)) return e.filter((a) => a !== null && typeof a == "object");
    if (e && typeof e == "object" && Array.isArray(e.rows)) return e.rows.filter((a) => a !== null && typeof a == "object");
    throw new Error("JSON import payload must be an array of rows.");
  }
  parseCSVText(t) {
    const e = t.trim().split(/\r?\n/);
    if (e.length < 2) return [];
    const a = this.parseCSVRecord(e[0]).map((i) => i.trim()), s = [];
    for (const i of e.slice(1)) {
      if (!i.trim()) continue;
      const n = this.parseCSVRecord(i), r = {};
      a.forEach((l, d) => {
        r[l] = n[d] ?? "";
      }), s.push({
        resource: r.resource ?? "",
        entity_id: r.entity_id ?? "",
        family_id: r.family_id ?? "",
        source_locale: r.source_locale ?? "",
        target_locale: r.target_locale ?? "",
        field_path: r.field_path ?? "",
        source_text: r.source_text ?? "",
        translated_text: r.translated_text ?? "",
        source_hash: r.source_hash ?? "",
        path: r.path ?? "",
        title: r.title ?? "",
        status: r.status ?? "",
        notes: r.notes ?? ""
      });
    }
    return s;
  }
  parseCSVRecord(t) {
    const e = [];
    let a = "", s = !1;
    for (let i = 0; i < t.length; i += 1) {
      const n = t[i], r = t[i + 1];
      if (n === '"') {
        if (s && r === '"') {
          a += '"', i += 1;
          continue;
        }
        s = !s;
        continue;
      }
      if (n === "," && !s) {
        e.push(a), a = "";
        continue;
      }
      a += n;
    }
    return e.push(a), e;
  }
  applyDecisionForRow(t) {
    return this.applyState.resolutions[t] ?? "apply";
  }
  validationRowForIndex(t) {
    return N(this.validateState.result).get(t) ?? null;
  }
  rowActions(t, e) {
    const a = ["apply", "skip"], s = e?.metadata ?? {};
    return (e?.conflict?.type === "stale_source_hash" || s.current_source_hash || s.provided_source_hash) && a.push("override_source_hash"), (s.create_translation_hint === !0 || s.create_translation_required === !0) && a.push("create_missing"), a;
  }
  async postJSON(t, e) {
    return this.request(t, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e)
    });
  }
  async postForm(t, e) {
    return this.request(t, {
      method: "POST",
      body: e
    });
  }
  async fetchJSON(t) {
    return this.request(t, { method: "GET" });
  }
  async request(t, e) {
    const a = await fetch(t, e), s = (a.headers.get("content-type") ?? "").includes("json") ? await a.json() : await a.text();
    if (!a.ok) {
      if (s && typeof s == "object") {
        const i = s.error?.message ?? s.message;
        throw new Error(i || "Exchange request failed.");
      }
      throw new Error(typeof s == "string" ? s : "Exchange request failed.");
    }
    return s ?? {};
  }
  emitAnalytics(t, e = {}) {
    if (this.config.telemetryEnabled === !1) return;
    const a = {
      name: t,
      fields: e
    }, s = this.config.analyticsTarget ?? (typeof window < "u" ? window : void 0);
    s && typeof s.dispatchEvent == "function" && s.dispatchEvent(new CustomEvent("translation:exchange-analytics", { detail: a }));
  }
  render() {
    if (!this.root) return;
    const t = O(this.exportState.draft), e = Object.values(this.validateState.decisions).filter((n) => n === "accepted").length, a = Object.values(this.validateState.decisions).filter((n) => n === "rejected").length, s = this.historyExamples(), i = this.filteredHistoryItems();
    this.root.innerHTML = `
      <section class="${V} overflow-hidden">
        <header class="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="${F}">Translation Exchange</p>
              <h1 class="${G}">Translation Exchange Wizard</h1>
              <p class="${W}">Prepare external translation files, validate row-level conflicts, apply imports with explicit create and conflict controls, and inspect retained job history for retries and audits.</p>
            </div>
            <a class="${m}" href="${o(`${this.config.apiPath}/template?format=json`)}">
              Download JSON Template
            </a>
          </div>
          <nav class="mt-5 grid gap-3 md:grid-cols-4" aria-label="Exchange steps">
            ${this.renderStepButton("export", "1. Export", "Filter records, review warnings, and hand off files.")}
            ${this.renderStepButton("validate", "2. Validate", "Upload a package, inspect row outcomes, and stage apply decisions.")}
            ${this.renderStepButton("apply", "3. Apply", "Set explicit conflict/create toggles, poll async progress, and review terminal summaries.")}
            ${this.renderStepButton("history", "4. History", "Inspect retained job details, row results, and retry from prior runs.")}
          </nav>
        </header>
        <div class="p-6 space-y-6">
          ${this.step === "export" ? this.renderExportStep(t, s) : ""}
          ${this.step === "validate" ? this.renderValidateStep(e, a, s) : ""}
          ${this.step === "apply" ? this.renderApplyStep() : ""}
          ${this.step === "history" ? this.renderHistoryStep(i) : ""}
        </div>
      </section>
    `;
  }
  renderStepButton(t, e, a) {
    return `
      <button
        type="button"
        data-exchange-step="${t}"
        class="rounded-xl border px-4 py-4 text-left transition ${this.step === t ? "border-blue-400 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}"
      >
        <div class="text-sm font-semibold text-gray-900">${o(e)}</div>
        <p class="mt-1 text-sm text-gray-600">${o(a)}</p>
      </button>
    `;
  }
  renderExampleLinks(t) {
    return t.length === 0 ? "" : `
      <section class="space-y-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Seeded Examples</h2>
          <p class="mt-1 text-sm text-gray-600">Use the stable demo artifacts to exercise the wizard and end-to-end coverage.</p>
        </div>
        <div class="grid gap-3 md:grid-cols-2">${t.map((e) => {
      const a = Object.values(e.downloads ?? {}).map((s) => `
              <a class="text-sm font-medium text-blue-700 hover:text-blue-900" href="${o(s.href)}" download="${o(s.filename)}">
                ${o(s.label)}
              </a>`).join("");
      return `
          <article class="${j}">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">${o(e.kind.replace(/_/g, " "))}</p>
                <p class="text-xs text-gray-600">${o(e.file?.name ?? "Seeded example")}</p>
              </div>
              <span class="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">Fixture</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-3">${a}</div>
          </article>
        `;
    }).join("")}</div>
      </section>
    `;
  }
  renderExportStep(t, e) {
    const a = this.exportState.job;
    return `
      ${this.renderExampleLinks(e.filter((s) => s.kind === "export"))}
      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form data-export-form="true" class="space-y-5 ${y}">
          <div class="grid gap-5 md:grid-cols-2">
            <fieldset>
              <legend class="text-sm font-semibold text-gray-900">Resources</legend>
              <div class="mt-3 space-y-2">
                ${["pages", "posts"].map((s) => `
                  <label class="flex items-center gap-3 text-sm text-gray-700">
                    <input type="checkbox" class="${x}" name="resources" value="${s}" ${this.exportState.draft.resources.includes(s) ? "checked" : ""}>
                    <span>${s}</span>
                  </label>`).join("")}
              </div>
            </fieldset>
            <label class="block text-sm font-semibold text-gray-900">
              Source locale
              <select name="source_locale" class="mt-3 ${_}">
                ${[
      "en",
      "es",
      "fr",
      "de"
    ].map((s) => `
                  <option value="${s}" ${this.exportState.draft.sourceLocale === s ? "selected" : ""}>${s.toUpperCase()}</option>`).join("")}
              </select>
            </label>
          </div>
          <fieldset>
            <legend class="text-sm font-semibold text-gray-900">Target locales</legend>
            <div class="mt-3 flex flex-wrap gap-3">
              ${[
      "es",
      "fr",
      "de",
      "it"
    ].map((s) => `
                <label class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input type="checkbox" class="${x}" name="target_locales" value="${s}" ${this.exportState.draft.targetLocales.includes(s) ? "checked" : ""}>
                  <span>${s.toUpperCase()}</span>
                </label>`).join("")}
            </div>
          </fieldset>
          <label class="flex items-center gap-3 ${D} text-sm text-gray-700">
            <input type="checkbox" class="${x}" name="include_source_hash" ${this.exportState.draft.includeSourceHash ? "checked" : ""}>
            <span>Include source hashes so validate and apply can detect stale source drift.</span>
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button class="${E}" type="submit">Create export package</button>
            <span class="text-sm text-gray-600">${o(this.exportState.message)}</span>
          </div>
        </form>
        <aside class="space-y-4 ${C}">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Preflight</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              ${[
      ["Resources", this.exportState.draft.resources.length],
      ["Targets", this.exportState.draft.targetLocales.length],
      ["Planned handoffs", this.exportState.draft.resources.length * this.exportState.draft.targetLocales.length]
    ].map(([s, i]) => `
                <div class="rounded-xl bg-white px-4 py-3">
                  <div class="${f}">${o(s)}</div>
                  <div class="mt-1 text-2xl font-semibold text-gray-900">${o(i)}</div>
                </div>`).join("")}
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Warnings</h3>
            <ul class="mt-3 space-y-2 text-sm text-gray-600">
              ${(t.length > 0 ? t : ["Filters are coherent. Ready to export."]).map((s) => `
                <li class="rounded-xl bg-white px-3 py-2">${o(s)}</li>`).join("")}
            </ul>
          </div>
          ${a ? `
              <div class="${z}">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">Latest export job</p>
                    <p class="text-xs text-gray-500">${o(a.id)}</p>
                  </div>
                  <span class="${u(k(a.status))}">${o(a.status)}</span>
                </div>
                <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div class="h-full bg-blue-500" style="width: ${H(a)}%"></div>
                </div>
                <div class="mt-3 text-sm text-gray-600">${o(a.progress.processed)} / ${o(a.progress.total ?? 0)} rows prepared</div>
                ${this.exportState.downloadHref ? `<a class="mt-4 inline-flex text-sm font-medium text-blue-700 hover:text-blue-900" href="${o(this.exportState.downloadHref)}" download>${o(this.exportState.downloadLabel)}</a>` : ""}
              </div>` : ""}
        </aside>
      </section>
    `;
  }
  renderValidateStep(t, e, a) {
    const s = this.validateState.result, i = s?.results ?? [];
    return `
      ${this.renderExampleLinks(a.filter((n) => n.kind === "import_validate"))}
      <section class="space-y-5 ${y}">
        <form data-validate-form="true" class="space-y-4">
          <div class="${C}">
            <label class="text-sm font-semibold text-gray-900" for="exchange-import-file">Validation file</label>
            <input id="exchange-import-file" type="file" accept=".json,.csv" class="mt-3 block w-full text-sm text-gray-700">
            <p class="mt-2 text-sm text-gray-600">${o(this.validateState.upload.filename ?? "Choose a JSON or CSV package exported for translators.")}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="${E}" type="submit">Validate package</button>
            <button class="${m}" type="button" data-exchange-step="apply" ${this.applyState.rows.length === 0 ? "disabled" : ""}>Continue to apply</button>
            <span class="text-sm text-gray-600">${o(this.validateState.message)}</span>
          </div>
        </form>
        ${s ? `
            <section class="space-y-4">
              <div class="grid gap-3 md:grid-cols-4">
                ${[
      ["Processed", s.summary.processed],
      ["Succeeded", s.summary.succeeded],
      ["Conflicts", s.summary.conflicts ?? 0],
      ["Failed", s.summary.failed]
    ].map(([n, r]) => `
                  <div class="rounded-xl bg-gray-50 px-4 py-3">
                    <div class="${f}">${o(n)}</div>
                    <div class="mt-1 text-2xl font-semibold text-gray-900">${o(r)}</div>
                  </div>`).join("")}
              </div>
              <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Staged decisions: ${o(t)} accepted, ${o(e)} rejected.
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                  <thead class="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                    <tr>
                      <th class="px-4 py-3">Row</th>
                      <th class="px-4 py-3">Field</th>
                      <th class="px-4 py-3">Locale</th>
                      <th class="px-4 py-3">Status</th>
                      <th class="px-4 py-3">Stage</th>
                      <th class="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 bg-white">
                    ${i.map((n) => `
                      <tr>
                        <td class="px-4 py-3 font-medium text-gray-900">${o(n.index)}</td>
                        <td class="px-4 py-3 text-gray-700">${o(`${n.resource}.${n.field_path}`)}</td>
                        <td class="px-4 py-3 text-gray-700">${o(n.target_locale.toUpperCase())}</td>
                        <td class="px-4 py-3"><span class="${u(b(n.status))}">${o(n.status)}</span></td>
                        <td class="px-4 py-3">
                          <div class="flex gap-2">
                            ${this.renderDecisionButton(n.index, "accepted", this.validateState.decisions[n.index] === "accepted")}
                            ${this.renderDecisionButton(n.index, "rejected", this.validateState.decisions[n.index] === "rejected")}
                          </div>
                        </td>
                        <td class="px-4 py-3 text-gray-600">${o(n.conflict?.message ?? n.error ?? "Ready for apply.")}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </section>` : ""}
      </section>
    `;
  }
  renderDecisionButton(t, e, a) {
    return `
      <button
        type="button"
        data-stage-row="${t}"
        data-stage-decision="${e}"
        class="rounded-lg border px-3 py-1 text-xs font-medium ${a ? "border-blue-500 bg-blue-100 text-blue-900" : "border-gray-200 bg-white text-gray-600"}"
      >
        ${o(e)}
      </button>
    `;
  }
  renderApplyStep() {
    const t = this.applyState.rows, e = N(this.validateState.result), a = this.applyState.result, s = a?.results ?? [], i = this.applyState.job, n = {
      apply: 0,
      skip: 0,
      override: 0,
      create: 0
    };
    for (const r of t) {
      const l = this.applyDecisionForRow(Number(r.index ?? 0));
      l === "skip" && (n.skip += 1), l === "override_source_hash" && (n.override += 1), l === "create_missing" && (n.create += 1), l === "apply" && (n.apply += 1);
    }
    return `
      <section class="space-y-5">
        <form data-apply-form="true" class="space-y-5 ${y}">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Apply import package</h2>
              <p class="mt-1 text-sm text-gray-600">${o(this.applyState.sourceLabel || "Validate a package or load a history job to begin.")}</p>
            </div>
            ${this.applyState.retryJobId ? `<span class="${u("warning")}">Retry source: ${o(this.applyState.retryJobId)}</span>` : ""}
          </div>
          <div class="grid gap-3 md:grid-cols-4">
            ${[
      ["Apply", n.apply],
      ["Skip", n.skip],
      ["Override", n.override],
      ["Create", n.create]
    ].map(([r, l]) => `
              <div class="rounded-xl bg-gray-50 px-4 py-3">
                <div class="${f}">${o(r)}</div>
                <div class="mt-1 text-2xl font-semibold text-gray-900">${o(l)}</div>
              </div>`).join("")}
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            ${this.renderApplyToggle("allowCreateMissing", "Create missing locale variants during apply", this.applyState.allowCreateMissing)}
            ${this.renderApplyToggle("allowSourceHashOverride", "Override stale source hash conflicts during apply", this.applyState.allowSourceHashOverride)}
            ${this.renderApplyToggle("continueOnError", "Continue on row-level errors", this.applyState.continueOnError)}
            ${this.renderApplyToggle("dryRun", "Dry-run only (no writes)", this.applyState.dryRun)}
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="${E}" type="submit" ${t.length === 0 ? "disabled" : ""}>Submit apply job</button>
            <button class="${m}" type="button" data-exchange-step="history">Inspect history</button>
            <span class="text-sm text-gray-600">${o(this.applyState.message)}</span>
          </div>
          ${i ? `
                <div class="${j}">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-gray-900">Job progress</p>
                      <p class="text-xs text-gray-500">${o(i.id)}</p>
                    </div>
                    <span class="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">${o(i.status)}</span>
                  </div>
                  <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div class="h-full bg-blue-500" style="width: ${H(i)}%"></div>
                  </div>
                  <div class="mt-3 text-sm text-gray-600">${o(i.progress.processed)} / ${o(i.progress.total ?? 0)} processed</div>
                </div>` : ""}
        </form>
        ${t.length > 0 ? `
              <section class="${y}">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Row Decisions</h3>
                    <p class="mt-1 text-sm text-gray-600">Conflict rows can be skipped or explicitly overridden before apply.</p>
                  </div>
                </div>
                <div class="mt-4 overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th class="px-4 py-3">Row</th>
                        <th class="px-4 py-3">Field</th>
                        <th class="px-4 py-3">Status</th>
                        <th class="px-4 py-3">Decision</th>
                        <th class="px-4 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 bg-white">
                      ${t.map((r, l) => {
      const d = typeof r.index == "number" ? r.index : l, h = e.get(d) ?? null;
      return `
                          <tr>
                            <td class="px-4 py-3 font-medium text-gray-900">${o(d)}</td>
                            <td class="px-4 py-3 text-gray-700">${o(`${r.resource}.${r.field_path}`)}</td>
                            <td class="px-4 py-3"><span class="${u(b(h?.status ?? "staged"))}">${o(h?.status ?? "staged")}</span></td>
                            <td class="px-4 py-3">
                              <div class="flex flex-wrap gap-2">
                                ${this.rowActions(d, h).map((c) => this.renderApplyDecisionButton(d, c, this.applyDecisionForRow(d) === c)).join("")}
                              </div>
                            </td>
                            <td class="px-4 py-3 text-gray-600">${o(h?.conflict?.message ?? h?.error ?? "Ready for apply.")}</td>
                          </tr>`;
    }).join("")}
                    </tbody>
                  </table>
                </div>
              </section>` : ""}
        ${a ? `
              <section class="${y} space-y-4">
                <div>
                  <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Terminal Summary</h3>
                  <p class="mt-1 text-sm text-gray-600">Review row outcomes and retained downloads before closing the loop.</p>
                </div>
                <div class="grid gap-3 md:grid-cols-4">
                  ${[
      ["Processed", a.summary.processed],
      ["Succeeded", a.summary.succeeded],
      ["Conflicts", a.summary.conflicts ?? 0],
      ["Failed", a.summary.failed]
    ].map(([r, l]) => `
                    <div class="rounded-xl bg-gray-50 px-4 py-3">
                      <div class="${f}">${o(r)}</div>
                      <div class="mt-1 text-2xl font-semibold text-gray-900">${o(l)}</div>
                    </div>`).join("")}
                </div>
                <div class="flex flex-wrap gap-3 text-sm text-blue-700">
                  ${Object.values(a.job?.downloads ?? {}).map((r) => `
                    <a href="${o(r.href)}" download="${o(r.filename)}" class="font-medium hover:text-blue-900">${o(r.label)}</a>
                  `).join("")}
                </div>
                <div class="overflow-x-auto">
                  <table class="min-w-full divide-y divide-gray-200 text-sm">
                    <thead class="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th class="px-4 py-3">Row</th>
                        <th class="px-4 py-3">Field</th>
                        <th class="px-4 py-3">Status</th>
                        <th class="px-4 py-3">Decision</th>
                        <th class="px-4 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 bg-white">
                      ${s.map((r) => `
                        <tr>
                          <td class="px-4 py-3 font-medium text-gray-900">${o(r.index)}</td>
                          <td class="px-4 py-3 text-gray-700">${o(`${r.resource}.${r.field_path}`)}</td>
                          <td class="px-4 py-3"><span class="${u(b(r.status))}">${o(r.status)}</span></td>
                          <td class="px-4 py-3 text-gray-600">${o(String(r.metadata?.resolution_decision ?? "apply"))}</td>
                          <td class="px-4 py-3 text-gray-600">${o(r.conflict?.message ?? r.error ?? "Applied without conflict.")}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </section>` : ""}
      </section>
    `;
  }
  renderApplyToggle(t, e, a) {
    return `
      <label class="flex items-center gap-3 ${D} text-sm text-gray-700">
        <input type="checkbox" class="${x}" data-apply-option="${t}" ${a ? "checked" : ""}>
        <span>${o(e)}</span>
      </label>
    `;
  }
  renderApplyDecisionButton(t, e, a) {
    return `
      <button
        type="button"
        data-apply-row="${t}"
        data-apply-decision="${e}"
        class="rounded-lg border px-3 py-1 text-xs font-medium ${a ? "border-blue-500 bg-blue-100 text-blue-900" : "border-gray-200 bg-white text-gray-600"}"
      >
        ${o({
      apply: "apply",
      skip: "skip",
      override_source_hash: "override source",
      create_missing: "create missing"
    }[e])}
      </button>
    `;
  }
  renderHistoryStep(t) {
    const e = this.historyState.response?.meta, a = e?.job_kinds ?? [
      "export",
      "import_validate",
      "import_apply"
    ], s = e?.job_statuses ?? [
      "running",
      "completed",
      "failed"
    ], i = this.activeHistoryJob(), n = R(i);
    return `
      <section class="space-y-5">
        <div class="flex flex-wrap items-end gap-3 ${y}">
          <label class="text-sm font-medium text-gray-700">
            Kind
            <select data-history-kind class="mt-2 ${_}">
              <option value="all">All</option>
              ${a.map((r) => `
                <option value="${o(r)}" ${this.historyState.kind === r ? "selected" : ""}>${o(r)}</option>`).join("")}
            </select>
          </label>
          <label class="text-sm font-medium text-gray-700">
            Status
            <select data-history-status class="mt-2 ${_}">
              <option value="all">All</option>
              ${s.map((r) => `
                <option value="${o(r)}" ${this.historyState.jobStatus === r ? "selected" : ""}>${o(r)}</option>`).join("")}
            </select>
          </label>
          <button class="${m}" type="button" data-history-refresh="true">Refresh history</button>
          <span class="text-sm text-gray-600">${o(this.historyState.message)}</span>
        </div>
        <div class="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div class="grid gap-4">
            ${t.length > 0 ? t.map((r) => `
                  <article class="rounded-xl border p-5 ${i?.id === r.id ? "border-blue-300 bg-blue-50/50" : "border-gray-200 bg-white"}">
                    <button type="button" data-history-job="${o(r.id)}" class="w-full text-left">
                      <div class="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="${u("info")}">${o(r.kind.replace(/_/g, " "))}</span>
                            <span class="${u(k(r.status))}">${o(r.status)}</span>
                            ${r.fixture ? `<span class="${u("warning")}">Fixture</span>` : ""}
                          </div>
                          <h3 class="mt-3 text-lg font-semibold text-gray-900">${o(r.file?.name ?? r.id)}</h3>
                          <p class="mt-1 text-sm text-gray-600">Actor ${o(r.actor?.label ?? "system")} • ${o(I(r.created_at))}</p>
                        </div>
                        <div class="text-sm text-gray-600">
                          <div>${o(r.progress.processed)} / ${o(r.progress.total ?? 0)} processed</div>
                          <div>${o(r.file?.format ?? "json").toUpperCase()} package</div>
                        </div>
                      </div>
                    </button>
                  </article>`).join("") : `<div class="${L}">No jobs match the current filters.</div>`}
          </div>
          ${i ? `
                <section class="${y} space-y-4">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 class="text-lg font-semibold text-gray-900">${o(i.file?.name ?? i.id)}</h2>
                      <p class="mt-1 text-sm text-gray-600">${o(i.kind.replace(/_/g, " "))} • ${o(i.status)} • ${o(I(i.updated_at))}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      <button class="${m}" type="button" data-history-load-apply="all">Load in apply step</button>
                      <button class="${m}" type="button" data-history-load-apply="conflicts" ${(n?.summary.conflicts ?? 0) > 0 ? "" : "disabled"}>Retry conflicts</button>
                    </div>
                  </div>
                  <div class="grid gap-3 md:grid-cols-4">
                    ${[
      ["Processed", i.progress.processed],
      ["Succeeded", i.progress.succeeded],
      ["Conflicts", i.progress.conflicts ?? n?.summary.conflicts ?? 0],
      ["Failed", i.progress.failed]
    ].map(([r, l]) => `
                      <div class="rounded-xl bg-gray-50 px-4 py-3">
                        <div class="${f}">${o(r)}</div>
                        <div class="mt-1 text-2xl font-semibold text-gray-900">${o(l)}</div>
                      </div>`).join("")}
                  </div>
                  <div class="${j} text-sm text-gray-700">
                    <div><span class="font-semibold text-gray-900">Request hash:</span> ${o(i.request_hash ?? "n/a")}</div>
                    <div><span class="font-semibold text-gray-900">Request ID:</span> ${o(i.request_id ?? "n/a")}</div>
                    <div><span class="font-semibold text-gray-900">Trace ID:</span> ${o(i.trace_id ?? "n/a")}</div>
                  </div>
                  <div class="flex flex-wrap gap-3 text-sm text-blue-700">
                    ${Object.values(i.downloads ?? {}).map((r) => `
                      <a href="${o(r.href)}" download="${o(r.filename)}" class="font-medium hover:text-blue-900">${o(r.label)}</a>`).join("")}
                  </div>
                  ${n ? `
                        <div class="overflow-x-auto">
                          <table class="min-w-full divide-y divide-gray-200 text-sm">
                            <thead class="bg-gray-50 text-left text-xs uppercase tracking-wider text-gray-500">
                              <tr>
                                <th class="px-4 py-3">Row</th>
                                <th class="px-4 py-3">Field</th>
                                <th class="px-4 py-3">Status</th>
                                <th class="px-4 py-3">Decision</th>
                                <th class="px-4 py-3">Details</th>
                              </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 bg-white">
                              ${n.results.map((r) => `
                                <tr>
                                  <td class="px-4 py-3 font-medium text-gray-900">${o(r.index)}</td>
                                  <td class="px-4 py-3 text-gray-700">${o(`${r.resource}.${r.field_path}`)}</td>
                                  <td class="px-4 py-3"><span class="${u(b(r.status))}">${o(r.status)}</span></td>
                                  <td class="px-4 py-3 text-gray-600">${o(String(r.metadata?.resolution_decision ?? "apply"))}</td>
                                  <td class="px-4 py-3 text-gray-600">${o(r.conflict?.message ?? r.error ?? "Completed without conflict.")}</td>
                                </tr>`).join("")}
                            </tbody>
                          </table>
                        </div>` : `<div class="${L}">No per-row results were retained for this job.</div>`}
                </section>` : ""}
        </div>
      </section>
    `;
  }
};
export {
  at as TranslationExchangeManager,
  M as normalizeTranslationExchangeHistoryResponse,
  T as normalizeTranslationExchangeJob,
  g as normalizeTranslationExchangeUploadDescriptor,
  A as normalizeTranslationExchangeValidationResult
};

//# sourceMappingURL=index.js.map