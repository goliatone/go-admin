import { j as M, b as a, q as E, h as d, s as p, a as v } from "../chunks/dom-helpers-Cd24RS2-.js";
import { d as R } from "../chunks/async-helpers-D7xplkWe.js";
import { b as S, d as B } from "../chunks/formatters-DYQo8z6P.js";
import { r as z, o as I, t as U, s as $, p as k } from "../chunks/google-drive-utils-DVyZvmUh.js";
import { httpRequest as j, readHTTPError as y, readHTTPErrorResult as H, readHTTPJSONObject as O } from "../shared/transport/http-client.js";
import { escapeHTML as x } from "../shared/html.js";
import { g as q, h as G, r as N } from "../chunks/lineage-contracts-BR7-TggW.js";
import { onReady as L } from "../shared/dom-ready.js";
const V = 25 * 1024 * 1024, Q = 2e3, C = 60, F = "application/vnd.google-apps.document", P = "application/pdf", D = "application/vnd.google-apps.folder", W = [F, P];
async function K(l) {
  return O(l);
}
class A {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || V, this.currentAccountId = z(
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
      uploadZone: o,
      clearBtn: s,
      titleInput: r
    } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), s && s.addEventListener("click", (i) => {
      i.preventDefault(), i.stopPropagation(), this.clearFileSelection();
    }), r && r.addEventListener("input", () => this.updateSubmitState()), o && (["dragenter", "dragover"].forEach((i) => {
      o.addEventListener(i, (n) => {
        n.preventDefault(), n.stopPropagation(), o.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((i) => {
      o.addEventListener(i, (n) => {
        n.preventDefault(), n.stopPropagation(), o.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), o.addEventListener("drop", (i) => {
      const n = i.dataTransfer;
      n?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = n.files, this.handleFileSelect());
    }), o.addEventListener("keydown", (i) => {
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
      loadMoreBtn: o,
      refreshBtn: s,
      clearSelectionBtn: r,
      importBtn: i,
      importRetryBtn: n,
      driveAccountDropdown: c
    } = this.elements;
    if (e) {
      const u = R(() => this.handleSearch(), 300);
      e.addEventListener("input", u);
    }
    t && t.addEventListener("click", () => this.clearSearch()), o && o.addEventListener("click", () => this.loadMoreFiles()), s && s.addEventListener("click", () => this.refreshFiles()), c && c.addEventListener("change", () => {
      this.setCurrentAccountId(c.value, this.currentSource === "google");
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
    const o = I(e);
    if (o === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }
    if (this.currentAccountId = o, this.updateAccountScopeUI(), t && this.config.googleEnabled && this.config.googleConnected) {
      this.currentFolderPath = [{ id: "root", name: "My Drive" }], this.searchQuery = "";
      const { searchInput: s, clearSearchBtn: r } = this.elements;
      s && (s.value = ""), r && d(r), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
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
        const o = await fetch(t.toString(), {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!o.ok) {
          this.connectedAccounts = [], this.renderConnectedAccountsDropdown();
          return;
        }
        const s = await o.json();
        this.connectedAccounts = Array.isArray(s.accounts) ? s.accounts : [], this.renderConnectedAccountsDropdown();
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
    const o = /* @__PURE__ */ new Set([""]);
    for (const s of this.connectedAccounts) {
      const r = I(s?.account_id);
      if (o.has(r))
        continue;
      o.add(r);
      const i = document.createElement("option");
      i.value = r;
      const n = String(s?.email || "").trim(), c = String(s?.status || "").trim(), u = n || r || "Default account";
      i.textContent = c && c !== "connected" ? `${u} (${c})` : u, r === this.currentAccountId && (i.selected = !0), e.appendChild(i);
    }
    if (this.currentAccountId && !o.has(this.currentAccountId)) {
      const s = document.createElement("option");
      s.value = this.currentAccountId, s.textContent = `${this.currentAccountId} (custom)`, s.selected = !0, e.appendChild(s);
    }
  }
  /**
   * Update account scope UI elements
   */
  updateAccountScopeUI() {
    U(this.currentAccountId), $(this.currentAccountId);
    const { accountScopeHelp: e, connectGoogleLink: t, driveAccountDropdown: o } = this.elements;
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, p(e)) : d(e)), t) {
      const s = t.dataset.baseHref || t.getAttribute("href");
      s && t.setAttribute(
        "href",
        k(s, this.currentAccountId)
      );
    }
    o && (Array.from(o.options).some(
      (r) => I(r.value) === this.currentAccountId
    ) || this.renderConnectedAccountsDropdown(), o.value !== this.currentAccountId && (o.value = this.currentAccountId));
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
    this.currentSource = e, this.elements.sourceTabs.forEach((o) => {
      const s = o.dataset.source === e;
      o.setAttribute("aria-selected", String(s)), s ? (o.classList.add("border-blue-500", "text-blue-600"), o.classList.remove(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      )) : (o.classList.remove("border-blue-500", "text-blue-600"), o.classList.add(
        "border-transparent",
        "text-gray-500",
        "hover:text-gray-700",
        "hover:border-gray-300"
      ));
    }), this.elements.sourcePanels.forEach((o) => {
      o.id.replace("panel-", "") === e ? p(o) : d(o);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), v(
      `Switched to ${e === "google" ? "Google Drive import" : "PDF upload"}`
    );
  }
  /**
   * Initialize source from URL parameters
   */
  initializeSourceFromURL() {
    const e = new URLSearchParams(window.location.search), t = e.get("source"), o = e.get("import_run_id");
    t === "google" && this.config.googleEnabled ? (this.switchSource("google"), o && this.config.googleConnected && (this.currentImportRunId = o, this.resumeImportPolling(o))) : this.switchSource("upload");
  }
  // ============================================================
  // PDF Upload
  // ============================================================
  /**
   * Handle file selection
   */
  handleFileSelect() {
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: o, sourceOriginalNameInput: s } = this.elements, r = e?.files?.[0];
    if (r && this.validateFile(r)) {
      if (this.showPreview(r), o && (o.value = ""), s && (s.value = r.name), t && !t.value.trim()) {
        const i = r.name.replace(/\.pdf$/i, "");
        t.value = i;
      }
    } else
      e && (e.value = ""), this.clearPreview(), o && (o.value = ""), s && (s.value = "");
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
    const { placeholder: t, preview: o, fileName: s, fileSize: r, uploadZone: i } = this.elements;
    s && (s.textContent = e.name), r && (r.textContent = S(e.size)), t && d(t), o && p(o), i && (i.classList.remove("border-gray-300"), i.classList.add("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file preview
   */
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: o } = this.elements;
    e && p(e), t && d(t), o && (o.classList.add("border-gray-300"), o.classList.remove("border-green-400", "bg-green-50"));
  }
  /**
   * Clear file selection
   */
  clearFileSelection() {
    const { fileInput: e, sourceObjectKeyInput: t, sourceOriginalNameInput: o } = this.elements;
    e && (e.value = ""), t && (t.value = ""), o && (o.value = ""), this.clearPreview(), this.clearError(), this.updateSubmitState();
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
    const { fileInput: e, titleInput: t, submitBtn: o } = this.elements, s = e?.files && e.files.length > 0, r = t?.value.trim().length ?? !1, i = s && r;
    o && (o.disabled = !i, o.setAttribute("aria-disabled", String(!i)));
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
    const t = new URLSearchParams(window.location.search), o = t.get("tenant_id"), s = t.get("org_id"), r = new URL(
      `${this.apiBase}/esign/documents/upload`,
      window.location.origin
    );
    o && r.searchParams.set("tenant_id", o), s && r.searchParams.set("org_id", s);
    const i = new FormData();
    i.append("file", e);
    const n = await j(r.toString(), {
      method: "POST",
      body: i,
      credentials: "same-origin"
    });
    if (!n.ok)
      throw new Error(
        await y(n, "Upload failed. Please try again.", {
          appendStatusToFallback: !1
        })
      );
    const c = await K(n), u = c?.object_key ? String(c.object_key).trim() : "";
    if (!u)
      throw new Error("Upload failed: missing source object key.");
    const h = c?.source_original_name ? String(c.source_original_name).trim() : c?.original_name ? String(c.original_name).trim() : e.name;
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
    const { fileInput: t, form: o, sourceObjectKeyInput: s, sourceOriginalNameInput: r } = this.elements, i = t?.files?.[0];
    if (!(!i || !this.validateFile(i))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const n = await this.uploadSourcePDF(i);
        s && (s.value = n.objectKey), r && (r.value = n.sourceOriginalName || i.name), o?.submit();
      } catch (n) {
        const c = n instanceof Error ? n.message : "Upload failed. Please try again.";
        this.showError(c), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
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
    const t = String(e.id || e.ID || "").trim(), o = String(e.name || e.Name || "").trim(), s = String(e.mimeType || e.MimeType || "").trim(), r = String(e.modifiedTime || e.ModifiedTime || "").trim(), i = String(
      e.webViewLink || e.webViewURL || e.WebViewURL || ""
    ).trim(), n = String(e.parentId || e.ParentID || "").trim(), c = String(e.ownerEmail || e.OwnerEmail || "").trim(), u = Array.isArray(e.parents) ? e.parents : n ? [n] : [], h = Array.isArray(e.owners) ? e.owners : c ? [{ emailAddress: c }] : [];
    return {
      id: t,
      name: o,
      mimeType: s,
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
    return e.mimeType === F;
  }
  /**
   * Check if file is a PDF
   */
  isPDF(e) {
    return e.mimeType === P;
  }
  /**
   * Check if file is a folder
   */
  isFolder(e) {
    return e.mimeType === D;
  }
  /**
   * Check if file is importable
   */
  isImportable(e) {
    return W.includes(e.mimeType);
  }
  /**
   * Get file type name
   */
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === F ? "Google Document" : t === P ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === D ? "Folder" : "File";
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
    let o = "default";
    this.isFolder(e) ? o = "folder" : this.isGoogleDoc(e) ? o = "doc" : this.isPDF(e) && (o = "pdf");
    const s = t[o];
    return { html: {
      doc: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
      pdf: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>',
      folder: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
      default: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>'
    }[o], ...s };
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
    const { folderId: t, query: o, pageToken: s, append: r } = e, { fileList: i } = this.elements;
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
      o ? (n = this.buildScopedAPIURL("/esign/google-drive/search"), n.searchParams.set("q", o), n.searchParams.set("page_size", "20"), s && n.searchParams.set("page_token", s)) : (n = this.buildScopedAPIURL("/esign/google-drive/browse"), n.searchParams.set("page_size", "20"), t && t !== "root" && n.searchParams.set("folder_id", t), s && n.searchParams.set("page_token", s));
      const c = await fetch(n.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!c.ok)
        throw new Error(
          await y(c, "Failed to load files", {
            appendStatusToFallback: !1
          })
        );
      const u = await c.json(), h = Array.isArray(u.files) ? u.files.map((b) => this.normalizeDriveFile(b)) : [];
      this.nextPageToken = u.next_page_token || null, r ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.renderFiles(r);
      const { resultCount: g, listTitle: m } = this.elements;
      o && g ? (g.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, m && (m.textContent = "Search Results")) : (g && (g.textContent = ""), m && (m.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: f } = this.elements;
      f && (this.nextPageToken ? p(f) : d(f)), v(`Loaded ${h.length} files`);
    } catch (n) {
      console.error("Error loading files:", n), i && (i.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${x(n instanceof Error ? n.message : "Unknown error")}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `), v(`Error: ${n instanceof Error ? n.message : "Unknown error"}`);
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
    const o = this.currentFiles.map((s, r) => {
      const i = this.getFileIcon(s), n = this.isImportable(s), c = this.isFolder(s), u = this.selectedFile && this.selectedFile.id === s.id, h = !n && !c;
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
            <p class="font-medium text-gray-900 truncate">${x(s.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(s.mimeType)}
              ${s.modifiedTime ? " • " + B(s.modifiedTime) : ""}
              ${h ? " • Not importable" : ""}
            </p>
          </div>
          ${c ? `
            <svg class="w-5 h-5 text-gray-400 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          ` : ""}
        </button>
      `;
    }).join("");
    e ? t.insertAdjacentHTML("beforeend", o) : t.innerHTML = o, t.querySelectorAll(".file-item").forEach((s) => {
      s.addEventListener("click", () => {
        const r = parseInt(s.dataset.fileIndex || "0", 10), i = this.currentFiles[r];
        this.isFolder(i) ? this.navigateToFolder(i) : this.isImportable(i) && this.selectFile(i);
      });
    });
  }
  /**
   * Navigate to folder
   */
  navigateToFolder(e) {
    this.currentFolderPath.push({ id: e.id, name: e.name }), this.updateBreadcrumb(), this.searchQuery = "";
    const { searchInput: t, clearSearchBtn: o } = this.elements;
    t && (t.value = ""), o && d(o), this.loadFiles({ folderId: e.id });
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
    t && (t.innerHTML = this.currentFolderPath.map((o, s) => {
      const r = s === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${s > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${s}" class="breadcrumb-item ${r ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${x(o.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((o) => {
      o.addEventListener("click", () => {
        const s = parseInt(o.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, s + 1), this.updateBreadcrumb();
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
    const t = this.getFileIcon(e), o = this.getImportTypeInfo(e), { fileList: s } = this.elements;
    s && s.querySelectorAll(".file-item").forEach((w) => {
      const _ = parseInt(w.dataset.fileIndex || "0", 10);
      this.currentFiles[_].id === e.id ? (w.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), w.setAttribute("aria-selected", "true")) : (w.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), w.setAttribute("aria-selected", "false"));
    });
    const {
      noSelection: r,
      filePreview: i,
      importStatus: n,
      previewIcon: c,
      previewTitle: u,
      previewType: h,
      importTypeInfo: g,
      importTypeLabel: m,
      importTypeDesc: f,
      snapshotWarning: b,
      importDocumentTitle: T
    } = this.elements;
    r && d(r), i && p(i), n && d(n), c && (c.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, c.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), u && (u.textContent = e.name || "Untitled"), h && (h.textContent = this.getFileTypeName(e.mimeType)), o && g && (g.className = `p-3 rounded-lg border ${o.bgClass}`, m && (m.textContent = o.label, m.className = `text-xs font-medium ${o.textClass}`), f && (f.textContent = o.desc, f.className = `text-xs mt-1 ${o.textClass}`), b && (o.showSnapshot ? p(b) : d(b))), T && (T.value = e.name || ""), v(`Selected: ${e.name}`);
  }
  /**
   * Clear drive selection
   */
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: o, fileList: s } = this.elements;
    e && p(e), t && d(t), o && d(o), s && s.querySelectorAll(".file-item").forEach((r) => {
      r.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), r.setAttribute("aria-selected", "false");
    });
  }
  /**
   * Handle search input
   */
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const o = e.value.trim();
    if (o)
      t && p(t), this.searchQuery = o, this.loadFiles({ query: o });
    else {
      t && d(t), this.searchQuery = "";
      const s = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: s.id });
    }
  }
  /**
   * Clear search
   */
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && d(t), this.searchQuery = "";
    const o = this.currentFolderPath[this.currentFolderPath.length - 1];
    this.loadFiles({ folderId: o.id });
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
      filePreview: o,
      importStatus: s,
      importStatusQueued: r,
      importStatusSuccess: i,
      importStatusFailed: n
    } = this.elements;
    switch (t && d(t), o && d(o), s && p(s), r && d(r), i && d(i), n && d(n), e) {
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
    const { importErrorMessage: o, importReconnectLink: s } = this.elements;
    if (o && (o.textContent = e), s)
      if (t === "GOOGLE_ACCESS_REVOKED" || t === "GOOGLE_SCOPE_VIOLATION") {
        const r = this.config.routes.integrations || "/admin/esign/integrations/google";
        s.href = k(
          r,
          this.currentAccountId
        ), p(s);
      } else
        d(s);
  }
  /**
   * Start import process
   */
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: o, importReconnectLink: s } = this.elements;
    if (!this.selectedFile || !e) return;
    const r = e.value.trim();
    if (!r) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), o && (o.textContent = "Starting..."), s && d(s), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
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
      );
      if (!n.ok) {
        const g = await H(n, "Failed to start import", {
          appendStatusToFallback: !1
        }), m = g.payload && typeof g.payload == "object" ? g.payload : null, f = m?.error && typeof m.error == "object" && typeof m.error.code == "string" ? m.error.code : "";
        throw { message: g.message || "Failed to start import", code: f };
      }
      const c = await n.json(), u = q(c);
      this.currentImportRunId = u.import_run_id, this.pollAttempts = 0;
      const h = new URL(window.location.href);
      this.currentImportRunId && h.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", h.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (i) {
      console.error("Import error:", i);
      const n = i;
      this.showImportError(n.message || "Failed to start import", n.code || ""), t && (t.disabled = !1), o && (o.textContent = "Import Document");
    }
  }
  /**
   * Start polling for import status
   */
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), Q);
  }
  /**
   * Poll import status
   */
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > C) {
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
        });
        if (!t.ok)
          throw new Error(
            await y(t, "Failed to check import status", {
              appendStatusToFallback: !1
            })
          );
        const o = await t.json(), s = G(o);
        switch (s.status) {
          case "queued":
            this.updateImportStatusMessage("Waiting in queue..."), this.startPolling();
            break;
          case "running":
            this.updateImportStatusMessage("Importing document..."), this.startPolling();
            break;
          case "succeeded":
            this.showImportStatus("succeeded"), v("Import complete");
            const i = N(s, {
              agreements: this.config.routes.agreements,
              documents: this.config.routes.index,
              fallback: this.config.routes.index
            });
            setTimeout(() => {
              window.location.href = i;
            }, 1500);
            break;
          case "failed": {
            const n = s.error?.code || "", c = s.error?.message || "Import failed";
            this.showImportError(c, n), v("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < C ? this.startPolling() : this.showImportError("Unable to check import status", "");
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
function re(l) {
  const e = new A(l);
  return L(() => e.init()), e;
}
function ne(l) {
  const e = {
    basePath: l.basePath,
    apiBasePath: l.apiBasePath || `${l.basePath}/api/v1`,
    userId: l.userId,
    googleEnabled: l.googleEnabled !== !1,
    googleConnected: l.googleConnected !== !1,
    googleAccountId: l.googleAccountId,
    maxFileSize: l.maxFileSize,
    routes: l.routes
  }, t = new A(e);
  L(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function Z(l) {
  const e = String(l.basePath || l.base_path || "").trim(), t = l.routes && typeof l.routes == "object" ? l.routes : {}, o = l.features && typeof l.features == "object" ? l.features : {}, s = l.context && typeof l.context == "object" ? l.context : {}, r = String(t.index || "").trim();
  return !e && !r ? null : {
    basePath: e || "/admin",
    apiBasePath: String(l.apiBasePath || l.api_base_path || "").trim() || void 0,
    userId: String(l.userId || l.user_id || s.user_id || "").trim(),
    googleEnabled: !!(l.googleEnabled ?? o.google_enabled),
    googleConnected: !!(l.googleConnected ?? o.google_connected),
    googleAccountId: String(
      l.googleAccountId || l.google_account_id || s.google_account_id || ""
    ).trim(),
    maxFileSize: typeof l.maxFileSize == "number" ? l.maxFileSize : typeof l.max_file_size == "number" ? l.max_file_size : void 0,
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
    const e = M(
      "esign-page-config",
      "document form page config"
    );
    if (e) {
      const t = Z(e);
      t && new A(t).init();
    }
  }
});
export {
  A as DocumentFormController,
  ne as bootstrapDocumentForm,
  re as initDocumentForm
};
//# sourceMappingURL=document-form.js.map
