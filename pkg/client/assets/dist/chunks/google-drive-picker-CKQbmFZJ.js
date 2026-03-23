import { B as S, _ as T, g as k } from "./lineage-contracts-Clh6Zaep.js";
import { c as L, f as m, l as r, o as u, t as v, u as P } from "./dom-helpers-CDdChTSn.js";
import { r as I } from "./formatters-CcW2Edf9.js";
import { n as A } from "./async-helpers-CA3ovFR9.js";
var b = "esign.google.account_id", y = {
  "application/vnd.google-apps.folder": "folder",
  "application/vnd.google-apps.document": "doc",
  "application/vnd.google-apps.spreadsheet": "sheet",
  "application/vnd.google-apps.presentation": "slide",
  "application/pdf": "pdf",
  default: "file"
}, x = ["application/vnd.google-apps.document", "application/pdf"], F = class {
  constructor(e) {
    this.currentFiles = [], this.nextPageToken = null, this.currentFolderPath = [{
      id: "root",
      name: "My Drive"
    }], this.selectedFile = null, this.searchQuery = "", this.isListView = !0, this.isLoading = !1, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.currentAccountId = this.resolveInitialAccountId(), this.elements = {
      searchInput: r("#drive-search"),
      clearSearchBtn: r("#clear-search-btn"),
      fileList: r("#file-list"),
      loadingState: r("#loading-state"),
      breadcrumb: r("#breadcrumb"),
      listTitle: r("#list-title"),
      resultCount: r("#result-count"),
      pagination: r("#pagination"),
      loadMoreBtn: r("#load-more-btn"),
      refreshBtn: r("#refresh-btn"),
      announcements: r("#drive-announcements"),
      accountScopeHelp: r("#account-scope-help"),
      connectGoogleLink: r("#connect-google-link"),
      noSelection: r("#no-selection"),
      filePreview: r("#file-preview"),
      previewIcon: r("#preview-icon"),
      previewTitle: r("#preview-title"),
      previewType: r("#preview-type"),
      previewFileId: r("#preview-file-id"),
      previewOwner: r("#preview-owner"),
      previewLocation: r("#preview-location"),
      previewModified: r("#preview-modified"),
      importBtn: r("#import-btn"),
      openInGoogleBtn: r("#open-in-google-btn"),
      clearSelectionBtn: r("#clear-selection-btn"),
      importModal: r("#import-modal"),
      importForm: r("#import-form"),
      importGoogleFileId: r("#import-google-file-id"),
      importDocumentTitle: r("#import-document-title"),
      importAgreementTitle: r("#import-agreement-title"),
      importCancelBtn: r("#import-cancel-btn"),
      importConfirmBtn: r("#import-confirm-btn"),
      importSpinner: r("#import-spinner"),
      importBtnText: r("#import-btn-text"),
      viewListBtn: r("#view-list-btn"),
      viewGridBtn: r("#view-grid-btn")
    };
  }
  async init() {
    this.config.googleConnected && (this.setupEventListeners(), this.updateScopedUI(), await this.loadFiles());
  }
  setupEventListeners() {
    const { searchInput: e, clearSearchBtn: t, refreshBtn: i, loadMoreBtn: n, importBtn: s, clearSelectionBtn: o, importCancelBtn: l, importConfirmBtn: h, importForm: a, importModal: c, viewListBtn: d, viewGridBtn: g } = this.elements;
    if (e) {
      const p = A(() => this.handleSearch(), 300);
      e.addEventListener("input", p), e.addEventListener("keydown", (w) => {
        w.key === "Enter" && (w.preventDefault(), this.handleSearch());
      });
    }
    t && t.addEventListener("click", () => this.clearSearch()), i && i.addEventListener("click", () => this.refresh()), n && n.addEventListener("click", () => this.loadMore()), s && s.addEventListener("click", () => this.showImportModal()), o && o.addEventListener("click", () => this.clearSelection()), l && l.addEventListener("click", () => this.hideImportModal()), h && a && a.addEventListener("submit", (p) => {
      p.preventDefault(), this.handleImport();
    }), c && c.addEventListener("click", (p) => {
      const w = p.target;
      (w === c || w.getAttribute("aria-hidden") === "true") && this.hideImportModal();
    }), d && d.addEventListener("click", () => this.setViewMode("list")), g && g.addEventListener("click", () => this.setViewMode("grid")), document.addEventListener("keydown", (p) => {
      p.key === "Escape" && c && !c.classList.contains("hidden") && this.hideImportModal();
    });
    const { fileList: f } = this.elements;
    f && f.addEventListener("click", (p) => this.handleFileListClick(p));
  }
  resolveInitialAccountId() {
    const e = new URLSearchParams(window.location.search), t = this.normalizeAccountId(e.get("account_id"));
    if (t) return t;
    const i = this.normalizeAccountId(this.config.googleAccountId);
    if (i) return i;
    try {
      return this.normalizeAccountId(window.localStorage.getItem(b));
    } catch {
      return "";
    }
  }
  normalizeAccountId(e) {
    return (e || "").trim();
  }
  updateScopedUI() {
    this.syncScopedURLState();
    const { accountScopeHelp: e, connectGoogleLink: t } = this.elements;
    if (e && (this.currentAccountId ? (e.textContent = `Account scope: ${this.currentAccountId}`, m(e)) : u(e)), t) {
      const i = t.dataset.baseHref || t.getAttribute("href");
      i && t.setAttribute("href", this.applyAccountIdToPath(i));
    }
  }
  syncScopedURLState() {
    const e = new URL(window.location.href);
    this.currentAccountId ? e.searchParams.set("account_id", this.currentAccountId) : e.searchParams.delete("account_id"), window.history.replaceState({}, "", e.toString());
    try {
      this.currentAccountId ? window.localStorage.setItem(b, this.currentAccountId) : window.localStorage.removeItem(b);
    } catch {
    }
  }
  applyAccountIdToPath(e) {
    const t = new URL(e, window.location.origin);
    return this.currentAccountId ? t.searchParams.set("account_id", this.currentAccountId) : t.searchParams.delete("account_id"), `${t.pathname}${t.search}${t.hash}`;
  }
  buildScopedAPIURL(e) {
    const t = new URL(`${this.apiBase}${e}`, window.location.origin);
    return t.searchParams.set("user_id", this.config.userId || ""), this.currentAccountId && t.searchParams.set("account_id", this.currentAccountId), t.toString();
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
    const t = String(e.id || e.ID || "").trim(), i = String(e.name || e.Name || "").trim(), n = String(e.mimeType || e.MimeType || "").trim(), s = String(e.modifiedTime || e.ModifiedTime || "").trim(), o = String(e.webViewLink || e.webViewURL || e.WebViewURL || "").trim(), l = String(e.parentId || e.ParentID || "").trim(), h = String(e.ownerEmail || e.OwnerEmail || "").trim();
    return {
      id: t,
      name: i,
      mimeType: n,
      modifiedTime: s,
      webViewLink: o,
      parents: Array.isArray(e.parents) ? e.parents : l ? [l] : [],
      owners: Array.isArray(e.owners) ? e.owners : h ? [{ emailAddress: h }] : [],
      size: e.size,
      iconLink: e.iconLink,
      thumbnailLink: e.thumbnailLink
    };
  }
  async loadFiles(e = !1) {
    if (this.isLoading) return;
    this.isLoading = !0;
    const { loadingState: t, fileList: i } = this.elements;
    e || (this.currentFiles = [], this.nextPageToken = null, t && m(t));
    try {
      const n = this.currentFolderPath[this.currentFolderPath.length - 1];
      let s;
      this.searchQuery ? s = this.buildScopedAPIURL(`/esign/integrations/google/files?q=${encodeURIComponent(this.searchQuery)}`) : s = this.buildScopedAPIURL(`/esign/integrations/google/files?folder_id=${encodeURIComponent(n.id)}`), this.nextPageToken && (s += `&page_token=${encodeURIComponent(this.nextPageToken)}`);
      const o = await fetch(s, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!o.ok) throw new Error(`Failed to load files: ${o.status}`);
      const l = await o.json(), h = Array.isArray(l.files) ? l.files.map((a) => this.normalizeDriveFile(a)) : [];
      e ? this.currentFiles = [...this.currentFiles, ...h] : this.currentFiles = h, this.nextPageToken = l.next_page_token || null, this.renderFiles(), this.updateResultCount(), this.updatePagination(), v(this.searchQuery ? `Found ${this.currentFiles.length} files` : `Loaded ${this.currentFiles.length} files`);
    } catch (n) {
      console.error("Error loading files:", n), this.renderError(n instanceof Error ? n.message : "Failed to load files"), v("Error loading files");
    } finally {
      this.isLoading = !1, t && u(t);
    }
  }
  renderFiles() {
    const { fileList: e, loadingState: t } = this.elements;
    if (e) {
      if (t && u(t), this.currentFiles.length === 0) {
        e.innerHTML = `
        <div class="p-8 text-center">
          <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-gray-900 mb-2">
            ${this.searchQuery ? "No files found" : "This folder is empty"}
          </h3>
          <p class="text-sm text-gray-500">
            ${this.searchQuery ? "Try a different search term" : "No files in this folder"}
          </p>
        </div>
      `;
        return;
      }
      e.innerHTML = this.currentFiles.map((i) => this.renderFileItem(i)).join("");
    }
  }
  renderFileItem(e) {
    const t = e.mimeType === "application/vnd.google-apps.folder", i = x.includes(e.mimeType), n = this.selectedFile?.id === e.id, s = y[e.mimeType] || y.default, o = this.getFileIcon(s);
    return `
      <div
        class="file-item flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer ${n ? "bg-blue-50 border-l-2 border-blue-500" : ""}"
        data-file-id="${this.escapeHtml(e.id)}"
        data-is-folder="${t}"
        role="option"
        aria-selected="${n}"
        tabindex="0"
      >
        <div class="w-8 h-8 flex items-center justify-center flex-shrink-0">
          ${o}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-gray-900 truncate">
            ${this.escapeHtml(e.name)}
          </p>
          <p class="text-xs text-gray-500">
            ${I(e.modifiedTime)}
          </p>
        </div>
        ${i ? '<span class="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">Importable</span>' : ""}
      </div>
    `;
  }
  getFileIcon(e) {
    const t = {
      folder: '<svg class="w-6 h-6 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>',
      doc: '<svg class="w-6 h-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>',
      sheet: '<svg class="w-6 h-6 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 7h2v2H7zm0 4h2v2H7zm0 4h2v2H7zm4-8h6v2h-6zm0 4h6v2h-6zm0 4h6v2h-6z"/></svg>',
      slide: '<svg class="w-6 h-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>',
      pdf: '<svg class="w-6 h-6 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>',
      file: '<svg class="w-6 h-6 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13z"/></svg>'
    };
    return t[e] || t.file;
  }
  handleFileListClick(e) {
    const t = e.target.closest(".file-item");
    if (!t) return;
    const i = t.dataset.fileId, n = t.dataset.isFolder === "true";
    i && (n ? this.navigateToFolder(i) : this.selectFile(i));
  }
  navigateToFolder(e) {
    const t = this.currentFiles.find((i) => i.id === e);
    t && (this.currentFolderPath.push({
      id: t.id,
      name: t.name
    }), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles());
  }
  selectFile(e) {
    const t = this.currentFiles.find((i) => i.id === e);
    t && (this.selectedFile = t, this.renderSelection(), this.renderFiles(), v(`Selected: ${t.name}`));
  }
  clearSelection() {
    this.selectedFile = null, this.renderSelection(), this.renderFiles();
  }
  renderSelection() {
    const { noSelection: e, filePreview: t, previewIcon: i, previewTitle: n, previewType: s, previewFileId: o, previewOwner: l, previewModified: h, importBtn: a, openInGoogleBtn: c } = this.elements;
    if (!this.selectedFile) {
      e && m(e), t && u(t);
      return;
    }
    e && u(e), t && m(t);
    const d = this.selectedFile, g = x.includes(d.mimeType);
    n && (n.textContent = d.name), s && (s.textContent = this.getMimeTypeLabel(d.mimeType)), o && (o.textContent = d.id), l && d.owners.length > 0 && (l.textContent = d.owners[0].emailAddress || "-"), h && (h.textContent = I(d.modifiedTime)), a && (g ? (a.removeAttribute("disabled"), a.classList.remove("opacity-50", "cursor-not-allowed")) : (a.setAttribute("disabled", "true"), a.classList.add("opacity-50", "cursor-not-allowed"))), c && d.webViewLink && (c.href = d.webViewLink);
  }
  getMimeTypeLabel(e) {
    return {
      "application/vnd.google-apps.folder": "Folder",
      "application/vnd.google-apps.document": "Google Doc",
      "application/vnd.google-apps.spreadsheet": "Google Sheet",
      "application/vnd.google-apps.presentation": "Google Slides",
      "application/pdf": "PDF"
    }[e] || "File";
  }
  updateBreadcrumb() {
    const { breadcrumb: e, listTitle: t } = this.elements;
    if (!e) return;
    if (this.searchQuery) {
      u(e), t && (t.textContent = "Search Results");
      return;
    }
    m(e);
    const i = this.currentFolderPath[this.currentFolderPath.length - 1];
    t && (t.textContent = i.name);
    const n = e.querySelector("ol");
    n && (n.innerHTML = this.currentFolderPath.map((s, o) => `
        <li class="flex items-center">
          ${o > 0 ? '<span class="text-gray-400 mx-2">/</span>' : ""}
          <button
            type="button"
            data-folder-id="${this.escapeHtml(s.id)}"
            data-folder-index="${o}"
            class="breadcrumb-item text-blue-600 hover:text-blue-800 hover:underline"
          >
            ${this.escapeHtml(s.name)}
          </button>
        </li>
      `).join(""), P(".breadcrumb-item", n).forEach((s) => {
      s.addEventListener("click", () => {
        const o = parseInt(s.dataset.folderIndex || "0", 10);
        this.navigateToBreadcrumb(o);
      });
    }));
  }
  navigateToBreadcrumb(e) {
    e < 0 || e >= this.currentFolderPath.length - 1 || (this.currentFolderPath = this.currentFolderPath.slice(0, e + 1), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles());
  }
  updateResultCount() {
    const { resultCount: e } = this.elements;
    e && (this.currentFiles.length > 0 ? e.textContent = `(${this.currentFiles.length}${this.nextPageToken ? "+" : ""} files)` : e.textContent = "");
  }
  updatePagination() {
    const { pagination: e, loadMoreBtn: t } = this.elements;
    e && (this.nextPageToken ? m(e) : u(e));
  }
  handleSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    if (!e) return;
    const i = e.value.trim();
    this.searchQuery = i, t && (i ? m(t) : u(t)), this.clearSelection(), this.loadFiles();
  }
  clearSearch() {
    const { searchInput: e, clearSearchBtn: t } = this.elements;
    e && (e.value = ""), t && u(t), this.searchQuery = "", this.clearSelection(), this.updateBreadcrumb(), this.loadFiles();
  }
  refresh() {
    this.clearSelection(), this.loadFiles();
  }
  loadMore() {
    this.nextPageToken && this.loadFiles(!0);
  }
  setViewMode(e) {
    const { viewListBtn: t, viewGridBtn: i } = this.elements;
    this.isListView = e === "list", t && t.setAttribute("aria-pressed", String(this.isListView)), i && i.setAttribute("aria-pressed", String(!this.isListView)), this.renderFiles();
  }
  showImportModal() {
    if (!this.selectedFile) return;
    const { importModal: e, importGoogleFileId: t, importDocumentTitle: i, importAgreementTitle: n } = this.elements;
    t && (t.value = this.selectedFile.id), i && (i.value = this.selectedFile.name.replace(/\.[^/.]+$/, "")), n && (n.value = ""), e && m(e);
  }
  hideImportModal() {
    const { importModal: e } = this.elements;
    e && u(e);
  }
  async handleImport() {
    if (!this.selectedFile) return;
    const { importConfirmBtn: e, importSpinner: t, importBtnText: i, importDocumentTitle: n, importAgreementTitle: s } = this.elements, o = this.selectedFile.id, l = n?.value.trim() || this.selectedFile.name, h = s?.value.trim() || "";
    e && e.setAttribute("disabled", "true"), t && m(t), i && (i.textContent = "Importing...");
    try {
      const a = await fetch(this.buildScopedAPIURL("/esign/google-drive/imports"), {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          google_file_id: o,
          document_title: l,
          agreement_title: h || void 0
        })
      });
      if (!a.ok) {
        const p = await a.json();
        throw new Error(p.error?.message || "Import failed");
      }
      const c = await a.json(), d = T(c), g = k(c);
      if (this.showToast("Import started successfully", "success"), v("Import started"), this.hideImportModal(), g.status === "succeeded" && this.config.pickerRoutes?.documents) {
        window.location.href = S(g, {
          agreements: this.config.pickerRoutes.agreements,
          documents: this.config.pickerRoutes.documents,
          fallback: this.config.pickerRoutes.documents
        });
        return;
      }
      const f = this.buildImportMonitorURL(d.import_run_id);
      f && (window.location.href = f);
    } catch (a) {
      console.error("Import error:", a);
      const c = a instanceof Error ? a.message : "Import failed";
      this.showToast(c, "error"), v(`Error: ${c}`);
    } finally {
      e && e.removeAttribute("disabled"), t && u(t), i && (i.textContent = "Import");
    }
  }
  renderError(e) {
    const { fileList: t } = this.elements;
    t && (t.innerHTML = `
      <div class="p-8 text-center">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-gray-900 mb-2">Error Loading Files</h3>
        <p class="text-sm text-gray-500 mb-4">${this.escapeHtml(e)}</p>
        <button type="button" class="btn btn-secondary" onclick="location.reload()">
          Try Again
        </button>
      </div>
    `);
  }
  showToast(e, t) {
    const i = window.toastManager;
    if (i) {
      t === "success" ? i.success(e) : i.error(e);
      return;
    }
    t === "success" ? window.alert(`Success: ${e}`) : window.alert(`Error: ${e}`);
  }
  buildImportMonitorURL(e) {
    const t = this.config.pickerRoutes?.documentImport;
    if (!t || !e) return null;
    const i = new URL(t, window.location.origin);
    return i.searchParams.set("source", "google"), i.searchParams.set("import_run_id", e), i.toString();
  }
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e, t.innerHTML;
  }
};
function $(e) {
  const t = new F(e);
  return L(() => t.init()), t;
}
function R(e) {
  const t = new F({
    basePath: e.basePath,
    apiBasePath: e.apiBasePath || `${e.basePath}/api`,
    userId: e.userId,
    googleAccountId: e.googleAccountId,
    googleConnected: e.googleConnected !== !1,
    pickerRoutes: e.pickerRoutes
  });
  L(() => t.init()), typeof window < "u" && (window.esignGoogleDrivePickerController = t);
}
export {
  R as n,
  $ as r,
  F as t
};

//# sourceMappingURL=google-drive-picker-CKQbmFZJ.js.map