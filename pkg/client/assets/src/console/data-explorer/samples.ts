// Bounded record previews: one page of provider samples per entity, and a
// depth-one related page shown in a drawer. Cells keep their declared state:
// a withheld or unknown value never reads as null or empty, and null never
// reads as zero. Every value is escaped; long values are clipped for display
// with the full value kept in the title.

import { escapeAttribute, escapeHTML } from '../format.js';
import { renderRelativeTime } from '../schema/rich.js';
import { consoleStyleConfig } from '../style-config.js';
import type { ExploreCell, ExploreEntity, ExploreField, ExploreRelationship, ExploreSamples } from './contract.js';
import type { ExplorerFailure } from './transport.js';

/**
 * One page of a preview; `start` is the 0-based offset of its first row. A
 * page reached through the pager keeps its pager while it loads (`paged`), so
 * keyboard focus stays on Previous/Next.
 */
export type SamplePage =
  | { status: 'loading'; page: number; start: number; paged?: boolean }
  | { status: 'ready'; page: number; start: number; value: ExploreSamples; hasNext: boolean }
  | { status: 'failed'; page: number; start: number; failure: ExplorerFailure };

const DISPLAY_LIMIT = 240;

const FAILURES: Record<string, string> = {
  invalid: 'This preview could not be read. Choose the scenario again.',
  expired: 'Your session expired. Reload the page to continue.',
  denied: 'You do not have access to these records.',
  gone: 'These records are no longer available.',
  stale: 'The data changed since this preview loaded. Refresh to read the current records.',
  unavailable: 'Record previews are temporarily unavailable.',
  timeout: 'The preview took too long.',
  network: 'The preview could not reach the server.',
  malformed: 'The server returned records this page cannot read.',
  canceled: 'The preview was canceled.',
  unconfigured: 'Record previews are not available on this installation.',
  failed: 'The preview failed.',
};

const RETRYABLE = new Set(['unavailable', 'timeout', 'network', 'malformed', 'failed', 'canceled']);
/** The selection or its description changed: read both again. */
const REFRESHABLE = new Set(['stale', 'gone', 'invalid']);

function clip(raw: string): string {
  if (raw.length <= DISPLAY_LIMIT) return escapeHTML(raw);
  return `<span title="${escapeAttribute(raw)}">${escapeHTML(raw.slice(0, DISPLAY_LIMIT))}…</span>`;
}

function marker(kind: string, label: string, description: string): string {
  return `<span class="console-explorer__cell console-explorer__cell--${kind}" title="${escapeAttribute(description)}">${escapeHTML(label)}<span class="console-sr-only"> (${escapeHTML(description)})</span></span>`;
}

/** One cell by its declared state and column type. */
export function renderCell(cell: ExploreCell | undefined, column: ExploreField): string {
  switch (cell?.state) {
    case 'redacted':
      return marker('redacted', 'Withheld', 'value withheld by policy');
    case 'null':
      return marker('null', 'null', 'no value recorded');
    case 'value':
      break;
    default:
      return marker('unknown', 'Unknown', 'value not available');
  }
  const value = cell.value;
  if (value === null) return marker('null', 'null', 'no value recorded');
  if (value === '') return marker('empty', 'Empty', 'empty text');
  if (typeof value === 'boolean') return `<code class="console-kv__mono">${value ? 'true' : 'false'}</code>`;
  if (typeof value === 'number' && (column.type === 'integer' || column.type === 'number')) {
    return `<span class="console-explorer__number">${escapeHTML(value.toLocaleString())}</span>`;
  }
  return clip(String(value));
}

function columnHeader(column: ExploreField): string {
  const unit = column.unit ? `<span class="console-explorer__unit">${escapeHTML(column.unit)}</span>` : '';
  const title = [column.description, column.type].filter(Boolean).join(' · ');
  return `<th scope="col" title="${escapeAttribute(title)}"><span class="console-explorer__column">${escapeHTML(column.label)}</span>${unit}</th>`;
}

function relatedButtons(entity: ExploreEntity, recordKey: string, rowID: string, relationships: ExploreRelationship[]): string {
  return relationships.map((relationship) => {
    const focus = `related:${entity.id}:${recordKey}:${relationship.id}`;
    return `<button type="button" class="console-btn console-btn--sm" data-explorer-action="related" data-entity-id="${escapeAttribute(entity.id)}" data-record-key="${escapeAttribute(recordKey)}" data-relationship-id="${escapeAttribute(relationship.id)}" data-explorer-focus="${escapeAttribute(focus)}" aria-describedby="${escapeAttribute(rowID)}">${escapeHTML(relationship.label)}</button>`;
  }).join('');
}

