import { b as n, h as f, s as v } from "../chunks/dom-helpers-cltCUiC5.js";
import { m as B } from "../chunks/formatters-CxrdwABk.js";
import { a as E, s as b } from "../chunks/page-feedback-CVdtgsKH.js";
import { escapeHTML as l } from "../shared/html.js";
import { onReady as L } from "../shared/dom-ready.js";
class C {
  constructor(t) {
    this.syncRuns = [], this.mappings = [], this.currentRunId = null, this.config = t, this.apiBase = t.apiBasePath || `${t.basePath}/api`, this.syncRunsEndpoint = `${this.apiBase}/esign/integrations/sync-runs`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: n("#sync-announcements"),
      loadingState: n("#loading-state"),
      emptyState: n("#empty-state"),
      errorState: n("#error-state"),
      runsTimeline: n("#runs-timeline"),
      errorMessage: n("#error-message"),
      refreshBtn: n("#refresh-btn"),
      retryBtn: n("#retry-btn"),
      filterProvider: n("#filter-provider"),
      filterStatus: n("#filter-status"),
      filterDirection: n("#filter-direction"),
      statTotal: n("#stat-total"),
      statRunning: n("#stat-running"),
      statCompleted: n("#stat-completed"),
      statFailed: n("#stat-failed"),
      startSyncBtn: n("#start-sync-btn"),
      startSyncEmptyBtn: n("#start-sync-empty-btn"),
      startSyncModal: n("#start-sync-modal"),
      startSyncForm: n("#start-sync-form"),
      cancelSyncBtn: n("#cancel-sync-btn"),
      submitSyncBtn: n("#submit-sync-btn"),
      syncMappingSelect: n("#sync-mapping"),
      runDetailModal: n("#run-detail-modal"),
      closeDetailBtn: n("#close-detail-btn"),
      detailRunId: n("#detail-run-id"),
      detailProvider: n("#detail-provider"),
      detailDirection: n("#detail-direction"),
      detailStatus: n("#detail-status"),
      detailStarted: n("#detail-started"),
      detailCompleted: n("#detail-completed"),
      detailCursor: n("#detail-cursor"),
      detailAttempt: n("#detail-attempt"),
      detailErrorSection: n("#detail-error-section"),
      detailLastError: n("#detail-last-error"),
      detailCheckpoints: n("#detail-checkpoints"),
      actionResumeBtn: n("#action-resume-btn"),
      actionRetryBtn: n("#action-retry-btn"),
      actionCompleteBtn: n("#action-complete-btn"),
      actionFailBtn: n("#action-fail-btn"),
      actionDiagnosticsBtn: n("#action-diagnostics-btn")
    };
  }
  /**
   * Initialize the sync runs page
   */
  async init() {
    this.setupEventListeners(), await Promise.all([this.loadMappings(), this.loadSyncRuns()]);
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const {
      startSyncBtn: t,
      startSyncEmptyBtn: e,
      cancelSyncBtn: s,
      startSyncForm: r,
      refreshBtn: c,
      retryBtn: a,
      closeDetailBtn: i,
      filterProvider: u,
      filterStatus: o,
      filterDirection: p,
      actionResumeBtn: S,
      actionRetryBtn: w,
      actionCompleteBtn: k,
      actionFailBtn: g,
      actionDiagnosticsBtn: R,
      startSyncModal: m,
      runDetailModal: y
    } = this.elements;
    t?.addEventListener("click", () => this.openStartSyncModal()), e?.addEventListener("click", () => this.openStartSyncModal()), s?.addEventListener("click", () => this.closeStartSyncModal()), r?.addEventListener("submit", (d) => this.startSync(d)), c?.addEventListener("click", () => this.loadSyncRuns()), a?.addEventListener("click", () => this.loadSyncRuns()), i?.addEventListener("click", () => this.closeRunDetail()), u?.addEventListener("change", () => this.renderTimeline()), o?.addEventListener("change", () => this.renderTimeline()), p?.addEventListener("change", () => this.renderTimeline()), S?.addEventListener("click", () => this.runAction("resume")), w?.addEventListener("click", () => this.runAction("resume")), k?.addEventListener("click", () => this.runAction("complete")), g?.addEventListener("click", () => this.runAction("fail")), R?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (d) => {
      d.key === "Escape" && (m && !m.classList.contains("hidden") && this.closeStartSyncModal(), y && !y.classList.contains("hidden") && this.closeRunDetail());
    }), [m, y].forEach((d) => {
      d?.addEventListener("click", (h) => {
        const $ = h.target;
        ($ === d || $.getAttribute("aria-hidden") === "true") && (d === m ? this.closeStartSyncModal() : d === y && this.closeRunDetail());
      });
    });
  }
  /**
   * Show a specific page state
   */
  showState(t) {
    const { loadingState: e, emptyState: s, errorState: r, runsTimeline: c } = this.elements;
    switch (f(e), f(s), f(r), f(c), t) {
      case "loading":
        v(e);
        break;
      case "empty":
        v(s);
        break;
      case "error":
        v(r);
        break;
      case "list":
        v(c);
        break;
    }
  }
  /**
   * Get status badge HTML
   */
  getStatusBadge(t) {
    const e = {
      pending: { label: "Pending", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
      running: {
        label: "Running",
        bg: "bg-blue-100",
        text: "text-blue-700",
        dot: "bg-blue-500",
        animate: !0
      },
      completed: { label: "Completed", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
      failed: { label: "Failed", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" }
    }, s = e[t] || e.pending;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${s.bg} ${s.text}">
      <span class="w-1.5 h-1.5 rounded-full ${s.dot} ${s.animate ? "animate-pulse" : ""}" aria-hidden="true"></span>
      ${s.label}
    </span>`;
  }
  /**
   * Get direction badge HTML
   */
  getDirectionBadge(t) {
    return t === "inbound" ? '<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">↓ Inbound</span>' : '<span class="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-medium">↑ Outbound</span>';
  }
  /**
   * Load mappings from API
   */
  async loadMappings() {
    try {
      const t = await fetch(this.mappingsEndpoint, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (t.ok) {
        const e = await t.json();
        this.mappings = (e.mappings || []).filter((s) => s.status === "published"), this.populateMappingSelect();
      }
    } catch (t) {
      console.error("Error loading mappings:", t);
    }
  }
  /**
   * Populate mapping select dropdown
   */
  populateMappingSelect() {
    const { syncMappingSelect: t } = this.elements;
    t && (t.innerHTML = '<option value="">Select mapping...</option>' + this.mappings.map(
      (e) => `<option value="${l(e.id)}">${l(e.name)} (${l(e.provider)})</option>`
    ).join(""));
  }
  /**
   * Load sync runs from API
   */
  async loadSyncRuns() {
    this.showState("loading");
    try {
      const { filterProvider: t } = this.elements, e = new URLSearchParams();
      t?.value && e.set("provider", t.value);
      const s = await fetch(
        `${this.syncRunsEndpoint}${e.toString() ? "?" + e : ""}`,
        {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }
      );
      if (!s.ok) throw new Error(`HTTP ${s.status}`);
      const r = await s.json();
      this.syncRuns = r.runs || [], this.populateProviderFilter(), this.updateStats(), this.renderTimeline(), E(this.elements.announcements, `Loaded ${this.syncRuns.length} sync runs`);
    } catch (t) {
      console.error("Error loading sync runs:", t);
      const { errorMessage: e } = this.elements;
      e && (e.textContent = t instanceof Error ? t.message : "An error occurred"), this.showState("error");
    }
  }
  /**
   * Populate provider filter dropdown
   */
  populateProviderFilter() {
    const { filterProvider: t } = this.elements;
    if (!t) return;
    const e = t.value, s = [...new Set(this.syncRuns.map((r) => r.provider).filter(Boolean))];
    t.innerHTML = '<option value="">All Providers</option>' + s.map(
      (r) => `<option value="${l(r)}" ${r === e ? "selected" : ""}>${l(r)}</option>`
    ).join("");
  }
  /**
   * Update stats display
   */
  updateStats() {
    const { statTotal: t, statRunning: e, statCompleted: s, statFailed: r } = this.elements, c = this.syncRuns.length, a = this.syncRuns.filter(
      (o) => o.status === "running" || o.status === "pending"
    ).length, i = this.syncRuns.filter((o) => o.status === "completed").length, u = this.syncRuns.filter((o) => o.status === "failed").length;
    t && (t.textContent = String(c)), e && (e.textContent = String(a)), s && (s.textContent = String(i)), r && (r.textContent = String(u));
  }
  /**
   * Render sync runs timeline with filters applied
   */
  renderTimeline() {
    const { runsTimeline: t, filterStatus: e, filterDirection: s } = this.elements;
    if (!t) return;
    const r = e?.value || "", c = s?.value || "", a = this.syncRuns.filter((i) => !(r && i.status !== r || c && i.direction !== c));
    if (a.length === 0) {
      this.showState("empty");
      return;
    }
    t.innerHTML = a.map(
      (i) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer sync-run-card" data-id="${l(i.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${i.status === "running" ? "bg-blue-100" : i.status === "completed" ? "bg-green-100" : i.status === "failed" ? "bg-red-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${i.status === "running" ? "text-blue-600 animate-spin" : i.status === "completed" ? "text-green-600" : i.status === "failed" ? "text-red-600" : "text-gray-400"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-gray-900">${l(i.provider)}</span>
                  ${this.getDirectionBadge(i.direction)}
                </div>
                <p class="text-xs text-gray-500 font-mono">${l(i.id.slice(0, 8))}...</p>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(i.status)}
              <p class="text-xs text-gray-500 mt-1">${B(i.started_at)}</p>
            </div>
          </div>

          ${i.cursor ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500">Cursor: <span class="font-mono text-gray-700">${l(i.cursor)}</span></p>
            </div>
          ` : ""}

          ${i.last_error ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-red-600 truncate">Error: ${l(i.last_error)}</p>
            </div>
          ` : ""}
        </div>
      </div>
    `
    ).join(""), this.showState("list"), t.querySelectorAll(".sync-run-card").forEach((i) => {
      i.addEventListener("click", () => this.openRunDetail(i.dataset.id || ""));
    });
  }
  /**
   * Open start sync modal
   */
  openStartSyncModal() {
    const { startSyncModal: t, startSyncForm: e } = this.elements;
    e?.reset(), v(t), document.getElementById("sync-provider")?.focus();
  }
  /**
   * Close start sync modal
   */
  closeStartSyncModal() {
    f(this.elements.startSyncModal);
  }
  /**
   * Start a new sync run
   */
  async startSync(t) {
    t.preventDefault();
    const { startSyncForm: e, submitSyncBtn: s } = this.elements;
    if (!e || !s) return;
    const r = new FormData(e), c = {
      provider: r.get("provider"),
      direction: r.get("direction"),
      mapping_spec_id: r.get("mapping_spec_id"),
      cursor: r.get("cursor") || void 0
    };
    s.setAttribute("disabled", "true"), s.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...';
    try {
      const a = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(c)
      });
      if (!a.ok) {
        const i = await a.json();
        throw new Error(i.error?.message || `HTTP ${a.status}`);
      }
      b("Sync run started", "success"), E(this.elements.announcements, "Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (a) {
      console.error("Start sync error:", a);
      const i = a instanceof Error ? a.message : "Unknown error";
      b(`Failed to start: ${i}`, "error");
    } finally {
      s.removeAttribute("disabled"), s.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Start Sync';
    }
  }
  /**
   * Open run detail modal
   */
  async openRunDetail(t) {
    this.currentRunId = t;
    const e = this.syncRuns.find((h) => h.id === t);
    if (!e) return;
    const {
      runDetailModal: s,
      detailRunId: r,
      detailProvider: c,
      detailDirection: a,
      detailStatus: i,
      detailStarted: u,
      detailCompleted: o,
      detailCursor: p,
      detailAttempt: S,
      detailErrorSection: w,
      detailLastError: k,
      detailCheckpoints: g,
      actionResumeBtn: R,
      actionRetryBtn: m,
      actionCompleteBtn: y,
      actionFailBtn: d
    } = this.elements;
    r && (r.textContent = e.id), c && (c.textContent = e.provider), a && (a.textContent = e.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), i && (i.innerHTML = this.getStatusBadge(e.status)), u && (u.textContent = B(e.started_at)), o && (o.textContent = e.completed_at ? B(e.completed_at) : "-"), p && (p.textContent = e.cursor || "-"), S && (S.textContent = String(e.attempt_count || 1)), e.last_error ? (k && (k.textContent = e.last_error), v(w)) : f(w), R && R.classList.toggle("hidden", e.status !== "running"), m && m.classList.toggle("hidden", e.status !== "failed"), y && y.classList.toggle("hidden", e.status !== "running"), d && d.classList.toggle("hidden", e.status !== "running"), g && (g.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), v(s);
    try {
      const h = await fetch(`${this.syncRunsEndpoint}/${t}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (h.ok) {
        const $ = await h.json();
        this.renderCheckpoints($.checkpoints || []);
      } else
        g && (g.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (h) {
      console.error("Error loading checkpoints:", h), g && (g.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
    }
  }
  /**
   * Render checkpoints
   */
  renderCheckpoints(t) {
    const { detailCheckpoints: e } = this.elements;
    if (e) {
      if (t.length === 0) {
        e.innerHTML = '<p class="text-sm text-gray-500">No checkpoints recorded</p>';
        return;
      }
      e.innerHTML = t.map(
        (s, r) => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
          ${r + 1}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-gray-900">${l(s.checkpoint_key)}</span>
            <span class="text-xs text-gray-500">${B(s.created_at)}</span>
          </div>
          <p class="text-xs text-gray-600 font-mono truncate">Cursor: ${l(s.cursor)}</p>
        </div>
      </div>
    `
      ).join("");
    }
  }
  /**
   * Close run detail modal
   */
  closeRunDetail() {
    f(this.elements.runDetailModal), this.currentRunId = null;
  }
  /**
   * Run an action on the current sync run
   */
  async runAction(t) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: e, actionRetryBtn: s, actionCompleteBtn: r, actionFailBtn: c } = this.elements, a = t === "resume" ? e : t === "complete" ? r : c, i = t === "resume" ? s : null;
    if (!a) return;
    a.setAttribute("disabled", "true"), i?.setAttribute("disabled", "true");
    const u = a.innerHTML;
    a.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const o = `${this.syncRunsEndpoint}/${this.currentRunId}/${t}`, p = await fetch(o, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `${t}-${this.currentRunId}-${Date.now()}`
        },
        body: JSON.stringify(
          t === "fail" ? { last_error: "Manually marked as failed" } : {}
        )
      });
      if (!p.ok) {
        const S = await p.json();
        throw new Error(S.error?.message || `HTTP ${p.status}`);
      }
      b(`Sync run ${t} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (o) {
      console.error(`${t} error:`, o);
      const p = o instanceof Error ? o.message : "Unknown error";
      b(`Failed: ${p}`, "error");
    } finally {
      a.removeAttribute("disabled"), i?.removeAttribute("disabled"), a.innerHTML = u;
    }
  }
  /**
   * Open diagnostics for current run
   */
  async openDiagnostics() {
    if (this.currentRunId)
      try {
        const t = await fetch(
          `${this.apiBase}/esign/integrations/diagnostics?run_id=${this.currentRunId}`,
          {
            credentials: "same-origin",
            headers: { Accept: "application/json" }
          }
        );
        if (t.ok) {
          const e = await t.json();
          console.log("Diagnostics:", e), b("Diagnostics logged to console", "info");
        }
      } catch (t) {
        console.error("Diagnostics error:", t);
      }
  }
}
function j(x) {
  const t = new C(x);
  return L(() => t.init()), t;
}
function H(x) {
  const t = {
    basePath: x.basePath,
    apiBasePath: x.apiBasePath || `${x.basePath}/api`
  }, e = new C(t);
  L(() => e.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = e);
}
export {
  C as IntegrationSyncRunsController,
  H as bootstrapIntegrationSyncRuns,
  j as initIntegrationSyncRuns
};
//# sourceMappingURL=integration-sync-runs.js.map
