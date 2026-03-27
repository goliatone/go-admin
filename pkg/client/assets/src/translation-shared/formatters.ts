import { asString } from '../shared/coercion.js';

export function formatTranslationTimestampUTC(value: unknown): string {
  const normalized = asString(value);
  if (!normalized) return '';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return parsed.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
}

export function formatTranslationShortDateTime(value: unknown, emptyLabel = ''): string {
  const normalized = asString(value);
  if (!normalized) return emptyLabel;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return normalized;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(parsed);
}

export function sentenceCaseToken(value: unknown): string {
  const normalized = asString(value).replace(/_/g, ' ');
  if (!normalized) return '';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
