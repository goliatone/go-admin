import { escapeHTML as Be } from "../shared/html.js";
import { formatRelativeTimeVerbosePast as jt } from "../shared/time-formatters.js";
import { httpRequest as Gt, readHTTPError as sn, readHTTPJSON as Dt, readHTTPJSONObject as on, readHTTPStructuredErrorResult as cn } from "../shared/transport/http-client.js";
import { onReady as Pt } from "../shared/dom-ready.js";
import { parseJSONValue as Wt } from "../shared/json-parse.js";
import { s as ln } from "./dom-helpers-PJrpTqcW.js";
import { n as Vt, t as Kt } from "./runtime-CmD8_aZj.js";
var Fe = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, ut = Fe.REVIEW, dn = {
  [Fe.DOCUMENT]: "Details",
  [Fe.DETAILS]: "Participants",
  [Fe.PARTICIPANTS]: "Fields",
  [Fe.FIELDS]: "Placement",
  [Fe.PLACEMENT]: "Review"
}, He = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  AUTO_LINKED: "auto_linked"
}, yt = {
  THUMBNAIL_MAX_WIDTH: 280,
  THUMBNAIL_MAX_HEIGHT: 200,
  CACHE_TTL_MS: 1800 * 1e3
}, Ai = [
  Fe.DOCUMENT,
  Fe.DETAILS,
  Fe.PARTICIPANTS,
  Fe.FIELDS,
  Fe.REVIEW
], Ct = /* @__PURE__ */ new Map(), un = 1800 * 1e3;
function pn() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function mn(e) {
  const t = Ct.get(e);
  return t ? Date.now() - t.timestamp > un ? (Ct.delete(e), null) : t : null;
}
function fn(e, t, n) {
  Ct.set(e, {
    dataUrl: t,
    pageCount: n,
    timestamp: Date.now()
  });
}
async function gn(e, t, n = yt.THUMBNAIL_MAX_WIDTH, i = yt.THUMBNAIL_MAX_HEIGHT) {
  const o = await Kt({
    url: e,
    withCredentials: !0,
    surface: "agreement-preview-card",
    documentId: t
  }).promise, d = o.numPages, f = await o.getPage(1), v = f.getViewport({ scale: 1 }), P = n / v.width, T = i / v.height, F = Math.min(P, T, 1), M = f.getViewport({ scale: F }), B = document.createElement("canvas");
  B.width = M.width, B.height = M.height;
  const _ = B.getContext("2d");
  if (!_) throw new Error("Failed to get canvas context");
  return await f.render({
    canvasContext: _,
    viewport: M
  }).promise, {
    dataUrl: B.toDataURL("image/jpeg", 0.8),
    pageCount: d
  };
}
var hn = class {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || yt.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || yt.THUMBNAIL_MAX_HEIGHT
    }, this.state = {
      documentId: null,
      documentTitle: null,
      pageCount: null,
      thumbnailUrl: null,
      isLoading: !1,
      error: null
    }, this.elements = {
      container: null,
      thumbnail: null,
      title: null,
      pageCount: null,
      loadingState: null,
      errorState: null,
      emptyState: null,
      contentState: null,
      errorMessage: null,
      errorSuggestion: null,
      errorRetryBtn: null,
      errorDebugInfo: null
    };
  }
  init() {
    this.elements.container = document.getElementById("document-preview-card"), this.elements.thumbnail = document.getElementById("document-preview-thumbnail"), this.elements.title = document.getElementById("document-preview-title"), this.elements.pageCount = document.getElementById("document-preview-page-count"), this.elements.loadingState = document.getElementById("document-preview-loading"), this.elements.errorState = document.getElementById("document-preview-error"), this.elements.emptyState = document.getElementById("document-preview-empty"), this.elements.contentState = document.getElementById("document-preview-content"), this.elements.errorMessage = document.getElementById("document-preview-error-message"), this.elements.errorSuggestion = document.getElementById("document-preview-error-suggestion"), this.elements.errorRetryBtn = document.getElementById("document-preview-retry-btn"), this.elements.errorDebugInfo = document.getElementById("document-preview-error-debug"), this.elements.errorRetryBtn && this.elements.errorRetryBtn.addEventListener("click", () => this.retry()), this.render();
  }
  retry() {
    this.state.documentId && this.setDocument(this.state.documentId, this.state.documentTitle, this.state.pageCount);
  }
  getState() {
    return { ...this.state };
  }
  updateVisibility(e) {
    if (!this.elements.container) return;
    const t = e === Fe.DOCUMENT || e === Fe.DETAILS || e === Fe.PARTICIPANTS || e === Fe.FIELDS || e === Fe.REVIEW;
    this.elements.container.classList.toggle("hidden", !t);
  }
  async setDocument(e, t = null, n = null) {
    const i = ++this.requestVersion;
    if (!e) {
      this.state = {
        documentId: null,
        documentTitle: null,
        pageCount: null,
        thumbnailUrl: null,
        isLoading: !1,
        error: null
      }, this.render();
      return;
    }
    const o = mn(e);
    if (o) {
      this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? o.pageCount,
        thumbnailUrl: o.dataUrl,
        isLoading: !1,
        error: null
      }, this.render();
      return;
    }
    this.state = {
      documentId: e,
      documentTitle: t,
      pageCount: n,
      thumbnailUrl: null,
      isLoading: !0,
      error: null
    }, this.render();
    let d = "";
    try {
      if (d = await this.fetchDocumentPdfUrl(e), i !== this.requestVersion) return;
      const { dataUrl: f, pageCount: v } = await gn(d, e, this.config.thumbnailMaxWidth, this.config.thumbnailMaxHeight);
      if (i !== this.requestVersion) return;
      fn(e, f, v), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? v,
        thumbnailUrl: f,
        isLoading: !1,
        error: null
      };
    } catch (f) {
      if (i !== this.requestVersion) return;
      const v = Vt(f, {
        surface: "agreement-preview-card",
        documentId: e,
        url: d
      });
      this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n,
        thumbnailUrl: null,
        isLoading: !1,
        error: v.rawMessage,
        errorMessage: v.message,
        errorSuggestion: v.suggestion,
        errorRetryable: v.isRetryable
      };
    }
    this.render();
  }
  async fetchDocumentPdfUrl(e) {
    const t = (this.config.apiBasePath || `${this.config.basePath}/api`).replace(/\/+$/, "");
    return `${/\/v\d+$/i.test(t) ? t : `${t}/v1`}/panels/esign_documents/${encodeURIComponent(e)}/source/pdf`;
  }
  render() {
    const { container: e, thumbnail: t, title: n, pageCount: i, loadingState: o, errorState: d, emptyState: f, contentState: v } = this.elements;
    if (e) {
      if (o?.classList.add("hidden"), d?.classList.add("hidden"), f?.classList.add("hidden"), v?.classList.add("hidden"), !this.state.documentId) {
        f?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        o?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        d?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (pn() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
        return;
      }
      v?.classList.remove("hidden"), t && this.state.thumbnailUrl && (t.src = this.state.thumbnailUrl, t.alt = `Preview of ${this.state.documentTitle || "document"}`), n && (n.textContent = this.state.documentTitle || "Untitled Document"), i && this.state.pageCount && (i.textContent = `${this.state.pageCount} page${this.state.pageCount !== 1 ? "s" : ""}`);
    }
  }
  clear() {
    this.state = {
      documentId: null,
      documentTitle: null,
      pageCount: null,
      thumbnailUrl: null,
      isLoading: !1,
      error: null
    }, this.render();
  }
};
function Sn(e = {}) {
  const t = new hn(e);
  return t.init(), t;
}
function yn(e = {}) {
  let t = !1;
  return {
    start() {
      t || (t = !0, e.renderInitialUI?.(), e.bindEvents?.(), e.startSideEffects?.());
    },
    destroy() {
      t && (t = !1, e.destroy?.());
    }
  };
}
function vn(e) {
  const { context: t, hooks: n = {} } = e;
  return yn({
    renderInitialUI() {
      n.renderInitialUI?.();
    },
    bindEvents() {
      n.bindEvents?.();
    },
    startSideEffects() {
      t.syncController.start(), n.startSideEffects?.();
    },
    destroy() {
      n.destroy?.(), t.syncController.destroy();
    }
  });
}
function qe(e, t) {
  return e instanceof Document ? e.getElementById(t) : e.querySelector(`#${t}`);
}
function ot(e, t, n) {
  const i = qe(e, t);
  if (!i) throw new Error(`Agreement form boot failed: missing required ${n} element (#${t})`);
  return i;
}
function bn(e = document) {
  return {
    marker: qe(e, "esign-page-config"),
    form: {
      root: ot(e, "agreement-form", "form"),
      submitBtn: ot(e, "submit-btn", "submit button"),
      wizardSaveBtn: qe(e, "wizard-save-btn"),
      announcements: qe(e, "form-announcements"),
      documentIdInput: ot(e, "document_id", "document selector"),
      documentPageCountInput: qe(e, "document_page_count"),
      titleInput: ot(e, "title", "title input"),
      messageInput: ot(e, "message", "message input")
    },
    coordination: {
      banner: qe(e, "active-tab-banner"),
      message: qe(e, "active-tab-message")
    },
    sync: {
      indicator: qe(e, "sync-status-indicator"),
      icon: qe(e, "sync-status-icon"),
      text: qe(e, "sync-status-text"),
      retryBtn: qe(e, "sync-retry-btn")
    },
    conflict: {
      modal: qe(e, "conflict-dialog-modal"),
      localTime: qe(e, "conflict-local-time"),
      serverRevision: qe(e, "conflict-server-revision"),
      serverTime: qe(e, "conflict-server-time")
    }
  };
}
function wn(e, t) {
  return {
    render(n = {}) {
      const i = n?.coordinationAvailable !== !1, o = e.coordination.banner, d = e.coordination.message;
      if (!(!o || !d)) {
        if (i) {
          o.classList.add("hidden");
          return;
        }
        d.textContent = `Draft coordination updates are unavailable in this tab. Changes in another tab may not appear until you refresh. Last seen ${n?.lastSeenAt ? t.formatRelativeTime(n.lastSeenAt) : "recently"}.`, o.classList.remove("hidden");
      }
    },
    destroy() {
      e.coordination.banner?.classList.add("hidden");
    }
  };
}
var In = class {
  constructor(e) {
    this.state = null, this.listeners = [], this.options = e;
  }
  start() {
    this.state = this.loadFromSession() || this.createInitialState();
  }
  destroy() {
    this.listeners = [];
  }
  now() {
    return this.options.now ? this.options.now() : (/* @__PURE__ */ new Date()).toISOString();
  }
  storage() {
    return this.options.sessionStorage !== void 0 ? this.options.sessionStorage : typeof window > "u" ? null : window.sessionStorage ?? null;
  }
  createInitialState() {
    return {
      wizardId: this.generateWizardId(),
      version: this.options.stateVersion,
      createdAt: this.now(),
      updatedAt: this.now(),
      currentStep: 1,
      document: {
        id: null,
        title: null,
        pageCount: null
      },
      details: {
        title: "",
        message: ""
      },
      participants: [],
      fieldDefinitions: [],
      fieldPlacements: [],
      fieldRules: [],
      review: {
        enabled: !1,
        gate: "approve_before_send",
        commentsEnabled: !1,
        participants: []
      },
      titleSource: this.options.titleSource.AUTOFILL,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !1
    };
  }
  generateWizardId() {
    return `wizard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  loadFromSession() {
    const e = this.storage();
    if (!e) return null;
    const t = e.getItem(this.options.storageKey);
    if (!t) return null;
    const n = Wt(t, null);
    return n ? n.version !== this.options.stateVersion ? this.migrateState(n) : this.normalizeLoadedState(n) : null;
  }
  normalizeLoadedState(e) {
    if (!e || typeof e != "object") return this.createInitialState();
    const t = this.createInitialState(), n = {
      ...t,
      ...e
    }, i = Number.parseInt(String(e.currentStep ?? t.currentStep), 10);
    n.currentStep = Number.isFinite(i) ? Math.min(Math.max(i, 1), this.options.totalWizardSteps) : t.currentStep;
    const o = e.document && typeof e.document == "object" ? e.document : {}, d = o.id;
    n.document = {
      id: d == null ? null : String(d).trim() || null,
      title: String(o.title ?? "").trim() || null,
      pageCount: this.options.parsePositiveInt(o.pageCount, 0) || null
    };
    const f = e.details && typeof e.details == "object" ? e.details : {}, v = String(f.title ?? "").trim(), P = v === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER;
    n.details = {
      title: v,
      message: String(f.message ?? "")
    }, n.participants = Array.isArray(e.participants) ? e.participants : [], n.fieldDefinitions = Array.isArray(e.fieldDefinitions) ? e.fieldDefinitions : [], n.fieldPlacements = Array.isArray(e.fieldPlacements) ? e.fieldPlacements : [], n.fieldRules = Array.isArray(e.fieldRules) ? e.fieldRules : [];
    const T = e.review && typeof e.review == "object" ? e.review : {};
    return n.review = {
      enabled: !!T.enabled,
      gate: String(T.gate ?? t.review.gate).trim() || t.review.gate,
      commentsEnabled: !!T.commentsEnabled,
      participants: Array.isArray(T.participants) ? T.participants : []
    }, n.wizardId = String(e.wizardId ?? "").trim() || t.wizardId, n.version = this.options.stateVersion, n.createdAt = String(e.createdAt ?? t.createdAt), n.updatedAt = String(e.updatedAt ?? t.updatedAt), n.titleSource = this.options.normalizeTitleSource(e.titleSource, P), n.resourceRef = this.normalizeResourceRef(e.resourceRef ?? e.resource_ref), n.serverDraftId = String(e.serverDraftId ?? "").trim() || null, n.serverRevision = this.options.parsePositiveInt(e.serverRevision, 0), n.lastSyncedAt = String(e.lastSyncedAt ?? "").trim() || null, n.syncPending = !!e.syncPending, n;
  }
  normalizeResourceRef(e) {
    if (!e || typeof e != "object") return null;
    const t = e, n = String(t.kind ?? "").trim(), i = String(t.id ?? "").trim();
    if (n === "" || i === "") return null;
    const o = t.scope, d = o && typeof o == "object" && !Array.isArray(o) ? Object.entries(o).reduce((f, [v, P]) => {
      const T = String(v || "").trim();
      return T !== "" && (f[T] = String(P ?? "").trim()), f;
    }, {}) : void 0;
    return {
      kind: n,
      id: i,
      scope: d && Object.keys(d).length > 0 ? d : void 0
    };
  }
  migrateState(e) {
    return null;
  }
  saveToSession() {
    const e = this.storage();
    if (!(!e || !this.state))
      try {
        this.state.updatedAt = this.now(), e.setItem(this.options.storageKey, JSON.stringify(this.state));
      } catch {
      }
  }
  getState() {
    return this.state || (this.state = this.createInitialState()), this.state;
  }
  setState(e, t = {}) {
    this.state = this.normalizeLoadedState(e), t.syncPending === !0 ? this.state.syncPending = !0 : t.syncPending === !1 && (this.state.syncPending = !1), t.save !== !1 && this.saveToSession(), t.notify !== !1 && this.notifyListeners();
  }
  updateState(e) {
    this.setState({
      ...this.getState(),
      ...e,
      syncPending: !0,
      updatedAt: this.now()
    }, { syncPending: !0 });
  }
  updateStep(e) {
    this.updateState({ currentStep: e });
  }
  updateDocument(e) {
    this.updateState({ document: {
      ...this.getState().document,
      ...e
    } });
  }
  updateDetails(e, t = {}) {
    const n = { details: {
      ...this.getState().details,
      ...e
    } };
    Object.prototype.hasOwnProperty.call(t, "titleSource") ? n.titleSource = this.options.normalizeTitleSource(t.titleSource, this.getState().titleSource) : Object.prototype.hasOwnProperty.call(e || {}, "title") && (n.titleSource = this.options.titleSource.USER), this.updateState(n);
  }
  setTitleSource(e, t = {}) {
    const n = this.options.normalizeTitleSource(e, this.getState().titleSource);
    if (n !== this.getState().titleSource) {
      if (t.syncPending === !1) {
        this.setState({
          ...this.getState(),
          titleSource: n
        }, { syncPending: !1 });
        return;
      }
      this.updateState({ titleSource: n });
    }
  }
  updateParticipants(e) {
    this.updateState({ participants: e });
  }
  updateFieldDefinitions(e) {
    this.updateState({ fieldDefinitions: e });
  }
  updateFieldPlacements(e) {
    this.updateState({ fieldPlacements: e });
  }
  markSynced(e, t) {
    this.setState({
      ...this.getState(),
      serverDraftId: e,
      serverRevision: t,
      lastSyncedAt: this.now(),
      syncPending: !1
    }, { syncPending: !1 });
  }
  bindResourceRef(e, t = {}) {
    const n = this.normalizeResourceRef(e);
    this.setState({
      ...this.getState(),
      resourceRef: n,
      serverDraftId: n?.id || null
    }, {
      save: t.save,
      notify: t.notify,
      syncPending: !1
    });
  }
  applyServerSnapshot(e, t = {}) {
    const n = this.getState();
    if (t.preserveDirty === !0 && n.syncPending === !0)
      return this.setState({
        ...n,
        resourceRef: e.ref,
        serverDraftId: e.ref.id,
        serverRevision: e.revision,
        lastSyncedAt: e.updatedAt,
        syncPending: !0
      }, {
        save: t.save,
        notify: t.notify,
        syncPending: !0
      }), this.getState();
    const i = e?.data && typeof e.data == "object" ? e.data : {}, o = this.normalizeLoadedState({
      ...i?.wizard_state && typeof i.wizard_state == "object" ? i.wizard_state : {},
      resourceRef: e.ref,
      serverDraftId: e.ref.id,
      serverRevision: e.revision,
      lastSyncedAt: e.updatedAt,
      syncPending: !1
    });
    return this.setState(o, {
      save: t.save,
      notify: t.notify,
      syncPending: !1
    }), this.getState();
  }
  applyRemoteSync(e, t, n = {}) {
    const i = this.getState(), o = i.syncPending === !0, d = String(e ?? "").trim() || null, f = this.options.parsePositiveInt(t, 0);
    return this.setState({
      ...i,
      serverDraftId: d || i.serverDraftId,
      serverRevision: f > 0 ? f : i.serverRevision,
      lastSyncedAt: String(n.lastSyncedAt || this.now()).trim() || i.lastSyncedAt,
      syncPending: o
    }, {
      syncPending: o,
      save: n.save,
      notify: n.notify
    }), {
      preservedLocalChanges: o,
      state: this.getState()
    };
  }
  applyRemoteState(e, t = {}) {
    const n = this.normalizeLoadedState(e), i = this.getState();
    return i.syncPending === !0 ? (this.setState({
      ...i,
      serverDraftId: n.serverDraftId || i.serverDraftId,
      serverRevision: Math.max(this.options.parsePositiveInt(i.serverRevision, 0), this.options.parsePositiveInt(n.serverRevision, 0)),
      lastSyncedAt: n.lastSyncedAt || i.lastSyncedAt,
      syncPending: !0
    }, {
      syncPending: !0,
      save: t.save,
      notify: t.notify
    }), {
      preservedLocalChanges: !0,
      replacedLocalState: !1,
      state: this.getState()
    }) : (this.setState(n, {
      syncPending: !!n.syncPending,
      save: t.save,
      notify: t.notify
    }), {
      preservedLocalChanges: !1,
      replacedLocalState: !0,
      state: this.getState()
    });
  }
  clear() {
    const e = this.storage();
    this.state = this.createInitialState(), e?.removeItem(this.options.storageKey), this.notifyListeners();
  }
  hasResumableState() {
    return this.options.hasMeaningfulWizardProgress(this.getState());
  }
  onStateChange(e) {
    return this.listeners.push(e), () => {
      this.listeners = this.listeners.filter((t) => t !== e);
    };
  }
  notifyListeners() {
    const e = this.getState();
    this.listeners.forEach((t) => t(e));
  }
  collectFormState() {
    const e = this.getState(), t = this.options.collectFormState(), n = t.details && typeof t.details == "object" ? t.details : {}, i = this.options.normalizeTitleSource(t.titleSource, String(n.title || "").trim() === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER);
    return {
      ...t,
      resourceRef: e.resourceRef || null,
      titleSource: i,
      serverDraftId: e.serverDraftId,
      serverRevision: e.serverRevision,
      lastSyncedAt: e.lastSyncedAt,
      currentStep: e.currentStep,
      wizardId: e.wizardId,
      version: e.version,
      createdAt: e.createdAt,
      updatedAt: this.now(),
      syncPending: !0
    };
  }
}, _t = /* @__PURE__ */ new Map();
async function _n(e) {
  const t = String(e || "").trim().replace(/\/+$/, "");
  if (t === "") throw new Error("sync.client_base_path is required to load sync-core");
  return typeof window < "u" && window.__esignSyncCoreModule ? At(window.__esignSyncCoreModule) : (_t.has(t) || _t.set(t, En(t)), _t.get(t));
}
async function En(e) {
  return typeof window < "u" && typeof window.__esignSyncCoreLoader == "function" ? At(await window.__esignSyncCoreLoader(e)) : At(await import(`${e}/index.js`));
}
function At(e) {
  if (!e || typeof e.createInMemoryCache != "function" || typeof e.createFetchSyncTransport != "function" || typeof e.createSyncEngine != "function" || typeof e.parseReadEnvelope != "function") throw new TypeError("Invalid sync-core runtime module");
  return e;
}
var xn = class {
  constructor(e) {
    this.pendingSync = null, this.retryCount = 0, this.retryTimeout = null, this.syncModulePromise = null, this.syncModule = null, this.transport = null, this.cache = null, this.resource = null, this.resourceRef = null, this.stateManager = e.stateManager, this.requestHeaders = e.requestHeaders, this.fetchImpl = e.fetchImpl || fetch.bind(globalThis), this.syncConfig = e.syncConfig;
  }
  async start() {
    const e = this.stateManager.getState(), t = this.resolveStoredResourceRef(e);
    t && await this.bindResource(t);
  }
  destroy() {
    this.resource = null, this.resourceRef = null;
  }
  async create(e) {
    const t = this.stateManager.normalizeLoadedState(e);
    await this.ensureBoundResource({
      forceBootstrap: !0,
      preserveLocalState: !0
    }), this.stateManager.setState({
      ...t,
      resourceRef: this.resourceRef,
      serverDraftId: this.resourceRef?.id || null,
      serverRevision: Number(this.resource?.getSnapshot()?.revision || 0),
      lastSyncedAt: this.resource?.getSnapshot()?.updatedAt || null,
      syncPending: !0
    }, {
      notify: !1,
      save: !0,
      syncPending: !0
    });
    const n = await this.sync();
    if (!n.success || !n.result) throw this.toRuntimeError(n.error || "draft_create_failed");
    return n.result;
  }
  async load(e) {
    const t = this.resolveStoredResourceRef(this.stateManager.getState(), e) || this.createFallbackResourceRef(e);
    await this.bindResource(t);
    try {
      const n = await this.resource.refresh({ force: !0 });
      return this.snapshotToRecord(n);
    } catch (n) {
      if (String(n?.code || "").trim().toUpperCase() === "NOT_FOUND") {
        const i = /* @__PURE__ */ new Error("HTTP 404");
        throw i.status = 404, i.code = "NOT_FOUND", i;
      }
      throw n;
    }
  }
  async dispose(e) {
    const t = this.resourceRef?.id === e ? this.resourceRef : this.resolveStoredResourceRef(this.stateManager.getState(), e) || this.createFallbackResourceRef(e);
    await this.bindResource(t);
    let n = Number(this.resource?.getSnapshot()?.revision || 0);
    if (n <= 0) try {
      const i = await this.resource.load();
      n = Number(i.revision || 0);
    } catch (i) {
      if (Number(i?.status || 0) !== 404 && String(i?.code || "").trim().toUpperCase() !== "NOT_FOUND") throw i;
      n = 0;
    }
    n > 0 && await this.resource.mutate({
      operation: "dispose",
      payload: {},
      expectedRevision: n,
      idempotencyKey: `dispose:${e}:${n}`
    }), this.resourceRef?.id === e && (this.resource = null, this.resourceRef = null);
  }
  async refresh(e = {}) {
    const t = await this.ensureBoundResource(), n = t.getSnapshot() ? await t.refresh({ force: e.force !== !1 }) : await t.load();
    return this.stateManager.applyServerSnapshot(n, {
      notify: !0,
      save: !0,
      preserveDirty: e.preserveDirty === !0
    }), this.snapshotToRecord(n);
  }
  async send(e, t, n = {}) {
    const i = await (await this.ensureBoundResource()).mutate({
      operation: "send",
      payload: {},
      expectedRevision: e,
      idempotencyKey: t,
      metadata: n
    });
    return {
      replay: i.replay,
      applied: i.applied,
      snapshot: i.snapshot,
      data: this.snapshotData(i.snapshot)
    };
  }
  async startReview(e, t, n = {}) {
    const i = await (await this.ensureBoundResource()).mutate({
      operation: "start_review",
      payload: {},
      expectedRevision: e,
      idempotencyKey: t,
      metadata: n
    });
    return {
      replay: i.replay,
      applied: i.applied,
      snapshot: i.snapshot,
      data: this.snapshotData(i.snapshot)
    };
  }
  async sync() {
    const e = this.stateManager.getState();
    if (!e.syncPending) {
      const t = this.resource?.getSnapshot();
      return {
        success: !0,
        result: t ? this.snapshotToRecord(t) : void 0
      };
    }
    try {
      const t = await (await this.ensureBoundResource({ preserveLocalState: !e.serverDraftId })).mutate({
        operation: "autosave",
        payload: {
          wizard_state: e,
          title: e.details?.title || "Untitled Agreement",
          current_step: e.currentStep,
          document_id: e.document?.id || null
        },
        expectedRevision: Number(e.serverRevision || 0) || void 0
      });
      return this.applyMutationSnapshot(t), {
        success: !0,
        result: this.snapshotToRecord(t.snapshot)
      };
    } catch (t) {
      const n = t?.conflict;
      return n || String(t?.code || "").trim().toUpperCase() === "STALE_REVISION" ? {
        success: !1,
        conflict: !0,
        currentRevision: Number(n?.currentRevision || t?.currentRevision || 0),
        latestSnapshot: n?.latestSnapshot || t?.resource || null
      } : {
        success: !1,
        error: String(t?.message || "sync_failed").trim() || "sync_failed"
      };
    }
  }
  async bootstrap() {
    const e = await this.ensureRuntime(), t = await this.fetchImpl(this.syncConfig.bootstrap_path, {
      method: "POST",
      credentials: "same-origin",
      headers: this.requestHeaders(!1)
    });
    if (!t.ok) throw new Error(await sn(t, `HTTP ${t.status}`, { appendStatusToFallback: !1 }));
    const n = await on(t), i = this.normalizeResourceRef(n?.resource_ref);
    if (!i) throw new Error("Invalid agreement draft bootstrap response");
    return {
      resourceRef: i,
      snapshot: e.parseReadEnvelope(i, n?.draft || {}),
      wizardID: String(n?.wizard_id || "").trim()
    };
  }
  async ensureRuntime() {
    return this.syncModule ? this.syncModule : (this.syncModulePromise || (this.syncModulePromise = _n(this.syncConfig.client_base_path)), this.syncModule = await this.syncModulePromise, this.cache || (this.cache = this.syncModule.createInMemoryCache()), this.transport || (this.transport = this.syncModule.createFetchSyncTransport({
      baseURL: this.syncConfig.base_url,
      credentials: "same-origin",
      fetch: this.fetchImpl,
      headers: () => this.requestHeaders(!1),
      actionOperations: this.syncConfig.action_operations
    })), this.syncModule);
  }
  async ensureBoundResource(e = {}) {
    if (!e.forceBootstrap && this.resource && this.resourceRef) return this.resource;
    const t = this.stateManager.getState(), n = e.forceBootstrap ? null : this.resolveStoredResourceRef(t);
    if (n)
      return await this.bindResource(n), this.resource;
    if (!e.forceBootstrap && t.serverDraftId)
      return await this.bindResource(this.createFallbackResourceRef(t.serverDraftId)), this.resource;
    const i = await this.bootstrap();
    return await this.bindResource(i.resourceRef, i.snapshot), e.preserveLocalState ? this.stateManager.setState({
      ...this.stateManager.getState(),
      resourceRef: i.resourceRef,
      serverDraftId: i.resourceRef.id,
      serverRevision: i.snapshot.revision,
      lastSyncedAt: i.snapshot.updatedAt,
      syncPending: !0
    }, {
      notify: !1,
      save: !0,
      syncPending: !0
    }) : this.stateManager.applyServerSnapshot(i.snapshot, {
      notify: !1,
      save: !0
    }), this.resource;
  }
  async bindResource(e, t) {
    const n = await this.ensureRuntime(), i = this.normalizeResourceRef(e);
    if (!i) throw new Error("A valid draft resourceRef is required");
    t && this.cache && this.cache.set(i, t);
    const o = n.createSyncEngine({
      transport: this.transport,
      cache: this.cache
    });
    this.resourceRef = i, this.resource = o.resource(i), this.stateManager.bindResourceRef(i, {
      notify: !1,
      save: !0
    });
  }
  applyMutationSnapshot(e) {
    this.stateManager.applyServerSnapshot(e.snapshot, {
      notify: !1,
      save: !0
    });
  }
  snapshotToRecord(e) {
    const t = this.snapshotData(e);
    return {
      id: String(t.id || e.ref.id || "").trim(),
      revision: Number(e.revision || 0),
      updated_at: String(t.updated_at || e.updatedAt || "").trim(),
      wizard_state: this.snapshotWizardState(e),
      resource_ref: e.ref
    };
  }
  snapshotWizardState(e) {
    const t = this.snapshotData(e)?.wizard_state;
    return t && typeof t == "object" ? t : {};
  }
  snapshotData(e) {
    return !e?.data || typeof e.data != "object" ? {} : e.data;
  }
  resolveStoredResourceRef(e, t = "") {
    const n = this.normalizeResourceRef(e?.resourceRef || e?.resource_ref);
    return !n || t && n.id !== t ? null : n;
  }
  createFallbackResourceRef(e) {
    const t = String(e || "").trim();
    return {
      kind: this.syncConfig.resource_kind || "agreement_draft",
      id: t
    };
  }
  normalizeResourceRef(e) {
    if (!e || typeof e != "object") return null;
    const t = e, n = String(t.kind || "").trim(), i = String(t.id || "").trim();
    if (n === "" || i === "") return null;
    const o = t.scope, d = o && typeof o == "object" && !Array.isArray(o) ? Object.entries(o).reduce((f, [v, P]) => {
      const T = String(v || "").trim();
      return T !== "" && (f[T] = String(P ?? "").trim()), f;
    }, {}) : void 0;
    return {
      kind: n,
      id: i,
      scope: d && Object.keys(d).length > 0 ? d : void 0
    };
  }
  toRuntimeError(e) {
    return new Error(String(e || "sync_failed").trim() || "sync_failed");
  }
}, Ln = class {
  constructor(e) {
    this.channel = null, this.cleanupFns = [], this.activeDraftId = "", this.coordinationAvailable = !1, this.options = e;
  }
  start() {
    this.initBroadcastChannel(), this.initEventListeners(), this.options.onCoordinationAvailabilityChange?.(this.coordinationAvailable);
  }
  stop() {
    this.cleanupFns.forEach((e) => e()), this.cleanupFns = [], this.channel?.close && this.channel.close(), this.channel = null, this.coordinationAvailable = !1, this.activeDraftId = "";
  }
  setActiveDraft(e) {
    this.activeDraftId = String(e || "").trim();
  }
  broadcastStateUpdate(e) {
  }
  broadcastSyncCompleted(e, t) {
    const n = String(e || "").trim();
    n !== "" && this.broadcastMessage({
      type: "sync_completed",
      tabId: this.getTabId(),
      draftId: n,
      revision: t
    });
  }
  broadcastDraftDisposed(e, t = "") {
    const n = String(e || "").trim();
    n !== "" && this.broadcastMessage({
      type: "draft_disposed",
      tabId: this.getTabId(),
      draftId: n,
      reason: String(t || "").trim()
    });
  }
  win() {
    return this.options.windowRef || (typeof window > "u" ? null : window);
  }
  doc() {
    return this.options.documentRef || (typeof document > "u" ? null : document);
  }
  initBroadcastChannel() {
    const e = this.options.broadcastChannelFactory || ((t) => new BroadcastChannel(t));
    if (typeof BroadcastChannel > "u" && !this.options.broadcastChannelFactory) {
      this.coordinationAvailable = !1;
      return;
    }
    try {
      this.channel = e(this.options.channelName), this.channel.onmessage = (t) => this.handleChannelMessage(t.data), this.coordinationAvailable = !0;
    } catch {
      this.channel = null, this.coordinationAvailable = !1;
    }
  }
  initEventListeners() {
    const e = this.doc(), t = this.win();
    if (!e || !t) return;
    const n = () => {
      e.visibilityState === "hidden" && this.options.onVisibilityHidden();
    };
    e.addEventListener("visibilitychange", n), this.cleanupFns.push(() => e.removeEventListener("visibilitychange", n));
    const i = () => {
      this.options.onPageHide();
    };
    t.addEventListener("pagehide", i), this.cleanupFns.push(() => t.removeEventListener("pagehide", i));
    const o = () => {
      this.options.onBeforeUnload();
    };
    t.addEventListener("beforeunload", o), this.cleanupFns.push(() => t.removeEventListener("beforeunload", o));
  }
  getTabId() {
    const e = this.win();
    return e ? (e._wizardTabId || (e._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`), e._wizardTabId) : "tab_missing_window";
  }
  broadcastMessage(e) {
    this.channel?.postMessage(e);
  }
  handleChannelMessage(e) {
    if (!e || e.tabId === this.getTabId()) return;
    const t = String(e.draftId || "").trim();
    if (!(t === "" || t !== this.activeDraftId))
      switch (e.type) {
        case "sync_completed":
          this.options.onRemoteSync(t, Number(e.revision || 0));
          break;
        case "draft_disposed":
          this.options.onRemoteDraftDisposed?.(t, String(e.reason || "").trim());
          break;
      }
  }
}, Yt = "[esign-send]";
function et(e) {
  const t = String(e ?? "").trim();
  return t === "" ? null : t;
}
function Tt(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function Rn() {
  return `send_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function Ae(e = {}) {
  const { state: t, storageKey: n, ownership: i, sendAttemptId: o, extra: d = {} } = e;
  return {
    wizardId: et(t?.wizardId),
    serverDraftId: et(t?.serverDraftId),
    serverRevision: Tt(t?.serverRevision),
    currentStep: Tt(t?.currentStep),
    syncPending: t?.syncPending === !0,
    storageKey: et(n),
    activeTabOwner: typeof i?.isOwner == "boolean" ? i.isOwner : null,
    activeTabClaimTabId: et(i?.claim?.tabId),
    activeTabClaimedAt: et(i?.claim?.claimedAt),
    activeTabLastSeenAt: et(i?.claim?.lastSeenAt),
    activeTabBlockedReason: et(i?.blockedReason),
    sendAttemptId: et(o),
    ...d
  };
}
function Ge(e, t = {}) {
  console.info(Yt, e, t);
}
function Xe(e, t = {}) {
  console.warn(Yt, e, t);
}
var Cn = class {
  constructor(e) {
    this.debounceTimer = null, this.retryTimer = null, this.retryCount = 0, this.isSyncing = !1, this.cleanupFns = [], this.options = e, this.stateManager = e.stateManager, this.syncService = e.syncService, this.activeTabController = e.activeTabController;
  }
  start() {
    this.activeTabController.start(), this.syncService.start().catch(() => {
    }), this.bindRefreshEvents(), this.activeTabController.setActiveDraft(this.stateManager.getState()?.serverDraftId || null);
  }
  destroy() {
    this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null), this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.cleanupFns.forEach((e) => e()), this.cleanupFns = [], this.syncService.destroy(), this.activeTabController.stop();
  }
  broadcastStateUpdate() {
    this.activeTabController.setActiveDraft(this.stateManager.getState()?.serverDraftId || null);
  }
  broadcastSyncCompleted(e, t) {
    this.activeTabController.setActiveDraft(e), this.activeTabController.broadcastSyncCompleted(e, t);
  }
  broadcastDraftDisposed(e, t = "") {
    this.activeTabController.broadcastDraftDisposed(e, t);
  }
  async refreshCurrentDraft(e = {}) {
    try {
      const t = await this.syncService.refresh(e);
      return t ? (this.activeTabController.setActiveDraft(t.id), this.options.statusUpdater(this.stateManager.getState().syncPending ? "pending" : "saved"), {
        success: !0,
        draftId: t.id,
        revision: t.revision
      }) : {
        skipped: !0,
        reason: "no_active_draft"
      };
    } catch (t) {
      return String(t?.code || "").trim().toUpperCase() === "NOT_FOUND" ? {
        stale: !0,
        reason: "not_found"
      } : {
        error: !0,
        reason: String(t?.message || "refresh_failed").trim() || "refresh_failed"
      };
    }
  }
  scheduleSync() {
    this.debounceTimer && clearTimeout(this.debounceTimer), this.options.statusUpdater("pending"), this.debounceTimer = setTimeout(() => {
      this.performSync();
    }, this.options.syncDebounceMs);
  }
  async forceSync() {
    return this.debounceTimer && (clearTimeout(this.debounceTimer), this.debounceTimer = null), this.performSync();
  }
  async performSync() {
    if (this.isSyncing) return {
      blocked: !0,
      reason: "sync_in_progress"
    };
    const e = this.stateManager.getState();
    if (!e.syncPending)
      return this.options.statusUpdater("saved"), {
        skipped: !0,
        reason: "not_pending"
      };
    this.isSyncing = !0, this.options.statusUpdater("saving"), Ge("sync_perform_start", Ae({
      state: e,
      storageKey: this.options.storageKey,
      sendAttemptId: null,
      extra: {
        mode: e.serverDraftId ? "update" : "bootstrap_autosave",
        targetDraftId: String(e.serverDraftId || "").trim() || null,
        expectedRevision: Number(e.serverRevision || 0)
      }
    }));
    const t = await this.syncService.sync();
    return this.isSyncing = !1, t.success ? (t.result?.id && t.result?.revision && (this.activeTabController.setActiveDraft(t.result.id), this.broadcastSyncCompleted(t.result.id, t.result.revision)), this.options.statusUpdater("saved"), this.retryCount = 0, {
      success: !0,
      draftId: t.result?.id || null,
      revision: t.result?.revision || 0
    }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), Xe("sync_perform_conflict", Ae({
      state: e,
      storageKey: this.options.storageKey,
      sendAttemptId: null,
      extra: {
        targetDraftId: String(e.serverDraftId || "").trim() || null,
        currentRevision: Number(t.currentRevision || 0)
      }
    })), {
      conflict: !0,
      currentRevision: t.currentRevision
    }) : (this.options.statusUpdater("error"), this.scheduleRetry(), {
      error: !0,
      reason: t.error || "sync_failed"
    });
  }
  manualRetry() {
    return this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
  }
  scheduleRetry() {
    if (this.retryCount >= this.options.syncRetryDelays.length) return;
    const e = this.options.syncRetryDelays[this.retryCount];
    this.retryCount += 1, this.retryTimer = setTimeout(() => {
      this.performSync();
    }, e);
  }
  bindRefreshEvents() {
    const e = this.options.documentRef || (typeof document > "u" ? null : document), t = this.options.windowRef || (typeof window > "u" ? null : window);
    if (!e || !t) return;
    const n = () => {
      e.visibilityState !== "hidden" && this.stateManager.getState().serverDraftId && this.refreshCurrentDraft({
        preserveDirty: !0,
        force: !0
      });
    };
    t.addEventListener("focus", n), this.cleanupFns.push(() => t.removeEventListener("focus", n));
    const i = () => {
      e.visibilityState === "visible" && this.stateManager.getState().serverDraftId && this.refreshCurrentDraft({
        preserveDirty: !0,
        force: !0
      });
    };
    e.addEventListener("visibilitychange", i), this.cleanupFns.push(() => e.removeEventListener("visibilitychange", i));
  }
};
function An() {
  return function(t, n = {}) {
    const i = String(t || "").trim();
    if (!i || typeof window > "u") return;
    const o = window.__esignWizardTelemetryCounters = window.__esignWizardTelemetryCounters || {};
    o[i] = Number(o[i] || 0) + 1, window.dispatchEvent(new CustomEvent("esign:wizard-telemetry", { detail: {
      event: i,
      count: o[i],
      fields: n,
      at: (/* @__PURE__ */ new Date()).toISOString()
    } }));
  };
}
function Ve(e) {
  const t = document.getElementById(e);
  return t instanceof HTMLElement ? t : null;
}
function pt(e, t, n = "") {
  const i = e.querySelector(t);
  return (i instanceof HTMLInputElement || i instanceof HTMLTextAreaElement || i instanceof HTMLSelectElement) && i.value || n;
}
function Dn(e, t, n = !1) {
  const i = e.querySelector(t);
  return i instanceof HTMLInputElement ? i.checked : n;
}
function Et(e, t) {
  e instanceof HTMLButtonElement && (e.disabled = t);
}
function Pn(e) {
  const { documentIdInput: t, selectedDocumentTitle: n, participantsContainer: i, fieldDefinitionsContainer: o, submitBtn: d, escapeHtml: f, getSignerParticipants: v, getCurrentDocumentPageCount: P, collectFieldRulesForState: T, expandRulesForPreview: F, findSignersMissingRequiredSignatureField: M, goToStep: B } = e;
  function _() {
    const a = Ve("send-readiness-loading"), p = Ve("send-readiness-results"), l = Ve("send-validation-status"), y = Ve("send-validation-issues"), $ = Ve("send-issues-list"), K = Ve("send-confirmation"), x = Ve("review-agreement-title"), I = Ve("review-document-title"), g = Ve("review-participant-count"), U = Ve("review-stage-count"), G = Ve("review-participants-list"), z = Ve("review-fields-summary"), N = document.getElementById("title");
    if (!a || !p || !l || !y || !$ || !K || !x || !I || !g || !U || !G || !z || !(N instanceof HTMLInputElement)) return;
    const J = N.value || "Untitled", V = n?.textContent || "No document", he = i.querySelectorAll(".participant-entry"), ye = o.querySelectorAll(".field-definition-entry"), X = F(T(), P()), le = v(), ie = /* @__PURE__ */ new Set();
    he.forEach((W) => {
      const ve = W.querySelector(".signing-stage-input"), q = W.querySelector('select[name*=".role"]');
      q instanceof HTMLSelectElement && q.value === "signer" && ve instanceof HTMLInputElement && ve.value && ie.add(Number.parseInt(ve.value, 10));
    }), x.textContent = J, I.textContent = V, g.textContent = `${he.length} (${le.length} signers)`, U.textContent = String(ie.size > 0 ? ie.size : 1), G.innerHTML = "", he.forEach((W) => {
      const ve = pt(W, 'input[name*=".name"]'), q = pt(W, 'input[name*=".email"]'), Te = pt(W, 'select[name*=".role"]', "signer"), _e = pt(W, ".signing-stage-input"), oe = Dn(W, ".notify-input", !0), pe = document.createElement("div");
      pe.className = "flex items-center justify-between text-sm", pe.innerHTML = `
        <div>
          <span class="font-medium">${f(ve || q)}</span>
          <span class="text-gray-500 ml-2">${f(q)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${Te === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${Te === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${oe ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${oe ? "Notify" : "No Notify"}
          </span>
          ${Te === "signer" && _e ? `<span class="text-xs text-gray-500">Stage ${_e}</span>` : ""}
        </div>
      `, G.appendChild(pe);
    });
    const Se = ye.length + X.length;
    z.textContent = `${Se} field${Se !== 1 ? "s" : ""} defined (${ye.length} manual, ${X.length} generated)`;
    const me = [];
    t?.value || me.push({
      severity: "error",
      message: "No document selected",
      action: "Go to Step 1",
      step: 1
    }), le.length === 0 && me.push({
      severity: "error",
      message: "No signers added",
      action: "Go to Step 3",
      step: 3
    }), M().forEach((W) => {
      me.push({
        severity: "error",
        message: `${W.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const we = Array.from(ie).sort((W, ve) => W - ve);
    for (let W = 0; W < we.length; W++) if (we[W] !== W + 1) {
      me.push({
        severity: "warning",
        message: "Signing stages should be sequential starting from 1",
        action: "Review stages",
        step: 3
      });
      break;
    }
    const Me = me.some((W) => W.severity === "error"), Ie = me.some((W) => W.severity === "warning");
    Me ? (l.className = "p-4 rounded-lg bg-red-50 border border-red-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, K.classList.add("hidden"), Et(d, !0)) : Ie ? (l.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, K.classList.remove("hidden"), Et(d, !1)) : (l.className = "p-4 rounded-lg bg-green-50 border border-green-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, K.classList.remove("hidden"), Et(d, !1)), me.length > 0 ? (y.classList.remove("hidden"), $.innerHTML = "", me.forEach((W) => {
      const ve = document.createElement("li");
      ve.className = `p-3 rounded-lg flex items-center justify-between ${W.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, ve.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${W.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${W.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${f(W.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${W.step}">
            ${f(W.action)}
          </button>
        `, $.appendChild(ve);
    }), $.querySelectorAll("[data-go-to-step]").forEach((W) => {
      W.addEventListener("click", () => {
        const ve = Number(W.getAttribute("data-go-to-step"));
        Number.isFinite(ve) && B(ve);
      });
    })) : y.classList.add("hidden"), a.classList.add("hidden"), p.classList.remove("hidden");
  }
  return { initSendReadinessCheck: _ };
}
function kt(e, t = 0) {
  const n = Number.parseInt(String(e || "").trim(), 10);
  return Number.isFinite(n) ? n : t;
}
function Tn(e) {
  const { totalWizardSteps: t, wizardStep: n, nextStepLabels: i, submitBtn: o, previewCard: d, updateCoordinationUI: f, validateStep: v, onPlacementStep: P, onReviewStep: T, onStepChanged: F, initialStep: M = 1 } = e;
  let B = M;
  const _ = Array.from(document.querySelectorAll(".wizard-step-btn")), a = Array.from(document.querySelectorAll(".wizard-step")), p = Array.from(document.querySelectorAll(".wizard-connector")), l = document.getElementById("wizard-prev-btn"), y = document.getElementById("wizard-next-btn"), $ = document.getElementById("wizard-save-btn");
  function K() {
    if (_.forEach((g, U) => {
      const G = U + 1, z = g.querySelector(".wizard-step-number");
      z instanceof HTMLElement && (G < B ? (g.classList.remove("text-gray-500", "text-blue-600"), g.classList.add("text-green-600"), z.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), z.classList.add("bg-green-600", "text-white"), g.removeAttribute("aria-current")) : G === B ? (g.classList.remove("text-gray-500", "text-green-600"), g.classList.add("text-blue-600"), z.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), z.classList.add("bg-blue-600", "text-white"), g.setAttribute("aria-current", "step")) : (g.classList.remove("text-blue-600", "text-green-600"), g.classList.add("text-gray-500"), z.classList.remove("bg-blue-600", "text-white", "bg-green-600"), z.classList.add("bg-gray-300", "text-gray-600"), g.removeAttribute("aria-current")));
    }), p.forEach((g, U) => {
      U < B - 1 ? (g.classList.remove("bg-gray-300"), g.classList.add("bg-green-600")) : (g.classList.remove("bg-green-600"), g.classList.add("bg-gray-300"));
    }), a.forEach((g) => {
      kt(g.dataset.step) === B ? g.classList.remove("hidden") : g.classList.add("hidden");
    }), l?.classList.toggle("hidden", B === 1), y?.classList.toggle("hidden", B === t), $?.classList.toggle("hidden", B !== t), o.classList.toggle("hidden", B !== t), f(), B < t) {
      const g = i[B] || "Next";
      y && (y.innerHTML = `
        ${g}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    B === n.PLACEMENT ? P?.() : B === n.REVIEW && T?.(), d.updateVisibility(B);
  }
  function x(g) {
    if (!(g < n.DOCUMENT || g > t)) {
      if (g > B) {
        for (let U = B; U < g; U++) if (!v(U)) return;
      }
      B = g, K(), F?.(g), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }
  function I() {
    _.forEach((g) => {
      g.addEventListener("click", () => {
        x(kt(g.dataset.step));
      });
    }), l?.addEventListener("click", () => x(B - 1)), y?.addEventListener("click", () => x(B + 1)), $?.addEventListener("click", () => {
      const g = document.getElementById("agreement-form");
      if (!(g instanceof HTMLFormElement)) return;
      const U = document.createElement("input");
      if (U.type = "hidden", U.name = "save_as_draft", U.value = "1", g.appendChild(U), typeof g.requestSubmit == "function") {
        g.requestSubmit();
        return;
      }
      g.submit();
    });
  }
  return {
    bindEvents: I,
    getCurrentStep() {
      return B;
    },
    setCurrentStep(g) {
      B = g;
    },
    goToStep: x,
    updateWizardUI: K
  };
}
function Ft(e) {
  return e.querySelector('select[name*=".role"]');
}
function kn(e) {
  return e.querySelector(".field-participant-select");
}
function gt(e) {
  return typeof e == "object" && e !== null;
}
function Fn(e, t, n = {}) {
  const i = new Error(t);
  return i.code = String(e || "").trim(), Number(n.status || 0) > 0 && (i.status = Number(n.status || 0)), Number(n.currentRevision || 0) > 0 && (i.currentRevision = Number(n.currentRevision || 0)), Number(n.conflict?.currentRevision || 0) > 0 && (i.conflict = { currentRevision: Number(n.conflict?.currentRevision || 0) }), i;
}
function Mn(e, t = 0) {
  if (!gt(e)) return Number(t || 0);
  const n = e, i = Number(n.currentRevision || 0);
  if (i > 0) return i;
  const o = Number(n.conflict?.currentRevision || 0);
  return o > 0 ? o : Number(t || 0);
}
function Nn(e) {
  const { config: t, form: n, submitBtn: i, documentIdInput: o, documentSearch: d, participantsContainer: f, addParticipantBtn: v, fieldDefinitionsContainer: P, fieldRulesContainer: T, documentPageCountInput: F, fieldPlacementsJSONInput: M, fieldRulesJSONInput: B, storageKey: _, syncService: a, syncOrchestrator: p, stateManager: l, submitMode: y, totalWizardSteps: $, wizardStep: K, getCurrentStep: x, getPlacementState: I, getCurrentDocumentPageCount: g, ensureSelectedDocumentCompatibility: U, collectFieldRulesForState: G, collectFieldRulesForForm: z, expandRulesForPreview: N, findSignersMissingRequiredSignatureField: J, missingSignatureFieldMessage: V, getSignerParticipants: he, getReviewConfigForState: ye, isStartReviewEnabled: X, setPrimaryActionLabel: le, buildCanonicalAgreementPayload: ie, announceError: Se, emitWizardTelemetry: me, parseAPIError: we, goToStep: Me, showSyncConflictDialog: Ie, surfaceSyncOutcome: W, updateSyncStatus: ve, activeTabOwnershipRequiredCode: q = "ACTIVE_TAB_OWNERSHIP_REQUIRED", getActiveTabDebugState: Te, addFieldBtn: _e } = e;
  let oe = null;
  function pe() {
    return Te?.() || {};
  }
  function $e(de, m = !1) {
    i.setAttribute("aria-busy", m ? "true" : "false"), i.innerHTML = m ? `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${de}
        ` : `
          <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          ${de}
        `;
  }
  async function je() {
    Ge("persist_latest_wizard_state_start", Ae({
      state: l.getState(),
      storageKey: _,
      ownership: pe(),
      sendAttemptId: oe
    })), l.updateState(l.collectFormState());
    const de = await p.forceSync();
    if (de?.blocked && de.reason === "passive_tab")
      throw Xe("persist_latest_wizard_state_blocked", Ae({
        state: l.getState(),
        storageKey: _,
        ownership: pe(),
        sendAttemptId: oe,
        extra: { reason: de.reason }
      })), {
        code: q,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const m = l.getState();
    if (m?.syncPending)
      throw Xe("persist_latest_wizard_state_unsynced", Ae({
        state: m,
        storageKey: _,
        ownership: pe(),
        sendAttemptId: oe
      })), new Error("Unable to sync latest draft changes");
    return Ge("persist_latest_wizard_state_complete", Ae({
      state: m,
      storageKey: _,
      ownership: pe(),
      sendAttemptId: oe
    })), m;
  }
  async function ze() {
    Ge("ensure_draft_ready_for_send_start", Ae({
      state: l.getState(),
      storageKey: _,
      ownership: pe(),
      sendAttemptId: oe
    }));
    const de = await je(), m = String(de?.serverDraftId || "").trim();
    if (!m) {
      Xe("ensure_draft_ready_for_send_missing_draft", Ae({
        state: de,
        storageKey: _,
        ownership: pe(),
        sendAttemptId: oe,
        extra: { action: "create_draft" }
      }));
      const u = await a.create(de), S = String(u.id || "").trim(), C = Number(u.revision || 0);
      return S && C > 0 && l.markSynced(S, C), Ge("ensure_draft_ready_for_send_created", Ae({
        state: l.getState(),
        storageKey: _,
        ownership: pe(),
        sendAttemptId: oe,
        extra: {
          loadedDraftId: S,
          loadedRevision: C
        }
      })), {
        draftID: S,
        revision: C
      };
    }
    try {
      Ge("ensure_draft_ready_for_send_loading", Ae({
        state: de,
        storageKey: _,
        ownership: pe(),
        sendAttemptId: oe,
        extra: { targetDraftId: m }
      }));
      const u = await a.load(m), S = String(u?.id || m).trim(), C = Number(u?.revision || de?.serverRevision || 0);
      return S && C > 0 && l.markSynced(S, C), Ge("ensure_draft_ready_for_send_loaded", Ae({
        state: l.getState(),
        storageKey: _,
        ownership: pe(),
        sendAttemptId: oe,
        extra: {
          loadedDraftId: S,
          loadedRevision: C
        }
      })), {
        draftID: S,
        revision: C > 0 ? C : Number(de?.serverRevision || 0)
      };
    } catch (u) {
      throw Number(gt(u) && u.status || 0) !== 404 ? (Xe("ensure_draft_ready_for_send_load_failed", Ae({
        state: de,
        storageKey: _,
        ownership: pe(),
        sendAttemptId: oe,
        extra: {
          targetDraftId: m,
          status: Number(gt(u) && u.status || 0)
        }
      })), u) : (Xe("ensure_draft_ready_for_send_missing_remote_draft", Ae({
        state: de,
        storageKey: _,
        ownership: pe(),
        sendAttemptId: oe,
        extra: {
          targetDraftId: m,
          status: 404
        }
      })), me("wizard_send_not_found", {
        draft_id: m,
        status: 404,
        phase: "pre_send"
      }), await Ne().catch(() => {
      }), Fn("DRAFT_SEND_NOT_FOUND", "Draft not found", { status: 404 }));
    }
  }
  async function Ne() {
    const de = l.getState();
    l.setState({
      ...de,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await p.forceSync();
  }
  function Oe() {
    n.addEventListener("submit", function(de) {
      if (ie(), !o.value) {
        de.preventDefault(), Se("Please select a document"), d.focus();
        return;
      }
      if (!U()) {
        de.preventDefault();
        return;
      }
      const m = f.querySelectorAll(".participant-entry");
      if (m.length === 0) {
        de.preventDefault(), Se("Please add at least one participant"), v.focus();
        return;
      }
      let u = !1;
      if (m.forEach((D) => {
        Ft(D)?.value === "signer" && (u = !0);
      }), !u) {
        de.preventDefault(), Se("At least one signer is required");
        const D = m[0] ? Ft(m[0]) : null;
        D && D.focus();
        return;
      }
      const S = P.querySelectorAll(".field-definition-entry"), C = J();
      if (C.length > 0) {
        de.preventDefault(), Se(V(C)), Me(K.FIELDS), _e.focus();
        return;
      }
      let Z = !1;
      if (S.forEach((D) => {
        kn(D)?.value || (Z = !0);
      }), Z) {
        de.preventDefault(), Se("Please assign all fields to a signer");
        const D = P.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        D && D.focus();
        return;
      }
      if (G().some((D) => !D.participantId)) {
        de.preventDefault(), Se("Please assign all automation rules to a signer"), Array.from(T?.querySelectorAll(".field-rule-participant-select") || []).find((D) => !D.value)?.focus();
        return;
      }
      const ee = !!n.querySelector('input[name="save_as_draft"]'), te = typeof X == "function" ? X() : !1, fe = () => {
        const D = te ? "Start Review" : "Send for Signature";
        if (typeof le == "function") {
          le(D);
          return;
        }
        $e(D, !1);
      }, O = x() === $ && !ee && te, Y = x() === $ && !ee && !O;
      if (Y) {
        let D = n.querySelector('input[name="send_for_signature"]');
        D || (D = document.createElement("input"), D.type = "hidden", D.name = "send_for_signature", n.appendChild(D)), D.value = "1";
      } else n.querySelector('input[name="send_for_signature"]')?.remove();
      if (y === "json") {
        de.preventDefault(), i.disabled = !0, $e(Y ? "Sending..." : O ? "Starting Review..." : "Saving...", !0), (async () => {
          try {
            ie();
            const D = String(t.routes?.index || "").trim();
            if (!Y && !O) {
              if (await je(), D) {
                window.location.href = D;
                return;
              }
              window.location.reload();
              return;
            }
            if (O) {
              const s = ye();
              if (!s.enabled) throw new Error("Review mode is not enabled.");
              if ((s.participants || []).length === 0) throw new Error("Add at least one reviewer before starting review.");
            }
            oe = Rn(), Ge("send_submit_start", Ae({
              state: l.getState(),
              storageKey: _,
              ownership: pe(),
              sendAttemptId: oe
            }));
            const ue = await ze(), re = String(ue?.draftID || "").trim(), ae = Number(ue?.revision || 0);
            if (!re || ae <= 0) throw new Error("Draft session not available. Please try again.");
            Ge("send_request_start", Ae({
              state: l.getState(),
              storageKey: _,
              ownership: pe(),
              sendAttemptId: oe,
              extra: {
                targetDraftId: re,
                expectedRevision: ae,
                operation: O ? "start_review" : "send"
              }
            }));
            const ce = O ? await a.startReview(ae, oe || re) : await a.send(ae, oe || re), r = String(ce?.agreement_id || ce?.id || ce?.data?.agreement_id || ce?.data?.id || "").trim();
            if (Ge("send_request_success", Ae({
              state: l.getState(),
              storageKey: _,
              ownership: pe(),
              sendAttemptId: oe,
              extra: {
                targetDraftId: re,
                expectedRevision: ae,
                agreementId: r,
                operation: O ? "start_review" : "send"
              }
            })), l.clear(), p.broadcastStateUpdate(), p.broadcastDraftDisposed?.(re, "send_completed"), oe = null, r && D) {
              window.location.href = `${D}/${encodeURIComponent(r)}`;
              return;
            }
            if (D) {
              window.location.href = D;
              return;
            }
            window.location.reload();
          } catch (D) {
            const ue = gt(D) ? D : {}, re = String(ue.message || "Failed to process agreement").trim();
            let ae = String(ue.code || "").trim();
            const ce = Number(ue.status || 0);
            if (ae.toUpperCase() === "STALE_REVISION") {
              const r = Mn(D, Number(l.getState()?.serverRevision || 0));
              ve?.("conflict"), Ie?.(r), me("wizard_send_conflict", {
                draft_id: String(l.getState()?.serverDraftId || "").trim(),
                current_revision: r,
                status: ce || 409
              }), i.disabled = !1, fe(), oe = null;
              return;
            }
            ae.toUpperCase() === "NOT_FOUND" && (ae = "DRAFT_SEND_NOT_FOUND", me("wizard_send_not_found", {
              draft_id: String(l.getState()?.serverDraftId || "").trim(),
              status: ce || 404
            }), await Ne().catch(() => {
            })), Xe("send_request_failed", Ae({
              state: l.getState(),
              storageKey: _,
              ownership: pe(),
              sendAttemptId: oe,
              extra: {
                code: ae || null,
                status: ce,
                message: re
              }
            })), Se(re, ae, ce), i.disabled = !1, fe(), oe = null;
          }
        })();
        return;
      }
      i.disabled = !0, $e(Y ? "Sending..." : O ? "Starting Review..." : "Saving...", !0);
    });
  }
  return {
    bindEvents: Oe,
    ensureDraftReadyForSend: ze,
    persistLatestWizardState: je,
    resyncAfterSendNotFound: Ne
  };
}
var Mt = 150, Nt = 32;
function be(e) {
  return e == null ? "" : String(e).trim();
}
function Jt(e) {
  if (typeof e == "boolean") return e;
  const t = be(e).toLowerCase();
  return t === "" ? !1 : t === "1" || t === "true" || t === "on" || t === "yes";
}
function Bn(e) {
  return be(e).toLowerCase();
}
function Pe(e, t = 0) {
  if (typeof e == "number")
    return Number.isFinite(e) && e > 0 ? Math.floor(e) : t;
  const n = Number.parseInt(be(e), 10);
  return !Number.isFinite(n) || n <= 0 ? t : n;
}
function mt(e, t = 0) {
  if (typeof e == "number") return Number.isFinite(e) ? e : t;
  const n = Number.parseFloat(be(e));
  return Number.isFinite(n) ? n : t;
}
function ht(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function lt(e, t) {
  const n = Pe(e, 0);
  return n <= 0 ? 0 : t > 0 && n > t ? t : n;
}
function ct(e, t, n = 1) {
  const i = Pe(n, 1), o = Pe(e, i);
  return t > 0 ? ht(o, 1, t) : o > 0 ? o : i;
}
function $n(e, t, n) {
  const i = Pe(n, 1);
  let o = lt(e, i), d = lt(t, i);
  return o <= 0 && (o = 1), d <= 0 && (d = i), d < o ? {
    start: d,
    end: o
  } : {
    start: o,
    end: d
  };
}
function vt(e) {
  if (e == null) return [];
  const t = Array.isArray(e) ? e.map((i) => be(i)) : be(e).split(","), n = /* @__PURE__ */ new Set();
  return t.forEach((i) => {
    const o = Pe(i, 0);
    o > 0 && n.add(o);
  }), Array.from(n).sort((i, o) => i - o);
}
function St(e, t) {
  const n = Pe(t, 1), i = be(e.participantId ?? e.participant_id), o = vt(e.excludePages ?? e.exclude_pages), d = e.required, f = typeof d == "boolean" ? d : ![
    "0",
    "false",
    "off",
    "no"
  ].includes(be(d).toLowerCase());
  return {
    id: be(e.id),
    type: Bn(e.type),
    participantId: i,
    participantTempId: be(e.participantTempId) || i,
    fromPage: lt(e.fromPage ?? e.from_page, n),
    toPage: lt(e.toPage ?? e.to_page, n),
    page: lt(e.page, n),
    excludeLastPage: Jt(e.excludeLastPage ?? e.exclude_last_page),
    excludePages: o,
    required: f
  };
}
function zn(e, t) {
  const n = be(e?.id);
  return n !== "" ? n : `rule-${t + 1}`;
}
function Un(e, t) {
  const n = Pe(t, 1), i = [];
  return e.forEach((o, d) => {
    const f = St(o || {}, n);
    if (f.type === "") return;
    const v = zn(f, d);
    if (f.type === "initials_each_page") {
      const P = $n(f.fromPage, f.toPage, n), T = /* @__PURE__ */ new Set();
      vt(f.excludePages).forEach((F) => {
        F <= n && T.add(F);
      }), f.excludeLastPage && T.add(n);
      for (let F = P.start; F <= P.end; F += 1)
        T.has(F) || i.push({
          id: `${v}-initials-${F}`,
          type: "initials",
          page: F,
          participantId: be(f.participantId),
          required: f.required !== !1,
          ruleId: v
        });
      return;
    }
    if (f.type === "signature_once") {
      let P = f.page > 0 ? f.page : f.toPage > 0 ? f.toPage : n;
      P <= 0 && (P = 1), i.push({
        id: `${v}-signature-${P}`,
        type: "signature",
        page: P,
        participantId: be(f.participantId),
        required: f.required !== !1,
        ruleId: v
      });
    }
  }), i.sort((o, d) => o.page !== d.page ? o.page - d.page : o.id.localeCompare(d.id)), i;
}
function qn(e, t, n, i, o) {
  const d = Pe(n, 1);
  let f = e > 0 ? e : 1, v = t > 0 ? t : d;
  f = ht(f, 1, d), v = ht(v, 1, d), v < f && ([f, v] = [v, f]);
  const P = /* @__PURE__ */ new Set();
  o.forEach((F) => {
    const M = Pe(F, 0);
    M > 0 && P.add(ht(M, 1, d));
  }), i && P.add(d);
  const T = [];
  for (let F = f; F <= v; F += 1) P.has(F) || T.push(F);
  return {
    pages: T,
    rangeStart: f,
    rangeEnd: v,
    excludedPages: Array.from(P).sort((F, M) => F - M),
    isEmpty: T.length === 0
  };
}
function On(e) {
  if (e.isEmpty) return "(no pages - all excluded)";
  const { pages: t } = e;
  if (t.length <= 5) return `pages ${t.join(", ")}`;
  const n = [];
  let i = 0;
  for (let o = 1; o <= t.length; o += 1) if (o === t.length || t[o] !== t[o - 1] + 1) {
    const d = t[i], f = t[o - 1];
    d === f ? n.push(String(d)) : f === d + 1 ? n.push(`${d}, ${f}`) : n.push(`${d}-${f}`), i = o;
  }
  return `pages ${n.join(", ")}`;
}
function xt(e) {
  const t = e || {};
  return {
    id: be(t.id),
    title: be(t.title || t.name) || "Untitled",
    pageCount: Pe(t.page_count ?? t.pageCount, 0),
    compatibilityTier: be(t.pdf_compatibility_tier ?? t.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: be(t.pdf_compatibility_reason ?? t.pdfCompatibilityReason).toLowerCase()
  };
}
function Xt(e) {
  const t = be(e).toLowerCase();
  if (t === "") return He.MANUAL;
  switch (t) {
    case He.AUTO:
    case He.MANUAL:
    case He.AUTO_LINKED:
    case He.AUTO_FALLBACK:
      return t;
    default:
      return t;
  }
}
function dt(e, t = 0) {
  const n = e || {}, i = be(n.id) || `fi_init_${t}`, o = be(n.definitionId || n.definition_id || n.field_definition_id) || i, d = Pe(n.page ?? n.page_number, 1), f = mt(n.x ?? n.pos_x, 0), v = mt(n.y ?? n.pos_y, 0), P = mt(n.width, Mt), T = mt(n.height, Nt);
  return {
    id: i,
    definitionId: o,
    type: be(n.type) || "text",
    participantId: be(n.participantId || n.participant_id),
    participantName: be(n.participantName || n.participant_name) || "Unassigned",
    page: d > 0 ? d : 1,
    x: f >= 0 ? f : 0,
    y: v >= 0 ? v : 0,
    width: P > 0 ? P : Mt,
    height: T > 0 ? T : Nt,
    placementSource: Xt(n.placementSource || n.placement_source),
    linkGroupId: be(n.linkGroupId || n.link_group_id),
    linkedFromFieldId: be(n.linkedFromFieldId || n.linked_from_field_id),
    isUnlinked: Jt(n.isUnlinked ?? n.is_unlinked)
  };
}
function Hn(e, t = 0) {
  const n = dt(e, t);
  return {
    id: n.id,
    definition_id: n.definitionId,
    page: n.page,
    x: Math.round(n.x),
    y: Math.round(n.y),
    width: Math.round(n.width),
    height: Math.round(n.height),
    placement_source: Xt(n.placementSource),
    link_group_id: be(n.linkGroupId),
    linked_from_field_id: be(n.linkedFromFieldId),
    is_unlinked: !!n.isUnlinked
  };
}
function Le(e) {
  const t = document.getElementById(e);
  return t instanceof HTMLElement ? t : null;
}
function tt(e) {
  return typeof e == "object" && e !== null;
}
async function Lt(e) {
  return Dt(e);
}
async function jn(e) {
  return Dt(e);
}
function Gn(e) {
  const { apiBase: t, apiVersionBase: n, documentsUploadURL: i, isEditMode: o, titleSource: d, normalizeTitleSource: f, stateManager: v, previewCard: P, parseAPIError: T, announceError: F, showToast: M, mapUserFacingError: B, renderFieldRulePreview: _ } = e, a = Le("document_id"), p = Le("selected-document"), l = Le("document-picker"), y = Le("document-search"), $ = Le("document-list"), K = Le("change-document-btn"), x = Le("selected-document-title"), I = Le("selected-document-info"), g = Le("document_page_count"), U = Le("document-remediation-panel"), G = Le("document-remediation-message"), z = Le("document-remediation-status"), N = Le("document-remediation-trigger-btn"), J = Le("document-remediation-dismiss-btn"), V = Le("title"), he = 300, ye = 5, X = 10, le = Le("document-typeahead"), ie = Le("document-typeahead-dropdown"), Se = Le("document-recent-section"), me = Le("document-recent-list"), we = Le("document-search-section"), Me = Le("document-search-list"), Ie = Le("document-empty-state"), W = Le("document-dropdown-loading"), ve = Le("document-search-loading"), q = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let Te = [], _e = null, oe = 0, pe = null;
  const $e = /* @__PURE__ */ new Set(), je = /* @__PURE__ */ new Map();
  function ze(h) {
    return String(h || "").trim().toLowerCase();
  }
  function Ne(h) {
    return String(h || "").trim().toLowerCase();
  }
  function Oe(h) {
    return ze(h) === "unsupported";
  }
  function de() {
    !o && V && V.value.trim() !== "" && !v.hasResumableState() && v.setTitleSource(d.SERVER_SEED, { syncPending: !1 });
  }
  function m(h) {
    const w = Pe(h, 0);
    g && (g.value = String(w));
  }
  function u() {
    const h = Pe(g?.value || "0", 0);
    if (h > 0) return h;
    const w = String(I?.textContent || "").match(/(\d+)\s+pages?/i);
    if (w) {
      const E = Pe(w[1], 0);
      if (E > 0) return E;
    }
    return 1;
  }
  function S() {
    a && (a.value = ""), x && (x.textContent = ""), I && (I.textContent = ""), m(0), v.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), P.setDocument(null, null, null);
  }
  function C(h = "") {
    const w = "This document cannot be used because its PDF is incompatible with online signing.", E = Ne(h);
    return E ? `${w} Reason: ${E}. Select another document or upload a remediated PDF.` : `${w} Select another document or upload a remediated PDF.`;
  }
  function Z() {
    _e = null, z && (z.textContent = "", z.className = "mt-2 text-xs text-amber-800"), U && U.classList.add("hidden"), N && (N.disabled = !1, N.textContent = "Remediate PDF");
  }
  function ee(h, w = "info") {
    z && (z.textContent = String(h || "").trim(), z.className = `mt-2 text-xs ${w === "error" ? "text-red-700" : w === "success" ? "text-green-700" : "text-amber-800"}`);
  }
  function te(h, w = "") {
    !h || !U || !G || (_e = {
      id: String(h.id || "").trim(),
      title: String(h.title || "").trim(),
      pageCount: Pe(h.pageCount, 0),
      compatibilityReason: Ne(w || h.compatibilityReason || "")
    }, _e.id && (G.textContent = C(_e.compatibilityReason), ee("Run remediation to make this document signable."), U.classList.remove("hidden")));
  }
  function fe(h) {
    const w = V;
    if (!w) return;
    const E = v.getState(), L = w.value.trim(), j = f(E?.titleSource, L === "" ? d.AUTOFILL : d.USER);
    if (L && j === d.USER) return;
    const Q = String(h || "").trim();
    Q && (w.value = Q, v.updateDetails({
      title: Q,
      message: v.getState().details.message || ""
    }, { titleSource: d.AUTOFILL }));
  }
  function O(h, w, E) {
    if (!a || !x || !I || !p || !l) return;
    a.value = String(h || ""), x.textContent = w || "", I.textContent = `${E} pages`, m(E), p.classList.remove("hidden"), l.classList.add("hidden"), _(), fe(w);
    const L = Pe(E, 0);
    v.updateDocument({
      id: h,
      title: w,
      pageCount: L
    }), P.setDocument(h, w, L), Z();
  }
  function Y(h) {
    const w = String(h || "").trim();
    if (w === "") return null;
    const E = Te.find((Q) => String(Q.id || "").trim() === w);
    if (E) return E;
    const L = q.recentDocuments.find((Q) => String(Q.id || "").trim() === w);
    if (L) return L;
    const j = q.searchResults.find((Q) => String(Q.id || "").trim() === w);
    return j || null;
  }
  function D() {
    const h = Y(a?.value || "");
    return h ? Oe(ze(h.compatibilityTier)) ? (te(h, h.compatibilityReason || ""), S(), F(C(h.compatibilityReason || "")), p && p.classList.add("hidden"), l && l.classList.remove("hidden"), y?.focus(), !1) : (Z(), !0) : !0;
  }
  function ue() {
    if (!x || !I || !p || !l) return;
    const h = (a?.value || "").trim();
    if (!h) return;
    const w = Te.find((E) => String(E.id || "").trim() === h);
    w && (x.textContent.trim() || (x.textContent = w.title || "Untitled"), (!I.textContent.trim() || I.textContent.trim() === "pages") && (I.textContent = `${w.pageCount || 0} pages`), m(w.pageCount || 0), p.classList.remove("hidden"), l.classList.add("hidden"));
  }
  async function re() {
    try {
      const h = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), w = await fetch(`${t}/panels/esign_documents?${h.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!w.ok) throw await T(w, "Failed to load documents");
      const E = await Lt(w);
      Te = (Array.isArray(E?.records) ? E.records : Array.isArray(E?.items) ? E.items : []).slice().sort((L, j) => {
        const Q = Date.parse(String(L?.created_at ?? L?.createdAt ?? L?.updated_at ?? L?.updatedAt ?? "")), b = Date.parse(String(j?.created_at ?? j?.createdAt ?? j?.updated_at ?? j?.updatedAt ?? "")), se = Number.isFinite(Q) ? Q : 0;
        return (Number.isFinite(b) ? b : 0) - se;
      }).map((L) => xt(L)).filter((L) => L.id !== ""), ae(Te), ue();
    } catch (h) {
      const w = B(tt(h) ? String(h.message || "Failed to load documents") : "Failed to load documents", tt(h) ? String(h.code || "") : "", tt(h) ? Number(h.status || 0) : 0);
      $ && ($.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${Be(w)}</div>`);
    }
  }
  function ae(h) {
    if (!$) return;
    if (h.length === 0) {
      $.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${Be(i)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    $.innerHTML = h.map((E, L) => {
      const j = Be(String(E.id || "").trim()), Q = Be(String(E.title || "").trim()), b = String(Pe(E.pageCount, 0)), se = ze(E.compatibilityTier), De = Ne(E.compatibilityReason), ke = Be(se), Ze = Be(De), It = Oe(se) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${L === 0 ? "0" : "-1"}"
                data-document-id="${j}"
                data-document-title="${Q}"
                data-document-pages="${b}"
                data-document-compatibility-tier="${ke}"
                data-document-compatibility-reason="${Ze}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${Q}</div>
            <div class="text-xs text-gray-500">${b} pages ${It}</div>
          </div>
        </button>
      `;
    }).join("");
    const w = Array.from($.querySelectorAll(".document-option"));
    w.forEach((E, L) => {
      E.addEventListener("click", () => ce(E)), E.addEventListener("keydown", (j) => {
        let Q = L;
        if (j.key === "ArrowDown")
          j.preventDefault(), Q = Math.min(L + 1, w.length - 1);
        else if (j.key === "ArrowUp")
          j.preventDefault(), Q = Math.max(L - 1, 0);
        else if (j.key === "Enter" || j.key === " ") {
          j.preventDefault(), ce(E);
          return;
        } else j.key === "Home" ? (j.preventDefault(), Q = 0) : j.key === "End" && (j.preventDefault(), Q = w.length - 1);
        Q !== L && (w[Q].focus(), w[Q].setAttribute("tabindex", "0"), E.setAttribute("tabindex", "-1"));
      });
    });
  }
  function ce(h) {
    const w = h.getAttribute("data-document-id"), E = h.getAttribute("data-document-title"), L = h.getAttribute("data-document-pages"), j = ze(h.getAttribute("data-document-compatibility-tier")), Q = Ne(h.getAttribute("data-document-compatibility-reason"));
    if (Oe(j)) {
      te({
        id: String(w || ""),
        title: String(E || ""),
        pageCount: Pe(L, 0),
        compatibilityReason: Q
      }), S(), F(C(Q)), y?.focus();
      return;
    }
    O(w, E, L);
  }
  async function r(h, w, E) {
    const L = String(h || "").trim();
    if (!L) return;
    const j = Date.now(), Q = 12e4, b = 1250;
    for (; Date.now() - j < Q; ) {
      const se = await fetch(L, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!se.ok) throw await T(se, "Failed to read remediation status");
      const De = (await jn(se))?.dispatch || {}, ke = String(De?.status || "").trim().toLowerCase();
      if (ke === "succeeded") {
        ee("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (ke === "failed" || ke === "canceled" || ke === "dead_letter") {
        const Ze = String(De?.terminal_reason || "").trim();
        throw {
          message: Ze ? `Remediation failed: ${Ze}` : "Remediation did not complete. Please upload a new document or try again.",
          code: "REMEDIATION_FAILED",
          status: 422
        };
      }
      ee(ke === "retrying" ? "Remediation is retrying in the queue..." : ke === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((Ze) => setTimeout(Ze, b));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${w} (${E})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function s() {
    const h = _e;
    if (!h || !h.id) return;
    const w = String(h.id || "").trim();
    if (!(!w || $e.has(w))) {
      $e.add(w), N && (N.disabled = !0, N.textContent = "Remediating...");
      try {
        let E = je.get(w) || "";
        E || (E = `esign-remediate-${w}-${Date.now()}`, je.set(w, E));
        const L = await Gt(`${n}/esign/documents/${encodeURIComponent(w)}/remediate`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": E
          }
        });
        if (!L.ok) throw await T(L, "Failed to trigger remediation");
        const j = await L.json(), Q = j?.receipt || {}, b = String(Q?.dispatch_id || j?.dispatch_id || "").trim(), se = String(Q?.mode || j?.mode || "").trim().toLowerCase();
        let De = String(j?.dispatch_status_url || "").trim();
        !De && b && (De = `${n}/esign/dispatches/${encodeURIComponent(b)}`), se === "queued" && b && De && (ee("Remediation queued. Monitoring progress..."), await r(De, b, w)), await re();
        const ke = Y(w);
        if (!ke || Oe(ke.compatibilityTier)) {
          ee("Remediation finished, but this PDF is still incompatible.", "error"), F("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        O(ke.id, ke.title, ke.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : M("Document remediated successfully. You can continue.", "success");
      } catch (E) {
        const L = tt(E) ? String(E.message || "Remediation failed").trim() : "Remediation failed", j = tt(E) ? String(E.code || "") : "", Q = tt(E) ? Number(E.status || 0) : 0;
        ee(L, "error"), F(L, j, Q);
      } finally {
        $e.delete(w), N && (N.disabled = !1, N.textContent = "Remediate PDF");
      }
    }
  }
  function c(h, w) {
    let E = null;
    return (...L) => {
      E !== null && clearTimeout(E), E = setTimeout(() => {
        h(...L), E = null;
      }, w);
    };
  }
  async function R() {
    try {
      const h = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(ye)
      }), w = await fetch(`${t}/panels/esign_documents?${h}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!w.ok) {
        console.warn("Failed to load recent documents:", w.status);
        return;
      }
      const E = await Lt(w);
      q.recentDocuments = (Array.isArray(E?.records) ? E.records : Array.isArray(E?.items) ? E.items : []).map((L) => xt(L)).filter((L) => L.id !== "").slice(0, ye);
    } catch (h) {
      console.warn("Error loading recent documents:", h);
    }
  }
  async function k(h) {
    const w = h.trim();
    if (!w) {
      pe && (pe.abort(), pe = null), q.isSearchMode = !1, q.searchResults = [], ge();
      return;
    }
    const E = ++oe;
    pe && pe.abort(), pe = new AbortController(), q.isLoading = !0, q.isSearchMode = !0, ge();
    try {
      const L = new URLSearchParams({
        q: w,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(X)
      }), j = await fetch(`${t}/panels/esign_documents?${L}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: pe.signal
      });
      if (E !== oe) return;
      if (!j.ok) {
        console.warn("Failed to search documents:", j.status), q.searchResults = [], q.isLoading = !1, ge();
        return;
      }
      const Q = await Lt(j);
      q.searchResults = (Array.isArray(Q?.records) ? Q.records : Array.isArray(Q?.items) ? Q.items : []).map((b) => xt(b)).filter((b) => b.id !== "").slice(0, X);
    } catch (L) {
      if (tt(L) && L.name === "AbortError") return;
      console.warn("Error searching documents:", L), q.searchResults = [];
    } finally {
      E === oe && (q.isLoading = !1, ge());
    }
  }
  const A = c(k, he);
  function H() {
    ie && (q.isOpen = !0, q.selectedIndex = -1, ie.classList.remove("hidden"), y?.setAttribute("aria-expanded", "true"), $?.classList.add("hidden"), ge());
  }
  function ne() {
    ie && (q.isOpen = !1, q.selectedIndex = -1, ie.classList.add("hidden"), y?.setAttribute("aria-expanded", "false"), $?.classList.remove("hidden"));
  }
  function Ce(h, w, E) {
    h && (h.innerHTML = w.map((L, j) => {
      const Q = j, b = q.selectedIndex === Q, se = Be(String(L.id || "").trim()), De = Be(String(L.title || "").trim()), ke = String(Pe(L.pageCount, 0)), Ze = ze(L.compatibilityTier), It = Ne(L.compatibilityReason), nn = Be(Ze), rn = Be(It), an = Oe(Ze) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${b ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${b}"
          tabindex="-1"
          data-document-id="${se}"
          data-document-title="${De}"
          data-document-pages="${ke}"
          data-document-compatibility-tier="${nn}"
          data-document-compatibility-reason="${rn}"
          data-typeahead-index="${Q}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${De}</div>
            <div class="text-xs text-gray-500">${ke} pages ${an}</div>
          </div>
        </button>
      `;
    }).join(""), h.querySelectorAll(".typeahead-option").forEach((L) => {
      L.addEventListener("click", () => Ee(L));
    }));
  }
  function ge() {
    if (ie) {
      if (q.isLoading) {
        W?.classList.remove("hidden"), Se?.classList.add("hidden"), we?.classList.add("hidden"), Ie?.classList.add("hidden"), ve?.classList.remove("hidden");
        return;
      }
      W?.classList.add("hidden"), ve?.classList.add("hidden"), q.isSearchMode ? (Se?.classList.add("hidden"), q.searchResults.length > 0 ? (we?.classList.remove("hidden"), Ie?.classList.add("hidden"), Ce(Me, q.searchResults, "search")) : (we?.classList.add("hidden"), Ie?.classList.remove("hidden"))) : (we?.classList.add("hidden"), q.recentDocuments.length > 0 ? (Se?.classList.remove("hidden"), Ie?.classList.add("hidden"), Ce(me, q.recentDocuments, "recent")) : (Se?.classList.add("hidden"), Ie?.classList.remove("hidden"), Ie && (Ie.textContent = "No recent documents")));
    }
  }
  function Ee(h) {
    const w = h.getAttribute("data-document-id"), E = h.getAttribute("data-document-title"), L = h.getAttribute("data-document-pages"), j = ze(h.getAttribute("data-document-compatibility-tier")), Q = Ne(h.getAttribute("data-document-compatibility-reason"));
    if (w) {
      if (Oe(j)) {
        te({
          id: String(w || ""),
          title: String(E || ""),
          pageCount: Pe(L, 0),
          compatibilityReason: Q
        }), S(), F(C(Q)), y?.focus();
        return;
      }
      O(w, E, L), ne(), y && (y.value = ""), q.query = "", q.isSearchMode = !1, q.searchResults = [];
    }
  }
  function We() {
    if (!ie) return;
    const h = ie.querySelector(`[data-typeahead-index="${q.selectedIndex}"]`);
    h && h.scrollIntoView({ block: "nearest" });
  }
  function Ke(h) {
    if (!q.isOpen) {
      (h.key === "ArrowDown" || h.key === "Enter") && (h.preventDefault(), H());
      return;
    }
    const w = q.isSearchMode ? q.searchResults : q.recentDocuments, E = w.length - 1;
    switch (h.key) {
      case "ArrowDown":
        h.preventDefault(), q.selectedIndex = Math.min(q.selectedIndex + 1, E), ge(), We();
        break;
      case "ArrowUp":
        h.preventDefault(), q.selectedIndex = Math.max(q.selectedIndex - 1, 0), ge(), We();
        break;
      case "Enter":
        if (h.preventDefault(), q.selectedIndex >= 0 && q.selectedIndex <= E) {
          const L = w[q.selectedIndex];
          if (L) {
            const j = document.createElement("button");
            j.setAttribute("data-document-id", L.id), j.setAttribute("data-document-title", L.title), j.setAttribute("data-document-pages", String(L.pageCount)), j.setAttribute("data-document-compatibility-tier", String(L.compatibilityTier || "")), j.setAttribute("data-document-compatibility-reason", String(L.compatibilityReason || "")), Ee(j);
          }
        }
        break;
      case "Escape":
        h.preventDefault(), ne();
        break;
      case "Tab":
        ne();
        break;
      case "Home":
        h.preventDefault(), q.selectedIndex = 0, ge(), We();
        break;
      case "End":
        h.preventDefault(), q.selectedIndex = E, ge(), We();
        break;
    }
  }
  function xe() {
    K && K.addEventListener("click", () => {
      p?.classList.add("hidden"), l?.classList.remove("hidden"), Z(), y?.focus(), H();
    }), N && N.addEventListener("click", () => {
      s();
    }), J && J.addEventListener("click", () => {
      Z(), y?.focus();
    }), y && (y.addEventListener("input", (h) => {
      const w = h.target;
      if (!(w instanceof HTMLInputElement)) return;
      const E = w.value;
      q.query = E, q.isOpen || H(), E.trim() ? (q.isLoading = !0, ge(), A(E)) : (q.isSearchMode = !1, q.searchResults = [], ge()), ae(Te.filter((L) => String(L.title || "").toLowerCase().includes(E.toLowerCase())));
    }), y.addEventListener("focus", () => {
      H();
    }), y.addEventListener("keydown", Ke)), document.addEventListener("click", (h) => {
      const w = h.target;
      le && !(w instanceof Node && le.contains(w)) && ne();
    });
  }
  return {
    refs: {
      documentIdInput: a,
      selectedDocument: p,
      documentPicker: l,
      documentSearch: y,
      documentList: $,
      selectedDocumentTitle: x,
      selectedDocumentInfo: I,
      documentPageCountInput: g
    },
    bindEvents: xe,
    initializeTitleSourceSeed: de,
    loadDocuments: re,
    loadRecentDocuments: R,
    ensureSelectedDocumentCompatibility: D,
    getCurrentDocumentPageCount: u
  };
}
function Ye(e, t) {
  const n = e.querySelector(t);
  return n instanceof HTMLInputElement ? n : null;
}
function Rt(e, t) {
  const n = e.querySelector(t);
  return n instanceof HTMLSelectElement ? n : null;
}
function Wn(e = {}) {
  const { initialParticipants: t = [], onParticipantsChanged: n } = e, i = document.getElementById("participants-container"), o = document.getElementById("participant-template"), d = document.getElementById("add-participant-btn");
  let f = 0, v = 0;
  function P() {
    return `temp_${Date.now()}_${f++}`;
  }
  function T(p = {}) {
    if (!(o instanceof HTMLTemplateElement) || !i) return;
    const l = o.content.cloneNode(!0), y = l.querySelector(".participant-entry");
    if (!(y instanceof HTMLElement)) return;
    const $ = p.id || P();
    y.setAttribute("data-participant-id", $);
    const K = Ye(y, ".participant-id-input"), x = Ye(y, 'input[name="participants[].name"]'), I = Ye(y, 'input[name="participants[].email"]'), g = Rt(y, 'select[name="participants[].role"]'), U = Ye(y, 'input[name="participants[].signing_stage"]'), G = Ye(y, 'input[name="participants[].notify"]'), z = y.querySelector(".signing-stage-wrapper");
    if (!K || !x || !I || !g) return;
    const N = v++;
    K.name = `participants[${N}].id`, K.value = $, x.name = `participants[${N}].name`, I.name = `participants[${N}].email`, g.name = `participants[${N}].role`, U && (U.name = `participants[${N}].signing_stage`), G && (G.name = `participants[${N}].notify`), p.name && (x.value = p.name), p.email && (I.value = p.email), p.role && (g.value = p.role), U && p.signing_stage && (U.value = String(p.signing_stage)), G && (G.checked = p.notify !== !1);
    const J = () => {
      if (!(z instanceof HTMLElement) || !U) return;
      const V = g.value === "signer";
      z.classList.toggle("hidden", !V), V ? U.value || (U.value = "1") : U.value = "";
    };
    J(), y.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      y.remove(), n?.();
    }), g.addEventListener("change", () => {
      J(), n?.();
    }), i.appendChild(l);
  }
  function F() {
    i && (t.length > 0 ? t.forEach((p) => {
      T({
        id: String(p.id || "").trim(),
        name: String(p.name || "").trim(),
        email: String(p.email || "").trim(),
        role: String(p.role || "signer").trim() || "signer",
        notify: p.notify !== !1,
        signing_stage: Number(p.signing_stage || p.signingStage || 1) || 1
      });
    }) : T());
  }
  function M() {
    i && (d?.addEventListener("click", () => T()), new MutationObserver(() => {
      n?.();
    }).observe(i, {
      childList: !0,
      subtree: !0
    }), i.addEventListener("change", (p) => {
      const l = p.target;
      l instanceof Element && (l.matches('select[name*=".role"]') || l.matches('input[name*=".name"]') || l.matches('input[name*=".email"]')) && n?.();
    }), i.addEventListener("input", (p) => {
      const l = p.target;
      l instanceof Element && (l.matches('input[name*=".name"]') || l.matches('input[name*=".email"]')) && n?.();
    }));
  }
  function B() {
    if (!i) return [];
    const p = i.querySelectorAll(".participant-entry"), l = [];
    return p.forEach((y) => {
      const $ = y.getAttribute("data-participant-id"), K = Rt(y, 'select[name*=".role"]'), x = Ye(y, 'input[name*=".name"]'), I = Ye(y, 'input[name*=".email"]');
      K?.value === "signer" && l.push({
        id: String($ || ""),
        name: x?.value || I?.value || "Signer",
        email: I?.value || ""
      });
    }), l;
  }
  function _() {
    if (!i) return [];
    const p = [];
    return i.querySelectorAll(".participant-entry").forEach((l) => {
      const y = l.getAttribute("data-participant-id"), $ = Ye(l, 'input[name*=".name"]')?.value || "", K = Ye(l, 'input[name*=".email"]')?.value || "", x = Rt(l, 'select[name*=".role"]')?.value || "signer", I = Number.parseInt(Ye(l, ".signing-stage-input")?.value || "1", 10), g = Ye(l, ".notify-input")?.checked !== !1;
      p.push({
        tempId: String(y || ""),
        name: $,
        email: K,
        role: x,
        notify: g,
        signingStage: Number.isFinite(I) ? I : 1
      });
    }), p;
  }
  function a(p) {
    !i || !p?.participants || p.participants.length === 0 || (i.innerHTML = "", v = 0, p.participants.forEach((l) => {
      T({
        id: l.tempId,
        name: l.name,
        email: l.email,
        role: l.role,
        notify: l.notify !== !1,
        signing_stage: l.signingStage
      });
    }));
  }
  return {
    refs: {
      participantsContainer: i,
      addParticipantBtn: d
    },
    initialize: F,
    bindEvents: M,
    addParticipant: T,
    getSignerParticipants: B,
    collectParticipantsForState: _,
    restoreFromState: a
  };
}
function Vn() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function bt() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function Kn(e, t) {
  return {
    id: Vn(),
    name: t,
    memberDefinitionIds: [...e],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function Zt(e, t) {
  const n = new Map(e.groups);
  n.set(t.id, t);
  const i = new Map(e.definitionToGroup);
  for (const o of t.memberDefinitionIds) i.set(o, t.id);
  return {
    ...e,
    groups: n,
    definitionToGroup: i
  };
}
function Bt(e, t) {
  const n = new Set(e.unlinkedDefinitions);
  return n.add(t), {
    ...e,
    unlinkedDefinitions: n
  };
}
function $t(e, t) {
  const n = new Set(e.unlinkedDefinitions);
  return n.delete(t), {
    ...e,
    unlinkedDefinitions: n
  };
}
function Qt(e, t) {
  const n = e.definitionToGroup.get(t);
  if (n)
    return e.groups.get(n);
}
function Yn(e, t) {
  const n = Qt(e, t.definitionId);
  if (!n || !n.isActive || n.templatePosition) return null;
  const i = {
    x: t.x,
    y: t.y,
    width: t.width,
    height: t.height
  };
  return { updatedGroup: {
    ...n,
    sourceFieldId: t.id,
    templatePosition: i
  } };
}
function Jn(e, t, n, i) {
  const o = /* @__PURE__ */ new Set();
  for (const d of n) o.add(d.definitionId);
  for (const [d, f] of i) {
    if (f.page !== t || o.has(d) || e.unlinkedDefinitions.has(d)) continue;
    const v = e.definitionToGroup.get(d);
    if (!v) continue;
    const P = e.groups.get(v);
    if (!(!P || !P.isActive || !P.templatePosition))
      return { newPlacement: {
        id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        definitionId: d,
        type: f.type,
        participantId: f.participantId,
        participantName: f.participantName,
        page: t,
        x: P.templatePosition.x,
        y: P.templatePosition.y,
        width: P.templatePosition.width,
        height: P.templatePosition.height,
        placementSource: He.AUTO_LINKED,
        linkGroupId: P.id,
        linkedFromFieldId: P.sourceFieldId
      } };
  }
  return null;
}
function Je(e) {
  const t = document.getElementById(e);
  return t instanceof HTMLElement ? t : null;
}
function Re(e, t) {
  const n = e.querySelector(t);
  return n instanceof HTMLInputElement ? n : null;
}
function Ue(e, t) {
  const n = e.querySelector(t);
  return n instanceof HTMLSelectElement ? n : null;
}
function zt(e, t) {
  const n = e.querySelector(t);
  return n instanceof HTMLButtonElement ? n : null;
}
function nt(e, t) {
  const n = e.querySelector(t);
  return n instanceof HTMLElement ? n : null;
}
function Xn(e) {
  const { initialFieldInstances: t = [], placementSource: n, getCurrentDocumentPageCount: i, getSignerParticipants: o, escapeHtml: d, onDefinitionsChanged: f, onRulesChanged: v, onParticipantsChanged: P, getPlacementLinkGroupState: T, setPlacementLinkGroupState: F } = e, M = Je("field-definitions-container"), B = document.getElementById("field-definition-template"), _ = Je("add-field-btn"), a = Je("add-field-btn-container"), p = Je("add-field-definition-empty-btn"), l = Je("field-definitions-empty-state"), y = Je("field-rules-container"), $ = document.getElementById("field-rule-template"), K = Je("add-field-rule-btn"), x = Je("field-rules-empty-state"), I = Je("field-rules-preview"), g = Je("field_rules_json"), U = Je("field_placements_json");
  let G = 0, z = 0, N = 0;
  function J() {
    return `temp_field_${Date.now()}_${G++}`;
  }
  function V() {
    return `rule_${Date.now()}_${N}`;
  }
  function he(m, u) {
    const S = String(m || "").trim();
    return S && u.some((C) => C.id === S) ? S : u.length === 1 ? u[0].id : "";
  }
  function ye(m, u, S = "") {
    if (!m) return;
    const C = he(S, u);
    m.innerHTML = '<option value="">Select signer...</option>', u.forEach((Z) => {
      const ee = document.createElement("option");
      ee.value = Z.id, ee.textContent = Z.name, m.appendChild(ee);
    }), m.value = C;
  }
  function X(m = o()) {
    if (!M) return;
    const u = M.querySelectorAll(".field-participant-select"), S = y ? y.querySelectorAll(".field-rule-participant-select") : [];
    u.forEach((C) => {
      ye(C instanceof HTMLSelectElement ? C : null, m, C instanceof HTMLSelectElement ? C.value : "");
    }), S.forEach((C) => {
      ye(C instanceof HTMLSelectElement ? C : null, m, C instanceof HTMLSelectElement ? C.value : "");
    });
  }
  function le() {
    !M || !l || (M.querySelectorAll(".field-definition-entry").length === 0 ? (l.classList.remove("hidden"), a?.classList.add("hidden")) : (l.classList.add("hidden"), a?.classList.remove("hidden")));
  }
  function ie() {
    if (!y || !x) return;
    const m = y.querySelectorAll(".field-rule-entry");
    x.classList.toggle("hidden", m.length > 0);
  }
  function Se() {
    if (!M) return [];
    const m = [];
    return M.querySelectorAll(".field-definition-entry").forEach((u) => {
      const S = u.getAttribute("data-field-definition-id"), C = Ue(u, ".field-type-select")?.value || "signature", Z = Ue(u, ".field-participant-select")?.value || "", ee = Number.parseInt(Re(u, 'input[name*=".page"]')?.value || "1", 10), te = Re(u, 'input[name*=".required"]')?.checked ?? !0;
      m.push({
        tempId: String(S || ""),
        type: C,
        participantTempId: Z,
        page: Number.isFinite(ee) ? ee : 1,
        required: te
      });
    }), m;
  }
  function me() {
    if (!y) return [];
    const m = i(), u = y.querySelectorAll(".field-rule-entry"), S = [];
    return u.forEach((C) => {
      const Z = St({
        id: C.getAttribute("data-field-rule-id") || "",
        type: Ue(C, ".field-rule-type-select")?.value || "",
        participantId: Ue(C, ".field-rule-participant-select")?.value || "",
        fromPage: Re(C, ".field-rule-from-page-input")?.value || "",
        toPage: Re(C, ".field-rule-to-page-input")?.value || "",
        page: Re(C, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!Re(C, ".field-rule-exclude-last-input")?.checked,
        excludePages: vt(Re(C, ".field-rule-exclude-pages-input")?.value || ""),
        required: (Ue(C, ".field-rule-required-select")?.value || "1") !== "0"
      }, m);
      Z.type && S.push(Z);
    }), S;
  }
  function we() {
    return me().map((m) => ({
      id: m.id,
      type: m.type,
      participant_id: m.participantId,
      from_page: m.fromPage,
      to_page: m.toPage,
      page: m.page,
      exclude_last_page: m.excludeLastPage,
      exclude_pages: m.excludePages,
      required: m.required
    }));
  }
  function Me(m, u) {
    return Un(m, u);
  }
  function Ie() {
    if (!I) return;
    const m = Me(me(), i()), u = o(), S = new Map(u.map((te) => [String(te.id), te.name]));
    if (g && (g.value = JSON.stringify(we())), !m.length) {
      I.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const C = m.reduce((te, fe) => {
      const O = fe.type;
      return te[O] = (te[O] || 0) + 1, te;
    }, {}), Z = m.slice(0, 8).map((te) => {
      const fe = S.get(String(te.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${te.type === "initials" ? "Initials" : "Signature"} on page ${te.page}</span><span class="text-gray-500">${d(String(fe))}</span></li>`;
    }).join(""), ee = m.length - 8;
    I.innerHTML = `
      <p class="text-gray-700">${m.length} generated field${m.length !== 1 ? "s" : ""} (${C.initials || 0} initials, ${C.signature || 0} signatures)</p>
      <ul class="space-y-1">${Z}</ul>
      ${ee > 0 ? `<p class="text-gray-500">+${ee} more</p>` : ""}
    `;
  }
  function W() {
    X(o()), Ie();
  }
  function ve(m) {
    const u = Ue(m, ".field-rule-type-select"), S = nt(m, ".field-rule-range-start-wrap"), C = nt(m, ".field-rule-range-end-wrap"), Z = nt(m, ".field-rule-page-wrap"), ee = nt(m, ".field-rule-exclude-last-wrap"), te = nt(m, ".field-rule-exclude-pages-wrap"), fe = nt(m, ".field-rule-summary"), O = Re(m, ".field-rule-from-page-input"), Y = Re(m, ".field-rule-to-page-input"), D = Re(m, ".field-rule-page-input"), ue = Re(m, ".field-rule-exclude-last-input"), re = Re(m, ".field-rule-exclude-pages-input");
    if (!u || !S || !C || !Z || !ee || !te || !fe) return;
    const ae = i(), ce = St({
      type: u?.value || "",
      fromPage: O?.value || "",
      toPage: Y?.value || "",
      page: D?.value || "",
      excludeLastPage: !!ue?.checked,
      excludePages: vt(re?.value || ""),
      required: !0
    }, ae), r = ce.fromPage > 0 ? ce.fromPage : 1, s = ce.toPage > 0 ? ce.toPage : ae, c = ce.page > 0 ? ce.page : ce.toPage > 0 ? ce.toPage : ae, R = ce.excludeLastPage, k = ce.excludePages.join(","), A = u?.value === "initials_each_page";
    if (S.classList.toggle("hidden", !A), C.classList.toggle("hidden", !A), ee.classList.toggle("hidden", !A), te.classList.toggle("hidden", !A), Z.classList.toggle("hidden", A), O && (O.value = String(r)), Y && (Y.value = String(s)), D && (D.value = String(c)), re && (re.value = k), ue && (ue.checked = R), A) {
      const H = qn(r, s, ae, R, ce.excludePages), ne = On(H);
      fe.textContent = H.isEmpty ? `Warning: No initials fields will be generated ${ne}.` : `Generates initials fields on ${ne}.`;
    } else fe.textContent = `Generates one signature field on page ${c}.`;
  }
  function q(m = {}) {
    if (!($ instanceof HTMLTemplateElement) || !y) return;
    const u = $.content.cloneNode(!0), S = u.querySelector(".field-rule-entry");
    if (!(S instanceof HTMLElement)) return;
    const C = m.id || V(), Z = N++, ee = i();
    S.setAttribute("data-field-rule-id", C);
    const te = Re(S, ".field-rule-id-input"), fe = Ue(S, ".field-rule-type-select"), O = Ue(S, ".field-rule-participant-select"), Y = Re(S, ".field-rule-from-page-input"), D = Re(S, ".field-rule-to-page-input"), ue = Re(S, ".field-rule-page-input"), re = Ue(S, ".field-rule-required-select"), ae = Re(S, ".field-rule-exclude-last-input"), ce = Re(S, ".field-rule-exclude-pages-input"), r = zt(S, ".remove-field-rule-btn");
    if (!te || !fe || !O || !Y || !D || !ue || !re || !ae || !ce || !r) return;
    te.name = `field_rules[${Z}].id`, te.value = C, fe.name = `field_rules[${Z}].type`, O.name = `field_rules[${Z}].participant_id`, Y.name = `field_rules[${Z}].from_page`, D.name = `field_rules[${Z}].to_page`, ue.name = `field_rules[${Z}].page`, re.name = `field_rules[${Z}].required`, ae.name = `field_rules[${Z}].exclude_last_page`, ce.name = `field_rules[${Z}].exclude_pages`;
    const s = St(m, ee);
    fe.value = s.type || "initials_each_page", ye(O, o(), s.participantId), Y.value = String(s.fromPage > 0 ? s.fromPage : 1), D.value = String(s.toPage > 0 ? s.toPage : ee), ue.value = String(s.page > 0 ? s.page : ee), re.value = s.required ? "1" : "0", ae.checked = s.excludeLastPage, ce.value = s.excludePages.join(",");
    const c = () => {
      ve(S), Ie(), v?.();
    }, R = () => {
      const A = i();
      if (Y) {
        const H = parseInt(Y.value, 10);
        Number.isFinite(H) && (Y.value = String(ct(H, A, 1)));
      }
      if (D) {
        const H = parseInt(D.value, 10);
        Number.isFinite(H) && (D.value = String(ct(H, A, 1)));
      }
      if (ue) {
        const H = parseInt(ue.value, 10);
        Number.isFinite(H) && (ue.value = String(ct(H, A, 1)));
      }
    }, k = () => {
      R(), c();
    };
    fe.addEventListener("change", c), O.addEventListener("change", c), Y.addEventListener("input", k), Y.addEventListener("change", k), D.addEventListener("input", k), D.addEventListener("change", k), ue.addEventListener("input", k), ue.addEventListener("change", k), re.addEventListener("change", c), ae.addEventListener("change", () => {
      const A = i();
      D.value = String(ae.checked ? Math.max(1, A - 1) : A), c();
    }), ce.addEventListener("input", c), r.addEventListener("click", () => {
      S.remove(), ie(), Ie(), v?.();
    }), y.appendChild(u), ve(y.lastElementChild || S), ie(), Ie();
  }
  function Te(m = {}) {
    if (!(B instanceof HTMLTemplateElement) || !M) return;
    const u = B.content.cloneNode(!0), S = u.querySelector(".field-definition-entry");
    if (!(S instanceof HTMLElement)) return;
    const C = String(m.id || J()).trim() || J();
    S.setAttribute("data-field-definition-id", C);
    const Z = Re(S, ".field-definition-id-input"), ee = Ue(S, 'select[name="field_definitions[].type"]'), te = Ue(S, 'select[name="field_definitions[].participant_id"]'), fe = Re(S, 'input[name="field_definitions[].page"]'), O = Re(S, 'input[name="field_definitions[].required"]'), Y = nt(S, ".field-date-signed-info");
    if (!Z || !ee || !te || !fe || !O || !Y) return;
    const D = z++;
    Z.name = `field_instances[${D}].id`, Z.value = C, ee.name = `field_instances[${D}].type`, te.name = `field_instances[${D}].participant_id`, fe.name = `field_instances[${D}].page`, O.name = `field_instances[${D}].required`, m.type && (ee.value = String(m.type)), m.page !== void 0 && (fe.value = String(ct(m.page, i(), 1))), m.required !== void 0 && (O.checked = !!m.required);
    const ue = String(m.participant_id || m.participantId || "").trim();
    ye(te, o(), ue), ee.addEventListener("change", () => {
      ee.value === "date_signed" ? Y.classList.remove("hidden") : Y.classList.add("hidden");
    }), ee.value === "date_signed" && Y.classList.remove("hidden"), zt(S, ".remove-field-definition-btn")?.addEventListener("click", () => {
      S.remove(), le(), f?.();
    });
    const re = Re(S, 'input[name*=".page"]'), ae = () => {
      re && (re.value = String(ct(re.value, i(), 1)));
    };
    ae(), re?.addEventListener("input", ae), re?.addEventListener("change", ae), M.appendChild(u), le();
  }
  function _e() {
    _?.addEventListener("click", () => Te()), p?.addEventListener("click", () => Te()), K?.addEventListener("click", () => q({ to_page: i() })), P?.();
  }
  function oe() {
    const m = [];
    window._initialFieldPlacementsData = m, t.forEach((u) => {
      const S = String(u.id || "").trim();
      if (!S) return;
      const C = String(u.type || "signature").trim() || "signature", Z = String(u.participant_id || u.participantId || "").trim(), ee = Number(u.page || 1) || 1;
      Te({
        id: S,
        type: C,
        participant_id: Z,
        page: ee,
        required: !!u.required
      }), m.push(dt({
        id: S,
        definitionId: S,
        type: C,
        participantId: Z,
        participantName: String(u.participant_name || u.participantName || "").trim(),
        page: ee,
        x: Number(u.x || u.pos_x || 0) || 0,
        y: Number(u.y || u.pos_y || 0) || 0,
        width: Number(u.width || 150) || 150,
        height: Number(u.height || 32) || 32,
        placementSource: String(u.placement_source || u.placementSource || n.MANUAL).trim() || n.MANUAL
      }, m.length));
    }), le(), W(), ie(), Ie();
  }
  function pe() {
    const m = window._initialFieldPlacementsData;
    return Array.isArray(m) ? m.map((u, S) => dt(u, S)) : [];
  }
  function $e() {
    if (!M) return [];
    const m = o(), u = new Map(m.map((O) => [String(O.id), O.name || O.email || "Signer"])), S = [];
    M.querySelectorAll(".field-definition-entry").forEach((O) => {
      const Y = String(O.getAttribute("data-field-definition-id") || "").trim(), D = Ue(O, ".field-type-select"), ue = Ue(O, ".field-participant-select"), re = Re(O, 'input[name*=".page"]'), ae = String(D?.value || "text").trim() || "text", ce = String(ue?.value || "").trim(), r = parseInt(String(re?.value || "1"), 10) || 1;
      S.push({
        definitionId: Y,
        fieldType: ae,
        participantId: ce,
        participantName: u.get(ce) || "Unassigned",
        page: r
      });
    });
    const C = Me(me(), i()), Z = /* @__PURE__ */ new Map();
    C.forEach((O) => {
      const Y = String(O.ruleId || "").trim(), D = String(O.id || "").trim();
      if (Y && D) {
        const ue = Z.get(Y) || [];
        ue.push(D), Z.set(Y, ue);
      }
    });
    let ee = T();
    Z.forEach((O, Y) => {
      if (O.length > 1 && !ee.groups.get(`rule_${Y}`)) {
        const D = Kn(O, `Rule ${Y}`);
        D.id = `rule_${Y}`, ee = Zt(ee, D);
      }
    }), F(ee), C.forEach((O) => {
      const Y = String(O.id || "").trim();
      if (!Y) return;
      const D = String(O.participantId || "").trim(), ue = parseInt(String(O.page || "1"), 10) || 1, re = String(O.ruleId || "").trim();
      S.push({
        definitionId: Y,
        fieldType: String(O.type || "text").trim() || "text",
        participantId: D,
        participantName: u.get(D) || "Unassigned",
        page: ue,
        linkGroupId: re ? `rule_${re}` : void 0
      });
    });
    const te = /* @__PURE__ */ new Set(), fe = S.filter((O) => {
      const Y = String(O.definitionId || "").trim();
      return !Y || te.has(Y) ? !1 : (te.add(Y), !0);
    });
    return fe.sort((O, Y) => O.page !== Y.page ? O.page - Y.page : O.definitionId.localeCompare(Y.definitionId)), fe;
  }
  function je(m) {
    const u = String(m || "").trim();
    if (!u) return null;
    const S = $e().find((C) => String(C.definitionId || "").trim() === u);
    return S ? {
      id: u,
      type: String(S.fieldType || "text").trim() || "text",
      participant_id: String(S.participantId || "").trim(),
      participant_name: String(S.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(S.page || "1"), 10) || 1,
      link_group_id: String(S.linkGroupId || "").trim()
    } : null;
  }
  function ze() {
    if (!M) return [];
    const m = o(), u = /* @__PURE__ */ new Map();
    return m.forEach((S) => u.set(S.id, !1)), M.querySelectorAll(".field-definition-entry").forEach((S) => {
      const C = Ue(S, ".field-type-select"), Z = Ue(S, ".field-participant-select"), ee = Re(S, 'input[name*=".required"]');
      C?.value === "signature" && Z?.value && ee?.checked && u.set(Z.value, !0);
    }), Me(me(), i()).forEach((S) => {
      S.type === "signature" && S.participantId && S.required && u.set(S.participantId, !0);
    }), m.filter((S) => !u.get(S.id));
  }
  function Ne(m) {
    if (!Array.isArray(m) || m.length === 0) return "Each signer requires at least one required signature field.";
    const u = m.map((S) => S?.name?.trim()).filter(Boolean);
    return u.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${u.join(", ")}`;
  }
  function Oe(m) {
    !M || !m?.fieldDefinitions || m.fieldDefinitions.length === 0 || (M.innerHTML = "", z = 0, m.fieldDefinitions.forEach((u) => {
      Te({
        id: u.tempId,
        type: u.type,
        participant_id: u.participantTempId,
        page: u.page,
        required: u.required
      });
    }), le());
  }
  function de(m) {
    !Array.isArray(m?.fieldRules) || m.fieldRules.length === 0 || y && (y.querySelectorAll(".field-rule-entry").forEach((u) => u.remove()), N = 0, m.fieldRules.forEach((u) => {
      q({
        id: u.id,
        type: u.type,
        participantId: u.participantId || u.participantTempId,
        fromPage: u.fromPage,
        toPage: u.toPage,
        page: u.page,
        excludeLastPage: u.excludeLastPage,
        excludePages: u.excludePages,
        required: u.required
      });
    }), ie(), Ie());
  }
  return {
    refs: {
      fieldDefinitionsContainer: M,
      fieldRulesContainer: y,
      addFieldBtn: _,
      fieldPlacementsJSONInput: U,
      fieldRulesJSONInput: g
    },
    bindEvents: _e,
    initialize: oe,
    buildInitialPlacementInstances: pe,
    collectFieldDefinitionsForState: Se,
    collectFieldRulesForState: me,
    collectFieldRulesForForm: we,
    expandRulesForPreview: Me,
    renderFieldRulePreview: Ie,
    updateFieldParticipantOptions: W,
    collectPlacementFieldDefinitions: $e,
    getFieldDefinitionById: je,
    findSignersMissingRequiredSignatureField: ze,
    missingSignatureFieldMessage: Ne,
    restoreFieldDefinitionsFromState: Oe,
    restoreFieldRulesFromState: de
  };
}
function Zn(e) {
  return typeof e == "object" && e !== null && "run" in e;
}
async function Qn(e) {
  return Dt(e);
}
var rt = {
  signature: {
    bg: "bg-blue-500",
    border: "border-blue-500",
    fill: "rgba(59, 130, 246, 0.2)"
  },
  name: {
    bg: "bg-green-500",
    border: "border-green-500",
    fill: "rgba(34, 197, 94, 0.2)"
  },
  date_signed: {
    bg: "bg-purple-500",
    border: "border-purple-500",
    fill: "rgba(168, 85, 247, 0.2)"
  },
  text: {
    bg: "bg-gray-500",
    border: "border-gray-500",
    fill: "rgba(107, 114, 128, 0.2)"
  },
  checkbox: {
    bg: "bg-indigo-500",
    border: "border-indigo-500",
    fill: "rgba(99, 102, 241, 0.2)"
  },
  initials: {
    bg: "bg-orange-500",
    border: "border-orange-500",
    fill: "rgba(249, 115, 22, 0.2)"
  }
}, ft = {
  signature: {
    width: 200,
    height: 50
  },
  name: {
    width: 180,
    height: 30
  },
  date_signed: {
    width: 120,
    height: 30
  },
  text: {
    width: 150,
    height: 30
  },
  checkbox: {
    width: 24,
    height: 24
  },
  initials: {
    width: 80,
    height: 40
  }
};
function ei(e) {
  const { apiBase: t, apiVersionBase: n, documentIdInput: i, fieldPlacementsJSONInput: o, initialFieldInstances: d = [], initialLinkGroupState: f = null, collectPlacementFieldDefinitions: v, getFieldDefinitionById: P, parseAPIError: T, mapUserFacingError: F, showToast: M, escapeHtml: B, onPlacementsChanged: _ } = e, a = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(d) ? d.map((r, s) => dt(r, s)) : [],
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: {
      x: 0,
      y: 0
    },
    uiHandlersBound: !1,
    autoPlaceBound: !1,
    loadRequestVersion: 0,
    linkGroupState: f || bt()
  }, p = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function l(r = "fi") {
    return `${r}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function y(r) {
    return document.querySelector(`.placement-field-item[data-definition-id="${r}"]`);
  }
  function $() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function K(r, s) {
    return r.querySelector(s);
  }
  function x(r, s) {
    return r.querySelector(s);
  }
  function I() {
    return {
      loading: document.getElementById("placement-loading"),
      noDocument: document.getElementById("placement-no-document"),
      fieldsList: document.getElementById("placement-fields-list"),
      viewer: document.getElementById("placement-viewer"),
      canvas: document.getElementById("placement-pdf-canvas"),
      overlays: document.getElementById("placement-overlays-container"),
      canvasContainer: document.getElementById("placement-canvas-container"),
      currentPage: document.getElementById("placement-current-page"),
      totalPages: document.getElementById("placement-total-pages"),
      zoomLevel: document.getElementById("placement-zoom-level"),
      totalFields: document.getElementById("placement-total-fields"),
      placedCount: document.getElementById("placement-placed-count"),
      unplacedCount: document.getElementById("placement-unplaced-count"),
      autoPlaceBtn: document.getElementById("auto-place-btn"),
      policyPreset: document.getElementById("placement-policy-preset"),
      prevBtn: document.getElementById("placement-prev-page"),
      nextBtn: document.getElementById("placement-next-page"),
      zoomIn: document.getElementById("placement-zoom-in"),
      zoomOut: document.getElementById("placement-zoom-out"),
      zoomFit: document.getElementById("placement-zoom-fit"),
      linkBatchActions: document.getElementById("link-batch-actions"),
      linkAllBtn: document.getElementById("link-all-btn"),
      unlinkAllBtn: document.getElementById("unlink-all-btn"),
      fieldInstancesContainer: document.getElementById("field-instances-container")
    };
  }
  function g() {
    return a;
  }
  function U() {
    return a.linkGroupState;
  }
  function G(r) {
    a.linkGroupState = r || bt();
  }
  function z() {
    return a.fieldInstances.map((r, s) => Hn(r, s));
  }
  function N(r = {}) {
    const { silent: s = !1 } = r, c = I();
    c.fieldInstancesContainer && (c.fieldInstancesContainer.innerHTML = "");
    const R = z();
    return o && (o.value = JSON.stringify(R)), s || _?.(), R;
  }
  function J() {
    const r = I(), s = Array.from(document.querySelectorAll(".placement-field-item")), c = s.length, R = new Set(s.map((ne) => String(ne.dataset.definitionId || "").trim()).filter((ne) => ne)), k = /* @__PURE__ */ new Set();
    a.fieldInstances.forEach((ne) => {
      const Ce = String(ne.definitionId || "").trim();
      R.has(Ce) && k.add(Ce);
    });
    const A = k.size, H = Math.max(0, c - A);
    r.totalFields && (r.totalFields.textContent = String(c)), r.placedCount && (r.placedCount.textContent = String(A)), r.unplacedCount && (r.unplacedCount.textContent = String(H));
  }
  function V(r, s = !1) {
    const c = y(r);
    if (!c) return;
    c.classList.add("opacity-50"), c.draggable = !1;
    const R = c.querySelector(".placement-status");
    R && (R.textContent = "Placed", R.classList.remove("text-amber-600"), R.classList.add("text-green-600")), s && c.classList.add("just-linked");
  }
  function he(r) {
    const s = y(r);
    if (!s) return;
    s.classList.remove("opacity-50"), s.draggable = !0;
    const c = s.querySelector(".placement-status");
    c && (c.textContent = "Not placed", c.classList.remove("text-green-600"), c.classList.add("text-amber-600"));
  }
  function ye() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((r) => {
      r.classList.add("linked-flash"), setTimeout(() => {
        r.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function X(r) {
    const s = r === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${r} linked fields`;
    window.toastManager?.info?.(s);
    const c = document.createElement("div");
    c.setAttribute("role", "status"), c.setAttribute("aria-live", "polite"), c.className = "sr-only", c.textContent = s, document.body.appendChild(c), setTimeout(() => c.remove(), 1e3), ye();
  }
  function le(r, s) {
    const c = document.createElement("div");
    c.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", c.dataset.definitionId = r, c.dataset.isLinked = String(s), c.title = s ? "Click to unlink this field" : "Click to re-link this field", c.setAttribute("role", "button"), c.setAttribute("aria-label", s ? "Unlink field from group" : "Re-link field to group"), c.setAttribute("tabindex", "0"), s ? c.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : c.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const R = () => Ie(r, s);
    return c.addEventListener("click", R), c.addEventListener("keydown", (k) => {
      (k.key === "Enter" || k.key === " ") && (k.preventDefault(), R());
    }), c;
  }
  function ie() {
    const r = I();
    if (r.linkAllBtn && (r.linkAllBtn.disabled = a.linkGroupState.unlinkedDefinitions.size === 0), r.unlinkAllBtn) {
      let s = !1;
      for (const c of a.linkGroupState.definitionToGroup.keys()) if (!a.linkGroupState.unlinkedDefinitions.has(c)) {
        s = !0;
        break;
      }
      r.unlinkAllBtn.disabled = !s;
    }
  }
  function Se() {
    const r = I();
    r.linkAllBtn && !r.linkAllBtn.dataset.bound && (r.linkAllBtn.dataset.bound = "true", r.linkAllBtn.addEventListener("click", () => {
      const s = a.linkGroupState.unlinkedDefinitions.size;
      if (s !== 0) {
        for (const c of a.linkGroupState.unlinkedDefinitions) a.linkGroupState = $t(a.linkGroupState, c);
        window.toastManager && window.toastManager.success(`Re-linked ${s} field${s > 1 ? "s" : ""}`), Me();
      }
    })), r.unlinkAllBtn && !r.unlinkAllBtn.dataset.bound && (r.unlinkAllBtn.dataset.bound = "true", r.unlinkAllBtn.addEventListener("click", () => {
      let s = 0;
      for (const c of a.linkGroupState.definitionToGroup.keys()) a.linkGroupState.unlinkedDefinitions.has(c) || (a.linkGroupState = Bt(a.linkGroupState, c), s += 1);
      s > 0 && window.toastManager && window.toastManager.success(`Unlinked ${s} field${s > 1 ? "s" : ""}`), Me();
    })), ie();
  }
  function me() {
    return v().map((r) => {
      const s = String(r.definitionId || "").trim(), c = a.linkGroupState.definitionToGroup.get(s) || "", R = a.linkGroupState.unlinkedDefinitions.has(s);
      return {
        ...r,
        definitionId: s,
        linkGroupId: c,
        isUnlinked: R
      };
    });
  }
  function we() {
    const r = I();
    if (!r.fieldsList) return;
    r.fieldsList.innerHTML = "";
    const s = me();
    r.linkBatchActions && r.linkBatchActions.classList.toggle("hidden", a.linkGroupState.groups.size === 0), s.forEach((c, R) => {
      const k = c.definitionId, A = String(c.fieldType || "text").trim() || "text", H = String(c.participantId || "").trim(), ne = String(c.participantName || "Unassigned").trim() || "Unassigned", Ce = Number.parseInt(String(c.page || "1"), 10) || 1, ge = c.linkGroupId, Ee = c.isUnlinked;
      if (!k) return;
      a.fieldInstances.forEach((b) => {
        b.definitionId === k && (b.type = A, b.participantId = H, b.participantName = ne);
      });
      const We = rt[A] || rt.text, Ke = a.fieldInstances.some((b) => b.definitionId === k), xe = document.createElement("div");
      xe.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${Ke ? "opacity-50" : ""}`, xe.draggable = !Ke, xe.dataset.definitionId = k, xe.dataset.fieldType = A, xe.dataset.participantId = H, xe.dataset.participantName = ne, xe.dataset.page = String(Ce), ge && (xe.dataset.linkGroupId = ge);
      const h = document.createElement("span");
      h.className = `w-3 h-3 rounded ${We.bg}`;
      const w = document.createElement("div");
      w.className = "flex-1 text-xs";
      const E = document.createElement("div");
      E.className = "font-medium capitalize", E.textContent = A.replace(/_/g, " ");
      const L = document.createElement("div");
      L.className = "text-gray-500", L.textContent = ne;
      const j = document.createElement("span");
      j.className = `placement-status text-xs ${Ke ? "text-green-600" : "text-amber-600"}`, j.textContent = Ke ? "Placed" : "Not placed", w.appendChild(E), w.appendChild(L), xe.appendChild(h), xe.appendChild(w), xe.appendChild(j), xe.addEventListener("dragstart", (b) => {
        if (Ke) {
          b.preventDefault();
          return;
        }
        b.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: k,
          fieldType: A,
          participantId: H,
          participantName: ne
        })), b.dataTransfer && (b.dataTransfer.effectAllowed = "copy"), xe.classList.add("opacity-50");
      }), xe.addEventListener("dragend", () => {
        xe.classList.remove("opacity-50");
      }), r.fieldsList?.appendChild(xe);
      const Q = s[R + 1];
      ge && Q && Q.linkGroupId === ge && r.fieldsList?.appendChild(le(k, !Ee));
    }), Se(), J();
  }
  function Me() {
    we();
  }
  function Ie(r, s) {
    s ? (a.linkGroupState = Bt(a.linkGroupState, r), window.toastManager?.info?.("Field unlinked")) : (a.linkGroupState = $t(a.linkGroupState, r), window.toastManager?.info?.("Field re-linked")), Me();
  }
  async function W(r) {
    const s = a.pdfDoc;
    if (!s) return;
    const c = I();
    if (!c.canvas || !c.canvasContainer) return;
    const R = c.canvas.getContext("2d"), k = await s.getPage(r), A = k.getViewport({ scale: a.scale });
    c.canvas.width = A.width, c.canvas.height = A.height, c.canvasContainer.style.width = `${A.width}px`, c.canvasContainer.style.height = `${A.height}px`, await k.render({
      canvasContext: R,
      viewport: A
    }).promise, c.currentPage && (c.currentPage.textContent = String(r)), _e();
  }
  function ve(r) {
    const s = Yn(a.linkGroupState, r);
    s && (a.linkGroupState = Zt(a.linkGroupState, s.updatedGroup));
  }
  function q(r) {
    const s = /* @__PURE__ */ new Map();
    v().forEach((R) => {
      const k = String(R.definitionId || "").trim();
      k && s.set(k, {
        type: String(R.fieldType || "text").trim() || "text",
        participantId: String(R.participantId || "").trim(),
        participantName: String(R.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(R.page || "1"), 10) || 1,
        linkGroupId: a.linkGroupState.definitionToGroup.get(k)
      });
    });
    let c = 0;
    for (; c < 10; ) {
      const R = Jn(a.linkGroupState, r, a.fieldInstances, s);
      if (!R || !R.newPlacement) break;
      a.fieldInstances.push(R.newPlacement), V(R.newPlacement.definitionId, !0), c += 1;
    }
    c > 0 && (_e(), J(), N(), X(c));
  }
  function Te(r) {
    ve(r);
  }
  function _e() {
    const r = I().overlays;
    r && (r.innerHTML = "", r.style.pointerEvents = "auto", a.fieldInstances.filter((s) => s.page === a.currentPage).forEach((s) => {
      const c = rt[s.type] || rt.text, R = a.selectedFieldId === s.id, k = s.placementSource === He.AUTO_LINKED, A = document.createElement("div"), H = k ? "border-dashed" : "border-solid";
      A.className = `field-overlay absolute cursor-move ${c.border} border-2 ${H} rounded`, A.style.cssText = `
          left: ${s.x * a.scale}px;
          top: ${s.y * a.scale}px;
          width: ${s.width * a.scale}px;
          height: ${s.height * a.scale}px;
          background-color: ${c.fill};
          ${R ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, A.dataset.instanceId = s.id;
      const ne = document.createElement("div");
      if (ne.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${c.bg}`, ne.textContent = `${s.type.replace("_", " ")} - ${s.participantName}`, A.appendChild(ne), k) {
        const Ee = document.createElement("div");
        Ee.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", Ee.title = "Auto-linked from template", Ee.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, A.appendChild(Ee);
      }
      const Ce = document.createElement("div");
      Ce.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", Ce.style.cssText = "transform: translate(50%, 50%);", A.appendChild(Ce);
      const ge = document.createElement("button");
      ge.type = "button", ge.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", ge.innerHTML = "×", ge.addEventListener("click", (Ee) => {
        Ee.stopPropagation(), ze(s.id);
      }), A.appendChild(ge), A.addEventListener("mousedown", (Ee) => {
        Ee.target === Ce ? je(Ee, s) : Ee.target !== ge && $e(Ee, s, A);
      }), A.addEventListener("click", () => {
        a.selectedFieldId = s.id, _e();
      }), r.appendChild(A);
    }));
  }
  function oe(r, s, c, R = {}) {
    const k = ft[r.fieldType] || ft.text, A = R.placementSource || He.MANUAL, H = R.linkGroupId || Qt(a.linkGroupState, r.definitionId)?.id, ne = {
      id: l("fi"),
      definitionId: r.definitionId,
      type: r.fieldType,
      participantId: r.participantId,
      participantName: r.participantName,
      page: a.currentPage,
      x: Math.max(0, s - k.width / 2),
      y: Math.max(0, c - k.height / 2),
      width: k.width,
      height: k.height,
      placementSource: A,
      linkGroupId: H,
      linkedFromFieldId: R.linkedFromFieldId
    };
    a.fieldInstances.push(ne), V(r.definitionId), A === He.MANUAL && H && Te(ne), _e(), J(), N();
  }
  function pe(r, s) {
    const c = {
      id: l("instance"),
      definitionId: r.definitionId,
      type: r.fieldType,
      participantId: r.participantId,
      participantName: r.participantName,
      page: s.page_number,
      x: s.x,
      y: s.y,
      width: s.width,
      height: s.height,
      placementSource: He.AUTO,
      resolverId: s.resolver_id,
      confidence: s.confidence,
      placementRunId: p.currentRunId
    };
    a.fieldInstances.push(c), V(r.definitionId), _e(), J(), N();
  }
  function $e(r, s, c) {
    r.preventDefault(), a.isDragging = !0, a.selectedFieldId = s.id;
    const R = r.clientX, k = r.clientY, A = s.x * a.scale, H = s.y * a.scale;
    function ne(ge) {
      const Ee = ge.clientX - R, We = ge.clientY - k;
      s.x = Math.max(0, (A + Ee) / a.scale), s.y = Math.max(0, (H + We) / a.scale), s.placementSource = He.MANUAL, c.style.left = `${s.x * a.scale}px`, c.style.top = `${s.y * a.scale}px`;
    }
    function Ce() {
      a.isDragging = !1, document.removeEventListener("mousemove", ne), document.removeEventListener("mouseup", Ce), N();
    }
    document.addEventListener("mousemove", ne), document.addEventListener("mouseup", Ce);
  }
  function je(r, s) {
    r.preventDefault(), r.stopPropagation(), a.isResizing = !0;
    const c = r.clientX, R = r.clientY, k = s.width, A = s.height;
    function H(Ce) {
      const ge = (Ce.clientX - c) / a.scale, Ee = (Ce.clientY - R) / a.scale;
      s.width = Math.max(30, k + ge), s.height = Math.max(20, A + Ee), s.placementSource = He.MANUAL, _e();
    }
    function ne() {
      a.isResizing = !1, document.removeEventListener("mousemove", H), document.removeEventListener("mouseup", ne), N();
    }
    document.addEventListener("mousemove", H), document.addEventListener("mouseup", ne);
  }
  function ze(r) {
    const s = a.fieldInstances.find((c) => c.id === r);
    s && (a.fieldInstances = a.fieldInstances.filter((c) => c.id !== r), he(s.definitionId), _e(), J(), N());
  }
  function Ne(r, s) {
    const c = I().canvas;
    !r || !c || (r.addEventListener("dragover", (R) => {
      R.preventDefault(), R.dataTransfer && (R.dataTransfer.dropEffect = "copy"), c.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), r.addEventListener("dragleave", () => {
      c.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), r.addEventListener("drop", (R) => {
      R.preventDefault(), c.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const k = R.dataTransfer?.getData("application/json") || "";
      if (!k) return;
      const A = Wt(k, null);
      if (!A) return;
      const H = c.getBoundingClientRect();
      oe(A, (R.clientX - H.left) / a.scale, (R.clientY - H.top) / a.scale);
    }));
  }
  function Oe() {
    const r = I();
    r.prevBtn?.addEventListener("click", async () => {
      a.currentPage > 1 && (a.currentPage -= 1, q(a.currentPage), await W(a.currentPage));
    }), r.nextBtn?.addEventListener("click", async () => {
      a.currentPage < a.totalPages && (a.currentPage += 1, q(a.currentPage), await W(a.currentPage));
    });
  }
  function de() {
    const r = I();
    r.zoomIn?.addEventListener("click", async () => {
      a.scale = Math.min(3, a.scale + 0.25), r.zoomLevel && (r.zoomLevel.textContent = `${Math.round(a.scale * 100)}%`), await W(a.currentPage);
    }), r.zoomOut?.addEventListener("click", async () => {
      a.scale = Math.max(0.5, a.scale - 0.25), r.zoomLevel && (r.zoomLevel.textContent = `${Math.round(a.scale * 100)}%`), await W(a.currentPage);
    }), r.zoomFit?.addEventListener("click", async () => {
      if (!a.pdfDoc || !r.viewer) return;
      const s = (await a.pdfDoc.getPage(a.currentPage)).getViewport({ scale: 1 });
      a.scale = (r.viewer.clientWidth - 40) / s.width, r.zoomLevel && (r.zoomLevel.textContent = `${Math.round(a.scale * 100)}%`), await W(a.currentPage);
    });
  }
  function m() {
    return I().policyPreset?.value || "balanced";
  }
  function u(r) {
    return r >= 0.8 ? "bg-green-100 text-green-800" : r >= 0.6 ? "bg-blue-100 text-blue-800" : r >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function S(r) {
    return r >= 0.9 ? "bg-green-100 text-green-800" : r >= 0.7 ? "bg-blue-100 text-blue-800" : r >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function C(r) {
    return r ? r.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") : "Unknown";
  }
  function Z(r) {
    r.page_number !== a.currentPage && (a.currentPage = r.page_number, W(r.page_number));
    const s = I().overlays;
    if (!s) return;
    document.getElementById("suggestion-preview-overlay")?.remove();
    const c = document.createElement("div");
    c.id = "suggestion-preview-overlay", c.className = "absolute pointer-events-none animate-pulse", c.style.cssText = `
      left: ${r.x * a.scale}px;
      top: ${r.y * a.scale}px;
      width: ${r.width * a.scale}px;
      height: ${r.height * a.scale}px;
      border: 3px dashed #3b82f6;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
    `, s.appendChild(c), setTimeout(() => c.remove(), 3e3);
  }
  async function ee(r, s) {
  }
  function te() {
    const r = document.getElementById("placement-suggestions-modal");
    if (!r) return;
    const s = r.querySelectorAll('.suggestion-item[data-accepted="true"]');
    s.forEach((c) => {
      const R = Number.parseInt(c.dataset.index || "", 10), k = p.suggestions[R];
      if (!k) return;
      const A = P(k.field_definition_id);
      if (!A) return;
      const H = y(k.field_definition_id);
      if (!H || H.classList.contains("opacity-50")) return;
      const ne = {
        definitionId: k.field_definition_id,
        fieldType: A.type,
        participantId: A.participant_id,
        participantName: H.dataset.participantName || A.participant_name || "Unassigned"
      };
      a.currentPage = k.page_number, pe(ne, k);
    }), a.pdfDoc && W(a.currentPage), ee(s.length, p.suggestions.length - s.length), M(`Applied ${s.length} placement${s.length !== 1 ? "s" : ""}`, "success");
  }
  function fe(r) {
    r.querySelectorAll(".accept-suggestion-btn").forEach((s) => {
      s.addEventListener("click", () => {
        const c = s.closest(".suggestion-item");
        c && (c.classList.add("border-green-500", "bg-green-50"), c.classList.remove("border-red-500", "bg-red-50"), c.dataset.accepted = "true");
      });
    }), r.querySelectorAll(".reject-suggestion-btn").forEach((s) => {
      s.addEventListener("click", () => {
        const c = s.closest(".suggestion-item");
        c && (c.classList.add("border-red-500", "bg-red-50"), c.classList.remove("border-green-500", "bg-green-50"), c.dataset.accepted = "false");
      });
    }), r.querySelectorAll(".preview-suggestion-btn").forEach((s) => {
      s.addEventListener("click", () => {
        const c = Number.parseInt(s.dataset.index || "", 10), R = p.suggestions[c];
        R && Z(R);
      });
    });
  }
  function O() {
    const r = document.createElement("div");
    return r.id = "placement-suggestions-modal", r.className = "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 hidden", r.innerHTML = `
      <div class="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900">Smart Placement Suggestions</h2>
            <p class="text-sm text-gray-500 mt-0.5">Review and apply AI-generated field placements</p>
          </div>
          <button type="button" id="close-suggestions-modal" class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div id="run-stats"></div>
            <div class="flex items-center gap-2">
              <button type="button" id="accept-all-btn" class="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors">
                Accept All
              </button>
              <button type="button" id="reject-all-btn" class="px-3 py-1.5 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 transition-colors">
                Reject All
              </button>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div class="grid grid-cols-2 gap-4 p-6">
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Suggestions</h3>
              <div id="suggestions-list" class="space-y-3"></div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-gray-700 mb-3">Resolver Ranking</h3>
              <div id="resolver-info" class="bg-gray-50 rounded-lg p-3"></div>

              <h3 class="text-sm font-medium text-gray-700 mt-4 mb-3">Policy Preset</h3>
              <select id="placement-policy-preset-modal" class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                <option value="balanced">Balanced (Recommended)</option>
                <option value="accuracy-first">Accuracy First</option>
                <option value="cost-first">Cost Optimized</option>
                <option value="speed-first">Speed Optimized</option>
              </select>
              <p class="text-xs text-gray-500 mt-1">Change preset and re-run for different results</p>
            </div>
          </div>
        </div>

        <div class="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" id="rerun-placement-btn" class="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Re-run with New Policy
          </button>
          <button type="button" id="apply-suggestions-btn" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Apply Selected
          </button>
        </div>
      </div>
    `, K(r, "#close-suggestions-modal")?.addEventListener("click", () => {
      r.classList.add("hidden");
    }), r.addEventListener("click", (s) => {
      s.target === r && r.classList.add("hidden");
    }), K(r, "#accept-all-btn")?.addEventListener("click", () => {
      r.querySelectorAll(".suggestion-item").forEach((s) => {
        s.classList.add("border-green-500", "bg-green-50"), s.classList.remove("border-red-500", "bg-red-50"), s.dataset.accepted = "true";
      });
    }), K(r, "#reject-all-btn")?.addEventListener("click", () => {
      r.querySelectorAll(".suggestion-item").forEach((s) => {
        s.classList.add("border-red-500", "bg-red-50"), s.classList.remove("border-green-500", "bg-green-50"), s.dataset.accepted = "false";
      });
    }), K(r, "#apply-suggestions-btn")?.addEventListener("click", () => {
      te(), r.classList.add("hidden");
    }), K(r, "#rerun-placement-btn")?.addEventListener("click", () => {
      r.classList.add("hidden");
      const s = x(r, "#placement-policy-preset-modal"), c = I().policyPreset;
      c && s && (c.value = s.value), I().autoPlaceBtn?.click();
    }), r;
  }
  function Y(r) {
    let s = document.getElementById("placement-suggestions-modal");
    s || (s = O(), document.body.appendChild(s));
    const c = x(s, "#suggestions-list"), R = x(s, "#resolver-info"), k = x(s, "#run-stats");
    !c || !R || !k || (R.innerHTML = p.resolverScores.map((A) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${B(String(A?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${A.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${u(Number(A.score || 0))}">
              ${(Number(A?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), k.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${B(String(r?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${r.status === "completed" ? "text-green-600" : "text-amber-600"}">${B(String(r?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(r?.elapsed_ms || 0))}ms</span>
      </div>
    `, c.innerHTML = p.suggestions.map((A, H) => {
      const ne = P(A.field_definition_id), Ce = rt[ne?.type || "text"] || rt.text, ge = B(String(ne?.type || "field").replace(/_/g, " ")), Ee = B(String(A?.id || "")), We = Math.max(1, Number(A?.page_number || 1)), Ke = Math.round(Number(A?.x || 0)), xe = Math.round(Number(A?.y || 0)), h = Math.max(0, Number(A?.confidence || 0)), w = B(C(String(A?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${H}" data-suggestion-id="${Ee}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${Ce.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${ge}</div>
                <div class="text-xs text-gray-500">Page ${We}, (${Ke}, ${xe})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${S(Number(A.confidence || 0))}">
                ${(h * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${w}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${H}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${H}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${H}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join(""), fe(s), s.classList.remove("hidden"));
  }
  function D() {
    const r = $();
    let s = 100;
    r.forEach((c) => {
      const R = {
        definitionId: c.dataset.definitionId || "",
        fieldType: c.dataset.fieldType || "text",
        participantId: c.dataset.participantId || "",
        participantName: c.dataset.participantName || "Unassigned"
      }, k = ft[R.fieldType || "text"] || ft.text;
      a.currentPage = a.totalPages, oe(R, 300, s + k.height / 2, { placementSource: He.AUTO_FALLBACK }), s += k.height + 20;
    }), a.pdfDoc && W(a.totalPages), M("Fields placed using fallback layout", "info");
  }
  async function ue() {
    const r = I();
    if (!r.autoPlaceBtn || p.isRunning) return;
    if ($().length === 0) {
      M("All fields are already placed", "info");
      return;
    }
    const s = document.querySelector('input[name="id"]')?.value;
    if (!s) {
      D();
      return;
    }
    p.isRunning = !0, r.autoPlaceBtn.disabled = !0, r.autoPlaceBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Analyzing...
    `;
    try {
      const c = await Gt(`${n}/esign/agreements/${s}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ policy_preset: m() })
      });
      if (!c.ok) throw await T(c, "Auto-placement failed");
      const R = await Qn(c), k = Zn(R) ? R.run || {} : R;
      p.currentRunId = k?.run_id || k?.id || null, p.suggestions = k?.suggestions || [], p.resolverScores = k?.resolver_scores || [], p.suggestions.length === 0 ? (M("No placement suggestions found. Try placing fields manually.", "warning"), D()) : Y(k);
    } catch (c) {
      console.error("Auto-place error:", c);
      const R = c && typeof c == "object" ? c : {};
      M(`Auto-placement failed: ${F(R.message || "Auto-placement failed", R.code || "", R.status || 0)}`, "error"), D();
    } finally {
      p.isRunning = !1, r.autoPlaceBtn.disabled = !1, r.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function re() {
    const r = I();
    r.autoPlaceBtn && !a.autoPlaceBound && (r.autoPlaceBtn.addEventListener("click", () => {
      ue();
    }), a.autoPlaceBound = !0);
  }
  async function ae() {
    const r = I();
    if (!i?.value) {
      r.loading?.classList.add("hidden"), r.noDocument?.classList.remove("hidden");
      return;
    }
    r.loading?.classList.remove("hidden"), r.noDocument?.classList.add("hidden");
    const s = v(), c = new Set(s.map((H) => String(H.definitionId || "").trim()).filter((H) => H));
    a.fieldInstances = a.fieldInstances.filter((H) => c.has(String(H.definitionId || "").trim())), we();
    const R = ++a.loadRequestVersion, k = String(i.value || "").trim(), A = `${t}/panels/esign_documents/${encodeURIComponent(k)}/source/pdf`;
    try {
      const H = await Kt({
        url: A,
        withCredentials: !0,
        surface: "agreement-placement-editor",
        documentId: k
      }).promise;
      if (R !== a.loadRequestVersion) return;
      a.pdfDoc = H, a.totalPages = a.pdfDoc.numPages, a.currentPage = 1, r.totalPages && (r.totalPages.textContent = String(a.totalPages)), await W(a.currentPage), r.loading?.classList.add("hidden"), a.uiHandlersBound || (Ne(r.viewer, r.overlays), Oe(), de(), a.uiHandlersBound = !0), _e();
    } catch (H) {
      if (R !== a.loadRequestVersion) return;
      const ne = Vt(H, {
        surface: "agreement-placement-editor",
        documentId: k,
        url: A
      });
      r.loading?.classList.add("hidden"), r.noDocument?.classList.remove("hidden"), r.noDocument && (r.noDocument.textContent = `Failed to load PDF: ${F(ne.message, ne.code, ne.status || void 0)}`);
    }
    J(), N({ silent: !0 });
  }
  function ce(r) {
    a.fieldInstances = (Array.isArray(r?.fieldPlacements) ? r.fieldPlacements : []).map((s, c) => dt(s, c)), N({ silent: !0 });
  }
  return N({ silent: !0 }), {
    bindEvents: re,
    initPlacementEditor: ae,
    getState: g,
    getLinkGroupState: U,
    setLinkGroupState: G,
    buildPlacementFormEntries: z,
    updateFieldInstancesFormData: N,
    restoreFieldPlacementsFromState: ce
  };
}
function st(e, t = !1) {
  return typeof e == "boolean" ? e : t;
}
function Ut(e) {
  const t = Array.isArray(e?.participants) ? e?.participants : [];
  return {
    enabled: !!e?.enabled,
    gate: String(e?.gate || "approve_before_send").trim() || "approve_before_send",
    commentsEnabled: !!e?.commentsEnabled,
    participants: t.map((n) => ({
      participantType: String(n?.participantType || "").trim() || "recipient",
      participantTempId: String(n?.participantTempId || "").trim() || void 0,
      recipientTempId: String(n?.recipientTempId || "").trim() || void 0,
      recipientId: String(n?.recipientId || "").trim() || void 0,
      email: String(n?.email || "").trim() || void 0,
      displayName: String(n?.displayName || "").trim() || void 0,
      canComment: st(n?.canComment, !0),
      canApprove: st(n?.canApprove, !0)
    }))
  };
}
function ti(e) {
  const { getSignerParticipants: t, setPrimaryActionLabel: n, onChanged: i } = e, o = document.getElementById("agreement-review-mode-send"), d = document.getElementById("agreement-review-mode-start"), f = document.getElementById("agreement-start-review-config"), v = document.getElementById("agreement-review-gate"), P = document.getElementById("agreement-review-comments-enabled"), T = document.getElementById("agreement-review-recipient-reviewers"), F = document.getElementById("agreement-review-external-reviewers"), M = document.getElementById("agreement-review-external-reviewers-empty"), B = document.getElementById("agreement-review-external-reviewer-template"), _ = document.getElementById("agreement-add-external-reviewer-btn");
  function a() {
    return d instanceof HTMLInputElement ? d.checked : !1;
  }
  function p() {
    n(a() ? "Start Review" : "Send for Signature");
  }
  function l() {
    const G = !!F?.querySelector("[data-review-external-row]");
    M?.classList.toggle("hidden", G);
  }
  function y() {
    f?.classList.toggle("hidden", !a()), p();
  }
  function $(G) {
    if (!(B instanceof HTMLTemplateElement) || !F) return;
    const z = B.content.cloneNode(!0), N = z.querySelector("[data-review-external-row]");
    if (!N) return;
    const J = N.querySelector("[data-review-external-name]"), V = N.querySelector("[data-review-external-email]"), he = N.querySelector("[data-review-external-comment]"), ye = N.querySelector("[data-review-external-approve]");
    J && (J.value = String(G?.displayName || "").trim()), V && (V.value = String(G?.email || "").trim()), he && (he.checked = st(G?.canComment, !0)), ye && (ye.checked = st(G?.canApprove, !0)), F.appendChild(z), l();
  }
  function K() {
    const G = [];
    T?.querySelectorAll("[data-review-recipient-row]").forEach((N) => {
      N.querySelector("[data-review-recipient-enabled]")?.checked && G.push({
        participantType: "recipient",
        participantTempId: String(N.dataset.participantTempId || "").trim() || void 0,
        recipientTempId: String(N.dataset.participantTempId || "").trim() || void 0,
        email: String(N.dataset.email || "").trim() || void 0,
        displayName: String(N.dataset.name || "").trim() || void 0,
        canComment: N.querySelector("[data-review-recipient-comment]")?.checked !== !1,
        canApprove: N.querySelector("[data-review-recipient-approve]")?.checked !== !1
      });
    });
    const z = [];
    return F?.querySelectorAll("[data-review-external-row]").forEach((N) => {
      const J = String(N.querySelector("[data-review-external-email]")?.value || "").trim();
      J !== "" && z.push({
        participantType: "external",
        email: J,
        displayName: String(N.querySelector("[data-review-external-name]")?.value || "").trim() || void 0,
        canComment: N.querySelector("[data-review-external-comment]")?.checked !== !1,
        canApprove: N.querySelector("[data-review-external-approve]")?.checked !== !1
      });
    }), {
      enabled: a(),
      gate: String(v instanceof HTMLSelectElement ? v.value : "approve_before_send").trim() || "approve_before_send",
      commentsEnabled: P instanceof HTMLInputElement ? P.checked : !1,
      participants: [...G, ...z]
    };
  }
  function x(G) {
    if (!T) return;
    const z = Ut(G), N = /* @__PURE__ */ new Map();
    z.participants.filter((J) => String(J.participantType || "").trim() === "recipient").forEach((J) => {
      const V = String(J.participantTempId || J.recipientTempId || J.recipientId || "").trim();
      V !== "" && N.set(V, J);
    }), T.innerHTML = t().map((J) => {
      const V = String(J.id || "").trim(), he = N.get(V), ye = !!he, X = he ? st(he.canComment, !0) : !0, le = he ? st(he.canApprove, !0) : !0;
      return `
        <div class="rounded-lg border border-gray-200 bg-white p-3" data-review-recipient-row data-participant-temp-id="${Be(V)}" data-email="${Be(J.email)}" data-name="${Be(J.name)}">
          <div class="flex items-start justify-between gap-3">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" data-review-recipient-enabled ${ye ? "checked" : ""}>
              <span>
                <span class="block text-sm font-medium text-gray-900">${Be(J.name || J.email || "Signer")}</span>
                <span class="block text-xs text-gray-500">${Be(J.email)}</span>
              </span>
            </label>
            <div class="flex flex-col gap-1.5 text-xs">
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to add comments">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-comment ${X ? "checked" : ""}>
                <span class="text-gray-600">Comment</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to approve or request changes">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-approve ${le ? "checked" : ""}>
                <span class="text-gray-600">Approve</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
  function I() {
    x(K());
  }
  function g(G) {
    const z = Ut(G?.review);
    o instanceof HTMLInputElement && (o.checked = !z.enabled), d instanceof HTMLInputElement && (d.checked = z.enabled), v instanceof HTMLSelectElement && (v.value = z.gate), P instanceof HTMLInputElement && (P.checked = z.commentsEnabled), x(z), F && (F.innerHTML = "", z.participants.filter((N) => String(N.participantType || "").trim() === "external").forEach((N) => $(N)), l()), y();
  }
  function U() {
    [o, d].forEach((G) => {
      G?.addEventListener("change", () => {
        y(), i?.();
      });
    }), v?.addEventListener("change", () => i?.()), P?.addEventListener("change", () => i?.()), T?.addEventListener("change", () => i?.()), F?.addEventListener("input", () => i?.()), F?.addEventListener("change", () => i?.()), F?.addEventListener("click", (G) => {
      const z = G.target;
      !(z instanceof HTMLElement) || !z.matches("[data-review-external-remove]") || (z.closest("[data-review-external-row]")?.remove(), l(), i?.());
    }), _?.addEventListener("click", () => {
      $(), i?.();
    }), y(), l();
  }
  return {
    bindEvents: U,
    collectReviewConfigForState: K,
    restoreFromState: g,
    refreshRecipientReviewers: I,
    isStartReviewEnabled: a
  };
}
function it(e, t, n = "") {
  return String(e.querySelector(t)?.value || n).trim();
}
function qt(e, t, n = !1) {
  const i = e.querySelector(t);
  return i ? i.checked : n;
}
function ni(e) {
  const { documentIdInput: t, documentPageCountInput: n, titleInput: i, messageInput: o, participantsContainer: d, fieldDefinitionsContainer: f, fieldPlacementsJSONInput: v, fieldRulesJSONInput: P, collectFieldRulesForForm: T, buildPlacementFormEntries: F, getCurrentStep: M, totalWizardSteps: B } = e;
  function _() {
    const a = [];
    d.querySelectorAll(".participant-entry").forEach(($) => {
      const K = String($.getAttribute("data-participant-id") || "").trim(), x = it($, 'input[name*=".name"]'), I = it($, 'input[name*=".email"]'), g = it($, 'select[name*=".role"]', "signer"), U = qt($, ".notify-input", !0), G = it($, ".signing-stage-input"), z = Number(G || "1") || 1;
      a.push({
        id: K,
        name: x,
        email: I,
        role: g,
        notify: U,
        signing_stage: g === "signer" ? z : 0
      });
    });
    const p = [];
    f.querySelectorAll(".field-definition-entry").forEach(($) => {
      const K = String($.getAttribute("data-field-definition-id") || "").trim(), x = it($, ".field-type-select", "signature"), I = it($, ".field-participant-select"), g = Number(it($, 'input[name*=".page"]', "1")) || 1, U = qt($, 'input[name*=".required"]');
      K && p.push({
        id: K,
        type: x,
        participant_id: I,
        page: g,
        required: U
      });
    });
    const l = F(), y = JSON.stringify(l);
    return v && (v.value = y), {
      document_id: String(t?.value || "").trim(),
      title: String(i?.value || "").trim(),
      message: String(o?.value || "").trim(),
      participants: a,
      field_instances: p,
      field_placements: l,
      field_placements_json: y,
      field_rules: T(),
      field_rules_json: String(P?.value || "[]"),
      send_for_signature: M() === B ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(n?.value || "0") || 0
    };
  }
  return { buildCanonicalAgreementPayload: _ };
}
function ii(e) {
  const { titleSource: t, stateManager: n, trackWizardStateChanges: i, participantsController: o, fieldDefinitionsController: d, placementController: f, reviewConfigController: v, updateFieldParticipantOptions: P, previewCard: T, wizardNavigationController: F, documentIdInput: M, documentPageCountInput: B, selectedDocumentTitle: _, agreementRefs: a, parsePositiveInt: p, isEditMode: l } = e;
  let y = null, $ = !1;
  function K(X) {
    $ = !0;
    try {
      return X();
    } finally {
      $ = !1;
    }
  }
  function x(X) {
    const le = X?.document, ie = document.getElementById("selected-document"), Se = document.getElementById("document-picker"), me = document.getElementById("selected-document-info");
    if (M.value = String(le?.id || "").trim(), B) {
      const we = p(le?.pageCount, 0) || 0;
      B.value = we > 0 ? String(we) : "";
    }
    if (_ && (_.textContent = String(le?.title || "").trim()), me instanceof HTMLElement) {
      const we = p(le?.pageCount, 0) || 0;
      me.textContent = we > 0 ? `${we} pages` : "";
    }
    if (M.value) {
      ie?.classList.remove("hidden"), Se?.classList.add("hidden");
      return;
    }
    ie?.classList.add("hidden"), Se?.classList.remove("hidden");
  }
  function I(X) {
    a.form.titleInput.value = String(X?.details?.title || ""), a.form.messageInput.value = String(X?.details?.message || "");
  }
  function g() {
    $ || (y !== null && clearTimeout(y), y = setTimeout(() => {
      i();
    }, 500));
  }
  function U(X) {
    o.restoreFromState(X);
  }
  function G(X) {
    d.restoreFieldDefinitionsFromState(X);
  }
  function z(X) {
    d.restoreFieldRulesFromState(X);
  }
  function N(X) {
    f.restoreFieldPlacementsFromState(X);
  }
  function J(X) {
    v?.restoreFromState?.(X);
  }
  function V() {
    M && new MutationObserver(() => {
      $ || i();
    }).observe(M, {
      attributes: !0,
      attributeFilter: ["value"]
    });
    const X = document.getElementById("title"), le = document.getElementById("message");
    X instanceof HTMLInputElement && X.addEventListener("input", () => {
      const ie = String(X.value || "").trim() === "" ? t.AUTOFILL : t.USER;
      n.setTitleSource(ie), g();
    }), (le instanceof HTMLInputElement || le instanceof HTMLTextAreaElement) && le.addEventListener("input", g), o.refs.participantsContainer?.addEventListener("input", g), o.refs.participantsContainer?.addEventListener("change", g), d.refs.fieldDefinitionsContainer?.addEventListener("input", g), d.refs.fieldDefinitionsContainer?.addEventListener("change", g), d.refs.fieldRulesContainer?.addEventListener("input", g), d.refs.fieldRulesContainer?.addEventListener("change", g);
  }
  function he(X, le = {}) {
    K(() => {
      if (x(X), I(X), U(X), G(X), z(X), P(), N(X), J(X), le.updatePreview !== !1) {
        const Se = X?.document;
        Se?.id ? T.setDocument(Se.id, Se.title || null, Se.pageCount ?? null) : T.clear();
      }
      const ie = p(le.step ?? X?.currentStep, F.getCurrentStep()) || 1;
      F.setCurrentStep(ie), F.updateWizardUI();
    });
  }
  function ye() {
    if (F.updateWizardUI(), M.value) {
      const X = _?.textContent || null, le = p(B?.value, 0) || null;
      T.setDocument(M.value, X, le);
    } else T.clear();
    l && a.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: V,
    debouncedTrackChanges: g,
    applyStateToUI: he,
    renderInitialWizardUI: ye
  };
}
function ri(e) {
  return e.querySelector('select[name*=".role"]');
}
function ai(e) {
  return e.querySelector(".field-participant-select");
}
function si(e) {
  const { documentIdInput: t, titleInput: n, participantsContainer: i, fieldDefinitionsContainer: o, fieldRulesContainer: d, addFieldBtn: f, ensureSelectedDocumentCompatibility: v, collectFieldRulesForState: P, findSignersMissingRequiredSignatureField: T, missingSignatureFieldMessage: F, announceError: M } = e;
  function B(_) {
    switch (_) {
      case 1:
        return t.value ? !!v() : (M("Please select a document"), !1);
      case 2:
        return n.value.trim() ? !0 : (M("Please enter an agreement title"), n.focus(), !1);
      case 3: {
        const a = i.querySelectorAll(".participant-entry");
        if (a.length === 0)
          return M("Please add at least one participant"), !1;
        let p = !1;
        return a.forEach((l) => {
          ri(l)?.value === "signer" && (p = !0);
        }), p ? !0 : (M("At least one signer is required"), !1);
      }
      case 4: {
        const a = o.querySelectorAll(".field-definition-entry");
        for (const l of Array.from(a)) {
          const y = ai(l);
          if (!y?.value)
            return M("Please assign all fields to a signer"), y?.focus(), !1;
        }
        if (P().find((l) => !l.participantId))
          return M("Please assign all automation rules to a signer"), d?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const p = T();
        return p.length > 0 ? (M(F(p)), f.focus(), !1) : !0;
      }
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  return { validateStep: B };
}
function oi(e) {
  const { isEditMode: t, storageKey: n, stateManager: i, syncOrchestrator: o, syncService: d, applyResumedState: f, hasMeaningfulWizardProgress: v, formatRelativeTime: P, emitWizardTelemetry: T, getActiveTabDebugState: F } = e;
  function M(x, I) {
    return i.normalizeLoadedState({
      ...I,
      currentStep: x.currentStep,
      document: x.document,
      details: x.details,
      participants: x.participants,
      fieldDefinitions: x.fieldDefinitions,
      fieldPlacements: x.fieldPlacements,
      fieldRules: x.fieldRules,
      titleSource: x.titleSource,
      syncPending: !0,
      serverDraftId: I.serverDraftId,
      serverRevision: I.serverRevision,
      lastSyncedAt: I.lastSyncedAt
    });
  }
  async function B() {
    if (t) return i.getState();
    const x = i.normalizeLoadedState(i.getState());
    Ge("resume_reconcile_start", Ae({
      state: x,
      storageKey: n,
      ownership: F?.() || void 0,
      sendAttemptId: null,
      extra: { source: "local_bootstrap" }
    }));
    const I = String(x?.serverDraftId || "").trim();
    if (!I) {
      if (!v(x)) try {
        const g = await d.bootstrap();
        return i.setState({
          ...g.snapshot?.data?.wizard_state && typeof g.snapshot.data.wizard_state == "object" ? g.snapshot.data.wizard_state : {},
          resourceRef: g.resourceRef,
          serverDraftId: String(g.snapshot?.ref?.id || "").trim() || null,
          serverRevision: Number(g.snapshot?.revision || 0),
          lastSyncedAt: String(g.snapshot?.updatedAt || "").trim() || null,
          syncPending: !1
        }, {
          syncPending: !1,
          notify: !1
        }), i.getState();
      } catch {
        Xe("resume_reconcile_bootstrap_failed", Ae({
          state: x,
          storageKey: n,
          ownership: F?.() || void 0,
          sendAttemptId: null,
          extra: { source: "bootstrap_failed_keep_local" }
        }));
      }
      return i.setState(x, {
        syncPending: !!x.syncPending,
        notify: !1
      }), Ge("resume_reconcile_complete", Ae({
        state: x,
        storageKey: n,
        ownership: F?.() || void 0,
        sendAttemptId: null,
        extra: { source: "local_only" }
      })), i.getState();
    }
    try {
      const g = await d.load(I), U = i.normalizeLoadedState({
        ...g?.wizard_state && typeof g.wizard_state == "object" ? g.wizard_state : {},
        resourceRef: g?.resource_ref || x.resourceRef || null,
        serverDraftId: String(g?.id || I).trim() || I,
        serverRevision: Number(g?.revision || 0),
        lastSyncedAt: String(g?.updated_at || g?.updatedAt || "").trim() || x.lastSyncedAt,
        syncPending: !1
      }), G = String(x.serverDraftId || "").trim() === String(U.serverDraftId || "").trim(), z = G && x.syncPending === !0 ? M(x, U) : U;
      return i.setState(z, {
        syncPending: !!z.syncPending,
        notify: !1
      }), Ge("resume_reconcile_complete", Ae({
        state: z,
        storageKey: n,
        ownership: F?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: G && x.syncPending === !0 ? "merged_local_over_remote" : "remote_draft",
          loadedDraftId: String(g?.id || I).trim() || null,
          loadedRevision: Number(g?.revision || 0)
        }
      })), i.getState();
    } catch (g) {
      const U = typeof g == "object" && g !== null && "status" in g ? Number(g.status || 0) : 0;
      if (U === 404) {
        const G = i.normalizeLoadedState({
          ...x,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return i.setState(G, {
          syncPending: !!G.syncPending,
          notify: !1
        }), Xe("resume_reconcile_remote_missing", Ae({
          state: G,
          storageKey: n,
          ownership: F?.() || void 0,
          sendAttemptId: null,
          extra: {
            source: "remote_missing_reset_local",
            staleDraftId: I,
            status: U
          }
        })), i.getState();
      }
      return Xe("resume_reconcile_failed", Ae({
        state: x,
        storageKey: n,
        ownership: F?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "reconcile_failed_keep_local",
          staleDraftId: I,
          status: U
        }
      })), i.getState();
    }
  }
  function _(x) {
    return document.getElementById(x);
  }
  function a() {
    const x = document.getElementById("resume-dialog-modal"), I = i.getState(), g = String(I?.document?.title || "").trim() || String(I?.document?.id || "").trim() || "Unknown document", U = _("resume-draft-title"), G = _("resume-draft-document"), z = _("resume-draft-step"), N = _("resume-draft-time");
    U && (U.textContent = I.details?.title || "Untitled Agreement"), G && (G.textContent = g), z && (z.textContent = String(I.currentStep || 1)), N && (N.textContent = P(I.updatedAt)), x?.classList.remove("hidden"), T("wizard_resume_prompt_shown", {
      step: Number(I.currentStep || 1),
      has_server_draft: !!I.serverDraftId
    });
  }
  async function p(x = {}) {
    const I = x.deleteServerDraft === !0, g = String(i.getState()?.serverDraftId || "").trim();
    if (i.clear(), o.broadcastStateUpdate(), g && o.broadcastDraftDisposed?.(g, I ? "resume_clear_delete" : "resume_clear_local"), !(!I || !g))
      try {
        await d.dispose(g);
      } catch (U) {
        console.warn("Failed to delete server draft:", U);
      }
  }
  function l() {
    return i.normalizeLoadedState({
      ...i.getState(),
      ...i.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  async function y(x) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const I = l();
    switch (x) {
      case "continue":
        !String(i.getState()?.serverDraftId || "").trim() && v(I) && await d.create(I), f(i.getState());
        return;
      case "start_new":
        await p({ deleteServerDraft: !1 }), v(I) ? await d.create(I) : await B(), f(i.getState());
        return;
      case "proceed":
        await p({ deleteServerDraft: !0 }), v(I) ? await d.create(I) : await B(), f(i.getState());
        return;
      case "discard":
        await p({ deleteServerDraft: !0 }), await B(), f(i.getState());
        return;
      default:
        return;
    }
  }
  function $() {
    document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
      y("continue");
    }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
      y("proceed");
    }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
      y("start_new");
    }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
      y("discard");
    });
  }
  async function K() {
    t || (await B(), i.hasResumableState() && a());
  }
  return {
    bindEvents: $,
    reconcileBootstrapState: B,
    maybeShowResumeDialog: K
  };
}
function ci(e) {
  const { agreementRefs: t, formAnnouncements: n, stateManager: i } = e;
  let o = "saved";
  function d(_) {
    return jt(_, {
      emptyFallback: "unknown",
      invalidFallback: "Invalid Date"
    });
  }
  function f() {
    const _ = i.getState();
    o === "paused" && v(_?.syncPending ? "pending" : "saved");
  }
  function v(_) {
    o = String(_ || "").trim() || "saved";
    const a = t.sync.indicator, p = t.sync.icon, l = t.sync.text, y = t.sync.retryBtn;
    if (!(!a || !p || !l))
      switch (a.classList.remove("hidden"), _) {
        case "saved":
          p.className = "w-2 h-2 rounded-full bg-green-500", l.textContent = "Saved", l.className = "text-gray-600", y?.classList.add("hidden");
          break;
        case "saving":
          p.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", l.textContent = "Saving...", l.className = "text-gray-600", y?.classList.add("hidden");
          break;
        case "pending":
          p.className = "w-2 h-2 rounded-full bg-gray-400", l.textContent = "Unsaved changes", l.className = "text-gray-500", y?.classList.add("hidden");
          break;
        case "error":
          p.className = "w-2 h-2 rounded-full bg-amber-500", l.textContent = "Not synced", l.className = "text-amber-600", y?.classList.remove("hidden");
          break;
        case "paused":
          p.className = "w-2 h-2 rounded-full bg-slate-400", l.textContent = "Open in another tab", l.className = "text-slate-600", y?.classList.add("hidden");
          break;
        case "conflict":
          p.className = "w-2 h-2 rounded-full bg-red-500", l.textContent = "Conflict", l.className = "text-red-600", y?.classList.add("hidden");
          break;
        default:
          a.classList.add("hidden");
      }
  }
  function P(_) {
    const a = i.getState();
    t.conflict.localTime && (t.conflict.localTime.textContent = d(a.updatedAt)), t.conflict.serverRevision && (t.conflict.serverRevision.textContent = String(_ || 0)), t.conflict.serverTime && (t.conflict.serverTime.textContent = "newer version"), t.conflict.modal?.classList.remove("hidden");
  }
  function T(_, a = "", p = 0) {
    const l = String(a || "").trim().toUpperCase(), y = String(_ || "").trim().toLowerCase();
    return l === "STALE_REVISION" ? "A newer version of this draft exists. Reload the latest draft or force your changes." : l === "DRAFT_SEND_NOT_FOUND" || l === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : l === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : l === "SCOPE_DENIED" || y.includes("scope denied") ? "You don't have access to this organization's resources." : l === "TRANSPORT_SECURITY" || l === "TRANSPORT_SECURITY_REQUIRED" || y.includes("tls transport required") || Number(p) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : l === "PDF_UNSUPPORTED" || y === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(_ || "").trim() !== "" ? String(_).trim() : "Something went wrong. Please try again.";
  }
  async function F(_, a = "") {
    const p = Number(_?.status || 0), l = await cn(_, a || `Request failed (${p || "unknown"})`, { appendStatusToFallback: !1 });
    let y = l.code, $ = l.message;
    const K = l.details;
    return String(K?.entity || "").trim().toLowerCase() === "drafts" && String(y).trim().toUpperCase() === "NOT_FOUND" && (y = "DRAFT_SEND_NOT_FOUND", $ === "" && ($ = "Draft not found")), $ === "" && ($ = a || `Request failed (${p || "unknown"})`), {
      status: p,
      code: y,
      details: K,
      message: T($, y, p)
    };
  }
  function M(_, a = "", p = 0) {
    const l = T(_, a, p);
    n && (n.textContent = l), window.toastManager?.error ? window.toastManager.error(l) : alert(l);
  }
  async function B(_, a = {}) {
    const p = await _;
    return p?.blocked && p.reason === "passive_tab" ? (M("This agreement is active in another tab. Take control in this tab before saving or sending.", "ACTIVE_TAB_OWNERSHIP_REQUIRED"), p) : (p?.error && String(a.errorMessage || "").trim() !== "" && M(a.errorMessage || ""), p);
  }
  return {
    announceError: M,
    formatRelativeTime: d,
    mapUserFacingError: T,
    parseAPIError: F,
    restoreSyncStatusFromState: f,
    showSyncConflictDialog: P,
    surfaceSyncOutcome: B,
    updateSyncStatus: v
  };
}
function li(e) {
  const { createSuccess: t, enableServerSync: n = !0, stateManager: i, syncOrchestrator: o, syncService: d, applyStateToUI: f, surfaceSyncOutcome: v, announceError: P, getCurrentStep: T, reviewStep: F, onReviewStepRequested: M } = e;
  function B() {
    const p = i.collectFormState();
    if (!n) {
      i.setState({
        ...i.getState(),
        ...p,
        syncPending: !1
      }, { syncPending: !1 });
      return;
    }
    i.updateState(p), o.scheduleSync(), o.broadcastStateUpdate();
  }
  function _() {
    if (!t) return;
    const p = i.getState()?.serverDraftId;
    i.clear(), o.broadcastStateUpdate(), p && (o.broadcastDraftDisposed?.(p, "agreement_created"), d.dispose(p).catch((l) => {
      console.warn("Failed to dispose sync draft after successful create:", l);
    }));
  }
  function a() {
    document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
      await v(o.manualRetry(), { errorMessage: "Unable to sync latest draft changes. Please try again." });
    }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
      o.refreshCurrentDraft && (await o.refreshCurrentDraft({
        preserveDirty: !1,
        force: !0
      }), f(i.getState())), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
      const p = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      i.setState({
        ...i.getState(),
        serverRevision: p,
        syncPending: !0
      }, { syncPending: !0 });
      const l = await v(o.performSync(), { errorMessage: "Unable to sync latest draft changes. Please try again." });
      (l?.success || l?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    });
  }
  return {
    bindRetryAndConflictHandlers: a,
    handleCreateSuccessCleanup: _,
    trackWizardStateChanges: B
  };
}
var Qe = {
  USER: "user",
  AUTOFILL: "autofill",
  SERVER_SEED: "server_seed"
};
function en(e, t = Qe.AUTOFILL) {
  const n = String(e || "").trim().toLowerCase();
  return n === Qe.USER ? Qe.USER : n === Qe.SERVER_SEED ? Qe.SERVER_SEED : n === Qe.AUTOFILL ? Qe.AUTOFILL : t;
}
function di(e, t = 0) {
  if (!e || typeof e != "object") return !1;
  const n = e, i = String(n.name ?? "").trim(), o = String(n.email ?? "").trim(), d = String(n.role ?? "signer").trim().toLowerCase(), f = Number.parseInt(String(n.signingStage ?? n.signing_stage ?? 1), 10), v = n.notify !== !1;
  return i !== "" || o !== "" || d !== "" && d !== "signer" || Number.isFinite(f) && f > 1 || !v ? !0 : t > 0;
}
function Ot(e, t = {}) {
  const { normalizeTitleSource: n = en, titleSource: i = Qe } = t;
  if (!e || typeof e != "object") return !1;
  const o = Number.parseInt(String(e.currentStep ?? 1), 10);
  if (Number.isFinite(o) && o > 1 || String(e.document?.id ?? "").trim() !== "") return !0;
  const d = String(e.details?.title ?? "").trim(), f = String(e.details?.message ?? "").trim(), v = n(e.titleSource, d === "" ? i.AUTOFILL : i.USER);
  return !!(d !== "" && v !== i.SERVER_SEED || f !== "" || (Array.isArray(e.participants) ? e.participants : []).some((P, T) => di(P, T)) || Array.isArray(e.fieldDefinitions) && e.fieldDefinitions.length > 0 || Array.isArray(e.fieldPlacements) && e.fieldPlacements.length > 0 || Array.isArray(e.fieldRules) && e.fieldRules.length > 0 || e.review?.enabled);
}
function ui(e = {}) {
  const t = e || {}, n = String(t.base_path || "").trim(), i = String(t.api_base_path || "").trim() || `${n}/api`, o = i.replace(/\/+$/, ""), d = /\/v\d+$/i.test(o) ? o : `${o}/v1`, f = !!t.is_edit, v = !!t.create_success, P = String(t.submit_mode || "json").trim().toLowerCase(), T = String(t.agreement_id || "").trim(), F = String(t.active_agreement_id || "").trim(), M = String(t.routes?.documents_upload_url || "").trim() || `${n}/content/esign_documents/new`, B = Array.isArray(t.initial_participants) ? t.initial_participants : [], _ = Array.isArray(t.initial_field_instances) ? t.initial_field_instances : [], a = t.sync && typeof t.sync == "object" ? t.sync : {}, p = Array.isArray(a.action_operations) ? a.action_operations.map(($) => String($ || "").trim()).filter(Boolean) : [], l = `${d}/esign`, y = {
    base_url: String(a.base_url || "").trim() || l,
    bootstrap_path: String(a.bootstrap_path || "").trim() || `${l}/sync/bootstrap/agreement-draft`,
    client_base_path: String(a.client_base_path || "").trim() || `${n}/sync-client/sync-core`,
    resource_kind: String(a.resource_kind || "").trim() || "agreement_draft",
    storage_scope: String(a.storage_scope || "").trim(),
    action_operations: p.length > 0 ? p : [
      "send",
      "start_review",
      "dispose"
    ]
  };
  return {
    config: t,
    normalizedConfig: {
      sync: y,
      base_path: n,
      api_base_path: i,
      is_edit: f,
      create_success: v,
      submit_mode: P,
      agreement_id: T,
      active_agreement_id: F,
      routes: {
        index: String(t.routes?.index || "").trim(),
        documents: String(t.routes?.documents || "").trim(),
        create: String(t.routes?.create || "").trim(),
        documents_upload_url: M
      },
      initial_participants: B,
      initial_field_instances: _
    },
    syncConfig: y,
    basePath: n,
    apiBase: i,
    apiVersionBase: d,
    isEditMode: f,
    createSuccess: v,
    submitMode: P,
    agreementID: T,
    activeAgreementID: F,
    documentsUploadURL: M,
    initialParticipants: B,
    initialFieldInstances: _
  };
}
function pi(e = !0) {
  const t = { Accept: "application/json" };
  return e && (t["Content-Type"] = "application/json"), t;
}
function mi(e = {}) {
  const { config: t = {}, isEditMode: n = !1 } = e, i = n ? "edit" : "create", o = String(t.agreement_id || "").trim().toLowerCase(), d = String(t.routes?.create || t.routes?.index || (typeof window < "u" ? window.location.pathname : "") || "agreement-form").trim().toLowerCase(), f = [
    String(t.sync?.storage_scope || "").trim() || "anonymous",
    i,
    n && o !== "" ? o : d || "agreement-form"
  ].join("|");
  return {
    WIZARD_STATE_VERSION: 2,
    WIZARD_STORAGE_KEY: `esign_wizard_state_v2:${encodeURIComponent(f)}`,
    WIZARD_CHANNEL_NAME: `esign_wizard_sync:${encodeURIComponent(f)}`,
    SYNC_DEBOUNCE_MS: 2e3,
    SYNC_RETRY_DELAYS: [
      1e3,
      2e3,
      5e3,
      1e4,
      3e4
    ],
    TITLE_SOURCE: Qe
  };
}
function Ht(e, t = "info") {
  const n = document.createElement("div");
  n.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${t === "success" ? "bg-green-600 text-white" : t === "error" ? "bg-red-600 text-white" : t === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, n.textContent = e, document.body.appendChild(n), setTimeout(() => {
    n.style.opacity = "0", setTimeout(() => n.remove(), 300);
  }, 3e3);
}
function at(e, t) {
  if (!e) throw new Error(`Agreement form boot failed: missing required ${t}`);
  return e;
}
function fi(e, t) {
  if (!(e instanceof HTMLButtonElement)) throw new Error(`Agreement form boot failed: missing required ${t}`);
  return e;
}
function gi(e = {}) {
  const { config: t, normalizedConfig: n, syncConfig: i, basePath: o, apiBase: d, apiVersionBase: f, isEditMode: v, createSuccess: P, submitMode: T, documentsUploadURL: F, initialParticipants: M, initialFieldInstances: B } = ui(e), _ = bn(document), { WIZARD_STATE_VERSION: a, WIZARD_STORAGE_KEY: p, WIZARD_CHANNEL_NAME: l, SYNC_DEBOUNCE_MS: y, SYNC_RETRY_DELAYS: $, TITLE_SOURCE: K } = mi({
    config: t,
    isEditMode: v
  }), x = An(), I = (b, se = K.AUTOFILL) => en(b, se), g = (b) => Ot(b, {
    normalizeTitleSource: I,
    titleSource: K
  }), U = Sn({
    apiBasePath: f,
    basePath: o
  }), G = _.form.root, z = fi(_.form.submitBtn, "submit button"), N = _.form.announcements;
  let J = null, V = null, he = null, ye = null, X = null, le = null, ie = null, Se = null, me = null, we = bt();
  const Me = (b, se = {}) => {
    ye?.applyStateToUI(b, se);
  }, Ie = () => ye?.debouncedTrackChanges?.(), W = () => Se?.trackWizardStateChanges?.(), ve = (b) => jt(b, {
    emptyFallback: "unknown",
    invalidFallback: "Invalid Date"
  }), q = () => ie?.restoreSyncStatusFromState(), Te = (b) => ie?.updateSyncStatus(b), _e = (b) => ie?.showSyncConflictDialog(b), oe = (b, se = "", De = 0) => ie?.mapUserFacingError(b, se, De) || String(b || "").trim(), pe = (b, se) => ie ? ie.parseAPIError(b, se) : Promise.resolve({
    status: Number(b.status || 0),
    code: "",
    details: {},
    message: se
  }), $e = (b, se = "", De = 0) => ie?.announceError(b, se, De), je = (b, se = {}) => ie ? ie.surfaceSyncOutcome(b, se) : Promise.resolve({}), ze = () => null, Ne = wn(_, { formatRelativeTime: ve }), Oe = () => Ne.render({ coordinationAvailable: !0 }), de = async (b, se) => {
    const De = await pe(b, se), ke = new Error(De.message);
    return ke.code = De.code, ke.status = De.status, ke;
  }, m = {
    hasResumableState: () => u.hasResumableState(),
    setTitleSource: (b, se) => u.setTitleSource(b, se),
    updateDocument: (b) => u.updateDocument(b),
    updateDetails: (b, se) => u.updateDetails(b, se),
    getState: () => {
      const b = u.getState();
      return {
        titleSource: b.titleSource,
        details: b.details && typeof b.details == "object" ? b.details : {}
      };
    }
  }, u = new In({
    storageKey: p,
    stateVersion: a,
    totalWizardSteps: ut,
    titleSource: K,
    normalizeTitleSource: I,
    parsePositiveInt: Pe,
    hasMeaningfulWizardProgress: g,
    collectFormState: () => {
      const b = _.form.documentIdInput?.value || null, se = document.getElementById("selected-document-title")?.textContent?.trim() || null, De = I(u.getState()?.titleSource, String(_.form.titleInput?.value || "").trim() === "" ? K.AUTOFILL : K.USER);
      return {
        document: {
          id: b,
          title: se,
          pageCount: parseInt(_.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: _.form.titleInput?.value || "",
          message: _.form.messageInput?.value || ""
        },
        titleSource: De,
        participants: J?.collectParticipantsForState?.() || [],
        fieldDefinitions: V?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: he?.getState?.()?.fieldInstances || [],
        fieldRules: V?.collectFieldRulesForState?.() || [],
        review: me?.collectReviewConfigForState?.() || {
          enabled: !1,
          gate: "approve_before_send",
          commentsEnabled: !1,
          participants: []
        }
      };
    },
    emitTelemetry: x
  });
  u.start(), ie = ci({
    agreementRefs: _,
    formAnnouncements: N,
    stateManager: u
  });
  const S = new xn({
    stateManager: u,
    requestHeaders: pi,
    syncConfig: i
  });
  let C;
  const Z = new Ln({
    channelName: l,
    onCoordinationAvailabilityChange: (b) => {
      q(), Ne.render({ coordinationAvailable: b });
    },
    onRemoteSync: (b) => {
      String(u.getState()?.serverDraftId || "").trim() === String(b || "").trim() && (u.getState()?.syncPending || C?.refreshCurrentDraft({
        preserveDirty: !0,
        force: !0
      }).then(() => {
        Me(u.getState(), { step: Number(u.getState()?.currentStep || 1) });
      }));
    },
    onRemoteDraftDisposed: (b) => {
      String(u.getState()?.serverDraftId || "").trim() === String(b || "").trim() && (u.getState()?.syncPending || u.setState({
        ...u.getState(),
        serverDraftId: null,
        serverRevision: 0,
        lastSyncedAt: null,
        resourceRef: null
      }, {
        notify: !0,
        save: !0,
        syncPending: !1
      }));
    },
    onVisibilityHidden: () => {
      C?.forceSync();
    },
    onPageHide: () => {
      C?.forceSync();
    },
    onBeforeUnload: () => {
      C?.forceSync();
    }
  });
  C = new Cn({
    stateManager: u,
    syncService: S,
    activeTabController: Z,
    storageKey: p,
    statusUpdater: Te,
    showConflictDialog: _e,
    syncDebounceMs: y,
    syncRetryDelays: $,
    documentRef: document,
    windowRef: window
  });
  const ee = vn({
    context: {
      config: n,
      refs: _,
      basePath: o,
      apiBase: d,
      apiVersionBase: f,
      previewCard: U,
      emitTelemetry: x,
      stateManager: u,
      syncService: S,
      activeTabController: Z,
      syncController: C
    },
    hooks: {
      renderInitialUI() {
        ye?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        le?.maybeShowResumeDialog?.(), te.loadDocuments(), te.loadRecentDocuments();
      },
      destroy() {
        Ne.destroy(), u.destroy();
      }
    }
  }), te = Gn({
    apiBase: d,
    apiVersionBase: f,
    documentsUploadURL: F,
    isEditMode: v,
    titleSource: K,
    normalizeTitleSource: I,
    stateManager: m,
    previewCard: U,
    parseAPIError: de,
    announceError: $e,
    showToast: Ht,
    mapUserFacingError: oe,
    renderFieldRulePreview: () => V?.renderFieldRulePreview?.()
  });
  te.initializeTitleSourceSeed(), te.bindEvents();
  const fe = at(te.refs.documentIdInput, "document id input"), O = at(te.refs.documentSearch, "document search input"), Y = te.refs.selectedDocumentTitle, D = te.refs.documentPageCountInput, ue = te.ensureSelectedDocumentCompatibility, re = te.getCurrentDocumentPageCount;
  J = Wn({
    initialParticipants: M,
    onParticipantsChanged: () => V?.updateFieldParticipantOptions?.()
  }), J.initialize(), J.bindEvents();
  const ae = at(J.refs.participantsContainer, "participants container"), ce = at(J.refs.addParticipantBtn, "add participant button"), r = () => J?.getSignerParticipants() || [];
  V = Xn({
    initialFieldInstances: B,
    placementSource: He,
    getCurrentDocumentPageCount: re,
    getSignerParticipants: r,
    escapeHtml: Be,
    onDefinitionsChanged: () => Ie(),
    onRulesChanged: () => Ie(),
    onParticipantsChanged: () => V?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => he?.getLinkGroupState?.() || we,
    setPlacementLinkGroupState: (b) => {
      we = b || bt(), he?.setLinkGroupState?.(we);
    }
  }), V.bindEvents(), V.initialize();
  const s = at(V.refs.fieldDefinitionsContainer, "field definitions container"), c = V.refs.fieldRulesContainer, R = at(V.refs.addFieldBtn, "add field button"), k = V.refs.fieldPlacementsJSONInput, A = V.refs.fieldRulesJSONInput, H = () => V?.collectFieldRulesForState() || [], ne = () => V?.collectFieldRulesForState() || [], Ce = () => V?.collectFieldRulesForForm() || [], ge = (b, se) => V?.expandRulesForPreview(b, se) || [], Ee = () => V?.updateFieldParticipantOptions(), We = () => V.collectPlacementFieldDefinitions(), Ke = (b) => V?.getFieldDefinitionById(b) || null, xe = () => V?.findSignersMissingRequiredSignatureField() || [], h = (b) => V?.missingSignatureFieldMessage(b) || "", w = Pn({
    documentIdInput: fe,
    selectedDocumentTitle: Y,
    participantsContainer: ae,
    fieldDefinitionsContainer: s,
    submitBtn: z,
    escapeHtml: Be,
    getSignerParticipants: r,
    getCurrentDocumentPageCount: re,
    collectFieldRulesForState: ne,
    expandRulesForPreview: ge,
    findSignersMissingRequiredSignatureField: xe,
    goToStep: (b) => L.goToStep(b)
  }), E = (b) => {
    z.getAttribute("aria-busy") !== "true" && (z.innerHTML = `
      <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </svg>
      ${b}
    `);
  };
  me = ti({
    getSignerParticipants: r,
    setPrimaryActionLabel: E,
    onChanged: () => W()
  }), me.bindEvents(), he = ei({
    apiBase: d,
    apiVersionBase: f,
    documentIdInput: fe,
    fieldPlacementsJSONInput: k,
    initialFieldInstances: V.buildInitialPlacementInstances(),
    initialLinkGroupState: we,
    collectPlacementFieldDefinitions: We,
    getFieldDefinitionById: Ke,
    parseAPIError: de,
    mapUserFacingError: oe,
    showToast: Ht,
    escapeHtml: Be,
    onPlacementsChanged: () => W()
  }), he.bindEvents(), we = he.getLinkGroupState();
  const L = Tn({
    totalWizardSteps: ut,
    wizardStep: Fe,
    nextStepLabels: dn,
    submitBtn: z,
    previewCard: U,
    updateCoordinationUI: Oe,
    validateStep: (b) => X?.validateStep(b) !== !1,
    onPlacementStep() {
      he.initPlacementEditor();
    },
    onReviewStep() {
      me?.refreshRecipientReviewers(), w.initSendReadinessCheck();
    },
    onStepChanged(b) {
      u.updateStep(b), W(), C.forceSync();
    }
  });
  L.bindEvents(), Se = li({
    createSuccess: P,
    enableServerSync: !v && T === "json",
    stateManager: u,
    syncOrchestrator: C,
    syncService: S,
    applyStateToUI: (b) => Me(b, { step: Number(b?.currentStep || 1) }),
    surfaceSyncOutcome: je,
    announceError: $e,
    getCurrentStep: () => L.getCurrentStep(),
    reviewStep: Fe.REVIEW,
    onReviewStepRequested: () => w.initSendReadinessCheck()
  }), Se.handleCreateSuccessCleanup(), Se.bindRetryAndConflictHandlers();
  const j = ni({
    documentIdInput: fe,
    documentPageCountInput: D,
    titleInput: _.form.titleInput,
    messageInput: _.form.messageInput,
    participantsContainer: ae,
    fieldDefinitionsContainer: s,
    fieldPlacementsJSONInput: k,
    fieldRulesJSONInput: A,
    collectFieldRulesForForm: () => Ce(),
    buildPlacementFormEntries: () => he?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => L.getCurrentStep(),
    totalWizardSteps: ut
  }), Q = () => j.buildCanonicalAgreementPayload();
  return ye = ii({
    titleSource: K,
    stateManager: u,
    trackWizardStateChanges: W,
    participantsController: J,
    fieldDefinitionsController: V,
    placementController: he,
    reviewConfigController: me,
    updateFieldParticipantOptions: Ee,
    previewCard: U,
    wizardNavigationController: L,
    documentIdInput: fe,
    documentPageCountInput: D,
    selectedDocumentTitle: Y,
    agreementRefs: _,
    parsePositiveInt: Pe,
    isEditMode: v
  }), ye.bindChangeTracking(), X = si({
    documentIdInput: fe,
    titleInput: _.form.titleInput,
    participantsContainer: ae,
    fieldDefinitionsContainer: s,
    fieldRulesContainer: c,
    addFieldBtn: R,
    ensureSelectedDocumentCompatibility: ue,
    collectFieldRulesForState: H,
    findSignersMissingRequiredSignatureField: xe,
    missingSignatureFieldMessage: h,
    announceError: $e
  }), le = oi({
    isEditMode: v,
    storageKey: p,
    stateManager: u,
    syncOrchestrator: C,
    syncService: S,
    applyResumedState: (b) => Me(b, { step: Number(b?.currentStep || 1) }),
    hasMeaningfulWizardProgress: Ot,
    formatRelativeTime: ve,
    emitWizardTelemetry: (b, se) => x(b, se),
    getActiveTabDebugState: ze
  }), le.bindEvents(), Nn({
    config: t,
    form: G,
    submitBtn: z,
    documentIdInput: fe,
    documentSearch: O,
    participantsContainer: ae,
    addParticipantBtn: ce,
    fieldDefinitionsContainer: s,
    fieldRulesContainer: c,
    documentPageCountInput: D,
    fieldPlacementsJSONInput: k,
    fieldRulesJSONInput: A,
    storageKey: p,
    syncService: S,
    syncOrchestrator: C,
    stateManager: u,
    submitMode: T,
    totalWizardSteps: ut,
    wizardStep: Fe,
    getCurrentStep: () => L.getCurrentStep(),
    getPlacementState: () => he.getState(),
    getCurrentDocumentPageCount: re,
    ensureSelectedDocumentCompatibility: ue,
    collectFieldRulesForState: H,
    collectFieldRulesForForm: Ce,
    expandRulesForPreview: ge,
    findSignersMissingRequiredSignatureField: xe,
    missingSignatureFieldMessage: h,
    getSignerParticipants: r,
    getReviewConfigForState: () => me?.collectReviewConfigForState?.() || {
      enabled: !1,
      gate: "approve_before_send",
      commentsEnabled: !1,
      participants: []
    },
    isStartReviewEnabled: () => me?.isStartReviewEnabled?.() === !0,
    setPrimaryActionLabel: E,
    buildCanonicalAgreementPayload: Q,
    announceError: $e,
    emitWizardTelemetry: x,
    parseAPIError: pe,
    goToStep: (b) => L.goToStep(b),
    showSyncConflictDialog: _e,
    surfaceSyncOutcome: je,
    updateSyncStatus: Te,
    getActiveTabDebugState: ze,
    addFieldBtn: R
  }).bindEvents(), ee;
}
var wt = null;
function hi() {
  wt?.destroy(), wt = null, typeof window < "u" && (delete window.__esignAgreementRuntime, delete window.__esignAgreementRuntimeInitialized);
}
function Si(e = {}) {
  if (wt) return;
  const t = gi(e);
  t.start(), wt = t, typeof window < "u" && (window.__esignAgreementRuntime = t, window.__esignAgreementRuntimeInitialized = !0);
}
function yi(e = document) {
  e.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((t) => {
    const n = t.getAttribute("aria-controls");
    if (!n) return;
    const i = document.getElementById(n);
    i && t.addEventListener("click", () => {
      const o = t.getAttribute("aria-expanded") === "true";
      t.setAttribute("aria-expanded", String(!o)), i.classList.toggle("expanded", !o);
    });
  });
}
function vi(e) {
  return {
    sync: e.sync && typeof e.sync == "object" ? {
      base_url: String(e.sync.base_url || "").trim(),
      bootstrap_path: String(e.sync.bootstrap_path || "").trim(),
      client_base_path: String(e.sync.client_base_path || "").trim(),
      resource_kind: String(e.sync.resource_kind || "").trim(),
      storage_scope: String(e.sync.storage_scope || "").trim(),
      action_operations: Array.isArray(e.sync.action_operations) ? e.sync.action_operations.map((t) => String(t || "").trim()).filter(Boolean) : []
    } : void 0,
    base_path: String(e.base_path || e.basePath || "").trim(),
    api_base_path: String(e.api_base_path || e.apiBasePath || "").trim(),
    is_edit: !!(e.is_edit ?? e.isEditMode),
    create_success: !!(e.create_success ?? e.createSuccess),
    submit_mode: String(e.submit_mode || "json").trim().toLowerCase(),
    agreement_id: String(e.agreement_id || "").trim(),
    active_agreement_id: String(e.active_agreement_id || "").trim(),
    routes: {
      index: String(e.routes?.index || "").trim(),
      documents: String(e.routes?.documents || "").trim(),
      create: String(e.routes?.create || "").trim(),
      documents_upload_url: String(e.routes?.documents_upload_url || "").trim()
    },
    initial_participants: Array.isArray(e.initial_participants) ? e.initial_participants : [],
    initial_field_instances: Array.isArray(e.initial_field_instances) ? e.initial_field_instances : []
  };
}
var tn = class {
  constructor(e) {
    this.initialized = !1, this.config = vi(e);
  }
  init() {
    this.initialized || (this.initialized = !0, yi(), Si(this.config));
  }
  destroy() {
    hi(), this.initialized = !1;
  }
};
function Di(e) {
  const t = new tn(e);
  return Pt(() => t.init()), t;
}
function bi(e) {
  const t = new tn({
    sync: e.sync,
    basePath: e.basePath,
    apiBasePath: e.apiBasePath,
    base_path: e.base_path,
    api_base_path: e.api_base_path,
    isEditMode: e.isEditMode,
    is_edit: e.is_edit,
    createSuccess: e.createSuccess,
    create_success: e.create_success,
    submit_mode: e.submit_mode || "json",
    agreement_id: e.agreement_id,
    active_agreement_id: e.active_agreement_id,
    initial_participants: e.initial_participants || [],
    initial_field_instances: e.initial_field_instances || [],
    routes: e.routes
  });
  Pt(() => t.init()), typeof window < "u" && (window.esignAgreementFormController = t);
}
function wi(e) {
  const t = e.context && typeof e.context == "object" ? e.context : {}, n = e.routes && typeof e.routes == "object" ? e.routes : t.routes && typeof t.routes == "object" ? t.routes : {}, i = e.sync && typeof e.sync == "object" ? e.sync : t.sync && typeof t.sync == "object" ? t.sync : void 0, o = String(e.base_path || e.basePath || "").trim(), d = String(n.index || "").trim();
  return !o && !d ? null : {
    sync: i ? {
      base_url: String(i.base_url || "").trim(),
      bootstrap_path: String(i.bootstrap_path || "").trim(),
      client_base_path: String(i.client_base_path || "").trim(),
      resource_kind: String(i.resource_kind || "").trim(),
      storage_scope: String(i.storage_scope || "").trim(),
      action_operations: Array.isArray(i.action_operations) ? i.action_operations.map((f) => String(f || "").trim()).filter(Boolean) : []
    } : void 0,
    base_path: o || "/admin",
    api_base_path: String(e.api_base_path || e.apiBasePath || "").trim() || void 0,
    is_edit: !!(e.is_edit ?? e.isEditMode ?? t.is_edit),
    create_success: !!(e.create_success ?? e.createSuccess ?? t.create_success),
    submit_mode: String(e.submit_mode || t.submit_mode || "json").trim().toLowerCase(),
    agreement_id: String(e.agreement_id || t.agreement_id || "").trim(),
    active_agreement_id: String(e.active_agreement_id || t.active_agreement_id || "").trim(),
    routes: {
      index: d,
      documents: String(n.documents || "").trim(),
      create: String(n.create || "").trim(),
      documents_upload_url: String(n.documents_upload_url || "").trim()
    },
    initial_participants: Array.isArray(e.initial_participants) ? e.initial_participants : Array.isArray(t.initial_participants) ? t.initial_participants : [],
    initial_field_instances: Array.isArray(e.initial_field_instances) ? e.initial_field_instances : Array.isArray(t.initial_field_instances) ? t.initial_field_instances : []
  };
}
typeof document < "u" && Pt(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = ln("esign-page-config", "agreement form page config");
  if (!e) return;
  const t = wi(e);
  t && bi(t);
});
export {
  bi as n,
  Di as r,
  tn as t
};

//# sourceMappingURL=agreement-form-BYSDSPx5.js.map