import { f as h, b as u } from "../chunks/formatters-9EdySuC_.js";
import { f, q as g, b as a, h as r, s as c } from "../chunks/dom-helpers-CMRVXsMj.js";
import { D as I, k as R, l as A, E as k, P as _, b as B, f as F, d as O, g as b, j as U, e as V, h as z, a as q, c as N, i as G } from "../chunks/provenance-card-DHMrX2oO.js";
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
function y(s) {
  const t = new l(s);
  return t.init(), t;
}
function S(s) {
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
  I as DEFAULT_PROVENANCE_CARD_CONFIG,
  l as DocumentDetailPreviewController,
  R as EVIDENCE_COLLAPSED_SELECTOR,
  A as EVIDENCE_CONTAINER_SELECTOR,
  k as EVIDENCE_TOGGLE_SELECTOR,
  _ as PROVENANCE_CARD_SELECTOR,
  w as applyDetailFormatters,
  S as bootstrapDocumentDetailPreview,
  B as bootstrapProvenanceCards,
  P as formatSizeElements,
  E as formatTimestampElements,
  F as getLineageStatus,
  O as getProvenanceCardFor,
  b as getProvenanceCards,
  U as getResourceKind,
  V as hasEmptyState,
  z as hasWarnings,
  q as initAllEvidenceToggles,
  v as initDetailFormatters,
  y as initDocumentDetailPreview,
  N as initEvidenceToggle,
  G as initProvenanceCards
};
//# sourceMappingURL=document-detail.js.map
