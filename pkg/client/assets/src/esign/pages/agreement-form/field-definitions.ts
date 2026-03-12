import type {
  ExpandedRuleField,
  FieldRuleFormPayload,
  FieldRuleState,
  LinkGroupState,
  NormalizedPlacementInstance,
} from './contracts';
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
import type { SignerParticipantSummary } from './participants';

declare global {
  interface Window {
    _initialFieldPlacementsData?: NormalizedPlacementInstance[];
  }
}

interface FieldDefinitionInputRecord {
  id?: unknown;
  type?: unknown;
  page?: unknown;
  required?: unknown;
  participant_id?: unknown;
  participantId?: unknown;
  participant_name?: unknown;
  participantName?: unknown;
  x?: unknown;
  y?: unknown;
  pos_x?: unknown;
  pos_y?: unknown;
  width?: unknown;
  height?: unknown;
  placement_source?: unknown;
  placementSource?: unknown;
}

interface FieldDefinitionStateRecord {
  tempId: string;
  type: string;
  participantTempId: string;
  page: number;
  required: boolean;
}

interface PlacementFieldDefinition {
  definitionId: string;
  fieldType: string;
  participantId: string;
  participantName: string;
  page: number;
  linkGroupId?: string;
}

interface FieldDefinitionLookupResult {
  id: string;
  type: string;
  participant_id: string;
  participant_name: string;
  page: number;
  link_group_id: string;
}

interface FieldDefinitionControllerOptions {
  initialFieldInstances?: FieldDefinitionInputRecord[];
  placementSource: { MANUAL: string };
  getCurrentDocumentPageCount(): number;
  getSignerParticipants(): SignerParticipantSummary[];
  escapeHtml(value: unknown): string;
  onDefinitionsChanged?(): void;
  onRulesChanged?(): void;
  onParticipantsChanged?(): void;
  getPlacementLinkGroupState(): LinkGroupState;
  setPlacementLinkGroupState(nextState: LinkGroupState): void;
}

export interface FieldDefinitionsController {
  refs: {
    fieldDefinitionsContainer: HTMLElement | null;
    fieldRulesContainer: HTMLElement | null;
    addFieldBtn: HTMLElement | null;
    fieldPlacementsJSONInput: HTMLInputElement | null;
    fieldRulesJSONInput: HTMLInputElement | null;
  };
  bindEvents(): void;
  initialize(): void;
  buildInitialPlacementInstances(): NormalizedPlacementInstance[];
  collectFieldDefinitionsForState(): FieldDefinitionStateRecord[];
  collectFieldRulesForState(): FieldRuleState[];
  collectFieldRulesForForm(): FieldRuleFormPayload[];
  expandRulesForPreview(rules: Array<Partial<FieldRuleState>>, terminalPage: number): ExpandedRuleField[];
  renderFieldRulePreview(): void;
  updateFieldParticipantOptions(): void;
  collectPlacementFieldDefinitions(): PlacementFieldDefinition[];
  getFieldDefinitionById(definitionId: string): FieldDefinitionLookupResult | null;
  findSignersMissingRequiredSignatureField(): SignerParticipantSummary[];
  missingSignatureFieldMessage(missingSigners: Array<SignerParticipantSummary | null | undefined>): string;
  restoreFieldDefinitionsFromState(state: { fieldDefinitions?: FieldDefinitionStateRecord[] } | null | undefined): void;
  restoreFieldRulesFromState(state: { fieldRules?: FieldRuleState[] } | null | undefined): void;
}

function elementById<T extends HTMLElement>(id: string): T | null {
  const element = document.getElementById(id);
  return element instanceof HTMLElement ? element as T : null;
}

function inputElement(root: ParentNode, selector: string): HTMLInputElement | null {
  const element = root.querySelector(selector);
  return element instanceof HTMLInputElement ? element : null;
}

function selectElement(root: ParentNode, selector: string): HTMLSelectElement | null {
  const element = root.querySelector(selector);
  return element instanceof HTMLSelectElement ? element : null;
}

