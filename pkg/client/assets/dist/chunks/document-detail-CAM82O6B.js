import { onReady as c } from "../shared/dom-ready.js";
import { a as u, i as h } from "./formatters-oZ3pO-Hk.js";
import { c as o, d as l, p as d, u as s } from "./dom-helpers-PJrpTqcW.js";
import { n as g, t as p } from "./runtime-ChgMkM3p.js";
function m(t = document) {
  l("[data-size-bytes]", t).forEach((e) => {
    const i = e.getAttribute("data-size-bytes");
    i && (e.textContent = u(i));
  });
}
function P(t = document) {
  l("[data-timestamp]", t).forEach((e) => {
    const i = e.getAttribute("data-timestamp");
    i && (e.textContent = h(i));
  });
}
function w(t = document) {
  m(t), P(t);
}
function v() {
  c(() => {
    w();
  });
}
typeof document < "u" && v();
var f = class {
  constructor(t) {
    this.pdfDoc = null, this.currentPage = 1, this.isLoading = !1, this.isLoaded = !1, this.scale = 1.5, this.config = t, this.elements = {
      loadBtn: s("#pdf-load-btn"),
      retryBtn: s("#pdf-retry-btn"),
      loading: s("#pdf-loading"),
      spinner: s("#pdf-spinner"),
      error: s("#pdf-error"),
      errorMessage: s("#pdf-error-message"),
      viewer: s("#pdf-viewer"),
      canvas: s("#pdf-canvas"),
      pagination: s("#pdf-pagination"),
      prevBtn: s("#pdf-prev-page"),
      nextBtn: s("#pdf-next-page"),
      currentPageEl: s("#pdf-current-page"),
      totalPagesEl: s("#pdf-total-pages"),
      status: s("#pdf-status")
    };
  }
  init() {
    this.setupEventListeners();
  }
  setupEventListeners() {
    const { loadBtn: t, retryBtn: e, prevBtn: i, nextBtn: n } = this.elements;
    t && t.addEventListener("click", () => this.loadPdf()), e && e.addEventListener("click", () => this.loadPdf()), i && i.addEventListener("click", () => this.goToPage(this.currentPage - 1)), n && n.addEventListener("click", () => this.goToPage(this.currentPage + 1)), document.addEventListener("keydown", (a) => {
      this.isLoaded && (a.key === "ArrowLeft" || a.key === "PageUp" ? this.goToPage(this.currentPage - 1) : (a.key === "ArrowRight" || a.key === "PageDown") && this.goToPage(this.currentPage + 1));
    });
  }
  async loadPdf() {
    if (!this.isLoading) {
      this.isLoading = !0, this.showSpinner();
      try {
        this.updateStatus("Loading PDF..."), this.pdfDoc = await p({
          url: this.config.pdfUrl,
          withCredentials: !0,
          surface: "document-detail-preview",
          documentId: this.config.documentId
        }).promise;
        const t = this.pdfDoc.numPages;
        this.elements.totalPagesEl && (this.elements.totalPagesEl.textContent = String(t)), this.isLoaded = !0, this.showViewer(), await this.renderPage(1), this.updateStatus("");
      } catch (t) {
        const e = g(t, {
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
  async renderPage(t) {
    if (!this.pdfDoc || !this.elements.canvas) return;
    const e = this.pdfDoc.numPages;
    if (!(t < 1 || t > e)) {
      this.currentPage = t, this.updateStatus(`Rendering page ${t}...`);
      try {
        const i = await this.pdfDoc.getPage(t), n = i.getViewport({ scale: this.scale }), a = this.elements.canvas, r = a.getContext("2d");
        if (!r) throw new Error("Failed to get canvas context");
        a.height = n.height, a.width = n.width, await i.render({
          canvasContext: r,
          viewport: n
        }).promise, this.updatePaginationState(), this.updateStatus("");
      } catch (i) {
        console.error("Failed to render page:", i), this.updateStatus("Failed to render page");
      }
    }
  }
  goToPage(t) {
    if (!this.pdfDoc) return;
    const e = this.pdfDoc.numPages;
    t < 1 || t > e || this.renderPage(t);
  }
  updatePaginationState() {
    const { prevBtn: t, nextBtn: e, currentPageEl: i, pagination: n } = this.elements, a = this.pdfDoc?.numPages || 1;
    n && n.classList.remove("hidden"), i && (i.textContent = String(this.currentPage)), t && (t.disabled = this.currentPage <= 1), e && (e.disabled = this.currentPage >= a);
  }
  updateStatus(t) {
    this.elements.status && (this.elements.status.textContent = t);
  }
  showSpinner() {
    const { loading: t, spinner: e, error: i, viewer: n } = this.elements;
    t && o(t), e && d(e), i && o(i), n && o(n);
  }
  showViewer() {
    const { loading: t, spinner: e, error: i, viewer: n } = this.elements;
    t && o(t), e && o(e), i && o(i), n && d(n);
  }
  showError(t) {
    const { loading: e, spinner: i, error: n, errorMessage: a, viewer: r } = this.elements;
    e && o(e), i && o(i), n && d(n), r && o(r), a && (a.textContent = t);
  }
};
function x(t) {
  const e = new f(t);
  return e.init(), e;
}
function C(t) {
  const e = new f({
    documentId: t.documentId,
    pdfUrl: t.pdfUrl,
    pageCount: t.pageCount || 1
  });
  c(() => e.init()), typeof window < "u" && (window.esignDocumentDetailController = e);
}
typeof document < "u" && c(() => {
  const t = document.querySelector('[data-esign-page="document-detail"]');
  if (t instanceof HTMLElement) {
    const e = t.dataset.documentId || "", i = t.dataset.pdfUrl || "", n = parseInt(t.dataset.pageCount || "1", 10);
    e && i && new f({
      documentId: e,
      pdfUrl: i,
      pageCount: n
    }).init();
  }
});
export {
  m as a,
  w as i,
  C as n,
  P as o,
  x as r,
  v as s,
  f as t
};

//# sourceMappingURL=document-detail-CAM82O6B.js.map