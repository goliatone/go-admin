// Two-side comparison controls and views. The explorer's shown selection is
// compared with another exact selection the actor already received: another
// scenario context of the same dataset and target, or the target's active
// data pinned at its generation. A is the baseline and B the compared side;
// every difference is B − A as computed by the server for a comparable pair
// of observed values. This module never derives a difference: it only
// formats the server's delta and states the server's reason otherwise.

import { escapeAttribute, escapeHTML, shortIdentifier } from '../format.js';
import { renderRelativeTime } from '../schema/rich.js';
import { consoleStyleConfig } from '../style-config.js';
import type { CatalogDataset } from '../data-explorer/catalog.js';
import { selectionKey, type ExploreSelection, type ExploreUsage } from '../data-explorer/contract.js';
import type { ExplorerFailure } from '../data-explorer/transport.js';
import type { ExploreInsights, InsightBucket, InsightDeclarations, InsightMetric, InsightMetricComparison, SelectionComparison } from './contract.js';
import {
  COVERAGE_STYLES,
  STATUS_VALUES,
  formatMeasure,
  formatSigned,
  formatSignedPercent,
  nextLocalDay,
  periodText,
  reasonText,
  shortDay,
} from './format.js';
import {
  EXAMPLE_TAG,
  cell,
  coverageDays,
  coverageTimezone,
  evidenceText,
  missing,
  muted,
  provenanceText,
  renderCalendar,
  renderDisplayToggle,
  renderInsightsFailure,
  renderLegend,
  type CoverageDay,
  type InsightsDisplay,
} from './view.js';

export type CompareSide = 'a' | 'b';

export type CompareCandidate = {
  key: string;
  selection: ExploreSelection;
  /** The target's active data, pinned at its generation. */
  active: boolean;
  label: string;
};

export type SideDescription = {
  /** Scenario title (declared, else the lifecycle label). */
  title: string;
  context: string;
  /** Receipt, content revision, generation and target. */
  identity: string;
  /** Dataset label when it is not the shown selection's dataset. */
  dataset: string;
};

export type CompareEntry =
  | { status: 'loading' }
  | { status: 'ready'; value: SelectionComparison }
  | { status: 'failed'; failure: ExplorerFailure };

export type ComparePair = { left: ExploreSelection; right: ExploreSelection };

/**
 * A comparison reads with the metric set learned for the shown selection:
 * while that read is pending or failed, or when it offers no insights, the
 * comparison waits or explains why it cannot run.
 */
export type ComparePrerequisite =
  | { status: 'loading' }
  | { status: 'failed'; failure: ExplorerFailure }
  | { status: 'blocked'; message: string };

export type CompareModel = {
  scope: string;
  /** The selection the explorer shows. */
  shown: ExploreSelection;
  candidates: CompareCandidate[];
  /** Chosen candidate key; '' when none. */
  choice: string;
  /** The pinned request: A (left, the baseline) and B (right). */
  pair: ComparePair | undefined;
  describe: (selection: ExploreSelection) => SideDescription;
  entry: CompareEntry | undefined;
  display: InsightsDisplay;
  /** Why the pinned comparison can no longer be read; the operator must choose again. */
  stale?: string;
  /** The snapshot offers a current replacement for the stale side. */
  staleCurrent?: boolean;
  prerequisite?: ComparePrerequisite;
};

const styles = consoleStyleConfig;

export const CONTEXT_LABELS: Record<ExploreSelection['context'], string> = {
  catalog_example: 'Catalog example',
  prepared: 'Prepared receipt',
  active: 'Active data',
};

const USAGE_KINDS: Record<ExploreUsage['kind'], string> = { screen: 'Screen', report: 'Report', workflow: 'Workflow', target: 'Managed target' };
const PHASES: Record<string, string> = { prepare: 'Prepare', verify: 'Verify', activate: 'Activate' };

export type SelectionTitle = (selection: ExploreSelection) => string;

/** Scenario title for a selection from the catalog rows, else its identifiers. */
export function catalogTitle(catalog: CatalogDataset[]): SelectionTitle {
  return (selection) => {
    const dataset = catalog.find((candidate) => candidate.provider === selection.dataset.provider
      && candidate.datasetId === selection.dataset.id && candidate.version === selection.dataset.version);
    const scenario = dataset?.scenarios.find((candidate) => candidate.scenarioId === selection.scenario.id && candidate.version === selection.scenario.version);
    return scenario?.label || `${selection.scenario.id} v${selection.scenario.version}`;
  };
}

function datasetLabel(selection: ExploreSelection): string {
  return `${selection.dataset.provider}/${selection.dataset.id} v${selection.dataset.version}`;
}

