// @ts-nocheck

import {
  clampPageNumber,
  computeEffectiveRulePages,
  expandRuleDefinitionsForPreview,
  formatEffectivePageRange,
  normalizeFieldRuleState,
  normalizePlacementInstance,
  parseExcludePagesCSV,
} from './normalization';
import {
  addLinkGroup,
  createLinkGroup,
} from './linked-placement';

export function createFieldDefinitionsController(options = {}) {
  const {
    initialFieldInstances = [],
    placementSource,
    getCurrentDocumentPageCount,
    getSignerParticipants,
    escapeHtml,
    onDefinitionsChanged,
    onRulesChanged,
    onParticipantsChanged,
    getPlacementLinkGroupState,
    setPlacementLinkGroupState,
  } = options;

  const fieldDefinitionsContainer = document.getElementById('field-definitions-container');
  const fieldDefinitionTemplate = document.getElementById('field-definition-template');
  const addFieldBtn = document.getElementById('add-field-btn');
  const addFieldBtnContainer = document.getElementById('add-field-btn-container');
  const addFieldDefinitionEmptyBtn = document.getElementById('add-field-definition-empty-btn');
  const fieldDefinitionsEmptyState = document.getElementById('field-definitions-empty-state');
  const fieldRulesContainer = document.getElementById('field-rules-container');
  const fieldRuleTemplate = document.getElementById('field-rule-template');
  const addFieldRuleBtn = document.getElementById('add-field-rule-btn');
  const fieldRulesEmptyState = document.getElementById('field-rules-empty-state');
  const fieldRulesPreview = document.getElementById('field-rules-preview');
  const fieldRulesJSONInput = document.getElementById('field_rules_json');
  const fieldPlacementsJSONInput = document.getElementById('field_placements_json');

  let fieldDefinitionCounter = 0;
  let fieldInstanceFormIndex = 0;
  let fieldRuleFormIndex = 0;

  function generateFieldDefinitionId() {
    return `temp_field_${Date.now()}_${fieldDefinitionCounter++}`;
  }

  function generateFieldRuleId() {
    return `rule_${Date.now()}_${fieldRuleFormIndex}`;
  }

  function resolveSignerSelection(preferredValue, signers) {
    const preferred = String(preferredValue || '').trim();
    if (preferred && signers.some((signer) => signer.id === preferred)) {
      return preferred;
    }
    if (signers.length === 1) {
      return signers[0].id;
    }
    return '';
  }

  function syncSignerSelectOptions(select, signers, preferredValue = '') {
    if (!select) return;
    const resolvedSelection = resolveSignerSelection(preferredValue, signers);
    select.innerHTML = '<option value="">Select signer...</option>';
    signers.forEach((signer) => {
      const option = document.createElement('option');
      option.value = signer.id;
      option.textContent = signer.name;
      select.appendChild(option);
    });
    select.value = resolvedSelection;
  }

  function reconcileSignerSelects(signers = getSignerParticipants()) {
    const participantSelects = fieldDefinitionsContainer.querySelectorAll('.field-participant-select');
    const ruleParticipantSelects = fieldRulesContainer
      ? fieldRulesContainer.querySelectorAll('.field-rule-participant-select')
      : [];

    participantSelects.forEach((select) => {
      syncSignerSelectOptions(select, signers, select.value);
    });
    ruleParticipantSelects.forEach((select) => {
      syncSignerSelectOptions(select, signers, select.value);
    });
  }

  function updateFieldDefinitionsEmptyState() {
    const fields = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    if (fields.length === 0) {
      fieldDefinitionsEmptyState.classList.remove('hidden');
      addFieldBtnContainer?.classList.add('hidden');
    } else {
      fieldDefinitionsEmptyState.classList.add('hidden');
      addFieldBtnContainer?.classList.remove('hidden');
    }
  }

  function updateFieldRulesEmptyState() {
    if (!fieldRulesContainer || !fieldRulesEmptyState) return;
    const rows = fieldRulesContainer.querySelectorAll('.field-rule-entry');
    fieldRulesEmptyState.classList.toggle('hidden', rows.length > 0);
  }

  function collectFieldDefinitionsForState() {
    const fieldDefinitions = [];
    fieldDefinitionsContainer.querySelectorAll('.field-definition-entry').forEach((entry) => {
      const id = entry.getAttribute('data-field-definition-id');
      const type = entry.querySelector('.field-type-select')?.value || 'signature';
      const participantId = entry.querySelector('.field-participant-select')?.value || '';
      const page = parseInt(entry.querySelector('input[name*=".page"]')?.value || '1', 10);
      const required = entry.querySelector('input[name*=".required"]')?.checked ?? true;
      fieldDefinitions.push({ tempId: id, type, participantTempId: participantId, page, required });
    });
    return fieldDefinitions;
  }

  function collectFieldRulesForState() {
    if (!fieldRulesContainer) return [];
    const terminalPage = getCurrentDocumentPageCount();
    const rows = fieldRulesContainer.querySelectorAll('.field-rule-entry');
    const out = [];
    rows.forEach((row) => {
      const rule = normalizeFieldRuleState({
        id: row.getAttribute('data-field-rule-id') || '',
        type: row.querySelector('.field-rule-type-select')?.value || '',
        participantId: row.querySelector('.field-rule-participant-select')?.value || '',
        fromPage: row.querySelector('.field-rule-from-page-input')?.value || '',
        toPage: row.querySelector('.field-rule-to-page-input')?.value || '',
        page: row.querySelector('.field-rule-page-input')?.value || '',
        excludeLastPage: Boolean(row.querySelector('.field-rule-exclude-last-input')?.checked),
        excludePages: parseExcludePagesCSV(row.querySelector('.field-rule-exclude-pages-input')?.value || ''),
        required: (row.querySelector('.field-rule-required-select')?.value || '1') !== '0',
      }, terminalPage);
      if (!rule.type) return;
      out.push(rule);
    });
    return out;
  }

  function collectFieldRulesForForm() {
    return collectFieldRulesForState().map((rule) => ({
      id: rule.id,
      type: rule.type,
      participant_id: rule.participantId,
      from_page: rule.fromPage,
      to_page: rule.toPage,
      page: rule.page,
      exclude_last_page: rule.excludeLastPage,
      exclude_pages: rule.excludePages,
      required: rule.required,
    }));
  }

  function expandRulesForPreview(rules, terminalPage) {
    return expandRuleDefinitionsForPreview(rules, terminalPage);
  }

  function renderFieldRulePreview() {
    if (!fieldRulesPreview) return;
    const rules = collectFieldRulesForState();
    const terminalPage = getCurrentDocumentPageCount();
    const expanded = expandRulesForPreview(rules, terminalPage);
    const signers = getSignerParticipants();
    const signerNames = new Map(signers.map((signer) => [String(signer.id), signer.name]));

    if (fieldRulesJSONInput) {
      fieldRulesJSONInput.value = JSON.stringify(collectFieldRulesForForm());
    }

    if (!expanded.length) {
      fieldRulesPreview.innerHTML = '<p>No rules configured.</p>';
      return;
    }

    const byType = expanded.reduce((acc, field) => {
      const key = field.type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const rows = expanded.slice(0, 8).map((field) => {
      const signerName = signerNames.get(String(field.participantId)) || 'Unassigned signer';
      return `<li class="flex items-center justify-between"><span>${field.type === 'initials' ? 'Initials' : 'Signature'} on page ${field.page}</span><span class="text-gray-500">${escapeHtml(String(signerName))}</span></li>`;
    }).join('');
    const moreCount = expanded.length - 8;

    fieldRulesPreview.innerHTML = `
      <p class="text-gray-700">${expanded.length} generated field${expanded.length !== 1 ? 's' : ''} (${byType.initials || 0} initials, ${byType.signature || 0} signatures)</p>
      <ul class="space-y-1">${rows}</ul>
      ${moreCount > 0 ? `<p class="text-gray-500">+${moreCount} more</p>` : ''}
    `;
  }

  function updateFieldParticipantOptions() {
    const signers = getSignerParticipants();
    reconcileSignerSelects(signers);
    renderFieldRulePreview();
  }

  function updateFieldRuleRowUI(entry) {
    const typeSelect = entry.querySelector('.field-rule-type-select');
    const rangeStart = entry.querySelector('.field-rule-range-start-wrap');
    const rangeEnd = entry.querySelector('.field-rule-range-end-wrap');
    const pageWrap = entry.querySelector('.field-rule-page-wrap');
    const excludeLastWrap = entry.querySelector('.field-rule-exclude-last-wrap');
    const excludePagesWrap = entry.querySelector('.field-rule-exclude-pages-wrap');
    const summary = entry.querySelector('.field-rule-summary');
    const fromPageInput = entry.querySelector('.field-rule-from-page-input');
    const toPageInput = entry.querySelector('.field-rule-to-page-input');
    const pageInput = entry.querySelector('.field-rule-page-input');
    const excludeLastInput = entry.querySelector('.field-rule-exclude-last-input');
    const excludePagesInput = entry.querySelector('.field-rule-exclude-pages-input');
    const terminalPage = getCurrentDocumentPageCount();
    const normalizedRule = normalizeFieldRuleState({
      type: typeSelect?.value || '',
      fromPage: fromPageInput?.value || '',
      toPage: toPageInput?.value || '',
      page: pageInput?.value || '',
      excludeLastPage: Boolean(excludeLastInput?.checked),
      excludePages: parseExcludePagesCSV(excludePagesInput?.value || ''),
      required: true,
    }, terminalPage);
    const fromPage = normalizedRule.fromPage > 0 ? normalizedRule.fromPage : 1;
    const toPage = normalizedRule.toPage > 0 ? normalizedRule.toPage : terminalPage;
    const page = normalizedRule.page > 0 ? normalizedRule.page : (normalizedRule.toPage > 0 ? normalizedRule.toPage : terminalPage);
    const excludeLast = normalizedRule.excludeLastPage;
    const excludePages = normalizedRule.excludePages.join(',');

    const isInitials = typeSelect?.value === 'initials_each_page';
    rangeStart.classList.toggle('hidden', !isInitials);
    rangeEnd.classList.toggle('hidden', !isInitials);
    excludeLastWrap.classList.toggle('hidden', !isInitials);
    excludePagesWrap.classList.toggle('hidden', !isInitials);
    pageWrap.classList.toggle('hidden', isInitials);

    if (fromPageInput) fromPageInput.value = String(fromPage);
    if (toPageInput) toPageInput.value = String(toPage);
    if (pageInput) pageInput.value = String(page);
    if (excludePagesInput) excludePagesInput.value = excludePages;
    if (excludeLastInput) excludeLastInput.checked = excludeLast;

    if (isInitials) {
      const effectiveResult = computeEffectiveRulePages(
        fromPage,
        toPage,
        terminalPage,
        excludeLast,
        normalizedRule.excludePages,
      );
      const effectiveRangeText = formatEffectivePageRange(effectiveResult);
      summary.textContent = effectiveResult.isEmpty
        ? `Warning: No initials fields will be generated ${effectiveRangeText}.`
        : `Generates initials fields on ${effectiveRangeText}.`;
    } else {
      summary.textContent = `Generates one signature field on page ${page}.`;
    }
  }

  function addFieldRule(data = {}) {
    if (!fieldRuleTemplate || !fieldRulesContainer) return;
    const clone = fieldRuleTemplate.content.cloneNode(true);
    const entry = clone.querySelector('.field-rule-entry');
    const ruleID = data.id || generateFieldRuleId();
    const formIndex = fieldRuleFormIndex++;
    const terminalPage = getCurrentDocumentPageCount();

    entry.setAttribute('data-field-rule-id', ruleID);
    const idInput = entry.querySelector('.field-rule-id-input');
    const typeSelect = entry.querySelector('.field-rule-type-select');
    const participantSelect = entry.querySelector('.field-rule-participant-select');
    const fromPageInput = entry.querySelector('.field-rule-from-page-input');
    const toPageInput = entry.querySelector('.field-rule-to-page-input');
    const pageInput = entry.querySelector('.field-rule-page-input');
    const requiredSelect = entry.querySelector('.field-rule-required-select');
    const excludeLastInput = entry.querySelector('.field-rule-exclude-last-input');
    const excludePagesInput = entry.querySelector('.field-rule-exclude-pages-input');
    const removeBtn = entry.querySelector('.remove-field-rule-btn');

    idInput.name = `field_rules[${formIndex}].id`;
    idInput.value = ruleID;
    typeSelect.name = `field_rules[${formIndex}].type`;
    participantSelect.name = `field_rules[${formIndex}].participant_id`;
    fromPageInput.name = `field_rules[${formIndex}].from_page`;
    toPageInput.name = `field_rules[${formIndex}].to_page`;
    pageInput.name = `field_rules[${formIndex}].page`;
    requiredSelect.name = `field_rules[${formIndex}].required`;
    excludeLastInput.name = `field_rules[${formIndex}].exclude_last_page`;
    excludePagesInput.name = `field_rules[${formIndex}].exclude_pages`;

    const normalizedData = normalizeFieldRuleState(data, terminalPage);
    typeSelect.value = normalizedData.type || 'initials_each_page';
    syncSignerSelectOptions(participantSelect, getSignerParticipants(), normalizedData.participantId);
    fromPageInput.value = String(normalizedData.fromPage > 0 ? normalizedData.fromPage : 1);
    toPageInput.value = String(normalizedData.toPage > 0 ? normalizedData.toPage : terminalPage);
    pageInput.value = String(normalizedData.page > 0 ? normalizedData.page : terminalPage);
    requiredSelect.value = normalizedData.required ? '1' : '0';
    excludeLastInput.checked = normalizedData.excludeLastPage;
    excludePagesInput.value = normalizedData.excludePages.join(',');

    const onRuleInput = () => {
      updateFieldRuleRowUI(entry);
      renderFieldRulePreview();
      onRulesChanged?.();
    };

    const clampRulePageInputs = () => {
      const maxPage = getCurrentDocumentPageCount();
      if (fromPageInput) {
        const val = parseInt(fromPageInput.value, 10);
        if (Number.isFinite(val)) fromPageInput.value = String(clampPageNumber(val, maxPage, 1));
      }
      if (toPageInput) {
        const val = parseInt(toPageInput.value, 10);
        if (Number.isFinite(val)) toPageInput.value = String(clampPageNumber(val, maxPage, 1));
      }
      if (pageInput) {
        const val = parseInt(pageInput.value, 10);
        if (Number.isFinite(val)) pageInput.value = String(clampPageNumber(val, maxPage, 1));
      }
    };

    const onRulePageInput = () => {
      clampRulePageInputs();
      onRuleInput();
    };

    typeSelect.addEventListener('change', onRuleInput);
    participantSelect.addEventListener('change', onRuleInput);
    fromPageInput.addEventListener('input', onRulePageInput);
    fromPageInput.addEventListener('change', onRulePageInput);
    toPageInput.addEventListener('input', onRulePageInput);
    toPageInput.addEventListener('change', onRulePageInput);
    pageInput.addEventListener('input', onRulePageInput);
    pageInput.addEventListener('change', onRulePageInput);
    requiredSelect.addEventListener('change', onRuleInput);
    excludeLastInput.addEventListener('change', () => {
      const maxPage = getCurrentDocumentPageCount();
      toPageInput.value = String(excludeLastInput.checked ? Math.max(1, maxPage - 1) : maxPage);
      onRuleInput();
    });
    excludePagesInput.addEventListener('input', onRuleInput);
    removeBtn.addEventListener('click', () => {
      entry.remove();
      updateFieldRulesEmptyState();
      renderFieldRulePreview();
      onRulesChanged?.();
    });

    fieldRulesContainer.appendChild(clone);
    updateFieldRuleRowUI(fieldRulesContainer.lastElementChild);
    updateFieldRulesEmptyState();
    renderFieldRulePreview();
  }

  function addFieldDefinition(data = {}) {
    const clone = fieldDefinitionTemplate.content.cloneNode(true);
    const entry = clone.querySelector('.field-definition-entry');

    const fieldDefinitionId = data.id || generateFieldDefinitionId();
    entry.setAttribute('data-field-definition-id', fieldDefinitionId);

    const idInput = entry.querySelector('.field-definition-id-input');
    const typeSelect = entry.querySelector('select[name="field_definitions[].type"]');
    const participantSelect = entry.querySelector('select[name="field_definitions[].participant_id"]');
    const pageInput = entry.querySelector('input[name="field_definitions[].page"]');
    const requiredCheckbox = entry.querySelector('input[name="field_definitions[].required"]');
    const dateSignedInfo = entry.querySelector('.field-date-signed-info');

    const formIndex = fieldInstanceFormIndex++;
    idInput.name = `field_instances[${formIndex}].id`;
    idInput.value = fieldDefinitionId;
    typeSelect.name = `field_instances[${formIndex}].type`;
    participantSelect.name = `field_instances[${formIndex}].participant_id`;
    pageInput.name = `field_instances[${formIndex}].page`;
    requiredCheckbox.name = `field_instances[${formIndex}].required`;

    if (data.type) typeSelect.value = data.type;
    if (data.page) pageInput.value = String(clampPageNumber(data.page, getCurrentDocumentPageCount(), 1));
    if (data.required !== undefined) requiredCheckbox.checked = data.required;

    const preferredParticipantID = String(data.participant_id || data.participantId || '').trim();
    syncSignerSelectOptions(participantSelect, getSignerParticipants(), preferredParticipantID);

    typeSelect.addEventListener('change', () => {
      if (typeSelect.value === 'date_signed') {
        dateSignedInfo.classList.remove('hidden');
      } else {
        dateSignedInfo.classList.add('hidden');
      }
    });
    if (typeSelect.value === 'date_signed') {
      dateSignedInfo.classList.remove('hidden');
    }

    entry.querySelector('.remove-field-definition-btn').addEventListener('click', () => {
      entry.remove();
      updateFieldDefinitionsEmptyState();
      onDefinitionsChanged?.();
    });

    const fieldPageInput = entry.querySelector('input[name*=".page"]');
    const clampFieldPageInput = () => {
      if (!fieldPageInput) return;
      fieldPageInput.value = String(clampPageNumber(fieldPageInput.value, getCurrentDocumentPageCount(), 1));
    };
    clampFieldPageInput();
    fieldPageInput?.addEventListener('input', clampFieldPageInput);
    fieldPageInput?.addEventListener('change', clampFieldPageInput);

    fieldDefinitionsContainer.appendChild(clone);
    updateFieldDefinitionsEmptyState();
  }

  function bindEvents() {
    addFieldBtn.addEventListener('click', () => addFieldDefinition());
    addFieldDefinitionEmptyBtn.addEventListener('click', () => addFieldDefinition());
    addFieldRuleBtn?.addEventListener('click', () => addFieldRule({ to_page: getCurrentDocumentPageCount() }));

    onParticipantsChanged && onParticipantsChanged();
  }

  function initialize() {
    window._initialFieldPlacementsData = [];

    initialFieldInstances.forEach((fieldDef) => {
      const id = String(fieldDef.id || '').trim();
      if (!id) return;
      const type = String(fieldDef.type || 'signature').trim() || 'signature';
      const participantID = String(fieldDef.participant_id || fieldDef.participantId || '').trim();
      const page = Number(fieldDef.page || 1) || 1;
      const required = Boolean(fieldDef.required);
      addFieldDefinition({
        id,
        type,
        participant_id: participantID,
        page,
        required,
      });
      window._initialFieldPlacementsData.push(normalizePlacementInstance({
        id,
        definitionId: id,
        type,
        participantId: participantID,
        participantName: String(fieldDef.participant_name || fieldDef.participantName || '').trim(),
        page,
        x: Number(fieldDef.x || fieldDef.pos_x || 0) || 0,
        y: Number(fieldDef.y || fieldDef.pos_y || 0) || 0,
        width: Number(fieldDef.width || 150) || 150,
        height: Number(fieldDef.height || 32) || 32,
        placementSource: String(fieldDef.placement_source || fieldDef.placementSource || placementSource.MANUAL).trim() || placementSource.MANUAL,
      }, window._initialFieldPlacementsData.length));
    });
    updateFieldDefinitionsEmptyState();
    updateFieldParticipantOptions();
    updateFieldRulesEmptyState();
    renderFieldRulePreview();
  }

  function buildInitialPlacementInstances() {
    return Array.isArray(window._initialFieldPlacementsData)
      ? window._initialFieldPlacementsData.map((instance, index) => normalizePlacementInstance(instance, index))
      : [];
  }

  function collectPlacementFieldDefinitions() {
    const signers = getSignerParticipants();
    const signerNames = new Map(signers.map((signer) => [String(signer.id), signer.name || signer.email || 'Signer']));
    const definitions = [];

    const manualFieldEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    manualFieldEntries.forEach((field) => {
      const definitionId = String(field.getAttribute('data-field-definition-id') || '').trim();
      const typeSelect = field.querySelector('.field-type-select');
      const participantSelect = field.querySelector('.field-participant-select');
      const pageInput = field.querySelector('input[name*=".page"]');
      const fieldType = String(typeSelect?.value || 'text').trim() || 'text';
      const participantId = String(participantSelect?.value || '').trim();
      const page = parseInt(String(pageInput?.value || '1'), 10) || 1;
      definitions.push({
        definitionId,
        fieldType,
        participantId,
        participantName: signerNames.get(participantId) || 'Unassigned',
        page,
      });
    });

    const generatedRuleFields = expandRulesForPreview(collectFieldRulesForState(), getCurrentDocumentPageCount());
    const fieldsByRuleId = new Map();
    generatedRuleFields.forEach((field) => {
      const ruleId = String(field.ruleId || '').trim();
      const definitionId = String(field.id || '').trim();
      if (ruleId && definitionId) {
        const existing = fieldsByRuleId.get(ruleId) || [];
        existing.push(definitionId);
        fieldsByRuleId.set(ruleId, existing);
      }
    });

    let linkGroupState = getPlacementLinkGroupState();
    fieldsByRuleId.forEach((fieldIds, ruleId) => {
      if (fieldIds.length > 1) {
        const existingGroup = linkGroupState.groups.get(`rule_${ruleId}`);
        if (!existingGroup) {
          const linkGroup = createLinkGroup(fieldIds, `Rule ${ruleId}`);
          linkGroup.id = `rule_${ruleId}`;
          linkGroupState = addLinkGroup(linkGroupState, linkGroup);
        }
      }
    });
    setPlacementLinkGroupState(linkGroupState);

    generatedRuleFields.forEach((field) => {
      const definitionId = String(field.id || '').trim();
      if (!definitionId) return;
      const participantId = String(field.participantId || '').trim();
      const page = parseInt(String(field.page || '1'), 10) || 1;
      const ruleId = String(field.ruleId || '').trim();
      definitions.push({
        definitionId,
        fieldType: String(field.type || 'text').trim() || 'text',
        participantId,
        participantName: signerNames.get(participantId) || 'Unassigned',
        page,
        linkGroupId: ruleId ? `rule_${ruleId}` : undefined,
      });
    });

    const seen = new Set();
    const uniqueDefinitions = definitions.filter((definition) => {
      const key = String(definition.definitionId || '').trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    uniqueDefinitions.sort((a, b) => {
      if (a.page !== b.page) return a.page - b.page;
      return a.definitionId.localeCompare(b.definitionId);
    });

    return uniqueDefinitions;
  }

  function getFieldDefinitionById(definitionId) {
    const targetID = String(definitionId || '').trim();
    if (!targetID) return null;

    const placementDefinitions = collectPlacementFieldDefinitions();
    const matched = placementDefinitions.find((definition) => String(definition.definitionId || '').trim() === targetID);
    if (!matched) return null;

    return {
      id: targetID,
      type: String(matched.fieldType || 'text').trim() || 'text',
      participant_id: String(matched.participantId || '').trim(),
      participant_name: String(matched.participantName || 'Unassigned').trim() || 'Unassigned',
      page: Number.parseInt(String(matched.page || '1'), 10) || 1,
      link_group_id: String(matched.linkGroupId || '').trim(),
    };
  }

  function findSignersMissingRequiredSignatureField() {
    const signers = getSignerParticipants();
    const signerSignatureFields = new Map();
    signers.forEach((signer) => signerSignatureFields.set(signer.id, false));

    const fieldDefinitionEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    fieldDefinitionEntries.forEach((field) => {
      const typeSelect = field.querySelector('.field-type-select');
      const participantSelect = field.querySelector('.field-participant-select');
      const requiredCheckbox = field.querySelector('input[name*=".required"]');
      if (typeSelect?.value === 'signature' && participantSelect?.value && requiredCheckbox?.checked) {
        signerSignatureFields.set(participantSelect.value, true);
      }
    });

    const expandedRuleFields = expandRulesForPreview(collectFieldRulesForState(), getCurrentDocumentPageCount());
    expandedRuleFields.forEach((field) => {
      if (field.type === 'signature' && field.participantId && field.required) {
        signerSignatureFields.set(field.participantId, true);
      }
    });

    return signers.filter((signer) => !signerSignatureFields.get(signer.id));
  }

  function missingSignatureFieldMessage(missingSigners) {
    if (!Array.isArray(missingSigners) || missingSigners.length === 0) {
      return 'Each signer requires at least one required signature field.';
    }
    const names = missingSigners.map((signer) => signer?.name?.trim()).filter(Boolean);
    if (names.length === 0) {
      return 'Each signer requires at least one required signature field.';
    }
    return `Each signer requires at least one required signature field. Missing: ${names.join(', ')}`;
  }

  function restoreFieldDefinitionsFromState(state) {
    if (!state?.fieldDefinitions || state.fieldDefinitions.length === 0) return;
    fieldDefinitionsContainer.innerHTML = '';
    fieldInstanceFormIndex = 0;
    state.fieldDefinitions.forEach((fieldDefinition) => {
      addFieldDefinition({
        id: fieldDefinition.tempId,
        type: fieldDefinition.type,
        participant_id: fieldDefinition.participantTempId,
        page: fieldDefinition.page,
        required: fieldDefinition.required,
      });
    });
    updateFieldDefinitionsEmptyState();
  }

  function restoreFieldRulesFromState(state) {
    if (!Array.isArray(state?.fieldRules) || state.fieldRules.length === 0) return;
    if (!fieldRulesContainer) return;
    fieldRulesContainer.querySelectorAll('.field-rule-entry').forEach((entry) => entry.remove());
    fieldRuleFormIndex = 0;
    state.fieldRules.forEach((rule) => {
      addFieldRule({
        id: rule.id,
        type: rule.type,
        participantId: rule.participantId || rule.participantTempId,
        fromPage: rule.fromPage,
        toPage: rule.toPage,
        page: rule.page,
        excludeLastPage: rule.excludeLastPage,
        excludePages: rule.excludePages,
        required: rule.required,
      });
    });
    updateFieldRulesEmptyState();
    renderFieldRulePreview();
  }

  return {
    refs: {
      fieldDefinitionsContainer,
      fieldRulesContainer,
      addFieldBtn,
      fieldPlacementsJSONInput,
      fieldRulesJSONInput,
    },
    bindEvents,
    initialize,
    buildInitialPlacementInstances,
    collectFieldDefinitionsForState,
    collectFieldRulesForState,
    collectFieldRulesForForm,
    expandRulesForPreview,
    renderFieldRulePreview,
    updateFieldParticipantOptions,
    collectPlacementFieldDefinitions,
    getFieldDefinitionById,
    findSignersMissingRequiredSignatureField,
    missingSignatureFieldMessage,
    restoreFieldDefinitionsFromState,
    restoreFieldRulesFromState,
  };
}
