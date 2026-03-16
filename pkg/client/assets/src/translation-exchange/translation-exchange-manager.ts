import type {
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
  type TranslationExchangeHistoryResponse,
  type TranslationExchangeJob,
  type TranslationExchangeValidationResult,
} from "../translation-contracts/index.js";

const DEFAULT_SELECTORS: TranslationExchangeSelectors = {
  root: "#translation-exchange-app",
};

type ExchangeStep = "export" | "validate" | "history";

interface ExportDraft {
  resources: string[];
  sourceLocale: string;
  targetLocales: string[];
  includeSourceHash: boolean;
}

interface ExportState {
  draft: ExportDraft;
  status: "idle" | "submitting" | "completed" | "error";
  job: TranslationExchangeJob | null;
  downloadHref: string;
  downloadLabel: string;
  message: string;
}

interface ValidateState {
  upload: ReturnType<typeof normalizeTranslationExchangeUploadDescriptor>;
  file: File | null;
  result: TranslationExchangeValidationResult | null;
  decisions: Record<number, TranslationExchangeStageDecision>;
  status: "idle" | "validating" | "validated" | "error";
  message: string;
}

interface HistoryState {
  status: "idle" | "loading" | "ready" | "error";
  response: TranslationExchangeHistoryResponse | null;
  kind: string;
  jobStatus: string;
  message: string;
}

