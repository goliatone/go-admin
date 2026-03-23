import { c as E, f as h, l as n, o as u, t as I } from "./dom-helpers-CDdChTSn.js";
import { n as S } from "./async-helpers-CA3ovFR9.js";
var P = class {
  constructor(t) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = t, this.apiBase = t.apiBasePath || `${t.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
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
  async init() {
    this.setupEventListeners(), await this.loadMappings();
  }
  setupEventListeners() {
    const { createMappingBtn: t, createMappingEmptyBtn: e, closeModalBtn: i, cancelModalBtn: s, refreshBtn: r, retryBtn: o, addFieldBtn: l, addRuleBtn: p, validateBtn: a, mappingForm: c, publishCancelBtn: m, publishConfirmBtn: f, deleteCancelBtn: d, deleteConfirmBtn: v, closePreviewBtn: k, loadSampleBtn: L, runPreviewBtn: $, clearPreviewBtn: C, previewSourceInput: T, searchInput: H, filterStatus: _, filterProvider: j, mappingModal: b, publishModal: w, deleteModal: y, previewModal: x } = this.elements;
    t?.addEventListener("click", () => this.openCreateModal()), e?.addEventListener("click", () => this.openCreateModal()), i?.addEventListener("click", () => this.closeModal()), s?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.loadMappings()), o?.addEventListener("click", () => this.loadMappings()), l?.addEventListener("click", () => this.addSchemaField()), p?.addEventListener("click", () => this.addMappingRule()), a?.addEventListener("click", () => this.validateMapping()), c?.addEventListener("submit", (g) => {
      g.preventDefault(), this.saveMapping();
    }), m?.addEventListener("click", () => this.closePublishModal()), f?.addEventListener("click", () => this.publishMapping()), d?.addEventListener("click", () => this.closeDeleteModal()), v?.addEventListener("click", () => this.deleteMapping()), k?.addEventListener("click", () => this.closePreviewModal()), L?.addEventListener("click", () => this.loadSamplePayload()), $?.addEventListener("click", () => this.runPreviewTransform()), C?.addEventListener("click", () => this.clearPreview()), T?.addEventListener("input", S(() => this.validateSourceJson(), 300)), H?.addEventListener("input", S(() => this.renderMappings(), 300)), _?.addEventListener("change", () => this.renderMappings()), j?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (g) => {
      g.key === "Escape" && (b && !b.classList.contains("hidden") && this.closeModal(), w && !w.classList.contains("hidden") && this.closePublishModal(), y && !y.classList.contains("hidden") && this.closeDeleteModal(), x && !x.classList.contains("hidden") && this.closePreviewModal());
    }), [
      b,
      w,
      y,
      x
    ].forEach((g) => {
      g?.addEventListener("click", (B) => {
        const M = B.target;
        (M === g || M.getAttribute("aria-hidden") === "true") && (g === b ? this.closeModal() : g === w ? this.closePublishModal() : g === y ? this.closeDeleteModal() : g === x && this.closePreviewModal());
      });
    });
  }
  announce(t) {
    const { announcements: e } = this.elements;
    e && (e.textContent = t), I(t);
  }
  showState(t) {
    const { loadingState: e, emptyState: i, errorState: s, mappingsList: r } = this.elements;
    switch (u(e), u(i), u(s), u(r), t) {
      case "loading":
        h(e);
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
  escapeHtml(t) {
    const e = document.createElement("div");
    return e.textContent = t || "", e.innerHTML;
  }
  formatDate(t) {
    if (!t) return "-";
    try {
      const e = new Date(t);
      return e.toLocaleDateString() + " " + e.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return t;
    }
  }
  getStatusBadge(t) {
    const e = {
      draft: {
        label: "Draft",
        bg: "bg-gray-100",
        text: "text-gray-700",
        dot: "bg-gray-400"
      },
      published: {
        label: "Published",
        bg: "bg-green-100",
        text: "text-green-700",
        dot: "bg-green-500"
      }
    }, i = e[t] || e.draft;
    return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${i.bg} ${i.text}">
      <span class="w-1.5 h-1.5 rounded-full ${i.dot}" aria-hidden="true"></span>
      ${i.label}
    </span>`;
  }
  async loadMappings() {
    this.showState("loading");
    try {
      const t = await fetch(this.mappingsEndpoint, {
        credentials: "same-origin",
        headers: { Accept: "application/json" }
      });
      if (!t.ok) throw new Error(`HTTP ${t.status}`);
      this.mappings = (await t.json()).mappings || [], this.populateProviderFilter(), this.renderMappings(), this.announce(`Loaded ${this.mappings.length} mappings`);
    } catch (t) {
      console.error("Error loading mappings:", t);
      const { errorMessage: e } = this.elements;
      e && (e.textContent = t instanceof Error ? t.message : "An error occurred"), this.showState("error"), this.announce("Error loading mappings");
    }
  }
  populateProviderFilter() {
    const { filterProvider: t } = this.elements;
    t && (t.innerHTML = '<option value="">All Providers</option>' + [...new Set(this.mappings.map((e) => e.provider).filter(Boolean))].map((e) => `<option value="${this.escapeHtml(e)}">${this.escapeHtml(e)}</option>`).join(""));
  }
  renderMappings() {
    const { mappingsTbody: t, searchInput: e, filterStatus: i, filterProvider: s } = this.elements;
    if (!t) return;
    const r = (e?.value || "").toLowerCase(), o = i?.value || "", l = s?.value || "", p = this.mappings.filter((a) => !(r && !a.name.toLowerCase().includes(r) && !a.provider.toLowerCase().includes(r) || o && a.status !== o || l && a.provider !== l));
    if (p.length === 0) {
      this.showState("empty");
      return;
    }
    t.innerHTML = p.map((a) => `
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
    `).join(""), this.showState("list"), this.attachRowListeners();
  }
  attachRowListeners() {
    const { mappingsTbody: t } = this.elements;
    t && (t.querySelectorAll(".preview-mapping-btn").forEach((e) => {
      e.addEventListener("click", () => this.openPreviewModal(e.dataset.id || ""));
    }), t.querySelectorAll(".edit-mapping-btn").forEach((e) => {
      e.addEventListener("click", () => this.openEditModal(e.dataset.id || ""));
    }), t.querySelectorAll(".publish-mapping-btn").forEach((e) => {
      e.addEventListener("click", () => this.openPublishModal(e.dataset.id || ""));
    }), t.querySelectorAll(".delete-mapping-btn").forEach((e) => {
      e.addEventListener("click", () => this.openDeleteModal(e.dataset.id || ""));
    }));
  }
  createSchemaFieldRow(t = {}) {
    const e = document.createElement("div");
    return e.className = "flex items-center gap-2 p-2 bg-gray-50 rounded-lg schema-field-row", e.innerHTML = `
      <input type="text" placeholder="object" value="${this.escapeHtml(t.object || "")}" class="field-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="field" value="${this.escapeHtml(t.field || "")}" class="field-name flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <select class="field-type px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="string" ${t.type === "string" ? "selected" : ""}>string</option>
        <option value="number" ${t.type === "number" ? "selected" : ""}>number</option>
        <option value="boolean" ${t.type === "boolean" ? "selected" : ""}>boolean</option>
        <option value="date" ${t.type === "date" ? "selected" : ""}>date</option>
      </select>
      <label class="flex items-center gap-1 text-xs">
        <input type="checkbox" class="field-required" ${t.required ? "checked" : ""}> Req
      </label>
      <button type="button" class="remove-field-btn text-red-500 hover:text-red-600" aria-label="Remove field">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `, e.querySelector(".remove-field-btn")?.addEventListener("click", () => e.remove()), e;
  }
  createMappingRuleRow(t = {}) {
    const e = document.createElement("div");
    return e.className = "flex items-center gap-2 p-2 bg-gray-50 rounded-lg mapping-rule-row", e.innerHTML = `
      <input type="text" placeholder="source_object" value="${this.escapeHtml(t.source_object || "")}" class="rule-source-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="source_field" value="${this.escapeHtml(t.source_field || "")}" class="rule-source-field flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <span class="text-gray-400">→</span>
      <select class="rule-target-entity px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="participant" ${t.target_entity === "participant" ? "selected" : ""}>participant</option>
        <option value="agreement" ${t.target_entity === "agreement" ? "selected" : ""}>agreement</option>
        <option value="field_definition" ${t.target_entity === "field_definition" ? "selected" : ""}>field_definition</option>
        <option value="field_instance" ${t.target_entity === "field_instance" ? "selected" : ""}>field_instance</option>
      </select>
      <input type="text" placeholder="target_path" value="${this.escapeHtml(t.target_path || "")}" class="rule-target-path flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <button type="button" class="remove-rule-btn text-red-500 hover:text-red-600" aria-label="Remove rule">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    `, e.querySelector(".remove-rule-btn")?.addEventListener("click", () => e.remove()), e;
  }
  addSchemaField(t) {
    const { schemaFieldsContainer: e } = this.elements;
    e && e.appendChild(this.createSchemaFieldRow(t));
  }
  addMappingRule(t) {
    const { mappingRulesContainer: e } = this.elements;
    e && e.appendChild(this.createMappingRuleRow(t));
  }
  collectFormData() {
    const { mappingIdInput: t, mappingVersionInput: e, mappingNameInput: i, mappingProviderInput: s, schemaObjectTypeInput: r, schemaVersionInput: o, schemaFieldsContainer: l, mappingRulesContainer: p } = this.elements, a = [];
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
      id: t?.value.trim() || void 0,
      version: parseInt(e?.value || "0", 10) || 0,
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
  populateForm(t) {
    const { mappingIdInput: e, mappingVersionInput: i, mappingNameInput: s, mappingProviderInput: r, schemaObjectTypeInput: o, schemaVersionInput: l, schemaFieldsContainer: p, mappingRulesContainer: a, mappingStatusBadge: c, formValidationStatus: m } = this.elements;
    e && (e.value = t.id || ""), i && (i.value = String(t.version || 0)), s && (s.value = t.name || ""), r && (r.value = t.provider || "");
    const f = t.external_schema || {
      object_type: "",
      fields: []
    };
    o && (o.value = f.object_type || ""), l && (l.value = f.version || ""), p && (p.innerHTML = "", (f.fields || []).forEach((d) => p.appendChild(this.createSchemaFieldRow(d)))), a && (a.innerHTML = "", (t.rules || []).forEach((d) => a.appendChild(this.createMappingRuleRow(d)))), t.status && c ? (c.innerHTML = this.getStatusBadge(t.status), c.classList.remove("hidden")) : c && c.classList.add("hidden"), u(m);
  }
  resetForm() {
    const { mappingForm: t, mappingIdInput: e, mappingVersionInput: i, schemaFieldsContainer: s, mappingRulesContainer: r, mappingStatusBadge: o, formValidationStatus: l } = this.elements;
    t?.reset(), e && (e.value = ""), i && (i.value = "0"), s && (s.innerHTML = ""), r && (r.innerHTML = ""), o && o.classList.add("hidden"), u(l), this.editingMappingId = null;
  }
  openCreateModal() {
    const { mappingModal: t, mappingModalTitle: e, mappingNameInput: i } = this.elements;
    this.resetForm(), e && (e.textContent = "New Mapping Specification"), this.addSchemaField({
      field: "email",
      type: "string",
      required: !0
    }), this.addMappingRule({
      target_entity: "participant",
      target_path: "email"
    }), h(t), i?.focus();
  }
  openEditModal(t) {
    const e = this.mappings.find((o) => o.id === t);
    if (!e) return;
    const { mappingModal: i, mappingModalTitle: s, mappingNameInput: r } = this.elements;
    this.editingMappingId = t, s && (s.textContent = "Edit Mapping Specification"), this.populateForm(e), h(i), r?.focus();
  }
  closeModal() {
    const { mappingModal: t } = this.elements;
    u(t), this.resetForm();
  }
  openPublishModal(t) {
    const e = this.mappings.find((o) => o.id === t);
    if (!e) return;
    const { publishModal: i, publishMappingName: s, publishMappingVersion: r } = this.elements;
    this.pendingPublishId = t, s && (s.textContent = e.name), r && (r.textContent = `v${e.version || 1}`), h(i);
  }
  closePublishModal() {
    u(this.elements.publishModal), this.pendingPublishId = null;
  }
  openDeleteModal(t) {
    this.pendingDeleteId = t, h(this.elements.deleteModal);
  }
  closeDeleteModal() {
    u(this.elements.deleteModal), this.pendingDeleteId = null;
  }
  async validateMapping() {
    const { validateBtn: t, formValidationStatus: e } = this.elements;
    if (!t) return;
    const i = this.collectFormData();
    t.setAttribute("disabled", "true"), t.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Validating...';
    try {
      const s = await fetch(this.mappingsEndpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          ...i,
          validate_only: !0
        })
      }), r = await s.json();
      if (s.ok && r.status === "ok")
        e && (e.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${this.escapeHtml((r.mapping?.compiled_hash || "").slice(0, 16))}</code></p>
              </div>
            </div>
          `, e.className = "rounded-lg p-4"), this.announce("Validation passed");
      else {
        const o = r.errors || [r.error?.message || "Validation failed"];
        e && (e.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${o.map((l) => `<li>${this.escapeHtml(l)}</li>`).join("")}</ul>
              </div>
            </div>
          `, e.className = "rounded-lg p-4"), this.announce("Validation failed");
      }
      h(e);
    } catch (s) {
      console.error("Validation error:", s), e && (e.innerHTML = `<div class="text-red-600">Error: ${this.escapeHtml(s instanceof Error ? s.message : "Unknown error")}</div>`, h(e));
    } finally {
      t.removeAttribute("disabled"), t.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> Validate';
    }
  }
  async saveMapping() {
    const { saveBtn: t } = this.elements;
    if (!t) return;
    const e = this.collectFormData();
    t.setAttribute("disabled", "true"), t.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Saving...';
    try {
      const i = !!e.id, s = i ? `${this.mappingsEndpoint}/${e.id}` : this.mappingsEndpoint, r = await fetch(s, {
        method: i ? "PUT" : "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(e)
      });
      if (!r.ok) {
        const o = await r.json();
        throw new Error(o.error?.message || `HTTP ${r.status}`);
      }
      this.showToast(i ? "Mapping updated" : "Mapping created", "success"), this.announce(i ? "Mapping updated" : "Mapping created"), this.closeModal(), await this.loadMappings();
    } catch (i) {
      console.error("Save error:", i);
      const s = i instanceof Error ? i.message : "Unknown error";
      this.showToast(`Failed to save: ${s}`, "error"), this.announce(`Failed to save: ${s}`);
    } finally {
      t.removeAttribute("disabled"), t.innerHTML = '<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Save Draft';
    }
  }
  async publishMapping() {
    if (!this.pendingPublishId) return;
    const t = this.mappings.find((i) => i.id === this.pendingPublishId);
    if (!t) return;
    const { publishConfirmBtn: e } = this.elements;
    if (e) {
      e.setAttribute("disabled", "true"), e.textContent = "Publishing...";
      try {
        const i = await fetch(`${this.mappingsEndpoint}/${this.pendingPublishId}/publish`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ expected_version: t.version })
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
        e.removeAttribute("disabled"), e.textContent = "Publish";
      }
    }
  }
  async deleteMapping() {
    if (!this.pendingDeleteId) return;
    const { deleteConfirmBtn: t } = this.elements;
    if (t) {
      t.setAttribute("disabled", "true"), t.textContent = "Deleting...";
      try {
        const e = await fetch(`${this.mappingsEndpoint}/${this.pendingDeleteId}`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!e.ok) {
          const i = await e.json();
          throw new Error(i.error?.message || `HTTP ${e.status}`);
        }
        this.showToast("Mapping deleted", "success"), this.announce("Mapping deleted"), this.closeDeleteModal(), await this.loadMappings();
      } catch (e) {
        console.error("Delete error:", e);
        const i = e instanceof Error ? e.message : "Unknown error";
        this.showToast(`Failed to delete: ${i}`, "error");
      } finally {
        t.removeAttribute("disabled"), t.textContent = "Delete";
      }
    }
  }
  openPreviewModal(t) {
    const e = this.mappings.find((c) => c.id === t);
    if (!e) return;
    const { previewModal: i, previewMappingName: s, previewMappingProvider: r, previewObjectType: o, previewMappingStatus: l, previewSourceInput: p, sourceSyntaxError: a } = this.elements;
    this.currentPreviewMapping = e, s && (s.textContent = e.name), r && (r.textContent = e.provider), o && (o.textContent = e.external_schema?.object_type || "-"), l && (l.innerHTML = this.getStatusBadge(e.status)), this.renderPreviewRules(e.rules || []), this.showPreviewState("empty"), p && (p.value = ""), u(a), h(i), p?.focus();
  }
  closePreviewModal() {
    u(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  showPreviewState(t) {
    const { previewEmpty: e, previewLoading: i, previewError: s, previewSuccess: r } = this.elements;
    switch (u(e), u(i), u(s), u(r), t) {
      case "empty":
        h(e);
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
  renderPreviewRules(t) {
    const { previewRulesTbody: e } = this.elements;
    if (e) {
      if (!t || t.length === 0) {
        e.innerHTML = '<tr><td colspan="5" class="px-3 py-4 text-center text-sm text-gray-500">No mapping rules defined</td></tr>';
        return;
      }
      e.innerHTML = t.map((i) => `
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
    `).join("");
    }
  }
  loadSamplePayload() {
    if (!this.currentPreviewMapping) return;
    const { previewSourceInput: t, sourceSyntaxError: e } = this.elements, i = this.currentPreviewMapping.external_schema || {
      object_type: "data",
      fields: []
    }, s = i.object_type || "data", r = i.fields || [], o = {}, l = {};
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
    }), o[s] = l, t && (t.value = JSON.stringify(o, null, 2)), u(e);
  }
  validateSourceJson() {
    const { previewSourceInput: t, sourceSyntaxError: e } = this.elements, i = t?.value.trim() || "";
    if (!i)
      return u(e), null;
    try {
      const s = JSON.parse(i);
      return u(e), s;
    } catch (s) {
      return e && (e.textContent = `JSON Syntax Error: ${s instanceof Error ? s.message : "Invalid JSON"}`, h(e)), null;
    }
  }
  async runPreviewTransform() {
    const { previewSourceInput: t, previewErrorMessage: e } = this.elements, i = this.validateSourceJson();
    if (!(i === null && t?.value.trim())) {
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
          console.error("Transform error:", s), e && (e.textContent = s instanceof Error ? s.message : "Transform failed"), this.showPreviewState("error");
        }
      }
    }
  }
  simulateTransform(t, e) {
    const i = e.rules || [], s = {
      participants: [],
      field_definitions: [],
      field_instances: [],
      agreement: {},
      matched_rules: []
    }, r = {}, o = {}, l = [];
    return i.forEach((p) => {
      const a = this.resolveSourceValue(t, p.source_object, p.source_field), c = a !== void 0;
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
            l.push({
              path: p.target_path,
              value: a
            });
            break;
        }
    }), Object.keys(r).length > 0 && s.participants.push({
      ...r,
      role: r.role || "signer",
      signing_stage: r.signing_stage || 1
    }), s.agreement = o, s.field_definitions = l, s;
  }
  resolveSourceValue(t, e, i) {
    if (!(!t || !i)) {
      if (e && t[e]) return t[e][i];
      for (const s of Object.keys(t)) if (typeof t[s] == "object" && t[s] !== null) {
        const r = t[s];
        if (i in r) return r[i];
      }
      return t[i];
    }
  }
  renderPreviewResult(t) {
    const { previewParticipants: e, participantsCount: i, previewFields: s, fieldsCount: r, previewMetadata: o, previewRawJson: l, previewRulesTbody: p } = this.elements, a = t.participants || [];
    i && (i.textContent = `(${a.length})`), e && (a.length === 0 ? e.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : e.innerHTML = a.map((d) => `
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
        `).join(""));
    const c = t.field_definitions || [];
    r && (r.textContent = `(${c.length})`), s && (c.length === 0 ? s.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : s.innerHTML = c.map((d) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${this.escapeHtml(d.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${this.escapeHtml(String(d.value))}</span>
          </div>
        `).join(""));
    const m = t.agreement || {}, f = Object.entries(m);
    o && (f.length === 0 ? o.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : o.innerHTML = f.map(([d, v]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${this.escapeHtml(d)}:</span>
            <span class="text-gray-900">${this.escapeHtml(String(v))}</span>
          </div>
        `).join("")), l && (l.textContent = JSON.stringify(t, null, 2)), (t.matched_rules || []).forEach((d) => {
      const v = p?.querySelector(`[data-rule-source="${this.escapeHtml(d.source)}"] span`);
      v && (d.matched ? (v.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", v.textContent = "Matched") : (v.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", v.textContent = "Not Found"));
    });
  }
  clearPreview() {
    const { previewSourceInput: t, sourceSyntaxError: e } = this.elements;
    t && (t.value = ""), u(e), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
  showToast(t, e) {
    const i = window.toastManager;
    i && (e === "success" ? i.success(t) : i.error(t));
  }
};
function F(t) {
  const e = new P(t);
  return E(() => e.init()), e;
}
function N(t) {
  const e = new P({
    basePath: t.basePath,
    apiBasePath: t.apiBasePath || `${t.basePath}/api`
  });
  E(() => e.init()), typeof window < "u" && (window.esignIntegrationMappingsController = e);
}
export {
  N as n,
  F as r,
  P as t
};

//# sourceMappingURL=integration-mappings-DF085r3K.js.map