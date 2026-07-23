import { escapeHTML as o } from "../shared/html.js";
import { httpRequest as G, readHTTPResponsePayload as K } from "../shared/transport/http-client.js";
import "../chunks/status-vocabulary-Bdx_bn1-.js";
import { a as I, i as Y, o as m, s as k } from "../chunks/translation-contracts-CCsjVv14.js";
import { C as V, I as v, L as E, dt as X, h as w, nt as _, p as R, w as T, x as f, y as j } from "../chunks/translation-shared-opnbNxht.js";
import { formatTranslationShortDateTime as D } from "../translation-shared/formatters.js";
var Q = { root: "#translation-exchange-app" }, Z = [{
  value: "pages",
  label: "pages"
}, {
  value: "posts",
  label: "posts"
}], tt = [
  "en",
  "es",
  "fr",
  "de"
].map((t) => ({
  code: t,
  label: t.toUpperCase()
})), et = [
  "es",
  "fr",
  "de",
  "it"
].map((t) => ({
  code: t,
  label: t.toUpperCase()
}));
function b(t) {
  return String(t ?? "").trim().toLowerCase();
}
function B(t) {
  return String(t ?? "").trim();
}
function z(t) {
  return !!t && t !== "none" && t !== "mixed";
}
function st(t) {
  return !t || typeof t != "object" ? !1 : t.configured === !0 || !!String(t.source_locale ?? "").trim() || Array.isArray(t.source_locales) && t.source_locales.length > 0 || Array.isArray(t.target_locales) && t.target_locales.length > 0 || Array.isArray(t.resources) && t.resources.length > 0 || Array.isArray(t.default_resources) && t.default_resources.length > 0 || Array.isArray(t.default_target_locales) && t.default_target_locales.length > 0 || typeof t.include_source_hash == "boolean" || typeof t.include_examples == "boolean" || !!(t.template && Object.keys(t.template).length > 0) || !!(t.apply && Object.keys(t.apply).length > 0);
}
function at(t, e, r) {
  const a = String(r[t] ?? "").trim();
  if (a) return a;
  const s = String(e ?? "").trim();
  return s && b(s) !== t ? s : t.toUpperCase();
}
function O(t, e) {
  const r = /* @__PURE__ */ new Set(), a = [];
  for (const s of Array.isArray(t) ? t : []) {
    const n = b(s?.code);
    !z(n) || r.has(n) || (r.add(n), a.push({
      code: n,
      label: at(n, s?.label, e)
    }));
  }
  return a;
}
function rt(t) {
  const e = /* @__PURE__ */ new Set(), r = [];
  for (const a of Array.isArray(t) ? t : []) {
    const s = B(a?.value ?? a?.id);
    !s || e.has(s) || (e.add(s), r.push({
      value: s,
      id: s,
      label: String(a?.label ?? s).trim() || s
    }));
  }
  return r;
}
function q(t, e, r = "") {
  const a = /* @__PURE__ */ new Set(), s = [];
  for (const n of Array.isArray(t) ? t : []) {
    const i = b(n);
    !i || i === r || !e.has(i) || a.has(i) || (a.add(i), s.push(i));
  }
  return s;
}
function W(t, e) {
  const r = /* @__PURE__ */ new Set(), a = [];
  for (const s of Array.isArray(t) ? t : []) {
    const n = B(s);
    !n || !e.has(n) || r.has(n) || (r.add(n), a.push(n));
  }
  return a;
}
function it(t) {
  if (!st(t)) return {
    configured: !1,
    blockedReason: "",
    resources: Z,
    sourceLocales: tt,
    targetLocales: et,
    defaultResources: ["pages"],
    defaultTargetLocales: ["es", "fr"],
    defaultSourceLocale: "en",
    includeSourceHash: !0,
    apply: {
      allowCreateMissing: !1,
      allowSourceHashOverride: !1,
      continueOnError: !0,
      dryRun: !1
    }
  };
  const e = t?.locale_labels ?? {}, r = rt(t?.resources), a = O(t?.source_locales, e), s = b(t?.source_locale), n = z(s) ? s : a[0]?.code || "", i = O(t?.target_locales, e).filter((h) => h.code && h.code !== n), l = new Set(r.map((h) => h.value ?? "")), d = new Set(i.map((h) => h.code)), u = W(t?.default_resources, l), c = q(t?.default_target_locales, d, n), p = [];
  return r.length === 0 && p.push("No exchange resources are configured."), (a.length === 0 || !n) && p.push("No source locale is configured."), i.length === 0 && p.push("No target locales are configured."), {
    configured: !0,
    blockedReason: p.join(" "),
    resources: r,
    sourceLocales: a,
    targetLocales: i,
    defaultResources: u.length > 0 ? u : r.map((h) => h.value ?? ""),
    defaultTargetLocales: c.length > 0 ? c : i.map((h) => h.code),
    defaultSourceLocale: n,
    includeSourceHash: t?.include_source_hash !== !1,
    includeExamples: typeof t?.include_examples == "boolean" ? t.include_examples : void 0,
    apply: {
      allowCreateMissing: t?.apply?.allow_create_missing === !0,
      allowSourceHashOverride: t?.apply?.allow_source_hash_override === !0,
      continueOnError: t?.apply?.continue_on_error !== !1,
      dryRun: t?.apply?.dry_run === !0
    }
  };
}
function U(t) {
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
function S(t) {
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
function y(t) {
  return `rounded-full px-3 py-1 text-xs font-medium ${X(t)}`;
}
var g = `${V} p-5`, ot = `${V} p-4`, H = `${_} border ${w} ${R} p-5`, A = `${_} border ${w} ${R} p-4`, L = `${_} border ${w} ${R} px-4 py-3`, M = `${_} border ${w} ${R} px-6 py-10 text-center text-sm text-gray-600`, x = "text-xs uppercase tracking-wider text-gray-500";
function nt(t, e) {
  const r = typeof window < "u" && typeof window.btoa == "function" ? window.btoa.bind(window) : typeof globalThis.btoa == "function" ? globalThis.btoa.bind(globalThis) : null;
  return r ? `data:${t};base64,${r(encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, (a, s) => String.fromCharCode(parseInt(s, 16))))}` : `data:${t},${encodeURIComponent(e)}`;
}
function lt(t) {
  return new Promise((e) => setTimeout(e, Math.max(0, t)));
}
function J(t) {
  return !t || !t.progress.total || t.progress.total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(t.progress.processed / t.progress.total * 100)));
}
function dt(t, e) {
  return t?.downloads ? t.downloads[e]?.href ?? t.downloads.artifact?.href ?? "" : "";
}
function ct(t, e) {
  return t?.downloads ? t.downloads[e]?.label ?? t.downloads.artifact?.label ?? "Download artifact" : "";
}
function N(t) {
  const e = [];
  return t.resources.length === 0 && e.push("Select at least one resource."), t.targetLocales.length === 0 && e.push("Select at least one target locale."), t.targetLocales.includes(t.sourceLocale) && e.push("Target locales cannot include the source locale."), t.includeSourceHash || e.push("Conflict detection is weaker when source hashes are excluded."), e;
}
function pt(t) {
  const e = {};
  if (!t) return e;
  for (const r of t.results) e[r.index] = r.status === "success" ? "accepted" : "rejected";
  return e;
}
function P(t, e) {
  const r = {};
  for (const [a, s] of t.entries()) r[typeof s.index == "number" ? s.index : a] = "apply";
  if (!e) return r;
  for (const a of e.results) r[a.index] = a.status === "success" ? "apply" : "skip";
  return r;
}
function F(t) {
  const e = /* @__PURE__ */ new Map();
  for (const r of t?.results ?? []) e.set(r.index, r);
  return e;
}
function C(t) {
  return t?.result ? {
    ...k({
      ...t.result,
      job: t
    }),
    job: t
  } : null;
}
function ut(t) {
  const e = String(t ?? "").match(/^data:([^,]*?),(.*)$/i);
  if (!e) return "";
  const [, r, a] = e;
  if (r.includes(";base64")) {
    const s = typeof window < "u" && typeof window.atob == "function" ? window.atob.bind(window) : typeof globalThis.atob == "function" ? globalThis.atob.bind(globalThis) : null;
    if (!s) return "";
    const n = s(a);
    return decodeURIComponent(Array.from(n).map((i) => `%${i.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  }
  return decodeURIComponent(a);
}
function $(t, e) {
  return {
    ...t,
    index: typeof t.index == "number" ? t.index : e
  };
}
var bt = class {
  constructor(t, e = {}, r) {
    this.root = null, this.hasServerRenderedContent = !1, this.step = "export", this.exportState = {
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
      upload: m({ state: "idle" }),
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
    }, this.handleClick = (a) => {
      const s = a.target;
      if (!s) return;
      const n = s.closest("[data-exchange-step]");
      if (n) {
        this.step = n.dataset.exchangeStep, this.render(), this.step === "history" && this.historyState.status === "idle" && this.loadHistory();
        return;
      }
      const i = s.closest("[data-stage-row]");
      if (i) {
        const c = Number(i.dataset.stageRow ?? "-1"), p = i.dataset.stageDecision;
        c >= 0 && (p === "accepted" || p === "rejected") && (this.validateState.decisions[c] = p, this.applyState.resolutions[c] = p === "accepted" ? "apply" : "skip", this.render());
        return;
      }
      const l = s.closest("[data-apply-row]");
      if (l) {
        const c = Number(l.dataset.applyRow ?? "-1"), p = l.dataset.applyDecision;
        c >= 0 && p && (this.applyState.resolutions[c] = p, this.render());
        return;
      }
      if (s.closest("[data-history-refresh]")) {
        this.loadHistory(!0);
        return;
      }
      const d = s.closest("[data-history-job]");
      if (d) {
        this.historyState.selectedJobId = String(d.dataset.historyJob ?? "").trim(), this.render();
        return;
      }
      const u = s.closest("[data-history-load-apply]");
      if (u) {
        const c = this.activeHistoryJob();
        if (!c) return;
        const p = u.dataset.historyLoadApply === "conflicts";
        this.loadHistoryJobIntoApply(c, p);
      }
    }, this.handleChange = (a) => {
      const s = a.target;
      if (s) {
        if (s.matches('[data-export-form="true"] input, [data-export-form="true"] select')) {
          const n = s.closest("form");
          n && (this.exportState.draft = this.readExportDraft(n), this.render());
          return;
        }
        if (s.id === "exchange-import-file" && s instanceof HTMLInputElement) {
          const n = s.files?.[0] ?? null;
          this.stageImportFile(n);
          return;
        }
        if (s.matches("[data-history-kind]")) {
          this.historyState.kind = s.value || "all", this.render();
          return;
        }
        if (s.matches("[data-history-status]")) {
          this.historyState.jobStatus = s.value || "all", this.render();
          return;
        }
        if (s.matches("[data-apply-option]")) {
          const n = String(s.dataset.applyOption ?? ""), i = s instanceof HTMLInputElement ? s.checked === !0 : !1;
          switch (n) {
            case "allowCreateMissing":
              this.applyState.allowCreateMissing = i;
              break;
            case "allowSourceHashOverride":
              this.applyState.allowSourceHashOverride = i;
              break;
            case "continueOnError":
              this.applyState.continueOnError = i;
              break;
            case "dryRun":
              this.applyState.dryRun = i;
              break;
            default:
              return;
          }
          this.render();
        }
      }
    }, this.handleSubmit = (a) => {
      const s = a.target;
      if (s) {
        if (s.matches('[data-export-form="true"]')) {
          a.preventDefault(), this.submitExport(s);
          return;
        }
        if (s.matches('[data-validate-form="true"]')) {
          a.preventDefault(), this.submitValidate();
          return;
        }
        s.matches('[data-apply-form="true"]') && (a.preventDefault(), this.submitApply());
      }
    }, this.config = t, this.exchangeUI = it(t.exchangeUIConfig), this.exportState.draft = {
      resources: this.exchangeUI.defaultResources,
      sourceLocale: this.exchangeUI.defaultSourceLocale,
      targetLocales: this.exchangeUI.defaultTargetLocales,
      includeSourceHash: this.exchangeUI.includeSourceHash
    }, this.applyState.allowCreateMissing = this.exchangeUI.apply.allowCreateMissing, this.applyState.allowSourceHashOverride = this.exchangeUI.apply.allowSourceHashOverride, this.applyState.continueOnError = this.exchangeUI.apply.continueOnError, this.applyState.dryRun = this.exchangeUI.apply.dryRun, this.selectors = {
      ...Q,
      ...e
    }, this.toast = r ?? window.toastManager ?? null;
  }
  init() {
    this.root = document.querySelector(this.selectors.root), this.root && (this.hasServerRenderedContent = this.root.dataset.translationExchangeSsr === "true" && this.root.innerHTML.trim().length > 0, this.root.addEventListener("click", this.handleClick), this.root.addEventListener("change", this.handleChange), this.root.addEventListener("submit", this.handleSubmit), this.hasServerRenderedContent || this.render(), this.loadHistory());
  }
  destroy() {
    this.root?.removeEventListener("click", this.handleClick), this.root?.removeEventListener("change", this.handleChange), this.root?.removeEventListener("submit", this.handleSubmit);
  }
  get historyEndpoint() {
    return this.config.historyPath ?? `${this.config.apiPath}/jobs`;
  }
  get includeExamples() {
    return typeof this.exchangeUI.includeExamples == "boolean" ? this.exchangeUI.includeExamples : this.config.includeExamples !== !1;
  }
  buildApplyRequest(t, e = {}) {
    return {
      rows: t,
      allow_create_missing: e.allow_create_missing ?? this.exchangeUI.apply.allowCreateMissing,
      allow_source_hash_override: e.allow_source_hash_override ?? this.exchangeUI.apply.allowSourceHashOverride,
      continue_on_error: e.continue_on_error ?? this.exchangeUI.apply.continueOnError,
      dry_run: e.dry_run ?? this.exchangeUI.apply.dryRun,
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
    }), r = k(e);
    return r.job && this.loadHistory(!0), this.emitAnalytics("exchange_apply_completion", {
      processed: r.summary.processed,
      succeeded: r.summary.succeeded,
      failed: r.summary.failed,
      conflicts: r.summary.conflicts ?? 0,
      status: r.job?.status ?? "completed"
    }), {
      ...r,
      job: r.job,
      meta: e.meta && typeof e.meta == "object" ? e.meta : void 0
    };
  }
  async pollJobUntilTerminal(t, e = {}) {
    const r = typeof t == "string" ? t : t.poll_endpoint;
    if (!r) throw new Error("Poll endpoint is required.");
    const a = e.intervalMs ?? 250, s = e.timeoutMs ?? 15e3, n = Date.now();
    let i = 0;
    for (; ; ) {
      if (e.signal?.aborted) throw new Error("Polling aborted.");
      i > 0 && this.emitAnalytics("exchange_apply_retry", {
        poll_endpoint: r,
        attempt: i
      });
      const l = await this.fetchJSON(r), d = I(l.job && typeof l.job == "object" ? l.job : l);
      if (!d) throw new Error("Job payload missing.");
      if (e.onTick?.(d, i), d.status !== "running")
        return this.emitAnalytics("exchange_apply_completion", {
          job_id: d.id,
          status: d.status,
          processed: d.progress.processed,
          failed: d.progress.failed
        }), d;
      if (Date.now() - n >= s) throw new Error("Polling timed out.");
      i += 1, await lt(a);
    }
  }
  readExportDraft(t) {
    const e = new FormData(t), r = new Set(this.exchangeUI.resources.map((i) => i.value ?? "")), a = new Set(this.exchangeUI.targetLocales.map((i) => i.code)), s = b(e.get("source_locale")), n = this.exchangeUI.sourceLocales.some((i) => i.code === s) ? s : this.exchangeUI.defaultSourceLocale;
    return {
      resources: W(e.getAll("resources"), r),
      sourceLocale: n,
      targetLocales: q(e.getAll("target_locales"), a, n),
      includeSourceHash: e.has("include_source_hash")
    };
  }
  async submitExport(t) {
    if (this.exchangeUI.blockedReason) {
      this.exportState.status = "error", this.exportState.message = this.exchangeUI.blockedReason, this.render();
      return;
    }
    const e = this.readExportDraft(t);
    this.exportState.draft = e;
    const r = N(e);
    if (e.resources.length === 0 || e.targetLocales.length === 0 || r.some((a) => a.includes("cannot include"))) {
      this.exportState.status = "error", this.exportState.message = r[0] ?? "Complete the export filters before continuing.", this.render();
      return;
    }
    this.exportState.status = "submitting", this.exportState.message = "Preparing export package...", this.render();
    try {
      const a = await this.postJSON(`${this.config.apiPath}/export`, {
        filter: {
          resources: e.resources,
          source_locale: e.sourceLocale,
          target_locales: e.targetLocales,
          include_source_hash: e.includeSourceHash
        },
        async: !0
      }), s = a.job && typeof a.job == "object" ? a.job : a.data && typeof a.data == "object" ? a.data.job : void 0, n = Array.isArray(a.rows) ? a.rows : a.data && typeof a.data == "object" && Array.isArray(a.data.rows) ? a.data.rows ?? [] : [], i = I(s);
      if (this.exportState.job = i, i?.status === "running") {
        this.exportState.status = "polling", this.exportState.message = "Export job running. Polling for artifact...", this.render();
        const l = await this.pollJobUntilTerminal(i, {
          intervalMs: 250,
          timeoutMs: 15e3,
          onTick: (d) => {
            this.exportState.job = d, this.exportState.message = `Export job running: ${d.progress.processed} / ${d.progress.total ?? 0} processed.`, this.render();
          }
        });
        this.exportState.job = l;
      }
      this.exportState.downloadHref = dt(this.exportState.job, "artifact") || this.createRowsDownload(n), this.exportState.downloadLabel = ct(this.exportState.job, "artifact") || "Download export JSON", this.exportState.status = "completed", this.exportState.message = `${this.exportState.job?.summary?.row_count ?? a.row_count ?? 0} rows ready for handoff.`, this.toast?.success(this.exportState.message), this.loadHistory(!0);
    } catch (a) {
      const s = a instanceof Error ? a.message : "Export failed.";
      this.exportState.status = "error", this.exportState.message = s, this.toast?.error(s);
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
    }, this.validateState.upload = m({
      state: t ? "uploading" : "idle",
      filename: t?.name,
      format: t?.name.endsWith(".csv") ? "csv" : "json",
      message: t ? "Reading import file..." : ""
    }), this.validateState.status = t ? "loading_file" : "idle", this.validateState.message = t ? "Reading import file..." : "", this.render(), !!t) {
      try {
        const e = await this.parseImportFile(t);
        this.validateState.parsedRows = e, this.validateState.upload = m({
          state: "selected",
          filename: t.name,
          format: t.name.endsWith(".csv") ? "csv" : "json",
          row_count: e.length,
          message: "Ready to validate."
        }), this.validateState.status = "idle", this.validateState.message = `${e.length} rows loaded and ready to validate.`, this.applyState.message = "";
      } catch (e) {
        const r = e instanceof Error ? e.message : "Unable to read import file.";
        this.validateState.upload = m({
          state: "error",
          filename: t.name,
          format: t.name.endsWith(".csv") ? "csv" : "json",
          message: r
        }), this.validateState.status = "error", this.validateState.message = r, this.toast?.error(r);
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
      const e = k(await this.postForm(`${this.config.apiPath}/import/validate`, t));
      this.validateState.result = e, this.validateState.decisions = pt(e), this.validateState.upload = m({
        state: "validated",
        filename: this.validateState.file.name,
        format: this.validateState.file.name.endsWith(".csv") ? "csv" : "json",
        row_count: e.summary.processed
      }), this.validateState.status = "validated", this.validateState.message = "Validation completed. Review conflicts, then continue to apply.", this.applyState = {
        ...this.applyState,
        rows: this.validateState.parsedRows.map($),
        sourceLabel: this.validateState.file.name,
        retryJobId: "",
        resolutions: P(this.validateState.parsedRows, e),
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
    const t = this.buildApplyRequest(this.applyState.rows.map($), {
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
        const r = await this.pollJobUntilTerminal(e.job, {
          intervalMs: 250,
          timeoutMs: 15e3,
          onTick: (a) => {
            this.applyState.job = a, this.applyState.message = `Apply job running: ${a.progress.processed} / ${a.progress.total ?? 0} processed.`, this.render();
          }
        });
        this.applyState.job = r, this.applyState.result = C(r);
      }
      this.applyState.status = "completed", this.applyState.message = this.applyState.dryRun ? "Dry-run apply completed." : "Apply completed.", this.toast?.success(this.applyState.message), this.loadHistory(!0);
    } catch (e) {
      const r = e instanceof Error ? e.message : "Apply failed.";
      this.applyState.status = "error", this.applyState.message = r, this.toast?.error(r);
    }
    this.render();
  }
  buildApplyResolutions() {
    const t = [], e = new Set(this.applyState.rows.map((r, a) => typeof r.index == "number" ? r.index : a));
    for (const [r, a] of Object.entries(this.applyState.resolutions)) {
      const s = Number(r);
      !e.has(s) || !a || a === "apply" || t.push({
        row: s,
        decision: a
      });
    }
    return t.length > 0 ? t : void 0;
  }
  async loadHistory(t = !1) {
    if (!t && this.historyState.status === "loading") return;
    const e = this.historyState.response, r = this.hasServerRenderedContent && e == null;
    this.historyState.status = "loading", this.historyState.message = "Loading history...", r || this.render();
    try {
      const a = new URL(this.historyEndpoint, window.location.origin);
      this.includeExamples && a.searchParams.set("include_examples", "true");
      const s = await this.fetchJSON(a.pathname + a.search);
      this.historyState.response = Y(s), this.hasServerRenderedContent = !1, this.historyState.status = "ready", this.historyState.message = "", this.historyState.selectedJobId || (this.historyState.selectedJobId = this.historyState.response.history.items[0]?.id ?? ""), this.historyState.selectedJobId && !this.historyState.response.history.items.some((n) => n.id === this.historyState.selectedJobId) && (this.historyState.selectedJobId = this.historyState.response.history.items[0]?.id ?? "");
    } catch (a) {
      if (this.historyState.status = "error", this.historyState.message = a instanceof Error ? a.message : "Unable to load history.", e && (this.historyState.response = e), r) {
        this.renderServerRenderedHistoryError(a);
        return;
      }
    }
    this.render();
  }
  renderServerRenderedHistoryError(t) {
    if (!this.root) return;
    this.root.querySelector("[data-exchange-ssr-error-banner]")?.remove();
    const e = t instanceof Error ? t.message : "Unable to load exchange history.";
    this.root.insertAdjacentHTML("afterbegin", `
      <section class="${T} mb-4 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" data-exchange-ssr-error-banner="true" role="alert">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="font-semibold text-amber-950">Exchange history refresh failed</h2>
            <p class="mt-1">${o(e)}</p>
          </div>
          <button class="${f}" type="button" data-history-refresh="true">Retry</button>
        </div>
      </section>
      `);
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
    const r = t.downloads?.input?.href ?? t.downloads?.artifact?.href ?? "";
    if (!r) {
      this.toast?.error("Selected history job does not retain an input artifact.");
      return;
    }
    try {
      const a = ut(r);
      let s = String(t.file?.format ?? "json").toLowerCase() === "csv" ? this.parseCSVText(a) : this.parseJSONRows(a);
      s = s.map($);
      const n = C(t);
      if (e && n) {
        const i = new Set(n.results.filter((l) => l.status === "conflict" || l.status === "error").map((l) => l.index));
        s = s.filter((l, d) => i.has(typeof l.index == "number" ? l.index : d));
      }
      this.applyState = {
        ...this.applyState,
        rows: s,
        sourceLabel: t.file?.name ?? t.id,
        retryJobId: t.id,
        resolutions: P(s, n),
        allowCreateMissing: t.request?.allow_create_missing === !0,
        allowSourceHashOverride: t.request?.allow_source_hash_override === !0,
        continueOnError: t.request?.continue_on_error !== !1,
        dryRun: t.request?.dry_run === !0,
        status: "ready",
        message: e ? "Loaded conflict rows from history into the apply step." : "Loaded history job into the apply step.",
        result: null,
        job: null
      }, this.validateState.result = n, this.step = "apply", this.toast?.info(this.applyState.message);
    } catch (a) {
      const s = a instanceof Error ? a.message : "Unable to load the selected history artifact.";
      this.toast?.error(s);
    }
    this.render();
  }
  createRowsDownload(t) {
    return nt("application/json", JSON.stringify(t, null, 2));
  }
  async parseImportFile(t) {
    const e = await this.readFileText(t);
    return ((t.name.toLowerCase().endsWith(".csv") ? "csv" : "json") == "csv" ? this.parseCSVText(e) : this.parseJSONRows(e)).map($);
  }
  async readFileText(t) {
    const e = t;
    if (typeof e.text == "function") return e.text();
    if (typeof e.arrayBuffer == "function" && typeof TextDecoder < "u") {
      const a = await e.arrayBuffer();
      return new TextDecoder().decode(a);
    }
    const r = typeof window < "u" ? window.FileReader : void 0;
    if (r) return new Promise((a, s) => {
      const n = new r();
      n.onerror = () => s(/* @__PURE__ */ new Error("Unable to read import file.")), n.onload = () => a(String(n.result ?? "")), n.readAsText(t);
    });
    if (typeof Response < "u") return new Response(t).text();
    throw new Error("File text reader is not available in this environment.");
  }
  parseJSONRows(t) {
    const e = JSON.parse(t);
    if (Array.isArray(e)) return e.filter((r) => r !== null && typeof r == "object");
    if (e && typeof e == "object" && Array.isArray(e.rows)) return e.rows.filter((r) => r !== null && typeof r == "object");
    throw new Error("JSON import payload must be an array of rows.");
  }
  parseCSVText(t) {
    const e = t.trim().split(/\r?\n/);
    if (e.length < 2) return [];
    const r = this.parseCSVRecord(e[0]).map((s) => s.trim()), a = [];
    for (const s of e.slice(1)) {
      if (!s.trim()) continue;
      const n = this.parseCSVRecord(s), i = {};
      r.forEach((l, d) => {
        i[l] = n[d] ?? "";
      }), a.push({
        resource: i.resource ?? "",
        entity_id: i.entity_id ?? "",
        family_id: i.family_id ?? "",
        source_locale: i.source_locale ?? "",
        target_locale: i.target_locale ?? "",
        field_path: i.field_path ?? "",
        source_text: i.source_text ?? "",
        translated_text: i.translated_text ?? "",
        source_hash: i.source_hash ?? "",
        path: i.path ?? "",
        title: i.title ?? "",
        status: i.status ?? "",
        notes: i.notes ?? ""
      });
    }
    return a;
  }
  parseCSVRecord(t) {
    const e = [];
    let r = "", a = !1;
    for (let s = 0; s < t.length; s += 1) {
      const n = t[s], i = t[s + 1];
      if (n === '"') {
        if (a && i === '"') {
          r += '"', s += 1;
          continue;
        }
        a = !a;
        continue;
      }
      if (n === "," && !a) {
        e.push(r), r = "";
        continue;
      }
      r += n;
    }
    return e.push(r), e;
  }
  applyDecisionForRow(t) {
    return this.applyState.resolutions[t] ?? "apply";
  }
  validationRowForIndex(t) {
    return F(this.validateState.result).get(t) ?? null;
  }
  rowActions(t, e) {
    const r = ["apply", "skip"], a = e?.metadata ?? {};
    return (e?.conflict?.type === "stale_source_hash" || a.current_source_hash || a.provided_source_hash) && r.push("override_source_hash"), (a.create_translation_hint === !0 || a.create_translation_required === !0) && r.push("create_missing"), r;
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
    const r = await G(t, e), { payload: a } = await K(r);
    if (!r.ok) {
      if (a && typeof a == "object") {
        const s = a.error?.message ?? a.message;
        throw new Error(s || "Exchange request failed.");
      }
      throw new Error(typeof a == "string" ? a : "Exchange request failed.");
    }
    return a ?? {};
  }
  emitAnalytics(t, e = {}) {
    if (this.config.telemetryEnabled === !1) return;
    const r = {
      name: t,
      fields: e
    }, a = this.config.analyticsTarget ?? (typeof window < "u" ? window : void 0);
    a && typeof a.dispatchEvent == "function" && a.dispatchEvent(new CustomEvent("translation:exchange-analytics", { detail: r }));
  }
  render() {
    if (!this.root) return;
    const t = N(this.exportState.draft), e = Object.values(this.validateState.decisions).filter((n) => n === "accepted").length, r = Object.values(this.validateState.decisions).filter((n) => n === "rejected").length, a = this.historyExamples(), s = this.filteredHistoryItems();
    this.root.innerHTML = `
      <section class="${T} overflow-hidden">
        <header class="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <nav class="grid gap-3 md:grid-cols-4" aria-label="Exchange steps">
            ${this.renderStepButton("export", "1. Export", "Filter records, review warnings, and hand off files.")}
            ${this.renderStepButton("validate", "2. Validate", "Upload a package, inspect row outcomes, and stage apply decisions.")}
            ${this.renderStepButton("apply", "3. Apply", "Set explicit conflict/create toggles, poll async progress, and review terminal summaries.")}
            ${this.renderStepButton("history", "4. History", "Inspect retained job details, row results, and retry from prior runs.")}
          </nav>
        </header>
        <div class="p-6 space-y-6">
          ${this.step === "export" ? this.renderExportStep(t, a) : ""}
          ${this.step === "validate" ? this.renderValidateStep(e, r, a) : ""}
          ${this.step === "apply" ? this.renderApplyStep() : ""}
          ${this.step === "history" ? this.renderHistoryStep(s) : ""}
        </div>
      </section>
    `;
  }
  renderStepButton(t, e, r) {
    return `
      <button
        type="button"
        data-exchange-step="${t}"
        class="rounded-xl border px-4 py-4 text-left transition ${this.step === t ? "border-blue-400 bg-blue-50 shadow-sm" : "border-gray-200 bg-white hover:border-gray-300"}"
      >
        <div class="text-sm font-semibold text-gray-900">${o(e)}</div>
        <p class="mt-1 text-sm text-gray-600">${o(r)}</p>
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
      const r = Object.values(e.downloads ?? {}).map((a) => `
              <a class="text-sm font-medium text-blue-700 hover:text-blue-900" href="${o(a.href)}" download="${o(a.filename)}">
                ${o(a.label)}
              </a>`).join("");
      return `
          <article class="${A}">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">${o(e.kind.replace(/_/g, " "))}</p>
                <p class="text-xs text-gray-600">${o(e.file?.name ?? "Seeded example")}</p>
              </div>
              <span class="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">Fixture</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-3">${r}</div>
          </article>
        `;
    }).join("")}</div>
      </section>
    `;
  }
  renderExportStep(t, e) {
    const r = this.exportState.job, a = this.exchangeUI.blockedReason;
    return `
      ${this.renderExampleLinks(e.filter((s) => s.kind === "export"))}
      ${a ? `
        <div class="${L} text-sm text-amber-800">
          ${o(a)}
        </div>
      ` : ""}
      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form data-export-form="true" class="space-y-5 ${g}">
          <div class="grid gap-5 md:grid-cols-2">
            <fieldset>
              <legend class="text-sm font-semibold text-gray-900">Resources</legend>
              <div class="mt-3 space-y-2">
                ${this.exchangeUI.resources.map((s) => `
                  <label class="flex items-center gap-3 text-sm text-gray-700">
                    <input type="checkbox" class="${v}" name="resources" value="${o(s.value ?? "")}" ${this.exportState.draft.resources.includes(s.value ?? "") ? "checked" : ""}>
                    <span>${o(s.label)}</span>
                  </label>`).join("")}
              </div>
            </fieldset>
            <label class="block text-sm font-semibold text-gray-900">
              Source locale
              <select name="source_locale" class="mt-3 ${E}">
                ${this.exchangeUI.sourceLocales.map((s) => `
                  <option value="${o(s.code)}" ${this.exportState.draft.sourceLocale === s.code ? "selected" : ""}>${o(s.label)}</option>`).join("")}
              </select>
            </label>
          </div>
          <fieldset>
            <legend class="text-sm font-semibold text-gray-900">Target locales</legend>
            <div class="mt-3 grid gap-2 sm:grid-cols-2">
              ${this.exchangeUI.targetLocales.map((s) => `
                <label class="flex items-center gap-3 text-sm text-gray-700">
                  <input type="checkbox" class="${v}" name="target_locales" value="${o(s.code)}" ${this.exportState.draft.targetLocales.includes(s.code) ? "checked" : ""}>
                  <span>${o(s.label)}</span>
                </label>`).join("")}
            </div>
          </fieldset>
          <label class="flex items-center gap-3 ${L} text-sm text-gray-700">
            <input type="checkbox" class="${v}" name="include_source_hash" ${this.exportState.draft.includeSourceHash ? "checked" : ""}>
            <span>Include source hashes so validate and apply can detect stale source drift.</span>
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button class="${j}" type="submit" ${a ? "disabled" : ""}>Create export package</button>
            <span class="text-sm text-gray-600">${o(this.exportState.message)}</span>
          </div>
        </form>
        <aside class="space-y-4 ${H}">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Preflight</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              ${[
      ["Resources", this.exportState.draft.resources.length],
      ["Targets", this.exportState.draft.targetLocales.length],
      ["Planned handoffs", this.exportState.draft.resources.length * this.exportState.draft.targetLocales.length]
    ].map(([s, n]) => `
                <div class="rounded-xl bg-white px-4 py-3">
                  <div class="${x}">${o(s)}</div>
                  <div class="mt-1 text-2xl font-semibold text-gray-900">${o(n)}</div>
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
          ${r ? `
              <div class="${ot}">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">Latest export job</p>
                    <p class="text-xs text-gray-500">${o(r.id)}</p>
                  </div>
                  <span class="${y(U(r.status))}">${o(r.status)}</span>
                </div>
                <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div class="h-full bg-blue-500" style="width: ${J(r)}%"></div>
                </div>
                <div class="mt-3 text-sm text-gray-600">${o(r.progress.processed)} / ${o(r.progress.total ?? 0)} rows prepared</div>
                ${this.exportState.downloadHref ? `<a class="mt-4 inline-flex text-sm font-medium text-blue-700 hover:text-blue-900" href="${o(this.exportState.downloadHref)}" download>${o(this.exportState.downloadLabel)}</a>` : ""}
              </div>` : ""}
        </aside>
      </section>
    `;
  }
  renderValidateStep(t, e, r) {
    const a = this.validateState.result, s = a?.results ?? [];
    return `
      ${this.renderExampleLinks(r.filter((n) => n.kind === "import_validate"))}
      <section class="space-y-5 ${g}">
        <form data-validate-form="true" class="space-y-4">
          <div class="${H}">
            <label class="text-sm font-semibold text-gray-900" for="exchange-import-file">Validation file</label>
            <input id="exchange-import-file" type="file" accept=".json,.csv" class="mt-3 block w-full text-sm text-gray-700">
            <p class="mt-2 text-sm text-gray-600">${o(this.validateState.upload.filename ?? "Choose a JSON or CSV package exported for translators.")}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="${j}" type="submit">Validate package</button>
            <button class="${f}" type="button" data-exchange-step="apply" ${this.applyState.rows.length === 0 ? "disabled" : ""}>Continue to apply</button>
            <span class="text-sm text-gray-600">${o(this.validateState.message)}</span>
          </div>
        </form>
        ${a ? `
            <section class="space-y-4">
              <div class="grid gap-3 md:grid-cols-4">
                ${[
      ["Processed", a.summary.processed],
      ["Succeeded", a.summary.succeeded],
      ["Conflicts", a.summary.conflicts ?? 0],
      ["Failed", a.summary.failed]
    ].map(([n, i]) => `
                  <div class="rounded-xl bg-gray-50 px-4 py-3">
                    <div class="${x}">${o(n)}</div>
                    <div class="mt-1 text-2xl font-semibold text-gray-900">${o(i)}</div>
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
                    ${s.map((n) => `
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
                        <td class="px-4 py-3 text-gray-600">${o(n.conflict?.message ?? n.error ?? "Ready for apply.")}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </section>` : ""}
      </section>
    `;
  }
  renderDecisionButton(t, e, r) {
    return `
      <button
        type="button"
        data-stage-row="${t}"
        data-stage-decision="${e}"
        class="rounded-lg border px-3 py-1 text-xs font-medium ${r ? "border-blue-500 bg-blue-100 text-blue-900" : "border-gray-200 bg-white text-gray-600"}"
      >
        ${o(e)}
      </button>
    `;
  }
  renderApplyStep() {
    const t = this.applyState.rows, e = F(this.validateState.result), r = this.applyState.result, a = r?.results ?? [], s = this.applyState.job, n = {
      apply: 0,
      skip: 0,
      override: 0,
      create: 0
    };
    for (const i of t) {
      const l = this.applyDecisionForRow(Number(i.index ?? 0));
      l === "skip" && (n.skip += 1), l === "override_source_hash" && (n.override += 1), l === "create_missing" && (n.create += 1), l === "apply" && (n.apply += 1);
    }
    return `
      <section class="space-y-5">
        <form data-apply-form="true" class="space-y-5 ${g}">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Apply import package</h2>
              <p class="mt-1 text-sm text-gray-600">${o(this.applyState.sourceLabel || "Validate a package or load a history job to begin.")}</p>
            </div>
            ${this.applyState.retryJobId ? `<span class="${y("warning")}">Retry source: ${o(this.applyState.retryJobId)}</span>` : ""}
          </div>
          <div class="grid gap-3 md:grid-cols-4">
            ${[
      ["Apply", n.apply],
      ["Skip", n.skip],
      ["Override", n.override],
      ["Create", n.create]
    ].map(([i, l]) => `
              <div class="rounded-xl bg-gray-50 px-4 py-3">
                <div class="${x}">${o(i)}</div>
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
            <button class="${j}" type="submit" ${t.length === 0 ? "disabled" : ""}>Submit apply job</button>
            <button class="${f}" type="button" data-exchange-step="history">Inspect history</button>
            <span class="text-sm text-gray-600">${o(this.applyState.message)}</span>
          </div>
          ${s ? `
                <div class="${A}">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-gray-900">Job progress</p>
                      <p class="text-xs text-gray-500">${o(s.id)}</p>
                    </div>
                    <span class="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">${o(s.status)}</span>
                  </div>
                  <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div class="h-full bg-blue-500" style="width: ${J(s)}%"></div>
                  </div>
                  <div class="mt-3 text-sm text-gray-600">${o(s.progress.processed)} / ${o(s.progress.total ?? 0)} processed</div>
                </div>` : ""}
        </form>
        ${t.length > 0 ? `
              <section class="${g}">
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
                      ${t.map((i, l) => {
      const d = typeof i.index == "number" ? i.index : l, u = e.get(d) ?? null;
      return `
                          <tr>
                            <td class="px-4 py-3 font-medium text-gray-900">${o(d)}</td>
                            <td class="px-4 py-3 text-gray-700">${o(`${i.resource}.${i.field_path}`)}</td>
                            <td class="px-4 py-3"><span class="${y(S(u?.status ?? "staged"))}">${o(u?.status ?? "staged")}</span></td>
                            <td class="px-4 py-3">
                              <div class="flex flex-wrap gap-2">
                                ${this.rowActions(d, u).map((c) => this.renderApplyDecisionButton(d, c, this.applyDecisionForRow(d) === c)).join("")}
                              </div>
                            </td>
                            <td class="px-4 py-3 text-gray-600">${o(u?.conflict?.message ?? u?.error ?? "Ready for apply.")}</td>
                          </tr>`;
    }).join("")}
                    </tbody>
                  </table>
                </div>
              </section>` : ""}
        ${r ? `
              <section class="${g} space-y-4">
                <div>
                  <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Terminal Summary</h3>
                  <p class="mt-1 text-sm text-gray-600">Review row outcomes and retained downloads before closing the loop.</p>
                </div>
                <div class="grid gap-3 md:grid-cols-4">
                  ${[
      ["Processed", r.summary.processed],
      ["Succeeded", r.summary.succeeded],
      ["Conflicts", r.summary.conflicts ?? 0],
      ["Failed", r.summary.failed]
    ].map(([i, l]) => `
                    <div class="rounded-xl bg-gray-50 px-4 py-3">
                      <div class="${x}">${o(i)}</div>
                      <div class="mt-1 text-2xl font-semibold text-gray-900">${o(l)}</div>
                    </div>`).join("")}
                </div>
                <div class="flex flex-wrap gap-3 text-sm text-blue-700">
                  ${Object.values(r.job?.downloads ?? {}).map((i) => `
                    <a href="${o(i.href)}" download="${o(i.filename)}" class="font-medium hover:text-blue-900">${o(i.label)}</a>
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
                      ${a.map((i) => `
                        <tr>
                          <td class="px-4 py-3 font-medium text-gray-900">${o(i.index)}</td>
                          <td class="px-4 py-3 text-gray-700">${o(`${i.resource}.${i.field_path}`)}</td>
                          <td class="px-4 py-3"><span class="${y(S(i.status))}">${o(i.status)}</span></td>
                          <td class="px-4 py-3 text-gray-600">${o(String(i.metadata?.resolution_decision ?? "apply"))}</td>
                          <td class="px-4 py-3 text-gray-600">${o(i.conflict?.message ?? i.error ?? "Applied without conflict.")}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </section>` : ""}
      </section>
    `;
  }
  renderApplyToggle(t, e, r) {
    return `
      <label class="flex items-center gap-3 ${L} text-sm text-gray-700">
        <input type="checkbox" class="${v}" data-apply-option="${t}" ${r ? "checked" : ""}>
        <span>${o(e)}</span>
      </label>
    `;
  }
  renderApplyDecisionButton(t, e, r) {
    return `
      <button
        type="button"
        data-apply-row="${t}"
        data-apply-decision="${e}"
        class="rounded-lg border px-3 py-1 text-xs font-medium ${r ? "border-blue-500 bg-blue-100 text-blue-900" : "border-gray-200 bg-white text-gray-600"}"
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
    const e = this.historyState.response?.meta, r = e?.job_kinds ?? [
      "export",
      "import_validate",
      "import_apply"
    ], a = e?.job_statuses ?? [
      "running",
      "completed",
      "failed"
    ], s = this.activeHistoryJob(), n = C(s);
    return `
      <section class="space-y-5">
        <div class="flex flex-wrap items-end gap-3 ${g}">
          <label class="text-sm font-medium text-gray-700">
            Kind
            <select data-history-kind class="mt-2 ${E}">
              <option value="all">All</option>
              ${r.map((i) => `
                <option value="${o(i)}" ${this.historyState.kind === i ? "selected" : ""}>${o(i)}</option>`).join("")}
            </select>
          </label>
          <label class="text-sm font-medium text-gray-700">
            Status
            <select data-history-status class="mt-2 ${E}">
              <option value="all">All</option>
              ${a.map((i) => `
                <option value="${o(i)}" ${this.historyState.jobStatus === i ? "selected" : ""}>${o(i)}</option>`).join("")}
            </select>
          </label>
          <button class="${f}" type="button" data-history-refresh="true">Refresh history</button>
          <span class="text-sm text-gray-600">${o(this.historyState.message)}</span>
        </div>
        <div class="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div class="grid gap-4">
            ${t.length > 0 ? t.map((i) => `
                  <article class="rounded-xl border p-5 ${s?.id === i.id ? "border-blue-300 bg-blue-50/50" : "border-gray-200 bg-white"}">
                    <button type="button" data-history-job="${o(i.id)}" class="w-full text-left">
                      <div class="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="${y("info")}">${o(i.kind.replace(/_/g, " "))}</span>
                            <span class="${y(U(i.status))}">${o(i.status)}</span>
                            ${i.fixture ? `<span class="${y("warning")}">Fixture</span>` : ""}
                          </div>
                          <h3 class="mt-3 text-lg font-semibold text-gray-900">${o(i.file?.name ?? i.id)}</h3>
                          <p class="mt-1 text-sm text-gray-600">Actor ${o(i.actor?.label ?? "system")} • ${o(D(i.created_at, "Pending"))}</p>
                        </div>
                        <div class="text-sm text-gray-600">
                          <div>${o(i.progress.processed)} / ${o(i.progress.total ?? 0)} processed</div>
                          <div>${o(i.file?.format ?? "json").toUpperCase()} package</div>
                        </div>
                      </div>
                    </button>
                  </article>`).join("") : `<div class="${M}">No jobs match the current filters.</div>`}
          </div>
          ${s ? `
                <section class="${g} space-y-4">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 class="text-lg font-semibold text-gray-900">${o(s.file?.name ?? s.id)}</h2>
                      <p class="mt-1 text-sm text-gray-600">${o(s.kind.replace(/_/g, " "))} • ${o(s.status)} • ${o(D(s.updated_at, "Pending"))}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      <button class="${f}" type="button" data-history-load-apply="all">Load in apply step</button>
                      <button class="${f}" type="button" data-history-load-apply="conflicts" ${(n?.summary.conflicts ?? 0) > 0 ? "" : "disabled"}>Retry conflicts</button>
                    </div>
                  </div>
                  <div class="grid gap-3 md:grid-cols-4">
                    ${[
      ["Processed", s.progress.processed],
      ["Succeeded", s.progress.succeeded],
      ["Conflicts", s.progress.conflicts ?? n?.summary.conflicts ?? 0],
      ["Failed", s.progress.failed]
    ].map(([i, l]) => `
                      <div class="rounded-xl bg-gray-50 px-4 py-3">
                        <div class="${x}">${o(i)}</div>
                        <div class="mt-1 text-2xl font-semibold text-gray-900">${o(l)}</div>
                      </div>`).join("")}
                  </div>
                  <div class="${A} text-sm text-gray-700">
                    <div><span class="font-semibold text-gray-900">Request hash:</span> ${o(s.request_hash ?? "n/a")}</div>
                    <div><span class="font-semibold text-gray-900">Request ID:</span> ${o(s.request_id ?? "n/a")}</div>
                    <div><span class="font-semibold text-gray-900">Trace ID:</span> ${o(s.trace_id ?? "n/a")}</div>
                  </div>
                  <div class="flex flex-wrap gap-3 text-sm text-blue-700">
                    ${Object.values(s.downloads ?? {}).map((i) => `
                      <a href="${o(i.href)}" download="${o(i.filename)}" class="font-medium hover:text-blue-900">${o(i.label)}</a>`).join("")}
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
                              ${n.results.map((i) => `
                                <tr>
                                  <td class="px-4 py-3 font-medium text-gray-900">${o(i.index)}</td>
                                  <td class="px-4 py-3 text-gray-700">${o(`${i.resource}.${i.field_path}`)}</td>
                                  <td class="px-4 py-3"><span class="${y(S(i.status))}">${o(i.status)}</span></td>
                                  <td class="px-4 py-3 text-gray-600">${o(String(i.metadata?.resolution_decision ?? "apply"))}</td>
                                  <td class="px-4 py-3 text-gray-600">${o(i.conflict?.message ?? i.error ?? "Completed without conflict.")}</td>
                                </tr>`).join("")}
                            </tbody>
                          </table>
                        </div>` : `<div class="${M}">No per-row results were retained for this job.</div>`}
                </section>` : ""}
        </div>
      </section>
    `;
  }
};
export {
  bt as TranslationExchangeManager,
  Y as normalizeTranslationExchangeHistoryResponse,
  I as normalizeTranslationExchangeJob,
  m as normalizeTranslationExchangeUploadDescriptor,
  k as normalizeTranslationExchangeValidationResult
};

//# sourceMappingURL=index.js.map