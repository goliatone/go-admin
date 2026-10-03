// Composition and coverage of one exact explorer selection. Pure string
// renderers over normalized insights: every value is escaped, only clamped
// numbers reach inline styles, and the chart and table views render the same
// text from one view model, so both always state the same numbers. Unknown,
// withheld and unavailable values never read as zero; each coverage state has
// its own label, glyph and pattern, so color is never the only cue. Example
// values are labelled as declarations, never as observed or verified data.

import { escapeAttribute, escapeHTML } from '../format.js';
import { renderRelativeTime } from '../schema/rich.js';
import { consoleStyleConfig } from '../style-config.js';
import type { ExploreSelection } from '../data-explorer/contract.js';
import type { ExplorerFailure } from '../data-explorer/transport.js';
import type { CoverageStatus, ExploreInsights, InsightBucket, InsightCoverage, InsightMetric } from './contract.js';
import {
  COVERAGE_STYLES,
  STATUS_VALUES,
  formatMeasure,
  formatPercent,
  localDayParts,
  longDay,
  metricValueText,
  monthLabel,
  nextLocalDay,
  periodText,
  reasonText,
  shareOf,
  shortDay,
} from './format.js';

export type InsightsDisplay = 'chart' | 'table';

export type InsightsEntry =
  | { status: 'loading' }
  | { status: 'ready'; value: ExploreInsights }
  | { status: 'failed'; failure: ExplorerFailure };

export type InsightsModel = {
  scope: string;
  /** The exact selection the explorer shows. */
  selection: ExploreSelection;
  entry: InsightsEntry | undefined;
  display: InsightsDisplay;
};

const styles = consoleStyleConfig;

const FAILURES: Record<string, string> = {
  unconfigured: 'Insights are not available on this installation.',
  invalid: 'These insights could not be read. Choose the scenario again.',
  expired: 'Your session expired. Reload the page to continue.',
  denied: 'You do not have access to insights for this selection.',
  gone: 'This selection is no longer available. Choose a current scenario or context.',
  stale: 'The data changed since this view loaded. Refresh to read the current state.',
  unavailable: 'Insights are temporarily unavailable.',
  timeout: 'The insights took too long to read.',
  network: 'The request could not reach the server.',
  malformed: 'The server returned insights this page cannot read.',
  failed: 'Insights failed.',
  canceled: 'The request was canceled.',
};

const RETRYABLE = new Set(['unavailable', 'timeout', 'network', 'malformed', 'failed', 'canceled']);
const REFRESHABLE = new Set(['stale', 'gone', 'invalid']);

export const DISPLAY_LABELS: Record<InsightsDisplay, string> = { chart: 'Chart', table: 'Table' };

export function muted(text: string): string {
  return `<span class="console-muted">${escapeHTML(text)}</span>`;
}

export function missing(text: string): string {
  return `<span class="console-insights__missing">${escapeHTML(text)}</span>`;
}

/**
 * Marks every example value, so a declaration never reads as a measurement.
 * The leading space keeps the tag a separate word for assistive technology.
 */
export const EXAMPLE_TAG = ' <span class="console-insights__tag" data-provenance="example" title="Declared by the provider, not observed">Example</span>';

/** "Show as" choice; both views state the same values. */
export function renderDisplayToggle(scope: string, display: InsightsDisplay, control = 'display'): string {
  const name = `${scope}-${control}`;
  const choices = (Object.keys(DISPLAY_LABELS) as InsightsDisplay[]).map((value) => {
    const id = `${name}-${value}`;
    return `<label class="console-explorer__choice" for="${escapeAttribute(id)}"><input type="radio" id="${escapeAttribute(id)}" name="${escapeAttribute(name)}" value="${value}" data-insights-control="${escapeAttribute(control)}" data-explorer-focus="${escapeAttribute(`insights:${control}:${value}`)}"${value === display ? ' checked' : ''}><span>${DISPLAY_LABELS[value]}</span></label>`;
  }).join('');
  return `<fieldset class="console-explorer__contexts console-insights__display"><legend class="console-explorer__legend">Show as</legend><div class="console-explorer__choices">${choices}</div></fieldset>`;
}

