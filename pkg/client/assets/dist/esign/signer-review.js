import { onReady as ht } from "../shared/dom-ready.js";
import { readJSONScriptValue as Wr, parseJSONValue as cn } from "../shared/json-parse.js";
import { escapeHTML as L } from "../shared/html.js";
import { readHTTPError as an, readHTTPErrorResult as Kr, readHTTPJSONObject as Xr } from "../shared/transport/http-client.js";
import { a as Jr, l as Gr } from "../chunks/runtime-bhSs9hEJ.js";
const Qr = "esign.signer.profile.v1", on = "esign.signer.profile.outbox.v1", pt = 90, sn = 500 * 1024;
class Zr {
  constructor(d) {
    const f = Number.isFinite(d) && d > 0 ? d : pt;
    this.ttlMs = f * 24 * 60 * 60 * 1e3;
  }
  storageKey(d) {
    return `${Qr}:${d}`;
  }
  async load(d) {
    try {
      const f = window.localStorage.getItem(this.storageKey(d));
      if (!f) return null;
      const l = cn(f, null);
      return !l || l.schemaVersion !== 1 ? (window.localStorage.removeItem(this.storageKey(d)), null) : typeof l.expiresAt == "number" && Date.now() > l.expiresAt ? (window.localStorage.removeItem(this.storageKey(d)), null) : l;
    } catch {
      return null;
    }
  }
  async save(d, f) {
    const l = Date.now(), E = {
      ...await this.load(d) || {
        schemaVersion: 1,
        key: d,
        fullName: "",
        initials: "",
        typedSignature: "",
        drawnSignatureDataUrl: "",
        drawnInitialsDataUrl: "",
        remember: !0,
        updatedAt: l,
        expiresAt: l + this.ttlMs
      },
      ...f,
      schemaVersion: 1,
      key: d,
      updatedAt: l,
      expiresAt: l + this.ttlMs
    };
    try {
      window.localStorage.setItem(this.storageKey(d), JSON.stringify(E));
    } catch {
    }
    return E;
  }
  async clear(d) {
    try {
      window.localStorage.removeItem(this.storageKey(d));
    } catch {
    }
  }
}
class ei {
  constructor(d, f) {
    this.endpointBasePath = d.replace(/\/$/, ""), this.token = f;
  }
  endpoint(d) {
    const f = encodeURIComponent(this.token), l = encodeURIComponent(ui(d));
    return `${this.endpointBasePath}/profile/${f}?key=${l}`;
  }
  async load(d) {
    const f = await fetch(this.endpoint(d), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!f.ok) return null;
    const l = await f.json();
    return !l || typeof l != "object" ? null : l.profile || null;
  }
  async save(d, f) {
    const l = await fetch(this.endpoint(d), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ patch: f })
    });
    if (!l.ok)
      throw new Error("remote profile sync failed");
    return (await l.json()).profile;
  }
  async clear(d) {
    const f = await fetch(this.endpoint(d), {
      method: "DELETE",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!f.ok && f.status !== 404)
      throw new Error("remote profile clear failed");
  }
}
class Ue {
  constructor(d, f, l) {
    this.mode = d, this.localStore = f, this.remoteStore = l;
  }
  outboxLoad() {
    try {
      const d = window.localStorage.getItem(on);
      if (!d) return {};
      const f = cn(d, null);
      if (!f || typeof f != "object")
        return {};
      const l = {};
      for (const [S, E] of Object.entries(f)) {
        if (!E || typeof E != "object")
          continue;
        const b = E;
        if (b.op === "clear") {
          l[S] = {
            op: "clear",
            updatedAt: Number(b.updatedAt) || Date.now()
          };
          continue;
        }
        const a = b.op === "patch" ? b.patch : b;
        l[S] = {
          op: "patch",
          patch: a && typeof a == "object" ? a : {},
          updatedAt: Number(b.updatedAt) || Date.now()
        };
      }
      return l;
    } catch {
      return {};
    }
  }
  outboxSave(d) {
    try {
      window.localStorage.setItem(on, JSON.stringify(d));
    } catch {
    }
  }
  queuePatch(d, f) {
    const l = this.outboxLoad(), S = l[d], E = S?.op === "patch" ? S.patch || {} : {};
    l[d] = {
      op: "patch",
      patch: { ...E, ...f, updatedAt: Date.now() },
      updatedAt: Date.now()
    }, this.outboxSave(l);
  }
  queueClear(d) {
    const f = this.outboxLoad();
    f[d] = { op: "clear", updatedAt: Date.now() }, this.outboxSave(f);
  }
  getOutboxEntry(d) {
    return this.outboxLoad()[d] || null;
  }
  removeOutboxEntry(d) {
    const f = this.outboxLoad();
    f[d] && (delete f[d], this.outboxSave(f));
  }
  async flushOutboxForKey(d) {
    if (!this.remoteStore) return;
    const f = this.outboxLoad(), l = f[d];
    if (l)
      try {
        l.op === "clear" ? await this.remoteStore.clear(d) : await this.remoteStore.save(d, l.patch || {}), delete f[d], this.outboxSave(f);
      } catch {
      }
  }
  pickLatest(d, f) {
    return d && f ? (f.updatedAt || 0) >= (d.updatedAt || 0) ? f : d : f || d;
  }
  async load(d) {
    if (this.mode === "remote_only")
      return !this.remoteStore || this.getOutboxEntry(d) && (await this.flushOutboxForKey(d), this.getOutboxEntry(d)?.op === "clear") ? null : this.remoteStore.load(d);
    if (this.mode === "hybrid" && this.remoteStore) {
      if (this.getOutboxEntry(d)?.op === "clear")
        return await this.flushOutboxForKey(d), this.localStore.load(d);
      const [l, S] = await Promise.all([
        this.localStore.load(d),
        this.remoteStore.load(d).catch(() => null)
      ]), E = this.pickLatest(l, S);
      return E && await this.localStore.save(d, E), await this.flushOutboxForKey(d), E;
    }
    return this.localStore.load(d);
  }
  async save(d, f) {
    if (this.mode === "remote_only") {
      if (!this.remoteStore)
        throw new Error("remote profile store not configured");
      const S = await this.remoteStore.save(d, f);
      return this.removeOutboxEntry(d), S;
    }
    const l = await this.localStore.save(d, f);
    if (this.mode === "hybrid" && this.remoteStore)
      try {
        const S = await this.remoteStore.save(d, f);
        return await this.localStore.save(d, S), this.removeOutboxEntry(d), S;
      } catch {
        this.queuePatch(d, f);
      }
    return l;
  }
  async clear(d) {
    if (await this.localStore.clear(d), this.remoteStore)
      try {
        await this.remoteStore.clear(d);
      } catch {
        throw this.queueClear(d), new Error("remote profile clear failed");
      }
    this.removeOutboxEntry(d);
  }
}
function ti(s) {
  const d = s.profile?.mode || "local_only", f = String(s.uiMode || "").trim().toLowerCase(), l = String(s.defaultTab || "").trim().toLowerCase(), S = String(s.viewerMode || "").trim().toLowerCase(), E = String(s.viewerBanner || "").trim().toLowerCase();
  return {
    token: String(s.token || "").trim(),
    apiBasePath: String(s.apiBasePath || "/api/v1/esign/signing").trim(),
    signerBasePath: String(s.signerBasePath || "/sign").trim(),
    resourceBasePath: String(s.resourceBasePath || "").trim(),
    reviewApiPath: String(s.reviewApiPath || "").trim(),
    assetContractPath: String(s.assetContractPath || "").trim(),
    telemetryPath: String(s.telemetryPath || "").trim(),
    agreementId: String(s.agreementId || "").trim(),
    sessionKind: String(s.sessionKind || "signer").trim() || "signer",
    uiMode: f || "sign",
    defaultTab: l || "sign",
    viewerMode: S,
    viewerBanner: E,
    recipientId: String(s.recipientId || "").trim(),
    recipientEmail: String(s.recipientEmail || "").trim(),
    recipientName: String(s.recipientName || "").trim(),
    pageCount: Number(s.pageCount || 1) || 1,
    hasConsented: !!s.hasConsented,
    canSign: s.canSign !== !1,
    reviewMarkersVisible: s.reviewMarkersVisible !== !1,
    reviewMarkersInteractive: s.reviewMarkersInteractive !== !1,
    fields: Array.isArray(s.fields) ? s.fields : [],
    review: ft(s.review),
    flowMode: s.flowMode || "unified",
    telemetryEnabled: s.telemetryEnabled !== !1,
    viewer: {
      coordinateSpace: s.viewer?.coordinateSpace || "pdf",
      contractVersion: String(s.viewer?.contractVersion || "1.0"),
      unit: s.viewer?.unit || "pt",
      origin: s.viewer?.origin || "top-left",
      yAxisDirection: s.viewer?.yAxisDirection || "down",
      pages: Array.isArray(s.viewer?.pages) ? s.viewer?.pages : [],
      compatibilityTier: String(s.viewer?.compatibilityTier || "").trim().toLowerCase(),
      compatibilityReason: String(s.viewer?.compatibilityReason || "").trim().toLowerCase(),
      compatibilityMessage: String(s.viewer?.compatibilityMessage || "").trim()
    },
    signerState: s.signerState || "active",
    recipientStage: Number(s.recipientStage || 1) || 1,
    activeStage: Number(s.activeStage || 1) || 1,
    activeRecipientIds: Array.isArray(s.activeRecipientIds) ? s.activeRecipientIds : [],
    waitingForRecipientIds: Array.isArray(s.waitingForRecipientIds) ? s.waitingForRecipientIds : [],
    profile: {
      mode: d,
      rememberByDefault: s.profile?.rememberByDefault !== !1,
      ttlDays: Number(s.profile?.ttlDays || pt) || pt,
      persistDrawnSignature: !!s.profile?.persistDrawnSignature,
      endpointBasePath: String(s.profile?.endpointBasePath || String(s.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function ni(s) {
  return !s || typeof s != "object" ? null : {
    id: String(s.id || "").trim(),
    participant_type: String(s.participant_type || "").trim(),
    recipient_id: String(s.recipient_id || "").trim(),
    email: String(s.email || "").trim(),
    display_name: String(s.display_name || "").trim(),
    decision_status: String(s.decision_status || "").trim(),
    effective_decision_status: String(s.effective_decision_status || s.decision_status || "").trim(),
    approved_on_behalf: !!s.approved_on_behalf,
    approved_on_behalf_reason: String(s.approved_on_behalf_reason || "").trim(),
    approved_on_behalf_by_user_id: String(s.approved_on_behalf_by_user_id || "").trim(),
    approved_on_behalf_by_display_name: String(s.approved_on_behalf_by_display_name || "").trim(),
    approved_on_behalf_at: String(s.approved_on_behalf_at || "").trim()
  };
}
function ri(s, d) {
  if (!d || typeof d != "object") return null;
  const f = String(s || "").trim(), l = f.includes(":") ? f.split(":", 1)[0] : "", S = f.includes(":") ? f.slice(f.indexOf(":") + 1) : "";
  return {
    name: String(d.name || "").trim(),
    email: String(d.email || "").trim(),
    role: String(d.role || "").trim(),
    actor_type: String(d.actor_type || l).trim(),
    actor_id: String(d.actor_id || S).trim()
  };
}
function ii(s) {
  if (!s || typeof s != "object") return {};
  const d = {};
  return Object.entries(s).forEach(([f, l]) => {
    const S = String(f || "").trim();
    if (!S) return;
    const E = ri(S, l);
    E && (d[S] = E);
  }), d;
}
function dn(s, ...d) {
  if (!(!s || typeof s != "object")) {
    for (const f of d)
      if (Object.prototype.hasOwnProperty.call(s, f) && s[f] != null)
        return s[f];
  }
}
function I(s, ...d) {
  const f = dn(s, ...d);
  return f == null ? "" : String(f).trim();
}
function gt(s, ...d) {
  const f = dn(s, ...d);
  return f == null || f === "" ? 0 : Number(f) || 0;
}
function ai(s) {
  if (!s || typeof s != "object") return null;
  const d = s.thread && typeof s.thread == "object" ? s.thread : {}, f = Array.isArray(s.messages) ? s.messages : [];
  return {
    thread: {
      id: I(d, "id", "ID"),
      review_id: I(d, "review_id", "reviewId", "ReviewID"),
      agreement_id: I(d, "agreement_id", "agreementId", "AgreementID"),
      visibility: I(d, "visibility", "Visibility") || "shared",
      anchor_type: I(d, "anchor_type", "anchorType", "AnchorType") || "agreement",
      page_number: gt(d, "page_number", "pageNumber", "PageNumber"),
      field_id: I(d, "field_id", "fieldId", "FieldID"),
      anchor_x: gt(d, "anchor_x", "anchorX", "AnchorX"),
      anchor_y: gt(d, "anchor_y", "anchorY", "AnchorY"),
      status: I(d, "status", "Status") || "open",
      created_by_type: I(d, "created_by_type", "createdByType", "CreatedByType"),
      created_by_id: I(d, "created_by_id", "createdByID", "CreatedByID"),
      resolved_by_type: I(d, "resolved_by_type", "resolvedByType", "ResolvedByType"),
      resolved_by_id: I(d, "resolved_by_id", "resolvedByID", "ResolvedByID"),
      resolved_at: I(d, "resolved_at", "resolvedAt", "ResolvedAt"),
      last_activity_at: I(d, "last_activity_at", "lastActivityAt", "LastActivityAt")
    },
    messages: f.filter((l) => l && typeof l == "object").map((l) => ({
      id: I(l, "id", "ID"),
      thread_id: I(l, "thread_id", "threadId", "ThreadID"),
      body: I(l, "body", "Body"),
      created_by_type: I(l, "created_by_type", "createdByType", "CreatedByType"),
      created_by_id: I(l, "created_by_id", "createdByID", "CreatedByID"),
      created_at: I(l, "created_at", "createdAt", "CreatedAt")
    }))
  };
}
function ft(s) {
  if (!s || typeof s != "object") return null;
  const d = Array.isArray(s.threads) ? s.threads.map(ai).filter(Boolean) : [], f = ii(s.actor_map || s.actorMap), l = Array.isArray(s.blockers) ? s.blockers.map((S) => String(S || "").trim()).filter(Boolean) : [];
  return {
    review_id: String(s.review_id || "").trim(),
    status: String(s.status || "").trim(),
    gate: String(s.gate || "").trim(),
    comments_enabled: !!s.comments_enabled,
    override_active: !!s.override_active,
    override_reason: String(s.override_reason || "").trim(),
    override_by_user_id: String(s.override_by_user_id || "").trim(),
    override_by_display_name: String(s.override_by_display_name || "").trim(),
    override_at: String(s.override_at || "").trim(),
    is_reviewer: !!s.is_reviewer,
    can_comment: !!s.can_comment,
    can_approve: !!s.can_approve,
    can_request_changes: !!s.can_request_changes,
    can_sign: s.can_sign !== !1,
    participant_status: String(s.participant_status || "").trim(),
    approved_count: Number(s.approved_count || 0) || 0,
    total_approvers: Number(s.total_approvers || 0) || 0,
    sign_blocked: !!s.sign_blocked,
    sign_block_reason: String(s.sign_block_reason || "").trim(),
    blockers: l,
    participant: ni(s.participant),
    actor_map: f,
    open_thread_count: Number(s.open_thread_count || 0) || 0,
    resolved_thread_count: Number(s.resolved_thread_count || 0) || 0,
    threads: d
  };
}
function mt(s) {
  switch (String(s?.thread?.anchor_type || "").trim()) {
    case "field":
      return s?.thread?.field_id ? `Field ${s.thread.field_id}` : "Field";
    case "page":
      return s?.thread?.page_number ? `Page ${s.thread.page_number}` : "Page";
    default:
      return "Global Comment";
  }
}
function oi(s) {
  const d = String(s?.thread?.anchor_type || "").trim();
  return d === "page" || d === "field";
}
function he(s) {
  const d = ve(s);
  switch (d) {
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
      return d ? d.replace(/_/g, " ") : "Inactive";
  }
}
function ve(s) {
  return String(s || "").trim().toLowerCase();
}
function be(s) {
  return ve(s?.participant_status || s?.participant?.effective_decision_status || s?.participant?.decision_status);
}
function si(s) {
  const d = be(s);
  return d === "approved" || d === "changes_requested";
}
function ci(s) {
  return !s || s.override_active || !s.can_approve && !s.can_request_changes ? !1 : !si(s);
}
function di(s) {
  if (!s || typeof s != "object")
    return "Track review status, comments, and decision actions.";
  const d = ve(s.status), f = be(s), l = Number(s.approved_count || 0) || 0, S = Number(s.total_approvers || 0) || 0;
  if (s.override_active) {
    const E = String(s.override_reason || "").trim(), b = String(s.override_by_display_name || "").trim(), a = b && !looksLikeUUID(b) ? b : "";
    return E ? `Review was finalized by admin override${a ? ` by ${a}` : ""}. Reason: ${E}` : `Review was finalized by admin override${a ? ` by ${a}` : ""}.`;
  }
  if (s?.participant?.approved_on_behalf) {
    const E = String(s.participant.approved_on_behalf_by_display_name || "").trim(), b = E && !looksLikeUUID(E) ? E : "";
    return b ? `Your review decision was recorded on your behalf by ${b}.` : "Your review decision was recorded on your behalf by an admin.";
  }
  return f === "approved" && d === "in_review" ? S > 0 ? `Your approval is recorded. ${l} of ${S} approvers have approved so far.` : "Your approval is recorded. Waiting for the remaining reviewers before this document can proceed." : f === "approved" && d === "approved" ? S > 0 ? `All approvers approved (${l} of ${S}). Review is complete.` : "All reviewers approved. Review is complete." : f === "changes_requested" ? "Your change request is recorded. The sender must resolve it before this document can proceed." : d === "in_review" && S > 0 ? `${l} of ${S} approvers have approved so far.` : s.gate ? `Gate: ${String(s.gate || "").replace(/_/g, " ")}` : "Track review status, comments, and decision actions.";
}
function li(s) {
  const d = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", f = s.recipientEmail ? s.recipientEmail.trim().toLowerCase() : s.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${d}:${f}`);
}
function ui(s) {
  const d = String(s || "").trim();
  if (!d) return "";
  try {
    return decodeURIComponent(d);
  } catch {
    return d;
  }
}
function gi(s) {
  const d = String(s || "").trim().toLowerCase();
  return d === "[drawn]" || d === "[drawn initials]";
}
function D(s) {
  const d = String(s || "").trim();
  return gi(d) ? "" : d;
}
function mi(s) {
  const d = new Zr(s.profile.ttlDays);
  if (!s.canSign || String(s.sessionKind).trim().toLowerCase() === "reviewer")
    return new Ue("local_only", d, null);
  const f = new ei(s.profile.endpointBasePath, s.token);
  return s.profile.mode === "local_only" ? new Ue("local_only", d, null) : s.profile.mode === "remote_only" ? new Ue("remote_only", d, f) : new Ue("hybrid", d, f);
}
function pi(s) {
  const d = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!d) return;
  const f = d;
  if (f.dataset.esignBootstrapped === "true")
    return;
  f.dataset.esignBootstrapped = "true";
  const l = ti(s), S = li(l), E = mi(l), b = {
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
    /**
     * Track a telemetry event
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    track(e, t = {}) {
      if (!l.telemetryEnabled) return;
      const n = {
        event: e,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: l.flowMode,
        agreementId: l.agreementId,
        ...t
      };
      this.events.push(n), this.isCriticalEvent(e) && this.flush();
    },
    /**
     * Check if event is critical and should be sent immediately
     * @param {string} eventName - Event name
     * @returns {boolean}
     */
    isCriticalEvent(e) {
      return [
        "viewer_load_failed",
        "submit_success",
        "submit_failed",
        "viewer_critical_error",
        "consent_declined"
      ].includes(e);
    },
    /**
     * Track viewer load completion
     * @param {boolean} success - Whether load succeeded
     * @param {number} duration - Load duration in ms
     * @param {string} error - Error message if failed
     */
    trackViewerLoad(e, t, n = null) {
      this.metrics.viewerLoadTime = t, this.track(e ? "viewer_load_success" : "viewer_load_failed", {
        duration: t,
        error: n,
        pageCount: l.pageCount
      });
    },
    /**
     * Track field save operation
     * @param {string} fieldId - Field ID
     * @param {string} fieldType - Field type
     * @param {boolean} success - Whether save succeeded
     * @param {number} latency - Operation latency in ms
     * @param {string} error - Error message if failed
     */
    trackFieldSave(e, t, n, r, i = null) {
      this.metrics.fieldSaveLatencies.push(r), n ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({ type: "field_save", fieldId: e, error: i }), this.track(n ? "field_save_success" : "field_save_failed", {
        fieldId: e,
        fieldType: t,
        latency: r,
        error: i
      });
    },
    /**
     * Track signature attachment
     * @param {string} fieldId - Field ID
     * @param {string} signatureType - 'typed' or 'drawn'
     * @param {boolean} success - Whether attach succeeded
     * @param {number} latency - Operation latency in ms
     * @param {string} error - Error message if failed
     */
    trackSignatureAttach(e, t, n, r, i = null) {
      this.metrics.signatureAttachLatencies.push(r), this.track(n ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: e,
        signatureType: t,
        latency: r,
        error: i
      });
    },
    /**
     * Track consent action
     * @param {boolean} accepted - Whether consent was accepted
     */
    trackConsent(e) {
      this.metrics.consentTime = Date.now() - this.startTime, this.track(e ? "consent_accepted" : "consent_declined", {
        timeToConsent: this.metrics.consentTime
      });
    },
    /**
     * Track submission
     * @param {boolean} success - Whether submit succeeded
     * @param {string} error - Error message if failed
     */
    trackSubmit(e, t = null) {
      this.metrics.submitTime = Date.now() - this.startTime, this.track(e ? "submit_success" : "submit_failed", {
        timeToSubmit: this.metrics.submitTime,
        fieldsCompleted: this.metrics.fieldsCompleted,
        totalFields: a.fieldState.size,
        error: t
      });
    },
    /**
     * Track page navigation
     * @param {number} pageNum - Page number viewed
     */
    trackPageView(e) {
      this.metrics.pagesViewed.has(e) || (this.metrics.pagesViewed.add(e), this.track("page_viewed", {
        pageNum: e,
        totalPagesViewed: this.metrics.pagesViewed.size
      }));
    },
    /**
     * Track viewer critical error
     * @param {string} reason - Reason for error
     */
    trackViewerCriticalError(e) {
      this.track("viewer_critical_error", {
        reason: e,
        timeBeforeError: Date.now() - this.startTime,
        pagesViewed: this.metrics.pagesViewed.size,
        fieldsCompleted: this.metrics.fieldsCompleted
      });
    },
    /**
     * Track degraded mode
     * @param {string} degradationType - Type of degradation
     * @param {Object} details - Additional details
     */
    trackDegradedMode(e, t = {}) {
      this.track("degraded_mode", {
        degradationType: e,
        ...t
      });
    },
    /**
     * Get session summary for debugging
     * @returns {Object}
     */
    getSessionSummary() {
      return {
        sessionId: this.sessionId,
        duration: Date.now() - this.startTime,
        flowMode: l.flowMode,
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
    /**
     * Calculate average of array
     * @param {number[]} arr - Array of numbers
     * @returns {number}
     */
    calculateAverage(e) {
      return e.length ? Math.round(e.reduce((t, n) => t + n, 0) / e.length) : 0;
    },
    /**
     * Flush events to backend
     */
    async flush() {
      if (!l.telemetryEnabled || this.events.length === 0) return;
      const e = vn();
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
        } else
          await fetch(e, {
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
    hasConsented: l.hasConsented,
    canSignSession: l.canSign,
    signatureCanvases: /* @__PURE__ */ new Map(),
    signatureTabByField: /* @__PURE__ */ new Map(),
    savedSignaturesByType: /* @__PURE__ */ new Map(),
    pendingSaves: /* @__PURE__ */ new Set(),
    // Performance state
    renderedPages: /* @__PURE__ */ new Map(),
    // Map of page number to rendered canvas
    pageRenderQueue: [],
    maxCachedPages: 5,
    // Limit memory usage
    isLowMemory: !1,
    lastRenderTime: 0,
    renderDebounceMs: 100,
    profileKey: S,
    profileData: null,
    profileRemember: l.profile.rememberByDefault,
    reviewContext: l.review ? ft(l.review) : null,
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
    inlineComposerPosition: { x: 0, y: 0 },
    inlineComposerAnchor: null,
    activePanelTab: String(l.defaultTab).trim().toLowerCase() === "review" ? "review" : "sign"
  };
  function R() {
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
  function un(e, t = 4e3) {
    const n = Number(e || 0) || 0;
    return !n || qe(n) ? Promise.resolve() : new Promise((r, i) => {
      const o = window.setTimeout(() => {
        const u = (Array.isArray(a.pageRenderWaiters.get(n)) ? a.pageRenderWaiters.get(n) : []).filter((p) => p?.resolve !== r);
        u.length ? a.pageRenderWaiters.set(n, u) : a.pageRenderWaiters.delete(n), i(new Error(`Timed out rendering page ${n}.`));
      }, t), c = Array.isArray(a.pageRenderWaiters.get(n)) ? a.pageRenderWaiters.get(n) : [];
      c.push({ resolve: r, reject: i, timer: o }), a.pageRenderWaiters.set(n, c), qe(n) && we(n);
    });
  }
  function ze(e) {
    const t = a.fieldState.get(e);
    t && (delete t.previewValueText, delete t.previewValueBool, delete t.previewSignatureUrl);
  }
  function gn() {
    a.fieldState.forEach((e) => {
      delete e.previewValueText, delete e.previewValueBool, delete e.previewSignatureUrl;
    });
  }
  function bt(e, t) {
    const n = a.fieldState.get(e);
    if (!n) return;
    const r = D(String(t || ""));
    if (!r) {
      delete n.previewValueText;
      return;
    }
    n.previewValueText = r, delete n.previewValueBool, delete n.previewSignatureUrl;
  }
  function vt(e, t) {
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
    const e = String(l.uiMode).trim().toLowerCase();
    return e === "sign" || e === "review" || e === "sign_and_review" ? e : String(l.sessionKind).trim().toLowerCase() === "reviewer" ? "review" : $() ? "sign_and_review" : "sign";
  }
  function mn() {
    const e = String(l.defaultTab).trim().toLowerCase();
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
  function He() {
    return !$() || !l.reviewMarkersVisible ? !1 : xe();
  }
  function pn() {
    return !He() || !l.reviewMarkersInteractive ? !1 : yt();
  }
  function yt() {
    return $() && a.reviewContext?.comments_enabled && a.reviewContext?.can_comment && xe();
  }
  function Se() {
    return String(l.sessionKind).trim().toLowerCase() === "sender";
  }
  function fn() {
    const e = String(l.viewerMode || "").trim().toLowerCase();
    return e === "review" || e === "sign" || e === "complete" || e === "read_only" ? e : "read_only";
  }
  function hn() {
    const e = String(l.viewerBanner || "").trim().toLowerCase();
    switch (e) {
      case "sender_review":
      case "sender_progress":
      case "sender_complete":
      case "sender_read_only":
        return e;
      default:
        switch (fn()) {
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
    const e = String(l.resourceBasePath || "").trim();
    return e || `${l.apiBasePath}/session/${encodeURIComponent(l.token)}`;
  }
  function St() {
    return xt();
  }
  function bn() {
    const e = String(l.reviewApiPath || "").trim();
    return e || `${St()}/review`;
  }
  function Ct() {
    const e = String(l.assetContractPath || "").trim();
    if (e) return e;
    const t = String(l.token || "").trim();
    return !Se() && t ? `${l.apiBasePath}/assets/${encodeURIComponent(t)}` : `${xt()}/assets`;
  }
  function vn() {
    const e = String(l.telemetryPath || "").trim();
    if (e) return e;
    const t = String(l.token || "").trim();
    return t ? `${l.apiBasePath}/telemetry/${encodeURIComponent(t)}` : "";
  }
  function _t(e) {
    return !e || typeof e != "object" ? "" : String(
      e.preview_url || e.source_url || e.executed_url || e.certificate_url || ""
    ).trim();
  }
  function Tt(e, t) {
    return (Array.isArray(e) ? e : []).filter((n) => String(n?.thread?.status || "").trim() === t).length;
  }
  function K(e, t) {
    const n = String(e || "").trim(), r = String(t || "").trim();
    return !n || !r ? "" : `${n}:${r}`;
  }
  function Q(e) {
    const t = String(e || "").trim();
    return t === "user" || t === "sender" ? "Sender" : t === "reviewer" ? "Reviewer" : t === "external" ? "External Reviewer" : t === "recipient" || t === "signer" ? "Signer" : t ? t.replace(/_/g, " ").replace(/\b\w/g, (n) => n.toUpperCase()) : "Participant";
  }
  function N(e) {
    if (!e || typeof e != "string") return !1;
    const t = e.trim(), n = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, r = /^[0-9a-f]{24,32}$/i;
    return n.test(t) || r.test(t);
  }
  function wn(e) {
    if (!e) return null;
    const t = a.reviewContext?.participant;
    if (!t) return null;
    const n = String(e).trim(), r = String(t.id || "").trim(), i = String(t.recipient_id || "").trim();
    return r === n || i === n ? t : null;
  }
  function yn(e, t) {
    const n = a.reviewContext?.actor_map || {}, r = [], i = String(e || "").trim(), o = String(t || "").trim();
    i === "recipient" || i === "signer" ? r.push(K("recipient", t), K("signer", t)) : i === "user" || i === "sender" ? r.push(K("user", t), K("sender", t)) : i === "reviewer" || i === "external" ? r.push(K("reviewer", t), K("external", t)) : r.push(K(i, t));
    const c = r.map((p) => n[p]).find(Boolean);
    if (c) {
      const p = String(c.name || "").trim(), m = String(c.email || "").trim();
      if (p && !N(p))
        return c;
      if (m && !N(m))
        return { ...c, name: m };
    }
    const g = wn(o);
    if (g) {
      const p = String(g.display_name || "").trim(), m = String(g.email || "").trim();
      if (p && !N(p))
        return {
          name: p,
          email: m,
          role: i,
          actor_type: i,
          actor_id: o
        };
      if (m && !N(m))
        return {
          name: m,
          email: m,
          role: i,
          actor_type: i,
          actor_id: o
        };
    }
    return {
      name: Q(i) || "Unknown User",
      email: "",
      role: i,
      actor_type: i,
      actor_id: o
    };
  }
  function Ce(e, t = "P") {
    const n = String(e || "").trim();
    if (!n) return String(t || "P").trim().slice(0, 2).toUpperCase() || "P";
    const r = n.split(/\s+/).map((i) => i[0] || "").join("").replace(/[^a-z0-9]/ig, "").toUpperCase();
    return r ? r.slice(0, 2) : n.replace(/[^a-z0-9]/ig, "").slice(0, 2).toUpperCase() || String(t || "P").trim().slice(0, 2).toUpperCase() || "P";
  }
  function je(e, t) {
    const n = yn(e, t), r = String(n?.actor_type || e || "").trim();
    let i = "#64748b";
    (r === "user" || r === "sender") && (i = "#2563eb"), (r === "reviewer" || r === "external") && (i = "#7c3aed"), (r === "recipient" || r === "signer") && (i = "#059669");
    const o = String(n?.name || n?.email || Q(r)).trim() || "Participant", c = n?.name && !N(n.name) ? n.name : n?.email && !N(n.email) ? n.email : Q(r);
    return {
      actor: n,
      name: o,
      role: Q(n?.role || r),
      initials: Ce(c, Q(r)),
      color: i
    };
  }
  function xn(e) {
    if (!e) return "";
    const t = String(e.display_name || "").trim(), n = String(e.email || "").trim();
    if (t && !N(t)) return t;
    if (n && !N(n)) return n;
    const r = String(e.participant_type || "").trim();
    return r ? Q(r) : "Participant";
  }
  function Et(e) {
    const t = String(e || "").trim();
    if (!t) return "";
    const n = new Date(t);
    return Number.isNaN(n.getTime()) ? t : n.toLocaleString();
  }
  function Sn(e) {
    a.reviewContext = ft(e), a.reviewContext && (Array.isArray(a.reviewContext.threads) || (a.reviewContext.threads = []), a.reviewContext.open_thread_count = Tt(a.reviewContext.threads, "open"), a.reviewContext.resolved_thread_count = Tt(a.reviewContext.threads, "resolved")), W() ? a.activePanelTab = "review" : $() ? ie() || (a.activePanelTab = mn()) : a.activePanelTab = "sign", j(), R(), ce(), z();
  }
  async function ae() {
    const e = await fetch(St(), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin"
    });
    if (!e.ok)
      throw await q(e, "Failed to reload review session");
    const t = await e.json(), n = t?.session && typeof t.session == "object" ? t.session : {};
    return a.canSignSession = n.can_sign !== !1, Sn(n.review || null), n;
  }
  async function Cn(e) {
    return Xr(e);
  }
  async function oe(e, t = {}, n = "Review request failed") {
    const r = await fetch(`${bn()}${e}`, {
      credentials: "same-origin",
      ...t,
      headers: {
        Accept: "application/json",
        ...t?.body ? { "Content-Type": "application/json" } : {},
        ...t?.headers || {}
      }
    });
    if (!r.ok)
      throw await q(r, n);
    return Cn(r);
  }
  function Z() {
    const e = document.getElementById("review-thread-anchor");
    return String(e?.value || "agreement").trim() || "agreement";
  }
  function Pt() {
    a.highlightedReviewThreadID = "", a.highlightedReviewThreadTimer && (window.clearTimeout(a.highlightedReviewThreadTimer), a.highlightedReviewThreadTimer = null);
  }
  function Lt(e) {
    Pt(), a.highlightedReviewThreadID = String(e || "").trim(), a.highlightedReviewThreadID && (a.highlightedReviewThreadTimer = window.setTimeout(() => {
      Pt(), $t(), R();
    }, 2400), $t(), R());
  }
  function _n(e) {
    {
      a.reviewAnchorPointDraft = null, ee(), R();
      return;
    }
  }
  function Tn(e) {
    a.pickingReviewAnchorPoint = !!e && Z() === "page", document.getElementById("pdf-container")?.classList.toggle("review-anchor-picking", a.pickingReviewAnchorPoint), a.pickingReviewAnchorPoint ? w("Click on the document page to add a comment.") : (w("Comment pin placement cancelled."), se()), ee();
  }
  function En(e, t, n) {
    if (!$() || !a.reviewContext?.comments_enabled || !a.reviewContext?.can_comment)
      return;
    a.inlineComposerPosition = { x: e, y: t }, a.inlineComposerAnchor = n, a.inlineComposerVisible = !0;
    let r = document.getElementById("inline-comment-composer");
    r || (r = Pn(), document.body.appendChild(r));
    const i = window.innerWidth, o = window.innerHeight, c = 320, g = 200, u = 16;
    let p = e + 20, m = t - g / 2;
    p + c > i - u && (p = e - c - 20), p < u && (p = u), m < u && (m = u), m + g > o - u && (m = o - g - u), r.style.left = `${p}px`, r.style.top = `${m}px`, r.classList.remove("hidden");
    const v = r.querySelector("textarea");
    v && setTimeout(() => v.focus(), 100), w("Comment composer opened. Type your comment and press submit.");
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
  function Pn() {
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
  async function Ln() {
    if (!a.inlineComposerAnchor) return;
    const e = document.getElementById("inline-comment-body"), t = String(e?.value || "").trim();
    if (!t) {
      w("Enter a comment before submitting.", "assertive");
      return;
    }
    const n = {
      thread: {
        review_id: a.reviewContext.review_id,
        visibility: "shared",
        body: t,
        anchor_type: "page",
        page_number: a.inlineComposerAnchor.page_number,
        anchor_x: a.inlineComposerAnchor.anchor_x,
        anchor_y: a.inlineComposerAnchor.anchor_y
      }
    };
    try {
      await oe("/threads", {
        method: "POST",
        body: JSON.stringify(n)
      }, "Failed to create review comment"), se(), a.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), await ae(), w("Comment added successfully.");
    } catch (r) {
      console.error("Failed to submit inline comment:", r), window.toastManager && window.toastManager.error("Failed to add comment");
    }
  }
  function ee() {
    const e = document.getElementById("review-anchor-point-controls"), t = document.getElementById("review-anchor-point-status"), n = document.querySelector('[data-esign-action="pick-review-anchor-point"]'), r = document.querySelector('[data-esign-action="clear-review-anchor-point"]'), i = Z() === "page";
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
    const t = a.reviewContext, n = ve(t.status), r = be(t);
    e.classList.remove("hidden");
    const i = document.getElementById("review-step-draft"), o = document.getElementById("review-step-sent"), c = document.getElementById("review-step-review"), g = document.getElementById("review-step-decision"), u = e.querySelectorAll(".review-progress-line");
    if ([i, o, c, g].forEach((p) => {
      p?.classList.remove("completed", "active", "changes-requested");
    }), u.forEach((p) => {
      p.classList.remove("completed", "active");
    }), n === "approved") {
      i?.classList.add("completed"), o?.classList.add("completed"), c?.classList.add("completed"), g?.classList.add("completed"), u.forEach((m) => m.classList.add("completed"));
      const p = g?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    } else if (n === "changes_requested") {
      i?.classList.add("completed"), o?.classList.add("completed"), c?.classList.add("completed"), g?.classList.add("changes-requested"), u.forEach((m) => m.classList.add("completed"));
      const p = g?.querySelector("i");
      p && (p.className = "iconoir-warning-circle text-xs");
    } else if (r === "approved" && n === "in_review") {
      i?.classList.add("completed"), o?.classList.add("completed"), c?.classList.add("completed"), g?.classList.add("active"), u.forEach((m) => m.classList.add("completed"));
      const p = g?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    } else if (n === "in_review" || n === "pending") {
      i?.classList.add("completed"), o?.classList.add("completed"), c?.classList.add("active"), u[0] && u[0].classList.add("completed"), u[1] && u[1].classList.add("completed"), u[2] && u[2].classList.add("active");
      const p = g?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    } else {
      i?.classList.add("active");
      const p = g?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    }
  }
  function kn() {
    const e = Z();
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
  function j() {
    const e = document.getElementById("review-panel"), t = document.getElementById("review-banner"), n = document.getElementById("review-status-chip"), r = document.getElementById("review-panel-subtitle"), i = document.getElementById("review-participant-summary"), o = document.getElementById("review-decision-actions"), c = document.getElementById("review-thread-summary"), g = document.getElementById("review-thread-composer"), u = document.getElementById("review-thread-list"), p = document.getElementById("review-thread-composer-hint");
    if (!e || !u) return;
    if (!$()) {
      e.classList.add("hidden"), t?.classList.add("hidden"), ee(), Oe();
      return;
    }
    const m = a.reviewContext, v = he(m.status), y = be(m);
    if (!xe()) {
      e.classList.add("hidden"), t?.classList.add("hidden"), Oe();
      return;
    }
    if (e.classList.remove("hidden"), Oe(), n && (n.textContent = v, n.className = "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + (m.status === "approved" ? "bg-emerald-100 text-emerald-700" : m.status === "changes_requested" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700")), r && (r.textContent = di(m)), i) {
      const _ = xn(m.participant);
      if (_ || y) {
        i.classList.remove("hidden"), i.className = "rounded-lg border px-3 py-2 text-xs", y === "approved" ? i.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-800") : y === "changes_requested" ? i.classList.add("border-amber-200", "bg-amber-50", "text-amber-800") : i.classList.add("border-slate-200", "bg-slate-50", "text-slate-700");
        const x = String(m.participant?.approved_on_behalf_by_display_name || "").trim(), T = x && !N(x) ? x : "", k = m.participant?.approved_on_behalf ? ` • approved on behalf${T ? ` by ${T}` : ""}` : "";
        i.textContent = _ ? `${_} • decision ${he(y || "pending")}${k}` : `Decision ${he(y || "pending")}${k}`;
      } else
        i.classList.add("hidden");
    }
    if (o && o.classList.toggle("hidden", !ci(m)), c) {
      c.classList.remove("hidden");
      const _ = [];
      (Number(m.total_approvers || 0) || 0) > 0 && _.push(`${m.approved_count || 0} of ${m.total_approvers || 0} approvers approved`), _.push(`${m.open_thread_count || 0} open`), _.push(`${m.resolved_thread_count || 0} resolved`), c.textContent = _.join(" • ");
    }
    if (g) {
      const _ = m.comments_enabled && m.can_comment && !m.override_active;
      g.classList.toggle("hidden", !_), p && (Z() === "field" && a.activeFieldId ? p.textContent = "Comment will be anchored to the active field." : p.textContent = "Click Global Comment for agreement-level feedback, or click directly on the document to add a positioned comment.");
    }
    if (t) {
      const _ = [];
      if (m.override_active) {
        const x = String(m.override_reason || "").trim(), T = String(m.override_by_display_name || "").trim(), k = T && !N(T) ? T : "";
        _.push(x ? `Review finalized by admin override${k ? ` by ${k}` : ""}. ${x}` : `Review finalized by admin override${k ? ` by ${k}` : ""}.`);
      }
      m.sign_blocked && m.sign_block_reason && _.push(m.sign_block_reason), (Array.isArray(m.blockers) ? m.blockers : []).forEach((x) => {
        const T = String(x || "").trim();
        T && !_.includes(T) && _.push(T);
      }), _.length ? (t.classList.remove("hidden"), t.className = "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4", t.innerHTML = `
          <div class="flex items-start gap-3">
            <i class="iconoir-warning-circle mt-0.5 text-amber-600" aria-hidden="true"></i>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-amber-900">Review Status</p>
              <p class="mt-1 text-xs text-amber-800">${L(_.join(" "))}</p>
            </div>
          </div>
        `) : t.classList.add("hidden");
    }
    Ye(), ee();
    const P = Array.isArray(m.threads) ? m.threads : [];
    if (!P.length) {
      u.innerHTML = '<div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">No review comments yet.</div>';
      return;
    }
    const h = a.reviewThreadFilter || "all", C = P.filter((_) => {
      const x = String(_?.thread?.status || "").trim();
      return h === "open" ? x === "open" : h === "resolved" ? x === "resolved" : !0;
    }), B = 5, A = Math.ceil(C.length / B), M = Math.min(a.reviewThreadPage || 1, A || 1), O = (M - 1) * B, G = C.slice(O, O + B), V = P.length > 0 ? `
      <div class="flex items-center gap-2 mb-3 border-b border-gray-100 pb-2">
        <button type="button" data-esign-action="filter-review-threads" data-filter="all" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${h === "all" ? "bg-slate-100 text-slate-800" : "text-gray-500 hover:text-gray-700"}">
          All (${P.length})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="open" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${h === "open" ? "bg-blue-100 text-blue-700" : "text-gray-500 hover:text-gray-700"}">
          Open (${m.open_thread_count || 0})
        </button>
        <button type="button" data-esign-action="filter-review-threads" data-filter="resolved" class="review-thread-filter px-2 py-1 text-xs font-medium rounded transition-colors ${h === "resolved" ? "bg-emerald-100 text-emerald-700" : "text-gray-500 hover:text-gray-700"}">
          Resolved (${m.resolved_thread_count || 0})
        </button>
      </div>
    ` : "", Y = A > 1 ? `
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span class="text-xs text-gray-500">Page ${M} of ${A}</span>
        <div class="flex gap-2">
          <button type="button" data-esign-action="page-review-threads" data-page="${M - 1}" class="px-2 py-1 text-xs font-medium rounded border ${M <= 1 ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${M <= 1 ? "disabled" : ""}>
            <i class="iconoir-nav-arrow-left"></i> Prev
          </button>
          <button type="button" data-esign-action="page-review-threads" data-page="${M + 1}" class="px-2 py-1 text-xs font-medium rounded border ${M >= A ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${M >= A ? "disabled" : ""}>
            Next <i class="iconoir-nav-arrow-right"></i>
          </button>
        </div>
      </div>
    ` : "";
    if (C.length === 0) {
      u.innerHTML = `
        ${V}
        <div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No ${h === "all" ? "" : h} comments${h !== "all" ? ". Try a different filter." : "."}
        </div>
      `;
      return;
    }
    const H = G.map((_) => {
      const x = _.thread || {}, T = Array.isArray(_.messages) ? _.messages : [], k = m.comments_enabled && m.can_comment, ne = k && String(x.status || "").trim() === "open", Me = k && String(x.status || "").trim() === "resolved", nn = mt(_), me = Et(x.last_activity_at || ""), pe = `review-reply-${L(String(x.id || ""))}`, lt = `review-reply-composer-${L(String(x.id || ""))}`, jr = String(x.status || "").trim() === "resolved" ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200", ut = je(T[0]?.created_by_type || x.created_by_type, T[0]?.created_by_id || x.created_by_id);
      let De = "border-l-slate-300";
      ut.color === "#2563eb" && (De = "border-l-blue-400"), ut.color === "#7c3aed" && (De = "border-l-purple-400"), ut.color === "#059669" && (De = "border-l-emerald-400");
      const Or = String(x.id || "").trim() === String(a.highlightedReviewThreadID || "").trim(), Yr = String(x.visibility || "shared").trim() === "internal" ? '<span class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700"><i class="iconoir-lock text-[10px]"></i>Internal</span>' : "", rn = oi(_);
      return `
        <article
          class="rounded-xl border ${jr} border-l-4 ${De} p-4 ${Or ? "ring-2 ring-blue-200 shadow-sm" : ""} ${rn ? "cursor-pointer" : ""}"
          data-review-thread-id="${L(String(x.id || ""))}"
          ${rn ? 'data-esign-action="highlight-review-marker"' : ""}
          tabindex="-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" data-esign-action="go-review-thread-anchor" data-thread-id="${L(String(x.id || ""))}" class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">${L(nn)}</button>
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${String(x.status || "").trim() === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}">${L(he(x.status || "open"))}</span>
                ${Yr}
              </div>
              ${me ? `<p class="mt-2 text-xs text-gray-500">Last activity ${L(me)}</p>` : ""}
            </div>
          </div>
          <div class="mt-3 space-y-3">
            ${T.map((Fe) => {
        const fe = je(Fe.created_by_type, Fe.created_by_id);
        let Ne = "bg-slate-50";
        return fe.color === "#2563eb" && (Ne = "bg-blue-50 border-l-2 border-l-blue-300"), fe.color === "#7c3aed" && (Ne = "bg-purple-50 border-l-2 border-l-purple-300"), fe.color === "#059669" && (Ne = "bg-emerald-50 border-l-2 border-l-emerald-300"), `
              <div class="rounded-lg ${Ne} px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-700">${L(fe.name)}</p>
                    <p class="text-[10px] uppercase tracking-wide text-slate-500">${L(fe.role)}</p>
                  </div>
                  <p class="text-[11px] text-slate-500">${L(Et(Fe.created_at || ""))}</p>
                </div>
                <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">${L(String(Fe.body || ""))}</p>
              </div>
            `;
      }).join("")}
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            ${ne ? `<button type="button" data-esign-action="resolve-review-thread" data-thread-id="${L(String(x.id || ""))}" class="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Resolve</button>` : ""}
            ${Me ? `<button type="button" data-esign-action="reopen-review-thread" data-thread-id="${L(String(x.id || ""))}" class="text-xs font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2">Reopen</button>` : ""}
            ${k ? `<button type="button" data-esign-action="toggle-reply-composer" data-thread-id="${L(String(x.id || ""))}" data-composer-id="${lt}" class="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1">
              <i class="iconoir-chat-bubble text-[10px]"></i> Reply
            </button>` : ""}
          </div>
          ${k ? `
            <div id="${lt}" class="review-reply-composer mt-3 space-y-2 hidden" data-thread-id="${L(String(x.id || ""))}">
              <textarea id="${pe}" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400" rows="2" placeholder="Write your reply..."></textarea>
              <div class="flex justify-end gap-2">
                <button type="button" data-esign-action="cancel-reply" data-composer-id="${lt}" class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 rounded border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="button" data-esign-action="reply-review-thread" data-thread-id="${L(String(x.id || ""))}" data-reply-input-id="${pe}" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">Send Reply</button>
              </div>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");
    u.innerHTML = V + H + Y;
  }
  function kt(e) {
    const t = Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : [];
    return e === "open" ? t.filter((n) => String(n?.thread?.status || "").trim() === "open") : e === "resolved" ? t.filter((n) => String(n?.thread?.status || "").trim() === "resolved") : t;
  }
  function Ye() {
    const e = document.getElementById("review-anchor-page-label"), t = document.getElementById("review-anchor-field-chip"), n = document.getElementById("review-anchor-field-label"), r = document.getElementById("review-thread-anchor");
    if (e && (e.textContent = `Page ${a.currentPage || 1}`), t && n)
      if (a.activeFieldId) {
        const o = a.fieldState.get(a.activeFieldId)?.type || "field", c = o.charAt(0).toUpperCase() + o.slice(1).replace(/_/g, " ");
        n.textContent = c, t.disabled = !1, t.classList.remove("hidden", "text-gray-400", "cursor-not-allowed"), t.classList.add("text-gray-600");
      } else
        n.textContent = "Select a field", t.disabled = !0, t.classList.add("hidden", "text-gray-400", "cursor-not-allowed"), t.classList.remove("text-gray-600"), r && r.value === "field" && It("agreement");
    ee();
  }
  function It(e) {
    const t = document.getElementById("review-thread-anchor"), n = document.querySelectorAll(".review-anchor-chip"), r = document.getElementById("review-thread-composer-hint");
    t && (t.value = e), n.forEach((o) => {
      o.getAttribute("data-anchor-type") === e ? (o.classList.add("active", "border-blue-300", "bg-blue-50", "text-blue-700"), o.classList.remove("border-gray-200", "bg-white", "text-gray-600")) : (o.classList.remove("active", "border-blue-300", "bg-blue-50", "text-blue-700"), o.classList.add("border-gray-200", "bg-white", "text-gray-600"));
    }), r && (e === "field" && a.activeFieldId ? r.textContent = "Comment will be anchored to the active field." : r.textContent = "Global comment on the agreement. Click directly on the document to place a positioned comment."), a.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), se(), ee();
  }
  function In() {
    const e = document.getElementById("review-anchor-chips");
    e && e.addEventListener("click", (t) => {
      const n = t.target.closest(".review-anchor-chip");
      if (!n || n.hasAttribute("disabled")) return;
      const r = n.getAttribute("data-anchor-type");
      r && It(r);
    });
  }
  function An() {
    const e = document.getElementById("pdf-container");
    e && e.addEventListener("click", (t) => {
      if (!(t.target instanceof Element) || !yt() || t.target.closest(".review-thread-marker, .field-overlay") || t.target.closest("button, textarea, input, select, label, a")) return;
      const n = document.getElementById(`pdf-page-${Number(a.currentPage || 1) || 1}`);
      if (!n) return;
      t.preventDefault(), t.stopPropagation();
      const r = n.querySelector("canvas"), i = r instanceof HTMLElement ? r : n, o = X.screenToPagePoint(
        Number(a.currentPage || 1) || 1,
        i,
        t.clientX,
        t.clientY
      );
      o && En(t.clientX, t.clientY, o);
    });
  }
  function $n(e) {
    const t = ["all", "open", "resolved"], n = String(e).trim().toLowerCase();
    a.reviewThreadFilter = t.includes(n) ? n : "all", a.reviewThreadPage = 1, j(), w(`Showing ${a.reviewThreadFilter === "all" ? "all" : a.reviewThreadFilter} comments.`);
  }
  function Bn(e) {
    const t = Math.max(1, parseInt(String(e), 10) || 1);
    a.reviewThreadPage = t, j(), document.getElementById("review-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  function Rn(e) {
    const t = String(e || "").trim();
    if (!t) return;
    const r = (Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : []).find((u) => String(u?.thread?.id || "").trim() === t);
    if (!r) return;
    const i = String(r?.thread?.status || "open").trim() || "open", o = a.reviewThreadFilter || "all";
    o !== "all" && o !== i && (a.reviewThreadFilter = i === "resolved" ? "resolved" : "open");
    const g = kt(a.reviewThreadFilter || "all").findIndex((u) => String(u?.thread?.id || "").trim() === t);
    if (g >= 0)
      a.reviewThreadPage = Math.floor(g / 5) + 1;
    else {
      a.reviewThreadFilter = "all";
      const p = kt("all").findIndex((m) => String(m?.thread?.id || "").trim() === t);
      a.reviewThreadPage = p >= 0 ? Math.floor(p / 5) + 1 : 1;
    }
    ie() && ye() !== "review" && We("review"), Lt(t), j(), requestAnimationFrame(() => {
      const u = document.querySelector(`[data-review-thread-id="${CSS.escape(t)}"]`);
      u instanceof HTMLElement && (u.scrollIntoView({ behavior: "smooth", block: "nearest" }), u.focus({ preventScroll: !0 }));
    });
  }
  function We(e) {
    e !== "sign" && e !== "review" || ie() && (e === "review" && !$() || (a.activePanelTab = e, j(), R(), ce(), z(), w(`${e === "sign" ? "Sign" : "Review"} tab selected.`)));
  }
  function ce() {
    const e = document.querySelector(".side-panel"), t = document.getElementById("panel-title-row"), n = document.getElementById("panel-title"), r = document.getElementById("panel-tabs"), i = document.getElementById("fields-status"), o = document.getElementById("fields-list"), c = document.getElementById("consent-notice"), g = document.getElementById("submit-btn"), u = document.getElementById("decline-btn"), p = document.getElementById("decline-container"), m = document.getElementById("panel-footer"), v = document.getElementById("panel-mobile-progress"), y = document.getElementById("review-submit-warning"), P = document.getElementById("review-submit-message"), h = document.getElementById("stage-state-banner"), C = document.getElementById("header-progress-group"), B = document.getElementById("session-identity-label"), A = document.getElementById("panel-sign-content"), M = document.getElementById("panel-review-content"), O = document.getElementById("panel-footer-sign"), G = document.getElementById("panel-footer-review"), V = document.getElementById("panel-tab-sign"), Y = document.getElementById("panel-tab-review"), H = W(), _ = ie(), x = Se(), T = wt(), k = xe(), ne = F(), Me = ye();
    if (e?.classList.toggle("review-only-mode", H), e?.classList.toggle("combined-mode", _), V && Y) {
      const me = (_ ? Me === "sign" : !H) && !H, pe = H || _ && Me === "review";
      V.setAttribute("aria-selected", String(me)), V.setAttribute("tabindex", me ? "0" : "-1"), Y.setAttribute("aria-selected", String(pe)), Y.setAttribute("tabindex", pe ? "0" : "-1"), V.hidden = H, Y.hidden = !$();
    }
    A && (A.hidden = !T, A.classList.toggle("hidden", !T)), M && (M.hidden = !k, M.classList.toggle("hidden", !k)), O && (O.hidden = !T, O.classList.toggle("hidden", !T)), G && (G.hidden = !k, G.classList.toggle("hidden", !k)), r?.classList.toggle("active", _), t?.classList.remove("hidden"), B && (x ? B.textContent = "Viewing as" : B.textContent = k && !T ? "Reviewing as" : "Signing as"), C?.classList.toggle("review-only-hidden", !T), n && (x ? n.textContent = k && !T ? "Review & Comment" : "Document Preview" : n.textContent = k && !T ? "Review & Comment" : "Complete & Sign"), o?.classList.toggle("hidden", !T), i?.classList.toggle("hidden", !T), v?.classList.toggle("hidden", !T), c?.classList.toggle("hidden", !ne || a.hasConsented), h?.classList.toggle("hidden", !T), m?.classList.toggle("hidden", !T && !k), g?.classList.toggle("hidden", !ne), u?.classList.toggle("hidden", !ne), p?.classList.toggle("hidden", !ne), y && P && (k ? (y.classList.remove("hidden"), P.textContent = T ? "Switch to the Sign tab to submit your signature." : "Review actions are available above.") : T && $() && a.reviewContext.sign_blocked ? (y.classList.remove("hidden"), P.textContent = a.reviewContext.sign_block_reason || "Signing is blocked until review completes.") : y.classList.add("hidden"));
  }
  async function Mn() {
    if (!$()) return;
    const e = document.getElementById("review-thread-body"), t = String(e?.value || "").trim();
    if (!t) {
      w("Enter a comment before creating a thread.", "assertive");
      return;
    }
    const n = {
      thread: {
        review_id: a.reviewContext.review_id,
        visibility: "shared",
        body: t,
        ...kn()
      }
    };
    await oe("/threads", {
      method: "POST",
      body: JSON.stringify(n)
    }, "Failed to create review thread"), e && (e.value = ""), await ae(), w("Review comment added.");
  }
  async function Dn(e, t) {
    const n = document.getElementById(String(t || "").trim()), r = String(n?.value || "").trim();
    if (!e || !r) {
      w("Enter a reply before sending.", "assertive");
      return;
    }
    await oe(`/threads/${encodeURIComponent(String(e))}/replies`, {
      method: "POST",
      body: JSON.stringify({ reply: { body: r } })
    }, "Failed to reply to review thread"), n && (n.value = ""), await ae(), w("Reply added to review thread.");
  }
  async function Bt(e, t) {
    if (!e) return;
    const n = t ? "resolve" : "reopen";
    await oe(`/threads/${encodeURIComponent(String(e))}/${n}`, {
      method: "POST",
      body: JSON.stringify({})
    }, t ? "Failed to resolve review thread" : "Failed to reopen review thread"), await ae(), w(t ? "Review thread resolved." : "Review thread reopened.");
  }
  async function Fn(e, t = "") {
    const n = e === "approve" ? "/approve" : "/request-changes", r = e === "approve" ? "Failed to approve review" : "Failed to request review changes", i = e === "request-changes" && t ? JSON.stringify({ comment: t }) : void 0;
    await oe(n, { method: "POST", body: i }, r), await ae();
    let o = e === "approve" ? "Review approved." : "Review changes requested.";
    if ($()) {
      const c = ve(a.reviewContext.status), g = be(a.reviewContext), u = Number(a.reviewContext.approved_count || 0) || 0, p = Number(a.reviewContext.total_approvers || 0) || 0;
      e === "approve" && g === "approved" && c === "in_review" ? o = p > 0 ? `Your approval was recorded. ${u} of ${p} approvers have approved so far.` : "Your approval was recorded. Waiting for the remaining reviewers." : e === "approve" && g === "approved" ? o = "Review approved." : e === "request-changes" && g === "changes_requested" && (o = "Your change request was recorded.");
    }
    window.toastManager && window.toastManager.success(o), w(o);
  }
  let _e = "";
  function Rt(e) {
    const t = document.getElementById("review-decision-modal"), n = document.getElementById("review-decision-icon-container"), r = document.getElementById("review-decision-icon"), i = document.getElementById("review-decision-modal-title"), o = document.getElementById("review-decision-modal-description"), c = document.getElementById("review-decision-comment-section"), g = document.getElementById("review-decision-comment"), u = document.getElementById("review-decision-comment-error"), p = document.getElementById("review-decision-confirm-btn");
    if (!t) return;
    _e = e, e === "approve" ? (n?.classList.remove("bg-amber-100"), n?.classList.add("bg-emerald-100"), r?.classList.remove("iconoir-warning-circle", "text-amber-600"), r?.classList.add("iconoir-check-circle", "text-emerald-600"), i && (i.textContent = "Approve Review?"), o && (o.textContent = "This will mark the document as approved and notify the sender that the review is complete."), c?.classList.add("hidden"), p?.classList.remove("bg-amber-600", "hover:bg-amber-700"), p?.classList.add("btn-primary"), p && (p.textContent = "Approve")) : (n?.classList.remove("bg-emerald-100"), n?.classList.add("bg-amber-100"), r?.classList.remove("iconoir-check-circle", "text-emerald-600"), r?.classList.add("iconoir-warning-circle", "text-amber-600"), i && (i.textContent = "Request Changes?"), o && (o.textContent = "The sender will be notified that changes are needed before this document can proceed."), c?.classList.remove("hidden"), g && (g.value = ""), u?.classList.add("hidden"), p?.classList.remove("btn-primary"), p?.classList.add("bg-amber-600", "hover:bg-amber-700", "text-white"), p && (p.textContent = "Request Changes")), t.classList.add("active"), t.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden";
    const m = t.querySelector(".field-editor");
    m instanceof HTMLElement && Be(m), e === "request-changes" && g?.focus();
  }
  function Ke() {
    const e = document.getElementById("review-decision-modal");
    if (!e) return;
    const t = e.querySelector(".field-editor");
    t instanceof HTMLElement && Re(t), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", _e = "";
  }
  async function Nn() {
    if (!_e) return;
    const e = _e;
    let t = "";
    if (e === "request-changes") {
      const n = document.getElementById("review-decision-comment"), r = document.getElementById("review-decision-comment-error");
      if (t = String(n?.value || "").trim(), !t) {
        r?.classList.remove("hidden"), n?.focus(), w("Please provide a reason for requesting changes.", "assertive");
        return;
      }
    }
    Ke(), await Fn(e, t);
  }
  async function Mt(e) {
    const n = (Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : []).find((o) => String(o?.thread?.id || "") === String(e || ""));
    if (!n) return "";
    Lt(e);
    const r = String(n?.thread?.anchor_type || "").trim();
    if (r === "field" && n.thread.field_id) {
      const o = a.fieldState.get(n.thread.field_id), c = Number(o?.page || n.thread.page_number || a.currentPage || 1) || 1;
      return c > 0 && await ke(c), et(n.thread.field_id, { openEditor: !1 }), ct(n.thread.field_id), "field";
    }
    return r === "page" && Number(n?.thread?.page_number || 0) > 0 ? (await ke(Number(n.thread.page_number || 1) || 1), "page") : (document.getElementById("viewer-content")?.scrollTo({ top: 0, behavior: "smooth" }), "agreement");
  }
  function Dt(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    const n = document.querySelector(`.review-thread-marker[data-thread-id="${CSS.escape(t)}"]`);
    return n instanceof HTMLElement ? n : null;
  }
  function Un(e, t = 4e3) {
    const n = String(e || "").trim(), r = Dt(n);
    return r ? Promise.resolve(r) : new Promise((i, o) => {
      const c = Date.now(), g = () => {
        const u = Dt(n);
        if (u) {
          i(u);
          return;
        }
        if (Date.now() - c >= t) {
          o(new Error(`Timed out locating review marker for thread ${n}.`));
          return;
        }
        window.requestAnimationFrame(g);
      };
      window.requestAnimationFrame(g);
    });
  }
  async function qn(e) {
    const t = String(e || "").trim();
    if (!t) return;
    const n = await Mt(t);
    if (!(n !== "page" && n !== "field"))
      try {
        (await Un(t)).scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
      } catch {
      }
  }
  const X = {
    /**
     * Device pixel ratio for high-DPI displays
     */
    dpr: window.devicePixelRatio || 1,
    /**
     * Cached page dimensions from PDF.js render
     */
    pageViewports: /* @__PURE__ */ new Map(),
    /**
     * Get page metadata from viewer config or field data
     */
    getPageMetadata(e) {
      const t = l.viewer.pages?.find((r) => r.page === e);
      if (t)
        return {
          width: t.width,
          height: t.height,
          rotation: t.rotation || 0
        };
      const n = this.pageViewports.get(e);
      return n ? {
        width: n.width,
        height: n.height,
        rotation: n.rotation || 0
      } : { width: 612, height: 792, rotation: 0 };
    },
    /**
     * Cache PDF.js viewport for page
     */
    setPageViewport(e, t) {
      this.pageViewports.set(e, {
        width: t.width,
        height: t.height,
        rotation: t.rotation || 0
      });
    },
    /**
     * Transform field coordinates from page-space to screen-space
     * Accounts for zoom level, DPR, container sizing, and origin
     */
    pageToScreen(e, t) {
      const n = e.page, r = this.getPageMetadata(n), i = t.offsetWidth, o = t.offsetHeight, c = e.pageWidth || r.width, g = e.pageHeight || r.height, u = i / c, p = o / g;
      let m = e.posX || 0, v = e.posY || 0;
      l.viewer.origin === "bottom-left" && (v = g - v - (e.height || 30));
      const y = m * u, P = v * p, h = (e.width || 150) * u, C = (e.height || 30) * p;
      return {
        left: y,
        top: P,
        width: h,
        height: C,
        // Store original values for debugging
        _debug: {
          sourceX: m,
          sourceY: v,
          sourceWidth: e.width,
          sourceHeight: e.height,
          pageWidth: c,
          pageHeight: g,
          scaleX: u,
          scaleY: p,
          zoom: a.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    /**
     * Get CSS transform values for overlay positioning
     */
    getOverlayStyles(e, t) {
      const n = this.pageToScreen(e, t);
      return {
        left: `${Math.round(n.left)}px`,
        top: `${Math.round(n.top)}px`,
        width: `${Math.round(n.width)}px`,
        height: `${Math.round(n.height)}px`,
        // Use transform for sub-pixel precision on high-DPI
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    },
    screenToPagePoint(e, t, n, r) {
      const i = this.getPageMetadata(e), o = t.getBoundingClientRect();
      if (!o.width || !o.height)
        return null;
      const c = Math.min(Math.max(n - o.left, 0), o.width), g = Math.min(Math.max(r - o.top, 0), o.height), u = i.width || o.width, p = i.height || o.height, m = u / o.width, v = p / o.height;
      let y = c * m, P = g * v;
      return l.viewer.origin === "bottom-left" && (P = p - P), {
        page_number: Number(e || 1) || 1,
        anchor_x: Math.round(y * 100) / 100,
        anchor_y: Math.round(P * 100) / 100
      };
    }
  }, zn = {
    /**
     * Request signed upload bootstrap from backend
     */
    async requestUploadBootstrap(e, t, n, r) {
      const i = await fetch(
        `${l.apiBasePath}/signature-upload/${l.token}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "omit",
          body: JSON.stringify({
            field_instance_id: e,
            sha256: t,
            content_type: n,
            size_bytes: r
          })
        }
      );
      if (!i.ok)
        throw await q(i, "Failed to get upload contract");
      const o = await i.json(), c = o?.contract || o;
      if (!c || typeof c != "object" || !c.upload_url)
        throw new Error("Invalid upload contract response");
      return c;
    },
    /**
     * Upload binary data to signed URL
     */
    async uploadToSignedUrl(e, t) {
      const n = new URL(e.upload_url, window.location.origin);
      e.upload_token && n.searchParams.set("upload_token", String(e.upload_token)), e.object_key && n.searchParams.set("object_key", String(e.object_key));
      const r = {
        "Content-Type": e.content_type || "image/png"
      };
      e.headers && Object.entries(e.headers).forEach(([o, c]) => {
        const g = String(o).toLowerCase();
        g === "x-esign-upload-token" || g === "x-esign-upload-key" || (r[o] = String(c));
      });
      const i = await fetch(n.toString(), {
        method: e.method || "PUT",
        headers: r,
        body: t,
        credentials: "omit"
      });
      if (!i.ok)
        throw await q(i, `Upload failed: ${i.status} ${i.statusText}`);
      return !0;
    },
    /**
     * Convert canvas data URL to binary blob
     */
    dataUrlToBlob(e) {
      const [t, n] = e.split(","), r = t.match(/data:([^;]+)/), i = r ? r[1] : "image/png", o = atob(n), c = new Uint8Array(o.length);
      for (let g = 0; g < o.length; g++)
        c[g] = o.charCodeAt(g);
      return new Blob([c], { type: i });
    },
    /**
     * Full drawn signature upload flow with signed URL
     */
    async uploadDrawnSignature(e, t) {
      const n = this.dataUrlToBlob(t), r = n.size, i = "image/png", o = await Jn(n), c = await this.requestUploadBootstrap(
        e,
        o,
        i,
        r
      );
      return await this.uploadToSignedUrl(c, n), {
        uploadToken: c.upload_token,
        objectKey: c.object_key,
        sha256: c.sha256,
        contentType: c.content_type
      };
    }
  }, Xe = {
    endpoint(e, t = "") {
      const n = encodeURIComponent(e), r = t ? `/${encodeURIComponent(t)}` : "";
      return `${l.apiBasePath}/signatures/${n}${r}`;
    },
    async list(e) {
      const t = new URL(this.endpoint(l.token), window.location.origin);
      t.searchParams.set("type", e);
      const n = await fetch(t.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!n.ok)
        throw new Error(
          await an(n, "Failed to load saved signatures", {
            appendStatusToFallback: !1
          })
        );
      const r = await n.json();
      return Array.isArray(r?.signatures) ? r.signatures : [];
    },
    async save(e, t, n = "") {
      const r = await fetch(this.endpoint(l.token), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          type: e,
          label: n,
          data_url: t
        })
      });
      if (!r.ok) {
        const o = await Kr(r, "Failed to save signature", {
          appendStatusToFallback: !1
        }), c = new Error(o.message), g = o.payload && typeof o.payload == "object" ? o.payload : null;
        throw c.code = typeof g?.error?.code == "string" ? g.error.code : "", c;
      }
      return (await r.json())?.signature || null;
    },
    async delete(e) {
      const t = await fetch(this.endpoint(l.token, e), {
        method: "DELETE",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (!t.ok)
        throw new Error(
          await an(t, "Failed to delete signature", {
            appendStatusToFallback: !1
          })
        );
    }
  };
  function de(e) {
    const t = a.fieldState.get(e);
    return t && t.type === "initials" ? "initials" : "signature";
  }
  function Te(e) {
    return a.savedSignaturesByType.get(e) || [];
  }
  async function Vn(e, t = !1) {
    const n = de(e);
    if (!t && a.savedSignaturesByType.has(n)) {
      Ee(e);
      return;
    }
    const r = await Xe.list(n);
    a.savedSignaturesByType.set(n, r), Ee(e);
  }
  function Ee(e) {
    const t = de(e), n = Te(t), r = document.getElementById("sig-saved-list");
    if (r) {
      if (!n.length) {
        r.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      r.innerHTML = n.map((i) => {
        const o = L(String(i?.thumbnail_data_url || i?.data_url || "")), c = L(String(i?.label || "Saved signature")), g = L(String(i?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${o}" alt="${c}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${c}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${L(e)}" data-signature-id="${g}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${L(e)}" data-signature-id="${g}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function Hn(e) {
    const t = a.signatureCanvases.get(e), n = de(e);
    if (!t || !it(e))
      throw new Error(`Please add your ${n === "initials" ? "initials" : "signature"} first`);
    const r = t.canvas.toDataURL("image/png"), i = await Xe.save(n, r, n === "initials" ? "Initials" : "Signature");
    if (!i)
      throw new Error("Failed to save signature");
    const o = Te(n);
    o.unshift(i), a.savedSignaturesByType.set(n, o), Ee(e), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function jn(e, t) {
    const n = de(e), i = Te(n).find((c) => String(c?.id || "") === String(t));
    if (!i) return;
    requestAnimationFrame(() => $e(e)), await Ft(e);
    const o = String(i.data_url || i.thumbnail_data_url || "").trim();
    o && (await rt(e, o, { clearStrokes: !0 }), Ve(e, o), R(), Ae("draw", e), w("Saved signature selected."));
  }
  async function On(e, t) {
    const n = de(e);
    await Xe.delete(t);
    const r = Te(n).filter((i) => String(i?.id || "") !== String(t));
    a.savedSignaturesByType.set(n, r), Ee(e);
  }
  function Pe(e) {
    const t = String(e?.code || "").trim(), n = String(e?.message || "Unable to update saved signatures"), r = t === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : n;
    window.toastManager && window.toastManager.error(r), w(r, "assertive");
  }
  async function Ft(e, t = 8) {
    for (let n = 0; n < t; n++) {
      if (a.signatureCanvases.has(e)) return !0;
      await new Promise((r) => setTimeout(r, 40)), $e(e);
    }
    return !1;
  }
  async function Yn(e, t) {
    const n = String(t?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(n))
      throw new Error("Only PNG and JPEG images are supported");
    if (t.size > 2 * 1024 * 1024)
      throw new Error("Image file is too large");
    requestAnimationFrame(() => $e(e)), await Ft(e);
    const r = a.signatureCanvases.get(e);
    if (!r)
      throw new Error("Signature canvas is not ready");
    const i = await Wn(t), o = n === "image/png" ? i : await Xn(i, r.drawWidth, r.drawHeight);
    if (Kn(o) > sn)
      throw new Error(`Image exceeds ${Math.round(sn / 1024)}KB limit after conversion`);
    await rt(e, o, { clearStrokes: !0 }), Ve(e, o), R();
    const g = document.getElementById("sig-upload-preview-wrap"), u = document.getElementById("sig-upload-preview");
    g && g.classList.remove("hidden"), u && u.setAttribute("src", o), w("Signature image uploaded. You can now insert it.");
  }
  function Wn(e) {
    return new Promise((t, n) => {
      const r = new FileReader();
      r.onload = () => t(String(r.result || "")), r.onerror = () => n(new Error("Unable to read image file")), r.readAsDataURL(e);
    });
  }
  function Kn(e) {
    const t = String(e || "").split(",");
    if (t.length < 2) return 0;
    const n = t[1] || "", r = (n.match(/=+$/) || [""])[0].length;
    return Math.floor(n.length * 3 / 4) - r;
  }
  async function Xn(e, t, n) {
    return await new Promise((r, i) => {
      const o = new Image();
      o.onload = () => {
        const c = document.createElement("canvas"), g = Math.max(1, Math.round(Number(t) || 600)), u = Math.max(1, Math.round(Number(n) || 160));
        c.width = g, c.height = u;
        const p = c.getContext("2d");
        if (!p) {
          i(new Error("Unable to process image"));
          return;
        }
        p.clearRect(0, 0, g, u);
        const m = Math.min(g / o.width, u / o.height), v = o.width * m, y = o.height * m, P = (g - v) / 2, h = (u - y) / 2;
        p.drawImage(o, P, h, v, y), r(c.toDataURL("image/png"));
      }, o.onerror = () => i(new Error("Unable to decode image file")), o.src = e;
    });
  }
  async function Jn(e) {
    if (window.crypto && window.crypto.subtle) {
      const t = await e.arrayBuffer(), n = await window.crypto.subtle.digest("SHA-256", t);
      return Array.from(new Uint8Array(n)).map((r) => r.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function Gn() {
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const n = t.closest("[data-esign-action]");
      if (!n) return;
      const r = n.getAttribute("data-esign-action");
      if (r === "highlight-review-marker") {
        const i = t.closest("button, textarea, input, select, label, a, [data-esign-action]");
        if (i && i !== n)
          return;
      }
      switch (r) {
        case "prev-page":
          fr();
          break;
        case "next-page":
          hr();
          break;
        case "zoom-out":
          vr();
          break;
        case "zoom-in":
          br();
          break;
        case "fit-width":
          wr();
          break;
        case "download-document":
          Vr();
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
          Nr();
          break;
        case "show-decline-modal":
          Ur();
          break;
        case "close-field-editor":
          ot();
          break;
        case "save-field-editor":
          Ir();
          break;
        case "hide-consent-modal":
          dt();
          break;
        case "accept-consent":
          Fr();
          break;
        case "hide-decline-modal":
          Zt();
          break;
        case "confirm-decline":
          qr();
          break;
        case "approve-review":
          Rt("approve");
          break;
        case "request-review-changes":
          Rt("request-changes");
          break;
        case "hide-review-decision-modal":
          Ke();
          break;
        case "confirm-review-decision":
          Nn().catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to complete review action"), w(`Error: ${i?.message || "Unable to complete review action"}`, "assertive");
          });
          break;
        case "create-review-thread":
          Mn().catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to add comment"), w(`Error: ${i?.message || "Unable to add comment"}`, "assertive");
          });
          break;
        case "reply-review-thread": {
          const i = n.getAttribute("data-thread-id"), o = n.getAttribute("data-reply-input-id");
          Dn(i, o).catch((c) => {
            window.toastManager && window.toastManager.error(c?.message || "Unable to reply to thread"), w(`Error: ${c?.message || "Unable to reply to thread"}`, "assertive");
          });
          break;
        }
        case "resolve-review-thread": {
          const i = n.getAttribute("data-thread-id");
          Bt(i, !0).catch((o) => {
            window.toastManager && window.toastManager.error(o?.message || "Unable to resolve thread"), w(`Error: ${o?.message || "Unable to resolve thread"}`, "assertive");
          });
          break;
        }
        case "reopen-review-thread": {
          const i = n.getAttribute("data-thread-id");
          Bt(i, !1).catch((o) => {
            window.toastManager && window.toastManager.error(o?.message || "Unable to reopen thread"), w(`Error: ${o?.message || "Unable to reopen thread"}`, "assertive");
          });
          break;
        }
        case "go-review-thread-anchor": {
          const i = n.getAttribute("data-thread-id");
          Mt(i).catch((o) => {
            window.toastManager && window.toastManager.error(o?.message || "Unable to navigate to comment anchor"), w(`Error: ${o?.message || "Unable to navigate to comment anchor"}`, "assertive");
          });
          break;
        }
        case "go-review-thread": {
          const i = n.getAttribute("data-thread-id");
          Rn(i);
          break;
        }
        case "highlight-review-marker": {
          const i = n.getAttribute("data-review-thread-id");
          qn(i).catch((o) => {
            window.toastManager && window.toastManager.error(o?.message || "Unable to locate comment marker"), w(`Error: ${o?.message || "Unable to locate comment marker"}`, "assertive");
          });
          break;
        }
        case "filter-review-threads": {
          const i = n.getAttribute("data-filter") || "all";
          $n(i);
          break;
        }
        case "page-review-threads": {
          const i = parseInt(n.getAttribute("data-page") || "1", 10);
          Bn(i);
          break;
        }
        case "toggle-reply-composer": {
          const i = n.getAttribute("data-composer-id");
          At(i, !0);
          break;
        }
        case "cancel-reply": {
          const i = n.getAttribute("data-composer-id");
          At(i, !1);
          break;
        }
        case "pick-review-anchor-point":
          Z() === "page" && Tn(!0);
          break;
        case "clear-review-anchor-point":
          a.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), _n(), w("Pinned comment location cleared.");
          break;
        case "submit-inline-comment":
          Ln().catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to add comment"), w(`Error: ${i?.message || "Unable to add comment"}`, "assertive");
          });
          break;
        case "cancel-inline-comment":
          se();
          break;
        case "retry-load-pdf":
          Le();
          break;
        case "signature-tab": {
          const i = n.getAttribute("data-tab") || "draw", o = n.getAttribute("data-field-id");
          o && Ae(i, o);
          break;
        }
        case "clear-signature-canvas": {
          const i = n.getAttribute("data-field-id");
          i && Pr(i);
          break;
        }
        case "undo-signature-canvas": {
          const i = n.getAttribute("data-field-id");
          i && Tr(i);
          break;
        }
        case "redo-signature-canvas": {
          const i = n.getAttribute("data-field-id");
          i && Er(i);
          break;
        }
        case "save-current-signature-library": {
          const i = n.getAttribute("data-field-id");
          i && Hn(i).catch(Pe);
          break;
        }
        case "select-saved-signature": {
          const i = n.getAttribute("data-field-id"), o = n.getAttribute("data-signature-id");
          i && o && jn(i, o).catch(Pe);
          break;
        }
        case "delete-saved-signature": {
          const i = n.getAttribute("data-field-id"), o = n.getAttribute("data-signature-id");
          i && o && On(i, o).catch(Pe);
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
          J.togglePanel();
          break;
        case "debug-copy-session":
          J.copySessionInfo();
          break;
        case "debug-clear-cache":
          J.clearCache();
          break;
        case "debug-show-telemetry":
          J.showTelemetry();
          break;
        case "debug-reload-viewer":
          J.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (e) => {
      const t = e.target;
      if (t instanceof HTMLInputElement) {
        if (t.matches("#sig-upload-input")) {
          const n = t.getAttribute("data-field-id"), r = t.files?.[0];
          if (!n || !r) return;
          Yn(n, r).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (t.matches("#field-checkbox-input")) {
          const n = t.getAttribute("data-field-id") || a.activeFieldId;
          if (!n) return;
          vt(n, t.checked), R();
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
          bt(n, t.value || ""), R();
          return;
        }
        t.matches("#field-checkbox-input") && t instanceof HTMLInputElement && (vt(n, t.checked), R());
      }
    });
  }
  ht(async () => {
    Gn(), a.isLowMemory = dr(), tr(), nr(), await ir(), rr(), j(), In(), An(), ce(), cr(), Gt(), z(), await Le(), le(), document.addEventListener("visibilitychange", Qn), "memory" in navigator && Zn(), J.init();
  });
  function Qn() {
    document.hidden && Nt();
  }
  function Nt() {
    const e = a.isLowMemory ? 1 : 2;
    for (; a.renderedPages.size > e; ) {
      let t = null, n = 1 / 0;
      if (a.renderedPages.forEach((r, i) => {
        i !== a.currentPage && r.timestamp < n && (t = i, n = r.timestamp);
      }), t !== null)
        a.renderedPages.delete(t);
      else
        break;
    }
  }
  function Zn() {
    setInterval(() => {
      if (navigator.memory) {
        const e = navigator.memory.usedJSHeapSize, t = navigator.memory.totalJSHeapSize;
        e / t > 0.8 && (a.isLowMemory = !0, Nt());
      }
    }, 3e4);
  }
  function er(e) {
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
  function tr() {
    const e = document.getElementById("pdf-compatibility-banner"), t = document.getElementById("pdf-compatibility-message"), n = document.getElementById("pdf-compatibility-title");
    if (!e || !t || !n) return;
    const r = String(l.viewer.compatibilityTier || "").trim().toLowerCase(), i = String(l.viewer.compatibilityReason || "").trim().toLowerCase();
    if (r !== "limited") {
      e.classList.add("hidden");
      return;
    }
    n.textContent = "Preview Compatibility Notice", t.textContent = String(l.viewer.compatibilityMessage || "").trim() || er(i), e.classList.remove("hidden"), b.trackDegradedMode("pdf_preview_compatibility", { tier: r, reason: i });
  }
  function nr() {
    const e = document.getElementById("stage-state-banner"), t = document.getElementById("stage-state-icon"), n = document.getElementById("stage-state-title"), r = document.getElementById("stage-state-message"), i = document.getElementById("stage-state-meta");
    if (!e || !t || !n || !r || !i) return;
    if (Se()) {
      const v = hn();
      let y = {
        bgClass: "bg-slate-50",
        borderClass: "border-slate-200",
        iconClass: "iconoir-eye text-slate-600",
        titleClass: "text-slate-900",
        messageClass: "text-slate-800",
        title: "Document Preview",
        message: "This document is available in read-only mode.",
        badges: []
      };
      switch (v) {
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
            badges: [
              { icon: "iconoir-chat-bubble", text: "Shared comments", variant: "blue" }
            ]
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
            badges: [
              { icon: "iconoir-clock", text: "Read-only document", variant: "amber" }
            ]
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
            badges: [
              { icon: "iconoir-check", text: "Completed", variant: "green" }
            ]
          };
          break;
      }
      e.classList.remove("hidden"), e.className = `mb-4 rounded-lg border p-4 ${y.bgClass} ${y.borderClass}`, t.className = `${y.iconClass} mt-0.5`, n.className = `text-sm font-semibold ${y.titleClass}`, n.textContent = y.title, r.className = `text-xs ${y.messageClass} mt-1`, r.textContent = y.message, i.innerHTML = "", y.badges.forEach((P) => {
        const h = document.createElement("span"), C = {
          blue: "bg-blue-100 text-blue-800",
          amber: "bg-amber-100 text-amber-800",
          green: "bg-green-100 text-green-800",
          slate: "bg-slate-100 text-slate-800"
        };
        h.className = `inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${C[P.variant] || C.slate}`, h.innerHTML = `<i class="${P.icon} mr-1"></i>${P.text}`, i.appendChild(h);
      });
      return;
    }
    const o = l.signerState || "active", c = l.recipientStage, g = l.activeStage, u = l.activeRecipientIds || [], p = l.waitingForRecipientIds || [];
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
    switch (o) {
      case "waiting":
        m = {
          hidden: !1,
          bgClass: "bg-blue-50",
          borderClass: "border-blue-200",
          iconClass: "iconoir-hourglass text-blue-600",
          titleClass: "text-blue-900",
          messageClass: "text-blue-800",
          title: "Waiting for Other Signers",
          message: c > g ? `You are in signing stage ${c}. Stage ${g} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
          badges: [
            { icon: "iconoir-clock", text: "Your turn is coming", variant: "blue" }
          ]
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
          badges: [
            { icon: "iconoir-lock", text: "Access restricted", variant: "amber" }
          ]
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
          badges: [
            { icon: "iconoir-check", text: "Signed", variant: "green" }
          ]
        };
        break;
      case "active":
      default:
        u.length > 1 ? (m.message = `You and ${u.length - 1} other signer(s) can sign now.`, m.badges = [
          { icon: "iconoir-users", text: `Stage ${g} active`, variant: "green" }
        ]) : c > 1 ? m.badges = [
          { icon: "iconoir-check-circle", text: `Stage ${c}`, variant: "green" }
        ] : m.hidden = !0;
        break;
    }
    if (m.hidden) {
      e.classList.add("hidden");
      return;
    }
    e.classList.remove("hidden"), e.className = `mb-4 rounded-lg border p-4 ${m.bgClass} ${m.borderClass}`, t.className = `${m.iconClass} mt-0.5`, n.className = `text-sm font-semibold ${m.titleClass}`, n.textContent = m.title, r.className = `text-xs ${m.messageClass} mt-1`, r.textContent = m.message, i.innerHTML = "", m.badges.forEach((v) => {
      const y = document.createElement("span"), P = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      y.className = `inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${P[v.variant] || P.blue}`, y.innerHTML = `<i class="${v.icon} mr-1"></i>${v.text}`, i.appendChild(y);
    });
  }
  function rr() {
    l.fields.forEach((e) => {
      let t = null, n = !1;
      if (e.type === "checkbox")
        t = e.value_bool || !1, n = t;
      else if (e.type === "date_signed")
        t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], n = !0;
      else {
        const r = String(e.value_text || "");
        t = r || ar(e), n = !!r;
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
        // Geometry metadata is populated from backend field payloads when present.
        posX: e.pos_x || 0,
        posY: e.pos_y || 0,
        width: e.width || 150,
        height: e.height || 30,
        tabIndex: Number(e.tab_index || 0) || 0
      });
    });
  }
  async function ir() {
    try {
      const e = await E.load(a.profileKey);
      e && (a.profileData = e, a.profileRemember = e.remember !== !1);
    } catch {
    }
  }
  function ar(e) {
    const t = a.profileData;
    if (!t) return "";
    const n = String(e?.type || "").trim();
    return n === "name" ? D(t.fullName || "") : n === "initials" ? D(t.initials || "") || Ce(t.fullName || l.recipientName || "") : n === "signature" ? D(t.typedSignature || "") : "";
  }
  function or(e) {
    return !l.profile.persistDrawnSignature || !a.profileData ? "" : e?.type === "initials" && String(a.profileData.drawnInitialsDataUrl || "").trim() || String(a.profileData.drawnSignatureDataUrl || "").trim();
  }
  function sr(e) {
    const t = D(e?.value || "");
    return t || (a.profileData ? e?.type === "initials" ? D(a.profileData.initials || "") || Ce(a.profileData.fullName || l.recipientName || "") : e?.type === "signature" ? D(a.profileData.typedSignature || "") : "" : "");
  }
  function Ut() {
    const e = document.getElementById("remember-profile-input");
    return e instanceof HTMLInputElement ? !!e.checked : a.profileRemember;
  }
  async function qt(e = !1) {
    let t = null;
    try {
      await E.clear(a.profileKey);
    } catch (n) {
      t = n;
    } finally {
      a.profileData = null, a.profileRemember = l.profile.rememberByDefault;
    }
    if (t) {
      if (!e && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !e)
        throw t;
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
    const r = {
      remember: !0
    }, i = String(e.type || "");
    if (i === "name" && typeof e.value == "string") {
      const o = D(e.value);
      o && (r.fullName = o, (a.profileData?.initials || "").trim() || (r.initials = Ce(o)));
    }
    if (i === "initials") {
      if (t.signatureType === "drawn" && l.profile.persistDrawnSignature && typeof t.signatureDataUrl == "string")
        r.drawnInitialsDataUrl = t.signatureDataUrl;
      else if (typeof e.value == "string") {
        const o = D(e.value);
        o && (r.initials = o);
      }
    }
    if (i === "signature") {
      if (t.signatureType === "drawn" && l.profile.persistDrawnSignature && typeof t.signatureDataUrl == "string")
        r.drawnSignatureDataUrl = t.signatureDataUrl;
      else if (typeof e.value == "string") {
        const o = D(e.value);
        o && (r.typedSignature = o);
      }
    }
    if (!(Object.keys(r).length === 1 && r.remember === !0))
      try {
        const o = await E.save(a.profileKey, r);
        a.profileData = o;
      } catch {
      }
  }
  function cr() {
    const e = document.getElementById("consent-checkbox"), t = document.getElementById("consent-accept-btn");
    e && t && e.addEventListener("change", function() {
      t.disabled = !this.checked;
    });
  }
  function dr() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function Je() {
    const e = a.isLowMemory ? 3 : a.maxCachedPages;
    if (a.renderedPages.size <= e) return;
    const t = [];
    for (a.renderedPages.forEach((n, r) => {
      const i = Math.abs(r - a.currentPage);
      t.push({ pageNum: r, distance: i });
    }), t.sort((n, r) => r.distance - n.distance); a.renderedPages.size > e && t.length > 0; ) {
      const n = t.shift();
      n && n.pageNum !== a.currentPage && a.renderedPages.delete(n.pageNum);
    }
  }
  function Vt(e) {
    if (a.isLowMemory) return;
    const t = [];
    e > 1 && t.push(e - 1), e < l.pageCount && t.push(e + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      t.forEach(async (n) => {
        !a.renderedPages.has(n) && !a.pageRendering && await lr(n);
      });
    }, { timeout: 2e3 });
  }
  async function lr(e) {
    if (!(!a.pdfDoc || a.renderedPages.has(e)))
      try {
        const t = await a.pdfDoc.getPage(e), n = a.zoomLevel, r = t.getViewport({ scale: n * window.devicePixelRatio }), i = document.createElement("canvas"), o = i.getContext("2d");
        i.width = r.width, i.height = r.height;
        const c = {
          canvasContext: o,
          viewport: r
        };
        await t.render(c).promise, a.renderedPages.set(e, {
          canvas: i,
          scale: n,
          timestamp: Date.now()
        }), Je();
      } catch (t) {
        console.warn("Preload failed for page", e, t);
      }
  }
  function ur() {
    const e = window.devicePixelRatio || 1;
    return a.isLowMemory ? Math.min(e, 1.5) : Math.min(e, 2);
  }
  async function Le() {
    const e = document.getElementById("pdf-loading"), t = Date.now();
    let n = "";
    try {
      const r = await fetch(Ct());
      if (!r.ok)
        throw new Error("Failed to load document");
      const o = (await r.json()).assets || {};
      if (n = _t(o), !n)
        throw new Error("Document preview is not available yet. The document may still be processing.");
      const c = Jr({
        url: n,
        surface: "signer-review",
        documentId: l.agreementId
      });
      a.pdfDoc = await c.promise, l.pageCount = a.pdfDoc.numPages, document.getElementById("page-count").textContent = a.pdfDoc.numPages, await Ge(1), Qe(), b.trackViewerLoad(!0, Date.now() - t), b.trackPageView(1);
    } catch (r) {
      const i = Gr(r, {
        surface: "signer-review",
        documentId: l.agreementId,
        url: typeof n == "string" ? n : null
      });
      b.trackViewerLoad(!1, Date.now() - t, i.rawMessage), e && (e.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), zr();
    }
  }
  async function Ge(e) {
    if (!a.pdfDoc) return;
    const t = a.renderedPages.get(e);
    if (t && t.scale === a.zoomLevel) {
      gr(t), a.currentPage = e, document.getElementById("current-page").textContent = e, Qe(), Ye(), le(), we(e), Vt(e);
      return;
    }
    a.pageRendering = !0;
    try {
      const n = await a.pdfDoc.getPage(e), r = a.zoomLevel, i = ur(), o = n.getViewport({ scale: r * i }), c = n.getViewport({ scale: 1 });
      X.setPageViewport(e, {
        width: c.width,
        height: c.height,
        rotation: c.rotation || 0
      });
      const g = document.getElementById("pdf-page-1");
      g.innerHTML = "";
      const u = document.createElement("canvas"), p = u.getContext("2d");
      u.height = o.height, u.width = o.width, u.style.width = `${o.width / i}px`, u.style.height = `${o.height / i}px`, g.appendChild(u);
      const m = document.getElementById("pdf-container");
      m.style.width = `${o.width / i}px`;
      const v = {
        canvasContext: p,
        viewport: o
      };
      await n.render(v).promise, a.renderedPages.set(e, {
        canvas: u.cloneNode(!0),
        scale: r,
        timestamp: Date.now(),
        displayWidth: o.width / i,
        displayHeight: o.height / i
      }), a.renderedPages.get(e).canvas.getContext("2d").drawImage(u, 0, 0), Je(), a.currentPage = e, document.getElementById("current-page").textContent = e, Qe(), Ye(), le(), we(e), b.trackPageView(e), Vt(e);
    } catch (n) {
      we(e, n instanceof Error ? n : new Error("Page render failed.")), console.error("Page render error:", n);
    } finally {
      if (a.pageRendering = !1, a.pageNumPending !== null) {
        const n = a.pageNumPending;
        a.pageNumPending = null, await Ge(n);
      }
    }
  }
  function gr(e, t) {
    const n = document.getElementById("pdf-page-1");
    n.innerHTML = "";
    const r = document.createElement("canvas");
    r.width = e.canvas.width, r.height = e.canvas.height, r.style.width = `${e.displayWidth}px`, r.style.height = `${e.displayHeight}px`, r.getContext("2d").drawImage(e.canvas, 0, 0), n.appendChild(r);
    const o = document.getElementById("pdf-container");
    o.style.width = `${e.displayWidth}px`;
  }
  function te(e) {
    a.pageRendering ? a.pageNumPending = e : Ge(e);
  }
  function mr(e) {
    return typeof e.previewValueText == "string" && e.previewValueText.trim() !== "" ? D(e.previewValueText) : typeof e.value == "string" && e.value.trim() !== "" ? D(e.value) : "";
  }
  function Ht(e, t, n, r = !1) {
    const i = document.createElement("img");
    i.className = "field-overlay-preview", i.src = t, i.alt = n, e.appendChild(i), e.classList.add("has-preview"), r && e.classList.add("draft-preview");
  }
  function jt(e, t, n = !1, r = !1) {
    const i = document.createElement("span");
    i.className = "field-overlay-value", n && i.classList.add("font-signature"), i.textContent = t, e.appendChild(i), e.classList.add("has-value"), r && e.classList.add("draft-preview");
  }
  function Ot(e, t) {
    const n = document.createElement("span");
    n.className = "field-overlay-label", n.textContent = t, e.appendChild(n);
  }
  function pr(e, t) {
    if (!t) return null;
    const n = e?.thread || {}, r = String(n.anchor_type || "").trim();
    if (r === "page") {
      const i = Number(n.page_number || 0) || 0, o = (Number(n.anchor_x || 0) || 0) > 0 || (Number(n.anchor_y || 0) || 0) > 0;
      if (i !== Number(a.currentPage || 0) || !o) return null;
      const c = X.pageToScreen({
        page: i,
        posX: Number(n.anchor_x || 0) || 0,
        posY: Number(n.anchor_y || 0) || 0,
        width: 0,
        height: 0
      }, t);
      return { left: c.left, top: c.top };
    }
    if (r === "field" && n.field_id) {
      const i = a.fieldState.get(String(n.field_id || "").trim());
      if (!i || Number(i.page || 0) !== Number(a.currentPage || 0) || i.posX == null || i.posY == null) return null;
      const o = X.pageToScreen({
        page: Number(i.page || a.currentPage || 1) || 1,
        posX: (Number(i.posX || 0) || 0) + (Number(i.width || 0) || 0) / 2,
        posY: Number(i.posY || 0) || 0,
        width: 0,
        height: 0
      }, t);
      return { left: o.left, top: o.top };
    }
    return null;
  }
  function Yt(e, t) {
    if ((Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : []).forEach((r) => {
      const i = r?.thread || {}, o = pr(r, t);
      if (!o) return;
      const c = je(i.created_by_type, i.created_by_id), g = pn(), u = document.createElement(g ? "button" : "div");
      g && u instanceof HTMLButtonElement && (u.type = "button"), u.className = "review-thread-marker", String(i.status || "").trim() === "resolved" && u.classList.add("resolved"), String(i.visibility || "shared").trim() === "internal" && u.classList.add("internal"), String(i.id || "").trim() === String(a.highlightedReviewThreadID || "").trim() && u.classList.add("active"), g ? u.dataset.esignAction = "go-review-thread" : (u.setAttribute("aria-hidden", "true"), u.style.pointerEvents = "none"), u.dataset.threadId = String(i.id || "").trim(), u.style.left = `${Math.round(o.left)}px`, u.style.top = `${Math.round(o.top)}px`, u.style.background = c.color, u.style.borderColor = c.color, g && (u.title = `${mt(r)} comment by ${c.name}`, u.setAttribute("aria-label", `${mt(r)} comment by ${c.name}`)), u.textContent = c.initials, e.appendChild(u);
    }), Z() === "page" && a.reviewAnchorPointDraft && Number(a.reviewAnchorPointDraft.page_number || 0) === Number(a.currentPage || 0)) {
      const r = X.pageToScreen({
        page: Number(a.reviewAnchorPointDraft.page_number || a.currentPage || 1) || 1,
        posX: Number(a.reviewAnchorPointDraft.anchor_x || 0) || 0,
        posY: Number(a.reviewAnchorPointDraft.anchor_y || 0) || 0,
        width: 0,
        height: 0
      }, t), i = document.createElement("div");
      i.className = "review-thread-marker active", i.style.left = `${Math.round(r.left)}px`, i.style.top = `${Math.round(r.top)}px`, i.setAttribute("aria-hidden", "true"), i.textContent = "+", e.appendChild(i);
    }
  }
  function le() {
    const e = document.getElementById("field-overlays");
    if (!e) return;
    e.innerHTML = "", e.style.pointerEvents = "auto";
    const t = document.getElementById("pdf-container");
    if (t) {
      if (!F()) {
        He() && Yt(e, t);
        return;
      }
      a.fieldState.forEach((n, r) => {
        if (n.page !== a.currentPage) return;
        const i = document.createElement("div");
        if (i.className = "field-overlay", i.dataset.fieldId = r, n.required && i.classList.add("required"), n.completed && i.classList.add("completed"), a.activeFieldId === r && i.classList.add("active"), n.posX != null && n.posY != null && n.width != null && n.height != null) {
          const v = X.getOverlayStyles(n, t);
          i.style.left = v.left, i.style.top = v.top, i.style.width = v.width, i.style.height = v.height, i.style.transform = v.transform, J.enabled && (i.dataset.debugCoords = JSON.stringify(
            X.pageToScreen(n, t)._debug
          ));
        } else {
          const v = Array.from(a.fieldState.keys()).indexOf(r);
          i.style.left = "10px", i.style.top = `${100 + v * 50}px`, i.style.width = "150px", i.style.height = "30px";
        }
        const c = String(n.previewSignatureUrl || "").trim(), g = String(n.signaturePreviewUrl || "").trim(), u = mr(n), p = n.type === "signature" || n.type === "initials", m = typeof n.previewValueBool == "boolean";
        if (c)
          Ht(i, c, ue(n.type), !0);
        else if (n.completed && g)
          Ht(i, g, ue(n.type));
        else if (u) {
          const v = typeof n.previewValueText == "string" && n.previewValueText.trim() !== "";
          jt(i, u, p, v);
        } else n.type === "checkbox" && (m ? n.previewValueBool : !!n.value) ? jt(i, "Checked", !1, m) : Ot(i, ue(n.type));
        i.setAttribute("tabindex", "0"), i.setAttribute("role", "button"), i.setAttribute("aria-label", `${ue(n.type)} field${n.required ? ", required" : ""}${n.completed ? ", completed" : ""}`), i.addEventListener("click", () => Ie(r)), i.addEventListener("keydown", (v) => {
          (v.key === "Enter" || v.key === " ") && (v.preventDefault(), Ie(r));
        }), e.appendChild(i);
      }), t && He() && Yt(e, t);
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
  function fr() {
    a.currentPage <= 1 || te(a.currentPage - 1);
  }
  function hr() {
    a.currentPage >= l.pageCount || te(a.currentPage + 1);
  }
  function ke(e) {
    const t = Number(e || 0) || 0;
    if (t < 1 || t > l.pageCount) return Promise.resolve();
    const n = un(t);
    return qe(t) || te(t), n;
  }
  function Qe() {
    document.getElementById("prev-page-btn").disabled = a.currentPage <= 1, document.getElementById("next-page-btn").disabled = a.currentPage >= l.pageCount;
  }
  function br() {
    a.zoomLevel = Math.min(a.zoomLevel + 0.25, 3), Ze(), te(a.currentPage);
  }
  function vr() {
    a.zoomLevel = Math.max(a.zoomLevel - 0.25, 0.5), Ze(), te(a.currentPage);
  }
  function wr() {
    const t = document.getElementById("viewer-content").offsetWidth - 32, n = 612;
    a.zoomLevel = t / n, Ze(), te(a.currentPage);
  }
  function Ze() {
    document.getElementById("zoom-level").textContent = `${Math.round(a.zoomLevel * 100)}%`;
  }
  function Ie(e) {
    if (!F()) {
      w("This review session is read-only for signing fields.");
      return;
    }
    if (!a.hasConsented && l.fields.some((t) => t.id === e && t.type !== "date_signed")) {
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
      if (t.openEditor && (a.activeFieldId = e, j()), document.querySelectorAll(".field-list-item").forEach((r) => r.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${e}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((r) => r.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${e}"]`)?.classList.add("active"), n.page !== a.currentPage && ke(n.page), !t.openEditor) {
        tt(e);
        return;
      }
      n.type !== "date_signed" && yr(e);
    }
  }
  function tt(e) {
    document.querySelector(`.field-list-item[data-field-id="${e}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), requestAnimationFrame(() => {
      document.querySelector(`.field-overlay[data-field-id="${e}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
  }
  function yr(e) {
    const t = a.fieldState.get(e);
    if (!t) return;
    const n = document.getElementById("field-editor-overlay"), r = document.getElementById("field-editor-content"), i = document.getElementById("field-editor-title"), o = document.getElementById("field-editor-legal-disclaimer");
    i.textContent = Wt(t.type), r.innerHTML = xr(t), o?.classList.toggle("hidden", !(t.type === "signature" || t.type === "initials")), (t.type === "signature" || t.type === "initials") && Cr(e), n.classList.add("active"), n.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Be(n.querySelector(".field-editor")), w(`Editing ${Wt(t.type)}. Press Escape to cancel.`), setTimeout(() => {
      const c = r.querySelector("input, textarea");
      c ? c.focus() : r.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), U(a.writeCooldownUntil) > 0 && Xt(U(a.writeCooldownUntil));
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
  function xr(e) {
    const t = Sr(e.type), n = L(String(e?.id || "")), r = L(String(e?.type || ""));
    if (e.type === "signature" || e.type === "initials") {
      const i = e.type === "initials" ? "initials" : "signature", o = L(sr(e)), c = [
        { id: "draw", label: "Draw" },
        { id: "type", label: "Type" },
        { id: "upload", label: "Upload" },
        { id: "saved", label: "Saved" }
      ], g = Kt(e.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${c.map((u) => `
            <button
              type="button"
              id="sig-tab-${u.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${g === u.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${u.id}"
              data-esign-action="signature-tab"
              data-field-id="${n}"
              role="tab"
              aria-selected="${g === u.id ? "true" : "false"}"
              aria-controls="sig-editor-${u.id}"
              tabindex="${g === u.id ? "0" : "-1"}"
            >
              ${u.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${g === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${i}"
              value="${o}"
              data-field-id="${n}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${n}">${o}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${i} will appear as your ${r}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${g === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
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
          <div id="sig-editor-upload" class="sig-editor-panel ${g === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
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
          <div id="sig-editor-saved" class="sig-editor-panel ${g === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
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
    if (e.type === "name")
      return `
        <input
          type="text"
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter your full legal name"
          value="${L(String(e.value || ""))}"
          data-field-id="${n}"
        />
        ${t}
      `;
    if (e.type === "text") {
      const i = L(String(e.value || ""));
      return `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${n}"
        >${i}</textarea>
      `;
    }
    return e.type === "checkbox" ? `
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
  function Sr(e) {
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
    const o = D(String(t || "").trim());
    if (n?.syncOverlay && (o ? bt(e, o) : ze(e), R()), !!r) {
      if (o) {
        r.textContent = o;
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
    const n = ["draw", "type", "upload", "saved"].includes(e) ? e : "draw";
    a.signatureTabByField.set(t, n), document.querySelectorAll(".sig-editor-tab").forEach((i) => {
      i.classList.remove("border-blue-600", "text-blue-600"), i.classList.add("border-transparent", "text-gray-500"), i.setAttribute("aria-selected", "false"), i.setAttribute("tabindex", "-1");
    });
    const r = document.querySelector(`.sig-editor-tab[data-tab="${n}"]`);
    if (r?.classList.add("border-blue-600", "text-blue-600"), r?.classList.remove("border-transparent", "text-gray-500"), r?.setAttribute("aria-selected", "true"), r?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", n !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", n !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", n !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", n !== "saved"), (n === "draw" || n === "upload" || n === "saved") && r && requestAnimationFrame(() => $e(t)), n === "type") {
      const i = document.getElementById("sig-type-input");
      nt(t, i?.value || "");
    }
    n === "saved" && Vn(t).catch(Pe);
  }
  function Cr(e) {
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
    const o = window.devicePixelRatio || 1;
    t.width = i.width * o, t.height = i.height * o, r.scale(o, o), r.lineCap = "round", r.lineJoin = "round", r.strokeStyle = "#1f2937", r.lineWidth = 2.5;
    let c = !1, g = 0, u = 0, p = [];
    const m = (h) => {
      const C = t.getBoundingClientRect();
      let B, A;
      return h.touches && h.touches.length > 0 ? (B = h.touches[0].clientX, A = h.touches[0].clientY) : h.changedTouches && h.changedTouches.length > 0 ? (B = h.changedTouches[0].clientX, A = h.changedTouches[0].clientY) : (B = h.clientX, A = h.clientY), {
        x: B - C.left,
        y: A - C.top,
        timestamp: Date.now()
      };
    }, v = (h) => {
      c = !0;
      const C = m(h);
      g = C.x, u = C.y, p = [{ x: C.x, y: C.y, t: C.timestamp, width: 2.5 }], n && n.classList.add("drawing");
    }, y = (h) => {
      if (!c) return;
      const C = m(h);
      p.push({ x: C.x, y: C.y, t: C.timestamp, width: 2.5 });
      const B = C.x - g, A = C.y - u, M = C.timestamp - (p[p.length - 2]?.t || C.timestamp), O = Math.sqrt(B * B + A * A) / Math.max(M, 1), G = 2.5, V = 1.5, Y = 4, H = Math.min(O / 5, 1), _ = Math.max(V, Math.min(Y, G - H * 1.5));
      p[p.length - 1].width = _, r.lineWidth = _, r.beginPath(), r.moveTo(g, u), r.lineTo(C.x, C.y), r.stroke(), g = C.x, u = C.y;
    }, P = () => {
      if (c = !1, p.length > 1) {
        const h = a.signatureCanvases.get(e);
        h && (h.strokes.push(p.map((C) => ({ ...C }))), h.redoStack = []), at(e);
      }
      p = [], n && n.classList.remove("drawing");
    };
    t.addEventListener("mousedown", v), t.addEventListener("mousemove", y), t.addEventListener("mouseup", P), t.addEventListener("mouseout", P), t.addEventListener("touchstart", (h) => {
      h.preventDefault(), h.stopPropagation(), v(h);
    }, { passive: !1 }), t.addEventListener("touchmove", (h) => {
      h.preventDefault(), h.stopPropagation(), y(h);
    }, { passive: !1 }), t.addEventListener("touchend", (h) => {
      h.preventDefault(), P();
    }, { passive: !1 }), t.addEventListener("touchcancel", P), t.addEventListener("gesturestart", (h) => h.preventDefault()), t.addEventListener("gesturechange", (h) => h.preventDefault()), t.addEventListener("gestureend", (h) => h.preventDefault()), a.signatureCanvases.set(e, {
      canvas: t,
      ctx: r,
      dpr: o,
      drawWidth: i.width,
      drawHeight: i.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), _r(e);
  }
  function _r(e) {
    const t = a.signatureCanvases.get(e), n = a.fieldState.get(e);
    if (!t || !n) return;
    const r = or(n);
    r && rt(e, r, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function rt(e, t, n = { clearStrokes: !1 }) {
    const r = a.signatureCanvases.get(e);
    if (!r) return !1;
    const i = String(t || "").trim();
    if (!i)
      return r.baseImageDataUrl = "", r.baseImage = null, n.clearStrokes && (r.strokes = [], r.redoStack = []), ge(e), !0;
    const { drawWidth: o, drawHeight: c } = r, g = new Image();
    return await new Promise((u) => {
      g.onload = () => {
        n.clearStrokes && (r.strokes = [], r.redoStack = []), r.baseImage = g, r.baseImageDataUrl = i, o > 0 && c > 0 && ge(e), u(!0);
      }, g.onerror = () => u(!1), g.src = i;
    });
  }
  function ge(e) {
    const t = a.signatureCanvases.get(e);
    if (!t) return;
    const { ctx: n, drawWidth: r, drawHeight: i, baseImage: o, strokes: c } = t;
    if (n.clearRect(0, 0, r, i), o) {
      const g = Math.min(r / o.width, i / o.height), u = o.width * g, p = o.height * g, m = (r - u) / 2, v = (i - p) / 2;
      n.drawImage(o, m, v, u, p);
    }
    for (const g of c)
      for (let u = 1; u < g.length; u++) {
        const p = g[u - 1], m = g[u];
        n.lineWidth = Number(m.width || 2.5) || 2.5, n.beginPath(), n.moveTo(p.x, p.y), n.lineTo(m.x, m.y), n.stroke();
      }
  }
  function Tr(e) {
    const t = a.signatureCanvases.get(e);
    if (!t || t.strokes.length === 0) return;
    const n = t.strokes.pop();
    n && t.redoStack.push(n), ge(e), at(e);
  }
  function Er(e) {
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
    return r.getImageData(0, 0, n.width, n.height).data.some((o, c) => c % 4 === 3 && o > 0);
  }
  function at(e) {
    const t = a.signatureCanvases.get(e);
    t && (it(e) ? Ve(e, t.canvas.toDataURL("image/png")) : ze(e), R());
  }
  function Pr(e) {
    const t = a.signatureCanvases.get(e);
    t && (t.strokes = [], t.redoStack = [], t.baseImage = null, t.baseImageDataUrl = "", ge(e)), ze(e), R();
    const n = document.getElementById("sig-upload-preview-wrap"), r = document.getElementById("sig-upload-preview");
    n && n.classList.add("hidden"), r && r.removeAttribute("src");
  }
  function ot() {
    const e = document.getElementById("field-editor-overlay"), t = e.querySelector(".field-editor");
    if (Re(t), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", a.activeFieldId) {
      const n = document.querySelector(`.field-list-item[data-field-id="${a.activeFieldId}"]`);
      requestAnimationFrame(() => {
        n?.focus();
      });
    }
    gn(), R(), a.activeFieldId = null, j(), a.signatureCanvases.clear(), w("Field editor closed.");
  }
  function U(e) {
    const t = Number(e) || 0;
    return t <= 0 ? 0 : Math.max(0, Math.ceil((t - Date.now()) / 1e3));
  }
  function Lr(e, t = {}) {
    const n = Number(t.retry_after_seconds);
    if (Number.isFinite(n) && n > 0)
      return Math.ceil(n);
    const r = String(e?.headers?.get?.("Retry-After") || "").trim();
    if (!r) return 0;
    const i = Number(r);
    return Number.isFinite(i) && i > 0 ? Math.ceil(i) : 0;
  }
  async function q(e, t) {
    let n = {};
    try {
      n = await e.json();
    } catch {
      n = {};
    }
    const r = n?.error || {}, i = r?.details && typeof r.details == "object" ? r.details : {}, o = Lr(e, i), c = e?.status === 429, g = c ? o > 0 ? `Too many actions too quickly. Please wait ${o}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(r?.message || t || "Request failed"), u = new Error(g);
    return u.status = e?.status || 0, u.code = String(r?.code || ""), u.details = i, u.rateLimited = c, u.retryAfterSeconds = o, u;
  }
  function Xt(e) {
    const t = Math.max(1, Number(e) || 1);
    a.writeCooldownUntil = Date.now() + t * 1e3, a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
    const n = () => {
      const r = document.getElementById("field-editor-save");
      if (!r) return;
      const i = U(a.writeCooldownUntil);
      if (i <= 0) {
        a.pendingSaves.has(a.activeFieldId || "") || (r.disabled = !1, r.innerHTML = "Insert"), a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
        return;
      }
      r.disabled = !0, r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${i}s`;
    };
    n(), a.writeCooldownTimer = setInterval(n, 250);
  }
  function kr(e) {
    const t = Math.max(1, Number(e) || 1);
    a.submitCooldownUntil = Date.now() + t * 1e3, a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    const n = () => {
      const r = U(a.submitCooldownUntil);
      z(), r <= 0 && a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    };
    n(), a.submitCooldownTimer = setInterval(n, 250);
  }
  async function Ir() {
    if (!F()) {
      w("This review session cannot modify signing fields.", "assertive");
      return;
    }
    const e = a.activeFieldId;
    if (!e) return;
    const t = a.fieldState.get(e);
    if (!t) return;
    const n = U(a.writeCooldownUntil);
    if (n > 0) {
      const i = `Please wait ${n}s before saving again.`;
      window.toastManager && window.toastManager.error(i), w(i, "assertive");
      return;
    }
    const r = document.getElementById("field-editor-save");
    r.disabled = !0, r.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      a.profileRemember = Ut();
      let i = !1;
      if (t.type === "signature" || t.type === "initials")
        i = await Ar(e);
      else if (t.type === "checkbox") {
        const o = document.getElementById("field-checkbox-input");
        i = await st(e, null, o?.checked || !1);
      } else {
        const c = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!c && t.required)
          throw new Error("This field is required");
        i = await st(e, c, null);
      }
      if (i) {
        ot(), Gt(), z(), en(), le(), Rr(e), Dr(e);
        const o = tn();
        o.allRequiredComplete ? w("Field saved. All required fields complete. Ready to submit.") : w(`Field saved. ${o.remainingRequired} required field${o.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (i) {
      i?.rateLimited && Xt(i.retryAfterSeconds), window.toastManager && window.toastManager.error(i.message), w(`Error saving field: ${i.message}`, "assertive");
    } finally {
      if (U(a.writeCooldownUntil) > 0) {
        const i = U(a.writeCooldownUntil);
        r.disabled = !0, r.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${i}s`;
      } else
        r.disabled = !1, r.innerHTML = "Insert";
    }
  }
  async function Ar(e) {
    const t = a.fieldState.get(e), n = document.getElementById("sig-type-input"), r = Kt(e);
    if (r === "draw" || r === "upload" || r === "saved") {
      const o = a.signatureCanvases.get(e);
      if (!o) return !1;
      if (!it(e))
        throw new Error(t?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      const c = o.canvas.toDataURL("image/png");
      return await Jt(e, { type: "drawn", dataUrl: c }, t?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const o = n?.value?.trim();
      if (!o)
        throw new Error(t?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return t.type === "initials" ? await st(e, o, null) : await Jt(e, { type: "typed", text: o }, o);
    }
  }
  async function st(e, t, n) {
    if (!F())
      throw new Error("This review session cannot modify signing fields");
    a.pendingSaves.add(e);
    const r = Date.now(), i = a.fieldState.get(e);
    try {
      const o = await fetch(`${l.apiBasePath}/field-values/${l.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: e,
          value_text: t,
          value_bool: n
        })
      });
      if (!o.ok)
        throw await q(o, "Failed to save field");
      const c = a.fieldState.get(e);
      return c && (c.value = t ?? n, c.completed = !0, c.hasError = !1), await zt(c), window.toastManager && window.toastManager.success("Field saved"), b.trackFieldSave(e, c?.type, !0, Date.now() - r), !0;
    } catch (o) {
      const c = a.fieldState.get(e);
      throw c && (c.hasError = !0, c.lastError = o.message), b.trackFieldSave(e, i?.type, !1, Date.now() - r, o.message), o;
    } finally {
      a.pendingSaves.delete(e);
    }
  }
  async function Jt(e, t, n) {
    if (!F())
      throw new Error("This review session cannot modify signing fields");
    a.pendingSaves.add(e);
    const r = Date.now(), i = t?.type || "typed";
    try {
      let o;
      if (i === "drawn") {
        const u = await zn.uploadDrawnSignature(
          e,
          t.dataUrl
        );
        o = {
          field_instance_id: e,
          type: "drawn",
          value_text: n,
          object_key: u.objectKey,
          sha256: u.sha256,
          upload_token: u.uploadToken
        };
      } else
        o = await $r(e, n);
      const c = await fetch(`${l.apiBasePath}/field-values/signature/${l.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(o)
      });
      if (!c.ok)
        throw await q(c, "Failed to save signature");
      const g = a.fieldState.get(e);
      return g && (g.value = n, g.completed = !0, g.hasError = !1, t?.dataUrl && (g.signaturePreviewUrl = t.dataUrl)), await zt(g, {
        signatureType: i,
        signatureDataUrl: t?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), b.trackSignatureAttach(e, i, !0, Date.now() - r), !0;
    } catch (o) {
      const c = a.fieldState.get(e);
      throw c && (c.hasError = !0, c.lastError = o.message), b.trackSignatureAttach(e, i, !1, Date.now() - r, o.message), o;
    } finally {
      a.pendingSaves.delete(e);
    }
  }
  async function $r(e, t) {
    const n = `${t}|${e}`, r = await Br(n), i = `tenant/bootstrap/org/bootstrap/agreements/${l.agreementId}/signatures/${l.recipientId}/${e}-${Date.now()}.txt`;
    return {
      field_instance_id: e,
      type: "typed",
      value_text: t,
      object_key: i,
      sha256: r
      // Note: typed signatures do not require upload_token (v2)
    };
  }
  async function Br(e) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const t = new TextEncoder().encode(e), n = await window.crypto.subtle.digest("SHA-256", t);
      return Array.from(new Uint8Array(n)).map((r) => r.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function Gt() {
    let e = 0;
    a.fieldState.forEach((u) => {
      u.required, u.completed && e++;
    });
    const t = a.fieldState.size, n = t > 0 ? e / t * 100 : 0;
    document.getElementById("completed-count").textContent = e, document.getElementById("total-count").textContent = t;
    const r = document.getElementById("progress-ring-circle"), i = 97.4, o = i - n / 100 * i;
    r.style.strokeDashoffset = o, document.getElementById("mobile-progress").style.width = `${n}%`;
    const c = t - e, g = document.getElementById("fields-status");
    g && (W() ? g.textContent = $() ? he(a.reviewContext.status) : "Review" : $() && a.reviewContext.sign_blocked ? g.textContent = "Review blocked" : g.textContent = c > 0 ? `${c} remaining` : "All complete"), ce();
  }
  function z() {
    ce();
    const e = document.getElementById("submit-btn"), t = document.getElementById("incomplete-warning"), n = document.getElementById("incomplete-message"), r = U(a.submitCooldownUntil);
    let i = [], o = !1;
    a.fieldState.forEach((u, p) => {
      u.required && !u.completed && i.push(u), u.hasError && (o = !0);
    });
    const c = !!a.reviewContext?.sign_blocked, g = a.canSignSession && a.hasConsented && i.length === 0 && !o && !c && a.pendingSaves.size === 0 && r === 0 && !a.isSubmitting;
    e.disabled = !g, !a.isSubmitting && r > 0 ? e.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${r}s` : !a.isSubmitting && r === 0 && (e.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), a.hasConsented ? r > 0 ? (t.classList.remove("hidden"), n.textContent = `Please wait ${r}s before submitting again.`) : a.canSignSession ? c ? (t.classList.remove("hidden"), n.textContent = a.reviewContext?.sign_block_reason || "Signing is blocked until review completes.") : o ? (t.classList.remove("hidden"), n.textContent = "Some fields failed to save. Please retry.") : i.length > 0 ? (t.classList.remove("hidden"), n.textContent = `Complete ${i.length} required field${i.length > 1 ? "s" : ""}`) : t.classList.add("hidden") : (t.classList.remove("hidden"), n.textContent = "This session cannot submit signatures.") : (t.classList.remove("hidden"), n.textContent = "Please accept the consent agreement");
  }
  function Rr(e) {
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
  function Mr() {
    const e = Array.from(a.fieldState.values()).filter((t) => t.required);
    return e.sort((t, n) => {
      const r = Number(t.page || 0), i = Number(n.page || 0);
      if (r !== i) return r - i;
      const o = Number(t.tabIndex || 0), c = Number(n.tabIndex || 0);
      if (o > 0 && c > 0 && o !== c) return o - c;
      if (o > 0 != c > 0) return o > 0 ? -1 : 1;
      const g = Number(t.posY || 0), u = Number(n.posY || 0);
      if (g !== u) return g - u;
      const p = Number(t.posX || 0), m = Number(n.posX || 0);
      return p !== m ? p - m : String(t.id || "").localeCompare(String(n.id || ""));
    }), e;
  }
  function ct(e) {
    a.guidedTargetFieldId = e, document.querySelectorAll(".field-list-item").forEach((t) => t.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((t) => t.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${e}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${e}"]`)?.classList.add("guided-next-target");
  }
  function Dr(e) {
    const t = Mr(), n = t.filter((c) => !c.completed);
    if (n.length === 0) {
      b.track("guided_next_none_remaining", { fromFieldId: e });
      const c = document.getElementById("submit-btn");
      c?.scrollIntoView({ behavior: "smooth", block: "nearest" }), c?.focus(), w("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const r = t.findIndex((c) => String(c.id) === String(e));
    let i = null;
    if (r >= 0) {
      for (let c = r + 1; c < t.length; c++)
        if (!t[c].completed) {
          i = t[c];
          break;
        }
    }
    if (i || (i = n[0]), !i) return;
    b.track("guided_next_started", { fromFieldId: e, toFieldId: i.id });
    const o = Number(i.page || 1);
    o !== a.currentPage && ke(o), et(i.id, { openEditor: !1 }), ct(i.id), setTimeout(() => {
      ct(i.id), tt(i.id), b.track("guided_next_completed", { toFieldId: i.id, page: i.page }), w(`Next required field highlighted on page ${i.page}.`);
    }, 120);
  }
  function Qt() {
    if (!F())
      return;
    const e = document.getElementById("consent-modal");
    e.classList.add("active"), e.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Be(e.querySelector(".field-editor")), w("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function dt() {
    const e = document.getElementById("consent-modal"), t = e.querySelector(".field-editor");
    Re(t), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", w("Consent dialog closed.");
  }
  async function Fr() {
    if (!F())
      return;
    const e = document.getElementById("consent-accept-btn");
    e.disabled = !0, e.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const t = await fetch(`${l.apiBasePath}/consent/${l.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!t.ok)
        throw await q(t, "Failed to accept consent");
      a.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), dt(), z(), en(), b.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), w("Consent accepted. You can now complete the fields and submit.");
    } catch (t) {
      window.toastManager && window.toastManager.error(t.message), w(`Error: ${t.message}`, "assertive");
    } finally {
      e.disabled = !1, e.innerHTML = "Accept & Continue";
    }
  }
  async function Nr() {
    if (!a.canSignSession || a.reviewContext?.sign_blocked) {
      z();
      return;
    }
    const e = document.getElementById("submit-btn"), t = U(a.submitCooldownUntil);
    if (t > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${t}s before submitting again.`), z();
      return;
    }
    a.isSubmitting = !0, e.disabled = !0, e.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const n = `submit-${l.recipientId}-${Date.now()}`, r = await fetch(`${l.apiBasePath}/submit/${l.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": n }
      });
      if (!r.ok)
        throw await q(r, "Failed to submit");
      b.trackSubmit(!0), window.location.href = `${l.signerBasePath}/${l.token}/complete`;
    } catch (n) {
      b.trackSubmit(!1, n.message), n?.rateLimited && kr(n.retryAfterSeconds), window.toastManager && window.toastManager.error(n.message);
    } finally {
      a.isSubmitting = !1, z();
    }
  }
  function Ur() {
    if (!F())
      return;
    const e = document.getElementById("decline-modal");
    e.classList.add("active"), e.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Be(e.querySelector(".field-editor")), w("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function Zt() {
    const e = document.getElementById("decline-modal"), t = e.querySelector(".field-editor");
    Re(t), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", w("Decline dialog closed.");
  }
  async function qr() {
    if (!F())
      return;
    const e = document.getElementById("decline-reason").value;
    try {
      const t = await fetch(`${l.apiBasePath}/decline/${l.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: e })
      });
      if (!t.ok)
        throw await q(t, "Failed to decline");
      window.location.href = `${l.signerBasePath}/${l.token}/declined`;
    } catch (t) {
      window.toastManager && window.toastManager.error(t.message);
    }
  }
  function zr() {
    b.trackDegradedMode("viewer_load_failure"), b.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Vr() {
    try {
      const e = await fetch(Ct());
      if (!e.ok) throw new Error("Document unavailable");
      const n = (await e.json()).assets || {}, r = _t(n);
      if (r)
        window.open(r, "_blank");
      else
        throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (e) {
      window.toastManager && window.toastManager.error(e.message || "Unable to download document");
    }
  }
  const J = {
    enabled: localStorage.getItem("esign_debug") === "true" || new URLSearchParams(window.location.search).has("debug"),
    panel: null,
    /**
     * Initialize debug mode if enabled
     */
    init() {
      this.enabled && (this.createDebugPanel(), this.bindConsoleHelpers(), this.logSessionInfo(), console.info("%c[E-Sign Debug] Debug mode enabled. Access window.esignDebug for helpers.", "color: #3b82f6; font-weight: bold"));
    },
    /**
     * Create floating debug panel
     */
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
            <div class="debug-value" id="debug-flow-mode">${l.flowMode}</div>
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
    /**
     * Toggle debug panel collapsed state
     */
    togglePanel() {
      if (!this.panel) return;
      this.panel.classList.toggle("collapsed");
      const e = this.panel.querySelector(".debug-toggle"), t = this.panel.querySelector(".debug-title");
      this.panel.classList.contains("collapsed") ? (e.textContent = "+", t.style.display = "none") : (e.textContent = "−", t.style.display = "inline");
    },
    /**
     * Update debug panel values
     */
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
    /**
     * Bind console helper functions
     */
    bindConsoleHelpers() {
      window.esignDebug = {
        getState: () => ({
          config: {
            ...l,
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
          console.log("[E-Sign Debug] Reloading viewer..."), Le();
        },
        setLowMemory: (e) => {
          a.isLowMemory = e, Je(), console.log(`[E-Sign Debug] Low memory mode: ${e}`);
        }
      };
    },
    /**
     * Log session info to console
     */
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", l.flowMode), console.log("Agreement ID:", l.agreementId), console.log("Session ID:", b.sessionId), console.log("Fields:", a.fieldState?.size || 0), console.log("Low Memory:", a.isLowMemory), console.groupEnd();
    },
    /**
     * Copy session info to clipboard
     */
    async copySessionInfo() {
      const e = JSON.stringify(window.esignDebug.getState(), null, 2);
      try {
        await navigator.clipboard.writeText(e), alert("Session info copied to clipboard");
      } catch {
        console.log("Session Info:", e), alert("Check console for session info");
      }
    },
    /**
     * Reload the PDF viewer
     */
    reloadViewer() {
      console.log("[E-Sign Debug] Reloading PDF viewer..."), Le(), this.updatePanel();
    },
    /**
     * Clear page cache
     */
    clearCache() {
      a.renderedPages?.clear(), console.log("[E-Sign Debug] Page cache cleared"), this.updatePanel();
    },
    /**
     * Show telemetry events
     */
    showTelemetry() {
      console.table(b.events), console.log("Session Summary:", b.getSessionSummary());
    }
  };
  function w(e, t = "polite") {
    const n = t === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    n && (n.textContent = "", requestAnimationFrame(() => {
      n.textContent = e;
    }));
  }
  function Be(e) {
    const n = e.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), r = n[0], i = n[n.length - 1];
    e.dataset.previousFocus || (e.dataset.previousFocus = document.activeElement?.id || "");
    function o(c) {
      c.key === "Tab" && (c.shiftKey ? document.activeElement === r && (c.preventDefault(), i?.focus()) : document.activeElement === i && (c.preventDefault(), r?.focus()));
    }
    e.addEventListener("keydown", o), e._focusTrapHandler = o, requestAnimationFrame(() => {
      r?.focus();
    });
  }
  function Re(e) {
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
  function Hr(e, t = 1) {
    const n = Array.from(a.fieldState.keys()), r = n.indexOf(e);
    if (r === -1) return null;
    const i = r + t;
    return i >= 0 && i < n.length ? n[i] : null;
  }
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && (ot(), dt(), Zt(), Ke()), e.target instanceof HTMLElement && e.target.classList.contains("sig-editor-tab")) {
      const t = Array.from(document.querySelectorAll(".sig-editor-tab")), n = t.indexOf(e.target);
      if (n !== -1) {
        let r = n;
        if (e.key === "ArrowRight" && (r = (n + 1) % t.length), e.key === "ArrowLeft" && (r = (n - 1 + t.length) % t.length), e.key === "Home" && (r = 0), e.key === "End" && (r = t.length - 1), r !== n) {
          e.preventDefault();
          const i = t[r], o = i.getAttribute("data-tab") || "draw", c = i.getAttribute("data-field-id");
          c && Ae(o, c), i.focus();
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
          const i = t[r], o = i.getAttribute("data-tab");
          (o === "sign" || o === "review") && We(o), i.focus();
          return;
        }
      }
    }
    if (e.target instanceof HTMLElement && e.target.classList.contains("field-list-item")) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const t = e.target.dataset.fieldId, n = e.key === "ArrowDown" ? 1 : -1, r = Hr(t, n);
        r && document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.focus();
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
class ln {
  constructor(d) {
    this.config = d;
  }
  init() {
    pi(this.config);
  }
  destroy() {
  }
}
function Ci(s) {
  const d = new ln(s);
  return ht(() => d.init()), d;
}
function fi() {
  const s = Wr("esign-signer-review-config", null);
  return s && typeof s == "object" ? s : null;
}
typeof document < "u" && ht(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const d = fi();
  if (!d) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const f = new ln(d);
  f.init(), window.esignSignerReviewController = f;
});
export {
  ln as SignerReviewController,
  pi as bootstrapSignerReview,
  Ci as initSignerReview
};
//# sourceMappingURL=signer-review.js.map
