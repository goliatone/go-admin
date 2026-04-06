import { escapeHTML as o } from "../shared/html.js";
import { httpRequest as P, readHTTPError as k } from "../shared/transport/http-client.js";
import { onReady as C } from "../shared/dom-ready.js";
import { parseJSONValue as q } from "../shared/json-parse.js";
import { n as V } from "./formatters-oZ3pO-Hk.js";
import { c as m, p as h, u as s } from "./dom-helpers-PJrpTqcW.js";
import { n as $ } from "./async-helpers-DrUjwd2P.js";
import { n as y, t as w } from "./page-feedback-jdwaGhAS.js";
var T = class {
  constructor(t) {
    this.mappings = [], this.editingMappingId = null, this.pendingPublishId = null, this.pendingDeleteId = null, this.currentPreviewMapping = null, this.config = t, this.apiBase = t.apiBasePath || `${t.basePath}/api`, this.mappingsEndpoint = `${this.apiBase}/esign/integrations/mappings`, this.elements = {
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
  async init() {
    this.setupEventListeners(), await this.loadMappings();
  }
  setupEventListeners() {
    const { createMappingBtn: t, createMappingEmptyBtn: e, closeModalBtn: i, cancelModalBtn: n, refreshBtn: r, retryBtn: l, addFieldBtn: p, addRuleBtn: d, validateBtn: a, mappingForm: u, publishCancelBtn: g, publishConfirmBtn: b, deleteCancelBtn: c, deleteConfirmBtn: f, closePreviewBtn: _, loadSampleBtn: B, runPreviewBtn: I, clearPreviewBtn: j, previewSourceInput: F, searchInput: R, filterStatus: D, filterProvider: H, mappingModal: x, publishModal: M, deleteModal: S, previewModal: E } = this.elements;
    t?.addEventListener("click", () => this.openCreateModal()), e?.addEventListener("click", () => this.openCreateModal()), i?.addEventListener("click", () => this.closeModal()), n?.addEventListener("click", () => this.closeModal()), r?.addEventListener("click", () => this.loadMappings()), l?.addEventListener("click", () => this.loadMappings()), p?.addEventListener("click", () => this.addSchemaField()), d?.addEventListener("click", () => this.addMappingRule()), a?.addEventListener("click", () => this.validateMapping()), u?.addEventListener("submit", (v) => {
      v.preventDefault(), this.saveMapping();
    }), g?.addEventListener("click", () => this.closePublishModal()), b?.addEventListener("click", () => this.publishMapping()), c?.addEventListener("click", () => this.closeDeleteModal()), f?.addEventListener("click", () => this.deleteMapping()), _?.addEventListener("click", () => this.closePreviewModal()), B?.addEventListener("click", () => this.loadSamplePayload()), I?.addEventListener("click", () => this.runPreviewTransform()), j?.addEventListener("click", () => this.clearPreview()), F?.addEventListener("input", $(() => this.validateSourceJson(), 300)), R?.addEventListener("input", $(() => this.renderMappings(), 300)), D?.addEventListener("change", () => this.renderMappings()), H?.addEventListener("change", () => this.renderMappings()), document.addEventListener("keydown", (v) => {
      v.key === "Escape" && (x && !x.classList.contains("hidden") && this.closeModal(), M && !M.classList.contains("hidden") && this.closePublishModal(), S && !S.classList.contains("hidden") && this.closeDeleteModal(), E && !E.classList.contains("hidden") && this.closePreviewModal());
    }), [
      x,
      M,
      S,
      E
    ].forEach((v) => {
      v?.addEventListener("click", (N) => {
        const L = N.target;
        (L === v || L.getAttribute("aria-hidden") === "true") && (v === x ? this.closeModal() : v === M ? this.closePublishModal() : v === S ? this.closeDeleteModal() : v === E && this.closePreviewModal());
      });
    });
  }
  showState(t) {
    const { loadingState: e, emptyState: i, errorState: n, mappingsList: r } = this.elements;
    switch (m(e), m(i), m(n), m(r), t) {
      case "loading":
        h(e);
        break;
      case "empty":
        h(i);
        break;
      case "error":
        h(n);
        break;
      case "list":
        h(r);
        break;
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
      if (!t.ok) throw new Error(await k(t, `HTTP ${t.status}`, { appendStatusToFallback: !1 }));
      this.mappings = (await t.json()).mappings || [], this.populateProviderFilter(), this.renderMappings(), w(this.elements.announcements, `Loaded ${this.mappings.length} mappings`);
    } catch (t) {
      console.error("Error loading mappings:", t);
      const { errorMessage: e } = this.elements;
      e && (e.textContent = t instanceof Error ? t.message : "An error occurred"), this.showState("error"), w(this.elements.announcements, "Error loading mappings");
    }
  }
  populateProviderFilter() {
    const { filterProvider: t } = this.elements;
    t && (t.innerHTML = '<option value="">All Providers</option>' + [...new Set(this.mappings.map((e) => e.provider).filter(Boolean))].map((e) => `<option value="${o(e)}">${o(e)}</option>`).join(""));
  }
  renderMappings() {
    const { mappingsTbody: t, searchInput: e, filterStatus: i, filterProvider: n } = this.elements;
    if (!t) return;
    const r = (e?.value || "").toLowerCase(), l = i?.value || "", p = n?.value || "", d = this.mappings.filter((a) => !(r && !a.name.toLowerCase().includes(r) && !a.provider.toLowerCase().includes(r) || l && a.status !== l || p && a.provider !== p));
    if (d.length === 0) {
      this.showState("empty");
      return;
    }
    t.innerHTML = d.map((a) => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4">
          <div class="font-medium text-gray-900">${o(a.name)}</div>
          <div class="text-xs text-gray-500">${o(a.compiled_hash ? a.compiled_hash.slice(0, 12) + "..." : "")}</div>
        </td>
        <td class="px-6 py-4 text-sm text-gray-700">${o(a.provider)}</td>
        <td class="px-6 py-4">${this.getStatusBadge(a.status)}</td>
        <td class="px-6 py-4 text-sm text-gray-700">v${a.version || 1}</td>
        <td class="px-6 py-4 text-sm text-gray-500">${V(a.updated_at)}</td>
        <td class="px-6 py-4 text-right">
          <div class="flex items-center justify-end gap-2">
            <button type="button" class="preview-mapping-btn text-purple-600 hover:text-purple-700 text-sm font-medium" data-id="${o(a.id)}" aria-label="Preview ${o(a.name)}">
              Preview
            </button>
            <button type="button" class="edit-mapping-btn text-blue-600 hover:text-blue-700 text-sm font-medium" data-id="${o(a.id)}" aria-label="Edit ${o(a.name)}">
              Edit
            </button>
            ${a.status === "draft" ? `
              <button type="button" class="publish-mapping-btn text-green-600 hover:text-green-700 text-sm font-medium" data-id="${o(a.id)}" aria-label="Publish ${o(a.name)}">
                Publish
              </button>
            ` : ""}
            <button type="button" class="delete-mapping-btn text-red-600 hover:text-red-700 text-sm font-medium" data-id="${o(a.id)}" aria-label="Delete ${o(a.name)}">
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
      <input type="text" placeholder="object" value="${o(t.object || "")}" class="field-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="field" value="${o(t.field || "")}" class="field-name flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
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
      <input type="text" placeholder="source_object" value="${o(t.source_object || "")}" class="rule-source-object flex-1 px-2 py-1 border border-gray-300 rounded text-sm">
      <input type="text" placeholder="source_field" value="${o(t.source_field || "")}" class="rule-source-field flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
      <span class="text-gray-400">→</span>
      <select class="rule-target-entity px-2 py-1 border border-gray-300 rounded text-sm">
        <option value="participant" ${t.target_entity === "participant" ? "selected" : ""}>participant</option>
        <option value="agreement" ${t.target_entity === "agreement" ? "selected" : ""}>agreement</option>
        <option value="field_definition" ${t.target_entity === "field_definition" ? "selected" : ""}>field_definition</option>
        <option value="field_instance" ${t.target_entity === "field_instance" ? "selected" : ""}>field_instance</option>
      </select>
      <input type="text" placeholder="target_path" value="${o(t.target_path || "")}" class="rule-target-path flex-1 px-2 py-1 border border-gray-300 rounded text-sm" required>
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
    const { mappingIdInput: t, mappingVersionInput: e, mappingNameInput: i, mappingProviderInput: n, schemaObjectTypeInput: r, schemaVersionInput: l, schemaFieldsContainer: p, mappingRulesContainer: d } = this.elements, a = [];
    p?.querySelectorAll(".schema-field-row").forEach((g) => {
      a.push({
        object: (g.querySelector(".field-object")?.value || "").trim(),
        field: (g.querySelector(".field-name")?.value || "").trim(),
        type: g.querySelector(".field-type")?.value || "string",
        required: g.querySelector(".field-required")?.checked || !1
      });
    });
    const u = [];
    return d?.querySelectorAll(".mapping-rule-row").forEach((g) => {
      u.push({
        source_object: (g.querySelector(".rule-source-object")?.value || "").trim(),
        source_field: (g.querySelector(".rule-source-field")?.value || "").trim(),
        target_entity: g.querySelector(".rule-target-entity")?.value || "participant",
        target_path: (g.querySelector(".rule-target-path")?.value || "").trim()
      });
    }), {
      id: t?.value.trim() || void 0,
      version: parseInt(e?.value || "0", 10) || 0,
      name: i?.value.trim() || "",
      provider: n?.value.trim() || "",
      external_schema: {
        object_type: r?.value.trim() || "",
        version: l?.value.trim() || void 0,
        fields: a
      },
      rules: u
    };
  }
  populateForm(t) {
    const { mappingIdInput: e, mappingVersionInput: i, mappingNameInput: n, mappingProviderInput: r, schemaObjectTypeInput: l, schemaVersionInput: p, schemaFieldsContainer: d, mappingRulesContainer: a, mappingStatusBadge: u, formValidationStatus: g } = this.elements;
    e && (e.value = t.id || ""), i && (i.value = String(t.version || 0)), n && (n.value = t.name || ""), r && (r.value = t.provider || "");
    const b = t.external_schema || {
      object_type: "",
      fields: []
    };
    l && (l.value = b.object_type || ""), p && (p.value = b.version || ""), d && (d.innerHTML = "", (b.fields || []).forEach((c) => d.appendChild(this.createSchemaFieldRow(c)))), a && (a.innerHTML = "", (t.rules || []).forEach((c) => a.appendChild(this.createMappingRuleRow(c)))), t.status && u ? (u.innerHTML = this.getStatusBadge(t.status), u.classList.remove("hidden")) : u && u.classList.add("hidden"), m(g);
  }
  resetForm() {
    const { mappingForm: t, mappingIdInput: e, mappingVersionInput: i, schemaFieldsContainer: n, mappingRulesContainer: r, mappingStatusBadge: l, formValidationStatus: p } = this.elements;
    t?.reset(), e && (e.value = ""), i && (i.value = "0"), n && (n.innerHTML = ""), r && (r.innerHTML = ""), l && l.classList.add("hidden"), m(p), this.editingMappingId = null;
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
    const e = this.mappings.find((l) => l.id === t);
    if (!e) return;
    const { mappingModal: i, mappingModalTitle: n, mappingNameInput: r } = this.elements;
    this.editingMappingId = t, n && (n.textContent = "Edit Mapping Specification"), this.populateForm(e), h(i), r?.focus();
  }
  closeModal() {
    const { mappingModal: t } = this.elements;
    m(t), this.resetForm();
  }
  openPublishModal(t) {
    const e = this.mappings.find((l) => l.id === t);
    if (!e) return;
    const { publishModal: i, publishMappingName: n, publishMappingVersion: r } = this.elements;
    this.pendingPublishId = t, n && (n.textContent = e.name), r && (r.textContent = `v${e.version || 1}`), h(i);
  }
  closePublishModal() {
    m(this.elements.publishModal), this.pendingPublishId = null;
  }
  openDeleteModal(t) {
    this.pendingDeleteId = t, h(this.elements.deleteModal);
  }
  closeDeleteModal() {
    m(this.elements.deleteModal), this.pendingDeleteId = null;
  }
  async validateMapping() {
    const { validateBtn: t, formValidationStatus: e } = this.elements;
    if (!t) return;
    const i = this.collectFormData();
    t.setAttribute("disabled", "true"), t.innerHTML = '<svg class="animate-spin w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg> Validating...';
    try {
      const n = await P(this.mappingsEndpoint, {
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
      }), r = await n.json();
      if (n.ok && r.status === "ok")
        e && (e.innerHTML = `
            <div class="flex items-start gap-3 text-green-700 bg-green-50 border border-green-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
              </svg>
              <div>
                <p class="font-medium">Validation Passed</p>
                <p class="text-sm mt-1">Mapping specification is valid. Compiled hash: <code class="text-xs bg-green-100 px-1 py-0.5 rounded">${o((r.mapping?.compiled_hash || "").slice(0, 16))}</code></p>
              </div>
            </div>
          `, e.className = "rounded-lg p-4"), w(this.elements.announcements, "Validation passed");
      else {
        const l = r.errors || [r.error?.message || "Validation failed"];
        e && (e.innerHTML = `
            <div class="flex items-start gap-3 text-red-700 bg-red-50 border border-red-200">
              <svg class="w-5 h-5 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <p class="font-medium">Validation Failed</p>
                <ul class="text-sm mt-1 list-disc list-inside">${l.map((p) => `<li>${o(p)}</li>`).join("")}</ul>
              </div>
            </div>
          `, e.className = "rounded-lg p-4"), w(this.elements.announcements, "Validation failed");
      }
      h(e);
    } catch (n) {
      console.error("Validation error:", n), e && (e.innerHTML = `<div class="text-red-600">Error: ${o(n instanceof Error ? n.message : "Unknown error")}</div>`, h(e));
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
      const i = !!e.id, n = await P(i ? `${this.mappingsEndpoint}/${e.id}` : this.mappingsEndpoint, {
        method: i ? "PUT" : "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(e)
      });
      if (!n.ok) throw new Error(await k(n, `HTTP ${n.status}`, { appendStatusToFallback: !1 }));
      y(i ? "Mapping updated" : "Mapping created", "success"), w(this.elements.announcements, i ? "Mapping updated" : "Mapping created"), this.closeModal(), await this.loadMappings();
    } catch (i) {
      console.error("Save error:", i);
      const n = i instanceof Error ? i.message : "Unknown error";
      y(`Failed to save: ${n}`, "error"), w(this.elements.announcements, `Failed to save: ${n}`);
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
        const i = await P(`${this.mappingsEndpoint}/${this.pendingPublishId}/publish`, {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json"
          },
          body: JSON.stringify({ expected_version: t.version })
        });
        if (!i.ok) throw new Error(await k(i, `HTTP ${i.status}`, { appendStatusToFallback: !1 }));
        y("Mapping published", "success"), w(this.elements.announcements, "Mapping published"), this.closePublishModal(), await this.loadMappings();
      } catch (i) {
        console.error("Publish error:", i), y(`Failed to publish: ${i instanceof Error ? i.message : "Unknown error"}`, "error");
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
        const e = await P(`${this.mappingsEndpoint}/${this.pendingDeleteId}`, {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" }
        });
        if (!e.ok) throw new Error(await k(e, `HTTP ${e.status}`, { appendStatusToFallback: !1 }));
        y("Mapping deleted", "success"), w(this.elements.announcements, "Mapping deleted"), this.closeDeleteModal(), await this.loadMappings();
      } catch (e) {
        console.error("Delete error:", e), y(`Failed to delete: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
      } finally {
        t.removeAttribute("disabled"), t.textContent = "Delete";
      }
    }
  }
  openPreviewModal(t) {
    const e = this.mappings.find((u) => u.id === t);
    if (!e) return;
    const { previewModal: i, previewMappingName: n, previewMappingProvider: r, previewObjectType: l, previewMappingStatus: p, previewSourceInput: d, sourceSyntaxError: a } = this.elements;
    this.currentPreviewMapping = e, n && (n.textContent = e.name), r && (r.textContent = e.provider), l && (l.textContent = e.external_schema?.object_type || "-"), p && (p.innerHTML = this.getStatusBadge(e.status)), this.renderPreviewRules(e.rules || []), this.showPreviewState("empty"), d && (d.value = ""), m(a), h(i), d?.focus();
  }
  closePreviewModal() {
    m(this.elements.previewModal), this.currentPreviewMapping = null, this.elements.previewSourceInput && (this.elements.previewSourceInput.value = "");
  }
  showPreviewState(t) {
    const { previewEmpty: e, previewLoading: i, previewError: n, previewSuccess: r } = this.elements;
    switch (m(e), m(i), m(n), m(r), t) {
      case "empty":
        h(e);
        break;
      case "loading":
        h(i);
        break;
      case "error":
        h(n);
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
        <td class="px-3 py-2 font-mono text-xs">${o(i.source_object ? i.source_object + "." : "")}${o(i.source_field)}</td>
        <td class="px-3 py-2 text-center text-gray-400">→</td>
        <td class="px-3 py-2">
          <span class="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">${o(i.target_entity)}</span>
        </td>
        <td class="px-3 py-2 font-mono text-xs">${o(i.target_path)}</td>
        <td class="px-3 py-2" data-rule-source="${o(i.source_field)}">
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
    }, n = i.object_type || "data", r = i.fields || [], l = {}, p = {};
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
    }), l[n] = p, t && (t.value = JSON.stringify(l, null, 2)), m(e);
  }
  validateSourceJson() {
    const { previewSourceInput: t, sourceSyntaxError: e } = this.elements, i = t?.value.trim() || "";
    if (!i)
      return m(e), null;
    let n = null;
    const r = q(i, null, { onError: (l) => {
      n = l;
    } });
    return n ? (e && (e.textContent = `JSON Syntax Error: ${n instanceof Error ? n.message : "Invalid JSON"}`, h(e)), null) : (m(e), r);
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
          const n = this.simulateTransform(i, this.currentPreviewMapping);
          this.renderPreviewResult(n), this.showPreviewState("success");
        } catch (n) {
          console.error("Transform error:", n), e && (e.textContent = n instanceof Error ? n.message : "Transform failed"), this.showPreviewState("error");
        }
      }
    }
  }
  simulateTransform(t, e) {
    const i = e.rules || [], n = {
      participants: [],
      field_definitions: [],
      field_instances: [],
      agreement: {},
      matched_rules: []
    }, r = {}, l = {}, p = [];
    return i.forEach((d) => {
      const a = this.resolveSourceValue(t, d.source_object, d.source_field), u = a !== void 0;
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
            l[d.target_path] = a;
            break;
          case "field_definition":
            p.push({
              path: d.target_path,
              value: a
            });
            break;
        }
    }), Object.keys(r).length > 0 && n.participants.push({
      ...r,
      role: r.role || "signer",
      signing_stage: r.signing_stage || 1
    }), n.agreement = l, n.field_definitions = p, n;
  }
  resolveSourceValue(t, e, i) {
    if (!(!t || !i)) {
      if (e && t[e]) return t[e][i];
      for (const n of Object.keys(t)) if (typeof t[n] == "object" && t[n] !== null) {
        const r = t[n];
        if (i in r) return r[i];
      }
      return t[i];
    }
  }
  renderPreviewResult(t) {
    const { previewParticipants: e, participantsCount: i, previewFields: n, fieldsCount: r, previewMetadata: l, previewRawJson: p, previewRulesTbody: d } = this.elements, a = t.participants || [];
    i && (i.textContent = `(${a.length})`), e && (a.length === 0 ? e.innerHTML = '<p class="text-sm text-gray-500">No participants resolved</p>' : e.innerHTML = a.map((c) => `
          <div class="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
            <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-medium text-blue-700">
              ${o(String(c.name || c.email || "?").charAt(0).toUpperCase())}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900 truncate">${o(String(c.name || "-"))}</p>
              <p class="text-xs text-gray-500 truncate">${o(String(c.email || "-"))}</p>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">${o(String(c.role))}</span>
              <span class="text-xs text-gray-500">Stage ${c.signing_stage}</span>
            </div>
          </div>
        `).join(""));
    const u = t.field_definitions || [];
    r && (r.textContent = `(${u.length})`), n && (u.length === 0 ? n.innerHTML = '<p class="text-sm text-gray-500">No field definitions resolved</p>' : n.innerHTML = u.map((c) => `
          <div class="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
            <span class="font-mono text-xs text-gray-600">${o(c.path)}</span>
            <span class="text-gray-400">=</span>
            <span class="text-gray-900">${o(String(c.value))}</span>
          </div>
        `).join(""));
    const g = t.agreement || {}, b = Object.entries(g);
    l && (b.length === 0 ? l.innerHTML = '<p class="text-sm text-gray-500">No agreement metadata resolved</p>' : l.innerHTML = b.map(([c, f]) => `
          <div class="flex items-center gap-2 text-sm">
            <span class="text-gray-600">${o(c)}:</span>
            <span class="text-gray-900">${o(String(f))}</span>
          </div>
        `).join("")), p && (p.textContent = JSON.stringify(t, null, 2)), (t.matched_rules || []).forEach((c) => {
      const f = d?.querySelector(`[data-rule-source="${o(c.source)}"] span`);
      f && (c.matched ? (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700", f.textContent = "Matched") : (f.className = "px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700", f.textContent = "Not Found"));
    });
  }
  clearPreview() {
    const { previewSourceInput: t, sourceSyntaxError: e } = this.elements;
    t && (t.value = ""), m(e), this.showPreviewState("empty"), this.renderPreviewRules(this.currentPreviewMapping?.rules || []);
  }
};
function W(t) {
  const e = new T(t);
  return C(() => e.init()), e;
}
function X(t) {
  const e = new T({
    basePath: t.basePath,
    apiBasePath: t.apiBasePath || `${t.basePath}/api`
  });
  C(() => e.init()), typeof window < "u" && (window.esignIntegrationMappingsController = e);
}
export {
  X as n,
  W as r,
  T as t
};

//# sourceMappingURL=integration-mappings-C0_mUfs_.js.map