/** Failure notice: transient kinds offer Try again, drifted selections Refresh. */
export function renderInsightsFailure(reported: ExplorerFailure, retryAction = 'retry'): string {
  const kind = reported.kind in FAILURES ? reported.kind : 'failed';
  const retry = RETRYABLE.has(kind)
    ? `<button type="button" class="console-btn console-btn--sm" data-insights-action="${escapeAttribute(retryAction)}" data-explorer-focus="${escapeAttribute(`insights:${retryAction}`)}">Try again</button>`
    : REFRESHABLE.has(kind)
      ? '<button type="button" class="console-btn console-btn--sm" data-explorer-action="refresh" data-explorer-focus="refresh">Refresh</button>'
      : '';
  const tone = kind === 'denied' || kind === 'expired' ? 'error' : 'warning';
  return `<div class="console-callout console-explorer__state" data-tone="${tone}" role="alert" data-insights-failure="${kind}"><p>${escapeHTML(FAILURES[kind])}</p>${retry ? `<div class="console-explorer__state-actions">${retry}</div>` : ''}</div>`;
}

// ---------------------------------------------------------------------------
// Provenance

/** Where the shown values come from, in words; examples are never observations. */
export function provenanceText(insights: Pick<ExploreInsights, 'provenance' | 'selection'>): string {
  const selection = insights.selection;
  if (insights.provenance === 'example') {
    return 'Catalog example: values the provider declares for this scenario. They are not observed and not verified.';
  }
  if (insights.provenance !== 'observed') return 'Provenance unknown: these values may not be observed data.';
  if (selection.context === 'active') {
    return `Observed in the active data on ${selection.target_id} at generation ${selection.generation} (receipt ${selection.receipt_id}).`;
  }
  return `Observed in prepared receipt ${selection.receipt_id} (content revision ${selection.content_revision}) on ${selection.target_id}.`;
}

function completenessNotice(insights: ExploreInsights): string {
  if (insights.completeness === 'partial') {
    return '<div class="console-callout" data-tone="warning" data-insights-completeness="partial"><p>Partial: some values could not be read, so totals may be incomplete.</p></div>';
  }
  if (insights.completeness === 'unknown') {
    return '<p class="console-explorer__para console-muted" data-insights-completeness="unknown">Completeness unknown: the provider does not say whether every value was read.</p>';
  }
  return '';
}

function readDetails(insights: ExploreInsights): string {
  const parts = [
    insights.observed_at ? `Read ${renderRelativeTime(insights.observed_at, styles)}` : '',
    insights.metric_set_id ? `Metric set <code class="console-kv__mono">${escapeHTML(insights.metric_set_id)}</code>` : '',
  ].filter(Boolean);
  return parts.length > 0 ? `<p class="console-explorer__observed console-insights__read">${parts.join(' · ')}</p>` : '';
}

export function renderProvenance(insights: ExploreInsights): string {
  const provenance = insights.provenance === 'example' || insights.provenance === 'observed' ? insights.provenance : 'unknown';
  return `<p class="console-insights__provenance" data-provenance="${provenance}">${escapeHTML(provenanceText(insights))}</p>${readDetails(insights)}`;
}

// ---------------------------------------------------------------------------
// Composition view model: one set of strings for both views

type MetricRow = {
  metric: InsightMetric;
  value: string;
  known: boolean;
  period: string;
  denominator: string;
  sampling: string;
};

type BucketRow = { bucket: InsightBucket; value: string; known: boolean; share: string; width: number };

type DistributionModel = { row: MetricRow; buckets: BucketRow[]; scale: string; caption: string };

function metricRow(metric: InsightMetric): MetricRow {
  const known = metric.status === 'known' && metric.value !== null;
  return {
    metric,
    value: metricValueText(metric),
    known,
    period: periodText(metric.time_scope),
    denominator: metric.denominator === null ? '' : formatMeasure(metric.denominator, metric.kind === 'count' ? 'count' : 'sum'),
    sampling: metric.sampling_method && metric.sampling_method !== 'unknown' ? metric.sampling_method : '',
  };
}

