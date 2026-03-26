import { b as s, h as m, s as g, f as $ } from "../chunks/dom-helpers-CMRVXsMj.js";
import { d as L } from "../chunks/async-helpers-D7xplkWe.js";
import { i as N } from "../chunks/formatters-Bx8onLEN.js";
import { a as w, s as x } from "../chunks/page-feedback-XrK1vdW2.js";
import { escapeHTML as l } from "../shared/html.js";
class C {
  constructor(e) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = e, this.apiBase = e.apiBasePath || `${e.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
      announcements: s("#mappings-announcements"),
      loadingState: s("#loading-state"),
      emptyState: s("#empty-state"),
      errorState: s("#error-state"),
      mappingsList: s("#mappings-list"),
      mappingsTbody: s("#mappings-tbody"),
      searchInput: s("#search-mappings"),
      filterStatus: s("#filter-status"),
      filterProvider: s("#filter-provider"),
      refreshBtn: s("#refresh-btn"),
      retryBtn: s("#retry-btn"),
      errorMessage: s("#error-message"),
      createMappingBtn: s("#create-mapping-btn"),
      createMappingEmptyBtn: s("#create-mapping-empty-btn"),
      mappingModal: s("#mapping-modal"),
      mappingModalTitle: s("#mapping-modal-title"),
      closeModalBtn: s("#close-modal-btn"),
      cancelModalBtn: s("#cancel-modal-btn"),
      mappingForm: s("#mapping-form"),
      mappingIdInput: s("#mapping-id"),
      mappingVersionInput: s("#mapping-version"),
      mappingNameInput: s("#mapping-name"),
      mappingProviderInput: s("#mapping-provider"),
      schemaObjectTypeInput: s("#schema-object-type"),
      schemaVersionInput: s("#schema-version"),
      schemaFieldsContainer: s("#schema-fields-container"),
      addFieldBtn: s("#add-field-btn"),
      mappingRulesContainer: s("#mapping-rules-container"),
      addRuleBtn: s("#add-rule-btn"),
      validateBtn: s("#validate-btn"),
      saveBtn: s("#save-btn"),
      formValidationStatus: s("#form-validation-status"),
      mappingStatusBadge: s("#mapping-status-badge"),
      publishModal: s("#publish-modal"),
      publishMappingName: s("#publish-mapping-name"),
      publishMappingVersion: s("#publish-mapping-version"),
      publishCancelBtn: s("#publish-cancel-btn"),
      publishConfirmBtn: s("#publish-confirm-btn"),
      deleteModal: s("#delete-modal"),
      deleteCancelBtn: s("#delete-cancel-btn"),
      deleteConfirmBtn: s("#delete-confirm-btn"),
      previewModal: s("#preview-modal"),
      closePreviewBtn: s("#close-preview-btn"),
      previewMappingName: s("#preview-mapping-name"),
      previewMappingProvider: s("#preview-mapping-provider"),
      previewObjectType: s("#preview-object-type"),
      previewMappingStatus: s("#preview-mapping-status"),
      previewSourceInput: s("#preview-source-input"),
      sourceSyntaxError: s("#source-syntax-error"),
      loadSampleBtn: s("#load-sample-btn"),
      runPreviewBtn: s("#run-preview-btn"),
      clearPreviewBtn: s("#clear-preview-btn"),
      previewEmpty: s("#preview-empty"),
      previewLoading: s("#preview-loading"),
      previewError: s("#preview-error"),
      previewErrorMessage: s("#preview-error-message"),
      previewSuccess: s("#preview-success"),
      previewParticipants: s("#preview-participants"),
      participantsCount: s("#participants-count"),
      previewFields: s("#preview-fields"),
      fieldsCount: s("#fields-count"),
      previewMetadata: s("#preview-metadata"),
      previewRawJson: s("#preview-raw-json"),
      previewRulesTbody: s("#preview-rules-tbody")
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
      cancelModalBtn: n,
      refreshBtn: r,
      retryBtn: o,
      addFieldBtn: p,
      addRuleBtn: d,
      validateBtn: a,
      mappingForm: u,
      publishCancelBtn: h,
      publishConfirmBtn: b,
      deleteCancelBtn: c,
      deleteConfirmBtn: f,
      closePreviewBtn: T,
      loadSampleBtn: _,
      runPreviewBtn: j,
      clearPreviewBtn: B,
      previewSourceInput: I,
      searchInput: R,
      filterStatus: F,
      filterProvider: D,
      mappingModal: M,
      publishModal: S,
      deleteModal: P,
      previewModal: E
    } = this.elements;
    e?.addEventListener("click", () => this.openCreateModal()), t?.addEventListener("click", () => this.openCreateModal()), i?.addEventListener("click", () => this.closeModal()), n?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.loadMappings()), o?.addEventListener("click", () => this.loadMappings()), p?.addEventListener("click", () => this.addSchemaField()), d?.addEventListener("click", () => this.addMappingRule()), a?.addEventListener("click", () => this.validateMapping()), u?.addEventListener("submit", (v) => {
      v.preventDefault(), this.saveMapping();
    }), h?.addEventListener("click", () => this.closePublishModal()), b?.addEventListener("click", () => this.publishMapping()), c?.addEventListener("click", () => this.closeDeleteModal()), f?.addEventListener("click", () => this.deleteMapping()), T?.addEventListener("click", () => this.closePreviewModal()), _?.addEventListener("click", () => this.loadSamplePayload()), j?.addEventListener("click", () => this.runPreviewTransform()), B?.addEventListener("click", () => this.clearPreview()), I?.addEventListener("input", L(() => this.validateSourceJson(), 300)), R?.addEventListener("input", L(() => this.renderMappings(), 300)), F?.addEventListener("change", () => this.renderMappings()), D?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (v) => {
      v.key === "Escape" && (M && !M.classList.contains("hidden") && this.closeModal(), S && !S.classList.contains("hidden") && this.closePublishModal(), P && !P.classList.contains("hidden") && this.closeDeleteModal(), E && !E.classList.contains("hidden") && this.closePreviewModal());
    }), [M, S, P, E].forEach((v) => {
      v?.addEventListener("click", (H) => {
        const k = H.target;
        (k === v || k.getAttribute("aria-hidden") === "true") && (v === M ? this.closeModal() : v === S ? this.closePublishModal() : v === P ? this.closeDeleteModal() : v === E && this.closePreviewModal());
      });
    });
  }
  /**
   * Show a specific page state
   */
  showState(e) {
    const { loadingState: t, emptyState: i, errorState: n, mappingsList: r } = this.elements;
    switch (m(t), m(i), m(n), m(r), e) {
      case "loading":
        g(t);
        break;
      case "empty":
        g(i);
        break;
      case "error":
        g(n);
        break;
      case "list":
        g(r);
        break;
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
      this.mappings = t.mappings || [], this.populateProviderFilter(), this.renderMappings(), w(this.elements.announcements, `Loaded ${this.mappings.length} mappings`);
    } catch (e) {
      console.error("Error loading mappings:", e);
      const { errorMessage: t } = this.elements;
      t && (t.textContent = e instanceof Error ? e.message : "An error occurred"), this.showState("error"), w(this.elements.announcements, "Error loading mappings");
    }
  }
  /**
   * Populate provider filter dropdown
   */
  populateProviderFilter() {
    const { filterProvider: e } = this.elements;
    if (!e) return;
    const t = [...new Set(this.mappings.map((i) => i.provider).filter(Boolean))];
    e.innerHTML = '<option value="">All Providers</option>' + t.map((i) => `<option value="${l(i)}">${l(i)}</option>`).join("");
  }
  /**
   * Render mappings list with filters applied
   */
  renderMappings() {
    const { mappingsTbody: e, searchInput: t, filterStatus: i, filterProvider: n } = this.elements;
    if (!e) return;
    const r = (t?.value || "").toLowerCase(), o = i?.value || "", p = n?.value || "", d = this.mappings.filter((a) => !(r && !a.name.toLowerCase().includes(r) && !a.provider.toLowerCase().includes(r) || o && a.status !== o || p && a.provider !== p));
    if (d.length === 0) {
      this.showState("empty");
      return;
    }
    e.innerHTML = d.map(
      (a) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${l(a.name)}</div>
          <div class="text-xs text-gray-500">${l(a.compiled_hash ? a.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${l(a.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(a.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${a.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${N(a.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${l(a.id)}" aria-label="Preview ${l(a.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${l(a.id)}" aria-label="Edit ${l(a.name)}">
              Edit
            </button>
            ${a.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${l(a.id)}" aria-label="Publish ${l(a.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${l(a.id)}" aria-label="Delete ${l(a.name)}">
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
      <input type="text" placeholder="object" value="${l(e.object || "")}" class="field-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="field" value="${l(e.field || "")}" class="field-name flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
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
      <input type="text" placeholder="source_object" value="${l(e.source_object || "")}" class="rule-source-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="source_field" value="${l(e.source_field || "")}" class="rule-source-field flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <span class="text-gray-400">→</span>
      <select class="rule-target-entity px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="participant" ${e.target_entity === "participant" ? "selected" : ""}>participant</option>
        <option value="agreement" ${e.target_entity === "agreement" ? "selected" : ""}>agreement</option>
        <option value="field_definition" ${e.target_entity === "field_definition" ? "selected" : ""}>field_definition</option>
        <option value="field_instance" ${e.target_entity === "field_instance" ? "selected" : ""}>field_instance</option>
      </select>
      <input type="text" placeholder="target_path" value="${l(e.target_path || "")}" class="rule-target-path flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
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
      mappingProviderInput: n,
      schemaObjectTypeInput: r,
      schemaVersionInput: o,
      schemaFieldsContainer: p,
      mappingRulesContainer: d
    } = this.elements, a = [];
    p?.querySelectorAll(".schema-field-row").forEach((h) => {
      a.push({
        object: (h.querySelector(".field-object")?.value || "").trim(),
        field: (h.querySelector(".field-name")?.value || "").trim(),
        type: h.querySelector(".field-type")?.value || "string",
        required: h.querySelector(".field-required")?.checked || !1
      });
    });
    const u = [];
    return d?.querySelectorAll(".mapping-rule-row").forEach((h) => {
      u.push({
        source_object: (h.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (h.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: h.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (h.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: e?.value.trim() || void 0,
      version: parseInt(t?.value || "0", 10) || 0,
      name: i?.value.trim() || "",
      provider: n?.value.trim() || "",
      external_schema: {
        object_type: r?.value.trim() || "",
        version: o?.value.trim() || void 0,
        fields: a
      },
      rules: u
    };
  }
  /**
   * Populate form with mapping data
   */
  populateForm(e) {
    const {
      mappingIdInput: t,
      mappingVersionInput: i,
      mappingNameInput: n,
      mappingProviderInput: r,
      schemaObjectTypeInput: o,
      schemaVersionInput: p,
      schemaFieldsContainer: d,
      mappingRulesContainer: a,
      mappingStatusBadge: u,
      formValidationStatus: h
    } = this.elements;
    t && (t.value = e.id || ""), i && (i.value = String(e.version || 0)), n && (n.value = e.name || ""), r && (r.value = e.provider || "");
    const b = e.external_schema || { object_type: "", fields: [] };
    o && (o.value = b.object_type || ""), p && (p.value = b.version || ""), d && (d.innerHTML = "", (b.fields || []).forEach((c) => d.appendChild(this.createSchemaFieldRow(c)))), a && (a.innerHTML = "", (e.rules || []).forEach((c) => a.appendChild(this.createMappingRuleRow(c)))), e.status && u ? (u.innerHTML = this.getStatusBadge(e.status), u.classList.remove("hidden")) : u && u.classList.add("hidden"), m(h);
  }
  /**
   * Reset the form to initial state
   */
  resetForm() {
    const {
      mappingForm: e,
      mappingIdInput: t,
      mappingVersionInput: i,
      schemaFieldsContainer: n,
      mappingRulesContainer: r,
      mappingStatusBadge: o,
      formValidationStatus: p
    } = this.elements;
    e?.reset(), t && (t.value = ""), i && (i.value = "0"), n && (n.innerHTML = ""), r && (r.innerHTML = ""), o && o.classList.add("hidden"), m(p), this.editingMappingId = null;
  }
  // Modal methods
  /**
   * Open create mapping modal
   */
  openCreateModal() {
    const { mappingModal: e, mappingModalTitle: t, mappingNameInput: i } = this.elements;
    this.resetForm(), t && (t.textContent = "New Mapping Specification"), this.addSchemaField({ field: "email", type: "string", required: !0 }), this.addMappingRule({ target_entity: "participant", target_path: "email" }), g(e), i?.focus();
  }
  /**
   * Open edit mapping modal
   */
  openEditModal(e) {
    const t = this.mappings.find((o) => o.id === e);
    if (!t) return;
    const { mappingModal: i, mappingModalTitle: n, mappingNameInput: r } = this.elements;
    this.editingMappingId = e, n && (n.textContent = "Edit Mapping Specification"), this.populateForm(t), g(i), r?.focus();
  }
  /**
   * Close mapping modal
   */
  closeModal() {
    const { mappingModal: e } = this.elements;
    m(e), this.resetForm();
  }
  /**
   * Open publish confirmation modal
   */
  openPublishModal(e) {
    const t = this.mappings.find((o) => o.id === e);
    if (!t) return;
    const { publishModal: i, publishMappingName: n, publishMappingVersion: r } = this.elements;
    this.pendingPublishId = e, n && (n.textContent = t.name), r && (r.textContent = `v${t.version || 1}`), g(i);
  }
  /**
   * Close publish modal
   */
  closePublishModal() {
    m(this.elements.publishModal), this.pendingPublishId = null;
  }
  /**
   * Open delete confirmation modal
   */
  openDeleteModal(e) {
    this.pendingDeleteId = e, g(this.elements.deleteModal);
  }
  /**
   * Close delete modal
   */
  closeDeleteModal() {
    m(this.elements.deleteModal), this.pendingDeleteId = null;
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
      const n = await fetch(this.mappingsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...i, validate_only: !0 })
      }), r = await n.json();
      if (n.ok && r.status === "ok")
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${l((r.mapping?.compiled_hash || "").slice(0, 16))}</code></p>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), w(this.elements.announcements, "Validation passed");
      else {
        const o = r.errors || [r.error?.message || "Validation failed"];
        t && (t.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${o.map((p) => `<li>${l(p)}</li>`).join("")}</ul>
              </div>
            </div>
          `, t.className = "rounded-lg p-4"), w(this.elements.announcements, "Validation failed");
      }
      g(t);
    } catch (n) {
      console.error("Validation error:", n), t && (t.innerHTML = `<div class="text-red-600">Error: ${l(n instanceof Error ? n.message : "Unknown error")}</div>`, g(t));
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
      const i = !!t.id, n = i ? `${this.mappingsEndpoint}/${t.id}` : this.mappingsEndpoint, o = await fetch(n, {
        method: i ? "PUT" : "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(t)
      });
      if (!o.ok) {
        const p = await o.json();
        throw new Error(p.error?.message || `HTTP ${o.status}`);
      }
      x(i ? "Mapping updated" : "Mapping created", "success"), w(
        this.elements.announcements,
        i ? "Mapping updated" : "Mapping created"
      ), this.closeModal(), await this.loadMappings();
    } catch (i) {
      console.error("Save error:", i);
      const n = i instanceof Error ? i.message : "Unknown error";
      x(`Failed to save: ${n}`, "error"), w(this.elements.announcements, `Failed to save: ${n}`);
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
          const n = await i.json();
          throw new Error(n.error?.message || `HTTP ${i.status}`);
        }
        x("Mapping published", "success"), w(this.elements.announcements, "Mapping published"), this.closePublishModal(), await this.loadMappings();
      } catch (i) {
        console.error("Publish error:", i);
        const n = i instanceof Error ? i.message : "Unknown error";
        x(`Failed to publish: ${n}`, "error");
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
        x("Mapping deleted", "success"), w(this.elements.announcements, "Mapping deleted"), this.closeDeleteModal(), await this.loadMappings();
      } catch (t) {
        console.error("Delete error:", t);
        const i = t instanceof Error ? t.message : "Unknown error";
        x(`Failed to delete: ${i}`, "error");
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
    const t = this.mappings.find((u) => u.id === e);
    if (!t) return;
    const {
      previewModal: i,
      previewMappingName: n,
      previewMappingProvider: r,
      previewObjectType: o,
      previewMappingStatus: p,
      previewSourceInput: d,
      sourceSyntaxError: a
    } = this.elements;
    this.currentPreviewMapping = t, n && (n.textContent = t.name), r && (r.textContent = t.provider), o && (o.textContent = t.external_schema?.object_type || "-"), p && (p.innerHTML = this.getStatusBadge(t.status)), this.renderPreviewRules(t.rules || []), this.showPreviewState("empty"), d && (d.value = ""), m(a), g(i), d?.focus();
  }
  /**
   * Close preview modal
   */
  closePreviewModal() {
    m(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  /**
   * Show preview state
   */
  showPreviewState(e) {
    const { previewEmpty: t, previewLoading: i, previewError: n, previewSuccess: r } = this.elements;
    switch (m(t), m(i), m(n), m(r), e) {
      case "empty":
        g(t);
        break;
      case "loading":
        g(i);
        break;
      case "error":
        g(n);
        break;
      case "success":
        g(r);
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
        <td class="px-3 py-2 font-mono text-xs">${l(i.source_object ? i.source_object + "." : "")}${l(i.source_field)}</td>
        <td class="px-3 py-2 text-center text-gray-400">→</td>
        <td class="px-3 py-2">
          <span class="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">${l(i.target_entity)}</span>
        </td>
        <td class="px-3 py-2 font-mono text-xs">${l(i.target_path)}</td>
        <td class="px-3 py-2" data-rule-source="${l(i.source_field)}">
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
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, i = this.currentPreviewMapping.external_schema || { object_type: "data", fields: [] }, n = i.object_type || "data", r = i.fields || [], o = {}, p = {};
    r.forEach((d) => {
      const a = d.field || "field";
      switch (d.type) {
        case "string":
          p[a] = a === "email" ? "john.doe@example.com" : a === "name" ? "John Doe" : `sample_${a}`;
          break;
        case "number":
          p[a] = 123;
          break;
        case "boolean":
          p[a] = !0;
          break;
        case "date":
          p[a] = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
          break;
        default:
          p[a] = `sample_${a}`;
      }
    }), o[n] = p, e && (e.value = JSON.stringify(o, null, 2)), m(t);
  }
  /**
   * Validate source JSON
   */
  validateSourceJson() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements, i = e?.value.trim() || "";
    if (!i)
      return m(t), null;
    try {
      const n = JSON.parse(i);
      return m(t), n;
    } catch (n) {
      return t && (t.textContent = `JSON Syntax Error: ${n instanceof Error ? n.message : "Invalid JSON"}`, g(t)), null;
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
          const n = this.simulateTransform(i, this.currentPreviewMapping);
          this.renderPreviewResult(n), this.showPreviewState("success");
        } catch (n) {
          console.error("Transform error:", n), t && (t.textContent = n instanceof Error ? n.message : "Transform failed"), this.showPreviewState("error");
        }
      }
    }
  }
  /**
   * Simulate transform (client-side preview)
   */
  simulateTransform(e, t) {
    const i = t.rules || [], n = {
      participants: [],
      field_definitions: [],
      field_instances: [],
      agreement: {},
      matched_rules: []
    }, r = {}, o = {}, p = [];
    return i.forEach((d) => {
      const a = this.resolveSourceValue(e, d.source_object, d.source_field), u = a !== void 0;
      if (n.matched_rules.push({
        source: d.source_field,
        matched: u,
        value: a
      }), !!u)
        switch (d.target_entity) {
          case "participant":
            r[d.target_path] = a;
            break;
          case "agreement":
            o[d.target_path] = a;
            break;
          case "field_definition":
            p.push({ path: d.target_path, value: a });
            break;
        }
    }), Object.keys(r).length > 0 && n.participants.push({
      ...r,
      role: r.role || "signer",
      signing_stage: r.signing_stage || 1
    }), n.agreement = o, n.field_definitions = p, n;
  }
  /**
   * Resolve source value from payload
   */
  resolveSourceValue(e, t, i) {
    if (!(!e || !i)) {
      if (t && e[t])
        return e[t][i];
      for (const n of Object.keys(e))
        if (typeof e[n] == "object" && e[n] !== null) {
          const r = e[n];
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
      previewFields: n,
      fieldsCount: r,
      previewMetadata: o,
      previewRawJson: p,
      previewRulesTbody: d
    } = this.elements, a = e.participants || [];
    i && (i.textContent = `(${a.length})`), t && (a.length === 0 ? t.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : t.innerHTML = a.map(
      (c) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${l(String(c.name || c.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${l(String(c.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${l(String(c.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${l(String(c.role))}</span>
              <span class="text-xs text-gray-500">Stage ${c.signing_stage}</span>
            </div>
          </div>
        `
    ).join(""));
    const u = e.field_definitions || [];
    r && (r.textContent = `(${u.length})`), n && (u.length === 0 ? n.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : n.innerHTML = u.map(
      (c) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${l(c.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${l(String(c.value))}</span>
          </div>
        `
    ).join(""));
    const h = e.agreement || {}, b = Object.entries(h);
    o && (b.length === 0 ? o.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : o.innerHTML = b.map(
      ([c, f]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${l(c)}:</span>
            <span class="text-gray-900">${l(String(f))}</span>
          </div>
        `
    ).join("")), p && (p.textContent = JSON.stringify(e, null, 2)), (e.matched_rules || []).forEach((c) => {
      const f = d?.querySelector(`[data-rule-source="${l(c.source)}"] span`);
      f && (c.matched ? (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", f.textContent = "Matched") : (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", f.textContent = "Not Found"));
    });
  }
  /**
   * Clear preview
   */
  clearPreview() {
    const { previewSourceInput: e, sourceSyntaxError: t } = this.elements;
    e && (e.value = ""), m(t), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
}
function U(y) {
  const e = new C(y);
  return $(() => e.init()), e;
}
function z(y) {
  const e = {
    basePath: y.basePath,
    apiBasePath: y.apiBasePath || `${y.basePath}/api`
  }, t = new C(e);
  $(() => t.init()), typeof window < "u" && (window.esignIntegrationMappingsController = t);
}
export {
  C as IntegrationMappingsController,
  z as bootstrapIntegrationMappings,
  U as initIntegrationMappings
};
//# sourceMappingURL=integration-mappings.js.map
