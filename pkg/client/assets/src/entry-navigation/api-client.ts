import { asRecord } from '../shared/coercion.js';
import { httpRequest, readHTTPResponsePayload } from '../shared/transport/http-client.js';
import type { EntryNavigationPatchResult, NavigationOverrideValue } from './types.js';

export class EntryNavigationAPIError extends Error {
  readonly status: number;
  readonly textCode: string;
  readonly metadata: Record<string, unknown>;

  constructor(message: string, status = 500, textCode = '', metadata: Record<string, unknown> = {}) {
    super(message);
    this.name = 'EntryNavigationAPIError';
    this.status = status;
    this.textCode = textCode;
    this.metadata = metadata;
  }
}

function normalizePath(basePath: string, path: string, emptyFallback = basePath): string {
  if (!path) {
    return emptyFallback;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  if (path.startsWith('/')) {
    return path;
  }
  return `${basePath.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

function fillPath(pathTemplate: string, params: Record<string, string>): string {
  let resolved = pathTemplate;
  Object.entries(params).forEach(([key, value]) => {
    resolved = resolved.replace(`:${key}`, encodeURIComponent(String(value)));
  });
  return resolved;
}

export function parseNavigationOverrides(raw: unknown, allowedLocations: string[] = []): Record<string, NavigationOverrideValue> {
  const source = asRecord(raw);
  const allowed = new Set(allowedLocations.map(location => String(location || '').trim()).filter(Boolean));
  const out: Record<string, NavigationOverrideValue> = {};
  Object.entries(source).forEach(([key, value]) => {
    const location = String(key || '').trim();
    const mode = String(value || '').trim().toLowerCase();
    if (!location || !['inherit', 'show', 'hide'].includes(mode)) {
      return;
    }
    if (allowed.size > 0 && !allowed.has(location)) {
      return;
    }
    out[location] = mode as NavigationOverrideValue;
  });
  return out;
}

export interface EntryNavigationAPIClientConfig {
  basePath: string;
  endpoint?: string;
  credentials?: RequestCredentials;
  headers?: Record<string, string>;
}

export class EntryNavigationAPIClient {
  private readonly config: Required<EntryNavigationAPIClientConfig>;

  constructor(config: EntryNavigationAPIClientConfig) {
    const normalizedBase = config.basePath.replace(/\/+$/, '');
    this.config = {
      basePath: normalizedBase,
      endpoint: String(config.endpoint || '').trim(),
      credentials: config.credentials ?? 'same-origin',
      headers: config.headers ?? {},
    };
  }

  async patchEntryNavigation(
    contentType: string,
    recordID: string,
    overrides: Record<string, NavigationOverrideValue>,
    allowedLocations: string[] = []
  ): Promise<EntryNavigationPatchResult> {
    const template = this.config.endpoint || `${this.config.basePath}/content/:type/:id/navigation`;
    const endpoint = normalizePath(this.config.basePath, fillPath(template, { type: contentType, id: recordID }));
    const response = await httpRequest(endpoint, {
      method: 'PATCH',
      credentials: this.config.credentials,
      headers: {
        ...this.config.headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ _navigation: overrides }),
    });
    const parsed = await readHTTPResponsePayload(response);
    if (!response.ok) {
      const payload = asRecord(parsed.payload);
      const error = asRecord(payload.error);
      const metadata = asRecord(error.metadata ?? error.details);
      const message = String(error.message || payload.message || response.statusText || 'Entry navigation request failed');
      const textCode = String(error.text_code || error.code || payload.text_code || payload.code || '');
      throw new EntryNavigationAPIError(message, response.status, textCode, metadata);
    }
    const body = asRecord(parsed.payload);
    const data = asRecord(body.data ?? body);
    return {
      overrides: parseNavigationOverrides(data._navigation, allowedLocations),
      effective_visibility: asRecord(data.effective_navigation_visibility) as Record<string, boolean>,
    };
  }
}
