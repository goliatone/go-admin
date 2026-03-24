import { n as E } from "./html-Cx1oHGAm.js";
import { c as ht } from "./dom-helpers-CDdChTSn.js";
import { n as jr, t as Hr } from "./runtime-Bu3OM-Zn.js";
var Or = "esign.signer.profile.v1", rn = "esign.signer.profile.outbox.v1", pt = 90, an = 500 * 1024, Yr = class {
  constructor(o) {
    this.ttlMs = (Number.isFinite(o) && o > 0 ? o : pt) * 24 * 60 * 60 * 1e3;
  }
  storageKey(o) {
    return `${Or}:${o}`;
  }
  async load(o) {
    try {
      const l = window.localStorage.getItem(this.storageKey(o));
      if (!l) return null;
      const f = JSON.parse(l);
      return !f || f.schemaVersion !== 1 ? (window.localStorage.removeItem(this.storageKey(o)), null) : typeof f.expiresAt == "number" && Date.now() > f.expiresAt ? (window.localStorage.removeItem(this.storageKey(o)), null) : f;
    } catch {
      return null;
    }
  }
  async save(o, l) {
    const f = Date.now(), u = {
      ...await this.load(o) || {
        schemaVersion: 1,
        key: o,
        fullName: "",
        initials: "",
        typedSignature: "",
        drawnSignatureDataUrl: "",
        drawnInitialsDataUrl: "",
        remember: !0,
        updatedAt: f,
        expiresAt: f + this.ttlMs
      },
      ...l,
      schemaVersion: 1,
      key: o,
      updatedAt: f,
      expiresAt: f + this.ttlMs
    };
    try {
      window.localStorage.setItem(this.storageKey(o), JSON.stringify(u));
    } catch {
    }
    return u;
  }
  async clear(o) {
    try {
      window.localStorage.removeItem(this.storageKey(o));
    } catch {
    }
  }
}, Wr = class {
  constructor(o, l) {
    this.endpointBasePath = o.replace(/\/$/, ""), this.token = l;
  }
  endpoint(o) {
    const l = encodeURIComponent(this.token), f = encodeURIComponent(ii(o));
    return `${this.endpointBasePath}/profile/${l}?key=${f}`;
  }
  async load(o) {
    const l = await fetch(this.endpoint(o), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!l.ok) return null;
    const f = await l.json();
    return !f || typeof f != "object" ? null : f.profile || null;
  }
  async save(o, l) {
    const f = await fetch(this.endpoint(o), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      credentials: "same-origin",
      body: JSON.stringify({ patch: l })
    });
    if (!f.ok) throw new Error("remote profile sync failed");
    return (await f.json()).profile;
  }
  async clear(o) {
    const l = await fetch(this.endpoint(o), {
      method: "DELETE",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!l.ok && l.status !== 404) throw new Error("remote profile clear failed");
  }
}, Ue = class {
  constructor(o, l, f) {
    this.mode = o, this.localStore = l, this.remoteStore = f;
  }
  outboxLoad() {
    try {
      const o = window.localStorage.getItem(rn);
      if (!o) return {};
      const l = JSON.parse(o);
      if (!l || typeof l != "object") return {};
      const f = {};
      for (const [u, L] of Object.entries(l)) {
        if (!L || typeof L != "object") continue;
        const P = L;
        if (P.op === "clear") {
          f[u] = {
            op: "clear",
            updatedAt: Number(P.updatedAt) || Date.now()
          };
          continue;
        }
        const b = P.op === "patch" ? P.patch : P;
        f[u] = {
          op: "patch",
          patch: b && typeof b == "object" ? b : {},
          updatedAt: Number(P.updatedAt) || Date.now()
        };
      }
      return f;
    } catch {
      return {};
    }
  }
  outboxSave(o) {
    try {
      window.localStorage.setItem(rn, JSON.stringify(o));
    } catch {
    }
  }
  queuePatch(o, l) {
    const f = this.outboxLoad(), u = f[o];
    f[o] = {
      op: "patch",
      patch: {
        ...u?.op === "patch" ? u.patch || {} : {},
        ...l,
        updatedAt: Date.now()
      },
      updatedAt: Date.now()
    }, this.outboxSave(f);
  }
  queueClear(o) {
    const l = this.outboxLoad();
    l[o] = {
      op: "clear",
      updatedAt: Date.now()
    }, this.outboxSave(l);
  }
  getOutboxEntry(o) {
    return this.outboxLoad()[o] || null;
  }
  removeOutboxEntry(o) {
    const l = this.outboxLoad();
    l[o] && (delete l[o], this.outboxSave(l));
  }
  async flushOutboxForKey(o) {
    if (!this.remoteStore) return;
    const l = this.outboxLoad(), f = l[o];
    if (f)
      try {
        f.op === "clear" ? await this.remoteStore.clear(o) : await this.remoteStore.save(o, f.patch || {}), delete l[o], this.outboxSave(l);
      } catch {
      }
  }
  pickLatest(o, l) {
    return o && l ? (l.updatedAt || 0) >= (o.updatedAt || 0) ? l : o : l || o;
  }
  async load(o) {
    if (this.mode === "remote_only")
      return !this.remoteStore || this.getOutboxEntry(o) && (await this.flushOutboxForKey(o), this.getOutboxEntry(o)?.op === "clear") ? null : this.remoteStore.load(o);
    if (this.mode === "hybrid" && this.remoteStore) {
      if (this.getOutboxEntry(o)?.op === "clear")
        return await this.flushOutboxForKey(o), this.localStore.load(o);
      const [l, f] = await Promise.all([this.localStore.load(o), this.remoteStore.load(o).catch(() => null)]), u = this.pickLatest(l, f);
      return u && await this.localStore.save(o, u), await this.flushOutboxForKey(o), u;
    }
    return this.localStore.load(o);
  }
  async save(o, l) {
    if (this.mode === "remote_only") {
      if (!this.remoteStore) throw new Error("remote profile store not configured");
      const u = await this.remoteStore.save(o, l);
      return this.removeOutboxEntry(o), u;
    }
    const f = await this.localStore.save(o, l);
    if (this.mode === "hybrid" && this.remoteStore) try {
      const u = await this.remoteStore.save(o, l);
      return await this.localStore.save(o, u), this.removeOutboxEntry(o), u;
    } catch {
      this.queuePatch(o, l);
    }
    return f;
  }
  async clear(o) {
    if (await this.localStore.clear(o), this.remoteStore) try {
      await this.remoteStore.clear(o);
    } catch {
      throw this.queueClear(o), new Error("remote profile clear failed");
    }
    this.removeOutboxEntry(o);
  }
};
function Kr(o) {
  const l = o.profile?.mode || "local_only", f = String(o.uiMode || "").trim().toLowerCase(), u = String(o.defaultTab || "").trim().toLowerCase(), L = String(o.viewerMode || "").trim().toLowerCase(), P = String(o.viewerBanner || "").trim().toLowerCase();
  return {
    token: String(o.token || "").trim(),
    apiBasePath: String(o.apiBasePath || "/api/v1/esign/signing").trim(),
    signerBasePath: String(o.signerBasePath || "/sign").trim(),
    resourceBasePath: String(o.resourceBasePath || "").trim(),
    reviewApiPath: String(o.reviewApiPath || "").trim(),
    assetContractPath: String(o.assetContractPath || "").trim(),
    telemetryPath: String(o.telemetryPath || "").trim(),
    agreementId: String(o.agreementId || "").trim(),
    sessionKind: String(o.sessionKind || "signer").trim() || "signer",
    uiMode: f || "sign",
    defaultTab: u || "sign",
    viewerMode: L,
    viewerBanner: P,
    recipientId: String(o.recipientId || "").trim(),
    recipientEmail: String(o.recipientEmail || "").trim(),
    recipientName: String(o.recipientName || "").trim(),
    pageCount: Number(o.pageCount || 1) || 1,
    hasConsented: !!o.hasConsented,
    canSign: o.canSign !== !1,
    reviewMarkersVisible: o.reviewMarkersVisible !== !1,
    reviewMarkersInteractive: o.reviewMarkersInteractive !== !1,
    fields: Array.isArray(o.fields) ? o.fields : [],
    review: ft(o.review),
    flowMode: o.flowMode || "unified",
    telemetryEnabled: o.telemetryEnabled !== !1,
    viewer: {
      coordinateSpace: o.viewer?.coordinateSpace || "pdf",
      contractVersion: String(o.viewer?.contractVersion || "1.0"),
      unit: o.viewer?.unit || "pt",
      origin: o.viewer?.origin || "top-left",
      yAxisDirection: o.viewer?.yAxisDirection || "down",
      pages: Array.isArray(o.viewer?.pages) ? o.viewer?.pages : [],
      compatibilityTier: String(o.viewer?.compatibilityTier || "").trim().toLowerCase(),
      compatibilityReason: String(o.viewer?.compatibilityReason || "").trim().toLowerCase(),
      compatibilityMessage: String(o.viewer?.compatibilityMessage || "").trim()
    },
    signerState: o.signerState || "active",
    recipientStage: Number(o.recipientStage || 1) || 1,
    activeStage: Number(o.activeStage || 1) || 1,
    activeRecipientIds: Array.isArray(o.activeRecipientIds) ? o.activeRecipientIds : [],
    waitingForRecipientIds: Array.isArray(o.waitingForRecipientIds) ? o.waitingForRecipientIds : [],
    profile: {
      mode: l,
      rememberByDefault: o.profile?.rememberByDefault !== !1,
      ttlDays: Number(o.profile?.ttlDays || pt) || pt,
      persistDrawnSignature: !!o.profile?.persistDrawnSignature,
      endpointBasePath: String(o.profile?.endpointBasePath || String(o.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function Xr(o) {
  return !o || typeof o != "object" ? null : {
    id: String(o.id || "").trim(),
    participant_type: String(o.participant_type || "").trim(),
    recipient_id: String(o.recipient_id || "").trim(),
    email: String(o.email || "").trim(),
    display_name: String(o.display_name || "").trim(),
    decision_status: String(o.decision_status || "").trim(),
    effective_decision_status: String(o.effective_decision_status || o.decision_status || "").trim(),
    approved_on_behalf: !!o.approved_on_behalf,
    approved_on_behalf_reason: String(o.approved_on_behalf_reason || "").trim(),
    approved_on_behalf_by_user_id: String(o.approved_on_behalf_by_user_id || "").trim(),
    approved_on_behalf_by_display_name: String(o.approved_on_behalf_by_display_name || "").trim(),
    approved_on_behalf_at: String(o.approved_on_behalf_at || "").trim()
  };
}
function Jr(o, l) {
  if (!l || typeof l != "object") return null;
  const f = String(o || "").trim(), u = f.includes(":") ? f.split(":", 1)[0] : "", L = f.includes(":") ? f.slice(f.indexOf(":") + 1) : "";
  return {
    name: String(l.name || "").trim(),
    email: String(l.email || "").trim(),
    role: String(l.role || "").trim(),
    actor_type: String(l.actor_type || u).trim(),
    actor_id: String(l.actor_id || L).trim()
  };
}
function Gr(o) {
  if (!o || typeof o != "object") return {};
  const l = {};
  return Object.entries(o).forEach(([f, u]) => {
    const L = String(f || "").trim();
    if (!L) return;
    const P = Jr(L, u);
    P && (l[L] = P);
  }), l;
}
function on(o, ...l) {
  if (!(!o || typeof o != "object")) {
    for (const f of l) if (Object.prototype.hasOwnProperty.call(o, f) && o[f] != null) return o[f];
  }
}
function k(o, ...l) {
  const f = on(o, ...l);
  return f == null ? "" : String(f).trim();
}
function gt(o, ...l) {
  const f = on(o, ...l);
  return f == null || f === "" ? 0 : Number(f) || 0;
}
function Qr(o) {
  if (!o || typeof o != "object") return null;
  const l = o.thread && typeof o.thread == "object" ? o.thread : {}, f = Array.isArray(o.messages) ? o.messages : [];
  return {
    thread: {
      id: k(l, "id", "ID"),
      review_id: k(l, "review_id", "reviewId", "ReviewID"),
      agreement_id: k(l, "agreement_id", "agreementId", "AgreementID"),
      visibility: k(l, "visibility", "Visibility") || "shared",
      anchor_type: k(l, "anchor_type", "anchorType", "AnchorType") || "agreement",
      page_number: gt(l, "page_number", "pageNumber", "PageNumber"),
      field_id: k(l, "field_id", "fieldId", "FieldID"),
      anchor_x: gt(l, "anchor_x", "anchorX", "AnchorX"),
      anchor_y: gt(l, "anchor_y", "anchorY", "AnchorY"),
      status: k(l, "status", "Status") || "open",
      created_by_type: k(l, "created_by_type", "createdByType", "CreatedByType"),
      created_by_id: k(l, "created_by_id", "createdByID", "CreatedByID"),
      resolved_by_type: k(l, "resolved_by_type", "resolvedByType", "ResolvedByType"),
      resolved_by_id: k(l, "resolved_by_id", "resolvedByID", "ResolvedByID"),
      resolved_at: k(l, "resolved_at", "resolvedAt", "ResolvedAt"),
      last_activity_at: k(l, "last_activity_at", "lastActivityAt", "LastActivityAt")
    },
    messages: f.filter((u) => u && typeof u == "object").map((u) => ({
      id: k(u, "id", "ID"),
      thread_id: k(u, "thread_id", "threadId", "ThreadID"),
      body: k(u, "body", "Body"),
      created_by_type: k(u, "created_by_type", "createdByType", "CreatedByType"),
      created_by_id: k(u, "created_by_id", "createdByID", "CreatedByID"),
      created_at: k(u, "created_at", "createdAt", "CreatedAt")
    }))
  };
}
function ft(o) {
  if (!o || typeof o != "object") return null;
  const l = Array.isArray(o.threads) ? o.threads.map(Qr).filter(Boolean) : [], f = Gr(o.actor_map || o.actorMap), u = Array.isArray(o.blockers) ? o.blockers.map((L) => String(L || "").trim()).filter(Boolean) : [];
  return {
    review_id: String(o.review_id || "").trim(),
    status: String(o.status || "").trim(),
    gate: String(o.gate || "").trim(),
    comments_enabled: !!o.comments_enabled,
    override_active: !!o.override_active,
    override_reason: String(o.override_reason || "").trim(),
    override_by_user_id: String(o.override_by_user_id || "").trim(),
    override_by_display_name: String(o.override_by_display_name || "").trim(),
    override_at: String(o.override_at || "").trim(),
    is_reviewer: !!o.is_reviewer,
    can_comment: !!o.can_comment,
    can_approve: !!o.can_approve,
    can_request_changes: !!o.can_request_changes,
    can_sign: o.can_sign !== !1,
    participant_status: String(o.participant_status || "").trim(),
    approved_count: Number(o.approved_count || 0) || 0,
    total_approvers: Number(o.total_approvers || 0) || 0,
    sign_blocked: !!o.sign_blocked,
    sign_block_reason: String(o.sign_block_reason || "").trim(),
    blockers: u,
    participant: Xr(o.participant),
    actor_map: f,
    open_thread_count: Number(o.open_thread_count || 0) || 0,
    resolved_thread_count: Number(o.resolved_thread_count || 0) || 0,
    threads: l
  };
}
function mt(o) {
  switch (String(o?.thread?.anchor_type || "").trim()) {
    case "field":
      return o?.thread?.field_id ? `Field ${o.thread.field_id}` : "Field";
    case "page":
      return o?.thread?.page_number ? `Page ${o.thread.page_number}` : "Page";
    default:
      return "Global Comment";
  }
}
function Zr(o) {
  const l = String(o?.thread?.anchor_type || "").trim();
  return l === "page" || l === "field";
}
function he(o) {
  const l = be(o);
  switch (l) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "changes_requested":
      return "Changes Requested";
    case "in_review":
      return "In Review";
    case "closed":
      return "Closed";
    default:
      return l ? l.replace(/_/g, " ") : "Inactive";
  }
}
function be(o) {
  return String(o || "").trim().toLowerCase();
}
function ve(o) {
  return be(o?.participant_status || o?.participant?.effective_decision_status || o?.participant?.decision_status);
}
function ei(o) {
  const l = ve(o);
  return l === "approved" || l === "changes_requested";
}
function ti(o) {
  return !o || o.override_active || !o.can_approve && !o.can_request_changes ? !1 : !ei(o);
}
function ni(o) {
  if (!o || typeof o != "object") return "Track review status, comments, and decision actions.";
  const l = be(o.status), f = ve(o), u = Number(o.approved_count || 0) || 0, L = Number(o.total_approvers || 0) || 0;
  if (o.override_active) {
    const P = String(o.override_reason || "").trim(), b = String(o.override_by_display_name || "").trim(), a = b && !looksLikeUUID(b) ? b : "";
    return P ? `Review was finalized by admin override${a ? ` by ${a}` : ""}. Reason: ${P}` : `Review was finalized by admin override${a ? ` by ${a}` : ""}.`;
  }
  if (o?.participant?.approved_on_behalf) {
    const P = String(o.participant.approved_on_behalf_by_display_name || "").trim(), b = P && !looksLikeUUID(P) ? P : "";
    return b ? `Your review decision was recorded on your behalf by ${b}.` : "Your review decision was recorded on your behalf by an admin.";
  }
  return f === "approved" && l === "in_review" ? L > 0 ? `Your approval is recorded. ${u} of ${L} approvers have approved so far.` : "Your approval is recorded. Waiting for the remaining reviewers before this document can proceed." : f === "approved" && l === "approved" ? L > 0 ? `All approvers approved (${u} of ${L}). Review is complete.` : "All reviewers approved. Review is complete." : f === "changes_requested" ? "Your change request is recorded. The sender must resolve it before this document can proceed." : l === "in_review" && L > 0 ? `${u} of ${L} approvers have approved so far.` : o.gate ? `Gate: ${String(o.gate || "").replace(/_/g, " ")}` : "Track review status, comments, and decision actions.";
}
function ri(o) {
  const l = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", f = o.recipientEmail ? o.recipientEmail.trim().toLowerCase() : o.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${l}:${f}`);
}
function ii(o) {
  const l = String(o || "").trim();
  if (!l) return "";
  try {
    return decodeURIComponent(l);
  } catch {
    return l;
  }
}
function ai(o) {
  const l = String(o || "").trim().toLowerCase();
  return l === "[drawn]" || l === "[drawn initials]";
}
function D(o) {
  const l = String(o || "").trim();
  return ai(l) ? "" : l;
}
function oi(o) {
  const l = new Yr(o.profile.ttlDays);
  if (!o.canSign || String(o.sessionKind || "").trim().toLowerCase() === "reviewer") return new Ue("local_only", l, null);
  const f = new Wr(o.profile.endpointBasePath, o.token);
  return o.profile.mode === "local_only" ? new Ue("local_only", l, null) : o.profile.mode === "remote_only" ? new Ue("remote_only", l, f) : new Ue("hybrid", l, f);
}
function si(o) {
  const l = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!l) return;
  const f = l;
  if (f.dataset.esignBootstrapped === "true") return;
  f.dataset.esignBootstrapped = "true";
  const u = Kr(o), L = ri(u), P = oi(u), b = {
    events: [],
    sessionId: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    startTime: Date.now(),
    metrics: {
      viewerLoadTime: null,
      fieldSaveLatencies: [],
      signatureAttachLatencies: [],
      errorsEncountered: [],
      pagesViewed: /* @__PURE__ */ new Set(),
      fieldsCompleted: 0,
      consentTime: null,
      submitTime: null
    },
    track(e, t = {}) {
      if (!u.telemetryEnabled) return;
      const n = {
        event: e,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: u.flowMode,
        agreementId: u.agreementId,
        ...t
      };
      this.events.push(n), this.isCriticalEvent(e) && this.flush();
    },
    isCriticalEvent(e) {
      return [
        "viewer_load_failed",
        "submit_success",
        "submit_failed",
        "viewer_critical_error",
        "consent_declined"
      ].includes(e);
    },
    trackViewerLoad(e, t, n = null) {
      this.metrics.viewerLoadTime = t, this.track(e ? "viewer_load_success" : "viewer_load_failed", {
        duration: t,
        error: n,
        pageCount: u.pageCount
      });
    },
    trackFieldSave(e, t, n, r, i = null) {
      this.metrics.fieldSaveLatencies.push(r), n ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({
        type: "field_save",
        fieldId: e,
        error: i
      }), this.track(n ? "field_save_success" : "field_save_failed", {
        fieldId: e,
        fieldType: t,
        latency: r,
        error: i
      });
    },
    trackSignatureAttach(e, t, n, r, i = null) {
      this.metrics.signatureAttachLatencies.push(r), this.track(n ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: e,
        signatureType: t,
        latency: r,
        error: i
      });
    },
    trackConsent(e) {
      this.metrics.consentTime = Date.now() - this.startTime, this.track(e ? "consent_accepted" : "consent_declined", { timeToConsent: this.metrics.consentTime });
    },
    trackSubmit(e, t = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(e ? "submit_success" : "submit_failed", {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: a.fieldState.size,
        error: t
      });
    },
    trackPageView(e) {
      this.metrics.pagesViewed.has(e) || (this.metrics.pagesViewed.add(e), this.track("page_viewed", {
        pageNum: e,
        totalPagesViewed: this.metrics.pagesViewed.size
      }));
    },
    trackViewerCriticalError(e) {
      this.track("viewer_critical_error", {
        reason: e,
        timeBeforeError: Date.now() - this.startTime,
        pagesViewed: this.metrics.pagesViewed.size,
        fieldsCompleted: this.metrics.fieldsCompleted
      });
    },
    trackDegradedMode(e, t = {}) {
      this.track("degraded_mode", {
        degradationType: e,
        ...t
      });
    },
    getSessionSummary() {
      return {
        sessionId: this.sessionId,
        duration: Date.now() - this.startTime,
        flowMode: u.flowMode,
        viewerLoadTime: this.metrics.viewerLoadTime,
        avgFieldSaveLatency: this.calculateAverage(this.metrics.fieldSaveLatencies),
        avgSignatureAttachLatency: this.calculateAverage(this.metrics.signatureAttachLatencies),
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: a.fieldState?.size || 0,
        pagesViewed: this.metrics.pagesViewed.size,
        errorsCount: this.metrics.errorsEncountered.length,
        consentTime: this.metrics.consentTime,
        submitTime: this.metrics.submitTime
      };
    },
    calculateAverage(e) {
      return e.length ? Math.round(e.reduce((t, n) => t + n, 0) / e.length) : 0;
    },
    async flush() {
      if (!u.telemetryEnabled || this.events.length === 0) return;
      const e = fn();
      if (!e) {
        this.events = [];
        return;
      }
      const t = [...this.events];
      this.events = [];
      try {
        if (navigator.sendBeacon) {
          const n = JSON.stringify({
            events: t,
            summary: this.getSessionSummary()
          });
          navigator.sendBeacon(e, n);
        } else await fetch(e, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: t,
            summary: this.getSessionSummary()
          }),
          keepalive: !0
        });
      } catch (n) {
        this.events = [...t, ...this.events], console.warn("Telemetry flush failed:", n);
      }
    }
  };
  window.addEventListener("beforeunload", () => {
    b.track("session_end", b.getSessionSummary()), b.flush();
  }), setInterval(() => b.flush(), 3e4);
  const a = {
    currentPage: 1,
    zoomLevel: 1,
    pdfDoc: null,
    pageRendering: !1,
    pageNumPending: null,
    pageRenderWaiters: /* @__PURE__ */ new Map(),
    fieldState: /* @__PURE__ */ new Map(),
    activeFieldId: null,
    hasConsented: u.hasConsented,
    canSignSession: u.canSign,
    signatureCanvases: /* @__PURE__ */ new Map(),
    signatureTabByField: /* @__PURE__ */ new Map(),
    savedSignaturesByType: /* @__PURE__ */ new Map(),
    pendingSaves: /* @__PURE__ */ new Set(),
    renderedPages: /* @__PURE__ */ new Map(),
    pageRenderQueue: [],
    maxCachedPages: 5,
    isLowMemory: !1,
    lastRenderTime: 0,
    renderDebounceMs: 100,
    profileKey: L,
    profileData: null,
    profileRemember: u.profile.rememberByDefault,
    reviewContext: u.review ? ft(u.review) : null,
    reviewThreadFilter: "all",
    reviewThreadPage: 1,
    guidedTargetFieldId: null,
    writeCooldownUntil: 0,
    writeCooldownTimer: null,
    submitCooldownUntil: 0,
    submitCooldownTimer: null,
    isSubmitting: !1,
    overlayRenderFrameID: 0,
    reviewAnchorPointDraft: null,
    pickingReviewAnchorPoint: !1,
    highlightedReviewThreadID: "",
    highlightedReviewThreadTimer: null,
    inlineComposerVisible: !1,
    inlineComposerPosition: {
      x: 0,
      y: 0
    },
    inlineComposerAnchor: null,
    activePanelTab: String(u.defaultTab || "").trim().toLowerCase() === "review" ? "review" : "sign"
  };
  function B() {
    a.overlayRenderFrameID || (a.overlayRenderFrameID = window.requestAnimationFrame(() => {
      a.overlayRenderFrameID = 0, le();
    }));
  }
  function qe(e) {
    const t = Number(e || 0) || 0, n = document.querySelector("#pdf-page-1 canvas");
    return t > 0 && Number(a.currentPage || 0) === t && !a.pageRendering && n instanceof HTMLCanvasElement;
  }
  function we(e, t = null) {
    const n = Number(e || 0) || 0;
    if (!n) return;
    const r = a.pageRenderWaiters.get(n);
    !Array.isArray(r) || !r.length || (a.pageRenderWaiters.delete(n), r.forEach((i) => {
      if (i?.timer && window.clearTimeout(i.timer), t) {
        i?.reject?.(t);
        return;
      }
      i?.resolve?.();
    }));
  }
  function dn(e, t = 4e3) {
    const n = Number(e || 0) || 0;
    return !n || qe(n) ? Promise.resolve() : new Promise((r, i) => {
      const s = window.setTimeout(() => {
        const c = (Array.isArray(a.pageRenderWaiters.get(n)) ? a.pageRenderWaiters.get(n) : []).filter((g) => g?.resolve !== r);
        c.length ? a.pageRenderWaiters.set(n, c) : a.pageRenderWaiters.delete(n), i(/* @__PURE__ */ new Error(`Timed out rendering page ${n}.`));
      }, t), d = Array.isArray(a.pageRenderWaiters.get(n)) ? a.pageRenderWaiters.get(n) : [];
      d.push({
        resolve: r,
        reject: i,
        timer: s
      }), a.pageRenderWaiters.set(n, d), qe(n) && we(n);
    });
  }
  function ze(e) {
    const t = a.fieldState.get(e);
    t && (delete t.previewValueText, delete t.previewValueBool, delete t.previewSignatureUrl);
  }
  function cn() {
    a.fieldState.forEach((e) => {
      delete e.previewValueText, delete e.previewValueBool, delete e.previewSignatureUrl;
    });
  }
  function vt(e, t) {
    const n = a.fieldState.get(e);
    if (!n) return;
    const r = D(String(t || ""));
    if (!r) {
      delete n.previewValueText;
      return;
    }
    n.previewValueText = r, delete n.previewValueBool, delete n.previewSignatureUrl;
  }
  function bt(e, t) {
    const n = a.fieldState.get(e);
    n && (n.previewValueBool = !!t, delete n.previewValueText, delete n.previewSignatureUrl);
  }
  function Ve(e, t) {
    const n = a.fieldState.get(e);
    if (!n) return;
    const r = String(t || "").trim();
    if (!r) {
      delete n.previewSignatureUrl;
      return;
    }
    n.previewSignatureUrl = r, delete n.previewValueText, delete n.previewValueBool;
  }
  function $() {
    return !!(a.reviewContext && typeof a.reviewContext == "object");
  }
  function re() {
    const e = String(u.uiMode || "").trim().toLowerCase();
    return e === "sign" || e === "review" || e === "sign_and_review" ? e : String(u.sessionKind || "").trim().toLowerCase() === "reviewer" ? "review" : $() ? "sign_and_review" : "sign";
  }
  function ln() {
    const e = String(u.defaultTab || "").trim().toLowerCase();
    return e === "sign" || e === "review" ? re() === "review" && e === "sign" ? "review" : re() === "sign" && e === "review" ? "sign" : e : re() === "review" ? "review" : "sign";
  }
  function W() {
    return re() === "review";
  }
  function ie() {
    return re() === "sign_and_review";
  }
  function ye() {
    return W() || ie() && a.activePanelTab === "review" ? "review" : "sign";
  }
  function wt() {
    return !W() && ye() === "sign";
  }
  function xe() {
    return $() && (W() || ye() === "review");
  }
  function je() {
    return !$() || !u.reviewMarkersVisible ? !1 : xe();
  }
  function un() {
    return !je() || !u.reviewMarkersInteractive ? !1 : yt();
  }
  function yt() {
    return $() && a.reviewContext?.comments_enabled && a.reviewContext?.can_comment && xe();
  }
  function Se() {
    return String(u.sessionKind || "").trim().toLowerCase() === "sender";
  }
  function gn() {
    const e = String(u.viewerMode || "").trim().toLowerCase();
    return e === "review" || e === "sign" || e === "complete" || e === "read_only" ? e : "read_only";
  }
  function mn() {
    const e = String(u.viewerBanner || "").trim().toLowerCase();
    switch (e) {
      case "sender_review":
      case "sender_progress":
      case "sender_complete":
      case "sender_read_only":
        return e;
      default:
        switch (gn()) {
          case "review":
            return "sender_review";
          case "sign":
            return "sender_progress";
          case "complete":
            return "sender_complete";
          default:
            return "sender_read_only";
        }
    }
  }
  function F() {
    return !Se() && !W() && wt();
  }
  function xt() {
    const e = String(u.resourceBasePath || "").trim();
    return e || `${u.apiBasePath}/session/${encodeURIComponent(u.token)}`;
  }
  function St() {
    return xt();
  }
  function pn() {
    const e = String(u.reviewApiPath || "").trim();
    return e || `${St()}/review`;
  }
  function _t() {
    const e = String(u.assetContractPath || "").trim();
    if (e) return e;
    const t = String(u.token || "").trim();
    return !Se() && t ? `${u.apiBasePath}/assets/${encodeURIComponent(t)}` : `${xt()}/assets`;
  }
  function fn() {
    const e = String(u.telemetryPath || "").trim();
    if (e) return e;
    const t = String(u.token || "").trim();
    return t ? `${u.apiBasePath}/telemetry/${encodeURIComponent(t)}` : "";
  }
  function Ct(e) {
    return !e || typeof e != "object" ? "" : String(e.preview_url || e.source_url || e.executed_url || e.certificate_url || "").trim();
  }
  function Et(e, t) {
    return (Array.isArray(e) ? e : []).filter((n) => String(n?.thread?.status || "").trim() === t).length;
  }
  function K(e, t) {
    const n = String(e || "").trim(), r = String(t || "").trim();
    return !n || !r ? "" : `${n}:${r}`;
  }
  function Z(e) {
    const t = String(e || "").trim();
    return t === "user" || t === "sender" ? "Sender" : t === "reviewer" ? "Reviewer" : t === "external" ? "External Reviewer" : t === "recipient" || t === "signer" ? "Signer" : t ? t.replace(/_/g, " ").replace(/\b\w/g, (n) => n.toUpperCase()) : "Participant";
  }
  function U(e) {
    if (!e || typeof e != "string") return !1;
    const t = e.trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) || /^[0-9a-f]{24,32}$/i.test(t);
  }
  function hn(e) {
    if (!e) return null;
    const t = a.reviewContext?.participant;
    if (!t) return null;
    const n = String(e).trim(), r = String(t.id || "").trim(), i = String(t.recipient_id || "").trim();
    return r === n || i === n ? t : null;
  }
  function vn(e, t) {
    const n = a.reviewContext?.actor_map || {}, r = [], i = String(e || "").trim(), s = String(t || "").trim();
    i === "recipient" || i === "signer" ? r.push(K("recipient", t), K("signer", t)) : i === "user" || i === "sender" ? r.push(K("user", t), K("sender", t)) : i === "reviewer" || i === "external" ? r.push(K("reviewer", t), K("external", t)) : r.push(K(i, t));
    const d = r.map((g) => n[g]).find(Boolean);
    if (d) {
      const g = String(d.name || "").trim(), p = String(d.email || "").trim();
      if (g && !U(g)) return d;
      if (p && !U(p)) return {
        ...d,
        name: p
      };
    }
    const c = hn(s);
    if (c) {
      const g = String(c.display_name || "").trim(), p = String(c.email || "").trim();
      if (g && !U(g)) return {
        name: g,
        email: p,
        role: i,
        actor_type: i,
        actor_id: s
      };
      if (p && !U(p)) return {
        name: p,
        email: p,
        role: i,
        actor_type: i,
        actor_id: s
      };
    }
    return {
      name: Z(i) || "Unknown User",
      email: "",
      role: i,
      actor_type: i,
      actor_id: s
    };
  }
  function _e(e, t = "P") {
    const n = String(e || "").trim();
    if (!n) return String(t || "P").trim().slice(0, 2).toUpperCase() || "P";
    const r = n.split(/\s+/).map((i) => i[0] || "").join("").replace(/[^a-z0-9]/gi, "").toUpperCase();
    return r ? r.slice(0, 2) : n.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || String(t || "P").trim().slice(0, 2).toUpperCase() || "P";
  }
  function He(e, t) {
    const n = vn(e, t), r = String(n?.actor_type || e || "").trim();
    let i = "#64748b";
    (r === "user" || r === "sender") && (i = "#2563eb"), (r === "reviewer" || r === "external") && (i = "#7c3aed"), (r === "recipient" || r === "signer") && (i = "#059669");
    const s = String(n?.name || n?.email || Z(r)).trim() || "Participant", d = n?.name && !U(n.name) ? n.name : n?.email && !U(n.email) ? n.email : Z(r);
    return {
      actor: n,
      name: s,
      role: Z(n?.role || r),
      initials: _e(d, Z(r)),
      color: i
    };
  }
  function bn(e) {
    if (!e) return "";
    const t = String(e.display_name || "").trim(), n = String(e.email || "").trim();
    if (t && !U(t)) return t;
    if (n && !U(n)) return n;
    const r = String(e.participant_type || "").trim();
    return r ? Z(r) : "Participant";
  }
  function Tt(e) {
    const t = String(e || "").trim();
    if (!t) return "";
    const n = new Date(t);
    return Number.isNaN(n.getTime()) ? t : n.toLocaleString();
  }
  function wn(e) {
    a.reviewContext = ft(e), a.reviewContext && (Array.isArray(a.reviewContext.threads) || (a.reviewContext.threads = []), a.reviewContext.open_thread_count = Et(a.reviewContext.threads, "open"), a.reviewContext.resolved_thread_count = Et(a.reviewContext.threads, "resolved")), W() ? a.activePanelTab = "review" : $() ? ie() || (a.activePanelTab = ln()) : a.activePanelTab = "sign", H(), B(), de(), V();
  }
  async function ae() {
    const e = await fetch(St(), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!e.ok) throw await z(e, "Failed to reload review session");
    const t = await e.json(), n = t?.session && typeof t.session == "object" ? t.session : {};
    return a.canSignSession = n.can_sign !== !1, wn(n.review || null), n;
  }
  async function oe(e, t = {}, n = "Review request failed") {
    const r = await fetch(`${pn()}${e}`, {
      credentials: "same-origin",
      ...t,
      headers: {
        Accept: "application/json",
        ...t?.body ? { "Content-Type": "application/json" } : {},
        ...t?.headers || {}
      }
    });
    if (!r.ok) throw await z(r, n);
    return r.json().catch(() => ({}));
  }
  function ee() {
    const e = document.getElementById("review-thread-anchor");
    return String(e?.value || "agreement").trim() || "agreement";
  }
  function Lt() {
    a.highlightedReviewThreadID = "", a.highlightedReviewThreadTimer && (window.clearTimeout(a.highlightedReviewThreadTimer), a.highlightedReviewThreadTimer = null);
  }
  function Pt(e) {
    Lt(), a.highlightedReviewThreadID = String(e || "").trim(), a.highlightedReviewThreadID && (a.highlightedReviewThreadTimer = window.setTimeout(() => {
      Lt(), $t(), B();
    }, 2400), $t(), B());
  }
  function yn(e) {
    if (!e || typeof e != "object") {
      a.reviewAnchorPointDraft = null, X(), B();
      return;
    }
    a.reviewAnchorPointDraft = {
      page_number: Number(e.page_number || a.currentPage || 1) || 1,
      anchor_x: Math.round((Number(e.anchor_x || 0) || 0) * 100) / 100,
      anchor_y: Math.round((Number(e.anchor_y || 0) || 0) * 100) / 100
    }, X(), B();
  }
  function xn(e) {
    a.pickingReviewAnchorPoint = !!e && ee() === "page", document.getElementById("pdf-container")?.classList.toggle("review-anchor-picking", a.pickingReviewAnchorPoint), a.pickingReviewAnchorPoint ? v("Click on the document page to add a comment.") : (v("Comment pin placement cancelled."), se()), X();
  }
  function Sn(e, t, n) {
    if (!$() || !a.reviewContext?.comments_enabled || !a.reviewContext?.can_comment) return;
    a.inlineComposerPosition = {
      x: e,
      y: t
    }, a.inlineComposerAnchor = n, a.inlineComposerVisible = !0;
    let r = document.getElementById("inline-comment-composer");
    r || (r = _n(), document.body.appendChild(r));
    const i = window.innerWidth, s = window.innerHeight, d = 320, c = 200, g = 16;
    let p = e + 20, m = t - c / 2;
    p + d > i - g && (p = e - d - 20), p < g && (p = g), m < g && (m = g), m + c > s - g && (m = s - c - g), r.style.left = `${p}px`, r.style.top = `${m}px`, r.classList.remove("hidden");
    const _ = r.querySelector("textarea");
    _ && setTimeout(() => _.focus(), 100), v("Comment composer opened. Type your comment and press submit.");
  }
  function se() {
    a.inlineComposerVisible = !1, a.inlineComposerAnchor = null;
    const e = document.getElementById("inline-comment-composer");
    if (e) {
      e.classList.add("hidden");
      const t = e.querySelector("textarea");
      t && (t.value = "");
    }
  }
  function _n() {
    const e = document.createElement("div");
    return e.id = "inline-comment-composer", e.className = "inline-comment-composer hidden", e.innerHTML = `
      <div class="inline-composer-header">
        <span class="inline-composer-title">Add Comment</span>
        <button type="button" class="inline-composer-close" aria-label="Close">
          <i class="iconoir-xmark"></i>
        </button>
      </div>
      <div class="inline-composer-body">
        <textarea id="inline-comment-body" rows="3" placeholder="Write your comment..." class="inline-composer-textarea"></textarea>
      </div>
      <div class="inline-composer-footer">
        <button type="button" class="inline-composer-cancel" data-esign-action="cancel-inline-comment">Cancel</button>
        <button type="button" class="inline-composer-submit" data-esign-action="submit-inline-comment">Comment</button>
      </div>
    `, e.querySelector(".inline-composer-close")?.addEventListener("click", () => se()), e;
  }
  async function Cn() {
    if (!a.inlineComposerAnchor) return;
    const e = document.getElementById("inline-comment-body"), t = String(e?.value || "").trim();
    if (!t) {
      v("Enter a comment before submitting.", "assertive");
      return;
    }
    const n = { thread: {
      review_id: a.reviewContext.review_id,
      visibility: "shared",
      body: t,
      anchor_type: "page",
      page_number: a.inlineComposerAnchor.page_number,
      anchor_x: a.inlineComposerAnchor.anchor_x,
      anchor_y: a.inlineComposerAnchor.anchor_y
    } };
    try {
      await oe("/threads", {
        method: "POST",
        body: JSON.stringify(n)
      }, "Failed to create review comment"), se(), a.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), await ae(), v("Comment added successfully.");
    } catch (r) {
      console.error("Failed to submit inline comment:", r), window.toastManager && window.toastManager.error("Failed to add comment");
    }
  }
  function X() {
    const e = document.getElementById("review-anchor-point-controls"), t = document.getElementById("review-anchor-point-status"), n = document.querySelector('[data-esign-action="pick-review-anchor-point"]'), r = document.querySelector('[data-esign-action="clear-review-anchor-point"]'), i = ee() === "page";
    if (e?.classList.toggle("hidden", !i), n instanceof HTMLButtonElement && (n.disabled = !$() || !(a.reviewContext?.comments_enabled && a.reviewContext?.can_comment), n.textContent = a.pickingReviewAnchorPoint ? "Picking..." : a.reviewAnchorPointDraft ? "Repin location" : "Pick location"), r instanceof HTMLButtonElement && (r.disabled = !a.reviewAnchorPointDraft), !!t) {
      if (!i) {
        t.textContent = "Attach this thread to a specific point on the current page.";
        return;
      }
      if (a.reviewAnchorPointDraft && Number(a.reviewAnchorPointDraft.page_number || 0) === Number(a.currentPage || 0)) {
        t.textContent = `Pinned on page ${a.reviewAnchorPointDraft.page_number} at x ${a.reviewAnchorPointDraft.anchor_x}, y ${a.reviewAnchorPointDraft.anchor_y}.`;
        return;
      }
      if (a.reviewAnchorPointDraft) {
        t.textContent = `Pinned on page ${a.reviewAnchorPointDraft.page_number}. Switch back to that page to adjust it.`;
        return;
      }
      t.textContent = a.pickingReviewAnchorPoint ? "Click on the document page to pin this comment." : "Attach this thread to a specific point on the current page.";
    }
  }
  function Oe() {
    const e = document.getElementById("review-progress-indicator");
    if (!e) return;
    if (!$()) {
      e.classList.add("hidden");
      return;
    }
    const t = a.reviewContext, n = be(t.status), r = ve(t);
    e.classList.remove("hidden");
    const i = document.getElementById("review-step-draft"), s = document.getElementById("review-step-sent"), d = document.getElementById("review-step-review"), c = document.getElementById("review-step-decision"), g = e.querySelectorAll(".review-progress-line");
    if ([
      i,
      s,
      d,
      c
    ].forEach((p) => {
      p?.classList.remove("completed", "active", "changes-requested");
    }), g.forEach((p) => {
      p.classList.remove("completed", "active");
    }), n === "approved") {
      i?.classList.add("completed"), s?.classList.add("completed"), d?.classList.add("completed"), c?.classList.add("completed"), g.forEach((m) => m.classList.add("completed"));
      const p = c?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    } else if (n === "changes_requested") {
      i?.classList.add("completed"), s?.classList.add("completed"), d?.classList.add("completed"), c?.classList.add("changes-requested"), g.forEach((m) => m.classList.add("completed"));
      const p = c?.querySelector("i");
      p && (p.className = "iconoir-warning-circle text-xs");
    } else if (r === "approved" && n === "in_review") {
      i?.classList.add("completed"), s?.classList.add("completed"), d?.classList.add("completed"), c?.classList.add("active"), g.forEach((m) => m.classList.add("completed"));
      const p = c?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    } else if (n === "in_review" || n === "pending") {
      i?.classList.add("completed"), s?.classList.add("completed"), d?.classList.add("active"), g[0] && g[0].classList.add("completed"), g[1] && g[1].classList.add("completed"), g[2] && g[2].classList.add("active");
      const p = c?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    } else {
      i?.classList.add("active");
      const p = c?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    }
  }
  function En() {
    const e = ee();
    if (e === "field" && a.activeFieldId) {
      const t = a.fieldState.get(a.activeFieldId);
      return {
        anchor_type: "field",
        field_id: String(a.activeFieldId || "").trim(),
        page_number: Number(t?.page || a.currentPage || 1) || 1
      };
    }
    if (e === "page") {
      const t = a.reviewAnchorPointDraft ? Number(a.reviewAnchorPointDraft.page_number || a.currentPage || 1) || 1 : Number(a.currentPage || 1) || 1, n = {
        anchor_type: "page",
        page_number: t
      };
      return a.reviewAnchorPointDraft && Number(a.reviewAnchorPointDraft.page_number || 0) === t && (n.anchor_x = Number(a.reviewAnchorPointDraft.anchor_x || 0) || 0, n.anchor_y = Number(a.reviewAnchorPointDraft.anchor_y || 0) || 0), n;
    }
    return { anchor_type: "agreement" };
  }
  function H() {
    const e = document.getElementById("review-panel"), t = document.getElementById("review-banner"), n = document.getElementById("review-status-chip"), r = document.getElementById("review-panel-subtitle"), i = document.getElementById("review-participant-summary"), s = document.getElementById("review-decision-actions"), d = document.getElementById("review-thread-summary"), c = document.getElementById("review-thread-composer"), g = document.getElementById("review-thread-list"), p = document.getElementById("review-thread-composer-hint");
    if (!e || !g) return;
    if (!$()) {
      e.classList.add("hidden"), t?.classList.add("hidden"), X(), Oe();
      return;
    }
    const m = a.reviewContext, _ = he(m.status), y = ve(m);
    if (!xe()) {
      e.classList.add("hidden"), t?.classList.add("hidden"), Oe();
      return;
    }
    if (e.classList.remove("hidden"), Oe(), n && (n.textContent = _, n.className = "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + (m.status === "approved" ? "bg-emerald-100 text-emerald-700" : m.status === "changes_requested" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700")), r && (r.textContent = ni(m)), i) {
      const x = bn(m.participant);
      if (x || y) {
        i.classList.remove("hidden"), i.className = "rounded-lg border px-3 py-2 text-xs", y === "approved" ? i.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-800") : y === "changes_requested" ? i.classList.add("border-amber-200", "bg-amber-50", "text-amber-800") : i.classList.add("border-slate-200", "bg-slate-50", "text-slate-700");
        const w = String(m.participant?.approved_on_behalf_by_display_name || "").trim(), A = w && !U(w) ? w : "", C = m.participant?.approved_on_behalf ? ` • approved on behalf${A ? ` by ${A}` : ""}` : "";
        i.textContent = x ? `${x} • decision ${he(y || "pending")}${C}` : `Decision ${he(y || "pending")}${C}`;
      } else i.classList.add("hidden");
    }
    if (s && s.classList.toggle("hidden", !ti(m)), d) {
      d.classList.remove("hidden");
      const x = [];
      (Number(m.total_approvers || 0) || 0) > 0 && x.push(`${m.approved_count || 0} of ${m.total_approvers || 0} approvers approved`), x.push(`${m.open_thread_count || 0} open`), x.push(`${m.resolved_thread_count || 0} resolved`), d.textContent = x.join(" • ");
    }
    if (c) {
      const x = m.comments_enabled && m.can_comment && !m.override_active;
      c.classList.toggle("hidden", !x), p && (ee() === "field" && a.activeFieldId ? p.textContent = "Comment will be anchored to the active field." : p.textContent = "Click Global Comment for agreement-level feedback, or click directly on the document to add a positioned comment.");
    }
    if (t) {
      const x = [];
      if (m.override_active) {
        const w = String(m.override_reason || "").trim(), A = String(m.override_by_display_name || "").trim(), C = A && !U(A) ? A : "";
        x.push(w ? `Review finalized by admin override${C ? ` by ${C}` : ""}. ${w}` : `Review finalized by admin override${C ? ` by ${C}` : ""}.`);
      }
      m.sign_blocked && m.sign_block_reason && x.push(m.sign_block_reason), (Array.isArray(m.blockers) ? m.blockers : []).forEach((w) => {
        const A = String(w || "").trim();
        A && !x.includes(A) && x.push(A);
      }), x.length ? (t.classList.remove("hidden"), t.className = "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4", t.innerHTML = `
          <div class="flex items-start gap-3">
            <i class="iconoir-warning-circle mt-0.5 text-amber-600" aria-hidden="true"></i>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-amber-900">Review Status</p>
              <p class="mt-1 text-xs text-amber-800">${E(x.join(" "))}</p>
            </div>
          </div>
        `) : t.classList.add("hidden");
    }
    Ye(), X();
    const T = Array.isArray(m.threads) ? m.threads : [];
    if (!T.length) {
      g.innerHTML = '<div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">No review comments yet.</div>';
      return;
    }
    const h = a.reviewThreadFilter || "all", S = T.filter((x) => {
      const w = String(x?.thread?.status || "").trim();
      return h === "open" ? w === "open" : h === "resolved" ? w === "resolved" : !0;
    }), M = 5, I = Math.ceil(S.length / M), R = Math.min(a.reviewThreadPage || 1, I || 1), O = (R - 1) * M, Q = S.slice(O, O + M), j = T.length > 0 ? `
      <div class="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
        <button type="button" data-esign-action="filter-review-threads" data-filter="all" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${h === "all" ? "bg-slate-100 text-slate-800" : "text-gray-500 hover:text-gray-700"}">
          All (${T.length})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="open" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${h === "open" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}">
          Open (${m.open_thread_count || 0})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="resolved" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${h === "resolved" ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:text-gray-700"}">
          Resolved (${m.resolved_thread_count || 0})
        </button>
      </div>
    ` : "", Y = I > 1 ? `
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span class="text-xs text-gray-500">Page ${R} of ${I}</span>
        <div class="flex gap-2">
          <button type="button" data-esign-action="page-review-threads" data-page="${R - 1}" class="px-2 py-1 text-xs font-medium rounded border ${R <= 1 ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${R <= 1 ? "disabled" : ""}>
            <i class="iconoir-nav-arrow-left"></i> Prev
          </button>
          <button type="button" data-esign-action="page-review-threads" data-page="${R + 1}" class="px-2 py-1 text-xs font-medium rounded border ${R >= I ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${R >= I ? "disabled" : ""}>
            Next <i class="iconoir-nav-arrow-right"></i>
          </button>
        </div>
      </div>
    ` : "";
    if (S.length === 0) {
      g.innerHTML = `
        ${j}
        <div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No ${h === "all" ? "" : h} comments${h !== "all" ? ". Try a different filter." : "."}
        </div>
      `;
      return;
    }
    g.innerHTML = j + Q.map((x) => {
      const w = x.thread || {}, A = Array.isArray(x.messages) ? x.messages : [], C = m.comments_enabled && m.can_comment, N = C && String(w.status || "").trim() === "open", ne = C && String(w.status || "").trim() === "resolved", Re = mt(x), me = Tt(w.last_activity_at || ""), pe = `review-reply-${E(String(w.id || ""))}`, lt = `review-reply-composer-${E(String(w.id || ""))}`, qr = String(w.status || "").trim() === "resolved" ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200", ut = He(A[0]?.created_by_type || w.created_by_type, A[0]?.created_by_id || w.created_by_id);
      let De = "border-l-slate-300";
      ut.color === "#2563eb" && (De = "border-l-blue-400"), ut.color === "#7c3aed" && (De = "border-l-purple-400"), ut.color === "#059669" && (De = "border-l-emerald-400");
      const zr = String(w.id || "").trim() === String(a.highlightedReviewThreadID || "").trim(), Vr = String(w.visibility || "shared").trim() === "internal" ? '<span class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700"><i class="iconoir-lock text-[10px]"></i>Internal</span>' : "", nn = Zr(x);
      return `
        <article
          class="rounded-xl border ${qr} border-l-4 ${De} p-4 ${zr ? "ring-2 ring-blue-200 shadow-sm" : ""} ${nn ? "cursor-pointer" : ""}"
          data-review-thread-id="${E(String(w.id || ""))}"
          ${nn ? 'data-esign-action="highlight-review-marker"' : ""}
          tabindex="-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" data-esign-action="go-review-thread-anchor" data-thread-id="${E(String(w.id || ""))}" class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">${E(Re)}</button>
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${String(w.status || "").trim() === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}">${E(he(w.status || "open"))}</span>
                ${Vr}
              </div>
              ${me ? `<p class="mt-2 text-xs text-gray-500">Last activity ${E(me)}</p>` : ""}
            </div>
          </div>
          <div class="mt-3 space-y-3">
            ${A.map((Fe) => {
        const fe = He(Fe.created_by_type, Fe.created_by_id);
        let Ne = "bg-slate-50";
        return fe.color === "#2563eb" && (Ne = "bg-blue-50 border-l-2 border-l-blue-300"), fe.color === "#7c3aed" && (Ne = "bg-purple-50 border-l-2 border-l-purple-300"), fe.color === "#059669" && (Ne = "bg-emerald-50 border-l-2 border-l-emerald-300"), `
              <div class="rounded-lg ${Ne} px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-700">${E(fe.name)}</p>
                    <p class="text-[10px] uppercase tracking-wide text-slate-500">${E(fe.role)}</p>
                  </div>
                  <p class="text-[11px] text-slate-500">${E(Tt(Fe.created_at || ""))}</p>
                </div>
                <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">${E(String(Fe.body || ""))}</p>
              </div>
            `;
      }).join("")}
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            ${N ? `<button type="button" data-esign-action="resolve-review-thread" data-thread-id="${E(String(w.id || ""))}" class="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Resolve</button>` : ""}
            ${ne ? `<button type="button" data-esign-action="reopen-review-thread" data-thread-id="${E(String(w.id || ""))}" class="text-xs font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2">Reopen</button>` : ""}
            ${C ? `<button type="button" data-esign-action="toggle-reply-composer" data-thread-id="${E(String(w.id || ""))}" data-composer-id="${lt}" class="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1">
              <i class="iconoir-chat-bubble text-[10px]"></i> Reply
            </button>` : ""}
          </div>
          ${C ? `
            <div id="${lt}" class="review-reply-composer mt-3 space-y-2 hidden" data-thread-id="${E(String(w.id || ""))}">
              <textarea id="${pe}" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400" rows="2" placeholder="Write your reply..."></textarea>
              <div class="flex justify-end gap-2">
                <button type="button" data-esign-action="cancel-reply" data-composer-id="${lt}" class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 rounded border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="button" data-esign-action="reply-review-thread" data-thread-id="${E(String(w.id || ""))}" data-reply-input-id="${pe}" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">Send Reply</button>
              </div>
            </div>
          ` : ""}
        </article>
      `;
    }).join("") + Y;
  }
  function kt(e) {
    const t = Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : [];
    return e === "open" ? t.filter((n) => String(n?.thread?.status || "").trim() === "open") : e === "resolved" ? t.filter((n) => String(n?.thread?.status || "").trim() === "resolved") : t;
  }
  function Ye() {
    const e = document.getElementById("review-anchor-page-label"), t = document.getElementById("review-anchor-field-chip"), n = document.getElementById("review-anchor-field-label"), r = document.getElementById("review-thread-anchor");
    if (e && (e.textContent = `Page ${a.currentPage || 1}`), t && n) if (a.activeFieldId) {
      const i = a.fieldState.get(a.activeFieldId)?.type || "field";
      n.textContent = i.charAt(0).toUpperCase() + i.slice(1).replace(/_/g, " "), t.disabled = !1, t.classList.remove("hidden", "text-gray-400", "cursor-not-allowed"), t.classList.add("text-gray-600");
    } else
      n.textContent = "Select a field", t.disabled = !0, t.classList.add("hidden", "text-gray-400", "cursor-not-allowed"), t.classList.remove("text-gray-600"), r && r.value === "field" && It("agreement");
    X();
  }
  function It(e) {
    const t = document.getElementById("review-thread-anchor"), n = document.querySelectorAll(".review-anchor-chip"), r = document.getElementById("review-thread-composer-hint");
    t && (t.value = e), n.forEach((i) => {
      i.getAttribute("data-anchor-type") === e ? (i.classList.add("active", "border-blue-300", "bg-blue-50", "text-blue-700"), i.classList.remove("border-gray-200", "bg-white", "text-gray-600")) : (i.classList.remove("active", "border-blue-300", "bg-blue-50", "text-blue-700"), i.classList.add("border-gray-200", "bg-white", "text-gray-600"));
    }), r && (e === "field" && a.activeFieldId ? r.textContent = "Comment will be anchored to the active field." : r.textContent = "Global comment on the agreement. Click directly on the document to place a positioned comment."), a.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), se(), X();
  }
  function Tn() {
    const e = document.getElementById("review-anchor-chips");
    e && e.addEventListener("click", (t) => {
      const n = t.target.closest(".review-anchor-chip");
      if (!n || n.hasAttribute("disabled")) return;
      const r = n.getAttribute("data-anchor-type");
      r && It(r);
    });
  }
  function Ln() {
    const e = document.getElementById("pdf-container");
    e && e.addEventListener("click", (t) => {
      if (!(t.target instanceof Element) || !yt() || t.target.closest(".review-thread-marker, .field-overlay") || t.target.closest("button, textarea, input, select, label, a")) return;
      const n = document.getElementById(`pdf-page-${Number(a.currentPage || 1) || 1}`);
      if (!n) return;
      t.preventDefault(), t.stopPropagation();
      const r = n.querySelector("canvas"), i = r instanceof HTMLElement ? r : n, s = J.screenToPagePoint(Number(a.currentPage || 1) || 1, i, t.clientX, t.clientY);
      s && Sn(t.clientX, t.clientY, s);
    });
  }
  function Pn(e) {
    const t = [
      "all",
      "open",
      "resolved"
    ], n = String(e || "all").trim().toLowerCase();
    a.reviewThreadFilter = t.includes(n) ? n : "all", a.reviewThreadPage = 1, H(), v(`Showing ${a.reviewThreadFilter === "all" ? "all" : a.reviewThreadFilter} comments.`);
  }
  function kn(e) {
    a.reviewThreadPage = Math.max(1, parseInt(String(e), 10) || 1), H(), document.getElementById("review-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
  function At(e, t) {
    const n = document.getElementById(String(e || "").trim());
    if (n)
      if (t) {
        document.querySelectorAll(".review-reply-composer").forEach((i) => {
          i.id !== e && i.classList.add("hidden");
        }), n.classList.remove("hidden");
        const r = n.querySelector("textarea");
        r && r.focus();
      } else {
        n.classList.add("hidden");
        const r = n.querySelector("textarea");
        r && (r.value = "");
      }
  }
  function $t() {
    document.querySelectorAll("[data-review-thread-id]").forEach((e) => {
      if (!(e instanceof HTMLElement)) return;
      const t = String(e.getAttribute("data-review-thread-id") || "").trim() === String(a.highlightedReviewThreadID || "").trim();
      e.classList.toggle("ring-2", t), e.classList.toggle("ring-blue-200", t), e.classList.toggle("shadow-sm", t);
    });
  }
  function In(e) {
    const t = String(e || "").trim();
    if (!t) return;
    const n = (Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : []).find((d) => String(d?.thread?.id || "").trim() === t);
    if (!n) return;
    const r = String(n?.thread?.status || "open").trim() || "open", i = a.reviewThreadFilter || "all";
    i !== "all" && i !== r && (a.reviewThreadFilter = r === "resolved" ? "resolved" : "open");
    const s = kt(a.reviewThreadFilter || "all").findIndex((d) => String(d?.thread?.id || "").trim() === t);
    if (s >= 0) a.reviewThreadPage = Math.floor(s / 5) + 1;
    else {
      a.reviewThreadFilter = "all";
      const d = kt("all").findIndex((c) => String(c?.thread?.id || "").trim() === t);
      a.reviewThreadPage = d >= 0 ? Math.floor(d / 5) + 1 : 1;
    }
    ie() && ye() !== "review" && We("review"), Pt(t), H(), requestAnimationFrame(() => {
      const d = document.querySelector(`[data-review-thread-id="${CSS.escape(t)}"]`);
      d instanceof HTMLElement && (d.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      }), d.focus({ preventScroll: !0 }));
    });
  }
  function We(e) {
    e !== "sign" && e !== "review" || ie() && (e === "review" && !$() || (a.activePanelTab = e, H(), B(), de(), V(), v(`${e === "sign" ? "Sign" : "Review"} tab selected.`)));
  }
  function de() {
    const e = document.querySelector(".side-panel"), t = document.getElementById("panel-title-row"), n = document.getElementById("panel-title"), r = document.getElementById("panel-tabs"), i = document.getElementById("fields-status"), s = document.getElementById("fields-list"), d = document.getElementById("consent-notice"), c = document.getElementById("submit-btn"), g = document.getElementById("decline-btn"), p = document.getElementById("decline-container"), m = document.getElementById("panel-footer"), _ = document.getElementById("panel-mobile-progress"), y = document.getElementById("review-submit-warning"), T = document.getElementById("review-submit-message"), h = document.getElementById("stage-state-banner"), S = document.getElementById("header-progress-group"), M = document.getElementById("session-identity-label"), I = document.getElementById("panel-sign-content"), R = document.getElementById("panel-review-content"), O = document.getElementById("panel-footer-sign"), Q = document.getElementById("panel-footer-review"), j = document.getElementById("panel-tab-sign"), Y = document.getElementById("panel-tab-review"), x = W(), w = ie(), A = Se(), C = wt(), N = xe(), ne = F(), Re = ye();
    if (e?.classList.toggle("review-only-mode", x), e?.classList.toggle("combined-mode", w), j && Y) {
      const me = (w ? Re === "sign" : !x) && !x, pe = x || w && Re === "review";
      j.setAttribute("aria-selected", String(me)), j.setAttribute("tabindex", me ? "0" : "-1"), Y.setAttribute("aria-selected", String(pe)), Y.setAttribute("tabindex", pe ? "0" : "-1"), j.hidden = x, Y.hidden = !$();
    }
    I && (I.hidden = !C, I.classList.toggle("hidden", !C)), R && (R.hidden = !N, R.classList.toggle("hidden", !N)), O && (O.hidden = !C, O.classList.toggle("hidden", !C)), Q && (Q.hidden = !N, Q.classList.toggle("hidden", !N)), r?.classList.toggle("active", w), t?.classList.remove("hidden"), M && (A ? M.textContent = "Viewing as" : M.textContent = N && !C ? "Reviewing as" : "Signing as"), S?.classList.toggle("review-only-hidden", !C), n && (A ? n.textContent = N && !C ? "Review & Comment" : "Document Preview" : n.textContent = N && !C ? "Review & Comment" : "Complete & Sign"), s?.classList.toggle("hidden", !C), i?.classList.toggle("hidden", !C), _?.classList.toggle("hidden", !C), d?.classList.toggle("hidden", !ne || a.hasConsented), h?.classList.toggle("hidden", !C), m?.classList.toggle("hidden", !C && !N), c?.classList.toggle("hidden", !ne), g?.classList.toggle("hidden", !ne), p?.classList.toggle("hidden", !ne), y && T && (N ? (y.classList.remove("hidden"), T.textContent = C ? "Switch to the Sign tab to submit your signature." : "Review actions are available above.") : C && $() && a.reviewContext.sign_blocked ? (y.classList.remove("hidden"), T.textContent = a.reviewContext.sign_block_reason || "Signing is blocked until review completes.") : y.classList.add("hidden"));
  }
  async function An() {
    if (!$()) return;
    const e = document.getElementById("review-thread-body"), t = String(e?.value || "").trim();
    if (!t) {
      v("Enter a comment before creating a thread.", "assertive");
      return;
    }
    const n = { thread: {
      review_id: a.reviewContext.review_id,
      visibility: "shared",
      body: t,
      ...En()
    } };
    await oe("/threads", {
      method: "POST",
      body: JSON.stringify(n)
    }, "Failed to create review thread"), e && (e.value = ""), await ae(), v("Review comment added.");
  }
  async function $n(e, t) {
    const n = document.getElementById(String(t || "").trim()), r = String(n?.value || "").trim();
    if (!e || !r) {
      v("Enter a reply before sending.", "assertive");
      return;
    }
    await oe(`/threads/${encodeURIComponent(String(e))}/replies`, {
      method: "POST",
      body: JSON.stringify({ reply: { body: r } })
    }, "Failed to reply to review thread"), n && (n.value = ""), await ae(), v("Reply added to review thread.");
  }
  async function Bt(e, t) {
    if (!e) return;
    const n = t ? "resolve" : "reopen";
    await oe(`/threads/${encodeURIComponent(String(e))}/${n}`, {
      method: "POST",
      body: JSON.stringify({})
    }, t ? "Failed to resolve review thread" : "Failed to reopen review thread"), await ae(), v(t ? "Review thread resolved." : "Review thread reopened.");
  }
  async function Bn(e, t = "") {
    const n = e === "approve" ? "/approve" : "/request-changes", r = e === "approve" ? "Failed to approve review" : "Failed to request review changes";
    await oe(n, {
      method: "POST",
      body: e === "request-changes" && t ? JSON.stringify({ comment: t }) : void 0
    }, r), await ae();
    let i = e === "approve" ? "Review approved." : "Review changes requested.";
    if ($()) {
      const s = be(a.reviewContext.status), d = ve(a.reviewContext), c = Number(a.reviewContext.approved_count || 0) || 0, g = Number(a.reviewContext.total_approvers || 0) || 0;
      e === "approve" && d === "approved" && s === "in_review" ? i = g > 0 ? `Your approval was recorded. ${c} of ${g} approvers have approved so far.` : "Your approval was recorded. Waiting for the remaining reviewers." : e === "approve" && d === "approved" ? i = "Review approved." : e === "request-changes" && d === "changes_requested" && (i = "Your change request was recorded.");
    }
    window.toastManager && window.toastManager.success(i), v(i);
  }
  let Ce = "";
  function Mt(e) {
    const t = document.getElementById("review-decision-modal"), n = document.getElementById("review-decision-icon-container"), r = document.getElementById("review-decision-icon"), i = document.getElementById("review-decision-modal-title"), s = document.getElementById("review-decision-modal-description"), d = document.getElementById("review-decision-comment-section"), c = document.getElementById("review-decision-comment"), g = document.getElementById("review-decision-comment-error"), p = document.getElementById("review-decision-confirm-btn");
    if (!t) return;
    Ce = e, e === "approve" ? (n?.classList.remove("bg-amber-100"), n?.classList.add("bg-emerald-100"), r?.classList.remove("iconoir-warning-circle", "text-amber-600"), r?.classList.add("iconoir-check-circle", "text-emerald-600"), i && (i.textContent = "Approve Review?"), s && (s.textContent = "This will mark the document as approved and notify the sender that the review is complete."), d?.classList.add("hidden"), p?.classList.remove("bg-amber-600", "hover:bg-amber-700"), p?.classList.add("btn-primary"), p && (p.textContent = "Approve")) : (n?.classList.remove("bg-emerald-100"), n?.classList.add("bg-amber-100"), r?.classList.remove("iconoir-check-circle", "text-emerald-600"), r?.classList.add("iconoir-warning-circle", "text-amber-600"), i && (i.textContent = "Request Changes?"), s && (s.textContent = "The sender will be notified that changes are needed before this document can proceed."), d?.classList.remove("hidden"), c && (c.value = ""), g?.classList.add("hidden"), p?.classList.remove("btn-primary"), p?.classList.add("bg-amber-600", "hover:bg-amber-700", "text-white"), p && (p.textContent = "Request Changes")), t.classList.add("active"), t.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden";
    const m = t.querySelector(".field-editor");
    m instanceof HTMLElement && Be(m), e === "request-changes" && c?.focus();
  }
  function Ke() {
    const e = document.getElementById("review-decision-modal");
    if (!e) return;
    const t = e.querySelector(".field-editor");
    t instanceof HTMLElement && Me(t), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", Ce = "";
  }
  async function Mn() {
    if (!Ce) return;
    const e = Ce;
    let t = "";
    if (e === "request-changes") {
      const n = document.getElementById("review-decision-comment"), r = document.getElementById("review-decision-comment-error");
      if (t = String(n?.value || "").trim(), !t) {
        r?.classList.remove("hidden"), n?.focus(), v("Please provide a reason for requesting changes.", "assertive");
        return;
      }
    }
    Ke(), await Bn(e, t);
  }
  async function Rt(e) {
    const t = (Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : []).find((r) => String(r?.thread?.id || "") === String(e || ""));
    if (!t) return "";
    Pt(e);
    const n = String(t?.thread?.anchor_type || "").trim();
    if (n === "field" && t.thread.field_id) {
      const r = a.fieldState.get(t.thread.field_id), i = Number(r?.page || t.thread.page_number || a.currentPage || 1) || 1;
      return i > 0 && await ke(i), et(t.thread.field_id, { openEditor: !1 }), dt(t.thread.field_id), "field";
    }
    return n === "page" && Number(t?.thread?.page_number || 0) > 0 ? (await ke(Number(t.thread.page_number || 1) || 1), "page") : (document.getElementById("viewer-content")?.scrollTo({
      top: 0,
      behavior: "smooth"
    }), "agreement");
  }
  function Dt(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    const n = document.querySelector(`.review-thread-marker[data-thread-id="${CSS.escape(t)}"]`);
    return n instanceof HTMLElement ? n : null;
  }
  function Rn(e, t = 4e3) {
    const n = String(e || "").trim(), r = Dt(n);
    return r ? Promise.resolve(r) : new Promise((i, s) => {
      const d = Date.now(), c = () => {
        const g = Dt(n);
        if (g) {
          i(g);
          return;
        }
        if (Date.now() - d >= t) {
          s(/* @__PURE__ */ new Error(`Timed out locating review marker for thread ${n}.`));
          return;
        }
        window.requestAnimationFrame(c);
      };
      window.requestAnimationFrame(c);
    });
  }
  async function Dn(e) {
    const t = String(e || "").trim();
    if (!t) return;
    const n = await Rt(t);
    if (!(n !== "page" && n !== "field"))
      try {
        (await Rn(t)).scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center"
        });
      } catch {
      }
  }
  const J = {
    dpr: window.devicePixelRatio || 1,
    pageViewports: /* @__PURE__ */ new Map(),
    getPageMetadata(e) {
      const t = u.viewer.pages?.find((r) => r.page === e);
      if (t) return {
        width: t.width,
        height: t.height,
        rotation: t.rotation || 0
      };
      const n = this.pageViewports.get(e);
      return n ? {
        width: n.width,
        height: n.height,
        rotation: n.rotation || 0
      } : {
        width: 612,
        height: 792,
        rotation: 0
      };
    },
    setPageViewport(e, t) {
      this.pageViewports.set(e, {
        width: t.width,
        height: t.height,
        rotation: t.rotation || 0
      });
    },
    pageToScreen(e, t) {
      const n = e.page, r = this.getPageMetadata(n), i = t.offsetWidth, s = t.offsetHeight, d = e.pageWidth || r.width, c = e.pageHeight || r.height, g = i / d, p = s / c;
      let m = e.posX || 0, _ = e.posY || 0;
      return u.viewer.origin === "bottom-left" && (_ = c - _ - (e.height || 30)), {
        left: m * g,
        top: _ * p,
        width: (e.width || 150) * g,
        height: (e.height || 30) * p,
        _debug: {
          sourceX: m,
          sourceY: _,
          sourceWidth: e.width,
          sourceHeight: e.height,
          pageWidth: d,
          pageHeight: c,
          scaleX: g,
          scaleY: p,
          zoom: a.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    getOverlayStyles(e, t) {
      const n = this.pageToScreen(e, t);
      return {
        left: `${Math.round(n.left)}px`,
        top: `${Math.round(n.top)}px`,
        width: `${Math.round(n.width)}px`,
        height: `${Math.round(n.height)}px`,
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    },
    screenToPagePoint(e, t, n, r) {
      const i = this.getPageMetadata(e), s = t.getBoundingClientRect();
      if (!s.width || !s.height) return null;
      const d = Math.min(Math.max(n - s.left, 0), s.width), c = Math.min(Math.max(r - s.top, 0), s.height), g = i.width || s.width, p = i.height || s.height, m = g / s.width, _ = p / s.height;
      let y = d * m, T = c * _;
      return u.viewer.origin === "bottom-left" && (T = p - T), {
        page_number: Number(e || 1) || 1,
        anchor_x: Math.round(y * 100) / 100,
        anchor_y: Math.round(T * 100) / 100
      };
    }
  }, Fn = {
    async requestUploadBootstrap(e, t, n, r) {
      const i = await fetch(`${u.apiBasePath}/signature-upload/${u.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          field_instance_id: e,
          sha256: t,
          content_type: n,
          size_bytes: r
        })
      });
      if (!i.ok) throw await z(i, "Failed to get upload contract");
      const s = await i.json(), d = s?.contract || s;
      if (!d || typeof d != "object" || !d.upload_url) throw new Error("Invalid upload contract response");
      return d;
    },
    async uploadToSignedUrl(e, t) {
      const n = new URL(e.upload_url, window.location.origin);
      e.upload_token && n.searchParams.set("upload_token", String(e.upload_token)), e.object_key && n.searchParams.set("object_key", String(e.object_key));
      const r = { "Content-Type": e.content_type || "image/png" };
      e.headers && Object.entries(e.headers).forEach(([s, d]) => {
        const c = String(s).toLowerCase();
        c === "x-esign-upload-token" || c === "x-esign-upload-key" || (r[s] = String(d));
      });
      const i = await fetch(n.toString(), {
        method: e.method || "PUT",
        headers: r,
        body: t,
        credentials: "omit"
      });
      if (!i.ok) throw await z(i, `Upload failed: ${i.status} ${i.statusText}`);
      return !0;
    },
    dataUrlToBlob(e) {
      const [t, n] = e.split(","), r = t.match(/data:([^;]+)/), i = r ? r[1] : "image/png", s = atob(n), d = new Uint8Array(s.length);
      for (let c = 0; c < s.length; c++) d[c] = s.charCodeAt(c);
      return new Blob([d], { type: i });
    },
    async uploadDrawnSignature(e, t) {
      const n = this.dataUrlToBlob(t), r = n.size, i = "image/png", s = await Yn(n), d = await this.requestUploadBootstrap(e, s, i, r);
      return await this.uploadToSignedUrl(d, n), {
        uploadToken: d.upload_token,
        objectKey: d.object_key,
        sha256: d.sha256,
        contentType: d.content_type
      };
    }
  }, Xe = {
    endpoint(e, t = "") {
      const n = encodeURIComponent(e), r = t ? `/${encodeURIComponent(t)}` : "";
      return `${u.apiBasePath}/signatures/${n}${r}`;
    },
    async list(e) {
      const t = new URL(this.endpoint(u.token), window.location.origin);
      t.searchParams.set("type", e);
      const n = await fetch(t.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!n.ok) {
        const i = await n.json().catch(() => ({}));
        throw new Error(i?.error?.message || "Failed to load saved signatures");
      }
      const r = await n.json();
      return Array.isArray(r?.signatures) ? r.signatures : [];
    },
    async save(e, t, n = "") {
      const r = await fetch(this.endpoint(u.token), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify({
          type: e,
          label: n,
          data_url: t
        })
      });
      if (!r.ok) {
        const i = await r.json().catch(() => ({})), s = new Error(i?.error?.message || "Failed to save signature");
        throw s.code = i?.error?.code || "", s;
      }
      return (await r.json())?.signature || null;
    },
    async delete(e) {
      const t = await fetch(this.endpoint(u.token, e), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!t.ok) {
        const n = await t.json().catch(() => ({}));
        throw new Error(n?.error?.message || "Failed to delete signature");
      }
    }
  };
  function ce(e) {
    const t = a.fieldState.get(e);
    return t && t.type === "initials" ? "initials" : "signature";
  }
  function Ee(e) {
    return a.savedSignaturesByType.get(e) || [];
  }
  async function Nn(e, t = !1) {
    const n = ce(e);
    if (!t && a.savedSignaturesByType.has(n)) {
      Te(e);
      return;
    }
    const r = await Xe.list(n);
    a.savedSignaturesByType.set(n, r), Te(e);
  }
  function Te(e) {
    const t = Ee(ce(e)), n = document.getElementById("sig-saved-list");
    if (n) {
      if (!t.length) {
        n.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      n.innerHTML = t.map((r) => {
        const i = E(String(r?.thumbnail_data_url || r?.data_url || "")), s = E(String(r?.label || "Saved signature")), d = E(String(r?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${i}" alt="${s}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${s}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${E(e)}" data-signature-id="${d}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${E(e)}" data-signature-id="${d}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function Un(e) {
    const t = a.signatureCanvases.get(e), n = ce(e);
    if (!t || !it(e)) throw new Error(`Please add your ${n === "initials" ? "initials" : "signature"} first`);
    const r = t.canvas.toDataURL("image/png"), i = await Xe.save(n, r, n === "initials" ? "Initials" : "Signature");
    if (!i) throw new Error("Failed to save signature");
    const s = Ee(n);
    s.unshift(i), a.savedSignaturesByType.set(n, s), Te(e), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function qn(e, t) {
    const n = Ee(ce(e)).find((i) => String(i?.id || "") === String(t));
    if (!n) return;
    requestAnimationFrame(() => $e(e)), await Ft(e);
    const r = String(n.data_url || n.thumbnail_data_url || "").trim();
    r && (await rt(e, r, { clearStrokes: !0 }), Ve(e, r), B(), Ae("draw", e), v("Saved signature selected."));
  }
  async function zn(e, t) {
    const n = ce(e);
    await Xe.delete(t);
    const r = Ee(n).filter((i) => String(i?.id || "") !== String(t));
    a.savedSignaturesByType.set(n, r), Te(e);
  }
  function Le(e) {
    const t = String(e?.code || "").trim(), n = String(e?.message || "Unable to update saved signatures"), r = t === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : n;
    window.toastManager && window.toastManager.error(r), v(r, "assertive");
  }
  async function Ft(e, t = 8) {
    for (let n = 0; n < t; n++) {
      if (a.signatureCanvases.has(e)) return !0;
      await new Promise((r) => setTimeout(r, 40)), $e(e);
    }
    return !1;
  }
  async function Vn(e, t) {
    const n = String(t?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(n)) throw new Error("Only PNG and JPEG images are supported");
    if (t.size > 2 * 1024 * 1024) throw new Error("Image file is too large");
    requestAnimationFrame(() => $e(e)), await Ft(e);
    const r = a.signatureCanvases.get(e);
    if (!r) throw new Error("Signature canvas is not ready");
    const i = await jn(t), s = n === "image/png" ? i : await On(i, r.drawWidth, r.drawHeight);
    if (Hn(s) > an) throw new Error(`Image exceeds ${Math.round(an / 1024)}KB limit after conversion`);
    await rt(e, s, { clearStrokes: !0 }), Ve(e, s), B();
    const d = document.getElementById("sig-upload-preview-wrap"), c = document.getElementById("sig-upload-preview");
    d && d.classList.remove("hidden"), c && c.setAttribute("src", s), v("Signature image uploaded. You can now insert it.");
  }
  function jn(e) {
    return new Promise((t, n) => {
      const r = new FileReader();
      r.onload = () => t(String(r.result || "")), r.onerror = () => n(/* @__PURE__ */ new Error("Unable to read image file")), r.readAsDataURL(e);
    });
  }
  function Hn(e) {
    const t = String(e || "").split(",");
    if (t.length < 2) return 0;
    const n = t[1] || "", r = (n.match(/=+$/) || [""])[0].length;
    return Math.floor(n.length * 3 / 4) - r;
  }
  async function On(e, t, n) {
    return await new Promise((r, i) => {
      const s = new Image();
      s.onload = () => {
        const d = document.createElement("canvas"), c = Math.max(1, Math.round(Number(t) || 600)), g = Math.max(1, Math.round(Number(n) || 160));
        d.width = c, d.height = g;
        const p = d.getContext("2d");
        if (!p) {
          i(/* @__PURE__ */ new Error("Unable to process image"));
          return;
        }
        p.clearRect(0, 0, c, g);
        const m = Math.min(c / s.width, g / s.height), _ = s.width * m, y = s.height * m, T = (c - _) / 2, h = (g - y) / 2;
        p.drawImage(s, T, h, _, y), r(d.toDataURL("image/png"));
      }, s.onerror = () => i(/* @__PURE__ */ new Error("Unable to decode image file")), s.src = e;
    });
  }
  async function Yn(e) {
    if (window.crypto && window.crypto.subtle) {
      const t = await e.arrayBuffer(), n = await window.crypto.subtle.digest("SHA-256", t);
      return Array.from(new Uint8Array(n)).map((r) => r.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function Wn() {
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const n = t.closest("[data-esign-action]");
      if (!n) return;
      const r = n.getAttribute("data-esign-action");
      if (r === "highlight-review-marker") {
        const i = t.closest("button, textarea, input, select, label, a, [data-esign-action]");
        if (i && i !== n) return;
      }
      switch (r) {
        case "prev-page":
          ur();
          break;
        case "next-page":
          gr();
          break;
        case "zoom-out":
          pr();
          break;
        case "zoom-in":
          mr();
          break;
        case "fit-width":
          fr();
          break;
        case "download-document":
          Nr();
          break;
        case "show-consent-modal":
          Qt();
          break;
        case "activate-field": {
          const i = n.getAttribute("data-field-id");
          i && Ie(i);
          break;
        }
        case "submit-signature":
          Mr();
          break;
        case "show-decline-modal":
          Rr();
          break;
        case "close-field-editor":
          ot();
          break;
        case "save-field-editor":
          Tr();
          break;
        case "hide-consent-modal":
          ct();
          break;
        case "accept-consent":
          Br();
          break;
        case "hide-decline-modal":
          Zt();
          break;
        case "confirm-decline":
          Dr();
          break;
        case "approve-review":
          Mt("approve");
          break;
        case "request-review-changes":
          Mt("request-changes");
          break;
        case "hide-review-decision-modal":
          Ke();
          break;
        case "confirm-review-decision":
          Mn().catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to complete review action"), v(`Error: ${i?.message || "Unable to complete review action"}`, "assertive");
          });
          break;
        case "create-review-thread":
          An().catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to add comment"), v(`Error: ${i?.message || "Unable to add comment"}`, "assertive");
          });
          break;
        case "reply-review-thread":
          $n(n.getAttribute("data-thread-id"), n.getAttribute("data-reply-input-id")).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to reply to thread"), v(`Error: ${i?.message || "Unable to reply to thread"}`, "assertive");
          });
          break;
        case "resolve-review-thread":
          Bt(n.getAttribute("data-thread-id"), !0).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to resolve thread"), v(`Error: ${i?.message || "Unable to resolve thread"}`, "assertive");
          });
          break;
        case "reopen-review-thread":
          Bt(n.getAttribute("data-thread-id"), !1).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to reopen thread"), v(`Error: ${i?.message || "Unable to reopen thread"}`, "assertive");
          });
          break;
        case "go-review-thread-anchor":
          Rt(n.getAttribute("data-thread-id")).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to navigate to comment anchor"), v(`Error: ${i?.message || "Unable to navigate to comment anchor"}`, "assertive");
          });
          break;
        case "go-review-thread":
          In(n.getAttribute("data-thread-id"));
          break;
        case "highlight-review-marker":
          Dn(n.getAttribute("data-review-thread-id")).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to locate comment marker"), v(`Error: ${i?.message || "Unable to locate comment marker"}`, "assertive");
          });
          break;
        case "filter-review-threads":
          Pn(n.getAttribute("data-filter") || "all");
          break;
        case "page-review-threads":
          kn(parseInt(n.getAttribute("data-page") || "1", 10));
          break;
        case "toggle-reply-composer":
          At(n.getAttribute("data-composer-id"), !0);
          break;
        case "cancel-reply":
          At(n.getAttribute("data-composer-id"), !1);
          break;
        case "pick-review-anchor-point":
          ee() === "page" && xn(!0);
          break;
        case "clear-review-anchor-point":
          a.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), yn(null), v("Pinned comment location cleared.");
          break;
        case "submit-inline-comment":
          Cn().catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to add comment"), v(`Error: ${i?.message || "Unable to add comment"}`, "assertive");
          });
          break;
        case "cancel-inline-comment":
          se();
          break;
        case "retry-load-pdf":
          Pe();
          break;
        case "signature-tab": {
          const i = n.getAttribute("data-tab") || "draw", s = n.getAttribute("data-field-id");
          s && Ae(i, s);
          break;
        }
        case "clear-signature-canvas": {
          const i = n.getAttribute("data-field-id");
          i && _r(i);
          break;
        }
        case "undo-signature-canvas": {
          const i = n.getAttribute("data-field-id");
          i && xr(i);
          break;
        }
        case "redo-signature-canvas": {
          const i = n.getAttribute("data-field-id");
          i && Sr(i);
          break;
        }
        case "save-current-signature-library": {
          const i = n.getAttribute("data-field-id");
          i && Un(i).catch(Le);
          break;
        }
        case "select-saved-signature": {
          const i = n.getAttribute("data-field-id"), s = n.getAttribute("data-signature-id");
          i && s && qn(i, s).catch(Le);
          break;
        }
        case "delete-saved-signature": {
          const i = n.getAttribute("data-field-id"), s = n.getAttribute("data-signature-id");
          i && s && zn(i, s).catch(Le);
          break;
        }
        case "clear-signer-profile":
          qt().catch(() => {
          });
          break;
        case "switch-panel-tab": {
          const i = n.getAttribute("data-tab");
          (i === "sign" || i === "review") && We(i);
          break;
        }
        case "debug-toggle-panel":
          G.togglePanel();
          break;
        case "debug-copy-session":
          G.copySessionInfo();
          break;
        case "debug-clear-cache":
          G.clearCache();
          break;
        case "debug-show-telemetry":
          G.showTelemetry();
          break;
        case "debug-reload-viewer":
          G.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (e) => {
      const t = e.target;
      if (t instanceof HTMLInputElement) {
        if (t.matches("#sig-upload-input")) {
          const n = t.getAttribute("data-field-id"), r = t.files?.[0];
          if (!n || !r) return;
          Vn(n, r).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (t.matches("#field-checkbox-input")) {
          const n = t.getAttribute("data-field-id") || a.activeFieldId;
          if (!n) return;
          bt(n, t.checked), B();
        }
      }
    }), document.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) && !(t instanceof HTMLTextAreaElement)) return;
      const n = t.getAttribute("data-field-id") || a.activeFieldId;
      if (n) {
        if (t.matches("#sig-type-input")) {
          nt(n, t.value || "", { syncOverlay: !0 });
          return;
        }
        if (t.matches("#field-text-input")) {
          vt(n, t.value || ""), B();
          return;
        }
        t.matches("#field-checkbox-input") && t instanceof HTMLInputElement && (bt(n, t.checked), B());
      }
    });
  }
  ht(async () => {
    Wn(), a.isLowMemory = ar(), Gn(), Qn(), await er(), Zn(), H(), Tn(), Ln(), de(), ir(), Gt(), V(), await Pe(), le(), document.addEventListener("visibilitychange", Kn), "memory" in navigator && Xn(), G.init();
  });
  function Kn() {
    document.hidden && Nt();
  }
  function Nt() {
    const e = a.isLowMemory ? 1 : 2;
    for (; a.renderedPages.size > e; ) {
      let t = null, n = 1 / 0;
      if (a.renderedPages.forEach((r, i) => {
        i !== a.currentPage && r.timestamp < n && (t = i, n = r.timestamp);
      }), t !== null) a.renderedPages.delete(t);
      else break;
    }
  }
  function Xn() {
    setInterval(() => {
      navigator.memory && navigator.memory.usedJSHeapSize / navigator.memory.totalJSHeapSize > 0.8 && (a.isLowMemory = !0, Nt());
    }, 3e4);
  }
  function Jn(e) {
    switch (String(e || "").trim().toLowerCase()) {
      case "preview_fallback_forced":
        return "Preview is running in safe mode due to compatibility safeguards. You can continue signing.";
      case "source_import_failed":
      case "source_not_pdf":
        return "This PDF preview is degraded due to source compatibility. You can continue signing.";
      case "normalized_unavailable":
      case "source_unavailable":
        return "A fallback preview is being used because the source document is temporarily unavailable.";
      default:
        return "This signing session is using a degraded preview mode for compatibility.";
    }
  }
  function Gn() {
    const e = document.getElementById("pdf-compatibility-banner"), t = document.getElementById("pdf-compatibility-message"), n = document.getElementById("pdf-compatibility-title");
    if (!e || !t || !n) return;
    const r = String(u.viewer.compatibilityTier || "").trim().toLowerCase(), i = String(u.viewer.compatibilityReason || "").trim().toLowerCase();
    if (r !== "limited") {
      e.classList.add("hidden");
      return;
    }
    n.textContent = "Preview Compatibility Notice", t.textContent = String(u.viewer.compatibilityMessage || "").trim() || Jn(i), e.classList.remove("hidden"), b.trackDegradedMode("pdf_preview_compatibility", {
      tier: r,
      reason: i
    });
  }
  function Qn() {
    const e = document.getElementById("stage-state-banner"), t = document.getElementById("stage-state-icon"), n = document.getElementById("stage-state-title"), r = document.getElementById("stage-state-message"), i = document.getElementById("stage-state-meta");
    if (!e || !t || !n || !r || !i) return;
    if (Se()) {
      const _ = mn();
      let y = {
        hidden: !1,
        bgClass: "bg-slate-50",
        borderClass: "border-slate-200",
        iconClass: "iconoir-eye text-slate-600",
        titleClass: "text-slate-900",
        messageClass: "text-slate-800",
        title: "Document Preview",
        message: "This document is available in read-only mode.",
        badges: []
      };
      switch (_) {
        case "sender_review":
          y = {
            hidden: !1,
            bgClass: "bg-blue-50",
            borderClass: "border-blue-200",
            iconClass: "iconoir-chat-bubble text-blue-600",
            titleClass: "text-blue-900",
            messageClass: "text-blue-800",
            title: "Review & Comment",
            message: "Review the current document state and collaborate through shared comments.",
            badges: [{
              icon: "iconoir-chat-bubble",
              text: "Shared comments",
              variant: "blue"
            }]
          };
          break;
        case "sender_progress":
          y = {
            hidden: !1,
            bgClass: "bg-amber-50",
            borderClass: "border-amber-200",
            iconClass: "iconoir-hourglass text-amber-600",
            titleClass: "text-amber-900",
            messageClass: "text-amber-800",
            title: "Signing In Progress",
            message: "Signing is underway. You can monitor progress and participate in shared review threads.",
            badges: [{
              icon: "iconoir-clock",
              text: "Read-only document",
              variant: "amber"
            }]
          };
          break;
        case "sender_complete":
          y = {
            hidden: !1,
            bgClass: "bg-green-50",
            borderClass: "border-green-200",
            iconClass: "iconoir-check-circle text-green-600",
            titleClass: "text-green-900",
            messageClass: "text-green-800",
            title: "Completed Document",
            message: "This agreement is complete. The document is read-only.",
            badges: [{
              icon: "iconoir-check",
              text: "Completed",
              variant: "green"
            }]
          };
          break;
      }
      e.classList.remove("hidden"), e.className = `mb-4 rounded-lg border p-4 ${y.bgClass} ${y.borderClass}`, t.className = `${y.iconClass} mt-0.5`, n.className = `text-sm font-semibold ${y.titleClass}`, n.textContent = y.title, r.className = `text-xs ${y.messageClass} mt-1`, r.textContent = y.message, i.innerHTML = "", y.badges.forEach((T) => {
        const h = document.createElement("span"), S = {
          blue: "bg-blue-100 text-blue-800",
          amber: "bg-amber-100 text-amber-800",
          green: "bg-green-100 text-green-800",
          slate: "bg-slate-100 text-slate-800"
        };
        h.className = `inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${S[T.variant] || S.slate}`, h.innerHTML = `<i class="${T.icon} mr-1"></i>${T.text}`, i.appendChild(h);
      });
      return;
    }
    const s = u.signerState || "active", d = u.recipientStage || 1, c = u.activeStage || 1, g = u.activeRecipientIds || [], p = u.waitingForRecipientIds || [];
    let m = {
      hidden: !1,
      bgClass: "bg-green-50",
      borderClass: "border-green-200",
      iconClass: "iconoir-check-circle text-green-600",
      titleClass: "text-green-900",
      messageClass: "text-green-800",
      title: "It's your turn to sign",
      message: "Please complete and sign the document below.",
      badges: []
    };
    switch (s) {
      case "waiting":
        m = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: d > c ? `You are in signing stage ${d}. Stage ${c} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [{
            icon: "iconoir-clock",
            text: "Your turn is coming",
            variant: "blue"
          }]
        }, p.length > 0 && m.badges.push({
          icon: "iconoir-group",
          text: `${p.length} signer(s) ahead`,
          variant: "blue"
        });
        break;
      case "blocked":
        m = {
          hidden: !1,
          bgClass: "bg-amber-50",
          borderClass: "border-amber-200",
          iconClass: "iconoir-warning-triangle text-amber-600",
          titleClass: "text-amber-900",
          messageClass: "text-amber-800",
          title: "Signing Not Available",
          message: "This agreement cannot be signed at this time. It may have been completed, voided, or is awaiting action from another party.",
          badges: [{
            icon: "iconoir-lock",
            text: "Access restricted",
            variant: "amber"
          }]
        };
        break;
      case "completed":
        m = {
          hidden: !1,
          bgClass: "bg-green-50",
          borderClass: "border-green-200",
          iconClass: "iconoir-check-circle text-green-600",
          titleClass: "text-green-900",
          messageClass: "text-green-800",
          title: "Signing Complete",
          message: "You have already completed signing this document.",
          badges: [{
            icon: "iconoir-check",
            text: "Signed",
            variant: "green"
          }]
        };
        break;
      default:
        g.length > 1 ? (m.message = `You and ${g.length - 1} other signer(s) can sign now.`, m.badges = [{
          icon: "iconoir-users",
          text: `Stage ${c} active`,
          variant: "green"
        }]) : d > 1 ? m.badges = [{
          icon: "iconoir-check-circle",
          text: `Stage ${d}`,
          variant: "green"
        }] : m.hidden = !0;
        break;
    }
    if (m.hidden) {
      e.classList.add("hidden");
      return;
    }
    e.classList.remove("hidden"), e.className = `mb-4 rounded-lg border p-4 ${m.bgClass} ${m.borderClass}`, t.className = `${m.iconClass} mt-0.5`, n.className = `text-sm font-semibold ${m.titleClass}`, n.textContent = m.title, r.className = `text-xs ${m.messageClass} mt-1`, r.textContent = m.message, i.innerHTML = "", m.badges.forEach((_) => {
      const y = document.createElement("span"), T = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      y.className = `inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${T[_.variant] || T.blue}`, y.innerHTML = `<i class="${_.icon} mr-1"></i>${_.text}`, i.appendChild(y);
    });
  }
  function Zn() {
    u.fields.forEach((e) => {
      let t = null, n = !1;
      if (e.type === "checkbox")
        t = e.value_bool || !1, n = t;
      else if (e.type === "date_signed")
        t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], n = !0;
      else {
        const r = String(e.value_text || "");
        t = r || tr(e), n = !!r;
      }
      a.fieldState.set(e.id, {
        id: e.id,
        type: e.type,
        page: e.page || 1,
        required: e.required,
        value: t,
        completed: n,
        hasError: !1,
        lastError: null,
        posX: e.pos_x || 0,
        posY: e.pos_y || 0,
        width: e.width || 150,
        height: e.height || 30,
        tabIndex: Number(e.tab_index || 0) || 0
      });
    });
  }
  async function er() {
    try {
      const e = await P.load(a.profileKey);
      e && (a.profileData = e, a.profileRemember = e.remember !== !1);
    } catch {
    }
  }
  function tr(e) {
    const t = a.profileData;
    if (!t) return "";
    const n = String(e?.type || "").trim();
    return n === "name" ? D(t.fullName || "") : n === "initials" ? D(t.initials || "") || _e(t.fullName || u.recipientName || "") : n === "signature" ? D(t.typedSignature || "") : "";
  }
  function nr(e) {
    return !u.profile.persistDrawnSignature || !a.profileData ? "" : e?.type === "initials" && String(a.profileData.drawnInitialsDataUrl || "").trim() || String(a.profileData.drawnSignatureDataUrl || "").trim();
  }
  function rr(e) {
    const t = D(e?.value || "");
    return t || (a.profileData ? e?.type === "initials" ? D(a.profileData.initials || "") || _e(a.profileData.fullName || u.recipientName || "") : e?.type === "signature" ? D(a.profileData.typedSignature || "") : "" : "");
  }
  function Ut() {
    const e = document.getElementById("remember-profile-input");
    return e instanceof HTMLInputElement ? !!e.checked : a.profileRemember;
  }
  async function qt(e = !1) {
    let t = null;
    try {
      await P.clear(a.profileKey);
    } catch (n) {
      t = n;
    } finally {
      a.profileData = null, a.profileRemember = u.profile.rememberByDefault;
    }
    if (t) {
      if (!e && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !e) throw t;
      return;
    }
    !e && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function zt(e, t = {}) {
    const n = Ut();
    if (a.profileRemember = n, !n) {
      await qt(!0);
      return;
    }
    if (!e) return;
    const r = { remember: !0 }, i = String(e.type || "");
    if (i === "name" && typeof e.value == "string") {
      const s = D(e.value);
      s && (r.fullName = s, (a.profileData?.initials || "").trim() || (r.initials = _e(s)));
    }
    if (i === "initials") {
      if (t.signatureType === "drawn" && u.profile.persistDrawnSignature && typeof t.signatureDataUrl == "string") r.drawnInitialsDataUrl = t.signatureDataUrl;
      else if (typeof e.value == "string") {
        const s = D(e.value);
        s && (r.initials = s);
      }
    }
    if (i === "signature") {
      if (t.signatureType === "drawn" && u.profile.persistDrawnSignature && typeof t.signatureDataUrl == "string") r.drawnSignatureDataUrl = t.signatureDataUrl;
      else if (typeof e.value == "string") {
        const s = D(e.value);
        s && (r.typedSignature = s);
      }
    }
    if (!(Object.keys(r).length === 1 && r.remember === !0))
      try {
        a.profileData = await P.save(a.profileKey, r);
      } catch {
      }
  }
  function ir() {
    const e = document.getElementById("consent-checkbox"), t = document.getElementById("consent-accept-btn");
    e && t && e.addEventListener("change", function() {
      t.disabled = !this.checked;
    });
  }
  function ar() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function Je() {
    const e = a.isLowMemory ? 3 : a.maxCachedPages;
    if (a.renderedPages.size <= e) return;
    const t = [];
    for (a.renderedPages.forEach((n, r) => {
      const i = Math.abs(r - a.currentPage);
      t.push({
        pageNum: r,
        distance: i
      });
    }), t.sort((n, r) => r.distance - n.distance); a.renderedPages.size > e && t.length > 0; ) {
      const n = t.shift();
      n && n.pageNum !== a.currentPage && a.renderedPages.delete(n.pageNum);
    }
  }
  function Vt(e) {
    if (a.isLowMemory) return;
    const t = [];
    e > 1 && t.push(e - 1), e < u.pageCount && t.push(e + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      t.forEach(async (n) => {
        !a.renderedPages.has(n) && !a.pageRendering && await or(n);
      });
    }, { timeout: 2e3 });
  }
  async function or(e) {
    if (!(!a.pdfDoc || a.renderedPages.has(e)))
      try {
        const t = await a.pdfDoc.getPage(e), n = a.zoomLevel, r = t.getViewport({ scale: n * window.devicePixelRatio }), i = document.createElement("canvas"), s = i.getContext("2d");
        i.width = r.width, i.height = r.height;
        const d = {
          canvasContext: s,
          viewport: r
        };
        await t.render(d).promise, a.renderedPages.set(e, {
          canvas: i,
          scale: n,
          timestamp: Date.now()
        }), Je();
      } catch (t) {
        console.warn("Preload failed for page", e, t);
      }
  }
  function sr() {
    const e = window.devicePixelRatio || 1;
    return a.isLowMemory ? Math.min(e, 1.5) : Math.min(e, 2);
  }
  async function Pe() {
    const e = document.getElementById("pdf-loading"), t = Date.now();
    let n = "";
    try {
      const r = await fetch(_t());
      if (!r.ok) throw new Error("Failed to load document");
      if (n = Ct((await r.json()).assets || {}), !n) throw new Error("Document preview is not available yet. The document may still be processing.");
      a.pdfDoc = await Hr({
        url: n,
        surface: "signer-review",
        documentId: u.agreementId
      }).promise, u.pageCount = a.pdfDoc.numPages, document.getElementById("page-count").textContent = a.pdfDoc.numPages, await Ge(1), Qe(), b.trackViewerLoad(!0, Date.now() - t), b.trackPageView(1);
    } catch (r) {
      const i = jr(r, {
        surface: "signer-review",
        documentId: u.agreementId,
        url: typeof n == "string" ? n : null
      });
      b.trackViewerLoad(!1, Date.now() - t, i.rawMessage), e && (e.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Fr();
    }
  }
  async function Ge(e) {
    if (!a.pdfDoc) return;
    const t = a.renderedPages.get(e);
    if (t && t.scale === a.zoomLevel) {
      dr(t, e), a.currentPage = e, document.getElementById("current-page").textContent = e, Qe(), Ye(), le(), we(e), Vt(e);
      return;
    }
    a.pageRendering = !0;
    try {
      const n = await a.pdfDoc.getPage(e), r = a.zoomLevel, i = sr(), s = n.getViewport({ scale: r * i }), d = n.getViewport({ scale: 1 });
      J.setPageViewport(e, {
        width: d.width,
        height: d.height,
        rotation: d.rotation || 0
      });
      const c = document.getElementById("pdf-page-1");
      c.innerHTML = "";
      const g = document.createElement("canvas"), p = g.getContext("2d");
      g.height = s.height, g.width = s.width, g.style.width = `${s.width / i}px`, g.style.height = `${s.height / i}px`, c.appendChild(g);
      const m = document.getElementById("pdf-container");
      m.style.width = `${s.width / i}px`;
      const _ = {
        canvasContext: p,
        viewport: s
      };
      await n.render(_).promise, a.renderedPages.set(e, {
        canvas: g.cloneNode(!0),
        scale: r,
        timestamp: Date.now(),
        displayWidth: s.width / i,
        displayHeight: s.height / i
      }), a.renderedPages.get(e).canvas.getContext("2d").drawImage(g, 0, 0), Je(), a.currentPage = e, document.getElementById("current-page").textContent = e, Qe(), Ye(), le(), we(e), b.trackPageView(e), Vt(e);
    } catch (n) {
      we(e, n instanceof Error ? n : /* @__PURE__ */ new Error("Page render failed.")), console.error("Page render error:", n);
    } finally {
      if (a.pageRendering = !1, a.pageNumPending !== null) {
        const n = a.pageNumPending;
        a.pageNumPending = null, await Ge(n);
      }
    }
  }
  function dr(e, t) {
    const n = document.getElementById("pdf-page-1");
    n.innerHTML = "";
    const r = document.createElement("canvas");
    r.width = e.canvas.width, r.height = e.canvas.height, r.style.width = `${e.displayWidth}px`, r.style.height = `${e.displayHeight}px`, r.getContext("2d").drawImage(e.canvas, 0, 0), n.appendChild(r);
    const i = document.getElementById("pdf-container");
    i.style.width = `${e.displayWidth}px`;
  }
  function te(e) {
    a.pageRendering ? a.pageNumPending = e : Ge(e);
  }
  function cr(e) {
    return typeof e.previewValueText == "string" && e.previewValueText.trim() !== "" ? D(e.previewValueText) : typeof e.value == "string" && e.value.trim() !== "" ? D(e.value) : "";
  }
  function jt(e, t, n, r = !1) {
    const i = document.createElement("img");
    i.className = "field-overlay-preview", i.src = t, i.alt = n, e.appendChild(i), e.classList.add("has-preview"), r && e.classList.add("draft-preview");
  }
  function Ht(e, t, n = !1, r = !1) {
    const i = document.createElement("span");
    i.className = "field-overlay-value", n && i.classList.add("font-signature"), i.textContent = t, e.appendChild(i), e.classList.add("has-value"), r && e.classList.add("draft-preview");
  }
  function Ot(e, t) {
    const n = document.createElement("span");
    n.className = "field-overlay-label", n.textContent = t, e.appendChild(n);
  }
  function lr(e, t) {
    if (!t) return null;
    const n = e?.thread || {}, r = String(n.anchor_type || "").trim();
    if (r === "page") {
      const i = Number(n.page_number || 0) || 0, s = (Number(n.anchor_x || 0) || 0) > 0 || (Number(n.anchor_y || 0) || 0) > 0;
      if (i !== Number(a.currentPage || 0) || !s) return null;
      const d = J.pageToScreen({
        page: i,
        posX: Number(n.anchor_x || 0) || 0,
        posY: Number(n.anchor_y || 0) || 0,
        width: 0,
        height: 0
      }, t);
      return {
        left: d.left,
        top: d.top
      };
    }
    if (r === "field" && n.field_id) {
      const i = a.fieldState.get(String(n.field_id || "").trim());
      if (!i || Number(i.page || 0) !== Number(a.currentPage || 0) || i.posX == null || i.posY == null) return null;
      const s = J.pageToScreen({
        page: Number(i.page || a.currentPage || 1) || 1,
        posX: (Number(i.posX || 0) || 0) + (Number(i.width || 0) || 0) / 2,
        posY: Number(i.posY || 0) || 0,
        width: 0,
        height: 0
      }, t);
      return {
        left: s.left,
        top: s.top
      };
    }
    return null;
  }
  function Yt(e, t) {
    if ((Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : []).forEach((n) => {
      const r = n?.thread || {}, i = lr(n, t);
      if (!i) return;
      const s = He(r.created_by_type, r.created_by_id), d = un(), c = document.createElement(d ? "button" : "div");
      d && c instanceof HTMLButtonElement && (c.type = "button"), c.className = "review-thread-marker", String(r.status || "").trim() === "resolved" && c.classList.add("resolved"), String(r.visibility || "shared").trim() === "internal" && c.classList.add("internal"), String(r.id || "").trim() === String(a.highlightedReviewThreadID || "").trim() && c.classList.add("active"), d ? c.dataset.esignAction = "go-review-thread" : (c.setAttribute("aria-hidden", "true"), c.style.pointerEvents = "none"), c.dataset.threadId = String(r.id || "").trim(), c.style.left = `${Math.round(i.left)}px`, c.style.top = `${Math.round(i.top)}px`, c.style.background = s.color, c.style.borderColor = s.color, d && (c.title = `${mt(n)} comment by ${s.name}`, c.setAttribute("aria-label", `${mt(n)} comment by ${s.name}`)), c.textContent = s.initials, e.appendChild(c);
    }), ee() === "page" && a.reviewAnchorPointDraft && Number(a.reviewAnchorPointDraft.page_number || 0) === Number(a.currentPage || 0)) {
      const n = J.pageToScreen({
        page: Number(a.reviewAnchorPointDraft.page_number || a.currentPage || 1) || 1,
        posX: Number(a.reviewAnchorPointDraft.anchor_x || 0) || 0,
        posY: Number(a.reviewAnchorPointDraft.anchor_y || 0) || 0,
        width: 0,
        height: 0
      }, t), r = document.createElement("div");
      r.className = "review-thread-marker active", r.style.left = `${Math.round(n.left)}px`, r.style.top = `${Math.round(n.top)}px`, r.setAttribute("aria-hidden", "true"), r.textContent = "+", e.appendChild(r);
    }
  }
  function le() {
    const e = document.getElementById("field-overlays");
    if (!e) return;
    e.innerHTML = "", e.style.pointerEvents = "auto";
    const t = document.getElementById("pdf-container");
    if (t) {
      if (!F()) {
        je() && Yt(e, t);
        return;
      }
      a.fieldState.forEach((n, r) => {
        if (n.page !== a.currentPage) return;
        const i = document.createElement("div");
        if (i.className = "field-overlay", i.dataset.fieldId = r, n.required && i.classList.add("required"), n.completed && i.classList.add("completed"), a.activeFieldId === r && i.classList.add("active"), n.posX != null && n.posY != null && n.width != null && n.height != null) {
          const m = J.getOverlayStyles(n, t);
          i.style.left = m.left, i.style.top = m.top, i.style.width = m.width, i.style.height = m.height, i.style.transform = m.transform, G.enabled && (i.dataset.debugCoords = JSON.stringify(J.pageToScreen(n, t)._debug));
        } else {
          const m = Array.from(a.fieldState.keys()).indexOf(r);
          i.style.left = "10px", i.style.top = `${100 + m * 50}px`, i.style.width = "150px", i.style.height = "30px";
        }
        const s = String(n.previewSignatureUrl || "").trim(), d = String(n.signaturePreviewUrl || "").trim(), c = cr(n), g = n.type === "signature" || n.type === "initials", p = typeof n.previewValueBool == "boolean";
        s ? jt(i, s, ue(n.type), !0) : n.completed && d ? jt(i, d, ue(n.type)) : c ? Ht(i, c, g, typeof n.previewValueText == "string" && n.previewValueText.trim() !== "") : n.type === "checkbox" && (p ? n.previewValueBool : n.value) ? Ht(i, "Checked", !1, p) : Ot(i, ue(n.type)), i.setAttribute("tabindex", "0"), i.setAttribute("role", "button"), i.setAttribute("aria-label", `${ue(n.type)} field${n.required ? ", required" : ""}${n.completed ? ", completed" : ""}`), i.addEventListener("click", () => Ie(r)), i.addEventListener("keydown", (m) => {
          (m.key === "Enter" || m.key === " ") && (m.preventDefault(), Ie(r));
        }), e.appendChild(i);
      }), t && je() && Yt(e, t);
    }
  }
  function ue(e) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[e] || e;
  }
  function ur() {
    a.currentPage <= 1 || te(a.currentPage - 1);
  }
  function gr() {
    a.currentPage >= u.pageCount || te(a.currentPage + 1);
  }
  function ke(e) {
    const t = Number(e || 0) || 0;
    if (t < 1 || t > u.pageCount) return Promise.resolve();
    const n = dn(t);
    return qe(t) || te(t), n;
  }
  function Qe() {
    document.getElementById("prev-page-btn").disabled = a.currentPage <= 1, document.getElementById("next-page-btn").disabled = a.currentPage >= u.pageCount;
  }
  function mr() {
    a.zoomLevel = Math.min(a.zoomLevel + 0.25, 3), Ze(), te(a.currentPage);
  }
  function pr() {
    a.zoomLevel = Math.max(a.zoomLevel - 0.25, 0.5), Ze(), te(a.currentPage);
  }
  function fr() {
    a.zoomLevel = (document.getElementById("viewer-content").offsetWidth - 32) / 612, Ze(), te(a.currentPage);
  }
  function Ze() {
    document.getElementById("zoom-level").textContent = `${Math.round(a.zoomLevel * 100)}%`;
  }
  function Ie(e) {
    if (!F()) {
      v("This review session is read-only for signing fields.");
      return;
    }
    if (!a.hasConsented && u.fields.some((t) => t.id === e && t.type !== "date_signed")) {
      Qt();
      return;
    }
    et(e, { openEditor: !0 });
  }
  function et(e, t = { openEditor: !0 }) {
    const n = a.fieldState.get(e);
    if (n) {
      if (t.openEditor && !F()) {
        tt(e);
        return;
      }
      if (t.openEditor && (a.activeFieldId = e, H()), document.querySelectorAll(".field-list-item").forEach((r) => r.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${e}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((r) => r.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${e}"]`)?.classList.add("active"), n.page !== a.currentPage && ke(n.page), !t.openEditor) {
        tt(e);
        return;
      }
      n.type !== "date_signed" && hr(e);
    }
  }
  function tt(e) {
    document.querySelector(`.field-list-item[data-field-id="${e}"]`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${e}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest"
      });
    });
  }
  function hr(e) {
    const t = a.fieldState.get(e);
    if (!t) return;
    const n = document.getElementById("field-editor-overlay"), r = document.getElementById("field-editor-content"), i = document.getElementById("field-editor-title"), s = document.getElementById("field-editor-legal-disclaimer");
    i.textContent = Wt(t.type), r.innerHTML = vr(t), s?.classList.toggle("hidden", !(t.type === "signature" || t.type === "initials")), (t.type === "signature" || t.type === "initials") && wr(e), n.classList.add("active"), n.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Be(n.querySelector(".field-editor")), v(`Editing ${Wt(t.type)}. Press Escape to cancel.`), setTimeout(() => {
      const d = r.querySelector("input, textarea");
      d ? d.focus() : r.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), q(a.writeCooldownUntil) > 0 && Xt(q(a.writeCooldownUntil));
  }
  function Wt(e) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[e] || "Edit Field";
  }
  function vr(e) {
    const t = br(e.type), n = E(String(e?.id || "")), r = E(String(e?.type || ""));
    if (e.type === "signature" || e.type === "initials") {
      const i = e.type === "initials" ? "initials" : "signature", s = E(rr(e)), d = [
        {
          id: "draw",
          label: "Draw"
        },
        {
          id: "type",
          label: "Type"
        },
        {
          id: "upload",
          label: "Upload"
        },
        {
          id: "saved",
          label: "Saved"
        }
      ], c = Kt(e.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${d.map((g) => `
            <button
              type="button"
              id="sig-tab-${g.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${c === g.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${g.id}"
              data-esign-action="signature-tab"
              data-field-id="${n}"
              role="tab"
              aria-selected="${c === g.id ? "true" : "false"}"
              aria-controls="sig-editor-${g.id}"
              tabindex="${c === g.id ? "0" : "-1"}"
            >
              ${g.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${c === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${i}"
              value="${s}"
              data-field-id="${n}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${n}">${s}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${i} will appear as your ${r}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${c === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${n}"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button type="button" data-esign-action="undo-signature-canvas" data-field-id="${n}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Undo signature stroke">
                <i class="iconoir-undo" aria-hidden="true"></i>
                <span>Undo</span>
              </button>
              <button type="button" data-esign-action="redo-signature-canvas" data-field-id="${n}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Redo signature stroke">
                <i class="iconoir-redo" aria-hidden="true"></i>
                <span>Redo</span>
              </button>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${n}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Clear signature canvas">
                <i class="iconoir-erase" aria-hidden="true"></i>
                <span>Clear</span>
              </button>
            </div>
            <div class="mt-2 text-right">
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${n}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${i} using mouse or touch</p>
          </div>

          <!-- Upload panel -->
          <div id="sig-editor-upload" class="sig-editor-panel ${c === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="sig-upload-input">Upload signature image (PNG or JPEG)</label>
            <input
              type="file"
              id="sig-upload-input"
              accept="image/png,image/jpeg"
              data-field-id="${n}"
              data-esign-action="upload-signature-file"
              class="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2"
            />
            <div id="sig-upload-preview-wrap" class="mt-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hidden">
              <img id="sig-upload-preview" alt="Upload preview" class="max-h-24 mx-auto object-contain" />
            </div>
            <p class="text-xs text-gray-500 mt-2">Image will be converted to PNG and centered in the signature area.</p>
          </div>

          <!-- Saved panel -->
          <div id="sig-editor-saved" class="sig-editor-panel ${c === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500">Saved ${i}s</p>
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${n}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <div id="sig-saved-list" class="space-y-2">
              <p class="text-xs text-gray-500">Loading saved signatures...</p>
            </div>
          </div>

          ${t}
        </div>
      `;
    }
    return e.type === "name" ? `
        <input
          type="text"
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your full legal name"
          value="${E(String(e.value || ""))}"
          data-field-id="${n}"
        />
        ${t}
      ` : e.type === "text" ? `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${n}"
        >${E(String(e.value || ""))}</textarea>
      ` : e.type === "checkbox" ? `
        <label class="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            id="field-checkbox-input"
            class="w-5 h-5 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${e.value ? "checked" : ""}
            data-field-id="${e.id}"
          />
          <span class="text-gray-700">I agree to the terms and conditions</span>
        </label>
      ` : '<p class="text-gray-500">Unsupported field type</p>';
  }
  function br(e) {
    return e === "name" || e === "initials" || e === "signature" ? `
      <div class="pt-3 border-t border-gray-100 space-y-2">
        <label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            id="remember-profile-input"
            class="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
            ${a.profileRemember ? "checked" : ""}
          />
          Remember this on this device
        </label>
        <button
          type="button"
          data-esign-action="clear-signer-profile"
          class="text-xs text-gray-500 hover:text-red-600 underline underline-offset-2"
        >
          Clear saved signer profile
        </button>
      </div>
    ` : "";
  }
  function nt(e, t, n = { syncOverlay: !1 }) {
    const r = document.getElementById("sig-type-preview"), i = a.fieldState.get(e);
    if (!i) return;
    const s = D(String(t || "").trim());
    if (n?.syncOverlay && (s ? vt(e, s) : ze(e), B()), !!r) {
      if (s) {
        r.textContent = s;
        return;
      }
      r.textContent = i.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function Kt(e) {
    const t = String(a.signatureTabByField.get(e) || "").trim();
    return t === "draw" || t === "type" || t === "upload" || t === "saved" ? t : "draw";
  }
  function Ae(e, t) {
    const n = [
      "draw",
      "type",
      "upload",
      "saved"
    ].includes(e) ? e : "draw";
    a.signatureTabByField.set(t, n), document.querySelectorAll(".sig-editor-tab").forEach((i) => {
      i.classList.remove("border-blue-600", "text-blue-600"), i.classList.add("border-transparent", "text-gray-500"), i.setAttribute("aria-selected", "false"), i.setAttribute("tabindex", "-1");
    });
    const r = document.querySelector(`.sig-editor-tab[data-tab="${n}"]`);
    r?.classList.add("border-blue-600", "text-blue-600"), r?.classList.remove("border-transparent", "text-gray-500"), r?.setAttribute("aria-selected", "true"), r?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", n !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", n !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", n !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", n !== "saved"), (n === "draw" || n === "upload" || n === "saved") && r && requestAnimationFrame(() => $e(t)), n === "type" && nt(t, document.getElementById("sig-type-input")?.value || ""), n === "saved" && Nn(t).catch(Le);
  }
  function wr(e) {
    a.signatureTabByField.set(e, "draw"), Ae("draw", e);
    const t = document.getElementById("sig-type-input");
    t && nt(e, t.value || "");
  }
  function $e(e) {
    const t = document.getElementById("sig-draw-canvas");
    if (!t || a.signatureCanvases.has(e)) return;
    const n = t.closest(".signature-canvas-container"), r = t.getContext("2d");
    if (!r) return;
    const i = t.getBoundingClientRect();
    if (!i.width || !i.height) return;
    const s = window.devicePixelRatio || 1;
    t.width = i.width * s, t.height = i.height * s, r.scale(s, s), r.lineCap = "round", r.lineJoin = "round", r.strokeStyle = "#1f2937", r.lineWidth = 2.5;
    let d = !1, c = 0, g = 0, p = [];
    const m = (h) => {
      const S = t.getBoundingClientRect();
      let M, I;
      return h.touches && h.touches.length > 0 ? (M = h.touches[0].clientX, I = h.touches[0].clientY) : h.changedTouches && h.changedTouches.length > 0 ? (M = h.changedTouches[0].clientX, I = h.changedTouches[0].clientY) : (M = h.clientX, I = h.clientY), {
        x: M - S.left,
        y: I - S.top,
        timestamp: Date.now()
      };
    }, _ = (h) => {
      d = !0;
      const S = m(h);
      c = S.x, g = S.y, p = [{
        x: S.x,
        y: S.y,
        t: S.timestamp,
        width: 2.5
      }], n && n.classList.add("drawing");
    }, y = (h) => {
      if (!d) return;
      const S = m(h);
      p.push({
        x: S.x,
        y: S.y,
        t: S.timestamp,
        width: 2.5
      });
      const M = S.x - c, I = S.y - g, R = S.timestamp - (p[p.length - 2]?.t || S.timestamp), O = Math.sqrt(M * M + I * I) / Math.max(R, 1), Q = 2.5, j = 1.5, Y = 4, x = Math.min(O / 5, 1), w = Math.max(j, Math.min(Y, Q - x * 1.5));
      p[p.length - 1].width = w, r.lineWidth = w, r.beginPath(), r.moveTo(c, g), r.lineTo(S.x, S.y), r.stroke(), c = S.x, g = S.y;
    }, T = () => {
      if (d = !1, p.length > 1) {
        const h = a.signatureCanvases.get(e);
        h && (h.strokes.push(p.map((S) => ({ ...S }))), h.redoStack = []), at(e);
      }
      p = [], n && n.classList.remove("drawing");
    };
    t.addEventListener("mousedown", _), t.addEventListener("mousemove", y), t.addEventListener("mouseup", T), t.addEventListener("mouseout", T), t.addEventListener("touchstart", (h) => {
      h.preventDefault(), h.stopPropagation(), _(h);
    }, { passive: !1 }), t.addEventListener("touchmove", (h) => {
      h.preventDefault(), h.stopPropagation(), y(h);
    }, { passive: !1 }), t.addEventListener("touchend", (h) => {
      h.preventDefault(), T();
    }, { passive: !1 }), t.addEventListener("touchcancel", T), t.addEventListener("gesturestart", (h) => h.preventDefault()), t.addEventListener("gesturechange", (h) => h.preventDefault()), t.addEventListener("gestureend", (h) => h.preventDefault()), a.signatureCanvases.set(e, {
      canvas: t,
      ctx: r,
      dpr: s,
      drawWidth: i.width,
      drawHeight: i.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), yr(e);
  }
  function yr(e) {
    const t = a.signatureCanvases.get(e), n = a.fieldState.get(e);
    if (!t || !n) return;
    const r = nr(n);
    r && rt(e, r, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function rt(e, t, n = { clearStrokes: !1 }) {
    const r = a.signatureCanvases.get(e);
    if (!r) return !1;
    const i = String(t || "").trim();
    if (!i)
      return r.baseImageDataUrl = "", r.baseImage = null, n.clearStrokes && (r.strokes = [], r.redoStack = []), ge(e), !0;
    const { drawWidth: s, drawHeight: d } = r, c = new Image();
    return await new Promise((g) => {
      c.onload = () => {
        n.clearStrokes && (r.strokes = [], r.redoStack = []), r.baseImage = c, r.baseImageDataUrl = i, s > 0 && d > 0 && ge(e), g(!0);
      }, c.onerror = () => g(!1), c.src = i;
    });
  }
  function ge(e) {
    const t = a.signatureCanvases.get(e);
    if (!t) return;
    const { ctx: n, drawWidth: r, drawHeight: i, baseImage: s, strokes: d } = t;
    if (n.clearRect(0, 0, r, i), s) {
      const c = Math.min(r / s.width, i / s.height), g = s.width * c, p = s.height * c, m = (r - g) / 2, _ = (i - p) / 2;
      n.drawImage(s, m, _, g, p);
    }
    for (const c of d) for (let g = 1; g < c.length; g++) {
      const p = c[g - 1], m = c[g];
      n.lineWidth = Number(m.width || 2.5) || 2.5, n.beginPath(), n.moveTo(p.x, p.y), n.lineTo(m.x, m.y), n.stroke();
    }
  }
  function xr(e) {
    const t = a.signatureCanvases.get(e);
    if (!t || t.strokes.length === 0) return;
    const n = t.strokes.pop();
    n && t.redoStack.push(n), ge(e), at(e);
  }
  function Sr(e) {
    const t = a.signatureCanvases.get(e);
    if (!t || t.redoStack.length === 0) return;
    const n = t.redoStack.pop();
    n && t.strokes.push(n), ge(e), at(e);
  }
  function it(e) {
    const t = a.signatureCanvases.get(e);
    if (!t) return !1;
    if ((t.baseImageDataUrl || "").trim() || t.strokes.length > 0) return !0;
    const { canvas: n, ctx: r } = t;
    return r.getImageData(0, 0, n.width, n.height).data.some((i, s) => s % 4 === 3 && i > 0);
  }
  function at(e) {
    const t = a.signatureCanvases.get(e);
    t && (it(e) ? Ve(e, t.canvas.toDataURL("image/png")) : ze(e), B());
  }
  function _r(e) {
    const t = a.signatureCanvases.get(e);
    t && (t.strokes = [], t.redoStack = [], t.baseImage = null, t.baseImageDataUrl = "", ge(e)), ze(e), B();
    const n = document.getElementById("sig-upload-preview-wrap"), r = document.getElementById("sig-upload-preview");
    n && n.classList.add("hidden"), r && r.removeAttribute("src");
  }
  function ot() {
    const e = document.getElementById("field-editor-overlay");
    if (Me(e.querySelector(".field-editor")), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", a.activeFieldId) {
      const t = document.querySelector(`.field-list-item[data-field-id="${a.activeFieldId}"]`);
      requestAnimationFrame(() => {
        t?.focus();
      });
    }
    cn(), B(), a.activeFieldId = null, H(), a.signatureCanvases.clear(), v("Field editor closed.");
  }
  function q(e) {
    const t = Number(e) || 0;
    return t <= 0 ? 0 : Math.max(0, Math.ceil((t - Date.now()) / 1e3));
  }
  function Cr(e, t = {}) {
    const n = Number(t.retry_after_seconds);
    if (Number.isFinite(n) && n > 0) return Math.ceil(n);
    const r = String(e?.headers?.get?.("Retry-After") || "").trim();
    if (!r) return 0;
    const i = Number(r);
    return Number.isFinite(i) && i > 0 ? Math.ceil(i) : 0;
  }
  async function z(e, t) {
    let n = {};
    try {
      n = await e.json();
    } catch {
      n = {};
    }
    const r = n?.error || {}, i = r?.details && typeof r.details == "object" ? r.details : {}, s = Cr(e, i), d = e?.status === 429, c = d ? s > 0 ? `Too many actions too quickly. Please wait ${s}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(r?.message || t || "Request failed"), g = new Error(c);
    return g.status = e?.status || 0, g.code = String(r?.code || ""), g.details = i, g.rateLimited = d, g.retryAfterSeconds = s, g;
  }
  function Xt(e) {
    const t = Math.max(1, Number(e) || 1);
    a.writeCooldownUntil = Date.now() + t * 1e3, a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
    const n = () => {
      const r = document.getElementById("field-editor-save");
      if (!r) return;
      const i = q(a.writeCooldownUntil);
      if (i <= 0) {
        a.pendingSaves.has(a.activeFieldId || "") || (r.disabled = !1, r.innerHTML = "Insert"), a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
        return;
      }
      r.disabled = !0, r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${i}s`;
    };
    n(), a.writeCooldownTimer = setInterval(n, 250);
  }
  function Er(e) {
    const t = Math.max(1, Number(e) || 1);
    a.submitCooldownUntil = Date.now() + t * 1e3, a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    const n = () => {
      const r = q(a.submitCooldownUntil);
      V(), r <= 0 && a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    };
    n(), a.submitCooldownTimer = setInterval(n, 250);
  }
  async function Tr() {
    if (!F()) {
      v("This review session cannot modify signing fields.", "assertive");
      return;
    }
    const e = a.activeFieldId;
    if (!e) return;
    const t = a.fieldState.get(e);
    if (!t) return;
    const n = q(a.writeCooldownUntil);
    if (n > 0) {
      const i = `Please wait ${n}s before saving again.`;
      window.toastManager && window.toastManager.error(i), v(i, "assertive");
      return;
    }
    const r = document.getElementById("field-editor-save");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      a.profileRemember = Ut();
      let i = !1;
      if (t.type === "signature" || t.type === "initials") i = await Lr(e);
      else if (t.type === "checkbox") i = await st(e, null, document.getElementById("field-checkbox-input")?.checked || !1);
      else {
        const s = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!s && t.required) throw new Error("This field is required");
        i = await st(e, s, null);
      }
      if (i) {
        ot(), Gt(), V(), en(), le(), Ir(e), $r(e);
        const s = tn();
        s.allRequiredComplete ? v("Field saved. All required fields complete. Ready to submit.") : v(`Field saved. ${s.remainingRequired} required field${s.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (i) {
      i?.rateLimited && Xt(i.retryAfterSeconds), window.toastManager && window.toastManager.error(i.message), v(`Error saving field: ${i.message}`, "assertive");
    } finally {
      if (q(a.writeCooldownUntil) > 0) {
        const i = q(a.writeCooldownUntil);
        r.disabled = !0, r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${i}s`;
      } else
        r.disabled = !1, r.innerHTML = "Insert";
    }
  }
  async function Lr(e) {
    const t = a.fieldState.get(e), n = document.getElementById("sig-type-input"), r = Kt(e);
    if (r === "draw" || r === "upload" || r === "saved") {
      const i = a.signatureCanvases.get(e);
      if (!i) return !1;
      if (!it(e)) throw new Error(t?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      return await Jt(e, {
        type: "drawn",
        dataUrl: i.canvas.toDataURL("image/png")
      }, t?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const i = n?.value?.trim();
      if (!i) throw new Error(t?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return t.type === "initials" ? await st(e, i, null) : await Jt(e, {
        type: "typed",
        text: i
      }, i);
    }
  }
  async function st(e, t, n) {
    if (!F()) throw new Error("This review session cannot modify signing fields");
    a.pendingSaves.add(e);
    const r = Date.now(), i = a.fieldState.get(e);
    try {
      const s = await fetch(`${u.apiBasePath}/field-values/${u.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: e,
          value_text: t,
          value_bool: n
        })
      });
      if (!s.ok) throw await z(s, "Failed to save field");
      const d = a.fieldState.get(e);
      return d && (d.value = t ?? n, d.completed = !0, d.hasError = !1), await zt(d), window.toastManager && window.toastManager.success("Field saved"), b.trackFieldSave(e, d?.type, !0, Date.now() - r), !0;
    } catch (s) {
      const d = a.fieldState.get(e);
      throw d && (d.hasError = !0, d.lastError = s.message), b.trackFieldSave(e, i?.type, !1, Date.now() - r, s.message), s;
    } finally {
      a.pendingSaves.delete(e);
    }
  }
  async function Jt(e, t, n) {
    if (!F()) throw new Error("This review session cannot modify signing fields");
    a.pendingSaves.add(e);
    const r = Date.now(), i = t?.type || "typed";
    try {
      let s;
      if (i === "drawn") {
        const g = await Fn.uploadDrawnSignature(e, t.dataUrl);
        s = {
          field_instance_id: e,
          type: "drawn",
          value_text: n,
          object_key: g.objectKey,
          sha256: g.sha256,
          upload_token: g.uploadToken
        };
      } else s = await Pr(e, n);
      const d = await fetch(`${u.apiBasePath}/field-values/signature/${u.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s)
      });
      if (!d.ok) throw await z(d, "Failed to save signature");
      const c = a.fieldState.get(e);
      return c && (c.value = n, c.completed = !0, c.hasError = !1, t?.dataUrl && (c.signaturePreviewUrl = t.dataUrl)), await zt(c, {
        signatureType: i,
        signatureDataUrl: t?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), b.trackSignatureAttach(e, i, !0, Date.now() - r), !0;
    } catch (s) {
      const d = a.fieldState.get(e);
      throw d && (d.hasError = !0, d.lastError = s.message), b.trackSignatureAttach(e, i, !1, Date.now() - r, s.message), s;
    } finally {
      a.pendingSaves.delete(e);
    }
  }
  async function Pr(e, t) {
    const n = await kr(`${t}|${e}`);
    return {
      field_instance_id: e,
      type: "typed",
      value_text: t,
      object_key: `tenant/bootstrap/org/bootstrap/agreements/${u.agreementId}/signatures/${u.recipientId}/${e}-${Date.now()}.txt`,
      sha256: n
    };
  }
  async function kr(e) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const t = new TextEncoder().encode(e), n = await window.crypto.subtle.digest("SHA-256", t);
      return Array.from(new Uint8Array(n)).map((r) => r.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Gt() {
    let e = 0, t = 0;
    a.fieldState.forEach((p) => {
      p.required && t++, p.completed && e++;
    });
    const n = a.fieldState.size, r = n > 0 ? e / n * 100 : 0;
    document.getElementById("completed-count").textContent = e, document.getElementById("total-count").textContent = n;
    const i = document.getElementById("progress-ring-circle"), s = 97.4, d = s - r / 100 * s;
    i.style.strokeDashoffset = d, document.getElementById("mobile-progress").style.width = `${r}%`;
    const c = n - e, g = document.getElementById("fields-status");
    g && (W() ? g.textContent = $() ? he(a.reviewContext.status) : "Review" : $() && a.reviewContext.sign_blocked ? g.textContent = "Review blocked" : g.textContent = c > 0 ? `${c} remaining` : "All complete"), de();
  }
  function V() {
    de();
    const e = document.getElementById("submit-btn"), t = document.getElementById("incomplete-warning"), n = document.getElementById("incomplete-message"), r = q(a.submitCooldownUntil);
    let i = [], s = !1;
    a.fieldState.forEach((c, g) => {
      c.required && !c.completed && i.push(c), c.hasError && (s = !0);
    });
    const d = !!a.reviewContext?.sign_blocked;
    e.disabled = !(a.canSignSession && a.hasConsented && i.length === 0 && !s && !d && a.pendingSaves.size === 0 && r === 0 && !a.isSubmitting), !a.isSubmitting && r > 0 ? e.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${r}s` : !a.isSubmitting && r === 0 && (e.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), a.hasConsented ? r > 0 ? (t.classList.remove("hidden"), n.textContent = `Please wait ${r}s before submitting again.`) : a.canSignSession ? d ? (t.classList.remove("hidden"), n.textContent = a.reviewContext?.sign_block_reason || "Signing is blocked until review completes.") : s ? (t.classList.remove("hidden"), n.textContent = "Some fields failed to save. Please retry.") : i.length > 0 ? (t.classList.remove("hidden"), n.textContent = `Complete ${i.length} required field${i.length > 1 ? "s" : ""}`) : t.classList.add("hidden") : (t.classList.remove("hidden"), n.textContent = "This session cannot submit signatures.") : (t.classList.remove("hidden"), n.textContent = "Please accept the consent agreement");
  }
  function Ir(e) {
    const t = a.fieldState.get(e), n = document.querySelector(`.field-list-item[data-field-id="${e}"]`);
    if (!(!n || !t)) {
      if (t.completed) {
        n.classList.add("completed"), n.classList.remove("error");
        const r = n.querySelector(".w-8");
        r.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), r.classList.add("bg-green-100", "text-green-600"), r.innerHTML = '<i class="iconoir-check"></i>';
      } else if (t.hasError) {
        n.classList.remove("completed"), n.classList.add("error");
        const r = n.querySelector(".w-8");
        r.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), r.classList.add("bg-red-100", "text-red-600"), r.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function Ar() {
    const e = Array.from(a.fieldState.values()).filter((t) => t.required);
    return e.sort((t, n) => {
      const r = Number(t.page || 0), i = Number(n.page || 0);
      if (r !== i) return r - i;
      const s = Number(t.tabIndex || 0), d = Number(n.tabIndex || 0);
      if (s > 0 && d > 0 && s !== d) return s - d;
      if (s > 0 != d > 0) return s > 0 ? -1 : 1;
      const c = Number(t.posY || 0), g = Number(n.posY || 0);
      if (c !== g) return c - g;
      const p = Number(t.posX || 0), m = Number(n.posX || 0);
      return p !== m ? p - m : String(t.id || "").localeCompare(String(n.id || ""));
    }), e;
  }
  function dt(e) {
    a.guidedTargetFieldId = e, document.querySelectorAll(".field-list-item").forEach((t) => t.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((t) => t.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${e}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${e}"]`)?.classList.add("guided-next-target");
  }
  function $r(e) {
    const t = Ar(), n = t.filter((d) => !d.completed);
    if (n.length === 0) {
      b.track("guided_next_none_remaining", { fromFieldId: e });
      const d = document.getElementById("submit-btn");
      d?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      }), d?.focus(), v("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const r = t.findIndex((d) => String(d.id) === String(e));
    let i = null;
    if (r >= 0) {
      for (let d = r + 1; d < t.length; d++) if (!t[d].completed) {
        i = t[d];
        break;
      }
    }
    if (i || (i = n[0]), !i) return;
    b.track("guided_next_started", {
      fromFieldId: e,
      toFieldId: i.id
    });
    const s = Number(i.page || 1);
    s !== a.currentPage && ke(s), et(i.id, { openEditor: !1 }), dt(i.id), setTimeout(() => {
      dt(i.id), tt(i.id), b.track("guided_next_completed", {
        toFieldId: i.id,
        page: i.page
      }), v(`Next required field highlighted on page ${i.page}.`);
    }, 120);
  }
  function Qt() {
    if (!F()) return;
    const e = document.getElementById("consent-modal");
    e.classList.add("active"), e.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Be(e.querySelector(".field-editor")), v("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function ct() {
    const e = document.getElementById("consent-modal");
    Me(e.querySelector(".field-editor")), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", v("Consent dialog closed.");
  }
  async function Br() {
    if (!F()) return;
    const e = document.getElementById("consent-accept-btn");
    e.disabled = !0, e.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const t = await fetch(`${u.apiBasePath}/consent/${u.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!t.ok) throw await z(t, "Failed to accept consent");
      a.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), ct(), V(), en(), b.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), v("Consent accepted. You can now complete the fields and submit.");
    } catch (t) {
      window.toastManager && window.toastManager.error(t.message), v(`Error: ${t.message}`, "assertive");
    } finally {
      e.disabled = !1, e.innerHTML = "Accept & Continue";
    }
  }
  async function Mr() {
    if (!a.canSignSession || a.reviewContext?.sign_blocked) {
      V();
      return;
    }
    const e = document.getElementById("submit-btn"), t = q(a.submitCooldownUntil);
    if (t > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${t}s before submitting again.`), V();
      return;
    }
    a.isSubmitting = !0, e.disabled = !0, e.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const n = `submit-${u.recipientId}-${Date.now()}`, r = await fetch(`${u.apiBasePath}/submit/${u.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": n }
      });
      if (!r.ok) throw await z(r, "Failed to submit");
      b.trackSubmit(!0), window.location.href = `${u.signerBasePath}/${u.token}/complete`;
    } catch (n) {
      b.trackSubmit(!1, n.message), n?.rateLimited && Er(n.retryAfterSeconds), window.toastManager && window.toastManager.error(n.message);
    } finally {
      a.isSubmitting = !1, V();
    }
  }
  function Rr() {
    if (!F()) return;
    const e = document.getElementById("decline-modal");
    e.classList.add("active"), e.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Be(e.querySelector(".field-editor")), v("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Zt() {
    const e = document.getElementById("decline-modal");
    Me(e.querySelector(".field-editor")), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", v("Decline dialog closed.");
  }
  async function Dr() {
    if (!F()) return;
    const e = document.getElementById("decline-reason").value;
    try {
      const t = await fetch(`${u.apiBasePath}/decline/${u.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: e })
      });
      if (!t.ok) throw await z(t, "Failed to decline");
      window.location.href = `${u.signerBasePath}/${u.token}/declined`;
    } catch (t) {
      window.toastManager && window.toastManager.error(t.message);
    }
  }
  function Fr() {
    b.trackDegradedMode("viewer_load_failure"), b.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Nr() {
    try {
      const e = await fetch(_t());
      if (!e.ok) throw new Error("Document unavailable");
      const t = Ct((await e.json()).assets || {});
      if (t) window.open(t, "_blank");
      else throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (e) {
      window.toastManager && window.toastManager.error(e.message || "Unable to download document");
    }
  }
  const G = {
    enabled: localStorage.getItem("esign_debug") === "true" || new URLSearchParams(window.location.search).has("debug"),
    panel: null,
    init() {
      this.enabled && (this.createDebugPanel(), this.bindConsoleHelpers(), this.logSessionInfo(), console.info("%c[E-Sign Debug] Debug mode enabled. Access window.esignDebug for helpers.", "color: #3b82f6; font-weight: bold"));
    },
    createDebugPanel() {
      this.panel = document.createElement("div"), this.panel.id = "esign-debug-panel", this.panel.innerHTML = `
        <style>
          #esign-debug-panel {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 320px;
            max-height: 400px;
            background: #1f2937;
            color: #e5e7eb;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
            font-family: monospace;
            font-size: 11px;
            z-index: 9999;
            overflow: hidden;
          }
          #esign-debug-panel.collapsed {
            width: 44px;
            height: 44px;
            border-radius: 22px;
          }
          #esign-debug-panel.collapsed .debug-content {
            display: none;
          }
          #esign-debug-panel .debug-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            background: #111827;
            cursor: pointer;
          }
          #esign-debug-panel.collapsed .debug-header {
            justify-content: center;
            padding: 10px;
          }
          #esign-debug-panel .debug-content {
            padding: 12px;
            max-height: 340px;
            overflow-y: auto;
          }
          #esign-debug-panel .debug-section {
            margin-bottom: 12px;
          }
          #esign-debug-panel .debug-label {
            color: #9ca3af;
            margin-bottom: 4px;
          }
          #esign-debug-panel .debug-value {
            color: #10b981;
          }
          #esign-debug-panel .debug-value.warning {
            color: #f59e0b;
          }
          #esign-debug-panel .debug-value.error {
            color: #ef4444;
          }
          #esign-debug-panel .debug-btn {
            padding: 4px 8px;
            background: #374151;
            border: none;
            border-radius: 4px;
            color: #e5e7eb;
            cursor: pointer;
            font-size: 10px;
          }
          #esign-debug-panel .debug-btn:hover {
            background: #4b5563;
          }
        </style>
        <div class="debug-header" data-esign-action="debug-toggle-panel">
          <span style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 16px;">🔧</span>
            <span class="debug-title">Debug Panel</span>
          </span>
          <span class="debug-toggle">−</span>
        </div>
        <div class="debug-content">
          <div class="debug-section">
            <div class="debug-label">Flow Mode</div>
            <div class="debug-value" id="debug-flow-mode">${u.flowMode}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Session</div>
            <div class="debug-value" id="debug-session-id">${b.sessionId}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Consent</div>
            <div class="debug-value" id="debug-consent">${a.hasConsented ? "✓ Accepted" : "✗ Pending"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Fields</div>
            <div class="debug-value" id="debug-fields">0/${a.fieldState?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Memory Mode</div>
            <div class="debug-value" id="debug-memory">${a.isLowMemory ? "⚠ Low Memory" : "Normal"}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Cached Pages</div>
            <div class="debug-value" id="debug-cached">${a.renderedPages?.size || 0}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Actions</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button type="button" class="debug-btn" data-esign-action="debug-copy-session">Copy Info</button>
              <button type="button" class="debug-btn" data-esign-action="debug-clear-cache">Clear Cache</button>
              <button type="button" class="debug-btn" data-esign-action="debug-show-telemetry">View Telemetry</button>
              <button type="button" class="debug-btn" data-esign-action="debug-reload-viewer">Reload Viewer</button>
            </div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Errors</div>
            <div class="debug-value" id="debug-errors" style="color: inherit;">None</div>
          </div>
        </div>
      `, document.body.appendChild(this.panel), setInterval(() => this.updatePanel(), 1e3);
    },
    togglePanel() {
      if (!this.panel) return;
      this.panel.classList.toggle("collapsed");
      const e = this.panel.querySelector(".debug-toggle"), t = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (e.textContent = "+", t.style.display = "none") : (e.textContent = "−", t.style.display = "inline");
    },
    updatePanel() {
      if (!this.panel || this.panel.classList.contains("collapsed")) return;
      const e = a.fieldState;
      let t = 0;
      e?.forEach((r) => {
        r.completed && t++;
      }), document.getElementById("debug-consent").textContent = a.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${a.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${t}/${e?.size || 0}`, document.getElementById("debug-cached").textContent = a.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = a.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${a.isLowMemory ? "warning" : ""}`;
      const n = b.metrics.errorsEncountered;
      document.getElementById("debug-errors").textContent = n.length > 0 ? `${n.length} error(s)` : "None", document.getElementById("debug-errors").className = `debug-value ${n.length > 0 ? "error" : ""}`;
    },
    bindConsoleHelpers() {
      window.esignDebug = {
        getState: () => ({
          config: {
            ...u,
            token: "[redacted]"
          },
          state: {
            currentPage: a.currentPage,
            zoomLevel: a.zoomLevel,
            hasConsented: a.hasConsented,
            activeFieldId: a.activeFieldId,
            isLowMemory: a.isLowMemory,
            cachedPages: a.renderedPages?.size || 0
          },
          fields: Array.from(a.fieldState?.entries() || []).map(([e, t]) => ({
            id: e,
            type: t.type,
            completed: t.completed,
            hasError: t.hasError
          })),
          telemetry: b.getSessionSummary(),
          errors: b.metrics.errorsEncountered
        }),
        getEvents: () => b.events,
        forceError: (e) => {
          b.track("debug_forced_error", { message: e }), console.error("[E-Sign Debug] Forced error:", e);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), Pe();
        },
        setLowMemory: (e) => {
          a.isLowMemory = e, Je(), console.log(`[E-Sign Debug] Low memory mode: ${e}`);
        }
      };
    },
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", u.flowMode), console.log("Agreement ID:", u.agreementId), console.log("Session ID:", b.sessionId), console.log("Fields:", a.fieldState?.size || 0), console.log("Low Memory:", a.isLowMemory), console.groupEnd();
    },
    async copySessionInfo() {
      const e = JSON.stringify(window.esignDebug.getState(), null, 2);
      try {
        await navigator.clipboard.writeText(e), alert("Session info copied to clipboard");
      } catch {
        console.log("Session Info:", e), alert("Check console for session info");
      }
    },
    reloadViewer() {
      console.log("[E-Sign Debug] Reloading PDF viewer..."), Pe(), this.updatePanel();
    },
    clearCache() {
      a.renderedPages?.clear(), console.log("[E-Sign Debug] Page cache cleared"), this.updatePanel();
    },
    showTelemetry() {
      console.table(b.events), console.log("Session Summary:", b.getSessionSummary());
    }
  };
  function v(e, t = "polite") {
    const n = t === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    n && (n.textContent = "", requestAnimationFrame(() => {
      n.textContent = e;
    }));
  }
  function Be(e) {
    const t = e.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), n = t[0], r = t[t.length - 1];
    e.dataset.previousFocus || (e.dataset.previousFocus = document.activeElement?.id || "");
    function i(s) {
      s.key === "Tab" && (s.shiftKey ? document.activeElement === n && (s.preventDefault(), r?.focus()) : document.activeElement === r && (s.preventDefault(), n?.focus()));
    }
    e.addEventListener("keydown", i), e._focusTrapHandler = i, requestAnimationFrame(() => {
      n?.focus();
    });
  }
  function Me(e) {
    e._focusTrapHandler && (e.removeEventListener("keydown", e._focusTrapHandler), delete e._focusTrapHandler);
    const t = e.dataset.previousFocus;
    if (t) {
      const n = document.getElementById(t);
      requestAnimationFrame(() => {
        n?.focus();
      }), delete e.dataset.previousFocus;
    }
  }
  function en() {
    const e = tn(), t = document.getElementById("submit-status");
    t && (e.allRequiredComplete && a.hasConsented ? t.textContent = "All required fields complete. You can now submit." : a.hasConsented ? t.textContent = `Complete ${e.remainingRequired} more required field${e.remainingRequired > 1 ? "s" : ""} to enable submission.` : t.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function tn() {
    let e = 0, t = 0, n = 0;
    return a.fieldState.forEach((r) => {
      r.required && t++, r.completed && e++, r.required && !r.completed && n++;
    }), {
      completed: e,
      required: t,
      remainingRequired: n,
      total: a.fieldState.size,
      allRequiredComplete: n === 0
    };
  }
  function Ur(e, t = 1) {
    const n = Array.from(a.fieldState.keys()), r = n.indexOf(e);
    if (r === -1) return null;
    const i = r + t;
    return i >= 0 && i < n.length ? n[i] : null;
  }
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && (ot(), ct(), Zt(), Ke()), e.target instanceof HTMLElement && e.target.classList.contains("sig-editor-tab")) {
      const t = Array.from(document.querySelectorAll(".sig-editor-tab")), n = t.indexOf(e.target);
      if (n !== -1) {
        let r = n;
        if (e.key === "ArrowRight" && (r = (n + 1) % t.length), e.key === "ArrowLeft" && (r = (n - 1 + t.length) % t.length), e.key === "Home" && (r = 0), e.key === "End" && (r = t.length - 1), r !== n) {
          e.preventDefault();
          const i = t[r], s = i.getAttribute("data-tab") || "draw", d = i.getAttribute("data-field-id");
          d && Ae(s, d), i.focus();
          return;
        }
      }
    }
    if (e.target instanceof HTMLElement && e.target.classList.contains("panel-tab")) {
      const t = Array.from(document.querySelectorAll(".panel-tab")), n = t.indexOf(e.target);
      if (n !== -1) {
        let r = n;
        if (e.key === "ArrowRight" && (r = (n + 1) % t.length), e.key === "ArrowLeft" && (r = (n - 1 + t.length) % t.length), e.key === "Home" && (r = 0), e.key === "End" && (r = t.length - 1), r !== n) {
          e.preventDefault();
          const i = t[r], s = i.getAttribute("data-tab");
          (s === "sign" || s === "review") && We(s), i.focus();
          return;
        }
      }
    }
    if (e.target instanceof HTMLElement && e.target.classList.contains("field-list-item")) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const t = e.target.dataset.fieldId, n = Ur(t, e.key === "ArrowDown" ? 1 : -1);
        n && document.querySelector(`.field-list-item[data-field-id="${n}"]`)?.focus();
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const t = e.target.dataset.fieldId;
        t && Ie(t);
      }
    }
    e.key === "Tab" && !e.target.closest(".field-editor-overlay") && !e.target.closest("#consent-modal") && e.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(e) {
    e.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
var sn = class {
  constructor(o) {
    this.config = o;
  }
  init() {
    si(this.config);
  }
  destroy() {
  }
};
function gi(o) {
  const l = new sn(o);
  return ht(() => l.init()), l;
}
function di() {
  const o = document.getElementById("esign-signer-review-config");
  if (!o) return null;
  try {
    const l = JSON.parse(o.textContent || "{}");
    return l && typeof l == "object" ? l : null;
  } catch {
    return null;
  }
}
typeof document < "u" && ht(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const o = di();
  if (!o) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const l = new sn(o);
  l.init(), window.esignSignerReviewController = l;
});
export {
  si as n,
  gi as r,
  sn as t
};

//# sourceMappingURL=signer-review-DTRCOfUa.js.map