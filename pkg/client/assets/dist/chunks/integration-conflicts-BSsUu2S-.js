import { c as B, f as u, l as n, o as h, t as L } from "./dom-helpers-CDdChTSn.js";
var E = class {
  constructor(e) {
    this.conflicts = [], this.currentConflictId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.conflictsEndpoint = `${this.apiBase}/esign/integrations/conflicts`, this.elements = {
      announcements: n("#conflicts-announcements"),
      loadingState: n("#loading-state"),
      emptyState: n("#empty-state"),
      errorState: n("#error-state"),
      conflictsList: n("#conflicts-list"),
      errorMessage: n("#error-message"),
      refreshBtn: n("#refresh-btn"),
      retryBtn: n("#retry-btn"),
      filterStatus: n("#filter-status"),
      filterProvider: n("#filter-provider"),
      filterEntity: n("#filter-entity"),
      statPending: n("#stat-pending"),
      statResolved: n("#stat-resolved"),
      statIgnored: n("#stat-ignored"),
      conflictDetailModal: n("#conflict-detail-modal"),
      closeDetailBtn: n("#close-detail-btn"),
      detailReason: n("#detail-reason"),
      detailEntityType: n("#detail-entity-type"),
      detailStatusBadge: n("#detail-status-badge"),
      detailProvider: n("#detail-provider"),
      detailExternalId: n("#detail-external-id"),
      detailInternalId: n("#detail-internal-id"),
      detailBindingId: n("#detail-binding-id"),
      detailPayload: n("#detail-payload"),
      resolutionSection: n("#resolution-section"),
      detailResolvedAt: n("#detail-resolved-at"),
      detailResolvedBy: n("#detail-resolved-by"),
      detailResolution: n("#detail-resolution"),
      detailConflictId: n("#detail-conflict-id"),
      detailRunId: n("#detail-run-id"),
      detailCreatedAt: n("#detail-created-at"),
      detailVersion: n("#detail-version"),
      actionButtons: n("#action-buttons"),
      actionResolveBtn: n("#action-resolve-btn"),
      actionIgnoreBtn: n("#action-ignore-btn"),
      resolveModal: n("#resolve-modal"),
      resolveForm: n("#resolve-form"),
      cancelResolveBtn: n("#cancel-resolve-btn"),
      submitResolveBtn: n("#submit-resolve-btn"),
      resolutionAction: n("#resolution-action")
    };
  }
  async init() {
    this.setupEventListeners(), await this.loadConflicts();
  }
  setupEventListeners() {
    const { refreshBtn: e, retryBtn: t, closeDetailBtn: i, filterStatus: o, filterProvider: a, filterEntity: l, actionResolveBtn: r, actionIgnoreBtn: c, cancelResolveBtn: s, resolveForm: f, conflictDetailModal: g, resolveModal: v } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), i?.addEventListener("click", () => this.closeConflictDetail()), o?.addEventListener("change", () => this.loadConflicts()), a?.addEventListener("change", () => this.renderConflicts()), l?.addEventListener("change", () => this.renderConflicts()), r?.addEventListener("click", () => this.openResolveModal("resolved")), c?.addEventListener("click", () => this.openResolveModal("ignored")), s?.addEventListener("click", () => this.closeResolveModal()), f?.addEventListener("submit", (d) => this.submitResolution(d)), document.addEventListener("keydown", (d) => {
      d.key === "Escape" && (v && !v.classList.contains("hidden") ? this.closeResolveModal() : g && !g.classList.contains("hidden") && this.closeConflictDetail());
    }), [g, v].forEach((d) => {
      d?.addEventListener("click", (b) => {
        const p = b.target;
        (p === d || p.getAttribute("aria-hidden") === "true") && (d === g ? this.closeConflictDetail() : d === v && this.closeResolveModal());
      });
    });
  }
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), L(e);
  }
  showState(e) {
    const { loadingState: t, emptyState: i, errorState: o, conflictsList: a } = this.elements;
    switch (h(t), h(i), h(o), h(a), e) {
      case "loading":
        u(t);
        break;
      case "empty":
        u(i);
        break;
      case "error":
        u(o);
        break;
      case "list":
        u(a);
        break;
    }
  }
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e || "", t.innerHTML;
  }
  formatDate(e) {
    if (!e) return "-";
    try {
      const t = new Date(e);
      return t.toLocaleDateString() + " " + t.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return e;
    }
  }
  getStatusBadge(e) {
    const t = {
      pending: {
        label: "Pending",
        bg: "bg-amber-100",
        text: "text-amber-700",
        dot: "bg-amber-500"
      },
      resolved: {
        label: "Resolved",
        bg: "bg-green-100",
        text: "text-green-700",
        dot: "bg-green-500"
      },
      ignored: {
        label: "Ignored",
        bg: "bg-gray-100",
        text: "text-gray-700",
        dot: "bg-gray-400"
      }
    }, i = t[e] || t.pending;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${i.bg} ${i.text}">
      <span class="w-1.5 h-1.5 rounded-full ${i.dot}" aria-hidden="true"></span>
      ${i.label}
    </span>`;
  }
  getEntityBadge(e) {
    const t = {
      participant: {
        label: "Participant",
        bg: "bg-blue-100",
        text: "text-blue-700"
      },
      agreement: {
        label: "Agreement",
        bg: "bg-purple-100",
        text: "text-purple-700"
      },
      field_definition: {
        label: "Field Definition",
        bg: "bg-teal-100",
        text: "text-teal-700"
      }
    }[e] || {
      label: e,
      bg: "bg-gray-100",
      text: "text-gray-700"
    };
    return `<span class="px-2 py-0.5 rounded text-xs font-medium ${t.bg} ${t.text}">${t.label}</span>`;
  }
  async loadConflicts() {
    this.showState("loading");
    try {
      const { filterStatus: e } = this.elements, t = new URLSearchParams();
      e?.value && t.set("status", e.value);
      const i = await fetch(`${this.conflictsEndpoint}${t.toString() ? "?" + t : ""}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!i.ok) throw new Error(`HTTP ${i.status}`);
      this.conflicts = (await i.json()).conflicts || [], this.populateProviderFilter(), this.updateStats(), this.renderConflicts(), this.announce(`Loaded ${this.conflicts.length} conflicts`);
    } catch (e) {
      console.error("Error loading conflicts:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred"), this.showState("error");
    }
  }
  populateProviderFilter() {
    const { filterProvider: e } = this.elements;
    if (!e) return;
    const t = e.value;
    e.innerHTML = '<option value="">All Providers</option>' + [...new Set(this.conflicts.map((i) => i.provider).filter(Boolean))].map((i) => `<option value="${this.escapeHtml(i)}" ${i === t ? "selected" : ""}>${this.escapeHtml(i)}</option>`).join("");
  }
  updateStats() {
    const { statPending: e, statResolved: t, statIgnored: i } = this.elements, o = this.conflicts.filter((r) => r.status === "pending").length, a = this.conflicts.filter((r) => r.status === "resolved").length, l = this.conflicts.filter((r) => r.status === "ignored").length;
    e && (e.textContent = String(o)), t && (t.textContent = String(a)), i && (i.textContent = String(l));
  }
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: i, filterEntity: o } = this.elements;
    if (!e) return;
    const a = t?.value || "", l = i?.value || "", r = o?.value || "", c = this.conflicts.filter((s) => !(a && s.status !== a || l && s.provider !== l || r && s.entity_kind !== r));
    if (c.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = c.map((s) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${this.escapeHtml(s.id)}">
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg ${s.status === "pending" ? "bg-amber-100" : s.status === "resolved" ? "bg-green-100" : "bg-gray-100"} flex items-center justify-center">
                <svg class="w-5 h-5 ${s.status === "pending" ? "text-amber-600" : s.status === "resolved" ? "text-green-600" : "text-gray-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>
              </div>
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-medium text-gray-900">${this.escapeHtml(s.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(s.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${this.escapeHtml(s.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${this.escapeHtml((s.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(s.status)}
              <p class="text-xs text-gray-500 mt-1">${this.formatDate(s.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((s) => {
      s.addEventListener("click", () => this.openConflictDetail(s.dataset.id || ""));
    });
  }
  openConflictDetail(e) {
    this.currentConflictId = e;
    const t = this.conflicts.find((m) => m.id === e);
    if (!t) return;
    const { conflictDetailModal: i, detailReason: o, detailEntityType: a, detailStatusBadge: l, detailProvider: r, detailExternalId: c, detailInternalId: s, detailBindingId: f, detailConflictId: g, detailRunId: v, detailCreatedAt: d, detailVersion: b, detailPayload: p, resolutionSection: x, actionButtons: C, detailResolvedAt: w, detailResolvedBy: S, detailResolution: y } = this.elements;
    if (o && (o.textContent = t.reason || "Data conflict"), a && (a.textContent = t.entity_kind || "-"), l && (l.innerHTML = this.getStatusBadge(t.status)), r && (r.textContent = t.provider || "-"), c && (c.textContent = t.external_id || "-"), s && (s.textContent = t.internal_id || "-"), f && (f.textContent = t.binding_id || "-"), g && (g.textContent = t.id), v && (v.textContent = t.run_id || "-"), d && (d.textContent = this.formatDate(t.created_at)), b && (b.textContent = String(t.version || 1)), p) try {
      const m = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
      p.textContent = JSON.stringify(m, null, 2);
    } catch {
      p.textContent = t.payload_json || "{}";
    }
    if (t.status === "resolved" || t.status === "ignored") {
      if (u(x), h(C), w && (w.textContent = t.resolved_at ? this.formatDate(t.resolved_at) : ""), S && (S.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), y) try {
        const m = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
        y.textContent = JSON.stringify(m, null, 2);
      } catch {
        y.textContent = t.resolution_json || "{}";
      }
    } else
      h(x), u(C);
    u(i);
  }
  closeConflictDetail() {
    h(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: i, resolutionAction: o } = this.elements;
    i?.reset(), o && (o.value = e), u(t);
  }
  closeResolveModal() {
    h(this.elements.resolveModal);
  }
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: i } = this.elements;
    if (!t || !i) return;
    const o = new FormData(t);
    let a = {};
    const l = o.get("resolution");
    if (l) try {
      a = JSON.parse(l);
    } catch {
      a = { raw: l };
    }
    const r = o.get("notes");
    r && (a.notes = r);
    const c = {
      status: o.get("status"),
      resolution: a
    };
    i.setAttribute("disabled", "true"), i.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const s = await fetch(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(c)
      });
      if (!s.ok) {
        const f = await s.json();
        throw new Error(f.error?.message || `HTTP ${s.status}`);
      }
      this.showToast("Conflict resolved", "success"), this.announce("Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (s) {
      console.error("Resolution error:", s);
      const f = s instanceof Error ? s.message : "Unknown error";
      this.showToast(`Failed: ${f}`, "error");
    } finally {
      i.removeAttribute("disabled"), i.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Submit Resolution';
    }
  }
  showToast(e, t) {
    const i = window.toastManager;
    i && (t === "success" ? i.success(e) : i.error(e));
  }
};
function $(e) {
  const t = new E(e);
  return B(() => t.init()), t;
}
function k(e) {
  const t = new E({
    basePath: e.basePath,
    apiBasePath: e.apiBasePath || `${e.basePath}/api`
  });
  B(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
export {
  k as n,
  $ as r,
  E as t
};

//# sourceMappingURL=integration-conflicts-BSsUu2S-.js.map