function sameDataset(a: ExploreSelection, b: ExploreSelection): boolean {
  return a.dataset.provider === b.dataset.provider && a.dataset.id === b.dataset.id
    && a.dataset.version === b.dataset.version && a.dataset.digest === b.dataset.digest;
}

/** Exact identity of one side, in words. */
export function describeSelection(selection: ExploreSelection, shown: ExploreSelection, title: SelectionTitle): SideDescription {
  const identity = [
    selection.receipt_id ? `receipt ${shortIdentifier(selection.receipt_id)}` : 'no receipt',
    selection.content_revision ? `content revision ${selection.content_revision}` : '',
    selection.generation !== undefined ? `generation ${selection.generation}` : '',
    `target ${selection.target_id}`,
  ].filter(Boolean).join(' · ');
  return {
    title: title(selection),
    context: CONTEXT_LABELS[selection.context],
    identity,
    dataset: sameDataset(selection, shown) ? '' : datasetLabel(selection),
  };
}

/**
 * What the shown selection can be compared with: the target's active data
 * (pinned at its generation) and every other catalog example or prepared
 * receipt of the dataset's scenarios on the same target, each exactly as the
 * snapshot offers it. The shown selection itself is never a candidate.
 */
export function compareCandidates(dataset: CatalogDataset, shown: ExploreSelection, active: ExploreSelection | undefined, title: SelectionTitle): CompareCandidate[] {
  const seen = new Set([selectionKey(shown)]);
  const out: CompareCandidate[] = [];
  if (active && active.context === 'active' && active.target_id === shown.target_id && !seen.has(selectionKey(active))) {
    seen.add(selectionKey(active));
    const other = sameDataset(active, shown) ? '' : ` (${datasetLabel(active)})`;
    out.push({ key: selectionKey(active), selection: active, active: true, label: `Active data on ${active.target_id}: ${title(active)}${other} (generation ${active.generation})` });
  }
  for (const scenario of dataset.scenarios) {
    for (const context of ['catalog_example', 'prepared'] as const) {
      const selection = scenario.selections[context];
      if (!selection || selection.target_id !== shown.target_id || seen.has(selectionKey(selection))) continue;
      seen.add(selectionKey(selection));
      const label = context === 'prepared' ? `${title(selection)}: prepared data (${shortIdentifier(selection.receipt_id)})` : `${title(selection)}: catalog example`;
      out.push({ key: selectionKey(selection), selection, active: false, label });
    }
  }
  return out;
}

/** A is the baseline: the active data when comparing with it, else the shown selection. */
export function defaultPair(shown: ExploreSelection, candidate: CompareCandidate): ComparePair {
  return candidate.active ? { left: candidate.selection, right: shown } : { left: shown, right: candidate.selection };
}

// ---------------------------------------------------------------------------
// Controls and sides

function renderControls(model: CompareModel): string {
  const known = model.candidates.some((candidate) => candidate.key === model.choice);
  const options = model.candidates.map((candidate) => `<option value="${escapeAttribute(candidate.key)}"${candidate.key === model.choice ? ' selected' : ''}>${escapeHTML(candidate.label)}</option>`).join('');
  const placeholder = `<option value=""${model.choice ? '' : ' selected'}>Choose what to compare with…</option>`;
  // A pinned choice the snapshot no longer offers stays named until the operator chooses again.
  const gone = model.choice && !known ? '<option value="" selected disabled>The chosen selection is no longer offered</option>' : '';
  const disabled = model.candidates.length === 0 || model.prerequisite?.status === 'blocked' ? ' disabled' : '';
  const select = `<label class="console-filter console-insights__picker">Compare with<select data-insights-control="compare" data-explorer-focus="insights:compare"${disabled}>${gone || placeholder}${options}</select></label>`;
  // Swap reads the flipped pair, so it waits for the shown selection's metric set.
  const swappable = model.pair && !model.stale && !model.prerequisite;
  const swap = `<button type="button" class="console-btn console-btn--sm" data-insights-action="swap" data-explorer-focus="insights:swap"${swappable ? '' : ' aria-disabled="true"'}>Swap A and B</button>`;
  return `<div class="console-insights__toolbar"><div class="console-insights__compare-controls">${select}${swap}</div>${renderDisplayToggle(model.scope, model.display)}</div>`;
}

function sideEvidence(insights: ExploreInsights | undefined): string {
  if (!insights) return '';
  const provenance = insights.provenance === 'example' ? 'Example values, not observed' : insights.provenance === 'observed' ? 'Observed' : 'Provenance unknown';
  const completeness = insights.completeness === 'complete' ? 'Complete' : insights.completeness === 'partial' ? 'Partial' : 'Completeness unknown';
  const state = insights.state === 'unsupported' ? 'Insights not offered by this provider' : insights.state === 'suppressed' ? 'Withheld by policy' : '';
  const read = insights.observed_at ? `Read ${renderRelativeTime(insights.observed_at, styles)}` : '';
  return `<p class="console-insights__side-evidence console-muted">${[escapeHTML(state), escapeHTML(provenance), escapeHTML(completeness), read].filter(Boolean).join(' · ')}</p>`;
}

