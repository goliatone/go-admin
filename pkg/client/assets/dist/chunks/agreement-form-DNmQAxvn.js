import { c as Pt } from "./dom-helpers-CDdChTSn.js";
import { n as jt, t as Gt } from "./runtime-Bu3OM-Zn.js";
var Me = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, pt = Me.REVIEW, nn = {
  [Me.DOCUMENT]: "Details",
  [Me.DETAILS]: "Participants",
  [Me.PARTICIPANTS]: "Fields",
  [Me.FIELDS]: "Placement",
  [Me.PLACEMENT]: "Review"
}, He = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  AUTO_LINKED: "auto_linked"
}, vt = {
  THUMBNAIL_MAX_WIDTH: 280,
  THUMBNAIL_MAX_HEIGHT: 200,
  CACHE_TTL_MS: 1800 * 1e3
}, gi = [
  Me.DOCUMENT,
  Me.DETAILS,
  Me.PARTICIPANTS,
  Me.FIELDS,
  Me.REVIEW
], At = /* @__PURE__ */ new Map(), rn = 1800 * 1e3;
function an() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function sn(e) {
  const t = At.get(e);
  return t ? Date.now() - t.timestamp > rn ? (At.delete(e), null) : t : null;
}
function on(e, t, n) {
  At.set(e, {
    dataUrl: t,
    pageCount: n,
    timestamp: Date.now()
  });
}
async function cn(e, t, n = vt.THUMBNAIL_MAX_WIDTH, i = vt.THUMBNAIL_MAX_HEIGHT) {
  const o = await Gt({
    url: e,
    withCredentials: !0,
    surface: "agreement-preview-card",
    documentId: t
  }).promise, d = o.numPages, f = await o.getPage(1), v = f.getViewport({ scale: 1 }), P = n / v.width, T = i / v.height, M = Math.min(P, T, 1), F = f.getViewport({ scale: M }), B = document.createElement("canvas");
  B.width = F.width, B.height = F.height;
  const _ = B.getContext("2d");
  if (!_) throw new Error("Failed to get canvas context");
  return await f.render({
    canvasContext: _,
    viewport: F
  }).promise, {
    dataUrl: B.toDataURL("image/jpeg", 0.8),
    pageCount: d
  };
}
var ln = class {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || vt.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || vt.THUMBNAIL_MAX_HEIGHT
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
    const t = e === Me.DOCUMENT || e === Me.DETAILS || e === Me.PARTICIPANTS || e === Me.FIELDS || e === Me.REVIEW;
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
    const o = sn(e);
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
      const { dataUrl: f, pageCount: v } = await cn(d, e, this.config.thumbnailMaxWidth, this.config.thumbnailMaxHeight);
      if (i !== this.requestVersion) return;
      on(e, f, v), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: n ?? v,
        thumbnailUrl: f,
        isLoading: !1,
        error: null
      };
    } catch (f) {
      if (i !== this.requestVersion) return;
      const v = jt(f, {
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
        d?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (an() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
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
function dn(e = {}) {
  const t = new ln(e);
  return t.init(), t;
}
function un(e = {}) {
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
function pn(e) {
  const { context: t, hooks: n = {} } = e;
  return un({
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
function mn(e = document) {
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
function fn(e, t) {
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
var gn = class {
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
    try {
      const t = e.getItem(this.options.storageKey);
      if (!t) return null;
      const n = JSON.parse(t);
      return n.version !== this.options.stateVersion ? this.migrateState(n) : this.normalizeLoadedState(n);
    } catch {
      return null;
    }
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
}, Et = /* @__PURE__ */ new Map();
async function hn(e) {
  const t = String(e || "").trim().replace(/\/+$/, "");
  if (t === "") throw new Error("sync.client_base_path is required to load sync-core");
  return typeof window < "u" && window.__esignSyncCoreModule ? Dt(window.__esignSyncCoreModule) : (Et.has(t) || Et.set(t, Sn(t)), Et.get(t));
}
async function Sn(e) {
  return typeof window < "u" && typeof window.__esignSyncCoreLoader == "function" ? Dt(await window.__esignSyncCoreLoader(e)) : Dt(await import(`${e}/index.js`));
}
function Dt(e) {
  if (!e || typeof e.createInMemoryCache != "function" || typeof e.createFetchSyncTransport != "function" || typeof e.createSyncEngine != "function" || typeof e.parseReadEnvelope != "function") throw new TypeError("Invalid sync-core runtime module");
  return e;
}
var yn = class {
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
    }), n = await t.json().catch(() => ({}));
    if (!t.ok) throw new Error(String(n?.error?.message || `HTTP ${t.status}`));
    const i = this.normalizeResourceRef(n?.resource_ref);
    if (!i) throw new Error("Invalid agreement draft bootstrap response");
    return {
      resourceRef: i,
      snapshot: e.parseReadEnvelope(i, n?.draft || {}),
      wizardID: String(n?.wizard_id || "").trim()
    };
  }
  async ensureRuntime() {
    return this.syncModule ? this.syncModule : (this.syncModulePromise || (this.syncModulePromise = hn(this.syncConfig.client_base_path)), this.syncModule = await this.syncModulePromise, this.cache || (this.cache = this.syncModule.createInMemoryCache()), this.transport || (this.transport = this.syncModule.createFetchSyncTransport({
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
}, vn = class {
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
}, Wt = "[esign-send]";
function et(e) {
  const t = String(e ?? "").trim();
  return t === "" ? null : t;
}
function Tt(e) {
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function bn() {
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
  console.info(Wt, e, t);
}
function Ze(e, t = {}) {
  console.warn(Wt, e, t);
}
var wn = class {
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
    }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), Ze("sync_perform_conflict", Ae({
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
function In() {
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
function mt(e, t, n = "") {
  const i = e.querySelector(t);
  return (i instanceof HTMLInputElement || i instanceof HTMLTextAreaElement || i instanceof HTMLSelectElement) && i.value || n;
}
function _n(e, t, n = !1) {
  const i = e.querySelector(t);
  return i instanceof HTMLInputElement ? i.checked : n;
}
function xt(e, t) {
  e instanceof HTMLButtonElement && (e.disabled = t);
}
function En(e) {
  const { documentIdInput: t, selectedDocumentTitle: n, participantsContainer: i, fieldDefinitionsContainer: o, submitBtn: d, escapeHtml: f, getSignerParticipants: v, getCurrentDocumentPageCount: P, collectFieldRulesForState: T, expandRulesForPreview: M, findSignersMissingRequiredSignatureField: F, goToStep: B } = e;
  function _() {
    const a = Ve("send-readiness-loading"), u = Ve("send-readiness-results"), l = Ve("send-validation-status"), h = Ve("send-validation-issues"), $ = Ve("send-issues-list"), O = Ve("send-confirmation"), x = Ve("review-agreement-title"), I = Ve("review-document-title"), g = Ve("review-participant-count"), U = Ve("review-stage-count"), j = Ve("review-participants-list"), z = Ve("review-fields-summary"), N = document.getElementById("title");
    if (!a || !u || !l || !h || !$ || !O || !x || !I || !g || !U || !j || !z || !(N instanceof HTMLInputElement)) return;
    const Z = N.value || "Untitled", K = n?.textContent || "No document", ge = i.querySelectorAll(".participant-entry"), ye = o.querySelectorAll(".field-definition-entry"), J = M(T(), P()), ce = v(), ie = /* @__PURE__ */ new Set();
    ge.forEach((W) => {
      const ve = W.querySelector(".signing-stage-input"), q = W.querySelector('select[name*=".role"]');
      q instanceof HTMLSelectElement && q.value === "signer" && ve instanceof HTMLInputElement && ve.value && ie.add(Number.parseInt(ve.value, 10));
    }), x.textContent = Z, I.textContent = K, g.textContent = `${ge.length} (${ce.length} signers)`, U.textContent = String(ie.size > 0 ? ie.size : 1), j.innerHTML = "", ge.forEach((W) => {
      const ve = mt(W, 'input[name*=".name"]'), q = mt(W, 'input[name*=".email"]'), Pe = mt(W, 'select[name*=".role"]', "signer"), _e = mt(W, ".signing-stage-input"), oe = _n(W, ".notify-input", !0), ue = document.createElement("div");
      ue.className = "flex items-center justify-between text-sm", ue.innerHTML = `
        <div>
          <span class="font-medium">${f(ve || q)}</span>
          <span class="text-gray-500 ml-2">${f(q)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${Pe === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${Pe === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${oe ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${oe ? "Notify" : "No Notify"}
          </span>
          ${Pe === "signer" && _e ? `<span class="text-xs text-gray-500">Stage ${_e}</span>` : ""}
        </div>
      `, j.appendChild(ue);
    });
    const he = ye.length + J.length;
    z.textContent = `${he} field${he !== 1 ? "s" : ""} defined (${ye.length} manual, ${J.length} generated)`;
    const pe = [];
    t?.value || pe.push({
      severity: "error",
      message: "No document selected",
      action: "Go to Step 1",
      step: 1
    }), ce.length === 0 && pe.push({
      severity: "error",
      message: "No signers added",
      action: "Go to Step 3",
      step: 3
    }), F().forEach((W) => {
      pe.push({
        severity: "error",
        message: `${W.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const we = Array.from(ie).sort((W, ve) => W - ve);
    for (let W = 0; W < we.length; W++) if (we[W] !== W + 1) {
      pe.push({
        severity: "warning",
        message: "Signing stages should be sequential starting from 1",
        action: "Review stages",
        step: 3
      });
      break;
    }
    const Fe = pe.some((W) => W.severity === "error"), Ie = pe.some((W) => W.severity === "warning");
    Fe ? (l.className = "p-4 rounded-lg bg-red-50 border border-red-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, O.classList.add("hidden"), xt(d, !0)) : Ie ? (l.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, O.classList.remove("hidden"), xt(d, !1)) : (l.className = "p-4 rounded-lg bg-green-50 border border-green-200", l.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, O.classList.remove("hidden"), xt(d, !1)), pe.length > 0 ? (h.classList.remove("hidden"), $.innerHTML = "", pe.forEach((W) => {
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
    })) : h.classList.add("hidden"), a.classList.add("hidden"), u.classList.remove("hidden");
  }
  return { initSendReadinessCheck: _ };
}
function kt(e, t = 0) {
  const n = Number.parseInt(String(e || "").trim(), 10);
  return Number.isFinite(n) ? n : t;
}
function xn(e) {
  const { totalWizardSteps: t, wizardStep: n, nextStepLabels: i, submitBtn: o, previewCard: d, updateCoordinationUI: f, validateStep: v, onPlacementStep: P, onReviewStep: T, onStepChanged: M, initialStep: F = 1 } = e;
  let B = F;
  const _ = Array.from(document.querySelectorAll(".wizard-step-btn")), a = Array.from(document.querySelectorAll(".wizard-step")), u = Array.from(document.querySelectorAll(".wizard-connector")), l = document.getElementById("wizard-prev-btn"), h = document.getElementById("wizard-next-btn"), $ = document.getElementById("wizard-save-btn");
  function O() {
    if (_.forEach((g, U) => {
      const j = U + 1, z = g.querySelector(".wizard-step-number");
      z instanceof HTMLElement && (j < B ? (g.classList.remove("text-gray-500", "text-blue-600"), g.classList.add("text-green-600"), z.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), z.classList.add("bg-green-600", "text-white"), g.removeAttribute("aria-current")) : j === B ? (g.classList.remove("text-gray-500", "text-green-600"), g.classList.add("text-blue-600"), z.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), z.classList.add("bg-blue-600", "text-white"), g.setAttribute("aria-current", "step")) : (g.classList.remove("text-blue-600", "text-green-600"), g.classList.add("text-gray-500"), z.classList.remove("bg-blue-600", "text-white", "bg-green-600"), z.classList.add("bg-gray-300", "text-gray-600"), g.removeAttribute("aria-current")));
    }), u.forEach((g, U) => {
      U < B - 1 ? (g.classList.remove("bg-gray-300"), g.classList.add("bg-green-600")) : (g.classList.remove("bg-green-600"), g.classList.add("bg-gray-300"));
    }), a.forEach((g) => {
      kt(g.dataset.step) === B ? g.classList.remove("hidden") : g.classList.add("hidden");
    }), l?.classList.toggle("hidden", B === 1), h?.classList.toggle("hidden", B === t), $?.classList.toggle("hidden", B !== t), o.classList.toggle("hidden", B !== t), f(), B < t) {
      const g = i[B] || "Next";
      h && (h.innerHTML = `
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
      B = g, O(), M?.(g), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({
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
    }), l?.addEventListener("click", () => x(B - 1)), h?.addEventListener("click", () => x(B + 1)), $?.addEventListener("click", () => {
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
    updateWizardUI: O
  };
}
function Mt(e) {
  return e.querySelector('select[name*=".role"]');
}
function Ln(e) {
  return e.querySelector(".field-participant-select");
}
function ht(e) {
  return typeof e == "object" && e !== null;
}
function Rn(e, t, n = {}) {
  const i = new Error(t);
  return i.code = String(e || "").trim(), Number(n.status || 0) > 0 && (i.status = Number(n.status || 0)), Number(n.currentRevision || 0) > 0 && (i.currentRevision = Number(n.currentRevision || 0)), Number(n.conflict?.currentRevision || 0) > 0 && (i.conflict = { currentRevision: Number(n.conflict?.currentRevision || 0) }), i;
}
function Cn(e, t = 0) {
  if (!ht(e)) return Number(t || 0);
  const n = e, i = Number(n.currentRevision || 0);
  if (i > 0) return i;
  const o = Number(n.conflict?.currentRevision || 0);
  return o > 0 ? o : Number(t || 0);
}
function An(e) {
  const { config: t, form: n, submitBtn: i, documentIdInput: o, documentSearch: d, participantsContainer: f, addParticipantBtn: v, fieldDefinitionsContainer: P, fieldRulesContainer: T, documentPageCountInput: M, fieldPlacementsJSONInput: F, fieldRulesJSONInput: B, storageKey: _, syncService: a, syncOrchestrator: u, stateManager: l, submitMode: h, totalWizardSteps: $, wizardStep: O, getCurrentStep: x, getPlacementState: I, getCurrentDocumentPageCount: g, ensureSelectedDocumentCompatibility: U, collectFieldRulesForState: j, collectFieldRulesForForm: z, expandRulesForPreview: N, findSignersMissingRequiredSignatureField: Z, missingSignatureFieldMessage: K, getSignerParticipants: ge, getReviewConfigForState: ye, isStartReviewEnabled: J, setPrimaryActionLabel: ce, buildCanonicalAgreementPayload: ie, announceError: he, emitWizardTelemetry: pe, parseAPIError: we, goToStep: Fe, showSyncConflictDialog: Ie, surfaceSyncOutcome: W, updateSyncStatus: ve, activeTabOwnershipRequiredCode: q = "ACTIVE_TAB_OWNERSHIP_REQUIRED", getActiveTabDebugState: Pe, addFieldBtn: _e } = e;
  let oe = null;
  function ue() {
    return Pe?.() || {};
  }
  function Be(le, m = !1) {
    i.setAttribute("aria-busy", m ? "true" : "false"), i.innerHTML = m ? `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${le}
        ` : `
          <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          ${le}
        `;
  }
  async function je() {
    Ge("persist_latest_wizard_state_start", Ae({
      state: l.getState(),
      storageKey: _,
      ownership: ue(),
      sendAttemptId: oe
    })), l.updateState(l.collectFormState());
    const le = await u.forceSync();
    if (le?.blocked && le.reason === "passive_tab")
      throw Ze("persist_latest_wizard_state_blocked", Ae({
        state: l.getState(),
        storageKey: _,
        ownership: ue(),
        sendAttemptId: oe,
        extra: { reason: le.reason }
      })), {
        code: q,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const m = l.getState();
    if (m?.syncPending)
      throw Ze("persist_latest_wizard_state_unsynced", Ae({
        state: m,
        storageKey: _,
        ownership: ue(),
        sendAttemptId: oe
      })), new Error("Unable to sync latest draft changes");
    return Ge("persist_latest_wizard_state_complete", Ae({
      state: m,
      storageKey: _,
      ownership: ue(),
      sendAttemptId: oe
    })), m;
  }
  async function $e() {
    Ge("ensure_draft_ready_for_send_start", Ae({
      state: l.getState(),
      storageKey: _,
      ownership: ue(),
      sendAttemptId: oe
    }));
    const le = await je(), m = String(le?.serverDraftId || "").trim();
    if (!m) {
      Ze("ensure_draft_ready_for_send_missing_draft", Ae({
        state: le,
        storageKey: _,
        ownership: ue(),
        sendAttemptId: oe,
        extra: { action: "create_draft" }
      }));
      const p = await a.create(le), y = String(p.id || "").trim(), A = Number(p.revision || 0);
      return y && A > 0 && l.markSynced(y, A), Ge("ensure_draft_ready_for_send_created", Ae({
        state: l.getState(),
        storageKey: _,
        ownership: ue(),
        sendAttemptId: oe,
        extra: {
          loadedDraftId: y,
          loadedRevision: A
        }
      })), {
        draftID: y,
        revision: A
      };
    }
    try {
      Ge("ensure_draft_ready_for_send_loading", Ae({
        state: le,
        storageKey: _,
        ownership: ue(),
        sendAttemptId: oe,
        extra: { targetDraftId: m }
      }));
      const p = await a.load(m), y = String(p?.id || m).trim(), A = Number(p?.revision || le?.serverRevision || 0);
      return y && A > 0 && l.markSynced(y, A), Ge("ensure_draft_ready_for_send_loaded", Ae({
        state: l.getState(),
        storageKey: _,
        ownership: ue(),
        sendAttemptId: oe,
        extra: {
          loadedDraftId: y,
          loadedRevision: A
        }
      })), {
        draftID: y,
        revision: A > 0 ? A : Number(le?.serverRevision || 0)
      };
    } catch (p) {
      throw Number(ht(p) && p.status || 0) !== 404 ? (Ze("ensure_draft_ready_for_send_load_failed", Ae({
        state: le,
        storageKey: _,
        ownership: ue(),
        sendAttemptId: oe,
        extra: {
          targetDraftId: m,
          status: Number(ht(p) && p.status || 0)
        }
      })), p) : (Ze("ensure_draft_ready_for_send_missing_remote_draft", Ae({
        state: le,
        storageKey: _,
        ownership: ue(),
        sendAttemptId: oe,
        extra: {
          targetDraftId: m,
          status: 404
        }
      })), pe("wizard_send_not_found", {
        draft_id: m,
        status: 404,
        phase: "pre_send"
      }), await Ne().catch(() => {
      }), Rn("DRAFT_SEND_NOT_FOUND", "Draft not found", { status: 404 }));
    }
  }
  async function Ne() {
    const le = l.getState();
    l.setState({
      ...le,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await u.forceSync();
  }
  function Oe() {
    n.addEventListener("submit", function(le) {
      if (ie(), !o.value) {
        le.preventDefault(), he("Please select a document"), d.focus();
        return;
      }
      if (!U()) {
        le.preventDefault();
        return;
      }
      const m = f.querySelectorAll(".participant-entry");
      if (m.length === 0) {
        le.preventDefault(), he("Please add at least one participant"), v.focus();
        return;
      }
      let p = !1;
      if (m.forEach((L) => {
        Mt(L)?.value === "signer" && (p = !0);
      }), !p) {
        le.preventDefault(), he("At least one signer is required");
        const L = m[0] ? Mt(m[0]) : null;
        L && L.focus();
        return;
      }
      const y = P.querySelectorAll(".field-definition-entry"), A = Z();
      if (A.length > 0) {
        le.preventDefault(), he(K(A)), Fe(O.FIELDS), _e.focus();
        return;
      }
      let ee = !1;
      if (y.forEach((L) => {
        Ln(L)?.value || (ee = !0);
      }), ee) {
        le.preventDefault(), he("Please assign all fields to a signer");
        const L = P.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        L && L.focus();
        return;
      }
      if (j().some((L) => !L.participantId)) {
        le.preventDefault(), he("Please assign all automation rules to a signer"), Array.from(T?.querySelectorAll(".field-rule-participant-select") || []).find((L) => !L.value)?.focus();
        return;
      }
      const te = !!n.querySelector('input[name="save_as_draft"]'), Y = x() === $ && !te && J(), de = x() === $ && !te && !Y;
      if (de) {
        let L = n.querySelector('input[name="send_for_signature"]');
        L || (L = document.createElement("input"), L.type = "hidden", L.name = "send_for_signature", n.appendChild(L)), L.value = "1";
      } else n.querySelector('input[name="send_for_signature"]')?.remove();
      if (h === "json") {
        le.preventDefault(), i.disabled = !0, Be(de ? "Sending..." : Y ? "Starting Review..." : "Saving...", !0), (async () => {
          try {
            ie();
            const L = String(t.routes?.index || "").trim();
            if (!de && !Y) {
              if (await je(), L) {
                window.location.href = L;
                return;
              }
              window.location.reload();
              return;
            }
            if (Y) {
              const Se = ye();
              if (!Se.enabled) throw new Error("Review mode is not enabled.");
              if ((Se.participants || []).length === 0) throw new Error("Add at least one reviewer before starting review.");
            }
            oe = bn(), Ge("send_submit_start", Ae({
              state: l.getState(),
              storageKey: _,
              ownership: ue(),
              sendAttemptId: oe
            }));
            const V = await $e(), Q = String(V?.draftID || "").trim(), re = Number(V?.revision || 0);
            if (!Q || re <= 0) throw new Error("Draft session not available. Please try again.");
            Ge("send_request_start", Ae({
              state: l.getState(),
              storageKey: _,
              ownership: ue(),
              sendAttemptId: oe,
              extra: {
                targetDraftId: Q,
                expectedRevision: re,
                operation: Y ? "start_review" : "send"
              }
            }));
            const se = Y ? await a.startReview(re, oe || Q) : await a.send(re, oe || Q), me = String(se?.agreement_id || se?.id || se?.data?.agreement_id || se?.data?.id || "").trim();
            if (Ge("send_request_success", Ae({
              state: l.getState(),
              storageKey: _,
              ownership: ue(),
              sendAttemptId: oe,
              extra: {
                targetDraftId: Q,
                expectedRevision: re,
                agreementId: me,
                operation: Y ? "start_review" : "send"
              }
            })), l.clear(), u.broadcastStateUpdate(), u.broadcastDraftDisposed?.(Q, "send_completed"), oe = null, me && L) {
              window.location.href = `${L}/${encodeURIComponent(me)}`;
              return;
            }
            if (L) {
              window.location.href = L;
              return;
            }
            window.location.reload();
          } catch (L) {
            const V = ht(L) ? L : {}, Q = String(V.message || "Failed to process agreement").trim();
            let re = String(V.code || "").trim();
            const se = Number(V.status || 0);
            if (re.toUpperCase() === "STALE_REVISION") {
              const me = Cn(L, Number(l.getState()?.serverRevision || 0));
              ve?.("conflict"), Ie?.(me), pe("wizard_send_conflict", {
                draft_id: String(l.getState()?.serverDraftId || "").trim(),
                current_revision: me,
                status: se || 409
              }), i.disabled = !1, ce(J() ? "Start Review" : "Send for Signature"), oe = null;
              return;
            }
            re.toUpperCase() === "NOT_FOUND" && (re = "DRAFT_SEND_NOT_FOUND", pe("wizard_send_not_found", {
              draft_id: String(l.getState()?.serverDraftId || "").trim(),
              status: se || 404
            }), await Ne().catch(() => {
            })), Ze("send_request_failed", Ae({
              state: l.getState(),
              storageKey: _,
              ownership: ue(),
              sendAttemptId: oe,
              extra: {
                code: re || null,
                status: se,
                message: Q
              }
            })), he(Q, re, se), i.disabled = !1, ce(J() ? "Start Review" : "Send for Signature"), oe = null;
          }
        })();
        return;
      }
      i.disabled = !0, Be(de ? "Sending..." : Y ? "Starting Review..." : "Saving...", !0);
    });
  }
  return {
    bindEvents: Oe,
    ensureDraftReadyForSend: $e,
    persistLatestWizardState: je,
    resyncAfterSendNotFound: Ne
  };
}
var Ft = 150, Nt = 32;
function be(e) {
  return e == null ? "" : String(e).trim();
}
function Vt(e) {
  if (typeof e == "boolean") return e;
  const t = be(e).toLowerCase();
  return t === "" ? !1 : t === "1" || t === "true" || t === "on" || t === "yes";
}
function Dn(e) {
  return be(e).toLowerCase();
}
function De(e, t = 0) {
  if (typeof e == "number")
    return Number.isFinite(e) && e > 0 ? Math.floor(e) : t;
  const n = Number.parseInt(be(e), 10);
  return !Number.isFinite(n) || n <= 0 ? t : n;
}
function ft(e, t = 0) {
  if (typeof e == "number") return Number.isFinite(e) ? e : t;
  const n = Number.parseFloat(be(e));
  return Number.isFinite(n) ? n : t;
}
function St(e, t, n) {
  return !Number.isFinite(e) || e < t ? t : e > n ? n : e;
}
function dt(e, t) {
  const n = De(e, 0);
  return n <= 0 ? 0 : t > 0 && n > t ? t : n;
}
function ct(e, t, n = 1) {
  const i = De(n, 1), o = De(e, i);
  return t > 0 ? St(o, 1, t) : o > 0 ? o : i;
}
function Pn(e, t, n) {
  const i = De(n, 1);
  let o = dt(e, i), d = dt(t, i);
  return o <= 0 && (o = 1), d <= 0 && (d = i), d < o ? {
    start: d,
    end: o
  } : {
    start: o,
    end: d
  };
}
function bt(e) {
  if (e == null) return [];
  const t = Array.isArray(e) ? e.map((i) => be(i)) : be(e).split(","), n = /* @__PURE__ */ new Set();
  return t.forEach((i) => {
    const o = De(i, 0);
    o > 0 && n.add(o);
  }), Array.from(n).sort((i, o) => i - o);
}
function yt(e, t) {
  const n = De(t, 1), i = be(e.participantId ?? e.participant_id), o = bt(e.excludePages ?? e.exclude_pages), d = e.required, f = typeof d == "boolean" ? d : ![
    "0",
    "false",
    "off",
    "no"
  ].includes(be(d).toLowerCase());
  return {
    id: be(e.id),
    type: Dn(e.type),
    participantId: i,
    participantTempId: be(e.participantTempId) || i,
    fromPage: dt(e.fromPage ?? e.from_page, n),
    toPage: dt(e.toPage ?? e.to_page, n),
    page: dt(e.page, n),
    excludeLastPage: Vt(e.excludeLastPage ?? e.exclude_last_page),
    excludePages: o,
    required: f
  };
}
function Tn(e, t) {
  const n = be(e?.id);
  return n !== "" ? n : `rule-${t + 1}`;
}
function kn(e, t) {
  const n = De(t, 1), i = [];
  return e.forEach((o, d) => {
    const f = yt(o || {}, n);
    if (f.type === "") return;
    const v = Tn(f, d);
    if (f.type === "initials_each_page") {
      const P = Pn(f.fromPage, f.toPage, n), T = /* @__PURE__ */ new Set();
      bt(f.excludePages).forEach((M) => {
        M <= n && T.add(M);
      }), f.excludeLastPage && T.add(n);
      for (let M = P.start; M <= P.end; M += 1)
        T.has(M) || i.push({
          id: `${v}-initials-${M}`,
          type: "initials",
          page: M,
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
function Mn(e, t, n, i, o) {
  const d = De(n, 1);
  let f = e > 0 ? e : 1, v = t > 0 ? t : d;
  f = St(f, 1, d), v = St(v, 1, d), v < f && ([f, v] = [v, f]);
  const P = /* @__PURE__ */ new Set();
  o.forEach((M) => {
    const F = De(M, 0);
    F > 0 && P.add(St(F, 1, d));
  }), i && P.add(d);
  const T = [];
  for (let M = f; M <= v; M += 1) P.has(M) || T.push(M);
  return {
    pages: T,
    rangeStart: f,
    rangeEnd: v,
    excludedPages: Array.from(P).sort((M, F) => M - F),
    isEmpty: T.length === 0
  };
}
function Fn(e) {
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
function Lt(e) {
  const t = e || {};
  return {
    id: be(t.id),
    title: be(t.title || t.name) || "Untitled",
    pageCount: De(t.page_count ?? t.pageCount, 0),
    compatibilityTier: be(t.pdf_compatibility_tier ?? t.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: be(t.pdf_compatibility_reason ?? t.pdfCompatibilityReason).toLowerCase()
  };
}
function Kt(e) {
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
function ut(e, t = 0) {
  const n = e || {}, i = be(n.id) || `fi_init_${t}`, o = be(n.definitionId || n.definition_id || n.field_definition_id) || i, d = De(n.page ?? n.page_number, 1), f = ft(n.x ?? n.pos_x, 0), v = ft(n.y ?? n.pos_y, 0), P = ft(n.width, Ft), T = ft(n.height, Nt);
  return {
    id: i,
    definitionId: o,
    type: be(n.type) || "text",
    participantId: be(n.participantId || n.participant_id),
    participantName: be(n.participantName || n.participant_name) || "Unassigned",
    page: d > 0 ? d : 1,
    x: f >= 0 ? f : 0,
    y: v >= 0 ? v : 0,
    width: P > 0 ? P : Ft,
    height: T > 0 ? T : Nt,
    placementSource: Kt(n.placementSource || n.placement_source),
    linkGroupId: be(n.linkGroupId || n.link_group_id),
    linkedFromFieldId: be(n.linkedFromFieldId || n.linked_from_field_id),
    isUnlinked: Vt(n.isUnlinked ?? n.is_unlinked)
  };
}
function Nn(e, t = 0) {
  const n = ut(e, t);
  return {
    id: n.id,
    definition_id: n.definitionId,
    page: n.page,
    x: Math.round(n.x),
    y: Math.round(n.y),
    width: Math.round(n.width),
    height: Math.round(n.height),
    placement_source: Kt(n.placementSource),
    link_group_id: be(n.linkGroupId),
    linked_from_field_id: be(n.linkedFromFieldId),
    is_unlinked: !!n.isUnlinked
  };
}
function Le(e) {
  const t = document.getElementById(e);
  return t instanceof HTMLElement ? t : null;
}
function Xe(e) {
  const t = document.createElement("div");
  return t.textContent = String(e ?? ""), t.innerHTML;
}
function tt(e) {
  return typeof e == "object" && e !== null;
}
function Bn(e) {
  const { apiBase: t, apiVersionBase: n, documentsUploadURL: i, isEditMode: o, titleSource: d, normalizeTitleSource: f, stateManager: v, previewCard: P, parseAPIError: T, announceError: M, showToast: F, mapUserFacingError: B, renderFieldRulePreview: _ } = e, a = Le("document_id"), u = Le("selected-document"), l = Le("document-picker"), h = Le("document-search"), $ = Le("document-list"), O = Le("change-document-btn"), x = Le("selected-document-title"), I = Le("selected-document-info"), g = Le("document_page_count"), U = Le("document-remediation-panel"), j = Le("document-remediation-message"), z = Le("document-remediation-status"), N = Le("document-remediation-trigger-btn"), Z = Le("document-remediation-dismiss-btn"), K = Le("title"), ge = 300, ye = 5, J = 10, ce = Le("document-typeahead"), ie = Le("document-typeahead-dropdown"), he = Le("document-recent-section"), pe = Le("document-recent-list"), we = Le("document-search-section"), Fe = Le("document-search-list"), Ie = Le("document-empty-state"), W = Le("document-dropdown-loading"), ve = Le("document-search-loading"), q = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let Pe = [], _e = null, oe = 0, ue = null;
  const Be = /* @__PURE__ */ new Set(), je = /* @__PURE__ */ new Map();
  function $e(S) {
    return String(S || "").trim().toLowerCase();
  }
  function Ne(S) {
    return String(S || "").trim().toLowerCase();
  }
  function Oe(S) {
    return $e(S) === "unsupported";
  }
  function le() {
    !o && K && K.value.trim() !== "" && !v.hasResumableState() && v.setTitleSource(d.SERVER_SEED, { syncPending: !1 });
  }
  function m(S) {
    const w = De(S, 0);
    g && (g.value = String(w));
  }
  function p() {
    const S = De(g?.value || "0", 0);
    if (S > 0) return S;
    const w = String(I?.textContent || "").match(/(\d+)\s+pages?/i);
    if (w) {
      const E = De(w[1], 0);
      if (E > 0) return E;
    }
    return 1;
  }
  function y() {
    a && (a.value = ""), x && (x.textContent = ""), I && (I.textContent = ""), m(0), v.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), P.setDocument(null, null, null);
  }
  function A(S = "") {
    const w = "This document cannot be used because its PDF is incompatible with online signing.", E = Ne(S);
    return E ? `${w} Reason: ${E}. Select another document or upload a remediated PDF.` : `${w} Select another document or upload a remediated PDF.`;
  }
  function ee() {
    _e = null, z && (z.textContent = "", z.className = "mt-2 text-xs text-amber-800"), U && U.classList.add("hidden"), N && (N.disabled = !1, N.textContent = "Remediate PDF");
  }
  function te(S, w = "info") {
    z && (z.textContent = String(S || "").trim(), z.className = `mt-2 text-xs ${w === "error" ? "text-red-700" : w === "success" ? "text-green-700" : "text-amber-800"}`);
  }
  function Y(S, w = "") {
    !S || !U || !j || (_e = {
      id: String(S.id || "").trim(),
      title: String(S.title || "").trim(),
      pageCount: De(S.pageCount, 0),
      compatibilityReason: Ne(w || S.compatibilityReason || "")
    }, _e.id && (j.textContent = A(_e.compatibilityReason), te("Run remediation to make this document signable."), U.classList.remove("hidden")));
  }
  function de(S) {
    const w = K;
    if (!w) return;
    const E = v.getState(), C = w.value.trim(), G = f(E?.titleSource, C === "" ? d.AUTOFILL : d.USER);
    if (C && G === d.USER) return;
    const X = String(S || "").trim();
    X && (w.value = X, v.updateDetails({
      title: X,
      message: v.getState().details.message || ""
    }, { titleSource: d.AUTOFILL }));
  }
  function L(S, w, E) {
    if (!a || !x || !I || !u || !l) return;
    a.value = String(S || ""), x.textContent = w || "", I.textContent = `${E} pages`, m(E), u.classList.remove("hidden"), l.classList.add("hidden"), _(), de(w);
    const C = De(E, 0);
    v.updateDocument({
      id: S,
      title: w,
      pageCount: C
    }), P.setDocument(S, w, C), ee();
  }
  function V(S) {
    const w = String(S || "").trim();
    if (w === "") return null;
    const E = Pe.find((X) => String(X.id || "").trim() === w);
    if (E) return E;
    const C = q.recentDocuments.find((X) => String(X.id || "").trim() === w);
    if (C) return C;
    const G = q.searchResults.find((X) => String(X.id || "").trim() === w);
    return G || null;
  }
  function Q() {
    const S = V(a?.value || "");
    return S ? Oe($e(S.compatibilityTier)) ? (Y(S, S.compatibilityReason || ""), y(), M(A(S.compatibilityReason || "")), u && u.classList.add("hidden"), l && l.classList.remove("hidden"), h?.focus(), !1) : (ee(), !0) : !0;
  }
  function re() {
    if (!x || !I || !u || !l) return;
    const S = (a?.value || "").trim();
    if (!S) return;
    const w = Pe.find((E) => String(E.id || "").trim() === S);
    w && (x.textContent.trim() || (x.textContent = w.title || "Untitled"), (!I.textContent.trim() || I.textContent.trim() === "pages") && (I.textContent = `${w.pageCount || 0} pages`), m(w.pageCount || 0), u.classList.remove("hidden"), l.classList.add("hidden"));
  }
  async function se() {
    try {
      const S = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), w = await fetch(`${t}/panels/esign_documents?${S.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!w.ok) throw await T(w, "Failed to load documents");
      const E = await w.json();
      Pe = (Array.isArray(E?.records) ? E.records : Array.isArray(E?.items) ? E.items : []).slice().sort((C, G) => {
        const X = Date.parse(String(C?.created_at ?? C?.createdAt ?? C?.updated_at ?? C?.updatedAt ?? "")), b = Date.parse(String(G?.created_at ?? G?.createdAt ?? G?.updated_at ?? G?.updatedAt ?? "")), ae = Number.isFinite(X) ? X : 0;
        return (Number.isFinite(b) ? b : 0) - ae;
      }).map((C) => Lt(C)).filter((C) => C.id !== ""), me(Pe), re();
    } catch (S) {
      const w = B(tt(S) ? String(S.message || "Failed to load documents") : "Failed to load documents", tt(S) ? String(S.code || "") : "", tt(S) ? Number(S.status || 0) : 0);
      $ && ($.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${Xe(w)}</div>`);
    }
  }
  function me(S) {
    if (!$) return;
    if (S.length === 0) {
      $.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${Xe(i)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    $.innerHTML = S.map((E, C) => {
      const G = Xe(String(E.id || "").trim()), X = Xe(String(E.title || "").trim()), b = String(De(E.pageCount, 0)), ae = $e(E.compatibilityTier), ke = Ne(E.compatibilityReason), Te = Xe(ae), ze = Xe(ke), _t = Oe(ae) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${C === 0 ? "0" : "-1"}"
                data-document-id="${G}"
                data-document-title="${X}"
                data-document-pages="${b}"
                data-document-compatibility-tier="${Te}"
                data-document-compatibility-reason="${ze}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${X}</div>
            <div class="text-xs text-gray-500">${b} pages ${_t}</div>
          </div>
        </button>
      `;
    }).join("");
    const w = Array.from($.querySelectorAll(".document-option"));
    w.forEach((E, C) => {
      E.addEventListener("click", () => Se(E)), E.addEventListener("keydown", (G) => {
        let X = C;
        if (G.key === "ArrowDown")
          G.preventDefault(), X = Math.min(C + 1, w.length - 1);
        else if (G.key === "ArrowUp")
          G.preventDefault(), X = Math.max(C - 1, 0);
        else if (G.key === "Enter" || G.key === " ") {
          G.preventDefault(), Se(E);
          return;
        } else G.key === "Home" ? (G.preventDefault(), X = 0) : G.key === "End" && (G.preventDefault(), X = w.length - 1);
        X !== C && (w[X].focus(), w[X].setAttribute("tabindex", "0"), E.setAttribute("tabindex", "-1"));
      });
    });
  }
  function Se(S) {
    const w = S.getAttribute("data-document-id"), E = S.getAttribute("data-document-title"), C = S.getAttribute("data-document-pages"), G = $e(S.getAttribute("data-document-compatibility-tier")), X = Ne(S.getAttribute("data-document-compatibility-reason"));
    if (Oe(G)) {
      Y({
        id: String(w || ""),
        title: String(E || ""),
        pageCount: De(C, 0),
        compatibilityReason: X
      }), y(), M(A(X)), h?.focus();
      return;
    }
    L(w, E, C);
  }
  async function r(S, w, E) {
    const C = String(S || "").trim();
    if (!C) return;
    const G = Date.now(), X = 12e4, b = 1250;
    for (; Date.now() - G < X; ) {
      const ae = await fetch(C, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!ae.ok) throw await T(ae, "Failed to read remediation status");
      const ke = (await ae.json())?.dispatch || {}, Te = String(ke?.status || "").trim().toLowerCase();
      if (Te === "succeeded") {
        te("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (Te === "failed" || Te === "canceled" || Te === "dead_letter") {
        const ze = String(ke?.terminal_reason || "").trim();
        throw {
          message: ze ? `Remediation failed: ${ze}` : "Remediation did not complete. Please upload a new document or try again.",
          code: "REMEDIATION_FAILED",
          status: 422
        };
      }
      te(Te === "retrying" ? "Remediation is retrying in the queue..." : Te === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((ze) => setTimeout(ze, b));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${w} (${E})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function s() {
    const S = _e;
    if (!S || !S.id) return;
    const w = String(S.id || "").trim();
    if (!(!w || Be.has(w))) {
      Be.add(w), N && (N.disabled = !0, N.textContent = "Remediating...");
      try {
        let E = je.get(w) || "";
        E || (E = `esign-remediate-${w}-${Date.now()}`, je.set(w, E));
        const C = `${n}/esign/documents/${encodeURIComponent(w)}/remediate`, G = await fetch(C, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": E
          }
        });
        if (!G.ok) throw await T(G, "Failed to trigger remediation");
        const X = await G.json(), b = X?.receipt || {}, ae = String(b?.dispatch_id || X?.dispatch_id || "").trim(), ke = String(b?.mode || X?.mode || "").trim().toLowerCase();
        let Te = String(X?.dispatch_status_url || "").trim();
        !Te && ae && (Te = `${n}/esign/dispatches/${encodeURIComponent(ae)}`), ke === "queued" && ae && Te && (te("Remediation queued. Monitoring progress..."), await r(Te, ae, w)), await se();
        const ze = V(w);
        if (!ze || Oe(ze.compatibilityTier)) {
          te("Remediation finished, but this PDF is still incompatible.", "error"), M("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        L(ze.id, ze.title, ze.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : F("Document remediated successfully. You can continue.", "success");
      } catch (E) {
        const C = tt(E) ? String(E.message || "Remediation failed").trim() : "Remediation failed", G = tt(E) ? String(E.code || "") : "", X = tt(E) ? Number(E.status || 0) : 0;
        te(C, "error"), M(C, G, X);
      } finally {
        Be.delete(w), N && (N.disabled = !1, N.textContent = "Remediate PDF");
      }
    }
  }
  function c(S, w) {
    let E = null;
    return (...C) => {
      E !== null && clearTimeout(E), E = setTimeout(() => {
        S(...C), E = null;
      }, w);
    };
  }
  async function R() {
    try {
      const S = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(ye)
      }), w = await fetch(`${t}/panels/esign_documents?${S}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!w.ok) {
        console.warn("Failed to load recent documents:", w.status);
        return;
      }
      const E = await w.json();
      q.recentDocuments = (Array.isArray(E?.records) ? E.records : Array.isArray(E?.items) ? E.items : []).map((C) => Lt(C)).filter((C) => C.id !== "").slice(0, ye);
    } catch (S) {
      console.warn("Error loading recent documents:", S);
    }
  }
  async function k(S) {
    const w = S.trim();
    if (!w) {
      ue && (ue.abort(), ue = null), q.isSearchMode = !1, q.searchResults = [], fe();
      return;
    }
    const E = ++oe;
    ue && ue.abort(), ue = new AbortController(), q.isLoading = !0, q.isSearchMode = !0, fe();
    try {
      const C = new URLSearchParams({
        q: w,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(J)
      }), G = await fetch(`${t}/panels/esign_documents?${C}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: ue.signal
      });
      if (E !== oe) return;
      if (!G.ok) {
        console.warn("Failed to search documents:", G.status), q.searchResults = [], q.isLoading = !1, fe();
        return;
      }
      const X = await G.json();
      q.searchResults = (Array.isArray(X?.records) ? X.records : Array.isArray(X?.items) ? X.items : []).map((b) => Lt(b)).filter((b) => b.id !== "").slice(0, J);
    } catch (C) {
      if (tt(C) && C.name === "AbortError") return;
      console.warn("Error searching documents:", C), q.searchResults = [];
    } finally {
      E === oe && (q.isLoading = !1, fe());
    }
  }
  const D = c(k, ge);
  function H() {
    ie && (q.isOpen = !0, q.selectedIndex = -1, ie.classList.remove("hidden"), h?.setAttribute("aria-expanded", "true"), $?.classList.add("hidden"), fe());
  }
  function ne() {
    ie && (q.isOpen = !1, q.selectedIndex = -1, ie.classList.add("hidden"), h?.setAttribute("aria-expanded", "false"), $?.classList.remove("hidden"));
  }
  function Ce(S, w, E) {
    S && (S.innerHTML = w.map((C, G) => {
      const X = G, b = q.selectedIndex === X, ae = Xe(String(C.id || "").trim()), ke = Xe(String(C.title || "").trim()), Te = String(De(C.pageCount, 0)), ze = $e(C.compatibilityTier), _t = Ne(C.compatibilityReason), Qt = Xe(ze), en = Xe(_t), tn = Oe(ze) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${b ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${b}"
          tabindex="-1"
          data-document-id="${ae}"
          data-document-title="${ke}"
          data-document-pages="${Te}"
          data-document-compatibility-tier="${Qt}"
          data-document-compatibility-reason="${en}"
          data-typeahead-index="${X}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${ke}</div>
            <div class="text-xs text-gray-500">${Te} pages ${tn}</div>
          </div>
        </button>
      `;
    }).join(""), S.querySelectorAll(".typeahead-option").forEach((C) => {
      C.addEventListener("click", () => Ee(C));
    }));
  }
  function fe() {
    if (ie) {
      if (q.isLoading) {
        W?.classList.remove("hidden"), he?.classList.add("hidden"), we?.classList.add("hidden"), Ie?.classList.add("hidden"), ve?.classList.remove("hidden");
        return;
      }
      W?.classList.add("hidden"), ve?.classList.add("hidden"), q.isSearchMode ? (he?.classList.add("hidden"), q.searchResults.length > 0 ? (we?.classList.remove("hidden"), Ie?.classList.add("hidden"), Ce(Fe, q.searchResults, "search")) : (we?.classList.add("hidden"), Ie?.classList.remove("hidden"))) : (we?.classList.add("hidden"), q.recentDocuments.length > 0 ? (he?.classList.remove("hidden"), Ie?.classList.add("hidden"), Ce(pe, q.recentDocuments, "recent")) : (he?.classList.add("hidden"), Ie?.classList.remove("hidden"), Ie && (Ie.textContent = "No recent documents")));
    }
  }
  function Ee(S) {
    const w = S.getAttribute("data-document-id"), E = S.getAttribute("data-document-title"), C = S.getAttribute("data-document-pages"), G = $e(S.getAttribute("data-document-compatibility-tier")), X = Ne(S.getAttribute("data-document-compatibility-reason"));
    if (w) {
      if (Oe(G)) {
        Y({
          id: String(w || ""),
          title: String(E || ""),
          pageCount: De(C, 0),
          compatibilityReason: X
        }), y(), M(A(X)), h?.focus();
        return;
      }
      L(w, E, C), ne(), h && (h.value = ""), q.query = "", q.isSearchMode = !1, q.searchResults = [];
    }
  }
  function We() {
    if (!ie) return;
    const S = ie.querySelector(`[data-typeahead-index="${q.selectedIndex}"]`);
    S && S.scrollIntoView({ block: "nearest" });
  }
  function Ke(S) {
    if (!q.isOpen) {
      (S.key === "ArrowDown" || S.key === "Enter") && (S.preventDefault(), H());
      return;
    }
    const w = q.isSearchMode ? q.searchResults : q.recentDocuments, E = w.length - 1;
    switch (S.key) {
      case "ArrowDown":
        S.preventDefault(), q.selectedIndex = Math.min(q.selectedIndex + 1, E), fe(), We();
        break;
      case "ArrowUp":
        S.preventDefault(), q.selectedIndex = Math.max(q.selectedIndex - 1, 0), fe(), We();
        break;
      case "Enter":
        if (S.preventDefault(), q.selectedIndex >= 0 && q.selectedIndex <= E) {
          const C = w[q.selectedIndex];
          if (C) {
            const G = document.createElement("button");
            G.setAttribute("data-document-id", C.id), G.setAttribute("data-document-title", C.title), G.setAttribute("data-document-pages", String(C.pageCount)), G.setAttribute("data-document-compatibility-tier", String(C.compatibilityTier || "")), G.setAttribute("data-document-compatibility-reason", String(C.compatibilityReason || "")), Ee(G);
          }
        }
        break;
      case "Escape":
        S.preventDefault(), ne();
        break;
      case "Tab":
        ne();
        break;
      case "Home":
        S.preventDefault(), q.selectedIndex = 0, fe(), We();
        break;
      case "End":
        S.preventDefault(), q.selectedIndex = E, fe(), We();
        break;
    }
  }
  function xe() {
    O && O.addEventListener("click", () => {
      u?.classList.add("hidden"), l?.classList.remove("hidden"), ee(), h?.focus(), H();
    }), N && N.addEventListener("click", () => {
      s();
    }), Z && Z.addEventListener("click", () => {
      ee(), h?.focus();
    }), h && (h.addEventListener("input", (S) => {
      const w = S.target;
      if (!(w instanceof HTMLInputElement)) return;
      const E = w.value;
      q.query = E, q.isOpen || H(), E.trim() ? (q.isLoading = !0, fe(), D(E)) : (q.isSearchMode = !1, q.searchResults = [], fe()), me(Pe.filter((C) => String(C.title || "").toLowerCase().includes(E.toLowerCase())));
    }), h.addEventListener("focus", () => {
      H();
    }), h.addEventListener("keydown", Ke)), document.addEventListener("click", (S) => {
      const w = S.target;
      ce && !(w instanceof Node && ce.contains(w)) && ne();
    });
  }
  return {
    refs: {
      documentIdInput: a,
      selectedDocument: u,
      documentPicker: l,
      documentSearch: h,
      documentList: $,
      selectedDocumentTitle: x,
      selectedDocumentInfo: I,
      documentPageCountInput: g
    },
    bindEvents: xe,
    initializeTitleSourceSeed: le,
    loadDocuments: se,
    loadRecentDocuments: R,
    ensureSelectedDocumentCompatibility: Q,
    getCurrentDocumentPageCount: p
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
function $n(e = {}) {
  const { initialParticipants: t = [], onParticipantsChanged: n } = e, i = document.getElementById("participants-container"), o = document.getElementById("participant-template"), d = document.getElementById("add-participant-btn");
  let f = 0, v = 0;
  function P() {
    return `temp_${Date.now()}_${f++}`;
  }
  function T(u = {}) {
    if (!(o instanceof HTMLTemplateElement) || !i) return;
    const l = o.content.cloneNode(!0), h = l.querySelector(".participant-entry");
    if (!(h instanceof HTMLElement)) return;
    const $ = u.id || P();
    h.setAttribute("data-participant-id", $);
    const O = Ye(h, ".participant-id-input"), x = Ye(h, 'input[name="participants[].name"]'), I = Ye(h, 'input[name="participants[].email"]'), g = Rt(h, 'select[name="participants[].role"]'), U = Ye(h, 'input[name="participants[].signing_stage"]'), j = Ye(h, 'input[name="participants[].notify"]'), z = h.querySelector(".signing-stage-wrapper");
    if (!O || !x || !I || !g) return;
    const N = v++;
    O.name = `participants[${N}].id`, O.value = $, x.name = `participants[${N}].name`, I.name = `participants[${N}].email`, g.name = `participants[${N}].role`, U && (U.name = `participants[${N}].signing_stage`), j && (j.name = `participants[${N}].notify`), u.name && (x.value = u.name), u.email && (I.value = u.email), u.role && (g.value = u.role), U && u.signing_stage && (U.value = String(u.signing_stage)), j && (j.checked = u.notify !== !1);
    const Z = () => {
      if (!(z instanceof HTMLElement) || !U) return;
      const K = g.value === "signer";
      z.classList.toggle("hidden", !K), K ? U.value || (U.value = "1") : U.value = "";
    };
    Z(), h.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      h.remove(), n?.();
    }), g.addEventListener("change", () => {
      Z(), n?.();
    }), i.appendChild(l);
  }
  function M() {
    i && (t.length > 0 ? t.forEach((u) => {
      T({
        id: String(u.id || "").trim(),
        name: String(u.name || "").trim(),
        email: String(u.email || "").trim(),
        role: String(u.role || "signer").trim() || "signer",
        notify: u.notify !== !1,
        signing_stage: Number(u.signing_stage || u.signingStage || 1) || 1
      });
    }) : T());
  }
  function F() {
    i && (d?.addEventListener("click", () => T()), new MutationObserver(() => {
      n?.();
    }).observe(i, {
      childList: !0,
      subtree: !0
    }), i.addEventListener("change", (u) => {
      const l = u.target;
      l instanceof Element && (l.matches('select[name*=".role"]') || l.matches('input[name*=".name"]') || l.matches('input[name*=".email"]')) && n?.();
    }), i.addEventListener("input", (u) => {
      const l = u.target;
      l instanceof Element && (l.matches('input[name*=".name"]') || l.matches('input[name*=".email"]')) && n?.();
    }));
  }
  function B() {
    if (!i) return [];
    const u = i.querySelectorAll(".participant-entry"), l = [];
    return u.forEach((h) => {
      const $ = h.getAttribute("data-participant-id"), O = Rt(h, 'select[name*=".role"]'), x = Ye(h, 'input[name*=".name"]'), I = Ye(h, 'input[name*=".email"]');
      O?.value === "signer" && l.push({
        id: String($ || ""),
        name: x?.value || I?.value || "Signer",
        email: I?.value || ""
      });
    }), l;
  }
  function _() {
    if (!i) return [];
    const u = [];
    return i.querySelectorAll(".participant-entry").forEach((l) => {
      const h = l.getAttribute("data-participant-id"), $ = Ye(l, 'input[name*=".name"]')?.value || "", O = Ye(l, 'input[name*=".email"]')?.value || "", x = Rt(l, 'select[name*=".role"]')?.value || "signer", I = Number.parseInt(Ye(l, ".signing-stage-input")?.value || "1", 10), g = Ye(l, ".notify-input")?.checked !== !1;
      u.push({
        tempId: String(h || ""),
        name: $,
        email: O,
        role: x,
        notify: g,
        signingStage: Number.isFinite(I) ? I : 1
      });
    }), u;
  }
  function a(u) {
    !i || !u?.participants || u.participants.length === 0 || (i.innerHTML = "", v = 0, u.participants.forEach((l) => {
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
    initialize: M,
    bindEvents: F,
    addParticipant: T,
    getSignerParticipants: B,
    collectParticipantsForState: _,
    restoreFromState: a
  };
}
function zn() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function wt() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function Un(e, t) {
  return {
    id: zn(),
    name: t,
    memberDefinitionIds: [...e],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function Yt(e, t) {
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
function Jt(e, t) {
  const n = e.definitionToGroup.get(t);
  if (n)
    return e.groups.get(n);
}
function qn(e, t) {
  const n = Jt(e, t.definitionId);
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
function On(e, t, n, i) {
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
function Hn(e) {
  const { initialFieldInstances: t = [], placementSource: n, getCurrentDocumentPageCount: i, getSignerParticipants: o, escapeHtml: d, onDefinitionsChanged: f, onRulesChanged: v, onParticipantsChanged: P, getPlacementLinkGroupState: T, setPlacementLinkGroupState: M } = e, F = Je("field-definitions-container"), B = document.getElementById("field-definition-template"), _ = Je("add-field-btn"), a = Je("add-field-btn-container"), u = Je("add-field-definition-empty-btn"), l = Je("field-definitions-empty-state"), h = Je("field-rules-container"), $ = document.getElementById("field-rule-template"), O = Je("add-field-rule-btn"), x = Je("field-rules-empty-state"), I = Je("field-rules-preview"), g = Je("field_rules_json"), U = Je("field_placements_json");
  let j = 0, z = 0, N = 0;
  function Z() {
    return `temp_field_${Date.now()}_${j++}`;
  }
  function K() {
    return `rule_${Date.now()}_${N}`;
  }
  function ge(m, p) {
    const y = String(m || "").trim();
    return y && p.some((A) => A.id === y) ? y : p.length === 1 ? p[0].id : "";
  }
  function ye(m, p, y = "") {
    if (!m) return;
    const A = ge(y, p);
    m.innerHTML = '<option value="">Select signer...</option>', p.forEach((ee) => {
      const te = document.createElement("option");
      te.value = ee.id, te.textContent = ee.name, m.appendChild(te);
    }), m.value = A;
  }
  function J(m = o()) {
    if (!F) return;
    const p = F.querySelectorAll(".field-participant-select"), y = h ? h.querySelectorAll(".field-rule-participant-select") : [];
    p.forEach((A) => {
      ye(A instanceof HTMLSelectElement ? A : null, m, A instanceof HTMLSelectElement ? A.value : "");
    }), y.forEach((A) => {
      ye(A instanceof HTMLSelectElement ? A : null, m, A instanceof HTMLSelectElement ? A.value : "");
    });
  }
  function ce() {
    !F || !l || (F.querySelectorAll(".field-definition-entry").length === 0 ? (l.classList.remove("hidden"), a?.classList.add("hidden")) : (l.classList.add("hidden"), a?.classList.remove("hidden")));
  }
  function ie() {
    if (!h || !x) return;
    const m = h.querySelectorAll(".field-rule-entry");
    x.classList.toggle("hidden", m.length > 0);
  }
  function he() {
    if (!F) return [];
    const m = [];
    return F.querySelectorAll(".field-definition-entry").forEach((p) => {
      const y = p.getAttribute("data-field-definition-id"), A = Ue(p, ".field-type-select")?.value || "signature", ee = Ue(p, ".field-participant-select")?.value || "", te = Number.parseInt(Re(p, 'input[name*=".page"]')?.value || "1", 10), Y = Re(p, 'input[name*=".required"]')?.checked ?? !0;
      m.push({
        tempId: String(y || ""),
        type: A,
        participantTempId: ee,
        page: Number.isFinite(te) ? te : 1,
        required: Y
      });
    }), m;
  }
  function pe() {
    if (!h) return [];
    const m = i(), p = h.querySelectorAll(".field-rule-entry"), y = [];
    return p.forEach((A) => {
      const ee = yt({
        id: A.getAttribute("data-field-rule-id") || "",
        type: Ue(A, ".field-rule-type-select")?.value || "",
        participantId: Ue(A, ".field-rule-participant-select")?.value || "",
        fromPage: Re(A, ".field-rule-from-page-input")?.value || "",
        toPage: Re(A, ".field-rule-to-page-input")?.value || "",
        page: Re(A, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!Re(A, ".field-rule-exclude-last-input")?.checked,
        excludePages: bt(Re(A, ".field-rule-exclude-pages-input")?.value || ""),
        required: (Ue(A, ".field-rule-required-select")?.value || "1") !== "0"
      }, m);
      ee.type && y.push(ee);
    }), y;
  }
  function we() {
    return pe().map((m) => ({
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
  function Fe(m, p) {
    return kn(m, p);
  }
  function Ie() {
    if (!I) return;
    const m = Fe(pe(), i()), p = o(), y = new Map(p.map((Y) => [String(Y.id), Y.name]));
    if (g && (g.value = JSON.stringify(we())), !m.length) {
      I.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const A = m.reduce((Y, de) => {
      const L = de.type;
      return Y[L] = (Y[L] || 0) + 1, Y;
    }, {}), ee = m.slice(0, 8).map((Y) => {
      const de = y.get(String(Y.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${Y.type === "initials" ? "Initials" : "Signature"} on page ${Y.page}</span><span class="text-gray-500">${d(String(de))}</span></li>`;
    }).join(""), te = m.length - 8;
    I.innerHTML = `
      <p class="text-gray-700">${m.length} generated field${m.length !== 1 ? "s" : ""} (${A.initials || 0} initials, ${A.signature || 0} signatures)</p>
      <ul class="space-y-1">${ee}</ul>
      ${te > 0 ? `<p class="text-gray-500">+${te} more</p>` : ""}
    `;
  }
  function W() {
    J(o()), Ie();
  }
  function ve(m) {
    const p = Ue(m, ".field-rule-type-select"), y = nt(m, ".field-rule-range-start-wrap"), A = nt(m, ".field-rule-range-end-wrap"), ee = nt(m, ".field-rule-page-wrap"), te = nt(m, ".field-rule-exclude-last-wrap"), Y = nt(m, ".field-rule-exclude-pages-wrap"), de = nt(m, ".field-rule-summary"), L = Re(m, ".field-rule-from-page-input"), V = Re(m, ".field-rule-to-page-input"), Q = Re(m, ".field-rule-page-input"), re = Re(m, ".field-rule-exclude-last-input"), se = Re(m, ".field-rule-exclude-pages-input");
    if (!p || !y || !A || !ee || !te || !Y || !de) return;
    const me = i(), Se = yt({
      type: p?.value || "",
      fromPage: L?.value || "",
      toPage: V?.value || "",
      page: Q?.value || "",
      excludeLastPage: !!re?.checked,
      excludePages: bt(se?.value || ""),
      required: !0
    }, me), r = Se.fromPage > 0 ? Se.fromPage : 1, s = Se.toPage > 0 ? Se.toPage : me, c = Se.page > 0 ? Se.page : Se.toPage > 0 ? Se.toPage : me, R = Se.excludeLastPage, k = Se.excludePages.join(","), D = p?.value === "initials_each_page";
    if (y.classList.toggle("hidden", !D), A.classList.toggle("hidden", !D), te.classList.toggle("hidden", !D), Y.classList.toggle("hidden", !D), ee.classList.toggle("hidden", D), L && (L.value = String(r)), V && (V.value = String(s)), Q && (Q.value = String(c)), se && (se.value = k), re && (re.checked = R), D) {
      const H = Mn(r, s, me, R, Se.excludePages), ne = Fn(H);
      de.textContent = H.isEmpty ? `Warning: No initials fields will be generated ${ne}.` : `Generates initials fields on ${ne}.`;
    } else de.textContent = `Generates one signature field on page ${c}.`;
  }
  function q(m = {}) {
    if (!($ instanceof HTMLTemplateElement) || !h) return;
    const p = $.content.cloneNode(!0), y = p.querySelector(".field-rule-entry");
    if (!(y instanceof HTMLElement)) return;
    const A = m.id || K(), ee = N++, te = i();
    y.setAttribute("data-field-rule-id", A);
    const Y = Re(y, ".field-rule-id-input"), de = Ue(y, ".field-rule-type-select"), L = Ue(y, ".field-rule-participant-select"), V = Re(y, ".field-rule-from-page-input"), Q = Re(y, ".field-rule-to-page-input"), re = Re(y, ".field-rule-page-input"), se = Ue(y, ".field-rule-required-select"), me = Re(y, ".field-rule-exclude-last-input"), Se = Re(y, ".field-rule-exclude-pages-input"), r = zt(y, ".remove-field-rule-btn");
    if (!Y || !de || !L || !V || !Q || !re || !se || !me || !Se || !r) return;
    Y.name = `field_rules[${ee}].id`, Y.value = A, de.name = `field_rules[${ee}].type`, L.name = `field_rules[${ee}].participant_id`, V.name = `field_rules[${ee}].from_page`, Q.name = `field_rules[${ee}].to_page`, re.name = `field_rules[${ee}].page`, se.name = `field_rules[${ee}].required`, me.name = `field_rules[${ee}].exclude_last_page`, Se.name = `field_rules[${ee}].exclude_pages`;
    const s = yt(m, te);
    de.value = s.type || "initials_each_page", ye(L, o(), s.participantId), V.value = String(s.fromPage > 0 ? s.fromPage : 1), Q.value = String(s.toPage > 0 ? s.toPage : te), re.value = String(s.page > 0 ? s.page : te), se.value = s.required ? "1" : "0", me.checked = s.excludeLastPage, Se.value = s.excludePages.join(",");
    const c = () => {
      ve(y), Ie(), v?.();
    }, R = () => {
      const D = i();
      if (V) {
        const H = parseInt(V.value, 10);
        Number.isFinite(H) && (V.value = String(ct(H, D, 1)));
      }
      if (Q) {
        const H = parseInt(Q.value, 10);
        Number.isFinite(H) && (Q.value = String(ct(H, D, 1)));
      }
      if (re) {
        const H = parseInt(re.value, 10);
        Number.isFinite(H) && (re.value = String(ct(H, D, 1)));
      }
    }, k = () => {
      R(), c();
    };
    de.addEventListener("change", c), L.addEventListener("change", c), V.addEventListener("input", k), V.addEventListener("change", k), Q.addEventListener("input", k), Q.addEventListener("change", k), re.addEventListener("input", k), re.addEventListener("change", k), se.addEventListener("change", c), me.addEventListener("change", () => {
      const D = i();
      Q.value = String(me.checked ? Math.max(1, D - 1) : D), c();
    }), Se.addEventListener("input", c), r.addEventListener("click", () => {
      y.remove(), ie(), Ie(), v?.();
    }), h.appendChild(p), ve(h.lastElementChild || y), ie(), Ie();
  }
  function Pe(m = {}) {
    if (!(B instanceof HTMLTemplateElement) || !F) return;
    const p = B.content.cloneNode(!0), y = p.querySelector(".field-definition-entry");
    if (!(y instanceof HTMLElement)) return;
    const A = String(m.id || Z()).trim() || Z();
    y.setAttribute("data-field-definition-id", A);
    const ee = Re(y, ".field-definition-id-input"), te = Ue(y, 'select[name="field_definitions[].type"]'), Y = Ue(y, 'select[name="field_definitions[].participant_id"]'), de = Re(y, 'input[name="field_definitions[].page"]'), L = Re(y, 'input[name="field_definitions[].required"]'), V = nt(y, ".field-date-signed-info");
    if (!ee || !te || !Y || !de || !L || !V) return;
    const Q = z++;
    ee.name = `field_instances[${Q}].id`, ee.value = A, te.name = `field_instances[${Q}].type`, Y.name = `field_instances[${Q}].participant_id`, de.name = `field_instances[${Q}].page`, L.name = `field_instances[${Q}].required`, m.type && (te.value = String(m.type)), m.page !== void 0 && (de.value = String(ct(m.page, i(), 1))), m.required !== void 0 && (L.checked = !!m.required);
    const re = String(m.participant_id || m.participantId || "").trim();
    ye(Y, o(), re), te.addEventListener("change", () => {
      te.value === "date_signed" ? V.classList.remove("hidden") : V.classList.add("hidden");
    }), te.value === "date_signed" && V.classList.remove("hidden"), zt(y, ".remove-field-definition-btn")?.addEventListener("click", () => {
      y.remove(), ce(), f?.();
    });
    const se = Re(y, 'input[name*=".page"]'), me = () => {
      se && (se.value = String(ct(se.value, i(), 1)));
    };
    me(), se?.addEventListener("input", me), se?.addEventListener("change", me), F.appendChild(p), ce();
  }
  function _e() {
    _?.addEventListener("click", () => Pe()), u?.addEventListener("click", () => Pe()), O?.addEventListener("click", () => q({ to_page: i() })), P?.();
  }
  function oe() {
    const m = [];
    window._initialFieldPlacementsData = m, t.forEach((p) => {
      const y = String(p.id || "").trim();
      if (!y) return;
      const A = String(p.type || "signature").trim() || "signature", ee = String(p.participant_id || p.participantId || "").trim(), te = Number(p.page || 1) || 1;
      Pe({
        id: y,
        type: A,
        participant_id: ee,
        page: te,
        required: !!p.required
      }), m.push(ut({
        id: y,
        definitionId: y,
        type: A,
        participantId: ee,
        participantName: String(p.participant_name || p.participantName || "").trim(),
        page: te,
        x: Number(p.x || p.pos_x || 0) || 0,
        y: Number(p.y || p.pos_y || 0) || 0,
        width: Number(p.width || 150) || 150,
        height: Number(p.height || 32) || 32,
        placementSource: String(p.placement_source || p.placementSource || n.MANUAL).trim() || n.MANUAL
      }, m.length));
    }), ce(), W(), ie(), Ie();
  }
  function ue() {
    const m = window._initialFieldPlacementsData;
    return Array.isArray(m) ? m.map((p, y) => ut(p, y)) : [];
  }
  function Be() {
    if (!F) return [];
    const m = o(), p = new Map(m.map((L) => [String(L.id), L.name || L.email || "Signer"])), y = [];
    F.querySelectorAll(".field-definition-entry").forEach((L) => {
      const V = String(L.getAttribute("data-field-definition-id") || "").trim(), Q = Ue(L, ".field-type-select"), re = Ue(L, ".field-participant-select"), se = Re(L, 'input[name*=".page"]'), me = String(Q?.value || "text").trim() || "text", Se = String(re?.value || "").trim(), r = parseInt(String(se?.value || "1"), 10) || 1;
      y.push({
        definitionId: V,
        fieldType: me,
        participantId: Se,
        participantName: p.get(Se) || "Unassigned",
        page: r
      });
    });
    const A = Fe(pe(), i()), ee = /* @__PURE__ */ new Map();
    A.forEach((L) => {
      const V = String(L.ruleId || "").trim(), Q = String(L.id || "").trim();
      if (V && Q) {
        const re = ee.get(V) || [];
        re.push(Q), ee.set(V, re);
      }
    });
    let te = T();
    ee.forEach((L, V) => {
      if (L.length > 1 && !te.groups.get(`rule_${V}`)) {
        const Q = Un(L, `Rule ${V}`);
        Q.id = `rule_${V}`, te = Yt(te, Q);
      }
    }), M(te), A.forEach((L) => {
      const V = String(L.id || "").trim();
      if (!V) return;
      const Q = String(L.participantId || "").trim(), re = parseInt(String(L.page || "1"), 10) || 1, se = String(L.ruleId || "").trim();
      y.push({
        definitionId: V,
        fieldType: String(L.type || "text").trim() || "text",
        participantId: Q,
        participantName: p.get(Q) || "Unassigned",
        page: re,
        linkGroupId: se ? `rule_${se}` : void 0
      });
    });
    const Y = /* @__PURE__ */ new Set(), de = y.filter((L) => {
      const V = String(L.definitionId || "").trim();
      return !V || Y.has(V) ? !1 : (Y.add(V), !0);
    });
    return de.sort((L, V) => L.page !== V.page ? L.page - V.page : L.definitionId.localeCompare(V.definitionId)), de;
  }
  function je(m) {
    const p = String(m || "").trim();
    if (!p) return null;
    const y = Be().find((A) => String(A.definitionId || "").trim() === p);
    return y ? {
      id: p,
      type: String(y.fieldType || "text").trim() || "text",
      participant_id: String(y.participantId || "").trim(),
      participant_name: String(y.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(y.page || "1"), 10) || 1,
      link_group_id: String(y.linkGroupId || "").trim()
    } : null;
  }
  function $e() {
    if (!F) return [];
    const m = o(), p = /* @__PURE__ */ new Map();
    return m.forEach((y) => p.set(y.id, !1)), F.querySelectorAll(".field-definition-entry").forEach((y) => {
      const A = Ue(y, ".field-type-select"), ee = Ue(y, ".field-participant-select"), te = Re(y, 'input[name*=".required"]');
      A?.value === "signature" && ee?.value && te?.checked && p.set(ee.value, !0);
    }), Fe(pe(), i()).forEach((y) => {
      y.type === "signature" && y.participantId && y.required && p.set(y.participantId, !0);
    }), m.filter((y) => !p.get(y.id));
  }
  function Ne(m) {
    if (!Array.isArray(m) || m.length === 0) return "Each signer requires at least one required signature field.";
    const p = m.map((y) => y?.name?.trim()).filter(Boolean);
    return p.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${p.join(", ")}`;
  }
  function Oe(m) {
    !F || !m?.fieldDefinitions || m.fieldDefinitions.length === 0 || (F.innerHTML = "", z = 0, m.fieldDefinitions.forEach((p) => {
      Pe({
        id: p.tempId,
        type: p.type,
        participant_id: p.participantTempId,
        page: p.page,
        required: p.required
      });
    }), ce());
  }
  function le(m) {
    !Array.isArray(m?.fieldRules) || m.fieldRules.length === 0 || h && (h.querySelectorAll(".field-rule-entry").forEach((p) => p.remove()), N = 0, m.fieldRules.forEach((p) => {
      q({
        id: p.id,
        type: p.type,
        participantId: p.participantId || p.participantTempId,
        fromPage: p.fromPage,
        toPage: p.toPage,
        page: p.page,
        excludeLastPage: p.excludeLastPage,
        excludePages: p.excludePages,
        required: p.required
      });
    }), ie(), Ie());
  }
  return {
    refs: {
      fieldDefinitionsContainer: F,
      fieldRulesContainer: h,
      addFieldBtn: _,
      fieldPlacementsJSONInput: U,
      fieldRulesJSONInput: g
    },
    bindEvents: _e,
    initialize: oe,
    buildInitialPlacementInstances: ue,
    collectFieldDefinitionsForState: he,
    collectFieldRulesForState: pe,
    collectFieldRulesForForm: we,
    expandRulesForPreview: Fe,
    renderFieldRulePreview: Ie,
    updateFieldParticipantOptions: W,
    collectPlacementFieldDefinitions: Be,
    getFieldDefinitionById: je,
    findSignersMissingRequiredSignatureField: $e,
    missingSignatureFieldMessage: Ne,
    restoreFieldDefinitionsFromState: Oe,
    restoreFieldRulesFromState: le
  };
}
function jn(e) {
  return typeof e == "object" && e !== null && "run" in e;
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
}, gt = {
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
function Gn(e) {
  const { apiBase: t, apiVersionBase: n, documentIdInput: i, fieldPlacementsJSONInput: o, initialFieldInstances: d = [], initialLinkGroupState: f = null, collectPlacementFieldDefinitions: v, getFieldDefinitionById: P, parseAPIError: T, mapUserFacingError: M, showToast: F, escapeHtml: B, onPlacementsChanged: _ } = e, a = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(d) ? d.map((r, s) => ut(r, s)) : [],
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
    linkGroupState: f || wt()
  }, u = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function l(r = "fi") {
    return `${r}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function h(r) {
    return document.querySelector(`.placement-field-item[data-definition-id="${r}"]`);
  }
  function $() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function O(r, s) {
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
  function j(r) {
    a.linkGroupState = r || wt();
  }
  function z() {
    return a.fieldInstances.map((r, s) => Nn(r, s));
  }
  function N(r = {}) {
    const { silent: s = !1 } = r, c = I();
    c.fieldInstancesContainer && (c.fieldInstancesContainer.innerHTML = "");
    const R = z();
    return o && (o.value = JSON.stringify(R)), s || _?.(), R;
  }
  function Z() {
    const r = I(), s = Array.from(document.querySelectorAll(".placement-field-item")), c = s.length, R = new Set(s.map((ne) => String(ne.dataset.definitionId || "").trim()).filter((ne) => ne)), k = /* @__PURE__ */ new Set();
    a.fieldInstances.forEach((ne) => {
      const Ce = String(ne.definitionId || "").trim();
      R.has(Ce) && k.add(Ce);
    });
    const D = k.size, H = Math.max(0, c - D);
    r.totalFields && (r.totalFields.textContent = String(c)), r.placedCount && (r.placedCount.textContent = String(D)), r.unplacedCount && (r.unplacedCount.textContent = String(H));
  }
  function K(r, s = !1) {
    const c = h(r);
    if (!c) return;
    c.classList.add("opacity-50"), c.draggable = !1;
    const R = c.querySelector(".placement-status");
    R && (R.textContent = "Placed", R.classList.remove("text-amber-600"), R.classList.add("text-green-600")), s && c.classList.add("just-linked");
  }
  function ge(r) {
    const s = h(r);
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
  function J(r) {
    const s = r === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${r} linked fields`;
    window.toastManager?.info?.(s);
    const c = document.createElement("div");
    c.setAttribute("role", "status"), c.setAttribute("aria-live", "polite"), c.className = "sr-only", c.textContent = s, document.body.appendChild(c), setTimeout(() => c.remove(), 1e3), ye();
  }
  function ce(r, s) {
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
  function he() {
    const r = I();
    r.linkAllBtn && !r.linkAllBtn.dataset.bound && (r.linkAllBtn.dataset.bound = "true", r.linkAllBtn.addEventListener("click", () => {
      const s = a.linkGroupState.unlinkedDefinitions.size;
      if (s !== 0) {
        for (const c of a.linkGroupState.unlinkedDefinitions) a.linkGroupState = $t(a.linkGroupState, c);
        window.toastManager && window.toastManager.success(`Re-linked ${s} field${s > 1 ? "s" : ""}`), Fe();
      }
    })), r.unlinkAllBtn && !r.unlinkAllBtn.dataset.bound && (r.unlinkAllBtn.dataset.bound = "true", r.unlinkAllBtn.addEventListener("click", () => {
      let s = 0;
      for (const c of a.linkGroupState.definitionToGroup.keys()) a.linkGroupState.unlinkedDefinitions.has(c) || (a.linkGroupState = Bt(a.linkGroupState, c), s += 1);
      s > 0 && window.toastManager && window.toastManager.success(`Unlinked ${s} field${s > 1 ? "s" : ""}`), Fe();
    })), ie();
  }
  function pe() {
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
    const s = pe();
    r.linkBatchActions && r.linkBatchActions.classList.toggle("hidden", a.linkGroupState.groups.size === 0), s.forEach((c, R) => {
      const k = c.definitionId, D = String(c.fieldType || "text").trim() || "text", H = String(c.participantId || "").trim(), ne = String(c.participantName || "Unassigned").trim() || "Unassigned", Ce = Number.parseInt(String(c.page || "1"), 10) || 1, fe = c.linkGroupId, Ee = c.isUnlinked;
      if (!k) return;
      a.fieldInstances.forEach((b) => {
        b.definitionId === k && (b.type = D, b.participantId = H, b.participantName = ne);
      });
      const We = rt[D] || rt.text, Ke = a.fieldInstances.some((b) => b.definitionId === k), xe = document.createElement("div");
      xe.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${Ke ? "opacity-50" : ""}`, xe.draggable = !Ke, xe.dataset.definitionId = k, xe.dataset.fieldType = D, xe.dataset.participantId = H, xe.dataset.participantName = ne, xe.dataset.page = String(Ce), fe && (xe.dataset.linkGroupId = fe);
      const S = document.createElement("span");
      S.className = `w-3 h-3 rounded ${We.bg}`;
      const w = document.createElement("div");
      w.className = "flex-1 text-xs";
      const E = document.createElement("div");
      E.className = "font-medium capitalize", E.textContent = D.replace(/_/g, " ");
      const C = document.createElement("div");
      C.className = "text-gray-500", C.textContent = ne;
      const G = document.createElement("span");
      G.className = `placement-status text-xs ${Ke ? "text-green-600" : "text-amber-600"}`, G.textContent = Ke ? "Placed" : "Not placed", w.appendChild(E), w.appendChild(C), xe.appendChild(S), xe.appendChild(w), xe.appendChild(G), xe.addEventListener("dragstart", (b) => {
        if (Ke) {
          b.preventDefault();
          return;
        }
        b.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: k,
          fieldType: D,
          participantId: H,
          participantName: ne
        })), b.dataTransfer && (b.dataTransfer.effectAllowed = "copy"), xe.classList.add("opacity-50");
      }), xe.addEventListener("dragend", () => {
        xe.classList.remove("opacity-50");
      }), r.fieldsList?.appendChild(xe);
      const X = s[R + 1];
      fe && X && X.linkGroupId === fe && r.fieldsList?.appendChild(ce(k, !Ee));
    }), he(), Z();
  }
  function Fe() {
    we();
  }
  function Ie(r, s) {
    s ? (a.linkGroupState = Bt(a.linkGroupState, r), window.toastManager?.info?.("Field unlinked")) : (a.linkGroupState = $t(a.linkGroupState, r), window.toastManager?.info?.("Field re-linked")), Fe();
  }
  async function W(r) {
    const s = a.pdfDoc;
    if (!s) return;
    const c = I();
    if (!c.canvas || !c.canvasContainer) return;
    const R = c.canvas.getContext("2d"), k = await s.getPage(r), D = k.getViewport({ scale: a.scale });
    c.canvas.width = D.width, c.canvas.height = D.height, c.canvasContainer.style.width = `${D.width}px`, c.canvasContainer.style.height = `${D.height}px`, await k.render({
      canvasContext: R,
      viewport: D
    }).promise, c.currentPage && (c.currentPage.textContent = String(r)), _e();
  }
  function ve(r) {
    const s = qn(a.linkGroupState, r);
    s && (a.linkGroupState = Yt(a.linkGroupState, s.updatedGroup));
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
      const R = On(a.linkGroupState, r, a.fieldInstances, s);
      if (!R || !R.newPlacement) break;
      a.fieldInstances.push(R.newPlacement), K(R.newPlacement.definitionId, !0), c += 1;
    }
    c > 0 && (_e(), Z(), N(), J(c));
  }
  function Pe(r) {
    ve(r);
  }
  function _e() {
    const r = I().overlays;
    r && (r.innerHTML = "", r.style.pointerEvents = "auto", a.fieldInstances.filter((s) => s.page === a.currentPage).forEach((s) => {
      const c = rt[s.type] || rt.text, R = a.selectedFieldId === s.id, k = s.placementSource === He.AUTO_LINKED, D = document.createElement("div"), H = k ? "border-dashed" : "border-solid";
      D.className = `field-overlay absolute cursor-move ${c.border} border-2 ${H} rounded`, D.style.cssText = `
          left: ${s.x * a.scale}px;
          top: ${s.y * a.scale}px;
          width: ${s.width * a.scale}px;
          height: ${s.height * a.scale}px;
          background-color: ${c.fill};
          ${R ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, D.dataset.instanceId = s.id;
      const ne = document.createElement("div");
      if (ne.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${c.bg}`, ne.textContent = `${s.type.replace("_", " ")} - ${s.participantName}`, D.appendChild(ne), k) {
        const Ee = document.createElement("div");
        Ee.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", Ee.title = "Auto-linked from template", Ee.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, D.appendChild(Ee);
      }
      const Ce = document.createElement("div");
      Ce.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", Ce.style.cssText = "transform: translate(50%, 50%);", D.appendChild(Ce);
      const fe = document.createElement("button");
      fe.type = "button", fe.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", fe.innerHTML = "×", fe.addEventListener("click", (Ee) => {
        Ee.stopPropagation(), $e(s.id);
      }), D.appendChild(fe), D.addEventListener("mousedown", (Ee) => {
        Ee.target === Ce ? je(Ee, s) : Ee.target !== fe && Be(Ee, s, D);
      }), D.addEventListener("click", () => {
        a.selectedFieldId = s.id, _e();
      }), r.appendChild(D);
    }));
  }
  function oe(r, s, c, R = {}) {
    const k = gt[r.fieldType] || gt.text, D = R.placementSource || He.MANUAL, H = R.linkGroupId || Jt(a.linkGroupState, r.definitionId)?.id, ne = {
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
      placementSource: D,
      linkGroupId: H,
      linkedFromFieldId: R.linkedFromFieldId
    };
    a.fieldInstances.push(ne), K(r.definitionId), D === He.MANUAL && H && Pe(ne), _e(), Z(), N();
  }
  function ue(r, s) {
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
      placementRunId: u.currentRunId
    };
    a.fieldInstances.push(c), K(r.definitionId), _e(), Z(), N();
  }
  function Be(r, s, c) {
    r.preventDefault(), a.isDragging = !0, a.selectedFieldId = s.id;
    const R = r.clientX, k = r.clientY, D = s.x * a.scale, H = s.y * a.scale;
    function ne(fe) {
      const Ee = fe.clientX - R, We = fe.clientY - k;
      s.x = Math.max(0, (D + Ee) / a.scale), s.y = Math.max(0, (H + We) / a.scale), s.placementSource = He.MANUAL, c.style.left = `${s.x * a.scale}px`, c.style.top = `${s.y * a.scale}px`;
    }
    function Ce() {
      a.isDragging = !1, document.removeEventListener("mousemove", ne), document.removeEventListener("mouseup", Ce), N();
    }
    document.addEventListener("mousemove", ne), document.addEventListener("mouseup", Ce);
  }
  function je(r, s) {
    r.preventDefault(), r.stopPropagation(), a.isResizing = !0;
    const c = r.clientX, R = r.clientY, k = s.width, D = s.height;
    function H(Ce) {
      const fe = (Ce.clientX - c) / a.scale, Ee = (Ce.clientY - R) / a.scale;
      s.width = Math.max(30, k + fe), s.height = Math.max(20, D + Ee), s.placementSource = He.MANUAL, _e();
    }
    function ne() {
      a.isResizing = !1, document.removeEventListener("mousemove", H), document.removeEventListener("mouseup", ne), N();
    }
    document.addEventListener("mousemove", H), document.addEventListener("mouseup", ne);
  }
  function $e(r) {
    const s = a.fieldInstances.find((c) => c.id === r);
    s && (a.fieldInstances = a.fieldInstances.filter((c) => c.id !== r), ge(s.definitionId), _e(), Z(), N());
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
      const D = JSON.parse(k), H = c.getBoundingClientRect();
      oe(D, (R.clientX - H.left) / a.scale, (R.clientY - H.top) / a.scale);
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
  function le() {
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
  function p(r) {
    return r >= 0.8 ? "bg-green-100 text-green-800" : r >= 0.6 ? "bg-blue-100 text-blue-800" : r >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function y(r) {
    return r >= 0.9 ? "bg-green-100 text-green-800" : r >= 0.7 ? "bg-blue-100 text-blue-800" : r >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function A(r) {
    return r ? r.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") : "Unknown";
  }
  function ee(r) {
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
  async function te(r, s) {
  }
  function Y() {
    const r = document.getElementById("placement-suggestions-modal");
    if (!r) return;
    const s = r.querySelectorAll('.suggestion-item[data-accepted="true"]');
    s.forEach((c) => {
      const R = Number.parseInt(c.dataset.index || "", 10), k = u.suggestions[R];
      if (!k) return;
      const D = P(k.field_definition_id);
      if (!D) return;
      const H = h(k.field_definition_id);
      if (!H || H.classList.contains("opacity-50")) return;
      const ne = {
        definitionId: k.field_definition_id,
        fieldType: D.type,
        participantId: D.participant_id,
        participantName: H.dataset.participantName || D.participant_name || "Unassigned"
      };
      a.currentPage = k.page_number, ue(ne, k);
    }), a.pdfDoc && W(a.currentPage), te(s.length, u.suggestions.length - s.length), F(`Applied ${s.length} placement${s.length !== 1 ? "s" : ""}`, "success");
  }
  function de(r) {
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
        const c = Number.parseInt(s.dataset.index || "", 10), R = u.suggestions[c];
        R && ee(R);
      });
    });
  }
  function L() {
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
    `, O(r, "#close-suggestions-modal")?.addEventListener("click", () => {
      r.classList.add("hidden");
    }), r.addEventListener("click", (s) => {
      s.target === r && r.classList.add("hidden");
    }), O(r, "#accept-all-btn")?.addEventListener("click", () => {
      r.querySelectorAll(".suggestion-item").forEach((s) => {
        s.classList.add("border-green-500", "bg-green-50"), s.classList.remove("border-red-500", "bg-red-50"), s.dataset.accepted = "true";
      });
    }), O(r, "#reject-all-btn")?.addEventListener("click", () => {
      r.querySelectorAll(".suggestion-item").forEach((s) => {
        s.classList.add("border-red-500", "bg-red-50"), s.classList.remove("border-green-500", "bg-green-50"), s.dataset.accepted = "false";
      });
    }), O(r, "#apply-suggestions-btn")?.addEventListener("click", () => {
      Y(), r.classList.add("hidden");
    }), O(r, "#rerun-placement-btn")?.addEventListener("click", () => {
      r.classList.add("hidden");
      const s = x(r, "#placement-policy-preset-modal"), c = I().policyPreset;
      c && s && (c.value = s.value), I().autoPlaceBtn?.click();
    }), r;
  }
  function V(r) {
    let s = document.getElementById("placement-suggestions-modal");
    s || (s = L(), document.body.appendChild(s));
    const c = x(s, "#suggestions-list"), R = x(s, "#resolver-info"), k = x(s, "#run-stats");
    !c || !R || !k || (R.innerHTML = u.resolverScores.map((D) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${B(String(D?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${D.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${p(Number(D.score || 0))}">
              ${(Number(D?.score || 0) * 100).toFixed(0)}%
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
    `, c.innerHTML = u.suggestions.map((D, H) => {
      const ne = P(D.field_definition_id), Ce = rt[ne?.type || "text"] || rt.text, fe = B(String(ne?.type || "field").replace(/_/g, " ")), Ee = B(String(D?.id || "")), We = Math.max(1, Number(D?.page_number || 1)), Ke = Math.round(Number(D?.x || 0)), xe = Math.round(Number(D?.y || 0)), S = Math.max(0, Number(D?.confidence || 0)), w = B(A(String(D?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${H}" data-suggestion-id="${Ee}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${Ce.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${fe}</div>
                <div class="text-xs text-gray-500">Page ${We}, (${Ke}, ${xe})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${y(Number(D.confidence || 0))}">
                ${(S * 100).toFixed(0)}%
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
    }).join(""), de(s), s.classList.remove("hidden"));
  }
  function Q() {
    const r = $();
    let s = 100;
    r.forEach((c) => {
      const R = {
        definitionId: c.dataset.definitionId || "",
        fieldType: c.dataset.fieldType || "text",
        participantId: c.dataset.participantId || "",
        participantName: c.dataset.participantName || "Unassigned"
      }, k = gt[R.fieldType || "text"] || gt.text;
      a.currentPage = a.totalPages, oe(R, 300, s + k.height / 2, { placementSource: He.AUTO_FALLBACK }), s += k.height + 20;
    }), a.pdfDoc && W(a.totalPages), F("Fields placed using fallback layout", "info");
  }
  async function re() {
    const r = I();
    if (!r.autoPlaceBtn || u.isRunning) return;
    if ($().length === 0) {
      F("All fields are already placed", "info");
      return;
    }
    const s = document.querySelector('input[name="id"]')?.value;
    if (!s) {
      Q();
      return;
    }
    u.isRunning = !0, r.autoPlaceBtn.disabled = !0, r.autoPlaceBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Analyzing...
    `;
    try {
      const c = await fetch(`${n}/esign/agreements/${s}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ policy_preset: m() })
      });
      if (!c.ok) throw await T(c, "Auto-placement failed");
      const R = await c.json(), k = jn(R) ? R.run || {} : R;
      u.currentRunId = k?.run_id || k?.id || null, u.suggestions = k?.suggestions || [], u.resolverScores = k?.resolver_scores || [], u.suggestions.length === 0 ? (F("No placement suggestions found. Try placing fields manually.", "warning"), Q()) : V(k);
    } catch (c) {
      console.error("Auto-place error:", c);
      const R = c && typeof c == "object" ? c : {};
      F(`Auto-placement failed: ${M(R.message || "Auto-placement failed", R.code || "", R.status || 0)}`, "error"), Q();
    } finally {
      u.isRunning = !1, r.autoPlaceBtn.disabled = !1, r.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function se() {
    const r = I();
    r.autoPlaceBtn && !a.autoPlaceBound && (r.autoPlaceBtn.addEventListener("click", () => {
      re();
    }), a.autoPlaceBound = !0);
  }
  async function me() {
    const r = I();
    if (!i?.value) {
      r.loading?.classList.add("hidden"), r.noDocument?.classList.remove("hidden");
      return;
    }
    r.loading?.classList.remove("hidden"), r.noDocument?.classList.add("hidden");
    const s = v(), c = new Set(s.map((H) => String(H.definitionId || "").trim()).filter((H) => H));
    a.fieldInstances = a.fieldInstances.filter((H) => c.has(String(H.definitionId || "").trim())), we();
    const R = ++a.loadRequestVersion, k = String(i.value || "").trim(), D = `${t}/panels/esign_documents/${encodeURIComponent(k)}/source/pdf`;
    try {
      const H = await Gt({
        url: D,
        withCredentials: !0,
        surface: "agreement-placement-editor",
        documentId: k
      }).promise;
      if (R !== a.loadRequestVersion) return;
      a.pdfDoc = H, a.totalPages = a.pdfDoc.numPages, a.currentPage = 1, r.totalPages && (r.totalPages.textContent = String(a.totalPages)), await W(a.currentPage), r.loading?.classList.add("hidden"), a.uiHandlersBound || (Ne(r.viewer, r.overlays), Oe(), le(), a.uiHandlersBound = !0), _e();
    } catch (H) {
      if (R !== a.loadRequestVersion) return;
      const ne = jt(H, {
        surface: "agreement-placement-editor",
        documentId: k,
        url: D
      });
      r.loading?.classList.add("hidden"), r.noDocument?.classList.remove("hidden"), r.noDocument && (r.noDocument.textContent = `Failed to load PDF: ${M(ne.message, ne.code, ne.status || void 0)}`);
    }
    Z(), N({ silent: !0 });
  }
  function Se(r) {
    a.fieldInstances = (Array.isArray(r?.fieldPlacements) ? r.fieldPlacements : []).map((s, c) => ut(s, c)), N({ silent: !0 });
  }
  return N({ silent: !0 }), {
    bindEvents: se,
    initPlacementEditor: me,
    getState: g,
    getLinkGroupState: U,
    setLinkGroupState: j,
    buildPlacementFormEntries: z,
    updateFieldInstancesFormData: N,
    restoreFieldPlacementsFromState: Se
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
function lt(e) {
  return String(e ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function Wn(e) {
  const { getSignerParticipants: t, setPrimaryActionLabel: n, onChanged: i } = e, o = document.getElementById("agreement-review-mode-send"), d = document.getElementById("agreement-review-mode-start"), f = document.getElementById("agreement-start-review-config"), v = document.getElementById("agreement-review-gate"), P = document.getElementById("agreement-review-comments-enabled"), T = document.getElementById("agreement-review-recipient-reviewers"), M = document.getElementById("agreement-review-external-reviewers"), F = document.getElementById("agreement-review-external-reviewers-empty"), B = document.getElementById("agreement-review-external-reviewer-template"), _ = document.getElementById("agreement-add-external-reviewer-btn");
  function a() {
    return d instanceof HTMLInputElement ? d.checked : !1;
  }
  function u() {
    n(a() ? "Start Review" : "Send for Signature");
  }
  function l() {
    const j = !!M?.querySelector("[data-review-external-row]");
    F?.classList.toggle("hidden", j);
  }
  function h() {
    f?.classList.toggle("hidden", !a()), u();
  }
  function $(j) {
    if (!(B instanceof HTMLTemplateElement) || !M) return;
    const z = B.content.cloneNode(!0), N = z.querySelector("[data-review-external-row]");
    if (!N) return;
    const Z = N.querySelector("[data-review-external-name]"), K = N.querySelector("[data-review-external-email]"), ge = N.querySelector("[data-review-external-comment]"), ye = N.querySelector("[data-review-external-approve]");
    Z && (Z.value = String(j?.displayName || "").trim()), K && (K.value = String(j?.email || "").trim()), ge && (ge.checked = st(j?.canComment, !0)), ye && (ye.checked = st(j?.canApprove, !0)), M.appendChild(z), l();
  }
  function O() {
    const j = [];
    T?.querySelectorAll("[data-review-recipient-row]").forEach((N) => {
      N.querySelector("[data-review-recipient-enabled]")?.checked && j.push({
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
    return M?.querySelectorAll("[data-review-external-row]").forEach((N) => {
      const Z = String(N.querySelector("[data-review-external-email]")?.value || "").trim();
      Z !== "" && z.push({
        participantType: "external",
        email: Z,
        displayName: String(N.querySelector("[data-review-external-name]")?.value || "").trim() || void 0,
        canComment: N.querySelector("[data-review-external-comment]")?.checked !== !1,
        canApprove: N.querySelector("[data-review-external-approve]")?.checked !== !1
      });
    }), {
      enabled: a(),
      gate: String(v instanceof HTMLSelectElement ? v.value : "approve_before_send").trim() || "approve_before_send",
      commentsEnabled: P instanceof HTMLInputElement ? P.checked : !1,
      participants: [...j, ...z]
    };
  }
  function x(j) {
    if (!T) return;
    const z = Ut(j), N = /* @__PURE__ */ new Map();
    z.participants.filter((Z) => String(Z.participantType || "").trim() === "recipient").forEach((Z) => {
      const K = String(Z.participantTempId || Z.recipientTempId || Z.recipientId || "").trim();
      K !== "" && N.set(K, Z);
    }), T.innerHTML = t().map((Z) => {
      const K = String(Z.id || "").trim(), ge = N.get(K), ye = !!ge, J = ge ? st(ge.canComment, !0) : !0, ce = ge ? st(ge.canApprove, !0) : !0;
      return `
        <div class="rounded-lg border border-gray-200 bg-white p-3" data-review-recipient-row data-participant-temp-id="${lt(K)}" data-email="${lt(Z.email)}" data-name="${lt(Z.name)}">
          <div class="flex items-start justify-between gap-3">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" data-review-recipient-enabled ${ye ? "checked" : ""}>
              <span>
                <span class="block text-sm font-medium text-gray-900">${lt(Z.name || Z.email || "Signer")}</span>
                <span class="block text-xs text-gray-500">${lt(Z.email)}</span>
              </span>
            </label>
            <div class="flex flex-col gap-1.5 text-xs">
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to add comments">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-comment ${J ? "checked" : ""}>
                <span class="text-gray-600">Comment</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to approve or request changes">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-approve ${ce ? "checked" : ""}>
                <span class="text-gray-600">Approve</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
  function I() {
    x(O());
  }
  function g(j) {
    const z = Ut(j?.review);
    o instanceof HTMLInputElement && (o.checked = !z.enabled), d instanceof HTMLInputElement && (d.checked = z.enabled), v instanceof HTMLSelectElement && (v.value = z.gate), P instanceof HTMLInputElement && (P.checked = z.commentsEnabled), x(z), M && (M.innerHTML = "", z.participants.filter((N) => String(N.participantType || "").trim() === "external").forEach((N) => $(N)), l()), h();
  }
  function U() {
    [o, d].forEach((j) => {
      j?.addEventListener("change", () => {
        h(), i?.();
      });
    }), v?.addEventListener("change", () => i?.()), P?.addEventListener("change", () => i?.()), T?.addEventListener("change", () => i?.()), M?.addEventListener("input", () => i?.()), M?.addEventListener("change", () => i?.()), M?.addEventListener("click", (j) => {
      const z = j.target;
      !(z instanceof HTMLElement) || !z.matches("[data-review-external-remove]") || (z.closest("[data-review-external-row]")?.remove(), l(), i?.());
    }), _?.addEventListener("click", () => {
      $(), i?.();
    }), h(), l();
  }
  return {
    bindEvents: U,
    collectReviewConfigForState: O,
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
function Vn(e) {
  const { documentIdInput: t, documentPageCountInput: n, titleInput: i, messageInput: o, participantsContainer: d, fieldDefinitionsContainer: f, fieldPlacementsJSONInput: v, fieldRulesJSONInput: P, collectFieldRulesForForm: T, buildPlacementFormEntries: M, getCurrentStep: F, totalWizardSteps: B } = e;
  function _() {
    const a = [];
    d.querySelectorAll(".participant-entry").forEach(($) => {
      const O = String($.getAttribute("data-participant-id") || "").trim(), x = it($, 'input[name*=".name"]'), I = it($, 'input[name*=".email"]'), g = it($, 'select[name*=".role"]', "signer"), U = qt($, ".notify-input", !0), j = it($, ".signing-stage-input"), z = Number(j || "1") || 1;
      a.push({
        id: O,
        name: x,
        email: I,
        role: g,
        notify: U,
        signing_stage: g === "signer" ? z : 0
      });
    });
    const u = [];
    f.querySelectorAll(".field-definition-entry").forEach(($) => {
      const O = String($.getAttribute("data-field-definition-id") || "").trim(), x = it($, ".field-type-select", "signature"), I = it($, ".field-participant-select"), g = Number(it($, 'input[name*=".page"]', "1")) || 1, U = qt($, 'input[name*=".required"]');
      O && u.push({
        id: O,
        type: x,
        participant_id: I,
        page: g,
        required: U
      });
    });
    const l = M(), h = JSON.stringify(l);
    return v && (v.value = h), {
      document_id: String(t?.value || "").trim(),
      title: String(i?.value || "").trim(),
      message: String(o?.value || "").trim(),
      participants: a,
      field_instances: u,
      field_placements: l,
      field_placements_json: h,
      field_rules: T(),
      field_rules_json: String(P?.value || "[]"),
      send_for_signature: F() === B ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(n?.value || "0") || 0
    };
  }
  return { buildCanonicalAgreementPayload: _ };
}
function Kn(e) {
  const { titleSource: t, stateManager: n, trackWizardStateChanges: i, participantsController: o, fieldDefinitionsController: d, placementController: f, reviewConfigController: v, updateFieldParticipantOptions: P, previewCard: T, wizardNavigationController: M, documentIdInput: F, documentPageCountInput: B, selectedDocumentTitle: _, agreementRefs: a, parsePositiveInt: u, isEditMode: l } = e;
  let h = null, $ = !1;
  function O(J) {
    $ = !0;
    try {
      return J();
    } finally {
      $ = !1;
    }
  }
  function x(J) {
    const ce = J?.document, ie = document.getElementById("selected-document"), he = document.getElementById("document-picker"), pe = document.getElementById("selected-document-info");
    if (F.value = String(ce?.id || "").trim(), B) {
      const we = u(ce?.pageCount, 0) || 0;
      B.value = we > 0 ? String(we) : "";
    }
    if (_ && (_.textContent = String(ce?.title || "").trim()), pe instanceof HTMLElement) {
      const we = u(ce?.pageCount, 0) || 0;
      pe.textContent = we > 0 ? `${we} pages` : "";
    }
    if (F.value) {
      ie?.classList.remove("hidden"), he?.classList.add("hidden");
      return;
    }
    ie?.classList.add("hidden"), he?.classList.remove("hidden");
  }
  function I(J) {
    a.form.titleInput.value = String(J?.details?.title || ""), a.form.messageInput.value = String(J?.details?.message || "");
  }
  function g() {
    $ || (h !== null && clearTimeout(h), h = setTimeout(() => {
      i();
    }, 500));
  }
  function U(J) {
    o.restoreFromState(J);
  }
  function j(J) {
    d.restoreFieldDefinitionsFromState(J);
  }
  function z(J) {
    d.restoreFieldRulesFromState(J);
  }
  function N(J) {
    f.restoreFieldPlacementsFromState(J);
  }
  function Z(J) {
    v.restoreFromState(J);
  }
  function K() {
    F && new MutationObserver(() => {
      $ || i();
    }).observe(F, {
      attributes: !0,
      attributeFilter: ["value"]
    });
    const J = document.getElementById("title"), ce = document.getElementById("message");
    J instanceof HTMLInputElement && J.addEventListener("input", () => {
      const ie = String(J.value || "").trim() === "" ? t.AUTOFILL : t.USER;
      n.setTitleSource(ie), g();
    }), (ce instanceof HTMLInputElement || ce instanceof HTMLTextAreaElement) && ce.addEventListener("input", g), o.refs.participantsContainer?.addEventListener("input", g), o.refs.participantsContainer?.addEventListener("change", g), d.refs.fieldDefinitionsContainer?.addEventListener("input", g), d.refs.fieldDefinitionsContainer?.addEventListener("change", g), d.refs.fieldRulesContainer?.addEventListener("input", g), d.refs.fieldRulesContainer?.addEventListener("change", g);
  }
  function ge(J, ce = {}) {
    O(() => {
      if (x(J), I(J), U(J), j(J), z(J), P(), N(J), Z(J), ce.updatePreview !== !1) {
        const he = J?.document;
        he?.id ? T.setDocument(he.id, he.title || null, he.pageCount ?? null) : T.clear();
      }
      const ie = u(ce.step ?? J?.currentStep, M.getCurrentStep()) || 1;
      M.setCurrentStep(ie), M.updateWizardUI();
    });
  }
  function ye() {
    if (M.updateWizardUI(), F.value) {
      const J = _?.textContent || null, ce = u(B?.value, 0) || null;
      T.setDocument(F.value, J, ce);
    } else T.clear();
    l && a.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: K,
    debouncedTrackChanges: g,
    applyStateToUI: ge,
    renderInitialWizardUI: ye
  };
}
function Yn(e) {
  return e.querySelector('select[name*=".role"]');
}
function Jn(e) {
  return e.querySelector(".field-participant-select");
}
function Xn(e) {
  const { documentIdInput: t, titleInput: n, participantsContainer: i, fieldDefinitionsContainer: o, fieldRulesContainer: d, addFieldBtn: f, ensureSelectedDocumentCompatibility: v, collectFieldRulesForState: P, findSignersMissingRequiredSignatureField: T, missingSignatureFieldMessage: M, announceError: F } = e;
  function B(_) {
    switch (_) {
      case 1:
        return t.value ? !!v() : (F("Please select a document"), !1);
      case 2:
        return n.value.trim() ? !0 : (F("Please enter an agreement title"), n.focus(), !1);
      case 3: {
        const a = i.querySelectorAll(".participant-entry");
        if (a.length === 0)
          return F("Please add at least one participant"), !1;
        let u = !1;
        return a.forEach((l) => {
          Yn(l)?.value === "signer" && (u = !0);
        }), u ? !0 : (F("At least one signer is required"), !1);
      }
      case 4: {
        const a = o.querySelectorAll(".field-definition-entry");
        for (const l of Array.from(a)) {
          const h = Jn(l);
          if (!h?.value)
            return F("Please assign all fields to a signer"), h?.focus(), !1;
        }
        if (P().find((l) => !l.participantId))
          return F("Please assign all automation rules to a signer"), d?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const u = T();
        return u.length > 0 ? (F(M(u)), f.focus(), !1) : !0;
      }
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  return { validateStep: B };
}
function Zn(e) {
  const { isEditMode: t, storageKey: n, stateManager: i, syncOrchestrator: o, syncService: d, applyResumedState: f, hasMeaningfulWizardProgress: v, formatRelativeTime: P, emitWizardTelemetry: T, getActiveTabDebugState: M } = e;
  function F(x, I) {
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
      ownership: M?.() || void 0,
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
        Ze("resume_reconcile_bootstrap_failed", Ae({
          state: x,
          storageKey: n,
          ownership: M?.() || void 0,
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
        ownership: M?.() || void 0,
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
      }), j = String(x.serverDraftId || "").trim() === String(U.serverDraftId || "").trim(), z = j && x.syncPending === !0 ? F(x, U) : U;
      return i.setState(z, {
        syncPending: !!z.syncPending,
        notify: !1
      }), Ge("resume_reconcile_complete", Ae({
        state: z,
        storageKey: n,
        ownership: M?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: j && x.syncPending === !0 ? "merged_local_over_remote" : "remote_draft",
          loadedDraftId: String(g?.id || I).trim() || null,
          loadedRevision: Number(g?.revision || 0)
        }
      })), i.getState();
    } catch (g) {
      const U = typeof g == "object" && g !== null && "status" in g ? Number(g.status || 0) : 0;
      if (U === 404) {
        const j = i.normalizeLoadedState({
          ...x,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return i.setState(j, {
          syncPending: !!j.syncPending,
          notify: !1
        }), Ze("resume_reconcile_remote_missing", Ae({
          state: j,
          storageKey: n,
          ownership: M?.() || void 0,
          sendAttemptId: null,
          extra: {
            source: "remote_missing_reset_local",
            staleDraftId: I,
            status: U
          }
        })), i.getState();
      }
      return Ze("resume_reconcile_failed", Ae({
        state: x,
        storageKey: n,
        ownership: M?.() || void 0,
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
    const x = document.getElementById("resume-dialog-modal"), I = i.getState(), g = String(I?.document?.title || "").trim() || String(I?.document?.id || "").trim() || "Unknown document", U = _("resume-draft-title"), j = _("resume-draft-document"), z = _("resume-draft-step"), N = _("resume-draft-time");
    U && (U.textContent = I.details?.title || "Untitled Agreement"), j && (j.textContent = g), z && (z.textContent = String(I.currentStep || 1)), N && (N.textContent = P(I.updatedAt)), x?.classList.remove("hidden"), T("wizard_resume_prompt_shown", {
      step: Number(I.currentStep || 1),
      has_server_draft: !!I.serverDraftId
    });
  }
  async function u(x = {}) {
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
  async function h(x) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const I = l();
    switch (x) {
      case "continue":
        !String(i.getState()?.serverDraftId || "").trim() && v(I) && await d.create(I), f(i.getState());
        return;
      case "start_new":
        await u({ deleteServerDraft: !1 }), v(I) ? await d.create(I) : await B(), f(i.getState());
        return;
      case "proceed":
        await u({ deleteServerDraft: !0 }), v(I) ? await d.create(I) : await B(), f(i.getState());
        return;
      case "discard":
        await u({ deleteServerDraft: !0 }), await B(), f(i.getState());
        return;
      default:
        return;
    }
  }
  function $() {
    document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
      h("continue");
    }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
      h("proceed");
    }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
      h("start_new");
    }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
      h("discard");
    });
  }
  async function O() {
    t || (await B(), i.hasResumableState() && a());
  }
  return {
    bindEvents: $,
    reconcileBootstrapState: B,
    maybeShowResumeDialog: O
  };
}
function Qn(e) {
  const { agreementRefs: t, formAnnouncements: n, stateManager: i } = e;
  let o = "saved";
  function d(_) {
    if (!_) return "unknown";
    const a = new Date(_), u = (/* @__PURE__ */ new Date()).getTime() - a.getTime(), l = Math.floor(u / 6e4), h = Math.floor(u / 36e5), $ = Math.floor(u / 864e5);
    return l < 1 ? "just now" : l < 60 ? `${l} minute${l !== 1 ? "s" : ""} ago` : h < 24 ? `${h} hour${h !== 1 ? "s" : ""} ago` : $ < 7 ? `${$} day${$ !== 1 ? "s" : ""} ago` : a.toLocaleDateString();
  }
  function f() {
    const _ = i.getState();
    o === "paused" && v(_?.syncPending ? "pending" : "saved");
  }
  function v(_) {
    o = String(_ || "").trim() || "saved";
    const a = t.sync.indicator, u = t.sync.icon, l = t.sync.text, h = t.sync.retryBtn;
    if (!(!a || !u || !l))
      switch (a.classList.remove("hidden"), _) {
        case "saved":
          u.className = "w-2 h-2 rounded-full bg-green-500", l.textContent = "Saved", l.className = "text-gray-600", h?.classList.add("hidden");
          break;
        case "saving":
          u.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", l.textContent = "Saving...", l.className = "text-gray-600", h?.classList.add("hidden");
          break;
        case "pending":
          u.className = "w-2 h-2 rounded-full bg-gray-400", l.textContent = "Unsaved changes", l.className = "text-gray-500", h?.classList.add("hidden");
          break;
        case "error":
          u.className = "w-2 h-2 rounded-full bg-amber-500", l.textContent = "Not synced", l.className = "text-amber-600", h?.classList.remove("hidden");
          break;
        case "paused":
          u.className = "w-2 h-2 rounded-full bg-slate-400", l.textContent = "Open in another tab", l.className = "text-slate-600", h?.classList.add("hidden");
          break;
        case "conflict":
          u.className = "w-2 h-2 rounded-full bg-red-500", l.textContent = "Conflict", l.className = "text-red-600", h?.classList.add("hidden");
          break;
        default:
          a.classList.add("hidden");
      }
  }
  function P(_) {
    const a = i.getState();
    t.conflict.localTime && (t.conflict.localTime.textContent = d(a.updatedAt)), t.conflict.serverRevision && (t.conflict.serverRevision.textContent = String(_ || 0)), t.conflict.serverTime && (t.conflict.serverTime.textContent = "newer version"), t.conflict.modal?.classList.remove("hidden");
  }
  function T(_, a = "", u = 0) {
    const l = String(a || "").trim().toUpperCase(), h = String(_ || "").trim().toLowerCase();
    return l === "STALE_REVISION" ? "A newer version of this draft exists. Reload the latest draft or force your changes." : l === "DRAFT_SEND_NOT_FOUND" || l === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : l === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : l === "SCOPE_DENIED" || h.includes("scope denied") ? "You don't have access to this organization's resources." : l === "TRANSPORT_SECURITY" || l === "TRANSPORT_SECURITY_REQUIRED" || h.includes("tls transport required") || Number(u) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : l === "PDF_UNSUPPORTED" || h === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(_ || "").trim() !== "" ? String(_).trim() : "Something went wrong. Please try again.";
  }
  async function M(_, a = "") {
    const u = Number(_?.status || 0);
    let l = "", h = "", $ = {};
    try {
      const O = await _.json();
      l = String(O?.error?.code || O?.code || "").trim(), h = String(O?.error?.message || O?.message || "").trim(), $ = O?.error?.details && typeof O.error.details == "object" ? O.error.details : {}, String($?.entity || "").trim().toLowerCase() === "drafts" && String(l).trim().toUpperCase() === "NOT_FOUND" && (l = "DRAFT_SEND_NOT_FOUND", h === "" && (h = "Draft not found"));
    } catch {
      h = "";
    }
    return h === "" && (h = a || `Request failed (${u || "unknown"})`), {
      status: u,
      code: l,
      details: $,
      message: T(h, l, u)
    };
  }
  function F(_, a = "", u = 0) {
    const l = T(_, a, u);
    n && (n.textContent = l), window.toastManager?.error ? window.toastManager.error(l) : alert(l);
  }
  async function B(_, a = {}) {
    const u = await _;
    return u?.blocked && u.reason === "passive_tab" ? (F("This agreement is active in another tab. Take control in this tab before saving or sending.", "ACTIVE_TAB_OWNERSHIP_REQUIRED"), u) : (u?.error && String(a.errorMessage || "").trim() !== "" && F(a.errorMessage || ""), u);
  }
  return {
    announceError: F,
    formatRelativeTime: d,
    mapUserFacingError: T,
    parseAPIError: M,
    restoreSyncStatusFromState: f,
    showSyncConflictDialog: P,
    surfaceSyncOutcome: B,
    updateSyncStatus: v
  };
}
function ei(e) {
  const { createSuccess: t, enableServerSync: n = !0, stateManager: i, syncOrchestrator: o, syncService: d, applyStateToUI: f, surfaceSyncOutcome: v, announceError: P, getCurrentStep: T, reviewStep: M, onReviewStepRequested: F } = e;
  function B() {
    const u = i.collectFormState();
    if (!n) {
      i.setState({
        ...i.getState(),
        ...u,
        syncPending: !1
      }, { syncPending: !1 });
      return;
    }
    i.updateState(u), o.scheduleSync(), o.broadcastStateUpdate();
  }
  function _() {
    if (!t) return;
    const u = i.getState()?.serverDraftId;
    i.clear(), o.broadcastStateUpdate(), u && (o.broadcastDraftDisposed?.(u, "agreement_created"), d.dispose(u).catch((l) => {
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
      const u = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      i.setState({
        ...i.getState(),
        serverRevision: u,
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
function Xt(e, t = Qe.AUTOFILL) {
  const n = String(e || "").trim().toLowerCase();
  return n === Qe.USER ? Qe.USER : n === Qe.SERVER_SEED ? Qe.SERVER_SEED : n === Qe.AUTOFILL ? Qe.AUTOFILL : t;
}
function ti(e, t = 0) {
  if (!e || typeof e != "object") return !1;
  const n = e, i = String(n.name ?? "").trim(), o = String(n.email ?? "").trim(), d = String(n.role ?? "signer").trim().toLowerCase(), f = Number.parseInt(String(n.signingStage ?? n.signing_stage ?? 1), 10), v = n.notify !== !1;
  return i !== "" || o !== "" || d !== "" && d !== "signer" || Number.isFinite(f) && f > 1 || !v ? !0 : t > 0;
}
function Ot(e, t = {}) {
  const { normalizeTitleSource: n = Xt, titleSource: i = Qe } = t;
  if (!e || typeof e != "object") return !1;
  const o = Number.parseInt(String(e.currentStep ?? 1), 10);
  if (Number.isFinite(o) && o > 1 || String(e.document?.id ?? "").trim() !== "") return !0;
  const d = String(e.details?.title ?? "").trim(), f = String(e.details?.message ?? "").trim(), v = n(e.titleSource, d === "" ? i.AUTOFILL : i.USER);
  return !!(d !== "" && v !== i.SERVER_SEED || f !== "" || (Array.isArray(e.participants) ? e.participants : []).some((P, T) => ti(P, T)) || Array.isArray(e.fieldDefinitions) && e.fieldDefinitions.length > 0 || Array.isArray(e.fieldPlacements) && e.fieldPlacements.length > 0 || Array.isArray(e.fieldRules) && e.fieldRules.length > 0 || e.review?.enabled);
}
function ni(e = {}) {
  const t = e || {}, n = String(t.base_path || "").trim(), i = String(t.api_base_path || "").trim() || `${n}/api`, o = i.replace(/\/+$/, ""), d = /\/v\d+$/i.test(o) ? o : `${o}/v1`, f = !!t.is_edit, v = !!t.create_success, P = String(t.submit_mode || "json").trim().toLowerCase(), T = String(t.agreement_id || "").trim(), M = String(t.active_agreement_id || "").trim(), F = String(t.routes?.documents_upload_url || "").trim() || `${n}/content/esign_documents/new`, B = Array.isArray(t.initial_participants) ? t.initial_participants : [], _ = Array.isArray(t.initial_field_instances) ? t.initial_field_instances : [], a = t.sync && typeof t.sync == "object" ? t.sync : {}, u = Array.isArray(a.action_operations) ? a.action_operations.map(($) => String($ || "").trim()).filter(Boolean) : [], l = `${d}/esign`, h = {
    base_url: String(a.base_url || "").trim() || l,
    bootstrap_path: String(a.bootstrap_path || "").trim() || `${l}/sync/bootstrap/agreement-draft`,
    client_base_path: String(a.client_base_path || "").trim() || `${n}/sync-client/sync-core`,
    resource_kind: String(a.resource_kind || "").trim() || "agreement_draft",
    storage_scope: String(a.storage_scope || "").trim(),
    action_operations: u.length > 0 ? u : [
      "send",
      "start_review",
      "dispose"
    ]
  };
  return {
    config: t,
    normalizedConfig: {
      sync: h,
      base_path: n,
      api_base_path: i,
      is_edit: f,
      create_success: v,
      submit_mode: P,
      agreement_id: T,
      active_agreement_id: M,
      routes: {
        index: String(t.routes?.index || "").trim(),
        documents: String(t.routes?.documents || "").trim(),
        create: String(t.routes?.create || "").trim(),
        documents_upload_url: F
      },
      initial_participants: B,
      initial_field_instances: _
    },
    syncConfig: h,
    basePath: n,
    apiBase: i,
    apiVersionBase: d,
    isEditMode: f,
    createSuccess: v,
    submitMode: P,
    agreementID: T,
    activeAgreementID: M,
    documentsUploadURL: F,
    initialParticipants: B,
    initialFieldInstances: _
  };
}
function ii(e = !0) {
  const t = { Accept: "application/json" };
  return e && (t["Content-Type"] = "application/json"), t;
}
function ri(e = {}) {
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
function Ct(e) {
  const t = document.createElement("div");
  return t.textContent = String(e ?? ""), t.innerHTML;
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
function ai(e, t) {
  if (!(e instanceof HTMLButtonElement)) throw new Error(`Agreement form boot failed: missing required ${t}`);
  return e;
}
function si(e = {}) {
  const { config: t, normalizedConfig: n, syncConfig: i, basePath: o, apiBase: d, apiVersionBase: f, isEditMode: v, createSuccess: P, submitMode: T, documentsUploadURL: M, initialParticipants: F, initialFieldInstances: B } = ni(e), _ = mn(document), { WIZARD_STATE_VERSION: a, WIZARD_STORAGE_KEY: u, WIZARD_CHANNEL_NAME: l, SYNC_DEBOUNCE_MS: h, SYNC_RETRY_DELAYS: $, TITLE_SOURCE: O } = ri({
    config: t,
    isEditMode: v
  }), x = In(), I = (b, ae = O.AUTOFILL) => Xt(b, ae), g = (b) => Ot(b, {
    normalizeTitleSource: I,
    titleSource: O
  }), U = dn({
    apiBasePath: f,
    basePath: o
  }), j = _.form.root, z = ai(_.form.submitBtn, "submit button"), N = _.form.announcements;
  let Z = null, K = null, ge = null, ye = null, J = null, ce = null, ie = null, he = null, pe = null, we = wt();
  const Fe = (b, ae = {}) => {
    ye?.applyStateToUI(b, ae);
  }, Ie = () => ye?.debouncedTrackChanges?.(), W = () => he?.trackWizardStateChanges?.(), ve = (b) => ie?.formatRelativeTime(b) || "unknown", q = () => ie?.restoreSyncStatusFromState(), Pe = (b) => ie?.updateSyncStatus(b), _e = (b) => ie?.showSyncConflictDialog(b), oe = (b, ae = "", ke = 0) => ie?.mapUserFacingError(b, ae, ke) || String(b || "").trim(), ue = (b, ae) => ie ? ie.parseAPIError(b, ae) : Promise.resolve({
    status: Number(b.status || 0),
    code: "",
    details: {},
    message: ae
  }), Be = (b, ae = "", ke = 0) => ie?.announceError(b, ae, ke), je = (b, ae = {}) => ie ? ie.surfaceSyncOutcome(b, ae) : Promise.resolve({}), $e = () => null, Ne = fn(_, { formatRelativeTime: ve }), Oe = () => Ne.render({ coordinationAvailable: !0 }), le = async (b, ae) => {
    const ke = await ue(b, ae), Te = new Error(ke.message);
    return Te.code = ke.code, Te.status = ke.status, Te;
  }, m = {
    hasResumableState: () => p.hasResumableState(),
    setTitleSource: (b, ae) => p.setTitleSource(b, ae),
    updateDocument: (b) => p.updateDocument(b),
    updateDetails: (b, ae) => p.updateDetails(b, ae),
    getState: () => {
      const b = p.getState();
      return {
        titleSource: b.titleSource,
        details: b.details && typeof b.details == "object" ? b.details : {}
      };
    }
  }, p = new gn({
    storageKey: u,
    stateVersion: a,
    totalWizardSteps: pt,
    titleSource: O,
    normalizeTitleSource: I,
    parsePositiveInt: De,
    hasMeaningfulWizardProgress: g,
    collectFormState: () => {
      const b = _.form.documentIdInput?.value || null, ae = document.getElementById("selected-document-title")?.textContent?.trim() || null, ke = I(p.getState()?.titleSource, String(_.form.titleInput?.value || "").trim() === "" ? O.AUTOFILL : O.USER);
      return {
        document: {
          id: b,
          title: ae,
          pageCount: parseInt(_.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: _.form.titleInput?.value || "",
          message: _.form.messageInput?.value || ""
        },
        titleSource: ke,
        participants: Z?.collectParticipantsForState?.() || [],
        fieldDefinitions: K?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: ge?.getState?.()?.fieldInstances || [],
        fieldRules: K?.collectFieldRulesForState?.() || [],
        review: pe?.collectReviewConfigForState?.() || {
          enabled: !1,
          gate: "approve_before_send",
          commentsEnabled: !1,
          participants: []
        }
      };
    },
    emitTelemetry: x
  });
  p.start(), ie = Qn({
    agreementRefs: _,
    formAnnouncements: N,
    stateManager: p
  });
  const y = new yn({
    stateManager: p,
    requestHeaders: ii,
    syncConfig: i
  });
  let A;
  const ee = new vn({
    channelName: l,
    onCoordinationAvailabilityChange: (b) => {
      q(), Ne.render({ coordinationAvailable: b });
    },
    onRemoteSync: (b) => {
      String(p.getState()?.serverDraftId || "").trim() === String(b || "").trim() && (p.getState()?.syncPending || A?.refreshCurrentDraft({
        preserveDirty: !0,
        force: !0
      }).then(() => {
        Fe(p.getState(), { step: Number(p.getState()?.currentStep || 1) });
      }));
    },
    onRemoteDraftDisposed: (b) => {
      String(p.getState()?.serverDraftId || "").trim() === String(b || "").trim() && (p.getState()?.syncPending || p.setState({
        ...p.getState(),
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
      A?.forceSync();
    },
    onPageHide: () => {
      A?.forceSync();
    },
    onBeforeUnload: () => {
      A?.forceSync();
    }
  });
  A = new wn({
    stateManager: p,
    syncService: y,
    activeTabController: ee,
    storageKey: u,
    statusUpdater: Pe,
    showConflictDialog: _e,
    syncDebounceMs: h,
    syncRetryDelays: $,
    documentRef: document,
    windowRef: window
  });
  const te = pn({
    context: {
      config: n,
      refs: _,
      basePath: o,
      apiBase: d,
      apiVersionBase: f,
      previewCard: U,
      emitTelemetry: x,
      stateManager: p,
      syncService: y,
      activeTabController: ee,
      syncController: A
    },
    hooks: {
      renderInitialUI() {
        ye?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        ce?.maybeShowResumeDialog?.(), Y.loadDocuments(), Y.loadRecentDocuments();
      },
      destroy() {
        Ne.destroy(), p.destroy();
      }
    }
  }), Y = Bn({
    apiBase: d,
    apiVersionBase: f,
    documentsUploadURL: M,
    isEditMode: v,
    titleSource: O,
    normalizeTitleSource: I,
    stateManager: m,
    previewCard: U,
    parseAPIError: le,
    announceError: Be,
    showToast: Ht,
    mapUserFacingError: oe,
    renderFieldRulePreview: () => K?.renderFieldRulePreview?.()
  });
  Y.initializeTitleSourceSeed(), Y.bindEvents();
  const de = at(Y.refs.documentIdInput, "document id input"), L = at(Y.refs.documentSearch, "document search input"), V = Y.refs.selectedDocumentTitle, Q = Y.refs.documentPageCountInput, re = Y.ensureSelectedDocumentCompatibility, se = Y.getCurrentDocumentPageCount;
  Z = $n({
    initialParticipants: F,
    onParticipantsChanged: () => K?.updateFieldParticipantOptions?.()
  }), Z.initialize(), Z.bindEvents();
  const me = at(Z.refs.participantsContainer, "participants container"), Se = at(Z.refs.addParticipantBtn, "add participant button"), r = () => Z?.getSignerParticipants() || [];
  K = Hn({
    initialFieldInstances: B,
    placementSource: He,
    getCurrentDocumentPageCount: se,
    getSignerParticipants: r,
    escapeHtml: Ct,
    onDefinitionsChanged: () => Ie(),
    onRulesChanged: () => Ie(),
    onParticipantsChanged: () => K?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => ge?.getLinkGroupState?.() || we,
    setPlacementLinkGroupState: (b) => {
      we = b || wt(), ge?.setLinkGroupState?.(we);
    }
  }), K.bindEvents(), K.initialize();
  const s = at(K.refs.fieldDefinitionsContainer, "field definitions container"), c = K.refs.fieldRulesContainer, R = at(K.refs.addFieldBtn, "add field button"), k = K.refs.fieldPlacementsJSONInput, D = K.refs.fieldRulesJSONInput, H = () => K?.collectFieldRulesForState() || [], ne = () => K?.collectFieldRulesForState() || [], Ce = () => K?.collectFieldRulesForForm() || [], fe = (b, ae) => K?.expandRulesForPreview(b, ae) || [], Ee = () => K?.updateFieldParticipantOptions(), We = () => K.collectPlacementFieldDefinitions(), Ke = (b) => K?.getFieldDefinitionById(b) || null, xe = () => K?.findSignersMissingRequiredSignatureField() || [], S = (b) => K?.missingSignatureFieldMessage(b) || "", w = En({
    documentIdInput: de,
    selectedDocumentTitle: V,
    participantsContainer: me,
    fieldDefinitionsContainer: s,
    submitBtn: z,
    escapeHtml: Ct,
    getSignerParticipants: r,
    getCurrentDocumentPageCount: se,
    collectFieldRulesForState: ne,
    expandRulesForPreview: fe,
    findSignersMissingRequiredSignatureField: xe,
    goToStep: (b) => C.goToStep(b)
  }), E = (b) => {
    z.getAttribute("aria-busy") !== "true" && (z.innerHTML = `
      <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </svg>
      ${b}
    `);
  };
  pe = Wn({
    getSignerParticipants: r,
    setPrimaryActionLabel: E,
    onChanged: () => W()
  }), pe.bindEvents(), ge = Gn({
    apiBase: d,
    apiVersionBase: f,
    documentIdInput: de,
    fieldPlacementsJSONInput: k,
    initialFieldInstances: K.buildInitialPlacementInstances(),
    initialLinkGroupState: we,
    collectPlacementFieldDefinitions: We,
    getFieldDefinitionById: Ke,
    parseAPIError: le,
    mapUserFacingError: oe,
    showToast: Ht,
    escapeHtml: Ct,
    onPlacementsChanged: () => W()
  }), ge.bindEvents(), we = ge.getLinkGroupState();
  const C = xn({
    totalWizardSteps: pt,
    wizardStep: Me,
    nextStepLabels: nn,
    submitBtn: z,
    previewCard: U,
    updateCoordinationUI: Oe,
    validateStep: (b) => J?.validateStep(b) !== !1,
    onPlacementStep() {
      ge.initPlacementEditor();
    },
    onReviewStep() {
      pe?.refreshRecipientReviewers(), w.initSendReadinessCheck();
    },
    onStepChanged(b) {
      p.updateStep(b), W(), A.forceSync();
    }
  });
  C.bindEvents(), he = ei({
    createSuccess: P,
    enableServerSync: !v && T === "json",
    stateManager: p,
    syncOrchestrator: A,
    syncService: y,
    applyStateToUI: (b) => Fe(b, { step: Number(b?.currentStep || 1) }),
    surfaceSyncOutcome: je,
    announceError: Be,
    getCurrentStep: () => C.getCurrentStep(),
    reviewStep: Me.REVIEW,
    onReviewStepRequested: () => w.initSendReadinessCheck()
  }), he.handleCreateSuccessCleanup(), he.bindRetryAndConflictHandlers();
  const G = Vn({
    documentIdInput: de,
    documentPageCountInput: Q,
    titleInput: _.form.titleInput,
    messageInput: _.form.messageInput,
    participantsContainer: me,
    fieldDefinitionsContainer: s,
    fieldPlacementsJSONInput: k,
    fieldRulesJSONInput: D,
    collectFieldRulesForForm: () => Ce(),
    buildPlacementFormEntries: () => ge?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => C.getCurrentStep(),
    totalWizardSteps: pt
  }), X = () => G.buildCanonicalAgreementPayload();
  return ye = Kn({
    titleSource: O,
    stateManager: p,
    trackWizardStateChanges: W,
    participantsController: Z,
    fieldDefinitionsController: K,
    placementController: ge,
    reviewConfigController: pe,
    updateFieldParticipantOptions: Ee,
    previewCard: U,
    wizardNavigationController: C,
    documentIdInput: de,
    documentPageCountInput: Q,
    selectedDocumentTitle: V,
    agreementRefs: _,
    parsePositiveInt: De,
    isEditMode: v
  }), ye.bindChangeTracking(), J = Xn({
    documentIdInput: de,
    titleInput: _.form.titleInput,
    participantsContainer: me,
    fieldDefinitionsContainer: s,
    fieldRulesContainer: c,
    addFieldBtn: R,
    ensureSelectedDocumentCompatibility: re,
    collectFieldRulesForState: H,
    findSignersMissingRequiredSignatureField: xe,
    missingSignatureFieldMessage: S,
    announceError: Be
  }), ce = Zn({
    isEditMode: v,
    storageKey: u,
    stateManager: p,
    syncOrchestrator: A,
    syncService: y,
    applyResumedState: (b) => Fe(b, { step: Number(b?.currentStep || 1) }),
    hasMeaningfulWizardProgress: Ot,
    formatRelativeTime: ve,
    emitWizardTelemetry: (b, ae) => x(b, ae),
    getActiveTabDebugState: $e
  }), ce.bindEvents(), An({
    config: t,
    form: j,
    submitBtn: z,
    documentIdInput: de,
    documentSearch: L,
    participantsContainer: me,
    addParticipantBtn: Se,
    fieldDefinitionsContainer: s,
    fieldRulesContainer: c,
    documentPageCountInput: Q,
    fieldPlacementsJSONInput: k,
    fieldRulesJSONInput: D,
    storageKey: u,
    syncService: y,
    syncOrchestrator: A,
    stateManager: p,
    submitMode: T,
    totalWizardSteps: pt,
    wizardStep: Me,
    getCurrentStep: () => C.getCurrentStep(),
    getPlacementState: () => ge.getState(),
    getCurrentDocumentPageCount: se,
    ensureSelectedDocumentCompatibility: re,
    collectFieldRulesForState: H,
    collectFieldRulesForForm: Ce,
    expandRulesForPreview: fe,
    findSignersMissingRequiredSignatureField: xe,
    missingSignatureFieldMessage: S,
    getSignerParticipants: r,
    getReviewConfigForState: () => pe?.collectReviewConfigForState?.() || {
      enabled: !1,
      gate: "approve_before_send",
      commentsEnabled: !1,
      participants: []
    },
    isStartReviewEnabled: () => pe?.isStartReviewEnabled?.() === !0,
    setPrimaryActionLabel: E,
    buildCanonicalAgreementPayload: X,
    announceError: Be,
    emitWizardTelemetry: x,
    parseAPIError: ue,
    goToStep: (b) => C.goToStep(b),
    showSyncConflictDialog: _e,
    surfaceSyncOutcome: je,
    updateSyncStatus: Pe,
    getActiveTabDebugState: $e,
    addFieldBtn: R
  }).bindEvents(), te;
}
var It = null;
function oi() {
  It?.destroy(), It = null, typeof window < "u" && (delete window.__esignAgreementRuntime, delete window.__esignAgreementRuntimeInitialized);
}
function ci(e = {}) {
  if (It) return;
  const t = si(e);
  t.start(), It = t, typeof window < "u" && (window.__esignAgreementRuntime = t, window.__esignAgreementRuntimeInitialized = !0);
}
function li(e = document) {
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
function di(e) {
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
var Zt = class {
  constructor(e) {
    this.initialized = !1, this.config = di(e);
  }
  init() {
    this.initialized || (this.initialized = !0, li(), ci(this.config));
  }
  destroy() {
    oi(), this.initialized = !1;
  }
};
function hi(e) {
  const t = new Zt(e);
  return Pt(() => t.init()), t;
}
function ui(e) {
  const t = new Zt({
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
function pi(e) {
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
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = pi(JSON.parse(e.textContent || "{}"));
      t && ui(t);
    } catch (t) {
      console.warn("Failed to parse agreement form page config:", t);
    }
});
export {
  ui as n,
  hi as r,
  Zt as t
};

//# sourceMappingURL=agreement-form-DNmQAxvn.js.map