/**
 * Bars show shares of a known denominator; without one they compare
 * categories against the largest value and no share is stated.
 */
function distributionModel(metric: InsightMetric): DistributionModel {
  const row = metricRow(metric);
  const denominator = metric.denominator !== null && metric.denominator > 0 ? metric.denominator : null;
  const largest = Math.max(0, ...metric.buckets.map((bucket) => (bucket.status === 'known' && bucket.value !== null ? bucket.value : 0)));
  const buckets = metric.buckets.map((bucket): BucketRow => {
    const known = bucket.status === 'known' && bucket.value !== null;
    if (!known) return { bucket, value: STATUS_VALUES[bucket.status === 'known' ? 'unknown' : bucket.status], known, share: '', width: 0 };
    const value = bucket.value as number;
    const share = shareOf(value, denominator);
    const ratio = denominator !== null ? value / denominator : largest > 0 ? value / largest : 0;
    return {
      bucket,
      value: formatMeasure(value, 'bucket'),
      known,
      share: share === null ? '' : formatPercent(share),
      width: Math.max(0, Math.min(100, Math.round(ratio * 1000) / 10)),
    };
  });
  const unit = metric.unit ? ` ${metric.unit}` : '';
  const scale = denominator !== null
    ? `Shares of ${formatMeasure(denominator, 'bucket')}${unit} (declared denominator).`
    : metric.denominator === 0
      ? 'The declared denominator is zero, so shares are not stated.'
      : 'Denominator unknown: bars compare categories with the largest one and no shares are stated.';
  const caption = [metric.population, row.period].filter(Boolean).join(' · ');
  return { row, buckets, scale, caption };
}

function statusAttribute(status: string): string {
  return escapeAttribute(status);
}

function valueWithUnit(row: MetricRow): string {
  if (!row.known) return missing(row.value);
  const unit = row.metric.unit ? ` <span class="console-insights__unit">${escapeHTML(row.metric.unit)}</span>` : '';
  return `<span class="console-insights__number">${escapeHTML(row.value)}</span>${unit}`;
}

function metricMeta(row: MetricRow): string[] {
  return [
    row.metric.population,
    row.period,
    row.denominator ? `Denominator ${row.denominator}${row.metric.unit ? ` ${row.metric.unit}` : ''}` : '',
    row.sampling ? `Sampling: ${row.sampling}` : '',
  ].filter(Boolean);
}

// ---------------------------------------------------------------------------
// Composition: chart view

function renderStat(row: MetricRow, example: boolean): string {
  const meta = metricMeta(row);
  return `<li class="console-insights__stat" data-metric-id="${escapeAttribute(row.metric.id)}" data-status="${statusAttribute(row.known ? 'known' : row.metric.status)}">
      <span class="console-insights__stat-label">${escapeHTML(row.metric.label)}${example ? EXAMPLE_TAG : ''}</span>
      <span class="console-insights__stat-value">${valueWithUnit(row)}</span>
      ${meta.length > 0 ? `<span class="console-insights__stat-meta">${escapeHTML(meta.join(' · '))}</span>` : ''}
    </li>`;
}