/** Context and role, e.g. "Prepared receipt · Shown selection · Baseline"; active data needs no second label. */
function sideRole(model: CompareModel, selection: ExploreSelection, side: CompareSide, context: string): string {
  const shown = selectionKey(selection) === selectionKey(model.shown);
  const role = shown ? 'Shown selection' : selection.context === 'active' ? '' : 'Compared selection';
  return [context, role, side === 'a' ? 'Baseline' : ''].filter(Boolean).join(' · ');
}

function renderSide(model: CompareModel, side: CompareSide, selection: ExploreSelection, insights: ExploreInsights | undefined): string {
  const description = model.describe(selection);
  const id = `${model.scope}-side-${side}`;
  const letter = side.toUpperCase();
  return `<section class="console-insights__side" data-side="${side}" aria-labelledby="${escapeAttribute(id)}">
      <div class="console-insights__side-head"><span class="console-insights__side-badge" aria-hidden="true">${letter}</span><h5 class="console-insights__side-title" id="${escapeAttribute(id)}"><span class="console-sr-only">${letter}${side === 'a' ? ', baseline' : ''}: </span>${escapeHTML(description.title)}</h5></div>
      <p class="console-insights__side-context">${escapeHTML(sideRole(model, selection, side, description.context))}</p>
      <p class="console-insights__side-identity console-muted">${escapeHTML([description.dataset, description.identity].filter(Boolean).join(' · '))}</p>
      ${sideEvidence(insights)}
    </section>`;
}

// ---------------------------------------------------------------------------
// Metrics: one view model for chart and table

type SideValue = { text: string; known: boolean; value: number | null };

type MetricComparisonRow = {
  comparison: InsightMetricComparison;
  label: string;
  unit: string;
  kind: InsightMetric['kind'];
  scope: string;
  a: SideValue;
  b: SideValue;
  difference: string;
  change: string;
  note: string;
  comparable: boolean;
};

function sideValue(metric: InsightMetric | null, withheld: boolean): SideValue {
  if (withheld) return { text: STATUS_VALUES.suppressed, known: false, value: null };
  if (!metric) return { text: 'Not reported', known: false, value: null };
  if (metric.status !== 'known' || metric.value === null) {
    return { text: STATUS_VALUES[metric.status === 'known' ? 'unknown' : metric.status], known: false, value: null };
  }
  return { text: formatMeasure(metric.value, metric.kind), known: true, value: metric.value };
}

function metricScope(left: InsightMetric | null, right: InsightMetric | null): string {
  const metric = left || right;
  if (!metric) return '';
  const leftPeriod = left ? periodText(left.time_scope) : '';
  const rightPeriod = right ? periodText(right.time_scope) : '';
  const period = leftPeriod && rightPeriod && leftPeriod !== rightPeriod ? `A ${leftPeriod}; B ${rightPeriod}` : leftPeriod || rightPeriod;
  return [metric.population, period].filter(Boolean).join(' · ');
}

function comparisonRow(comparison: InsightMetricComparison): MetricComparisonRow {
  const metric = comparison.left || comparison.right;
  const withheld = comparison.reason === 'policy_suppressed';
  const kind = metric?.kind || 'sum';
  const comparable = comparison.compatibility === 'comparable' && comparison.delta !== null;
  const change = !comparable
    ? '—'
    : comparison.percent_change !== null
      ? formatSignedPercent(comparison.percent_change)
      : comparison.reason === 'zero_baseline' ? 'Not defined (zero baseline)' : 'Not available';
  const note = comparable
    ? comparison.reason && comparison.reason !== 'zero_baseline' ? reasonText(comparison.reason) : comparison.delta === 0 ? 'No change.' : ''
    : reasonText(comparison.reason) || 'These values are not comparable.';
  return {
    comparison,
    label: metric?.label || comparison.id,
    unit: metric?.unit || '',
    kind,
    scope: metricScope(comparison.left, comparison.right),
    a: sideValue(comparison.left, withheld),
    b: sideValue(comparison.right, withheld),
    difference: comparable ? formatSigned(comparison.delta as number, kind) : 'Not compared',
    change,
    note,
    comparable,
  };
}

function width(value: number | null, scale: number): number {
  if (value === null || !(scale > 0)) return 0;
  return Math.max(0, Math.min(100, Math.round((Math.abs(value) / scale) * 1000) / 10));
}

