import type {
  ApplyRequest,
  ApplyResponse,
  ApplyResolutionDecision,
  ExportRow,
  LongPollOptions,
  TranslationExchangeConfig,
  TranslationExchangeSelectors,
  TranslationExchangeStageDecision,
  ToastNotifier,
} from "./types.js";
import {
  normalizeTranslationExchangeHistoryResponse,
  normalizeTranslationExchangeJob,
  normalizeTranslationExchangeUploadDescriptor,
  normalizeTranslationExchangeValidationResult,
  type TranslationExchangeConflictRow,
  type TranslationExchangeHistoryResponse,
  type TranslationExchangeJob,
  type TranslationExchangeValidationResult,
} from "../translation-contracts/index.js";
import {
  getStatusSeverityClass,
  type BadgeSeverity,
} from "../translation-shared/style-constants.js";

const DEFAULT_SELECTORS: TranslationExchangeSelectors = {
  root: "#translation-exchange-app",
};

type ExchangeStep = "export" | "validate" | "apply" | "history";
type ImportRow = ExportRow & { index?: number };

interface ExportDraft {
  resources: string[];
  sourceLocale: string;
  targetLocales: string[];
  includeSourceHash: boolean;
}

interface ExportState {
  draft: ExportDraft;
  status: "idle" | "submitting" | "polling" | "completed" | "error";
  job: TranslationExchangeJob | null;
  downloadHref: string;
  downloadLabel: string;
  message: string;
}

interface ValidateState {
  upload: ReturnType<typeof normalizeTranslationExchangeUploadDescriptor>;
  file: File | null;
  parsedRows: ImportRow[];
  result: TranslationExchangeValidationResult | null;
  decisions: Record<number, TranslationExchangeStageDecision>;
  status: "idle" | "loading_file" | "validating" | "validated" | "error";
  message: string;
}

interface ApplyState {
  rows: ImportRow[];
  sourceLabel: string;
  retryJobId: string;
  resolutions: Record<number, ApplyResolutionDecision>;
  allowCreateMissing: boolean;
  allowSourceHashOverride: boolean;
  continueOnError: boolean;
  dryRun: boolean;
  status:
    | "idle"
    | "ready"
    | "submitting"
    | "polling"
    | "completed"
    | "error";
  message: string;
  result: ApplyResponse | null;
  job: TranslationExchangeJob | null;
}

interface HistoryState {
  status: "idle" | "loading" | "ready" | "error";
  response: TranslationExchangeHistoryResponse | null;
  kind: string;
  jobStatus: string;
  selectedJobId: string;
  message: string;
}

