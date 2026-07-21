export type PanelActionPayloadOptions = {
  excludeSensitive?: boolean;
};

export function buildPanelActionPayload(element: HTMLElement, options: PanelActionPayloadOptions = {}): Record<string, unknown> {
  const payload = parseBasePayload(element.dataset.actionPayload);
  if (!(element instanceof HTMLFormElement)) {
    return payload;
  }
  element.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
    // Skip fields the operator can't currently use — a hidden ancestor inside
    // this form or a disabled control. The launcher's JSON↔form toggle hides the
    // inactive editor; without this both editors would contribute to the payload.
    const hiddenAncestor = field.closest('[hidden]');
    if ((hiddenAncestor && element.contains(hiddenAncestor)) || ((field instanceof HTMLInputElement || field instanceof HTMLSelectElement || field instanceof HTMLTextAreaElement) && field.disabled)) {
      return;
    }
    const path = (field.dataset.actionFieldPath || field.dataset.actionField || '').trim();
    if (!path) {
      return;
    }
    if (options.excludeSensitive && field.dataset.actionFieldSensitive === 'true') {
      deletePayloadPath(payload, path);
      return;
    }
    const value = readFieldValue(field);
    if (value === undefined) {
      return;
    }
    setPayloadPath(payload, path, value);
  });
  return payload;
}

export function panelActionHasSensitiveFields(element: HTMLElement): boolean {
  return element.querySelector('[data-action-field-sensitive="true"]') !== null;
}

export function applyPanelActionPayload(form: HTMLFormElement, payload: Record<string, unknown>): void {
  form.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
    const path = (field.dataset.actionFieldPath || field.dataset.actionField || '').trim();
    if (!path) {
      return;
    }
    const value = payloadPathValue(payload, path);
    if (value === undefined) {
      return;
    }
    if (field instanceof HTMLInputElement && field.type === 'checkbox') {
      field.checked = Boolean(value);
    } else if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
      const kind = (field.dataset.actionFieldKind || '').trim().toLowerCase();
      if (kind === 'string_list' && Array.isArray(value)) {
        field.value = value.map((item) => String(item)).join('\n');
      } else if (kind === 'json' && typeof value === 'object' && value !== null) {
        field.value = JSON.stringify(value, null, 2);
      } else {
        field.value = String(value);
      }
    }
    field.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export function applyPanelActionNavigation(root: ParentNode, panelID: string, state: Record<string, unknown>): boolean {
  const actionID = String(state.action_id || '').trim();
  if (!panelID || !actionID) {
    return false;
  }
  const picker = Array.from(root.querySelectorAll<HTMLSelectElement>('[data-panel-action-picker]'))
    .find((candidate) => candidate.dataset.panelActionPicker === panelID);
  if (!picker || !Array.from(picker.options).some((option) => option.value === actionID)) {
    return false;
  }
  picker.value = actionID;
  picker.dispatchEvent(new Event('change', { bubbles: true }));

  const payload = state.payload && typeof state.payload === 'object' && !Array.isArray(state.payload)
    ? state.payload as Record<string, unknown>
    : {};
  const form = Array.from(root.querySelectorAll<HTMLFormElement>('[data-panel-action-form]'))
    .find((candidate) => candidate.dataset.panelId === panelID && candidate.dataset.actionId === actionID);
  if (form) {
    applyPanelActionPayload(form, payload);
  }
  return true;
}

function payloadPathValue(payload: Record<string, unknown>, path: string): unknown {
  let current: unknown = payload;
  for (const part of path.split('.').map((item) => item.trim()).filter(Boolean)) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function parseBasePayload(raw: string | undefined): Record<string, unknown> {
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function readFieldValue(field: HTMLElement): unknown {
  const kind = (field.dataset.actionFieldKind || '').trim().toLowerCase();
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    return field.checked;
  }
  const raw = fieldValue(field).trim();
  if (raw === '') {
    return undefined;
  }
  if (kind === 'number') {
    const value = Number(raw);
    return Number.isFinite(value) ? value : raw;
  }
  if (kind === 'integer') {
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) ? value : raw;
  }
  if (kind === 'string_list') {
    return raw.split(/[\n,]/g).map((item) => item.trim()).filter(Boolean);
  }
  if (kind === 'json') {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

function fieldValue(field: HTMLElement): string {
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement) {
    return field.value || '';
  }
  return '';
}

function setPayloadPath(payload: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return;
  }
  let current: Record<string, unknown> = payload;
  parts.slice(0, -1).forEach((part) => {
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  });
  current[parts[parts.length - 1]] = value;
}

function deletePayloadPath(payload: Record<string, unknown>, path: string): void {
  const parts = path.split('.').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return;
  }
  const parents: Array<{ value: Record<string, unknown>; key: string }> = [];
  let current: Record<string, unknown> = payload;
  for (const part of parts.slice(0, -1)) {
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      return;
    }
    parents.push({ value: current, key: part });
    current = next as Record<string, unknown>;
  }
  delete current[parts[parts.length - 1]];
  for (let index = parents.length - 1; index >= 0; index -= 1) {
    const parent = parents[index];
    const child = parent.value[parent.key];
    if (child && typeof child === 'object' && !Array.isArray(child) && Object.keys(child as Record<string, unknown>).length === 0) {
      delete parent.value[parent.key];
    } else {
      break;
    }
  }
}