/** Sample table; related buttons appear only for the entity's declared relationships. */
export function renderSampleTable(scope: string, entity: ExploreEntity, samples: ExploreSamples, relationships: ExploreRelationship[], caption: string): string {
  const columns = samples.columns;
  const related = relationships.length > 0;
  const head = `${columns.map(columnHeader).join('')}${related ? '<th scope="col">Related</th>' : ''}`;
  const rows = samples.rows.map((row, rowIndex) => {
    // Record keys are provider text: element IDs use the row position instead.
    const rowID = `${scope}-row-${entity.id}-${rowIndex}`;
    const cells = columns.map((column, index) => {
      const content = renderCell(row.cells[column.id], column);
      // Narrow row cards show the label (and unit) beside each value.
      const label = escapeAttribute(column.unit ? `${column.label} (${column.unit})` : column.label);
      return index === 0
        ? `<td data-label="${label}" id="${escapeAttribute(rowID)}">${content}</td>`
        : `<td data-label="${label}">${content}</td>`;
    }).join('');
    const actions = related ? `<td data-label="Related" class="console-explorer__related-cell">${relatedButtons(entity, row.record_key, rowID, relationships)}</td>` : '';
    return `<tr data-record-key="${escapeAttribute(row.record_key)}">${cells}${actions}</tr>`;
  }).join('');
  return `<div class="console-explorer__table-wrap"><table class="console-table console-explorer__table console-explorer__samples"><caption class="console-sr-only">${escapeHTML(caption)}</caption><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function provenanceText(samples: ExploreSamples): string {
  const method = samples.sampling_method ? `Sampling: ${samples.sampling_method}. ` : '';
  const source = samples.provenance === 'observed'
    ? 'Observed records.'
    : samples.provenance === 'example' ? 'Example records declared by the provider, not observed data.' : 'Provenance unknown.';
  return method + source;
}

function rangeText(page: Extract<SamplePage, { status: 'ready' }>): string {
  const rows = page.value.rows.length;
  if (rows === 0) return 'No records';
  const first = page.start + 1;
  const last = page.start + rows;
  const total = page.value.total;
  return total === null
    ? `Records ${first.toLocaleString()}–${last.toLocaleString()}; total unknown`
    : `Records ${first.toLocaleString()}–${last.toLocaleString()} of ${total.toLocaleString()}`;
}

/** Unavailable pager controls stay focusable (aria-disabled) so focus never drops. */
function pagerButtons(previous: boolean, next: boolean, attributes: string, focusPrefix: string): string {
  const state = (enabled: boolean): string => (enabled ? '' : ' aria-disabled="true"');
  return `<div class="console-explorer__pager" role="group" aria-label="Pages">
    <button type="button" class="console-btn console-btn--sm" data-explorer-action="page-previous" ${attributes} data-explorer-focus="${escapeAttribute(`${focusPrefix}:previous`)}"${state(previous)}>Previous</button>
    <button type="button" class="console-btn console-btn--sm" data-explorer-action="page-next" ${attributes} data-explorer-focus="${escapeAttribute(`${focusPrefix}:next`)}"${state(next)}>Next</button>
  </div>`;
}

function pager(page: Extract<SamplePage, { status: 'ready' }>, attributes: string, focusPrefix: string): string {
  const previous = page.page > 0;
  if (!previous && !page.hasNext) return '';
  return pagerButtons(previous, page.hasNext, attributes, focusPrefix);
}

function stateNotice(samples: ExploreSamples, entityLabel: string): string {
  switch (samples.state) {
    case 'unsupported':
      return '<div class="console-callout" data-tone="info" data-explorer-sample-state="unsupported"><p>This provider does not offer sample records for this selection.</p></div>';
    case 'suppressed':
      return '<div class="console-callout" data-tone="info" data-explorer-sample-state="suppressed"><p>Records for this selection are hidden by policy.</p></div>';
    default:
      return samples.rows.length === 0
        ? `<p class="console-explorer__para" data-explorer-sample-state="empty">No ${escapeHTML(entityLabel)} records in this selection.</p>`
        : '';
  }
}

function completenessNotice(samples: ExploreSamples): string {
  if (samples.completeness === 'partial') {
    return '<div class="console-callout" data-tone="warning"><p>Partial preview: some records or values were left out.</p></div>';
  }
  if (samples.completeness === 'unknown') {
    return '<p class="console-explorer__para console-muted" data-explorer-completeness="unknown">Completeness unknown: the provider does not say whether records or values were left out.</p>';
  }
  return '';
}

/** When this page was read (its own observation time, not the description's). */
function readTime(samples: ExploreSamples): string {
  return samples.observed_at ? ` Read ${renderRelativeTime(samples.observed_at, consoleStyleConfig)}.` : '';
}

function failureNotice(failure: ExplorerFailure, attributes: string, focus: string): string {
  const message = FAILURES[failure.kind] || FAILURES.failed;
  const retry = RETRYABLE.has(failure.kind)
    ? `<div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="page-retry" ${attributes} data-explorer-focus="${escapeAttribute(`${focus}:retry`)}">Try again</button></div>`
    : REFRESHABLE.has(failure.kind)
      ? `<div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button></div>`
      : '';
  const tone = failure.kind === 'denied' || failure.kind === 'expired' ? 'error' : 'warning';
  return `<div class="console-callout console-explorer__state" data-tone="${tone}" role="alert" data-explorer-failure="${escapeAttribute(failure.kind in FAILURES ? failure.kind : 'failed')}"><p>${escapeHTML(message)}</p>${retry}</div>`;
}

/** Body of one page (loading, failure, withheld/empty notice or table with pager). */
export function renderPageBody(
  scope: string,
  entity: ExploreEntity,
  page: SamplePage,
  relationships: ExploreRelationship[],
  attributes: string,
  focus: string,
): string {
  if (page.status === 'loading') {
    const loading = '<div class="console-explorer__loading" role="status" aria-busy="true">Loading records…</div>';
    return page.paged ? `${loading}<div class="console-explorer__pager-row"><span></span>${pagerButtons(false, false, attributes, focus)}</div>` : loading;
  }
  if (page.status === 'failed') return failureNotice(page.failure, attributes, focus);
  const samples = page.value;
  const notice = stateNotice(samples, entity.label);
  const available = samples.state === 'available' || samples.state === 'empty';
  const table = available && samples.rows.length > 0
    ? renderSampleTable(scope, entity, samples, relationships, `${entity.label} records`)
    : '';
  const footer = available && samples.rows.length > 0
    ? `<div class="console-explorer__pager-row"><span class="console-muted" role="status">${escapeHTML(rangeText(page))}</span>${pager(page, attributes, focus)}</div>`
    : '';
  return `<p class="console-explorer__para console-muted">${escapeHTML(provenanceText(samples))}${readTime(samples)}</p>${completenessNotice(samples)}${notice}${table}${footer}`;
}

/** Preview control and, once opened, the entity's current page. */
export function renderEntityPreview(scope: string, entity: ExploreEntity, page: SamplePage | undefined, configured: boolean): string {
  const attributes = `data-entity-id="${escapeAttribute(entity.id)}"`;
  const focus = `samples:${entity.id}`;
  if (!configured) return '';
  if (!page) {
    return `<div class="console-explorer__preview-toggle"><button type="button" class="console-btn console-btn--sm" data-explorer-action="samples" ${attributes} data-explorer-focus="${escapeAttribute(`${focus}:open`)}">Preview ${escapeHTML(entity.label)} records</button><span class="console-muted">Up to 25 representative records for the data shown above. Reading never prepares or changes data.</span></div>`;
  }
  const relationships = entity.relationships;
  return `
    <section class="console-explorer__preview" aria-labelledby="${escapeAttribute(`${scope}-preview-${entity.id}`)}" data-explorer-preview="${escapeAttribute(entity.id)}">
      <div class="console-explorer__preview-head">
        <h5 class="console-explorer__label" id="${escapeAttribute(`${scope}-preview-${entity.id}`)}">Sample ${escapeHTML(entity.label)} records</h5>
        <button type="button" class="console-btn console-btn--sm console-btn--ghost" data-explorer-action="samples-hide" ${attributes} data-explorer-focus="${escapeAttribute(`${focus}:hide`)}">Hide records</button>
      </div>
      ${renderPageBody(scope, entity, page, relationships, attributes, focus)}
    </section>
  `;
}

/** Drawer body for a depth-one related page. Related rows offer no further traversal. */
export function renderRelatedBody(
  scope: string,
  source: ExploreEntity,
  target: ExploreEntity | undefined,
  recordKey: string,
  page: SamplePage,
): string {
  const entity = target || source;
  const attributes = 'data-related-page';
  return `
    <div class="console-drawer__body console-explorer__related-body" data-explorer-related-body>
      <p class="console-explorer__para console-muted">Declared ${escapeHTML(entity.label)} records related to ${escapeHTML(source.label)} record <code class="console-kv__mono">${escapeHTML(recordKey)}</code>. One level only.</p>
      ${renderPageBody(scope, entity, page, [], attributes, 'related')}
    </div>
  `;
}
