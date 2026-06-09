export function buildPanelActionPayload(element: HTMLElement): Record<string, unknown> {
  const payload = parseBasePayload(element.dataset.actionPayload);
  if (!(element instanceof HTMLFormElement)) {
    return payload;
  }
  element.querySelectorAll<HTMLElement>('[data-action-field]').forEach((field) => {
    const path = (field.dataset.actionFieldPath || field.dataset.actionField || '').trim();
    if (!path) {
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
