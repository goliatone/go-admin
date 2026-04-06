import { escapeHTML as L } from "../shared/html.js";
import { readHTTPError as gr, readHTTPErrorResult as ii, readHTTPJSONObject as ai } from "../shared/transport/http-client.js";
import { onReady as xt } from "../shared/dom-ready.js";
import { parseJSONValue as hr, readJSONScriptValue as oi } from "../shared/json-parse.js";
import { n as si, t as di } from "./runtime-CmD8_aZj.js";
var ci = "esign.signer.profile.v1", mr = "esign.signer.profile.outbox.v1", St = 90, pr = 500 * 1024, li = class {
  constructor(o) {
    this.ttlMs = (Number.isFinite(o) && o > 0 ? o : St) * 24 * 60 * 60 * 1e3;
  }
  storageKey(o) {
    return `${ci}:${o}`;
  }
  async load(o) {
    try {
      const u = window.localStorage.getItem(this.storageKey(o));
      if (!u) return null;
      const f = hr(u, null);
      return !f || f.schemaVersion !== 1 ? (window.localStorage.removeItem(this.storageKey(o)), null) : typeof f.expiresAt == "number" && Date.now() > f.expiresAt ? (window.localStorage.removeItem(this.storageKey(o)), null) : f;
    } catch {
      return null;
    }
  }
  async save(o, u) {
    const f = Date.now(), c = {
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
      ...u,
      schemaVersion: 1,
      key: o,
      updatedAt: f,
      expiresAt: f + this.ttlMs
    };
    try {
      window.localStorage.setItem(this.storageKey(o), JSON.stringify(c));
    } catch {
    }
    return c;
  }
  async clear(o) {
    try {
      window.localStorage.removeItem(this.storageKey(o));
    } catch {
    }
  }
}, ui = class {
  constructor(o, u, f = (I, E) => fetch(I, E), c = !0) {
    this.endpointPath = o.replace(/\/$/, ""), this.token = u, this.request = f, this.requiresTokenPath = c;
  }
  endpoint(o) {
    const u = encodeURIComponent(Si(o));
    if (!this.requiresTokenPath) return `${this.endpointPath}?key=${u}`;
    const f = encodeURIComponent(this.token);
    return `${this.endpointPath}/profile/${f}?key=${u}`;
  }
  async load(o) {
    const u = await this.request(this.endpoint(o), {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: this.requiresTokenPath ? "same-origin" : "omit"
    });
    if (!u.ok) return null;
    const f = await u.json();
    return !f || typeof f != "object" ? null : f.profile || null;
  }
  async save(o, u) {
    const f = await this.request(this.endpoint(o), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      credentials: this.requiresTokenPath ? "same-origin" : "omit",
      body: JSON.stringify({ patch: u })
    });
    if (!f.ok) throw new Error("remote profile sync failed");
    return (await f.json()).profile;
  }
  async clear(o) {
    const u = await this.request(this.endpoint(o), {
      method: "DELETE",
      headers: { Accept: "application/json" },
      credentials: this.requiresTokenPath ? "same-origin" : "omit"
    });
    if (!u.ok && u.status !== 404) throw new Error("remote profile clear failed");
  }
}, He = class {
  constructor(o, u, f) {
    this.mode = o, this.localStore = u, this.remoteStore = f;
  }
  outboxLoad() {
    try {
      const o = window.localStorage.getItem(mr);
      if (!o) return {};
      const u = hr(o, null);
      if (!u || typeof u != "object") return {};
      const f = {};
      for (const [c, I] of Object.entries(u)) {
        if (!I || typeof I != "object") continue;
        const E = I;
        if (E.op === "clear") {
          f[c] = {
            op: "clear",
            updatedAt: Number(E.updatedAt) || Date.now()
          };
          continue;
        }
        const _ = E.op === "patch" ? E.patch : E;
        f[c] = {
          op: "patch",
          patch: _ && typeof _ == "object" ? _ : {},
          updatedAt: Number(E.updatedAt) || Date.now()
        };
      }
      return f;
    } catch {
      return {};
    }
  }
  outboxSave(o) {
    try {
      window.localStorage.setItem(mr, JSON.stringify(o));
    } catch {
    }
  }
  queuePatch(o, u) {
    const f = this.outboxLoad(), c = f[o];
    f[o] = {
      op: "patch",
      patch: {
        ...c?.op === "patch" ? c.patch || {} : {},
        ...u,
        updatedAt: Date.now()
      },
      updatedAt: Date.now()
    }, this.outboxSave(f);
  }
  queueClear(o) {
    const u = this.outboxLoad();
    u[o] = {
      op: "clear",
      updatedAt: Date.now()
    }, this.outboxSave(u);
  }
  getOutboxEntry(o) {
    return this.outboxLoad()[o] || null;
  }
  removeOutboxEntry(o) {
    const u = this.outboxLoad();
    u[o] && (delete u[o], this.outboxSave(u));
  }
  async flushOutboxForKey(o) {
    if (!this.remoteStore) return;
    const u = this.outboxLoad(), f = u[o];
    if (f)
      try {
        f.op === "clear" ? await this.remoteStore.clear(o) : await this.remoteStore.save(o, f.patch || {}), delete u[o], this.outboxSave(u);
      } catch {
      }
  }
  pickLatest(o, u) {
    return o && u ? (u.updatedAt || 0) >= (o.updatedAt || 0) ? u : o : u || o;
  }
  async load(o) {
    if (this.mode === "remote_only")
      return !this.remoteStore || this.getOutboxEntry(o) && (await this.flushOutboxForKey(o), this.getOutboxEntry(o)?.op === "clear") ? null : this.remoteStore.load(o);
    if (this.mode === "hybrid" && this.remoteStore) {
      if (this.getOutboxEntry(o)?.op === "clear")
        return await this.flushOutboxForKey(o), this.localStore.load(o);
      const [u, f] = await Promise.all([this.localStore.load(o), this.remoteStore.load(o).catch(() => null)]), c = this.pickLatest(u, f);
      return c && await this.localStore.save(o, c), await this.flushOutboxForKey(o), c;
    }
    return this.localStore.load(o);
  }
  async save(o, u) {
    if (this.mode === "remote_only") {
      if (!this.remoteStore) throw new Error("remote profile store not configured");
      const c = await this.remoteStore.save(o, u);
      return this.removeOutboxEntry(o), c;
    }
    const f = await this.localStore.save(o, u);
    if (this.mode === "hybrid" && this.remoteStore) try {
      const c = await this.remoteStore.save(o, u);
      return await this.localStore.save(o, c), this.removeOutboxEntry(o), c;
    } catch {
      this.queuePatch(o, u);
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
function fr(o) {
  const u = o.profile?.mode || "local_only", f = String(o.uiMode || "").trim().toLowerCase(), c = String(o.defaultTab || "").trim().toLowerCase(), I = String(o.viewerMode || "").trim().toLowerCase(), E = String(o.viewerBanner || "").trim().toLowerCase();
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
    defaultTab: c || "sign",
    viewerMode: I,
    viewerBanner: E,
    recipientId: String(o.recipientId || "").trim(),
    recipientEmail: String(o.recipientEmail || "").trim(),
    recipientName: String(o.recipientName || "").trim(),
    pageCount: Number(o.pageCount || 1) || 1,
    hasConsented: !!o.hasConsented,
    canSign: o.canSign !== !1,
    reviewMarkersVisible: o.reviewMarkersVisible !== !1,
    reviewMarkersInteractive: o.reviewMarkersInteractive !== !1,
    fields: Array.isArray(o.fields) ? o.fields : [],
    review: Ye(o.review),
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
      mode: u,
      rememberByDefault: o.profile?.rememberByDefault !== !1,
      ttlDays: Number(o.profile?.ttlDays || St) || St,
      persistDrawnSignature: !!o.profile?.persistDrawnSignature,
      endpointBasePath: String(o.profile?.endpointBasePath || String(o.apiBasePath || "/api/v1/esign/signing")).trim()
    }
  };
}
function gi(o) {
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
function mi(o, u) {
  if (!u || typeof u != "object") return null;
  const f = String(o || "").trim(), c = f.includes(":") ? f.split(":", 1)[0] : "", I = f.includes(":") ? f.slice(f.indexOf(":") + 1) : "";
  return {
    name: String(u.name || "").trim(),
    email: String(u.email || "").trim(),
    role: String(u.role || "").trim(),
    actor_type: String(u.actor_type || c).trim(),
    actor_id: String(u.actor_id || I).trim()
  };
}
function pi(o) {
  if (!o || typeof o != "object") return {};
  const u = {};
  return Object.entries(o).forEach(([f, c]) => {
    const I = String(f || "").trim();
    if (!I) return;
    const E = mi(I, c);
    E && (u[I] = E);
  }), u;
}
function V(o, ...u) {
  if (!(!o || typeof o != "object")) {
    for (const f of u) if (Object.prototype.hasOwnProperty.call(o, f) && o[f] != null) return o[f];
  }
}
function T(o, ...u) {
  const f = V(o, ...u);
  return f == null ? "" : String(f).trim();
}
function de(o, ...u) {
  const f = V(o, ...u);
  return f == null || f === "" ? 0 : Number(f) || 0;
}
function fi(o) {
  if (!o || typeof o != "object") return null;
  const u = o.thread && typeof o.thread == "object" ? o.thread : {}, f = Array.isArray(o.messages) ? o.messages : [];
  return {
    thread: {
      id: T(u, "id", "ID"),
      review_id: T(u, "review_id", "reviewId", "ReviewID"),
      agreement_id: T(u, "agreement_id", "agreementId", "AgreementID"),
      visibility: T(u, "visibility", "Visibility") || "shared",
      anchor_type: T(u, "anchor_type", "anchorType", "AnchorType") || "agreement",
      page_number: de(u, "page_number", "pageNumber", "PageNumber"),
      field_id: T(u, "field_id", "fieldId", "FieldID"),
      anchor_x: de(u, "anchor_x", "anchorX", "AnchorX"),
      anchor_y: de(u, "anchor_y", "anchorY", "AnchorY"),
      status: T(u, "status", "Status") || "open",
      created_by_type: T(u, "created_by_type", "createdByType", "CreatedByType"),
      created_by_id: T(u, "created_by_id", "createdByID", "CreatedByID"),
      resolved_by_type: T(u, "resolved_by_type", "resolvedByType", "ResolvedByType"),
      resolved_by_id: T(u, "resolved_by_id", "resolvedByID", "ResolvedByID"),
      resolved_at: T(u, "resolved_at", "resolvedAt", "ResolvedAt"),
      last_activity_at: T(u, "last_activity_at", "lastActivityAt", "LastActivityAt")
    },
    messages: f.filter((c) => c && typeof c == "object").map((c) => ({
      id: T(c, "id", "ID"),
      thread_id: T(c, "thread_id", "threadId", "ThreadID"),
      body: T(c, "body", "Body"),
      created_by_type: T(c, "created_by_type", "createdByType", "CreatedByType"),
      created_by_id: T(c, "created_by_id", "createdByID", "CreatedByID"),
      created_at: T(c, "created_at", "createdAt", "CreatedAt")
    }))
  };
}
function Ye(o) {
  if (!o || typeof o != "object") return null;
  const u = Array.isArray(o.threads) ? o.threads.map(fi).filter(Boolean) : [], f = pi(o.actor_map || o.actorMap), c = Array.isArray(o.blockers) ? o.blockers.map((I) => String(I || "").trim()).filter(Boolean) : [];
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
    blockers: c,
    participant: gi(o.participant),
    actor_map: f,
    open_thread_count: Number(o.open_thread_count || 0) || 0,
    resolved_thread_count: Number(o.resolved_thread_count || 0) || 0,
    threads: u
  };
}
function yt(o) {
  switch (String(o?.thread?.anchor_type || "").trim()) {
    case "field":
      return o?.thread?.field_id ? `Field ${o.thread.field_id}` : "Field";
    case "page":
      return o?.thread?.page_number ? `Page ${o.thread.page_number}` : "Page";
    default:
      return "Global Comment";
  }
}
function hi(o) {
  const u = String(o?.thread?.anchor_type || "").trim();
  return u === "page" || u === "field";
}
function _e(o) {
  const u = Te(o);
  switch (u) {
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
      return u ? u.replace(/_/g, " ") : "Inactive";
  }
}
function Te(o) {
  return String(o || "").trim().toLowerCase();
}
function Ce(o) {
  return Te(o?.participant_status || o?.participant?.effective_decision_status || o?.participant?.decision_status);
}
function vi(o) {
  const u = Ce(o);
  return u === "approved" || u === "changes_requested";
}
function bi(o) {
  return !o || o.override_active || !o.can_approve && !o.can_request_changes ? !1 : !vi(o);
}
function wi(o) {
  if (!o || typeof o != "object") return "Track review status, comments, and decision actions.";
  const u = Te(o.status), f = Ce(o), c = Number(o.approved_count || 0) || 0, I = Number(o.total_approvers || 0) || 0;
  if (o.override_active) {
    const E = String(o.override_reason || "").trim(), _ = String(o.override_by_display_name || "").trim(), w = _ && !looksLikeUUID(_) ? _ : "";
    return E ? `Review was finalized by admin override${w ? ` by ${w}` : ""}. Reason: ${E}` : `Review was finalized by admin override${w ? ` by ${w}` : ""}.`;
  }
  if (o?.participant?.approved_on_behalf) {
    const E = String(o.participant.approved_on_behalf_by_display_name || "").trim(), _ = E && !looksLikeUUID(E) ? E : "";
    return _ ? `Your review decision was recorded on your behalf by ${_}.` : "Your review decision was recorded on your behalf by an admin.";
  }
  return f === "approved" && u === "in_review" ? I > 0 ? `Your approval is recorded. ${c} of ${I} approvers have approved so far.` : "Your approval is recorded. Waiting for the remaining reviewers before this document can proceed." : f === "approved" && u === "approved" ? I > 0 ? `All approvers approved (${c} of ${I}). Review is complete.` : "All reviewers approved. Review is complete." : f === "changes_requested" ? "Your change request is recorded. The sender must resolve it before this document can proceed." : u === "in_review" && I > 0 ? `${c} of ${I} approvers have approved so far.` : o.gate ? `Gate: ${String(o.gate || "").replace(/_/g, " ")}` : "Track review status, comments, and decision actions.";
}
function yi(o) {
  const u = typeof window < "u" ? window.location.origin.toLowerCase() : "unknown", f = o.recipientEmail ? o.recipientEmail.trim().toLowerCase() : o.recipientId.trim().toLowerCase();
  return encodeURIComponent(`${u}:${f}`);
}
function Si(o) {
  const u = String(o || "").trim();
  if (!u) return "";
  try {
    return decodeURIComponent(u);
  } catch {
    return u;
  }
}
function xi(o) {
  const u = String(o || "").trim().toLowerCase();
  return u === "[drawn]" || u === "[drawn initials]";
}
function U(o) {
  const u = String(o || "").trim();
  return xi(u) ? "" : u;
}
function _i(o, u = {}) {
  const f = new li(o.profile.ttlDays);
  if (!o.canSign || String(o.sessionKind || "").trim().toLowerCase() === "reviewer") return new He("local_only", f, null);
  const c = new ui(String(u.endpointPath || o.profile.endpointBasePath || "").trim(), o.token, u.request || void 0, u.requiresTokenPath !== !1);
  return o.profile.mode === "local_only" ? new He("local_only", f, null) : o.profile.mode === "remote_only" ? new He("remote_only", f, c) : new He("hybrid", f, c);
}
function Ci(o) {
  const u = document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]');
  if (!u) return;
  const f = u;
  if (f.dataset.esignBootstrapped === "true") return;
  f.dataset.esignBootstrapped = "true";
  const c = fr(o), I = yi(c);
  let E = null;
  const _ = {
    initialized: !1,
    bootstrapPromise: null,
    bearerToken: "",
    expiresAt: "",
    routes: {},
    previewObjectUrl: ""
  }, w = {
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
      if (!c.telemetryEnabled) return;
      const r = {
        event: e,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        flowMode: c.flowMode,
        agreementId: c.agreementId,
        ...t
      };
      this.events.push(r), this.isCriticalEvent(e) && this.flush();
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
    trackViewerLoad(e, t, r = null) {
      this.metrics.viewerLoadTime = t, this.track(e ? "viewer_load_success" : "viewer_load_failed", {
        duration: t,
        error: r,
        pageCount: c.pageCount
      });
    },
    trackFieldSave(e, t, r, n, i = null) {
      this.metrics.fieldSaveLatencies.push(n), r ? this.metrics.fieldsCompleted++ : this.metrics.errorsEncountered.push({
        type: "field_save",
        fieldId: e,
        error: i
      }), this.track(r ? "field_save_success" : "field_save_failed", {
        fieldId: e,
        fieldType: t,
        latency: n,
        error: i
      });
    },
    trackSignatureAttach(e, t, r, n, i = null) {
      this.metrics.signatureAttachLatencies.push(n), this.track(r ? "signature_attach_success" : "signature_attach_failed", {
        fieldId: e,
        signatureType: t,
        latency: n,
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
        flowMode: c.flowMode,
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
      return e.length ? Math.round(e.reduce((t, r) => t + r, 0) / e.length) : 0;
    },
    async flush() {
      if (!c.telemetryEnabled || this.events.length === 0) return;
      const e = kr();
      if (!e) {
        this.events = [];
        return;
      }
      const t = [...this.events];
      this.events = [];
      try {
        await D(e, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: t,
            summary: this.getSessionSummary()
          }),
          keepalive: !0
        });
      } catch (r) {
        this.events = [...t, ...this.events], console.warn("Telemetry flush failed:", r);
      }
    }
  };
  window.addEventListener("beforeunload", () => {
    w.track("session_end", w.getSessionSummary()), w.flush();
  }), setInterval(() => w.flush(), 3e4);
  const a = {
    currentPage: 1,
    zoomLevel: 1,
    pdfDoc: null,
    pageRendering: !1,
    pageNumPending: null,
    pageRenderWaiters: /* @__PURE__ */ new Map(),
    fieldState: /* @__PURE__ */ new Map(),
    activeFieldId: null,
    hasConsented: c.hasConsented,
    canSignSession: c.canSign,
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
    profileKey: I,
    profileData: null,
    profileRemember: c.profile.rememberByDefault,
    reviewContext: c.review ? Ye(c.review) : null,
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
    activePanelTab: String(c.defaultTab || "").trim().toLowerCase() === "review" ? "review" : "sign"
  };
  function M() {
    a.overlayRenderFrameID || (a.overlayRenderFrameID = window.requestAnimationFrame(() => {
      a.overlayRenderFrameID = 0, ve();
    }));
  }
  function We(e) {
    const t = Number(e || 0) || 0, r = document.querySelector("#pdf-page-1 canvas");
    return t > 0 && Number(a.currentPage || 0) === t && !a.pageRendering && r instanceof HTMLCanvasElement;
  }
  function Ee(e, t = null) {
    const r = Number(e || 0) || 0;
    if (!r) return;
    const n = a.pageRenderWaiters.get(r);
    !Array.isArray(n) || !n.length || (a.pageRenderWaiters.delete(r), n.forEach((i) => {
      if (i?.timer && window.clearTimeout(i.timer), t) {
        i?.reject?.(t);
        return;
      }
      i?.resolve?.();
    }));
  }
  function br(e, t = 4e3) {
    const r = Number(e || 0) || 0;
    return !r || We(r) ? Promise.resolve() : new Promise((n, i) => {
      const s = window.setTimeout(() => {
        const l = (Array.isArray(a.pageRenderWaiters.get(r)) ? a.pageRenderWaiters.get(r) : []).filter((g) => g?.resolve !== n);
        l.length ? a.pageRenderWaiters.set(r, l) : a.pageRenderWaiters.delete(r), i(/* @__PURE__ */ new Error(`Timed out rendering page ${r}.`));
      }, t), d = Array.isArray(a.pageRenderWaiters.get(r)) ? a.pageRenderWaiters.get(r) : [];
      d.push({
        resolve: n,
        reject: i,
        timer: s
      }), a.pageRenderWaiters.set(r, d), We(r) && Ee(r);
    });
  }
  function Ke(e) {
    const t = a.fieldState.get(e);
    t && (delete t.previewValueText, delete t.previewValueBool, delete t.previewSignatureUrl);
  }
  function wr() {
    a.fieldState.forEach((e) => {
      delete e.previewValueText, delete e.previewValueBool, delete e.previewSignatureUrl;
    });
  }
  function _t(e, t) {
    const r = a.fieldState.get(e);
    if (!r) return;
    const n = U(String(t || ""));
    if (!n) {
      delete r.previewValueText;
      return;
    }
    r.previewValueText = n, delete r.previewValueBool, delete r.previewSignatureUrl;
  }
  function Ct(e, t) {
    const r = a.fieldState.get(e);
    r && (r.previewValueBool = !!t, delete r.previewValueText, delete r.previewSignatureUrl);
  }
  function Xe(e, t) {
    const r = a.fieldState.get(e);
    if (!r) return;
    const n = String(t || "").trim();
    if (!n) {
      delete r.previewSignatureUrl;
      return;
    }
    r.previewSignatureUrl = n, delete r.previewValueText, delete r.previewValueBool;
  }
  function R() {
    return !!(a.reviewContext && typeof a.reviewContext == "object");
  }
  function ce() {
    const e = String(c.uiMode || "").trim().toLowerCase();
    return e === "sign" || e === "review" || e === "sign_and_review" ? e : String(c.sessionKind || "").trim().toLowerCase() === "reviewer" ? "review" : R() ? "sign_and_review" : "sign";
  }
  function yr() {
    const e = String(c.defaultTab || "").trim().toLowerCase();
    return e === "sign" || e === "review" ? ce() === "review" && e === "sign" ? "review" : ce() === "sign" && e === "review" ? "sign" : e : ce() === "review" ? "review" : "sign";
  }
  function G() {
    return ce() === "review";
  }
  function le() {
    return ce() === "sign_and_review";
  }
  function ke() {
    return G() || le() && a.activePanelTab === "review" ? "review" : "sign";
  }
  function Tt() {
    return !G() && ke() === "sign";
  }
  function Le() {
    return R() && (G() || ke() === "review");
  }
  function Je() {
    return !R() || !c.reviewMarkersVisible ? !1 : Le();
  }
  function Sr() {
    return !Je() || !c.reviewMarkersInteractive ? !1 : Et();
  }
  function Et() {
    return R() && a.reviewContext?.comments_enabled && a.reviewContext?.can_comment && Le();
  }
  function ue() {
    return String(c.sessionKind || "").trim().toLowerCase() === "sender";
  }
  function xr() {
    const e = String(c.viewerMode || "").trim().toLowerCase();
    return e === "review" || e === "sign" || e === "complete" || e === "read_only" ? e : "read_only";
  }
  function _r() {
    const e = String(c.viewerBanner || "").trim().toLowerCase();
    switch (e) {
      case "sender_review":
      case "sender_progress":
      case "sender_complete":
      case "sender_read_only":
        return e;
      default:
        switch (xr()) {
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
  function Q() {
    return !ue() && String(c.token || "").trim() !== "";
  }
  function Cr() {
    return `${String(c.apiBasePath || "/api/v1/esign/signing").replace(/\/$/, "")}/bootstrap/${encodeURIComponent(c.token)}`;
  }
  function A(e) {
    return String(_.routes?.[e] || "").trim();
  }
  function Ge(e, t = {}) {
    let r = String(e || "").trim();
    return r ? (Object.entries(t || {}).forEach(([n, i]) => {
      r = r.replace(`:${n}`, encodeURIComponent(String(i ?? "").trim()));
    }), r) : "";
  }
  function kt(e) {
    if (!e || typeof e != "object") return null;
    const t = fr({
      ...c,
      agreementId: T(e, "agreement_id", "agreementId", "AgreementID") || c.agreementId,
      sessionKind: T(e, "session_kind", "sessionKind", "SessionKind") || c.sessionKind,
      uiMode: T(e, "ui_mode", "uiMode", "UIMode") || c.uiMode,
      defaultTab: T(e, "default_tab", "defaultTab", "DefaultTab") || c.defaultTab,
      viewerMode: T(e, "viewer_mode", "viewerMode", "ViewerMode") || c.viewerMode,
      viewerBanner: T(e, "viewer_banner", "viewerBanner", "ViewerBanner") || c.viewerBanner,
      recipientId: T(e, "recipient_id", "recipientId", "RecipientID") || c.recipientId,
      recipientEmail: T(e, "recipient_email", "recipientEmail", "RecipientEmail") || c.recipientEmail,
      recipientName: T(e, "recipient_name", "recipientName", "RecipientName") || c.recipientName,
      pageCount: de(e, "page_count", "pageCount", "PageCount") || c.pageCount,
      hasConsented: !!V(e, "has_consented", "hasConsented") || c.hasConsented,
      canSign: V(e, "can_sign", "canSign", "CanSign") !== !1,
      reviewMarkersVisible: V(e, "review_markers_visible", "reviewMarkersVisible") !== !1,
      reviewMarkersInteractive: V(e, "review_markers_interactive", "reviewMarkersInteractive") !== !1,
      fields: Array.isArray(e.fields) ? e.fields : c.fields,
      review: e.review || null,
      viewer: {
        ...c.viewer,
        ...e.viewer && typeof e.viewer == "object" ? e.viewer : {}
      },
      signerState: T(e, "state", "signerState", "State") || c.signerState,
      recipientStage: de(e, "recipient_stage", "recipientStage", "RecipientStage") || c.recipientStage,
      activeStage: de(e, "active_stage", "activeStage", "ActiveStage") || c.activeStage,
      activeRecipientIds: Array.isArray(V(e, "active_recipient_ids", "activeRecipientIds")) ? V(e, "active_recipient_ids", "activeRecipientIds") : c.activeRecipientIds,
      waitingForRecipientIds: Array.isArray(V(e, "waiting_for_recipient_ids", "waitingForRecipientIds")) ? V(e, "waiting_for_recipient_ids", "waitingForRecipientIds") : c.waitingForRecipientIds
    });
    return Object.assign(c, t), t;
  }
  async function Lt() {
    if (Q() && !_.initialized) {
      if (_.bootstrapPromise) {
        await _.bootstrapPromise;
        return;
      }
      _.bootstrapPromise = (async () => {
        const e = await fetch(Cr(), {
          method: "POST",
          headers: { Accept: "application/json" },
          credentials: "omit"
        });
        if (!e.ok) throw await q(e, "Failed to initialize signer session");
        const t = await e.json(), r = t?.auth && typeof t.auth == "object" ? t.auth : {}, n = t?.routes && typeof t.routes == "object" ? t.routes : {};
        if (_.bearerToken = String(r.token || "").trim(), _.expiresAt = String(r.expires_at || "").trim(), _.routes = Object.fromEntries(Object.entries(n).map(([i, s]) => [String(i || "").trim(), String(s || "").trim()])), kt(t?.session || {}), _.initialized = !!_.bearerToken, !_.initialized) throw new Error("Failed to initialize signer session");
      })();
      try {
        await _.bootstrapPromise;
      } finally {
        _.bootstrapPromise = null;
      }
    }
  }
  async function D(e, t = {}) {
    if (Q()) {
      await Lt();
      const r = new Headers(t?.headers || {});
      _.bearerToken && r.set("Authorization", `Bearer ${_.bearerToken}`);
      const n = await fetch(e, {
        ...t,
        headers: r,
        credentials: "omit"
      });
      return (n.status === 401 || n.status === 410) && window.setTimeout(() => window.location.reload(), 0), n;
    }
    return fetch(e, {
      ...t,
      credentials: t?.credentials || "same-origin"
    });
  }
  function z() {
    return !ue() && !G() && Tt();
  }
  function Pt() {
    const e = A("session");
    if (e) return e;
    const t = String(c.resourceBasePath || "").trim();
    return t || `${c.apiBasePath}/session/${encodeURIComponent(c.token)}`;
  }
  function It() {
    return Pt();
  }
  function Tr() {
    const e = String(c.reviewApiPath || "").trim();
    return e || `${It()}/review`;
  }
  function Er() {
    const e = A("assets");
    if (e) return e;
    const t = String(c.assetContractPath || "").trim();
    if (t) return t;
    const r = String(c.token || "").trim();
    return !ue() && r ? `${c.apiBasePath}/assets/${encodeURIComponent(r)}` : `${Pt()}/assets`;
  }
  function kr() {
    const e = A("telemetry");
    if (e) return e;
    const t = String(c.telemetryPath || "").trim();
    if (t) return t;
    const r = String(c.token || "").trim();
    return r ? `${c.apiBasePath}/telemetry/${encodeURIComponent(r)}` : "";
  }
  async function At() {
    const e = await D(Er(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!e.ok) throw await q(e, "Failed to load document");
    return e.json();
  }
  function Lr(e) {
    _.previewObjectUrl && (URL.revokeObjectURL(_.previewObjectUrl), _.previewObjectUrl = ""), _.previewObjectUrl = String(e || "").trim();
  }
  async function $t(e) {
    const t = await D(String(e || "").trim(), {
      method: "GET",
      headers: { Accept: "application/pdf" }
    });
    if (!t.ok) throw await q(t, "Document asset is unavailable");
    const r = await t.blob();
    return URL.createObjectURL(r);
  }
  function Bt(e) {
    return !e || typeof e != "object" ? "" : String(e.preview_url || e.source_url || e.executed_url || e.certificate_url || "").trim();
  }
  function Rt(e, t) {
    return (Array.isArray(e) ? e : []).filter((r) => String(r?.thread?.status || "").trim() === t).length;
  }
  function Z(e, t) {
    const r = String(e || "").trim(), n = String(t || "").trim();
    return !r || !n ? "" : `${r}:${n}`;
  }
  function ie(e) {
    const t = String(e || "").trim();
    return t === "user" || t === "sender" ? "Sender" : t === "reviewer" ? "Reviewer" : t === "external" ? "External Reviewer" : t === "recipient" || t === "signer" ? "Signer" : t ? t.replace(/_/g, " ").replace(/\b\w/g, (r) => r.toUpperCase()) : "Participant";
  }
  function O(e) {
    if (!e || typeof e != "string") return !1;
    const t = e.trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) || /^[0-9a-f]{24,32}$/i.test(t);
  }
  function Pr(e) {
    if (!e) return null;
    const t = a.reviewContext?.participant;
    if (!t) return null;
    const r = String(e).trim(), n = String(t.id || "").trim(), i = String(t.recipient_id || "").trim();
    return n === r || i === r ? t : null;
  }
  function Ir(e, t) {
    const r = a.reviewContext?.actor_map || {}, n = [], i = String(e || "").trim(), s = String(t || "").trim();
    i === "recipient" || i === "signer" ? n.push(Z("recipient", t), Z("signer", t)) : i === "user" || i === "sender" ? n.push(Z("user", t), Z("sender", t)) : i === "reviewer" || i === "external" ? n.push(Z("reviewer", t), Z("external", t)) : n.push(Z(i, t));
    const d = n.map((g) => r[g]).find(Boolean);
    if (d) {
      const g = String(d.name || "").trim(), p = String(d.email || "").trim();
      if (g && !O(g)) return d;
      if (p && !O(p)) return {
        ...d,
        name: p
      };
    }
    const l = Pr(s);
    if (l) {
      const g = String(l.display_name || "").trim(), p = String(l.email || "").trim();
      if (g && !O(g)) return {
        name: g,
        email: p,
        role: i,
        actor_type: i,
        actor_id: s
      };
      if (p && !O(p)) return {
        name: p,
        email: p,
        role: i,
        actor_type: i,
        actor_id: s
      };
    }
    return {
      name: ie(i) || "Unknown User",
      email: "",
      role: i,
      actor_type: i,
      actor_id: s
    };
  }
  function Pe(e, t = "P") {
    const r = String(e || "").trim();
    if (!r) return String(t || "P").trim().slice(0, 2).toUpperCase() || "P";
    const n = r.split(/\s+/).map((i) => i[0] || "").join("").replace(/[^a-z0-9]/gi, "").toUpperCase();
    return n ? n.slice(0, 2) : r.replace(/[^a-z0-9]/gi, "").slice(0, 2).toUpperCase() || String(t || "P").trim().slice(0, 2).toUpperCase() || "P";
  }
  function Qe(e, t) {
    const r = Ir(e, t), n = String(r?.actor_type || e || "").trim();
    let i = "#64748b";
    (n === "user" || n === "sender") && (i = "#2563eb"), (n === "reviewer" || n === "external") && (i = "#7c3aed"), (n === "recipient" || n === "signer") && (i = "#059669");
    const s = String(r?.name || r?.email || ie(n)).trim() || "Participant", d = r?.name && !O(r.name) ? r.name : r?.email && !O(r.email) ? r.email : ie(n);
    return {
      actor: r,
      name: s,
      role: ie(r?.role || n),
      initials: Pe(d, ie(n)),
      color: i
    };
  }
  function Ar(e) {
    if (!e) return "";
    const t = String(e.display_name || "").trim(), r = String(e.email || "").trim();
    if (t && !O(t)) return t;
    if (r && !O(r)) return r;
    const n = String(e.participant_type || "").trim();
    return n ? ie(n) : "Participant";
  }
  function Mt(e) {
    const t = String(e || "").trim();
    if (!t) return "";
    const r = new Date(t);
    return Number.isNaN(r.getTime()) ? t : r.toLocaleString();
  }
  function $r(e) {
    a.reviewContext = Ye(e), a.reviewContext && (Array.isArray(a.reviewContext.threads) || (a.reviewContext.threads = []), a.reviewContext.open_thread_count = Rt(a.reviewContext.threads, "open"), a.reviewContext.resolved_thread_count = Rt(a.reviewContext.threads, "resolved")), G() ? a.activePanelTab = "review" : R() ? le() || (a.activePanelTab = yr()) : a.activePanelTab = "sign", K(), M(), fe(), Y();
  }
  async function ge() {
    const e = await D(It(), {
      method: "GET",
      headers: { Accept: "application/json" }
    });
    if (!e.ok) throw await q(e, "Failed to reload review session");
    const t = await e.json(), r = t?.session && typeof t.session == "object" ? t.session : {};
    return kt(r), a.hasConsented = c.hasConsented, a.canSignSession = c.canSign, $r(r.review || null), r;
  }
  async function Br(e) {
    return ai(e);
  }
  async function me(e, t = {}, r = "Review request failed") {
    let n = `${Tr()}${e}`;
    if (Q()) {
      const s = String(e || "").trim();
      if (s === "/threads") n = A("review_threads") || n;
      else if (s === "/approve") n = A("review_approve") || n;
      else if (s === "/request-changes") n = A("review_request_changes") || n;
      else {
        const d = s.match(/^\/threads\/([^/]+)\/replies$/), l = s.match(/^\/threads\/([^/]+)\/(resolve|reopen)$/);
        d ? n = Ge(A("review_thread_replies"), { thread_id: d[1] }) || n : l && (n = Ge(A(l[2] === "resolve" ? "review_thread_resolve" : "review_thread_reopen"), { thread_id: l[1] }) || n);
      }
    }
    const i = await D(n, {
      ...t,
      headers: {
        Accept: "application/json",
        ...t?.body ? { "Content-Type": "application/json" } : {},
        ...t?.headers || {}
      }
    });
    if (!i.ok) throw await q(i, r);
    return Br(i);
  }
  function ae() {
    const e = document.getElementById("review-thread-anchor");
    return String(e?.value || "agreement").trim() || "agreement";
  }
  function Dt() {
    a.highlightedReviewThreadID = "", a.highlightedReviewThreadTimer && (window.clearTimeout(a.highlightedReviewThreadTimer), a.highlightedReviewThreadTimer = null);
  }
  function Ft(e) {
    Dt(), a.highlightedReviewThreadID = String(e || "").trim(), a.highlightedReviewThreadID && (a.highlightedReviewThreadTimer = window.setTimeout(() => {
      Dt(), zt(), M();
    }, 2400), zt(), M());
  }
  function Rr(e) {
    if (!e || typeof e != "object") {
      a.reviewAnchorPointDraft = null, ee(), M();
      return;
    }
    a.reviewAnchorPointDraft = {
      page_number: Number(e.page_number || a.currentPage || 1) || 1,
      anchor_x: Math.round((Number(e.anchor_x || 0) || 0) * 100) / 100,
      anchor_y: Math.round((Number(e.anchor_y || 0) || 0) * 100) / 100
    }, ee(), M();
  }
  function Mr(e) {
    a.pickingReviewAnchorPoint = !!e && ae() === "page", document.getElementById("pdf-container")?.classList.toggle("review-anchor-picking", a.pickingReviewAnchorPoint), a.pickingReviewAnchorPoint ? v("Click on the document page to add a comment.") : (v("Comment pin placement cancelled."), pe()), ee();
  }
  function Dr(e, t, r) {
    if (!R() || !a.reviewContext?.comments_enabled || !a.reviewContext?.can_comment) return;
    a.inlineComposerPosition = {
      x: e,
      y: t
    }, a.inlineComposerAnchor = r, a.inlineComposerVisible = !0;
    let n = document.getElementById("inline-comment-composer");
    n || (n = Fr(), document.body.appendChild(n));
    const i = window.innerWidth, s = window.innerHeight, d = 320, l = 200, g = 16;
    let p = e + 20, m = t - l / 2;
    p + d > i - g && (p = e - d - 20), p < g && (p = g), m < g && (m = g), m + l > s - g && (m = s - l - g), n.style.left = `${p}px`, n.style.top = `${m}px`, n.classList.remove("hidden");
    const C = n.querySelector("textarea");
    C && setTimeout(() => C.focus(), 100), v("Comment composer opened. Type your comment and press submit.");
  }
  function pe() {
    a.inlineComposerVisible = !1, a.inlineComposerAnchor = null;
    const e = document.getElementById("inline-comment-composer");
    if (e) {
      e.classList.add("hidden");
      const t = e.querySelector("textarea");
      t && (t.value = "");
    }
  }
  function Fr() {
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
    `, e.querySelector(".inline-composer-close")?.addEventListener("click", () => pe()), e;
  }
  async function Nr() {
    if (!a.inlineComposerAnchor) return;
    const e = document.getElementById("inline-comment-body"), t = String(e?.value || "").trim();
    if (!t) {
      v("Enter a comment before submitting.", "assertive");
      return;
    }
    const r = { thread: {
      review_id: a.reviewContext.review_id,
      visibility: "shared",
      body: t,
      anchor_type: "page",
      page_number: a.inlineComposerAnchor.page_number,
      anchor_x: a.inlineComposerAnchor.anchor_x,
      anchor_y: a.inlineComposerAnchor.anchor_y
    } };
    try {
      await me("/threads", {
        method: "POST",
        body: JSON.stringify(r)
      }, "Failed to create review comment"), pe(), a.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), await ge(), v("Comment added successfully.");
    } catch (n) {
      console.error("Failed to submit inline comment:", n), window.toastManager && window.toastManager.error("Failed to add comment");
    }
  }
  function ee() {
    const e = document.getElementById("review-anchor-point-controls"), t = document.getElementById("review-anchor-point-status"), r = document.querySelector('[data-esign-action="pick-review-anchor-point"]'), n = document.querySelector('[data-esign-action="clear-review-anchor-point"]'), i = ae() === "page";
    if (e?.classList.toggle("hidden", !i), r instanceof HTMLButtonElement && (r.disabled = !R() || !(a.reviewContext?.comments_enabled && a.reviewContext?.can_comment), r.textContent = a.pickingReviewAnchorPoint ? "Picking..." : a.reviewAnchorPointDraft ? "Repin location" : "Pick location"), n instanceof HTMLButtonElement && (n.disabled = !a.reviewAnchorPointDraft), !!t) {
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
  function Ze() {
    const e = document.getElementById("review-progress-indicator");
    if (!e) return;
    if (!R()) {
      e.classList.add("hidden");
      return;
    }
    const t = a.reviewContext, r = Te(t.status), n = Ce(t);
    e.classList.remove("hidden");
    const i = document.getElementById("review-step-draft"), s = document.getElementById("review-step-sent"), d = document.getElementById("review-step-review"), l = document.getElementById("review-step-decision"), g = e.querySelectorAll(".review-progress-line");
    if ([
      i,
      s,
      d,
      l
    ].forEach((p) => {
      p?.classList.remove("completed", "active", "changes-requested");
    }), g.forEach((p) => {
      p.classList.remove("completed", "active");
    }), r === "approved") {
      i?.classList.add("completed"), s?.classList.add("completed"), d?.classList.add("completed"), l?.classList.add("completed"), g.forEach((m) => m.classList.add("completed"));
      const p = l?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    } else if (r === "changes_requested") {
      i?.classList.add("completed"), s?.classList.add("completed"), d?.classList.add("completed"), l?.classList.add("changes-requested"), g.forEach((m) => m.classList.add("completed"));
      const p = l?.querySelector("i");
      p && (p.className = "iconoir-warning-circle text-xs");
    } else if (n === "approved" && r === "in_review") {
      i?.classList.add("completed"), s?.classList.add("completed"), d?.classList.add("completed"), l?.classList.add("active"), g.forEach((m) => m.classList.add("completed"));
      const p = l?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    } else if (r === "in_review" || r === "pending") {
      i?.classList.add("completed"), s?.classList.add("completed"), d?.classList.add("active"), g[0] && g[0].classList.add("completed"), g[1] && g[1].classList.add("completed"), g[2] && g[2].classList.add("active");
      const p = l?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    } else {
      i?.classList.add("active");
      const p = l?.querySelector("i");
      p && (p.className = "iconoir-check-circle text-xs");
    }
  }
  function Ur() {
    const e = ae();
    if (e === "field" && a.activeFieldId) {
      const t = a.fieldState.get(a.activeFieldId);
      return {
        anchor_type: "field",
        field_id: String(a.activeFieldId || "").trim(),
        page_number: Number(t?.page || a.currentPage || 1) || 1
      };
    }
    if (e === "page") {
      const t = a.reviewAnchorPointDraft ? Number(a.reviewAnchorPointDraft.page_number || a.currentPage || 1) || 1 : Number(a.currentPage || 1) || 1, r = {
        anchor_type: "page",
        page_number: t
      };
      return a.reviewAnchorPointDraft && Number(a.reviewAnchorPointDraft.page_number || 0) === t && (r.anchor_x = Number(a.reviewAnchorPointDraft.anchor_x || 0) || 0, r.anchor_y = Number(a.reviewAnchorPointDraft.anchor_y || 0) || 0), r;
    }
    return { anchor_type: "agreement" };
  }
  function K() {
    const e = document.getElementById("review-panel"), t = document.getElementById("review-banner"), r = document.getElementById("review-status-chip"), n = document.getElementById("review-panel-subtitle"), i = document.getElementById("review-participant-summary"), s = document.getElementById("review-decision-actions"), d = document.getElementById("review-thread-summary"), l = document.getElementById("review-thread-composer"), g = document.getElementById("review-thread-list"), p = document.getElementById("review-thread-composer-hint");
    if (!e || !g) return;
    if (!R()) {
      e.classList.add("hidden"), t?.classList.add("hidden"), ee(), Ze();
      return;
    }
    const m = a.reviewContext, C = _e(m.status), y = Ce(m);
    if (!Le()) {
      e.classList.add("hidden"), t?.classList.add("hidden"), Ze();
      return;
    }
    if (e.classList.remove("hidden"), Ze(), r && (r.textContent = C, r.className = "rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide " + (m.status === "approved" ? "bg-emerald-100 text-emerald-700" : m.status === "changes_requested" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700")), n && (n.textContent = wi(m)), i) {
      const S = Ar(m.participant);
      if (S || y) {
        i.classList.remove("hidden"), i.className = "rounded-lg border px-3 py-2 text-xs", y === "approved" ? i.classList.add("border-emerald-200", "bg-emerald-50", "text-emerald-800") : y === "changes_requested" ? i.classList.add("border-amber-200", "bg-amber-50", "text-amber-800") : i.classList.add("border-slate-200", "bg-slate-50", "text-slate-700");
        const b = String(m.participant?.approved_on_behalf_by_display_name || "").trim(), B = b && !O(b) ? b : "", k = m.participant?.approved_on_behalf ? ` • approved on behalf${B ? ` by ${B}` : ""}` : "";
        i.textContent = S ? `${S} • decision ${_e(y || "pending")}${k}` : `Decision ${_e(y || "pending")}${k}`;
      } else i.classList.add("hidden");
    }
    if (s && s.classList.toggle("hidden", !bi(m)), d) {
      d.classList.remove("hidden");
      const S = [];
      (Number(m.total_approvers || 0) || 0) > 0 && S.push(`${m.approved_count || 0} of ${m.total_approvers || 0} approvers approved`), S.push(`${m.open_thread_count || 0} open`), S.push(`${m.resolved_thread_count || 0} resolved`), d.textContent = S.join(" • ");
    }
    if (l) {
      const S = m.comments_enabled && m.can_comment && !m.override_active;
      l.classList.toggle("hidden", !S), p && (ae() === "field" && a.activeFieldId ? p.textContent = "Comment will be anchored to the active field." : p.textContent = "Click Global Comment for agreement-level feedback, or click directly on the document to add a positioned comment.");
    }
    if (t) {
      const S = [];
      if (m.override_active) {
        const b = String(m.override_reason || "").trim(), B = String(m.override_by_display_name || "").trim(), k = B && !O(B) ? B : "";
        S.push(b ? `Review finalized by admin override${k ? ` by ${k}` : ""}. ${b}` : `Review finalized by admin override${k ? ` by ${k}` : ""}.`);
      }
      m.sign_blocked && m.sign_block_reason && S.push(m.sign_block_reason), (Array.isArray(m.blockers) ? m.blockers : []).forEach((b) => {
        const B = String(b || "").trim();
        B && !S.includes(B) && S.push(B);
      }), S.length ? (t.classList.remove("hidden"), t.className = "mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4", t.innerHTML = `
          <div class="flex items-start gap-3">
            <i class="iconoir-warning-circle mt-0.5 text-amber-600" aria-hidden="true"></i>
            <div class="min-w-0">
              <p class="text-sm font-semibold text-amber-900">Review Status</p>
              <p class="mt-1 text-xs text-amber-800">${L(S.join(" "))}</p>
            </div>
          </div>
        `) : t.classList.add("hidden");
    }
    et(), ee();
    const P = Array.isArray(m.threads) ? m.threads : [];
    if (!P.length) {
      g.innerHTML = '<div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">No review comments yet.</div>';
      return;
    }
    const h = a.reviewThreadFilter || "all", x = P.filter((S) => {
      const b = String(S?.thread?.status || "").trim();
      return h === "open" ? b === "open" : h === "resolved" ? b === "resolved" : !0;
    }), F = 5, $ = Math.ceil(x.length / F), N = Math.min(a.reviewThreadPage || 1, $ || 1), X = (N - 1) * F, ne = x.slice(X, X + F), W = P.length > 0 ? `
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
    ` : "", J = $ > 1 ? `
      <div class="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span class="text-xs text-gray-500">Page ${N} of ${$}</span>
        <div class="flex gap-2">
          <button type="button" data-esign-action="page-review-threads" data-page="${N - 1}" class="px-2 py-1 text-xs font-medium rounded border ${N <= 1 ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${N <= 1 ? "disabled" : ""}>
            <i class="iconoir-nav-arrow-left"></i> Prev
          </button>
          <button type="button" data-esign-action="page-review-threads" data-page="${N + 1}" class="px-2 py-1 text-xs font-medium rounded border ${N >= $ ? "border-gray-200 text-gray-300 cursor-not-allowed" : "border-gray-300 text-gray-600 hover:bg-gray-50"}" ${N >= $ ? "disabled" : ""}>
            Next <i class="iconoir-nav-arrow-right"></i>
          </button>
        </div>
      </div>
    ` : "";
    if (x.length === 0) {
      g.innerHTML = `
        ${W}
        <div class="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          No ${h === "all" ? "" : h} comments${h !== "all" ? ". Try a different filter." : "."}
        </div>
      `;
      return;
    }
    g.innerHTML = W + ne.map((S) => {
      const b = S.thread || {}, B = Array.isArray(S.messages) ? S.messages : [], k = m.comments_enabled && m.can_comment, j = k && String(b.status || "").trim() === "open", se = k && String(b.status || "").trim() === "resolved", ze = yt(S), ye = Mt(b.last_activity_at || ""), Se = `review-reply-${L(String(b.id || ""))}`, bt = `review-reply-composer-${L(String(b.id || ""))}`, ti = String(b.status || "").trim() === "resolved" ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200", wt = Qe(B[0]?.created_by_type || b.created_by_type, B[0]?.created_by_id || b.created_by_id);
      let je = "border-l-slate-300";
      wt.color === "#2563eb" && (je = "border-l-blue-400"), wt.color === "#7c3aed" && (je = "border-l-purple-400"), wt.color === "#059669" && (je = "border-l-emerald-400");
      const ri = String(b.id || "").trim() === String(a.highlightedReviewThreadID || "").trim(), ni = String(b.visibility || "shared").trim() === "internal" ? '<span class="inline-flex items-center gap-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700"><i class="iconoir-lock text-[10px]"></i>Internal</span>' : "", ur = hi(S);
      return `
        <article
          class="rounded-xl border ${ti} border-l-4 ${je} p-4 ${ri ? "ring-2 ring-blue-200 shadow-sm" : ""} ${ur ? "cursor-pointer" : ""}"
          data-review-thread-id="${L(String(b.id || ""))}"
          ${ur ? 'data-esign-action="highlight-review-marker"' : ""}
          tabindex="-1">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <button type="button" data-esign-action="go-review-thread-anchor" data-thread-id="${L(String(b.id || ""))}" class="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">${L(ze)}</button>
                <span class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${String(b.status || "").trim() === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}">${L(_e(b.status || "open"))}</span>
                ${ni}
              </div>
              ${ye ? `<p class="mt-2 text-xs text-gray-500">Last activity ${L(ye)}</p>` : ""}
            </div>
          </div>
          <div class="mt-3 space-y-3">
            ${B.map((Oe) => {
        const xe = Qe(Oe.created_by_type, Oe.created_by_id);
        let Ve = "bg-slate-50";
        return xe.color === "#2563eb" && (Ve = "bg-blue-50 border-l-2 border-l-blue-300"), xe.color === "#7c3aed" && (Ve = "bg-purple-50 border-l-2 border-l-purple-300"), xe.color === "#059669" && (Ve = "bg-emerald-50 border-l-2 border-l-emerald-300"), `
              <div class="rounded-lg ${Ve} px-3 py-2">
                <div class="flex items-center justify-between gap-3">
                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-700">${L(xe.name)}</p>
                    <p class="text-[10px] uppercase tracking-wide text-slate-500">${L(xe.role)}</p>
                  </div>
                  <p class="text-[11px] text-slate-500">${L(Mt(Oe.created_at || ""))}</p>
                </div>
                <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800">${L(String(Oe.body || ""))}</p>
              </div>
            `;
      }).join("")}
          </div>
          <div class="mt-3 flex flex-wrap items-center gap-3">
            ${j ? `<button type="button" data-esign-action="resolve-review-thread" data-thread-id="${L(String(b.id || ""))}" class="text-xs font-medium text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Resolve</button>` : ""}
            ${se ? `<button type="button" data-esign-action="reopen-review-thread" data-thread-id="${L(String(b.id || ""))}" class="text-xs font-medium text-blue-700 hover:text-blue-800 underline underline-offset-2">Reopen</button>` : ""}
            ${k ? `<button type="button" data-esign-action="toggle-reply-composer" data-thread-id="${L(String(b.id || ""))}" data-composer-id="${bt}" class="text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1">
              <i class="iconoir-chat-bubble text-[10px]"></i> Reply
            </button>` : ""}
          </div>
          ${k ? `
            <div id="${bt}" class="review-reply-composer mt-3 space-y-2 hidden" data-thread-id="${L(String(b.id || ""))}">
              <textarea id="${Se}" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y focus:border-blue-400 focus:ring-1 focus:ring-blue-400" rows="2" placeholder="Write your reply..."></textarea>
              <div class="flex justify-end gap-2">
                <button type="button" data-esign-action="cancel-reply" data-composer-id="${bt}" class="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 rounded border border-gray-200 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="button" data-esign-action="reply-review-thread" data-thread-id="${L(String(b.id || ""))}" data-reply-input-id="${Se}" class="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors">Send Reply</button>
              </div>
            </div>
          ` : ""}
        </article>
      `;
    }).join("") + J;
  }
  function Nt(e) {
    const t = Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : [];
    return e === "open" ? t.filter((r) => String(r?.thread?.status || "").trim() === "open") : e === "resolved" ? t.filter((r) => String(r?.thread?.status || "").trim() === "resolved") : t;
  }
  function et() {
    const e = document.getElementById("review-anchor-page-label"), t = document.getElementById("review-anchor-field-chip"), r = document.getElementById("review-anchor-field-label"), n = document.getElementById("review-thread-anchor");
    if (e && (e.textContent = `Page ${a.currentPage || 1}`), t && r) if (a.activeFieldId) {
      const i = a.fieldState.get(a.activeFieldId)?.type || "field";
      r.textContent = i.charAt(0).toUpperCase() + i.slice(1).replace(/_/g, " "), t.disabled = !1, t.classList.remove("hidden", "text-gray-400", "cursor-not-allowed"), t.classList.add("text-gray-600");
    } else
      r.textContent = "Select a field", t.disabled = !0, t.classList.add("hidden", "text-gray-400", "cursor-not-allowed"), t.classList.remove("text-gray-600"), n && n.value === "field" && Ut("agreement");
    ee();
  }
  function Ut(e) {
    const t = document.getElementById("review-thread-anchor"), r = document.querySelectorAll(".review-anchor-chip"), n = document.getElementById("review-thread-composer-hint");
    t && (t.value = e), r.forEach((i) => {
      i.getAttribute("data-anchor-type") === e ? (i.classList.add("active", "border-blue-300", "bg-blue-50", "text-blue-700"), i.classList.remove("border-gray-200", "bg-white", "text-gray-600")) : (i.classList.remove("active", "border-blue-300", "bg-blue-50", "text-blue-700"), i.classList.add("border-gray-200", "bg-white", "text-gray-600"));
    }), n && (e === "field" && a.activeFieldId ? n.textContent = "Comment will be anchored to the active field." : n.textContent = "Global comment on the agreement. Click directly on the document to place a positioned comment."), a.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), pe(), ee();
  }
  function qr() {
    const e = document.getElementById("review-anchor-chips");
    e && e.addEventListener("click", (t) => {
      const r = t.target.closest(".review-anchor-chip");
      if (!r || r.hasAttribute("disabled")) return;
      const n = r.getAttribute("data-anchor-type");
      n && Ut(n);
    });
  }
  function zr() {
    const e = document.getElementById("pdf-container");
    e && e.addEventListener("click", (t) => {
      if (!(t.target instanceof Element) || !Et() || t.target.closest(".review-thread-marker, .field-overlay") || t.target.closest("button, textarea, input, select, label, a")) return;
      const r = document.getElementById(`pdf-page-${Number(a.currentPage || 1) || 1}`);
      if (!r) return;
      t.preventDefault(), t.stopPropagation();
      const n = r.querySelector("canvas"), i = n instanceof HTMLElement ? n : r, s = te.screenToPagePoint(Number(a.currentPage || 1) || 1, i, t.clientX, t.clientY);
      s && Dr(t.clientX, t.clientY, s);
    });
  }
  function jr(e) {
    const t = [
      "all",
      "open",
      "resolved"
    ], r = String(e || "all").trim().toLowerCase();
    a.reviewThreadFilter = t.includes(r) ? r : "all", a.reviewThreadPage = 1, K(), v(`Showing ${a.reviewThreadFilter === "all" ? "all" : a.reviewThreadFilter} comments.`);
  }
  function Or(e) {
    a.reviewThreadPage = Math.max(1, parseInt(String(e), 10) || 1), K(), document.getElementById("review-panel")?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
  function qt(e, t) {
    const r = document.getElementById(String(e || "").trim());
    if (r)
      if (t) {
        document.querySelectorAll(".review-reply-composer").forEach((i) => {
          i.id !== e && i.classList.add("hidden");
        }), r.classList.remove("hidden");
        const n = r.querySelector("textarea");
        n && n.focus();
      } else {
        r.classList.add("hidden");
        const n = r.querySelector("textarea");
        n && (n.value = "");
      }
  }
  function zt() {
    document.querySelectorAll("[data-review-thread-id]").forEach((e) => {
      if (!(e instanceof HTMLElement)) return;
      const t = String(e.getAttribute("data-review-thread-id") || "").trim() === String(a.highlightedReviewThreadID || "").trim();
      e.classList.toggle("ring-2", t), e.classList.toggle("ring-blue-200", t), e.classList.toggle("shadow-sm", t);
    });
  }
  function Vr(e) {
    const t = String(e || "").trim();
    if (!t) return;
    const r = (Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : []).find((d) => String(d?.thread?.id || "").trim() === t);
    if (!r) return;
    const n = String(r?.thread?.status || "open").trim() || "open", i = a.reviewThreadFilter || "all";
    i !== "all" && i !== n && (a.reviewThreadFilter = n === "resolved" ? "resolved" : "open");
    const s = Nt(a.reviewThreadFilter || "all").findIndex((d) => String(d?.thread?.id || "").trim() === t);
    if (s >= 0) a.reviewThreadPage = Math.floor(s / 5) + 1;
    else {
      a.reviewThreadFilter = "all";
      const d = Nt("all").findIndex((l) => String(l?.thread?.id || "").trim() === t);
      a.reviewThreadPage = d >= 0 ? Math.floor(d / 5) + 1 : 1;
    }
    le() && ke() !== "review" && tt("review"), Ft(t), K(), requestAnimationFrame(() => {
      const d = document.querySelector(`[data-review-thread-id="${CSS.escape(t)}"]`);
      d instanceof HTMLElement && (d.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      }), d.focus({ preventScroll: !0 }));
    });
  }
  function tt(e) {
    e !== "sign" && e !== "review" || le() && (e === "review" && !R() || (a.activePanelTab = e, K(), M(), fe(), Y(), v(`${e === "sign" ? "Sign" : "Review"} tab selected.`)));
  }
  function fe() {
    const e = document.querySelector(".side-panel"), t = document.getElementById("panel-title-row"), r = document.getElementById("panel-title"), n = document.getElementById("panel-tabs"), i = document.getElementById("fields-status"), s = document.getElementById("fields-list"), d = document.getElementById("consent-notice"), l = document.getElementById("submit-btn"), g = document.getElementById("decline-btn"), p = document.getElementById("decline-container"), m = document.getElementById("panel-footer"), C = document.getElementById("panel-mobile-progress"), y = document.getElementById("review-submit-warning"), P = document.getElementById("review-submit-message"), h = document.getElementById("stage-state-banner"), x = document.getElementById("header-progress-group"), F = document.getElementById("session-identity-label"), $ = document.getElementById("panel-sign-content"), N = document.getElementById("panel-review-content"), X = document.getElementById("panel-footer-sign"), ne = document.getElementById("panel-footer-review"), W = document.getElementById("panel-tab-sign"), J = document.getElementById("panel-tab-review"), S = G(), b = le(), B = ue(), k = Tt(), j = Le(), se = z(), ze = ke();
    if (e?.classList.toggle("review-only-mode", S), e?.classList.toggle("combined-mode", b), W && J) {
      const ye = (b ? ze === "sign" : !S) && !S, Se = S || b && ze === "review";
      W.setAttribute("aria-selected", String(ye)), W.setAttribute("tabindex", ye ? "0" : "-1"), J.setAttribute("aria-selected", String(Se)), J.setAttribute("tabindex", Se ? "0" : "-1"), W.hidden = S, J.hidden = !R();
    }
    $ && ($.hidden = !k, $.classList.toggle("hidden", !k)), N && (N.hidden = !j, N.classList.toggle("hidden", !j)), X && (X.hidden = !k, X.classList.toggle("hidden", !k)), ne && (ne.hidden = !j, ne.classList.toggle("hidden", !j)), n?.classList.toggle("active", b), t?.classList.remove("hidden"), F && (B ? F.textContent = "Viewing as" : F.textContent = j && !k ? "Reviewing as" : "Signing as"), x?.classList.toggle("review-only-hidden", !k), r && (B ? r.textContent = j && !k ? "Review & Comment" : "Document Preview" : r.textContent = j && !k ? "Review & Comment" : "Complete & Sign"), s?.classList.toggle("hidden", !k), i?.classList.toggle("hidden", !k), C?.classList.toggle("hidden", !k), d?.classList.toggle("hidden", !se || a.hasConsented), h?.classList.toggle("hidden", !k), m?.classList.toggle("hidden", !k && !j), l?.classList.toggle("hidden", !se), g?.classList.toggle("hidden", !se), p?.classList.toggle("hidden", !se), y && P && (j ? (y.classList.remove("hidden"), P.textContent = k ? "Switch to the Sign tab to submit your signature." : "Review actions are available above.") : k && R() && a.reviewContext.sign_blocked ? (y.classList.remove("hidden"), P.textContent = a.reviewContext.sign_block_reason || "Signing is blocked until review completes.") : y.classList.add("hidden"));
  }
  async function Hr() {
    if (!R()) return;
    const e = document.getElementById("review-thread-body"), t = String(e?.value || "").trim();
    if (!t) {
      v("Enter a comment before creating a thread.", "assertive");
      return;
    }
    const r = { thread: {
      review_id: a.reviewContext.review_id,
      visibility: "shared",
      body: t,
      ...Ur()
    } };
    await me("/threads", {
      method: "POST",
      body: JSON.stringify(r)
    }, "Failed to create review thread"), e && (e.value = ""), await ge(), v("Review comment added.");
  }
  async function Yr(e, t) {
    const r = document.getElementById(String(t || "").trim()), n = String(r?.value || "").trim();
    if (!e || !n) {
      v("Enter a reply before sending.", "assertive");
      return;
    }
    await me(`/threads/${encodeURIComponent(String(e))}/replies`, {
      method: "POST",
      body: JSON.stringify({ reply: { body: n } })
    }, "Failed to reply to review thread"), r && (r.value = ""), await ge(), v("Reply added to review thread.");
  }
  async function jt(e, t) {
    if (!e) return;
    const r = t ? "resolve" : "reopen";
    await me(`/threads/${encodeURIComponent(String(e))}/${r}`, {
      method: "POST",
      body: JSON.stringify({})
    }, t ? "Failed to resolve review thread" : "Failed to reopen review thread"), await ge(), v(t ? "Review thread resolved." : "Review thread reopened.");
  }
  async function Wr(e, t = "") {
    const r = e === "approve" ? "/approve" : "/request-changes", n = e === "approve" ? "Failed to approve review" : "Failed to request review changes";
    await me(r, {
      method: "POST",
      body: e === "request-changes" && t ? JSON.stringify({ comment: t }) : void 0
    }, n), await ge();
    let i = e === "approve" ? "Review approved." : "Review changes requested.";
    if (R()) {
      const s = Te(a.reviewContext.status), d = Ce(a.reviewContext), l = Number(a.reviewContext.approved_count || 0) || 0, g = Number(a.reviewContext.total_approvers || 0) || 0;
      e === "approve" && d === "approved" && s === "in_review" ? i = g > 0 ? `Your approval was recorded. ${l} of ${g} approvers have approved so far.` : "Your approval was recorded. Waiting for the remaining reviewers." : e === "approve" && d === "approved" ? i = "Review approved." : e === "request-changes" && d === "changes_requested" && (i = "Your change request was recorded.");
    }
    window.toastManager && window.toastManager.success(i), v(i);
  }
  let Ie = "";
  function Ot(e) {
    const t = document.getElementById("review-decision-modal"), r = document.getElementById("review-decision-icon-container"), n = document.getElementById("review-decision-icon"), i = document.getElementById("review-decision-modal-title"), s = document.getElementById("review-decision-modal-description"), d = document.getElementById("review-decision-comment-section"), l = document.getElementById("review-decision-comment"), g = document.getElementById("review-decision-comment-error"), p = document.getElementById("review-decision-confirm-btn");
    if (!t) return;
    Ie = e, e === "approve" ? (r?.classList.remove("bg-amber-100"), r?.classList.add("bg-emerald-100"), n?.classList.remove("iconoir-warning-circle", "text-amber-600"), n?.classList.add("iconoir-check-circle", "text-emerald-600"), i && (i.textContent = "Approve Review?"), s && (s.textContent = "This will mark the document as approved and notify the sender that the review is complete."), d?.classList.add("hidden"), p?.classList.remove("bg-amber-600", "hover:bg-amber-700"), p?.classList.add("btn-primary"), p && (p.textContent = "Approve")) : (r?.classList.remove("bg-emerald-100"), r?.classList.add("bg-amber-100"), n?.classList.remove("iconoir-check-circle", "text-emerald-600"), n?.classList.add("iconoir-warning-circle", "text-amber-600"), i && (i.textContent = "Request Changes?"), s && (s.textContent = "The sender will be notified that changes are needed before this document can proceed."), d?.classList.remove("hidden"), l && (l.value = ""), g?.classList.add("hidden"), p?.classList.remove("btn-primary"), p?.classList.add("bg-amber-600", "hover:bg-amber-700", "text-white"), p && (p.textContent = "Request Changes")), t.classList.add("active"), t.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden";
    const m = t.querySelector(".field-editor");
    m instanceof HTMLElement && Ue(m), e === "request-changes" && l?.focus();
  }
  function rt() {
    const e = document.getElementById("review-decision-modal");
    if (!e) return;
    const t = e.querySelector(".field-editor");
    t instanceof HTMLElement && qe(t), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", Ie = "";
  }
  async function Kr() {
    if (!Ie) return;
    const e = Ie;
    let t = "";
    if (e === "request-changes") {
      const r = document.getElementById("review-decision-comment"), n = document.getElementById("review-decision-comment-error");
      if (t = String(r?.value || "").trim(), !t) {
        n?.classList.remove("hidden"), r?.focus(), v("Please provide a reason for requesting changes.", "assertive");
        return;
      }
    }
    rt(), await Wr(e, t);
  }
  async function Vt(e) {
    const t = (Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : []).find((n) => String(n?.thread?.id || "") === String(e || ""));
    if (!t) return "";
    Ft(e);
    const r = String(t?.thread?.anchor_type || "").trim();
    if (r === "field" && t.thread.field_id) {
      const n = a.fieldState.get(t.thread.field_id), i = Number(n?.page || t.thread.page_number || a.currentPage || 1) || 1;
      return i > 0 && await Me(i), dt(t.thread.field_id, { openEditor: !1 }), ht(t.thread.field_id), "field";
    }
    return r === "page" && Number(t?.thread?.page_number || 0) > 0 ? (await Me(Number(t.thread.page_number || 1) || 1), "page") : (document.getElementById("viewer-content")?.scrollTo({
      top: 0,
      behavior: "smooth"
    }), "agreement");
  }
  function Ht(e) {
    const t = String(e || "").trim();
    if (!t) return null;
    const r = document.querySelector(`.review-thread-marker[data-thread-id="${CSS.escape(t)}"]`);
    return r instanceof HTMLElement ? r : null;
  }
  function Xr(e, t = 4e3) {
    const r = String(e || "").trim(), n = Ht(r);
    return n ? Promise.resolve(n) : new Promise((i, s) => {
      const d = Date.now(), l = () => {
        const g = Ht(r);
        if (g) {
          i(g);
          return;
        }
        if (Date.now() - d >= t) {
          s(/* @__PURE__ */ new Error(`Timed out locating review marker for thread ${r}.`));
          return;
        }
        window.requestAnimationFrame(l);
      };
      window.requestAnimationFrame(l);
    });
  }
  async function Jr(e) {
    const t = String(e || "").trim();
    if (!t) return;
    const r = await Vt(t);
    if (!(r !== "page" && r !== "field"))
      try {
        (await Xr(t)).scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "center"
        });
      } catch {
      }
  }
  const te = {
    dpr: window.devicePixelRatio || 1,
    pageViewports: /* @__PURE__ */ new Map(),
    getPageMetadata(e) {
      const t = c.viewer.pages?.find((n) => n.page === e);
      if (t) return {
        width: t.width,
        height: t.height,
        rotation: t.rotation || 0
      };
      const r = this.pageViewports.get(e);
      return r ? {
        width: r.width,
        height: r.height,
        rotation: r.rotation || 0
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
      const r = e.page, n = this.getPageMetadata(r), i = t.offsetWidth, s = t.offsetHeight, d = e.pageWidth || n.width, l = e.pageHeight || n.height, g = i / d, p = s / l;
      let m = e.posX || 0, C = e.posY || 0;
      return c.viewer.origin === "bottom-left" && (C = l - C - (e.height || 30)), {
        left: m * g,
        top: C * p,
        width: (e.width || 150) * g,
        height: (e.height || 30) * p,
        _debug: {
          sourceX: m,
          sourceY: C,
          sourceWidth: e.width,
          sourceHeight: e.height,
          pageWidth: d,
          pageHeight: l,
          scaleX: g,
          scaleY: p,
          zoom: a.zoomLevel,
          dpr: this.dpr
        }
      };
    },
    getOverlayStyles(e, t) {
      const r = this.pageToScreen(e, t);
      return {
        left: `${Math.round(r.left)}px`,
        top: `${Math.round(r.top)}px`,
        width: `${Math.round(r.width)}px`,
        height: `${Math.round(r.height)}px`,
        transform: this.dpr > 1 ? "translateZ(0)" : "none"
      };
    },
    screenToPagePoint(e, t, r, n) {
      const i = this.getPageMetadata(e), s = t.getBoundingClientRect();
      if (!s.width || !s.height) return null;
      const d = Math.min(Math.max(r - s.left, 0), s.width), l = Math.min(Math.max(n - s.top, 0), s.height), g = i.width || s.width, p = i.height || s.height, m = g / s.width, C = p / s.height;
      let y = d * m, P = l * C;
      return c.viewer.origin === "bottom-left" && (P = p - P), {
        page_number: Number(e || 1) || 1,
        anchor_x: Math.round(y * 100) / 100,
        anchor_y: Math.round(P * 100) / 100
      };
    }
  }, Gr = {
    async requestUploadBootstrap(e, t, r, n) {
      const i = await D(A("signature_upload") || `${c.apiBasePath}/signature-upload/${c.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit",
        body: JSON.stringify({
          field_instance_id: e,
          sha256: t,
          content_type: r,
          size_bytes: n
        })
      });
      if (!i.ok) throw await q(i, "Failed to get upload contract");
      const s = await i.json(), d = s?.contract || s;
      if (!d || typeof d != "object" || !d.upload_url) throw new Error("Invalid upload contract response");
      return d;
    },
    async uploadToSignedUrl(e, t) {
      const r = new URL(e.upload_url, window.location.origin);
      e.upload_token && r.searchParams.set("upload_token", String(e.upload_token)), e.object_key && r.searchParams.set("object_key", String(e.object_key));
      const n = { "Content-Type": e.content_type || "image/png" };
      e.headers && Object.entries(e.headers).forEach(([s, d]) => {
        const l = String(s).toLowerCase();
        l === "x-esign-upload-token" || l === "x-esign-upload-key" || (n[s] = String(d));
      });
      const i = await fetch(r.toString(), {
        method: e.method || "PUT",
        headers: n,
        body: t,
        credentials: "omit"
      });
      if (!i.ok) throw await q(i, `Upload failed: ${i.status} ${i.statusText}`);
      return !0;
    },
    dataUrlToBlob(e) {
      const [t, r] = e.split(","), n = t.match(/data:([^;]+)/), i = n ? n[1] : "image/png", s = atob(r), d = new Uint8Array(s.length);
      for (let l = 0; l < s.length; l++) d[l] = s.charCodeAt(l);
      return new Blob([d], { type: i });
    },
    async uploadDrawnSignature(e, t) {
      const r = this.dataUrlToBlob(t), n = r.size, i = "image/png", s = await sn(r), d = await this.requestUploadBootstrap(e, s, i, n);
      return await this.uploadToSignedUrl(d, r), {
        uploadToken: d.upload_token,
        objectKey: d.object_key,
        sha256: d.sha256,
        contentType: d.content_type
      };
    }
  }, nt = {
    endpoint(e = "") {
      const t = e ? `/${encodeURIComponent(e)}` : "", r = e ? Ge(A("saved_signature"), { id: e }) : A("saved_signatures");
      if (r) return r;
      const n = encodeURIComponent(c.token);
      return `${c.apiBasePath}/signatures/${n}${t}`;
    },
    async list(e) {
      const t = new URL(this.endpoint(), window.location.origin);
      t.searchParams.set("type", e);
      const r = await D(t.toString(), {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (!r.ok) throw new Error(await gr(r, "Failed to load saved signatures", { appendStatusToFallback: !1 }));
      const n = await r.json();
      return Array.isArray(n?.signatures) ? n.signatures : [];
    },
    async save(e, t, r = "") {
      const n = await D(this.endpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          type: e,
          label: r,
          data_url: t
        })
      });
      if (!n.ok) {
        const i = await ii(n, "Failed to save signature", { appendStatusToFallback: !1 }), s = new Error(i.message), d = i.payload && typeof i.payload == "object" ? i.payload : null;
        throw s.code = typeof d?.error?.code == "string" ? d.error.code : "", s;
      }
      return (await n.json())?.signature || null;
    },
    async delete(e) {
      const t = await D(this.endpoint(e), {
        method: "DELETE",
        headers: { Accept: "application/json" }
      });
      if (!t.ok) throw new Error(await gr(t, "Failed to delete signature", { appendStatusToFallback: !1 }));
    }
  };
  function he(e) {
    const t = a.fieldState.get(e);
    return t && t.type === "initials" ? "initials" : "signature";
  }
  function Ae(e) {
    return a.savedSignaturesByType.get(e) || [];
  }
  async function Qr(e, t = !1) {
    const r = he(e);
    if (!t && a.savedSignaturesByType.has(r)) {
      $e(e);
      return;
    }
    const n = await nt.list(r);
    a.savedSignaturesByType.set(r, n), $e(e);
  }
  function $e(e) {
    const t = Ae(he(e)), r = document.getElementById("sig-saved-list");
    if (r) {
      if (!t.length) {
        r.innerHTML = '<p class="text-xs text-gray-500">No saved signatures yet.</p>';
        return;
      }
      r.innerHTML = t.map((n) => {
        const i = L(String(n?.thumbnail_data_url || n?.data_url || "")), s = L(String(n?.label || "Saved signature")), d = L(String(n?.id || ""));
        return `
      <div class="flex items-center gap-2 border border-gray-200 rounded-lg p-2">
        <img src="${i}" alt="${s}" class="w-16 h-10 object-contain bg-white border border-gray-100 rounded" />
        <div class="flex-1 min-w-0">
          <p class="text-xs text-gray-700 truncate">${s}</p>
        </div>
        <button type="button" data-esign-action="select-saved-signature" data-field-id="${L(e)}" data-signature-id="${d}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">Use</button>
        <button type="button" data-esign-action="delete-saved-signature" data-field-id="${L(e)}" data-signature-id="${d}" class="text-xs text-red-600 hover:text-red-700 underline underline-offset-2">Delete</button>
      </div>`;
      }).join("");
    }
  }
  async function Zr(e) {
    const t = a.signatureCanvases.get(e), r = he(e);
    if (!t || !gt(e)) throw new Error(`Please add your ${r === "initials" ? "initials" : "signature"} first`);
    const n = t.canvas.toDataURL("image/png"), i = await nt.save(r, n, r === "initials" ? "Initials" : "Signature");
    if (!i) throw new Error("Failed to save signature");
    const s = Ae(r);
    s.unshift(i), a.savedSignaturesByType.set(r, s), $e(e), window.toastManager && window.toastManager.success("Saved to your signature library");
  }
  async function en(e, t) {
    const r = Ae(he(e)).find((i) => String(i?.id || "") === String(t));
    if (!r) return;
    requestAnimationFrame(() => Ne(e)), await Yt(e);
    const n = String(r.data_url || r.thumbnail_data_url || "").trim();
    n && (await ut(e, n, { clearStrokes: !0 }), Xe(e, n), M(), Fe("draw", e), v("Saved signature selected."));
  }
  async function tn(e, t) {
    const r = he(e);
    await nt.delete(t);
    const n = Ae(r).filter((i) => String(i?.id || "") !== String(t));
    a.savedSignaturesByType.set(r, n), $e(e);
  }
  function Be(e) {
    const t = String(e?.code || "").trim(), r = String(e?.message || "Unable to update saved signatures"), n = t === "SIGNATURE_LIBRARY_LIMIT_REACHED" ? "You reached your saved-signature limit for this type. Delete one to save a new one." : r;
    window.toastManager && window.toastManager.error(n), v(n, "assertive");
  }
  async function Yt(e, t = 8) {
    for (let r = 0; r < t; r++) {
      if (a.signatureCanvases.has(e)) return !0;
      await new Promise((n) => setTimeout(n, 40)), Ne(e);
    }
    return !1;
  }
  async function rn(e, t) {
    const r = String(t?.type || "").toLowerCase();
    if (!["image/png", "image/jpeg"].includes(r)) throw new Error("Only PNG and JPEG images are supported");
    if (t.size > 2 * 1024 * 1024) throw new Error("Image file is too large");
    requestAnimationFrame(() => Ne(e)), await Yt(e);
    const n = a.signatureCanvases.get(e);
    if (!n) throw new Error("Signature canvas is not ready");
    const i = await nn(t), s = r === "image/png" ? i : await on(i, n.drawWidth, n.drawHeight);
    if (an(s) > pr) throw new Error(`Image exceeds ${Math.round(pr / 1024)}KB limit after conversion`);
    await ut(e, s, { clearStrokes: !0 }), Xe(e, s), M();
    const d = document.getElementById("sig-upload-preview-wrap"), l = document.getElementById("sig-upload-preview");
    d && d.classList.remove("hidden"), l && l.setAttribute("src", s), v("Signature image uploaded. You can now insert it.");
  }
  function nn(e) {
    return new Promise((t, r) => {
      const n = new FileReader();
      n.onload = () => t(String(n.result || "")), n.onerror = () => r(/* @__PURE__ */ new Error("Unable to read image file")), n.readAsDataURL(e);
    });
  }
  function an(e) {
    const t = String(e || "").split(",");
    if (t.length < 2) return 0;
    const r = t[1] || "", n = (r.match(/=+$/) || [""])[0].length;
    return Math.floor(r.length * 3 / 4) - n;
  }
  async function on(e, t, r) {
    return await new Promise((n, i) => {
      const s = new Image();
      s.onload = () => {
        const d = document.createElement("canvas"), l = Math.max(1, Math.round(Number(t) || 600)), g = Math.max(1, Math.round(Number(r) || 160));
        d.width = l, d.height = g;
        const p = d.getContext("2d");
        if (!p) {
          i(/* @__PURE__ */ new Error("Unable to process image"));
          return;
        }
        p.clearRect(0, 0, l, g);
        const m = Math.min(l / s.width, g / s.height), C = s.width * m, y = s.height * m, P = (l - C) / 2, h = (g - y) / 2;
        p.drawImage(s, P, h, C, y), n(d.toDataURL("image/png"));
      }, s.onerror = () => i(/* @__PURE__ */ new Error("Unable to decode image file")), s.src = e;
    });
  }
  async function sn(e) {
    if (window.crypto && window.crypto.subtle) {
      const t = await e.arrayBuffer(), r = await window.crypto.subtle.digest("SHA-256", t);
      return Array.from(new Uint8Array(r)).map((n) => n.toString(16).padStart(2, "0")).join("");
    }
    return crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Date.now().toString(16);
  }
  function dn() {
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const r = t.closest("[data-esign-action]");
      if (!r) return;
      const n = r.getAttribute("data-esign-action");
      if (n === "highlight-review-marker") {
        const i = t.closest("button, textarea, input, select, label, a, [data-esign-action]");
        if (i && i !== r) return;
      }
      switch (n) {
        case "prev-page":
          En();
          break;
        case "next-page":
          kn();
          break;
        case "zoom-out":
          Pn();
          break;
        case "zoom-in":
          Ln();
          break;
        case "fit-width":
          In();
          break;
        case "download-document":
          Zn();
          break;
        case "show-consent-modal":
          sr();
          break;
        case "activate-field": {
          const i = r.getAttribute("data-field-id");
          i && De(i);
          break;
        }
        case "submit-signature":
          Xn();
          break;
        case "show-decline-modal":
          Jn();
          break;
        case "close-field-editor":
          pt();
          break;
        case "save-field-editor":
          zn();
          break;
        case "hide-consent-modal":
          vt();
          break;
        case "accept-consent":
          Kn();
          break;
        case "hide-decline-modal":
          dr();
          break;
        case "confirm-decline":
          Gn();
          break;
        case "approve-review":
          Ot("approve");
          break;
        case "request-review-changes":
          Ot("request-changes");
          break;
        case "hide-review-decision-modal":
          rt();
          break;
        case "confirm-review-decision":
          Kr().catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to complete review action"), v(`Error: ${i?.message || "Unable to complete review action"}`, "assertive");
          });
          break;
        case "create-review-thread":
          Hr().catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to add comment"), v(`Error: ${i?.message || "Unable to add comment"}`, "assertive");
          });
          break;
        case "reply-review-thread":
          Yr(r.getAttribute("data-thread-id"), r.getAttribute("data-reply-input-id")).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to reply to thread"), v(`Error: ${i?.message || "Unable to reply to thread"}`, "assertive");
          });
          break;
        case "resolve-review-thread":
          jt(r.getAttribute("data-thread-id"), !0).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to resolve thread"), v(`Error: ${i?.message || "Unable to resolve thread"}`, "assertive");
          });
          break;
        case "reopen-review-thread":
          jt(r.getAttribute("data-thread-id"), !1).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to reopen thread"), v(`Error: ${i?.message || "Unable to reopen thread"}`, "assertive");
          });
          break;
        case "go-review-thread-anchor":
          Vt(r.getAttribute("data-thread-id")).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to navigate to comment anchor"), v(`Error: ${i?.message || "Unable to navigate to comment anchor"}`, "assertive");
          });
          break;
        case "go-review-thread":
          Vr(r.getAttribute("data-thread-id"));
          break;
        case "highlight-review-marker":
          Jr(r.getAttribute("data-review-thread-id")).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to locate comment marker"), v(`Error: ${i?.message || "Unable to locate comment marker"}`, "assertive");
          });
          break;
        case "filter-review-threads":
          jr(r.getAttribute("data-filter") || "all");
          break;
        case "page-review-threads":
          Or(parseInt(r.getAttribute("data-page") || "1", 10));
          break;
        case "toggle-reply-composer":
          qt(r.getAttribute("data-composer-id"), !0);
          break;
        case "cancel-reply":
          qt(r.getAttribute("data-composer-id"), !1);
          break;
        case "pick-review-anchor-point":
          ae() === "page" && Mr(!0);
          break;
        case "clear-review-anchor-point":
          a.pickingReviewAnchorPoint = !1, document.getElementById("pdf-container")?.classList.remove("review-anchor-picking"), Rr(null), v("Pinned comment location cleared.");
          break;
        case "submit-inline-comment":
          Nr().catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to add comment"), v(`Error: ${i?.message || "Unable to add comment"}`, "assertive");
          });
          break;
        case "cancel-inline-comment":
          pe();
          break;
        case "retry-load-pdf":
          Re();
          break;
        case "signature-tab": {
          const i = r.getAttribute("data-tab") || "draw", s = r.getAttribute("data-field-id");
          s && Fe(i, s);
          break;
        }
        case "clear-signature-canvas": {
          const i = r.getAttribute("data-field-id");
          i && Nn(i);
          break;
        }
        case "undo-signature-canvas": {
          const i = r.getAttribute("data-field-id");
          i && Dn(i);
          break;
        }
        case "redo-signature-canvas": {
          const i = r.getAttribute("data-field-id");
          i && Fn(i);
          break;
        }
        case "save-current-signature-library": {
          const i = r.getAttribute("data-field-id");
          i && Zr(i).catch(Be);
          break;
        }
        case "select-saved-signature": {
          const i = r.getAttribute("data-field-id"), s = r.getAttribute("data-signature-id");
          i && s && en(i, s).catch(Be);
          break;
        }
        case "delete-saved-signature": {
          const i = r.getAttribute("data-field-id"), s = r.getAttribute("data-signature-id");
          i && s && tn(i, s).catch(Be);
          break;
        }
        case "clear-signer-profile":
          Xt().catch(() => {
          });
          break;
        case "switch-panel-tab": {
          const i = r.getAttribute("data-tab");
          (i === "sign" || i === "review") && tt(i);
          break;
        }
        case "debug-toggle-panel":
          re.togglePanel();
          break;
        case "debug-copy-session":
          re.copySessionInfo();
          break;
        case "debug-clear-cache":
          re.clearCache();
          break;
        case "debug-show-telemetry":
          re.showTelemetry();
          break;
        case "debug-reload-viewer":
          re.reloadViewer();
          break;
      }
    }), document.addEventListener("change", (e) => {
      const t = e.target;
      if (t instanceof HTMLInputElement) {
        if (t.matches("#sig-upload-input")) {
          const r = t.getAttribute("data-field-id"), n = t.files?.[0];
          if (!r || !n) return;
          rn(r, n).catch((i) => {
            window.toastManager && window.toastManager.error(i?.message || "Unable to process uploaded image");
          });
          return;
        }
        if (t.matches("#field-checkbox-input")) {
          const r = t.getAttribute("data-field-id") || a.activeFieldId;
          if (!r) return;
          Ct(r, t.checked), M();
        }
      }
    }), document.addEventListener("input", (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement) && !(t instanceof HTMLTextAreaElement)) return;
      const r = t.getAttribute("data-field-id") || a.activeFieldId;
      if (r) {
        if (t.matches("#sig-type-input")) {
          lt(r, t.value || "", { syncOverlay: !0 });
          return;
        }
        if (t.matches("#field-text-input")) {
          _t(r, t.value || ""), M();
          return;
        }
        t.matches("#field-checkbox-input") && t instanceof HTMLInputElement && (Ct(r, t.checked), M());
      }
    });
  }
  xt(async () => {
    Q() && (await Lt(), a.hasConsented = c.hasConsented, a.canSignSession = c.canSign, a.reviewContext = c.review ? Ye(c.review) : null, a.activePanelTab = String(c.defaultTab || "").trim().toLowerCase() === "review" ? "review" : "sign"), E = _i(c, {
      endpointPath: A("profile") || c.profile.endpointBasePath,
      request: D,
      requiresTokenPath: !Q()
    }), dn(), a.isLowMemory = yn(), gn(), mn(), await fn(), pn(), K(), qr(), zr(), fe(), wn(), or(), Y(), await Re(), ve(), document.addEventListener("visibilitychange", cn), "memory" in navigator && ln(), re.init();
  });
  function cn() {
    document.hidden && Wt();
  }
  function Wt() {
    const e = a.isLowMemory ? 1 : 2;
    for (; a.renderedPages.size > e; ) {
      let t = null, r = 1 / 0;
      if (a.renderedPages.forEach((n, i) => {
        i !== a.currentPage && n.timestamp < r && (t = i, r = n.timestamp);
      }), t !== null) a.renderedPages.delete(t);
      else break;
    }
  }
  function ln() {
    setInterval(() => {
      navigator.memory && navigator.memory.usedJSHeapSize / navigator.memory.totalJSHeapSize > 0.8 && (a.isLowMemory = !0, Wt());
    }, 3e4);
  }
  function un(e) {
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
  function gn() {
    const e = document.getElementById("pdf-compatibility-banner"), t = document.getElementById("pdf-compatibility-message"), r = document.getElementById("pdf-compatibility-title");
    if (!e || !t || !r) return;
    const n = String(c.viewer.compatibilityTier || "").trim().toLowerCase(), i = String(c.viewer.compatibilityReason || "").trim().toLowerCase();
    if (n !== "limited") {
      e.classList.add("hidden");
      return;
    }
    r.textContent = "Preview Compatibility Notice", t.textContent = String(c.viewer.compatibilityMessage || "").trim() || un(i), e.classList.remove("hidden"), w.trackDegradedMode("pdf_preview_compatibility", {
      tier: n,
      reason: i
    });
  }
  function mn() {
    const e = document.getElementById("stage-state-banner"), t = document.getElementById("stage-state-icon"), r = document.getElementById("stage-state-title"), n = document.getElementById("stage-state-message"), i = document.getElementById("stage-state-meta");
    if (!e || !t || !r || !n || !i) return;
    if (ue()) {
      const C = _r();
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
      switch (C) {
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
      e.classList.remove("hidden"), e.className = `mb-4 rounded-lg border p-4 ${y.bgClass} ${y.borderClass}`, t.className = `${y.iconClass} mt-0.5`, r.className = `text-sm font-semibold ${y.titleClass}`, r.textContent = y.title, n.className = `text-xs ${y.messageClass} mt-1`, n.textContent = y.message, i.innerHTML = "", y.badges.forEach((P) => {
        const h = document.createElement("span"), x = {
          blue: "bg-blue-100 text-blue-800",
          amber: "bg-amber-100 text-amber-800",
          green: "bg-green-100 text-green-800",
          slate: "bg-slate-100 text-slate-800"
        };
        h.className = `inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${x[P.variant] || x.slate}`, h.innerHTML = `<i class="${P.icon} mr-1"></i>${P.text}`, i.appendChild(h);
      });
      return;
    }
    const s = c.signerState || "active", d = c.recipientStage || 1, l = c.activeStage || 1, g = c.activeRecipientIds || [], p = c.waitingForRecipientIds || [];
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
          message: d > l ? `You are in signing stage ${d}. Stage ${l} is currently active.` : "You will be able to sign once the previous signer(s) have completed their signatures.",
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
          text: `Stage ${l} active`,
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
    e.classList.remove("hidden"), e.className = `mb-4 rounded-lg border p-4 ${m.bgClass} ${m.borderClass}`, t.className = `${m.iconClass} mt-0.5`, r.className = `text-sm font-semibold ${m.titleClass}`, r.textContent = m.title, n.className = `text-xs ${m.messageClass} mt-1`, n.textContent = m.message, i.innerHTML = "", m.badges.forEach((C) => {
      const y = document.createElement("span"), P = {
        blue: "bg-blue-100 text-blue-800",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-green-100 text-green-800"
      };
      y.className = `inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${P[C.variant] || P.blue}`, y.innerHTML = `<i class="${C.icon} mr-1"></i>${C.text}`, i.appendChild(y);
    });
  }
  function pn() {
    c.fields.forEach((e) => {
      let t = null, r = !1;
      if (e.type === "checkbox")
        t = e.value_bool || !1, r = t;
      else if (e.type === "date_signed")
        t = (/* @__PURE__ */ new Date()).toISOString().split("T")[0], r = !0;
      else {
        const n = String(e.value_text || "");
        t = n || hn(e), r = !!n;
      }
      a.fieldState.set(e.id, {
        id: e.id,
        type: e.type,
        page: e.page || 1,
        required: e.required,
        value: t,
        completed: r,
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
  async function fn() {
    if (E)
      try {
        const e = await E.load(a.profileKey);
        e && (a.profileData = e, a.profileRemember = e.remember !== !1);
      } catch {
      }
  }
  function hn(e) {
    const t = a.profileData;
    if (!t) return "";
    const r = String(e?.type || "").trim();
    return r === "name" ? U(t.fullName || "") : r === "initials" ? U(t.initials || "") || Pe(t.fullName || c.recipientName || "") : r === "signature" ? U(t.typedSignature || "") : "";
  }
  function vn(e) {
    return !c.profile.persistDrawnSignature || !a.profileData ? "" : e?.type === "initials" && String(a.profileData.drawnInitialsDataUrl || "").trim() || String(a.profileData.drawnSignatureDataUrl || "").trim();
  }
  function bn(e) {
    const t = U(e?.value || "");
    return t || (a.profileData ? e?.type === "initials" ? U(a.profileData.initials || "") || Pe(a.profileData.fullName || c.recipientName || "") : e?.type === "signature" ? U(a.profileData.typedSignature || "") : "" : "");
  }
  function Kt() {
    const e = document.getElementById("remember-profile-input");
    return e instanceof HTMLInputElement ? !!e.checked : a.profileRemember;
  }
  async function Xt(e = !1) {
    if (!E) {
      a.profileData = null, a.profileRemember = c.profile.rememberByDefault;
      return;
    }
    let t = null;
    try {
      await E.clear(a.profileKey);
    } catch (r) {
      t = r;
    } finally {
      a.profileData = null, a.profileRemember = c.profile.rememberByDefault;
    }
    if (t) {
      if (!e && window.toastManager && window.toastManager.error("Unable to clear saved signer profile on all devices"), !e) throw t;
      return;
    }
    !e && window.toastManager && window.toastManager.success("Saved signer profile cleared");
  }
  async function Jt(e, t = {}) {
    if (!E) return;
    const r = Kt();
    if (a.profileRemember = r, !r) {
      await Xt(!0);
      return;
    }
    if (!e) return;
    const n = { remember: !0 }, i = String(e.type || "");
    if (i === "name" && typeof e.value == "string") {
      const s = U(e.value);
      s && (n.fullName = s, (a.profileData?.initials || "").trim() || (n.initials = Pe(s)));
    }
    if (i === "initials") {
      if (t.signatureType === "drawn" && c.profile.persistDrawnSignature && typeof t.signatureDataUrl == "string") n.drawnInitialsDataUrl = t.signatureDataUrl;
      else if (typeof e.value == "string") {
        const s = U(e.value);
        s && (n.initials = s);
      }
    }
    if (i === "signature") {
      if (t.signatureType === "drawn" && c.profile.persistDrawnSignature && typeof t.signatureDataUrl == "string") n.drawnSignatureDataUrl = t.signatureDataUrl;
      else if (typeof e.value == "string") {
        const s = U(e.value);
        s && (n.typedSignature = s);
      }
    }
    if (!(Object.keys(n).length === 1 && n.remember === !0))
      try {
        a.profileData = await E.save(a.profileKey, n);
      } catch {
      }
  }
  function wn() {
    const e = document.getElementById("consent-checkbox"), t = document.getElementById("consent-accept-btn");
    e && t && e.addEventListener("change", function() {
      t.disabled = !this.checked;
    });
  }
  function yn() {
    return !!(navigator.deviceMemory && navigator.deviceMemory < 4 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }
  function it() {
    const e = a.isLowMemory ? 3 : a.maxCachedPages;
    if (a.renderedPages.size <= e) return;
    const t = [];
    for (a.renderedPages.forEach((r, n) => {
      const i = Math.abs(n - a.currentPage);
      t.push({
        pageNum: n,
        distance: i
      });
    }), t.sort((r, n) => n.distance - r.distance); a.renderedPages.size > e && t.length > 0; ) {
      const r = t.shift();
      r && r.pageNum !== a.currentPage && a.renderedPages.delete(r.pageNum);
    }
  }
  function Gt(e) {
    if (a.isLowMemory) return;
    const t = [];
    e > 1 && t.push(e - 1), e < c.pageCount && t.push(e + 1), "requestIdleCallback" in window && requestIdleCallback(() => {
      t.forEach(async (r) => {
        !a.renderedPages.has(r) && !a.pageRendering && await Sn(r);
      });
    }, { timeout: 2e3 });
  }
  async function Sn(e) {
    if (!(!a.pdfDoc || a.renderedPages.has(e)))
      try {
        const t = await a.pdfDoc.getPage(e), r = a.zoomLevel, n = t.getViewport({ scale: r * window.devicePixelRatio }), i = document.createElement("canvas"), s = i.getContext("2d");
        i.width = n.width, i.height = n.height;
        const d = {
          canvasContext: s,
          viewport: n
        };
        await t.render(d).promise, a.renderedPages.set(e, {
          canvas: i,
          scale: r,
          timestamp: Date.now()
        }), it();
      } catch (t) {
        console.warn("Preload failed for page", e, t);
      }
  }
  function xn() {
    const e = window.devicePixelRatio || 1;
    return a.isLowMemory ? Math.min(e, 1.5) : Math.min(e, 2);
  }
  async function Re() {
    const e = document.getElementById("pdf-loading"), t = Date.now();
    let r = "";
    try {
      const n = Bt((await At()).assets || {});
      if (Q() && n ? (r = await $t(n), Lr(r)) : r = n, !r) throw new Error("Document preview is not available yet. The document may still be processing.");
      a.pdfDoc = await di({
        url: r,
        surface: "signer-review",
        documentId: c.agreementId
      }).promise, c.pageCount = a.pdfDoc.numPages, document.getElementById("page-count").textContent = a.pdfDoc.numPages, await at(1), ot(), w.trackViewerLoad(!0, Date.now() - t), w.trackPageView(1);
    } catch (n) {
      const i = si(n, {
        surface: "signer-review",
        documentId: c.agreementId,
        url: typeof r == "string" ? r : null
      });
      w.trackViewerLoad(!1, Date.now() - t, i.rawMessage), e && (e.innerHTML = `
          <div class="text-center text-red-500">
            <i class="iconoir-warning-circle text-2xl mb-2"></i>
            <p class="text-sm">Failed to load document</p>
            <button type="button" data-esign-action="retry-load-pdf" class="mt-2 text-blue-600 hover:underline text-sm">Retry</button>
          </div>
        `), Qn();
    }
  }
  async function at(e) {
    if (!a.pdfDoc) return;
    const t = a.renderedPages.get(e);
    if (t && t.scale === a.zoomLevel) {
      _n(t, e), a.currentPage = e, document.getElementById("current-page").textContent = e, ot(), et(), ve(), Ee(e), Gt(e);
      return;
    }
    a.pageRendering = !0;
    try {
      const r = await a.pdfDoc.getPage(e), n = a.zoomLevel, i = xn(), s = r.getViewport({ scale: n * i }), d = r.getViewport({ scale: 1 });
      te.setPageViewport(e, {
        width: d.width,
        height: d.height,
        rotation: d.rotation || 0
      });
      const l = document.getElementById("pdf-page-1");
      l.innerHTML = "";
      const g = document.createElement("canvas"), p = g.getContext("2d");
      g.height = s.height, g.width = s.width, g.style.width = `${s.width / i}px`, g.style.height = `${s.height / i}px`, l.appendChild(g);
      const m = document.getElementById("pdf-container");
      m.style.width = `${s.width / i}px`;
      const C = {
        canvasContext: p,
        viewport: s
      };
      await r.render(C).promise, a.renderedPages.set(e, {
        canvas: g.cloneNode(!0),
        scale: n,
        timestamp: Date.now(),
        displayWidth: s.width / i,
        displayHeight: s.height / i
      }), a.renderedPages.get(e).canvas.getContext("2d").drawImage(g, 0, 0), it(), a.currentPage = e, document.getElementById("current-page").textContent = e, ot(), et(), ve(), Ee(e), w.trackPageView(e), Gt(e);
    } catch (r) {
      Ee(e, r instanceof Error ? r : /* @__PURE__ */ new Error("Page render failed.")), console.error("Page render error:", r);
    } finally {
      if (a.pageRendering = !1, a.pageNumPending !== null) {
        const r = a.pageNumPending;
        a.pageNumPending = null, await at(r);
      }
    }
  }
  function _n(e, t) {
    const r = document.getElementById("pdf-page-1");
    r.innerHTML = "";
    const n = document.createElement("canvas");
    n.width = e.canvas.width, n.height = e.canvas.height, n.style.width = `${e.displayWidth}px`, n.style.height = `${e.displayHeight}px`, n.getContext("2d").drawImage(e.canvas, 0, 0), r.appendChild(n);
    const i = document.getElementById("pdf-container");
    i.style.width = `${e.displayWidth}px`;
  }
  function oe(e) {
    a.pageRendering ? a.pageNumPending = e : at(e);
  }
  function Cn(e) {
    return typeof e.previewValueText == "string" && e.previewValueText.trim() !== "" ? U(e.previewValueText) : typeof e.value == "string" && e.value.trim() !== "" ? U(e.value) : "";
  }
  function Qt(e, t, r, n = !1) {
    const i = document.createElement("img");
    i.className = "field-overlay-preview", i.src = t, i.alt = r, e.appendChild(i), e.classList.add("has-preview"), n && e.classList.add("draft-preview");
  }
  function Zt(e, t, r = !1, n = !1) {
    const i = document.createElement("span");
    i.className = "field-overlay-value", r && i.classList.add("font-signature"), i.textContent = t, e.appendChild(i), e.classList.add("has-value"), n && e.classList.add("draft-preview");
  }
  function er(e, t) {
    const r = document.createElement("span");
    r.className = "field-overlay-label", r.textContent = t, e.appendChild(r);
  }
  function Tn(e, t) {
    if (!t) return null;
    const r = e?.thread || {}, n = String(r.anchor_type || "").trim();
    if (n === "page") {
      const i = Number(r.page_number || 0) || 0, s = (Number(r.anchor_x || 0) || 0) > 0 || (Number(r.anchor_y || 0) || 0) > 0;
      if (i !== Number(a.currentPage || 0) || !s) return null;
      const d = te.pageToScreen({
        page: i,
        posX: Number(r.anchor_x || 0) || 0,
        posY: Number(r.anchor_y || 0) || 0,
        width: 0,
        height: 0
      }, t);
      return {
        left: d.left,
        top: d.top
      };
    }
    if (n === "field" && r.field_id) {
      const i = a.fieldState.get(String(r.field_id || "").trim());
      if (!i || Number(i.page || 0) !== Number(a.currentPage || 0) || i.posX == null || i.posY == null) return null;
      const s = te.pageToScreen({
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
  function tr(e, t) {
    if ((Array.isArray(a.reviewContext?.threads) ? a.reviewContext.threads : []).forEach((r) => {
      const n = r?.thread || {}, i = Tn(r, t);
      if (!i) return;
      const s = Qe(n.created_by_type, n.created_by_id), d = Sr(), l = document.createElement(d ? "button" : "div");
      d && l instanceof HTMLButtonElement && (l.type = "button"), l.className = "review-thread-marker", String(n.status || "").trim() === "resolved" && l.classList.add("resolved"), String(n.visibility || "shared").trim() === "internal" && l.classList.add("internal"), String(n.id || "").trim() === String(a.highlightedReviewThreadID || "").trim() && l.classList.add("active"), d ? l.dataset.esignAction = "go-review-thread" : (l.setAttribute("aria-hidden", "true"), l.style.pointerEvents = "none"), l.dataset.threadId = String(n.id || "").trim(), l.style.left = `${Math.round(i.left)}px`, l.style.top = `${Math.round(i.top)}px`, l.style.background = s.color, l.style.borderColor = s.color, d && (l.title = `${yt(r)} comment by ${s.name}`, l.setAttribute("aria-label", `${yt(r)} comment by ${s.name}`)), l.textContent = s.initials, e.appendChild(l);
    }), ae() === "page" && a.reviewAnchorPointDraft && Number(a.reviewAnchorPointDraft.page_number || 0) === Number(a.currentPage || 0)) {
      const r = te.pageToScreen({
        page: Number(a.reviewAnchorPointDraft.page_number || a.currentPage || 1) || 1,
        posX: Number(a.reviewAnchorPointDraft.anchor_x || 0) || 0,
        posY: Number(a.reviewAnchorPointDraft.anchor_y || 0) || 0,
        width: 0,
        height: 0
      }, t), n = document.createElement("div");
      n.className = "review-thread-marker active", n.style.left = `${Math.round(r.left)}px`, n.style.top = `${Math.round(r.top)}px`, n.setAttribute("aria-hidden", "true"), n.textContent = "+", e.appendChild(n);
    }
  }
  function ve() {
    const e = document.getElementById("field-overlays");
    if (!e) return;
    e.innerHTML = "", e.style.pointerEvents = "auto";
    const t = document.getElementById("pdf-container");
    if (t) {
      if (!z()) {
        Je() && tr(e, t);
        return;
      }
      a.fieldState.forEach((r, n) => {
        if (r.page !== a.currentPage) return;
        const i = document.createElement("div");
        if (i.className = "field-overlay", i.dataset.fieldId = n, r.required && i.classList.add("required"), r.completed && i.classList.add("completed"), a.activeFieldId === n && i.classList.add("active"), r.posX != null && r.posY != null && r.width != null && r.height != null) {
          const m = te.getOverlayStyles(r, t);
          i.style.left = m.left, i.style.top = m.top, i.style.width = m.width, i.style.height = m.height, i.style.transform = m.transform, re.enabled && (i.dataset.debugCoords = JSON.stringify(te.pageToScreen(r, t)._debug));
        } else {
          const m = Array.from(a.fieldState.keys()).indexOf(n);
          i.style.left = "10px", i.style.top = `${100 + m * 50}px`, i.style.width = "150px", i.style.height = "30px";
        }
        const s = String(r.previewSignatureUrl || "").trim(), d = String(r.signaturePreviewUrl || "").trim(), l = Cn(r), g = r.type === "signature" || r.type === "initials", p = typeof r.previewValueBool == "boolean";
        s ? Qt(i, s, be(r.type), !0) : r.completed && d ? Qt(i, d, be(r.type)) : l ? Zt(i, l, g, typeof r.previewValueText == "string" && r.previewValueText.trim() !== "") : r.type === "checkbox" && (p ? r.previewValueBool : r.value) ? Zt(i, "Checked", !1, p) : er(i, be(r.type)), i.setAttribute("tabindex", "0"), i.setAttribute("role", "button"), i.setAttribute("aria-label", `${be(r.type)} field${r.required ? ", required" : ""}${r.completed ? ", completed" : ""}`), i.addEventListener("click", () => De(n)), i.addEventListener("keydown", (m) => {
          (m.key === "Enter" || m.key === " ") && (m.preventDefault(), De(n));
        }), e.appendChild(i);
      }), t && Je() && tr(e, t);
    }
  }
  function be(e) {
    return {
      signature: "Sign",
      initials: "Initial",
      name: "Name",
      date_signed: "Date",
      text: "Text",
      checkbox: "Check"
    }[e] || e;
  }
  function En() {
    a.currentPage <= 1 || oe(a.currentPage - 1);
  }
  function kn() {
    a.currentPage >= c.pageCount || oe(a.currentPage + 1);
  }
  function Me(e) {
    const t = Number(e || 0) || 0;
    if (t < 1 || t > c.pageCount) return Promise.resolve();
    const r = br(t);
    return We(t) || oe(t), r;
  }
  function ot() {
    document.getElementById("prev-page-btn").disabled = a.currentPage <= 1, document.getElementById("next-page-btn").disabled = a.currentPage >= c.pageCount;
  }
  function Ln() {
    a.zoomLevel = Math.min(a.zoomLevel + 0.25, 3), st(), oe(a.currentPage);
  }
  function Pn() {
    a.zoomLevel = Math.max(a.zoomLevel - 0.25, 0.5), st(), oe(a.currentPage);
  }
  function In() {
    a.zoomLevel = (document.getElementById("viewer-content").offsetWidth - 32) / 612, st(), oe(a.currentPage);
  }
  function st() {
    document.getElementById("zoom-level").textContent = `${Math.round(a.zoomLevel * 100)}%`;
  }
  function De(e) {
    if (!z()) {
      v("This review session is read-only for signing fields.");
      return;
    }
    if (!a.hasConsented && c.fields.some((t) => t.id === e && t.type !== "date_signed")) {
      sr();
      return;
    }
    dt(e, { openEditor: !0 });
  }
  function dt(e, t = { openEditor: !0 }) {
    const r = a.fieldState.get(e);
    if (r) {
      if (t.openEditor && !z()) {
        ct(e);
        return;
      }
      if (t.openEditor && (a.activeFieldId = e, K()), document.querySelectorAll(".field-list-item").forEach((n) => n.classList.remove("active", "guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${e}"]`)?.classList.add("active"), document.querySelectorAll(".field-overlay").forEach((n) => n.classList.remove("active", "guided-next-target")), document.querySelector(`.field-overlay[data-field-id="${e}"]`)?.classList.add("active"), r.page !== a.currentPage && Me(r.page), !t.openEditor) {
        ct(e);
        return;
      }
      r.type !== "date_signed" && An(e);
    }
  }
  function ct(e) {
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
  function An(e) {
    const t = a.fieldState.get(e);
    if (!t) return;
    const r = document.getElementById("field-editor-overlay"), n = document.getElementById("field-editor-content"), i = document.getElementById("field-editor-title"), s = document.getElementById("field-editor-legal-disclaimer");
    i.textContent = rr(t.type), n.innerHTML = $n(t), s?.classList.toggle("hidden", !(t.type === "signature" || t.type === "initials")), (t.type === "signature" || t.type === "initials") && Rn(e), r.classList.add("active"), r.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Ue(r.querySelector(".field-editor")), v(`Editing ${rr(t.type)}. Press Escape to cancel.`), setTimeout(() => {
      const d = n.querySelector("input, textarea");
      d ? d.focus() : n.querySelector('.sig-editor-tab[aria-selected="true"]')?.focus();
    }, 100), H(a.writeCooldownUntil) > 0 && ir(H(a.writeCooldownUntil));
  }
  function rr(e) {
    return {
      signature: "Add Your Signature",
      initials: "Add Your Initials",
      name: "Enter Your Name",
      text: "Enter Text",
      checkbox: "Confirmation"
    }[e] || "Edit Field";
  }
  function $n(e) {
    const t = Bn(e.type), r = L(String(e?.id || "")), n = L(String(e?.type || ""));
    if (e.type === "signature" || e.type === "initials") {
      const i = e.type === "initials" ? "initials" : "signature", s = L(bn(e)), d = [
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
      ], l = nr(e.id);
      return `
        <div class="space-y-4">
          <div class="flex border-b border-gray-200" role="tablist" aria-label="Signature editor tabs">
            ${d.map((g) => `
            <button
              type="button"
              id="sig-tab-${g.id}"
              class="sig-editor-tab flex-1 py-2 text-sm font-medium border-b-2 ${l === g.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}"
              data-tab="${g.id}"
              data-esign-action="signature-tab"
              data-field-id="${r}"
              role="tab"
              aria-selected="${l === g.id ? "true" : "false"}"
              aria-controls="sig-editor-${g.id}"
              tabindex="${l === g.id ? "0" : "-1"}"
            >
              ${g.label}
            </button>`).join("")}
          </div>

          <!-- Type panel -->
          <div id="sig-editor-type" class="sig-editor-panel ${l === "type" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-type">
            <input
              type="text"
              id="sig-type-input"
              class="w-full text-2xl font-signature text-center py-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Type your ${i}"
              value="${s}"
              data-field-id="${r}"
            />
            <div class="mt-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <p class="text-[11px] uppercase tracking-wide text-gray-500 mb-2">Live preview</p>
              <p id="sig-type-preview" class="text-2xl font-signature text-center text-gray-900" data-field-id="${r}">${s}</p>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Your typed ${i} will appear as your ${n}</p>
          </div>

          <!-- Draw panel -->
          <div id="sig-editor-draw" class="sig-editor-panel ${l === "draw" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-draw">
            <div class="signature-canvas-container">
              <canvas id="sig-draw-canvas" class="signature-canvas" data-field-id="${r}"></canvas>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-2">
              <button type="button" data-esign-action="undo-signature-canvas" data-field-id="${r}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Undo signature stroke">
                <i class="iconoir-undo" aria-hidden="true"></i>
                <span>Undo</span>
              </button>
              <button type="button" data-esign-action="redo-signature-canvas" data-field-id="${r}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Redo signature stroke">
                <i class="iconoir-redo" aria-hidden="true"></i>
                <span>Redo</span>
              </button>
              <button type="button" data-esign-action="clear-signature-canvas" data-field-id="${r}" class="btn btn-secondary text-xs justify-center gap-1" aria-label="Clear signature canvas">
                <i class="iconoir-erase" aria-hidden="true"></i>
                <span>Clear</span>
              </button>
            </div>
            <div class="mt-2 text-right">
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${r}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
                Save current
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Draw your ${i} using mouse or touch</p>
          </div>

          <!-- Upload panel -->
          <div id="sig-editor-upload" class="sig-editor-panel ${l === "upload" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-upload">
            <label class="block text-sm font-medium text-gray-700 mb-2" for="sig-upload-input">Upload signature image (PNG or JPEG)</label>
            <input
              type="file"
              id="sig-upload-input"
              accept="image/png,image/jpeg"
              data-field-id="${r}"
              data-esign-action="upload-signature-file"
              class="block w-full text-sm text-gray-700 border border-gray-200 rounded-lg p-2"
            />
            <div id="sig-upload-preview-wrap" class="mt-3 p-3 border border-gray-100 rounded-lg bg-gray-50 hidden">
              <img id="sig-upload-preview" alt="Upload preview" class="max-h-24 mx-auto object-contain" />
            </div>
            <p class="text-xs text-gray-500 mt-2">Image will be converted to PNG and centered in the signature area.</p>
          </div>

          <!-- Saved panel -->
          <div id="sig-editor-saved" class="sig-editor-panel ${l === "saved" ? "" : "hidden"}" role="tabpanel" aria-labelledby="sig-tab-saved">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs text-gray-500">Saved ${i}s</p>
              <button type="button" data-esign-action="save-current-signature-library" data-field-id="${r}" class="text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2">
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
          value="${L(String(e.value || ""))}"
          data-field-id="${r}"
        />
        ${t}
      ` : e.type === "text" ? `
        <textarea
          id="field-text-input"
          class="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          placeholder="Enter text"
          rows="3"
          data-field-id="${r}"
        >${L(String(e.value || ""))}</textarea>
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
  function Bn(e) {
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
  function lt(e, t, r = { syncOverlay: !1 }) {
    const n = document.getElementById("sig-type-preview"), i = a.fieldState.get(e);
    if (!i) return;
    const s = U(String(t || "").trim());
    if (r?.syncOverlay && (s ? _t(e, s) : Ke(e), M()), !!n) {
      if (s) {
        n.textContent = s;
        return;
      }
      n.textContent = i.type === "initials" ? "Type your initials" : "Type your signature";
    }
  }
  function nr(e) {
    const t = String(a.signatureTabByField.get(e) || "").trim();
    return t === "draw" || t === "type" || t === "upload" || t === "saved" ? t : "draw";
  }
  function Fe(e, t) {
    const r = [
      "draw",
      "type",
      "upload",
      "saved"
    ].includes(e) ? e : "draw";
    a.signatureTabByField.set(t, r), document.querySelectorAll(".sig-editor-tab").forEach((i) => {
      i.classList.remove("border-blue-600", "text-blue-600"), i.classList.add("border-transparent", "text-gray-500"), i.setAttribute("aria-selected", "false"), i.setAttribute("tabindex", "-1");
    });
    const n = document.querySelector(`.sig-editor-tab[data-tab="${r}"]`);
    n?.classList.add("border-blue-600", "text-blue-600"), n?.classList.remove("border-transparent", "text-gray-500"), n?.setAttribute("aria-selected", "true"), n?.setAttribute("tabindex", "0"), document.getElementById("sig-editor-type")?.classList.toggle("hidden", r !== "type"), document.getElementById("sig-editor-draw")?.classList.toggle("hidden", r !== "draw"), document.getElementById("sig-editor-upload")?.classList.toggle("hidden", r !== "upload"), document.getElementById("sig-editor-saved")?.classList.toggle("hidden", r !== "saved"), (r === "draw" || r === "upload" || r === "saved") && n && requestAnimationFrame(() => Ne(t)), r === "type" && lt(t, document.getElementById("sig-type-input")?.value || ""), r === "saved" && Qr(t).catch(Be);
  }
  function Rn(e) {
    a.signatureTabByField.set(e, "draw"), Fe("draw", e);
    const t = document.getElementById("sig-type-input");
    t && lt(e, t.value || "");
  }
  function Ne(e) {
    const t = document.getElementById("sig-draw-canvas");
    if (!t || a.signatureCanvases.has(e)) return;
    const r = t.closest(".signature-canvas-container"), n = t.getContext("2d");
    if (!n) return;
    const i = t.getBoundingClientRect();
    if (!i.width || !i.height) return;
    const s = window.devicePixelRatio || 1;
    t.width = i.width * s, t.height = i.height * s, n.scale(s, s), n.lineCap = "round", n.lineJoin = "round", n.strokeStyle = "#1f2937", n.lineWidth = 2.5;
    let d = !1, l = 0, g = 0, p = [];
    const m = (h) => {
      const x = t.getBoundingClientRect();
      let F, $;
      return h.touches && h.touches.length > 0 ? (F = h.touches[0].clientX, $ = h.touches[0].clientY) : h.changedTouches && h.changedTouches.length > 0 ? (F = h.changedTouches[0].clientX, $ = h.changedTouches[0].clientY) : (F = h.clientX, $ = h.clientY), {
        x: F - x.left,
        y: $ - x.top,
        timestamp: Date.now()
      };
    }, C = (h) => {
      d = !0;
      const x = m(h);
      l = x.x, g = x.y, p = [{
        x: x.x,
        y: x.y,
        t: x.timestamp,
        width: 2.5
      }], r && r.classList.add("drawing");
    }, y = (h) => {
      if (!d) return;
      const x = m(h);
      p.push({
        x: x.x,
        y: x.y,
        t: x.timestamp,
        width: 2.5
      });
      const F = x.x - l, $ = x.y - g, N = x.timestamp - (p[p.length - 2]?.t || x.timestamp), X = Math.sqrt(F * F + $ * $) / Math.max(N, 1), ne = 2.5, W = 1.5, J = 4, S = Math.min(X / 5, 1), b = Math.max(W, Math.min(J, ne - S * 1.5));
      p[p.length - 1].width = b, n.lineWidth = b, n.beginPath(), n.moveTo(l, g), n.lineTo(x.x, x.y), n.stroke(), l = x.x, g = x.y;
    }, P = () => {
      if (d = !1, p.length > 1) {
        const h = a.signatureCanvases.get(e);
        h && (h.strokes.push(p.map((x) => ({ ...x }))), h.redoStack = []), mt(e);
      }
      p = [], r && r.classList.remove("drawing");
    };
    t.addEventListener("mousedown", C), t.addEventListener("mousemove", y), t.addEventListener("mouseup", P), t.addEventListener("mouseout", P), t.addEventListener("touchstart", (h) => {
      h.preventDefault(), h.stopPropagation(), C(h);
    }, { passive: !1 }), t.addEventListener("touchmove", (h) => {
      h.preventDefault(), h.stopPropagation(), y(h);
    }, { passive: !1 }), t.addEventListener("touchend", (h) => {
      h.preventDefault(), P();
    }, { passive: !1 }), t.addEventListener("touchcancel", P), t.addEventListener("gesturestart", (h) => h.preventDefault()), t.addEventListener("gesturechange", (h) => h.preventDefault()), t.addEventListener("gestureend", (h) => h.preventDefault()), a.signatureCanvases.set(e, {
      canvas: t,
      ctx: n,
      dpr: s,
      drawWidth: i.width,
      drawHeight: i.height,
      strokes: [],
      redoStack: [],
      baseImageDataUrl: "",
      baseImage: null
    }), Mn(e);
  }
  function Mn(e) {
    const t = a.signatureCanvases.get(e), r = a.fieldState.get(e);
    if (!t || !r) return;
    const n = vn(r);
    n && ut(e, n, { clearStrokes: !0 }).catch(() => {
    });
  }
  async function ut(e, t, r = { clearStrokes: !1 }) {
    const n = a.signatureCanvases.get(e);
    if (!n) return !1;
    const i = String(t || "").trim();
    if (!i)
      return n.baseImageDataUrl = "", n.baseImage = null, r.clearStrokes && (n.strokes = [], n.redoStack = []), we(e), !0;
    const { drawWidth: s, drawHeight: d } = n, l = new Image();
    return await new Promise((g) => {
      l.onload = () => {
        r.clearStrokes && (n.strokes = [], n.redoStack = []), n.baseImage = l, n.baseImageDataUrl = i, s > 0 && d > 0 && we(e), g(!0);
      }, l.onerror = () => g(!1), l.src = i;
    });
  }
  function we(e) {
    const t = a.signatureCanvases.get(e);
    if (!t) return;
    const { ctx: r, drawWidth: n, drawHeight: i, baseImage: s, strokes: d } = t;
    if (r.clearRect(0, 0, n, i), s) {
      const l = Math.min(n / s.width, i / s.height), g = s.width * l, p = s.height * l, m = (n - g) / 2, C = (i - p) / 2;
      r.drawImage(s, m, C, g, p);
    }
    for (const l of d) for (let g = 1; g < l.length; g++) {
      const p = l[g - 1], m = l[g];
      r.lineWidth = Number(m.width || 2.5) || 2.5, r.beginPath(), r.moveTo(p.x, p.y), r.lineTo(m.x, m.y), r.stroke();
    }
  }
  function Dn(e) {
    const t = a.signatureCanvases.get(e);
    if (!t || t.strokes.length === 0) return;
    const r = t.strokes.pop();
    r && t.redoStack.push(r), we(e), mt(e);
  }
  function Fn(e) {
    const t = a.signatureCanvases.get(e);
    if (!t || t.redoStack.length === 0) return;
    const r = t.redoStack.pop();
    r && t.strokes.push(r), we(e), mt(e);
  }
  function gt(e) {
    const t = a.signatureCanvases.get(e);
    if (!t) return !1;
    if ((t.baseImageDataUrl || "").trim() || t.strokes.length > 0) return !0;
    const { canvas: r, ctx: n } = t;
    return n.getImageData(0, 0, r.width, r.height).data.some((i, s) => s % 4 === 3 && i > 0);
  }
  function mt(e) {
    const t = a.signatureCanvases.get(e);
    t && (gt(e) ? Xe(e, t.canvas.toDataURL("image/png")) : Ke(e), M());
  }
  function Nn(e) {
    const t = a.signatureCanvases.get(e);
    t && (t.strokes = [], t.redoStack = [], t.baseImage = null, t.baseImageDataUrl = "", we(e)), Ke(e), M();
    const r = document.getElementById("sig-upload-preview-wrap"), n = document.getElementById("sig-upload-preview");
    r && r.classList.add("hidden"), n && n.removeAttribute("src");
  }
  function pt() {
    const e = document.getElementById("field-editor-overlay");
    if (qe(e.querySelector(".field-editor")), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", a.activeFieldId) {
      const t = document.querySelector(`.field-list-item[data-field-id="${a.activeFieldId}"]`);
      requestAnimationFrame(() => {
        t?.focus();
      });
    }
    wr(), M(), a.activeFieldId = null, K(), a.signatureCanvases.clear(), v("Field editor closed.");
  }
  function H(e) {
    const t = Number(e) || 0;
    return t <= 0 ? 0 : Math.max(0, Math.ceil((t - Date.now()) / 1e3));
  }
  function Un(e, t = {}) {
    const r = Number(t.retry_after_seconds);
    if (Number.isFinite(r) && r > 0) return Math.ceil(r);
    const n = String(e?.headers?.get?.("Retry-After") || "").trim();
    if (!n) return 0;
    const i = Number(n);
    return Number.isFinite(i) && i > 0 ? Math.ceil(i) : 0;
  }
  async function q(e, t) {
    let r = {};
    try {
      r = await e.json();
    } catch {
      r = {};
    }
    const n = r?.error || {}, i = n?.details && typeof n.details == "object" ? n.details : {}, s = Un(e, i), d = e?.status === 429, l = d ? s > 0 ? `Too many actions too quickly. Please wait ${s}s and try again.` : "Too many actions too quickly. Please wait and try again." : String(n?.message || t || "Request failed"), g = new Error(l);
    return g.status = e?.status || 0, g.code = String(n?.code || ""), g.details = i, g.rateLimited = d, g.retryAfterSeconds = s, g;
  }
  function ir(e) {
    const t = Math.max(1, Number(e) || 1);
    a.writeCooldownUntil = Date.now() + t * 1e3, a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
    const r = () => {
      const n = document.getElementById("field-editor-save");
      if (!n) return;
      const i = H(a.writeCooldownUntil);
      if (i <= 0) {
        a.pendingSaves.has(a.activeFieldId || "") || (n.disabled = !1, n.innerHTML = "Insert"), a.writeCooldownTimer && (clearInterval(a.writeCooldownTimer), a.writeCooldownTimer = null);
        return;
      }
      n.disabled = !0, n.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${i}s`;
    };
    r(), a.writeCooldownTimer = setInterval(r, 250);
  }
  function qn(e) {
    const t = Math.max(1, Number(e) || 1);
    a.submitCooldownUntil = Date.now() + t * 1e3, a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    const r = () => {
      const n = H(a.submitCooldownUntil);
      Y(), n <= 0 && a.submitCooldownTimer && (clearInterval(a.submitCooldownTimer), a.submitCooldownTimer = null);
    };
    r(), a.submitCooldownTimer = setInterval(r, 250);
  }
  async function zn() {
    if (!z()) {
      v("This review session cannot modify signing fields.", "assertive");
      return;
    }
    const e = a.activeFieldId;
    if (!e) return;
    const t = a.fieldState.get(e);
    if (!t) return;
    const r = H(a.writeCooldownUntil);
    if (r > 0) {
      const i = `Please wait ${r}s before saving again.`;
      window.toastManager && window.toastManager.error(i), v(i, "assertive");
      return;
    }
    const n = document.getElementById("field-editor-save");
    n.disabled = !0, n.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Saving...';
    try {
      a.profileRemember = Kt();
      let i = !1;
      if (t.type === "signature" || t.type === "initials") i = await jn(e);
      else if (t.type === "checkbox") i = await ft(e, null, document.getElementById("field-checkbox-input")?.checked || !1);
      else {
        const s = (document.getElementById("field-text-input") || document.getElementById("sig-type-input"))?.value?.trim() || "";
        if (!s && t.required) throw new Error("This field is required");
        i = await ft(e, s, null);
      }
      if (i) {
        pt(), or(), Y(), cr(), ve(), Hn(e), Wn(e);
        const s = lr();
        s.allRequiredComplete ? v("Field saved. All required fields complete. Ready to submit.") : v(`Field saved. ${s.remainingRequired} required field${s.remainingRequired > 1 ? "s" : ""} remaining.`);
      }
    } catch (i) {
      i?.rateLimited && ir(i.retryAfterSeconds), window.toastManager && window.toastManager.error(i.message), v(`Error saving field: ${i.message}`, "assertive");
    } finally {
      if (H(a.writeCooldownUntil) > 0) {
        const i = H(a.writeCooldownUntil);
        n.disabled = !0, n.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${i}s`;
      } else
        n.disabled = !1, n.innerHTML = "Insert";
    }
  }
  async function jn(e) {
    const t = a.fieldState.get(e), r = document.getElementById("sig-type-input"), n = nr(e);
    if (n === "draw" || n === "upload" || n === "saved") {
      const i = a.signatureCanvases.get(e);
      if (!i) return !1;
      if (!gt(e)) throw new Error(t?.type === "initials" ? "Please draw your initials" : "Please draw your signature");
      return await ar(e, {
        type: "drawn",
        dataUrl: i.canvas.toDataURL("image/png")
      }, t?.type === "initials" ? "[Drawn Initials]" : "[Drawn]");
    } else {
      const i = r?.value?.trim();
      if (!i) throw new Error(t?.type === "initials" ? "Please type your initials" : "Please type your signature");
      return t.type === "initials" ? await ft(e, i, null) : await ar(e, {
        type: "typed",
        text: i
      }, i);
    }
  }
  async function ft(e, t, r) {
    if (!z()) throw new Error("This review session cannot modify signing fields");
    a.pendingSaves.add(e);
    const n = Date.now(), i = a.fieldState.get(e);
    try {
      const s = await D(A("field_values") || `${c.apiBasePath}/field-values/${c.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_instance_id: e,
          value_text: t,
          value_bool: r
        })
      });
      if (!s.ok) throw await q(s, "Failed to save field");
      const d = a.fieldState.get(e);
      return d && (d.value = t ?? r, d.completed = !0, d.hasError = !1), await Jt(d), window.toastManager && window.toastManager.success("Field saved"), w.trackFieldSave(e, d?.type, !0, Date.now() - n), !0;
    } catch (s) {
      const d = a.fieldState.get(e);
      throw d && (d.hasError = !0, d.lastError = s.message), w.trackFieldSave(e, i?.type, !1, Date.now() - n, s.message), s;
    } finally {
      a.pendingSaves.delete(e);
    }
  }
  async function ar(e, t, r) {
    if (!z()) throw new Error("This review session cannot modify signing fields");
    a.pendingSaves.add(e);
    const n = Date.now(), i = t?.type || "typed";
    try {
      let s;
      if (i === "drawn") {
        const g = await Gr.uploadDrawnSignature(e, t.dataUrl);
        s = {
          field_instance_id: e,
          type: "drawn",
          value_text: r,
          object_key: g.objectKey,
          sha256: g.sha256,
          upload_token: g.uploadToken
        };
      } else s = await On(e, r);
      const d = await D(A("field_values_signature") || `${c.apiBasePath}/field-values/signature/${c.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s)
      });
      if (!d.ok) throw await q(d, "Failed to save signature");
      const l = a.fieldState.get(e);
      return l && (l.value = r, l.completed = !0, l.hasError = !1, t?.dataUrl && (l.signaturePreviewUrl = t.dataUrl)), await Jt(l, {
        signatureType: i,
        signatureDataUrl: t?.dataUrl
      }), window.toastManager && window.toastManager.success("Signature applied"), w.trackSignatureAttach(e, i, !0, Date.now() - n), !0;
    } catch (s) {
      const d = a.fieldState.get(e);
      throw d && (d.hasError = !0, d.lastError = s.message), w.trackSignatureAttach(e, i, !1, Date.now() - n, s.message), s;
    } finally {
      a.pendingSaves.delete(e);
    }
  }
  async function On(e, t) {
    const r = await Vn(`${t}|${e}`);
    return {
      field_instance_id: e,
      type: "typed",
      value_text: t,
      object_key: `tenant/bootstrap/org/bootstrap/agreements/${c.agreementId}/signatures/${c.recipientId}/${e}-${Date.now()}.txt`,
      sha256: r
    };
  }
  async function Vn(e) {
    if (window.crypto && window.crypto.subtle && window.TextEncoder) {
      const t = new TextEncoder().encode(e), r = await window.crypto.subtle.digest("SHA-256", t);
      return Array.from(new Uint8Array(r)).map((n) => n.toString(16).padStart(2, "0")).join("");
    }
    return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  }
  function or() {
    let e = 0, t = 0;
    a.fieldState.forEach((p) => {
      p.required && t++, p.completed && e++;
    });
    const r = a.fieldState.size, n = r > 0 ? e / r * 100 : 0;
    document.getElementById("completed-count").textContent = e, document.getElementById("total-count").textContent = r;
    const i = document.getElementById("progress-ring-circle"), s = 97.4, d = s - n / 100 * s;
    i.style.strokeDashoffset = d, document.getElementById("mobile-progress").style.width = `${n}%`;
    const l = r - e, g = document.getElementById("fields-status");
    g && (G() ? g.textContent = R() ? _e(a.reviewContext.status) : "Review" : R() && a.reviewContext.sign_blocked ? g.textContent = "Review blocked" : g.textContent = l > 0 ? `${l} remaining` : "All complete"), fe();
  }
  function Y() {
    fe();
    const e = document.getElementById("submit-btn"), t = document.getElementById("incomplete-warning"), r = document.getElementById("incomplete-message"), n = H(a.submitCooldownUntil);
    let i = [], s = !1;
    a.fieldState.forEach((l, g) => {
      l.required && !l.completed && i.push(l), l.hasError && (s = !0);
    });
    const d = !!a.reviewContext?.sign_blocked;
    e.disabled = !(a.canSignSession && a.hasConsented && i.length === 0 && !s && !d && a.pendingSaves.size === 0 && n === 0 && !a.isSubmitting), !a.isSubmitting && n > 0 ? e.innerHTML = `<i class="iconoir-clock mr-2"></i> Retry in ${n}s` : !a.isSubmitting && n === 0 && (e.innerHTML = '<i class="iconoir-send mr-2"></i> Submit Signature'), a.hasConsented ? n > 0 ? (t.classList.remove("hidden"), r.textContent = `Please wait ${n}s before submitting again.`) : a.canSignSession ? d ? (t.classList.remove("hidden"), r.textContent = a.reviewContext?.sign_block_reason || "Signing is blocked until review completes.") : s ? (t.classList.remove("hidden"), r.textContent = "Some fields failed to save. Please retry.") : i.length > 0 ? (t.classList.remove("hidden"), r.textContent = `Complete ${i.length} required field${i.length > 1 ? "s" : ""}`) : t.classList.add("hidden") : (t.classList.remove("hidden"), r.textContent = "This session cannot submit signatures.") : (t.classList.remove("hidden"), r.textContent = "Please accept the consent agreement");
  }
  function Hn(e) {
    const t = a.fieldState.get(e), r = document.querySelector(`.field-list-item[data-field-id="${e}"]`);
    if (!(!r || !t)) {
      if (t.completed) {
        r.classList.add("completed"), r.classList.remove("error");
        const n = r.querySelector(".w-8");
        n.classList.remove("bg-gray-100", "text-gray-500", "bg-red-100", "text-red-600"), n.classList.add("bg-green-100", "text-green-600"), n.innerHTML = '<i class="iconoir-check"></i>';
      } else if (t.hasError) {
        r.classList.remove("completed"), r.classList.add("error");
        const n = r.querySelector(".w-8");
        n.classList.remove("bg-gray-100", "text-gray-500", "bg-green-100", "text-green-600"), n.classList.add("bg-red-100", "text-red-600"), n.innerHTML = '<i class="iconoir-warning-circle"></i>';
      }
    }
  }
  function Yn() {
    const e = Array.from(a.fieldState.values()).filter((t) => t.required);
    return e.sort((t, r) => {
      const n = Number(t.page || 0), i = Number(r.page || 0);
      if (n !== i) return n - i;
      const s = Number(t.tabIndex || 0), d = Number(r.tabIndex || 0);
      if (s > 0 && d > 0 && s !== d) return s - d;
      if (s > 0 != d > 0) return s > 0 ? -1 : 1;
      const l = Number(t.posY || 0), g = Number(r.posY || 0);
      if (l !== g) return l - g;
      const p = Number(t.posX || 0), m = Number(r.posX || 0);
      return p !== m ? p - m : String(t.id || "").localeCompare(String(r.id || ""));
    }), e;
  }
  function ht(e) {
    a.guidedTargetFieldId = e, document.querySelectorAll(".field-list-item").forEach((t) => t.classList.remove("guided-next-target")), document.querySelectorAll(".field-overlay").forEach((t) => t.classList.remove("guided-next-target")), document.querySelector(`.field-list-item[data-field-id="${e}"]`)?.classList.add("guided-next-target"), document.querySelector(`.field-overlay[data-field-id="${e}"]`)?.classList.add("guided-next-target");
  }
  function Wn(e) {
    const t = Yn(), r = t.filter((d) => !d.completed);
    if (r.length === 0) {
      w.track("guided_next_none_remaining", { fromFieldId: e });
      const d = document.getElementById("submit-btn");
      d?.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      }), d?.focus(), v("All required fields are complete. Review the document and submit when ready.");
      return;
    }
    const n = t.findIndex((d) => String(d.id) === String(e));
    let i = null;
    if (n >= 0) {
      for (let d = n + 1; d < t.length; d++) if (!t[d].completed) {
        i = t[d];
        break;
      }
    }
    if (i || (i = r[0]), !i) return;
    w.track("guided_next_started", {
      fromFieldId: e,
      toFieldId: i.id
    });
    const s = Number(i.page || 1);
    s !== a.currentPage && Me(s), dt(i.id, { openEditor: !1 }), ht(i.id), setTimeout(() => {
      ht(i.id), ct(i.id), w.track("guided_next_completed", {
        toFieldId: i.id,
        page: i.page
      }), v(`Next required field highlighted on page ${i.page}.`);
    }, 120);
  }
  function sr() {
    if (!z()) return;
    const e = document.getElementById("consent-modal");
    e.classList.add("active"), e.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Ue(e.querySelector(".field-editor")), v("Electronic signature consent dialog opened. Please review and accept to continue.", "assertive");
  }
  function vt() {
    const e = document.getElementById("consent-modal");
    qe(e.querySelector(".field-editor")), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", v("Consent dialog closed.");
  }
  async function Kn() {
    if (!z()) return;
    const e = document.getElementById("consent-accept-btn");
    e.disabled = !0, e.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Processing...';
    try {
      const t = await D(A("consent") || `${c.apiBasePath}/consent/${c.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accepted: !0 })
      });
      if (!t.ok) throw await q(t, "Failed to accept consent");
      a.hasConsented = !0, document.getElementById("consent-notice").classList.add("hidden"), vt(), Y(), cr(), w.trackConsent(!0), window.toastManager && window.toastManager.success("Consent accepted"), v("Consent accepted. You can now complete the fields and submit.");
    } catch (t) {
      window.toastManager && window.toastManager.error(t.message), v(`Error: ${t.message}`, "assertive");
    } finally {
      e.disabled = !1, e.innerHTML = "Accept & Continue";
    }
  }
  async function Xn() {
    if (!a.canSignSession || a.reviewContext?.sign_blocked) {
      Y();
      return;
    }
    const e = document.getElementById("submit-btn"), t = H(a.submitCooldownUntil);
    if (t > 0) {
      window.toastManager && window.toastManager.error(`Please wait ${t}s before submitting again.`), Y();
      return;
    }
    a.isSubmitting = !0, e.disabled = !0, e.innerHTML = '<i class="iconoir-refresh animate-spin mr-2"></i> Submitting...';
    try {
      const r = `submit-${c.recipientId}-${Date.now()}`, n = await D(A("submit") || `${c.apiBasePath}/submit/${c.token}`, {
        method: "POST",
        headers: { "Idempotency-Key": r }
      });
      if (!n.ok) throw await q(n, "Failed to submit");
      w.trackSubmit(!0), window.location.href = `${c.signerBasePath}/${c.token}/complete`;
    } catch (r) {
      w.trackSubmit(!1, r.message), r?.rateLimited && qn(r.retryAfterSeconds), window.toastManager && window.toastManager.error(r.message);
    } finally {
      a.isSubmitting = !1, Y();
    }
  }
  function Jn() {
    if (!z()) return;
    const e = document.getElementById("decline-modal");
    e.classList.add("active"), e.setAttribute("aria-hidden", "false"), document.body.style.overflow = "hidden", Ue(e.querySelector(".field-editor")), v("Decline to sign dialog opened. Are you sure you want to decline?", "assertive");
  }
  function dr() {
    const e = document.getElementById("decline-modal");
    qe(e.querySelector(".field-editor")), e.classList.remove("active"), e.setAttribute("aria-hidden", "true"), document.body.style.overflow = "", v("Decline dialog closed.");
  }
  async function Gn() {
    if (!z()) return;
    const e = document.getElementById("decline-reason").value;
    try {
      const t = await D(A("decline") || `${c.apiBasePath}/decline/${c.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: e })
      });
      if (!t.ok) throw await q(t, "Failed to decline");
      window.location.href = `${c.signerBasePath}/${c.token}/declined`;
    } catch (t) {
      window.toastManager && window.toastManager.error(t.message);
    }
  }
  function Qn() {
    w.trackDegradedMode("viewer_load_failure"), w.trackViewerCriticalError("viewer_load_failed"), window.toastManager && window.toastManager.error("Unable to load the document viewer. Please refresh the page or contact the sender for assistance.", {
      duration: 15e3,
      action: {
        label: "Refresh",
        onClick: () => window.location.reload()
      }
    });
  }
  async function Zn() {
    try {
      const e = Bt((await At()).assets || {});
      if (e) if (Q()) {
        const t = await $t(e), r = document.createElement("a");
        r.href = t, r.download = `${String(c.agreementId || "agreement").trim() || "agreement"}.pdf`, document.body.appendChild(r), r.click(), r.remove(), window.setTimeout(() => URL.revokeObjectURL(t), 3e4);
      } else window.open(e, "_blank");
      else throw new Error("Document download is not available yet. The document may still be processing.");
    } catch (e) {
      window.toastManager && window.toastManager.error(e.message || "Unable to download document");
    }
  }
  const re = {
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
            <div class="debug-value" id="debug-flow-mode">${c.flowMode}</div>
          </div>
          <div class="debug-section">
            <div class="debug-label">Session</div>
            <div class="debug-value" id="debug-session-id">${w.sessionId}</div>
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
      e?.forEach((n) => {
        n.completed && t++;
      }), document.getElementById("debug-consent").textContent = a.hasConsented ? "✓ Accepted" : "✗ Pending", document.getElementById("debug-consent").className = `debug-value ${a.hasConsented ? "" : "warning"}`, document.getElementById("debug-fields").textContent = `${t}/${e?.size || 0}`, document.getElementById("debug-cached").textContent = a.renderedPages?.size || 0, document.getElementById("debug-memory").textContent = a.isLowMemory ? "⚠ Low Memory" : "Normal", document.getElementById("debug-memory").className = `debug-value ${a.isLowMemory ? "warning" : ""}`;
      const r = w.metrics.errorsEncountered;
      document.getElementById("debug-errors").textContent = r.length > 0 ? `${r.length} error(s)` : "None", document.getElementById("debug-errors").className = `debug-value ${r.length > 0 ? "error" : ""}`;
    },
    bindConsoleHelpers() {
      window.esignDebug = {
        getState: () => ({
          config: {
            ...c,
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
          telemetry: w.getSessionSummary(),
          errors: w.metrics.errorsEncountered
        }),
        getEvents: () => w.events,
        forceError: (e) => {
          w.track("debug_forced_error", { message: e }), console.error("[E-Sign Debug] Forced error:", e);
        },
        reloadViewer: () => {
          console.log("[E-Sign Debug] Reloading viewer..."), Re();
        },
        setLowMemory: (e) => {
          a.isLowMemory = e, it(), console.log(`[E-Sign Debug] Low memory mode: ${e}`);
        }
      };
    },
    logSessionInfo() {
      console.group("%c[E-Sign Debug] Session Info", "color: #3b82f6"), console.log("Flow Mode:", c.flowMode), console.log("Agreement ID:", c.agreementId), console.log("Session ID:", w.sessionId), console.log("Fields:", a.fieldState?.size || 0), console.log("Low Memory:", a.isLowMemory), console.groupEnd();
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
      console.log("[E-Sign Debug] Reloading PDF viewer..."), Re(), this.updatePanel();
    },
    clearCache() {
      a.renderedPages?.clear(), console.log("[E-Sign Debug] Page cache cleared"), this.updatePanel();
    },
    showTelemetry() {
      console.table(w.events), console.log("Session Summary:", w.getSessionSummary());
    }
  };
  function v(e, t = "polite") {
    const r = t === "assertive" ? document.getElementById("a11y-alerts") : document.getElementById("a11y-status");
    r && (r.textContent = "", requestAnimationFrame(() => {
      r.textContent = e;
    }));
  }
  function Ue(e) {
    const t = e.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'), r = t[0], n = t[t.length - 1];
    e.dataset.previousFocus || (e.dataset.previousFocus = document.activeElement?.id || "");
    function i(s) {
      s.key === "Tab" && (s.shiftKey ? document.activeElement === r && (s.preventDefault(), n?.focus()) : document.activeElement === n && (s.preventDefault(), r?.focus()));
    }
    e.addEventListener("keydown", i), e._focusTrapHandler = i, requestAnimationFrame(() => {
      r?.focus();
    });
  }
  function qe(e) {
    e._focusTrapHandler && (e.removeEventListener("keydown", e._focusTrapHandler), delete e._focusTrapHandler);
    const t = e.dataset.previousFocus;
    if (t) {
      const r = document.getElementById(t);
      requestAnimationFrame(() => {
        r?.focus();
      }), delete e.dataset.previousFocus;
    }
  }
  function cr() {
    const e = lr(), t = document.getElementById("submit-status");
    t && (e.allRequiredComplete && a.hasConsented ? t.textContent = "All required fields complete. You can now submit." : a.hasConsented ? t.textContent = `Complete ${e.remainingRequired} more required field${e.remainingRequired > 1 ? "s" : ""} to enable submission.` : t.textContent = "Please accept the electronic signature consent before submitting.");
  }
  function lr() {
    let e = 0, t = 0, r = 0;
    return a.fieldState.forEach((n) => {
      n.required && t++, n.completed && e++, n.required && !n.completed && r++;
    }), {
      completed: e,
      required: t,
      remainingRequired: r,
      total: a.fieldState.size,
      allRequiredComplete: r === 0
    };
  }
  function ei(e, t = 1) {
    const r = Array.from(a.fieldState.keys()), n = r.indexOf(e);
    if (n === -1) return null;
    const i = n + t;
    return i >= 0 && i < r.length ? r[i] : null;
  }
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && (pt(), vt(), dr(), rt()), e.target instanceof HTMLElement && e.target.classList.contains("sig-editor-tab")) {
      const t = Array.from(document.querySelectorAll(".sig-editor-tab")), r = t.indexOf(e.target);
      if (r !== -1) {
        let n = r;
        if (e.key === "ArrowRight" && (n = (r + 1) % t.length), e.key === "ArrowLeft" && (n = (r - 1 + t.length) % t.length), e.key === "Home" && (n = 0), e.key === "End" && (n = t.length - 1), n !== r) {
          e.preventDefault();
          const i = t[n], s = i.getAttribute("data-tab") || "draw", d = i.getAttribute("data-field-id");
          d && Fe(s, d), i.focus();
          return;
        }
      }
    }
    if (e.target instanceof HTMLElement && e.target.classList.contains("panel-tab")) {
      const t = Array.from(document.querySelectorAll(".panel-tab")), r = t.indexOf(e.target);
      if (r !== -1) {
        let n = r;
        if (e.key === "ArrowRight" && (n = (r + 1) % t.length), e.key === "ArrowLeft" && (n = (r - 1 + t.length) % t.length), e.key === "Home" && (n = 0), e.key === "End" && (n = t.length - 1), n !== r) {
          e.preventDefault();
          const i = t[n], s = i.getAttribute("data-tab");
          (s === "sign" || s === "review") && tt(s), i.focus();
          return;
        }
      }
    }
    if (e.target instanceof HTMLElement && e.target.classList.contains("field-list-item")) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const t = e.target.dataset.fieldId, r = ei(t, e.key === "ArrowDown" ? 1 : -1);
        r && document.querySelector(`.field-list-item[data-field-id="${r}"]`)?.focus();
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const t = e.target.dataset.fieldId;
        t && De(t);
      }
    }
    e.key === "Tab" && !e.target.closest(".field-editor-overlay") && !e.target.closest("#consent-modal") && e.target.closest("#decline-modal");
  }), document.addEventListener("mousedown", function() {
    document.body.classList.add("using-mouse");
  }), document.addEventListener("keydown", function(e) {
    e.key === "Tab" && document.body.classList.remove("using-mouse");
  });
}
var vr = class {
  constructor(o) {
    this.config = o;
  }
  init() {
    Ci(this.config);
  }
  destroy() {
  }
};
function Ai(o) {
  const u = new vr(o);
  return xt(() => u.init()), u;
}
function Ti() {
  const o = oi("esign-signer-review-config", null);
  return o && typeof o == "object" ? o : null;
}
typeof document < "u" && xt(() => {
  if (!document.querySelector('[data-esign-page="signer-review"], [data-esign-page="signer.review"]')) return;
  const o = Ti();
  if (!o) {
    console.warn("Missing signer review config script payload");
    return;
  }
  const u = new vr(o);
  u.init(), window.esignSignerReviewController = u;
});
export {
  Ci as n,
  Ai as r,
  vr as t
};

//# sourceMappingURL=signer-review-Dg7dCCwa.js.map