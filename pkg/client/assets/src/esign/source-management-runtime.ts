import type {
  SourceArtifactPage,
  SourceCommentPage,
  SourceCommentThreadSummary,
  SourceWorkspace,
  SourceManagementLinks,
  SourceListItem,
  SourceListPage,
  SourceRevisionDetail,
  Phase13SourceSearchQuery,
  Phase13SourceSearchResultSummary,
  Phase13SourceSearchResults,
} from './lineage-contracts.js';
import { SEARCH_RESULT_KIND } from './lineage-contracts.js';

import type { SourceManagementPageState } from './source-management-composition.js';

import {
  SourceArtifactInspectorPageController,
  SourceBrowserPageController,
  SourceCommentInspectorPageController,
  SourceWorkspacePageController,
  SourceRevisionInspectorPageController,
  SourceSearchPageController,
  bootstrapSourceArtifactInspectorPage,
  bootstrapSourceBrowserPage,
  bootstrapSourceCommentInspectorPage,
  bootstrapSourceWorkspacePage,
  bootstrapSourceRevisionInspectorPage,
  bootstrapSourceSearchPage,
  registerPageController,
} from './source-management-pages.js';

import { onReady } from './utils/dom-helpers.js';

type SourceManagementRuntimePage =
  | 'admin.sources.browser'
  | 'admin.sources.detail'
  | 'admin.sources.workspace'
  | 'admin.sources.revision_inspector'
  | 'admin.sources.comment_inspector'
  | 'admin.sources.artifact_inspector'
  | 'admin.sources.search';

interface SourceManagementRuntimeLink {
  label?: string;
  href?: string;
  kind?: string;
}

interface SourceManagementRuntimeScope {
  TenantID?: string;
  OrgID?: string;
  tenant_id?: string;
  org_id?: string;
}

interface SourceManagementRuntimePageModel {
  surface?: string;
  title?: string;
  summary?: string;
  resource_id?: string;
  scope?: SourceManagementRuntimeScope;
  nav_links?: SourceManagementRuntimeLink[];
  quick_action_links?: SourceManagementRuntimeLink[];
  result_links?: SourceManagementRuntimeLink[];
  contract?: unknown;
}

interface SourceManagementRuntimePageConfig {
  page?: string;
  base_path?: string;
  api_base_path?: string;
  routes?: Record<string, string>;
  context?: Record<string, unknown>;
}

type SourceManagementRuntimeLiveController =
  | SourceBrowserPageController
  | SourceWorkspacePageController
  | SourceRevisionInspectorPageController
  | SourceCommentInspectorPageController
  | SourceArtifactInspectorPageController
  | SourceSearchPageController;

