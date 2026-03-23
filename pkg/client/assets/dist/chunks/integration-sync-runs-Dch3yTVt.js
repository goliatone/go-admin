import { c as k, f, l as s, o as y, t as $ } from "./dom-helpers-CDdChTSn.js";
var R = class {
  constructor(t) {
    this.syncRuns = [], this.mappings = [], this.currentRunId = null, this.config = t, this.apiBase = t.apiBasePath || `${t.basePath}/api`, this.syncRunsEndpoint = `${this.apiBase}/esign/integrations/sync-runs`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: s("#sync-announcements"),
      loadingState: s("#loading-state"),
      emptyState: s("#empty-state"),
      errorState: s("#error-state"),
      runsTimeline: s("#runs-timeline"),
      errorMessage: s("#error-message"),
      refreshBtn: s("#refresh-btn"),
      retryBtn: s("#retry-btn"),
      filterProvider: s("#filter-provider"),
      filterStatus: s("#filter-status"),
      filterDirection: s("#filter-direction"),
      statTotal: s("#stat-total"),
      statRunning: s("#stat-running"),
      statCompleted: s("#stat-completed"),
      statFailed: s("#stat-failed"),
      startSyncBtn: s("#start-sync-btn"),
      startSyncEmptyBtn: s("#start-sync-empty-btn"),
      startSyncModal: s("#start-sync-modal"),
      startSyncForm: s("#start-sync-form"),
      cancelSyncBtn: s("#cancel-sync-btn"),
      submitSyncBtn: s("#submit-sync-btn"),
      syncMappingSelect: s("#sync-mapping"),
      runDetailModal: s("#run-detail-modal"),
      closeDetailBtn: s("#close-detail-btn"),
      detailRunId: s("#detail-run-id"),
      detailProvider: s("#detail-provider"),
      detailDirection: s("#detail-direction"),
      detailStatus: s("#detail-status"),
      detailStarted: s("#detail-started"),
      detailCompleted: s("#detail-completed"),
      detailCursor: s("#detail-cursor"),
      detailAttempt: s("#detail-attempt"),
      detailErrorSection: s("#detail-error-section"),
      detailLastError: s("#detail-last-error"),
      detailCheckpoints: s("#detail-checkpoints"),
      actionResumeBtn: s("#action-resume-btn"),
      actionRetryBtn: s("#action-retry-btn"),
      actionCompleteBtn: s("#action-complete-btn"),
      actionFailBtn: s("#action-fail-btn"),
      actionDiagnosticsBtn: s("#action-diagnostics-btn")
    };
  }
  async init() {
    this.setupEventListeners(), await Promise.all([this.loadMappings(), this.loadSyncRuns()]);
  }
  setupEventListeners() {
    const { startSyncBtn: t, startSyncEmptyBtn: e, cancelSyncBtn: n, startSyncForm: a, refreshBtn: c, retryBtn: r, closeDetailBtn: i, filterProvider: p, filterStatus: o, filterDirection: d, actionResumeBtn: v, actionRetryBtn: x, actionCompleteBtn: S, actionFailBtn: u, actionDiagnosticsBtn: b, startSyncModal: g, runDetailModal: m } = this.elements;
    t?.addEventListener("click", () => this.openStartSyncModal()), e?.addEventListener("click", () => this.openStartSyncModal()), n?.addEventListener("click", () => this.closeStartSyncModal()), a?.addEventListener("submit", (l) => this.startSync(l)), c?.addEventListener("click", () => this.loadSyncRuns()), r?.addEventListener("click", () => this.loadSyncRuns()), i?.addEventListener("click", () => this.closeRunDetail()), p?.addEventListener("change", () => this.renderTimeline()), o?.addEventListener("change", () => this.renderTimeline()), d?.addEventListener("change", () => this.renderTimeline()), v?.addEventListener("click", () => this.runAction("resume")), x?.addEventListener("click", () => this.runAction("resume")), S?.addEventListener("click", () => this.runAction("complete")), u?.addEventListener("click", () => this.runAction("fail")), b?.addEventListener("click", () => this.openDiagnostics()), document.addEventListener("keydown", (l) => {
      l.key === "Escape" && (g && !g.classList.contains("hidden") && this.closeStartSyncModal(), m && !m.classList.contains("hidden") && this.closeRunDetail());
    }), [g, m].forEach((l) => {
      l?.addEventListener("click", (h) => {
        const w = h.target;
        (w === l || w.getAttribute("aria-hidden") === "true") && (l === g ? this.closeStartSyncModal() : l === m && this.closeRunDetail());
      });
    });
  }
  announce(t) {
    const { announcements: e } = this.elements;
    e && (e.textContent = t), $(t);
  }
  showState(t) {
    const { loadingState: e, emptyState: n, errorState: a, runsTimeline: c } = this.elements;
    switch (y(e), y(n), y(a), y(c), t) {
      case "loading":
        f(e);
        break;
      case "empty":
        f(n);
        break;
      case "error":
        f(a);
        break;
      case "list":
        f(c);
        break;
    }
  }
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t || "", e.innerHTML;
  }
  formatDate(t) {
    if (!t) return "-";
    try {
      const e = new Date(t);
      return e.toLocaleDateString() + " " + e.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return t;
    }
  }
  getStatusBadge(t) {
    const e = {
      pending: {
        label: "Pending",
        bg: "bg-gray-100",
        text: "text-gray-700",
        dot: "bg-gray-400"
      },
      running: {
        label: "Running",
        bg: "bg-blue-100",
        text: "text-blue-700",
        dot: "bg-blue-500",
        animate: !0
      },
      completed: {
        label: "Completed",
        bg: "bg-green-100",
        text: "text-green-700",
        dot: "bg-green-500"
      },
      failed: {
        label: "Failed",
        bg: "bg-red-100",
        text: "text-red-700",
        dot: "bg-red-500"
      }
    }, n = e[t] || e.pending;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${n.bg} ${n.text}">
      <span class="w-1.5 h-1.5 rounded-full ${n.dot} ${n.animate ? "animate-pulse" : ""}" aria-hidden="true"></span>
      ${n.label}
    </span>`;
  }
  getDirectionBadge(t) {
    return t === "inbound" ? '<span class="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">↓ Inbound</span>' : '<span class="px-2 py-0.5 bg-teal-100 text-teal-700 rounded text-xs font-medium">↑ Outbound</span>';
  }
  async loadMappings() {
    try {
      const t = await fetch(this.mappingsEndpoint, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      t.ok && (this.mappings = ((await t.json()).mappings || []).filter((e) => e.status === "published"), this.populateMappingSelect());
    } catch (t) {
      console.error("Error loading mappings:", t);
    }
  }
  populateMappingSelect() {
    const { syncMappingSelect: t } = this.elements;
    t && (t.innerHTML = '<option value="">Select mapping...</option>' + this.mappings.map((e) => `<option value="${this.escapeHtml(e.id)}">${this.escapeHtml(e.name)} (${this.escapeHtml(e.provider)})</option>`).join(""));
  }
  async loadSyncRuns() {
    this.showState("loading");
    try {
      const { filterProvider: t } = this.elements, e = new URLSearchParams();
      t?.value && e.set("provider", t.value);
      const n = await fetch(`${this.syncRunsEndpoint}${e.toString() ? "?" + e : ""}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!n.ok) throw new Error(`HTTP ${n.status}`);
      this.syncRuns = (await n.json()).runs || [], this.populateProviderFilter(), this.updateStats(), this.renderTimeline(), this.announce(`Loaded ${this.syncRuns.length} sync runs`);
    } catch (t) {
      console.error("Error loading sync runs:", t);
      const { errorMessage: e } = this.elements;
      e && (e.textContent = t instanceof Error ? t.message : "An error occurred"), this.showState("error");
    }
  }
  populateProviderFilter() {
    const { filterProvider: t } = this.elements;
    if (!t) return;
    const e = t.value;
    t.innerHTML = '<option value="">All Providers</option>' + [...new Set(this.syncRuns.map((n) => n.provider).filter(Boolean))].map((n) => `<option value="${this.escapeHtml(n)}" ${n === e ? "selected" : ""}>${this.escapeHtml(n)}</option>`).join("");
  }
  updateStats() {
    const { statTotal: t, statRunning: e, statCompleted: n, statFailed: a } = this.elements, c = this.syncRuns.length, r = this.syncRuns.filter((o) => o.status === "running" || o.status === "pending").length, i = this.syncRuns.filter((o) => o.status === "completed").length, p = this.syncRuns.filter((o) => o.status === "failed").length;
    t && (t.textContent = String(c)), e && (e.textContent = String(r)), n && (n.textContent = String(i)), a && (a.textContent = String(p));
  }
  renderTimeline() {
    const { runsTimeline: t, filterStatus: e, filterDirection: n } = this.elements;
    if (!t) return;
    const a = e?.value || "", c = n?.value || "", r = this.syncRuns.filter((i) => !(a && i.status !== a || c && i.direction !== c));
    if (r.length === 0) {
      this.showState("empty");
      return;
    }
    t.innerHTML = r.map((i) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer sync-run-card" data-id="${this.escapeHtml(i.id)}">
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
                  <span class="font-medium text-gray-900">${this.escapeHtml(i.provider)}</span>
                  ${this.getDirectionBadge(i.direction)}
                </div>
                <p class="text-xs text-gray-500 font-mono">${this.escapeHtml(i.id.slice(0, 8))}...</p>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(i.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(i.started_at)}</p>
            </div>
          </div>

          ${i.cursor ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-gray-500">Cursor: <span class="font-mono text-gray-700">${this.escapeHtml(i.cursor)}</span></p>
            </div>
          ` : ""}

          ${i.last_error ? `
            <div class="mt-3 pt-3 border-t border-gray-100">
              <p class="text-xs text-red-600 truncate">Error: ${this.escapeHtml(i.last_error)}</p>
            </div>
          ` : ""}
        </div>
      </div>
    `).join(""), this.showState("list"), t.querySelectorAll(".sync-run-card").forEach((i) => {
      i.addEventListener("click", () => this.openRunDetail(i.dataset.id || ""));
    });
  }
  openStartSyncModal() {
    const { startSyncModal: t, startSyncForm: e } = this.elements;
    e?.reset(), f(t), document.getElementById("sync-provider")?.focus();
  }
  closeStartSyncModal() {
    y(this.elements.startSyncModal);
  }
  async startSync(t) {
    t.preventDefault();
    const { startSyncForm: e, submitSyncBtn: n } = this.elements;
    if (!e || !n) return;
    const a = new FormData(e), c = {
      provider: a.get("provider"),
      direction: a.get("direction"),
      mapping_spec_id: a.get("mapping_spec_id"),
      cursor: a.get("cursor") || void 0
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Starting...';
    try {
      const r = await fetch(this.syncRunsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `sync-${Date.now()}`
        },
        body: JSON.stringify(c)
      });
      if (!r.ok) {
        const i = await r.json();
        throw new Error(i.error?.message || `HTTP ${r.status}`);
      }
      this.showToast("Sync run started", "success"), this.announce("Sync run started"), this.closeStartSyncModal(), await this.loadSyncRuns();
    } catch (r) {
      console.error("Start sync error:", r);
      const i = r instanceof Error ? r.message : "Unknown error";
      this.showToast(`Failed to start: ${i}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg> Start Sync';
    }
  }
  async openRunDetail(t) {
    this.currentRunId = t;
    const e = this.syncRuns.find((h) => h.id === t);
    if (!e) return;
    const { runDetailModal: n, detailRunId: a, detailProvider: c, detailDirection: r, detailStatus: i, detailStarted: p, detailCompleted: o, detailCursor: d, detailAttempt: v, detailErrorSection: x, detailLastError: S, detailCheckpoints: u, actionResumeBtn: b, actionRetryBtn: g, actionCompleteBtn: m, actionFailBtn: l } = this.elements;
    a && (a.textContent = e.id), c && (c.textContent = e.provider), r && (r.textContent = e.direction === "inbound" ? "Inbound (Import)" : "Outbound (Export)"), i && (i.innerHTML = this.getStatusBadge(e.status)), p && (p.textContent = this.formatDate(e.started_at)), o && (o.textContent = e.completed_at ? this.formatDate(e.completed_at) : "-"), d && (d.textContent = e.cursor || "-"), v && (v.textContent = String(e.attempt_count || 1)), e.last_error ? (S && (S.textContent = e.last_error), f(x)) : y(x), b && b.classList.toggle("hidden", e.status !== "running"), g && g.classList.toggle("hidden", e.status !== "failed"), m && m.classList.toggle("hidden", e.status !== "running"), l && l.classList.toggle("hidden", e.status !== "running"), u && (u.innerHTML = '<p class="text-sm text-gray-500">Loading checkpoints...</p>'), f(n);
    try {
      const h = await fetch(`${this.syncRunsEndpoint}/${t}/checkpoints`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (h.ok) {
        const w = await h.json();
        this.renderCheckpoints(w.checkpoints || []);
      } else u && (u.innerHTML = '<p class="text-sm text-gray-500">No checkpoints available</p>');
    } catch (h) {
      console.error("Error loading checkpoints:", h), u && (u.innerHTML = '<p class="text-sm text-red-600">Failed to load checkpoints</p>');
    }
  }
  renderCheckpoints(t) {
    const { detailCheckpoints: e } = this.elements;
    if (e) {
      if (t.length === 0) {
        e.innerHTML = '<p class="text-sm text-gray-500">No checkpoints recorded</p>';
        return;
      }
      e.innerHTML = t.map((n, a) => `
      <div class="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
        <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-700 flex-shrink-0">
          ${a + 1}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-medium text-gray-900">${this.escapeHtml(n.checkpoint_key)}</span>
            <span class="text-xs text-gray-500">${this.formatDate(n.created_at)}</span>
          </div>
          <p class="text-xs text-gray-600 font-mono truncate">Cursor: ${this.escapeHtml(n.cursor)}</p>
        </div>
      </div>
    `).join("");
    }
  }
  closeRunDetail() {
    y(this.elements.runDetailModal), this.currentRunId = null;
  }
  async runAction(t) {
    if (!this.currentRunId) return;
    const { actionResumeBtn: e, actionRetryBtn: n, actionCompleteBtn: a, actionFailBtn: c } = this.elements, r = t === "resume" ? e : t === "complete" ? a : c, i = t === "resume" ? n : null;
    if (!r) return;
    r.setAttribute("disabled", "true"), i?.setAttribute("disabled", "true");
    const p = r.innerHTML;
    r.innerHTML = '<svg class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>';
    try {
      const o = `${this.syncRunsEndpoint}/${this.currentRunId}/${t}`, d = await fetch(o, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `${t}-${this.currentRunId}-${Date.now()}`
        },
        body: JSON.stringify(t === "fail" ? { last_error: "Manually marked as failed" } : {})
      });
      if (!d.ok) {
        const v = await d.json();
        throw new Error(v.error?.message || `HTTP ${d.status}`);
      }
      this.showToast(`Sync run ${t} successful`, "success"), this.closeRunDetail(), await this.loadSyncRuns();
    } catch (o) {
      console.error(`${t} error:`, o);
      const d = o instanceof Error ? o.message : "Unknown error";
      this.showToast(`Failed: ${d}`, "error");
    } finally {
      r.removeAttribute("disabled"), i?.removeAttribute("disabled"), r.innerHTML = p;
    }
  }
  async openDiagnostics() {
    if (this.currentRunId)
      try {
        const t = await fetch(`${this.apiBase}/esign/integrations/diagnostics?run_id=${this.currentRunId}`, {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (t.ok) {
          const e = await t.json();
          console.log("Diagnostics:", e), this.showToast("Diagnostics logged to console", "info");
        }
      } catch (t) {
        console.error("Diagnostics error:", t);
      }
  }
  showToast(t, e) {
    const n = window.toastManager;
    n && (e === "success" ? n.success(t) : e === "error" ? n.error(t) : e === "info" && n.info && n.info(t));
  }
};
function E(t) {
  const e = new R(t);
  return k(() => e.init()), e;
}
function L(t) {
  const e = new R({
    basePath: t.basePath,
    apiBasePath: t.apiBasePath || `${t.basePath}/api`
  });
  k(() => e.init()), typeof window < "u" && (window.esignIntegrationSyncRunsController = e);
}
export {
  L as n,
  E as r,
  R as t
};

//# sourceMappingURL=integration-sync-runs-Dch3yTVt.js.map