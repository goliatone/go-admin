type BlockEditorConfig = {
  sortable?: boolean;
  addLabel?: string;
  emptyLabel?: string;
  allowDrag?: boolean;
  /** Default schema version pattern: {type}@v1.0.0 */
  schemaVersionPattern?: string;
  /** Required fields per block type */
  requiredFields?: Record<string, string[]>;
  /** Enable validation on input */
  validateOnInput?: boolean;
  /** Legacy blocks for conflict detection */
  legacyBlocks?: any[];
  /** Show conflict detection UI when conflicts exist */
  showConflicts?: boolean;
};

type BlockTemplate = {
  type: string;
  label: string;
  icon?: string;
  collapsed?: boolean;
  schemaVersion?: string;
  requiredFields?: string[];
  template: HTMLTemplateElement;
};

type ValidationError = {
  field: string;
  message: string;
};

type BlockConflict = {
  blockIndex: number;
  blockType: string;
  field: string;
  embeddedValue: any;
  legacyValue: any;
};

type ConflictReport = {
  hasConflicts: boolean;
  conflicts: BlockConflict[];
  embeddedCount: number;
  legacyCount: number;
};

type BlockEditorElements = {
  root: HTMLElement;
  list: HTMLElement;
  output: HTMLInputElement;
  addSelect?: HTMLSelectElement;
  addButton?: HTMLButtonElement;
  emptyState?: HTMLElement;
};

function parseConfig(raw: string | null): BlockEditorConfig {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      return parsed as BlockEditorConfig;
    }
  } catch {
    // ignore
  }
  return {};
}

function resolveConfig(root: HTMLElement): BlockEditorConfig {
  const configRoot = root.closest<HTMLElement>('[data-component-config]');
  return parseConfig(configRoot?.getAttribute('data-component-config') ?? null);
}

function parseBoolean(value?: string | null): boolean | undefined {
  if (value == null) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
}

function resolveElements(root: HTMLElement): BlockEditorElements | null {
  const list = root.querySelector<HTMLElement>('[data-block-list]');
  const output = root.querySelector<HTMLInputElement>('input[data-block-output]');
  if (!list || !output) return null;
  const addSelect = root.querySelector<HTMLSelectElement>('[data-block-add-select]');
  const addButton = root.querySelector<HTMLButtonElement>('[data-block-add]');
  const emptyState = root.querySelector<HTMLElement>('[data-block-empty]');
  return { root, list, output, addSelect: addSelect ?? undefined, addButton: addButton ?? undefined, emptyState: emptyState ?? undefined };
}

function toPathParts(raw: string): string[] {
  const cleaned = raw.replace(/\]/g, '');
  return cleaned.split(/\.|\[/).map((part) => part.trim()).filter((part) => part.length > 0);
}

function buildInputName(base: string, index: number, raw: string): string {
  if (!base) return raw;
  const parts = toPathParts(raw);
  let result = `${base}[${index}]`;
  for (const part of parts) {
    result += `[${part}]`;
  }
  return result;
}