function buttonElement(root: ParentNode, selector: string): HTMLButtonElement | null {
  const element = root.querySelector(selector);
  return element instanceof HTMLButtonElement ? element : null;
}

function htmlElement(root: ParentNode, selector: string): HTMLElement | null {
  const element = root.querySelector(selector);
  return element instanceof HTMLElement ? element : null;
}
export function createFieldDefinitionsController(
  options: FieldDefinitionControllerOptions,
): FieldDefinitionsController {
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

  const fieldDefinitionsContainer = elementById<HTMLElement>('field-definitions-container');
  const fieldDefinitionTemplate = document.getElementById('field-definition-template');
  const addFieldBtn = elementById<HTMLElement>('add-field-btn');
  const addFieldBtnContainer = elementById<HTMLElement>('add-field-btn-container');
  const addFieldDefinitionEmptyBtn = elementById<HTMLElement>('add-field-definition-empty-btn');
  const fieldDefinitionsEmptyState = elementById<HTMLElement>('field-definitions-empty-state');
  const fieldRulesContainer = elementById<HTMLElement>('field-rules-container');
  const fieldRuleTemplate = document.getElementById('field-rule-template');
  const addFieldRuleBtn = elementById<HTMLElement>('add-field-rule-btn');
  const fieldRulesEmptyState = elementById<HTMLElement>('field-rules-empty-state');
  const fieldRulesPreview = elementById<HTMLElement>('field-rules-preview');
  const fieldRulesJSONInput = elementById<HTMLInputElement>('field_rules_json');
  const fieldPlacementsJSONInput = elementById<HTMLInputElement>('field_placements_json');

  let fieldDefinitionCounter = 0;
  let fieldInstanceFormIndex = 0;
  let fieldRuleFormIndex = 0;

  function generateFieldDefinitionId(): string {
    return `temp_field_${Date.now()}_${fieldDefinitionCounter++}`;
  }

  function generateFieldRuleId(): string {
    return `rule_${Date.now()}_${fieldRuleFormIndex}`;
  }

  function resolveSignerSelection(preferredValue: unknown, signers: SignerParticipantSummary[]): string {
    const preferred = String(preferredValue || '').trim();
    if (preferred && signers.some((signer) => signer.id === preferred)) {
      return preferred;
    }
    if (signers.length === 1) {
      return signers[0].id;
    }
    return '';
  }

  function syncSignerSelectOptions(
    select: HTMLSelectElement | null,
    signers: SignerParticipantSummary[],
    preferredValue = '',
  ): void {
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

  function reconcileSignerSelects(signers: SignerParticipantSummary[] = getSignerParticipants()): void {
    if (!fieldDefinitionsContainer) return;
    const participantSelects = fieldDefinitionsContainer.querySelectorAll('.field-participant-select');
    const ruleParticipantSelects = fieldRulesContainer
      ? fieldRulesContainer.querySelectorAll('.field-rule-participant-select')
      : [];

    participantSelects.forEach((select) => {
      syncSignerSelectOptions(
        select instanceof HTMLSelectElement ? select : null,
        signers,
        select instanceof HTMLSelectElement ? select.value : '',
      );
    });
    ruleParticipantSelects.forEach((select) => {
      syncSignerSelectOptions(
        select instanceof HTMLSelectElement ? select : null,
        signers,
        select instanceof HTMLSelectElement ? select.value : '',
      );
    });
  }

  function updateFieldDefinitionsEmptyState(): void {
    if (!fieldDefinitionsContainer || !fieldDefinitionsEmptyState) return;
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

  function collectFieldDefinitionsForState(): FieldDefinitionStateRecord[] {
    if (!fieldDefinitionsContainer) return [];
    const fieldDefinitions: FieldDefinitionStateRecord[] = [];
    fieldDefinitionsContainer.querySelectorAll('.field-definition-entry').forEach((entry) => {
      const id = entry.getAttribute('data-field-definition-id');
      const type = selectElement(entry, '.field-type-select')?.value || 'signature';
      const participantId = selectElement(entry, '.field-participant-select')?.value || '';
      const page = Number.parseInt(inputElement(entry, 'input[name*=".page"]')?.value || '1', 10);
      const required = inputElement(entry, 'input[name*=".required"]')?.checked ?? true;
      fieldDefinitions.push({
        tempId: String(id || ''),
        type,
        participantTempId: participantId,
        page: Number.isFinite(page) ? page : 1,
        required,
      });
    });
    return fieldDefinitions;
  }

  function collectFieldRulesForState(): FieldRuleState[] {
    if (!fieldRulesContainer) return [];
    const terminalPage = getCurrentDocumentPageCount();
    const rows = fieldRulesContainer.querySelectorAll('.field-rule-entry');
    const out: FieldRuleState[] = [];
    rows.forEach((row) => {
      const rule = normalizeFieldRuleState({
        id: row.getAttribute('data-field-rule-id') || '',
        type: selectElement(row, '.field-rule-type-select')?.value || '',
        participantId: selectElement(row, '.field-rule-participant-select')?.value || '',
        fromPage: inputElement(row, '.field-rule-from-page-input')?.value || '',
        toPage: inputElement(row, '.field-rule-to-page-input')?.value || '',
        page: inputElement(row, '.field-rule-page-input')?.value || '',
        excludeLastPage: Boolean(inputElement(row, '.field-rule-exclude-last-input')?.checked),
        excludePages: parseExcludePagesCSV(inputElement(row, '.field-rule-exclude-pages-input')?.value || ''),
        required: (selectElement(row, '.field-rule-required-select')?.value || '1') !== '0',
      } as unknown as Partial<FieldRuleState> & Record<string, unknown>, terminalPage);
      if (!rule.type) return;
      out.push(rule);
    });
    return out;
  }

  function collectFieldRulesForForm(): FieldRuleFormPayload[] {
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

  function expandRulesForPreview(rules: Array<Partial<FieldRuleState>>, terminalPage: number): ExpandedRuleField[] {
    return expandRuleDefinitionsForPreview(rules, terminalPage);
  }

  function renderFieldRulePreview(): void {
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

    const byType = expanded.reduce<Record<string, number>>((acc, field) => {
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

  function updateFieldParticipantOptions(): void {
    const signers = getSignerParticipants();
    reconcileSignerSelects(signers);
    renderFieldRulePreview();
  }

  function updateFieldRuleRowUI(entry: ParentNode): void {
    const typeSelect = selectElement(entry, '.field-rule-type-select');
    const rangeStart = htmlElement(entry, '.field-rule-range-start-wrap');
    const rangeEnd = htmlElement(entry, '.field-rule-range-end-wrap');
    const pageWrap = htmlElement(entry, '.field-rule-page-wrap');
    const excludeLastWrap = htmlElement(entry, '.field-rule-exclude-last-wrap');
    const excludePagesWrap = htmlElement(entry, '.field-rule-exclude-pages-wrap');
    const summary = htmlElement(entry, '.field-rule-summary');
    const fromPageInput = inputElement(entry, '.field-rule-from-page-input');
    const toPageInput = inputElement(entry, '.field-rule-to-page-input');
    const pageInput = inputElement(entry, '.field-rule-page-input');
    const excludeLastInput = inputElement(entry, '.field-rule-exclude-last-input');
    const excludePagesInput = inputElement(entry, '.field-rule-exclude-pages-input');
    if (!typeSelect || !rangeStart || !rangeEnd || !pageWrap || !excludeLastWrap || !excludePagesWrap || !summary) {
      return;
    }
    const terminalPage = getCurrentDocumentPageCount();
    const normalizedRule = normalizeFieldRuleState({
      type: typeSelect?.value || '',
      fromPage: fromPageInput?.value || '',
      toPage: toPageInput?.value || '',
      page: pageInput?.value || '',
      excludeLastPage: Boolean(excludeLastInput?.checked),
      excludePages: parseExcludePagesCSV(excludePagesInput?.value || ''),
      required: true,
    } as unknown as Partial<FieldRuleState> & Record<string, unknown>, terminalPage);
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

  function addFieldRule(data: Partial<FieldRuleState> & Record<string, unknown> = {}): void {
    if (!(fieldRuleTemplate instanceof HTMLTemplateElement) || !fieldRulesContainer) return;
    const clone = fieldRuleTemplate.content.cloneNode(true) as DocumentFragment;
    const entry = clone.querySelector('.field-rule-entry');
    if (!(entry instanceof HTMLElement)) return;
    const ruleID = data.id || generateFieldRuleId();
    const formIndex = fieldRuleFormIndex++;
    const terminalPage = getCurrentDocumentPageCount();

    entry.setAttribute('data-field-rule-id', ruleID);
    const idInput = inputElement(entry, '.field-rule-id-input');
    const typeSelect = selectElement(entry, '.field-rule-type-select');
    const participantSelect = selectElement(entry, '.field-rule-participant-select');
    const fromPageInput = inputElement(entry, '.field-rule-from-page-input');
    const toPageInput = inputElement(entry, '.field-rule-to-page-input');
    const pageInput = inputElement(entry, '.field-rule-page-input');
    const requiredSelect = selectElement(entry, '.field-rule-required-select');
    const excludeLastInput = inputElement(entry, '.field-rule-exclude-last-input');
    const excludePagesInput = inputElement(entry, '.field-rule-exclude-pages-input');
    const removeBtn = buttonElement(entry, '.remove-field-rule-btn');
    if (!idInput || !typeSelect || !participantSelect || !fromPageInput || !toPageInput || !pageInput || !requiredSelect || !excludeLastInput || !excludePagesInput || !removeBtn) {
      return;
    }

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
    updateFieldRuleRowUI(fieldRulesContainer.lastElementChild || entry);
    updateFieldRulesEmptyState();
    renderFieldRulePreview();
  }

  function addFieldDefinition(data: FieldDefinitionInputRecord = {}): void {
    if (!(fieldDefinitionTemplate instanceof HTMLTemplateElement) || !fieldDefinitionsContainer) return;
    const clone = fieldDefinitionTemplate.content.cloneNode(true) as DocumentFragment;
    const entry = clone.querySelector('.field-definition-entry');
    if (!(entry instanceof HTMLElement)) return;

    const fieldDefinitionId = String(data.id || generateFieldDefinitionId()).trim() || generateFieldDefinitionId();
    entry.setAttribute('data-field-definition-id', fieldDefinitionId);

    const idInput = inputElement(entry, '.field-definition-id-input');
    const typeSelect = selectElement(entry, 'select[name="field_definitions[].type"]');
    const participantSelect = selectElement(entry, 'select[name="field_definitions[].participant_id"]');
    const pageInput = inputElement(entry, 'input[name="field_definitions[].page"]');
    const requiredCheckbox = inputElement(entry, 'input[name="field_definitions[].required"]');
    const dateSignedInfo = htmlElement(entry, '.field-date-signed-info');
    if (!idInput || !typeSelect || !participantSelect || !pageInput || !requiredCheckbox || !dateSignedInfo) return;

    const formIndex = fieldInstanceFormIndex++;
    idInput.name = `field_instances[${formIndex}].id`;
    idInput.value = fieldDefinitionId;
    typeSelect.name = `field_instances[${formIndex}].type`;
    participantSelect.name = `field_instances[${formIndex}].participant_id`;
    pageInput.name = `field_instances[${formIndex}].page`;
    requiredCheckbox.name = `field_instances[${formIndex}].required`;

    if (data.type) typeSelect.value = String(data.type);
    if (data.page !== undefined) pageInput.value = String(clampPageNumber(data.page, getCurrentDocumentPageCount(), 1));
    if (data.required !== undefined) requiredCheckbox.checked = Boolean(data.required);

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

    buttonElement(entry, '.remove-field-definition-btn')?.addEventListener('click', () => {
      entry.remove();
      updateFieldDefinitionsEmptyState();
      onDefinitionsChanged?.();
    });

    const fieldPageInput = inputElement(entry, 'input[name*=".page"]');
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

  function bindEvents(): void {
    addFieldBtn?.addEventListener('click', () => addFieldDefinition());
    addFieldDefinitionEmptyBtn?.addEventListener('click', () => addFieldDefinition());
    addFieldRuleBtn?.addEventListener('click', () => addFieldRule({ to_page: getCurrentDocumentPageCount() }));

    onParticipantsChanged?.();
  }

  function initialize(): void {
    const initialPlacements: NormalizedPlacementInstance[] = [];
    window._initialFieldPlacementsData = initialPlacements;

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
      initialPlacements.push(normalizePlacementInstance({
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
      } as Record<string, unknown>, initialPlacements.length));
    });
    updateFieldDefinitionsEmptyState();
    updateFieldParticipantOptions();
    updateFieldRulesEmptyState();
    renderFieldRulePreview();
  }

  function buildInitialPlacementInstances(): NormalizedPlacementInstance[] {
    const initialPlacements = window._initialFieldPlacementsData;
    return Array.isArray(initialPlacements)
      ? initialPlacements.map((instance, index) => normalizePlacementInstance(instance as unknown as Record<string, unknown>, index))
      : [];
  }

  function collectPlacementFieldDefinitions(): PlacementFieldDefinition[] {
    if (!fieldDefinitionsContainer) return [];
    const signers = getSignerParticipants();
    const signerNames = new Map(signers.map((signer) => [String(signer.id), signer.name || signer.email || 'Signer']));
    const definitions: PlacementFieldDefinition[] = [];

    const manualFieldEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    manualFieldEntries.forEach((field) => {
      const definitionId = String(field.getAttribute('data-field-definition-id') || '').trim();
      const typeSelect = selectElement(field, '.field-type-select');
      const participantSelect = selectElement(field, '.field-participant-select');
      const pageInput = inputElement(field, 'input[name*=".page"]');
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

  function getFieldDefinitionById(definitionId: string): FieldDefinitionLookupResult | null {
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

  function findSignersMissingRequiredSignatureField(): SignerParticipantSummary[] {
    if (!fieldDefinitionsContainer) return [];
    const signers = getSignerParticipants();
    const signerSignatureFields = new Map<string, boolean>();
    signers.forEach((signer) => signerSignatureFields.set(signer.id, false));

    const fieldDefinitionEntries = fieldDefinitionsContainer.querySelectorAll('.field-definition-entry');
    fieldDefinitionEntries.forEach((field) => {
      const typeSelect = selectElement(field, '.field-type-select');
      const participantSelect = selectElement(field, '.field-participant-select');
      const requiredCheckbox = inputElement(field, 'input[name*=".required"]');
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

  function missingSignatureFieldMessage(missingSigners: Array<SignerParticipantSummary | null | undefined>): string {
    if (!Array.isArray(missingSigners) || missingSigners.length === 0) {
      return 'Each signer requires at least one required signature field.';
    }
    const names = missingSigners.map((signer) => signer?.name?.trim()).filter(Boolean);
    if (names.length === 0) {
      return 'Each signer requires at least one required signature field.';
    }
    return `Each signer requires at least one required signature field. Missing: ${names.join(', ')}`;
  }

  function restoreFieldDefinitionsFromState(state: { fieldDefinitions?: FieldDefinitionStateRecord[] } | null | undefined): void {
    if (!fieldDefinitionsContainer || !state?.fieldDefinitions || state.fieldDefinitions.length === 0) return;
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

  function restoreFieldRulesFromState(state: { fieldRules?: FieldRuleState[] } | null | undefined): void {
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