function renderBars(scope: string, model: DistributionModel, example: boolean, index: number): string {
  const { row } = model;
  // Metric IDs are provider text: element IDs use the position instead.
  const id = `${scope}-distribution-${index}`;
  const total = row.known ? `Total ${row.value}${row.metric.unit ? ` ${row.metric.unit}` : ''}` : `Total ${row.value.toLowerCase()}`;
  const body = !row.known
    ? `<p class="console-explorer__para">${missing(`${row.value}: categories are not shown.`)}</p>`
    : model.buckets.length === 0
      ? `<p class="console-explorer__para">${muted('No categories reported.')}</p>`
      : `<ul class="console-insights__bars" aria-labelledby="${escapeAttribute(id)}">${model.buckets.map((bucket) => `
          <li class="console-insights__bar-row" data-bucket-id="${escapeAttribute(bucket.bucket.id)}" data-status="${statusAttribute(bucket.known ? 'known' : bucket.bucket.status)}">
            <span class="console-insights__bar-label">${escapeHTML(bucket.bucket.label)}</span>
            <span class="console-insights__bar-track" aria-hidden="true"><span class="console-insights__bar-fill" style="width:${bucket.width}%"></span></span>
            <span class="console-insights__bar-value">${bucket.known ? `<span class="console-insights__number">${escapeHTML(bucket.value)}</span>` : missing(bucket.value)}${bucket.share ? ` <span class="console-muted">(${escapeHTML(bucket.share)})</span>` : ''}</span>
          </li>`).join('')}
        </ul>`;
  return `<figure class="console-insights__distribution" data-metric-id="${escapeAttribute(row.metric.id)}" data-status="${statusAttribute(row.known ? 'known' : row.metric.status)}">
      <figcaption class="console-insights__figcaption"><span class="console-insights__figure-title" id="${escapeAttribute(id)}">${escapeHTML(row.metric.label)}</span>${example ? EXAMPLE_TAG : ''}<span class="console-muted">${escapeHTML([total, model.caption].filter(Boolean).join(' · '))}</span></figcaption>
      ${body}
      ${row.known && model.buckets.length > 0 ? `<p class="console-insights__scale console-muted">${escapeHTML(model.scale)}${row.sampling ? ` Sampling: ${escapeHTML(row.sampling)}.` : ''}</p>` : ''}
    </figure>`;
}

// ---------------------------------------------------------------------------
// Composition: table view

export function cell(label: string, content: string, extra = ''): string {
  return `<td data-label="${escapeAttribute(label)}"${extra}>${content}</td>`;
}

