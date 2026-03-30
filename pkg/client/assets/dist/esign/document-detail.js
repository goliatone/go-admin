import { b as h, d as u } from "../chunks/formatters-DYQo8z6P.js";
import { q as g, b as a, h as r, s as c } from "../chunks/dom-helpers-Cd24RS2-.js";
import { onReady as f } from "../shared/dom-ready.js";
import { D as R, k as A, l as k, E as _, P as B, b as F, f as O, d as b, g as U, j as V, e as z, h as q, a as N, c as G, i as M } from "../chunks/provenance-card-CtU9gMsB.js";
import { a as p, l as m } from "../chunks/runtime-bhSs9hEJ.js";
function P(s = document) {
  g("[data-size-bytes]", s).forEach((t) => {
    const e = t.getAttribute("data-size-bytes");
    e && (t.textContent = h(e));
  });
}
function E(s = document) {
  g("[data-timestamp]", s).forEach((t) => {
    const e = t.getAttribute("data-timestamp");
    e && (t.textContent = u(e));
  });
}
function w(s = document) {
  P(s), E(s);
}
function v() {
  f(() => {
    w();
  });
}
typeof document < "u" && v();
class l {
  constructor(t) {
    this.pdfDoc = null, this.currentPage = 1, this.isLoading = !1, this.isLoaded = !1, this.scale = 1.5, this.config = t, this.elements = {
      loadBtn: a("#pdf-load-btn"),
      retryBtn: a("#pdf-retry-btn"),
      loading: a("#pdf-loading"),
      spinner: a("#pdf-spinner"),
      error: a("#pdf-error"),
      errorMessage: a("#pdf-error-message"),
      viewer: a("#pdf-viewer"),
      canvas: a("#pdf-canvas"),
      pagination: a("#pdf-pagination"),
      prevBtn: a("#pdf-prev-page"),
      nextBtn: a("#pdf-next-page"),
      currentPageEl: a("#pdf-current-page"),
      totalPagesEl: a("#pdf-total-pages"),
      status: a("#pdf-status")
    };
  }
  /**
   * Initialize the controller
   */
  init() {
    this.setupEventListeners();
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const { loadBtn: t, retryBtn: e, prevBtn: n, nextBtn: i } = this.elements;
    t && t.addEventListener("click", () => this.loadPdf()), e && e.addEventListener("click", () => this.loadPdf()), n && n.addEventListener("click", () => this.goToPage(this.currentPage - 1)), i && i.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (o) => {
      this.isLoaded && (o.key === "ArrowLeft" || o.key === "PageUp" ? this.goToPage(this.currentPage - 1) : (o.key === "ArrowRight" || o.key === "PageDown") && this.goToPage(this.currentPage + 1));
    });
  }
  /**
   * Load the PDF document
   */
  async loadPdf() {
    if (!this.isLoading) {
      this.isLoading = !0, this.showSpinner();
      try {
        this.updateStatus("Loading PDF...");
        const t = p({
          url: this.config.pdfUrl,
          withCredentials: !0,
          surface: "document-detail-preview",
          documentId: this.config.documentId
        });
        this.pdfDoc = await t.promise;
        const e = this.pdfDoc.numPages;
        this.elements.totalPagesEl && (this.elements.totalPagesEl.textContent = String(e)), this.isLoaded = !0, this.showViewer(), await this.renderPage(1), this.updateStatus("");
      } catch (t) {
        const e = m(t, {
          surface: "document-detail-preview",
          documentId: this.config.documentId,
          url: this.config.pdfUrl
        });
        this.showError(e.suggestion);
      } finally {
        this.isLoading = !1;
      }
    }
  }
  /**
   * Render a specific page
   */
  async renderPage(t) {
    if (!this.pdfDoc || !this.elements.canvas) return;
    const e = this.pdfDoc.numPages;
    if (!(t < 1 || t > e)) {
      this.currentPage = t, this.updateStatus(`Rendering page ${t}...`);
      try {
        const n = await this.pdfDoc.getPage(t), i = n.getViewport({ scale: this.scale }), o = this.elements.canvas, d = o.getContext("2d");
        if (!d)
          throw new Error("Failed to get canvas context");
        o.height = i.height, o.width = i.width, await n.render({
          canvasContext: d,
          viewport: i
        }).promise, this.updatePaginationState(), this.updateStatus("");
      } catch (n) {
        console.error("Failed to render page:", n), this.updateStatus("Failed to render page");
      }
    }
  }
  /**
   * Navigate to a specific page
   */
  goToPage(t) {
    if (!this.pdfDoc) return;
    const e = this.pdfDoc.numPages;
    t < 1 || t > e || this.renderPage(t);
  }
  /**
   * Update pagination button states
   */
  updatePaginationState() {
    const { prevBtn: t, nextBtn: e, currentPageEl: n, pagination: i } = this.elements, o = this.pdfDoc?.numPages || 1;
    i && i.classList.remove("hidden"), n && (n.textContent = String(this.currentPage)), t && (t.disabled = this.currentPage <= 1), e && (e.disabled = this.currentPage >= o);
  }
  /**
   * Update status text
   */
  updateStatus(t) {
    this.elements.status && (this.elements.status.textContent = t);
  }
  /**
   * Show the loading spinner
   */
  showSpinner() {
    const { loading: t, spinner: e, error: n, viewer: i } = this.elements;
    t && r(t), e && c(e), n && r(n), i && r(i);
  }
  /**
   * Show the PDF viewer
   */
  showViewer() {
    const { loading: t, spinner: e, error: n, viewer: i } = this.elements;
    t && r(t), e && r(e), n && r(n), i && c(i);
  }
  /**
   * Show error state
   */
  showError(t) {
    const { loading: e, spinner: n, error: i, errorMessage: o, viewer: d } = this.elements;
    e && r(e), n && r(n), i && c(i), d && r(d), o && (o.textContent = t);
  }
}
function S(s) {
  const t = new l(s);
  return t.init(), t;
}
function T(s) {
  const t = {
    documentId: s.documentId,
    pdfUrl: s.pdfUrl,
    pageCount: s.pageCount || 1
  }, e = new l(t);
  f(() => e.init()), typeof window < "u" && (window.esignDocumentDetailController = e);
}
typeof document < "u" && f(() => {
  const s = document.querySelector('[data-esign-page="document-detail"]');
  if (s instanceof HTMLElement) {
    const t = s.dataset.documentId || "", e = s.dataset.pdfUrl || "", n = parseInt(s.dataset.pageCount || "1", 10);
    t && e && new l({
      documentId: t,
      pdfUrl: e,
      pageCount: n
    }).init();
  }
});
export {
  R as DEFAULT_PROVENANCE_CARD_CONFIG,
  l as DocumentDetailPreviewController,
  A as EVIDENCE_COLLAPSED_SELECTOR,
  k as EVIDENCE_CONTAINER_SELECTOR,
  _ as EVIDENCE_TOGGLE_SELECTOR,
  B as PROVENANCE_CARD_SELECTOR,
  w as applyDetailFormatters,
  T as bootstrapDocumentDetailPreview,
  F as bootstrapProvenanceCards,
  P as formatSizeElements,
  E as formatTimestampElements,
  O as getLineageStatus,
  b as getProvenanceCardFor,
  U as getProvenanceCards,
  V as getResourceKind,
  z as hasEmptyState,
  q as hasWarnings,
  N as initAllEvidenceToggles,
  v as initDetailFormatters,
  S as initDocumentDetailPreview,
  G as initEvidenceToggle,
  M as initProvenanceCards
};
//# sourceMappingURL=document-detail.js.map
