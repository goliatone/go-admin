import { escapeHTML as o } from "../shared/html.js";
import { readHTTPResponsePayload as U } from "../shared/transport/http-client.js";
import { n as x, a as k, b as C, c as V } from "../chunks/index-YiVxcMWC.js";
import { C as B, H as W, T as z, a as q, B as f, R as $, b as _, c as E, d as F, I as j, e as v, f as R, g as G } from "../chunks/style-constants-i2xRoO1L.js";
import { formatTranslationShortDateTime as D } from "../translation-shared/formatters.js";
const K = {
  root: "#translation-exchange-app"
};
function L(l) {
  switch (l) {
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
function S(l) {
  switch (l) {
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
function y(l) {
  return `rounded-full px-3 py-1 text-xs font-medium ${G(l)}`;
}
const m = `${F} p-5`, Y = `${F} p-4`, I = `${$} border ${_} ${E} p-5`, A = `${$} border ${_} ${E} p-4`, H = `${$} border ${_} ${E} px-4 py-3`, O = `${$} border ${_} ${E} px-6 py-10 text-center text-sm text-gray-600`, b = "text-xs uppercase tracking-wider text-gray-500", X = `mt-2 text-2xl font-bold ${z}`;
function Q(l, t) {
  const e = typeof window < "u" && typeof window.btoa == "function" ? window.btoa.bind(window) : typeof globalThis.btoa == "function" ? globalThis.btoa.bind(globalThis) : null;
  return e ? `data:${l};base64,${e(
    encodeURIComponent(t).replace(
      /%([0-9A-F]{2})/g,
      (a, s) => String.fromCharCode(parseInt(s, 16))
    )
  )}` : `data:${l},${encodeURIComponent(t)}`;
}
function Z(l) {
  return new Promise((t) => setTimeout(t, Math.max(0, l)));
}
function J(l) {
  return !l || !l.progress.total || l.progress.total <= 0 ? 0 : Math.max(
    0,
    Math.min(100, Math.round(l.progress.processed / l.progress.total * 100))
  );
}
function tt(l, t) {
  return l?.downloads ? l.downloads[t]?.href ?? l.downloads.artifact?.href ?? "" : "";
}
function et(l, t) {
  return l?.downloads ? l.downloads[t]?.label ?? l.downloads.artifact?.label ?? "Download artifact" : "";
}
function P(l) {
  const t = [];
  return l.resources.length === 0 && t.push("Select at least one resource."), l.targetLocales.length === 0 && t.push("Select at least one target locale."), l.targetLocales.includes(l.sourceLocale) && t.push("Target locales cannot include the source locale."), l.includeSourceHash || t.push("Conflict detection is weaker when source hashes are excluded."), t;
}
function st(l) {
  const t = {};
  if (!l) return t;
  for (const e of l.results)
    t[e.index] = e.status === "success" ? "accepted" : "rejected";
  return t;
}
function M(l, t) {
  const e = {};
  for (const [a, s] of l.entries())
    e[typeof s.index == "number" ? s.index : a] = "apply";
  if (!t) return e;
  for (const a of t.results)
    e[a.index] = a.status === "success" ? "apply" : "skip";
  return e;
}
function N(l) {
  const t = /* @__PURE__ */ new Map();
  for (const e of l?.results ?? [])
    t.set(e.index, e);
  return t;
}
function T(l) {
  return l?.result ? {
    ...k({
      ...l.result,
      job: l
    }),
    job: l
  } : null;
}
function at(l) {
  const e = String(l ?? "").match(/^data:([^,]*?),(.*)$/i);
  if (!e) return "";
  const [, a, s] = e;
  if (a.includes(";base64")) {
    const i = typeof window < "u" && typeof window.atob == "function" ? window.atob.bind(window) : typeof globalThis.atob == "function" ? globalThis.atob.bind(globalThis) : null;
    if (!i) return "";
    const n = i(s);
    return decodeURIComponent(
      Array.from(n).map((r) => `%${r.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")
    );
  }
  return decodeURIComponent(s);
}
function w(l, t) {
  return {
    ...l,
    index: typeof l.index == "number" ? l.index : t
  };
}
class dt {
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
      upload: x({ state: "idle" }),
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
        const u = Number(r.dataset.stageRow ?? "-1"), h = r.dataset.stageDecision;
        u >= 0 && (h === "accepted" || h === "rejected") && (this.validateState.decisions[u] = h, this.applyState.resolutions[u] = h === "accepted" ? "apply" : "skip", this.render());
        return;
      }
      const c = i.closest("[data-apply-row]");
      if (c) {
        const u = Number(c.dataset.applyRow ?? "-1"), h = c.dataset.applyDecision;
        u >= 0 && h && (this.applyState.resolutions[u] = h, this.render());
        return;
      }
      if (i.closest("[data-history-refresh]")) {
        this.loadHistory(!0);
        return;
      }
      const p = i.closest("[data-history-job]");
      if (p) {
        this.historyState.selectedJobId = String(p.dataset.historyJob ?? "").trim(), this.render();
        return;
      }
      const g = i.closest("[data-history-load-apply]");
      if (g) {
        const u = this.activeHistoryJob();
        if (!u) return;
        const h = g.dataset.historyLoadApply === "conflicts";
        this.loadHistoryJobIntoApply(u, h);
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
    }, this.config = t, this.selectors = { ...K, ...e }, this.toast = a ?? window.toastManager ?? null;
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
    }), a = k(e);
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
    if (!a)
      throw new Error("Poll endpoint is required.");
    const s = e.intervalMs ?? 250, i = e.timeoutMs ?? 15e3, n = Date.now();
    let r = 0;
    for (; ; ) {
      if (e.signal?.aborted)
        throw new Error("Polling aborted.");
      r > 0 && this.emitAnalytics("exchange_apply_retry", {
        poll_endpoint: a,
        attempt: r
      });
      const c = await this.fetchJSON(a), d = C(
        c.job && typeof c.job == "object" ? c.job : c
      );
      if (!d)
        throw new Error("Job payload missing.");
      if (e.onTick?.(d, r), d.status !== "running")
        return this.emitAnalytics("exchange_apply_completion", {
          job_id: d.id,
          status: d.status,
          processed: d.progress.processed,
          failed: d.progress.failed
        }), d;
      if (Date.now() - n >= i)
        throw new Error("Polling timed out.");
      r += 1, await Z(s);
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
    const a = P(e);
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
      }), i = s.job && typeof s.job == "object" ? s.job : s.data && typeof s.data == "object" ? s.data.job : void 0, n = Array.isArray(s.rows) ? s.rows : s.data && typeof s.data == "object" && Array.isArray(s.data.rows) ? s.data.rows ?? [] : [], r = C(i);
      if (this.exportState.job = r, r?.status === "running") {
        this.exportState.status = "polling", this.exportState.message = "Export job running. Polling for artifact...", this.render();
        const c = await this.pollJobUntilTerminal(r, {
          intervalMs: 250,
          timeoutMs: 15e3,
          onTick: (d) => {
            this.exportState.job = d, this.exportState.message = `Export job running: ${d.progress.processed} / ${d.progress.total ?? 0} processed.`, this.render();
          }
        });
        this.exportState.job = c;
      }
      this.exportState.downloadHref = tt(this.exportState.job, "artifact") || this.createRowsDownload(n), this.exportState.downloadLabel = et(this.exportState.job, "artifact") || "Download export JSON", this.exportState.status = "completed", this.exportState.message = `${this.exportState.job?.summary?.row_count ?? s.row_count ?? 0} rows ready for handoff.`, this.toast?.success(this.exportState.message), this.loadHistory(!0);
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
    }, this.validateState.upload = x({
      state: t ? "uploading" : "idle",
      filename: t?.name,
      format: t?.name.endsWith(".csv") ? "csv" : "json",
      message: t ? "Reading import file..." : ""
    }), this.validateState.status = t ? "loading_file" : "idle", this.validateState.message = t ? "Reading import file..." : "", this.render(), !!t) {
      try {
        const e = await this.parseImportFile(t);
        this.validateState.parsedRows = e, this.validateState.upload = x({
          state: "selected",
          filename: t.name,
          format: t.name.endsWith(".csv") ? "csv" : "json",
          row_count: e.length,
          message: "Ready to validate."
        }), this.validateState.status = "idle", this.validateState.message = `${e.length} rows loaded and ready to validate.`, this.applyState.message = "";
      } catch (e) {
        const a = e instanceof Error ? e.message : "Unable to read import file.";
        this.validateState.upload = x({
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
      const e = await this.postForm(`${this.config.apiPath}/import/validate`, t), a = k(e);
      this.validateState.result = a, this.validateState.decisions = st(a), this.validateState.upload = x({
        state: "validated",
        filename: this.validateState.file.name,
        format: this.validateState.file.name.endsWith(".csv") ? "csv" : "json",
        row_count: a.summary.processed
      }), this.validateState.status = "validated", this.validateState.message = "Validation completed. Review conflicts, then continue to apply.", this.applyState = {
        ...this.applyState,
        rows: this.validateState.parsedRows.map(w),
        sourceLabel: this.validateState.file.name,
        retryJobId: "",
        resolutions: M(this.validateState.parsedRows, a),
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
    const t = this.buildApplyRequest(
      this.applyState.rows.map(w),
      {
        allow_create_missing: this.applyState.allowCreateMissing,
        allow_source_hash_override: this.applyState.allowSourceHashOverride,
        continue_on_error: this.applyState.continueOnError,
        dry_run: this.applyState.dryRun,
        retry_job_id: this.applyState.retryJobId || void 0,
        resolutions: this.buildApplyResolutions()
      }
    );
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
        this.applyState.job = a, this.applyState.result = T(a);
      }
      this.applyState.status = "completed", this.applyState.message = this.applyState.dryRun ? "Dry-run apply completed." : "Apply completed.", this.toast?.success(this.applyState.message), this.loadHistory(!0);
    } catch (e) {
      const a = e instanceof Error ? e.message : "Apply failed.";
      this.applyState.status = "error", this.applyState.message = a, this.toast?.error(a);
    }
    this.render();
  }
  buildApplyResolutions() {
    const t = [], e = new Set(
      this.applyState.rows.map(
        (a, s) => typeof a.index == "number" ? a.index : s
      )
    );
    for (const [a, s] of Object.entries(this.applyState.resolutions)) {
      const i = Number(a);
      !e.has(i) || !s || s === "apply" || t.push({ row: i, decision: s });
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
        this.historyState.response = V(a), this.historyState.status = "ready", this.historyState.message = "", this.historyState.selectedJobId || (this.historyState.selectedJobId = this.historyState.response.history.items[0]?.id ?? ""), this.historyState.selectedJobId && !this.historyState.response.history.items.some(
          (s) => s.id === this.historyState.selectedJobId
        ) && (this.historyState.selectedJobId = this.historyState.response.history.items[0]?.id ?? "");
      } catch (e) {
        this.historyState.status = "error", this.historyState.message = e instanceof Error ? e.message : "Unable to load history.";
      }
      this.render();
    }
  }
  filteredHistoryItems() {
    return (this.historyState.response?.history.items ?? []).filter((e) => !(this.historyState.kind !== "all" && e.kind !== this.historyState.kind || this.historyState.jobStatus !== "all" && e.status !== this.historyState.jobStatus));
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
      const s = at(a);
      let n = String(t.file?.format ?? "json").toLowerCase() === "csv" ? this.parseCSVText(s) : this.parseJSONRows(s);
      n = n.map(w);
      const r = T(t);
      if (e && r) {
        const c = new Set(
          r.results.filter(
            (d) => d.status === "conflict" || d.status === "error"
          ).map((d) => d.index)
        );
        n = n.filter(
          (d, p) => c.has(typeof d.index == "number" ? d.index : p)
        );
      }
      this.applyState = {
        ...this.applyState,
        rows: n,
        sourceLabel: t.file?.name ?? t.id,
        retryJobId: t.id,
        resolutions: M(n, r),
        allowCreateMissing: t.request?.allow_create_missing === !0,
        allowSourceHashOverride: t.request?.allow_source_hash_override === !0,
        continueOnError: t.request?.continue_on_error !== !1,
        dryRun: t.request?.dry_run === !0,
        status: "ready",
        message: e ? "Loaded conflict rows from history into the apply step." : "Loaded history job into the apply step.",
        result: null,
        job: null
      }, this.validateState.result = r, this.step = "apply", this.toast?.info(this.applyState.message);
    } catch (s) {
      const i = s instanceof Error ? s.message : "Unable to load the selected history artifact.";
      this.toast?.error(i);
    }
    this.render();
  }
  createRowsDownload(t) {
    const e = JSON.stringify(t, null, 2);
    return Q("application/json", e);
  }
  async parseImportFile(t) {
    const e = await this.readFileText(t);
    return ((t.name.toLowerCase().endsWith(".csv") ? "csv" : "json") === "csv" ? this.parseCSVText(e) : this.parseJSONRows(e)).map(w);
  }
  async readFileText(t) {
    const e = t;
    if (typeof e.text == "function")
      return e.text();
    if (typeof e.arrayBuffer == "function" && typeof TextDecoder < "u") {
      const s = await e.arrayBuffer();
      return new TextDecoder().decode(s);
    }
    const a = typeof window < "u" ? window.FileReader : void 0;
    if (a)
      return new Promise((s, i) => {
        const n = new a();
        n.onerror = () => i(new Error("Unable to read import file.")), n.onload = () => s(String(n.result ?? "")), n.readAsText(t);
      });
    if (typeof Response < "u")
      return new Response(t).text();
    throw new Error("File text reader is not available in this environment.");
  }
  parseJSONRows(t) {
    const e = JSON.parse(t);
    if (Array.isArray(e))
      return e.filter(
        (a) => a !== null && typeof a == "object"
      );
    if (e && typeof e == "object" && Array.isArray(e.rows))
      return e.rows.filter(
        (a) => a !== null && typeof a == "object"
      );
    throw new Error("JSON import payload must be an array of rows.");
  }
  parseCSVText(t) {
    const e = t.trim().split(/\r?\n/);
    if (e.length < 2) return [];
    const a = this.parseCSVRecord(e[0]).map((i) => i.trim()), s = [];
    for (const i of e.slice(1)) {
      if (!i.trim()) continue;
      const n = this.parseCSVRecord(i), r = {};
      a.forEach((c, d) => {
        r[c] = n[d] ?? "";
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
    return this.request(t, { method: "POST", body: e });
  }
  async fetchJSON(t) {
    return this.request(t, { method: "GET" });
  }
  async request(t, e) {
    const a = await fetch(t, e), { payload: s } = await U(a);
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
    if (this.config.telemetryEnabled === !1)
      return;
    const a = { name: t, fields: e }, s = this.config.analyticsTarget ?? (typeof window < "u" ? window : void 0);
    s && typeof s.dispatchEvent == "function" && s.dispatchEvent(
      new CustomEvent("translation:exchange-analytics", { detail: a })
    );
  }
  render() {
    if (!this.root) return;
    const t = P(this.exportState.draft), e = Object.values(this.validateState.decisions).filter(
      (n) => n === "accepted"
    ).length, a = Object.values(this.validateState.decisions).filter(
      (n) => n === "rejected"
    ).length, s = this.historyExamples(), i = this.filteredHistoryItems();
    this.root.innerHTML = `
      <section class="${B} overflow-hidden">
        <header class="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="${W}">Translation Exchange</p>
              <h1 class="${X}">Translation Exchange Wizard</h1>
              <p class="${q}">Prepare external translation files, validate row-level conflicts, apply imports with explicit create and conflict controls, and inspect retained job history for retries and audits.</p>
            </div>
            <a class="${f}" href="${o(
      `${this.config.apiPath}/template?format=json`
    )}">
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
    const s = this.step === t;
    return `
      <button
        type="button"
        data-exchange-step="${t}"
        class="rounded-xl border px-4 py-4 text-left transition ${s ? "border-blue-400 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}"
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
        <div class="grid gap-3 md:grid-cols-2">${t.map((a) => {
      const s = Object.values(a.downloads ?? {}).map(
        (i) => `
              <a class="text-sm font-medium text-blue-700 hover:text-blue-900" href="${o(i.href)}" download="${o(i.filename)}">
                ${o(i.label)}
              </a>`
      ).join("");
      return `
          <article class="${A}">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">${o(a.kind.replace(/_/g, " "))}</p>
                <p class="text-xs text-gray-600">${o(a.file?.name ?? "Seeded example")}</p>
              </div>
              <span class="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">Fixture</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-3">${s}</div>
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
        <form data-export-form="true" class="space-y-5 ${m}">
          <div class="grid gap-5 md:grid-cols-2">
            <fieldset>
              <legend class="text-sm font-semibold text-gray-900">Resources</legend>
              <div class="mt-3 space-y-2">
                ${["pages", "posts"].map((s) => `
                  <label class="flex items-center gap-3 text-sm text-gray-700">
                    <input type="checkbox" class="${v}" name="resources" value="${s}" ${this.exportState.draft.resources.includes(s) ? "checked" : ""}>
                    <span>${s}</span>
                  </label>`).join("")}
              </div>
            </fieldset>
            <label class="block text-sm font-semibold text-gray-900">
              Source locale
              <select name="source_locale" class="mt-3 ${j}">
                ${["en", "es", "fr", "de"].map((s) => `
                  <option value="${s}" ${this.exportState.draft.sourceLocale === s ? "selected" : ""}>${s.toUpperCase()}</option>`).join("")}
              </select>
            </label>
          </div>
          <fieldset>
            <legend class="text-sm font-semibold text-gray-900">Target locales</legend>
            <div class="mt-3 flex flex-wrap gap-3">
              ${["es", "fr", "de", "it"].map((s) => `
                <label class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input type="checkbox" class="${v}" name="target_locales" value="${s}" ${this.exportState.draft.targetLocales.includes(s) ? "checked" : ""}>
                  <span>${s.toUpperCase()}</span>
                </label>`).join("")}
            </div>
          </fieldset>
          <label class="flex items-center gap-3 ${H} text-sm text-gray-700">
            <input type="checkbox" class="${v}" name="include_source_hash" ${this.exportState.draft.includeSourceHash ? "checked" : ""}>
            <span>Include source hashes so validate and apply can detect stale source drift.</span>
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button class="${R}" type="submit">Create export package</button>
            <span class="text-sm text-gray-600">${o(this.exportState.message)}</span>
          </div>
        </form>
        <aside class="space-y-4 ${I}">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Preflight</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              ${[
      ["Resources", this.exportState.draft.resources.length],
      ["Targets", this.exportState.draft.targetLocales.length],
      [
        "Planned handoffs",
        this.exportState.draft.resources.length * this.exportState.draft.targetLocales.length
      ]
    ].map(([s, i]) => `
                <div class="rounded-xl bg-white px-4 py-3">
                  <div class="${b}">${o(s)}</div>
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
              <div class="${Y}">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">Latest export job</p>
                    <p class="text-xs text-gray-500">${o(a.id)}</p>
                  </div>
                  <span class="${y(L(a.status))}">${o(a.status)}</span>
                </div>
                <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div class="h-full bg-blue-500" style="width: ${J(a)}%"></div>
                </div>
                <div class="mt-3 text-sm text-gray-600">${o(a.progress.processed)} / ${o(a.progress.total ?? 0)} rows prepared</div>
                ${this.exportState.downloadHref ? `<a class="mt-4 inline-flex text-sm font-medium text-blue-700 hover:text-blue-900" href="${o(
      this.exportState.downloadHref
    )}" download>${o(this.exportState.downloadLabel)}</a>` : ""}
              </div>` : ""}
        </aside>
      </section>
    `;
  }
  renderValidateStep(t, e, a) {
    const s = this.validateState.result, i = s?.results ?? [];
    return `
      ${this.renderExampleLinks(a.filter((n) => n.kind === "import_validate"))}
      <section class="space-y-5 ${m}">
        <form data-validate-form="true" class="space-y-4">
          <div class="${I}">
            <label class="text-sm font-semibold text-gray-900" for="exchange-import-file">Validation file</label>
            <input id="exchange-import-file" type="file" accept=".json,.csv" class="mt-3 block w-full text-sm text-gray-700">
            <p class="mt-2 text-sm text-gray-600">${o(this.validateState.upload.filename ?? "Choose a JSON or CSV package exported for translators.")}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="${R}" type="submit">Validate package</button>
            <button class="${f}" type="button" data-exchange-step="apply" ${this.applyState.rows.length === 0 ? "disabled" : ""}>Continue to apply</button>
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
                    <div class="${b}">${o(n)}</div>
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
                        <td class="px-4 py-3"><span class="${y(S(n.status))}">${o(n.status)}</span></td>
                        <td class="px-4 py-3">
                          <div class="flex gap-2">
                            ${this.renderDecisionButton(n.index, "accepted", this.validateState.decisions[n.index] === "accepted")}
                            ${this.renderDecisionButton(n.index, "rejected", this.validateState.decisions[n.index] === "rejected")}
                          </div>
                        </td>
                        <td class="px-4 py-3 text-gray-600">${o(
      n.conflict?.message ?? n.error ?? "Ready for apply."
    )}</td>
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
      const c = this.applyDecisionForRow(Number(r.index ?? 0));
      c === "skip" && (n.skip += 1), c === "override_source_hash" && (n.override += 1), c === "create_missing" && (n.create += 1), c === "apply" && (n.apply += 1);
    }
    return `
      <section class="space-y-5">
        <form data-apply-form="true" class="space-y-5 ${m}">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Apply import package</h2>
              <p class="mt-1 text-sm text-gray-600">${o(
      this.applyState.sourceLabel || "Validate a package or load a history job to begin."
    )}</p>
            </div>
            ${this.applyState.retryJobId ? `<span class="${y("warning")}">Retry source: ${o(this.applyState.retryJobId)}</span>` : ""}
          </div>
          <div class="grid gap-3 md:grid-cols-4">
            ${[
      ["Apply", n.apply],
      ["Skip", n.skip],
      ["Override", n.override],
      ["Create", n.create]
    ].map(([r, c]) => `
              <div class="rounded-xl bg-gray-50 px-4 py-3">
                <div class="${b}">${o(r)}</div>
                <div class="mt-1 text-2xl font-semibold text-gray-900">${o(c)}</div>
              </div>`).join("")}
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            ${this.renderApplyToggle("allowCreateMissing", "Create missing locale variants during apply", this.applyState.allowCreateMissing)}
            ${this.renderApplyToggle("allowSourceHashOverride", "Override stale source hash conflicts during apply", this.applyState.allowSourceHashOverride)}
            ${this.renderApplyToggle("continueOnError", "Continue on row-level errors", this.applyState.continueOnError)}
            ${this.renderApplyToggle("dryRun", "Dry-run only (no writes)", this.applyState.dryRun)}
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="${R}" type="submit" ${t.length === 0 ? "disabled" : ""}>Submit apply job</button>
            <button class="${f}" type="button" data-exchange-step="history">Inspect history</button>
            <span class="text-sm text-gray-600">${o(this.applyState.message)}</span>
          </div>
          ${i ? `
                <div class="${A}">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-gray-900">Job progress</p>
                      <p class="text-xs text-gray-500">${o(i.id)}</p>
                    </div>
                    <span class="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">${o(i.status)}</span>
                  </div>
                  <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div class="h-full bg-blue-500" style="width: ${J(i)}%"></div>
                  </div>
                  <div class="mt-3 text-sm text-gray-600">${o(i.progress.processed)} / ${o(i.progress.total ?? 0)} processed</div>
                </div>` : ""}
        </form>
        ${t.length > 0 ? `
              <section class="${m}">
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
                      ${t.map((r, c) => {
      const d = typeof r.index == "number" ? r.index : c, p = e.get(d) ?? null;
      return `
                          <tr>
                            <td class="px-4 py-3 font-medium text-gray-900">${o(d)}</td>
                            <td class="px-4 py-3 text-gray-700">${o(`${r.resource}.${r.field_path}`)}</td>
                            <td class="px-4 py-3"><span class="${y(S(p?.status ?? "staged"))}">${o(p?.status ?? "staged")}</span></td>
                            <td class="px-4 py-3">
                              <div class="flex flex-wrap gap-2">
                                ${this.rowActions(d, p).map((g) => this.renderApplyDecisionButton(
        d,
        g,
        this.applyDecisionForRow(d) === g
      )).join("")}
                              </div>
                            </td>
                            <td class="px-4 py-3 text-gray-600">${o(p?.conflict?.message ?? p?.error ?? "Ready for apply.")}</td>
                          </tr>`;
    }).join("")}
                    </tbody>
                  </table>
                </div>
              </section>` : ""}
        ${a ? `
              <section class="${m} space-y-4">
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
    ].map(([r, c]) => `
                    <div class="rounded-xl bg-gray-50 px-4 py-3">
                      <div class="${b}">${o(r)}</div>
                      <div class="mt-1 text-2xl font-semibold text-gray-900">${o(c)}</div>
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
                          <td class="px-4 py-3"><span class="${y(S(r.status))}">${o(r.status)}</span></td>
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
      <label class="flex items-center gap-3 ${H} text-sm text-gray-700">
        <input type="checkbox" class="${v}" data-apply-option="${t}" ${a ? "checked" : ""}>
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
    const e = this.historyState.response?.meta, a = e?.job_kinds ?? ["export", "import_validate", "import_apply"], s = e?.job_statuses ?? ["running", "completed", "failed"], i = this.activeHistoryJob(), n = T(i);
    return `
      <section class="space-y-5">
        <div class="flex flex-wrap items-end gap-3 ${m}">
          <label class="text-sm font-medium text-gray-700">
            Kind
            <select data-history-kind class="mt-2 ${j}">
              <option value="all">All</option>
              ${a.map((r) => `
                <option value="${o(r)}" ${this.historyState.kind === r ? "selected" : ""}>${o(r)}</option>`).join("")}
            </select>
          </label>
          <label class="text-sm font-medium text-gray-700">
            Status
            <select data-history-status class="mt-2 ${j}">
              <option value="all">All</option>
              ${s.map((r) => `
                <option value="${o(r)}" ${this.historyState.jobStatus === r ? "selected" : ""}>${o(r)}</option>`).join("")}
            </select>
          </label>
          <button class="${f}" type="button" data-history-refresh="true">Refresh history</button>
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
                            <span class="${y("info")}">${o(r.kind.replace(/_/g, " "))}</span>
                            <span class="${y(L(r.status))}">${o(r.status)}</span>
                            ${r.fixture ? `<span class="${y("warning")}">Fixture</span>` : ""}
                          </div>
                          <h3 class="mt-3 text-lg font-semibold text-gray-900">${o(r.file?.name ?? r.id)}</h3>
                          <p class="mt-1 text-sm text-gray-600">Actor ${o(r.actor?.label ?? "system")} • ${o(D(r.created_at, "Pending"))}</p>
                        </div>
                        <div class="text-sm text-gray-600">
                          <div>${o(r.progress.processed)} / ${o(r.progress.total ?? 0)} processed</div>
                          <div>${o(r.file?.format ?? "json").toUpperCase()} package</div>
                        </div>
                      </div>
                    </button>
                  </article>`).join("") : `<div class="${O}">No jobs match the current filters.</div>`}
          </div>
          ${i ? `
                <section class="${m} space-y-4">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 class="text-lg font-semibold text-gray-900">${o(i.file?.name ?? i.id)}</h2>
                      <p class="mt-1 text-sm text-gray-600">${o(i.kind.replace(/_/g, " "))} • ${o(i.status)} • ${o(D(i.updated_at, "Pending"))}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      <button class="${f}" type="button" data-history-load-apply="all">Load in apply step</button>
                      <button class="${f}" type="button" data-history-load-apply="conflicts" ${(n?.summary.conflicts ?? 0) > 0 ? "" : "disabled"}>Retry conflicts</button>
                    </div>
                  </div>
                  <div class="grid gap-3 md:grid-cols-4">
                    ${[
      ["Processed", i.progress.processed],
      ["Succeeded", i.progress.succeeded],
      ["Conflicts", i.progress.conflicts ?? n?.summary.conflicts ?? 0],
      ["Failed", i.progress.failed]
    ].map(([r, c]) => `
                      <div class="rounded-xl bg-gray-50 px-4 py-3">
                        <div class="${b}">${o(r)}</div>
                        <div class="mt-1 text-2xl font-semibold text-gray-900">${o(c)}</div>
                      </div>`).join("")}
                  </div>
                  <div class="${A} text-sm text-gray-700">
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
                                  <td class="px-4 py-3"><span class="${y(S(r.status))}">${o(r.status)}</span></td>
                                  <td class="px-4 py-3 text-gray-600">${o(String(r.metadata?.resolution_decision ?? "apply"))}</td>
                                  <td class="px-4 py-3 text-gray-600">${o(r.conflict?.message ?? r.error ?? "Completed without conflict.")}</td>
                                </tr>`).join("")}
                            </tbody>
                          </table>
                        </div>` : `<div class="${O}">No per-row results were retained for this job.</div>`}
                </section>` : ""}
        </div>
      </section>
    `;
  }
}
export {
  dt as TranslationExchangeManager,
  V as normalizeTranslationExchangeHistoryResponse,
  C as normalizeTranslationExchangeJob,
  x as normalizeTranslationExchangeUploadDescriptor,
  k as normalizeTranslationExchangeValidationResult
};
//# sourceMappingURL=index.js.map
