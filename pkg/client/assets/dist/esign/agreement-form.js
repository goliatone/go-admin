import { onReady as Dt } from "../shared/dom-ready.js";
import { l as jt, a as Gt } from "../chunks/runtime-bhSs9hEJ.js";
import { escapeHTML as Ue } from "../shared/html.js";
import { formatRelativeTimeVerbosePast as Wt } from "../shared/time-formatters.js";
const $e = {
  DOCUMENT: 1,
  DETAILS: 2,
  PARTICIPANTS: 3,
  FIELDS: 4,
  PLACEMENT: 5,
  REVIEW: 6
}, mt = $e.REVIEW, tn = {
  [$e.DOCUMENT]: "Details",
  [$e.DETAILS]: "Participants",
  [$e.PARTICIPANTS]: "Fields",
  [$e.FIELDS]: "Placement",
  [$e.PLACEMENT]: "Review"
}, Ge = {
  AUTO: "auto",
  MANUAL: "manual",
  AUTO_FALLBACK: "auto_fallback",
  /** Placement was auto-created by copying from a linked field in the same link group */
  AUTO_LINKED: "auto_linked"
}, bt = {
  /** Maximum thumbnail width in pixels */
  THUMBNAIL_MAX_WIDTH: 280,
  /** Maximum thumbnail height in pixels */
  THUMBNAIL_MAX_HEIGHT: 200
};
$e.DOCUMENT, $e.DETAILS, $e.PARTICIPANTS, $e.FIELDS, $e.REVIEW;
const Ct = /* @__PURE__ */ new Map(), nn = 30 * 60 * 1e3;
function rn() {
  return typeof window > "u" ? !1 : window.__ADMIN_DEBUG__ === !0 || window.ADMIN_DEBUG === !0 || document.body?.dataset?.debug === "true";
}
function sn(n) {
  const e = Ct.get(n);
  return e ? Date.now() - e.timestamp > nn ? (Ct.delete(n), null) : e : null;
}
function an(n, e, t) {
  Ct.set(n, {
    dataUrl: e,
    pageCount: t,
    timestamp: Date.now()
  });
}
async function on(n, e, t = bt.THUMBNAIL_MAX_WIDTH, i = bt.THUMBNAIL_MAX_HEIGHT) {
  const l = await Gt({
    url: n,
    withCredentials: !0
  }).promise, p = l.numPages, y = await l.getPage(1), _ = y.getViewport({ scale: 1 }), F = t / _.width, x = i / _.height, P = Math.min(F, x, 1), T = y.getViewport({ scale: P }), w = document.createElement("canvas");
  w.width = T.width, w.height = T.height;
  const a = w.getContext("2d");
  if (!a)
    throw new Error("Failed to get canvas context");
  return await y.render({
    canvasContext: a,
    viewport: T
  }).promise, { dataUrl: w.toDataURL("image/jpeg", 0.8), pageCount: p };
}
class cn {
  constructor(e = {}) {
    this.requestVersion = 0, this.config = {
      apiBasePath: e.apiBasePath || "",
      basePath: e.basePath || "",
      thumbnailMaxWidth: e.thumbnailMaxWidth || bt.THUMBNAIL_MAX_WIDTH,
      thumbnailMaxHeight: e.thumbnailMaxHeight || bt.THUMBNAIL_MAX_HEIGHT
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
  /**
   * Initialize the preview card by binding to DOM elements
   */
  init() {
    this.elements.container = document.getElementById("document-preview-card"), this.elements.thumbnail = document.getElementById("document-preview-thumbnail"), this.elements.title = document.getElementById("document-preview-title"), this.elements.pageCount = document.getElementById("document-preview-page-count"), this.elements.loadingState = document.getElementById("document-preview-loading"), this.elements.errorState = document.getElementById("document-preview-error"), this.elements.emptyState = document.getElementById("document-preview-empty"), this.elements.contentState = document.getElementById("document-preview-content"), this.elements.errorMessage = document.getElementById("document-preview-error-message"), this.elements.errorSuggestion = document.getElementById("document-preview-error-suggestion"), this.elements.errorRetryBtn = document.getElementById("document-preview-retry-btn"), this.elements.errorDebugInfo = document.getElementById("document-preview-error-debug"), this.elements.errorRetryBtn && this.elements.errorRetryBtn.addEventListener("click", () => this.retry()), this.render();
  }
  /**
   * Retry loading the document preview
   */
  retry() {
    this.state.documentId && this.setDocument(this.state.documentId, this.state.documentTitle, this.state.pageCount);
  }
  /**
   * Get current state (for testing)
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Update visibility based on current wizard step
   */
  updateVisibility(e) {
    if (!this.elements.container) return;
    const t = e === $e.DOCUMENT || e === $e.DETAILS || e === $e.PARTICIPANTS || e === $e.FIELDS || e === $e.REVIEW;
    this.elements.container.classList.toggle("hidden", !t);
  }
  /**
   * Set document and load preview
   */
  async setDocument(e, t = null, i = null) {
    const s = ++this.requestVersion;
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
    const l = sn(e);
    if (l) {
      this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: i ?? l.pageCount,
        thumbnailUrl: l.dataUrl,
        isLoading: !1,
        error: null
      }, this.render();
      return;
    }
    this.state = {
      documentId: e,
      documentTitle: t,
      pageCount: i,
      thumbnailUrl: null,
      isLoading: !0,
      error: null
    }, this.render();
    let p = "";
    try {
      if (p = await this.fetchDocumentPdfUrl(e), s !== this.requestVersion)
        return;
      const { dataUrl: y, pageCount: _ } = await on(
        p,
        e,
        this.config.thumbnailMaxWidth,
        this.config.thumbnailMaxHeight
      );
      if (s !== this.requestVersion)
        return;
      an(e, y, _), this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: i ?? _,
        thumbnailUrl: y,
        isLoading: !1,
        error: null
      };
    } catch (y) {
      if (s !== this.requestVersion)
        return;
      const _ = jt(y, {
        surface: "agreement-preview-card",
        documentId: e,
        url: p
      }), F = _.rawMessage;
      this.state = {
        documentId: e,
        documentTitle: t,
        pageCount: i,
        thumbnailUrl: null,
        isLoading: !1,
        error: F,
        errorMessage: _.message,
        errorSuggestion: _.suggestion,
        errorRetryable: _.isRetryable
      };
    }
    this.render();
  }
  /**
   * Fetch PDF URL from document API
   */
  async fetchDocumentPdfUrl(e) {
    const i = (this.config.apiBasePath || `${this.config.basePath}/api`).replace(/\/+$/, "");
    return `${/\/v\d+$/i.test(i) ? i : `${i}/v1`}/panels/esign_documents/${encodeURIComponent(e)}/source/pdf`;
  }
  /**
   * Render the preview card based on current state
   */
  render() {
    const { container: e, thumbnail: t, title: i, pageCount: s, loadingState: l, errorState: p, emptyState: y, contentState: _ } = this.elements;
    if (e) {
      if (l?.classList.add("hidden"), p?.classList.add("hidden"), y?.classList.add("hidden"), _?.classList.add("hidden"), !this.state.documentId) {
        y?.classList.remove("hidden");
        return;
      }
      if (this.state.isLoading) {
        l?.classList.remove("hidden");
        return;
      }
      if (this.state.error) {
        p?.classList.remove("hidden"), this.elements.errorMessage && (this.elements.errorMessage.textContent = this.state.errorMessage || "Preview unavailable"), this.elements.errorSuggestion && (this.elements.errorSuggestion.textContent = this.state.errorSuggestion || "", this.elements.errorSuggestion.classList.toggle("hidden", !this.state.errorSuggestion)), this.elements.errorRetryBtn && this.elements.errorRetryBtn.classList.toggle("hidden", !this.state.errorRetryable), this.elements.errorDebugInfo && (rn() ? (this.elements.errorDebugInfo.textContent = this.state.error, this.elements.errorDebugInfo.classList.remove("hidden")) : this.elements.errorDebugInfo.classList.add("hidden"));
        return;
      }
      _?.classList.remove("hidden"), t && this.state.thumbnailUrl && (t.src = this.state.thumbnailUrl, t.alt = `Preview of ${this.state.documentTitle || "document"}`), i && (i.textContent = this.state.documentTitle || "Untitled Document"), s && this.state.pageCount && (s.textContent = `${this.state.pageCount} page${this.state.pageCount !== 1 ? "s" : ""}`);
    }
  }
  /**
   * Clear the preview card state
   */
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
}
function ln(n = {}) {
  const e = new cn(n);
  return e.init(), e;
}
function dn(n = {}) {
  let e = !1;
  return {
    start() {
      e || (e = !0, n.renderInitialUI?.(), n.bindEvents?.(), n.startSideEffects?.());
    },
    destroy() {
      e && (e = !1, n.destroy?.());
    }
  };
}
function un(n) {
  const { context: e, hooks: t = {} } = n;
  return dn({
    renderInitialUI() {
      t.renderInitialUI?.();
    },
    bindEvents() {
      t.bindEvents?.();
    },
    startSideEffects() {
      e.syncController.start(), t.startSideEffects?.();
    },
    destroy() {
      t.destroy?.(), e.syncController.destroy();
    }
  });
}
function He(n, e) {
  return n instanceof Document ? n.getElementById(e) : n.querySelector(`#${e}`);
}
function lt(n, e, t) {
  const i = He(n, e);
  if (!i)
    throw new Error(`Agreement form boot failed: missing required ${t} element (#${e})`);
  return i;
}
function pn(n = document) {
  return {
    marker: He(n, "esign-page-config"),
    form: {
      root: lt(n, "agreement-form", "form"),
      submitBtn: lt(n, "submit-btn", "submit button"),
      wizardSaveBtn: He(n, "wizard-save-btn"),
      announcements: He(n, "form-announcements"),
      documentIdInput: lt(n, "document_id", "document selector"),
      documentPageCountInput: He(n, "document_page_count"),
      titleInput: lt(n, "title", "title input"),
      messageInput: lt(n, "message", "message input")
    },
    coordination: {
      banner: He(n, "active-tab-banner"),
      message: He(n, "active-tab-message")
    },
    sync: {
      indicator: He(n, "sync-status-indicator"),
      icon: He(n, "sync-status-icon"),
      text: He(n, "sync-status-text"),
      retryBtn: He(n, "sync-retry-btn")
    },
    conflict: {
      modal: He(n, "conflict-dialog-modal"),
      localTime: He(n, "conflict-local-time"),
      serverRevision: He(n, "conflict-server-revision"),
      serverTime: He(n, "conflict-server-time")
    }
  };
}
function mn(n, e) {
  return {
    render(t = {}) {
      const i = t?.coordinationAvailable !== !1, s = n.coordination.banner, l = n.coordination.message;
      if (!s || !l)
        return;
      if (i) {
        s.classList.add("hidden");
        return;
      }
      const p = t?.lastSeenAt ? e.formatRelativeTime(t.lastSeenAt) : "recently";
      l.textContent = `Draft coordination updates are unavailable in this tab. Changes in another tab may not appear until you refresh. Last seen ${p}.`, s.classList.remove("hidden");
    },
    destroy() {
      n.coordination.banner?.classList.add("hidden");
    }
  };
}
class fn {
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
      document: { id: null, title: null, pageCount: null },
      details: { title: "", message: "" },
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
      const i = JSON.parse(t);
      return i.version !== this.options.stateVersion ? this.migrateState(i) : this.normalizeLoadedState(i);
    } catch {
      return null;
    }
  }
  normalizeLoadedState(e) {
    if (!e || typeof e != "object")
      return this.createInitialState();
    const t = this.createInitialState(), i = { ...t, ...e }, s = Number.parseInt(String(e.currentStep ?? t.currentStep), 10);
    i.currentStep = Number.isFinite(s) ? Math.min(Math.max(s, 1), this.options.totalWizardSteps) : t.currentStep;
    const l = e.document && typeof e.document == "object" ? e.document : {}, p = l.id;
    i.document = {
      id: p == null ? null : String(p).trim() || null,
      title: String(l.title ?? "").trim() || null,
      pageCount: this.options.parsePositiveInt(l.pageCount, 0) || null
    };
    const y = e.details && typeof e.details == "object" ? e.details : {}, _ = String(y.title ?? "").trim(), F = _ === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER;
    i.details = {
      title: _,
      message: String(y.message ?? "")
    }, i.participants = Array.isArray(e.participants) ? e.participants : [], i.fieldDefinitions = Array.isArray(e.fieldDefinitions) ? e.fieldDefinitions : [], i.fieldPlacements = Array.isArray(e.fieldPlacements) ? e.fieldPlacements : [], i.fieldRules = Array.isArray(e.fieldRules) ? e.fieldRules : [];
    const x = e.review && typeof e.review == "object" ? e.review : {};
    i.review = {
      enabled: !!x.enabled,
      gate: String(x.gate ?? t.review.gate).trim() || t.review.gate,
      commentsEnabled: !!x.commentsEnabled,
      participants: Array.isArray(x.participants) ? x.participants : []
    };
    const P = String(e.wizardId ?? "").trim();
    i.wizardId = P || t.wizardId, i.version = this.options.stateVersion, i.createdAt = String(e.createdAt ?? t.createdAt), i.updatedAt = String(e.updatedAt ?? t.updatedAt), i.titleSource = this.options.normalizeTitleSource(e.titleSource, F), i.resourceRef = this.normalizeResourceRef(e.resourceRef ?? e.resource_ref);
    const T = String(e.serverDraftId ?? "").trim();
    return i.serverDraftId = T || null, i.serverRevision = this.options.parsePositiveInt(e.serverRevision, 0), i.lastSyncedAt = String(e.lastSyncedAt ?? "").trim() || null, i.syncPending = !!e.syncPending, i;
  }
  normalizeResourceRef(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e, i = String(t.kind ?? "").trim(), s = String(t.id ?? "").trim();
    if (i === "" || s === "")
      return null;
    const l = t.scope, p = l && typeof l == "object" && !Array.isArray(l) ? Object.entries(l).reduce((y, [_, F]) => {
      const x = String(_ || "").trim();
      return x !== "" && (y[x] = String(F ?? "").trim()), y;
    }, {}) : void 0;
    return {
      kind: i,
      id: s,
      scope: p && Object.keys(p).length > 0 ? p : void 0
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
    this.setState(
      { ...this.getState(), ...e, syncPending: !0, updatedAt: this.now() },
      { syncPending: !0 }
    );
  }
  updateStep(e) {
    this.updateState({ currentStep: e });
  }
  updateDocument(e) {
    this.updateState({ document: { ...this.getState().document, ...e } });
  }
  updateDetails(e, t = {}) {
    const i = {
      details: { ...this.getState().details, ...e }
    };
    Object.prototype.hasOwnProperty.call(t, "titleSource") ? i.titleSource = this.options.normalizeTitleSource(t.titleSource, this.getState().titleSource) : Object.prototype.hasOwnProperty.call(e || {}, "title") && (i.titleSource = this.options.titleSource.USER), this.updateState(i);
  }
  setTitleSource(e, t = {}) {
    const i = this.options.normalizeTitleSource(e, this.getState().titleSource);
    if (i !== this.getState().titleSource) {
      if (t.syncPending === !1) {
        this.setState({ ...this.getState(), titleSource: i }, { syncPending: !1 });
        return;
      }
      this.updateState({ titleSource: i });
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
    const i = this.normalizeResourceRef(e);
    this.setState({
      ...this.getState(),
      resourceRef: i,
      serverDraftId: i?.id || null
    }, {
      save: t.save,
      notify: t.notify,
      syncPending: !1
    });
  }
  applyServerSnapshot(e, t = {}) {
    const i = this.getState();
    if (t.preserveDirty === !0 && i.syncPending === !0)
      return this.setState({
        ...i,
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
    const l = e?.data && typeof e.data == "object" ? e.data : {}, p = this.normalizeLoadedState({
      ...l?.wizard_state && typeof l.wizard_state == "object" ? l.wizard_state : {},
      resourceRef: e.ref,
      serverDraftId: e.ref.id,
      serverRevision: e.revision,
      lastSyncedAt: e.updatedAt,
      syncPending: !1
    });
    return this.setState(p, {
      save: t.save,
      notify: t.notify,
      syncPending: !1
    }), this.getState();
  }
  applyRemoteSync(e, t, i = {}) {
    const s = this.getState(), l = s.syncPending === !0, p = String(e ?? "").trim() || null, y = this.options.parsePositiveInt(t, 0);
    return this.setState({
      ...s,
      serverDraftId: p || s.serverDraftId,
      serverRevision: y > 0 ? y : s.serverRevision,
      lastSyncedAt: String(i.lastSyncedAt || this.now()).trim() || s.lastSyncedAt,
      syncPending: l
    }, {
      syncPending: l,
      save: i.save,
      notify: i.notify
    }), {
      preservedLocalChanges: l,
      state: this.getState()
    };
  }
  applyRemoteState(e, t = {}) {
    const i = this.normalizeLoadedState(e), s = this.getState();
    return s.syncPending === !0 ? (this.setState({
      ...s,
      serverDraftId: i.serverDraftId || s.serverDraftId,
      serverRevision: Math.max(
        this.options.parsePositiveInt(s.serverRevision, 0),
        this.options.parsePositiveInt(i.serverRevision, 0)
      ),
      lastSyncedAt: i.lastSyncedAt || s.lastSyncedAt,
      syncPending: !0
    }, {
      syncPending: !0,
      save: t.save,
      notify: t.notify
    }), {
      preservedLocalChanges: !0,
      replacedLocalState: !1,
      state: this.getState()
    }) : (this.setState(i, {
      syncPending: !!i.syncPending,
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
    const e = this.getState(), t = this.options.collectFormState(), i = t.details && typeof t.details == "object" ? t.details : {}, s = this.options.normalizeTitleSource(
      t.titleSource,
      String(i.title || "").trim() === "" ? this.options.titleSource.AUTOFILL : this.options.titleSource.USER
    );
    return {
      ...t,
      resourceRef: e.resourceRef || null,
      titleSource: s,
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
}
const Et = /* @__PURE__ */ new Map();
async function gn(n) {
  const e = String(n || "").trim().replace(/\/+$/, "");
  if (e === "")
    throw new Error("sync.client_base_path is required to load sync-core");
  return typeof window < "u" && window.__esignSyncCoreModule ? At(window.__esignSyncCoreModule) : (Et.has(e) || Et.set(e, hn(e)), Et.get(e));
}
async function hn(n) {
  if (typeof window < "u" && typeof window.__esignSyncCoreLoader == "function")
    return At(await window.__esignSyncCoreLoader(n));
  const t = await import(`${n}/index.js`);
  return At(t);
}
function At(n) {
  if (!n || typeof n.createInMemoryCache != "function" || typeof n.createFetchSyncTransport != "function" || typeof n.createSyncEngine != "function" || typeof n.parseReadEnvelope != "function")
    throw new TypeError("Invalid sync-core runtime module");
  return n;
}
class yn {
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
    const i = await this.sync();
    if (!i.success || !i.result)
      throw this.toRuntimeError(i.error || "draft_create_failed");
    return i.result;
  }
  async load(e) {
    const t = this.resolveStoredResourceRef(this.stateManager.getState(), e) || this.createFallbackResourceRef(e);
    await this.bindResource(t);
    try {
      const i = await this.resource.refresh({ force: !0 });
      return this.snapshotToRecord(i);
    } catch (i) {
      if (String(i?.code || "").trim().toUpperCase() === "NOT_FOUND") {
        const s = new Error("HTTP 404");
        throw s.status = 404, s.code = "NOT_FOUND", s;
      }
      throw i;
    }
  }
  async dispose(e) {
    const t = this.resourceRef?.id === e ? this.resourceRef : this.resolveStoredResourceRef(this.stateManager.getState(), e) || this.createFallbackResourceRef(e);
    await this.bindResource(t);
    let i = Number(this.resource?.getSnapshot()?.revision || 0);
    if (i <= 0)
      try {
        const s = await this.resource.load();
        i = Number(s.revision || 0);
      } catch (s) {
        if (Number(s?.status || 0) !== 404 && String(s?.code || "").trim().toUpperCase() !== "NOT_FOUND")
          throw s;
        i = 0;
      }
    i > 0 && await this.resource.mutate({
      operation: "dispose",
      payload: {},
      expectedRevision: i,
      idempotencyKey: `dispose:${e}:${i}`
    }), this.resourceRef?.id === e && (this.resource = null, this.resourceRef = null);
  }
  async refresh(e = {}) {
    const t = await this.ensureBoundResource(), i = t.getSnapshot() ? await t.refresh({ force: e.force !== !1 }) : await t.load();
    return this.stateManager.applyServerSnapshot(i, {
      notify: !0,
      save: !0,
      preserveDirty: e.preserveDirty === !0
    }), this.snapshotToRecord(i);
  }
  async send(e, t, i = {}) {
    const l = await (await this.ensureBoundResource()).mutate({
      operation: "send",
      payload: {},
      expectedRevision: e,
      idempotencyKey: t,
      metadata: i
    });
    return {
      replay: l.replay,
      applied: l.applied,
      snapshot: l.snapshot,
      data: this.snapshotData(l.snapshot)
    };
  }
  async startReview(e, t, i = {}) {
    const l = await (await this.ensureBoundResource()).mutate({
      operation: "start_review",
      payload: {},
      expectedRevision: e,
      idempotencyKey: t,
      metadata: i
    });
    return {
      replay: l.replay,
      applied: l.applied,
      snapshot: l.snapshot,
      data: this.snapshotData(l.snapshot)
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
      const i = await (await this.ensureBoundResource({
        preserveLocalState: !e.serverDraftId
      })).mutate({
        operation: "autosave",
        payload: {
          wizard_state: e,
          title: e.details?.title || "Untitled Agreement",
          current_step: e.currentStep,
          document_id: e.document?.id || null
        },
        expectedRevision: Number(e.serverRevision || 0) || void 0
      });
      return this.applyMutationSnapshot(i), {
        success: !0,
        result: this.snapshotToRecord(i.snapshot)
      };
    } catch (t) {
      const i = t?.conflict;
      return i || String(t?.code || "").trim().toUpperCase() === "STALE_REVISION" ? {
        success: !1,
        conflict: !0,
        currentRevision: Number(i?.currentRevision || t?.currentRevision || 0),
        latestSnapshot: i?.latestSnapshot || t?.resource || null
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
    }), i = await t.json().catch(() => ({}));
    if (!t.ok)
      throw new Error(String(i?.error?.message || `HTTP ${t.status}`));
    const s = this.normalizeResourceRef(i?.resource_ref);
    if (!s)
      throw new Error("Invalid agreement draft bootstrap response");
    const l = e.parseReadEnvelope(s, i?.draft || {});
    return {
      resourceRef: s,
      snapshot: l,
      wizardID: String(i?.wizard_id || "").trim()
    };
  }
  async ensureRuntime() {
    return this.syncModule ? this.syncModule : (this.syncModulePromise || (this.syncModulePromise = gn(this.syncConfig.client_base_path)), this.syncModule = await this.syncModulePromise, this.cache || (this.cache = this.syncModule.createInMemoryCache()), this.transport || (this.transport = this.syncModule.createFetchSyncTransport({
      baseURL: this.syncConfig.base_url,
      credentials: "same-origin",
      fetch: this.fetchImpl,
      headers: () => this.requestHeaders(!1),
      actionOperations: this.syncConfig.action_operations
    })), this.syncModule);
  }
  async ensureBoundResource(e = {}) {
    if (!e.forceBootstrap && this.resource && this.resourceRef)
      return this.resource;
    const t = this.stateManager.getState(), i = e.forceBootstrap ? null : this.resolveStoredResourceRef(t);
    if (i)
      return await this.bindResource(i), this.resource;
    if (!e.forceBootstrap && t.serverDraftId)
      return await this.bindResource(this.createFallbackResourceRef(t.serverDraftId)), this.resource;
    const s = await this.bootstrap();
    return await this.bindResource(s.resourceRef, s.snapshot), e.preserveLocalState ? this.stateManager.setState({
      ...this.stateManager.getState(),
      resourceRef: s.resourceRef,
      serverDraftId: s.resourceRef.id,
      serverRevision: s.snapshot.revision,
      lastSyncedAt: s.snapshot.updatedAt,
      syncPending: !0
    }, {
      notify: !1,
      save: !0,
      syncPending: !0
    }) : this.stateManager.applyServerSnapshot(s.snapshot, {
      notify: !1,
      save: !0
    }), this.resource;
  }
  async bindResource(e, t) {
    const i = await this.ensureRuntime(), s = this.normalizeResourceRef(e);
    if (!s)
      throw new Error("A valid draft resourceRef is required");
    t && this.cache && this.cache.set(s, t);
    const l = i.createSyncEngine({
      transport: this.transport,
      cache: this.cache
    });
    this.resourceRef = s, this.resource = l.resource(s), this.stateManager.bindResourceRef(s, {
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
    const i = this.snapshotData(e)?.wizard_state;
    return i && typeof i == "object" ? i : {};
  }
  snapshotData(e) {
    return !e?.data || typeof e.data != "object" ? {} : e.data;
  }
  resolveStoredResourceRef(e, t = "") {
    const i = this.normalizeResourceRef(e?.resourceRef || e?.resource_ref);
    return !i || t && i.id !== t ? null : i;
  }
  createFallbackResourceRef(e) {
    const t = String(e || "").trim();
    return {
      kind: this.syncConfig.resource_kind || "agreement_draft",
      id: t
    };
  }
  normalizeResourceRef(e) {
    if (!e || typeof e != "object")
      return null;
    const t = e, i = String(t.kind || "").trim(), s = String(t.id || "").trim();
    if (i === "" || s === "")
      return null;
    const l = t.scope, p = l && typeof l == "object" && !Array.isArray(l) ? Object.entries(l).reduce((y, [_, F]) => {
      const x = String(_ || "").trim();
      return x !== "" && (y[x] = String(F ?? "").trim()), y;
    }, {}) : void 0;
    return {
      kind: i,
      id: s,
      scope: p && Object.keys(p).length > 0 ? p : void 0
    };
  }
  toRuntimeError(e) {
    return new Error(String(e || "sync_failed").trim() || "sync_failed");
  }
}
class Sn {
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
    const i = String(e || "").trim();
    i !== "" && this.broadcastMessage({
      type: "sync_completed",
      tabId: this.getTabId(),
      draftId: i,
      revision: t
    });
  }
  broadcastDraftDisposed(e, t = "") {
    const i = String(e || "").trim();
    i !== "" && this.broadcastMessage({
      type: "draft_disposed",
      tabId: this.getTabId(),
      draftId: i,
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
    const i = () => {
      e.visibilityState === "hidden" && this.options.onVisibilityHidden();
    };
    e.addEventListener("visibilitychange", i), this.cleanupFns.push(() => e.removeEventListener("visibilitychange", i));
    const s = () => {
      this.options.onPageHide();
    };
    t.addEventListener("pagehide", s), this.cleanupFns.push(() => t.removeEventListener("pagehide", s));
    const l = () => {
      this.options.onBeforeUnload();
    };
    t.addEventListener("beforeunload", l), this.cleanupFns.push(() => t.removeEventListener("beforeunload", l));
  }
  getTabId() {
    const e = this.win();
    return e ? (e._wizardTabId || (e._wizardTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`), e._wizardTabId) : "tab_missing_window";
  }
  broadcastMessage(e) {
    this.channel?.postMessage(e);
  }
  handleChannelMessage(e) {
    if (!e || e.tabId === this.getTabId())
      return;
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
}
const Vt = "[esign-send]";
function nt(n) {
  const e = String(n ?? "").trim();
  return e === "" ? null : e;
}
function Tt(n) {
  const e = Number(n);
  return Number.isFinite(e) ? e : null;
}
function vn() {
  return `send_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
function Pe(n = {}) {
  const {
    state: e,
    storageKey: t,
    ownership: i,
    sendAttemptId: s,
    extra: l = {}
  } = n;
  return {
    wizardId: nt(e?.wizardId),
    serverDraftId: nt(e?.serverDraftId),
    serverRevision: Tt(e?.serverRevision),
    currentStep: Tt(e?.currentStep),
    syncPending: e?.syncPending === !0,
    storageKey: nt(t),
    activeTabOwner: typeof i?.isOwner == "boolean" ? i.isOwner : null,
    activeTabClaimTabId: nt(i?.claim?.tabId),
    activeTabClaimedAt: nt(i?.claim?.claimedAt),
    activeTabLastSeenAt: nt(i?.claim?.lastSeenAt),
    activeTabBlockedReason: nt(i?.blockedReason),
    sendAttemptId: nt(s),
    ...l
  };
}
function Ve(n, e = {}) {
  console.info(Vt, n, e);
}
function Ze(n, e = {}) {
  console.warn(Vt, n, e);
}
class bn {
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
      return t ? (this.activeTabController.setActiveDraft(t.id), this.options.statusUpdater(this.stateManager.getState().syncPending ? "pending" : "saved"), { success: !0, draftId: t.id, revision: t.revision }) : { skipped: !0, reason: "no_active_draft" };
    } catch (t) {
      return String(t?.code || "").trim().toUpperCase() === "NOT_FOUND" ? { stale: !0, reason: "not_found" } : { error: !0, reason: String(t?.message || "refresh_failed").trim() || "refresh_failed" };
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
    if (this.isSyncing) return { blocked: !0, reason: "sync_in_progress" };
    const e = this.stateManager.getState();
    if (!e.syncPending)
      return this.options.statusUpdater("saved"), { skipped: !0, reason: "not_pending" };
    this.isSyncing = !0, this.options.statusUpdater("saving"), Ve("sync_perform_start", Pe({
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
    }) : t.conflict ? (this.options.statusUpdater("conflict"), this.options.showConflictDialog(Number(t.currentRevision || e.serverRevision || 0)), Ze("sync_perform_conflict", Pe({
      state: e,
      storageKey: this.options.storageKey,
      sendAttemptId: null,
      extra: {
        targetDraftId: String(e.serverDraftId || "").trim() || null,
        currentRevision: Number(t.currentRevision || 0)
      }
    })), { conflict: !0, currentRevision: t.currentRevision }) : (this.options.statusUpdater("error"), this.scheduleRetry(), { error: !0, reason: t.error || "sync_failed" });
  }
  manualRetry() {
    return this.retryCount = 0, this.retryTimer && (clearTimeout(this.retryTimer), this.retryTimer = null), this.performSync();
  }
  scheduleRetry() {
    if (this.retryCount >= this.options.syncRetryDelays.length)
      return;
    const e = this.options.syncRetryDelays[this.retryCount];
    this.retryCount += 1, this.retryTimer = setTimeout(() => {
      this.performSync();
    }, e);
  }
  bindRefreshEvents() {
    const e = this.options.documentRef || (typeof document > "u" ? null : document), t = this.options.windowRef || (typeof window > "u" ? null : window);
    if (!e || !t)
      return;
    const i = () => {
      e.visibilityState !== "hidden" && this.stateManager.getState().serverDraftId && this.refreshCurrentDraft({ preserveDirty: !0, force: !0 });
    };
    t.addEventListener("focus", i), this.cleanupFns.push(() => t.removeEventListener("focus", i));
    const s = () => {
      e.visibilityState === "visible" && this.stateManager.getState().serverDraftId && this.refreshCurrentDraft({ preserveDirty: !0, force: !0 });
    };
    e.addEventListener("visibilitychange", s), this.cleanupFns.push(() => e.removeEventListener("visibilitychange", s));
  }
}
function wn() {
  return function(e, t = {}) {
    const i = String(e || "").trim();
    if (!i || typeof window > "u") return;
    const s = window.__esignWizardTelemetryCounters = window.__esignWizardTelemetryCounters || {};
    s[i] = Number(s[i] || 0) + 1, window.dispatchEvent(new CustomEvent("esign:wizard-telemetry", {
      detail: {
        event: i,
        count: s[i],
        fields: t,
        at: (/* @__PURE__ */ new Date()).toISOString()
      }
    }));
  };
}
function Ke(n) {
  const e = document.getElementById(n);
  return e instanceof HTMLElement ? e : null;
}
function ft(n, e, t = "") {
  const i = n.querySelector(e);
  return (i instanceof HTMLInputElement || i instanceof HTMLTextAreaElement || i instanceof HTMLSelectElement) && i.value || t;
}
function In(n, e, t = !1) {
  const i = n.querySelector(e);
  return i instanceof HTMLInputElement ? i.checked : t;
}
function xt(n, e) {
  n instanceof HTMLButtonElement && (n.disabled = e);
}
function _n(n) {
  const {
    documentIdInput: e,
    selectedDocumentTitle: t,
    participantsContainer: i,
    fieldDefinitionsContainer: s,
    submitBtn: l,
    escapeHtml: p,
    getSignerParticipants: y,
    getCurrentDocumentPageCount: _,
    collectFieldRulesForState: F,
    expandRulesForPreview: x,
    findSignersMissingRequiredSignatureField: P,
    goToStep: T
  } = n;
  function w() {
    const a = Ke("send-readiness-loading"), h = Ke("send-readiness-results"), u = Ke("send-validation-status"), m = Ke("send-validation-issues"), $ = Ke("send-issues-list"), H = Ke("send-confirmation"), R = Ke("review-agreement-title"), b = Ke("review-document-title"), g = Ke("review-participant-count"), U = Ke("review-stage-count"), J = Ke("review-participants-list"), q = Ke("review-fields-summary"), M = document.getElementById("title");
    if (!a || !h || !u || !m || !$ || !H || !R || !b || !g || !U || !J || !q || !(M instanceof HTMLInputElement))
      return;
    const ie = M.value || "Untitled", G = t?.textContent || "No document", he = i.querySelectorAll(".participant-entry"), Se = s.querySelectorAll(".field-definition-entry"), X = x(F(), _()), de = y(), ee = /* @__PURE__ */ new Set();
    he.forEach((Q) => {
      const N = Q.querySelector(".signing-stage-input"), De = Q.querySelector('select[name*=".role"]');
      De instanceof HTMLSelectElement && De.value === "signer" && N instanceof HTMLInputElement && N.value && ee.add(Number.parseInt(N.value, 10));
    }), R.textContent = ie, b.textContent = G, g.textContent = `${he.length} (${de.length} signers)`, U.textContent = String(ee.size > 0 ? ee.size : 1), J.innerHTML = "", he.forEach((Q) => {
      const N = ft(Q, 'input[name*=".name"]'), De = ft(Q, 'input[name*=".email"]'), _e = ft(Q, 'select[name*=".role"]', "signer"), ce = ft(Q, ".signing-stage-input"), me = In(Q, ".notify-input", !0), Me = document.createElement("div");
      Me.className = "flex items-center justify-between text-sm", Me.innerHTML = `
        <div>
          <span class="font-medium">${p(N || De)}</span>
          <span class="text-gray-500 ml-2">${p(De)}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs ${_e === "signer" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}">
            ${_e === "signer" ? "Signer" : "CC"}
          </span>
          <span class="px-2 py-0.5 rounded text-xs ${me ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}">
            ${me ? "Notify" : "No Notify"}
          </span>
          ${_e === "signer" && ce ? `<span class="text-xs text-gray-500">Stage ${ce}</span>` : ""}
        </div>
      `, J.appendChild(Me);
    });
    const ye = Se.length + X.length;
    q.textContent = `${ye} field${ye !== 1 ? "s" : ""} defined (${Se.length} manual, ${X.length} generated)`;
    const pe = [];
    e?.value || pe.push({ severity: "error", message: "No document selected", action: "Go to Step 1", step: 1 }), de.length === 0 && pe.push({ severity: "error", message: "No signers added", action: "Go to Step 3", step: 3 }), P().forEach((Q) => {
      pe.push({
        severity: "error",
        message: `${Q.name} has no required signature field`,
        action: "Add signature field",
        step: 4
      });
    });
    const Be = Array.from(ee).sort((Q, N) => Q - N);
    for (let Q = 0; Q < Be.length; Q++)
      if (Be[Q] !== Q + 1) {
        pe.push({
          severity: "warning",
          message: "Signing stages should be sequential starting from 1",
          action: "Review stages",
          step: 3
        });
        break;
      }
    const xe = pe.some((Q) => Q.severity === "error"), Ae = pe.some((Q) => Q.severity === "warning");
    xe ? (u.className = "p-4 rounded-lg bg-red-50 border border-red-200", u.innerHTML = `
        <div class="flex items-center gap-2 text-red-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">Cannot send - issues must be resolved</span>
        </div>
      `, H.classList.add("hidden"), xt(l, !0)) : Ae ? (u.className = "p-4 rounded-lg bg-amber-50 border border-amber-200", u.innerHTML = `
        <div class="flex items-center gap-2 text-amber-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span class="font-medium">Ready with warnings - review before sending</span>
        </div>
      `, H.classList.remove("hidden"), xt(l, !1)) : (u.className = "p-4 rounded-lg bg-green-50 border border-green-200", u.innerHTML = `
        <div class="flex items-center gap-2 text-green-800">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span class="font-medium">All checks passed - ready to send</span>
        </div>
      `, H.classList.remove("hidden"), xt(l, !1)), pe.length > 0 ? (m.classList.remove("hidden"), $.innerHTML = "", pe.forEach((Q) => {
      const N = document.createElement("li");
      N.className = `p-3 rounded-lg flex items-center justify-between ${Q.severity === "error" ? "bg-red-50" : "bg-amber-50"}`, N.innerHTML = `
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4 ${Q.severity === "error" ? "text-red-500" : "text-amber-500"}" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${Q.severity === "error" ? "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"}"/>
            </svg>
            <span class="text-sm">${p(Q.message)}</span>
          </div>
          <button type="button" class="text-xs text-blue-600 hover:text-blue-800" data-go-to-step="${Q.step}">
            ${p(Q.action)}
          </button>
        `, $.appendChild(N);
    }), $.querySelectorAll("[data-go-to-step]").forEach((Q) => {
      Q.addEventListener("click", () => {
        const N = Number(Q.getAttribute("data-go-to-step"));
        Number.isFinite(N) && T(N);
      });
    })) : m.classList.add("hidden"), a.classList.add("hidden"), h.classList.remove("hidden");
  }
  return {
    initSendReadinessCheck: w
  };
}
function kt(n, e = 0) {
  const t = Number.parseInt(String(n || "").trim(), 10);
  return Number.isFinite(t) ? t : e;
}
function En(n) {
  const {
    totalWizardSteps: e,
    wizardStep: t,
    nextStepLabels: i,
    submitBtn: s,
    previewCard: l,
    updateCoordinationUI: p,
    validateStep: y,
    onPlacementStep: _,
    onReviewStep: F,
    onStepChanged: x,
    initialStep: P = 1
  } = n;
  let T = P;
  const w = Array.from(document.querySelectorAll(".wizard-step-btn")), a = Array.from(document.querySelectorAll(".wizard-step")), h = Array.from(document.querySelectorAll(".wizard-connector")), u = document.getElementById("wizard-prev-btn"), m = document.getElementById("wizard-next-btn"), $ = document.getElementById("wizard-save-btn");
  function H() {
    if (w.forEach((g, U) => {
      const J = U + 1, q = g.querySelector(".wizard-step-number");
      q instanceof HTMLElement && (J < T ? (g.classList.remove("text-gray-500", "text-blue-600"), g.classList.add("text-green-600"), q.classList.remove("bg-gray-300", "text-gray-600", "bg-blue-600", "text-white"), q.classList.add("bg-green-600", "text-white"), g.removeAttribute("aria-current")) : J === T ? (g.classList.remove("text-gray-500", "text-green-600"), g.classList.add("text-blue-600"), q.classList.remove("bg-gray-300", "text-gray-600", "bg-green-600"), q.classList.add("bg-blue-600", "text-white"), g.setAttribute("aria-current", "step")) : (g.classList.remove("text-blue-600", "text-green-600"), g.classList.add("text-gray-500"), q.classList.remove("bg-blue-600", "text-white", "bg-green-600"), q.classList.add("bg-gray-300", "text-gray-600"), g.removeAttribute("aria-current")));
    }), h.forEach((g, U) => {
      U < T - 1 ? (g.classList.remove("bg-gray-300"), g.classList.add("bg-green-600")) : (g.classList.remove("bg-green-600"), g.classList.add("bg-gray-300"));
    }), a.forEach((g) => {
      kt(g.dataset.step) === T ? g.classList.remove("hidden") : g.classList.add("hidden");
    }), u?.classList.toggle("hidden", T === 1), m?.classList.toggle("hidden", T === e), $?.classList.toggle("hidden", T !== e), s.classList.toggle("hidden", T !== e), p(), T < e) {
      const g = i[T] || "Next";
      m && (m.innerHTML = `
        ${g}
        <svg class="w-4 h-4 ml-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      `);
    }
    T === t.PLACEMENT ? _?.() : T === t.REVIEW && F?.(), l.updateVisibility(T);
  }
  function R(g) {
    if (!(g < t.DOCUMENT || g > e)) {
      if (g > T) {
        for (let U = T; U < g; U++)
          if (!y(U)) return;
      }
      T = g, H(), x?.(g), document.querySelector(".wizard-step:not(.hidden)")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }
  function b() {
    w.forEach((g) => {
      g.addEventListener("click", () => {
        const U = kt(g.dataset.step);
        R(U);
      });
    }), u?.addEventListener("click", () => R(T - 1)), m?.addEventListener("click", () => R(T + 1)), $?.addEventListener("click", () => {
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
    bindEvents: b,
    getCurrentStep() {
      return T;
    },
    setCurrentStep(g) {
      T = g;
    },
    goToStep: R,
    updateWizardUI: H
  };
}
function Ft(n) {
  return n.querySelector('select[name*=".role"]');
}
function xn(n) {
  return n.querySelector(".field-participant-select");
}
function yt(n) {
  return typeof n == "object" && n !== null;
}
function Ln(n, e, t = {}) {
  const i = new Error(e);
  return i.code = String(n).trim(), Number(t.status || 0) > 0 && (i.status = Number(t.status || 0)), Number(t.currentRevision || 0) > 0 && (i.currentRevision = Number(t.currentRevision || 0)), Number(t.conflict?.currentRevision || 0) > 0 && (i.conflict = {
    currentRevision: Number(t.conflict?.currentRevision || 0)
  }), i;
}
function Rn(n, e = 0) {
  if (!yt(n))
    return Number(e || 0);
  const t = n, i = Number(t.currentRevision || 0);
  if (i > 0)
    return i;
  const s = Number(t.conflict?.currentRevision || 0);
  return s > 0 ? s : Number(e || 0);
}
function Cn(n) {
  const {
    config: e,
    form: t,
    submitBtn: i,
    documentIdInput: s,
    documentSearch: l,
    participantsContainer: p,
    addParticipantBtn: y,
    fieldDefinitionsContainer: _,
    fieldRulesContainer: F,
    documentPageCountInput: x,
    fieldPlacementsJSONInput: P,
    fieldRulesJSONInput: T,
    storageKey: w,
    syncService: a,
    syncOrchestrator: h,
    stateManager: u,
    submitMode: m,
    totalWizardSteps: $,
    wizardStep: H,
    getCurrentStep: R,
    getPlacementState: b,
    getCurrentDocumentPageCount: g,
    ensureSelectedDocumentCompatibility: U,
    collectFieldRulesForState: J,
    collectFieldRulesForForm: q,
    expandRulesForPreview: M,
    findSignersMissingRequiredSignatureField: ie,
    missingSignatureFieldMessage: G,
    getSignerParticipants: he,
    getReviewConfigForState: Se,
    isStartReviewEnabled: X,
    setPrimaryActionLabel: de,
    buildCanonicalAgreementPayload: ee,
    announceError: ye,
    emitWizardTelemetry: pe,
    parseAPIError: Ee,
    goToStep: Be,
    showSyncConflictDialog: xe,
    surfaceSyncOutcome: Ae,
    updateSyncStatus: Q,
    activeTabOwnershipRequiredCode: N = "ACTIVE_TAB_OWNERSHIP_REQUIRED",
    getActiveTabDebugState: De,
    addFieldBtn: _e
  } = n;
  let ce = null;
  function me() {
    return De?.() || {};
  }
  function Me(ue, f = !1) {
    i.setAttribute("aria-busy", f ? "true" : "false"), i.innerHTML = f ? `
          <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          ${ue}
        ` : `
          <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
          ${ue}
        `;
  }
  async function We() {
    Ve("persist_latest_wizard_state_start", Pe({
      state: u.getState(),
      storageKey: w,
      ownership: me(),
      sendAttemptId: ce
    })), u.updateState(u.collectFormState());
    const ue = await h.forceSync();
    if (ue?.blocked && ue.reason === "passive_tab")
      throw Ze("persist_latest_wizard_state_blocked", Pe({
        state: u.getState(),
        storageKey: w,
        ownership: me(),
        sendAttemptId: ce,
        extra: {
          reason: ue.reason
        }
      })), {
        code: N,
        message: "This agreement is active in another tab. Take control in this tab before saving or sending."
      };
    const f = u.getState();
    if (f?.syncPending)
      throw Ze("persist_latest_wizard_state_unsynced", Pe({
        state: f,
        storageKey: w,
        ownership: me(),
        sendAttemptId: ce
      })), new Error("Unable to sync latest draft changes");
    return Ve("persist_latest_wizard_state_complete", Pe({
      state: f,
      storageKey: w,
      ownership: me(),
      sendAttemptId: ce
    })), f;
  }
  async function qe() {
    Ve("ensure_draft_ready_for_send_start", Pe({
      state: u.getState(),
      storageKey: w,
      ownership: me(),
      sendAttemptId: ce
    }));
    const ue = await We(), f = String(ue?.serverDraftId || "").trim();
    if (!f) {
      Ze("ensure_draft_ready_for_send_missing_draft", Pe({
        state: ue,
        storageKey: w,
        ownership: me(),
        sendAttemptId: ce,
        extra: {
          action: "create_draft"
        }
      }));
      const d = await a.create(ue), I = String(d.id || "").trim(), A = Number(d.revision || 0);
      return I && A > 0 && u.markSynced(I, A), Ve("ensure_draft_ready_for_send_created", Pe({
        state: u.getState(),
        storageKey: w,
        ownership: me(),
        sendAttemptId: ce,
        extra: {
          loadedDraftId: I,
          loadedRevision: A
        }
      })), {
        draftID: I,
        revision: A
      };
    }
    try {
      Ve("ensure_draft_ready_for_send_loading", Pe({
        state: ue,
        storageKey: w,
        ownership: me(),
        sendAttemptId: ce,
        extra: {
          targetDraftId: f
        }
      }));
      const d = await a.load(f), I = String(d?.id || f).trim(), A = Number(d?.revision || ue?.serverRevision || 0);
      return I && A > 0 && u.markSynced(I, A), Ve("ensure_draft_ready_for_send_loaded", Pe({
        state: u.getState(),
        storageKey: w,
        ownership: me(),
        sendAttemptId: ce,
        extra: {
          loadedDraftId: I,
          loadedRevision: A
        }
      })), {
        draftID: I,
        revision: A > 0 ? A : Number(ue?.serverRevision || 0)
      };
    } catch (d) {
      throw Number(yt(d) && d.status || 0) !== 404 ? (Ze("ensure_draft_ready_for_send_load_failed", Pe({
        state: ue,
        storageKey: w,
        ownership: me(),
        sendAttemptId: ce,
        extra: {
          targetDraftId: f,
          status: Number(yt(d) && d.status || 0)
        }
      })), d) : (Ze("ensure_draft_ready_for_send_missing_remote_draft", Pe({
        state: ue,
        storageKey: w,
        ownership: me(),
        sendAttemptId: ce,
        extra: {
          targetDraftId: f,
          status: 404
        }
      })), pe("wizard_send_not_found", {
        draft_id: f,
        status: 404,
        phase: "pre_send"
      }), await ze().catch(() => {
      }), Ln(
        "DRAFT_SEND_NOT_FOUND",
        "Draft not found",
        { status: 404 }
      ));
    }
  }
  async function ze() {
    const ue = u.getState();
    u.setState({
      ...ue,
      resourceRef: null,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null,
      syncPending: !0
    }, { syncPending: !0 }), await h.forceSync();
  }
  function je() {
    t.addEventListener("submit", function(ue) {
      if (ee(), !s.value) {
        ue.preventDefault(), ye("Please select a document"), l.focus();
        return;
      }
      if (!U()) {
        ue.preventDefault();
        return;
      }
      const f = p.querySelectorAll(".participant-entry");
      if (f.length === 0) {
        ue.preventDefault(), ye("Please add at least one participant"), y.focus();
        return;
      }
      let d = !1;
      if (f.forEach((z) => {
        Ft(z)?.value === "signer" && (d = !0);
      }), !d) {
        ue.preventDefault(), ye("At least one signer is required");
        const z = f[0] ? Ft(f[0]) : null;
        z && z.focus();
        return;
      }
      const I = _.querySelectorAll(".field-definition-entry"), A = ie();
      if (A.length > 0) {
        ue.preventDefault(), ye(G(A)), Be(H.FIELDS), _e.focus();
        return;
      }
      let W = !1;
      if (I.forEach((z) => {
        xn(z)?.value || (W = !0);
      }), W) {
        ue.preventDefault(), ye("Please assign all fields to a signer");
        const z = _.querySelector('.field-participant-select:invalid, .field-participant-select[value=""]');
        z && z.focus();
        return;
      }
      if (J().some((z) => !z.participantId)) {
        ue.preventDefault(), ye("Please assign all automation rules to a signer"), Array.from(F?.querySelectorAll(".field-rule-participant-select") || []).find((oe) => !oe.value)?.focus();
        return;
      }
      const se = !!t.querySelector('input[name="save_as_draft"]'), ne = typeof X == "function" ? X() : !1, K = () => {
        const z = ne ? "Start Review" : "Send for Signature";
        if (typeof de == "function") {
          de(z);
          return;
        }
        Me(z, !1);
      }, j = R() === $ && !se && ne, le = R() === $ && !se && !j;
      if (le) {
        let z = t.querySelector('input[name="send_for_signature"]');
        z || (z = document.createElement("input"), z.type = "hidden", z.name = "send_for_signature", t.appendChild(z)), z.value = "1";
      } else
        t.querySelector('input[name="send_for_signature"]')?.remove();
      if (m === "json") {
        ue.preventDefault(), i.disabled = !0, Me(le ? "Sending..." : j ? "Starting Review..." : "Saving...", !0), (async () => {
          try {
            ee();
            const z = String(e.routes?.index || "").trim();
            if (!le && !j) {
              if (await We(), z) {
                window.location.href = z;
                return;
              }
              window.location.reload();
              return;
            }
            if (j) {
              const L = Se();
              if (!L.enabled)
                throw new Error("Review mode is not enabled.");
              if ((L.participants || []).length === 0)
                throw new Error("Add at least one reviewer before starting review.");
            }
            ce = vn(), Ve("send_submit_start", Pe({
              state: u.getState(),
              storageKey: w,
              ownership: me(),
              sendAttemptId: ce
            }));
            const oe = await qe(), ae = String(oe?.draftID || "").trim(), r = Number(oe?.revision || 0);
            if (!ae || r <= 0)
              throw new Error("Draft session not available. Please try again.");
            Ve("send_request_start", Pe({
              state: u.getState(),
              storageKey: w,
              ownership: me(),
              sendAttemptId: ce,
              extra: {
                targetDraftId: ae,
                expectedRevision: r,
                operation: j ? "start_review" : "send"
              }
            }));
            const o = j ? await a.startReview(r, ce || ae) : await a.send(r, ce || ae), c = String(
              o?.agreement_id || o?.id || o?.data?.agreement_id || o?.data?.id || ""
            ).trim();
            if (Ve("send_request_success", Pe({
              state: u.getState(),
              storageKey: w,
              ownership: me(),
              sendAttemptId: ce,
              extra: {
                targetDraftId: ae,
                expectedRevision: r,
                agreementId: c,
                operation: j ? "start_review" : "send"
              }
            })), u.clear(), h.broadcastStateUpdate(), h.broadcastDraftDisposed?.(ae, "send_completed"), ce = null, c && z) {
              window.location.href = `${z}/${encodeURIComponent(c)}`;
              return;
            }
            if (z) {
              window.location.href = z;
              return;
            }
            window.location.reload();
          } catch (z) {
            const oe = yt(z) ? z : {}, ae = String(oe.message || "Failed to process agreement").trim();
            let r = String(oe.code || "").trim();
            const o = Number(oe.status || 0);
            if (r.toUpperCase() === "STALE_REVISION") {
              const c = Rn(z, Number(u.getState()?.serverRevision || 0));
              Q?.("conflict"), xe?.(c), pe("wizard_send_conflict", {
                draft_id: String(u.getState()?.serverDraftId || "").trim(),
                current_revision: c,
                status: o || 409
              }), i.disabled = !1, K(), ce = null;
              return;
            }
            r.toUpperCase() === "NOT_FOUND" && (r = "DRAFT_SEND_NOT_FOUND", pe("wizard_send_not_found", {
              draft_id: String(u.getState()?.serverDraftId || "").trim(),
              status: o || 404
            }), await ze().catch(() => {
            })), Ze("send_request_failed", Pe({
              state: u.getState(),
              storageKey: w,
              ownership: me(),
              sendAttemptId: ce,
              extra: {
                code: r || null,
                status: o,
                message: ae
              }
            })), ye(ae, r, o), i.disabled = !1, K(), ce = null;
          }
        })();
        return;
      }
      i.disabled = !0, Me(le ? "Sending..." : j ? "Starting Review..." : "Saving...", !0);
    });
  }
  return {
    bindEvents: je,
    ensureDraftReadyForSend: qe,
    persistLatestWizardState: We,
    resyncAfterSendNotFound: ze
  };
}
const Mt = 150, Nt = 32;
function Ie(n) {
  return n == null ? "" : String(n).trim();
}
function Kt(n) {
  if (typeof n == "boolean") return n;
  const e = Ie(n).toLowerCase();
  return e === "" ? !1 : e === "1" || e === "true" || e === "on" || e === "yes";
}
function An(n) {
  return Ie(n).toLowerCase();
}
function ke(n, e = 0) {
  if (typeof n == "number")
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : e;
  const t = Number.parseInt(Ie(n), 10);
  return !Number.isFinite(t) || t <= 0 ? e : t;
}
function gt(n, e = 0) {
  if (typeof n == "number")
    return Number.isFinite(n) ? n : e;
  const t = Number.parseFloat(Ie(n));
  return Number.isFinite(t) ? t : e;
}
function St(n, e, t) {
  return !Number.isFinite(n) || n < e ? e : n > t ? t : n;
}
function ut(n, e) {
  const t = ke(n, 0);
  return t <= 0 ? 0 : e > 0 && t > e ? e : t;
}
function dt(n, e, t = 1) {
  const i = ke(t, 1), s = ke(n, i);
  return e > 0 ? St(s, 1, e) : s > 0 ? s : i;
}
function Dn(n, e, t) {
  const i = ke(t, 1);
  let s = ut(n, i), l = ut(e, i);
  return s <= 0 && (s = 1), l <= 0 && (l = i), l < s ? { start: l, end: s } : { start: s, end: l };
}
function wt(n) {
  if (n == null) return [];
  const e = Array.isArray(n) ? n.map((i) => Ie(i)) : Ie(n).split(","), t = /* @__PURE__ */ new Set();
  return e.forEach((i) => {
    const s = ke(i, 0);
    s > 0 && t.add(s);
  }), Array.from(t).sort((i, s) => i - s);
}
function vt(n, e) {
  const t = ke(e, 1), i = Ie(n.participantId ?? n.participant_id), s = wt(n.excludePages ?? n.exclude_pages), l = n.required, p = typeof l == "boolean" ? l : !["0", "false", "off", "no"].includes(Ie(l).toLowerCase());
  return {
    id: Ie(n.id),
    type: An(n.type),
    participantId: i,
    participantTempId: Ie(n.participantTempId) || i,
    fromPage: ut(n.fromPage ?? n.from_page, t),
    toPage: ut(n.toPage ?? n.to_page, t),
    page: ut(n.page, t),
    excludeLastPage: Kt(n.excludeLastPage ?? n.exclude_last_page),
    excludePages: s,
    required: p
  };
}
function Pn(n, e) {
  const t = Ie(n?.id);
  return t !== "" ? t : `rule-${e + 1}`;
}
function Tn(n, e) {
  const t = ke(e, 1), i = [];
  return n.forEach((s, l) => {
    const p = vt(s || {}, t);
    if (p.type === "") return;
    const y = Pn(p, l);
    if (p.type === "initials_each_page") {
      const _ = Dn(p.fromPage, p.toPage, t), F = /* @__PURE__ */ new Set();
      wt(p.excludePages).forEach((x) => {
        x <= t && F.add(x);
      }), p.excludeLastPage && F.add(t);
      for (let x = _.start; x <= _.end; x += 1)
        F.has(x) || i.push({
          id: `${y}-initials-${x}`,
          type: "initials",
          page: x,
          participantId: Ie(p.participantId),
          required: p.required !== !1,
          ruleId: y
          // Track rule ID for link group creation.
        });
      return;
    }
    if (p.type === "signature_once") {
      let _ = p.page > 0 ? p.page : p.toPage > 0 ? p.toPage : t;
      _ <= 0 && (_ = 1), i.push({
        id: `${y}-signature-${_}`,
        type: "signature",
        page: _,
        participantId: Ie(p.participantId),
        required: p.required !== !1,
        ruleId: y
        // Track rule ID for link group creation.
      });
    }
  }), i.sort((s, l) => s.page !== l.page ? s.page - l.page : s.id.localeCompare(l.id)), i;
}
function kn(n, e, t, i, s) {
  const l = ke(t, 1);
  let p = n > 0 ? n : 1, y = e > 0 ? e : l;
  p = St(p, 1, l), y = St(y, 1, l), y < p && ([p, y] = [y, p]);
  const _ = /* @__PURE__ */ new Set();
  s.forEach((x) => {
    const P = ke(x, 0);
    P > 0 && _.add(St(P, 1, l));
  }), i && _.add(l);
  const F = [];
  for (let x = p; x <= y; x += 1)
    _.has(x) || F.push(x);
  return {
    pages: F,
    rangeStart: p,
    rangeEnd: y,
    excludedPages: Array.from(_).sort((x, P) => x - P),
    isEmpty: F.length === 0
  };
}
function Fn(n) {
  if (n.isEmpty)
    return "(no pages - all excluded)";
  const { pages: e } = n;
  if (e.length <= 5)
    return `pages ${e.join(", ")}`;
  const t = [];
  let i = 0;
  for (let s = 1; s <= e.length; s += 1)
    if (s === e.length || e[s] !== e[s - 1] + 1) {
      const l = e[i], p = e[s - 1];
      l === p ? t.push(String(l)) : p === l + 1 ? t.push(`${l}, ${p}`) : t.push(`${l}-${p}`), i = s;
    }
  return `pages ${t.join(", ")}`;
}
function Lt(n) {
  const e = n || {};
  return {
    id: Ie(e.id),
    title: Ie(e.title || e.name) || "Untitled",
    pageCount: ke(e.page_count ?? e.pageCount, 0),
    compatibilityTier: Ie(e.pdf_compatibility_tier ?? e.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: Ie(e.pdf_compatibility_reason ?? e.pdfCompatibilityReason).toLowerCase()
  };
}
function Yt(n) {
  const e = Ie(n).toLowerCase();
  if (e === "") return Ge.MANUAL;
  switch (e) {
    case Ge.AUTO:
    case Ge.MANUAL:
    case Ge.AUTO_LINKED:
    case Ge.AUTO_FALLBACK:
      return e;
    default:
      return e;
  }
}
function pt(n, e = 0) {
  const t = n || {}, i = Ie(t.id) || `fi_init_${e}`, s = Ie(t.definitionId || t.definition_id || t.field_definition_id) || i, l = ke(t.page ?? t.page_number, 1), p = gt(t.x ?? t.pos_x, 0), y = gt(t.y ?? t.pos_y, 0), _ = gt(t.width, Mt), F = gt(t.height, Nt);
  return {
    id: i,
    definitionId: s,
    type: Ie(t.type) || "text",
    participantId: Ie(t.participantId || t.participant_id),
    participantName: Ie(t.participantName || t.participant_name) || "Unassigned",
    page: l > 0 ? l : 1,
    x: p >= 0 ? p : 0,
    y: y >= 0 ? y : 0,
    width: _ > 0 ? _ : Mt,
    height: F > 0 ? F : Nt,
    placementSource: Yt(t.placementSource || t.placement_source),
    linkGroupId: Ie(t.linkGroupId || t.link_group_id),
    linkedFromFieldId: Ie(t.linkedFromFieldId || t.linked_from_field_id),
    isUnlinked: Kt(t.isUnlinked ?? t.is_unlinked)
  };
}
function Mn(n, e = 0) {
  const t = pt(n, e);
  return {
    id: t.id,
    definition_id: t.definitionId,
    page: t.page,
    x: Math.round(t.x),
    y: Math.round(t.y),
    width: Math.round(t.width),
    height: Math.round(t.height),
    placement_source: Yt(t.placementSource),
    link_group_id: Ie(t.linkGroupId),
    linked_from_field_id: Ie(t.linkedFromFieldId),
    is_unlinked: !!t.isUnlinked
  };
}
function Re(n) {
  const e = document.getElementById(n);
  return e instanceof HTMLElement ? e : null;
}
function it(n) {
  return typeof n == "object" && n !== null;
}
function Nn(n) {
  const {
    apiBase: e,
    apiVersionBase: t,
    documentsUploadURL: i,
    isEditMode: s,
    titleSource: l,
    normalizeTitleSource: p,
    stateManager: y,
    previewCard: _,
    parseAPIError: F,
    announceError: x,
    showToast: P,
    mapUserFacingError: T,
    renderFieldRulePreview: w
  } = n, a = Re("document_id"), h = Re("selected-document"), u = Re("document-picker"), m = Re("document-search"), $ = Re("document-list"), H = Re("change-document-btn"), R = Re("selected-document-title"), b = Re("selected-document-info"), g = Re("document_page_count"), U = Re("document-remediation-panel"), J = Re("document-remediation-message"), q = Re("document-remediation-status"), M = Re("document-remediation-trigger-btn"), ie = Re("document-remediation-dismiss-btn"), G = Re("title"), he = 300, Se = 5, X = 10, de = Re("document-typeahead"), ee = Re("document-typeahead-dropdown"), ye = Re("document-recent-section"), pe = Re("document-recent-list"), Ee = Re("document-search-section"), Be = Re("document-search-list"), xe = Re("document-empty-state"), Ae = Re("document-dropdown-loading"), Q = Re("document-search-loading"), N = {
    isOpen: !1,
    query: "",
    recentDocuments: [],
    searchResults: [],
    selectedIndex: -1,
    isLoading: !1,
    isSearchMode: !1
  };
  let De = [], _e = null, ce = 0, me = null;
  const Me = /* @__PURE__ */ new Set(), We = /* @__PURE__ */ new Map();
  function qe(S) {
    return String(S || "").trim().toLowerCase();
  }
  function ze(S) {
    return String(S || "").trim().toLowerCase();
  }
  function je(S) {
    return qe(S) === "unsupported";
  }
  function ue() {
    !s && G && G.value.trim() !== "" && !y.hasResumableState() && y.setTitleSource(l.SERVER_SEED, { syncPending: !1 });
  }
  function f(S) {
    const v = ke(S, 0);
    g && (g.value = String(v));
  }
  function d() {
    const S = ke(g?.value || "0", 0);
    if (S > 0) return S;
    const v = String(b?.textContent || "").match(/(\d+)\s+pages?/i);
    if (v) {
      const E = ke(v[1], 0);
      if (E > 0) return E;
    }
    return 1;
  }
  function I() {
    a && (a.value = ""), R && (R.textContent = ""), b && (b.textContent = ""), f(0), y.updateDocument({
      id: null,
      title: null,
      pageCount: null
    }), _.setDocument(null, null, null);
  }
  function A(S = "") {
    const v = "This document cannot be used because its PDF is incompatible with online signing.", E = ze(S);
    return E ? `${v} Reason: ${E}. Select another document or upload a remediated PDF.` : `${v} Select another document or upload a remediated PDF.`;
  }
  function W() {
    _e = null, q && (q.textContent = "", q.className = "mt-2 text-xs text-amber-800"), U && U.classList.add("hidden"), M && (M.disabled = !1, M.textContent = "Remediate PDF");
  }
  function te(S, v = "info") {
    if (!q) return;
    const E = String(S || "").trim();
    q.textContent = E;
    const B = v === "error" ? "text-red-700" : v === "success" ? "text-green-700" : "text-amber-800";
    q.className = `mt-2 text-xs ${B}`;
  }
  function fe(S, v = "") {
    !S || !U || !J || (_e = {
      id: String(S.id || "").trim(),
      title: String(S.title || "").trim(),
      pageCount: ke(S.pageCount, 0),
      compatibilityReason: ze(v || S.compatibilityReason || "")
    }, _e.id && (J.textContent = A(_e.compatibilityReason), te("Run remediation to make this document signable."), U.classList.remove("hidden")));
  }
  function se(S) {
    const v = G;
    if (!v) return;
    const E = y.getState(), B = v.value.trim(), O = p(
      E?.titleSource,
      B === "" ? l.AUTOFILL : l.USER
    );
    if (B && O === l.USER)
      return;
    const Y = String(S || "").trim();
    Y && (v.value = Y, y.updateDetails({
      title: Y,
      message: y.getState().details.message || ""
    }, { titleSource: l.AUTOFILL }));
  }
  function ne(S, v, E) {
    if (!a || !R || !b || !h || !u)
      return;
    a.value = String(S || ""), R.textContent = v || "", b.textContent = `${E} pages`, f(E), h.classList.remove("hidden"), u.classList.add("hidden"), w(), se(v);
    const B = ke(E, 0);
    y.updateDocument({
      id: S,
      title: v,
      pageCount: B
    }), _.setDocument(S, v, B), W();
  }
  function K(S) {
    const v = String(S || "").trim();
    if (v === "") return null;
    const E = De.find((Y) => String(Y.id || "").trim() === v);
    if (E) return E;
    const B = N.recentDocuments.find((Y) => String(Y.id || "").trim() === v);
    if (B) return B;
    const O = N.searchResults.find((Y) => String(Y.id || "").trim() === v);
    return O || null;
  }
  function j() {
    const S = K(a?.value || "");
    if (!S) return !0;
    const v = qe(S.compatibilityTier);
    return je(v) ? (fe(S, S.compatibilityReason || ""), I(), x(A(S.compatibilityReason || "")), h && h.classList.add("hidden"), u && u.classList.remove("hidden"), m?.focus(), !1) : (W(), !0);
  }
  function le() {
    if (!R || !b || !h || !u)
      return;
    const S = (a?.value || "").trim();
    if (!S) return;
    const v = De.find((E) => String(E.id || "").trim() === S);
    v && (R.textContent.trim() || (R.textContent = v.title || "Untitled"), (!b.textContent.trim() || b.textContent.trim() === "pages") && (b.textContent = `${v.pageCount || 0} pages`), f(v.pageCount || 0), h.classList.remove("hidden"), u.classList.add("hidden"));
  }
  async function z() {
    try {
      const S = new URLSearchParams({
        per_page: "100",
        sort: "created_at",
        sort_desc: "true"
      }), v = await fetch(`${e}/panels/esign_documents?${S.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!v.ok)
        throw await F(v, "Failed to load documents");
      const E = await v.json();
      De = (Array.isArray(E?.records) ? E.records : Array.isArray(E?.items) ? E.items : []).slice().sort((Y, ve) => {
        const Fe = Date.parse(String(Y?.created_at ?? Y?.createdAt ?? Y?.updated_at ?? Y?.updatedAt ?? "")), D = Date.parse(String(ve?.created_at ?? ve?.createdAt ?? ve?.updated_at ?? ve?.updatedAt ?? "")), re = Number.isFinite(Fe) ? Fe : 0;
        return (Number.isFinite(D) ? D : 0) - re;
      }).map((Y) => Lt(Y)).filter((Y) => Y.id !== ""), oe(De), le();
    } catch (S) {
      const v = it(S) ? String(S.message || "Failed to load documents") : "Failed to load documents", E = it(S) ? String(S.code || "") : "", B = it(S) ? Number(S.status || 0) : 0, O = T(v, E, B);
      $ && ($.innerHTML = `<div class="p-4 text-center text-red-500 text-sm">${Ue(O)}</div>`);
    }
  }
  function oe(S) {
    if (!$) return;
    if (S.length === 0) {
      $.innerHTML = `
        <div class="p-4 text-center text-gray-500 text-sm">
          No documents found.
          <a href="${Ue(i)}" class="text-blue-600 hover:underline">Upload one</a>
        </div>
      `;
      return;
    }
    $.innerHTML = S.map((E, B) => {
      const O = Ue(String(E.id || "").trim()), Y = Ue(String(E.title || "").trim()), ve = String(ke(E.pageCount, 0)), Fe = qe(E.compatibilityTier), D = ze(E.compatibilityReason), re = Ue(Fe), we = Ue(D), Qe = je(Fe) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button" class="document-option w-full p-3 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                role="option"
                aria-selected="false"
                tabindex="${B === 0 ? "0" : "-1"}"
                data-document-id="${O}"
                data-document-title="${Y}"
                data-document-pages="${ve}"
                data-document-compatibility-tier="${re}"
                data-document-compatibility-reason="${we}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate">${Y}</div>
            <div class="text-xs text-gray-500">${ve} pages ${Qe}</div>
          </div>
        </button>
      `;
    }).join("");
    const v = Array.from($.querySelectorAll(".document-option"));
    v.forEach((E, B) => {
      E.addEventListener("click", () => ae(E)), E.addEventListener("keydown", (O) => {
        let Y = B;
        if (O.key === "ArrowDown")
          O.preventDefault(), Y = Math.min(B + 1, v.length - 1);
        else if (O.key === "ArrowUp")
          O.preventDefault(), Y = Math.max(B - 1, 0);
        else if (O.key === "Enter" || O.key === " ") {
          O.preventDefault(), ae(E);
          return;
        } else O.key === "Home" ? (O.preventDefault(), Y = 0) : O.key === "End" && (O.preventDefault(), Y = v.length - 1);
        Y !== B && (v[Y].focus(), v[Y].setAttribute("tabindex", "0"), E.setAttribute("tabindex", "-1"));
      });
    });
  }
  function ae(S) {
    const v = S.getAttribute("data-document-id"), E = S.getAttribute("data-document-title"), B = S.getAttribute("data-document-pages"), O = qe(S.getAttribute("data-document-compatibility-tier")), Y = ze(S.getAttribute("data-document-compatibility-reason"));
    if (je(O)) {
      fe({ id: String(v || ""), title: String(E || ""), pageCount: ke(B, 0), compatibilityReason: Y }), I(), x(A(Y)), m?.focus();
      return;
    }
    ne(v, E, B);
  }
  async function r(S, v, E) {
    const B = String(S || "").trim();
    if (!B) return;
    const O = Date.now(), Y = 12e4, ve = 1250;
    for (; Date.now() - O < Y; ) {
      const Fe = await fetch(B, {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!Fe.ok)
        throw await F(Fe, "Failed to read remediation status");
      const re = (await Fe.json())?.dispatch || {}, we = String(re?.status || "").trim().toLowerCase();
      if (we === "succeeded") {
        te("Remediation completed. Refreshing document compatibility...", "success");
        return;
      }
      if (we === "failed" || we === "canceled" || we === "dead_letter") {
        const Qe = String(re?.terminal_reason || "").trim();
        throw { message: Qe ? `Remediation failed: ${Qe}` : "Remediation did not complete. Please upload a new document or try again.", code: "REMEDIATION_FAILED", status: 422 };
      }
      te(we === "retrying" ? "Remediation is retrying in the queue..." : we === "running" ? "Remediation is running..." : "Remediation accepted and waiting for worker..."), await new Promise((Qe) => setTimeout(Qe, ve));
    }
    throw {
      message: `Timed out waiting for remediation dispatch ${v} (${E})`,
      code: "REMEDIATION_TIMEOUT",
      status: 504
    };
  }
  async function o() {
    const S = _e;
    if (!S || !S.id) return;
    const v = String(S.id || "").trim();
    if (!(!v || Me.has(v))) {
      Me.add(v), M && (M.disabled = !0, M.textContent = "Remediating...");
      try {
        let E = We.get(v) || "";
        E || (E = `esign-remediate-${v}-${Date.now()}`, We.set(v, E));
        const B = `${t}/esign/documents/${encodeURIComponent(v)}/remediate`, O = await fetch(B, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Idempotency-Key": E
          }
        });
        if (!O.ok)
          throw await F(O, "Failed to trigger remediation");
        const Y = await O.json(), ve = Y?.receipt || {}, Fe = String(ve?.dispatch_id || Y?.dispatch_id || "").trim(), D = String(ve?.mode || Y?.mode || "").trim().toLowerCase();
        let re = String(Y?.dispatch_status_url || "").trim();
        !re && Fe && (re = `${t}/esign/dispatches/${encodeURIComponent(Fe)}`), D === "queued" && Fe && re && (te("Remediation queued. Monitoring progress..."), await r(re, Fe, v)), await z();
        const we = K(v);
        if (!we || je(we.compatibilityTier)) {
          te("Remediation finished, but this PDF is still incompatible.", "error"), x("Document remains incompatible after remediation. Upload another PDF.");
          return;
        }
        ne(we.id, we.title, we.pageCount), window.toastManager ? window.toastManager.success("Document remediated successfully. You can continue.") : P("Document remediated successfully. You can continue.", "success");
      } catch (E) {
        const B = it(E) ? String(E.message || "Remediation failed").trim() : "Remediation failed", O = it(E) ? String(E.code || "") : "", Y = it(E) ? Number(E.status || 0) : 0;
        te(B, "error"), x(B, O, Y);
      } finally {
        Me.delete(v), M && (M.disabled = !1, M.textContent = "Remediate PDF");
      }
    }
  }
  function c(S, v) {
    let E = null;
    return (...B) => {
      E !== null && clearTimeout(E), E = setTimeout(() => {
        S(...B), E = null;
      }, v);
    };
  }
  async function L() {
    try {
      const S = new URLSearchParams({
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(Se)
      }), v = await fetch(`${e}/panels/esign_documents?${S}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!v.ok) {
        console.warn("Failed to load recent documents:", v.status);
        return;
      }
      const E = await v.json(), B = Array.isArray(E?.records) ? E.records : Array.isArray(E?.items) ? E.items : [];
      N.recentDocuments = B.map((O) => Lt(O)).filter((O) => O.id !== "").slice(0, Se);
    } catch (S) {
      console.warn("Error loading recent documents:", S);
    }
  }
  async function C(S) {
    const v = S.trim();
    if (!v) {
      me && (me.abort(), me = null), N.isSearchMode = !1, N.searchResults = [], ge();
      return;
    }
    const E = ++ce;
    me && me.abort(), me = new AbortController(), N.isLoading = !0, N.isSearchMode = !0, ge();
    try {
      const B = new URLSearchParams({
        q: v,
        sort: "updated_at",
        sort_desc: "true",
        per_page: String(X)
      }), O = await fetch(`${e}/panels/esign_documents?${B}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: me.signal
      });
      if (E !== ce) return;
      if (!O.ok) {
        console.warn("Failed to search documents:", O.status), N.searchResults = [], N.isLoading = !1, ge();
        return;
      }
      const Y = await O.json(), ve = Array.isArray(Y?.records) ? Y.records : Array.isArray(Y?.items) ? Y.items : [];
      N.searchResults = ve.map((Fe) => Lt(Fe)).filter((Fe) => Fe.id !== "").slice(0, X);
    } catch (B) {
      if (it(B) && B.name === "AbortError")
        return;
      console.warn("Error searching documents:", B), N.searchResults = [];
    } finally {
      E === ce && (N.isLoading = !1, ge());
    }
  }
  const k = c(C, he);
  function V() {
    ee && (N.isOpen = !0, N.selectedIndex = -1, ee.classList.remove("hidden"), m?.setAttribute("aria-expanded", "true"), $?.classList.add("hidden"), ge());
  }
  function Z() {
    ee && (N.isOpen = !1, N.selectedIndex = -1, ee.classList.add("hidden"), m?.setAttribute("aria-expanded", "false"), $?.classList.remove("hidden"));
  }
  function be(S, v, E) {
    S && (S.innerHTML = v.map((B, O) => {
      const Y = O, ve = N.selectedIndex === Y, Fe = Ue(String(B.id || "").trim()), D = Ue(String(B.title || "").trim()), re = String(ke(B.pageCount, 0)), we = qe(B.compatibilityTier), tt = ze(B.compatibilityReason), Qe = Ue(we), Pt = Ue(tt), en = je(we) ? '<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">Unsupported</span>' : "";
      return `
        <button type="button"
          class="typeahead-option w-full px-3 py-2 flex items-center gap-3 hover:bg-blue-50 text-left focus:outline-none focus:bg-blue-50 ${ve ? "bg-blue-50" : ""}"
          role="option"
          aria-selected="${ve}"
          tabindex="-1"
          data-document-id="${Fe}"
          data-document-title="${D}"
          data-document-pages="${re}"
          data-document-compatibility-tier="${Qe}"
          data-document-compatibility-reason="${Pt}"
          data-typeahead-index="${Y}">
          <div class="w-8 h-8 rounded bg-red-100 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <svg class="w-4 h-4 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-gray-900 truncate text-sm">${D}</div>
            <div class="text-xs text-gray-500">${re} pages ${en}</div>
          </div>
        </button>
      `;
    }).join(""), S.querySelectorAll(".typeahead-option").forEach((B) => {
      B.addEventListener("click", () => Ne(B));
    }));
  }
  function ge() {
    if (ee) {
      if (N.isLoading) {
        Ae?.classList.remove("hidden"), ye?.classList.add("hidden"), Ee?.classList.add("hidden"), xe?.classList.add("hidden"), Q?.classList.remove("hidden");
        return;
      }
      Ae?.classList.add("hidden"), Q?.classList.add("hidden"), N.isSearchMode ? (ye?.classList.add("hidden"), N.searchResults.length > 0 ? (Ee?.classList.remove("hidden"), xe?.classList.add("hidden"), be(Be, N.searchResults)) : (Ee?.classList.add("hidden"), xe?.classList.remove("hidden"))) : (Ee?.classList.add("hidden"), N.recentDocuments.length > 0 ? (ye?.classList.remove("hidden"), xe?.classList.add("hidden"), be(pe, N.recentDocuments)) : (ye?.classList.add("hidden"), xe?.classList.remove("hidden"), xe && (xe.textContent = "No recent documents")));
    }
  }
  function Ne(S) {
    const v = S.getAttribute("data-document-id"), E = S.getAttribute("data-document-title"), B = S.getAttribute("data-document-pages"), O = qe(S.getAttribute("data-document-compatibility-tier")), Y = ze(S.getAttribute("data-document-compatibility-reason"));
    if (v) {
      if (je(O)) {
        fe({ id: String(v || ""), title: String(E || ""), pageCount: ke(B, 0), compatibilityReason: Y }), I(), x(A(Y)), m?.focus();
        return;
      }
      ne(v, E, B), Z(), m && (m.value = ""), N.query = "", N.isSearchMode = !1, N.searchResults = [];
    }
  }
  function Le() {
    if (!ee) return;
    const S = ee.querySelector(`[data-typeahead-index="${N.selectedIndex}"]`);
    S && S.scrollIntoView({ block: "nearest" });
  }
  function Ye(S) {
    if (!N.isOpen) {
      (S.key === "ArrowDown" || S.key === "Enter") && (S.preventDefault(), V());
      return;
    }
    const v = N.isSearchMode ? N.searchResults : N.recentDocuments, E = v.length - 1;
    switch (S.key) {
      case "ArrowDown":
        S.preventDefault(), N.selectedIndex = Math.min(N.selectedIndex + 1, E), ge(), Le();
        break;
      case "ArrowUp":
        S.preventDefault(), N.selectedIndex = Math.max(N.selectedIndex - 1, 0), ge(), Le();
        break;
      case "Enter":
        if (S.preventDefault(), N.selectedIndex >= 0 && N.selectedIndex <= E) {
          const B = v[N.selectedIndex];
          if (B) {
            const O = document.createElement("button");
            O.setAttribute("data-document-id", B.id), O.setAttribute("data-document-title", B.title), O.setAttribute("data-document-pages", String(B.pageCount)), O.setAttribute("data-document-compatibility-tier", String(B.compatibilityTier || "")), O.setAttribute("data-document-compatibility-reason", String(B.compatibilityReason || "")), Ne(O);
          }
        }
        break;
      case "Escape":
        S.preventDefault(), Z();
        break;
      case "Tab":
        Z();
        break;
      case "Home":
        S.preventDefault(), N.selectedIndex = 0, ge(), Le();
        break;
      case "End":
        S.preventDefault(), N.selectedIndex = E, ge(), Le();
        break;
    }
  }
  function Te() {
    H && H.addEventListener("click", () => {
      h?.classList.add("hidden"), u?.classList.remove("hidden"), W(), m?.focus(), V();
    }), M && M.addEventListener("click", () => {
      o();
    }), ie && ie.addEventListener("click", () => {
      W(), m?.focus();
    }), m && (m.addEventListener("input", (S) => {
      const v = S.target;
      if (!(v instanceof HTMLInputElement)) return;
      const E = v.value;
      N.query = E, N.isOpen || V(), E.trim() ? (N.isLoading = !0, ge(), k(E)) : (N.isSearchMode = !1, N.searchResults = [], ge());
      const B = De.filter(
        (O) => String(O.title || "").toLowerCase().includes(E.toLowerCase())
      );
      oe(B);
    }), m.addEventListener("focus", () => {
      V();
    }), m.addEventListener("keydown", Ye)), document.addEventListener("click", (S) => {
      const v = S.target;
      de && !(v instanceof Node && de.contains(v)) && Z();
    });
  }
  return {
    refs: {
      documentIdInput: a,
      selectedDocument: h,
      documentPicker: u,
      documentSearch: m,
      documentList: $,
      selectedDocumentTitle: R,
      selectedDocumentInfo: b,
      documentPageCountInput: g
    },
    bindEvents: Te,
    initializeTitleSourceSeed: ue,
    loadDocuments: z,
    loadRecentDocuments: L,
    ensureSelectedDocumentCompatibility: j,
    getCurrentDocumentPageCount: d
  };
}
function Je(n, e) {
  const t = n.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function Rt(n, e) {
  const t = n.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function Bn(n = {}) {
  const {
    initialParticipants: e = [],
    onParticipantsChanged: t
  } = n, i = document.getElementById("participants-container"), s = document.getElementById("participant-template"), l = document.getElementById("add-participant-btn");
  let p = 0, y = 0;
  function _() {
    return `temp_${Date.now()}_${p++}`;
  }
  function F(h = {}) {
    if (!(s instanceof HTMLTemplateElement) || !i)
      return;
    const u = s.content.cloneNode(!0), m = u.querySelector(".participant-entry");
    if (!(m instanceof HTMLElement)) return;
    const $ = h.id || _();
    m.setAttribute("data-participant-id", $);
    const H = Je(m, ".participant-id-input"), R = Je(m, 'input[name="participants[].name"]'), b = Je(m, 'input[name="participants[].email"]'), g = Rt(m, 'select[name="participants[].role"]'), U = Je(m, 'input[name="participants[].signing_stage"]'), J = Je(m, 'input[name="participants[].notify"]'), q = m.querySelector(".signing-stage-wrapper");
    if (!H || !R || !b || !g) return;
    const M = y++;
    H.name = `participants[${M}].id`, H.value = $, R.name = `participants[${M}].name`, b.name = `participants[${M}].email`, g.name = `participants[${M}].role`, U && (U.name = `participants[${M}].signing_stage`), J && (J.name = `participants[${M}].notify`), h.name && (R.value = h.name), h.email && (b.value = h.email), h.role && (g.value = h.role), U && h.signing_stage && (U.value = String(h.signing_stage)), J && (J.checked = h.notify !== !1);
    const ie = () => {
      if (!(q instanceof HTMLElement) || !U) return;
      const G = g.value === "signer";
      q.classList.toggle("hidden", !G), G ? U.value || (U.value = "1") : U.value = "";
    };
    ie(), m.querySelector(".remove-participant-btn")?.addEventListener("click", () => {
      m.remove(), t?.();
    }), g.addEventListener("change", () => {
      ie(), t?.();
    }), i.appendChild(u);
  }
  function x() {
    i && (e.length > 0 ? e.forEach((h) => {
      F({
        id: String(h.id || "").trim(),
        name: String(h.name || "").trim(),
        email: String(h.email || "").trim(),
        role: String(h.role || "signer").trim() || "signer",
        notify: h.notify !== !1,
        signing_stage: Number(h.signing_stage || h.signingStage || 1) || 1
      });
    }) : F());
  }
  function P() {
    if (!i) return;
    l?.addEventListener("click", () => F()), new MutationObserver(() => {
      t?.();
    }).observe(i, { childList: !0, subtree: !0 }), i.addEventListener("change", (u) => {
      const m = u.target;
      m instanceof Element && (m.matches('select[name*=".role"]') || m.matches('input[name*=".name"]') || m.matches('input[name*=".email"]')) && t?.();
    }), i.addEventListener("input", (u) => {
      const m = u.target;
      m instanceof Element && (m.matches('input[name*=".name"]') || m.matches('input[name*=".email"]')) && t?.();
    });
  }
  function T() {
    if (!i) return [];
    const h = i.querySelectorAll(".participant-entry"), u = [];
    return h.forEach((m) => {
      const $ = m.getAttribute("data-participant-id"), H = Rt(m, 'select[name*=".role"]'), R = Je(m, 'input[name*=".name"]'), b = Je(m, 'input[name*=".email"]');
      H?.value === "signer" && u.push({
        id: String($ || ""),
        name: R?.value || b?.value || "Signer",
        email: b?.value || ""
      });
    }), u;
  }
  function w() {
    if (!i) return [];
    const h = [];
    return i.querySelectorAll(".participant-entry").forEach((u) => {
      const m = u.getAttribute("data-participant-id"), $ = Je(u, 'input[name*=".name"]')?.value || "", H = Je(u, 'input[name*=".email"]')?.value || "", R = Rt(u, 'select[name*=".role"]')?.value || "signer", b = Number.parseInt(Je(u, ".signing-stage-input")?.value || "1", 10), g = Je(u, ".notify-input")?.checked !== !1;
      h.push({
        tempId: String(m || ""),
        name: $,
        email: H,
        role: R,
        notify: g,
        signingStage: Number.isFinite(b) ? b : 1
      });
    }), h;
  }
  function a(h) {
    !i || !h?.participants || h.participants.length === 0 || (i.innerHTML = "", y = 0, h.participants.forEach((u) => {
      F({
        id: u.tempId,
        name: u.name,
        email: u.email,
        role: u.role,
        notify: u.notify !== !1,
        signing_stage: u.signingStage
      });
    }));
  }
  return {
    refs: {
      participantsContainer: i,
      addParticipantBtn: l
    },
    initialize: x,
    bindEvents: P,
    addParticipant: F,
    getSignerParticipants: T,
    collectParticipantsForState: w,
    restoreFromState: a
  };
}
function $n() {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function It() {
  return {
    groups: /* @__PURE__ */ new Map(),
    definitionToGroup: /* @__PURE__ */ new Map(),
    unlinkedDefinitions: /* @__PURE__ */ new Set()
  };
}
function zn(n, e) {
  return {
    id: $n(),
    name: e,
    memberDefinitionIds: [...n],
    sourceFieldId: void 0,
    isActive: !0
  };
}
function Jt(n, e) {
  const t = new Map(n.groups);
  t.set(e.id, e);
  const i = new Map(n.definitionToGroup);
  for (const s of e.memberDefinitionIds)
    i.set(s, e.id);
  return {
    ...n,
    groups: t,
    definitionToGroup: i
  };
}
function Bt(n, e) {
  const t = new Set(n.unlinkedDefinitions);
  return t.add(e), {
    ...n,
    unlinkedDefinitions: t
  };
}
function $t(n, e) {
  const t = new Set(n.unlinkedDefinitions);
  return t.delete(e), {
    ...n,
    unlinkedDefinitions: t
  };
}
function Xt(n, e) {
  const t = n.definitionToGroup.get(e);
  if (t)
    return n.groups.get(t);
}
function Un(n, e) {
  const t = Xt(n, e.definitionId);
  if (!t || !t.isActive || t.templatePosition) return null;
  const i = {
    x: e.x,
    y: e.y,
    width: e.width,
    height: e.height
  };
  return { updatedGroup: {
    ...t,
    sourceFieldId: e.id,
    templatePosition: i
  } };
}
function qn(n, e, t, i) {
  const s = /* @__PURE__ */ new Set();
  for (const l of t)
    s.add(l.definitionId);
  for (const [l, p] of i) {
    if (p.page !== e || s.has(l) || n.unlinkedDefinitions.has(l)) continue;
    const y = n.definitionToGroup.get(l);
    if (!y) continue;
    const _ = n.groups.get(y);
    if (!_ || !_.isActive || !_.templatePosition) continue;
    return { newPlacement: {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: l,
      type: p.type,
      participantId: p.participantId,
      participantName: p.participantName,
      page: e,
      x: _.templatePosition.x,
      y: _.templatePosition.y,
      width: _.templatePosition.width,
      height: _.templatePosition.height,
      placementSource: Ge.AUTO_LINKED,
      linkGroupId: _.id,
      linkedFromFieldId: _.sourceFieldId
    } };
  }
  return null;
}
function Xe(n) {
  const e = document.getElementById(n);
  return e instanceof HTMLElement ? e : null;
}
function Ce(n, e) {
  const t = n.querySelector(e);
  return t instanceof HTMLInputElement ? t : null;
}
function Oe(n, e) {
  const t = n.querySelector(e);
  return t instanceof HTMLSelectElement ? t : null;
}
function zt(n, e) {
  const t = n.querySelector(e);
  return t instanceof HTMLButtonElement ? t : null;
}
function rt(n, e) {
  const t = n.querySelector(e);
  return t instanceof HTMLElement ? t : null;
}
function On(n) {
  const {
    initialFieldInstances: e = [],
    placementSource: t,
    getCurrentDocumentPageCount: i,
    getSignerParticipants: s,
    escapeHtml: l,
    onDefinitionsChanged: p,
    onRulesChanged: y,
    onParticipantsChanged: _,
    getPlacementLinkGroupState: F,
    setPlacementLinkGroupState: x
  } = n, P = Xe("field-definitions-container"), T = document.getElementById("field-definition-template"), w = Xe("add-field-btn"), a = Xe("add-field-btn-container"), h = Xe("add-field-definition-empty-btn"), u = Xe("field-definitions-empty-state"), m = Xe("field-rules-container"), $ = document.getElementById("field-rule-template"), H = Xe("add-field-rule-btn"), R = Xe("field-rules-empty-state"), b = Xe("field-rules-preview"), g = Xe("field_rules_json"), U = Xe("field_placements_json");
  let J = 0, q = 0, M = 0;
  function ie() {
    return `temp_field_${Date.now()}_${J++}`;
  }
  function G() {
    return `rule_${Date.now()}_${M}`;
  }
  function he(f, d) {
    const I = String(f || "").trim();
    return I && d.some((A) => A.id === I) ? I : d.length === 1 ? d[0].id : "";
  }
  function Se(f, d, I = "") {
    if (!f) return;
    const A = he(I, d);
    f.innerHTML = '<option value="">Select signer...</option>', d.forEach((W) => {
      const te = document.createElement("option");
      te.value = W.id, te.textContent = W.name, f.appendChild(te);
    }), f.value = A;
  }
  function X(f = s()) {
    if (!P) return;
    const d = P.querySelectorAll(".field-participant-select"), I = m ? m.querySelectorAll(".field-rule-participant-select") : [];
    d.forEach((A) => {
      Se(
        A instanceof HTMLSelectElement ? A : null,
        f,
        A instanceof HTMLSelectElement ? A.value : ""
      );
    }), I.forEach((A) => {
      Se(
        A instanceof HTMLSelectElement ? A : null,
        f,
        A instanceof HTMLSelectElement ? A.value : ""
      );
    });
  }
  function de() {
    if (!P || !u) return;
    P.querySelectorAll(".field-definition-entry").length === 0 ? (u.classList.remove("hidden"), a?.classList.add("hidden")) : (u.classList.add("hidden"), a?.classList.remove("hidden"));
  }
  function ee() {
    if (!m || !R) return;
    const f = m.querySelectorAll(".field-rule-entry");
    R.classList.toggle("hidden", f.length > 0);
  }
  function ye() {
    if (!P) return [];
    const f = [];
    return P.querySelectorAll(".field-definition-entry").forEach((d) => {
      const I = d.getAttribute("data-field-definition-id"), A = Oe(d, ".field-type-select")?.value || "signature", W = Oe(d, ".field-participant-select")?.value || "", te = Number.parseInt(Ce(d, 'input[name*=".page"]')?.value || "1", 10), fe = Ce(d, 'input[name*=".required"]')?.checked ?? !0;
      f.push({
        tempId: String(I || ""),
        type: A,
        participantTempId: W,
        page: Number.isFinite(te) ? te : 1,
        required: fe
      });
    }), f;
  }
  function pe() {
    if (!m) return [];
    const f = i(), d = m.querySelectorAll(".field-rule-entry"), I = [];
    return d.forEach((A) => {
      const W = vt({
        id: A.getAttribute("data-field-rule-id") || "",
        type: Oe(A, ".field-rule-type-select")?.value || "",
        participantId: Oe(A, ".field-rule-participant-select")?.value || "",
        fromPage: Ce(A, ".field-rule-from-page-input")?.value || "",
        toPage: Ce(A, ".field-rule-to-page-input")?.value || "",
        page: Ce(A, ".field-rule-page-input")?.value || "",
        excludeLastPage: !!Ce(A, ".field-rule-exclude-last-input")?.checked,
        excludePages: wt(Ce(A, ".field-rule-exclude-pages-input")?.value || ""),
        required: (Oe(A, ".field-rule-required-select")?.value || "1") !== "0"
      }, f);
      W.type && I.push(W);
    }), I;
  }
  function Ee() {
    return pe().map((f) => ({
      id: f.id,
      type: f.type,
      participant_id: f.participantId,
      from_page: f.fromPage,
      to_page: f.toPage,
      page: f.page,
      exclude_last_page: f.excludeLastPage,
      exclude_pages: f.excludePages,
      required: f.required
    }));
  }
  function Be(f, d) {
    return Tn(f, d);
  }
  function xe() {
    if (!b) return;
    const f = pe(), d = i(), I = Be(f, d), A = s(), W = new Map(A.map((ne) => [String(ne.id), ne.name]));
    if (g && (g.value = JSON.stringify(Ee())), !I.length) {
      b.innerHTML = "<p>No rules configured.</p>";
      return;
    }
    const te = I.reduce((ne, K) => {
      const j = K.type;
      return ne[j] = (ne[j] || 0) + 1, ne;
    }, {}), fe = I.slice(0, 8).map((ne) => {
      const K = W.get(String(ne.participantId)) || "Unassigned signer";
      return `<li class="flex items-center justify-between"><span>${ne.type === "initials" ? "Initials" : "Signature"} on page ${ne.page}</span><span class="text-gray-500">${l(String(K))}</span></li>`;
    }).join(""), se = I.length - 8;
    b.innerHTML = `
      <p class="text-gray-700">${I.length} generated field${I.length !== 1 ? "s" : ""} (${te.initials || 0} initials, ${te.signature || 0} signatures)</p>
      <ul class="space-y-1">${fe}</ul>
      ${se > 0 ? `<p class="text-gray-500">+${se} more</p>` : ""}
    `;
  }
  function Ae() {
    const f = s();
    X(f), xe();
  }
  function Q(f) {
    const d = Oe(f, ".field-rule-type-select"), I = rt(f, ".field-rule-range-start-wrap"), A = rt(f, ".field-rule-range-end-wrap"), W = rt(f, ".field-rule-page-wrap"), te = rt(f, ".field-rule-exclude-last-wrap"), fe = rt(f, ".field-rule-exclude-pages-wrap"), se = rt(f, ".field-rule-summary"), ne = Ce(f, ".field-rule-from-page-input"), K = Ce(f, ".field-rule-to-page-input"), j = Ce(f, ".field-rule-page-input"), le = Ce(f, ".field-rule-exclude-last-input"), z = Ce(f, ".field-rule-exclude-pages-input");
    if (!d || !I || !A || !W || !te || !fe || !se)
      return;
    const oe = i(), ae = vt({
      type: d?.value || "",
      fromPage: ne?.value || "",
      toPage: K?.value || "",
      page: j?.value || "",
      excludeLastPage: !!le?.checked,
      excludePages: wt(z?.value || ""),
      required: !0
    }, oe), r = ae.fromPage > 0 ? ae.fromPage : 1, o = ae.toPage > 0 ? ae.toPage : oe, c = ae.page > 0 ? ae.page : ae.toPage > 0 ? ae.toPage : oe, L = ae.excludeLastPage, C = ae.excludePages.join(","), k = d?.value === "initials_each_page";
    if (I.classList.toggle("hidden", !k), A.classList.toggle("hidden", !k), te.classList.toggle("hidden", !k), fe.classList.toggle("hidden", !k), W.classList.toggle("hidden", k), ne && (ne.value = String(r)), K && (K.value = String(o)), j && (j.value = String(c)), z && (z.value = C), le && (le.checked = L), k) {
      const V = kn(
        r,
        o,
        oe,
        L,
        ae.excludePages
      ), Z = Fn(V);
      se.textContent = V.isEmpty ? `Warning: No initials fields will be generated ${Z}.` : `Generates initials fields on ${Z}.`;
    } else
      se.textContent = `Generates one signature field on page ${c}.`;
  }
  function N(f = {}) {
    if (!($ instanceof HTMLTemplateElement) || !m) return;
    const d = $.content.cloneNode(!0), I = d.querySelector(".field-rule-entry");
    if (!(I instanceof HTMLElement)) return;
    const A = f.id || G(), W = M++, te = i();
    I.setAttribute("data-field-rule-id", A);
    const fe = Ce(I, ".field-rule-id-input"), se = Oe(I, ".field-rule-type-select"), ne = Oe(I, ".field-rule-participant-select"), K = Ce(I, ".field-rule-from-page-input"), j = Ce(I, ".field-rule-to-page-input"), le = Ce(I, ".field-rule-page-input"), z = Oe(I, ".field-rule-required-select"), oe = Ce(I, ".field-rule-exclude-last-input"), ae = Ce(I, ".field-rule-exclude-pages-input"), r = zt(I, ".remove-field-rule-btn");
    if (!fe || !se || !ne || !K || !j || !le || !z || !oe || !ae || !r)
      return;
    fe.name = `field_rules[${W}].id`, fe.value = A, se.name = `field_rules[${W}].type`, ne.name = `field_rules[${W}].participant_id`, K.name = `field_rules[${W}].from_page`, j.name = `field_rules[${W}].to_page`, le.name = `field_rules[${W}].page`, z.name = `field_rules[${W}].required`, oe.name = `field_rules[${W}].exclude_last_page`, ae.name = `field_rules[${W}].exclude_pages`;
    const o = vt(f, te);
    se.value = o.type || "initials_each_page", Se(ne, s(), o.participantId), K.value = String(o.fromPage > 0 ? o.fromPage : 1), j.value = String(o.toPage > 0 ? o.toPage : te), le.value = String(o.page > 0 ? o.page : te), z.value = o.required ? "1" : "0", oe.checked = o.excludeLastPage, ae.value = o.excludePages.join(",");
    const c = () => {
      Q(I), xe(), y?.();
    }, L = () => {
      const k = i();
      if (K) {
        const V = parseInt(K.value, 10);
        Number.isFinite(V) && (K.value = String(dt(V, k, 1)));
      }
      if (j) {
        const V = parseInt(j.value, 10);
        Number.isFinite(V) && (j.value = String(dt(V, k, 1)));
      }
      if (le) {
        const V = parseInt(le.value, 10);
        Number.isFinite(V) && (le.value = String(dt(V, k, 1)));
      }
    }, C = () => {
      L(), c();
    };
    se.addEventListener("change", c), ne.addEventListener("change", c), K.addEventListener("input", C), K.addEventListener("change", C), j.addEventListener("input", C), j.addEventListener("change", C), le.addEventListener("input", C), le.addEventListener("change", C), z.addEventListener("change", c), oe.addEventListener("change", () => {
      const k = i();
      j.value = String(oe.checked ? Math.max(1, k - 1) : k), c();
    }), ae.addEventListener("input", c), r.addEventListener("click", () => {
      I.remove(), ee(), xe(), y?.();
    }), m.appendChild(d), Q(m.lastElementChild || I), ee(), xe();
  }
  function De(f = {}) {
    if (!(T instanceof HTMLTemplateElement) || !P) return;
    const d = T.content.cloneNode(!0), I = d.querySelector(".field-definition-entry");
    if (!(I instanceof HTMLElement)) return;
    const A = String(f.id || ie()).trim() || ie();
    I.setAttribute("data-field-definition-id", A);
    const W = Ce(I, ".field-definition-id-input"), te = Oe(I, 'select[name="field_definitions[].type"]'), fe = Oe(I, 'select[name="field_definitions[].participant_id"]'), se = Ce(I, 'input[name="field_definitions[].page"]'), ne = Ce(I, 'input[name="field_definitions[].required"]'), K = rt(I, ".field-date-signed-info");
    if (!W || !te || !fe || !se || !ne || !K) return;
    const j = q++;
    W.name = `field_instances[${j}].id`, W.value = A, te.name = `field_instances[${j}].type`, fe.name = `field_instances[${j}].participant_id`, se.name = `field_instances[${j}].page`, ne.name = `field_instances[${j}].required`, f.type && (te.value = String(f.type)), f.page !== void 0 && (se.value = String(dt(f.page, i(), 1))), f.required !== void 0 && (ne.checked = !!f.required);
    const le = String(f.participant_id || f.participantId || "").trim();
    Se(fe, s(), le), te.addEventListener("change", () => {
      te.value === "date_signed" ? K.classList.remove("hidden") : K.classList.add("hidden");
    }), te.value === "date_signed" && K.classList.remove("hidden"), zt(I, ".remove-field-definition-btn")?.addEventListener("click", () => {
      I.remove(), de(), p?.();
    });
    const z = Ce(I, 'input[name*=".page"]'), oe = () => {
      z && (z.value = String(dt(z.value, i(), 1)));
    };
    oe(), z?.addEventListener("input", oe), z?.addEventListener("change", oe), P.appendChild(d), de();
  }
  function _e() {
    w?.addEventListener("click", () => De()), h?.addEventListener("click", () => De()), H?.addEventListener("click", () => N({ to_page: i() })), _?.();
  }
  function ce() {
    const f = [];
    window._initialFieldPlacementsData = f, e.forEach((d) => {
      const I = String(d.id || "").trim();
      if (!I) return;
      const A = String(d.type || "signature").trim() || "signature", W = String(d.participant_id || d.participantId || "").trim(), te = Number(d.page || 1) || 1, fe = !!d.required;
      De({
        id: I,
        type: A,
        participant_id: W,
        page: te,
        required: fe
      }), f.push(pt({
        id: I,
        definitionId: I,
        type: A,
        participantId: W,
        participantName: String(d.participant_name || d.participantName || "").trim(),
        page: te,
        x: Number(d.x || d.pos_x || 0) || 0,
        y: Number(d.y || d.pos_y || 0) || 0,
        width: Number(d.width || 150) || 150,
        height: Number(d.height || 32) || 32,
        placementSource: String(d.placement_source || d.placementSource || t.MANUAL).trim() || t.MANUAL
      }, f.length));
    }), de(), Ae(), ee(), xe();
  }
  function me() {
    const f = window._initialFieldPlacementsData;
    return Array.isArray(f) ? f.map((d, I) => pt(d, I)) : [];
  }
  function Me() {
    if (!P) return [];
    const f = s(), d = new Map(f.map((K) => [String(K.id), K.name || K.email || "Signer"])), I = [];
    P.querySelectorAll(".field-definition-entry").forEach((K) => {
      const j = String(K.getAttribute("data-field-definition-id") || "").trim(), le = Oe(K, ".field-type-select"), z = Oe(K, ".field-participant-select"), oe = Ce(K, 'input[name*=".page"]'), ae = String(le?.value || "text").trim() || "text", r = String(z?.value || "").trim(), o = parseInt(String(oe?.value || "1"), 10) || 1;
      I.push({
        definitionId: j,
        fieldType: ae,
        participantId: r,
        participantName: d.get(r) || "Unassigned",
        page: o
      });
    });
    const W = Be(pe(), i()), te = /* @__PURE__ */ new Map();
    W.forEach((K) => {
      const j = String(K.ruleId || "").trim(), le = String(K.id || "").trim();
      if (j && le) {
        const z = te.get(j) || [];
        z.push(le), te.set(j, z);
      }
    });
    let fe = F();
    te.forEach((K, j) => {
      if (K.length > 1 && !fe.groups.get(`rule_${j}`)) {
        const z = zn(K, `Rule ${j}`);
        z.id = `rule_${j}`, fe = Jt(fe, z);
      }
    }), x(fe), W.forEach((K) => {
      const j = String(K.id || "").trim();
      if (!j) return;
      const le = String(K.participantId || "").trim(), z = parseInt(String(K.page || "1"), 10) || 1, oe = String(K.ruleId || "").trim();
      I.push({
        definitionId: j,
        fieldType: String(K.type || "text").trim() || "text",
        participantId: le,
        participantName: d.get(le) || "Unassigned",
        page: z,
        linkGroupId: oe ? `rule_${oe}` : void 0
      });
    });
    const se = /* @__PURE__ */ new Set(), ne = I.filter((K) => {
      const j = String(K.definitionId || "").trim();
      return !j || se.has(j) ? !1 : (se.add(j), !0);
    });
    return ne.sort((K, j) => K.page !== j.page ? K.page - j.page : K.definitionId.localeCompare(j.definitionId)), ne;
  }
  function We(f) {
    const d = String(f || "").trim();
    if (!d) return null;
    const A = Me().find((W) => String(W.definitionId || "").trim() === d);
    return A ? {
      id: d,
      type: String(A.fieldType || "text").trim() || "text",
      participant_id: String(A.participantId || "").trim(),
      participant_name: String(A.participantName || "Unassigned").trim() || "Unassigned",
      page: Number.parseInt(String(A.page || "1"), 10) || 1,
      link_group_id: String(A.linkGroupId || "").trim()
    } : null;
  }
  function qe() {
    if (!P) return [];
    const f = s(), d = /* @__PURE__ */ new Map();
    return f.forEach((W) => d.set(W.id, !1)), P.querySelectorAll(".field-definition-entry").forEach((W) => {
      const te = Oe(W, ".field-type-select"), fe = Oe(W, ".field-participant-select"), se = Ce(W, 'input[name*=".required"]');
      te?.value === "signature" && fe?.value && se?.checked && d.set(fe.value, !0);
    }), Be(pe(), i()).forEach((W) => {
      W.type === "signature" && W.participantId && W.required && d.set(W.participantId, !0);
    }), f.filter((W) => !d.get(W.id));
  }
  function ze(f) {
    if (!Array.isArray(f) || f.length === 0)
      return "Each signer requires at least one required signature field.";
    const d = f.map((I) => I?.name?.trim()).filter(Boolean);
    return d.length === 0 ? "Each signer requires at least one required signature field." : `Each signer requires at least one required signature field. Missing: ${d.join(", ")}`;
  }
  function je(f) {
    !P || !f?.fieldDefinitions || f.fieldDefinitions.length === 0 || (P.innerHTML = "", q = 0, f.fieldDefinitions.forEach((d) => {
      De({
        id: d.tempId,
        type: d.type,
        participant_id: d.participantTempId,
        page: d.page,
        required: d.required
      });
    }), de());
  }
  function ue(f) {
    !Array.isArray(f?.fieldRules) || f.fieldRules.length === 0 || m && (m.querySelectorAll(".field-rule-entry").forEach((d) => d.remove()), M = 0, f.fieldRules.forEach((d) => {
      N({
        id: d.id,
        type: d.type,
        participantId: d.participantId || d.participantTempId,
        fromPage: d.fromPage,
        toPage: d.toPage,
        page: d.page,
        excludeLastPage: d.excludeLastPage,
        excludePages: d.excludePages,
        required: d.required
      });
    }), ee(), xe());
  }
  return {
    refs: {
      fieldDefinitionsContainer: P,
      fieldRulesContainer: m,
      addFieldBtn: w,
      fieldPlacementsJSONInput: U,
      fieldRulesJSONInput: g
    },
    bindEvents: _e,
    initialize: ce,
    buildInitialPlacementInstances: me,
    collectFieldDefinitionsForState: ye,
    collectFieldRulesForState: pe,
    collectFieldRulesForForm: Ee,
    expandRulesForPreview: Be,
    renderFieldRulePreview: xe,
    updateFieldParticipantOptions: Ae,
    collectPlacementFieldDefinitions: Me,
    getFieldDefinitionById: We,
    findSignersMissingRequiredSignatureField: qe,
    missingSignatureFieldMessage: ze,
    restoreFieldDefinitionsFromState: je,
    restoreFieldRulesFromState: ue
  };
}
function Hn(n) {
  return typeof n == "object" && n !== null && "run" in n;
}
const at = {
  signature: { bg: "bg-blue-500", border: "border-blue-500", fill: "rgba(59, 130, 246, 0.2)" },
  name: { bg: "bg-green-500", border: "border-green-500", fill: "rgba(34, 197, 94, 0.2)" },
  date_signed: { bg: "bg-purple-500", border: "border-purple-500", fill: "rgba(168, 85, 247, 0.2)" },
  text: { bg: "bg-gray-500", border: "border-gray-500", fill: "rgba(107, 114, 128, 0.2)" },
  checkbox: { bg: "bg-indigo-500", border: "border-indigo-500", fill: "rgba(99, 102, 241, 0.2)" },
  initials: { bg: "bg-orange-500", border: "border-orange-500", fill: "rgba(249, 115, 22, 0.2)" }
}, ht = {
  signature: { width: 200, height: 50 },
  name: { width: 180, height: 30 },
  date_signed: { width: 120, height: 30 },
  text: { width: 150, height: 30 },
  checkbox: { width: 24, height: 24 },
  initials: { width: 80, height: 40 }
};
function jn(n) {
  const {
    apiBase: e,
    apiVersionBase: t,
    documentIdInput: i,
    fieldPlacementsJSONInput: s,
    initialFieldInstances: l = [],
    initialLinkGroupState: p = null,
    collectPlacementFieldDefinitions: y,
    getFieldDefinitionById: _,
    parseAPIError: F,
    mapUserFacingError: x,
    showToast: P,
    escapeHtml: T,
    onPlacementsChanged: w
  } = n, a = {
    pdfDoc: null,
    currentPage: 1,
    totalPages: 1,
    scale: 1,
    fieldInstances: Array.isArray(l) ? l.map((r, o) => pt(r, o)) : [],
    selectedFieldId: null,
    isDragging: !1,
    isResizing: !1,
    dragOffset: { x: 0, y: 0 },
    uiHandlersBound: !1,
    autoPlaceBound: !1,
    loadRequestVersion: 0,
    linkGroupState: p || It()
  }, h = {
    currentRunId: null,
    suggestions: [],
    resolverScores: [],
    policy: null,
    isRunning: !1
  };
  function u(r = "fi") {
    return `${r}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  function m(r) {
    return document.querySelector(`.placement-field-item[data-definition-id="${r}"]`);
  }
  function $() {
    return Array.from(document.querySelectorAll(".placement-field-item:not(.opacity-50)"));
  }
  function H(r, o) {
    return r.querySelector(o);
  }
  function R(r, o) {
    return r.querySelector(o);
  }
  function b() {
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
  function J(r) {
    a.linkGroupState = r || It();
  }
  function q() {
    return a.fieldInstances.map((r, o) => Mn(r, o));
  }
  function M(r = {}) {
    const { silent: o = !1 } = r, c = b();
    c.fieldInstancesContainer && (c.fieldInstancesContainer.innerHTML = "");
    const L = q();
    return s && (s.value = JSON.stringify(L)), o || w?.(), L;
  }
  function ie() {
    const r = b(), o = Array.from(document.querySelectorAll(".placement-field-item")), c = o.length, L = new Set(
      o.map((Z) => String(Z.dataset.definitionId || "").trim()).filter((Z) => Z)
    ), C = /* @__PURE__ */ new Set();
    a.fieldInstances.forEach((Z) => {
      const be = String(Z.definitionId || "").trim();
      L.has(be) && C.add(be);
    });
    const k = C.size, V = Math.max(0, c - k);
    r.totalFields && (r.totalFields.textContent = String(c)), r.placedCount && (r.placedCount.textContent = String(k)), r.unplacedCount && (r.unplacedCount.textContent = String(V));
  }
  function G(r, o = !1) {
    const c = m(r);
    if (!c) return;
    c.classList.add("opacity-50"), c.draggable = !1;
    const L = c.querySelector(".placement-status");
    L && (L.textContent = "Placed", L.classList.remove("text-amber-600"), L.classList.add("text-green-600")), o && c.classList.add("just-linked");
  }
  function he(r) {
    const o = m(r);
    if (!o) return;
    o.classList.remove("opacity-50"), o.draggable = !0;
    const c = o.querySelector(".placement-status");
    c && (c.textContent = "Not placed", c.classList.remove("text-green-600"), c.classList.add("text-amber-600"));
  }
  function Se() {
    document.querySelectorAll(".placement-field-item.just-linked").forEach((o) => {
      o.classList.add("linked-flash"), setTimeout(() => {
        o.classList.remove("linked-flash", "just-linked");
      }, 600);
    });
  }
  function X(r) {
    const o = r === 1 ? "Auto-placed 1 linked field" : `Auto-placed ${r} linked fields`;
    window.toastManager?.info?.(o);
    const c = document.createElement("div");
    c.setAttribute("role", "status"), c.setAttribute("aria-live", "polite"), c.className = "sr-only", c.textContent = o, document.body.appendChild(c), setTimeout(() => c.remove(), 1e3), Se();
  }
  function de(r, o) {
    const c = document.createElement("div");
    c.className = "link-toggle flex justify-center py-0.5 cursor-pointer hover:bg-gray-100 rounded transition-colors", c.dataset.definitionId = r, c.dataset.isLinked = String(o), c.title = o ? "Click to unlink this field" : "Click to re-link this field", c.setAttribute("role", "button"), c.setAttribute("aria-label", o ? "Unlink field from group" : "Re-link field to group"), c.setAttribute("tabindex", "0"), o ? c.innerHTML = `<svg class="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
      </svg>` : c.innerHTML = `<svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
        <line x1="2" y1="2" x2="22" y2="22"/>
      </svg>`;
    const L = () => xe(r, o);
    return c.addEventListener("click", L), c.addEventListener("keydown", (C) => {
      (C.key === "Enter" || C.key === " ") && (C.preventDefault(), L());
    }), c;
  }
  function ee() {
    const r = b();
    if (r.linkAllBtn && (r.linkAllBtn.disabled = a.linkGroupState.unlinkedDefinitions.size === 0), r.unlinkAllBtn) {
      let o = !1;
      for (const c of a.linkGroupState.definitionToGroup.keys())
        if (!a.linkGroupState.unlinkedDefinitions.has(c)) {
          o = !0;
          break;
        }
      r.unlinkAllBtn.disabled = !o;
    }
  }
  function ye() {
    const r = b();
    r.linkAllBtn && !r.linkAllBtn.dataset.bound && (r.linkAllBtn.dataset.bound = "true", r.linkAllBtn.addEventListener("click", () => {
      const o = a.linkGroupState.unlinkedDefinitions.size;
      if (o !== 0) {
        for (const c of a.linkGroupState.unlinkedDefinitions)
          a.linkGroupState = $t(a.linkGroupState, c);
        window.toastManager && window.toastManager.success(`Re-linked ${o} field${o > 1 ? "s" : ""}`), Be();
      }
    })), r.unlinkAllBtn && !r.unlinkAllBtn.dataset.bound && (r.unlinkAllBtn.dataset.bound = "true", r.unlinkAllBtn.addEventListener("click", () => {
      let o = 0;
      for (const c of a.linkGroupState.definitionToGroup.keys())
        a.linkGroupState.unlinkedDefinitions.has(c) || (a.linkGroupState = Bt(a.linkGroupState, c), o += 1);
      o > 0 && window.toastManager && window.toastManager.success(`Unlinked ${o} field${o > 1 ? "s" : ""}`), Be();
    })), ee();
  }
  function pe() {
    return y().map((o) => {
      const c = String(o.definitionId || "").trim(), L = a.linkGroupState.definitionToGroup.get(c) || "", C = a.linkGroupState.unlinkedDefinitions.has(c);
      return { ...o, definitionId: c, linkGroupId: L, isUnlinked: C };
    });
  }
  function Ee() {
    const r = b();
    if (!r.fieldsList) return;
    r.fieldsList.innerHTML = "";
    const o = pe();
    r.linkBatchActions && r.linkBatchActions.classList.toggle("hidden", a.linkGroupState.groups.size === 0), o.forEach((c, L) => {
      const C = c.definitionId, k = String(c.fieldType || "text").trim() || "text", V = String(c.participantId || "").trim(), Z = String(c.participantName || "Unassigned").trim() || "Unassigned", be = Number.parseInt(String(c.page || "1"), 10) || 1, ge = c.linkGroupId, Ne = c.isUnlinked;
      if (!C) return;
      a.fieldInstances.forEach((ve) => {
        ve.definitionId === C && (ve.type = k, ve.participantId = V, ve.participantName = Z);
      });
      const Le = at[k] || at.text, Ye = a.fieldInstances.some((ve) => ve.definitionId === C), Te = document.createElement("div");
      Te.className = `placement-field-item p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50 flex items-center gap-2 ${Ye ? "opacity-50" : ""}`, Te.draggable = !Ye, Te.dataset.definitionId = C, Te.dataset.fieldType = k, Te.dataset.participantId = V, Te.dataset.participantName = Z, Te.dataset.page = String(be), ge && (Te.dataset.linkGroupId = ge);
      const S = document.createElement("span");
      S.className = `w-3 h-3 rounded ${Le.bg}`;
      const v = document.createElement("div");
      v.className = "flex-1 text-xs";
      const E = document.createElement("div");
      E.className = "font-medium capitalize", E.textContent = k.replace(/_/g, " ");
      const B = document.createElement("div");
      B.className = "text-gray-500", B.textContent = Z;
      const O = document.createElement("span");
      O.className = `placement-status text-xs ${Ye ? "text-green-600" : "text-amber-600"}`, O.textContent = Ye ? "Placed" : "Not placed", v.appendChild(E), v.appendChild(B), Te.appendChild(S), Te.appendChild(v), Te.appendChild(O), Te.addEventListener("dragstart", (ve) => {
        if (Ye) {
          ve.preventDefault();
          return;
        }
        ve.dataTransfer?.setData("application/json", JSON.stringify({
          definitionId: C,
          fieldType: k,
          participantId: V,
          participantName: Z
        })), ve.dataTransfer && (ve.dataTransfer.effectAllowed = "copy"), Te.classList.add("opacity-50");
      }), Te.addEventListener("dragend", () => {
        Te.classList.remove("opacity-50");
      }), r.fieldsList?.appendChild(Te);
      const Y = o[L + 1];
      ge && Y && Y.linkGroupId === ge && r.fieldsList?.appendChild(de(C, !Ne));
    }), ye(), ie();
  }
  function Be() {
    Ee();
  }
  function xe(r, o) {
    o ? (a.linkGroupState = Bt(a.linkGroupState, r), window.toastManager?.info?.("Field unlinked")) : (a.linkGroupState = $t(a.linkGroupState, r), window.toastManager?.info?.("Field re-linked")), Be();
  }
  async function Ae(r) {
    const o = a.pdfDoc;
    if (!o) return;
    const c = b();
    if (!c.canvas || !c.canvasContainer) return;
    const L = c.canvas.getContext("2d"), C = await o.getPage(r), k = C.getViewport({ scale: a.scale });
    c.canvas.width = k.width, c.canvas.height = k.height, c.canvasContainer.style.width = `${k.width}px`, c.canvasContainer.style.height = `${k.height}px`, await C.render({
      canvasContext: L,
      viewport: k
    }).promise, c.currentPage && (c.currentPage.textContent = String(r)), _e();
  }
  function Q(r) {
    const o = Un(a.linkGroupState, r);
    o && (a.linkGroupState = Jt(a.linkGroupState, o.updatedGroup));
  }
  function N(r) {
    const o = /* @__PURE__ */ new Map();
    y().forEach((L) => {
      const C = String(L.definitionId || "").trim();
      C && o.set(C, {
        type: String(L.fieldType || "text").trim() || "text",
        participantId: String(L.participantId || "").trim(),
        participantName: String(L.participantName || "Unknown").trim() || "Unknown",
        page: Number.parseInt(String(L.page || "1"), 10) || 1,
        linkGroupId: a.linkGroupState.definitionToGroup.get(C)
      });
    });
    let c = 0;
    for (; c < 10; ) {
      const L = qn(
        a.linkGroupState,
        r,
        a.fieldInstances,
        o
      );
      if (!L || !L.newPlacement) break;
      a.fieldInstances.push(L.newPlacement), G(L.newPlacement.definitionId, !0), c += 1;
    }
    c > 0 && (_e(), ie(), M(), X(c));
  }
  function De(r) {
    Q(r);
  }
  function _e() {
    const o = b().overlays;
    o && (o.innerHTML = "", o.style.pointerEvents = "auto", a.fieldInstances.filter((c) => c.page === a.currentPage).forEach((c) => {
      const L = at[c.type] || at.text, C = a.selectedFieldId === c.id, k = c.placementSource === Ge.AUTO_LINKED, V = document.createElement("div"), Z = k ? "border-dashed" : "border-solid";
      V.className = `field-overlay absolute cursor-move ${L.border} border-2 ${Z} rounded`, V.style.cssText = `
          left: ${c.x * a.scale}px;
          top: ${c.y * a.scale}px;
          width: ${c.width * a.scale}px;
          height: ${c.height * a.scale}px;
          background-color: ${L.fill};
          ${C ? "box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5);" : ""}
        `, V.dataset.instanceId = c.id;
      const be = document.createElement("div");
      if (be.className = `absolute -top-5 left-0 text-xs whitespace-nowrap px-1 rounded text-white ${L.bg}`, be.textContent = `${c.type.replace("_", " ")} - ${c.participantName}`, V.appendChild(be), k) {
        const Le = document.createElement("div");
        Le.className = "absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center", Le.title = "Auto-linked from template", Le.innerHTML = `<svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>`, V.appendChild(Le);
      }
      const ge = document.createElement("div");
      ge.className = "absolute bottom-0 right-0 w-3 h-3 bg-white border border-gray-400 cursor-se-resize", ge.style.cssText = "transform: translate(50%, 50%);", V.appendChild(ge);
      const Ne = document.createElement("button");
      Ne.type = "button", Ne.className = "absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600", Ne.innerHTML = "×", Ne.addEventListener("click", (Le) => {
        Le.stopPropagation(), qe(c.id);
      }), V.appendChild(Ne), V.addEventListener("mousedown", (Le) => {
        Le.target === ge ? We(Le, c) : Le.target !== Ne && Me(Le, c, V);
      }), V.addEventListener("click", () => {
        a.selectedFieldId = c.id, _e();
      }), o.appendChild(V);
    }));
  }
  function ce(r, o, c, L = {}) {
    const C = ht[r.fieldType] || ht.text, k = L.placementSource || Ge.MANUAL, V = L.linkGroupId || Xt(a.linkGroupState, r.definitionId)?.id, Z = {
      id: u("fi"),
      definitionId: r.definitionId,
      type: r.fieldType,
      participantId: r.participantId,
      participantName: r.participantName,
      page: a.currentPage,
      x: Math.max(0, o - C.width / 2),
      y: Math.max(0, c - C.height / 2),
      width: C.width,
      height: C.height,
      placementSource: k,
      linkGroupId: V,
      linkedFromFieldId: L.linkedFromFieldId
    };
    a.fieldInstances.push(Z), G(r.definitionId), k === Ge.MANUAL && V && De(Z), _e(), ie(), M();
  }
  function me(r, o) {
    const c = {
      id: u("instance"),
      definitionId: r.definitionId,
      type: r.fieldType,
      participantId: r.participantId,
      participantName: r.participantName,
      page: o.page_number,
      x: o.x,
      y: o.y,
      width: o.width,
      height: o.height,
      placementSource: Ge.AUTO,
      resolverId: o.resolver_id,
      confidence: o.confidence,
      placementRunId: h.currentRunId
    };
    a.fieldInstances.push(c), G(r.definitionId), _e(), ie(), M();
  }
  function Me(r, o, c) {
    r.preventDefault(), a.isDragging = !0, a.selectedFieldId = o.id;
    const L = r.clientX, C = r.clientY, k = o.x * a.scale, V = o.y * a.scale;
    function Z(ge) {
      const Ne = ge.clientX - L, Le = ge.clientY - C;
      o.x = Math.max(0, (k + Ne) / a.scale), o.y = Math.max(0, (V + Le) / a.scale), o.placementSource = Ge.MANUAL, c.style.left = `${o.x * a.scale}px`, c.style.top = `${o.y * a.scale}px`;
    }
    function be() {
      a.isDragging = !1, document.removeEventListener("mousemove", Z), document.removeEventListener("mouseup", be), M();
    }
    document.addEventListener("mousemove", Z), document.addEventListener("mouseup", be);
  }
  function We(r, o) {
    r.preventDefault(), r.stopPropagation(), a.isResizing = !0;
    const c = r.clientX, L = r.clientY, C = o.width, k = o.height;
    function V(be) {
      const ge = (be.clientX - c) / a.scale, Ne = (be.clientY - L) / a.scale;
      o.width = Math.max(30, C + ge), o.height = Math.max(20, k + Ne), o.placementSource = Ge.MANUAL, _e();
    }
    function Z() {
      a.isResizing = !1, document.removeEventListener("mousemove", V), document.removeEventListener("mouseup", Z), M();
    }
    document.addEventListener("mousemove", V), document.addEventListener("mouseup", Z);
  }
  function qe(r) {
    const o = a.fieldInstances.find((c) => c.id === r);
    o && (a.fieldInstances = a.fieldInstances.filter((c) => c.id !== r), he(o.definitionId), _e(), ie(), M());
  }
  function ze(r, o) {
    const L = b().canvas;
    !r || !L || (r.addEventListener("dragover", (C) => {
      C.preventDefault(), C.dataTransfer && (C.dataTransfer.dropEffect = "copy"), L.classList.add("ring-2", "ring-blue-500", "ring-inset");
    }), r.addEventListener("dragleave", () => {
      L.classList.remove("ring-2", "ring-blue-500", "ring-inset");
    }), r.addEventListener("drop", (C) => {
      C.preventDefault(), L.classList.remove("ring-2", "ring-blue-500", "ring-inset");
      const k = C.dataTransfer?.getData("application/json") || "";
      if (!k) return;
      const V = JSON.parse(k), Z = L.getBoundingClientRect(), be = (C.clientX - Z.left) / a.scale, ge = (C.clientY - Z.top) / a.scale;
      ce(V, be, ge);
    }));
  }
  function je() {
    const r = b();
    r.prevBtn?.addEventListener("click", async () => {
      a.currentPage > 1 && (a.currentPage -= 1, N(a.currentPage), await Ae(a.currentPage));
    }), r.nextBtn?.addEventListener("click", async () => {
      a.currentPage < a.totalPages && (a.currentPage += 1, N(a.currentPage), await Ae(a.currentPage));
    });
  }
  function ue() {
    const r = b();
    r.zoomIn?.addEventListener("click", async () => {
      a.scale = Math.min(3, a.scale + 0.25), r.zoomLevel && (r.zoomLevel.textContent = `${Math.round(a.scale * 100)}%`), await Ae(a.currentPage);
    }), r.zoomOut?.addEventListener("click", async () => {
      a.scale = Math.max(0.5, a.scale - 0.25), r.zoomLevel && (r.zoomLevel.textContent = `${Math.round(a.scale * 100)}%`), await Ae(a.currentPage);
    }), r.zoomFit?.addEventListener("click", async () => {
      if (!a.pdfDoc || !r.viewer) return;
      const c = (await a.pdfDoc.getPage(a.currentPage)).getViewport({ scale: 1 });
      a.scale = (r.viewer.clientWidth - 40) / c.width, r.zoomLevel && (r.zoomLevel.textContent = `${Math.round(a.scale * 100)}%`), await Ae(a.currentPage);
    });
  }
  function f() {
    return b().policyPreset?.value || "balanced";
  }
  function d(r) {
    return r >= 0.8 ? "bg-green-100 text-green-800" : r >= 0.6 ? "bg-blue-100 text-blue-800" : r >= 0.4 ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-600";
  }
  function I(r) {
    return r >= 0.9 ? "bg-green-100 text-green-800" : r >= 0.7 ? "bg-blue-100 text-blue-800" : r >= 0.5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  }
  function A(r) {
    return r ? r.split("_").map((o) => o.charAt(0).toUpperCase() + o.slice(1)).join(" ") : "Unknown";
  }
  function W(r) {
    r.page_number !== a.currentPage && (a.currentPage = r.page_number, Ae(r.page_number));
    const o = b().overlays;
    if (!o) return;
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
    `, o.appendChild(c), setTimeout(() => c.remove(), 3e3);
  }
  async function te(r, o) {
  }
  function fe() {
    const r = document.getElementById("placement-suggestions-modal");
    if (!r) return;
    const o = r.querySelectorAll('.suggestion-item[data-accepted="true"]');
    o.forEach((c) => {
      const L = Number.parseInt(c.dataset.index || "", 10), C = h.suggestions[L];
      if (!C) return;
      const k = _(C.field_definition_id);
      if (!k) return;
      const V = m(C.field_definition_id);
      if (!V || V.classList.contains("opacity-50")) return;
      const Z = {
        definitionId: C.field_definition_id,
        fieldType: k.type,
        participantId: k.participant_id,
        participantName: V.dataset.participantName || k.participant_name || "Unassigned"
      };
      a.currentPage = C.page_number, me(Z, C);
    }), a.pdfDoc && Ae(a.currentPage), te(o.length, h.suggestions.length - o.length), P(`Applied ${o.length} placement${o.length !== 1 ? "s" : ""}`, "success");
  }
  function se(r) {
    r.querySelectorAll(".accept-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const c = o.closest(".suggestion-item");
        c && (c.classList.add("border-green-500", "bg-green-50"), c.classList.remove("border-red-500", "bg-red-50"), c.dataset.accepted = "true");
      });
    }), r.querySelectorAll(".reject-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const c = o.closest(".suggestion-item");
        c && (c.classList.add("border-red-500", "bg-red-50"), c.classList.remove("border-green-500", "bg-green-50"), c.dataset.accepted = "false");
      });
    }), r.querySelectorAll(".preview-suggestion-btn").forEach((o) => {
      o.addEventListener("click", () => {
        const c = Number.parseInt(o.dataset.index || "", 10), L = h.suggestions[c];
        L && W(L);
      });
    });
  }
  function ne() {
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
    `, H(r, "#close-suggestions-modal")?.addEventListener("click", () => {
      r.classList.add("hidden");
    }), r.addEventListener("click", (o) => {
      o.target === r && r.classList.add("hidden");
    }), H(r, "#accept-all-btn")?.addEventListener("click", () => {
      r.querySelectorAll(".suggestion-item").forEach((o) => {
        o.classList.add("border-green-500", "bg-green-50"), o.classList.remove("border-red-500", "bg-red-50"), o.dataset.accepted = "true";
      });
    }), H(r, "#reject-all-btn")?.addEventListener("click", () => {
      r.querySelectorAll(".suggestion-item").forEach((o) => {
        o.classList.add("border-red-500", "bg-red-50"), o.classList.remove("border-green-500", "bg-green-50"), o.dataset.accepted = "false";
      });
    }), H(r, "#apply-suggestions-btn")?.addEventListener("click", () => {
      fe(), r.classList.add("hidden");
    }), H(r, "#rerun-placement-btn")?.addEventListener("click", () => {
      r.classList.add("hidden");
      const o = R(r, "#placement-policy-preset-modal"), c = b().policyPreset;
      c && o && (c.value = o.value), b().autoPlaceBtn?.click();
    }), r;
  }
  function K(r) {
    let o = document.getElementById("placement-suggestions-modal");
    o || (o = ne(), document.body.appendChild(o));
    const c = R(o, "#suggestions-list"), L = R(o, "#resolver-info"), C = R(o, "#run-stats");
    !c || !L || !C || (L.innerHTML = h.resolverScores.map((k) => `
      <div class="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
        <span class="font-medium capitalize">${T(String(k?.resolver_id || "").replace(/_/g, " "))}</span>
        <div class="flex items-center gap-2">
          ${k.supported ? `
            <span class="px-1.5 py-0.5 rounded text-xs ${d(Number(k.score || 0))}">
              ${(Number(k?.score || 0) * 100).toFixed(0)}%
            </span>
          ` : `
            <span class="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-xs">N/A</span>
          `}
        </div>
      </div>
    `).join(""), C.innerHTML = `
      <div class="flex items-center gap-4 text-xs text-gray-600">
        <span>Run: <code class="bg-gray-100 px-1 rounded">${T(String(r?.run_id || "").slice(0, 8) || "N/A")}</code></span>
        <span>Status: <span class="font-medium ${r.status === "completed" ? "text-green-600" : "text-amber-600"}">${T(String(r?.status || "unknown"))}</span></span>
        <span>Time: ${Math.max(0, Number(r?.elapsed_ms || 0))}ms</span>
      </div>
    `, c.innerHTML = h.suggestions.map((k, V) => {
      const Z = _(k.field_definition_id), be = at[Z?.type || "text"] || at.text, ge = T(String(Z?.type || "field").replace(/_/g, " ")), Ne = T(String(k?.id || "")), Le = Math.max(1, Number(k?.page_number || 1)), Ye = Math.round(Number(k?.x || 0)), Te = Math.round(Number(k?.y || 0)), S = Math.max(0, Number(k?.confidence || 0)), v = T(A(String(k?.resolver_id || "")));
      return `
        <div class="suggestion-item p-3 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors" data-index="${V}" data-suggestion-id="${Ne}">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded ${be.bg}"></span>
              <div>
                <div class="font-medium text-sm capitalize">${ge}</div>
                <div class="text-xs text-gray-500">Page ${Le}, (${Ye}, ${Te})</div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="confidence-badge px-2 py-0.5 rounded-full text-xs font-medium ${I(Number(k.confidence || 0))}">
                ${(S * 100).toFixed(0)}%
              </span>
              <span class="resolver-badge px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs">
                ${v}
              </span>
            </div>
          </div>
          <div class="flex items-center gap-2 mt-3">
            <button type="button" class="accept-suggestion-btn flex-1 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded hover:bg-green-100 transition-colors" data-index="${V}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              Accept
            </button>
            <button type="button" class="reject-suggestion-btn flex-1 px-3 py-1.5 bg-red-50 text-red-700 text-xs font-medium rounded hover:bg-red-100 transition-colors" data-index="${V}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
              Reject
            </button>
            <button type="button" class="preview-suggestion-btn px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded hover:bg-blue-100 transition-colors" data-index="${V}">
              <svg class="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              Preview
            </button>
          </div>
        </div>
      `;
    }).join(""), se(o), o.classList.remove("hidden"));
  }
  function j() {
    const r = $();
    let o = 100;
    r.forEach((c) => {
      const L = {
        definitionId: c.dataset.definitionId || "",
        fieldType: c.dataset.fieldType || "text",
        participantId: c.dataset.participantId || "",
        participantName: c.dataset.participantName || "Unassigned"
      }, C = ht[L.fieldType || "text"] || ht.text;
      a.currentPage = a.totalPages, ce(L, 300, o + C.height / 2, { placementSource: Ge.AUTO_FALLBACK }), o += C.height + 20;
    }), a.pdfDoc && Ae(a.totalPages), P("Fields placed using fallback layout", "info");
  }
  async function le() {
    const r = b();
    if (!r.autoPlaceBtn || h.isRunning) return;
    if ($().length === 0) {
      P("All fields are already placed", "info");
      return;
    }
    const c = document.querySelector('input[name="id"]')?.value;
    if (!c) {
      j();
      return;
    }
    h.isRunning = !0, r.autoPlaceBtn.disabled = !0, r.autoPlaceBtn.innerHTML = `
      <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Analyzing...
    `;
    try {
      const L = await fetch(`${t}/esign/agreements/${c}/auto-place`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          policy_preset: f()
        })
      });
      if (!L.ok)
        throw await F(L, "Auto-placement failed");
      const C = await L.json(), k = Hn(C) ? C.run || {} : C;
      h.currentRunId = k?.run_id || k?.id || null, h.suggestions = k?.suggestions || [], h.resolverScores = k?.resolver_scores || [], h.suggestions.length === 0 ? (P("No placement suggestions found. Try placing fields manually.", "warning"), j()) : K(k);
    } catch (L) {
      console.error("Auto-place error:", L);
      const C = L && typeof L == "object" ? L : {}, k = x(C.message || "Auto-placement failed", C.code || "", C.status || 0);
      P(`Auto-placement failed: ${k}`, "error"), j();
    } finally {
      h.isRunning = !1, r.autoPlaceBtn.disabled = !1, r.autoPlaceBtn.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        Auto-place
      `;
    }
  }
  function z() {
    const r = b();
    r.autoPlaceBtn && !a.autoPlaceBound && (r.autoPlaceBtn.addEventListener("click", () => {
      le();
    }), a.autoPlaceBound = !0);
  }
  async function oe() {
    const r = b();
    if (!i?.value) {
      r.loading?.classList.add("hidden"), r.noDocument?.classList.remove("hidden");
      return;
    }
    r.loading?.classList.remove("hidden"), r.noDocument?.classList.add("hidden");
    const o = y(), c = new Set(
      o.map((Z) => String(Z.definitionId || "").trim()).filter((Z) => Z)
    );
    a.fieldInstances = a.fieldInstances.filter(
      (Z) => c.has(String(Z.definitionId || "").trim())
    ), Ee();
    const L = ++a.loadRequestVersion, C = String(i.value || "").trim(), k = encodeURIComponent(C), V = `${e}/panels/esign_documents/${k}/source/pdf`;
    try {
      const be = await Gt({
        url: V,
        withCredentials: !0,
        surface: "agreement-placement-editor",
        documentId: C
      }).promise;
      if (L !== a.loadRequestVersion)
        return;
      a.pdfDoc = be, a.totalPages = a.pdfDoc.numPages, a.currentPage = 1, r.totalPages && (r.totalPages.textContent = String(a.totalPages)), await Ae(a.currentPage), r.loading?.classList.add("hidden"), a.uiHandlersBound || (ze(r.viewer, r.overlays), je(), ue(), a.uiHandlersBound = !0), _e();
    } catch (Z) {
      if (L !== a.loadRequestVersion)
        return;
      const be = jt(Z, {
        surface: "agreement-placement-editor",
        documentId: C,
        url: V
      });
      r.loading?.classList.add("hidden"), r.noDocument?.classList.remove("hidden"), r.noDocument && (r.noDocument.textContent = `Failed to load PDF: ${x(
        be.message,
        be.code,
        be.status || void 0
      )}`);
    }
    ie(), M({ silent: !0 });
  }
  function ae(r) {
    const o = Array.isArray(r?.fieldPlacements) ? r.fieldPlacements : [];
    a.fieldInstances = o.map((c, L) => pt(c, L)), M({ silent: !0 });
  }
  return M({ silent: !0 }), {
    bindEvents: z,
    initPlacementEditor: oe,
    getState: g,
    getLinkGroupState: U,
    setLinkGroupState: J,
    buildPlacementFormEntries: q,
    updateFieldInstancesFormData: M,
    restoreFieldPlacementsFromState: ae
  };
}
function ct(n, e = !1) {
  return typeof n == "boolean" ? n : e;
}
function Ut(n) {
  const e = Array.isArray(n?.participants) ? n?.participants : [];
  return {
    enabled: !!n?.enabled,
    gate: String(n?.gate || "approve_before_send").trim() || "approve_before_send",
    commentsEnabled: !!n?.commentsEnabled,
    participants: e.map((t) => ({
      participantType: String(t?.participantType || "").trim() || "recipient",
      participantTempId: String(t?.participantTempId || "").trim() || void 0,
      recipientTempId: String(t?.recipientTempId || "").trim() || void 0,
      recipientId: String(t?.recipientId || "").trim() || void 0,
      email: String(t?.email || "").trim() || void 0,
      displayName: String(t?.displayName || "").trim() || void 0,
      canComment: ct(t?.canComment, !0),
      canApprove: ct(t?.canApprove, !0)
    }))
  };
}
function Gn(n) {
  const {
    getSignerParticipants: e,
    setPrimaryActionLabel: t,
    onChanged: i
  } = n, s = document.getElementById("agreement-review-mode-send"), l = document.getElementById("agreement-review-mode-start"), p = document.getElementById("agreement-start-review-config"), y = document.getElementById("agreement-review-gate"), _ = document.getElementById("agreement-review-comments-enabled"), F = document.getElementById("agreement-review-recipient-reviewers"), x = document.getElementById("agreement-review-external-reviewers"), P = document.getElementById("agreement-review-external-reviewers-empty"), T = document.getElementById("agreement-review-external-reviewer-template"), w = document.getElementById("agreement-add-external-reviewer-btn");
  function a() {
    return l instanceof HTMLInputElement ? l.checked : !1;
  }
  function h() {
    t(a() ? "Start Review" : "Send for Signature");
  }
  function u() {
    const J = !!x?.querySelector("[data-review-external-row]");
    P?.classList.toggle("hidden", J);
  }
  function m() {
    p?.classList.toggle("hidden", !a()), h();
  }
  function $(J) {
    if (!(T instanceof HTMLTemplateElement) || !x)
      return;
    const q = T.content.cloneNode(!0), M = q.querySelector("[data-review-external-row]");
    if (!M)
      return;
    const ie = M.querySelector("[data-review-external-name]"), G = M.querySelector("[data-review-external-email]"), he = M.querySelector("[data-review-external-comment]"), Se = M.querySelector("[data-review-external-approve]");
    ie && (ie.value = String(J?.displayName || "").trim()), G && (G.value = String(J?.email || "").trim()), he && (he.checked = ct(J?.canComment, !0)), Se && (Se.checked = ct(J?.canApprove, !0)), x.appendChild(q), u();
  }
  function H() {
    const J = [];
    F?.querySelectorAll("[data-review-recipient-row]").forEach((M) => {
      M.querySelector("[data-review-recipient-enabled]")?.checked && J.push({
        participantType: "recipient",
        participantTempId: String(M.dataset.participantTempId || "").trim() || void 0,
        recipientTempId: String(M.dataset.participantTempId || "").trim() || void 0,
        email: String(M.dataset.email || "").trim() || void 0,
        displayName: String(M.dataset.name || "").trim() || void 0,
        canComment: M.querySelector("[data-review-recipient-comment]")?.checked !== !1,
        canApprove: M.querySelector("[data-review-recipient-approve]")?.checked !== !1
      });
    });
    const q = [];
    return x?.querySelectorAll("[data-review-external-row]").forEach((M) => {
      const ie = String(M.querySelector("[data-review-external-email]")?.value || "").trim();
      ie !== "" && q.push({
        participantType: "external",
        email: ie,
        displayName: String(M.querySelector("[data-review-external-name]")?.value || "").trim() || void 0,
        canComment: M.querySelector("[data-review-external-comment]")?.checked !== !1,
        canApprove: M.querySelector("[data-review-external-approve]")?.checked !== !1
      });
    }), {
      enabled: a(),
      gate: String(y instanceof HTMLSelectElement ? y.value : "approve_before_send").trim() || "approve_before_send",
      commentsEnabled: _ instanceof HTMLInputElement ? _.checked : !1,
      participants: [...J, ...q]
    };
  }
  function R(J) {
    if (!F)
      return;
    const q = Ut(J), M = /* @__PURE__ */ new Map();
    q.participants.filter((G) => String(G.participantType || "").trim() === "recipient").forEach((G) => {
      const he = String(G.participantTempId || G.recipientTempId || G.recipientId || "").trim();
      he !== "" && M.set(he, G);
    });
    const ie = e();
    F.innerHTML = ie.map((G) => {
      const he = String(G.id || "").trim(), Se = M.get(he), X = !!Se, de = Se ? ct(Se.canComment, !0) : !0, ee = Se ? ct(Se.canApprove, !0) : !0;
      return `
        <div class="rounded-lg border border-gray-200 bg-white p-3" data-review-recipient-row data-participant-temp-id="${Ue(he)}" data-email="${Ue(G.email)}" data-name="${Ue(G.name)}">
          <div class="flex items-start justify-between gap-3">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" class="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600" data-review-recipient-enabled ${X ? "checked" : ""}>
              <span>
                <span class="block text-sm font-medium text-gray-900">${Ue(G.name || G.email || "Signer")}</span>
                <span class="block text-xs text-gray-500">${Ue(G.email)}</span>
              </span>
            </label>
            <div class="flex flex-col gap-1.5 text-xs">
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to add comments">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-comment ${de ? "checked" : ""}>
                <span class="text-gray-600">Comment</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer" title="Allow this reviewer to approve or request changes">
                <input type="checkbox" class="h-3.5 w-3.5 rounded border-gray-300 text-blue-600" data-review-recipient-approve ${ee ? "checked" : ""}>
                <span class="text-gray-600">Approve</span>
              </label>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
  function b() {
    R(H());
  }
  function g(J) {
    const q = Ut(J?.review);
    s instanceof HTMLInputElement && (s.checked = !q.enabled), l instanceof HTMLInputElement && (l.checked = q.enabled), y instanceof HTMLSelectElement && (y.value = q.gate), _ instanceof HTMLInputElement && (_.checked = q.commentsEnabled), R(q), x && (x.innerHTML = "", q.participants.filter((M) => String(M.participantType || "").trim() === "external").forEach((M) => $(M)), u()), m();
  }
  function U() {
    [s, l].forEach((J) => {
      J?.addEventListener("change", () => {
        m(), i?.();
      });
    }), y?.addEventListener("change", () => i?.()), _?.addEventListener("change", () => i?.()), F?.addEventListener("change", () => i?.()), x?.addEventListener("input", () => i?.()), x?.addEventListener("change", () => i?.()), x?.addEventListener("click", (J) => {
      const q = J.target;
      !(q instanceof HTMLElement) || !q.matches("[data-review-external-remove]") || (q.closest("[data-review-external-row]")?.remove(), u(), i?.());
    }), w?.addEventListener("click", () => {
      $(), i?.();
    }), m(), u();
  }
  return {
    bindEvents: U,
    collectReviewConfigForState: H,
    restoreFromState: g,
    refreshRecipientReviewers: b,
    isStartReviewEnabled: a
  };
}
function st(n, e, t = "") {
  return String(n.querySelector(e)?.value || t).trim();
}
function qt(n, e, t = !1) {
  const i = n.querySelector(e);
  return i ? i.checked : t;
}
function Wn(n) {
  const {
    documentIdInput: e,
    documentPageCountInput: t,
    titleInput: i,
    messageInput: s,
    participantsContainer: l,
    fieldDefinitionsContainer: p,
    fieldPlacementsJSONInput: y,
    fieldRulesJSONInput: _,
    collectFieldRulesForForm: F,
    buildPlacementFormEntries: x,
    getCurrentStep: P,
    totalWizardSteps: T
  } = n;
  function w() {
    const a = [];
    l.querySelectorAll(".participant-entry").forEach(($) => {
      const H = String($.getAttribute("data-participant-id") || "").trim(), R = st($, 'input[name*=".name"]'), b = st($, 'input[name*=".email"]'), g = st($, 'select[name*=".role"]', "signer"), U = qt($, ".notify-input", !0), J = st($, ".signing-stage-input"), q = Number(J || "1") || 1;
      a.push({
        id: H,
        name: R,
        email: b,
        role: g,
        notify: U,
        signing_stage: g === "signer" ? q : 0
      });
    });
    const h = [];
    p.querySelectorAll(".field-definition-entry").forEach(($) => {
      const H = String($.getAttribute("data-field-definition-id") || "").trim(), R = st($, ".field-type-select", "signature"), b = st($, ".field-participant-select"), g = Number(st($, 'input[name*=".page"]', "1")) || 1, U = qt($, 'input[name*=".required"]');
      H && h.push({
        id: H,
        type: R,
        participant_id: b,
        page: g,
        required: U
      });
    });
    const u = x(), m = JSON.stringify(u);
    return y && (y.value = m), {
      document_id: String(e?.value || "").trim(),
      title: String(i?.value || "").trim(),
      message: String(s?.value || "").trim(),
      participants: a,
      field_instances: h,
      field_placements: u,
      field_placements_json: m,
      field_rules: F(),
      field_rules_json: String(_?.value || "[]"),
      send_for_signature: P() === T ? 1 : 0,
      recipients_present: 1,
      fields_present: 1,
      field_instances_present: 1,
      document_page_count: Number(t?.value || "0") || 0
    };
  }
  return {
    buildCanonicalAgreementPayload: w
  };
}
function Vn(n) {
  const {
    titleSource: e,
    stateManager: t,
    trackWizardStateChanges: i,
    participantsController: s,
    fieldDefinitionsController: l,
    placementController: p,
    reviewConfigController: y,
    updateFieldParticipantOptions: _,
    previewCard: F,
    wizardNavigationController: x,
    documentIdInput: P,
    documentPageCountInput: T,
    selectedDocumentTitle: w,
    agreementRefs: a,
    parsePositiveInt: h,
    isEditMode: u
  } = n;
  let m = null, $ = !1;
  function H(X) {
    $ = !0;
    try {
      return X();
    } finally {
      $ = !1;
    }
  }
  function R(X) {
    const de = X?.document, ee = document.getElementById("selected-document"), ye = document.getElementById("document-picker"), pe = document.getElementById("selected-document-info");
    if (P.value = String(de?.id || "").trim(), T) {
      const Ee = h(de?.pageCount, 0) || 0;
      T.value = Ee > 0 ? String(Ee) : "";
    }
    if (w && (w.textContent = String(de?.title || "").trim()), pe instanceof HTMLElement) {
      const Ee = h(de?.pageCount, 0) || 0;
      pe.textContent = Ee > 0 ? `${Ee} pages` : "";
    }
    if (P.value) {
      ee?.classList.remove("hidden"), ye?.classList.add("hidden");
      return;
    }
    ee?.classList.add("hidden"), ye?.classList.remove("hidden");
  }
  function b(X) {
    a.form.titleInput.value = String(X?.details?.title || ""), a.form.messageInput.value = String(X?.details?.message || "");
  }
  function g() {
    $ || (m !== null && clearTimeout(m), m = setTimeout(() => {
      i();
    }, 500));
  }
  function U(X) {
    s.restoreFromState(X);
  }
  function J(X) {
    l.restoreFieldDefinitionsFromState(X);
  }
  function q(X) {
    l.restoreFieldRulesFromState(X);
  }
  function M(X) {
    p.restoreFieldPlacementsFromState(X);
  }
  function ie(X) {
    y?.restoreFromState?.(X);
  }
  function G() {
    P && new MutationObserver(() => {
      $ || i();
    }).observe(P, { attributes: !0, attributeFilter: ["value"] });
    const X = document.getElementById("title"), de = document.getElementById("message");
    X instanceof HTMLInputElement && X.addEventListener("input", () => {
      const ee = String(X.value || "").trim() === "" ? e.AUTOFILL : e.USER;
      t.setTitleSource(ee), g();
    }), (de instanceof HTMLInputElement || de instanceof HTMLTextAreaElement) && de.addEventListener("input", g), s.refs.participantsContainer?.addEventListener("input", g), s.refs.participantsContainer?.addEventListener("change", g), l.refs.fieldDefinitionsContainer?.addEventListener("input", g), l.refs.fieldDefinitionsContainer?.addEventListener("change", g), l.refs.fieldRulesContainer?.addEventListener("input", g), l.refs.fieldRulesContainer?.addEventListener("change", g);
  }
  function he(X, de = {}) {
    H(() => {
      if (R(X), b(X), U(X), J(X), q(X), _(), M(X), ie(X), de.updatePreview !== !1) {
        const ye = X?.document;
        ye?.id ? F.setDocument(
          ye.id,
          ye.title || null,
          ye.pageCount ?? null
        ) : F.clear();
      }
      const ee = h(
        de.step ?? X?.currentStep,
        x.getCurrentStep()
      ) || 1;
      x.setCurrentStep(ee), x.updateWizardUI();
    });
  }
  function Se() {
    if (x.updateWizardUI(), P.value) {
      const X = w?.textContent || null, de = h(T?.value, 0) || null;
      F.setDocument(P.value, X, de);
    } else
      F.clear();
    u && a.sync.indicator?.classList.add("hidden");
  }
  return {
    bindChangeTracking: G,
    debouncedTrackChanges: g,
    applyStateToUI: he,
    renderInitialWizardUI: Se
  };
}
function Kn(n) {
  return n.querySelector('select[name*=".role"]');
}
function Yn(n) {
  return n.querySelector(".field-participant-select");
}
function Jn(n) {
  const {
    documentIdInput: e,
    titleInput: t,
    participantsContainer: i,
    fieldDefinitionsContainer: s,
    fieldRulesContainer: l,
    addFieldBtn: p,
    ensureSelectedDocumentCompatibility: y,
    collectFieldRulesForState: _,
    findSignersMissingRequiredSignatureField: F,
    missingSignatureFieldMessage: x,
    announceError: P
  } = n;
  function T(w) {
    switch (w) {
      case 1:
        return e.value ? !!y() : (P("Please select a document"), !1);
      case 2:
        return t.value.trim() ? !0 : (P("Please enter an agreement title"), t.focus(), !1);
      case 3: {
        const a = i.querySelectorAll(".participant-entry");
        if (a.length === 0)
          return P("Please add at least one participant"), !1;
        let h = !1;
        return a.forEach((u) => {
          Kn(u)?.value === "signer" && (h = !0);
        }), h ? !0 : (P("At least one signer is required"), !1);
      }
      case 4: {
        const a = s.querySelectorAll(".field-definition-entry");
        for (const $ of Array.from(a)) {
          const H = Yn($);
          if (!H?.value)
            return P("Please assign all fields to a signer"), H?.focus(), !1;
        }
        if (_().find(($) => !$.participantId))
          return P("Please assign all automation rules to a signer"), l?.querySelector(".field-rule-participant-select")?.focus(), !1;
        const m = F();
        return m.length > 0 ? (P(x(m)), p.focus(), !1) : !0;
      }
      case 5:
        return !0;
      default:
        return !0;
    }
  }
  return {
    validateStep: T
  };
}
function Xn(n) {
  const {
    isEditMode: e,
    storageKey: t,
    stateManager: i,
    syncOrchestrator: s,
    syncService: l,
    applyResumedState: p,
    hasMeaningfulWizardProgress: y,
    formatRelativeTime: _,
    emitWizardTelemetry: F,
    getActiveTabDebugState: x
  } = n;
  function P(R, b) {
    return i.normalizeLoadedState({
      ...b,
      currentStep: R.currentStep,
      document: R.document,
      details: R.details,
      participants: R.participants,
      fieldDefinitions: R.fieldDefinitions,
      fieldPlacements: R.fieldPlacements,
      fieldRules: R.fieldRules,
      titleSource: R.titleSource,
      syncPending: !0,
      serverDraftId: b.serverDraftId,
      serverRevision: b.serverRevision,
      lastSyncedAt: b.lastSyncedAt
    });
  }
  async function T() {
    if (e) return i.getState();
    const R = i.normalizeLoadedState(i.getState());
    Ve("resume_reconcile_start", Pe({
      state: R,
      storageKey: t,
      ownership: x?.() || void 0,
      sendAttemptId: null,
      extra: {
        source: "local_bootstrap"
      }
    }));
    const b = String(R?.serverDraftId || "").trim();
    if (!b) {
      if (!y(R))
        try {
          const g = await l.bootstrap();
          return i.setState({
            ...g.snapshot?.data?.wizard_state && typeof g.snapshot.data.wizard_state == "object" ? g.snapshot.data.wizard_state : {},
            resourceRef: g.resourceRef,
            serverDraftId: String(g.snapshot?.ref?.id || "").trim() || null,
            serverRevision: Number(g.snapshot?.revision || 0),
            lastSyncedAt: String(g.snapshot?.updatedAt || "").trim() || null,
            syncPending: !1
          }, { syncPending: !1, notify: !1 }), i.getState();
        } catch {
          Ze("resume_reconcile_bootstrap_failed", Pe({
            state: R,
            storageKey: t,
            ownership: x?.() || void 0,
            sendAttemptId: null,
            extra: {
              source: "bootstrap_failed_keep_local"
            }
          }));
        }
      return i.setState(R, { syncPending: !!R.syncPending, notify: !1 }), Ve("resume_reconcile_complete", Pe({
        state: R,
        storageKey: t,
        ownership: x?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "local_only"
        }
      })), i.getState();
    }
    try {
      const g = await l.load(b), U = i.normalizeLoadedState({
        ...g?.wizard_state && typeof g.wizard_state == "object" ? g.wizard_state : {},
        resourceRef: g?.resource_ref || R.resourceRef || null,
        serverDraftId: String(g?.id || b).trim() || b,
        serverRevision: Number(g?.revision || 0),
        lastSyncedAt: String(g?.updated_at || g?.updatedAt || "").trim() || R.lastSyncedAt,
        syncPending: !1
      }), J = String(R.serverDraftId || "").trim() === String(U.serverDraftId || "").trim(), q = J && R.syncPending === !0 ? P(R, U) : U;
      return i.setState(q, { syncPending: !!q.syncPending, notify: !1 }), Ve("resume_reconcile_complete", Pe({
        state: q,
        storageKey: t,
        ownership: x?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: J && R.syncPending === !0 ? "merged_local_over_remote" : "remote_draft",
          loadedDraftId: String(g?.id || b).trim() || null,
          loadedRevision: Number(g?.revision || 0)
        }
      })), i.getState();
    } catch (g) {
      const U = typeof g == "object" && g !== null && "status" in g ? Number(g.status || 0) : 0;
      if (U === 404) {
        const J = i.normalizeLoadedState({
          ...R,
          serverDraftId: null,
          serverRevision: 0,
          lastSyncedAt: null
        });
        return i.setState(J, { syncPending: !!J.syncPending, notify: !1 }), Ze("resume_reconcile_remote_missing", Pe({
          state: J,
          storageKey: t,
          ownership: x?.() || void 0,
          sendAttemptId: null,
          extra: {
            source: "remote_missing_reset_local",
            staleDraftId: b,
            status: U
          }
        })), i.getState();
      }
      return Ze("resume_reconcile_failed", Pe({
        state: R,
        storageKey: t,
        ownership: x?.() || void 0,
        sendAttemptId: null,
        extra: {
          source: "reconcile_failed_keep_local",
          staleDraftId: b,
          status: U
        }
      })), i.getState();
    }
  }
  function w(R) {
    return document.getElementById(R);
  }
  function a() {
    const R = document.getElementById("resume-dialog-modal"), b = i.getState(), g = String(b?.document?.title || "").trim() || String(b?.document?.id || "").trim() || "Unknown document", U = w("resume-draft-title"), J = w("resume-draft-document"), q = w("resume-draft-step"), M = w("resume-draft-time");
    U && (U.textContent = b.details?.title || "Untitled Agreement"), J && (J.textContent = g), q && (q.textContent = String(b.currentStep || 1)), M && (M.textContent = _(b.updatedAt)), R?.classList.remove("hidden"), F("wizard_resume_prompt_shown", {
      step: Number(b.currentStep || 1),
      has_server_draft: !!b.serverDraftId
    });
  }
  async function h(R = {}) {
    const b = R.deleteServerDraft === !0, g = String(i.getState()?.serverDraftId || "").trim();
    if (i.clear(), s.broadcastStateUpdate(), g && s.broadcastDraftDisposed?.(g, b ? "resume_clear_delete" : "resume_clear_local"), !(!b || !g))
      try {
        await l.dispose(g);
      } catch (U) {
        console.warn("Failed to delete server draft:", U);
      }
  }
  function u() {
    return i.normalizeLoadedState({
      ...i.getState(),
      ...i.collectFormState(),
      syncPending: !0,
      serverDraftId: null,
      serverRevision: 0,
      lastSyncedAt: null
    });
  }
  async function m(R) {
    document.getElementById("resume-dialog-modal")?.classList.add("hidden");
    const b = u();
    switch (R) {
      case "continue":
        !String(i.getState()?.serverDraftId || "").trim() && y(b) && await l.create(b), p(i.getState());
        return;
      case "start_new":
        await h({ deleteServerDraft: !1 }), y(b) ? await l.create(b) : await T(), p(i.getState());
        return;
      case "proceed":
        await h({ deleteServerDraft: !0 }), y(b) ? await l.create(b) : await T(), p(i.getState());
        return;
      case "discard":
        await h({ deleteServerDraft: !0 }), await T(), p(i.getState());
        return;
      default:
        return;
    }
  }
  function $() {
    document.getElementById("resume-continue-btn")?.addEventListener("click", () => {
      m("continue");
    }), document.getElementById("resume-proceed-btn")?.addEventListener("click", () => {
      m("proceed");
    }), document.getElementById("resume-new-btn")?.addEventListener("click", () => {
      m("start_new");
    }), document.getElementById("resume-discard-btn")?.addEventListener("click", () => {
      m("discard");
    });
  }
  async function H() {
    e || (await T(), i.hasResumableState() && a());
  }
  return {
    bindEvents: $,
    reconcileBootstrapState: T,
    maybeShowResumeDialog: H
  };
}
function Zn(n) {
  const {
    agreementRefs: e,
    formAnnouncements: t,
    stateManager: i
  } = n;
  let s = "saved";
  function l(w) {
    return Wt(w, {
      emptyFallback: "unknown",
      invalidFallback: "Invalid Date"
    });
  }
  function p() {
    const w = i.getState();
    s === "paused" && y(w?.syncPending ? "pending" : "saved");
  }
  function y(w) {
    s = String(w || "").trim() || "saved";
    const a = e.sync.indicator, h = e.sync.icon, u = e.sync.text, m = e.sync.retryBtn;
    if (!(!a || !h || !u))
      switch (a.classList.remove("hidden"), w) {
        case "saved":
          h.className = "w-2 h-2 rounded-full bg-green-500", u.textContent = "Saved", u.className = "text-gray-600", m?.classList.add("hidden");
          break;
        case "saving":
          h.className = "w-2 h-2 rounded-full bg-blue-500 animate-pulse", u.textContent = "Saving...", u.className = "text-gray-600", m?.classList.add("hidden");
          break;
        case "pending":
          h.className = "w-2 h-2 rounded-full bg-gray-400", u.textContent = "Unsaved changes", u.className = "text-gray-500", m?.classList.add("hidden");
          break;
        case "error":
          h.className = "w-2 h-2 rounded-full bg-amber-500", u.textContent = "Not synced", u.className = "text-amber-600", m?.classList.remove("hidden");
          break;
        case "paused":
          h.className = "w-2 h-2 rounded-full bg-slate-400", u.textContent = "Open in another tab", u.className = "text-slate-600", m?.classList.add("hidden");
          break;
        case "conflict":
          h.className = "w-2 h-2 rounded-full bg-red-500", u.textContent = "Conflict", u.className = "text-red-600", m?.classList.add("hidden");
          break;
        default:
          a.classList.add("hidden");
      }
  }
  function _(w) {
    const a = i.getState();
    e.conflict.localTime && (e.conflict.localTime.textContent = l(a.updatedAt)), e.conflict.serverRevision && (e.conflict.serverRevision.textContent = String(w || 0)), e.conflict.serverTime && (e.conflict.serverTime.textContent = "newer version"), e.conflict.modal?.classList.remove("hidden");
  }
  function F(w, a = "", h = 0) {
    const u = String(a || "").trim().toUpperCase(), m = String(w || "").trim().toLowerCase();
    return u === "STALE_REVISION" ? "A newer version of this draft exists. Reload the latest draft or force your changes." : u === "DRAFT_SEND_NOT_FOUND" || u === "DRAFT_SESSION_STALE" ? "Your saved draft session was replaced or expired. Please review and click Send again." : u === "ACTIVE_TAB_OWNERSHIP_REQUIRED" ? "This agreement is active in another tab. Take control in this tab before saving or sending." : u === "SCOPE_DENIED" || m.includes("scope denied") ? "You don't have access to this organization's resources." : u === "TRANSPORT_SECURITY" || u === "TRANSPORT_SECURITY_REQUIRED" || m.includes("tls transport required") || Number(h) === 426 ? "This action requires a secure connection. Please access the app using HTTPS." : u === "PDF_UNSUPPORTED" || m === "pdf compatibility unsupported" ? "This document cannot be sent for signature because its PDF is incompatible. Select another document or upload a remediated PDF." : String(w || "").trim() !== "" ? String(w).trim() : "Something went wrong. Please try again.";
  }
  async function x(w, a = "") {
    const h = Number(w?.status || 0);
    let u = "", m = "", $ = {};
    try {
      const H = await w.json();
      u = String(H?.error?.code || H?.code || "").trim(), m = String(H?.error?.message || H?.message || "").trim(), $ = H?.error?.details && typeof H.error.details == "object" ? H.error.details : {}, String($?.entity || "").trim().toLowerCase() === "drafts" && String(u).trim().toUpperCase() === "NOT_FOUND" && (u = "DRAFT_SEND_NOT_FOUND", m === "" && (m = "Draft not found"));
    } catch {
      m = "";
    }
    return m === "" && (m = a || `Request failed (${h || "unknown"})`), {
      status: h,
      code: u,
      details: $,
      message: F(m, u, h)
    };
  }
  function P(w, a = "", h = 0) {
    const u = F(w, a, h);
    t && (t.textContent = u), window.toastManager?.error ? window.toastManager.error(u) : alert(u);
  }
  async function T(w, a = {}) {
    const h = await w;
    return h?.blocked && h.reason === "passive_tab" ? (P(
      "This agreement is active in another tab. Take control in this tab before saving or sending.",
      "ACTIVE_TAB_OWNERSHIP_REQUIRED"
    ), h) : (h?.error && String(a.errorMessage || "").trim() !== "" && P(a.errorMessage || ""), h);
  }
  return {
    announceError: P,
    formatRelativeTime: l,
    mapUserFacingError: F,
    parseAPIError: x,
    restoreSyncStatusFromState: p,
    showSyncConflictDialog: _,
    surfaceSyncOutcome: T,
    updateSyncStatus: y
  };
}
function Qn(n) {
  const {
    createSuccess: e,
    enableServerSync: t = !0,
    stateManager: i,
    syncOrchestrator: s,
    syncService: l,
    applyStateToUI: p,
    surfaceSyncOutcome: y
  } = n;
  function _() {
    const P = i.collectFormState();
    if (!t) {
      i.setState({
        ...i.getState(),
        ...P,
        syncPending: !1
      }, { syncPending: !1 });
      return;
    }
    i.updateState(P), s.scheduleSync(), s.broadcastStateUpdate();
  }
  function F() {
    if (!e)
      return;
    const T = i.getState()?.serverDraftId;
    i.clear(), s.broadcastStateUpdate(), T && (s.broadcastDraftDisposed?.(T, "agreement_created"), l.dispose(T).catch((w) => {
      console.warn("Failed to dispose sync draft after successful create:", w);
    }));
  }
  function x() {
    document.getElementById("sync-retry-btn")?.addEventListener("click", async () => {
      await y(s.manualRetry(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
    }), document.getElementById("conflict-reload-btn")?.addEventListener("click", async () => {
      s.refreshCurrentDraft && (await s.refreshCurrentDraft({ preserveDirty: !1, force: !0 }), p(i.getState())), document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-force-btn")?.addEventListener("click", async () => {
      const P = parseInt(document.getElementById("conflict-server-revision")?.textContent || "0", 10);
      i.setState({
        ...i.getState(),
        serverRevision: P,
        syncPending: !0
      }, { syncPending: !0 });
      const T = await y(s.performSync(), {
        errorMessage: "Unable to sync latest draft changes. Please try again."
      });
      (T?.success || T?.skipped) && document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    }), document.getElementById("conflict-dismiss-btn")?.addEventListener("click", () => {
      document.getElementById("conflict-dialog-modal")?.classList.add("hidden");
    });
  }
  return {
    bindRetryAndConflictHandlers: x,
    handleCreateSuccessCleanup: F,
    trackWizardStateChanges: _
  };
}
const et = {
  USER: "user",
  AUTOFILL: "autofill",
  SERVER_SEED: "server_seed"
};
function Zt(n, e = et.AUTOFILL) {
  const t = String(n || "").trim().toLowerCase();
  return t === et.USER ? et.USER : t === et.SERVER_SEED ? et.SERVER_SEED : t === et.AUTOFILL ? et.AUTOFILL : e;
}
function ei(n, e = 0) {
  if (!n || typeof n != "object") return !1;
  const t = n, i = String(t.name ?? "").trim(), s = String(t.email ?? "").trim(), l = String(t.role ?? "signer").trim().toLowerCase(), p = Number.parseInt(String(t.signingStage ?? t.signing_stage ?? 1), 10), y = t.notify !== !1;
  return i !== "" || s !== "" || l !== "" && l !== "signer" || Number.isFinite(p) && p > 1 || !y ? !0 : e > 0;
}
function Ot(n, e = {}) {
  const {
    normalizeTitleSource: t = Zt,
    titleSource: i = et
  } = e;
  if (!n || typeof n != "object") return !1;
  const s = Number.parseInt(String(n.currentStep ?? 1), 10);
  if (Number.isFinite(s) && s > 1 || String(n.document?.id ?? "").trim() !== "") return !0;
  const p = String(n.details?.title ?? "").trim(), y = String(n.details?.message ?? "").trim(), _ = t(
    n.titleSource,
    p === "" ? i.AUTOFILL : i.USER
  );
  return !!(p !== "" && _ !== i.SERVER_SEED || y !== "" || (Array.isArray(n.participants) ? n.participants : []).some((P, T) => ei(P, T)) || Array.isArray(n.fieldDefinitions) && n.fieldDefinitions.length > 0 || Array.isArray(n.fieldPlacements) && n.fieldPlacements.length > 0 || Array.isArray(n.fieldRules) && n.fieldRules.length > 0 || n.review?.enabled);
}
function ti(n = {}) {
  const e = n || {}, t = String(e.base_path || "").trim(), i = String(e.api_base_path || "").trim() || `${t}/api`, s = i.replace(/\/+$/, ""), l = /\/v\d+$/i.test(s) ? s : `${s}/v1`, p = !!e.is_edit, y = !!e.create_success, _ = String(e.submit_mode || "json").trim().toLowerCase(), F = String(e.agreement_id || "").trim(), x = String(e.active_agreement_id || "").trim(), P = String(e.routes?.documents_upload_url || "").trim() || `${t}/content/esign_documents/new`, T = Array.isArray(e.initial_participants) ? e.initial_participants : [], w = Array.isArray(e.initial_field_instances) ? e.initial_field_instances : [], a = e.sync && typeof e.sync == "object" ? e.sync : {}, h = Array.isArray(a.action_operations) ? a.action_operations.map((H) => String(H || "").trim()).filter(Boolean) : [], u = `${l}/esign`, m = {
    base_url: String(a.base_url || "").trim() || u,
    bootstrap_path: String(a.bootstrap_path || "").trim() || `${u}/sync/bootstrap/agreement-draft`,
    client_base_path: String(a.client_base_path || "").trim() || `${t}/sync-client/sync-core`,
    resource_kind: String(a.resource_kind || "").trim() || "agreement_draft",
    storage_scope: String(a.storage_scope || "").trim(),
    action_operations: h.length > 0 ? h : ["send", "start_review", "dispose"]
  }, $ = {
    sync: m,
    base_path: t,
    api_base_path: i,
    is_edit: p,
    create_success: y,
    submit_mode: _,
    agreement_id: F,
    active_agreement_id: x,
    routes: {
      index: String(e.routes?.index || "").trim(),
      documents: String(e.routes?.documents || "").trim(),
      create: String(e.routes?.create || "").trim(),
      documents_upload_url: P
    },
    initial_participants: T,
    initial_field_instances: w
  };
  return {
    config: e,
    normalizedConfig: $,
    syncConfig: m,
    basePath: t,
    apiBase: i,
    apiVersionBase: l,
    isEditMode: p,
    createSuccess: y,
    submitMode: _,
    agreementID: F,
    activeAgreementID: x,
    documentsUploadURL: P,
    initialParticipants: T,
    initialFieldInstances: w
  };
}
function ni(n = !0) {
  const e = { Accept: "application/json" };
  return n && (e["Content-Type"] = "application/json"), e;
}
function ii(n = {}) {
  const {
    config: e = {},
    isEditMode: t = !1
  } = n, i = t ? "edit" : "create", s = String(e.agreement_id || "").trim().toLowerCase(), l = String(
    e.routes?.create || e.routes?.index || (typeof window < "u" ? window.location.pathname : "") || "agreement-form"
  ).trim().toLowerCase(), y = [
    String(e.sync?.storage_scope || "").trim() || "anonymous",
    i,
    t && s !== "" ? s : l || "agreement-form"
  ].join("|");
  return {
    WIZARD_STATE_VERSION: 2,
    WIZARD_STORAGE_KEY: `esign_wizard_state_v2:${encodeURIComponent(y)}`,
    WIZARD_CHANNEL_NAME: `esign_wizard_sync:${encodeURIComponent(y)}`,
    SYNC_DEBOUNCE_MS: 2e3,
    SYNC_RETRY_DELAYS: [1e3, 2e3, 5e3, 1e4, 3e4],
    TITLE_SOURCE: et
  };
}
function Ht(n, e = "info") {
  const t = document.createElement("div");
  t.className = `fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-sm font-medium z-50 transition-all duration-300 ${e === "success" ? "bg-green-600 text-white" : e === "error" ? "bg-red-600 text-white" : e === "warning" ? "bg-amber-500 text-white" : "bg-gray-800 text-white"}`, t.textContent = n, document.body.appendChild(t), setTimeout(() => {
    t.style.opacity = "0", setTimeout(() => t.remove(), 300);
  }, 3e3);
}
function ot(n, e) {
  if (!n)
    throw new Error(`Agreement form boot failed: missing required ${e}`);
  return n;
}
function ri(n, e) {
  if (!(n instanceof HTMLButtonElement))
    throw new Error(`Agreement form boot failed: missing required ${e}`);
  return n;
}
function si(n = {}) {
  const {
    config: e,
    normalizedConfig: t,
    syncConfig: i,
    basePath: s,
    apiBase: l,
    apiVersionBase: p,
    isEditMode: y,
    createSuccess: _,
    submitMode: F,
    documentsUploadURL: x,
    initialParticipants: P,
    initialFieldInstances: T
  } = ti(n), w = pn(document), {
    WIZARD_STATE_VERSION: a,
    WIZARD_STORAGE_KEY: h,
    WIZARD_CHANNEL_NAME: u,
    SYNC_DEBOUNCE_MS: m,
    SYNC_RETRY_DELAYS: $,
    TITLE_SOURCE: H
  } = ii({
    config: e,
    isEditMode: y
  }), R = wn(), b = (D, re = H.AUTOFILL) => Zt(D, re), g = (D) => Ot(D, {
    normalizeTitleSource: b,
    titleSource: H
  }), U = ln({
    apiBasePath: p,
    basePath: s
  }), J = w.form.root, q = ri(w.form.submitBtn, "submit button"), M = w.form.announcements;
  let ie = null, G = null, he = null, Se = null, X = null, de = null, ee = null, ye = null, pe = null, Ee = It();
  const Be = (D, re = {}) => {
    Se?.applyStateToUI(D, re);
  }, xe = () => Se?.debouncedTrackChanges?.(), Ae = () => ye?.trackWizardStateChanges?.(), Q = (D) => Wt(D, {
    emptyFallback: "unknown",
    invalidFallback: "Invalid Date"
  }), N = () => ee?.restoreSyncStatusFromState(), De = (D) => ee?.updateSyncStatus(D), _e = (D) => ee?.showSyncConflictDialog(D), ce = (D, re = "", we = 0) => ee?.mapUserFacingError(D, re, we) || String(D || "").trim(), me = (D, re) => ee ? ee.parseAPIError(D, re) : Promise.resolve({ status: Number(D.status || 0), code: "", details: {}, message: re }), Me = (D, re = "", we = 0) => ee?.announceError(D, re, we), We = (D, re = {}) => ee ? ee.surfaceSyncOutcome(D, re) : Promise.resolve({}), qe = () => null, ze = mn(w, {
    formatRelativeTime: Q
  }), je = () => ze.render({ coordinationAvailable: !0 }), ue = async (D, re) => {
    const we = await me(D, re), tt = new Error(we.message);
    return tt.code = we.code, tt.status = we.status, tt;
  }, f = {
    hasResumableState: () => d.hasResumableState(),
    setTitleSource: (D, re) => d.setTitleSource(D, re),
    updateDocument: (D) => d.updateDocument(D),
    updateDetails: (D, re) => d.updateDetails(D, re),
    getState: () => {
      const D = d.getState();
      return {
        titleSource: D.titleSource,
        details: D.details && typeof D.details == "object" ? D.details : {}
      };
    }
  }, d = new fn({
    storageKey: h,
    stateVersion: a,
    totalWizardSteps: mt,
    titleSource: H,
    normalizeTitleSource: b,
    parsePositiveInt: ke,
    hasMeaningfulWizardProgress: g,
    collectFormState: () => {
      const D = w.form.documentIdInput?.value || null, re = document.getElementById("selected-document-title")?.textContent?.trim() || null, we = b(
        d.getState()?.titleSource,
        String(w.form.titleInput?.value || "").trim() === "" ? H.AUTOFILL : H.USER
      );
      return {
        document: {
          id: D,
          title: re,
          pageCount: parseInt(w.form.documentPageCountInput?.value || "0", 10) || null
        },
        details: {
          title: w.form.titleInput?.value || "",
          message: w.form.messageInput?.value || ""
        },
        titleSource: we,
        participants: ie?.collectParticipantsForState?.() || [],
        fieldDefinitions: G?.collectFieldDefinitionsForState?.() || [],
        fieldPlacements: he?.getState?.()?.fieldInstances || [],
        fieldRules: G?.collectFieldRulesForState?.() || [],
        review: pe?.collectReviewConfigForState?.() || {
          enabled: !1,
          gate: "approve_before_send",
          commentsEnabled: !1,
          participants: []
        }
      };
    },
    emitTelemetry: R
  });
  d.start(), ee = Zn({
    agreementRefs: w,
    formAnnouncements: M,
    stateManager: d
  });
  const I = new yn({
    stateManager: d,
    requestHeaders: ni,
    syncConfig: i
  });
  let A;
  const W = new Sn({
    channelName: u,
    onCoordinationAvailabilityChange: (D) => {
      N(), ze.render({ coordinationAvailable: D });
    },
    onRemoteSync: (D) => {
      String(d.getState()?.serverDraftId || "").trim() === String(D || "").trim() && (d.getState()?.syncPending || A?.refreshCurrentDraft({ preserveDirty: !0, force: !0 }).then(() => {
        Be(d.getState(), {
          step: Number(d.getState()?.currentStep || 1)
        });
      }));
    },
    onRemoteDraftDisposed: (D) => {
      String(d.getState()?.serverDraftId || "").trim() === String(D || "").trim() && (d.getState()?.syncPending || d.setState({
        ...d.getState(),
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
  A = new bn({
    stateManager: d,
    syncService: I,
    activeTabController: W,
    storageKey: h,
    statusUpdater: De,
    showConflictDialog: _e,
    syncDebounceMs: m,
    syncRetryDelays: $,
    documentRef: document,
    windowRef: window
  });
  const fe = un({
    context: {
      config: t,
      refs: w,
      basePath: s,
      apiBase: l,
      apiVersionBase: p,
      previewCard: U,
      emitTelemetry: R,
      stateManager: d,
      syncService: I,
      activeTabController: W,
      syncController: A
    },
    hooks: {
      renderInitialUI() {
        Se?.renderInitialWizardUI?.();
      },
      startSideEffects() {
        de?.maybeShowResumeDialog?.(), se.loadDocuments(), se.loadRecentDocuments();
      },
      destroy() {
        ze.destroy(), d.destroy();
      }
    }
  }), se = Nn({
    apiBase: l,
    apiVersionBase: p,
    documentsUploadURL: x,
    isEditMode: y,
    titleSource: H,
    normalizeTitleSource: b,
    stateManager: f,
    previewCard: U,
    parseAPIError: ue,
    announceError: Me,
    showToast: Ht,
    mapUserFacingError: ce,
    renderFieldRulePreview: () => G?.renderFieldRulePreview?.()
  });
  se.initializeTitleSourceSeed(), se.bindEvents();
  const ne = ot(se.refs.documentIdInput, "document id input"), K = ot(se.refs.documentSearch, "document search input"), j = se.refs.selectedDocumentTitle, le = se.refs.documentPageCountInput, z = se.ensureSelectedDocumentCompatibility, oe = se.getCurrentDocumentPageCount;
  ie = Bn({
    initialParticipants: P,
    onParticipantsChanged: () => G?.updateFieldParticipantOptions?.()
  }), ie.initialize(), ie.bindEvents();
  const ae = ot(ie.refs.participantsContainer, "participants container"), r = ot(ie.refs.addParticipantBtn, "add participant button"), o = () => ie?.getSignerParticipants() || [];
  G = On({
    initialFieldInstances: T,
    placementSource: Ge,
    getCurrentDocumentPageCount: oe,
    getSignerParticipants: o,
    escapeHtml: Ue,
    onDefinitionsChanged: () => xe(),
    onRulesChanged: () => xe(),
    onParticipantsChanged: () => G?.updateFieldParticipantOptions?.(),
    getPlacementLinkGroupState: () => he?.getLinkGroupState?.() || Ee,
    setPlacementLinkGroupState: (D) => {
      Ee = D || It(), he?.setLinkGroupState?.(Ee);
    }
  }), G.bindEvents(), G.initialize();
  const c = ot(G.refs.fieldDefinitionsContainer, "field definitions container"), L = G.refs.fieldRulesContainer, C = ot(G.refs.addFieldBtn, "add field button"), k = G.refs.fieldPlacementsJSONInput, V = G.refs.fieldRulesJSONInput, Z = () => G?.collectFieldRulesForState() || [], be = () => G?.collectFieldRulesForState() || [], ge = () => G?.collectFieldRulesForForm() || [], Ne = (D, re) => G?.expandRulesForPreview(D, re) || [], Le = () => G?.updateFieldParticipantOptions(), Ye = () => G.collectPlacementFieldDefinitions(), Te = (D) => G?.getFieldDefinitionById(D) || null, S = () => G?.findSignersMissingRequiredSignatureField() || [], v = (D) => G?.missingSignatureFieldMessage(D) || "", E = _n({
    documentIdInput: ne,
    selectedDocumentTitle: j,
    participantsContainer: ae,
    fieldDefinitionsContainer: c,
    submitBtn: q,
    escapeHtml: Ue,
    getSignerParticipants: o,
    getCurrentDocumentPageCount: oe,
    collectFieldRulesForState: be,
    expandRulesForPreview: Ne,
    findSignersMissingRequiredSignatureField: S,
    goToStep: (D) => O.goToStep(D)
  }), B = (D) => {
    q.getAttribute("aria-busy") !== "true" && (q.innerHTML = `
      <svg class="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
      </svg>
      ${D}
    `);
  };
  pe = Gn({
    getSignerParticipants: o,
    setPrimaryActionLabel: B,
    onChanged: () => Ae()
  }), pe.bindEvents(), he = jn({
    apiBase: l,
    apiVersionBase: p,
    documentIdInput: ne,
    fieldPlacementsJSONInput: k,
    initialFieldInstances: G.buildInitialPlacementInstances(),
    initialLinkGroupState: Ee,
    collectPlacementFieldDefinitions: Ye,
    getFieldDefinitionById: Te,
    parseAPIError: ue,
    mapUserFacingError: ce,
    showToast: Ht,
    escapeHtml: Ue,
    onPlacementsChanged: () => Ae()
  }), he.bindEvents(), Ee = he.getLinkGroupState();
  const O = En({
    totalWizardSteps: mt,
    wizardStep: $e,
    nextStepLabels: tn,
    submitBtn: q,
    previewCard: U,
    updateCoordinationUI: je,
    validateStep: (D) => X?.validateStep(D) !== !1,
    onPlacementStep() {
      he.initPlacementEditor();
    },
    onReviewStep() {
      pe?.refreshRecipientReviewers(), E.initSendReadinessCheck();
    },
    onStepChanged(D) {
      d.updateStep(D), Ae(), A.forceSync();
    }
  });
  O.bindEvents(), ye = Qn({
    createSuccess: _,
    enableServerSync: !y && F === "json",
    stateManager: d,
    syncOrchestrator: A,
    syncService: I,
    applyStateToUI: (D) => Be(D, {
      step: Number(D?.currentStep || 1)
    }),
    surfaceSyncOutcome: We,
    reviewStep: $e.REVIEW
  }), ye.handleCreateSuccessCleanup(), ye.bindRetryAndConflictHandlers();
  const Y = Wn({
    documentIdInput: ne,
    documentPageCountInput: le,
    titleInput: w.form.titleInput,
    messageInput: w.form.messageInput,
    participantsContainer: ae,
    fieldDefinitionsContainer: c,
    fieldPlacementsJSONInput: k,
    fieldRulesJSONInput: V,
    collectFieldRulesForForm: () => ge(),
    buildPlacementFormEntries: () => he?.buildPlacementFormEntries?.() || [],
    getCurrentStep: () => O.getCurrentStep(),
    totalWizardSteps: mt
  }), ve = () => Y.buildCanonicalAgreementPayload();
  return Se = Vn({
    titleSource: H,
    stateManager: d,
    trackWizardStateChanges: Ae,
    participantsController: ie,
    fieldDefinitionsController: G,
    placementController: he,
    reviewConfigController: pe,
    updateFieldParticipantOptions: Le,
    previewCard: U,
    wizardNavigationController: O,
    documentIdInput: ne,
    documentPageCountInput: le,
    selectedDocumentTitle: j,
    agreementRefs: w,
    parsePositiveInt: ke,
    isEditMode: y
  }), Se.bindChangeTracking(), X = Jn({
    documentIdInput: ne,
    titleInput: w.form.titleInput,
    participantsContainer: ae,
    fieldDefinitionsContainer: c,
    fieldRulesContainer: L,
    addFieldBtn: C,
    ensureSelectedDocumentCompatibility: z,
    collectFieldRulesForState: Z,
    findSignersMissingRequiredSignatureField: S,
    missingSignatureFieldMessage: v,
    announceError: Me
  }), de = Xn({
    isEditMode: y,
    storageKey: h,
    stateManager: d,
    syncOrchestrator: A,
    syncService: I,
    applyResumedState: (D) => Be(D, {
      step: Number(D?.currentStep || 1)
    }),
    hasMeaningfulWizardProgress: Ot,
    formatRelativeTime: Q,
    emitWizardTelemetry: (D, re) => R(D, re),
    getActiveTabDebugState: qe
  }), de.bindEvents(), Cn({
    config: e,
    form: J,
    submitBtn: q,
    documentIdInput: ne,
    documentSearch: K,
    participantsContainer: ae,
    addParticipantBtn: r,
    fieldDefinitionsContainer: c,
    fieldRulesContainer: L,
    documentPageCountInput: le,
    fieldPlacementsJSONInput: k,
    fieldRulesJSONInput: V,
    storageKey: h,
    syncService: I,
    syncOrchestrator: A,
    stateManager: d,
    submitMode: F,
    totalWizardSteps: mt,
    wizardStep: $e,
    getCurrentStep: () => O.getCurrentStep(),
    getPlacementState: () => he.getState(),
    getCurrentDocumentPageCount: oe,
    ensureSelectedDocumentCompatibility: z,
    collectFieldRulesForState: Z,
    collectFieldRulesForForm: ge,
    expandRulesForPreview: Ne,
    findSignersMissingRequiredSignatureField: S,
    missingSignatureFieldMessage: v,
    getSignerParticipants: o,
    getReviewConfigForState: () => pe?.collectReviewConfigForState?.() || {
      enabled: !1,
      gate: "approve_before_send",
      commentsEnabled: !1,
      participants: []
    },
    isStartReviewEnabled: () => pe?.isStartReviewEnabled?.() === !0,
    setPrimaryActionLabel: B,
    buildCanonicalAgreementPayload: ve,
    announceError: Me,
    emitWizardTelemetry: R,
    parseAPIError: me,
    goToStep: (D) => O.goToStep(D),
    showSyncConflictDialog: _e,
    surfaceSyncOutcome: We,
    updateSyncStatus: De,
    getActiveTabDebugState: qe,
    addFieldBtn: C
  }).bindEvents(), fe;
}
let _t = null;
function ai() {
  _t?.destroy(), _t = null, typeof window < "u" && (delete window.__esignAgreementRuntime, delete window.__esignAgreementRuntimeInitialized);
}
function oi(n = {}) {
  if (_t)
    return;
  const e = si(n);
  e.start(), _t = e, typeof window < "u" && (window.__esignAgreementRuntime = e, window.__esignAgreementRuntimeInitialized = !0);
}
function ci(n = document) {
  n.querySelectorAll(".collapsible-trigger[aria-controls]").forEach((t) => {
    const i = t.getAttribute("aria-controls");
    if (!i) return;
    const s = document.getElementById(i);
    s && t.addEventListener("click", () => {
      const l = t.getAttribute("aria-expanded") === "true";
      t.setAttribute("aria-expanded", String(!l)), s.classList.toggle("expanded", !l);
    });
  });
}
function li(n) {
  return {
    sync: n.sync && typeof n.sync == "object" ? {
      base_url: String(n.sync.base_url || "").trim(),
      bootstrap_path: String(n.sync.bootstrap_path || "").trim(),
      client_base_path: String(n.sync.client_base_path || "").trim(),
      resource_kind: String(n.sync.resource_kind || "").trim(),
      storage_scope: String(n.sync.storage_scope || "").trim(),
      action_operations: Array.isArray(n.sync.action_operations) ? n.sync.action_operations.map((e) => String(e || "").trim()).filter(Boolean) : []
    } : void 0,
    base_path: String(n.base_path || n.basePath || "").trim(),
    api_base_path: String(n.api_base_path || n.apiBasePath || "").trim(),
    is_edit: !!(n.is_edit ?? n.isEditMode),
    create_success: !!(n.create_success ?? n.createSuccess),
    submit_mode: String(n.submit_mode || "json").trim().toLowerCase(),
    agreement_id: String(n.agreement_id || "").trim(),
    active_agreement_id: String(n.active_agreement_id || "").trim(),
    routes: {
      index: String(n.routes?.index || "").trim(),
      documents: String(n.routes?.documents || "").trim(),
      create: String(n.routes?.create || "").trim(),
      documents_upload_url: String(n.routes?.documents_upload_url || "").trim()
    },
    initial_participants: Array.isArray(n.initial_participants) ? n.initial_participants : [],
    initial_field_instances: Array.isArray(n.initial_field_instances) ? n.initial_field_instances : []
  };
}
class Qt {
  constructor(e) {
    this.initialized = !1, this.config = li(e);
  }
  init() {
    this.initialized || (this.initialized = !0, ci(), oi(this.config));
  }
  destroy() {
    ai(), this.initialized = !1;
  }
}
function yi(n) {
  const e = new Qt(n);
  return Dt(() => e.init()), e;
}
function di(n) {
  const e = new Qt({
    sync: n.sync,
    basePath: n.basePath,
    apiBasePath: n.apiBasePath,
    base_path: n.base_path,
    api_base_path: n.api_base_path,
    isEditMode: n.isEditMode,
    is_edit: n.is_edit,
    createSuccess: n.createSuccess,
    create_success: n.create_success,
    submit_mode: n.submit_mode || "json",
    agreement_id: n.agreement_id,
    active_agreement_id: n.active_agreement_id,
    initial_participants: n.initial_participants || [],
    initial_field_instances: n.initial_field_instances || [],
    routes: n.routes
  });
  Dt(() => e.init()), typeof window < "u" && (window.esignAgreementFormController = e);
}
function ui(n) {
  const e = n.context && typeof n.context == "object" ? n.context : {}, t = n.routes && typeof n.routes == "object" ? n.routes : e.routes && typeof e.routes == "object" ? e.routes : {}, i = n.sync && typeof n.sync == "object" ? n.sync : e.sync && typeof e.sync == "object" ? e.sync : void 0, s = String(n.base_path || n.basePath || "").trim(), l = String(t.index || "").trim();
  return !s && !l ? null : {
    sync: i ? {
      base_url: String(i.base_url || "").trim(),
      bootstrap_path: String(i.bootstrap_path || "").trim(),
      client_base_path: String(i.client_base_path || "").trim(),
      resource_kind: String(i.resource_kind || "").trim(),
      storage_scope: String(i.storage_scope || "").trim(),
      action_operations: Array.isArray(i.action_operations) ? i.action_operations.map((p) => String(p || "").trim()).filter(Boolean) : []
    } : void 0,
    base_path: s || "/admin",
    api_base_path: String(n.api_base_path || n.apiBasePath || "").trim() || void 0,
    is_edit: !!(n.is_edit ?? n.isEditMode ?? e.is_edit),
    create_success: !!(n.create_success ?? n.createSuccess ?? e.create_success),
    submit_mode: String(n.submit_mode || e.submit_mode || "json").trim().toLowerCase(),
    agreement_id: String(n.agreement_id || e.agreement_id || "").trim(),
    active_agreement_id: String(n.active_agreement_id || e.active_agreement_id || "").trim(),
    routes: {
      index: l,
      documents: String(t.documents || "").trim(),
      create: String(t.create || "").trim(),
      documents_upload_url: String(t.documents_upload_url || "").trim()
    },
    initial_participants: Array.isArray(n.initial_participants) ? n.initial_participants : Array.isArray(e.initial_participants) ? e.initial_participants : [],
    initial_field_instances: Array.isArray(n.initial_field_instances) ? n.initial_field_instances : Array.isArray(e.initial_field_instances) ? e.initial_field_instances : []
  };
}
typeof document < "u" && Dt(() => {
  if (!document.querySelector('[data-esign-page="agreement-form"]')) return;
  const e = document.getElementById("esign-page-config");
  if (e)
    try {
      const t = JSON.parse(e.textContent || "{}"), i = ui(t);
      i && di(i);
    } catch (t) {
      console.warn("Failed to parse agreement form page config:", t);
    }
});
export {
  Qt as AgreementFormController,
  di as bootstrapAgreementForm,
  yi as initAgreementForm
};
//# sourceMappingURL=agreement-form.js.map
