import { b as n, h as u, s as g } from "../chunks/dom-helpers-cltCUiC5.js";
import { m as w } from "../chunks/formatters-CxrdwABk.js";
import { a as $, s as L } from "../chunks/page-feedback-CVdtgsKH.js";
import { escapeHTML as b } from "../shared/html.js";
import { onReady as k } from "../shared/dom-ready.js";
class P {
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
  /**
   * Initialize the conflicts page
   */
  async init() {
    this.setupEventListeners(), await this.loadConflicts();
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const {
      refreshBtn: e,
      retryBtn: t,
      closeDetailBtn: i,
      filterStatus: o,
      filterProvider: a,
      filterEntity: l,
      actionResolveBtn: r,
      actionIgnoreBtn: c,
      cancelResolveBtn: s,
      resolveForm: f,
      conflictDetailModal: h,
      resolveModal: p
    } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), i?.addEventListener("click", () => this.closeConflictDetail()), o?.addEventListener("change", () => this.loadConflicts()), a?.addEventListener("change", () => this.renderConflicts()), l?.addEventListener("change", () => this.renderConflicts()), r?.addEventListener("click", () => this.openResolveModal("resolved")), c?.addEventListener("click", () => this.openResolveModal("ignored")), s?.addEventListener("click", () => this.closeResolveModal()), f?.addEventListener("submit", (d) => this.submitResolution(d)), document.addEventListener("keydown", (d) => {
      d.key === "Escape" && (p && !p.classList.contains("hidden") ? this.closeResolveModal() : h && !h.classList.contains("hidden") && this.closeConflictDetail());
    }), [h, p].forEach((d) => {
      d?.addEventListener("click", (x) => {
        const m = x.target;
        (m === d || m.getAttribute("aria-hidden") === "true") && (d === h ? this.closeConflictDetail() : d === p && this.closeResolveModal());
      });
    });
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: i, errorState: o, conflictsList: a } = this.elements;
    switch (u(t), u(i), u(o), u(a), e) {
      case "loading":
        g(t);
        break;
      case "empty":
        g(i);
        break;
      case "error":
        g(o);
        break;
      case "list":
        g(a);
        break;
    }
  }
  /**
   * Get status badge HTML
   */
  getStatusBadge(e) {
    const t = {
      pending: { label: "Pending", bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" },
      resolved: { label: "Resolved", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
      ignored: { label: "Ignored", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" }
    }, i = t[e] || t.pending;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${i.bg} ${i.text}">
      <span class="w-1.5 h-1.5 rounded-full ${i.dot}" aria-hidden="true"></span>
      ${i.label}
    </span>`;
  }
  /**
   * Get entity badge HTML
   */
  getEntityBadge(e) {
    const i = {
      participant: { label: "Participant", bg: "bg-blue-100", text: "text-blue-700" },
      agreement: { label: "Agreement", bg: "bg-purple-100", text: "text-purple-700" },
      field_definition: { label: "Field Definition", bg: "bg-teal-100", text: "text-teal-700" }
    }[e] || { label: e, bg: "bg-gray-100", text: "text-gray-700" };
    return `<span class="px-2 py-0.5 rounded text-xs font-medium ${i.bg} ${i.text}">${i.label}</span>`;
  }
  /**
   * Load conflicts from API
   */
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
      const o = await i.json();
      this.conflicts = o.conflicts || [], this.populateProviderFilter(), this.updateStats(), this.renderConflicts(), $(
        this.elements.announcements,
        `Loaded ${this.conflicts.length} conflicts`
      );
    } catch (e) {
      console.error("Error loading conflicts:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred"), this.showState("error");
    }
  }
  /**
   * Populate provider filter dropdown
   */
  populateProviderFilter() {
    const { filterProvider: e } = this.elements;
    if (!e) return;
    const t = e.value, i = [...new Set(this.conflicts.map((o) => o.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + i.map(
      (o) => `<option value="${b(o)}" ${o === t ? "selected" : ""}>${b(o)}</option>`
    ).join("");
  }
  /**
   * Update stats display
   */
  updateStats() {
    const { statPending: e, statResolved: t, statIgnored: i } = this.elements, o = this.conflicts.filter((r) => r.status === "pending").length, a = this.conflicts.filter((r) => r.status === "resolved").length, l = this.conflicts.filter((r) => r.status === "ignored").length;
    e && (e.textContent = String(o)), t && (t.textContent = String(a)), i && (i.textContent = String(l));
  }
  /**
   * Render conflicts list with filters applied
   */
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: i, filterEntity: o } = this.elements;
    if (!e) return;
    const a = t?.value || "", l = i?.value || "", r = o?.value || "", c = this.conflicts.filter((s) => !(a && s.status !== a || l && s.provider !== l || r && s.entity_kind !== r));
    if (c.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = c.map(
      (s) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${b(s.id)}">
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
                  <span class="font-medium text-gray-900">${b(s.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(s.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${b(s.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${b((s.external_id || "").slice(0, 12))}...</span>
                </div>
              </div>
            </div>
            <div class="text-right">
              ${this.getStatusBadge(s.status)}
              <p class="text-xs text-gray-500 mt-1">${w(s.created_at)}</p>
            </div>
          </div>
        </div>
      </div>
    `
    ).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((s) => {
      s.addEventListener("click", () => this.openConflictDetail(s.dataset.id || ""));
    });
  }
  /**
   * Open conflict detail modal
   */
  openConflictDetail(e) {
    this.currentConflictId = e;
    const t = this.conflicts.find((y) => y.id === e);
    if (!t) return;
    const {
      conflictDetailModal: i,
      detailReason: o,
      detailEntityType: a,
      detailStatusBadge: l,
      detailProvider: r,
      detailExternalId: c,
      detailInternalId: s,
      detailBindingId: f,
      detailConflictId: h,
      detailRunId: p,
      detailCreatedAt: d,
      detailVersion: x,
      detailPayload: m,
      resolutionSection: S,
      actionButtons: B,
      detailResolvedAt: E,
      detailResolvedBy: R,
      detailResolution: C
    } = this.elements;
    if (o && (o.textContent = t.reason || "Data conflict"), a && (a.textContent = t.entity_kind || "-"), l && (l.innerHTML = this.getStatusBadge(t.status)), r && (r.textContent = t.provider || "-"), c && (c.textContent = t.external_id || "-"), s && (s.textContent = t.internal_id || "-"), f && (f.textContent = t.binding_id || "-"), h && (h.textContent = t.id), p && (p.textContent = t.run_id || "-"), d && (d.textContent = w(t.created_at)), x && (x.textContent = String(t.version || 1)), m)
      try {
        const y = t.payload_json ? JSON.parse(t.payload_json) : t.payload || {};
        m.textContent = JSON.stringify(y, null, 2);
      } catch {
        m.textContent = t.payload_json || "{}";
      }
    if (t.status === "resolved" || t.status === "ignored") {
      if (g(S), u(B), E && (E.textContent = t.resolved_at ? w(t.resolved_at) : ""), R && (R.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), C)
        try {
          const y = t.resolution_json ? JSON.parse(t.resolution_json) : t.resolution || {};
          C.textContent = JSON.stringify(y, null, 2);
        } catch {
          C.textContent = t.resolution_json || "{}";
        }
    } else
      u(S), g(B);
    g(i);
  }
  /**
   * Close conflict detail modal
   */
  closeConflictDetail() {
    u(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  /**
   * Open resolve modal
   */
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: i, resolutionAction: o } = this.elements;
    i?.reset(), o && (o.value = e), g(t);
  }
  /**
   * Close resolve modal
   */
  closeResolveModal() {
    u(this.elements.resolveModal);
  }
  /**
   * Submit resolution
   */
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: i } = this.elements;
    if (!t || !i) return;
    const o = new FormData(t);
    let a = {};
    const l = o.get("resolution");
    if (l)
      try {
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
      L("Conflict resolved", "success"), $(this.elements.announcements, "Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (s) {
      console.error("Resolution error:", s);
      const f = s instanceof Error ? s.message : "Unknown error";
      L(`Failed: ${f}`, "error");
    } finally {
      i.removeAttribute("disabled"), i.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Submit Resolution';
    }
  }
}
function T(v) {
  const e = new P(v);
  return k(() => e.init()), e;
}
function A(v) {
  const e = {
    basePath: v.basePath,
    apiBasePath: v.apiBasePath || `${v.basePath}/api`
  }, t = new P(e);
  k(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
export {
  P as IntegrationConflictsController,
  A as bootstrapIntegrationConflicts,
  T as initIntegrationConflicts
};
//# sourceMappingURL=integration-conflicts.js.map
