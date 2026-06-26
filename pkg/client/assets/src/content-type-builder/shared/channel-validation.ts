export const DEFAULT_CONTENT_MODELING_CHANNEL = 'default';

export const CHANNEL_HELP_TEXT = 'Use letters, numbers, underscores, or dashes. Spaces become dashes.';

export interface ChannelValidationResult {
  ok: boolean;
  value: string;
  error?: string;
}

/**
 * Normalize a user-entered channel name to the persisted form: lowercase,
 * non `[a-z0-9_-]` runs collapsed to `-`, and leading/trailing dashes trimmed.
 */
export function normalizeChannelName(value: string | null | undefined): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeKnownChannel(
  value: string | null | undefined,
  fallback = DEFAULT_CONTENT_MODELING_CHANNEL,
): string {
  const normalized = normalizeChannelName(value);
  return normalized || fallback;
}

export function validateChannelName(value: string | null | undefined): ChannelValidationResult {
  const normalized = normalizeChannelName(value);
  if (!normalized) {
    return {
      ok: false,
      value: '',
      error: 'Enter a channel name with at least one letter or number.',
    };
  }
  return { ok: true, value: normalized };
}