function getByPath(data: any, rawPath: string): any {
  if (!data || !rawPath) return undefined;
  const parts = toPathParts(rawPath);
  let current = data;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function setByPath(target: Record<string, any>, rawPath: string, value: any): void {
  if (!rawPath) return;
  const parts = toPathParts(rawPath);
  if (parts.length === 0) return;
  let current: any = target;
  parts.forEach((part, idx) => {
    const isLast = idx === parts.length - 1;
    const nextPart = parts[idx + 1];
    const nextIsIndex = nextPart !== undefined && /^\d+$/.test(nextPart);
    if (isLast) {
      if (part === '') return;
      current[part] = value;
      return;
    }
    if (current[part] == null || typeof current[part] !== 'object') {
      current[part] = nextIsIndex ? [] : {};
    }
    current = current[part];
  });
}

function readFieldValue(elements: Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): any {
  if (elements.length === 0) return undefined;
  const first = elements[0];
  if (first instanceof HTMLSelectElement && first.multiple) {
    return Array.from(first.selectedOptions).map((opt) => opt.value);
  }
  if (first instanceof HTMLInputElement) {
    if (first.type === 'radio') {
      const checked = elements.find((el) => (el as HTMLInputElement).checked) as HTMLInputElement | undefined;
      return checked ? checked.value : undefined;
    }
    if (first.type === 'checkbox') {
      if (elements.length > 1) {
        return elements.filter((el) => (el as HTMLInputElement).checked).map((el) => (el as HTMLInputElement).value);
      }
      return first.checked;
    }
  }
  return first.value;
}

function setFieldValue(element: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, value: any): void {
  if (value == null) return;
  if (element instanceof HTMLInputElement) {
    if (element.type === 'checkbox') {
      if (Array.isArray(value)) {
        element.checked = value.map(String).includes(element.value);
      } else if (typeof value === 'boolean') {
        element.checked = value;
      } else {
        element.checked = String(value) === element.value || value === true;
      }
      return;
    }
    if (element.type === 'radio') {
      element.checked = String(value) === element.value;
      return;
    }
  }
  if (element instanceof HTMLSelectElement && element.multiple) {
    const values = Array.isArray(value) ? value.map(String) : [String(value)];
    Array.from(element.options).forEach((opt) => {
      opt.selected = values.includes(opt.value);
    });
    return;
  }
  element.value = String(value);
}

function collectTemplates(root: HTMLElement, config: BlockEditorConfig): Map<string, BlockTemplate> {
  const templates = new Map<string, BlockTemplate>();
  root.querySelectorAll<HTMLTemplateElement>('template[data-block-template]').forEach((template) => {
    const type = template.dataset.blockType?.trim();
    if (!type) return;
    const label = template.dataset.blockLabel?.trim() || type;
    const icon = template.dataset.blockIcon?.trim();
    const collapsed = parseBoolean(template.dataset.blockCollapsed);
    const schemaVersion = template.dataset.blockSchemaVersion?.trim() || generateSchemaVersion(type, config.schemaVersionPattern);
    const requiredFieldsRaw = template.dataset.blockRequiredFields?.trim();
    const requiredFields = requiredFieldsRaw
      ? requiredFieldsRaw.split(',').map((f) => f.trim()).filter(Boolean)
      : config.requiredFields?.[type] || [];
    templates.set(type, {
      type,
      label,
      icon: icon || undefined,
      collapsed,
      schemaVersion,
      requiredFields,
      template,
    });
  });
  return templates;
}

/**
 * Generate a schema version string for a block type
 */
function generateSchemaVersion(type: string, pattern?: string): string {
  if (pattern) {
    return pattern.replace('{type}', type);
  }
  return `${type}@v1.0.0`;
}

/**
 * Validate a block's required fields
 */
function validateBlock(
  item: HTMLElement,
  template: BlockTemplate
): ValidationError[] {
  const errors: ValidationError[] = [];
  const requiredFields = template.requiredFields || [];

  for (const fieldName of requiredFields) {
    const field = item.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
      `[name="${fieldName}"], [data-block-field-name="${fieldName}"]`
    );

    if (!field) continue;

    let isEmpty = false;
    if (field instanceof HTMLInputElement) {
      if (field.type === 'checkbox') {
        isEmpty = !field.checked;
      } else if (field.type === 'radio') {
        const radioGroup = item.querySelectorAll<HTMLInputElement>(`[name="${field.name}"]`);
        isEmpty = !Array.from(radioGroup).some((r) => r.checked);
      } else {
        isEmpty = !field.value.trim();
      }
    } else if (field instanceof HTMLSelectElement) {
      isEmpty = !field.value || field.value === '';
    } else {
      isEmpty = !field.value.trim();
    }

    if (isEmpty) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
      });
    }
  }

  return errors;
}

/**
 * Show validation errors on a block item
 */
