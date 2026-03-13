export function cloneValue<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return cloneFallback(value);
}

function cloneFallback<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneFallback(item)) as T;
  }

  if (value instanceof Date) {
    return new Date(value.getTime()) as T;
  }

  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = cloneFallback(entry);
    }
    return out as T;
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
