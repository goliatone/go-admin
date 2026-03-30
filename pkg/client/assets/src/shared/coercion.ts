export function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function coerceString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value == null) {
    return fallback;
  }
  return String(value).trim();
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function asBoolean(value: unknown): boolean {
  return value === true;
}

export function asLooseBoolean(value: unknown): boolean {
  if (value === true || value === 1) {
    return true;
  }
  const normalized = asString(value).toLowerCase();
  return normalized === 'true' || normalized === '1';
}

export function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function coerceInteger(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function asNumberish(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

export function asOptionalString(value: unknown): string | undefined {
  const normalized = asString(value);
  return normalized || undefined;
}

export function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => asString(entry)).filter(Boolean);
}

export function coerceStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) => coerceString(entry)).filter(Boolean);
}

export function asUniqueStringArray(value: unknown): string[] {
  const out: string[] = [];
  for (const entry of asStringArray(value)) {
    if (!out.includes(entry)) {
      out.push(entry);
    }
  }
  return out;
}
