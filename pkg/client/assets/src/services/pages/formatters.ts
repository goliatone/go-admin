import type { ServicesAPIClient } from '../api-client.js';
import type { QueryStateManager } from '../query-state.js';
import type { Provider } from '../types.js';
import type { ToastNotifier } from '../../toast/types.js';
import { escapeHTML } from '../../shared/html.js';

export type ProviderNameResolver = ((providerId: string) => string) | undefined;

export interface LoadProvidersOptions {
  notifier?: ToastNotifier;
  signal?: AbortSignal;
  onError?: (error: Error) => void;
}

export interface PopulateProviderFilterOptionsConfig {
  container: ParentNode | null | undefined;
  providers: Provider[];
  selectedProviderId?: string;
  getProviderName?: ProviderNameResolver;
  selectSelector?: string;
  emptyLabel?: string;
}

export interface RelativeTimeOptions {
  allowFuture?: boolean;
  pastImmediateLabel?: string;
  futureImmediateLabel?: string;
}

export interface LoadAndPopulateProvidersOptions extends LoadProvidersOptions {
  container: ParentNode | null | undefined;
  selectedProviderId?: string;
  getProviderName?: ProviderNameResolver;
  selectSelector?: string;
  emptyLabel?: string;
}

export function formatProviderId(id: string): string {
  return id
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function resolveProviderDisplayName(id: string, getProviderName?: ProviderNameResolver): string {
  const customName = typeof getProviderName === 'function' ? String(getProviderName(id) || '').trim() : '';
  if (customName) {
    return customName;
  }
  return formatProviderId(id);
}

export function formatServiceLabel(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function truncateId(id: string, maxLen = 12): string {
  if (id.length <= maxLen) return id;
  return `${id.slice(0, maxLen - 3)}...`;
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString();
}

export function formatRelativeTime(dateStr: string, options: RelativeTimeOptions = {}): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;

  if (!options.allowFuture) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return options.pastImmediateLabel || 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const isFuture = diffMs > 0;
  const absDiffMs = Math.abs(diffMs);
  const diffMins = Math.floor(absDiffMs / 60000);
  const diffHours = Math.floor(absDiffMs / 3600000);
  const diffDays = Math.floor(absDiffMs / 86400000);

  if (diffMins < 1) {
    return isFuture
      ? options.futureImmediateLabel || 'Soon'
      : options.pastImmediateLabel || 'Just now';
  }
  if (diffMins < 60) return isFuture ? `in ${diffMins}m` : `${diffMins}m ago`;
  if (diffHours < 24) return isFuture ? `in ${diffHours}h` : `${diffHours}h ago`;
  if (diffDays < 7) return isFuture ? `in ${diffDays}d` : `${diffDays}d ago`;

  return date.toLocaleDateString();
}

export async function loadProviders(
  client: ServicesAPIClient,
  options: LoadProvidersOptions = {}
): Promise<Provider[]> {
  try {
    const response = await client.listProviders(options.signal);
    return response.providers || [];
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    options.onError?.(normalized);
    options.notifier?.error(`Failed to load providers: ${normalized.message}`);
    return [];
  }
}

export async function loadAndPopulateProviders(
  client: ServicesAPIClient,
  options: LoadAndPopulateProvidersOptions
): Promise<Provider[]> {
  const providers = await loadProviders(client, options);
  populateProviderFilterOptions({
    container: options.container,
    providers,
    selectedProviderId: options.selectedProviderId,
    getProviderName: options.getProviderName,
    selectSelector: options.selectSelector,
    emptyLabel: options.emptyLabel,
  });
  return providers;
}

export function populateProviderFilterOptions(config: PopulateProviderFilterOptionsConfig): void {
  const providerSelect = config.container?.querySelector<HTMLSelectElement>(
    config.selectSelector || '[data-filter="provider_id"]'
  );
  if (!providerSelect) return;

  const emptyLabel = config.emptyLabel || 'All Providers';
  const options = config.providers
    .map((provider) => {
      const displayName = resolveProviderDisplayName(provider.id, config.getProviderName);
      return `<option value="${escapeHTML(provider.id)}">${escapeHTML(displayName)}</option>`;
    })
    .join('');

  providerSelect.innerHTML = `<option value="">${escapeHTML(emptyLabel)}</option>${options}`;
  providerSelect.value = config.selectedProviderId || '';
}

export function bindNoResultsResetAction(container: Element, onReset: () => void): void {
  const resetBtn = container.querySelector('.ui-state-reset-btn');
  resetBtn?.addEventListener('click', onReset);
}

export function destroyAbortableQueryPage<F extends Record<string, string>>(
  abortController: AbortController | null,
  queryState: QueryStateManager<F>
): null {
  abortController?.abort();
  queryState.destroy();
  return null;
}
