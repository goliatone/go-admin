const ISO_FRACTIONAL_SECONDS_PATTERN =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.(\d+)(Z|[+-]\d{2}:\d{2})$/;

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function normalizeFractionalSeconds(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(ISO_FRACTIONAL_SECONDS_PATTERN);
  if (!match) {
    return trimmed;
  }

  const [, base, fraction, timezone] = match;
  if (fraction.length <= 3) {
    return trimmed;
  }

  return `${base}.${fraction.slice(0, 3)}${timezone}`;
}

export function parseDateLike(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? new Date(value.getTime()) : null;
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = new Date(trimmed);
  if (isValidDate(direct)) {
    return direct;
  }

  const normalized = normalizeFractionalSeconds(trimmed);
  if (normalized === trimmed) {
    return null;
  }

  const fallback = new Date(normalized);
  return isValidDate(fallback) ? fallback : null;
}