function escapeHTML(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function jobStatusSeverity(status: string): BadgeSeverity {
  switch (status) {
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

function rowStatusSeverity(status: string): BadgeSeverity {
  switch (status) {
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

function statusBadgeClass(severity: BadgeSeverity): string {
  return `rounded-full px-3 py-1 text-xs font-medium ${getStatusSeverityClass(severity)}`;
}

function formatDate(value?: string): string {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function toDataURL(contentType: string, value: string): string {
  const base64 =
    typeof window !== "undefined" && typeof window.btoa === "function"
      ? window.btoa.bind(window)
      : typeof globalThis.btoa === "function"
        ? globalThis.btoa.bind(globalThis)
        : null;
  if (!base64) {
    return `data:${contentType},${encodeURIComponent(value)}`;
  }
  return `data:${contentType};base64,${base64(
    encodeURIComponent(value).replace(
      /%([0-9A-F]{2})/g,
      (_, byte: string) => String.fromCharCode(parseInt(byte, 16)),
    ),
  )}`;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function progressPercent(job: TranslationExchangeJob | null): number {
  if (!job || !job.progress.total || job.progress.total <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, Math.round((job.progress.processed / job.progress.total) * 100)),
  );
}

function downloadHref(job: TranslationExchangeJob | null, preferred: string): string {
  if (!job?.downloads) return "";
  return job.downloads[preferred]?.href ?? job.downloads.artifact?.href ?? "";
}

function downloadLabel(job: TranslationExchangeJob | null, preferred: string): string {
  if (!job?.downloads) return "";
  return (
    job.downloads[preferred]?.label ??
    job.downloads.artifact?.label ??
    "Download artifact"
  );
}

function exportWarnings(draft: ExportDraft): string[] {
  const warnings: string[] = [];
  if (draft.resources.length === 0) warnings.push("Select at least one resource.");
  if (draft.targetLocales.length === 0) warnings.push("Select at least one target locale.");
  if (draft.targetLocales.includes(draft.sourceLocale)) {
    warnings.push("Target locales cannot include the source locale.");
  }
  if (!draft.includeSourceHash) {
    warnings.push("Conflict detection is weaker when source hashes are excluded.");
  }
  return warnings;
}

function defaultDecisions(
  result: TranslationExchangeValidationResult | null,
): Record<number, TranslationExchangeStageDecision> {
  const decisions: Record<number, TranslationExchangeStageDecision> = {};
  if (!result) return decisions;
  for (const row of result.results) {
    decisions[row.index] = row.status === "success" ? "accepted" : "rejected";
  }
  return decisions;
}

function defaultApplyResolutions(
  rows: ImportRow[],
  result: TranslationExchangeValidationResult | null,
): Record<number, ApplyResolutionDecision> {
  const out: Record<number, ApplyResolutionDecision> = {};
  for (const [index, row] of rows.entries()) {
    out[typeof row.index === "number" ? row.index : index] = "apply";
  }
  if (!result) return out;
  for (const row of result.results) {
    out[row.index] = row.status === "success" ? "apply" : "skip";
  }
  return out;
}

function resultRowByIndex(
  result: TranslationExchangeValidationResult | null,
): Map<number, TranslationExchangeConflictRow> {
  const out = new Map<number, TranslationExchangeConflictRow>();
  for (const row of result?.results ?? []) {
    out.set(row.index, row);
  }
  return out;
}

function jobValidationResult(job: TranslationExchangeJob | null): ApplyResponse | null {
  if (!job?.result) return null;
  return {
    ...normalizeTranslationExchangeValidationResult({
      ...job.result,
      job,
    }),
    job,
  };
}

function decodeDataURL(href: string): string {
  const value = String(href ?? "");
  const match = value.match(/^data:([^,]*?),(.*)$/i);
  if (!match) return "";
  const [, meta, body] = match;
  if (meta.includes(";base64")) {
    const decode =
      typeof window !== "undefined" && typeof window.atob === "function"
        ? window.atob.bind(window)
        : typeof globalThis.atob === "function"
          ? globalThis.atob.bind(globalThis)
          : null;
    if (!decode) return "";
    const bytes = decode(body);
    return decodeURIComponent(
      Array.from(bytes)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
  }
  return decodeURIComponent(body);
}

function normalizeRowIndex(row: ImportRow, index: number): ImportRow {
  return {
    ...row,
    index: typeof row.index === "number" ? row.index : index,
  };
}

export class TranslationExchangeManager {
  private readonly config: TranslationExchangeConfig;
  private readonly selectors: TranslationExchangeSelectors;
  private readonly toast: ToastNotifier | null;
  private root: HTMLElement | null = null;

  private step: ExchangeStep = "export";
  private exportState: ExportState = {
    draft: {
      resources: ["pages"],
      sourceLocale: "en",
      targetLocales: ["es", "fr"],
      includeSourceHash: true,
    },
    status: "idle",
    job: null,
    downloadHref: "",
    downloadLabel: "",
    message: "",
  };
  private validateState: ValidateState = {
    upload: normalizeTranslationExchangeUploadDescriptor({ state: "idle" }),
    file: null,
    parsedRows: [],
    result: null,
    decisions: {},
    status: "idle",
    message: "",
  };
  private applyState: ApplyState = {
    rows: [],
    sourceLabel: "",
    retryJobId: "",
    resolutions: {},
    allowCreateMissing: false,
    allowSourceHashOverride: false,
    continueOnError: true,
    dryRun: false,
    status: "idle",
    message: "",
    result: null,
    job: null,
  };
  private historyState: HistoryState = {
    status: "idle",
    response: null,
    kind: "all",
    jobStatus: "all",
    selectedJobId: "",
    message: "",
  };

  constructor(
    config: TranslationExchangeConfig,
    selectors: Partial<TranslationExchangeSelectors> = {},
    toast?: ToastNotifier,
  ) {
    this.config = config;
    this.selectors = { ...DEFAULT_SELECTORS, ...selectors };
    this.toast = toast ?? ((window as { toastManager?: ToastNotifier }).toastManager ?? null);
  }

  init(): void {
    this.root = document.querySelector<HTMLElement>(this.selectors.root);
    if (!this.root) return;
    this.root.addEventListener("click", this.handleClick);
    this.root.addEventListener("change", this.handleChange);
    this.root.addEventListener("submit", this.handleSubmit);
    this.render();
    void this.loadHistory();
  }

  destroy(): void {
    this.root?.removeEventListener("click", this.handleClick);
    this.root?.removeEventListener("change", this.handleChange);
    this.root?.removeEventListener("submit", this.handleSubmit);
  }

  private get historyEndpoint(): string {
    return this.config.historyPath ?? `${this.config.apiPath}/jobs`;
  }

  private get includeExamples(): boolean {
    return this.config.includeExamples !== false;
  }

  buildApplyRequest(
    rows: ApplyRequest["rows"],
    overrides: Partial<ApplyRequest> = {},
  ): ApplyRequest {
    return {
      rows,
      allow_create_missing: overrides.allow_create_missing === true,
      allow_source_hash_override: overrides.allow_source_hash_override === true,
      continue_on_error: overrides.continue_on_error === true,
      dry_run: overrides.dry_run === true,
      async: overrides.async !== false,
      retry_job_id:
        typeof overrides.retry_job_id === "string" ? overrides.retry_job_id : undefined,
      resolutions: Array.isArray(overrides.resolutions) ? overrides.resolutions : undefined,
    };
  }

  async applyImport(request: ApplyRequest): Promise<ApplyResponse> {
    this.emitAnalytics("exchange_apply_start", {
      row_count: request.rows.length,
      allow_create_missing: request.allow_create_missing,
      allow_source_hash_override: request.allow_source_hash_override,
      continue_on_error: request.continue_on_error,
      dry_run: request.dry_run,
      retry_job_id: request.retry_job_id,
    });
    if (Array.isArray(request.resolutions) && request.resolutions.length > 0) {
      this.emitAnalytics("exchange_conflict_resolved", {
        row_count: request.rows.length,
        resolution_count: request.resolutions.length,
      });
    }
    if (request.retry_job_id) {
      this.emitAnalytics("exchange_apply_retry", {
        retry_job_id: request.retry_job_id,
        row_count: request.rows.length,
      });
    }
    const response = await this.postJSON(`${this.config.apiPath}/import/apply`, {
      ...request,
      async: request.async !== false,
    });
    const normalized = normalizeTranslationExchangeValidationResult(response);
    if (normalized.job) {
      void this.loadHistory(true);
    }
    this.emitAnalytics("exchange_apply_completion", {
      processed: normalized.summary.processed,
      succeeded: normalized.summary.succeeded,
      failed: normalized.summary.failed,
      conflicts: normalized.summary.conflicts ?? 0,
      status: normalized.job?.status ?? "completed",
    });
    return {
      ...normalized,
      job: normalized.job,
      meta:
        response.meta && typeof response.meta === "object"
          ? (response.meta as Record<string, unknown>)
          : undefined,
    };
  }

  async pollJobUntilTerminal(
    jobOrEndpoint: string | TranslationExchangeJob,
    options: LongPollOptions = {},
  ): Promise<TranslationExchangeJob> {
    const endpoint =
      typeof jobOrEndpoint === "string"
        ? jobOrEndpoint
        : jobOrEndpoint.poll_endpoint;
    if (!endpoint) {
      throw new Error("Poll endpoint is required.");
    }
    const intervalMs = options.intervalMs ?? 250;
    const timeoutMs = options.timeoutMs ?? 15000;
    const startedAt = Date.now();
    let attempt = 0;

    while (true) {
      if (options.signal?.aborted) {
        throw new Error("Polling aborted.");
      }
      if (attempt > 0) {
        this.emitAnalytics("exchange_apply_retry", {
          poll_endpoint: endpoint,
          attempt,
        });
      }
      const payload = await this.fetchJSON(endpoint);
      const job = normalizeTranslationExchangeJob(
        payload.job && typeof payload.job === "object" ? payload.job : payload,
      );
      if (!job) {
        throw new Error("Job payload missing.");
      }
      options.onTick?.(job, attempt);
      if (job.status !== "running") {
        this.emitAnalytics("exchange_apply_completion", {
          job_id: job.id,
          status: job.status,
          processed: job.progress.processed,
          failed: job.progress.failed,
        });
        return job;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("Polling timed out.");
      }
      attempt += 1;
      await wait(intervalMs);
    }
  }

  private readonly handleClick = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const step = target.closest<HTMLElement>("[data-exchange-step]");
    if (step) {
      this.step = step.dataset.exchangeStep as ExchangeStep;
      this.render();
      if (this.step === "history" && this.historyState.status === "idle") {
        void this.loadHistory();
      }
      return;
    }

    const decision = target.closest<HTMLElement>("[data-stage-row]");
    if (decision) {
      const row = Number(decision.dataset.stageRow ?? "-1");
      const value = decision.dataset.stageDecision as TranslationExchangeStageDecision;
      if (row >= 0 && (value === "accepted" || value === "rejected")) {
        this.validateState.decisions[row] = value;
        this.applyState.resolutions[row] = value === "accepted" ? "apply" : "skip";
        this.render();
      }
      return;
    }

    const resolution = target.closest<HTMLElement>("[data-apply-row]");
    if (resolution) {
      const row = Number(resolution.dataset.applyRow ?? "-1");
      const value = resolution.dataset.applyDecision as ApplyResolutionDecision;
      if (row >= 0 && value) {
        this.applyState.resolutions[row] = value;
        this.render();
      }
      return;
    }

    const refresh = target.closest<HTMLElement>("[data-history-refresh]");
    if (refresh) {
      void this.loadHistory(true);
      return;
    }

    const selectJob = target.closest<HTMLElement>("[data-history-job]");
    if (selectJob) {
      this.historyState.selectedJobId = String(selectJob.dataset.historyJob ?? "").trim();
      this.render();
      return;
    }

    const loadApply = target.closest<HTMLElement>("[data-history-load-apply]");
    if (loadApply) {
      const selected = this.activeHistoryJob();
      if (!selected) return;
      const mode = loadApply.dataset.historyLoadApply === "conflicts";
      void this.loadHistoryJobIntoApply(selected, mode);
    }
  };

  private readonly handleChange = (event: Event): void => {
    const target = event.target as HTMLInputElement | HTMLSelectElement | null;
    if (!target) return;

    if (target.matches('[data-export-form="true"] input, [data-export-form="true"] select')) {
      const form = target.closest("form");
      if (form) {
        this.exportState.draft = this.readExportDraft(form);
        this.render();
      }
      return;
    }

    if (target.id === "exchange-import-file" && target instanceof HTMLInputElement) {
      const file = target.files?.[0] ?? null;
      void this.stageImportFile(file);
      return;
    }

    if (target.matches("[data-history-kind]")) {
      this.historyState.kind = target.value || "all";
      this.render();
      return;
    }

    if (target.matches("[data-history-status]")) {
      this.historyState.jobStatus = target.value || "all";
      this.render();
      return;
    }

    if (target.matches("[data-apply-option]")) {
      const key = String(target.dataset.applyOption ?? "");
      const checked =
        target instanceof HTMLInputElement ? target.checked === true : false;
      switch (key) {
        case "allowCreateMissing":
          this.applyState.allowCreateMissing = checked;
          break;
        case "allowSourceHashOverride":
          this.applyState.allowSourceHashOverride = checked;
          break;
        case "continueOnError":
          this.applyState.continueOnError = checked;
          break;
        case "dryRun":
          this.applyState.dryRun = checked;
          break;
        default:
          return;
      }
      this.render();
    }
  };

  private readonly handleSubmit = (event: Event): void => {
    const form = event.target as HTMLFormElement | null;
    if (!form) return;

    if (form.matches('[data-export-form="true"]')) {
      event.preventDefault();
      void this.submitExport(form);
      return;
    }

    if (form.matches('[data-validate-form="true"]')) {
      event.preventDefault();
      void this.submitValidate();
      return;
    }

    if (form.matches('[data-apply-form="true"]')) {
      event.preventDefault();
      void this.submitApply();
    }
  };

  private readExportDraft(form: Element): ExportDraft {
    const data = new FormData(form as HTMLFormElement);
    return {
      resources: data.getAll("resources").map(String),
      sourceLocale: String(data.get("source_locale") ?? "en"),
      targetLocales: data.getAll("target_locales").map(String),
      includeSourceHash: data.has("include_source_hash"),
    };
  }

  private async submitExport(form: HTMLFormElement): Promise<void> {
    const draft = this.readExportDraft(form);
    this.exportState.draft = draft;
    const warnings = exportWarnings(draft);
    if (
      draft.resources.length === 0 ||
      draft.targetLocales.length === 0 ||
      warnings.some((warning) => warning.includes("cannot include"))
    ) {
      this.exportState.status = "error";
      this.exportState.message =
        warnings[0] ?? "Complete the export filters before continuing.";
      this.render();
      return;
    }

    this.exportState.status = "submitting";
    this.exportState.message = "Preparing export package...";
    this.render();

    try {
      const response = await this.postJSON(`${this.config.apiPath}/export`, {
        filter: {
          resources: draft.resources,
          source_locale: draft.sourceLocale,
          target_locales: draft.targetLocales,
          include_source_hash: draft.includeSourceHash,
        },
        async: true,
      });
      const responseJob =
        response.job && typeof response.job === "object"
          ? response.job
          : response.data && typeof response.data === "object"
            ? (response.data as { job?: unknown }).job
            : undefined;
      const responseRows = Array.isArray(response.rows)
        ? response.rows
        : response.data &&
            typeof response.data === "object" &&
            Array.isArray((response.data as { rows?: unknown[] }).rows)
          ? ((response.data as { rows?: unknown[] }).rows ?? [])
          : [];
      const job = normalizeTranslationExchangeJob(responseJob);
      this.exportState.job = job;
      if (job?.status === "running") {
        this.exportState.status = "polling";
        this.exportState.message = "Export job running. Polling for artifact...";
        this.render();
        const terminal = await this.pollJobUntilTerminal(job, {
          intervalMs: 250,
          timeoutMs: 15000,
          onTick: (runningJob) => {
            this.exportState.job = runningJob;
            this.exportState.message = `Export job running: ${runningJob.progress.processed} / ${runningJob.progress.total ?? 0} processed.`;
            this.render();
          },
        });
        this.exportState.job = terminal;
      }
      this.exportState.downloadHref =
        downloadHref(this.exportState.job, "artifact") || this.createRowsDownload(responseRows);
      this.exportState.downloadLabel =
        downloadLabel(this.exportState.job, "artifact") || "Download export JSON";
      this.exportState.status = "completed";
      this.exportState.message = `${this.exportState.job?.summary?.row_count ?? response.row_count ?? 0} rows ready for handoff.`;
      this.toast?.success(this.exportState.message);
      void this.loadHistory(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      this.exportState.status = "error";
      this.exportState.message = message;
      this.toast?.error(message);
    }
    this.render();
  }

  private async stageImportFile(file: File | null): Promise<void> {
    this.validateState.file = file;
    this.validateState.parsedRows = [];
    this.validateState.result = null;
    this.validateState.decisions = {};
    this.applyState = {
      ...this.applyState,
      rows: [],
      sourceLabel: "",
      retryJobId: "",
      resolutions: {},
      status: "idle",
      result: null,
      job: null,
      message: file ? "Reading import file..." : "",
    };
    this.validateState.upload = normalizeTranslationExchangeUploadDescriptor({
      state: file ? "uploading" : "idle",
      filename: file?.name,
      format: file?.name.endsWith(".csv") ? "csv" : "json",
      message: file ? "Reading import file..." : "",
    });
    this.validateState.status = file ? "loading_file" : "idle";
    this.validateState.message = file ? "Reading import file..." : "";
    this.render();

    if (!file) return;
    try {
      const parsedRows = await this.parseImportFile(file);
      this.validateState.parsedRows = parsedRows;
      this.validateState.upload = normalizeTranslationExchangeUploadDescriptor({
        state: "selected",
        filename: file.name,
        format: file.name.endsWith(".csv") ? "csv" : "json",
        row_count: parsedRows.length,
        message: "Ready to validate.",
      });
      this.validateState.status = "idle";
      this.validateState.message = `${parsedRows.length} rows loaded and ready to validate.`;
      this.applyState.message = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to read import file.";
      this.validateState.upload = normalizeTranslationExchangeUploadDescriptor({
        state: "error",
        filename: file.name,
        format: file.name.endsWith(".csv") ? "csv" : "json",
        message,
      });
      this.validateState.status = "error";
      this.validateState.message = message;
      this.toast?.error(message);
    }
    this.render();
  }

  private async submitValidate(): Promise<void> {
    if (!this.validateState.file) {
      this.validateState.status = "error";
      this.validateState.message = "Choose a file before validating.";
      this.render();
      return;
    }
    if (this.validateState.status === "loading_file") {
      await this.stageImportFile(this.validateState.file);
    }

    this.validateState.status = "validating";
    this.validateState.message = "Validating translation package...";
    this.render();

    try {
      const formData = new FormData();
      formData.set("file", this.validateState.file);
      const response = await this.postForm(`${this.config.apiPath}/import/validate`, formData);
      const result = normalizeTranslationExchangeValidationResult(response);
      this.validateState.result = result;
      this.validateState.decisions = defaultDecisions(result);
      this.validateState.upload = normalizeTranslationExchangeUploadDescriptor({
        state: "validated",
        filename: this.validateState.file.name,
        format: this.validateState.file.name.endsWith(".csv") ? "csv" : "json",
        row_count: result.summary.processed,
      });
      this.validateState.status = "validated";
      this.validateState.message =
        "Validation completed. Review conflicts, then continue to apply.";
      this.applyState = {
        ...this.applyState,
        rows: this.validateState.parsedRows.map(normalizeRowIndex),
        sourceLabel: this.validateState.file.name,
        retryJobId: "",
        resolutions: defaultApplyResolutions(this.validateState.parsedRows, result),
        status: "ready",
        message: "Validation finished. Configure apply decisions and submit.",
        result: null,
        job: null,
      };
      this.toast?.info("Validation completed.");
      void this.loadHistory(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Validation failed.";
      this.validateState.status = "error";
      this.validateState.message = message;
      this.toast?.error(message);
    }
    this.render();
  }

  private async submitApply(): Promise<void> {
    if (this.applyState.rows.length === 0) {
      this.applyState.status = "error";
      this.applyState.message = "Validate a package or load a history job before applying.";
      this.render();
      return;
    }

    const request = this.buildApplyRequest(
      this.applyState.rows.map(normalizeRowIndex),
      {
        allow_create_missing: this.applyState.allowCreateMissing,
        allow_source_hash_override: this.applyState.allowSourceHashOverride,
        continue_on_error: this.applyState.continueOnError,
        dry_run: this.applyState.dryRun,
        retry_job_id: this.applyState.retryJobId || undefined,
        resolutions: this.buildApplyResolutions(),
      },
    );

    this.applyState.status = "submitting";
    this.applyState.message = request.dry_run
      ? "Running dry-run apply..."
      : "Submitting apply job...";
    this.applyState.result = null;
    this.render();

    try {
      const response = await this.applyImport(request);
      this.applyState.result = response;
      this.applyState.job = response.job ?? null;
      if (response.job?.status === "running") {
        this.applyState.status = "polling";
        this.applyState.message = "Apply job running. Polling for terminal state...";
        this.render();
        const terminal = await this.pollJobUntilTerminal(response.job, {
          intervalMs: 250,
          timeoutMs: 15000,
          onTick: (job) => {
            this.applyState.job = job;
            this.applyState.message = `Apply job running: ${job.progress.processed} / ${job.progress.total ?? 0} processed.`;
            this.render();
          },
        });
        this.applyState.job = terminal;
        this.applyState.result = jobValidationResult(terminal);
      }
      this.applyState.status = "completed";
      this.applyState.message = this.applyState.dryRun
        ? "Dry-run apply completed."
        : "Apply completed.";
      this.toast?.success(this.applyState.message);
      void this.loadHistory(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Apply failed.";
      this.applyState.status = "error";
      this.applyState.message = message;
      this.toast?.error(message);
    }
    this.render();
  }

  private buildApplyResolutions(): ApplyRequest["resolutions"] {
    const out: NonNullable<ApplyRequest["resolutions"]> = [];
    const rowIndexLookup = new Set(
      this.applyState.rows.map((row, index) =>
        typeof row.index === "number" ? row.index : index,
      ),
    );
    for (const [rawIndex, decision] of Object.entries(this.applyState.resolutions)) {
      const row = Number(rawIndex);
      if (!rowIndexLookup.has(row) || !decision || decision === "apply") continue;
      out.push({ row, decision });
    }
    return out.length > 0 ? out : undefined;
  }

  private async loadHistory(force = false): Promise<void> {
    if (!force && this.historyState.status === "loading") return;
    this.historyState.status = "loading";
    this.historyState.message = "Loading history...";
    this.render();

    try {
      const url = new URL(this.historyEndpoint, window.location.origin);
      if (this.includeExamples) url.searchParams.set("include_examples", "true");
      const raw = await this.fetchJSON(url.pathname + url.search);
      this.historyState.response = normalizeTranslationExchangeHistoryResponse(raw);
      this.historyState.status = "ready";
      this.historyState.message = "";
      if (!this.historyState.selectedJobId) {
        this.historyState.selectedJobId =
          this.historyState.response.history.items[0]?.id ?? "";
      }
      if (
        this.historyState.selectedJobId &&
        !this.historyState.response.history.items.some(
          (job) => job.id === this.historyState.selectedJobId,
        )
      ) {
        this.historyState.selectedJobId =
          this.historyState.response.history.items[0]?.id ?? "";
      }
    } catch (error) {
      this.historyState.status = "error";
      this.historyState.message =
        error instanceof Error ? error.message : "Unable to load history.";
    }
    this.render();
  }

  private filteredHistoryItems(): TranslationExchangeJob[] {
    const items = this.historyState.response?.history.items ?? [];
    return items.filter((job) => {
      if (this.historyState.kind !== "all" && job.kind !== this.historyState.kind) {
        return false;
      }
      if (this.historyState.jobStatus !== "all" && job.status !== this.historyState.jobStatus) {
        return false;
      }
      return true;
    });
  }

  private historyExamples(): TranslationExchangeJob[] {
    return (this.historyState.response?.history.items ?? []).filter((job) => job.fixture);
  }

  private activeHistoryJob(): TranslationExchangeJob | null {
    const items = this.filteredHistoryItems();
    if (items.length === 0) return null;
    return (
      items.find((job) => job.id === this.historyState.selectedJobId) ??
      items[0] ??
      null
    );
  }

  private async loadHistoryJobIntoApply(
    job: TranslationExchangeJob,
    conflictsOnly: boolean,
  ): Promise<void> {
    const href =
      job.downloads?.input?.href ??
      job.downloads?.artifact?.href ??
      "";
    if (!href) {
      this.toast?.error("Selected history job does not retain an input artifact.");
      return;
    }
    try {
      const decoded = decodeDataURL(href);
      const format = String(job.file?.format ?? "json").toLowerCase();
      let rows =
        format === "csv"
          ? this.parseCSVText(decoded)
          : this.parseJSONRows(decoded);
      rows = rows.map(normalizeRowIndex);
      const result = jobValidationResult(job);
      if (conflictsOnly && result) {
        const conflictRows = new Set(
          result.results
            .filter(
              (row: TranslationExchangeConflictRow) =>
                row.status === "conflict" || row.status === "error",
            )
            .map((row) => row.index),
        );
        rows = rows.filter((row, index) =>
          conflictRows.has(typeof row.index === "number" ? row.index : index),
        );
      }
      this.applyState = {
        ...this.applyState,
        rows,
        sourceLabel: job.file?.name ?? job.id,
        retryJobId: job.id,
        resolutions: defaultApplyResolutions(rows, result),
        allowCreateMissing: job.request?.allow_create_missing === true,
        allowSourceHashOverride: job.request?.allow_source_hash_override === true,
        continueOnError: job.request?.continue_on_error !== false,
        dryRun: job.request?.dry_run === true,
        status: "ready",
        message: conflictsOnly
          ? "Loaded conflict rows from history into the apply step."
          : "Loaded history job into the apply step.",
        result: null,
        job: null,
      };
      this.validateState.result = result;
      this.step = "apply";
      this.toast?.info(this.applyState.message);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load the selected history artifact.";
      this.toast?.error(message);
    }
    this.render();
  }

  private createRowsDownload(rows: unknown[]): string {
    const json = JSON.stringify(rows, null, 2);
    return toDataURL("application/json", json);
  }

  private async parseImportFile(file: File): Promise<ImportRow[]> {
    const content = await this.readFileText(file);
    const format = file.name.toLowerCase().endsWith(".csv") ? "csv" : "json";
    const rows = format === "csv" ? this.parseCSVText(content) : this.parseJSONRows(content);
    return rows.map(normalizeRowIndex);
  }

  private async readFileText(file: File): Promise<string> {
    const candidate = file as File & {
      text?: () => Promise<string>;
      arrayBuffer?: () => Promise<ArrayBuffer>;
    };
    if (typeof candidate.text === "function") {
      return candidate.text();
    }
    if (typeof candidate.arrayBuffer === "function" && typeof TextDecoder !== "undefined") {
      const buffer = await candidate.arrayBuffer();
      return new TextDecoder().decode(buffer);
    }
    const readerCtor =
      typeof window !== "undefined" ? window.FileReader : undefined;
    if (readerCtor) {
      return new Promise((resolve, reject) => {
        const reader = new readerCtor();
        reader.onerror = () => reject(new Error("Unable to read import file."));
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.readAsText(file);
      });
    }
    if (typeof Response !== "undefined") {
      return new Response(file).text();
    }
    throw new Error("File text reader is not available in this environment.");
  }

  private parseJSONRows(raw: string): ImportRow[] {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (row: unknown): row is ImportRow => row !== null && typeof row === "object",
      );
    }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.rows)) {
      return parsed.rows.filter(
        (row: unknown): row is ImportRow => row !== null && typeof row === "object",
      );
    }
    throw new Error("JSON import payload must be an array of rows.");
  }

  private parseCSVText(raw: string): ImportRow[] {
    const lines = raw.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = this.parseCSVRecord(lines[0]).map((value) => value.trim());
    const rows: ImportRow[] = [];
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const values = this.parseCSVRecord(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });
      rows.push({
        resource: row.resource ?? "",
        entity_id: row.entity_id ?? "",
        family_id: row.family_id ?? "",
        source_locale: row.source_locale ?? "",
        target_locale: row.target_locale ?? "",
        field_path: row.field_path ?? "",
        source_text: row.source_text ?? "",
        translated_text: row.translated_text ?? "",
        source_hash: row.source_hash ?? "",
        path: row.path ?? "",
        title: row.title ?? "",
        status: row.status ?? "",
        notes: row.notes ?? "",
      });
    }
    return rows;
  }

  private parseCSVRecord(raw: string): string[] {
    const out: string[] = [];
    let current = "";
    let quoted = false;
    for (let index = 0; index < raw.length; index += 1) {
      const char = raw[index];
      const next = raw[index + 1];
      if (char === '"') {
        if (quoted && next === '"') {
          current += '"';
          index += 1;
          continue;
        }
        quoted = !quoted;
        continue;
      }
      if (char === "," && !quoted) {
        out.push(current);
        current = "";
        continue;
      }
      current += char;
    }
    out.push(current);
    return out;
  }

  private applyDecisionForRow(index: number): ApplyResolutionDecision {
    return this.applyState.resolutions[index] ?? "apply";
  }

  private validationRowForIndex(index: number): TranslationExchangeConflictRow | null {
    return resultRowByIndex(this.validateState.result).get(index) ?? null;
  }

  private rowActions(
    index: number,
    row: TranslationExchangeConflictRow | null,
  ): ApplyResolutionDecision[] {
    const out: ApplyResolutionDecision[] = ["apply", "skip"];
    const metadata = row?.metadata ?? {};
    if (
      row?.conflict?.type === "stale_source_hash" ||
      metadata.current_source_hash ||
      metadata.provided_source_hash
    ) {
      out.push("override_source_hash");
    }
    if (metadata.create_translation_hint === true || metadata.create_translation_required === true) {
      out.push("create_missing");
    }
    return out;
  }

  private async postJSON(path: string, body: unknown): Promise<Record<string, unknown>> {
    return this.request(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  private async postForm(path: string, body: FormData): Promise<Record<string, unknown>> {
    return this.request(path, { method: "POST", body });
  }

  private async fetchJSON(path: string): Promise<Record<string, unknown>> {
    return this.request(path, { method: "GET" });
  }

  private async request(
    path: string,
    init: RequestInit,
  ): Promise<Record<string, unknown>> {
    const response = await fetch(path, init);
    const contentType = response.headers.get("content-type") ?? "";
    const payload =
      contentType.includes("json") ? await response.json() : await response.text();
    if (!response.ok) {
      if (payload && typeof payload === "object") {
        const message =
          (payload as { error?: { message?: string } }).error?.message ??
          (payload as { message?: string }).message;
        throw new Error(message || "Exchange request failed.");
      }
      throw new Error(typeof payload === "string" ? payload : "Exchange request failed.");
    }
    return (payload as Record<string, unknown>) ?? {};
  }

  private emitAnalytics(name: string, fields: Record<string, unknown> = {}): void {
    if (this.config.telemetryEnabled === false) {
      return;
    }
    const detail = { name, fields };
    const target =
      this.config.analyticsTarget ??
      (typeof window !== "undefined" ? window : undefined);
    if (target && typeof target.dispatchEvent === "function") {
      target.dispatchEvent(
        new CustomEvent("translation:exchange-analytics", { detail }),
      );
    }
  }

  private render(): void {
    if (!this.root) return;

    const warnings = exportWarnings(this.exportState.draft);
    const accepted = Object.values(this.validateState.decisions).filter(
      (value) => value === "accepted",
    ).length;
    const rejected = Object.values(this.validateState.decisions).filter(
      (value) => value === "rejected",
    ).length;
    const examples = this.historyExamples();
    const historyItems = this.filteredHistoryItems();

    this.root.innerHTML = `
      <section class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <header class="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-wider text-gray-500">Translation Exchange</p>
              <h1 class="mt-2 text-2xl font-bold text-admin-dark">Translation Exchange Wizard</h1>
              <p class="text-sm text-gray-500 mt-1">Prepare external translation files, validate row-level conflicts, apply imports with explicit create and conflict controls, and inspect retained job history for retries and audits.</p>
            </div>
            <a class="btn btn-secondary" href="${escapeHTML(
              `${this.config.apiPath}/template?format=json`,
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
          ${this.step === "export" ? this.renderExportStep(warnings, examples) : ""}
          ${this.step === "validate" ? this.renderValidateStep(accepted, rejected, examples) : ""}
          ${this.step === "apply" ? this.renderApplyStep() : ""}
          ${this.step === "history" ? this.renderHistoryStep(historyItems) : ""}
        </div>
      </section>
    `;
  }

  private renderStepButton(step: ExchangeStep, title: string, copy: string): string {
    const active = this.step === step;
    return `
      <button
        type="button"
        data-exchange-step="${step}"
        class="rounded-xl border px-4 py-4 text-left transition ${
          active
            ? "border-blue-400 bg-blue-50 shadow-sm"
            : "border-gray-200 bg-white hover:border-gray-300"
        }"
      >
        <div class="text-sm font-semibold text-gray-900">${escapeHTML(title)}</div>
        <p class="mt-1 text-sm text-gray-600">${escapeHTML(copy)}</p>
      </button>
    `;
  }

  private renderExampleLinks(examples: TranslationExchangeJob[]): string {
    if (examples.length === 0) return "";
    const cards = examples
      .map((job) => {
        const links = Object.values(job.downloads ?? {})
          .map(
            (download) => `
              <a class="text-sm font-medium text-blue-700 hover:text-blue-900" href="${escapeHTML(download.href)}" download="${escapeHTML(download.filename)}">
                ${escapeHTML(download.label)}
              </a>`,
          )
          .join("");
        return `
          <article class="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">${escapeHTML(job.kind.replace(/_/g, " "))}</p>
                <p class="text-xs text-gray-600">${escapeHTML(job.file?.name ?? "Seeded example")}</p>
              </div>
              <span class="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">Fixture</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-3">${links}</div>
          </article>
        `;
      })
      .join("");
    return `
      <section class="space-y-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Seeded Examples</h2>
          <p class="mt-1 text-sm text-gray-600">Use the stable demo artifacts to exercise the wizard and end-to-end coverage.</p>
        </div>
        <div class="grid gap-3 md:grid-cols-2">${cards}</div>
      </section>
    `;
  }

  private renderExportStep(warnings: string[], examples: TranslationExchangeJob[]): string {
    const job = this.exportState.job;
    return `
      ${this.renderExampleLinks(examples.filter((entry) => entry.kind === "export"))}
      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form data-export-form="true" class="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
          <div class="grid gap-5 md:grid-cols-2">
            <fieldset>
              <legend class="text-sm font-semibold text-gray-900">Resources</legend>
              <div class="mt-3 space-y-2">
                ${["pages", "posts"].map((resource) => `
                  <label class="flex items-center gap-3 text-sm text-gray-700">
                    <input type="checkbox" name="resources" value="${resource}" ${
                      this.exportState.draft.resources.includes(resource) ? "checked" : ""
                    }>
                    <span>${resource}</span>
                  </label>`).join("")}
              </div>
            </fieldset>
            <label class="block text-sm font-semibold text-gray-900">
              Source locale
              <select name="source_locale" class="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2">
                ${["en", "es", "fr", "de"].map((locale) => `
                  <option value="${locale}" ${
                    this.exportState.draft.sourceLocale === locale ? "selected" : ""
                  }>${locale.toUpperCase()}</option>`).join("")}
              </select>
            </label>
          </div>
          <fieldset>
            <legend class="text-sm font-semibold text-gray-900">Target locales</legend>
            <div class="mt-3 flex flex-wrap gap-3">
              ${["es", "fr", "de", "it"].map((locale) => `
                <label class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2 text-sm text-gray-700">
                  <input type="checkbox" name="target_locales" value="${locale}" ${
                    this.exportState.draft.targetLocales.includes(locale) ? "checked" : ""
                  }>
                  <span>${locale.toUpperCase()}</span>
                </label>`).join("")}
            </div>
          </fieldset>
          <label class="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            <input type="checkbox" name="include_source_hash" ${
              this.exportState.draft.includeSourceHash ? "checked" : ""
            }>
            <span>Include source hashes so validate and apply can detect stale source drift.</span>
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary" type="submit">Create export package</button>
            <span class="text-sm text-gray-600">${escapeHTML(this.exportState.message)}</span>
          </div>
        </form>
        <aside class="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-5">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Preflight</h2>
            <div class="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              ${[
                ["Resources", this.exportState.draft.resources.length],
                ["Targets", this.exportState.draft.targetLocales.length],
                [
                  "Planned handoffs",
                  this.exportState.draft.resources.length * this.exportState.draft.targetLocales.length,
                ],
              ].map(([label, value]) => `
                <div class="rounded-xl bg-white px-4 py-3">
                  <div class="text-xs uppercase tracking-[0.2em] text-gray-500">${escapeHTML(label)}</div>
                  <div class="mt-1 text-2xl font-semibold text-gray-900">${escapeHTML(value)}</div>
                </div>`).join("")}
            </div>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-gray-900">Warnings</h3>
            <ul class="mt-3 space-y-2 text-sm text-gray-600">
              ${(warnings.length > 0 ? warnings : ["Filters are coherent. Ready to export."]).map((warning) => `
                <li class="rounded-xl bg-white px-3 py-2">${escapeHTML(warning)}</li>`).join("")}
            </ul>
          </div>
          ${
            job
              ? `
              <div class="rounded-xl bg-white border border-gray-200 p-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">Latest export job</p>
                    <p class="text-xs text-gray-500">${escapeHTML(job.id)}</p>
                  </div>
                  <span class="${statusBadgeClass(jobStatusSeverity(job.status))}">${escapeHTML(job.status)}</span>
                </div>
                <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div class="h-full bg-blue-500" style="width: ${progressPercent(job)}%"></div>
                </div>
                <div class="mt-3 text-sm text-gray-600">${escapeHTML(job.progress.processed)} / ${escapeHTML(job.progress.total ?? 0)} rows prepared</div>
                ${
                  this.exportState.downloadHref
                    ? `<a class="mt-4 inline-flex text-sm font-medium text-blue-700 hover:text-blue-900" href="${escapeHTML(
                        this.exportState.downloadHref,
                      )}" download>${escapeHTML(this.exportState.downloadLabel)}</a>`
                    : ""
                }
              </div>`
              : ""
          }
        </aside>
      </section>
    `;
  }

  private renderValidateStep(
    accepted: number,
    rejected: number,
    examples: TranslationExchangeJob[],
  ): string {
    const result = this.validateState.result;
    const rows = result?.results ?? [];
    return `
      ${this.renderExampleLinks(examples.filter((entry) => entry.kind === "import_validate"))}
      <section class="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
        <form data-validate-form="true" class="space-y-4">
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <label class="text-sm font-semibold text-gray-900" for="exchange-import-file">Validation file</label>
            <input id="exchange-import-file" type="file" accept=".json,.csv" class="mt-3 block w-full text-sm text-gray-700">
            <p class="mt-2 text-sm text-gray-600">${escapeHTML(this.validateState.upload.filename ?? "Choose a JSON or CSV package exported for translators.")}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary" type="submit">Validate package</button>
            <button class="btn btn-secondary" type="button" data-exchange-step="apply" ${
              this.applyState.rows.length === 0 ? "disabled" : ""
            }>Continue to apply</button>
            <span class="text-sm text-gray-600">${escapeHTML(this.validateState.message)}</span>
          </div>
        </form>
        ${
          result
            ? `
            <section class="space-y-4">
              <div class="grid gap-3 md:grid-cols-4">
                ${[
                  ["Processed", result.summary.processed],
                  ["Succeeded", result.summary.succeeded],
                  ["Conflicts", result.summary.conflicts ?? 0],
                  ["Failed", result.summary.failed],
                ].map(([label, value]) => `
                  <div class="rounded-xl bg-gray-50 px-4 py-3">
                    <div class="text-xs uppercase tracking-wider text-gray-500">${escapeHTML(label)}</div>
                    <div class="mt-1 text-2xl font-semibold text-gray-900">${escapeHTML(value)}</div>
                  </div>`).join("")}
              </div>
              <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Staged decisions: ${escapeHTML(accepted)} accepted, ${escapeHTML(rejected)} rejected.
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
                    ${rows.map((row) => `
                      <tr>
                        <td class="px-4 py-3 font-medium text-gray-900">${escapeHTML(row.index)}</td>
                        <td class="px-4 py-3 text-gray-700">${escapeHTML(`${row.resource}.${row.field_path}`)}</td>
                        <td class="px-4 py-3 text-gray-700">${escapeHTML(row.target_locale.toUpperCase())}</td>
                        <td class="px-4 py-3"><span class="${statusBadgeClass(rowStatusSeverity(row.status))}">${escapeHTML(row.status)}</span></td>
                        <td class="px-4 py-3">
                          <div class="flex gap-2">
                            ${this.renderDecisionButton(row.index, "accepted", this.validateState.decisions[row.index] === "accepted")}
                            ${this.renderDecisionButton(row.index, "rejected", this.validateState.decisions[row.index] === "rejected")}
                          </div>
                        </td>
                        <td class="px-4 py-3 text-gray-600">${escapeHTML(
                          row.conflict?.message ?? row.error ?? "Ready for apply.",
                        )}</td>
                      </tr>`).join("")}
                  </tbody>
                </table>
              </div>
            </section>`
            : ""
        }
      </section>
    `;
  }

  private renderDecisionButton(
    row: number,
    decision: TranslationExchangeStageDecision,
    active: boolean,
  ): string {
    return `
      <button
        type="button"
        data-stage-row="${row}"
        data-stage-decision="${decision}"
        class="rounded-full border px-3 py-1 text-xs font-medium ${
          active ? "border-blue-500 bg-blue-100 text-blue-900" : "border-gray-200 bg-white text-gray-600"
        }"
      >
        ${escapeHTML(decision)}
      </button>
    `;
  }

  private renderApplyStep(): string {
    const stagedRows = this.applyState.rows;
    const rowDetails = resultRowByIndex(this.validateState.result);
    const result = this.applyState.result;
    const terminalRows = result?.results ?? [];
    const job = this.applyState.job;
    const stagedCounts = {
      apply: 0,
      skip: 0,
      override: 0,
      create: 0,
    };
    for (const row of stagedRows) {
      const decision = this.applyDecisionForRow(Number(row.index ?? 0));
      if (decision === "skip") stagedCounts.skip += 1;
      if (decision === "override_source_hash") stagedCounts.override += 1;
      if (decision === "create_missing") stagedCounts.create += 1;
      if (decision === "apply") stagedCounts.apply += 1;
    }
    return `
      <section class="space-y-5">
        <form data-apply-form="true" class="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 class="text-lg font-semibold text-gray-900">Apply import package</h2>
              <p class="mt-1 text-sm text-gray-600">${escapeHTML(
                this.applyState.sourceLabel || "Validate a package or load a history job to begin.",
              )}</p>
            </div>
            ${
              this.applyState.retryJobId
                ? `<span class="${statusBadgeClass("warning")}">Retry source: ${escapeHTML(this.applyState.retryJobId)}</span>`
                : ""
            }
          </div>
          <div class="grid gap-3 md:grid-cols-4">
            ${[
              ["Apply", stagedCounts.apply],
              ["Skip", stagedCounts.skip],
              ["Override", stagedCounts.override],
              ["Create", stagedCounts.create],
            ].map(([label, value]) => `
              <div class="rounded-xl bg-gray-50 px-4 py-3">
                <div class="text-xs uppercase tracking-wider text-gray-500">${escapeHTML(label)}</div>
                <div class="mt-1 text-2xl font-semibold text-gray-900">${escapeHTML(value)}</div>
              </div>`).join("")}
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            ${this.renderApplyToggle("allowCreateMissing", "Create missing locale variants during apply", this.applyState.allowCreateMissing)}
            ${this.renderApplyToggle("allowSourceHashOverride", "Override stale source hash conflicts during apply", this.applyState.allowSourceHashOverride)}
            ${this.renderApplyToggle("continueOnError", "Continue on row-level errors", this.applyState.continueOnError)}
            ${this.renderApplyToggle("dryRun", "Dry-run only (no writes)", this.applyState.dryRun)}
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary" type="submit" ${
              stagedRows.length === 0 ? "disabled" : ""
            }>Submit apply job</button>
            <button class="btn btn-secondary" type="button" data-exchange-step="history">Inspect history</button>
            <span class="text-sm text-gray-600">${escapeHTML(this.applyState.message)}</span>
          </div>
          ${
            job
              ? `
                <div class="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-center justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-gray-900">Job progress</p>
                      <p class="text-xs text-gray-500">${escapeHTML(job.id)}</p>
                    </div>
                    <span class="rounded-full bg-white border border-gray-200 px-3 py-1 text-xs font-medium text-gray-700">${escapeHTML(job.status)}</span>
                  </div>
                  <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                    <div class="h-full bg-blue-500" style="width: ${progressPercent(job)}%"></div>
                  </div>
                  <div class="mt-3 text-sm text-gray-600">${escapeHTML(job.progress.processed)} / ${escapeHTML(job.progress.total ?? 0)} processed</div>
                </div>`
              : ""
          }
        </form>
        ${
          stagedRows.length > 0
            ? `
              <section class="rounded-xl border border-gray-200 bg-white p-5">
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
                      ${stagedRows.map((row, index) => {
                        const rowIndex = typeof row.index === "number" ? row.index : index;
                        const detail = rowDetails.get(rowIndex) ?? null;
                        return `
                          <tr>
                            <td class="px-4 py-3 font-medium text-gray-900">${escapeHTML(rowIndex)}</td>
                            <td class="px-4 py-3 text-gray-700">${escapeHTML(`${row.resource}.${row.field_path}`)}</td>
                            <td class="px-4 py-3"><span class="${statusBadgeClass(rowStatusSeverity(detail?.status ?? "staged"))}">${escapeHTML(detail?.status ?? "staged")}</span></td>
                            <td class="px-4 py-3">
                              <div class="flex flex-wrap gap-2">
                                ${this.rowActions(rowIndex, detail).map((decision) => this.renderApplyDecisionButton(
                                  rowIndex,
                                  decision,
                                  this.applyDecisionForRow(rowIndex) === decision,
                                )).join("")}
                              </div>
                            </td>
                            <td class="px-4 py-3 text-gray-600">${escapeHTML(detail?.conflict?.message ?? detail?.error ?? "Ready for apply.")}</td>
                          </tr>`;
                      }).join("")}
                    </tbody>
                  </table>
                </div>
              </section>`
            : ""
        }
        ${
          result
            ? `
              <section class="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                <div>
                  <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-500">Terminal Summary</h3>
                  <p class="mt-1 text-sm text-gray-600">Review row outcomes and retained downloads before closing the loop.</p>
                </div>
                <div class="grid gap-3 md:grid-cols-4">
                  ${[
                    ["Processed", result.summary.processed],
                    ["Succeeded", result.summary.succeeded],
                    ["Conflicts", result.summary.conflicts ?? 0],
                    ["Failed", result.summary.failed],
                  ].map(([label, value]) => `
                    <div class="rounded-xl bg-gray-50 px-4 py-3">
                      <div class="text-xs uppercase tracking-wider text-gray-500">${escapeHTML(label)}</div>
                      <div class="mt-1 text-2xl font-semibold text-gray-900">${escapeHTML(value)}</div>
                    </div>`).join("")}
                </div>
                <div class="flex flex-wrap gap-3 text-sm text-blue-700">
                  ${Object.values(result.job?.downloads ?? {}).map((download) => `
                    <a href="${escapeHTML(download.href)}" download="${escapeHTML(download.filename)}" class="font-medium hover:text-blue-900">${escapeHTML(download.label)}</a>
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
                      ${terminalRows.map((row) => `
                        <tr>
                          <td class="px-4 py-3 font-medium text-gray-900">${escapeHTML(row.index)}</td>
                          <td class="px-4 py-3 text-gray-700">${escapeHTML(`${row.resource}.${row.field_path}`)}</td>
                          <td class="px-4 py-3"><span class="${statusBadgeClass(rowStatusSeverity(row.status))}">${escapeHTML(row.status)}</span></td>
                          <td class="px-4 py-3 text-gray-600">${escapeHTML(String(row.metadata?.resolution_decision ?? "apply"))}</td>
                          <td class="px-4 py-3 text-gray-600">${escapeHTML(row.conflict?.message ?? row.error ?? "Applied without conflict.")}</td>
                        </tr>
                      `).join("")}
                    </tbody>
                  </table>
                </div>
              </section>`
            : ""
        }
      </section>
    `;
  }

  private renderApplyToggle(key: string, label: string, checked: boolean): string {
    return `
      <label class="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
        <input type="checkbox" data-apply-option="${key}" ${checked ? "checked" : ""}>
        <span>${escapeHTML(label)}</span>
      </label>
    `;
  }

  private renderApplyDecisionButton(
    row: number,
    decision: ApplyResolutionDecision,
    active: boolean,
  ): string {
    const labelMap: Record<ApplyResolutionDecision, string> = {
      apply: "apply",
      skip: "skip",
      override_source_hash: "override source",
      create_missing: "create missing",
    };
    return `
      <button
        type="button"
        data-apply-row="${row}"
        data-apply-decision="${decision}"
        class="rounded-full border px-3 py-1 text-xs font-medium ${
          active ? "border-blue-500 bg-blue-100 text-blue-900" : "border-gray-200 bg-white text-gray-600"
        }"
      >
        ${escapeHTML(labelMap[decision])}
      </button>
    `;
  }

  private renderHistoryStep(items: TranslationExchangeJob[]): string {
    const meta = this.historyState.response?.meta;
    const jobKinds = meta?.job_kinds ?? ["export", "import_validate", "import_apply"];
    const jobStatuses = meta?.job_statuses ?? ["running", "completed", "failed"];
    const selected = this.activeHistoryJob();
    const selectedResult = jobValidationResult(selected);
    return `
      <section class="space-y-5">
        <div class="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-5">
          <label class="text-sm font-medium text-gray-700">
            Kind
            <select data-history-kind class="mt-2 rounded-xl border border-gray-200 px-3 py-2">
              <option value="all">All</option>
              ${jobKinds.map((kind) => `
                <option value="${escapeHTML(kind)}" ${
                  this.historyState.kind === kind ? "selected" : ""
                }>${escapeHTML(kind)}</option>`).join("")}
            </select>
          </label>
          <label class="text-sm font-medium text-gray-700">
            Status
            <select data-history-status class="mt-2 rounded-xl border border-gray-200 px-3 py-2">
              <option value="all">All</option>
              ${jobStatuses.map((status) => `
                <option value="${escapeHTML(status)}" ${
                  this.historyState.jobStatus === status ? "selected" : ""
                }>${escapeHTML(status)}</option>`).join("")}
            </select>
          </label>
          <button class="btn btn-secondary" type="button" data-history-refresh="true">Refresh history</button>
          <span class="text-sm text-gray-600">${escapeHTML(this.historyState.message)}</span>
        </div>
        <div class="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div class="grid gap-4">
            ${
              items.length > 0
                ? items.map((job) => `
                  <article class="rounded-xl border p-5 ${
                    selected?.id === job.id
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-gray-200 bg-white"
                  }">
                    <button type="button" data-history-job="${escapeHTML(job.id)}" class="w-full text-left">
                      <div class="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div class="flex flex-wrap items-center gap-2">
                            <span class="${statusBadgeClass("info")}">${escapeHTML(job.kind.replace(/_/g, " "))}</span>
                            <span class="${statusBadgeClass(jobStatusSeverity(job.status))}">${escapeHTML(job.status)}</span>
                            ${job.fixture ? `<span class="${statusBadgeClass("warning")}">Fixture</span>` : ""}
                          </div>
                          <h3 class="mt-3 text-lg font-semibold text-gray-900">${escapeHTML(job.file?.name ?? job.id)}</h3>
                          <p class="mt-1 text-sm text-gray-600">Actor ${escapeHTML(job.actor?.label ?? "system")} • ${escapeHTML(formatDate(job.created_at))}</p>
                        </div>
                        <div class="text-sm text-gray-600">
                          <div>${escapeHTML(job.progress.processed)} / ${escapeHTML(job.progress.total ?? 0)} processed</div>
                          <div>${escapeHTML(job.file?.format ?? "json").toUpperCase()} package</div>
                        </div>
                      </div>
                    </button>
                  </article>`).join("")
                : `<div class="rounded-xl border border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">No jobs match the current filters.</div>`
            }
          </div>
          ${
            selected
              ? `
                <section class="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 class="text-lg font-semibold text-gray-900">${escapeHTML(selected.file?.name ?? selected.id)}</h2>
                      <p class="mt-1 text-sm text-gray-600">${escapeHTML(selected.kind.replace(/_/g, " "))} • ${escapeHTML(selected.status)} • ${escapeHTML(formatDate(selected.updated_at))}</p>
                    </div>
                    <div class="flex flex-wrap gap-3">
                      <button class="btn btn-secondary" type="button" data-history-load-apply="all">Load in apply step</button>
                      <button class="btn btn-secondary" type="button" data-history-load-apply="conflicts" ${
                        (selectedResult?.summary.conflicts ?? 0) > 0 ? "" : "disabled"
                      }>Retry conflicts</button>
                    </div>
                  </div>
                  <div class="grid gap-3 md:grid-cols-4">
                    ${[
                      ["Processed", selected.progress.processed],
                      ["Succeeded", selected.progress.succeeded],
                      ["Conflicts", selected.progress.conflicts ?? selectedResult?.summary.conflicts ?? 0],
                      ["Failed", selected.progress.failed],
                    ].map(([label, value]) => `
                      <div class="rounded-xl bg-gray-50 px-4 py-3">
                        <div class="text-xs uppercase tracking-wider text-gray-500">${escapeHTML(label)}</div>
                        <div class="mt-1 text-2xl font-semibold text-gray-900">${escapeHTML(value)}</div>
                      </div>`).join("")}
                  </div>
                  <div class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                    <div><span class="font-semibold text-gray-900">Request hash:</span> ${escapeHTML(selected.request_hash ?? "n/a")}</div>
                    <div><span class="font-semibold text-gray-900">Request ID:</span> ${escapeHTML(selected.request_id ?? "n/a")}</div>
                    <div><span class="font-semibold text-gray-900">Trace ID:</span> ${escapeHTML(selected.trace_id ?? "n/a")}</div>
                  </div>
                  <div class="flex flex-wrap gap-3 text-sm text-blue-700">
                    ${Object.values(selected.downloads ?? {}).map((download) => `
                      <a href="${escapeHTML(download.href)}" download="${escapeHTML(download.filename)}" class="font-medium hover:text-blue-900">${escapeHTML(download.label)}</a>`).join("")}
                  </div>
                  ${
                    selectedResult
                      ? `
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
                              ${selectedResult.results.map((row) => `
                                <tr>
                                  <td class="px-4 py-3 font-medium text-gray-900">${escapeHTML(row.index)}</td>
                                  <td class="px-4 py-3 text-gray-700">${escapeHTML(`${row.resource}.${row.field_path}`)}</td>
                                  <td class="px-4 py-3"><span class="${statusBadgeClass(rowStatusSeverity(row.status))}">${escapeHTML(row.status)}</span></td>
                                  <td class="px-4 py-3 text-gray-600">${escapeHTML(String(row.metadata?.resolution_decision ?? "apply"))}</td>
                                  <td class="px-4 py-3 text-gray-600">${escapeHTML(row.conflict?.message ?? row.error ?? "Completed without conflict.")}</td>
                                </tr>`).join("")}
                            </tbody>
                          </table>
                        </div>`
                      : `<div class="rounded-xl border border-gray-200 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">No per-row results were retained for this job.</div>`
                  }
                </section>`
              : ""
          }
        </div>
      </section>
    `;
  }
}
