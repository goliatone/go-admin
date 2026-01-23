function N(B) {
  if (B === 0) return "0 Bytes";
  const e = 1024, s = ["Bytes", "KB", "MB", "GB"], t = Math.floor(Math.log(B) / Math.log(e));
  return `${parseFloat((B / Math.pow(e, t)).toFixed(2))} ${s[t]}`;
}
class z {
  /**
   * @param options - Configuration options
   * @param options.modalId - ID of the modal element
   * @param options.endpoint - API endpoint for file upload
   * @param options.onSuccess - Callback when import succeeds (receives summary)
   * @param options.notifier - Toast notification manager (with success/error methods)
   * @param options.resourceName - Name of resource being imported (default: 'items')
   */
  constructor(e = {}) {
    this.modalId = e.modalId || "import-modal", this.endpoint = e.endpoint || "/api/import", this.onSuccess = e.onSuccess || (() => {
    }), this.notifier = e.notifier || { success: console.log, error: console.error }, this.resourceName = e.resourceName || "items", this.elements = {}, this.isFullscreen = !1, this.currentFilter = "all", this.resultItems = [], this.bindElements(), this.bindEvents();
  }
  /**
   * Bind DOM elements
   */
  bindElements() {
    const e = this.modalId.replace("-modal", "");
    this.elements = {
      modal: document.getElementById(this.modalId),
      container: document.getElementById(`${e}-container`),
      backdrop: document.getElementById(`${e}-backdrop`),
      closeBtn: document.getElementById(`${e}-close`),
      cancelBtn: document.getElementById(`${e}-cancel`),
      fullscreenBtn: document.getElementById(`${e}-fullscreen`),
      expandIcon: document.getElementById(`${e}-expand-icon`),
      collapseIcon: document.getElementById(`${e}-collapse-icon`),
      form: document.getElementById(`${e}-form`),
      fileInput: document.getElementById(`${e}-file`),
      submitBtn: document.getElementById(`${e}-submit`),
      anotherBtn: document.getElementById(`${e}-another`),
      spinner: document.getElementById(`${e}-spinner`),
      results: document.getElementById(`${e}-results`),
      error: document.getElementById(`${e}-error`),
      errorBanner: document.getElementById(`${e}-error-banner`),
      resultsBody: document.getElementById(`${e}-results-body`),
      tableScroll: document.getElementById(`${e}-table-scroll`),
      dropzone: document.getElementById(`${e}-dropzone`),
      dropzoneEmpty: document.getElementById(`${e}-dropzone-empty`),
      dropzoneSelected: document.getElementById(`${e}-dropzone-selected`),
      fileName: document.getElementById(`${e}-file-name`),
      fileSize: document.getElementById(`${e}-file-size`),
      fileRemove: document.getElementById(`${e}-file-remove`),
      statProcessed: document.getElementById(`${e}-stat-processed`),
      statSucceeded: document.getElementById(`${e}-stat-succeeded`),
      statFailed: document.getElementById(`${e}-stat-failed`),
      visibleCount: document.getElementById(`${e}-visible-count`),
      totalCount: document.getElementById(`${e}-total-count`)
    };
  }
  /**
   * Bind event listeners
   */
  bindEvents() {
    const { modal: e, backdrop: s, closeBtn: t, cancelBtn: n, fileInput: i, fileRemove: l, anotherBtn: r, submitBtn: a, fullscreenBtn: c } = this.elements;
    t && t.addEventListener("click", () => this.close()), n && n.addEventListener("click", () => this.close()), s && s.addEventListener("click", () => this.close()), i && i.addEventListener("change", () => this.updateFilePreview()), l && l.addEventListener("click", (o) => {
      o.preventDefault(), o.stopPropagation();
      const m = this.elements.fileInput;
      m && (m.value = ""), this.updateFilePreview();
    }), r && r.addEventListener("click", () => this.reset()), a && a.addEventListener("click", (o) => this.handleSubmit(o)), c && c.addEventListener("click", () => this.toggleFullscreen()), this.bindDragAndDrop(), this.bindFilterButtons(), document.addEventListener("keydown", (o) => {
      o.key === "Escape" && e && !e.classList.contains("hidden") && (this.isFullscreen ? this.toggleFullscreen() : this.close());
    });
  }
  /**
   * Bind filter button events
   */
  bindFilterButtons() {
    const { modal: e } = this.elements;
    if (!e) return;
    const s = e.querySelectorAll(".import-filter-btn");
    s.forEach((t) => {
      t.addEventListener("click", () => {
        const n = t.getAttribute("data-filter") || "all";
        this.setFilter(n), s.forEach((i) => {
          i.classList.toggle("active", i === t), i.classList.toggle("bg-gray-100", i === t), i.classList.toggle("text-gray-700", i === t), i.classList.toggle("text-gray-500", i !== t);
        });
      });
    });
  }
  /**
   * Set the current filter and update display
   * @param filter - 'all', 'succeeded', or 'failed'
   */
  setFilter(e) {
    this.currentFilter = e, this.applyFilter();
  }
  /**
   * Apply the current filter to results
   */
  applyFilter() {
    const { resultsBody: e, visibleCount: s } = this.elements;
    if (!e) return;
    const t = e.querySelectorAll("tr");
    let n = 0;
    t.forEach((i) => {
      const l = i.getAttribute("data-status");
      let r = !0;
      this.currentFilter === "succeeded" ? r = l === "succeeded" : this.currentFilter === "failed" && (r = l === "failed"), i.style.display = r ? "" : "none", r && n++;
    }), s && (s.textContent = String(n));
  }
  /**
   * Toggle fullscreen mode
   */
  toggleFullscreen() {
    const { container: e, expandIcon: s, collapseIcon: t, tableScroll: n } = this.elements;
    e && (this.isFullscreen = !this.isFullscreen, this.isFullscreen ? (e.classList.remove("max-w-3xl", "max-h-[90vh]"), e.classList.add("w-full", "h-full", "m-0"), e.style.maxWidth = "none", e.style.maxHeight = "none", e.style.borderRadius = "0", s && s.classList.add("hidden"), t && t.classList.remove("hidden"), n && (n.style.maxHeight = "60vh")) : (e.classList.add("w-full", "max-w-3xl", "max-h-[90vh]"), e.classList.remove("h-full", "m-0"), e.style.maxWidth = "", e.style.maxHeight = "", e.style.borderRadius = "", s && s.classList.remove("hidden"), t && t.classList.add("hidden"), n && (n.style.maxHeight = "40vh")));
  }
  /**
   * Bind drag and drop events
   */
  bindDragAndDrop() {
    const { dropzone: e } = this.elements, s = this.elements.fileInput;
    e && (["dragenter", "dragover"].forEach((t) => {
      e.addEventListener(t, (n) => {
        n.preventDefault(), n.stopPropagation(), e.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((t) => {
      e.addEventListener(t, (n) => {
        n.preventDefault(), n.stopPropagation(), e.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), e.addEventListener("drop", (t) => {
      const i = t.dataTransfer?.files;
      if (i && i.length > 0 && s) {
        const l = new DataTransfer();
        l.items.add(i[0]), s.files = l.files, this.updateFilePreview();
      }
    }));
  }
  /**
   * Update the file preview display
   */
  updateFilePreview() {
    const e = this.elements.fileInput, { dropzoneEmpty: s, dropzoneSelected: t, fileName: n, fileSize: i, submitBtn: l } = this.elements, r = e?.files?.[0] ?? null;
    !!r ? (r && n && (n.textContent = r.name), r && i && (i.textContent = N(r.size)), s && s.classList.add("hidden"), t && t.classList.remove("hidden"), l && (l.disabled = !1)) : (s && s.classList.remove("hidden"), t && t.classList.add("hidden"), l && (l.disabled = !0));
  }
  /**
   * Reset the modal to initial state
   */
  reset() {
    const { fileInput: e, results: s, form: t, errorBanner: n, error: i, resultsBody: l, submitBtn: r, anotherBtn: a, statProcessed: c, statSucceeded: o, statFailed: m, visibleCount: x, totalCount: v, modal: h } = this.elements;
    e && (e.value = ""), this.updateFilePreview(), s && s.classList.add("hidden"), t && t.classList.remove("hidden"), n && n.classList.add("hidden"), i && (i.textContent = ""), l && (l.innerHTML = ""), r && (r.classList.remove("hidden"), r.disabled = !0), a && a.classList.add("hidden"), c && (c.textContent = "0"), o && (o.textContent = "0"), m && (m.textContent = "0"), x && (x.textContent = "0"), v && (v.textContent = "0"), this.currentFilter = "all", this.resultItems = [], h && h.querySelectorAll(".import-filter-btn").forEach((f) => {
      const p = f.getAttribute("data-filter") === "all";
      f.classList.toggle("active", p), f.classList.toggle("bg-gray-100", p), f.classList.toggle("text-gray-700", p), f.classList.toggle("text-gray-500", !p);
    }), this.isFullscreen && this.toggleFullscreen();
  }
  /**
   * Set loading state
   * @param isLoading - Whether loading is in progress
   */
  setLoading(e) {
    const { submitBtn: s, cancelBtn: t, spinner: n } = this.elements;
    s && (s.disabled = e, s.classList.toggle("opacity-50", e)), t && (t.disabled = e), n && (n.classList.toggle("hidden", !e), n.classList.toggle("flex", e));
  }
  /**
   * Open the modal
   */
  open() {
    const { modal: e } = this.elements;
    e && (this.reset(), e.classList.remove("hidden"), document.body.classList.add("overflow-hidden"));
  }
  /**
   * Close the modal
   */
  close() {
    const { modal: e } = this.elements;
    e && (e.classList.add("hidden"), document.body.classList.remove("overflow-hidden"));
  }
  /**
   * Build a table cell element
   * @param value - Cell content
   * @param className - CSS classes
   */
  buildCell(e, s) {
    const t = document.createElement("td");
    return t.className = s, t.textContent = e, t;
  }
  /**
   * Render import results
   * @param payload - API response payload
   */
  renderResults(e) {
    const { results: s, resultsBody: t, form: n, submitBtn: i, anotherBtn: l, errorBanner: r, error: a, statProcessed: c, statSucceeded: o, statFailed: m, visibleCount: x, totalCount: v } = this.elements;
    if (!s || !t) return;
    const h = e && e.summary ? e.summary : {}, S = Number(h.processed) || 0, f = Number(h.succeeded) || 0, p = Number(h.failed) || 0, E = Array.isArray(e && e.results) ? e.results : [], F = e && e.error ? String(e.error).trim() : "";
    if (this.resultItems = E, c && (c.textContent = String(S)), o && (o.textContent = String(f)), m && (m.textContent = String(p)), v && (v.textContent = String(E.length)), x && (x.textContent = String(E.length)), F && r && a && (a.textContent = F, r.classList.remove("hidden")), t.innerHTML = "", E.length === 0) {
      const d = document.createElement("tr"), I = this.buildCell("No results to display", "px-4 py-4 text-gray-500 text-center");
      I.colSpan = 5, d.appendChild(I), t.appendChild(d);
    } else
      E.forEach((d, I) => {
        const u = document.createElement("tr"), w = typeof d.index == "number" ? d.index + 1 : I + 1, $ = d.email ? String(d.email) : "-", A = d.user_id ? String(d.user_id) : "-", g = d.error && String(d.error).trim() !== "", k = g ? "Failed" : d.status ? String(d.status) : "Created";
        u.className = g ? "bg-red-50" : "bg-green-50", u.setAttribute("data-status", g ? "failed" : "succeeded"), u.appendChild(this.buildCell(String(w), "px-4 py-2 text-gray-700 font-medium")), u.appendChild(this.buildCell($, "px-4 py-2 text-gray-900")), u.appendChild(this.buildCell(A, "px-4 py-2 text-gray-500 font-mono text-xs"));
        const C = document.createElement("td");
        C.className = "px-4 py-2";
        const L = document.createElement("span");
        L.className = g ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700" : "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700";
        const y = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        y.setAttribute("class", "w-3 h-3"), y.setAttribute("fill", "none"), y.setAttribute("stroke", "currentColor"), y.setAttribute("viewBox", "0 0 24 24");
        const b = document.createElementNS("http://www.w3.org/2000/svg", "path");
        b.setAttribute("stroke-linecap", "round"), b.setAttribute("stroke-linejoin", "round"), b.setAttribute("stroke-width", "2"), b.setAttribute("d", g ? "M6 18L18 6M6 6l12 12" : "M5 13l4 4L19 7"), y.appendChild(b), L.appendChild(y), L.appendChild(document.createTextNode(k)), C.appendChild(L), u.appendChild(C), u.appendChild(this.buildCell(g ? String(d.error) : "-", "px-4 py-2 text-gray-600 text-xs")), t.appendChild(u);
      });
    n && n.classList.add("hidden"), s.classList.remove("hidden"), i && i.classList.add("hidden"), l && l.classList.remove("hidden"), this.applyFilter();
  }
  /**
   * Handle form submission
   * @param event - Submit event
   */
  async handleSubmit(e) {
    e.preventDefault();
    const s = this.elements.fileInput;
    if (!s || !s.files || s.files.length === 0) {
      this.notifier.error(`Select a file to import ${this.resourceName}.`);
      return;
    }
    const t = s.files[0], n = new FormData();
    n.append("file", t), this.setLoading(!0);
    let i = null, l = null;
    try {
      i = await fetch(this.endpoint, {
        method: "POST",
        body: n
      }), (i.headers.get("Content-Type") || "").includes("application/json") ? l = await i.json() : l = { error: "Import failed" };
    } catch (o) {
      console.error("Import failed:", o), this.notifier.error("Import failed.");
    } finally {
      this.setLoading(!1);
    }
    if (!l) return;
    this.renderResults(l);
    const r = l.summary || {}, a = Number(r.succeeded) || 0, c = Number(r.failed) || 0;
    if (i && i.ok && c === 0)
      this.notifier.success(`${this.resourceName} imported successfully.`);
    else {
      const o = l.error ? String(l.error) : "Import completed with errors.";
      this.notifier.error(o);
    }
    a > 0 && this.onSuccess(r);
  }
}
export {
  z as ImportModal,
  z as default,
  N as formatFileSize
};
//# sourceMappingURL=import-modal.js.map
