import { b as a, q as E, h as d, s as p, a as b } from "../chunks/dom-helpers-cltCUiC5.js";
import { d as _ } from "../chunks/async-helpers-D7xplkWe.js";
import { b as S, d as M } from "../chunks/formatters-DYQo8z6P.js";
import { r as B, o as I, t as R, s as z, p as T } from "../chunks/google-drive-utils-DVyZvmUh.js";
import { h as $ } from "../chunks/http-client-DZnuedzQ.js";
import { escapeHTML as y } from "../shared/html.js";
import { g as U, h as j, r as H } from "../chunks/lineage-contracts-BR7-TggW.js";
import { onReady as L } from "../shared/dom-ready.js";
const O = 25 * 1024 * 1024, q = 2e3, k = 60, x = "application/vnd.google-apps.document", F = "application/pdf", C = "application/vnd.google-apps.folder", G = [x, F];
class P {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || O, this.currentAccountId = B(
      new URLSearchParams(window.location.search),
      this.config.googleAccountId
    ), this.elements = {
      // Upload panel
      form: a("#document-upload-form"),
      fileInput: a("#pdf_file"),
      uploadZone: a("#pdf-upload-zone"),
      placeholder: a("#upload-placeholder"),
      preview: a("#upload-preview"),
      fileName: a("#selected-file-name"),
      fileSize: a("#selected-file-size"),
      clearBtn: a("#clear-file-btn"),
      errorEl: a("#upload-error"),
      submitBtn: a("#submit-btn"),
      titleInput: a("#title"),
      sourceObjectKeyInput: a("#source_object_key"),
      sourceOriginalNameInput: a("#source_original_name"),
      // Source tabs
      sourceTabs: E(".source-tab"),
      sourcePanels: E(".source-panel"),
      announcements: a("#doc-announcements"),
      // Google Drive panel
      searchInput: a("#drive-search"),
      clearSearchBtn: a("#clear-search-btn"),
      fileList: a("#file-list"),
      loadingState: a("#loading-state"),
      breadcrumb: a("#breadcrumb"),
      listTitle: a("#list-title"),
      resultCount: a("#result-count"),
      pagination: a("#pagination"),
      loadMoreBtn: a("#load-more-btn"),
      refreshBtn: a("#refresh-btn"),
      driveAccountDropdown: a("#drive-account-dropdown"),
      accountScopeHelp: a("#account-scope-help"),
      connectGoogleLink: a("#connect-google-link"),
      // Selection panel
      noSelection: a("#no-selection"),
      filePreview: a("#file-preview"),
      previewIcon: a("#preview-icon"),
      previewTitle: a("#preview-title"),
      previewType: a("#preview-type"),
      importTypeInfo: a("#import-type-info"),
      importTypeLabel: a("#import-type-label"),
      importTypeDesc: a("#import-type-desc"),
      snapshotWarning: a("#snapshot-warning"),
      importDocumentTitle: a("#import-document-title"),
      importBtn: a("#import-btn"),
      importBtnText: a("#import-btn-text"),
      clearSelectionBtn: a("#clear-selection-btn"),
      // Import status
      importStatus: a("#import-status"),
      importStatusQueued: a("#import-status-queued"),
      importStatusSuccess: a("#import-status-success"),
      importStatusFailed: a("#import-status-failed"),
      importStatusMessage: a("#import-status-message"),
      importErrorMessage: a("#import-error-message"),
      importRetryBtn: a("#import-retry-btn"),
      importReconnectLink: a("#import-reconnect-link")
    };
  }
  /**
   * Initialize the document form page
   */
  async init() {
    this.setupEventListeners(), this.updateAccountScopeUI(), this.config.googleEnabled && this.config.googleConnected && await this.loadConnectedAccounts(), this.initializeSourceFromURL();
  }
  /**
   * Setup all event listeners
   */
  setupEventListeners() {
    this.setupSourceTabListeners(), this.setupUploadListeners(), this.config.googleEnabled && this.config.googleConnected && this.setupGoogleDriveListeners();
  }
  /**
   * Setup source tab switching listeners
   */
  setupSourceTabListeners() {
    this.elements.sourceTabs.forEach((e) => {
      e.addEventListener("click", () => {
        if (!e.disabled) {
          const t = e.dataset.source;
          this.switchSource(t);
        }
      });
    });
  }
  /**
   * Setup PDF upload listeners
   */
  setupUploadListeners() {
    const {
      form: e,
      fileInput: t,
      uploadZone: s,
      clearBtn: o,
      titleInput: r
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), o && o.addEventListener("click", (i) => {
      i.preventDefault(), i.stopPropagation(), this.clearFileSelection();
    }), r && r.addEventListener("input", () => this.updateSubmitState()), s && (["dragenter", "dragover"].forEach((i) => {
      s.addEventListener(i, (n) => {
        n.preventDefault(), n.stopPropagation(), s.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((i) => {
      s.addEventListener(i, (n) => {
        n.preventDefault(), n.stopPropagation(), s.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), s.addEventListener("drop", (i) => {
      const n = i.dataTransfer;
      n?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = n.files, this.handleFileSelect());
    }), s.addEventListener("keydown", (i) => {
      (i.key === "Enter" || i.key === " ") && (i.preventDefault(), this.elements.fileInput?.click());
    })), e && e.addEventListener("submit", (i) => this.handleFormSubmit(i));
  }
  /**
   * Setup Google Drive listeners
   */
  setupGoogleDriveListeners() {
    const {
      searchInput: e,
      clearSearchBtn: t,
      loadMoreBtn: s,
      refreshBtn: o,
      clearSelectionBtn: r,
      importBtn: i,
      importRetryBtn: n,
      driveAccountDropdown: l
    } = this.elements;
    if (e) {
      const u = _(() => this.handleSearch(), 300);
      e.addEventListener("input", u);
    }
    t && t.addEventListener("click", () => this.clearSearch()), s && s.addEventListener("click", () => this.loadMoreFiles()), o && o.addEventListener("click", () => this.refreshFiles()), l && l.addEventListener("change", () => {
      this.setCurrentAccountId(l.value, this.currentSource === "google");
    }), r && r.addEventListener("click", () => this.clearFileSelection()), i && i.addEventListener("click", () => this.startImport()), n && n.addEventListener("click", () => {
      this.selectedFile ? this.startImport() : this.clearDriveSelection();
    });
  }
  // ============================================================
  // Account ID Management
  // ============================================================
  /**
   * Set current account ID and optionally refresh Drive files
   */
  setCurrentAccountId(e, t = !1) {
    const s = I(e);
    if (s === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }
    if (this.currentAccountId = s, this.updateAccountScopeUI(), t && this.config.googleEnabled && this.config.googleConnected) {
      this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.searchQuery = "";
      const { searchInput: o, clearSearchBtn: r } = this.elements;
      o && (o.value = ""), r && d(r), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
    }
  }
  /**
   * Load connected accounts for account selector
   */
  async loadConnectedAccounts() {
    const { driveAccountDropdown: e } = this.elements;
    if (e)
      try {
        const t = new URL(`${this.apiBase}/esign/integrations/google/accounts`, window.location.origin);
        t.searchParams.set("user_id", this.config.userId || "");
        const s = await fetch(t.toString(), {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!s.ok) {
          this.connectedAccounts = [], this.renderConnectedAccountsDropdown();
          return;
        }
        const o = await s.json();
        this.connectedAccounts = Array.isArray(o.accounts) ? o.accounts : [], this.renderConnectedAccountsDropdown();
      } catch {
        this.connectedAccounts = [], this.renderConnectedAccountsDropdown();
      }
  }
  /**
   * Render account selector options
   */
  renderConnectedAccountsDropdown() {
    const { driveAccountDropdown: e } = this.elements;
    if (!e)
      return;
    e.innerHTML = "";
    const t = document.createElement("option");
    t.value = "", t.textContent = "Default account", this.currentAccountId || (t.selected = !0), e.appendChild(t);
    const s = /* @__PURE__ */ new Set([""]);
    for (const o of this.connectedAccounts) {
      const r = I(o?.account_id);
      if (s.has(r))
        continue;
      s.add(r);
      const i = document.createElement("option");
      i.value = r;
      const n = String(o?.email || "").trim(), l = String(o?.status || "").trim(), u = n || r || "Default account";
      i.textContent = l && l !== "connected" ? `${u} (${l})` : u, r === this.currentAccountId && (i.selected = !0), e.appendChild(i);
    }
    if (this.currentAccountId && !s.has(this.currentAccountId)) {
      const o = document.createElement("option");
      o.value = this.currentAccountId, o.textContent = `${this.currentAccountId} (custom)`, o.selected = !0, e.appendChild(o);
    }
  }
  /**
   * Update account scope UI elements
   */
  updateAccountScopeUI() {
    R(this.currentAccountId), z(this.currentAccountId);
    const { accountScopeHelp: e, connectGoogleLink: t, driveAccountDropdown: s } = this.elements;
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, p(e)) : d(e)), t) {
      const o = t.dataset.baseHref || t.getAttribute("href");
      o && t.setAttribute(
        "href",
        T(o, this.currentAccountId)
      );
    }
    s && (Array.from(s.options).some(
      (r) => I(r.value) === this.currentAccountId
    ) || this.renderConnectedAccountsDropdown(), s.value !== this.currentAccountId && (s.value = this.currentAccountId));
  }
  /**
   * Build scoped API URL
   */
  buildScopedAPIURL(e) {
    const t = new URL(`${this.apiBase}${e}`, window.location.origin);
    return t.searchParams.set("user_id", this.config.userId || ""), this.currentAccountId && t.searchParams.set("account_id", this.currentAccountId), t;
  }
  // ============================================================
  // Source Tab Switching
  // ============================================================
  /**
   * Switch between upload and Google Drive source
   */
  switchSource(e) {
    this.currentSource = e, this.elements.sourceTabs.forEach((s) => {
      const o = s.dataset.source === e;
      s.setAttribute("aria-selected", String(o)), o ? (s.classList.add("border-blue-500", "text-blue-600"), s.classList.remove(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      )) : (s.classList.remove("border-blue-500", "text-blue-600"), s.classList.add(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      ));
    }), this.elements.sourcePanels.forEach((s) => {
      s.id.replace("panel-", "") === e ? p(s) : d(s);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), b(
      `Switched to ${e === "google" ? "Google Drive import" : "PDF upload"}`
    );
  }
  /**
   * Initialize source from URL parameters
   */
  initializeSourceFromURL() {
    const e = new URLSearchParams(window.location.search), t = e.get("source"), s = e.get("import_run_id");
    t === "google" && this.config.googleEnabled ? (this.switchSource("google"), s && this.config.googleConnected && (this.currentImportRunId = s, this.resumeImportPolling(s))) : this.switchSource("upload");
  }
  // ============================================================
  // PDF Upload
  // ============================================================
  /**
   * Handle file selection
   */
  handleFileSelect() {
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: s, sourceOriginalNameInput: o } = this.elements, r = e?.files?.[0];
    if (r && this.validateFile(r)) {
      if (this.showPreview(r), s && (s.value = ""), o && (o.value = r.name), t && !t.value.trim()) {
        const i = r.name.replace(/\.pdf$/i, "");
        t.value = i;
      }
    } else
      e && (e.value = ""), this.clearPreview(), s && (s.value = ""), o && (o.value = "");
    this.updateSubmitState();
  }
  /**
   * Validate uploaded file
   */
  validateFile(e) {
    return this.clearError(), e ? e.type !== "application/pdf" && !e.name.toLowerCase().endsWith(".pdf") ? (this.showError("Please select a PDF file."), !1) : e.size > this.maxFileSize ? (this.showError(
      `File is too large (${S(e.size)}). Maximum size is ${S(this.maxFileSize)}.`
    ), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  /**
   * Show file preview
   */
  showPreview(e) {
    const { placeholder: t, preview: s, fileName: o, fileSize: r, uploadZone: i } = this.elements;
    o && (o.textContent = e.name), r && (r.textContent = S(e.size)), t && d(t), s && p(s), i && (i.classList.remove("border-gray-300"), i.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: s } = this.elements;
    e && p(e), t && d(t), s && (s.classList.add("border-gray-300"), s.classList.remove("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file selection
   */
  clearFileSelection() {
    const { fileInput: e, sourceObjectKeyInput: t, sourceOriginalNameInput: s } = this.elements;
    e && (e.value = ""), t && (t.value = ""), s && (s.value = ""), this.clearPreview(), this.clearError(), this.updateSubmitState();
  }
  /**
   * Show error message
   */
  showError(e) {
    const { errorEl: t } = this.elements;
    t && (t.textContent = e, p(t));
  }
  /**
   * Clear error message
   */
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", d(e));
  }
  /**
   * Update submit button state
   */
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: s } = this.elements, o = e?.files && e.files.length > 0, r = t?.value.trim().length ?? !1, i = o && r;
    s && (s.disabled = !i, s.setAttribute("aria-disabled", String(!i)));
  }
  /**
   * Set submitting state
   */
  setSubmittingState(e) {
    const { submitBtn: t } = this.elements;
    t && (t.disabled = e, t.setAttribute("aria-disabled", String(e)), e ? t.innerHTML = `
        <svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Uploading...
      ` : t.innerHTML = `
        <svg class="w-4 h-4 mr-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
        </svg>
        Upload Document
      `);
  }
  /**
   * Upload source PDF to API
   */
  async uploadSourcePDF(e) {
    const t = new URLSearchParams(window.location.search), s = t.get("tenant_id"), o = t.get("org_id"), r = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    s && r.searchParams.set("tenant_id", s), o && r.searchParams.set("org_id", o);
    const i = new FormData();
    i.append("file", e);
    const n = await $(r.toString(), {
      method: "POST",
      body: i,
      credentials: "same-origin"
    }), l = await n.json().catch(() => ({}));
    if (!n.ok) {
      const m = l?.error?.message || l?.message || "Upload failed. Please try again.";
      throw new Error(m);
    }
    const u = l?.object_key ? String(l.object_key).trim() : "";
    if (!u)
      throw new Error("Upload failed: missing source object key.");
    const h = l?.source_original_name ? String(l.source_original_name).trim() : l?.original_name ? String(l.original_name).trim() : e.name;
    return {
      objectKey: u,
      sourceOriginalName: h
    };
  }
  /**
   * Handle form submission
   */
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: s, sourceObjectKeyInput: o, sourceOriginalNameInput: r } = this.elements, i = t?.files?.[0];
    if (!(!i || !this.validateFile(i))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const n = await this.uploadSourcePDF(i);
        o && (o.value = n.objectKey), r && (r.value = n.sourceOriginalName || i.name), s?.submit();
      } catch (n) {
        const l = n instanceof Error ? n.message : "Upload failed. Please try again.";
        this.showError(l), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
      }
    }
  }
  // ============================================================
  // Google Drive Browser
  // ============================================================
  /**
   * Normalize drive file from API response
   */
  normalizeDriveFile(e) {
    if (!e || typeof e != "object")
      return {
        id: "",
        name: "",
        mimeType: "",
        modifiedTime: "",
        webViewLink: "",
        parents: [],
        owners: []
      };
    const t = String(e.id || e.ID || "").trim(), s = String(e.name || e.Name || "").trim(), o = String(e.mimeType || e.MimeType || "").trim(), r = String(e.modifiedTime || e.ModifiedTime || "").trim(), i = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), n = String(e.parentId || e.ParentID || "").trim(), l = String(e.ownerEmail || e.OwnerEmail || "").trim(), u = Array.isArray(e.parents) ? e.parents : n ? [n] : [], h = Array.isArray(e.owners) ? e.owners : l ? [{ emailAddress: l }] : [];
    return {
      id: t,
      name: s,
      mimeType: o,
      modifiedTime: r,
      webViewLink: i,
      parents: u,
      owners: h
    };
  }
  /**
   * Check if file is a Google Doc
   */
  isGoogleDoc(e) {
    return e.mimeType === x;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === F;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === C;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return G.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === x ? "Google Document" : t === F ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === C ? "Folder" : "File";
  }
  /**
   * Get file icon HTML
   */
  getFileIcon(e) {
    const t = {
      doc: { bg: "bg-blue-100", text: "text-blue-600" },
      pdf: { bg: "bg-red-100", text: "text-red-600" },
      folder: { bg: "bg-gray-100", text: "text-gray-600" },
      default: { bg: "bg-gray-100", text: "text-gray-400" }
    };
    let s = "default";
    this.isFolder(e) ? s = "folder" : this.isGoogleDoc(e) ? s = "doc" : this.isPDF(e) && (s = "pdf");
    const o = t[s];
    return { html: {
      doc: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
      pdf: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>',
      folder: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
      default: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>'
    }[s], ...o };
  }
  /**
   * Get import type info for display
   */
  getImportTypeInfo(e) {
    return this.isGoogleDoc(e) ? {
      label: "Google Doc → PDF Export",
      desc: "Will be exported as PDF snapshot",
      bgClass: "bg-blue-50 border-blue-100",
      textClass: "text-blue-700",
      showSnapshot: !0
    } : this.isPDF(e) ? {
      label: "Direct PDF Import",
      desc: "Will be imported as-is",
      bgClass: "bg-green-50 border-green-100",
      textClass: "text-green-700",
      showSnapshot: !1
    } : null;
  }
  /**
   * Load files from Google Drive
   */
  async loadFiles(e = {}) {
    const { folderId: t, query: s, pageToken: o, append: r } = e, { fileList: i } = this.elements;
    !r && i && (i.innerHTML = `
        <div class="p-8 text-center">
          <svg class="animate-spin h-8 w-8 mx-auto text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-gray-500">Loading files...</p>
        </div>
      `);
    try {
      let n;
      s ? (n = this.buildScopedAPIURL("/esign/google-drive/search"), n.searchParams.set("q", s), n.searchParams.set("page_size", "20"), o && n.searchParams.set("page_token", o)) : (n = this.buildScopedAPIURL("/esign/google-drive/browse"), n.searchParams.set("page_size", "20"), t && t !== "root" && n.searchParams.set("folder_id", t), o && n.searchParams.set("page_token", o));
      const l = await fetch(n.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), u = await l.json();
      if (!l.ok)
        throw new Error(u.error?.message || "Failed to load files");
      const h = Array.isArray(u.files) ? u.files.map((v) => this.normalizeDriveFile(v)) : [];
      this.nextPageToken = u.next_page_token || null, r ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.renderFiles(r);
      const { resultCount: m, listTitle: g } = this.elements;
      s && m ? (m.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, g && (g.textContent = "Search Results")) : (m && (m.textContent = ""), g && (g.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: f } = this.elements;
      f && (this.nextPageToken ? p(f) : d(f)), b(`Loaded ${h.length} files`);
    } catch (n) {
      console.error("Error loading files:", n), i && (i.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${y(n instanceof Error ? n.message : "Unknown error")}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `), b(`Error: ${n instanceof Error ? n.message : "Unknown error"}`);
    }
  }
  /**
   * Render files in the file list
   */
  renderFiles(e = !1) {
    const { fileList: t } = this.elements;
    if (!t) return;
    if (this.currentFiles.length === 0) {
      t.innerHTML = `
        <div class="p-8 text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
            <svg class="w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <p class="text-sm text-gray-500">No files found</p>
        </div>
      `;
      return;
    }
    const s = this.currentFiles.map((o, r) => {
      const i = this.getFileIcon(o), n = this.isImportable(o), l = this.isFolder(o), u = this.selectedFile && this.selectedFile.id === o.id, h = !n && !l;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${u ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${h ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${u}"
          data-file-index="${r}"
          ${h ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${i.bg} flex items-center justify-center flex-shrink-0 ${i.text}">
            ${i.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${y(o.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(o.mimeType)}
              ${o.modifiedTime ? " • " + M(o.modifiedTime) : ""}
              ${h ? " • Not importable" : ""}
            </p>
          </div>
          ${l ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          ` : ""}
        </button>
      `;
    }).join("");
    e ? t.insertAdjacentHTML("beforeend", s) : t.innerHTML = s, t.querySelectorAll(".file-item").forEach((o) => {
      o.addEventListener("click", () => {
        const r = parseInt(o.dataset.fileIndex || "0", 10), i = this.currentFiles[r];
        this.isFolder(i) ? this.navigateToFolder(i) : this.isImportable(i) && this.selectFile(i);
      });
    });
  }
  /**
   * Navigate to folder
   */
  navigateToFolder(e) {
    this.currentFolderPath.push({ id: e.id, name: e.name }), this.updateBreadcrumb(), this.searchQuery = "";
    const { searchInput: t, clearSearchBtn: s } = this.elements;
    t && (t.value = ""), s && d(s), this.loadFiles({ folderId: e.id });
  }
  /**
   * Update breadcrumb navigation
   */
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      d(e);
      return;
    }
    p(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((s, o) => {
      const r = o === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${o > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${o}" class="breadcrumb-item ${r ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${y(s.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((s) => {
      s.addEventListener("click", () => {
        const o = parseInt(s.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, o + 1), this.updateBreadcrumb();
        const r = this.currentFolderPath[this.currentFolderPath.length - 1];
        this.loadFiles({ folderId: r.id });
      });
    }));
  }
  /**
   * Select a file
   */
  selectFile(e) {
    this.selectedFile = e;
    const t = this.getFileIcon(e), s = this.getImportTypeInfo(e), { fileList: o } = this.elements;
    o && o.querySelectorAll(".file-item").forEach((w) => {
      const D = parseInt(w.dataset.fileIndex || "0", 10);
      this.currentFiles[D].id === e.id ? (w.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), w.setAttribute("aria-selected", "true")) : (w.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), w.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: r,
      filePreview: i,
      importStatus: n,
      previewIcon: l,
      previewTitle: u,
      previewType: h,
      importTypeInfo: m,
      importTypeLabel: g,
      importTypeDesc: f,
      snapshotWarning: v,
      importDocumentTitle: A
    } = this.elements;
    r && d(r), i && p(i), n && d(n), l && (l.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, l.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), u && (u.textContent = e.name || "Untitled"), h && (h.textContent = this.getFileTypeName(e.mimeType)), s && m && (m.className = `p-3 rounded-lg border ${s.bgClass}`, g && (g.textContent = s.label, g.className = `text-xs font-medium ${s.textClass}`), f && (f.textContent = s.desc, f.className = `text-xs mt-1 ${s.textClass}`), v && (s.showSnapshot ? p(v) : d(v))), A && (A.value = e.name || ""), b(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: s, fileList: o } = this.elements;
    e && p(e), t && d(t), s && d(s), o && o.querySelectorAll(".file-item").forEach((r) => {
      r.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), r.setAttribute("aria-selected", "false");
    });
  }
  /**
   * Handle search input
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const s = e.value.trim();
    if (s)
      t && p(t), this.searchQuery = s, this.loadFiles({ query: s });
    else {
      t && d(t), this.searchQuery = "";
      const o = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: o.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && d(t), this.searchQuery = "";
    const s = this.currentFolderPath[this.currentFolderPath.length - 1];
    this.loadFiles({ folderId: s.id });
  }
  /**
   * Load more files
   */
  loadMoreFiles() {
    if (this.nextPageToken) {
      const e = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({
        folderId: this.searchQuery ? void 0 : e.id,
        query: this.searchQuery || void 0,
        pageToken: this.nextPageToken,
        append: !0
      });
    }
  }
  /**
   * Refresh files
   */
  refreshFiles() {
    if (this.searchQuery)
      this.loadFiles({ query: this.searchQuery });
    else {
      const e = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: e.id });
    }
  }
  // ============================================================
  // Async Import with Polling
  // ============================================================
  /**
   * Show import status panel
   */
  showImportStatus(e) {
    const {
      noSelection: t,
      filePreview: s,
      importStatus: o,
      importStatusQueued: r,
      importStatusSuccess: i,
      importStatusFailed: n
    } = this.elements;
    switch (t && d(t), s && d(s), o && p(o), r && d(r), i && d(i), n && d(n), e) {
      case "queued":
      case "running":
        r && p(r);
        break;
      case "succeeded":
        i && p(i);
        break;
      case "failed":
        n && p(n);
        break;
    }
  }
  /**
   * Update import status message
   */
  updateImportStatusMessage(e) {
    const { importStatusMessage: t } = this.elements;
    t && (t.textContent = e);
  }
  /**
   * Show import error
   */
  showImportError(e, t) {
    this.showImportStatus("failed");
    const { importErrorMessage: s, importReconnectLink: o } = this.elements;
    if (s && (s.textContent = e), o)
      if (t === "GOOGLE_ACCESS_REVOKED" || t === "GOOGLE_SCOPE_VIOLATION") {
        const r = this.config.routes.integrations || "/admin/esign/integrations/google";
        o.href = T(
          r,
          this.currentAccountId
        ), p(o);
      } else
        d(o);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: s, importReconnectLink: o } = this.elements;
    if (!this.selectedFile || !e) return;
    const r = e.value.trim();
    if (!r) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), s && (s.textContent = "Starting..."), o && d(o), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const i = new URL(window.location.href);
      i.searchParams.delete("import_run_id"), window.history.replaceState({}, "", i.toString());
      const n = await fetch(
        this.buildScopedAPIURL("/esign/google-drive/imports").toString(),
        {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({
            google_file_id: this.selectedFile.id,
            account_id: this.currentAccountId || void 0,
            document_title: r
          })
        }
      ), l = await n.json();
      if (!n.ok) {
        const m = l.error?.code || "";
        throw { message: l.error?.message || "Failed to start import", code: m };
      }
      const u = U(l);
      this.currentImportRunId = u.import_run_id, this.pollAttempts = 0;
      const h = new URL(window.location.href);
      this.currentImportRunId && h.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", h.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (i) {
      console.error("Import error:", i);
      const n = i;
      this.showImportError(n.message || "Failed to start import", n.code || ""), t && (t.disabled = !1), s && (s.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), q);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > k) {
        this.showImportError(
          "Import is taking too long. Please check the documents list.",
          ""
        );
        return;
      }
      try {
        const e = this.buildScopedAPIURL(
          `/esign/google-drive/imports/${encodeURIComponent(this.currentImportRunId)}`
        ).toString(), t = await fetch(e, {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }), s = await t.json();
        if (!t.ok)
          throw new Error(s.error?.message || "Failed to check import status");
        const o = j(s);
        switch (o.status) {
          case "queued":
            this.updateImportStatusMessage("Waiting in queue..."), this.startPolling();
            break;
          case "running":
            this.updateImportStatusMessage("Importing document..."), this.startPolling();
            break;
          case "succeeded":
            this.showImportStatus("succeeded"), b("Import complete");
            const i = H(o, {
              agreements: this.config.routes.agreements,
              documents: this.config.routes.index,
              fallback: this.config.routes.index
            });
            setTimeout(() => {
              window.location.href = i;
            }, 1500);
            break;
          case "failed": {
            const n = o.error?.code || "", l = o.error?.message || "Import failed";
            this.showImportError(l, n), b("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < k ? this.startPolling() : this.showImportError("Unable to check import status", "");
      }
    }
  }
  /**
   * Resume import polling from URL parameter
   */
  resumeImportPolling(e) {
    this.currentImportRunId = e, this.pollAttempts = 0, this.showImportStatus("queued"), this.updateImportStatusMessage("Resuming import status..."), this.pollImportStatus();
  }
  // ============================================================
  // Utility
  // ============================================================
  /**
   * Escape HTML
   */
}
function ee(c) {
  const e = new P(c);
  return L(() => e.init()), e;
}
function te(c) {
  const e = {
    basePath: c.basePath,
    apiBasePath: c.apiBasePath || `${c.basePath}/api/v1`,
    userId: c.userId,
    googleEnabled: c.googleEnabled !== !1,
    googleConnected: c.googleConnected !== !1,
    googleAccountId: c.googleAccountId,
    maxFileSize: c.maxFileSize,
    routes: c.routes
  }, t = new P(e);
  L(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function N(c) {
  const e = String(c.basePath || c.base_path || "").trim(), t = c.routes && typeof c.routes == "object" ? c.routes : {}, s = c.features && typeof c.features == "object" ? c.features : {}, o = c.context && typeof c.context == "object" ? c.context : {}, r = String(t.index || "").trim();
  return !e && !r ? null : {
    basePath: e || "/admin",
    apiBasePath: String(c.apiBasePath || c.api_base_path || "").trim() || void 0,
    userId: String(c.userId || c.user_id || o.user_id || "").trim(),
    googleEnabled: !!(c.googleEnabled ?? s.google_enabled),
    googleConnected: !!(c.googleConnected ?? s.google_connected),
    googleAccountId: String(
      c.googleAccountId || c.google_account_id || o.google_account_id || ""
    ).trim(),
    maxFileSize: typeof c.maxFileSize == "number" ? c.maxFileSize : typeof c.max_file_size == "number" ? c.max_file_size : void 0,
    routes: {
      index: r,
      create: String(t.create || "").trim() || void 0,
      agreements: String(t.agreements || "").trim() || void 0,
      integrations: String(t.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && L(() => {
  if (document.querySelector(
    '[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]'
  )) {
    const e = document.getElementById("esign-page-config");
    if (e)
      try {
        const t = JSON.parse(
          e.textContent || "{}"
        ), s = N(t);
        s && new P(s).init();
      } catch (t) {
        console.warn("Failed to parse document form page config:", t);
      }
  }
});
export {
  P as DocumentFormController,
  te as bootstrapDocumentForm,
  ee as initDocumentForm
};
//# sourceMappingURL=document-form.js.map
