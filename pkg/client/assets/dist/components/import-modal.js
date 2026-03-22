function k(e) {
  if (e === 0) return "0 Bytes";
  const s = 1024, t = [
    "Bytes",
    "KB",
    "MB",
    "GB"
  ], i = Math.floor(Math.log(e) / Math.log(s));
  return `${parseFloat((e / Math.pow(s, i)).toFixed(2))} ${t[i]}`;
}
var N = class {
  constructor(e = {}) {
    this.modalId = e.modalId || "import-modal", e.endpoint ? this.endpoint = e.endpoint : e.apiBasePath ? this.endpoint = `${e.apiBasePath.trim().replace(/\/+$/, "")}/import` : this.endpoint = "/api/import", this.onSuccess = e.onSuccess || (() => {
    }), this.notifier = e.notifier || {
      success: console.log,
      error: console.error
    }, this.resourceName = e.resourceName || "items", this.elements = {}, this.isFullscreen = !1, this.currentFilter = "all", this.resultItems = [], this.bindElements(), this.bindEvents();
  }
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
  bindEvents() {
    const { modal: e, backdrop: s, closeBtn: t, cancelBtn: i, fileInput: n, fileRemove: l, anotherBtn: r, submitBtn: a, fullscreenBtn: c } = this.elements;
    t && t.addEventListener("click", () => this.close()), i && i.addEventListener("click", () => this.close()), s && s.addEventListener("click", () => this.close()), n && n.addEventListener("change", () => this.updateFilePreview()), l && l.addEventListener("click", (d) => {
      d.preventDefault(), d.stopPropagation();
      const m = this.elements.fileInput;
      m && (m.value = ""), this.updateFilePreview();
    }), r && r.addEventListener("click", () => this.reset()), a && a.addEventListener("click", (d) => this.handleSubmit(d)), c && c.addEventListener("click", () => this.toggleFullscreen()), this.bindDragAndDrop(), this.bindFilterButtons(), document.addEventListener("keydown", (d) => {
      d.key === "Escape" && e && !e.classList.contains("hidden") && (this.isFullscreen ? this.toggleFullscreen() : this.close());
    });
  }
  bindFilterButtons() {
    const { modal: e } = this.elements;
    if (!e) return;
    const s = e.querySelectorAll(".import-filter-btn");
    s.forEach((t) => {
      t.addEventListener("click", () => {
        const i = t.getAttribute("data-filter") || "all";
        this.setFilter(i), s.forEach((n) => {
          n.classList.toggle("active", n === t), n.classList.toggle("bg-gray-100", n === t), n.classList.toggle("text-gray-700", n === t), n.classList.toggle("text-gray-500", n !== t);
        });
      });
    });
  }
  setFilter(e) {
    this.currentFilter = e, this.applyFilter();
  }
  applyFilter() {
    const { resultsBody: e, visibleCount: s } = this.elements;
    if (!e) return;
    const t = e.querySelectorAll("tr");
    let i = 0;
    t.forEach((n) => {
      const l = n.getAttribute("data-status");
      let r = !0;
      this.currentFilter === "succeeded" ? r = l === "succeeded" : this.currentFilter === "failed" && (r = l === "failed"), n.style.display = r ? "" : "none", r && i++;
    }), s && (s.textContent = String(i));
  }
  toggleFullscreen() {
    const { container: e, expandIcon: s, collapseIcon: t, tableScroll: i } = this.elements;
    e && (this.isFullscreen = !this.isFullscreen, this.isFullscreen ? (e.classList.remove("max-w-3xl", "max-h-[90vh]"), e.classList.add("w-full", "h-full", "m-0"), e.style.maxWidth = "none", e.style.maxHeight = "none", e.style.borderRadius = "0", s && s.classList.add("hidden"), t && t.classList.remove("hidden"), i && (i.style.maxHeight = "60vh")) : (e.classList.add("w-full", "max-w-3xl", "max-h-[90vh]"), e.classList.remove("h-full", "m-0"), e.style.maxWidth = "", e.style.maxHeight = "", e.style.borderRadius = "", s && s.classList.remove("hidden"), t && t.classList.add("hidden"), i && (i.style.maxHeight = "40vh")));
  }
  bindDragAndDrop() {
    const { dropzone: e } = this.elements, s = this.elements.fileInput;
    e && (["dragenter", "dragover"].forEach((t) => {
      e.addEventListener(t, (i) => {
        i.preventDefault(), i.stopPropagation(), e.classList.add("border-blue-400", "bg-blue-50");
      });
    }), ["dragleave", "drop"].forEach((t) => {
      e.addEventListener(t, (i) => {
        i.preventDefault(), i.stopPropagation(), e.classList.remove("border-blue-400", "bg-blue-50");
      });
    }), e.addEventListener("drop", (t) => {
      const i = t.dataTransfer?.files;
      if (i && i.length > 0 && s) {
        const n = new DataTransfer();
        n.items.add(i[0]), s.files = n.files, this.updateFilePreview();
      }
    }));
  }
  updateFilePreview() {
    const e = this.elements.fileInput, { dropzoneEmpty: s, dropzoneSelected: t, fileName: i, fileSize: n, submitBtn: l } = this.elements, r = e?.files?.[0] ?? null;
    r ? (r && i && (i.textContent = r.name), r && n && (n.textContent = k(r.size)), s && s.classList.add("hidden"), t && t.classList.remove("hidden"), l && (l.disabled = !1)) : (s && s.classList.remove("hidden"), t && t.classList.add("hidden"), l && (l.disabled = !0));
  }
  reset() {
    const { fileInput: e, results: s, form: t, errorBanner: i, error: n, resultsBody: l, submitBtn: r, anotherBtn: a, statProcessed: c, statSucceeded: d, statFailed: m, visibleCount: x, totalCount: b, modal: h } = this.elements;
    e && (e.value = ""), this.updateFilePreview(), s && s.classList.add("hidden"), t && t.classList.remove("hidden"), i && i.classList.add("hidden"), n && (n.textContent = ""), l && (l.innerHTML = ""), r && (r.classList.remove("hidden"), r.disabled = !0), a && a.classList.add("hidden"), c && (c.textContent = "0"), d && (d.textContent = "0"), m && (m.textContent = "0"), x && (x.textContent = "0"), b && (b.textContent = "0"), this.currentFilter = "all", this.resultItems = [], h && h.querySelectorAll(".import-filter-btn").forEach((f) => {
      const p = f.getAttribute("data-filter") === "all";
      f.classList.toggle("active", p), f.classList.toggle("bg-gray-100", p), f.classList.toggle("text-gray-700", p), f.classList.toggle("text-gray-500", !p);
    }), this.isFullscreen && this.toggleFullscreen();
  }
  setLoading(e) {
    const { submitBtn: s, cancelBtn: t, spinner: i } = this.elements;
    s && (s.disabled = e, s.classList.toggle("opacity-50", e)), t && (t.disabled = e), i && (i.classList.toggle("hidden", !e), i.classList.toggle("flex", e));
  }
  open() {
    const { modal: e } = this.elements;
    e && (this.reset(), e.classList.remove("hidden"), document.body.classList.add("overflow-hidden"));
  }
  close() {
    const { modal: e } = this.elements;
    e && (e.classList.add("hidden"), document.body.classList.remove("overflow-hidden"));
  }
  buildCell(e, s) {
    const t = document.createElement("td");
    return t.className = s, t.textContent = e, t;
  }
  renderResults(e) {
    const { results: s, resultsBody: t, form: i, submitBtn: n, anotherBtn: l, errorBanner: r, error: a, statProcessed: c, statSucceeded: d, statFailed: m, visibleCount: x, totalCount: b } = this.elements;
    if (!s || !t) return;
    const h = e && e.summary ? e.summary : {}, f = Number(h.processed) || 0, p = Number(h.succeeded) || 0, S = Number(h.failed) || 0, v = Array.isArray(e && e.results) ? e.results : [], C = e && e.error ? String(e.error).trim() : "";
    if (this.resultItems = v, c && (c.textContent = String(f)), d && (d.textContent = String(p)), m && (m.textContent = String(S)), b && (b.textContent = String(v.length)), x && (x.textContent = String(v.length)), C && r && a && (a.textContent = C, r.classList.remove("hidden")), t.innerHTML = "", v.length === 0) {
      const o = document.createElement("tr"), E = this.buildCell("No results to display", "px-4 py-4 text-gray-500 text-center");
      E.colSpan = 5, o.appendChild(E), t.appendChild(o);
    } else v.forEach((o, E) => {
      const u = document.createElement("tr"), F = typeof o.index == "number" ? o.index + 1 : E + 1, $ = o.email ? String(o.email) : "-", w = o.user_id ? String(o.user_id) : "-", g = o.error && String(o.error).trim() !== "", A = g ? "Failed" : o.status ? String(o.status) : "Created";
      u.className = g ? "bg-red-50" : "bg-green-50", u.setAttribute("data-status", g ? "failed" : "succeeded"), u.appendChild(this.buildCell(String(F), "px-4 py-2 text-gray-700 font-medium")), u.appendChild(this.buildCell($, "px-4 py-2 text-gray-900")), u.appendChild(this.buildCell(w, "px-4 py-2 text-gray-500 font-mono text-xs"));
      const L = document.createElement("td");
      L.className = "px-4 py-2";
      const I = document.createElement("span");
      I.className = g ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700" : "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700";
      const y = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      y.setAttribute("class", "w-3 h-3"), y.setAttribute("fill", "none"), y.setAttribute("stroke", "currentColor"), y.setAttribute("viewBox", "0 0 24 24");
      const B = document.createElementNS("http://www.w3.org/2000/svg", "path");
      B.setAttribute("stroke-linecap", "round"), B.setAttribute("stroke-linejoin", "round"), B.setAttribute("stroke-width", "2"), B.setAttribute("d", g ? "M6 18L18 6M6 6l12 12" : "M5 13l4 4L19 7"), y.appendChild(B), I.appendChild(y), I.appendChild(document.createTextNode(A)), L.appendChild(I), u.appendChild(L), u.appendChild(this.buildCell(g ? String(o.error) : "-", "px-4 py-2 text-gray-600 text-xs")), t.appendChild(u);
    });
    i && i.classList.add("hidden"), s.classList.remove("hidden"), n && n.classList.add("hidden"), l && l.classList.remove("hidden"), this.applyFilter();
  }
  async handleSubmit(e) {
    e.preventDefault();
    const s = this.elements.fileInput;
    if (!s || !s.files || s.files.length === 0) {
      this.notifier.error(`Select a file to import ${this.resourceName}.`);
      return;
    }
    const t = s.files[0], i = new FormData();
    i.append("file", t), this.setLoading(!0);
    let n = null, l = null;
    try {
      n = await fetch(this.endpoint, {
        method: "POST",
        body: i
      }), (n.headers.get("Content-Type") || "").includes("application/json") ? l = await n.json() : l = { error: "Import failed" };
    } catch (d) {
      console.error("Import failed:", d), this.notifier.error("Import failed.");
    } finally {
      this.setLoading(!1);
    }
    if (!l) return;
    this.renderResults(l);
    const r = l.summary || {}, a = Number(r.succeeded) || 0, c = Number(r.failed) || 0;
    if (n && n.ok && c === 0) this.notifier.success(`${this.resourceName} imported successfully.`);
    else {
      const d = l.error ? String(l.error) : "Import completed with errors.";
      this.notifier.error(d);
    }
    a > 0 && this.onSuccess(r);
  }
};
export {
  N as ImportModal,
  N as default,
  k as formatFileSize
};

//# sourceMappingURL=import-modal.js.map