/** Which sides show catalog example values; each is labelled on its own values. */
type ExampleSides = Record<CompareSide, boolean>;

function pairBar(side: CompareSide, value: SideValue, scale: number, unit: string, example: boolean): string {
  const letter = side.toUpperCase();
  const text = value.known ? `<span class="console-insights__number">${escapeHTML(value.text)}</span>${unit ? ` <span class="console-muted">${escapeHTML(unit)}</span>` : ''}` : missing(value.text);
  return `<div class="console-insights__pair-row" data-side="${side}" data-status="${value.known ? 'known' : 'missing'}"${example ? ' data-provenance="example"' : ''}><span class="console-insights__pair-side" aria-hidden="true">${letter}</span><span class="console-insights__bar-track" aria-hidden="true"><span class="console-insights__bar-fill" style="width:${width(value.value, scale)}%"></span></span><span class="console-insights__bar-value"><span class="console-sr-only">${letter}: </span>${text}${example ? EXAMPLE_TAG : ''}</span></div>`;
}

function sideLabel(side: CompareSide, examples: ExampleSides): string {
  return examples[side] ? `${side.toUpperCase()} (example)` : side.toUpperCase();
}

function differenceText(row: MetricComparisonRow): string {
  const note = row.note ? `<span class="console-insights__delta-note">${escapeHTML(row.note)}</span>` : '';
  if (!row.comparable) {
    return `<p class="console-insights__delta" data-compatibility="incompatible"><span class="console-insights__delta-label">Difference (B − A)</span> <span class="console-insights__delta-value">${missing(row.difference)}</span>${note}</p>`;
  }
  const unit = row.unit ? ` ${escapeHTML(row.unit)}` : '';
  return `<p class="console-insights__delta" data-compatibility="comparable"><span class="console-insights__delta-label">Difference (B − A)</span> <strong class="console-insights__delta-value console-insights__number">${escapeHTML(row.difference)}</strong>${unit} <span class="console-insights__delta-change">Change ${escapeHTML(row.change)}</span>${note}</p>`;
}

type BucketPair = { id: string; label: string; a: SideValue; b: SideValue };

function bucketValue(bucket: InsightBucket | undefined, metric: InsightMetric | null): SideValue {
  if (!metric) return { text: 'Not reported', known: false, value: null };
  if (!bucket) return { text: metric.status === 'known' ? 'Not reported' : STATUS_VALUES[metric.status], known: false, value: null };
  if (bucket.status !== 'known' || bucket.value === null) return { text: STATUS_VALUES[bucket.status === 'known' ? 'unknown' : bucket.status], known: false, value: null };
  return { text: formatMeasure(bucket.value, 'bucket'), known: true, value: bucket.value };
}

/** Categories of both sides, A's order first; values only, never per-category differences. */
function bucketPairs(row: MetricComparisonRow): BucketPair[] {
  const { left, right } = row.comparison;
  if (row.kind !== 'distribution' || (!left?.buckets.length && !right?.buckets.length)) return [];
  const ids: string[] = [];
  const labels = new Map<string, string>();
  [left, right].forEach((metric) => metric?.buckets.forEach((bucket) => {
    if (!labels.has(bucket.id)) {
      ids.push(bucket.id);
      labels.set(bucket.id, bucket.label);
    }
  }));
  return ids.map((id) => ({
    id,
    label: labels.get(id) || id,
    a: bucketValue(left?.buckets.find((bucket) => bucket.id === id), left),
    b: bucketValue(right?.buckets.find((bucket) => bucket.id === id), right),
  }));
}

function renderMetricPair(row: MetricComparisonRow, examples: ExampleSides): string {
  const scale = Math.max(0, ...[row.a.value, row.b.value].filter((value): value is number => value !== null).map(Math.abs));
  const buckets = bucketPairs(row);
  const bucketScale = Math.max(0, ...buckets.flatMap((bucket) => [bucket.a.value, bucket.b.value]).filter((value): value is number => value !== null).map(Math.abs));
  const categories = buckets.length === 0 ? '' : `<ul class="console-insights__pair-buckets" aria-label="${escapeAttribute(`${row.label} by category`)}">${buckets.map((bucket) => `<li class="console-insights__pair-bucket" data-bucket-id="${escapeAttribute(bucket.id)}"><span class="console-insights__bar-label">${escapeHTML(bucket.label)}</span>${pairBar('a', bucket.a, bucketScale, '', examples.a)}${pairBar('b', bucket.b, bucketScale, '', examples.b)}</li>`).join('')}</ul>`;
  return `<li class="console-insights__pair" data-metric-id="${escapeAttribute(row.comparison.id)}" data-compatibility="${row.comparable ? 'comparable' : 'incompatible'}">
      <div class="console-insights__pair-head"><span class="console-insights__pair-label">${escapeHTML(row.label)}</span>${row.scope ? `<span class="console-muted">${escapeHTML(row.scope)}</span>` : ''}</div>
      <div class="console-insights__pair-bars">${pairBar('a', row.a, scale, row.unit, examples.a)}${pairBar('b', row.b, scale, row.unit, examples.b)}</div>
      ${differenceText(row)}
      ${categories}
    </li>`;
}