function renderTotalsTable(rows: MetricRow[], example: boolean): string {
  const body = rows.map((row) => `<tr data-metric-id="${escapeAttribute(row.metric.id)}" data-status="${statusAttribute(row.known ? 'known' : row.metric.status)}">${[
    cell('Metric', `<span class="console-cell-title">${escapeHTML(row.metric.label)}</span>`),
    cell('Value', row.known ? `<span class="console-insights__number">${escapeHTML(row.value)}</span>` : missing(row.value), ' class="console-insights__numeric"'),
    cell('Unit', row.metric.unit ? escapeHTML(row.metric.unit) : muted('—')),
    cell('Population', row.metric.population ? escapeHTML(row.metric.population) : muted('Not declared')),
    cell('Period', row.period ? escapeHTML(row.period) : muted('Unknown')),
    cell('Denominator', row.denominator ? escapeHTML(row.denominator) : muted(row.known ? 'Not declared' : '—')),
    cell('Sampling', row.sampling ? escapeHTML(row.sampling) : muted('Not stated')),
  ].join('')}</tr>`).join('');
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="totals"><caption class="console-explorer__caption">${example ? 'Totals (example values declared by the provider, not observed)' : 'Totals'}</caption><thead><tr><th scope="col">Metric</th><th scope="col">Value</th><th scope="col">Unit</th><th scope="col">Population</th><th scope="col">Period</th><th scope="col">Denominator</th><th scope="col">Sampling</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderDistributionTable(model: DistributionModel, example: boolean): string {
  const { row } = model;
  const total = row.known ? `Total ${row.value}${row.metric.unit ? ` ${row.metric.unit}` : ''}` : `Total ${row.value.toLowerCase()}`;
  const caption = `${row.metric.label}${example ? ' (example values)' : ''} · ${[total, model.caption].filter(Boolean).join(' · ')}`;
  if (!row.known || model.buckets.length === 0) {
    const note = !row.known ? `${row.value}: categories are not shown.` : 'No categories reported.';
    return `<div class="console-insights__distribution-table" data-metric-id="${escapeAttribute(row.metric.id)}"><p class="console-explorer__caption">${escapeHTML(caption)}</p><p class="console-explorer__para">${row.known ? muted(note) : missing(note)}</p></div>`;
  }
  const body = model.buckets.map((bucket) => `<tr data-bucket-id="${escapeAttribute(bucket.bucket.id)}" data-status="${statusAttribute(bucket.known ? 'known' : bucket.bucket.status)}">${[
    cell('Category', escapeHTML(bucket.bucket.label)),
    cell('Value', bucket.known ? `<span class="console-insights__number">${escapeHTML(bucket.value)}</span>` : missing(bucket.value), ' class="console-insights__numeric"'),
    cell('Share', bucket.share ? escapeHTML(bucket.share) : muted('—'), ' class="console-insights__numeric"'),
  ].join('')}</tr>`).join('');
  return `<div class="console-explorer__table-wrap console-insights__distribution-table" data-metric-id="${escapeAttribute(row.metric.id)}"><table class="console-table console-insights__table" data-insights-table="distribution"><caption class="console-explorer__caption">${escapeHTML(caption)}</caption><thead><tr><th scope="col">Category</th><th scope="col">Value</th><th scope="col">Share</th></tr></thead><tbody>${body}</tbody></table><p class="console-insights__scale console-muted">${escapeHTML(model.scale)}${row.sampling ? ` Sampling: ${escapeHTML(row.sampling)}.` : ''}</p></div>`;
}

export function renderComposition(scope: string, insights: ExploreInsights, display: InsightsDisplay): string {
  const totals = insights.metrics.filter((metric) => metric.kind !== 'distribution').map(metricRow);
  const distributions = insights.metrics.filter((metric) => metric.kind === 'distribution').map(distributionModel);
  const heading = `<h5 class="console-insights__heading" id="${escapeAttribute(`${scope}-composition`)}">Composition</h5>`;
  if (totals.length === 0 && distributions.length === 0) {
    return `<section class="console-insights__group" aria-labelledby="${escapeAttribute(`${scope}-composition`)}" data-insights-group="composition">${heading}<p class="console-explorer__para">${muted('No metrics reported for this selection.')}</p></section>`;
  }
  const example = insights.provenance === 'example';
  const content = display === 'table'
    ? `${totals.length > 0 ? renderTotalsTable(totals, example) : ''}${distributions.map((model) => renderDistributionTable(model, example)).join('')}`
    : `${totals.length > 0 ? `<ul class="console-insights__stats" aria-label="${example ? 'Totals (example values)' : 'Totals'}">${totals.map((row) => renderStat(row, example)).join('')}</ul>` : ''}${distributions.map((model, index) => renderBars(scope, model, example, index)).join('')}`;
  return `<section class="console-insights__group" aria-labelledby="${escapeAttribute(`${scope}-composition`)}" data-insights-group="composition" data-insights-display="${display}">${heading}${content}</section>`;
}

// ---------------------------------------------------------------------------
// Coverage

export type CoverageDay = { day: string; status: CoverageStatus | 'not_reported'; entry: InsightCoverage | undefined };

/** Reported days with the gaps between them marked "not reported", oldest first. */
export function coverageDays(coverage: InsightCoverage[]): CoverageDay[] {
  if (coverage.length === 0) return [];
  const byDay = new Map(coverage.map((entry) => [entry.local_day, entry]));
  const last = coverage[coverage.length - 1].local_day;
  const days: CoverageDay[] = [];
  // The normalizer bounds the reported span to the service's 90-day window.
  for (let day = coverage[0].local_day; day <= last && days.length <= 92; day = nextLocalDay(day)) {
    const entry = byDay.get(day);
    days.push({ day, status: entry ? entry.status : 'not_reported', entry });
  }
  return days;
}

export function coverageTimezone(coverage: InsightCoverage[]): string {
  const zones = new Set(coverage.map((entry) => entry.timezone).filter(Boolean));
  return zones.size === 1 ? [...zones][0] : '';
}

export function evidenceText(entry: InsightCoverage | undefined): string {
  if (!entry) return '';
  const evidence = entry.evidence;
  if (evidence) {
    return [evidence.verification_id ? `Verification ${evidence.verification_id}` : 'Provider evidence', `ref ${evidence.ref}`].join(' · ');
  }
  return reasonText(entry.reason);
}

function dayDescription(day: CoverageDay, timezone: string): string {
  const style = COVERAGE_STYLES[day.status];
  const zone = !timezone && day.entry?.timezone ? ` (${day.entry.timezone})` : '';
  return `${longDay(day.day)}${zone}: ${style.label}`;
}

export function renderLegend(days: CoverageDay[]): string {
  const counts = new Map<string, number>();
  days.forEach((day) => counts.set(day.status, (counts.get(day.status) || 0) + 1));
  const items = (Object.keys(COVERAGE_STYLES) as Array<keyof typeof COVERAGE_STYLES>)
    .filter((status) => counts.has(status))
    .map((status) => {
      const count = counts.get(status) || 0;
      return `<li data-status="${status}"><span class="console-insights__swatch" data-status="${status}" aria-hidden="true">${escapeHTML(COVERAGE_STYLES[status].glyph)}</span><span>${escapeHTML(COVERAGE_STYLES[status].label)}</span><span class="console-muted">${count} ${count === 1 ? 'day' : 'days'}</span></li>`;
    }).join('');
  return `<ul class="console-insights__legend" aria-label="Coverage legend">${items}</ul>`;
}

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function renderCalendar(scope: string, days: CoverageDay[], timezone: string): string {
  const months: Array<{ key: string; label: string; days: CoverageDay[] }> = [];
  days.forEach((day) => {
    const { year, month } = localDayParts(day.day);
    const key = `${year}-${month}`;
    const current = months[months.length - 1];
    if (current?.key === key) current.days.push(day);
    else months.push({ key, label: monthLabel(year, month), days: [day] });
  });
  return `<div class="console-insights__months">${months.map((month, index) => {
    const id = `${scope}-coverage-month-${index}`;
    const cells = month.days.map((day, position) => {
      const style = COVERAGE_STYLES[day.status];
      const { date, weekday } = localDayParts(day.day);
      // Monday-first columns; only a month's first shown day needs placing.
      const column = position === 0 ? ` console-insights__day--col-${((weekday + 6) % 7) + 1}` : '';
      const evidence = evidenceText(day.entry);
      const title = [dayDescription(day, timezone), evidence].filter(Boolean).join(' · ');
      return `<li class="console-insights__day${column}" data-status="${day.status}" data-local-day="${escapeAttribute(day.day)}" title="${escapeAttribute(title)}"><span class="console-insights__day-number" aria-hidden="true">${date}</span><span class="console-insights__day-glyph" aria-hidden="true">${escapeHTML(style.glyph)}</span><span class="console-sr-only">${escapeHTML(dayDescription(day, timezone))}</span></li>`;
    }).join('');
    return `<section class="console-insights__month" aria-labelledby="${escapeAttribute(id)}"><h6 class="console-insights__month-title" id="${escapeAttribute(id)}">${escapeHTML(month.label)}</h6><div class="console-insights__weekdays" aria-hidden="true">${WEEKDAY_HEADERS.map((name) => `<span>${name}</span>`).join('')}</div><ol class="console-insights__days">${cells}</ol></section>`;
  }).join('')}</div>`;
}

function renderCoverageTable(days: CoverageDay[], timezone: string): string {
  const zoneColumn = !timezone;
  const body = days.map((day) => {
    const style = COVERAGE_STYLES[day.status];
    const evidence = evidenceText(day.entry);
    return `<tr data-local-day="${escapeAttribute(day.day)}" data-status="${day.status}">${[
      cell('Local day', `<span class="console-cell-main"><span class="console-cell-title">${escapeHTML(shortDay(day.day))}</span><code class="console-cell-sub console-kv__mono">${escapeHTML(day.day)}</code></span>`),
      zoneColumn ? cell('Timezone', day.entry?.timezone ? escapeHTML(day.entry.timezone) : muted('Unknown')) : '',
      cell('Coverage', `<span class="console-insights__state" data-status="${day.status}"><span class="console-insights__swatch" data-status="${day.status}" aria-hidden="true">${escapeHTML(style.glyph)}</span>${escapeHTML(style.label)}</span>`),
      cell('Evidence', evidence ? escapeHTML(evidence) : muted('None')),
    ].join('')}</tr>`;
  }).join('');
  const caption = timezone ? `Coverage by local day (${timezone})` : 'Coverage by local day';
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="coverage"><caption class="console-explorer__caption">${escapeHTML(caption)}</caption><thead><tr><th scope="col">Local day</th>${zoneColumn ? '<th scope="col">Timezone</th>' : ''}<th scope="col">Coverage</th><th scope="col">Evidence</th></tr></thead><tbody>${body}</tbody></table></div>`;
}

function coverageNote(insights: ExploreInsights, timezone: string): string {
  const zone = timezone ? `Local days in ${timezone}. ` : '';
  const basis = insights.selection.context === 'catalog_example'
    ? 'A catalog example is never coverage: its expected dates read as not covered until a verification of an exact receipt covers them.'
    : 'Covered days are backed by verification evidence for exactly this selection; expected or example dates never count as coverage.';
  return `<p class="console-explorer__para console-muted">${escapeHTML(zone + basis)}</p>`;
}

export function renderCoverage(scope: string, insights: ExploreInsights, display: InsightsDisplay): string {
  const heading = `<h5 class="console-insights__heading" id="${escapeAttribute(`${scope}-coverage`)}">Coverage</h5>`;
  const days = coverageDays(insights.coverage);
  const timezone = coverageTimezone(insights.coverage);
  const content = days.length === 0
    ? `<p class="console-explorer__para" data-insights-coverage="none">${muted('No coverage reported for this period.')}</p>`
    : display === 'table'
      ? renderCoverageTable(days, timezone)
      : `${renderLegend(days)}${renderCalendar(scope, days, timezone)}`;
  return `<section class="console-insights__group" aria-labelledby="${escapeAttribute(`${scope}-coverage`)}" data-insights-group="coverage" data-insights-display="${display}">${heading}${coverageNote(insights, timezone)}${content}</section>`;
}

// ---------------------------------------------------------------------------
// Section

/** Loading, failure and withheld states that replace the insights content. */
function renderEntryState(entry: InsightsEntry | undefined): string {
  if (!entry || entry.status === 'loading') return '<div class="console-explorer__loading" role="status" aria-busy="true">Loading insights…</div>';
  if (entry.status === 'failed') return renderInsightsFailure(entry.failure);
  if (entry.value.state === 'suppressed') {
    return '<div class="console-callout console-explorer__state" data-tone="info" data-insights-state="suppressed"><p>Insights for this selection are hidden by policy.</p></div>';
  }
  if (entry.value.state === 'unsupported') {
    return '<div class="console-callout console-explorer__state" data-tone="info" data-insights-state="unsupported"><p>This dataset’s provider does not offer composition or coverage insights for this selection. Descriptions and record previews remain available.</p></div>';
  }
  return '';
}

/** The Insights section body for the explorer's shown selection. */
export function renderInsights(model: InsightsModel): string {
  const toolbar = `<div class="console-insights__toolbar"><p class="console-explorer__para console-muted">Composition and coverage of the data shown above, read on demand and bounded by the provider.</p>${renderDisplayToggle(model.scope, model.display)}</div>`;
  const state = renderEntryState(model.entry);
  if (state || model.entry?.status !== 'ready') return `<div class="console-insights" data-insights-view="insights">${toolbar}${state}</div>`;
  const insights = model.entry.value;
  const empty = insights.state === 'empty'
    ? '<p class="console-explorer__para" data-insights-state="empty">This selection contains no records.</p>'
    : '';
  return `<div class="console-insights" data-insights-view="insights">
      ${toolbar}
      ${renderProvenance(insights)}
      ${completenessNotice(insights)}${empty}
      ${renderComposition(model.scope, insights, model.display)}
      ${renderCoverage(model.scope, insights, model.display)}
    </div>`;
}
