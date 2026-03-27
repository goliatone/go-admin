import { asNumber, asRecord, asString } from './coercion.js';

interface NormalizeRecordOptions {
  trimKeys?: boolean;
  omitBlankKeys?: boolean;
}

export interface NormalizeStringRecordOptions extends NormalizeRecordOptions {
  omitEmptyValues?: boolean;
}

export interface NormalizeNumberRecordOptions extends NormalizeRecordOptions {
  fallback?: number;
}

export function normalizeStringRecord(
  value: unknown,
  options: NormalizeStringRecordOptions = {}
): Record<string, string> {
  const { trimKeys = false, omitBlankKeys = false, omitEmptyValues = false } = options;
  const out: Record<string, string> = {};

  for (const [rawKey, candidate] of Object.entries(asRecord(value))) {
    if (omitBlankKeys && rawKey.trim() === '') {
      continue;
    }

    const key = trimKeys ? rawKey.trim() : rawKey;
    const normalized = asString(candidate);
    if (omitEmptyValues && normalized === '') {
      continue;
    }

    out[key] = normalized;
  }

  return out;
}

export function normalizeNumberRecord(
  value: unknown,
  options: NormalizeNumberRecordOptions = {}
): Record<string, number> {
  const { trimKeys = false, omitBlankKeys = false, fallback = 0 } = options;
  const out: Record<string, number> = {};

  for (const [rawKey, candidate] of Object.entries(asRecord(value))) {
    if (omitBlankKeys && rawKey.trim() === '') {
      continue;
    }

    const key = trimKeys ? rawKey.trim() : rawKey;
    out[key] = asNumber(candidate, fallback);
  }

  return out;
}
