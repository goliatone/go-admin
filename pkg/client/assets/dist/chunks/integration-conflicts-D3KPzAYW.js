import { escapeHTML as m } from "../shared/html.js";
import { httpRequest as _, readHTTPError as k } from "../shared/transport/http-client.js";
import { onReady as M } from "../shared/dom-ready.js";
import { parseJSONValue as C } from "../shared/json-parse.js";
import { n as w } from "./formatters-oZ3pO-Hk.js";
import { c as u, p as g, u as i } from "./dom-helpers-PJrpTqcW.js";
import { n as P, t as L } from "./page-feedback-jdwaGhAS.js";
var I = class {
  constructor(e) {
    this.conflicts = [], this.currentConflictId = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.conflictsEndpoint = `${this.apiBase}/esign/integrations/conflicts`, this.elements = {
      announcements: i("#conflicts-announcements"),
      loadingState: i("#loading-state"),
      emptyState: i("#empty-state"),
      errorState: i("#error-state"),
      conflictsList: i("#conflicts-list"),
      errorMessage: i("#error-message"),
      refreshBtn: i("#refresh-btn"),
      retryBtn: i("#retry-btn"),
      filterStatus: i("#filter-status"),
      filterProvider: i("#filter-provider"),
      filterEntity: i("#filter-entity"),
      statPending: i("#stat-pending"),
      statResolved: i("#stat-resolved"),
      statIgnored: i("#stat-ignored"),
      conflictDetailModal: i("#conflict-detail-modal"),
      closeDetailBtn: i("#close-detail-btn"),
      detailReason: i("#detail-reason"),
      detailEntityType: i("#detail-entity-type"),
      detailStatusBadge: i("#detail-status-badge"),
      detailProvider: i("#detail-provider"),
      detailExternalId: i("#detail-external-id"),
      detailInternalId: i("#detail-internal-id"),
      detailBindingId: i("#detail-binding-id"),
      detailPayload: i("#detail-payload"),
      resolutionSection: i("#resolution-section"),
      detailResolvedAt: i("#detail-resolved-at"),
      detailResolvedBy: i("#detail-resolved-by"),
      detailResolution: i("#detail-resolution"),
      detailConflictId: i("#detail-conflict-id"),
      detailRunId: i("#detail-run-id"),
      detailCreatedAt: i("#detail-created-at"),
      detailVersion: i("#detail-version"),
      actionButtons: i("#action-buttons"),
      actionResolveBtn: i("#action-resolve-btn"),
      actionIgnoreBtn: i("#action-ignore-btn"),
      resolveModal: i("#resolve-modal"),
      resolveForm: i("#resolve-form"),
      cancelResolveBtn: i("#cancel-resolve-btn"),
      submitResolveBtn: i("#submit-resolve-btn"),
      resolutionAction: i("#resolution-action")
    };
  }
  async init() {
    this.setupEventListeners(), await this.loadConflicts();
  }
  setupEventListeners() {
    const { refreshBtn: e, retryBtn: t, closeDetailBtn: n, filterStatus: o, filterProvider: a, filterEntity: l, actionResolveBtn: r, actionIgnoreBtn: f, cancelResolveBtn: s, resolveForm: d, conflictDetailModal: p, resolveModal: h } = this.elements;
    e?.addEventListener("click", () => this.loadConflicts()), t?.addEventListener("click", () => this.loadConflicts()), n?.addEventListener("click", () => this.closeConflictDetail()), o?.addEventListener("change", () => this.loadConflicts()), a?.addEventListener("change", () => this.renderConflicts()), l?.addEventListener("change", () => this.renderConflicts()), r?.addEventListener("click", () => this.openResolveModal("resolved")), f?.addEventListener("click", () => this.openResolveModal("ignored")), s?.addEventListener("click", () => this.closeResolveModal()), d?.addEventListener("submit", (c) => this.submitResolution(c)), document.addEventListener("keydown", (c) => {
      c.key === "Escape" && (h && !h.classList.contains("hidden") ? this.closeResolveModal() : p && !p.classList.contains("hidden") && this.closeConflictDetail());
    }), [p, h].forEach((c) => {
      c?.addEventListener("click", (y) => {
        const b = y.target;
        (b === c || b.getAttribute("aria-hidden") === "true") && (c === p ? this.closeConflictDetail() : c === h && this.closeResolveModal());
      });
    });
  }
  showState(e) {
    const { loadingState: t, emptyState: n, errorState: o, conflictsList: a } = this.elements;
    switch (u(t), u(n), u(o), u(a), e) {
      case "loading":
        g(t);
        break;
      case "empty":
        g(n);
        break;
      case "error":
        g(o);
        break;
      case "list":
        g(a);
        break;
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
    }, n = t[e] || t.pending;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${n.bg} ${n.text}">
      <span class="w-1.5 h-1.5 rounded-full ${n.dot}" aria-hidden="true"></span>
      ${n.label}
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
      const n = await fetch(`${this.conflictsEndpoint}${t.toString() ? "?" + t : ""}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!n.ok) throw new Error(await k(n, `HTTP ${n.status}`, { appendStatusToFallback: !1 }));
      this.conflicts = (await n.json()).conflicts || [], this.populateProviderFilter(), this.updateStats(), this.renderConflicts(), L(this.elements.announcements, `Loaded ${this.conflicts.length} conflicts`);
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
    e.innerHTML = '<option value="">All Providers</option>' + [...new Set(this.conflicts.map((n) => n.provider).filter(Boolean))].map((n) => `<option value="${m(n)}" ${n === t ? "selected" : ""}>${m(n)}</option>`).join("");
  }
  updateStats() {
    const { statPending: e, statResolved: t, statIgnored: n } = this.elements, o = this.conflicts.filter((r) => r.status === "pending").length, a = this.conflicts.filter((r) => r.status === "resolved").length, l = this.conflicts.filter((r) => r.status === "ignored").length;
    e && (e.textContent = String(o)), t && (t.textContent = String(a)), n && (n.textContent = String(l));
  }
  renderConflicts() {
    const { conflictsList: e, filterStatus: t, filterProvider: n, filterEntity: o } = this.elements;
    if (!e) return;
    const a = t?.value || "", l = n?.value || "", r = o?.value || "", f = this.conflicts.filter((s) => !(a && s.status !== a || l && s.provider !== l || r && s.entity_kind !== r));
    if (f.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = f.map((s) => `
      <div class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow cursor-pointer conflict-card" data-id="${m(s.id)}">
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
                  <span class="font-medium text-gray-900">${m(s.reason || "Data conflict")}</span>
                  ${this.getEntityBadge(s.entity_kind)}
                </div>
                <div class="flex items-center gap-2 text-xs text-gray-500">
                  <span>${m(s.provider)}</span>
                  <span>•</span>
                  <span class="font-mono">${m((s.external_id || "").slice(0, 12))}...</span>
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
    `).join(""), this.showState("list"), e.querySelectorAll(".conflict-card").forEach((s) => {
      s.addEventListener("click", () => this.openConflictDetail(s.dataset.id || ""));
    });
  }
  openConflictDetail(e) {
    this.currentConflictId = e;
    const t = this.conflicts.find((v) => v.id === e);
    if (!t) return;
    const { conflictDetailModal: n, detailReason: o, detailEntityType: a, detailStatusBadge: l, detailProvider: r, detailExternalId: f, detailInternalId: s, detailBindingId: d, detailConflictId: p, detailRunId: h, detailCreatedAt: c, detailVersion: y, detailPayload: b, resolutionSection: S, actionButtons: E, detailResolvedAt: B, detailResolvedBy: R, detailResolution: $ } = this.elements;
    if (o && (o.textContent = t.reason || "Data conflict"), a && (a.textContent = t.entity_kind || "-"), l && (l.innerHTML = this.getStatusBadge(t.status)), r && (r.textContent = t.provider || "-"), f && (f.textContent = t.external_id || "-"), s && (s.textContent = t.internal_id || "-"), d && (d.textContent = t.binding_id || "-"), p && (p.textContent = t.id), h && (h.textContent = t.run_id || "-"), c && (c.textContent = w(t.created_at)), y && (y.textContent = String(t.version || 1)), b) {
      let v = !1;
      const x = C(t.payload_json, t.payload || {}, { onError: () => {
        v = !0;
      } });
      b.textContent = v ? t.payload_json || "{}" : JSON.stringify(x, null, 2);
    }
    if (t.status === "resolved" || t.status === "ignored") {
      if (g(S), u(E), B && (B.textContent = t.resolved_at ? w(t.resolved_at) : ""), R && (R.textContent = t.resolved_by_user_id ? `By user ${t.resolved_by_user_id}` : "-"), $) {
        let v = !1;
        const x = C(t.resolution_json, t.resolution || {}, { onError: () => {
          v = !0;
        } });
        $.textContent = v ? t.resolution_json || "{}" : JSON.stringify(x, null, 2);
      }
    } else
      u(S), g(E);
    g(n);
  }
  closeConflictDetail() {
    u(this.elements.conflictDetailModal), this.currentConflictId = null;
  }
  openResolveModal(e = "resolved") {
    const { resolveModal: t, resolveForm: n, resolutionAction: o } = this.elements;
    n?.reset(), o && (o.value = e), g(t);
  }
  closeResolveModal() {
    u(this.elements.resolveModal);
  }
  async submitResolution(e) {
    if (e.preventDefault(), !this.currentConflictId) return;
    const { resolveForm: t, submitResolveBtn: n } = this.elements;
    if (!t || !n) return;
    const o = new FormData(t);
    let a = {};
    const l = o.get("resolution");
    if (l) {
      let s = !1;
      const d = C(l, null, { onError: () => {
        s = !0;
      } });
      s ? a = { raw: l } : d && typeof d == "object" && !Array.isArray(d) ? a = d : d !== null && (a = { value: d });
    }
    const r = o.get("notes");
    r && (a.notes = r);
    const f = {
      status: o.get("status"),
      resolution: a
    };
    n.setAttribute("disabled", "true"), n.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Submitting...';
    try {
      const s = await _(`${this.conflictsEndpoint}/${this.currentConflictId}/resolve`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": `resolve-${this.currentConflictId}-${Date.now()}`
        },
        body: JSON.stringify(f)
      });
      if (!s.ok) throw new Error(await k(s, `HTTP ${s.status}`, { appendStatusToFallback: !1 }));
      P("Conflict resolved", "success"), L(this.elements.announcements, "Conflict resolved"), this.closeResolveModal(), this.closeConflictDetail(), await this.loadConflicts();
    } catch (s) {
      console.error("Resolution error:", s), P(`Failed: ${s instanceof Error ? s.message : "Unknown error"}`, "error");
    } finally {
      n.removeAttribute("disabled"), n.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Submit Resolution';
    }
  }
};
function J(e) {
  const t = new I(e);
  return M(() => t.init()), t;
}
function N(e) {
  const t = new I({
    basePath: e.basePath,
    apiBasePath: e.apiBasePath || `${e.basePath}/api`
  });
  M(() => t.init()), typeof window < "u" && (window.esignIntegrationConflictsController = t);
}
export {
  N as n,
  J as r,
  I as t
};

//# sourceMappingURL=integration-conflicts-D3KPzAYW.js.map