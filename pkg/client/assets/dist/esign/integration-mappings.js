import { b as n, a as R, h as u, s as h, f as P } from "../chunks/dom-helpers-CMRVXsMj.js";
import { d as E } from "../chunks/async-helpers-D7xplkWe.js";
class k {
  constructor(e) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: n("#mappings-announcements"),
      loadingState: n("#loading-state"),
      emptyState: n("#empty-state"),
      errorState: n("#error-state"),
      mappingsList: n("#mappings-list"),
      mappingsTbody: n("#mappings-tbody"),
      searchInput: n("#search-mappings"),
      filterStatus: n("#filter-status"),
      filterProvider: n("#filter-provider"),
      refreshBtn: n("#refresh-btn"),
      retryBtn: n("#retry-btn"),
      errorMessage: n("#error-message"),
      createMappingBtn: n("#create-mapping-btn"),
      createMappingEmptyBtn: n("#create-mapping-empty-btn"),
      mappingModal: n("#mapping-modal"),
      mappingModalTitle: n("#mapping-modal-title"),
      closeModalBtn: n("#close-modal-btn"),
      cancelModalBtn: n("#cancel-modal-btn"),
      mappingForm: n("#mapping-form"),
      mappingIdInput: n("#mapping-id"),
      mappingVersionInput: n("#mapping-version"),
      mappingNameInput: n("#mapping-name"),
      mappingProviderInput: n("#mapping-provider"),
      schemaObjectTypeInput: n("#schema-object-type"),
      schemaVersionInput: n("#schema-version"),
      schemaFieldsContainer: n("#schema-fields-container"),
      addFieldBtn: n("#add-field-btn"),
      mappingRulesContainer: n("#mapping-rules-container"),
      addRuleBtn: n("#add-rule-btn"),
      validateBtn: n("#validate-btn"),
      saveBtn: n("#save-btn"),
      formValidationStatus: n("#form-validation-status"),
      mappingStatusBadge: n("#mapping-status-badge"),
      publishModal: n("#publish-modal"),
      publishMappingName: n("#publish-mapping-name"),
      publishMappingVersion: n("#publish-mapping-version"),
      publishCancelBtn: n("#publish-cancel-btn"),
      publishConfirmBtn: n("#publish-confirm-btn"),
      deleteModal: n("#delete-modal"),
      deleteCancelBtn: n("#delete-cancel-btn"),
      deleteConfirmBtn: n("#delete-confirm-btn"),
      previewModal: n("#preview-modal"),
      closePreviewBtn: n("#close-preview-btn"),
      previewMappingName: n("#preview-mapping-name"),
      previewMappingProvider: n("#preview-mapping-provider"),
      previewObjectType: n("#preview-object-type"),
      previewMappingStatus: n("#preview-mapping-status"),
      previewSourceInput: n("#preview-source-input"),
      sourceSyntaxError: n("#source-syntax-error"),
      loadSampleBtn: n("#load-sample-btn"),
      runPreviewBtn: n("#run-preview-btn"),
      clearPreviewBtn: n("#clear-preview-btn"),
      previewEmpty: n("#preview-empty"),
      previewLoading: n("#preview-loading"),
      previewError: n("#preview-error"),
      previewErrorMessage: n("#preview-error-message"),
      previewSuccess: n("#preview-success"),
      previewParticipants: n("#preview-participants"),
      participantsCount: n("#participants-count"),
      previewFields: n("#preview-fields"),
      fieldsCount: n("#fields-count"),
      previewMetadata: n("#preview-metadata"),
      previewRawJson: n("#preview-raw-json"),
      previewRulesTbody: n("#preview-rules-tbody")
    };
  }
  /**
   * Initialize the mappings page
   */
  async init() {
    this.setupEventListeners(), await this.loadMappings();
  }
  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const {
      createMappingBtn: e,
      createMappingEmptyBtn: t,
      closeModalBtn: i,
      cancelModalBtn: s,
      refreshBtn: r,
      retryBtn: o,
      addFieldBtn: l,
      addRuleBtn: p,
      validateBtn: a,
      mappingForm: c,
      publishCancelBtn: m,
      publishConfirmBtn: f,
      deleteCancelBtn: d,
      deleteConfirmBtn: v,
      closePreviewBtn: L,
      loadSampleBtn: $,
      runPreviewBtn: C,
      clearPreviewBtn: T,
      previewSourceInput: H,
      searchInput: _,
      filterStatus: j,
      filterProvider: B,
      mappingModal: w,
      publishModal: y,
      deleteModal: x,
      previewModal: M
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), i?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.loadMappings()), o?.addEventListener("click", () => this.loadMappings()), l?.addEventListener("click", () => this.addSchemaField()), p?.addEventListener("click", () => this.addMappingRule()), a?.addEventListener("click", () => this.validateMapping()), c?.addEventListener("submit", (g) => {
      g.preventDefault(), this.saveMapping();
    }), m?.addEventListener("click", () => this.closePublishModal()), f?.addEventListener("click", () => this.publishMapping()), d?.addEventListener("click", () => this.closeDeleteModal()), v?.addEventListener("click", () => this.deleteMapping()), L?.addEventListener("click", () => this.closePreviewModal()), $?.addEventListener("click", () => this.loadSamplePayload()), C?.addEventListener("click", () => this.runPreviewTransform()), T?.addEventListener("click", () => this.clearPreview()), H?.addEventListener("input", E(() => this.validateSourceJson(), 300)), _?.addEventListener("input", E(() => this.renderMappings(), 300)), j?.addEventListener("change", () => this.renderMappings()), B?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (g) => {
      g.key === "Escape" && (w && !w.classList.contains("hidden") && this.closeModal(), y && !y.classList.contains("hidden") && this.closePublishModal(), x && !x.classList.contains("hidden") && this.closeDeleteModal(), M && !M.classList.contains("hidden") && this.closePreviewModal());
    }), [w, y, x, M].forEach((g) => {
      g?.addEventListener("click", (I) => {
        const S = I.target;
        (S === g || S.getAttribute("aria-hidden") === "true") && (g === w ? this.closeModal() : g === y ? this.closePublishModal() : g === x ? this.closeDeleteModal() : g === M && this.closePreviewModal());
      });
    });
  }
  /**
   * Announce message for screen readers
   */
  announce(e) {
    const { announcements: t } = this.elements;
    t && (t.textContent = e), R(e);
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: i, errorState: s, mappingsList: r } = this.elements;
    switch (u(t), u(i), u(s), u(r), e) {
      case "loading":
        h(t);
        break;
      case "empty":
        h(i);
        break;
      case "error":
        h(s);
        break;
      case "list":
        h(r);
        break;
    }
  }
  /**
   * Escape HTML for safe rendering
   */
  escapeHtml(e) {
    const t = document.createElement("div");
    return t.textContent = e || "", t.innerHTML;
  }
  /**
   * Format date string
   */
  formatDate(e) {
    if (!e) return "-";
    try {
      const t = new Date(e);
      return t.toLocaleDateString() + " " + t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return e;
    }
  }
  /**
   * Get status badge HTML
   */
  getStatusBadge(e) {
    const t = {
      draft: { label: "Draft", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" },
      published: { label: "Published", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" }
    }, i = t[e] || t.draft;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${i.bg} ${i.text}">
      <span class="w-1.5 h-1.5 rounded-full ${i.dot}" aria-hidden="true"></span>
      ${i.label}
    </span>`;
  }
  /**
   * Load mappings from API
   */
  async loadMappings() {
    this.showState("loading");
    try {
      const e = await fetch(this.mappingsEndpoint, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!e.ok) throw new Error(`HTTP ${e.status}`);
      const t = await e.json();
      this.mappings = t.mappings || [], this.populateProviderFilter(), this.renderMappings(), this.announce(`Loaded ${this.mappings.length} mappings`);
    } catch (e) {
      console.error("Error loading mappings:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred"), this.showState("error"), this.announce("Error loading mappings");
    }
  }
  /**
   * Populate provider filter dropdown
   */
  populateProviderFilter() {
    const { filterProvider: e } = this.elements;
    if (!e) return;
    const t = [...new Set(this.mappings.map((i) => i.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + t.map((i) => `<option value="${this.escapeHtml(i)}">${this.escapeHtml(i)}</option>`).join("");
  }
  /**
   * Render mappings list with filters applied
   */
  renderMappings() {
    const { mappingsTbody: e, searchInput: t, filterStatus: i, filterProvider: s } = this.elements;
    if (!e) return;
    const r = (t?.value || "").toLowerCase(), o = i?.value || "", l = s?.value || "", p = this.mappings.filter((a) => !(r && !a.name.toLowerCase().includes(r) && !a.provider.toLowerCase().includes(r) || o && a.status !== o || l && a.provider !== l));
    if (p.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = p.map(
      (a) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${this.escapeHtml(a.name)}</div>
          <div class="text-xs text-gray-500">${this.escapeHtml(a.compiled_hash ? a.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${this.escapeHtml(a.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(a.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${a.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${this.formatDate(a.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${this.escapeHtml(a.id)}" aria-label="Preview ${this.escapeHtml(a.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${this.escapeHtml(a.id)}" aria-label="Edit ${this.escapeHtml(a.name)}">
              Edit
            </button>
            ${a.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${this.escapeHtml(a.id)}" aria-label="Publish ${this.escapeHtml(a.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${this.escapeHtml(a.id)}" aria-label="Delete ${this.escapeHtml(a.name)}">
              Delete
            </button>
          </div>
        </td>
      </tr>
    `
    ).join(""), this.showState("list"), this.attachRowListeners();
  }
  /**
   * Attach event listeners to table row buttons
   */
  attachRowListeners() {
    const { mappingsTbody: e } = this.elements;
    e && (e.querySelectorAll(".preview-mapping-btn").forEach((t) => {
      t.addEventListener("click", () => this.openPreviewModal(t.dataset.id || ""));
    }), e.querySelectorAll(".edit-mapping-btn").forEach((t) => {
      t.addEventListener("click", () => this.openEditModal(t.dataset.id || ""));
    }), e.querySelectorAll(".publish-mapping-btn").forEach((t) => {
      t.addEventListener("click", () => this.openPublishModal(t.dataset.id || ""));
    }), e.querySelectorAll(".delete-mapping-btn").forEach((t) => {
      t.addEventListener("click", () => this.openDeleteModal(t.dataset.id || ""));
    }));
  }
  // Form management methods
  /**
   * Create a schema field row element
   */
  createSchemaFieldRow(e = {}) {
    const t = document.createElement("div");
    return t.className = "flex items-center gap-2 p-2 bg-gray-50 rounded-lg schema-field-row", t.innerHTML = `
      <input type="text" placeholder="object" value="${this.escapeHtml(e.object || "")}" class="field-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="field" value="${this.escapeHtml(e.field || "")}" class="field-name flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <select class="field-type px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="string" ${e.type === "string" ? "selected" : ""}>string</option>
        <option value="number" ${e.type === "number" ? "selected" : ""}>number</option>
        <option value="boolean" ${e.type === "boolean" ? "selected" : ""}>boolean</option>
        <option value="date" ${e.type === "date" ? "selected" : ""}>date</option>
      </select>
      <label class="flex items-center gap-1 text-xs">
        <input type="checkbox" class="field-required" ${e.required ? "checked" : ""}> Req
      </label>
      <button type="button" class="remove-field-btn text-red-500 hover:text-red-600" aria-label="Remove field">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `, t.querySelector(".remove-field-btn")?.addEventListener("click", () => t.remove()), t;
  }
  /**
   * Create a mapping rule row element
   */
  createMappingRuleRow(e = {}) {
    const t = document.createElement("div");
    return t.className = "flex items-center gap-2 p-2 bg-gray-50 rounded-lg mapping-rule-row", t.innerHTML = `
      <input type="text" placeholder="source_object" value="${this.escapeHtml(e.source_object || "")}" class="rule-source-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="source_field" value="${this.escapeHtml(e.source_field || "")}" class="rule-source-field flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <span class="text-gray-400">→</span>
      <select class="rule-target-entity px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="participant" ${e.target_entity === "participant" ? "selected" : ""}>participant</option>
        <option value="agreement" ${e.target_entity === "agreement" ? "selected" : ""}>agreement</option>
        <option value="field_definition" ${e.target_entity === "field_definition" ? "selected" : ""}>field_definition</option>
        <option value="field_instance" ${e.target_entity === "field_instance" ? "selected" : ""}>field_instance</option>
      </select>
      <input type="text" placeholder="target_path" value="${this.escapeHtml(e.target_path || "")}" class="rule-target-path flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <button type="button" class="remove-rule-btn text-red-500 hover:text-red-600" aria-label="Remove rule">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `, t.querySelector(".remove-rule-btn")?.addEventListener("click", () => t.remove()), t;
  }
  /**
   * Add a new schema field row
   */
  addSchemaField(e) {
    const { schemaFieldsContainer: t } = this.elements;
    t && t.appendChild(this.createSchemaFieldRow(e));
  }
  /**
   * Add a new mapping rule row
   */
  addMappingRule(e) {
    const { mappingRulesContainer: t } = this.elements;
    t && t.appendChild(this.createMappingRuleRow(e));
  }
  /**
   * Collect form data into a mapping spec object
   */
  collectFormData() {
    const {
      mappingIdInput: e,
      mappingVersionInput: t,
      mappingNameInput: i,
      mappingProviderInput: s,
      schemaObjectTypeInput: r,
      schemaVersionInput: o,
      schemaFieldsContainer: l,
      mappingRulesContainer: p
    } = this.elements, a = [];
    l?.querySelectorAll(".schema-field-row").forEach((m) => {
      a.push({
        object: (m.querySelector(".field-object")?.value || "").trim(),
        field: (m.querySelector(".field-name")?.value || "").trim(),
        type: m.querySelector(".field-type")?.value || "string",
        required: m.querySelector(".field-required")?.checked || !1
      });
    });
    const c = [];
    return p?.querySelectorAll(".mapping-rule-row").forEach((m) => {
      c.push({
        source_object: (m.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (m.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: m.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (m.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: i?.value.trim() || "",
      provider: s?.value.trim() || "",
      external_schema: {
        object_type: r?.value.trim() || "",
        version: o?.value.trim() || void 0,
        fields: a
      },
      rules: c
    };
  }
  /**
   * Populate form with mapping data
   */
  populateForm(e) {
    const {
      mappingIdInput: t,
      mappingVersionInput: i,
      mappingNameInput: s,
      mappingProviderInput: r,
      schemaObjectTypeInput: o,
      schemaVersionInput: l,
      schemaFieldsContainer: p,
      mappingRulesContainer: a,
      mappingStatusBadge: c,
      formValidationStatus: m
    } = this.elements;
    t && (t.value = e.id || ""), i && (i.value = String(e.version || 0)), s && (s.value = e.name || ""), r && (r.value = e.provider || "");
    const f = e.external_schema || { object_type: "", fields: [] };
    o && (o.value = f.object_type || ""), l && (l.value = f.version || ""), p && (p.innerHTML = "", (f.fields || []).forEach((d) => p.appendChild(this.createSchemaFieldRow(d)))), a && (a.innerHTML = "", (e.rules || []).forEach((d) => a.appendChild(this.createMappingRuleRow(d)))), e.status && c ? (c.innerHTML = this.getStatusBadge(e.status), c.classList.remove("hidden")) : c && c.classList.add("hidden"), u(m);
  }
  /**
   * Reset the form to initial state
   */
  resetForm() {
    const {
      mappingForm: e,
      mappingIdInput: t,
      mappingVersionInput: i,
      schemaFieldsContainer: s,
      mappingRulesContainer: r,
      mappingStatusBadge: o,
      formValidationStatus: l
    } = this.elements;
    e?.reset(), t && (t.value = ""), i && (i.value = "0"), s && (s.innerHTML = ""), r && (r.innerHTML = ""), o && o.classList.add("hidden"), u(l), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: i } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), h(e), i?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((o) => o.id === e);
    if (!t) return;
    const { mappingModal: i, mappingModalTitle: s, mappingNameInput: r } = this.elements;
    this.editingMappingId = e, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(t), h(i), r?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    u(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((o) => o.id === e);
    if (!t) return;
    const { publishModal: i, publishMappingName: s, publishMappingVersion: r } = this.elements;
    this.pendingPublishId = e, s && (s.textContent = t.name), r && (r.textContent = `v${t.version || 1}`), h(i);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    u(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, h(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    u(this.elements.deleteModal), this.pendingDeleteId = null;
  }
  // CRUD operations
  /**
   * Validate mapping
   */
  async validateMapping() {
    const { validateBtn: e, formValidationStatus: t } = this.elements;
    if (!e) return;
    const i = this.collectFormData();
    e.setAttribute("disabled", "true"), e.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Validating...';
    try {
      const s = await fetch(this.mappingsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...i, validate_only: !0 })
      }), r = await s.json();
      if (s.ok && r.status === "ok")
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${this.escapeHtml((r.mapping?.compiled_hash || "").slice(0, 16))}</code></p>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation passed");
      else {
        const o = r.errors || [r.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${o.map((l) => `<li>${this.escapeHtml(l)}</li>`).join("")}</ul>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), this.announce("Validation failed");
      }
      h(t);
    } catch (s) {
      console.error("Validation error:", s), t && (t.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, h(t));
    } finally {
      e.removeAttribute("disabled"), e.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Validate';
    }
  }
  /**
   * Save mapping (create or update)
   */
  async saveMapping() {
    const { saveBtn: e } = this.elements;
    if (!e) return;
    const t = this.collectFormData();
    e.setAttribute("disabled", "true"), e.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Saving...';
    try {
      const i = !!t.id, s = i ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, o = await fetch(s, {
        method: i ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!o.ok) {
        const l = await o.json();
        throw new Error(l.error?.message || `HTTP ${o.status}`);
      }
      this.showToast(i ? "Mapping updated" : "Mapping created", "success"), this.announce(i ? "Mapping updated" : "Mapping created"), this.closeModal(), await this.loadMappings();
    } catch (i) {
      console.error("Save error:", i);
      const s = i instanceof Error ? i.message : "Unknown error";
      this.showToast(`Failed to save: ${s}`, "error"), this.announce(`Failed to save: ${s}`);
    } finally {
      e.removeAttribute("disabled"), e.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Save Draft';
    }
  }
  /**
   * Publish mapping
   */
  async publishMapping() {
    if (!this.pendingPublishId) return;
    const e = this.mappings.find((i) => i.id === this.pendingPublishId);
    if (!e) return;
    const { publishConfirmBtn: t } = this.elements;
    if (t) {
      t.setAttribute("disabled", "true"), t.textContent = "Publishing...";
      try {
        const i = await fetch(`${this.mappingsEndpoint}/${this.pendingPublishId}/publish`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ expected_version: e.version })
        });
        if (!i.ok) {
          const s = await i.json();
          throw new Error(s.error?.message || `HTTP ${i.status}`);
        }
        this.showToast("Mapping published", "success"), this.announce("Mapping published"), this.closePublishModal(), await this.loadMappings();
      } catch (i) {
        console.error("Publish error:", i);
        const s = i instanceof Error ? i.message : "Unknown error";
        this.showToast(`Failed to publish: ${s}`, "error");
      } finally {
        t.removeAttribute("disabled"), t.textContent = "Publish";
      }
    }
  }
  /**
   * Delete mapping
   */
  async deleteMapping() {
    if (!this.pendingDeleteId) return;
    const { deleteConfirmBtn: e } = this.elements;
    if (e) {
      e.setAttribute("disabled", "true"), e.textContent = "Deleting...";
      try {
        const t = await fetch(`${this.mappingsEndpoint}/${this.pendingDeleteId}`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!t.ok) {
          const i = await t.json();
          throw new Error(i.error?.message || `HTTP ${t.status}`);
        }
        this.showToast("Mapping deleted", "success"), this.announce("Mapping deleted"), this.closeDeleteModal(), await this.loadMappings();
      } catch (t) {
        console.error("Delete error:", t);
        const i = t instanceof Error ? t.message : "Unknown error";
        this.showToast(`Failed to delete: ${i}`, "error");
      } finally {
        e.removeAttribute("disabled"), e.textContent = "Delete";
      }
    }
  }
  // Preview methods
  /**
   * Open preview modal
   */
  openPreviewModal(e) {
    const t = this.mappings.find((c) => c.id === e);
    if (!t) return;
    const {
      previewModal: i,
      previewMappingName: s,
      previewMappingProvider: r,
      previewObjectType: o,
      previewMappingStatus: l,
      previewSourceInput: p,
      sourceSyntaxError: a
    } = this.elements;
    this.currentPreviewMapping = t, s && (s.textContent = t.name), r && (r.textContent = t.provider), o && (o.textContent = t.external_schema?.object_type || "-"), l && (l.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), p && (p.value = ""), u(a), h(i), p?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    u(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: i, previewError: s, previewSuccess: r } = this.elements;
    switch (u(t), u(i), u(s), u(r), e) {
      case "empty":
        h(t);
        break;
      case "loading":
        h(i);
        break;
      case "error":
        h(s);
        break;
      case "success":
        h(r);
        break;
    }
  }
  /**
   * Render preview rules table
   */
  renderPreviewRules(e) {
    const { previewRulesTbody: t } = this.elements;
    if (t) {
      if (!e || e.length === 0) {
        t.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-sm text-gray-500">No mapping rules defined</td></tr>';
        return;
      }
      t.innerHTML = e.map(
        (i) => `
      <tr>
        <td class="px-3 py-2 font-mono text-xs">${this.escapeHtml(i.source_object ? i.source_object + "." : "")}${this.escapeHtml(i.source_field)}</td>
        <td class="px-3 py-2 text-center text-gray-400">→</td>
        <td class="px-3 py-2">
          <span class="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">${this.escapeHtml(i.target_entity)}</span>
        </td>
        <td class="px-3 py-2 font-mono text-xs">${this.escapeHtml(i.target_path)}</td>
        <td class="px-3 py-2" data-rule-source="${this.escapeHtml(i.source_field)}">
          <span class="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Pending</span>
        </td>
      </tr>
    `
      ).join("");
    }
  }
  /**
   * Load sample payload
   */
  loadSamplePayload() {
    if (!this.currentPreviewMapping) return;
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, i = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, s = i.object_type || "data", r = i.fields || [], o = {}, l = {};
    r.forEach((p) => {
      const a = p.field || "field";
      switch (p.type) {
        case "string":
          l[a] = a === "email" ? "john.doe@example.com" : a === "name" ? "John Doe" : `sample_${a}`;
          break;
        case "number":
          l[a] = 123;
          break;
        case "boolean":
          l[a] = !0;
          break;
        case "date":
          l[a] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          l[a] = `sample_${a}`;
      }
    }), o[s] = l, e && (e.value = JSON.stringify(o, null, 2)), u(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, i = e?.value.trim() || "";
    if (!i)
      return u(t), null;
    try {
      const s = JSON.parse(i);
      return u(t), s;
    } catch (s) {
      return t && (t.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, h(t)), null;
    }
  }
  /**
   * Run preview transform
   */
  async runPreviewTransform() {
    const { previewSourceInput: e, previewErrorMessage: t } = this.elements, i = this.validateSourceJson();
    if (!(i === null && e?.value.trim())) {
      if (!i) {
        this.showPreviewState("empty");
        return;
      }
      if (this.currentPreviewMapping) {
        this.showPreviewState("loading");
        try {
          const s = this.simulateTransform(i, this.currentPreviewMapping);
          this.renderPreviewResult(s), this.showPreviewState("success");
        } catch (s) {
          console.error("Transform error:", s), t && (t.textContent = s instanceof Error ? s.message : "Transform failed"), this.showPreviewState("error");
        }
      }
    }
  }
  /**
   * Simulate transform (client-side preview)
   */
  simulateTransform(e, t) {
    const i = t.rules || [], s = {
      participants: [],
      field_definitions: [],
      field_instances: [],
      agreement: {},
      matched_rules: []
    }, r = {}, o = {}, l = [];
    return i.forEach((p) => {
      const a = this.resolveSourceValue(e, p.source_object, p.source_field), c = a !== void 0;
      if (s.matched_rules.push({
        source: p.source_field,
        matched: c,
        value: a
      }), !!c)
        switch (p.target_entity) {
          case "participant":
            r[p.target_path] = a;
            break;
          case "agreement":
            o[p.target_path] = a;
            break;
          case "field_definition":
            l.push({ path: p.target_path, value: a });
            break;
        }
    }), Object.keys(r).length > 0 && s.participants.push({
      ...r,
      role: r.role || "signer",
      signing_stage: r.signing_stage || 1
    }), s.agreement = o, s.field_definitions = l, s;
  }
  /**
   * Resolve source value from payload
   */
  resolveSourceValue(e, t, i) {
    if (!(!e || !i)) {
      if (t && e[t])
        return e[t][i];
      for (const s of Object.keys(e))
        if (typeof e[s] == "object" && e[s] !== null) {
          const r = e[s];
          if (i in r)
            return r[i];
        }
      return e[i];
    }
  }
  /**
   * Render preview result
   */
  renderPreviewResult(e) {
    const {
      previewParticipants: t,
      participantsCount: i,
      previewFields: s,
      fieldsCount: r,
      previewMetadata: o,
      previewRawJson: l,
      previewRulesTbody: p
    } = this.elements, a = e.participants || [];
    i && (i.textContent = `(${a.length})`), t && (a.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = a.map(
      (d) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${this.escapeHtml(String(d.name || d.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${this.escapeHtml(String(d.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${this.escapeHtml(String(d.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${this.escapeHtml(String(d.role))}</span>
              <span class="text-xs text-gray-500">Stage ${d.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const c = e.field_definitions || [];
    r && (r.textContent = `(${c.length})`), s && (c.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = c.map(
      (d) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(d.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(d.value))}</span>
          </div>
        `
    ).join(""));
    const m = e.agreement || {}, f = Object.entries(m);
    o && (f.length === 0 ? o.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : o.innerHTML = f.map(
      ([d, v]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(d)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(v))}</span>
          </div>
        `
    ).join("")), l && (l.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((d) => {
      const v = p?.querySelector(`[data-rule-source="${this.escapeHtml(d.source)}"] span`);
      v && (d.matched ? (v.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", v.textContent = "Matched") : (v.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", v.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), u(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  /**
   * Show toast notification
   */
  showToast(e, t) {
    const s = window.toastManager;
    s && (t === "success" ? s.success(e) : s.error(e));
  }
}
function N(b) {
  const e = new k(b);
  return P(() => e.init()), e;
}
function q(b) {
  const e = {
    basePath: b.basePath,
    apiBasePath: b.apiBasePath || `${b.basePath}/api`
  }, t = new k(e);
  P(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
export {
  k as IntegrationMappingsController,
  q as bootstrapIntegrationMappings,
  N as initIntegrationMappings
};
//# sourceMappingURL=integration-mappings.js.map
