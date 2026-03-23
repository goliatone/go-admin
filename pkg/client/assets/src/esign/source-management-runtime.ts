import type {
  SourceArtifactPage,
  SourceCommentPage,
  SourceCommentThreadSummary,
  SourceDetail,
  SourceListItem,
  SourceListPage,
  SourceRevisionDetail,
  SourceSearchResultSummary,
  SourceSearchResults,
  Phase13SourceSearchQuery,
} from './lineage-contracts.js';

import type { SourceManagementPageState } from './source-management-composition.js';

import {
  SourceArtifactInspectorPageController,
  SourceBrowserPageController,
  SourceCommentInspectorPageController,
  SourceDetailPageController,
  SourceRevisionInspectorPageController,
  SourceSearchPageController,
  bootstrapSourceArtifactInspectorPage,
  bootstrapSourceBrowserPage,
  bootstrapSourceCommentInspectorPage,
  bootstrapSourceDetailPage,
  bootstrapSourceRevisionInspectorPage,
  bootstrapSourceSearchPage,
  registerPageController,
} from './source-management-pages.js';

import { onReady } from './utils/dom-helpers.js';

type SourceManagementRuntimePage =
  | 'admin.sources.browser'
  | 'admin.sources.detail'
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
  | SourceDetailPageController
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

