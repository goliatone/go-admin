import { escapeHTML as o } from "../shared/html.js";
import { httpRequest as q, readHTTPResponsePayload as G } from "../shared/transport/http-client.js";
import { a as k, i as K, o as m, s as T } from "../chunks/translation-contracts-Ct_EG7JJ.js";
import { S as Y, T as R, W as w, d as F, et as X, f as Q, l as f, q as Z, r as _, s as j, t as E, w as v, x as tt } from "../chunks/translation-shared-kfjHEDZW.js";
import { formatTranslationShortDateTime as C } from "../translation-shared/formatters.js";
var et = { root: "#translation-exchange-app" }, st = [{
  value: "pages",
  label: "pages"
}, {
  value: "posts",
  label: "posts"
}], at = [
  "en",
  "es",
  "fr",
  "de"
].map((t) => ({
  code: t,
  label: t.toUpperCase()
})), rt = [
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
function V(t) {
  return String(t ?? "").trim();
}
function B(t) {
  return !!t && t !== "none" && t !== "mixed";
}
function it(t) {
  return !t || typeof t != "object" ? !1 : t.configured === !0 || !!String(t.source_locale ?? "").trim() || Array.isArray(t.source_locales) && t.source_locales.length > 0 || Array.isArray(t.target_locales) && t.target_locales.length > 0 || Array.isArray(t.resources) && t.resources.length > 0 || Array.isArray(t.default_resources) && t.default_resources.length > 0 || Array.isArray(t.default_target_locales) && t.default_target_locales.length > 0 || typeof t.include_source_hash == "boolean" || typeof t.include_examples == "boolean" || !!(t.template && Object.keys(t.template).length > 0) || !!(t.apply && Object.keys(t.apply).length > 0);
}
function ot(t, e, a) {
  const r = String(a[t] ?? "").trim();
  if (r) return r;
  const s = String(e ?? "").trim();
  return s && b(s) !== t ? s : t.toUpperCase();
}
function D(t, e) {
  const a = /* @__PURE__ */ new Set(), r = [];
  for (const s of Array.isArray(t) ? t : []) {
    const l = b(s?.code);
    !B(l) || a.has(l) || (a.add(l), r.push({
      code: l,
      label: ot(l, s?.label, e)
    }));
  }
  return r;
}
function lt(t) {
  const e = /* @__PURE__ */ new Set(), a = [];
  for (const r of Array.isArray(t) ? t : []) {
    const s = V(r?.value ?? r?.id);
    !s || e.has(s) || (e.add(s), a.push({
      value: s,
      id: s,
      label: String(r?.label ?? s).trim() || s
    }));
  }
  return a;
}
function z(t, e, a = "") {
  const r = /* @__PURE__ */ new Set(), s = [];
  for (const l of Array.isArray(t) ? t : []) {
    const i = b(l);
    !i || i === a || !e.has(i) || r.has(i) || (r.add(i), s.push(i));
  }
  return s;
}
function W(t, e) {
  const a = /* @__PURE__ */ new Set(), r = [];
  for (const s of Array.isArray(t) ? t : []) {
    const l = V(s);
    !l || !e.has(l) || a.has(l) || (a.add(l), r.push(l));
  }
  return r;
}
function nt(t) {
  if (!it(t)) return {
    configured: !1,
    blockedReason: "",
    resources: st,
    sourceLocales: at,
    targetLocales: rt,
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
  const e = t?.locale_labels ?? {}, a = lt(t?.resources), r = D(t?.source_locales, e), s = b(t?.source_locale), l = B(s) ? s : r[0]?.code || "", i = D(t?.target_locales, e).filter((h) => h.code && h.code !== l), n = new Set(a.map((h) => h.value ?? "")), d = new Set(i.map((h) => h.code)), u = W(t?.default_resources, n), c = z(t?.default_target_locales, d, l), p = [];
  return a.length === 0 && p.push("No exchange resources are configured."), (r.length === 0 || !l) && p.push("No source locale is configured."), i.length === 0 && p.push("No target locales are configured."), {
    configured: !0,
    blockedReason: p.join(" "),
    resources: a,
    sourceLocales: r,
    targetLocales: i,
    defaultResources: u.length > 0 ? u : a.map((h) => h.value ?? ""),
    defaultTargetLocales: c.length > 0 ? c : i.map((h) => h.code),
    defaultSourceLocale: l,
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
function O(t) {
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
var g = `${F} p-5`, dt = `${F} p-4`, U = `${w} border ${_} ${E} p-5`, A = `${w} border ${_} ${E} p-4`, L = `${w} border ${_} ${E} px-4 py-3`, H = `${w} border ${_} ${E} px-6 py-10 text-center text-sm text-gray-600`, x = "text-xs uppercase tracking-wider text-gray-500", ct = `mt-2 text-2xl font-bold ${Z}`;
function pt(t, e) {
  const a = typeof window < "u" && typeof window.btoa == "function" ? window.btoa.bind(window) : typeof globalThis.btoa == "function" ? globalThis.btoa.bind(globalThis) : null;
  return a ? `data:${t};base64,${a(encodeURIComponent(e).replace(/%([0-9A-F]{2})/g, (r, s) => String.fromCharCode(parseInt(s, 16))))}` : `data:${t},${encodeURIComponent(e)}`;
}
function ut(t) {
  return new Promise((e) => setTimeout(e, Math.max(0, t)));
}
function J(t) {
  return !t || !t.progress.total || t.progress.total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(t.progress.processed / t.progress.total * 100)));
}
function ht(t, e) {
  return t?.downloads ? t.downloads[e]?.href ?? t.downloads.artifact?.href ?? "" : "";
}
function yt(t, e) {
  return t?.downloads ? t.downloads[e]?.label ?? t.downloads.artifact?.label ?? "Download artifact" : "";
}
function M(t) {
  const e = [];
  return t.resources.length === 0 && e.push("Select at least one resource."), t.targetLocales.length === 0 && e.push("Select at least one target locale."), t.targetLocales.includes(t.sourceLocale) && e.push("Target locales cannot include the source locale."), t.includeSourceHash || e.push("Conflict detection is weaker when source hashes are excluded."), e;
}
function gt(t) {
  const e = {};
  if (!t) return e;
  for (const a of t.results) e[a.index] = a.status === "success" ? "accepted" : "rejected";
  return e;
}
function P(t, e) {
  const a = {};
  for (const [r, s] of t.entries()) a[typeof s.index == "number" ? s.index : r] = "apply";
  if (!e) return a;
  for (const r of e.results) a[r.index] = r.status === "success" ? "apply" : "skip";
  return a;
}
function N(t) {
  const e = /* @__PURE__ */ new Map();
  for (const a of t?.results ?? []) e.set(a.index, a);
  return e;
}
function I(t) {
  return t?.result ? {
    ...T({
      ...t.result,
      job: t
    }),
    job: t
  } : null;
}
function ft(t) {
  const e = String(t ?? "").match(/^data:([^,]*?),(.*)$/i);
  if (!e) return "";
  const [, a, r] = e;
  if (a.includes(";base64")) {
    const s = typeof window < "u" && typeof window.atob == "function" ? window.atob.bind(window) : typeof globalThis.atob == "function" ? globalThis.atob.bind(globalThis) : null;
    if (!s) return "";
    const l = s(r);
    return decodeURIComponent(Array.from(l).map((i) => `%${i.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
  }
  return decodeURIComponent(r);
}
function $(t, e) {
  return {
    ...t,
    index: typeof t.index == "number" ? t.index : e
  };
}
var $t = class {
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
    }, this.handleClick = (r) => {
      const s = r.target;
      if (!s) return;
      const l = s.closest("[data-exchange-step]");
      if (l) {
        this.step = l.dataset.exchangeStep, this.render(), this.step === "history" && this.historyState.status === "idle" && this.loadHistory();
        return;
      }
      const i = s.closest("[data-stage-row]");
      if (i) {
        const c = Number(i.dataset.stageRow ?? "-1"), p = i.dataset.stageDecision;
        c >= 0 && (p === "accepted" || p === "rejected") && (this.validateState.decisions[c] = p, this.applyState.resolutions[c] = p === "accepted" ? "apply" : "skip", this.render());
        return;
      }
      const n = s.closest("[data-apply-row]");
      if (n) {
        const c = Number(n.dataset.applyRow ?? "-1"), p = n.dataset.applyDecision;
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
    }, this.handleChange = (r) => {
      const s = r.target;
      if (s) {
        if (s.matches('[data-export-form="true"] input, [data-export-form="true"] select')) {
          const l = s.closest("form");
          l && (this.exportState.draft = this.readExportDraft(l), this.render());
          return;
        }
        if (s.id === "exchange-import-file" && s instanceof HTMLInputElement) {
          const l = s.files?.[0] ?? null;
          this.stageImportFile(l);
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
          const l = String(s.dataset.applyOption ?? ""), i = s instanceof HTMLInputElement ? s.checked === !0 : !1;
          switch (l) {
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
    }, this.handleSubmit = (r) => {
      const s = r.target;
      if (s) {
        if (s.matches('[data-export-form="true"]')) {
          r.preventDefault(), this.submitExport(s);
          return;
        }
        if (s.matches('[data-validate-form="true"]')) {
          r.preventDefault(), this.submitValidate();
          return;
        }
        s.matches('[data-apply-form="true"]') && (r.preventDefault(), this.submitApply());
      }
    }, this.config = t, this.exchangeUI = nt(t.exchangeUIConfig), this.exportState.draft = {
      resources: this.exchangeUI.defaultResources,
      sourceLocale: this.exchangeUI.defaultSourceLocale,
      targetLocales: this.exchangeUI.defaultTargetLocales,
      includeSourceHash: this.exchangeUI.includeSourceHash
    }, this.applyState.allowCreateMissing = this.exchangeUI.apply.allowCreateMissing, this.applyState.allowSourceHashOverride = this.exchangeUI.apply.allowSourceHashOverride, this.applyState.continueOnError = this.exchangeUI.apply.continueOnError, this.applyState.dryRun = this.exchangeUI.apply.dryRun, this.selectors = {
      ...et,
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
    }), a = T(e);
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
    const r = e.intervalMs ?? 250, s = e.timeoutMs ?? 15e3, l = Date.now();
    let i = 0;
    for (; ; ) {
      if (e.signal?.aborted) throw new Error("Polling aborted.");
      i > 0 && this.emitAnalytics("exchange_apply_retry", {
        poll_endpoint: a,
        attempt: i
      });
      const n = await this.fetchJSON(a), d = k(n.job && typeof n.job == "object" ? n.job : n);
      if (!d) throw new Error("Job payload missing.");
      if (e.onTick?.(d, i), d.status !== "running")
        return this.emitAnalytics("exchange_apply_completion", {
          job_id: d.id,
          status: d.status,
          processed: d.progress.processed,
          failed: d.progress.failed
        }), d;
      if (Date.now() - l >= s) throw new Error("Polling timed out.");
      i += 1, await ut(r);
    }
  }
  readExportDraft(t) {
    const e = new FormData(t), a = new Set(this.exchangeUI.resources.map((i) => i.value ?? "")), r = new Set(this.exchangeUI.targetLocales.map((i) => i.code)), s = b(e.get("source_locale")), l = this.exchangeUI.sourceLocales.some((i) => i.code === s) ? s : this.exchangeUI.defaultSourceLocale;
    return {
      resources: W(e.getAll("resources"), a),
      sourceLocale: l,
      targetLocales: z(e.getAll("target_locales"), r, l),
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
    const a = M(e);
    if (e.resources.length === 0 || e.targetLocales.length === 0 || a.some((r) => r.includes("cannot include"))) {
      this.exportState.status = "error", this.exportState.message = a[0] ?? "Complete the export filters before continuing.", this.render();
      return;
    }
    this.exportState.status = "submitting", this.exportState.message = "Preparing export package...", this.render();
    try {
      const r = await this.postJSON(`${this.config.apiPath}/export`, {
        filter: {
          resources: e.resources,
          source_locale: e.sourceLocale,
          target_locales: e.targetLocales,
          include_source_hash: e.includeSourceHash
        },
        async: !0
      }), s = r.job && typeof r.job == "object" ? r.job : r.data && typeof r.data == "object" ? r.data.job : void 0, l = Array.isArray(r.rows) ? r.rows : r.data && typeof r.data == "object" && Array.isArray(r.data.rows) ? r.data.rows ?? [] : [], i = k(s);
      if (this.exportState.job = i, i?.status === "running") {
        this.exportState.status = "polling", this.exportState.message = "Export job running. Polling for artifact...", this.render();
        const n = await this.pollJobUntilTerminal(i, {
          intervalMs: 250,
          timeoutMs: 15e3,
          onTick: (d) => {
            this.exportState.job = d, this.exportState.message = `Export job running: ${d.progress.processed} / ${d.progress.total ?? 0} processed.`, this.render();
          }
        });
        this.exportState.job = n;
      }
      this.exportState.downloadHref = ht(this.exportState.job, "artifact") || this.createRowsDownload(l), this.exportState.downloadLabel = yt(this.exportState.job, "artifact") || "Download export JSON", this.exportState.status = "completed", this.exportState.message = `${this.exportState.job?.summary?.row_count ?? r.row_count ?? 0} rows ready for handoff.`, this.toast?.success(this.exportState.message), this.loadHistory(!0);
    } catch (r) {
      const s = r instanceof Error ? r.message : "Export failed.";
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
        const a = e instanceof Error ? e.message : "Unable to read import file.";
        this.validateState.upload = m({
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
      const e = T(await this.postForm(`${this.config.apiPath}/import/validate`, t));
      this.validateState.result = e, this.validateState.decisions = gt(e), this.validateState.upload = m({
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
        const a = await this.pollJobUntilTerminal(e.job, {
          intervalMs: 250,
          timeoutMs: 15e3,
          onTick: (r) => {
            this.applyState.job = r, this.applyState.message = `Apply job running: ${r.progress.processed} / ${r.progress.total ?? 0} processed.`, this.render();
          }
        });
        this.applyState.job = a, this.applyState.result = I(a);
      }
      this.applyState.status = "completed", this.applyState.message = this.applyState.dryRun ? "Dry-run apply completed." : "Apply completed.", this.toast?.success(this.applyState.message), this.loadHistory(!0);
    } catch (e) {
      const a = e instanceof Error ? e.message : "Apply failed.";
      this.applyState.status = "error", this.applyState.message = a, this.toast?.error(a);
    }
    this.render();
  }
  buildApplyResolutions() {
    const t = [], e = new Set(this.applyState.rows.map((a, r) => typeof a.index == "number" ? a.index : r));
    for (const [a, r] of Object.entries(this.applyState.resolutions)) {
      const s = Number(a);
      !e.has(s) || !r || r === "apply" || t.push({
        row: s,
        decision: r
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
        this.historyState.response = K(a), this.historyState.status = "ready", this.historyState.message = "", this.historyState.selectedJobId || (this.historyState.selectedJobId = this.historyState.response.history.items[0]?.id ?? ""), this.historyState.selectedJobId && !this.historyState.response.history.items.some((r) => r.id === this.historyState.selectedJobId) && (this.historyState.selectedJobId = this.historyState.response.history.items[0]?.id ?? "");
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
      const r = ft(a);
      let s = String(t.file?.format ?? "json").toLowerCase() === "csv" ? this.parseCSVText(r) : this.parseJSONRows(r);
      s = s.map($);
      const l = I(t);
      if (e && l) {
        const i = new Set(l.results.filter((n) => n.status === "conflict" || n.status === "error").map((n) => n.index));
        s = s.filter((n, d) => i.has(typeof n.index == "number" ? n.index : d));
      }
      this.applyState = {
        ...this.applyState,
        rows: s,
        sourceLabel: t.file?.name ?? t.id,
        retryJobId: t.id,
        resolutions: P(s, l),
        allowCreateMissing: t.request?.allow_create_missing === !0,
        allowSourceHashOverride: t.request?.allow_source_hash_override === !0,
        continueOnError: t.request?.continue_on_error !== !1,
        dryRun: t.request?.dry_run === !0,
        status: "ready",
        message: e ? "Loaded conflict rows from history into the apply step." : "Loaded history job into the apply step.",
        result: null,
        job: null
      }, this.validateState.result = l, this.step = "apply", this.toast?.info(this.applyState.message);
    } catch (r) {
      const s = r instanceof Error ? r.message : "Unable to load the selected history artifact.";
      this.toast?.error(s);
    }
    this.render();
  }
  createRowsDownload(t) {
    return pt("application/json", JSON.stringify(t, null, 2));
  }
  async parseImportFile(t) {
    const e = await this.readFileText(t);
    return ((t.name.toLowerCase().endsWith(".csv") ? "csv" : "json") == "csv" ? this.parseCSVText(e) : this.parseJSONRows(e)).map($);
  }
  async readFileText(t) {
    const e = t;
    if (typeof e.text == "function") return e.text();
    if (typeof e.arrayBuffer == "function" && typeof TextDecoder < "u") {
      const r = await e.arrayBuffer();
      return new TextDecoder().decode(r);
    }
    const a = typeof window < "u" ? window.FileReader : void 0;
    if (a) return new Promise((r, s) => {
      const l = new a();
      l.onerror = () => s(/* @__PURE__ */ new Error("Unable to read import file.")), l.onload = () => r(String(l.result ?? "")), l.readAsText(t);
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
    const a = this.parseCSVRecord(e[0]).map((s) => s.trim()), r = [];
    for (const s of e.slice(1)) {
      if (!s.trim()) continue;
      const l = this.parseCSVRecord(s), i = {};
      a.forEach((n, d) => {
        i[n] = l[d] ?? "";
      }), r.push({
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
    return r;
  }
  parseCSVRecord(t) {
    const e = [];
    let a = "", r = !1;
    for (let s = 0; s < t.length; s += 1) {
      const l = t[s], i = t[s + 1];
      if (l === '"') {
        if (r && i === '"') {
          a += '"', s += 1;
          continue;
        }
        r = !r;
        continue;
      }
      if (l === "," && !r) {
        e.push(a), a = "";
        continue;
      }
      a += l;
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
    const a = ["apply", "skip"], r = e?.metadata ?? {};
    return (e?.conflict?.type === "stale_source_hash" || r.current_source_hash || r.provided_source_hash) && a.push("override_source_hash"), (r.create_translation_hint === !0 || r.create_translation_required === !0) && a.push("create_missing"), a;
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
    const a = await q(t, e), { payload: r } = await G(a);
    if (!a.ok) {
      if (r && typeof r == "object") {
        const s = r.error?.message ?? r.message;
        throw new Error(s || "Exchange request failed.");
      }
      throw new Error(typeof r == "string" ? r : "Exchange request failed.");
    }
    return r ?? {};
  }
  emitAnalytics(t, e = {}) {
    if (this.config.telemetryEnabled === !1) return;
    const a = {
      name: t,
      fields: e
    }, r = this.config.analyticsTarget ?? (typeof window < "u" ? window : void 0);
    r && typeof r.dispatchEvent == "function" && r.dispatchEvent(new CustomEvent("translation:exchange-analytics", { detail: a }));
  }
  render() {
    if (!this.root) return;
    const t = M(this.exportState.draft), e = Object.values(this.validateState.decisions).filter((l) => l === "accepted").length, a = Object.values(this.validateState.decisions).filter((l) => l === "rejected").length, r = this.historyExamples(), s = this.filteredHistoryItems();
    this.root.innerHTML = `
      <section class="${Q} overflow-hidden">
        <header class="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="${Y}">Translation Exchange</p>
              <h1 class="${ct}">Translation Exchange Wizard</h1>
              <p class="${tt}">Prepare external translation files, validate row-level conflicts, apply imports with explicit create and conflict controls, and inspect retained job history for retries and audits.</p>
            </div>
            <a class="${f}" href="${o(`${this.config.apiPath}/template?format=json`)}">
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
          ${this.step === "export" ? this.renderExportStep(t, r) : ""}
          ${this.step === "validate" ? this.renderValidateStep(e, a, r) : ""}
          ${this.step === "apply" ? this.renderApplyStep() : ""}
          ${this.step === "history" ? this.renderHistoryStep(s) : ""}
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
      const a = Object.values(e.downloads ?? {}).map((r) => `
              <a class="text-sm font-medium text-blue-700 hover:text-blue-900" href="${o(r.href)}" download="${o(r.filename)}">
                ${o(r.label)}
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
            <div class="mt-3 flex flex-wrap gap-3">${a}</div>
          </article>
        `;
    }).join("")}</div>
      </section>
    `;
  }
  renderExportStep(t, e) {
    const a = this.exportState.job, r = this.exchangeUI.blockedReason;
    return `
      ${this.renderExampleLinks(e.filter((s) => s.kind === "export"))}
      ${r ? `
        <div class="${L} text-sm text-amber-800">
          ${o(r)}
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
              <select name="source_locale" class="mt-3 ${R}">
                ${this.exchangeUI.sourceLocales.map((s) => `
                  <option value="${o(s.code)}" ${this.exportState.draft.sourceLocale === s.code ? "selected" : ""}>${o(s.label)}</option>`).join("")}
              </select>
            </label>
          </div>
          <fieldset>
            <legend class="text-sm font-semibold text-gray-900">Target locales</legend>
            <div class="mt-3 flex flex-wrap gap-3">
              ${this.exchangeUI.targetLocales.map((s) => `
                <label class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700">
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
            <button class="${j}" type="submit" ${r ? "disabled" : ""}>Create export package</button>
            <span class="text-sm text-gray-600">${o(this.exportState.message)}</span>
          </div>
        </form>
        <aside class="space-y-4 ${U}">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Preflight</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              ${[
      ["Resources", this.exportState.draft.resources.length],
      ["Targets", this.exportState.draft.targetLocales.length],
      ["Planned handoffs", this.exportState.draft.resources.length * this.exportState.draft.targetLocales.length]
    ].map(([s, l]) => `
                <div class="rounded-xl bg-white px-4 py-3">
                  <div class="${x}">${o(s)}</div>
                  <div class="mt-1 text-2xl font-semibold text-gray-900">${o(l)}</div>
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
              <div class="${dt}">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">Latest export job</p>
                    <p class="text-xs text-gray-500">${o(a.id)}</p>
                  </div>
                  <span class="${y(O(a.status))}">${o(a.status)}</span>
                </div>
                <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div class="h-full bg-blue-500" style="width: ${J(a)}%"></div>
                </div>
                <div class="mt-3 text-sm text-gray-600">${o(a.progress.processed)} / ${o(a.progress.total ?? 0)} rows prepared</div>
                ${this.exportState.downloadHref ? `<a class="mt-4 inline-flex text-sm font-medium text-blue-700 hover:text-blue-900" href="${o(this.exportState.downloadHref)}" download>${o(this.exportState.downloadLabel)}</a>` : ""}
              </div>` : ""}
        </aside>
      </section>
    `;
  }
  renderValidateStep(t, e, a) {
    const r = this.validateState.result, s = r?.results ?? [];
    return `
      ${this.renderExampleLinks(a.filter((l) => l.kind === "import_validate"))}
      <section class="space-y-5 ${g}">
        <form data-validate-form="true" class="space-y-4">
          <div class="${U}">
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
        ${r ? `
            <section class="space-y-4">
              <div class="grid gap-3 md:grid-cols-4">
                ${[
      ["Processed", r.summary.processed],
      ["Succeeded", r.summary.succeeded],
      ["Conflicts", r.summary.conflicts ?? 0],
      ["Failed", r.summary.failed]
    ].map(([l, i]) => `
                  <div class="rounded-xl bg-gray-50 px-4 py-3">
                    <div class="${x}">${o(l)}</div>
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
                    ${s.map((l) => `
                      <tr>
                        <td class="px-4 py-3 font-medium text-gray-900">${o(l.index)}</td>
                        <td class="px-4 py-3 text-gray-700">${o(`${l.resource}.${l.field_path}`)}</td>
                        <td class="px-4 py-3 text-gray-700">${o(l.target_locale.toUpperCase())}</td>
                        <td class="px-4 py-3"><span class="${y(S(l.status))}">${o(l.status)}</span></td>
                        <td class="px-4 py-3">
                          <div class="flex gap-2">
                            ${this.renderDecisionButton(l.index, "accepted", this.validateState.decisions[l.index] === "accepted")}
                            ${this.renderDecisionButton(l.index, "rejected", this.validateState.decisions[l.index] === "rejected")}
                          </div>
                        </td>
                        <td class="px-4 py-3 text-gray-600">${o(l.conflict?.message ?? l.error ?? "Ready for apply.")}</td>
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
    const t = this.applyState.rows, e = N(this.validateState.result), a = this.applyState.result, r = a?.results ?? [], s = this.applyState.job, l = {
      apply: 0,
      skip: 0,
      override: 0,
      create: 0
    };
    for (const i of t) {
      const n = this.applyDecisionForRow(Number(i.index ?? 0));
      n === "skip" && (l.skip += 1), n === "override_source_hash" && (l.override += 1), n === "create_missing" && (l.create += 1), n === "apply" && (l.apply += 1);
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
      ["Apply", l.apply],
      ["Skip", l.skip],
      ["Override", l.override],
      ["Create", l.create]
    ].map(([i, n]) => `
              <div class="rounded-xl bg-gray-50 px-4 py-3">
                <div class="${x}">${o(i)}</div>
                <div class="mt-1 text-2xl font-semibold text-gray-900">${o(n)}</div>
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
                      ${t.map((i, n) => {
      const d = typeof i.index == "number" ? i.index : n, u = e.get(d) ?? null;
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
        ${a ? `
              <section class="${g} space-y-4">
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
    ].map(([i, n]) => `
                    <div class="rounded-xl bg-gray-50 px-4 py-3">
                      <div class="${x}">${o(i)}</div>
                      <div class="mt-1 text-2xl font-semibold text-gray-900">${o(n)}</div>
                    </div>`).join("")}
                </div>
                <div class="flex flex-wrap gap-3 text-sm text-blue-700">
                  ${Object.values(a.job?.downloads ?? {}).map((i) => `
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
                      ${r.map((i) => `
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
  renderApplyToggle(t, e, a) {
    return `
      <label class="flex items-center gap-3 ${L} text-sm text-gray-700">
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
    const e = this.historyState.response?.meta, a = e?.job_kinds ?? [
      "export",
      "import_validate",
      "import_apply"
    ], r = e?.job_statuses ?? [
      "running",
      "completed",
      "failed"
    ], s = this.activeHistoryJob(), l = I(s);
    return `
      <section class="space-y-5">
        <div class="flex flex-wrap items-end gap-3 ${g}">
          <label class="text-sm font-medium text-gray-700">
            Kind
            <select data-history-kind class="mt-2 ${R}">
              <option value="all">All</option>
              ${a.map((i) => `
                <option value="${o(i)}" ${this.historyState.kind === i ? "selected" : ""}>${o(i)}</option>`).join("")}
            </select>
          </label>
          <label class="text-sm font-medium text-gray-700">
            Status
            <select data-history-status class="mt-2 ${R}">
              <option value="all">All</option>
              ${r.map((i) => `
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
                            <span class="${y(O(i.status))}">${o(i.status)}</span>
                            ${i.fixture ? `<span class="${y("warning")}">Fixture</span>` : ""}
                          </div>
                          <h3 class="mt-3 text-lg font-semibold text-gray-900">${o(i.file?.name ?? i.id)}</h3>
                          <p class="mt-1 text-sm text-gray-600">Actor ${o(i.actor?.label ?? "system")} • ${o(C(i.created_at, "Pending"))}</p>
                        </div>
                        <div class="text-sm text-gray-600">
                          <div>${o(i.progress.processed)} / ${o(i.progress.total ?? 0)} processed</div>
                          <div>${o(i.file?.format ?? "json").toUpperCase()} package</div>
                        </div>
                      </div>
                    </button>
                  </article>`).join("") : `<div class="${H}">No jobs match the current filters.</div>`}
          </div>
          ${s ? `
                <section class="${g} space-y-4">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 class="text-lg font-semibold text-gray-900">${o(s.file?.name ?? s.id)}</h2>
                      <p class="mt-1 text-sm text-gray-600">${o(s.kind.replace(/_/g, " "))} • ${o(s.status)} • ${o(C(s.updated_at, "Pending"))}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      <button class="${f}" type="button" data-history-load-apply="all">Load in apply step</button>
                      <button class="${f}" type="button" data-history-load-apply="conflicts" ${(l?.summary.conflicts ?? 0) > 0 ? "" : "disabled"}>Retry conflicts</button>
                    </div>
                  </div>
                  <div class="grid gap-3 md:grid-cols-4">
                    ${[
      ["Processed", s.progress.processed],
      ["Succeeded", s.progress.succeeded],
      ["Conflicts", s.progress.conflicts ?? l?.summary.conflicts ?? 0],
      ["Failed", s.progress.failed]
    ].map(([i, n]) => `
                      <div class="rounded-xl bg-gray-50 px-4 py-3">
                        <div class="${x}">${o(i)}</div>
                        <div class="mt-1 text-2xl font-semibold text-gray-900">${o(n)}</div>
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
                  ${l ? `
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
                              ${l.results.map((i) => `
                                <tr>
                                  <td class="px-4 py-3 font-medium text-gray-900">${o(i.index)}</td>
                                  <td class="px-4 py-3 text-gray-700">${o(`${i.resource}.${i.field_path}`)}</td>
                                  <td class="px-4 py-3"><span class="${y(S(i.status))}">${o(i.status)}</span></td>
                                  <td class="px-4 py-3 text-gray-600">${o(String(i.metadata?.resolution_decision ?? "apply"))}</td>
                                  <td class="px-4 py-3 text-gray-600">${o(i.conflict?.message ?? i.error ?? "Completed without conflict.")}</td>
                                </tr>`).join("")}
                            </tbody>
                          </table>
                        </div>` : `<div class="${H}">No per-row results were retained for this job.</div>`}
                </section>` : ""}
        </div>
      </section>
    `;
  }
};
export {
  $t as TranslationExchangeManager,
  K as normalizeTranslationExchangeHistoryResponse,
  k as normalizeTranslationExchangeJob,
  m as normalizeTranslationExchangeUploadDescriptor,
  T as normalizeTranslationExchangeValidationResult
};

//# sourceMappingURL=index.js.map