function showBlockErrors(item: HTMLElement, errors: ValidationError[]): void {
  // Clear previous errors
  clearBlockErrors(item);

  if (errors.length === 0) return;

  // Mark block as invalid
  item.classList.add('block-item--invalid');
  item.dataset.blockValid = 'false';

  // Add error indicator to header
  const header = item.querySelector('[data-block-header]');
  if (header) {
    const errorBadge = document.createElement('span');
    errorBadge.className = 'block-error-badge text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full dark:bg-red-900/20 dark:text-red-400';
    errorBadge.textContent = `${errors.length} error${errors.length > 1 ? 's' : ''}`;
    errorBadge.setAttribute('data-block-error-badge', 'true');
    header.querySelector('.flex')?.appendChild(errorBadge);
  }

  // Mark individual fields
  for (const error of errors) {
    const field = item.querySelector<HTMLElement>(
      `[name="${error.field}"], [data-block-field-name="${error.field}"]`
    );
    if (field) {
      field.classList.add('border-red-500', 'focus:ring-red-500');
      const wrapper = field.closest('[data-component]');
      if (wrapper) {
        const errorMsg = document.createElement('p');
        errorMsg.className = 'block-field-error text-xs text-red-600 mt-1 dark:text-red-400';
        errorMsg.textContent = error.message;
        errorMsg.setAttribute('data-block-field-error', 'true');
        wrapper.appendChild(errorMsg);
      }
    }
  }
}

/**
 * Clear validation errors from a block item
 */
function clearBlockErrors(item: HTMLElement): void {
  item.classList.remove('block-item--invalid');
  item.dataset.blockValid = 'true';

  // Remove error badge
  item.querySelectorAll('[data-block-error-badge]').forEach((el) => el.remove());

  // Remove field error messages
  item.querySelectorAll('[data-block-field-error]').forEach((el) => el.remove());

  // Remove error styling from fields
  item.querySelectorAll('.border-red-500').forEach((el) => {
    el.classList.remove('border-red-500', 'focus:ring-red-500');
  });
}

/**
 * Compare embedded blocks with legacy blocks to detect conflicts
 */