function parseJSONScript<T>(id: string): T | null {
  const element = document.getElementById(id);
  const payload = element?.textContent?.trim();
  if (!payload) {
    return null;
  }
  try {
    return JSON.parse(payload) as T;
  } catch (error) {
    console.warn(`[SourceManagementRuntime] Failed to parse ${id}:`, error);
    return null;
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value: string | undefined): string {
  const input = String(value ?? '').trim();
  if (!input) {
    return '-';
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return escapeHtml(input);
  }
  return escapeHtml(parsed.toLocaleString());
}

function formatRelativeTime(value: string | undefined): string {
  const input = String(value ?? '').trim();
  if (!input) {
    return '';
  }
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const now = Date.now();
  const diff = now - parsed.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return parsed.toLocaleDateString();
}

function badgeClass(value: string): string {
  switch (value) {
    case 'active':
    case 'ready':
    case 'synced':
    case 'high':
    case 'confirmed':
      return 'bg-green-100 text-green-800';
    case 'pending':
    case 'pending_review':
    case 'stale':
    case 'medium':
    case 'processing':
      return 'bg-amber-100 text-amber-800';
    case 'failed':
    case 'archived':
    case 'rejected':
    case 'low':
    case 'error':
      return 'bg-red-100 text-red-800';
    case 'google_docs':
    case 'google_drive':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function statusBadge(value: string | undefined, fallback = '-'): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return `<span class="text-gray-400">${escapeHtml(fallback)}</span>`;
  }
  return `<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${badgeClass(normalized)}">${escapeHtml(normalized.replace(/_/g, ' '))}</span>`;
}

function routeWithID(route: string | undefined, id: string | undefined): string {
  const target = String(route ?? '').trim();
  const resourceID = String(id ?? '').trim();
  if (!target || !resourceID) {
    return target;
  }
  return target
    .replace(/:source_document_id/g, encodeURIComponent(resourceID))
    .replace(/:source_revision_id/g, encodeURIComponent(resourceID))
    .replace(new RegExp(encodeURIComponent(':source_document_id'), 'g'), encodeURIComponent(resourceID))
    .replace(new RegExp(encodeURIComponent(':source_revision_id'), 'g'), encodeURIComponent(resourceID));
}

function mergeQueryString(target: string, queryString: string): string {
  const normalizedTarget = String(target ?? '').trim();
  const normalizedQuery = String(queryString ?? '').trim().replace(/^\?+/, '');
  if (!normalizedTarget || !normalizedQuery) {
    return normalizedTarget;
  }
  try {
    const url = new URL(normalizedTarget, 'https://runtime.invalid');
    const extra = new URLSearchParams(normalizedQuery);
    extra.forEach((value, key) => {
      if (!url.searchParams.has(key)) {
        url.searchParams.append(key, value);
      }
    });
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return normalizedTarget.includes('?')
      ? `${normalizedTarget}&${normalizedQuery}`
      : `${normalizedTarget}?${normalizedQuery}`;
  }
}

function currentRuntimeQueryString(): string {
  if (typeof window === 'undefined' || typeof window.location?.search !== 'string') {
    return '';
  }
  return window.location.search.replace(/^\?+/, '').trim();
}

function pathnameOfHref(href: string): string {
  const normalizedHref = String(href ?? '').trim();
  if (!normalizedHref) {
    return '';
  }
  try {
    return new URL(normalizedHref, 'https://runtime.invalid').pathname;
  } catch {
    return normalizedHref.split('?')[0] ?? '';
  }
}

function runtimeRoutePathnames(
  routes: Pick<SourceManagementRuntimePageConfig, 'routes'>['routes']
): string[] {
  if (!routes) {
    return [];
  }
  return [
    routes.source_browser,
    routes.source_search,
    routes.source_detail,
    routes.source_workspace,
    routes.source_revision,
    routes.source_comment_inspector,
    routes.source_artifact_inspector,
  ]
    .map((route) => pathnameOfHref(String(route ?? '')))
    .filter((route) => route.length > 0);
}

function matchesRuntimeRoute(pathname: string, routePattern: string): boolean {
  const targetSegments = pathnameOfHref(pathname).split('/').filter(Boolean);
  const routeSegments = pathnameOfHref(routePattern).split('/').filter(Boolean);
  if (targetSegments.length !== routeSegments.length) {
    return false;
  }
  return routeSegments.every((segment, index) => segment.startsWith(':') || segment === targetSegments[index]);
}

export function isRegisteredRuntimeHref(
  href: string | undefined,
  routes: Pick<SourceManagementRuntimePageConfig, 'routes'>['routes']
): boolean {
  const pathname = pathnameOfHref(String(href ?? ''));
  if (!pathname) {
    return false;
  }
  return runtimeRoutePathnames(routes).some((routePattern) =>
    matchesRuntimeRoute(pathname, routePattern)
  );
}

function withTargetQuery(route: string, sourceHref: string, queryString: string): string {
  const normalizedRoute = String(route ?? '').trim();
  if (!normalizedRoute) {
    return '';
  }
  try {
    const routeURL = new URL(normalizedRoute, 'https://runtime.invalid');
    const sourceURL = new URL(sourceHref, 'https://runtime.invalid');
    sourceURL.searchParams.forEach((value, key) => {
      if (!routeURL.searchParams.has(key)) {
        routeURL.searchParams.append(key, value);
      }
    });
    return mergeQueryString(`${routeURL.pathname}${routeURL.search}${routeURL.hash}`, queryString);
  } catch {
    return mergeQueryString(normalizedRoute, queryString);
  }
}

function apiRelativePath(
  href: string,
  config: Pick<SourceManagementRuntimePageConfig, 'api_base_path'>
): string {
  const normalizedHref = String(href ?? '').trim();
  const apiBasePath = String(config.api_base_path ?? '').trim().replace(/\/+$/, '');
  if (!normalizedHref || !apiBasePath) {
    return '';
  }
  const pathname = pathnameOfHref(normalizedHref);
  return pathname.startsWith(apiBasePath) ? pathname.slice(apiBasePath.length) : '';
}

/**
 * Translate backend-authored source-management API links into runtime UI routes
 * while preserving the active runtime query context.
 */
export function translateSourceManagementHrefToRuntime(
  href: string | undefined,
  config: Pick<SourceManagementRuntimePageConfig, 'base_path' | 'api_base_path' | 'routes'>,
  queryString = currentRuntimeQueryString()
): string {
  const normalizedHref = String(href ?? '').trim();
  if (!normalizedHref) {
    return '';
  }
  const relativePath = apiRelativePath(normalizedHref, config);
  if (!relativePath) {
    return isRegisteredRuntimeHref(normalizedHref, config.routes)
      ? mergeQueryString(normalizedHref, queryString)
      : normalizedHref.startsWith('/')
        ? ''
        : normalizedHref;
  }

  const workspaceMatch = relativePath.match(/^\/sources\/([^/]+)\/workspace$/);
  const detailMatch = relativePath.match(/^\/sources\/([^/]+)$/);
  const revisionMatch = relativePath.match(/^\/source-revisions\/([^/]+)$/);
  const commentMatch = relativePath.match(/^\/source-revisions\/([^/]+)\/comments$/);
  const artifactMatch = relativePath.match(/^\/source-revisions\/([^/]+)\/artifacts$/);

  if (relativePath === '/sources') {
    return mergeQueryString(String(config.routes?.source_browser ?? ''), queryString);
  }
  if (relativePath === '/source-search') {
    return mergeQueryString(String(config.routes?.source_search ?? ''), queryString);
  }
  if (workspaceMatch) {
    const sourceID = decodeURIComponent(workspaceMatch[1] ?? '');
    const targetRoute = String(
      config.routes?.source_workspace ?? config.routes?.source_detail ?? ''
    );
    const translated = routeWithID(targetRoute, sourceID);
    return isRegisteredRuntimeHref(translated, config.routes)
      ? withTargetQuery(translated, normalizedHref, queryString)
      : '';
  }
  if (detailMatch) {
    const translated = routeWithID(config.routes?.source_detail, decodeURIComponent(detailMatch[1] ?? ''));
    return isRegisteredRuntimeHref(translated, config.routes)
      ? withTargetQuery(translated, normalizedHref, queryString)
      : '';
  }
  if (commentMatch) {
    const translated = routeWithID(
      config.routes?.source_comment_inspector,
      decodeURIComponent(commentMatch[1] ?? '')
    );
    return isRegisteredRuntimeHref(translated, config.routes)
      ? withTargetQuery(translated, normalizedHref, queryString)
      : '';
  }
  if (artifactMatch) {
    const translated = routeWithID(
      config.routes?.source_artifact_inspector,
      decodeURIComponent(artifactMatch[1] ?? '')
    );
    return isRegisteredRuntimeHref(translated, config.routes)
      ? withTargetQuery(translated, normalizedHref, queryString)
      : '';
  }
  if (revisionMatch) {
    const translated = routeWithID(
      config.routes?.source_revision,
      decodeURIComponent(revisionMatch[1] ?? '')
    );
    return isRegisteredRuntimeHref(translated, config.routes)
      ? withTargetQuery(translated, normalizedHref, queryString)
      : '';
  }

  return '';
}

function firstRuntimeLink(
  links: SourceManagementLinks | undefined,
  config: SourceManagementRuntimePageConfig,
  ...keys: Array<keyof SourceManagementLinks>
): string {
  for (const key of keys) {
    const href = translateSourceManagementHrefToRuntime(links?.[key], config);
    if (href) {
      return href;
    }
  }
  return '';
}

export const SOURCE_SEARCH_RESULT_KIND_OPTIONS = [
  SEARCH_RESULT_KIND.SOURCE_DOCUMENT,
  SEARCH_RESULT_KIND.SOURCE_REVISION,
] as const;

export function resolveBrowserItemRuntimeHref(
  item: SourceListItem,
  config: Pick<SourceManagementRuntimePageConfig, 'base_path' | 'api_base_path' | 'routes'>
): string {
  const contractHref = firstRuntimeLink(item.links, config as SourceManagementRuntimePageConfig, 'workspace', 'anchor', 'source', 'self');
  if (contractHref) {
    return contractHref;
  }
  const fallback = routeWithID(config.routes?.source_workspace ?? config.routes?.source_detail, item.source?.id ?? '');
  return isRegisteredRuntimeHref(fallback, config.routes) ? fallback : '';
}

export function resolveSearchResultRuntimeHref(
  item: Phase13SourceSearchResultSummary,
  config: Pick<SourceManagementRuntimePageConfig, 'base_path' | 'api_base_path' | 'routes'>
): string {
  const contractHref =
    translateSourceManagementHrefToRuntime(item.drill_in?.href, config) ||
    firstRuntimeLink(item.links, config as SourceManagementRuntimePageConfig, 'anchor', 'workspace', 'comments', 'artifacts', 'source', 'self');
  if (contractHref) {
    return contractHref;
  }

  if (item.result_kind === SEARCH_RESULT_KIND.SOURCE_REVISION && item.revision?.id) {
    const revisionHref = routeWithID(config.routes?.source_revision, item.revision.id);
    return isRegisteredRuntimeHref(revisionHref, config.routes) ? revisionHref : '';
  }
  if (item.source?.id) {
    const sourceHref = routeWithID(
      config.routes?.source_workspace ?? config.routes?.source_detail,
      item.source.id
    );
    return isRegisteredRuntimeHref(sourceHref, config.routes) ? sourceHref : '';
  }
  return '';
}

function renderEmptyState(title: string, description: string, showRetry = false): string {
  return `
    <div class="flex flex-col items-center justify-center py-12 text-center">
      <div class="rounded-full bg-gray-100 p-3 mb-4">
        <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
      </div>
      <h3 class="text-sm font-medium text-gray-900">${escapeHtml(title)}</h3>
      <p class="mt-1 text-sm text-gray-500">${escapeHtml(description)}</p>
      ${showRetry ? '<button type="button" data-runtime-action="refresh" class="mt-4 inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Try again</button>' : ''}
    </div>
  `;
}

function renderLoadingState(): string {
  return `
    <div class="flex items-center justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-600"></div>
      <span class="ml-3 text-sm text-gray-500">Loading...</span>
    </div>
  `;
}

function renderErrorState(error: Error): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">Something went wrong</h3>
          <p class="mt-1 text-sm text-red-700">${escapeHtml(error.message)}</p>
          <button type="button" data-runtime-action="refresh" class="mt-3 inline-flex items-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
            Try again
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderBrowserToolbar(page: SourceListPage): string {
  const appliedQuery = page.applied_query ?? {};
  return `
    <div class="border-b border-gray-200 bg-gray-50 px-4 py-3">
      <form data-runtime-form="source-browser" class="space-y-3">
        <div class="flex flex-wrap gap-3">
          <div class="flex-1 min-w-[200px]">
            <label class="sr-only" for="browser-search">Search</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg class="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <input type="search" id="browser-search" name="q" value="${escapeHtml(appliedQuery.query ?? '')}" placeholder="Search sources..." class="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div class="w-40">
            <label class="sr-only" for="browser-provider">Provider</label>
            <select id="browser-provider" name="provider_kind" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All providers</option>
              <option value="google_docs" ${appliedQuery.provider_kind === 'google_docs' ? 'selected' : ''}>Google Docs</option>
              <option value="google_drive" ${appliedQuery.provider_kind === 'google_drive' ? 'selected' : ''}>Google Drive</option>
            </select>
          </div>
          <div class="w-36">
            <label class="sr-only" for="browser-status">Status</label>
            <select id="browser-status" name="status" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All statuses</option>
              <option value="active" ${appliedQuery.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="pending" ${appliedQuery.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="archived" ${appliedQuery.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
          <label class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" name="has_pending_candidates" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${appliedQuery.has_pending_candidates ? 'checked' : ''} />
            <span>Pending review</span>
          </label>
        </div>
        <div class="flex items-center gap-2">
          <button type="submit" class="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            Apply
          </button>
          <button type="button" data-runtime-action="clear-browser-filters" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Clear
          </button>
          <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderBrowserTable(
  page: SourceListPage,
  routes: Record<string, string>,
  config: SourceManagementRuntimePageConfig
): string {
  const toolbar = renderBrowserToolbar(page);
  const items = page.items ?? [];

  if (items.length === 0) {
    const emptyState = page.empty_state;
    return `
      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        ${toolbar}
        ${renderEmptyState(
          emptyState?.title ?? 'No sources found',
          emptyState?.description ?? 'Try adjusting your filters or search terms.',
          true
        )}
      </div>
    `;
  }

  const rows = items
    .map((item: SourceListItem) => {
      const sourceID = item.source?.id ?? '';
      const detailHref = resolveBrowserItemRuntimeHref(item, {
        base_path: config.base_path,
        api_base_path: config.api_base_path,
        routes,
      });
      const providerKind = item.provider?.kind ?? '';
      return `
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-3">
            <a href="${escapeHtml(detailHref)}" class="font-medium text-gray-900 hover:text-blue-600">${escapeHtml(item.source?.label ?? 'Untitled')}</a>
            <p class="mt-0.5 text-xs text-gray-500 font-mono">${escapeHtml(sourceID.substring(0, 12))}...</p>
          </td>
          <td class="px-4 py-3">
            ${statusBadge(providerKind)}
            <p class="mt-0.5 text-xs text-gray-500">${escapeHtml(item.provider?.external_file_id ?? '-')}</p>
          </td>
          <td class="px-4 py-3 text-sm text-gray-700">
            <p>${escapeHtml(item.latest_revision?.provider_revision_hint ?? '-')}</p>
            <p class="mt-0.5 text-xs text-gray-500">${formatRelativeTime(item.latest_revision?.modified_time)}</p>
          </td>
          <td class="px-4 py-3">${statusBadge(item.status)}</td>
          <td class="px-4 py-3 text-sm">
            ${(item.pending_candidate_count ?? 0) > 0
              ? `<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">${item.pending_candidate_count} pending</span>`
              : '<span class="text-gray-400">-</span>'}
          </td>
          <td class="px-4 py-3 text-right">
            <a href="${escapeHtml(detailHref)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">View</a>
          </td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      ${toolbar}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Revision</th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
              <th scope="col" class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">${rows}</tbody>
        </table>
      </div>
      ${renderPagination(page.page_info, 'source-browser-page')}
    </div>
  `;
}

function renderWorkspaceSection(
  panelId: string,
  title: string,
  activePanel: string | undefined,
  body: string
): string {
  const active = panelId === String(activePanel ?? '').trim();
  return `
    <section id="workspace-panel-${escapeHtml(panelId)}" class="rounded-xl border ${active ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white'} p-5">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-700">${escapeHtml(title)}</h3>
        ${active ? '<span class="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">Active</span>' : ''}
      </div>
      ${body}
    </section>
  `;
}

function renderWorkspacePanelNav(
  workspace: SourceWorkspace,
  config: SourceManagementRuntimePageConfig
): string {
  const panels = workspace.panels ?? [];
  if (panels.length === 0) {
    return '';
  }
  const activePanel = String(workspace.active_panel ?? 'overview').trim();
  return `
    <div class="rounded-xl border border-gray-200 bg-white p-3">
      <div class="flex flex-wrap gap-2">
        ${panels
          .map((panel) => {
            const href = firstRuntimeLink(panel.links, config, 'anchor', 'workspace', 'self');
            const isActive = panel.id === activePanel;
            const count = panel.item_count ?? 0;
            const classes = isActive
              ? 'border-blue-600 bg-blue-600 text-white'
              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50';
            if (!href) {
              return `
                <span class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${classes}">
                  <span>${escapeHtml(panel.label)}</span>
                  <span class="${isActive ? 'text-blue-100' : 'text-gray-400'}">${escapeHtml(count)}</span>
                </span>
              `;
            }
            return `
              <a
                href="${escapeHtml(href)}"
                data-runtime-workspace-link="panel"
                class="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${classes}"
              >
                <span>${escapeHtml(panel.label)}</span>
                <span class="${isActive ? 'text-blue-100' : 'text-gray-400'}">${escapeHtml(count)}</span>
              </a>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}

function renderWorkspacePage(
  workspace: SourceWorkspace,
  _routes: Record<string, string>,
  config: SourceManagementRuntimePageConfig
): string {
  if (workspace.empty_state?.kind && workspace.empty_state.kind !== 'none') {
    return renderEmptyState(
      workspace.empty_state.title ?? 'Workspace unavailable',
      workspace.empty_state.description ?? '',
      true
    );
  }

  const activePanel = String(workspace.active_panel ?? 'overview').trim();
  const activeAnchor = String(workspace.active_anchor ?? '').trim();
  const continuity = workspace.continuity;
  const continuityRefs = [...(continuity.predecessors ?? []), ...(continuity.successors ?? [])];
  const continuitySummary = continuity.summary
    ? `<p class="text-sm text-gray-700">${escapeHtml(continuity.summary)}</p>`
    : '<p class="text-sm text-gray-500">No continuity summary available.</p>';

  const timelineBody =
    (workspace.timeline?.entries ?? []).length > 0
      ? `<div class="space-y-3">
          ${workspace.timeline.entries
            .map((entry) => {
              const href =
                translateSourceManagementHrefToRuntime(entry.drill_in?.href, config) ||
                firstRuntimeLink(entry.links, config, 'anchor', 'timeline', 'workspace', 'source', 'self');
              return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${escapeHtml(
                        entry.revision?.provider_revision_hint ?? entry.revision?.id ?? 'Revision'
                      )}</h4>
                      <p class="mt-1 text-xs text-gray-500">${escapeHtml(entry.continuity_summary ?? 'Continuity details available from backend workspace timeline.')}</p>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      ${entry.is_latest ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Latest</span>' : ''}
                      ${entry.is_repeated_handle ? '<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Repeated Handle</span>' : ''}
                      ${href ? `<a href="${escapeHtml(href)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ''}
                    </div>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>${escapeHtml(entry.comment_count ?? 0)} comments</span>
                    <span>${escapeHtml(entry.agreement_count ?? 0)} agreements</span>
                    <span>${escapeHtml(entry.artifact_count ?? 0)} artifacts</span>
                    <span>${escapeHtml(entry.handle?.external_file_id ?? entry.handle?.id ?? 'No active handle')}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>`
      : renderEmptyState(
          workspace.timeline?.empty_state?.title ?? 'No revision timeline',
          workspace.timeline?.empty_state?.description ?? 'No revisions are available in this workspace.'
        );

  const agreementsBody =
    (workspace.agreements?.items ?? []).length > 0
      ? `<div class="space-y-3">
          ${workspace.agreements.items
            .map((item) => {
              const href = firstRuntimeLink(item.links, config, 'anchor', 'workspace', 'agreement', 'self');
              return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${escapeHtml(
                        item.agreement?.label ?? item.agreement?.id ?? 'Agreement'
                      )}</h4>
                      <p class="mt-1 text-xs text-gray-500">${escapeHtml(
                        item.document?.label ?? item.document?.id ?? 'Linked document'
                      )}</p>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                      ${statusBadge(item.status)}
                      ${item.is_pinned_latest ? '<span class="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">Pinned Latest</span>' : ''}
                      ${href ? `<a href="${escapeHtml(href)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ''}
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>`
      : renderEmptyState(
          workspace.agreements?.empty_state?.title ?? 'No related agreements',
          workspace.agreements?.empty_state?.description ?? 'No agreements are pinned to this source.'
        );

  const artifactsBody =
    (workspace.artifacts?.items ?? []).length > 0
      ? `<div class="grid gap-3">
          ${workspace.artifacts.items
            .map((item) => {
              const href =
                translateSourceManagementHrefToRuntime(item.drill_in?.href, config) ||
                firstRuntimeLink(item.links, config, 'anchor', 'workspace', 'artifacts', 'self');
              return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${escapeHtml(
                        item.artifact?.artifact_kind ?? 'Artifact'
                      )}</h4>
                      <p class="mt-1 text-xs text-gray-500">${escapeHtml(
                        item.revision?.provider_revision_hint ?? item.revision?.id ?? ''
                      )}</p>
                    </div>
                    ${href ? `<a href="${escapeHtml(href)}" data-runtime-workspace-link="drill-in" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ''}
                  </div>
                  <div class="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                    <span>${escapeHtml(item.provider?.kind ?? 'provider')}</span>
                    <span>${escapeHtml(item.artifact?.page_count ?? 0)} pages</span>
                    <span class="font-mono">${escapeHtml(item.artifact?.id ?? '-')}</span>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>`
      : renderEmptyState(
          workspace.artifacts?.empty_state?.title ?? 'No artifacts',
          workspace.artifacts?.empty_state?.description ?? 'No artifacts are available in this workspace.'
        );

  const commentsBody =
    (workspace.comments?.items ?? []).length > 0
      ? `<div class="space-y-3">${workspace.comments.items.map(renderCommentThread).join('')}</div>`
      : renderEmptyState(
          workspace.comments?.empty_state?.title ?? 'No comments',
          workspace.comments?.empty_state?.description ?? 'No comment threads are available in this workspace.'
        );

  const handlesBody =
    (workspace.handles?.items ?? []).length > 0
      ? `<div class="grid gap-3">
          ${workspace.handles.items
            .map((item) => {
              const href = firstRuntimeLink(item.links, config, 'workspace', 'source', 'self');
              return `
                <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <h4 class="text-sm font-medium text-gray-900">${escapeHtml(
                        item.external_file_id ?? item.id
                      )}</h4>
                      <p class="mt-1 text-xs text-gray-500">${escapeHtml(
                        item.provider_kind ?? 'provider'
                      )}</p>
                    </div>
                    <div class="flex items-center gap-2">
                      ${statusBadge(item.handle_status)}
                      ${href ? `<a href="${escapeHtml(href)}" class="text-sm font-medium text-blue-600 hover:text-blue-700">Open</a>` : ''}
                    </div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>`
      : renderEmptyState(
          workspace.handles?.empty_state?.title ?? 'No handles',
          workspace.handles?.empty_state?.description ?? 'No handles are available in this workspace.'
        );

  return `
    <div class="p-6 space-y-6">
      <div class="rounded-xl border border-gray-200 bg-white p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-xl font-semibold text-gray-900">${escapeHtml(
              workspace.source?.label ?? 'Source Workspace'
            )}</h2>
            <p class="mt-1 font-mono text-xs text-gray-500">${escapeHtml(
              workspace.source?.id ?? '-'
            )}</p>
          </div>
          <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${statusBadge(workspace.status)}
          ${workspace.lineage_confidence ? `<span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Confidence: ${escapeHtml(workspace.lineage_confidence)}</span>` : ''}
          <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">${escapeHtml(workspace.revision_count ?? 0)} revisions</span>
          <span class="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">${escapeHtml(workspace.handle_count ?? 0)} handles</span>
          ${activeAnchor ? `<span class="inline-flex items-center rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">Anchor: ${escapeHtml(activeAnchor)}</span>` : ''}
        </div>
      </div>

      ${renderWorkspacePanelNav(workspace, config)}

      ${renderWorkspaceSection(
        'overview',
        'Overview',
        activePanel,
        `
          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Provider</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${escapeHtml(workspace.provider?.label ?? workspace.provider?.kind ?? '-')}</p>
              <p class="mt-1 text-xs text-gray-500">${escapeHtml(workspace.provider?.external_file_id ?? '-')}</p>
            </div>
            <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Latest Revision</h4>
              <p class="mt-2 text-sm font-medium text-gray-900">${escapeHtml(workspace.latest_revision?.provider_revision_hint ?? workspace.latest_revision?.id ?? '-')}</p>
              <p class="mt-1 text-xs text-gray-500">${formatDateTime(workspace.latest_revision?.modified_time)}</p>
            </div>
          </div>
          <div class="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div class="mb-2 flex items-center justify-between gap-4">
              <h4 class="text-xs font-medium uppercase tracking-wide text-gray-500">Continuity</h4>
              ${statusBadge(continuity.status)}
            </div>
            ${continuitySummary}
            ${continuity.continuation ? `<p class="mt-3 text-xs text-gray-500">Continuation: ${escapeHtml(continuity.continuation.label ?? continuity.continuation.id ?? '-')}</p>` : ''}
            ${continuityRefs.length > 0 ? `<p class="mt-2 text-xs text-gray-500">Linked sources: ${continuityRefs.map((ref) => escapeHtml(ref.label ?? ref.id ?? '-')).join(', ')}</p>` : ''}
          </div>
        `
      )}

      ${renderWorkspaceSection('timeline', 'Revision Timeline', activePanel, timelineBody)}
      ${renderWorkspaceSection('agreements', 'Related Agreements', activePanel, agreementsBody)}
      ${renderWorkspaceSection('artifacts', 'Related Artifacts', activePanel, artifactsBody)}
      ${renderWorkspaceSection(
        'comments',
        'Related Comments',
        activePanel,
        `${workspace.comments?.sync_status ? `<div class="mb-3">${statusBadge(workspace.comments.sync_status)}</div>` : ''}${commentsBody}`
      )}
      ${renderWorkspaceSection('handles', 'Active Handles', activePanel, handlesBody)}
    </div>
  `;
}

function renderRevisionInspector(detail: SourceRevisionDetail): string {
  if (detail.empty_state?.kind && detail.empty_state.kind !== 'none') {
    return renderEmptyState(detail.empty_state.title ?? 'Revision unavailable', detail.empty_state.description ?? '', true);
  }

  return `
    <div class="p-6 space-y-6">
      <div class="flex items-start justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">${escapeHtml(detail.revision?.provider_revision_hint ?? 'Revision')}</h2>
          <p class="mt-1 text-sm text-gray-500 font-mono">${escapeHtml(detail.revision?.id ?? '-')}</p>
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Fingerprint Status</h3>
          <div class="mt-2">${statusBadge(detail.fingerprint_status?.status)}</div>
          ${detail.fingerprint_status?.error_message ? `<p class="mt-2 text-sm text-red-600">${escapeHtml(detail.fingerprint_status.error_message)}</p>` : ''}
        </div>
        <div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Processing</h3>
          <div class="mt-2">${statusBadge(detail.fingerprint_processing?.state)}</div>
          ${detail.fingerprint_processing?.status_label ? `<p class="mt-2 text-sm text-gray-600">${escapeHtml(detail.fingerprint_processing.status_label)}</p>` : ''}
        </div>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Source</h3>
          <p class="mt-1 text-sm text-gray-900">${escapeHtml(detail.source?.label ?? detail.source?.id ?? '-')}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Provider</h3>
          <p class="mt-1 text-sm text-gray-900">${escapeHtml(detail.provider?.label ?? detail.provider?.kind ?? '-')}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Modified</h3>
          <p class="mt-1 text-sm text-gray-900">${formatDateTime(detail.revision?.modified_time)}</p>
        </div>
        <div>
          <h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide">Evidence</h3>
          <p class="mt-1 text-sm text-gray-900">${detail.fingerprint_status?.evidence_available ? 'Available' : 'Not available'}</p>
        </div>
      </div>
    </div>
  `;
}

function renderArtifactInspector(page: SourceArtifactPage): string {
  const items = page.items ?? [];

  if (items.length === 0) {
    return renderEmptyState(page.empty_state?.title ?? 'No artifacts', page.empty_state?.description ?? 'No artifacts have been generated for this revision.', true);
  }

  const cards = items
    .map((item) => {
      return `
        <div class="rounded-lg border border-gray-200 bg-white p-4">
          <div class="flex items-start justify-between">
            <div class="flex flex-wrap gap-2">
              ${statusBadge(item.artifact_kind)}
              ${statusBadge(item.compatibility_tier)}
            </div>
            ${statusBadge(item.normalization_status)}
          </div>
          <dl class="mt-4 grid gap-2 sm:grid-cols-2 text-sm">
            <div>
              <dt class="text-gray-500">Object Key</dt>
              <dd class="mt-0.5 font-medium text-gray-900 font-mono text-xs truncate">${escapeHtml(item.object_key ?? '-')}</dd>
            </div>
            <div>
              <dt class="text-gray-500">Pages</dt>
              <dd class="mt-0.5 font-medium text-gray-900">${escapeHtml(item.page_count ?? '-')}</dd>
            </div>
            <div class="sm:col-span-2">
              <dt class="text-gray-500">SHA256</dt>
              <dd class="mt-0.5 font-mono text-xs text-gray-700 truncate">${escapeHtml(item.sha256 ?? '-')}</dd>
            </div>
          </dl>
        </div>
      `;
    })
    .join('');

  return `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold text-gray-900">Artifacts</h2>
          <p class="mt-1 text-sm text-gray-500">${items.length} artifact${items.length !== 1 ? 's' : ''}</p>
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
      <div class="grid gap-4">${cards}</div>
    </div>
  `;
}

function renderCommentThread(thread: SourceCommentThreadSummary): string {
  return `
    <div class="rounded-lg border border-gray-200 bg-white p-4">
      <div class="flex items-start justify-between">
        <div class="flex flex-wrap gap-2">
          ${statusBadge(thread.status)}
          ${thread.sync_status ? statusBadge(thread.sync_status) : ''}
        </div>
        <span class="text-xs text-gray-500">${formatRelativeTime(thread.last_synced_at)}</span>
      </div>
      <p class="mt-3 text-sm font-medium text-gray-900">${escapeHtml(thread.anchor?.label ?? 'Comment Thread')}</p>
      <p class="mt-1 text-sm text-gray-600 line-clamp-2">${escapeHtml(thread.body_preview ?? '')}</p>
      <div class="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span class="flex items-center gap-1">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
          ${escapeHtml(thread.author_name ?? 'Unknown')}
        </span>
        <span class="flex items-center gap-1">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/></svg>
          ${thread.message_count ?? 0} messages
        </span>
        ${(thread.reply_count ?? 0) > 0 ? `<span>${thread.reply_count} replies</span>` : ''}
      </div>
    </div>
  `;
}

function renderCommentInspector(page: SourceCommentPage): string {
  const items = page.items ?? [];

  if (items.length === 0) {
    return renderEmptyState(page.empty_state?.title ?? 'No comments', page.empty_state?.description ?? 'No comments have been synced for this revision.', true);
  }

  return `
    <div class="p-6 space-y-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-gray-900">Comments</h2>
          ${statusBadge(page.sync_status ?? 'unknown')}
        </div>
        <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
      <div class="space-y-3">${items.map(renderCommentThread).join('')}</div>
      ${renderPagination(page.page_info, 'source-comment-page')}
    </div>
  `;
}

function renderSearchToolbar(page: Phase13SourceSearchResults): string {
  const appliedQuery = (page.applied_query ?? {}) as Phase13SourceSearchQuery;
  return `
    <div class="bg-white border border-gray-200 rounded-xl shadow-sm p-4 mb-4">
      <form data-runtime-form="source-search" class="space-y-3">
        <div class="flex flex-wrap gap-3">
          <div class="flex-1 min-w-[240px]">
            <label class="sr-only" for="search-query">Search</label>
            <div class="relative">
              <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              <input type="search" id="search-query" name="q" value="${escapeHtml(appliedQuery.query ?? '')}" placeholder="Search sources, revisions, comments..." class="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <button type="submit" class="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            Search
          </button>
        </div>
        <div class="flex flex-wrap gap-3">
          <div class="w-40">
            <select name="provider_kind" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All providers</option>
              <option value="google_docs" ${appliedQuery.provider_kind === 'google_docs' ? 'selected' : ''}>Google Docs</option>
              <option value="google_drive" ${appliedQuery.provider_kind === 'google_drive' ? 'selected' : ''}>Google Drive</option>
            </select>
          </div>
          <div class="w-32">
            <select name="status" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All statuses</option>
              <option value="active" ${appliedQuery.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="pending" ${appliedQuery.status === 'pending' ? 'selected' : ''}>Pending</option>
              <option value="archived" ${appliedQuery.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
          <div class="w-36">
            <select name="result_kind" class="block w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">All types</option>
              <option value="${SEARCH_RESULT_KIND.SOURCE_DOCUMENT}" ${appliedQuery.result_kind === SEARCH_RESULT_KIND.SOURCE_DOCUMENT ? 'selected' : ''}>Sources</option>
              <option value="${SEARCH_RESULT_KIND.SOURCE_REVISION}" ${appliedQuery.result_kind === SEARCH_RESULT_KIND.SOURCE_REVISION ? 'selected' : ''}>Revisions</option>
            </select>
          </div>
          <label class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" name="has_comments" class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" ${appliedQuery.has_comments ? 'checked' : ''} />
            <span>Has comments</span>
          </label>
          <button type="button" data-runtime-action="clear-search-filters" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Clear
          </button>
          <button type="button" data-runtime-action="refresh" class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          </button>
        </div>
      </form>
    </div>
  `;
}

function renderSearchResults(
  page: Phase13SourceSearchResults,
  routes: Record<string, string>,
  config: SourceManagementRuntimePageConfig
): string {
  const toolbar = renderSearchToolbar(page);
  const items = page.items ?? [];

  if (items.length === 0) {
    const emptyState = page.empty_state;
    return `
      ${toolbar}
      ${renderEmptyState(
        emptyState?.title ?? 'No results found',
        emptyState?.description ?? 'Try adjusting your search terms or filters.',
        false
      )}
    `;
  }

  const resultCards = items
    .map((item: Phase13SourceSearchResultSummary) => {
      const href = resolveSearchResultRuntimeHref(item, {
        base_path: config.base_path,
        api_base_path: config.api_base_path,
        routes,
      });
      const matchedFields = item.matched_fields ?? [];
      const commentCount = item.comment_count;
      const hasComments = commentCount !== undefined && commentCount > 0;

      return `
        <a href="${escapeHtml(href)}" class="block bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all">
          <div class="flex items-start justify-between">
            <div class="flex flex-wrap gap-2">
              ${statusBadge(item.result_kind)}
              ${statusBadge(item.provider?.kind)}
            </div>
            ${hasComments ? `<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">${commentCount} comment${commentCount !== 1 ? 's' : ''}</span>` : ''}
          </div>
          <h3 class="mt-2 text-sm font-medium text-gray-900">${escapeHtml(item.summary ?? item.source?.label ?? 'Result')}</h3>
          <p class="mt-1 text-sm text-gray-500">${escapeHtml(item.source?.id ?? '')}</p>
          ${matchedFields.length > 0 ? `
            <div class="mt-2 flex flex-wrap gap-1">
              ${matchedFields.map((field: string) => `<span class="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">Matched: ${escapeHtml(field)}</span>`).join('')}
            </div>
          ` : ''}
        </a>
      `;
    })
    .join('');

  return `
    ${toolbar}
    <div class="mb-4 flex items-center justify-between">
      <p class="text-sm text-gray-500">${page.page_info?.total_count ?? items.length} result${(page.page_info?.total_count ?? items.length) !== 1 ? 's' : ''}</p>
    </div>
    <div class="grid gap-3">${resultCards}</div>
    ${renderPagination(page.page_info, 'source-search-page')}
  `;
}

function renderPagination(
  pageInfo: { page?: number; page_size?: number; total_count?: number; has_more?: boolean } | undefined,
  action: string
): string {
  const page = Number(pageInfo?.page ?? 1);
  const totalCount = Number(pageInfo?.total_count ?? 0);
  const pageSize = Number(pageInfo?.page_size ?? 20);
  if (totalCount <= 0 || totalCount <= pageSize) {
    return '';
  }
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return `
    <div class="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 mt-4 rounded-b-xl">
      <div class="text-sm text-gray-500">
        Showing <span class="font-medium">${start}</span> to <span class="font-medium">${end}</span> of <span class="font-medium">${totalCount}</span>
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          data-runtime-action="${escapeHtml(action)}"
          data-page="${page - 1}"
          class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          ${page <= 1 ? 'disabled' : ''}
        >
          Previous
        </button>
        <span class="inline-flex items-center px-3 py-1.5 text-sm text-gray-500">
          Page ${page} of ${totalPages}
        </span>
        <button
          type="button"
          data-runtime-action="${escapeHtml(action)}"
          data-page="${page + 1}"
          class="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          ${page >= totalPages ? 'disabled' : ''}
        >
          Next
        </button>
      </div>
    </div>
  `;
}

export class SourceManagementRuntimeController {
  readonly page: SourceManagementRuntimePage;
  readonly config: SourceManagementRuntimePageConfig;
  readonly model: SourceManagementRuntimePageModel;
  readonly marker: HTMLElement;
  readonly root: HTMLElement;

  private liveController: SourceManagementRuntimeLiveController | null = null;
  private hasLiveContract = false;
  private readonly abortController = new AbortController();

  constructor(options: {
    page: SourceManagementRuntimePage;
    config: SourceManagementRuntimePageConfig;
    model: SourceManagementRuntimePageModel;
    marker: HTMLElement;
    root: HTMLElement;
  }) {
    this.page = options.page;
    this.config = options.config;
    this.model = options.model;
    this.marker = options.marker;
    this.root = options.root;
  }

  async init(): Promise<void> {
    this.renderFromModel();
    this.bindEvents();
    this.bootstrapLiveController();
  }

  destroy(): void {
    this.abortController.abort();
  }

  private bindEvents(): void {
    this.root.addEventListener(
      'click',
      (event) => {
        const target = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-runtime-action]') : null;
        if (!target) {
          return;
        }
        const action = target.dataset.runtimeAction ?? '';
        if (action === 'refresh') {
          event.preventDefault();
          void this.refresh();
          return;
        }
        if (action === 'clear-browser-filters') {
          event.preventDefault();
          void this.clearBrowserFilters();
          return;
        }
        if (action === 'clear-search-filters') {
          event.preventDefault();
          void this.clearSearchFilters();
          return;
        }
        if (action === 'source-browser-page' || action === 'source-comment-page' || action === 'source-search-page') {
          event.preventDefault();
          const page = Number.parseInt(target.dataset.page ?? '1', 10);
          if (!Number.isFinite(page) || page <= 0) {
            return;
          }
          void this.goToPage(action, page);
        }

        const workspaceLink = event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('[data-runtime-workspace-link]')
          : null;
        if (workspaceLink && this.liveController instanceof SourceWorkspacePageController) {
          const href = String(workspaceLink.getAttribute('href') ?? '').trim();
          if (href) {
            const currentPath = pathnameOfHref(window.location.href);
            const targetPath = pathnameOfHref(href);
            if (currentPath === targetPath) {
              event.preventDefault();
              void this.liveController.navigateToHref(href);
            }
          }
        }
      },
      { signal: this.abortController.signal }
    );

    this.root.addEventListener(
      'submit',
      (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) {
          return;
        }
        const kind = form.dataset.runtimeForm ?? '';
        if (kind === 'source-browser') {
          event.preventDefault();
          const payload = new FormData(form);
          void this.applyBrowserFilters({
            query: stringOrUndefined(payload.get('q')),
            provider_kind: stringOrUndefined(payload.get('provider_kind')),
            status: stringOrUndefined(payload.get('status')),
            has_pending_candidates: payload.get('has_pending_candidates') ? true : undefined,
          });
        }
        if (kind === 'source-search') {
          event.preventDefault();
          const payload = new FormData(form);
          void this.applySearchFilters({
            query: stringOrUndefined(payload.get('q')),
            provider_kind: stringOrUndefined(payload.get('provider_kind')),
            status: stringOrUndefined(payload.get('status')),
            result_kind: stringOrUndefined(payload.get('result_kind')),
            has_comments: payload.get('has_comments') ? true : undefined,
          });
        }
      },
      { signal: this.abortController.signal }
    );
  }

  private bootstrapLiveController(): void {
    const apiBasePath = String(this.config.api_base_path ?? '').trim();
    const sourceDocumentID = stringOrUndefined(this.config.context?.source_document_id);
    const sourceRevisionID = stringOrUndefined(this.config.context?.source_revision_id);
    const register = (controller: SourceManagementRuntimeLiveController, key = this.page) => {
      this.liveController = controller;
      registerPageController(key, controller);
    };

    switch (this.page) {
      case 'admin.sources.browser':
        register(
          bootstrapSourceBrowserPage({
            apiBasePath,
            onStateChange: (state) => this.renderBrowserState(state),
          })
        );
        break;
      case 'admin.sources.detail':
        if (!sourceDocumentID) {
          return;
        }
        register(
          bootstrapSourceWorkspacePage({
            apiBasePath,
            sourceId: sourceDocumentID,
            onStateChange: (state) => this.renderWorkspaceState(state),
          })
        );
        break;
      case 'admin.sources.workspace':
        if (!sourceDocumentID) {
          return;
        }
        register(
          bootstrapSourceWorkspacePage({
            apiBasePath,
            sourceId: sourceDocumentID,
            onStateChange: (state) => this.renderWorkspaceState(state),
          })
        );
        break;
      case 'admin.sources.revision_inspector':
        if (!sourceRevisionID) {
          return;
        }
        register(
          bootstrapSourceRevisionInspectorPage({
            apiBasePath,
            sourceRevisionId: sourceRevisionID,
            onStateChange: (state) => this.renderRevisionState(state),
          })
        );
        break;
      case 'admin.sources.comment_inspector':
        if (!sourceRevisionID) {
          return;
        }
        register(
          bootstrapSourceCommentInspectorPage({
            apiBasePath,
            sourceRevisionId: sourceRevisionID,
            onStateChange: (state) => this.renderCommentState(state),
          })
        );
        break;
      case 'admin.sources.artifact_inspector':
        if (!sourceRevisionID) {
          return;
        }
        register(
          bootstrapSourceArtifactInspectorPage({
            apiBasePath,
            sourceRevisionId: sourceRevisionID,
            onStateChange: (state) => this.renderArtifactState(state),
          })
        );
        break;
      case 'admin.sources.search':
        register(
          bootstrapSourceSearchPage({
            apiBasePath,
            onStateChange: (state) => this.renderSearchState(state),
          })
        );
        break;
    }
  }

  private renderFromModel(): void {
    const contract = this.model.contract;
    switch (this.page) {
      case 'admin.sources.browser':
        this.root.innerHTML = renderBrowserTable(contract as SourceListPage, this.config.routes ?? {}, this.config);
        return;
      case 'admin.sources.detail':
      case 'admin.sources.workspace':
        this.root.innerHTML = renderWorkspacePage(contract as SourceWorkspace, this.config.routes ?? {}, this.config);
        return;
      case 'admin.sources.revision_inspector':
        this.root.innerHTML = renderRevisionInspector(contract as SourceRevisionDetail);
        return;
      case 'admin.sources.comment_inspector':
        this.root.innerHTML = renderCommentInspector(contract as SourceCommentPage);
        return;
      case 'admin.sources.artifact_inspector':
        this.root.innerHTML = renderArtifactInspector(contract as SourceArtifactPage);
        return;
      case 'admin.sources.search':
        this.root.innerHTML = renderSearchResults(contract as Phase13SourceSearchResults, this.config.routes ?? {}, this.config);
        return;
    }
  }

  private renderBrowserState(state: SourceManagementPageState<{ listSources: SourceListPage }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState();
      return;
    }
    if (state.error) {
      this.root.innerHTML = renderErrorState(state.error);
      return;
    }
    if (state.contracts?.listSources) {
      this.hasLiveContract = true;
      this.root.innerHTML = renderBrowserTable(state.contracts.listSources, this.config.routes ?? {}, this.config);
    }
  }

  private renderWorkspaceState(state: SourceManagementPageState<{ workspace: SourceWorkspace }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState();
      return;
    }
    if (state.error) {
      this.root.innerHTML = renderErrorState(state.error);
      return;
    }
    if (state.contracts?.workspace) {
      this.hasLiveContract = true;
      this.root.innerHTML = renderWorkspacePage(state.contracts.workspace, this.config.routes ?? {}, this.config);
    }
  }

  private renderRevisionState(state: SourceManagementPageState<{ revisionDetail: SourceRevisionDetail }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState();
      return;
    }
    if (state.error) {
      this.root.innerHTML = renderErrorState(state.error);
      return;
    }
    if (state.contracts?.revisionDetail) {
      this.hasLiveContract = true;
      this.root.innerHTML = renderRevisionInspector(state.contracts.revisionDetail);
    }
  }

  private renderCommentState(state: SourceManagementPageState<{ commentPage: SourceCommentPage }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState();
      return;
    }
    if (state.error) {
      this.root.innerHTML = renderErrorState(state.error);
      return;
    }
    if (state.contracts?.commentPage) {
      this.hasLiveContract = true;
      this.root.innerHTML = renderCommentInspector(state.contracts.commentPage);
    }
  }

  private renderArtifactState(state: SourceManagementPageState<{ artifactPage: SourceArtifactPage }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState();
      return;
    }
    if (state.error) {
      this.root.innerHTML = renderErrorState(state.error);
      return;
    }
    if (state.contracts?.artifactPage) {
      this.hasLiveContract = true;
      this.root.innerHTML = renderArtifactInspector(state.contracts.artifactPage);
    }
  }

  private renderSearchState(state: SourceManagementPageState<{ searchResults: Phase13SourceSearchResults }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState();
      return;
    }
    if (state.error) {
      this.root.innerHTML = renderErrorState(state.error);
      return;
    }
    if (state.contracts?.searchResults) {
      this.hasLiveContract = true;
      this.root.innerHTML = renderSearchResults(state.contracts.searchResults, this.config.routes ?? {}, this.config);
    }
  }

  private async refresh(): Promise<void> {
    if (!this.liveController) {
      return;
    }
    if ('refresh' in this.liveController && typeof this.liveController.refresh === 'function') {
      await this.liveController.refresh();
      return;
    }
    if ('fetchSources' in this.liveController && typeof this.liveController.fetchSources === 'function') {
      const state = this.liveController.getState();
      const query = state.contracts?.query ?? {};
      await this.liveController.fetchSources(query);
    }
  }

  private async goToPage(action: string, page: number): Promise<void> {
    if (action === 'source-browser-page' && this.liveController instanceof SourceBrowserPageController) {
      await this.liveController.goToPage(page);
    }
    if (action === 'source-comment-page' && this.liveController instanceof SourceCommentInspectorPageController) {
      await this.liveController.goToPage(page);
    }
    if (action === 'source-search-page' && this.liveController instanceof SourceSearchPageController) {
      await this.liveController.goToPage(page);
    }
  }

  /**
   * Clear all browser filters - explicitly sets all filter values to undefined
   * to ensure they are removed from the URL and reset.
   */
  private async clearBrowserFilters(): Promise<void> {
    if (!(this.liveController instanceof SourceBrowserPageController)) {
      return;
    }
    // Explicitly set all filter fields to undefined to clear them
    await this.liveController.applyFilters({
      query: undefined,
      provider_kind: undefined,
      status: undefined,
      has_pending_candidates: undefined,
      sort: undefined,
    });
  }

  /**
   * Clear all search filters - explicitly sets all filter values to undefined
   * to ensure they are removed from the URL and reset.
   */
  private async clearSearchFilters(): Promise<void> {
    if (!(this.liveController instanceof SourceSearchPageController)) {
      return;
    }
    // Explicitly set all filter fields to undefined to clear them
    await this.liveController.applyFilters({
      query: undefined,
      provider_kind: undefined,
      status: undefined,
      result_kind: undefined,
      relationship_state: undefined,
      comment_sync_status: undefined,
      revision_hint: undefined,
      has_comments: undefined,
      sort: undefined,
    });
  }

  private async applyBrowserFilters(filters: {
    query?: string;
    provider_kind?: string;
    status?: string;
    has_pending_candidates?: boolean;
  }): Promise<void> {
    if (!(this.liveController instanceof SourceBrowserPageController)) {
      return;
    }
    await this.liveController.applyFilters(filters);
  }

  private async applySearchFilters(filters: Partial<Phase13SourceSearchQuery>): Promise<void> {
    if (!(this.liveController instanceof SourceSearchPageController)) {
      return;
    }
    await this.liveController.applyFilters(filters);
  }
}

function stringOrUndefined(value: FormDataEntryValue | unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : undefined;
}

export function initSourceManagementRuntimePage(): SourceManagementRuntimeController | null {
  const marker = document.querySelector<HTMLElement>('[data-esign-page^="admin.sources."]');
  const root = document.querySelector<HTMLElement>('[data-source-management-runtime-root]');
  if (!marker || !root) {
    return null;
  }

  const config = parseJSONScript<SourceManagementRuntimePageConfig>('esign-page-config');
  const model = parseJSONScript<SourceManagementRuntimePageModel>('source-management-page-model');
  const page = String(config?.page ?? marker.dataset.esignPage ?? '').trim() as SourceManagementRuntimePage;
  if (!page) {
    return null;
  }

  const controller = new SourceManagementRuntimeController({
    page,
    config: config ?? {},
    model: model ?? {},
    marker,
    root,
  });
  void controller.init();
  return controller;
}

/**
 * V2 runtime initialization result.
 * Reports success/failure of runtime mounting from backend config.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 18 Task 18.7
 */
export interface V2RuntimeInitResult {
  success: boolean;
  page: string | null;
  surface: string | null;
  hasBackendConfig: boolean;
  hasBackendPageModel: boolean;
  hasBackendRoutes: boolean;
  controllerMounted: boolean;
  issues: string[];
}

/**
 * Initialize V2 source-management runtime with validation.
 * Validates that runtime mounts from backend-owned config only.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 18 Task 18.7
 */
export function initV2SourceManagementRuntime(): V2RuntimeInitResult {
  const result: V2RuntimeInitResult = {
    success: false,
    page: null,
    surface: null,
    hasBackendConfig: false,
    hasBackendPageModel: false,
    hasBackendRoutes: false,
    controllerMounted: false,
    issues: [],
  };

  // Check for required DOM elements
  const marker = document.querySelector<HTMLElement>('[data-esign-page^="admin.sources."]');
  const root = document.querySelector<HTMLElement>('[data-source-management-runtime-root]');

  if (!marker) {
    result.issues.push('Missing page marker element [data-esign-page]');
    return result;
  }

  if (!root) {
    result.issues.push('Missing runtime root element [data-source-management-runtime-root]');
    return result;
  }

  // Parse backend-provided configuration
  const config = parseJSONScript<SourceManagementRuntimePageConfig>('esign-page-config');
  const model = parseJSONScript<SourceManagementRuntimePageModel>('source-management-page-model');

  // Validate backend config is present
  result.hasBackendConfig = config !== null && typeof config.api_base_path === 'string';
  if (!result.hasBackendConfig) {
    result.issues.push('Backend config missing or invalid - no api_base_path');
  }

  // Validate backend page model is present
  result.hasBackendPageModel = model !== null && typeof model.surface === 'string';
  if (!result.hasBackendPageModel) {
    result.issues.push('Backend page model missing or invalid - no surface');
  }

  // Validate backend routes are present
  result.hasBackendRoutes = config?.routes !== undefined && typeof config.routes === 'object';
  if (!result.hasBackendRoutes) {
    result.issues.push('Backend routes missing from config');
  }

  // Extract page identifier
  const page = String(config?.page ?? marker.dataset.esignPage ?? '').trim();
  result.page = page || null;
  result.surface = model?.surface ?? marker.dataset.sourceManagementSurface ?? null;

  if (!page) {
    result.issues.push('Page identifier not found in config or marker');
    return result;
  }

  // Check for forbidden client-side bootstrap shims
  const forbiddenShims = [
    '_clientBootstrap',
    '_fallbackConfig',
    '_synthesizedRoutes',
    '_generatedApiPath',
  ];

  for (const shim of forbiddenShims) {
    if (config && shim in config) {
      result.issues.push(`Forbidden client-side bootstrap shim detected: ${shim}`);
    }
    if (model && shim in model) {
      result.issues.push(`Forbidden client-side bootstrap shim detected: ${shim}`);
    }
  }

  // Initialize the runtime controller
  const controller = initSourceManagementRuntimePage();
  result.controllerMounted = controller !== null;

  if (!result.controllerMounted) {
    result.issues.push('Runtime controller failed to mount');
  }

  // Determine overall success
  result.success =
    result.hasBackendConfig &&
    result.hasBackendPageModel &&
    result.hasBackendRoutes &&
    result.controllerMounted &&
    result.issues.length === 0;

  return result;
}

/**
 * Assert V2 runtime initialization succeeds.
 * Throws if runtime cannot be mounted from backend config.
 *
 * @see DOC_LINEAGE_V2_TSK.md Phase 18 Task 18.7
 */
export function assertV2RuntimeInitialization(): void {
  const result = initV2SourceManagementRuntime();
  if (!result.success) {
    throw new Error(`V2 runtime initialization failed: ${result.issues.join('; ')}`);
  }
}

/**
 * Log V2 runtime initialization result.
 */
export function logV2RuntimeInitResult(result: V2RuntimeInitResult): void {
  console.group('V2 Source-Management Runtime Initialization');
  console.log(`Success: ${result.success ? 'YES' : 'NO'}`);
  console.log(`Page: ${result.page ?? 'unknown'}`);
  console.log(`Surface: ${result.surface ?? 'unknown'}`);
  console.log(`Backend Config: ${result.hasBackendConfig ? '✓' : '✗'}`);
  console.log(`Backend Page Model: ${result.hasBackendPageModel ? '✓' : '✗'}`);
  console.log(`Backend Routes: ${result.hasBackendRoutes ? '✓' : '✗'}`);
  console.log(`Controller Mounted: ${result.controllerMounted ? '✓' : '✗'}`);

  if (result.issues.length > 0) {
    console.group('Issues');
    for (const issue of result.issues) {
      console.log(`- ${issue}`);
    }
    console.groupEnd();
  }

  console.groupEnd();
}

if (typeof document !== 'undefined') {
  onReady(() => {
    if (document.querySelector('[data-esign-page^="admin.sources."]')) {
      initSourceManagementRuntimePage();
    }
  });
}
