import { t as k } from "./http-client-D9Z2A1Pg.js";
import { B as C, _, g as D } from "./lineage-contracts-Clh6Zaep.js";
import { c as x, f as u, l as a, o as l, t as f, u as P } from "./dom-helpers-CDdChTSn.js";
import { i as w, r as z } from "./formatters-CcW2Edf9.js";
import { n as B } from "./async-helpers-CA3ovFR9.js";
var I = "esign.google.account_id", M = 25 * 1024 * 1024, R = 2e3, L = 60, S = "application/vnd.google-apps.document", y = "application/pdf", E = "application/vnd.google-apps.folder", $ = [S, y], F = class {
  constructor(e) {
    this.isSubmitting = !1, this.currentSource = "upload", this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{
      id: "root",
      name: "My Drive"
    }], this.selectedFile = null, this.searchQuery = "", this.searchTimeout = null, this.pollTimeout = null, this.pollAttempts = 0, this.currentImportRunId = null, this.connectedAccounts = [], this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api/v1`, this.maxFileSize = e.maxFileSize || M, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
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
      sourceTabs: P(".source-tab"),
      sourcePanels: P(".source-panel"),
      announcements: a("#doc-announcements"),
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
  async init() {
    this.setupEventListeners(), this.updateAccountScopeUI(), this.config.googleEnabled && this.config.googleConnected && await this.loadConnectedAccounts(), this.initializeSourceFromURL();
  }
  setupEventListeners() {
    this.setupSourceTabListeners(), this.setupUploadListeners(), this.config.googleEnabled && this.config.googleConnected && this.setupGoogleDriveListeners();
  }
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
  setupUploadListeners() {
    const { form: e, fileInput: t, uploadZone: i, clearBtn: r, titleInput: o } = this.elements;
    t && t.addEventListener("change", () => this.handleFileSelect()), r && r.addEventListener("click", (s) => {
      s.preventDefault(), s.stopPropagation(), this.clearFileSelection();
    }), o && o.addEventListener("input", () => this.updateSubmitState()), i && (["dragenter", "dragover"].forEach((s) => {
      i.addEventListener(s, (n) => {
        n.preventDefault(), n.stopPropagation(), i.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((s) => {
      i.addEventListener(s, (n) => {
        n.preventDefault(), n.stopPropagation(), i.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), i.addEventListener("drop", (s) => {
      const n = s.dataTransfer;
      n?.files?.length && this.elements.fileInput && (this.elements.fileInput.files = n.files, this.handleFileSelect());
    }), i.addEventListener("keydown", (s) => {
      (s.key === "Enter" || s.key === " ") && (s.preventDefault(), this.elements.fileInput?.click());
    })), e && e.addEventListener("submit", (s) => this.handleFormSubmit(s));
  }
  setupGoogleDriveListeners() {
    const { searchInput: e, clearSearchBtn: t, loadMoreBtn: i, refreshBtn: r, clearSelectionBtn: o, importBtn: s, importRetryBtn: n, driveAccountDropdown: c } = this.elements;
    if (e) {
      const d = B(() => this.handleSearch(), 300);
      e.addEventListener("input", d);
    }
    t && t.addEventListener("click", () => this.clearSearch()), i && i.addEventListener("click", () => this.loadMoreFiles()), r && r.addEventListener("click", () => this.refreshFiles()), c && c.addEventListener("change", () => {
      this.setCurrentAccountId(c.value, this.currentSource === "google");
    }), o && o.addEventListener("click", () => this.clearFileSelection()), s && s.addEventListener("click", () => this.startImport()), n && n.addEventListener("click", () => {
      this.selectedFile ? this.startImport() : this.clearDriveSelection();
    });
  }
  resolveInitialAccountId() {
    const e = new URLSearchParams(window.location.search), t = this.normalizeAccountId(e.get("account_id"));
    if (t) return t;
    const i = this.normalizeAccountId(this.config.googleAccountId);
    if (i) return i;
    try {
      return this.normalizeAccountId(window.localStorage.getItem(I));
    } catch {
      return "";
    }
  }
  normalizeAccountId(e) {
    return (e || "").trim();
  }
  setCurrentAccountId(e, t = !1) {
    const i = this.normalizeAccountId(e);
    if (i === this.currentAccountId) {
      this.updateAccountScopeUI();
      return;
    }
    if (this.currentAccountId = i, this.updateAccountScopeUI(), t && this.config.googleEnabled && this.config.googleConnected) {
      this.currentFolderPath = [{
        id: "root",
        name: "My Drive"
      }], this.searchQuery = "";
      const { searchInput: r, clearSearchBtn: o } = this.elements;
      r && (r.value = ""), o && l(o), this.updateBreadcrumb(), this.loadFiles({ folderId: "root" });
    }
  }
  async loadConnectedAccounts() {
    const { driveAccountDropdown: e } = this.elements;
    if (e)
      try {
        const t = new URL(`${this.apiBase}/esign/integrations/google/accounts`, window.location.origin);
        t.searchParams.set("user_id", this.config.userId || "");
        const i = await fetch(t.toString(), {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!i.ok) {
          this.connectedAccounts = [], this.renderConnectedAccountsDropdown();
          return;
        }
        const r = await i.json();
        this.connectedAccounts = Array.isArray(r.accounts) ? r.accounts : [], this.renderConnectedAccountsDropdown();
      } catch {
        this.connectedAccounts = [], this.renderConnectedAccountsDropdown();
      }
  }
  renderConnectedAccountsDropdown() {
    const { driveAccountDropdown: e } = this.elements;
    if (!e) return;
    e.innerHTML = "";
    const t = document.createElement("option");
    t.value = "", t.textContent = "Default account", this.currentAccountId || (t.selected = !0), e.appendChild(t);
    const i = /* @__PURE__ */ new Set([""]);
    for (const r of this.connectedAccounts) {
      const o = this.normalizeAccountId(r?.account_id);
      if (i.has(o)) continue;
      i.add(o);
      const s = document.createElement("option");
      s.value = o;
      const n = String(r?.email || "").trim(), c = String(r?.status || "").trim(), d = n || o || "Default account";
      s.textContent = c && c !== "connected" ? `${d} (${c})` : d, o === this.currentAccountId && (s.selected = !0), e.appendChild(s);
    }
    if (this.currentAccountId && !i.has(this.currentAccountId)) {
      const r = document.createElement("option");
      r.value = this.currentAccountId, r.textContent = `${this.currentAccountId} (custom)`, r.selected = !0, e.appendChild(r);
    }
  }
  syncScopedAccountState() {
    const e = new URL(window.location.href);
    this.currentAccountId ? e.searchParams.set("account_id", this.currentAccountId) : e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString());
    try {
      this.currentAccountId ? window.localStorage.setItem(I, this.currentAccountId) : window.localStorage.removeItem(I);
    } catch {
    }
  }
  applyAccountIdToPath(e) {
    const t = new URL(e, window.location.origin);
    return this.currentAccountId ? t.searchParams.set("account_id", this.currentAccountId) : t.searchParams.delete("account_id"), `${t.pathname}${t.search}${t.hash}`;
  }
  updateAccountScopeUI() {
    this.syncScopedAccountState();
    const { accountScopeHelp: e, connectGoogleLink: t, driveAccountDropdown: i } = this.elements;
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, u(e)) : l(e)), t) {
      const r = t.dataset.baseHref || t.getAttribute("href");
      r && t.setAttribute("href", this.applyAccountIdToPath(r));
    }
    i && (Array.from(i.options).some((r) => this.normalizeAccountId(r.value) === this.currentAccountId) || this.renderConnectedAccountsDropdown(), i.value !== this.currentAccountId && (i.value = this.currentAccountId));
  }
  buildScopedAPIURL(e) {
    const t = new URL(`${this.apiBase}${e}`, window.location.origin);
    return t.searchParams.set("user_id", this.config.userId || ""), this.currentAccountId && t.searchParams.set("account_id", this.currentAccountId), t;
  }
  switchSource(e) {
    this.currentSource = e, this.elements.sourceTabs.forEach((i) => {
      const r = i.dataset.source === e;
      i.setAttribute("aria-selected", String(r)), r ? (i.classList.add("border-blue-500", "text-blue-600"), i.classList.remove("border-transparent", "text-gray-500", "hover:text-gray-700", "hover:border-gray-300")) : (i.classList.remove("border-blue-500", "text-blue-600"), i.classList.add("border-transparent", "text-gray-500", "hover:text-gray-700", "hover:border-gray-300"));
    }), this.elements.sourcePanels.forEach((i) => {
      i.id.replace("panel-", "") === e ? u(i) : l(i);
    });
    const t = new URL(window.location.href);
    e === "google" ? t.searchParams.set("source", "google") : t.searchParams.delete("source"), window.history.replaceState({}, "", t.toString()), e === "google" && this.config.googleEnabled && this.config.googleConnected && this.loadFiles({ folderId: "root" }), f(`Switched to ${e === "google" ? "Google Drive import" : "PDF upload"}`);
  }
  initializeSourceFromURL() {
    const e = new URLSearchParams(window.location.search), t = e.get("source"), i = e.get("import_run_id");
    t === "google" && this.config.googleEnabled ? (this.switchSource("google"), i && this.config.googleConnected && (this.currentImportRunId = i, this.resumeImportPolling(i))) : this.switchSource("upload");
  }
  handleFileSelect() {
    const { fileInput: e, titleInput: t, sourceObjectKeyInput: i, sourceOriginalNameInput: r } = this.elements, o = e?.files?.[0];
    o && this.validateFile(o) ? (this.showPreview(o), i && (i.value = ""), r && (r.value = o.name), t && !t.value.trim() && (t.value = o.name.replace(/\.pdf$/i, ""))) : (e && (e.value = ""), this.clearPreview(), i && (i.value = ""), r && (r.value = "")), this.updateSubmitState();
  }
  validateFile(e) {
    return this.clearError(), e ? e.type !== "application/pdf" && !e.name.toLowerCase().endsWith(".pdf") ? (this.showError("Please select a PDF file."), !1) : e.size > this.maxFileSize ? (this.showError(`File is too large (${w(e.size)}). Maximum size is ${w(this.maxFileSize)}.`), !1) : e.size === 0 ? (this.showError("The selected file appears to be empty."), !1) : !0 : !1;
  }
  showPreview(e) {
    const { placeholder: t, preview: i, fileName: r, fileSize: o, uploadZone: s } = this.elements;
    r && (r.textContent = e.name), o && (o.textContent = w(e.size)), t && l(t), i && u(i), s && (s.classList.remove("border-gray-300"), s.classList.add("border-green-400", "bg-green-50"));
  }
  clearPreview() {
    const { placeholder: e, preview: t, uploadZone: i } = this.elements;
    e && u(e), t && l(t), i && (i.classList.add("border-gray-300"), i.classList.remove("border-green-400", "bg-green-50"));
  }
  clearFileSelection() {
    const { fileInput: e, sourceObjectKeyInput: t, sourceOriginalNameInput: i } = this.elements;
    e && (e.value = ""), t && (t.value = ""), i && (i.value = ""), this.clearPreview(), this.clearError(), this.updateSubmitState();
  }
  showError(e) {
    const { errorEl: t } = this.elements;
    t && (t.textContent = e, u(t));
  }
  clearError() {
    const { errorEl: e } = this.elements;
    e && (e.textContent = "", l(e));
  }
  updateSubmitState() {
    const { fileInput: e, titleInput: t, submitBtn: i } = this.elements, r = e?.files && e.files.length > 0, o = t?.value.trim().length ?? !1, s = r && o;
    i && (i.disabled = !s, i.setAttribute("aria-disabled", String(!s)));
  }
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
  async uploadSourcePDF(e) {
    const t = new URLSearchParams(window.location.search), i = t.get("tenant_id"), r = t.get("org_id"), o = new URL(`${this.apiBase}/esign/documents/upload`, window.location.origin);
    i && o.searchParams.set("tenant_id", i), r && o.searchParams.set("org_id", r);
    const s = new FormData();
    s.append("file", e);
    const n = await k(o.toString(), {
      method: "POST",
      body: s,
      credentials: "same-origin"
    }), c = await n.json().catch(() => ({}));
    if (!n.ok) {
      const h = c?.error?.message || c?.message || "Upload failed. Please try again.";
      throw new Error(h);
    }
    const d = c?.object_key ? String(c.object_key).trim() : "";
    if (!d) throw new Error("Upload failed: missing source object key.");
    return {
      objectKey: d,
      sourceOriginalName: c?.source_original_name ? String(c.source_original_name).trim() : c?.original_name ? String(c.original_name).trim() : e.name
    };
  }
  async handleFormSubmit(e) {
    if (e.preventDefault(), this.isSubmitting) return;
    const { fileInput: t, form: i, sourceObjectKeyInput: r, sourceOriginalNameInput: o } = this.elements, s = t?.files?.[0];
    if (!(!s || !this.validateFile(s))) {
      this.clearError(), this.isSubmitting = !0, this.setSubmittingState(!0);
      try {
        const n = await this.uploadSourcePDF(s);
        r && (r.value = n.objectKey), o && (o.value = n.sourceOriginalName || s.name), i?.submit();
      } catch (n) {
        const c = n instanceof Error ? n.message : "Upload failed. Please try again.";
        this.showError(c), this.setSubmittingState(!1), this.isSubmitting = !1, this.updateSubmitState();
      }
    }
  }
  normalizeDriveFile(e) {
    if (!e || typeof e != "object") return {
      id: "",
      name: "",
      mimeType: "",
      modifiedTime: "",
      webViewLink: "",
      parents: [],
      owners: []
    };
    const t = String(e.id || e.ID || "").trim(), i = String(e.name || e.Name || "").trim(), r = String(e.mimeType || e.MimeType || "").trim(), o = String(e.modifiedTime || e.ModifiedTime || "").trim(), s = String(e.webViewLink || e.webViewURL || e.WebViewURL || "").trim(), n = String(e.parentId || e.ParentID || "").trim(), c = String(e.ownerEmail || e.OwnerEmail || "").trim();
    return {
      id: t,
      name: i,
      mimeType: r,
      modifiedTime: o,
      webViewLink: s,
      parents: Array.isArray(e.parents) ? e.parents : n ? [n] : [],
      owners: Array.isArray(e.owners) ? e.owners : c ? [{ emailAddress: c }] : []
    };
  }
  isGoogleDoc(e) {
    return e.mimeType === S;
  }
  isPDF(e) {
    return e.mimeType === y;
  }
  isFolder(e) {
    return e.mimeType === E;
  }
  isImportable(e) {
    return $.includes(e.mimeType);
  }
  getFileTypeName(e) {
    const t = String(e || "").trim().toLowerCase();
    return t === S ? "Google Document" : t === y ? "PDF Document" : t === "application/vnd.google-apps.spreadsheet" ? "Google Spreadsheet" : t === "application/vnd.google-apps.presentation" ? "Google Slides" : t === E ? "Folder" : "File";
  }
  getFileIcon(e) {
    const t = {
      doc: {
        bg: "bg-blue-100",
        text: "text-blue-600"
      },
      pdf: {
        bg: "bg-red-100",
        text: "text-red-600"
      },
      folder: {
        bg: "bg-gray-100",
        text: "text-gray-600"
      },
      default: {
        bg: "bg-gray-100",
        text: "text-gray-400"
      }
    };
    let i = "default";
    this.isFolder(e) ? i = "folder" : this.isGoogleDoc(e) ? i = "doc" : this.isPDF(e) && (i = "pdf");
    const r = t[i];
    return {
      html: {
        doc: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
        pdf: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5z"/></svg>',
        folder: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
        default: '<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/></svg>'
      }[i],
      ...r
    };
  }
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
  async loadFiles(e = {}) {
    const { folderId: t, query: i, pageToken: r, append: o } = e, { fileList: s } = this.elements;
    !o && s && (s.innerHTML = `
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
      i ? (n = this.buildScopedAPIURL("/esign/google-drive/search"), n.searchParams.set("q", i), n.searchParams.set("page_size", "20"), r && n.searchParams.set("page_token", r)) : (n = this.buildScopedAPIURL("/esign/google-drive/browse"), n.searchParams.set("page_size", "20"), t && t !== "root" && n.searchParams.set("folder_id", t), r && n.searchParams.set("page_token", r));
      const c = await fetch(n.toString(), {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      }), d = await c.json();
      if (!c.ok) throw new Error(d.error?.message || "Failed to load files");
      const h = Array.isArray(d.files) ? d.files.map((b) => this.normalizeDriveFile(b)) : [];
      this.nextPageToken = d.next_page_token || null, o ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.renderFiles(o);
      const { resultCount: p, listTitle: m } = this.elements;
      i && p ? (p.textContent = `(${this.currentFiles.length} result${this.currentFiles.length !== 1 ? "s" : ""})`, m && (m.textContent = "Search Results")) : (p && (p.textContent = ""), m && (m.textContent = this.currentFolderPath[this.currentFolderPath.length - 1].name));
      const { pagination: g } = this.elements;
      g && (this.nextPageToken ? u(g) : l(g)), f(`Loaded ${h.length} files`);
    } catch (n) {
      console.error("Error loading files:", n), s && (s.innerHTML = `
          <div class="p-8 text-center">
            <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
              <svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
            </div>
            <p class="text-sm text-gray-900 font-medium">Failed to load files</p>
            <p class="text-xs text-gray-500 mt-1">${this.escapeHtml(n instanceof Error ? n.message : "Unknown error")}</p>
            <button type="button" onclick="location.reload()" class="mt-3 text-sm text-blue-600 hover:text-blue-800">Try Again</button>
          </div>
        `), f(`Error: ${n instanceof Error ? n.message : "Unknown error"}`);
    }
  }
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
    const i = this.currentFiles.map((r, o) => {
      const s = this.getFileIcon(r), n = this.isImportable(r), c = this.isFolder(r), d = this.selectedFile && this.selectedFile.id === r.id, h = !n && !c;
      return `
        <button
          type="button"
          class="file-item w-full p-3 flex items-center gap-3 hover:bg-gray-50 text-left transition-colors ${d ? "bg-blue-50 border-l-2 border-l-blue-500" : ""} ${h ? "opacity-50 cursor-not-allowed" : ""}"
          role="option"
          aria-selected="${d}"
          data-file-index="${o}"
          ${h ? 'disabled title="Only Google Docs and PDFs can be imported"' : ""}
        >
          <div class="w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0 ${s.text}">
            ${s.html}
          </div>
          <div class="flex-1 min-w-0">
            <p class="font-medium text-gray-900 truncate">${this.escapeHtml(r.name || "Untitled")}</p>
            <p class="text-xs text-gray-500">
              ${this.getFileTypeName(r.mimeType)}
              ${r.modifiedTime ? " • " + z(r.modifiedTime) : ""}
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
    e ? t.insertAdjacentHTML("beforeend", i) : t.innerHTML = i, t.querySelectorAll(".file-item").forEach((r) => {
      r.addEventListener("click", () => {
        const o = parseInt(r.dataset.fileIndex || "0", 10), s = this.currentFiles[o];
        this.isFolder(s) ? this.navigateToFolder(s) : this.isImportable(s) && this.selectFile(s);
      });
    });
  }
  navigateToFolder(e) {
    this.currentFolderPath.push({
      id: e.id,
      name: e.name
    }), this.updateBreadcrumb(), this.searchQuery = "";
    const { searchInput: t, clearSearchBtn: i } = this.elements;
    t && (t.value = ""), i && l(i), this.loadFiles({ folderId: e.id });
  }
  updateBreadcrumb() {
    const { breadcrumb: e } = this.elements;
    if (!e) return;
    if (this.currentFolderPath.length <= 1) {
      l(e);
      return;
    }
    u(e);
    const t = e.querySelector("ol");
    t && (t.innerHTML = this.currentFolderPath.map((i, r) => {
      const o = r === this.currentFolderPath.length - 1;
      return `
          <li class="flex items-center">
            ${r > 0 ? '<svg class="w-4 h-4 text-gray-400 mx-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>' : ""}
            <button type="button" data-folder-index="${r}" class="breadcrumb-item ${o ? "text-gray-900 font-medium cursor-default" : "text-blue-600 hover:text-blue-800 hover:underline"}">
              ${this.escapeHtml(i.name)}
            </button>
          </li>
        `;
    }).join(""), t.querySelectorAll(".breadcrumb-item").forEach((i) => {
      i.addEventListener("click", () => {
        const r = parseInt(i.dataset.folderIndex || "0", 10);
        this.currentFolderPath = this.currentFolderPath.slice(0, r + 1), this.updateBreadcrumb();
        const o = this.currentFolderPath[this.currentFolderPath.length - 1];
        this.loadFiles({ folderId: o.id });
      });
    }));
  }
  selectFile(e) {
    this.selectedFile = e;
    const t = this.getFileIcon(e), i = this.getImportTypeInfo(e), { fileList: r } = this.elements;
    r && r.querySelectorAll(".file-item").forEach((v) => {
      const T = parseInt(v.dataset.fileIndex || "0", 10);
      this.currentFiles[T].id === e.id ? (v.classList.add("bg-blue-50", "border-l-2", "border-l-blue-500"), v.setAttribute("aria-selected", "true")) : (v.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), v.setAttribute("aria-selected", "false"));
    });
    const { noSelection: o, filePreview: s, importStatus: n, previewIcon: c, previewTitle: d, previewType: h, importTypeInfo: p, importTypeLabel: m, importTypeDesc: g, snapshotWarning: b, importDocumentTitle: A } = this.elements;
    o && l(o), s && u(s), n && l(n), c && (c.className = `w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${t.bg} ${t.text}`, c.innerHTML = t.html.replace("w-5 h-5", "w-6 h-6")), d && (d.textContent = e.name || "Untitled"), h && (h.textContent = this.getFileTypeName(e.mimeType)), i && p && (p.className = `p-3 rounded-lg border ${i.bgClass}`, m && (m.textContent = i.label, m.className = `text-xs font-medium ${i.textClass}`), g && (g.textContent = i.desc, g.className = `text-xs mt-1 ${i.textClass}`), b && (i.showSnapshot ? u(b) : l(b))), A && (A.value = e.name || ""), f(`Selected: ${e.name}`);
  }
  clearDriveSelection() {
    this.selectedFile = null;
    const { noSelection: e, filePreview: t, importStatus: i, fileList: r } = this.elements;
    e && u(e), t && l(t), i && l(i), r && r.querySelectorAll(".file-item").forEach((o) => {
      o.classList.remove("bg-blue-50", "border-l-2", "border-l-blue-500"), o.setAttribute("aria-selected", "false");
    });
  }
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const i = e.value.trim();
    if (i)
      t && u(t), this.searchQuery = i, this.loadFiles({ query: i });
    else {
      t && l(t), this.searchQuery = "";
      const r = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: r.id });
    }
  }
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && l(t), this.searchQuery = "";
    const i = this.currentFolderPath[this.currentFolderPath.length - 1];
    this.loadFiles({ folderId: i.id });
  }
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
  refreshFiles() {
    if (this.searchQuery) this.loadFiles({ query: this.searchQuery });
    else {
      const e = this.currentFolderPath[this.currentFolderPath.length - 1];
      this.loadFiles({ folderId: e.id });
    }
  }
  showImportStatus(e) {
    const { noSelection: t, filePreview: i, importStatus: r, importStatusQueued: o, importStatusSuccess: s, importStatusFailed: n } = this.elements;
    switch (t && l(t), i && l(i), r && u(r), o && l(o), s && l(s), n && l(n), e) {
      case "queued":
      case "running":
        o && u(o);
        break;
      case "succeeded":
        s && u(s);
        break;
      case "failed":
        n && u(n);
        break;
    }
  }
  updateImportStatusMessage(e) {
    const { importStatusMessage: t } = this.elements;
    t && (t.textContent = e);
  }
  showImportError(e, t) {
    this.showImportStatus("failed");
    const { importErrorMessage: i, importReconnectLink: r } = this.elements;
    if (i && (i.textContent = e), r) if (t === "GOOGLE_ACCESS_REVOKED" || t === "GOOGLE_SCOPE_VIOLATION") {
      const o = this.config.routes.integrations || "/admin/esign/integrations/google";
      r.href = this.applyAccountIdToPath(o), u(r);
    } else l(r);
  }
  async startImport() {
    const { importDocumentTitle: e, importBtn: t, importBtnText: i, importReconnectLink: r } = this.elements;
    if (!this.selectedFile || !e) return;
    const o = e.value.trim();
    if (!o) {
      e.focus();
      return;
    }
    this.pollTimeout && (clearTimeout(this.pollTimeout), this.pollTimeout = null), this.pollAttempts = 0, t && (t.disabled = !0), i && (i.textContent = "Starting..."), r && l(r), this.showImportStatus("queued"), this.updateImportStatusMessage("Submitting import request...");
    try {
      const s = new URL(window.location.href);
      s.searchParams.delete("import_run_id"), window.history.replaceState({}, "", s.toString());
      const n = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports").toString(), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: this.selectedFile.id,
          account_id: this.currentAccountId || void 0,
          document_title: o
        })
      }), c = await n.json();
      if (!n.ok) {
        const h = c.error?.code || "";
        throw {
          message: c.error?.message || "Failed to start import",
          code: h
        };
      }
      this.currentImportRunId = _(c).import_run_id, this.pollAttempts = 0;
      const d = new URL(window.location.href);
      this.currentImportRunId && d.searchParams.set("import_run_id", this.currentImportRunId), window.history.replaceState({}, "", d.toString()), this.updateImportStatusMessage("Import queued..."), this.startPolling();
    } catch (s) {
      console.error("Import error:", s);
      const n = s;
      this.showImportError(n.message || "Failed to start import", n.code || ""), t && (t.disabled = !1), i && (i.textContent = "Import Document");
    }
  }
  startPolling() {
    this.pollTimeout = setTimeout(() => this.pollImportStatus(), R);
  }
  async pollImportStatus() {
    if (this.currentImportRunId) {
      if (this.pollTimeout = null, this.pollAttempts++, this.pollAttempts > L) {
        this.showImportError("Import is taking too long. Please check the documents list.", "");
        return;
      }
      try {
        const e = this.buildScopedAPIURL(`/esign/google-drive/imports/${encodeURIComponent(this.currentImportRunId)}`).toString(), t = await fetch(e, {
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        }), i = await t.json();
        if (!t.ok) throw new Error(i.error?.message || "Failed to check import status");
        const r = D(i);
        switch (r.status) {
          case "queued":
            this.updateImportStatusMessage("Waiting in queue..."), this.startPolling();
            break;
          case "running":
            this.updateImportStatusMessage("Importing document..."), this.startPolling();
            break;
          case "succeeded":
            this.showImportStatus("succeeded"), f("Import complete");
            const o = C(r, {
              agreements: this.config.routes.agreements,
              documents: this.config.routes.index,
              fallback: this.config.routes.index
            });
            setTimeout(() => {
              window.location.href = o;
            }, 1500);
            break;
          case "failed": {
            const s = r.error?.code || "", n = r.error?.message || "Import failed";
            this.showImportError(n, s), f("Import failed");
            break;
          }
          default:
            this.startPolling();
        }
      } catch (e) {
        console.error("Poll error:", e), this.pollAttempts < L ? this.startPolling() : this.showImportError("Unable to check import status", "");
      }
    }
  }
  resumeImportPolling(e) {
    this.currentImportRunId = e, this.pollAttempts = 0, this.showImportStatus("queued"), this.updateImportStatusMessage("Resuming import status..."), this.pollImportStatus();
  }
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
};
function q(e) {
  const t = new F(e);
  return x(() => t.init()), t;
}
function V(e) {
  const t = new F({
    basePath: e.basePath,
    apiBasePath: e.apiBasePath || `${e.basePath}/api/v1`,
    userId: e.userId,
    googleEnabled: e.googleEnabled !== !1,
    googleConnected: e.googleConnected !== !1,
    googleAccountId: e.googleAccountId,
    maxFileSize: e.maxFileSize,
    routes: e.routes
  });
  x(() => t.init()), typeof window < "u" && (window.esignDocumentFormController = t);
}
function U(e) {
  const t = String(e.basePath || e.base_path || "").trim(), i = e.routes && typeof e.routes == "object" ? e.routes : {}, r = e.features && typeof e.features == "object" ? e.features : {}, o = e.context && typeof e.context == "object" ? e.context : {}, s = String(i.index || "").trim();
  return !t && !s ? null : {
    basePath: t || "/admin",
    apiBasePath: String(e.apiBasePath || e.api_base_path || "").trim() || void 0,
    userId: String(e.userId || e.user_id || o.user_id || "").trim(),
    googleEnabled: !!(e.googleEnabled ?? r.google_enabled),
    googleConnected: !!(e.googleConnected ?? r.google_connected),
    googleAccountId: String(e.googleAccountId || e.google_account_id || o.google_account_id || "").trim(),
    maxFileSize: typeof e.maxFileSize == "number" ? e.maxFileSize : typeof e.max_file_size == "number" ? e.max_file_size : void 0,
    routes: {
      index: s,
      create: String(i.create || "").trim() || void 0,
      agreements: String(i.agreements || "").trim() || void 0,
      integrations: String(i.integrations || "").trim() || void 0
    }
  };
}
typeof document < "u" && x(() => {
  if (document.querySelector('[data-esign-page="admin.documents.ingestion"], [data-esign-page="document-form"]')) {
    const e = document.getElementById("esign-page-config");
    if (e) try {
      const t = U(JSON.parse(e.textContent || "{}"));
      t && new F(t).init();
    } catch (t) {
      console.warn("Failed to parse document form page config:", t);
    }
  }
});
export {
  V as n,
  q as r,
  F as t
};

//# sourceMappingURL=document-form-DZACJs5E.js.map