function detectBlockConflicts(embedded: any[], legacy: any[]): ConflictReport {
  const conflicts: BlockConflict[] = [];

  if (!Array.isArray(embedded) || !Array.isArray(legacy)) {
    return {
      hasConflicts: false,
      conflicts: [],
      embeddedCount: Array.isArray(embedded) ? embedded.length : 0,
      legacyCount: Array.isArray(legacy) ? legacy.length : 0,
    };
  }

  // Count mismatch is a conflict
  if (embedded.length !== legacy.length) {
    // Still compare what we can
  }

  const maxLen = Math.max(embedded.length, legacy.length);
  for (let i = 0; i < maxLen; i++) {
    const embBlock = embedded[i] || {};
    const legBlock = legacy[i] || {};
    const blockType = embBlock._type || legBlock._type || `block_${i}`;

    // Compare all fields
    const allKeys = new Set([...Object.keys(embBlock), ...Object.keys(legBlock)]);
    for (const key of allKeys) {
      if (key.startsWith('_')) continue; // Skip metadata fields for comparison
      const embVal = embBlock[key];
      const legVal = legBlock[key];

      if (!deepEqual(embVal, legVal)) {
        conflicts.push({
          blockIndex: i,
          blockType,
          field: key,
          embeddedValue: embVal,
          legacyValue: legVal,
        });
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0 || embedded.length !== legacy.length,
    conflicts,
    embeddedCount: embedded.length,
    legacyCount: legacy.length,
  };
}

/**
 * Deep equality check for conflict detection
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }

  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every((key) => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Create conflict report UI element
 */
function createConflictReportUI(report: ConflictReport): HTMLElement {
  const container = document.createElement('div');
  container.className = 'block-conflict-report border border-amber-200 bg-amber-50 rounded-lg p-4 mb-4 dark:bg-amber-900/20 dark:border-amber-700';
  container.setAttribute('data-block-conflict-report', 'true');

  const header = document.createElement('div');
  header.className = 'flex items-center gap-2 mb-3';

  const icon = document.createElement('span');
  icon.className = 'text-amber-600 dark:text-amber-400';
  icon.innerHTML = `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;

  const title = document.createElement('span');
  title.className = 'font-medium text-amber-800 dark:text-amber-200';
  title.textContent = 'Block Conflicts Detected';

  header.appendChild(icon);
  header.appendChild(title);
  container.appendChild(header);

  // Summary
  const summary = document.createElement('p');
  summary.className = 'text-sm text-amber-700 dark:text-amber-300 mb-3';
  summary.textContent = `Embedded blocks (${report.embeddedCount}) differ from legacy blocks (${report.legacyCount}). Embedded blocks are authoritative.`;
  container.appendChild(summary);

  if (report.conflicts.length > 0) {
    const details = document.createElement('details');
    details.className = 'text-sm';

    const summaryEl = document.createElement('summary');
    summaryEl.className = 'cursor-pointer text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium';
    summaryEl.textContent = `View ${report.conflicts.length} field conflict${report.conflicts.length > 1 ? 's' : ''}`;
    details.appendChild(summaryEl);

    const list = document.createElement('ul');
    list.className = 'mt-2 space-y-1 pl-4';

    for (const conflict of report.conflicts.slice(0, 10)) {
      const item = document.createElement('li');
      item.className = 'text-amber-700 dark:text-amber-300';
      item.innerHTML = `<span class="font-mono text-xs">${conflict.blockType}[${conflict.blockIndex}].${conflict.field}</span>: <span class="text-green-600 dark:text-green-400">embedded</span> vs <span class="text-red-600 dark:text-red-400">legacy</span>`;
      list.appendChild(item);
    }

    if (report.conflicts.length > 10) {
      const more = document.createElement('li');
      more.className = 'text-amber-600 dark:text-amber-400 italic';
      more.textContent = `...and ${report.conflicts.length - 10} more`;
      list.appendChild(more);
    }

    details.appendChild(list);
    container.appendChild(details);
  }

  // Actions
  const actions = document.createElement('div');
  actions.className = 'mt-3 flex gap-2';

  const dismissBtn = document.createElement('button');
  dismissBtn.type = 'button';
  dismissBtn.className = 'text-xs px-3 py-1 rounded border border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-600 dark:text-amber-300 dark:hover:bg-amber-900/40';
  dismissBtn.textContent = 'Dismiss';
  dismissBtn.addEventListener('click', () => container.remove());

  actions.appendChild(dismissBtn);
  container.appendChild(actions);

  return container;
}

/**
 * Show conflict report in the block editor
 */
function showConflictReport(root: HTMLElement, report: ConflictReport): void {
  // Remove any existing report
  root.querySelector('[data-block-conflict-report]')?.remove();

  if (!report.hasConflicts) return;

  const reportUI = createConflictReportUI(report);
  const list = root.querySelector('[data-block-list]');
  if (list) {
    list.parentElement?.insertBefore(reportUI, list);
  } else {
    root.insertBefore(reportUI, root.firstChild);
  }
}

function ensureTypeField(item: HTMLElement, type: string): void {
  const inputs = item.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name="_type"], [data-block-type-input]');
  if (inputs.length === 0) {
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = '_type';
    hidden.value = type;
    hidden.setAttribute('data-block-type-input', 'true');
    hidden.setAttribute('data-block-ignore', 'true');
    item.appendChild(hidden);
    return;
  }
  inputs.forEach((input) => {
    input.setAttribute('data-block-type-input', 'true');
    input.setAttribute('data-block-ignore', 'true');
    if (input instanceof HTMLInputElement) {
      input.value = type;
      input.readOnly = true;
    } else if (input instanceof HTMLSelectElement) {
      Array.from(input.options).forEach((opt) => {
        opt.selected = opt.value === type;
      });
      input.disabled = true;
    } else {
      input.value = type;
      input.readOnly = true;
    }
    const wrapper = input.closest<HTMLElement>('[data-component]');
    if (wrapper) {
      wrapper.classList.add('hidden');
    }
  });
}

/**
 * Ensure _schema field exists on the block item
 */
function ensureSchemaField(item: HTMLElement, schemaVersion: string): void {
  const inputs = item.querySelectorAll<HTMLInputElement>('[name="_schema"], [data-block-schema-input]');
  if (inputs.length === 0) {
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.name = '_schema';
    hidden.value = schemaVersion;
    hidden.setAttribute('data-block-schema-input', 'true');
    hidden.setAttribute('data-block-ignore', 'true');
    item.appendChild(hidden);
    return;
  }
  inputs.forEach((input) => {
    input.setAttribute('data-block-schema-input', 'true');
    input.setAttribute('data-block-ignore', 'true');
    input.value = schemaVersion;
    input.readOnly = true;
    const wrapper = input.closest<HTMLElement>('[data-component]');
    if (wrapper) {
      wrapper.classList.add('hidden');
    }
  });
}

function initBlockEditor(root: HTMLElement): void {
  const elements = resolveElements(root);
  if (!elements) return;
  const config = resolveConfig(root);
  const templates = collectTemplates(root, config);
  const baseName = root.dataset.blockField || elements.output.name;
  const sortableHint = parseBoolean(root.dataset.blockSortable);
  const sortable = config.sortable ?? sortableHint ?? false;
  const allowDrag = config.allowDrag ?? sortable;
  const addLabel = config.addLabel || elements.addButton?.dataset.blockAddLabel || 'Add block';
  const emptyLabel = config.emptyLabel || elements.emptyState?.dataset.blockEmptyLabel || 'No blocks added yet.';
  const validateOnInput = config.validateOnInput ?? true;

  if (elements.addButton) {
    elements.addButton.textContent = addLabel;
  }
  if (elements.emptyState) {
    elements.emptyState.textContent = emptyLabel;
  }

  const list = elements.list;
  const output = elements.output;

  const syncOutput = () => {
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-block-item]'));
    let hasValidationErrors = false;

    const payload = items.map((item) => {
      const data: Record<string, any> = {};
      const groups = new Map<string, Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>>();
      item.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((field) => {
        if (field.dataset.blockIgnore === 'true' || field.hasAttribute('data-block-ignore')) return;
        const key = field.getAttribute('data-block-field-name') || field.name || '';
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(field);
      });
      groups.forEach((group, key) => {
        const value = readFieldValue(group);
        if (value !== undefined) {
          setByPath(data, key, value);
        }
      });
      const blockType = item.dataset.blockType || data._type || '';
      if (blockType) data._type = blockType;

      // Add _schema version from template or item
      const schemaVersion = item.dataset.blockSchema || data._schema;
      if (schemaVersion) {
        data._schema = schemaVersion;
      } else {
        const template = templates.get(blockType);
        if (template?.schemaVersion) {
          data._schema = template.schemaVersion;
        }
      }

      // Validate block if enabled
      if (validateOnInput) {
        const template = templates.get(blockType);
        if (template) {
          const errors = validateBlock(item, template);
          showBlockErrors(item, errors);
          if (errors.length > 0) {
            hasValidationErrors = true;
          }
        }
      }

      return data;
    });
    output.value = JSON.stringify(payload);

    // Update root element validation state
    root.dataset.blockEditorValid = hasValidationErrors ? 'false' : 'true';
  };

  const updateNames = () => {
    const items = Array.from(list.querySelectorAll<HTMLElement>('[data-block-item]'));
    items.forEach((item, index) => {
      item.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((field) => {
        if (field.dataset.blockIgnore === 'true' || field.hasAttribute('data-block-ignore')) return;
        const original = field.getAttribute('data-block-field-name') || field.name;
        if (!original) return;
        if (!field.hasAttribute('data-block-field-name')) {
          field.setAttribute('data-block-field-name', original);
        }
        field.name = buildInputName(baseName, index, original);
      });
    });
  };

  const updateEmptyState = () => {
    if (!elements.emptyState) return;
    const hasItems = list.querySelector('[data-block-item]');
    elements.emptyState.classList.toggle('hidden', Boolean(hasItems));
  };

  const syncAll = () => {
    updateNames();
    syncOutput();
    updateEmptyState();
  };

  const form = root.closest('form');
  if (form) {
    form.addEventListener('submit', () => {
      syncOutput();
    });
  }

  const fillValues = (item: HTMLElement, values: Record<string, any>) => {
    item.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((field) => {
      const key = field.getAttribute('data-block-field-name') || field.name;
      if (!key) return;
      const value = getByPath(values, key);
      if (value !== undefined) {
        setFieldValue(field, value);
      }
    });
  };

  const createBlockItem = (template: BlockTemplate, values?: Record<string, any>) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'border border-gray-200 rounded-lg bg-white shadow-sm dark:bg-slate-900 dark:border-gray-700';
    wrapper.setAttribute('data-block-item', 'true');
    wrapper.dataset.blockType = template.type;
    if (sortable) {
      wrapper.setAttribute('draggable', 'true');
    }

    const header = document.createElement('div');
    header.className = 'flex flex-wrap items-center justify-between gap-2 p-3 border-b border-gray-200 dark:border-gray-700';
    header.setAttribute('data-block-header', 'true');

    const titleWrap = document.createElement('div');
    titleWrap.className = 'flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white';

    const icon = document.createElement('span');
    icon.className = 'inline-flex items-center justify-center h-6 min-w-[1.5rem] px-2 text-xs font-semibold uppercase rounded-full bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200';
    icon.textContent = template.icon || template.label.slice(0, 1).toUpperCase();

    const label = document.createElement('span');
    label.textContent = template.label;

    const typeBadge = document.createElement('span');
    typeBadge.className = 'text-xs text-gray-500 dark:text-gray-400';
    typeBadge.textContent = template.type;

    titleWrap.appendChild(icon);
    titleWrap.appendChild(label);
    titleWrap.appendChild(typeBadge);

    const actions = document.createElement('div');
    actions.className = 'flex items-center gap-2';

    if (sortable) {
      const moveUp = document.createElement('button');
      moveUp.type = 'button';
      moveUp.className = 'text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';
      moveUp.textContent = 'Up';
      moveUp.setAttribute('data-block-move-up', 'true');

      const moveDown = document.createElement('button');
      moveDown.type = 'button';
      moveDown.className = 'text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';
      moveDown.textContent = 'Down';
      moveDown.setAttribute('data-block-move-down', 'true');

      actions.appendChild(moveUp);
      actions.appendChild(moveDown);
    }

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'text-xs text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white';
    collapseBtn.textContent = 'Collapse';
    collapseBtn.setAttribute('data-block-collapse', 'true');

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'text-xs text-red-600 hover:text-red-700';
    removeBtn.textContent = 'Remove';
    removeBtn.setAttribute('data-block-remove', 'true');

    actions.appendChild(collapseBtn);
    actions.appendChild(removeBtn);

    if (sortable) {
      const dragHandle = document.createElement('span');
      dragHandle.className = 'text-xs text-gray-400 cursor-move';
      dragHandle.textContent = 'Drag';
      dragHandle.setAttribute('data-block-drag-handle', 'true');
      actions.appendChild(dragHandle);
    }

    header.appendChild(titleWrap);
    header.appendChild(actions);

    const body = document.createElement('div');
    body.className = 'p-4 space-y-4';
    body.setAttribute('data-block-body', 'true');

    const fragment = template.template.content.cloneNode(true) as DocumentFragment;
    body.appendChild(fragment);

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    ensureTypeField(wrapper, template.type);
    ensureSchemaField(wrapper, template.schemaVersion || generateSchemaVersion(template.type));
    wrapper.dataset.blockSchema = template.schemaVersion || generateSchemaVersion(template.type);

    if (values) {
      fillValues(wrapper, values);
    }

    const shouldCollapse = template.collapsed ?? false;
    if (shouldCollapse) {
      body.classList.add('hidden');
      wrapper.dataset.blockCollapsed = 'true';
      collapseBtn.textContent = 'Expand';
    }

    return wrapper;
  };

  const addBlock = (type: string, values?: Record<string, any>) => {
    const template = templates.get(type);
    if (!template) return;
    const item = createBlockItem(template, values);
    list.appendChild(item);
    syncAll();
  };

  const addButton = elements.addButton;
  const addSelect = elements.addSelect;
  if (addButton && addSelect) {
    addButton.addEventListener('click', () => {
      const type = addSelect.value.trim();
      if (type) {
        addBlock(type);
        addSelect.value = '';
      }
    });
  }

  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest<HTMLElement>('[data-block-item]');
    if (!item) return;
    if (target.closest('[data-block-remove]')) {
      item.remove();
      syncAll();
      return;
    }
    if (target.closest('[data-block-collapse]')) {
      const body = item.querySelector<HTMLElement>('[data-block-body]');
      if (body) {
        const isCollapsed = body.classList.toggle('hidden');
        item.dataset.blockCollapsed = isCollapsed ? 'true' : 'false';
        const button = target.closest<HTMLButtonElement>('[data-block-collapse]');
        if (button) button.textContent = isCollapsed ? 'Expand' : 'Collapse';
      }
      return;
    }
    if (target.closest('[data-block-move-up]')) {
      const prev = item.previousElementSibling;
      if (prev) list.insertBefore(item, prev);
      syncAll();
      return;
    }
    if (target.closest('[data-block-move-down]')) {
      const next = item.nextElementSibling;
      if (next) list.insertBefore(next, item);
      syncAll();
      return;
    }
  });

  root.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest('[data-block-item]')) return;
    syncAll();
  });
  root.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.closest('[data-block-item]')) return;
    syncAll();
  });

  if (sortable && allowDrag) {
    let dragging: HTMLElement | null = null;
    list.addEventListener('dragstart', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const handle = target.closest('[data-block-drag-handle]');
      if (!handle) {
        event.preventDefault();
        return;
      }
      const item = target.closest<HTMLElement>('[data-block-item]');
      if (!item) return;
      dragging = item;
      item.classList.add('opacity-70');
      event.dataTransfer?.setData('text/plain', 'block');
    });
    list.addEventListener('dragover', (event) => {
      if (!dragging) return;
      event.preventDefault();
      const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[data-block-item]') : null;
      if (!target || target === dragging) return;
      const rect = target.getBoundingClientRect();
      const shouldInsertAfter = event.clientY > rect.top + rect.height / 2;
      list.insertBefore(dragging, shouldInsertAfter ? target.nextSibling : target);
    });
    list.addEventListener('dragend', () => {
      if (!dragging) return;
      dragging.classList.remove('opacity-70');
      dragging = null;
      syncAll();
    });
  }

  if (elements.addSelect) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select block type';
    elements.addSelect.appendChild(placeholder);
    templates.forEach((template) => {
      const option = document.createElement('option');
      option.value = template.type;
      option.textContent = template.label;
      elements.addSelect?.appendChild(option);
    });
    elements.addSelect.value = '';
  }

  // Keyboard accessibility
  root.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const item = target.closest<HTMLElement>('[data-block-item]');
    if (!item) return;

    const isHeader = target.closest('[data-block-header]');
    if (!isHeader) return;

    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        if (event.shiftKey) {
          event.preventDefault();
          item.remove();
          syncAll();
          // Focus next or previous item
          const next = list.querySelector<HTMLElement>('[data-block-item] [data-block-header]');
          next?.focus();
        }
        break;
      case 'ArrowUp':
        if (event.altKey && sortable) {
          event.preventDefault();
          const prev = item.previousElementSibling;
          if (prev) {
            list.insertBefore(item, prev);
            syncAll();
            (item.querySelector('[data-block-header]') as HTMLElement)?.focus();
          }
        } else if (!event.altKey) {
          event.preventDefault();
          const prevItem = item.previousElementSibling as HTMLElement;
          const prevHeader = prevItem?.querySelector<HTMLElement>('[data-block-header]');
          prevHeader?.focus();
        }
        break;
      case 'ArrowDown':
        if (event.altKey && sortable) {
          event.preventDefault();
          const next = item.nextElementSibling;
          if (next) {
            list.insertBefore(next, item);
            syncAll();
            (item.querySelector('[data-block-header]') as HTMLElement)?.focus();
          }
        } else if (!event.altKey) {
          event.preventDefault();
          const nextItem = item.nextElementSibling as HTMLElement;
          const nextHeader = nextItem?.querySelector<HTMLElement>('[data-block-header]');
          nextHeader?.focus();
        }
        break;
      case 'Enter':
      case ' ':
        if (target.matches('[data-block-collapse]')) {
          event.preventDefault();
          target.click();
        } else if (target.matches('[data-block-remove]')) {
          event.preventDefault();
          target.click();
        } else if (target.matches('[data-block-move-up]')) {
          event.preventDefault();
          target.click();
        } else if (target.matches('[data-block-move-down]')) {
          event.preventDefault();
          target.click();
        } else if (isHeader && !target.matches('button')) {
          // Toggle collapse when pressing Enter on header
          event.preventDefault();
          const collapseBtn = item.querySelector<HTMLButtonElement>('[data-block-collapse]');
          collapseBtn?.click();
        }
        break;
      case 'Escape':
        // Collapse the block
        const body = item.querySelector<HTMLElement>('[data-block-body]');
        if (body && !body.classList.contains('hidden')) {
          event.preventDefault();
          body.classList.add('hidden');
          item.dataset.blockCollapsed = 'true';
          const collapseBtn = item.querySelector<HTMLButtonElement>('[data-block-collapse]');
          if (collapseBtn) collapseBtn.textContent = 'Expand';
        }
        break;
    }
  });

  // Make block headers focusable for keyboard navigation
  const makeHeadersFocusable = () => {
    list.querySelectorAll<HTMLElement>('[data-block-header]').forEach((header) => {
      if (!header.hasAttribute('tabindex')) {
        header.setAttribute('tabindex', '0');
        header.setAttribute('role', 'button');
        header.setAttribute('aria-label', 'Block header - Press Enter to collapse/expand, Shift+Delete to remove');
      }
    });
  };

  // Observe for new blocks to make their headers focusable
  const observer = new MutationObserver(() => {
    makeHeadersFocusable();
  });
  observer.observe(list, { childList: true, subtree: true });

  const initialValue = output.value?.trim();
  let embeddedBlocks: any[] = [];
  if (initialValue) {
    try {
      const parsed = JSON.parse(initialValue) as any;
      if (Array.isArray(parsed)) {
        embeddedBlocks = parsed;
        parsed.forEach((entry) => {
          const type = typeof entry === 'object' && entry ? (entry._type as string) : '';
          if (type && templates.has(type)) {
            addBlock(type, entry);
          }
        });
      }
    } catch {
      // ignore malformed data
    }
  }

  // Conflict detection
  const showConflicts = config.showConflicts ?? true;
  if (showConflicts && config.legacyBlocks && Array.isArray(config.legacyBlocks)) {
    const report = detectBlockConflicts(embeddedBlocks, config.legacyBlocks);
    if (report.hasConflicts) {
      showConflictReport(root, report);
    }
  }

  // Also check for legacy blocks from data attribute
  const legacyBlocksAttr = root.dataset.blockLegacy;
  if (showConflicts && legacyBlocksAttr) {
    try {
      const legacyBlocks = JSON.parse(legacyBlocksAttr);
      if (Array.isArray(legacyBlocks)) {
        const report = detectBlockConflicts(embeddedBlocks, legacyBlocks);
        if (report.hasConflicts) {
          showConflictReport(root, report);
        }
      }
    } catch {
      // ignore malformed legacy data
    }
  }

  syncAll();
}

export function initBlockEditors(scope: ParentNode = document): void {
  const roots = Array.from(scope.querySelectorAll<HTMLElement>('[data-component="block"], [data-block-editor]'));
  roots.forEach((root) => initBlockEditor(root));
}

function onReady(fn: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

onReady(() => initBlockEditors());