function sideCell(label: string, value: SideValue): string {
  return cell(label, value.known ? `<span class="console-insights__number">${escapeHTML(value.text)}</span>` : missing(value.text), ' class="console-insights__numeric"');
}

function exampleCaption(base: string, examples: ExampleSides): string {
  if (examples.a && examples.b) return `${base} (example values declared by the providers, not observed)`;
  if (examples.a || examples.b) return `${base} (${examples.a ? 'A' : 'B'} shows example values declared by the provider, not observed)`;
  return base;
}

function renderMetricsTable(rows: MetricComparisonRow[], examples: ExampleSides): string {
  const a = sideLabel('a', examples);
  const b = sideLabel('b', examples);
  const body = rows.map((row) => `<tr data-metric-id="${escapeAttribute(row.comparison.id)}" data-compatibility="${row.comparable ? 'comparable' : 'incompatible'}">${[
    cell('Metric', `<span class="console-cell-main"><span class="console-cell-title">${escapeHTML(row.label)}</span>${row.scope ? `<span class="console-cell-sub">${escapeHTML(row.scope)}</span>` : ''}</span>`),
    cell('Unit', row.unit ? escapeHTML(row.unit) : muted('—')),
    sideCell(a, row.a),
    sideCell(b, row.b),
    cell('Difference (B − A)', row.comparable ? `<strong class="console-insights__number">${escapeHTML(row.difference)}</strong>` : missing(row.difference), ' class="console-insights__numeric"'),
    cell('Change', row.comparable ? escapeHTML(row.change) : muted(row.change), ' class="console-insights__numeric"'),
    cell('Notes', row.note ? escapeHTML(row.note) : muted('—')),
  ].join('')}</tr>`).join('');
  const tables = rows.map((row) => {
    const buckets = bucketPairs(row);
    if (buckets.length === 0) return '';
    const bucketRows = buckets.map((bucket) => `<tr data-bucket-id="${escapeAttribute(bucket.id)}">${[cell('Category', escapeHTML(bucket.label)), sideCell(a, bucket.a), sideCell(b, bucket.b)].join('')}</tr>`).join('');
    return `<div class="console-explorer__table-wrap" data-metric-id="${escapeAttribute(row.comparison.id)}"><table class="console-table console-insights__table" data-insights-table="compare-categories"><caption class="console-explorer__caption">${escapeHTML(exampleCaption(`${row.label} by category`, examples))}</caption><thead><tr><th scope="col">Category</th><th scope="col">${a}</th><th scope="col">${b}</th></tr></thead><tbody>${bucketRows}</tbody></table></div>`;
  }).join('');
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="compare"><caption class="console-explorer__caption">${escapeHTML(exampleCaption('Metrics', examples))}</caption><thead><tr><th scope="col">Metric</th><th scope="col">Unit</th><th scope="col">${a}</th><th scope="col">${b}</th><th scope="col">Difference (B − A)</th><th scope="col">Change</th><th scope="col">Notes</th></tr></thead><tbody>${body}</tbody></table></div>${tables}`;
}

function renderMetrics(scope: string, comparison: SelectionComparison, display: InsightsDisplay): string {
  const rows = comparison.metrics.map(comparisonRow);
  const examples: ExampleSides = { a: comparison.left.provenance === 'example', b: comparison.right.provenance === 'example' };
  const example = examples.a || examples.b;
  const heading = `<h5 class="console-insights__heading" id="${escapeAttribute(`${scope}-compare-metrics`)}">Composition</h5>`;
  const basis = example
    ? 'At least one side shows example values declared by the provider. Values appear side by side; no difference is computed.'
    : 'Differences are computed by the server only for comparable observed values with the same unit, population, period and denominator.';
  const content = rows.length === 0
    ? `<p class="console-explorer__para">${muted('No metrics reported for either side.')}</p>`
    : display === 'table'
      ? renderMetricsTable(rows, examples)
      : `<ul class="console-insights__pairs" aria-label="${escapeAttribute(exampleCaption('Metrics', examples))}">${rows.map((row) => renderMetricPair(row, examples)).join('')}</ul>`;
  return `<section class="console-insights__group" aria-labelledby="${escapeAttribute(`${scope}-compare-metrics`)}" data-insights-group="compare-metrics" data-insights-display="${display}">${heading}<p class="console-explorer__para console-muted">${escapeHTML(basis)}</p>${content}</section>`;
}

// ---------------------------------------------------------------------------
// Coverage of both sides

/** Longest union of both sides' reported days that is aligned day by day. */
const ALIGNED_DAYS = 184;

type AlignedCoverage = { days: string[]; a: CoverageDay[]; b: CoverageDay[] } | null;

function alignCoverage(left: ExploreInsights, right: ExploreInsights): AlignedCoverage {
  const reported = [...left.coverage, ...right.coverage].map((entry) => entry.local_day).sort();
  if (reported.length === 0) return { days: [], a: [], b: [] };
  const days: string[] = [];
  for (let day = reported[0]; day <= reported[reported.length - 1]; day = nextLocalDay(day)) {
    if (days.length >= ALIGNED_DAYS) return null;
    days.push(day);
  }
  const side = (insights: ExploreInsights): CoverageDay[] => {
    const byDay = new Map(insights.coverage.map((entry) => [entry.local_day, entry]));
    return days.map((day) => {
      const entry = byDay.get(day);
      return { day, status: entry ? entry.status : 'not_reported', entry };
    });
  };
  return { days, a: side(left), b: side(right) };
}

function coverageCell(label: string, day: CoverageDay): string {
  const style = COVERAGE_STYLES[day.status];
  const evidence = evidenceText(day.entry);
  return cell(label, `<span class="console-insights__state" data-status="${day.status}"><span class="console-insights__swatch" data-status="${day.status}" aria-hidden="true">${escapeHTML(style.glyph)}</span>${escapeHTML(style.label)}</span>${evidence ? `<span class="console-cell-sub">${escapeHTML(evidence)}</span>` : ''}`);
}

function renderSideCalendar(scope: string, side: CompareSide, title: string, days: CoverageDay[], timezone: string): string {
  const letter = side.toUpperCase();
  const body = days.length === 0 ? `<p class="console-explorer__para">${muted('No coverage reported.')}</p>` : renderCalendar(`${scope}-${side}`, days, timezone);
  return `<section class="console-insights__coverage-side" data-side="${side}" aria-label="${escapeAttribute(`${letter}: ${title}`)}"><h6 class="console-insights__coverage-title"><span class="console-insights__side-badge" aria-hidden="true">${letter}</span>${escapeHTML(title)}</h6>${body}</section>`;
}

function renderSideCoverageTable(side: CompareSide, title: string, days: CoverageDay[], timezone: string): string {
  const letter = side.toUpperCase();
  if (days.length === 0) return `<p class="console-explorer__para">${muted(`${letter}: no coverage reported.`)}</p>`;
  const rows = days.map((day) => `<tr data-local-day="${escapeAttribute(day.day)}" data-side-${side}="${day.status}">${cell('Local day', escapeHTML(shortDay(day.day)))}${coverageCell(letter, day)}</tr>`).join('');
  return `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="compare-coverage-${side}"><caption class="console-explorer__caption">${escapeHTML(`${letter}: ${title}${timezone ? ` (${timezone})` : ''}`)}</caption><thead><tr><th scope="col">Local day</th><th scope="col">${letter}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function renderCoverageComparison(model: CompareModel, comparison: SelectionComparison, display: InsightsDisplay): string {
  const scope = model.scope;
  const heading = `<h5 class="console-insights__heading" id="${escapeAttribute(`${scope}-compare-coverage`)}">Coverage</h5>`;
  const titles = { a: model.describe(comparison.left.selection).title, b: model.describe(comparison.right.selection).title };
  const zones = { a: coverageTimezone(comparison.left.coverage), b: coverageTimezone(comparison.right.coverage) };
  const zoneNote = zones.a && zones.a === zones.b ? `Local days in ${zones.a}. ` : zones.a || zones.b ? `Local days in ${zones.a || 'an unknown timezone'} (A) and ${zones.b || 'an unknown timezone'} (B). ` : '';
  const note = `<p class="console-explorer__para console-muted">${escapeHTML(`${zoneNote}Covered days need verification evidence for exactly that side's selection; example dates never count as coverage.`)}</p>`;
  const aligned = alignCoverage(comparison.left, comparison.right);
  let content: string;
  if (aligned && aligned.days.length === 0) {
    content = `<p class="console-explorer__para" data-insights-coverage="none">${muted('No coverage reported for either side.')}</p>`;
  } else if (aligned) {
    content = display === 'table'
      ? `<div class="console-explorer__table-wrap"><table class="console-table console-insights__table" data-insights-table="compare-coverage"><caption class="console-explorer__caption">Coverage by local day</caption><thead><tr><th scope="col">Local day</th><th scope="col">A</th><th scope="col">B</th></tr></thead><tbody>${aligned.days.map((day, index) => `<tr data-local-day="${escapeAttribute(day)}" data-side-a="${aligned.a[index].status}" data-side-b="${aligned.b[index].status}">${cell('Local day', `<span class="console-cell-main"><span class="console-cell-title">${escapeHTML(shortDay(day))}</span><code class="console-cell-sub console-kv__mono">${escapeHTML(day)}</code></span>`)}${coverageCell('A', aligned.a[index])}${coverageCell('B', aligned.b[index])}</tr>`).join('')}</tbody></table></div>`
      : `${renderLegend([...aligned.a, ...aligned.b])}<div class="console-insights__coverage-pair">${renderSideCalendar(scope, 'a', titles.a, aligned.a, zones.a)}${renderSideCalendar(scope, 'b', titles.b, aligned.b, zones.b)}</div>`;
  } else {
    // Periods too far apart to align: each side keeps its own calendar and table.
    const a = coverageDays(comparison.left.coverage);
    const b = coverageDays(comparison.right.coverage);
    content = display === 'table'
      ? `${renderSideCoverageTable('a', titles.a, a, zones.a)}${renderSideCoverageTable('b', titles.b, b, zones.b)}`
      : `${renderLegend([...a, ...b])}<div class="console-insights__coverage-pair">${renderSideCalendar(scope, 'a', titles.a, a, zones.a)}${renderSideCalendar(scope, 'b', titles.b, b, zones.b)}</div>`;
  }
  return `<section class="console-insights__group" aria-labelledby="${escapeAttribute(`${scope}-compare-coverage`)}" data-insights-group="compare-coverage" data-insights-display="${display}">${heading}${note}${content}</section>`;
}

// ---------------------------------------------------------------------------
// Declarations

function renderUsages(declarations: InsightDeclarations): string {
  if (declarations.usages.length === 0) {
    return `<p class="console-explorer__para">${muted(declarations.usage_completeness === 'complete' ? 'No usage declared.' : 'No usage declared: impact on application features is unknown.')}</p>`;
  }
  const items = declarations.usages.map((usage) => {
    const effects = (['prepare', 'verify', 'activate'] as const).map((phase) => {
      const declared = usage.effects.filter((effect) => effect.phase === phase).map((effect) => effect.description || 'Declared without a description');
      return `<li><span class="console-insights__phase">${PHASES[phase]}</span> ${declared.length > 0 ? escapeHTML(declared.join('; ')) : '<span class="console-kv__empty">Not declared — effect unknown</span>'}</li>`;
    }).join('');
    return `<li class="console-insights__usage"><span class="console-insights__usage-label">${escapeHTML(usage.label)}</span> <span class="console-muted">${escapeHTML(USAGE_KINDS[usage.kind])}</span><ul class="console-insights__effects">${effects}</ul></li>`;
  }).join('');
  const note = declarations.usage_completeness === 'complete' ? '' : '<p class="console-explorer__para console-muted">Other uses may exist; this list is declared, not discovered.</p>';
  return `<ul class="console-insights__usages">${items}</ul>${note}`;
}

function renderOutcomes(declarations: InsightDeclarations): string {
  if (declarations.expected_outcomes.length === 0) return `<p class="console-explorer__para">${muted('No expected outcomes declared.')}</p>`;
  return `<ul class="console-explorer__list">${declarations.expected_outcomes.map((outcome) => `<li>${escapeHTML(outcome)}</li>`).join('')}</ul>`;
}

function renderDeclarations(model: CompareModel, comparison: SelectionComparison): string {
  const scope = model.scope;
  const same = JSON.stringify(comparison.left_declarations) === JSON.stringify(comparison.right_declarations);
  const column = (side: CompareSide, selection: ExploreSelection, declarations: InsightDeclarations): string => {
    const letter = side.toUpperCase();
    return `<div class="console-insights__declared" data-side="${side}">
        <h6 class="console-insights__coverage-title"><span class="console-insights__side-badge" aria-hidden="true">${letter}</span>${escapeHTML(model.describe(selection).title)}</h6>
        <span class="console-explorer__label">Expected outcomes (declared, not verified)</span>${renderOutcomes(declarations)}
        <span class="console-explorer__label">Declared usage and effects</span>${renderUsages(declarations)}
      </div>`;
  };
  return `<section class="console-insights__group" aria-labelledby="${escapeAttribute(`${scope}-compare-declared`)}" data-insights-group="compare-declarations">
      <h5 class="console-insights__heading" id="${escapeAttribute(`${scope}-compare-declared`)}">Declared outcomes and usage</h5>
      <p class="console-explorer__para console-muted">${escapeHTML(`Declared by each dataset’s provider. Declarations are not executed checks or observed effects.${same ? ' Both sides declare the same outcomes and usage.' : ''}`)}</p>
      <div class="console-insights__declared-pair">${column('a', comparison.left.selection, comparison.left_declarations)}${column('b', comparison.right.selection, comparison.right_declarations)}</div>
    </section>`;
}

// ---------------------------------------------------------------------------
// Section

function info(text: string, state: string): string {
  return `<div class="console-callout console-explorer__state" data-tone="info" data-insights-state="${escapeAttribute(state)}"><p>${escapeHTML(text)}</p></div>`;
}

function renderStale(message: string, current: boolean): string {
  const label = current ? 'Compare with the current data' : 'Choose again';
  return `<div class="console-callout console-explorer__state" data-tone="warning" role="alert" data-insights-state="stale"><p>${escapeHTML(message)}</p><div class="console-explorer__state-actions"><button type="button" class="console-btn console-btn--sm" data-insights-action="compare-current" data-explorer-focus="insights:compare-current">${label}</button></div></div>`;
}

function unsupportedSides(comparison: SelectionComparison): string {
  const sides = [comparison.left.state === 'unsupported' ? 'A' : '', comparison.right.state === 'unsupported' ? 'B' : ''].filter(Boolean);
  if (sides.length === 0) return '';
  const which = sides.length === 2 ? 'Neither side’s provider offers' : `The provider of ${sides[0]} does not offer`;
  return info(`${which} composition or coverage insights for its selection, so its values are not shown.`, 'unsupported');
}

function loading(text: string): string {
  return `<div class="console-explorer__loading" role="status" aria-busy="true">${escapeHTML(text)}</div>`;
}

/** Labels example sides: values appear side by side and no difference is computed. */
function exampleNote(comparison: SelectionComparison): string {
  const left = comparison.left.provenance === 'example';
  const right = comparison.right.provenance === 'example';
  if (!left && !right) return '';
  const text = left && right
    ? 'Both sides are catalog examples: values the providers declare. They are not observed, so no difference is computed.'
    : `${left ? 'A' : 'B'} is a catalog example: ${provenanceText(left ? comparison.left : comparison.right).replace(/^Catalog example: /, '')} No difference is computed against it.`;
  return `<p class="console-insights__provenance" data-provenance="example">${escapeHTML(text)}</p>`;
}

/** What replaces a pinned comparison while it cannot be shown, else ''. */
function pairState(model: CompareModel): string {
  if (model.stale) return renderStale(model.stale, model.staleCurrent !== false);
  const prerequisite = model.prerequisite;
  if (prerequisite?.status === 'failed') return renderInsightsFailure(prerequisite.failure, 'compare-retry');
  if (prerequisite?.status === 'loading') return loading('Reading the data shown…');
  const entry = model.entry;
  if (!entry || entry.status === 'loading') return loading('Comparing…');
  if (entry.status === 'failed') return renderInsightsFailure(entry.failure, 'compare-retry');
  if (entry.value.left.state === 'suppressed' || entry.value.right.state === 'suppressed') {
    return info('This comparison is hidden by policy: at least one side is withheld, so neither side’s values are shown.', 'suppressed');
  }
  return '';
}

/** The Compare section body for the explorer's shown selection. */
export function renderCompare(model: CompareModel): string {
  const head = `<p class="console-explorer__para console-muted">Compare the data shown with another scenario, receipt or the active data. A is the baseline; differences are B − A.</p>${renderControls(model)}`;
  const wrap = (body: string): string => `<div class="console-insights" data-insights-view="compare">${head}${body}</div>`;
  if (model.prerequisite?.status === 'blocked') return wrap(info(model.prerequisite.message, 'blocked'));
  if (!model.pair) {
    return wrap(model.candidates.length === 0
      ? info(`Nothing to compare with: this dataset offers no other scenario context on ${model.shown.target_id}, and no other data is active there.`, 'no-candidates')
      : info('Choose a scenario, receipt or the active data to compare with the data shown.', 'unchosen'));
  }
  const value = model.entry?.status === 'ready' ? model.entry.value : undefined;
  const sides = `<div class="console-insights__sides">${renderSide(model, 'a', model.pair.left, value?.left)}${renderSide(model, 'b', model.pair.right, value?.right)}</div>`;
  const state = pairState(model);
  if (state || !value) return wrap(`${sides}${state}`);
  const read = value.observed_at ? `<p class="console-explorer__observed console-insights__read">Compared ${renderRelativeTime(value.observed_at, styles)}</p>` : '';
  return wrap(`${sides}${read}${exampleNote(value)}${unsupportedSides(value)}
      ${renderMetrics(model.scope, value, model.display)}
      ${renderCoverageComparison(model, value, model.display)}
      ${renderDeclarations(model, value)}`);
}