function badgeClass(value: string): string {
  switch (value) {
    case 'active':
    case 'ready':
    case 'synced':
    case 'high':
      return 'bg-emerald-100 text-emerald-800';
    case 'pending':
    case 'pending_review':
    case 'stale':
    case 'medium':
      return 'bg-amber-100 text-amber-800';
    case 'failed':
    case 'archived':
    case 'rejected':
    case 'low':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function pill(label: string, value: string | number | undefined): string {
  return `
    <span class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">
      <span class="text-slate-500">${escapeHtml(label)}</span>
      <span>${escapeHtml(value ?? '-')}</span>
    </span>
  `;
}

function statusBadge(value: string | undefined, fallback = '-'): string {
  const normalized = String(value ?? '').trim();
  if (!normalized) {
    return escapeHtml(fallback);
  }
  return `<span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass(normalized)}">${escapeHtml(normalized.replace(/_/g, ' '))}</span>`;
}

function booleanToChecked(value: boolean | undefined): string {
  return value ? ' checked' : '';
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

function renderEmptyState(title: string, description: string): string {
  return `
    <div class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      <p class="font-semibold text-slate-900">${escapeHtml(title)}</p>
      <p class="mt-2">${escapeHtml(description)}</p>
    </div>
  `;
}

function renderLoadingState(message: string): string {
  return `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
      <p class="font-semibold text-slate-900">Loading</p>
      <p class="mt-2">${escapeHtml(message)}</p>
    </div>
  `;
}

function renderErrorState(error: Error): string {
  return `
    <div class="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-800">
      <p class="font-semibold">Unable to load runtime workspace</p>
      <p class="mt-2">${escapeHtml(error.message)}</p>
    </div>
  `;
}

function renderBrowserTable(page: SourceListPage, routes: Record<string, string>): string {
  if ((page.items ?? []).length === 0) {
    const emptyState = page.empty_state;
    return renderEmptyState(
      emptyState?.title ?? 'No sources available',
      emptyState?.description ?? 'No canonical source documents matched the current filters.'
    );
  }

  const rows = (page.items ?? [])
    .map((item: SourceListItem) => {
      const sourceID = item.source?.id ?? '';
      const detailHref = routeWithID(routes.source_detail, sourceID);
      return `
        <tr class="border-t border-slate-200">
          <td class="px-4 py-3 align-top">
            <a href="${escapeHtml(detailHref)}" class="font-medium text-slate-900 hover:text-slate-700">${escapeHtml(item.source?.label ?? sourceID ?? 'Untitled Source')}</a>
            <p class="mt-1 text-xs text-slate-500">${escapeHtml(sourceID || '-')}</p>
          </td>
          <td class="px-4 py-3 align-top text-sm text-slate-700">
            <p>${escapeHtml(item.provider?.label ?? item.provider?.kind ?? '-')}</p>
            <p class="mt-1 text-xs text-slate-500">${escapeHtml(item.provider?.external_file_id ?? '-')}</p>
          </td>
          <td class="px-4 py-3 align-top text-sm text-slate-700">
            <p>${escapeHtml(item.latest_revision?.provider_revision_hint ?? item.latest_revision?.id ?? '-')}</p>
            <p class="mt-1 text-xs text-slate-500">${formatDateTime(item.latest_revision?.modified_time)}</p>
          </td>
          <td class="px-4 py-3 align-top">${statusBadge(item.status)}</td>
          <td class="px-4 py-3 align-top text-sm text-slate-700">${escapeHtml(String(item.pending_candidate_count ?? 0))}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div class="border-b border-slate-200 px-4 py-3">
        <form data-runtime-form="source-browser" class="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
          <input type="search" name="q" value="${escapeHtml(page.applied_query?.query ?? '')}" placeholder="Search sources" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          <input type="text" name="provider_kind" value="${escapeHtml(page.applied_query?.provider_kind ?? '')}" placeholder="Provider" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          <input type="text" name="status" value="${escapeHtml(page.applied_query?.status ?? '')}" placeholder="Status" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          <label class="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" name="has_pending_candidates"${booleanToChecked(page.applied_query?.has_pending_candidates)} />
            Pending candidates
          </label>
          <div class="md:col-span-4 flex flex-wrap items-center gap-2">
            <button type="submit" class="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Apply Filters</button>
            <button type="button" data-runtime-action="clear-browser-filters" class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Clear</button>
            <button type="button" data-runtime-action="refresh" class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Refresh</button>
          </div>
        </form>
      </div>
      <table class="min-w-full divide-y divide-slate-200 text-left">
        <thead class="bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
          <tr>
            <th class="px-4 py-3">Source</th>
            <th class="px-4 py-3">Provider</th>
            <th class="px-4 py-3">Latest Revision</th>
            <th class="px-4 py-3">Status</th>
            <th class="px-4 py-3">Pending</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${renderPagination(page.page_info, 'source-browser-page')}
    </div>
  `;
}

function renderDetailPanel(detail: SourceDetail, routes: Record<string, string>): string {
  if (detail.empty_state?.kind && detail.empty_state.kind !== 'none') {
    return renderEmptyState(detail.empty_state.title ?? 'Source unavailable', detail.empty_state.description ?? '');
  }

  const latestRevisionHref = routeWithID(routes.source_revision, detail.latest_revision?.id ?? '');
  const commentHref = routeWithID(routes.source_comment_inspector, detail.latest_revision?.id ?? '');
  const artifactHref = routeWithID(routes.source_artifact_inspector, detail.latest_revision?.id ?? '');

  return `
    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
      <section class="rounded-2xl border border-slate-200 bg-white p-5">
        <div class="flex items-center justify-between gap-4">
          <div>
            <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(detail.source?.label ?? detail.source?.id ?? 'Source Detail')}</h3>
            <p class="mt-1 text-sm text-slate-500">${escapeHtml(detail.source?.id ?? '-')}</p>
          </div>
          <button type="button" data-runtime-action="refresh" class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Refresh</button>
        </div>
        <div class="mt-4 flex flex-wrap gap-2">
          ${pill('Status', detail.status)}
          ${pill('Lineage', detail.lineage_confidence)}
          ${pill('Revisions', detail.revision_count)}
          ${pill('Handles', detail.handle_count)}
          ${pill('Relationships', detail.relationship_count)}
        </div>
        <dl class="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Provider</dt>
            <dd class="mt-2 text-sm text-slate-900">${escapeHtml(detail.provider?.label ?? detail.provider?.kind ?? '-')}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">External File ID</dt>
            <dd class="mt-2 text-sm text-slate-900">${escapeHtml(detail.provider?.external_file_id ?? '-')}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Latest Revision</dt>
            <dd class="mt-2 text-sm text-slate-900">${escapeHtml(detail.latest_revision?.provider_revision_hint ?? detail.latest_revision?.id ?? '-')}</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Modified</dt>
            <dd class="mt-2 text-sm text-slate-900">${formatDateTime(detail.latest_revision?.modified_time)}</dd>
          </div>
        </dl>
      </section>
      <aside class="rounded-2xl border border-slate-200 bg-white p-5">
        <h3 class="text-lg font-semibold text-slate-900">Drill-Ins</h3>
        <div class="mt-4 space-y-2 text-sm">
          <a href="${escapeHtml(latestRevisionHref)}" class="block rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">Latest Revision</a>
          <a href="${escapeHtml(commentHref)}" class="block rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">Comment Inspector</a>
          <a href="${escapeHtml(artifactHref)}" class="block rounded-xl border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50">Artifact Inspector</a>
        </div>
      </aside>
    </div>
  `;
}

function renderRevisionInspector(detail: SourceRevisionDetail): string {
  if (detail.empty_state?.kind && detail.empty_state.kind !== 'none') {
    return renderEmptyState(detail.empty_state.title ?? 'Revision unavailable', detail.empty_state.description ?? '');
  }

  return `
    <section class="rounded-2xl border border-slate-200 bg-white p-5">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold text-slate-900">${escapeHtml(detail.revision?.provider_revision_hint ?? detail.revision?.id ?? 'Revision Inspector')}</h3>
          <p class="mt-1 text-sm text-slate-500">${escapeHtml(detail.revision?.id ?? '-')}</p>
        </div>
        <button type="button" data-runtime-action="refresh" class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Refresh</button>
      </div>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fingerprint Status</p>
          <div class="mt-3">${statusBadge(detail.fingerprint_status?.status)}</div>
          <p class="mt-2 text-sm text-slate-600">${escapeHtml(detail.fingerprint_status?.error_message ?? '')}</p>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Processing State</p>
          <div class="mt-3">${statusBadge(detail.fingerprint_processing?.state)}</div>
          <p class="mt-2 text-sm text-slate-600">${escapeHtml(detail.fingerprint_processing?.status_label ?? '')}</p>
        </div>
      </div>
      <dl class="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Source</dt>
          <dd class="mt-2 text-sm text-slate-900">${escapeHtml(detail.source?.label ?? detail.source?.id ?? '-')}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Provider</dt>
          <dd class="mt-2 text-sm text-slate-900">${escapeHtml(detail.provider?.label ?? detail.provider?.kind ?? '-')}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Modified</dt>
          <dd class="mt-2 text-sm text-slate-900">${formatDateTime(detail.revision?.modified_time)}</dd>
        </div>
        <div>
          <dt class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence Available</dt>
          <dd class="mt-2 text-sm text-slate-900">${escapeHtml(detail.fingerprint_status?.evidence_available ? 'Yes' : 'No')}</dd>
        </div>
      </dl>
    </section>
  `;
}

function renderArtifactInspector(page: SourceArtifactPage): string {
  if ((page.items ?? []).length === 0) {
    return renderEmptyState(page.empty_state?.title ?? 'No artifacts', page.empty_state?.description ?? '');
  }

  const items = page.items
    .map((item) => {
      return `
        <article class="rounded-2xl border border-slate-200 bg-white p-5">
          <div class="flex flex-wrap items-center gap-2">
            ${statusBadge(item.artifact_kind)}
            ${statusBadge(item.compatibility_tier)}
            ${statusBadge(item.normalization_status)}
          </div>
          <dl class="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-700">
            <div><dt class="text-slate-500">Artifact ID</dt><dd class="mt-1 font-medium text-slate-900">${escapeHtml(item.id)}</dd></div>
            <div><dt class="text-slate-500">Object Key</dt><dd class="mt-1 font-medium text-slate-900">${escapeHtml(item.object_key ?? '-')}</dd></div>
            <div><dt class="text-slate-500">SHA256</dt><dd class="mt-1 font-medium text-slate-900">${escapeHtml(item.sha256 ?? '-')}</dd></div>
            <div><dt class="text-slate-500">Pages</dt><dd class="mt-1 font-medium text-slate-900">${escapeHtml(item.page_count ?? '-')}</dd></div>
          </dl>
        </article>
      `;
    })
    .join('');

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-semibold text-slate-900">Artifact Inspector</h3>
          <p class="mt-1 text-sm text-slate-500">${escapeHtml(page.revision?.id ?? '-')}</p>
        </div>
        <button type="button" data-runtime-action="refresh" class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Refresh</button>
      </div>
      ${items}
    </div>
  `;
}

function renderCommentThread(thread: SourceCommentThreadSummary): string {
  return `
    <article class="rounded-2xl border border-slate-200 bg-white p-5">
      <div class="flex flex-wrap items-center gap-2">
        ${statusBadge(thread.status)}
        ${thread.sync_status ? statusBadge(thread.sync_status) : ''}
      </div>
      <p class="mt-3 text-sm font-medium text-slate-900">${escapeHtml(thread.anchor?.label ?? thread.provider_comment_id ?? 'Comment Thread')}</p>
      <p class="mt-1 text-sm text-slate-600">${escapeHtml(thread.body_preview ?? 'No comment preview is available for this thread.')}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        ${pill('Author', thread.author_name ?? '-')}
        ${pill('Messages', thread.message_count)}
        ${pill('Replies', thread.reply_count)}
        ${pill('Last Synced', thread.last_synced_at ? new Date(thread.last_synced_at).toLocaleDateString() : '-')}
      </div>
    </article>
  `;
}

function renderCommentInspector(page: SourceCommentPage): string {
  if ((page.items ?? []).length === 0) {
    return renderEmptyState(page.empty_state?.title ?? 'No comments', page.empty_state?.description ?? '');
  }

  return `
    <div class="space-y-4">
      <div class="flex items-center justify-between gap-4">
        <div class="flex flex-wrap items-center gap-2">
          ${pill('Revision', page.revision?.id ?? '-')}
          ${pill('Sync Status', page.sync_status ?? '-')}
        </div>
        <button type="button" data-runtime-action="refresh" class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Refresh</button>
      </div>
      ${page.items.map(renderCommentThread).join('')}
      ${renderPagination(page.page_info, 'source-comment-page')}
    </div>
  `;
}

function renderSearchResults(page: SourceSearchResults, resultLinks: SourceManagementRuntimeLink[], routes: Record<string, string>): string {
  const appliedQuery = (page.applied_query ?? {}) as Phase13SourceSearchQuery;
  if ((page.items ?? []).length === 0) {
    return renderEmptyState(page.empty_state?.title ?? 'No search results', page.empty_state?.description ?? '');
  }

  const items = page.items
    .map((item: SourceSearchResultSummary, index: number) => {
      const runtimeLink = resultLinks[index]?.href?.trim();
      const fallbackLink = item.revision?.id
        ? routeWithID(routes.source_revision, item.revision.id)
        : routeWithID(routes.source_detail, item.source?.id ?? '');
      const href = runtimeLink || fallbackLink;
      return `
        <article class="rounded-2xl border border-slate-200 bg-white p-5">
          <div class="flex flex-wrap items-center gap-2">
            ${statusBadge(item.result_kind)}
            ${statusBadge(item.provider?.kind)}
          </div>
          <a href="${escapeHtml(href)}" class="mt-3 block text-base font-semibold text-slate-900 hover:text-slate-700">${escapeHtml(item.summary ?? item.source?.label ?? 'Search Result')}</a>
          <p class="mt-1 text-sm text-slate-600">${escapeHtml(item.source?.label ?? item.source?.id ?? '-')}</p>
          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            ${(item.matched_fields ?? []).map((field) => pill('Match', field)).join('')}
          </div>
        </article>
      `;
    })
    .join('');

  return `
    <div class="space-y-4">
      <form data-runtime-form="source-search" class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="grid gap-3 md:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
          <input type="search" name="q" value="${escapeHtml(appliedQuery.query ?? '')}" placeholder="Search sources" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          <input type="text" name="provider_kind" value="${escapeHtml(appliedQuery.provider_kind ?? '')}" placeholder="Provider" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          <input type="text" name="status" value="${escapeHtml(appliedQuery.status ?? '')}" placeholder="Status" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          <input type="text" name="result_kind" value="${escapeHtml(appliedQuery.result_kind ?? '')}" placeholder="Result kind" class="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900" />
          <label class="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input type="checkbox" name="has_comments"${booleanToChecked(appliedQuery.has_comments)} />
            Has comments
          </label>
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <button type="submit" class="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Search</button>
          <button type="button" data-runtime-action="clear-search-filters" class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Clear</button>
          <button type="button" data-runtime-action="refresh" class="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Refresh</button>
        </div>
      </form>
      ${items}
      ${renderPagination(page.page_info, 'source-search-page')}
    </div>
  `;
}

function renderPagination(
  pageInfo: { page?: number; page_size?: number; total_count?: number; has_more?: boolean } | undefined,
  action: string
): string {
  const page = Number(pageInfo?.page ?? 1);
  const totalCount = Number(pageInfo?.total_count ?? 0);
  const pageSize = Number(pageInfo?.page_size ?? 20);
  if (totalCount <= 0) {
    return '';
  }
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 1;
  return `
    <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
      <p>Page ${escapeHtml(page)} of ${escapeHtml(totalPages)}</p>
      <div class="flex gap-2">
        <button type="button" data-runtime-action="${escapeHtml(action)}" data-page="${escapeHtml(page - 1)}" class="rounded-full border border-slate-300 px-3 py-1.5 ${page <= 1 ? 'cursor-not-allowed opacity-50' : ''}" ${page <= 1 ? 'disabled' : ''}>Previous</button>
        <button type="button" data-runtime-action="${escapeHtml(action)}" data-page="${escapeHtml(page + 1)}" class="rounded-full border border-slate-300 px-3 py-1.5 ${page >= totalPages ? 'cursor-not-allowed opacity-50' : ''}" ${page >= totalPages ? 'disabled' : ''}>Next</button>
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
          void this.applyBrowserFilters({});
          return;
        }
        if (action === 'clear-search-filters') {
          event.preventDefault();
          void this.applySearchFilters({});
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
          bootstrapSourceDetailPage({
            apiBasePath,
            sourceId: sourceDocumentID,
            onStateChange: (state) => this.renderDetailState(state),
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
        this.root.innerHTML = renderBrowserTable(contract as SourceListPage, this.config.routes ?? {});
        return;
      case 'admin.sources.detail':
        this.root.innerHTML = renderDetailPanel(contract as SourceDetail, this.config.routes ?? {});
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
        this.root.innerHTML = renderSearchResults(
          contract as SourceSearchResults,
          this.model.result_links ?? [],
          this.config.routes ?? {}
        );
        return;
    }
  }

  private renderBrowserState(state: SourceManagementPageState<{ listSources: SourceListPage }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState('Loading source browser...');
      return;
    }
    if (state.error) {
      this.root.innerHTML = renderErrorState(state.error);
      return;
    }
    if (state.contracts?.listSources) {
      this.hasLiveContract = true;
      this.root.innerHTML = renderBrowserTable(state.contracts.listSources, this.config.routes ?? {});
    }
  }

  private renderDetailState(state: SourceManagementPageState<{ sourceDetail: SourceDetail }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState('Loading source detail...');
      return;
    }
    if (state.error) {
      this.root.innerHTML = renderErrorState(state.error);
      return;
    }
    if (state.contracts?.sourceDetail) {
      this.hasLiveContract = true;
      this.root.innerHTML = renderDetailPanel(state.contracts.sourceDetail, this.config.routes ?? {});
    }
  }

  private renderRevisionState(state: SourceManagementPageState<{ revisionDetail: SourceRevisionDetail }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState('Loading revision inspector...');
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
      this.root.innerHTML = renderLoadingState('Loading comments...');
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
      this.root.innerHTML = renderLoadingState('Loading artifacts...');
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

  private renderSearchState(state: SourceManagementPageState<{ searchResults: SourceSearchResults }>): void {
    if (state.loading && !this.hasLiveContract && this.model.contract) {
      return;
    }
    if (state.loading) {
      this.root.innerHTML = renderLoadingState('Loading search results...');
      return;
    }
    if (state.error) {
      this.root.innerHTML = renderErrorState(state.error);
      return;
    }
    if (state.contracts?.searchResults) {
      this.hasLiveContract = true;
      this.root.innerHTML = renderSearchResults(
        state.contracts.searchResults,
        this.model.result_links ?? [],
        this.config.routes ?? {}
      );
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

if (typeof document !== 'undefined') {
  onReady(() => {
    if (document.querySelector('[data-esign-page^="admin.sources."]')) {
      initSourceManagementRuntimePage();
    }
  });
}