function escapeHTML(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
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
    result: null,
    decisions: {},
    status: "idle",
    message: "",
  };
  private historyState: HistoryState = {
    status: "idle",
    response: null,
    kind: "all",
    jobStatus: "all",
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
        this.render();
      }
      return;
    }

    const refresh = target.closest<HTMLElement>("[data-history-refresh]");
    if (refresh) {
      void this.loadHistory(true);
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
      this.validateState.file = file;
      this.validateState.upload = normalizeTranslationExchangeUploadDescriptor({
        state: file ? "selected" : "idle",
        filename: file?.name,
        format: file?.name.endsWith(".csv") ? "csv" : "json",
        message: file ? "Ready to validate." : "",
      });
      this.validateState.message = file ? "Validation is staged only in Phase 18." : "";
      this.render();
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
    if (draft.resources.length === 0 || draft.targetLocales.length === 0 || warnings.some((warning) => warning.includes("cannot include"))) {
      this.exportState.status = "error";
      this.exportState.message = warnings[0] ?? "Complete the export filters before continuing.";
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
      });
      const job = normalizeTranslationExchangeJob(response.job ?? response?.data?.job);
      this.exportState.job = job;
      this.exportState.downloadHref =
        downloadHref(job, "artifact") || this.createRowsDownload(response.rows ?? []);
      this.exportState.downloadLabel = downloadLabel(job, "artifact") || "Download export JSON";
      this.exportState.status = "completed";
      this.exportState.message = `${response.row_count ?? 0} rows ready for handoff.`;
      this.toast?.success(this.exportState.message);
      await this.loadHistory(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed.";
      this.exportState.status = "error";
      this.exportState.message = message;
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
        "Rows are staged locally with accept/reject decisions until apply ships in Phase 19.";
      this.toast?.info("Validation completed.");
      await this.loadHistory(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Validation failed.";
      this.validateState.status = "error";
      this.validateState.message = message;
      this.toast?.error(message);
    }
    this.render();
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

  private createRowsDownload(rows: unknown[]): string {
    const json = JSON.stringify(rows, null, 2);
    return toDataURL("application/json", json);
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
      <section class="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <header class="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-stone-50 to-sky-50">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Slice 8</p>
              <h1 class="mt-2 text-2xl font-semibold text-gray-900">Translation Exchange Wizard</h1>
              <p class="mt-2 max-w-3xl text-sm text-gray-600">Prepare external translation files, validate row-level conflicts, and review export or validate history without mutating content.</p>
            </div>
            <a class="btn btn-secondary" href="${escapeHTML(
              `${this.config.apiPath}/template?format=json`,
            )}">
              Download JSON Template
            </a>
          </div>
          <nav class="mt-5 grid gap-3 md:grid-cols-3" aria-label="Exchange steps">
            ${this.renderStepButton("export", "1. Export", "Filter records, review warnings, and hand off files.")}
            ${this.renderStepButton("validate", "2. Validate", "Upload a package and stage accept or reject decisions.")}
            ${this.renderStepButton("history", "3. History", "Inspect prior export and validate jobs with downloads.")}
          </nav>
        </header>
        <div class="p-6 space-y-6">
          ${this.step === "export" ? this.renderExportStep(warnings, examples) : ""}
          ${this.step === "validate" ? this.renderValidateStep(accepted, rejected, examples) : ""}
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
        class="rounded-2xl border px-4 py-4 text-left transition ${
          active
            ? "border-sky-400 bg-sky-50 shadow-sm"
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
              <a class="text-sm font-medium text-sky-700 hover:text-sky-900" href="${escapeHTML(download.href)}" download="${escapeHTML(download.filename)}">
                ${escapeHTML(download.label)}
              </a>`,
          )
          .join("");
        return `
          <article class="rounded-xl border border-dashed border-sky-200 bg-sky-50/60 p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-gray-900">${escapeHTML(job.kind.replaceAll("_", " "))}</p>
                <p class="text-xs text-gray-600">${escapeHTML(job.file?.name ?? "Seeded example")}</p>
              </div>
              <span class="rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-700">Fixture</span>
            </div>
            <div class="mt-3 flex flex-wrap gap-3">${links}</div>
          </article>
        `;
      })
      .join("");
    return `
      <section class="space-y-3">
        <div>
          <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Seeded Examples</h2>
          <p class="mt-1 text-sm text-gray-600">Use the stable demo artifacts to exercise the wizard and end-to-end coverage.</p>
        </div>
        <div class="grid gap-3 md:grid-cols-2">${cards}</div>
      </section>
    `;
  }

  private renderExportStep(warnings: string[], examples: TranslationExchangeJob[]): string {
    const job = this.exportState.job;
    return `
      ${this.renderExampleLinks(examples.filter((job) => job.kind === "export"))}
      <section class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form data-export-form="true" class="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
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
          <label class="flex items-center gap-3 rounded-xl border border-gray-200 bg-stone-50 px-4 py-3 text-sm text-gray-700">
            <input type="checkbox" name="include_source_hash" ${
              this.exportState.draft.includeSourceHash ? "checked" : ""
            }>
            <span>Include source hashes so validate can detect stale source drift.</span>
          </label>
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary" type="submit">Create export package</button>
            <span class="text-sm text-gray-600">${escapeHTML(this.exportState.message)}</span>
          </div>
        </form>
        <aside class="space-y-4 rounded-2xl border border-gray-200 bg-stone-50 p-5">
          <div>
            <h2 class="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">Preflight</h2>
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
              <div class="rounded-2xl bg-white p-4">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <p class="text-sm font-semibold text-gray-900">Latest export job</p>
                    <p class="text-xs text-gray-500">${escapeHTML(job.id)}</p>
                  </div>
                  <span class="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-800">${escapeHTML(job.status)}</span>
                </div>
                <div class="mt-4 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div class="h-full bg-sky-500" style="width: ${progressPercent(job)}%"></div>
                </div>
                <div class="mt-3 text-sm text-gray-600">${escapeHTML(job.progress.processed)} / ${escapeHTML(job.progress.total ?? 0)} rows prepared</div>
                ${
                  this.exportState.downloadHref
                    ? `<a class="mt-4 inline-flex text-sm font-medium text-sky-700 hover:text-sky-900" href="${escapeHTML(
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
      ${this.renderExampleLinks(examples.filter((job) => job.kind === "import_validate"))}
      <section class="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
        <form data-validate-form="true" class="space-y-4">
          <div class="rounded-2xl border border-dashed border-gray-300 bg-stone-50 p-5">
            <label class="text-sm font-semibold text-gray-900" for="exchange-import-file">Validation file</label>
            <input id="exchange-import-file" type="file" accept=".json,.csv" class="mt-3 block w-full text-sm text-gray-700">
            <p class="mt-2 text-sm text-gray-600">${escapeHTML(this.validateState.upload.filename ?? "Choose a JSON or CSV package exported for translators.")}</p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <button class="btn btn-primary" type="submit">Validate package</button>
            <button class="btn btn-secondary" type="button" disabled>Apply ships in Phase 19</button>
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
                  <div class="rounded-xl bg-stone-50 px-4 py-3">
                    <div class="text-xs uppercase tracking-[0.2em] text-gray-500">${escapeHTML(label)}</div>
                    <div class="mt-1 text-2xl font-semibold text-gray-900">${escapeHTML(value)}</div>
                  </div>`).join("")}
              </div>
              <div class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Local staging only: ${escapeHTML(accepted)} accepted, ${escapeHTML(rejected)} rejected.
              </div>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm">
                  <thead class="bg-stone-50 text-left text-xs uppercase tracking-[0.18em] text-gray-500">
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
                        <td class="px-4 py-3"><span class="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-gray-700">${escapeHTML(row.status)}</span></td>
                        <td class="px-4 py-3">
                          <div class="flex gap-2">
                            ${this.renderDecisionButton(row.index, "accepted", this.validateState.decisions[row.index] === "accepted")}
                            ${this.renderDecisionButton(row.index, "rejected", this.validateState.decisions[row.index] === "rejected")}
                          </div>
                        </td>
                        <td class="px-4 py-3 text-gray-600">${escapeHTML(
                          row.conflict?.message ?? row.error ?? "No blocking issues.",
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
          active ? "border-sky-500 bg-sky-100 text-sky-900" : "border-gray-200 bg-white text-gray-600"
        }"
      >
        ${escapeHTML(decision)}
      </button>
    `;
  }

  private renderHistoryStep(items: TranslationExchangeJob[]): string {
    const meta = this.historyState.response?.meta;
    const jobKinds = meta?.job_kinds ?? ["export", "import_validate", "import_apply"];
    const jobStatuses = meta?.job_statuses ?? ["running", "completed", "failed"];
    return `
      <section class="space-y-5">
        <div class="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-5">
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
        <div class="grid gap-4">
          ${
            items.length > 0
              ? items.map((job) => `
                <article class="rounded-2xl border border-gray-200 bg-white p-5">
                  <div class="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">${escapeHTML(job.kind.replaceAll("_", " "))}</span>
                        <span class="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-gray-700">${escapeHTML(job.status)}</span>
                        ${job.fixture ? '<span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Fixture</span>' : ""}
                      </div>
                      <h3 class="mt-3 text-lg font-semibold text-gray-900">${escapeHTML(job.file?.name ?? job.id)}</h3>
                      <p class="mt-1 text-sm text-gray-600">Actor ${escapeHTML(job.actor?.label ?? "system")} • ${escapeHTML(formatDate(job.created_at))}</p>
                    </div>
                    <div class="text-sm text-gray-600">
                      <div>${escapeHTML(job.progress.processed)} / ${escapeHTML(job.progress.total ?? 0)} processed</div>
                      <div>${escapeHTML(job.file?.format ?? "json").toUpperCase()} package</div>
                    </div>
                  </div>
                  <div class="mt-4 flex flex-wrap gap-3 text-sm text-sky-700">
                    ${Object.values(job.downloads ?? {}).map((download) => `
                      <a href="${escapeHTML(download.href)}" download="${escapeHTML(download.filename)}" class="font-medium hover:text-sky-900">${escapeHTML(download.label)}</a>`).join("")}
                  </div>
                </article>`).join("")
              : `<div class="rounded-2xl border border-dashed border-gray-300 bg-stone-50 px-6 py-10 text-center text-sm text-gray-600">No jobs match the current filters.</div>`
          }
        </div>
      </section>
    `;
  }
}
