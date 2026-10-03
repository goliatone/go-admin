// Data insights wire contract. Mirrors data/insights.go: bounded composition
// and coverage of one exact explorer selection, and a pinned two-side
// comparison. Every response is untrusted JSON, so the normalizers keep only
// the declared shape, reject lists over the service caps and any answer for
// another selection or metric set, and never turn a missing, withheld or
// malformed value into zero. Coverage counts as observed only with evidence
// bound to the exact selection, and a delta is kept only for a pair the
// server reports comparable between two observed, known values.

import {
  COMPLETENESS,
  isRecord,
  list,
  oneOf,
  parseEnvelope,
  parseSelection,
  parseUsage,
  selectionKey,
  str,
  strings,
  type ExploreCompleteness,
  type ExploreEnvelope,
  type ExploreSelection,
  type ExploreUsage,
} from '../data-explorer/contract.js';

export type InsightKind = 'count' | 'sum' | 'distribution';

export type InsightStatus = 'known' | 'unknown' | 'suppressed' | 'unavailable';

export type InsightPeriod = { start: string; end: string; timezone: string };

export type InsightBucket = { id: string; label: string; value: number | null; status: InsightStatus };

export type InsightMetric = {
  id: string;
  label: string;
  kind: InsightKind;
  unit: string;
  population: string;
  time_scope: InsightPeriod;
  /** Declared denominator of a known metric; null when unknown. */
  denominator: number | null;
  /** Present only when `status` is known. */
  value: number | null;
  status: InsightStatus;
  /** Categories of a known distribution. */
  buckets: InsightBucket[];
  sampling_method: string;
};

export type CoverageStatus = 'covered' | 'covered_empty' | 'partial' | 'uncovered' | 'policy_suppressed' | 'unavailable';

export const COVERAGE_STATUSES: readonly CoverageStatus[] = ['covered', 'covered_empty', 'partial', 'uncovered', 'policy_suppressed', 'unavailable'];

export type InsightEvidence = { selection: ExploreSelection; ref: string; verification_id: string };

export type InsightCoverage = {
  local_day: string;
  timezone: string;
  status: CoverageStatus;
  evidence: InsightEvidence | null;
  reason: string;
};

export type InsightWork = { queries: number | null; records: number | null };

export type ExploreInsights = ExploreEnvelope & {
  metric_set_id: string;
  equivalent_schema: string;
  metrics: InsightMetric[];
  /** Reported local days, oldest first. */
  coverage: InsightCoverage[];
  work: InsightWork;
};

export type InsightCompatibility = 'comparable' | 'incompatible';

export type InsightMetricComparison = {
  id: string;
  left: InsightMetric | null;
  right: InsightMetric | null;
  compatibility: InsightCompatibility;
  /** Right minus left, server-computed; only for a comparable observed pair. */
  delta: number | null;
  percent_change: number | null;
  reason: string;
};

export type InsightDeclarations = {
  usages: ExploreUsage[];
  usage_completeness: ExploreCompleteness;
  expected_outcomes: string[];
};

export type SelectionComparison = {
  left: ExploreInsights;
  right: ExploreInsights;
  comparison_id: string;
  observed_at: string;
  metrics: InsightMetricComparison[];
  left_declarations: InsightDeclarations;
  right_declarations: InsightDeclarations;
};

/** Service caps (data/insights.go); responses beyond them are malformed. */
export const INSIGHT_LIMITS = {
  metrics: 16,
  buckets: 32,
  days: 90,
  /** Union of both sides' metrics. */
  comparisons: 32,
  usages: 32,
  outcomes: 32,
} as const;

const KINDS: readonly InsightKind[] = ['count', 'sum', 'distribution'];
const STATUSES: readonly InsightStatus[] = ['known', 'unknown', 'suppressed', 'unavailable'];
const COMPATIBILITY: readonly InsightCompatibility[] = ['comparable', 'incompatible'];
const LOCAL_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Finite wire number within JavaScript-safe precision, else null. */
export function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER ? value : null;
}

function counter(value: unknown): number | null {
  const number = finite(value);
  return number !== null && Number.isInteger(number) && number >= 0 ? number : null;
}

/** A calendar day `YYYY-MM-DD` that exists. */
export function validLocalDay(day: string): boolean {
  const match = LOCAL_DAY.exec(day);
  if (!match) return false;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(Date.UTC(year, month - 1, date));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === date;
}

function duplicated(ids: string[]): boolean {
  return new Set(ids).size !== ids.length;
}

function dayNumber(day: string): number {
  const [year, month, date] = day.split('-').map(Number);
  return Date.UTC(year, month - 1, date) / 86_400_000;
}

/** Reported days fit the service's bounded window (at most 90 local days). */
function boundedSpan(days: string[]): boolean {
  if (days.length < 2) return true;
  const numbers = days.map(dayNumber);
  return Math.max(...numbers) - Math.min(...numbers) < INSIGHT_LIMITS.days;
}

/**
 * A value is shown only when the server reports it known and it is a finite
 * number of the declared kind; otherwise it is unknown, never zero.
 */
function measured(status: InsightStatus, raw: unknown, kind: InsightKind | 'bucket'): { status: InsightStatus; value: number | null } {
  if (status !== 'known') return { status, value: null };
  const value = finite(raw);
  const counted = kind === 'count';
  if (value === null || ((counted || kind === 'bucket') && value < 0) || (counted && !Number.isInteger(value))) {
    return { status: 'unknown', value: null };
  }
  return { status, value };
}

function parsePeriod(value: unknown): InsightPeriod {
  if (!isRecord(value)) return { start: '', end: '', timezone: '' };
  const start = str(value.start);
  const end = str(value.end);
  return { start: validLocalDay(start) ? start : '', end: validLocalDay(end) ? end : '', timezone: str(value.timezone) };
}

function parseBucket(value: unknown): InsightBucket | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  const status = oneOf(value.status, STATUSES);
  if (!id || !status) return null;
  return { id, label: str(value.label) || id, ...measured(status, value.value, 'bucket') };
}

export function parseMetric(value: unknown): InsightMetric | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  const kind = oneOf(value.kind, KINDS);
  const status = oneOf(value.status, STATUSES);
  const buckets = list(value.buckets, INSIGHT_LIMITS.buckets, parseBucket);
  if (!id || !kind || !status || !buckets || duplicated(buckets.map((bucket) => bucket.id))) return null;
  const reading = measured(status, value.value, kind);
  const known = reading.status === 'known';
  const denominator = known ? finite(value.denominator) : null;
  return {
    id,
    label: str(value.label) || id,
    kind,
    unit: str(value.unit),
    population: str(value.population),
    time_scope: parsePeriod(value.time_scope),
    // A missing declared denominator stays unknown.
    denominator: denominator !== null && denominator >= 0 ? denominator : null,
    ...reading,
    // Only a known distribution carries categories.
    buckets: known && kind === 'distribution' ? buckets : [],
    sampling_method: str(value.sampling_method),
  };
}

function parseEvidence(value: unknown, expected: ExploreSelection): InsightEvidence | null {
  if (!isRecord(value)) return null;
  const selection = parseSelection(value.selection);
  const ref = str(value.ref);
  // Evidence counts only when it is bound to exactly the selection shown.
  if (!selection || !ref || selectionKey(selection) !== selectionKey(expected)) return null;
  return { selection, ref, verification_id: str(value.verification_id) };
}

const OBSERVED_COVERAGE = new Set<CoverageStatus>(['covered', 'covered_empty', 'partial']);

function parseCoverage(value: unknown, expected: ExploreSelection): InsightCoverage | null {
  if (!isRecord(value)) return null;
  const day = str(value.local_day);
  if (!validLocalDay(day)) return null;
  const reported = oneOf(value.status, COVERAGE_STATUSES);
  const evidence = parseEvidence(value.evidence, expected);
  let status: CoverageStatus = reported || 'unavailable';
  let reason = reported ? str(value.reason) : 'unknown_status';
  // A catalog example is never coverage, observed coverage needs bound
  // evidence and covered-empty needs a verification: anything else reads as
  // unavailable, never covered, and keeps no evidence.
  const unbound = !evidence || expected.context === 'catalog_example' || (status === 'covered_empty' && !evidence.verification_id);
  if (OBSERVED_COVERAGE.has(status) && unbound) {
    return { local_day: day, timezone: str(value.timezone), status: 'unavailable', evidence: null, reason: 'unbound_evidence' };
  }
  return { local_day: day, timezone: str(value.timezone), status, evidence: status === 'policy_suppressed' ? null : evidence, reason };
}

function parseWork(value: unknown): InsightWork {
  return isRecord(value) ? { queries: counter(value.queries), records: counter(value.records) } : { queries: null, records: null };
}

/**
 * Insights for exactly `expected` (and `metricSetID` when given), or null when
 * malformed or foreign. Unsupported and withheld answers carry no content.
 */
export function parseInsights(value: unknown, expected: ExploreSelection, metricSetID = ''): ExploreInsights | null {
  if (!isRecord(value)) return null;
  const envelope = parseEnvelope(value, expected);
  const metricSet = str(value.metric_set_id);
  const metrics = list(value.metrics, INSIGHT_LIMITS.metrics, parseMetric);
  const coverage = list(value.coverage, INSIGHT_LIMITS.days, (item) => parseCoverage(item, expected));
  if (!envelope || !metrics || !coverage || (metricSetID && metricSet !== metricSetID)) return null;
  const days = coverage.map((day) => day.local_day);
  if (duplicated(metrics.map((metric) => metric.id)) || duplicated(days) || !boundedSpan(days)) return null;
  const shown = envelope.state === 'available' || envelope.state === 'empty';
  return {
    ...envelope,
    metric_set_id: metricSet,
    equivalent_schema: str(value.equivalent_schema),
    metrics: shown ? metrics : [],
    coverage: shown ? coverage.sort((a, b) => a.local_day.localeCompare(b.local_day)) : [],
    work: parseWork(value.work),
  };
}

function parseSide(value: unknown, id: string): InsightMetric | null | undefined {
  if (value === null || value === undefined) return null;
  const metric = parseMetric(value);
  // A side for another metric is malformed (undefined), not missing (null).
  return metric && metric.id === id ? metric : undefined;
}

function parseMetricComparison(value: unknown, left: ExploreInsights, right: ExploreInsights): InsightMetricComparison | null {
  if (!isRecord(value)) return null;
  const id = str(value.id);
  const leftMetric = parseSide(value.left, id);
  const rightMetric = parseSide(value.right, id);
  if (!id || leftMetric === undefined || rightMetric === undefined) return null;
  const reported = oneOf(value.compatibility, COMPATIBILITY) || 'incompatible';
  // Suppression withholds both operands; no difference can reveal them.
  if (leftMetric?.status === 'suppressed' || rightMetric?.status === 'suppressed') {
    return { id, left: null, right: null, compatibility: 'incompatible', delta: null, percent_change: null, reason: 'policy_suppressed' };
  }
  const observed = left.provenance === 'observed' && right.provenance === 'observed';
  const known = leftMetric?.status === 'known' && rightMetric?.status === 'known';
  const delta = reported === 'comparable' && observed && known ? finite(value.delta) : null;
  const comparable = delta !== null;
  let reason = str(value.reason);
  if (reported === 'comparable' && !comparable) reason = observed ? 'unknown_value' : 'not_observed';
  return {
    id,
    left: leftMetric,
    right: rightMetric,
    compatibility: comparable ? 'comparable' : 'incompatible',
    delta,
    percent_change: comparable ? finite(value.percent_change) : null,
    reason,
  };
}

const UNKNOWN_DECLARATIONS: InsightDeclarations = { usages: [], usage_completeness: 'unknown', expected_outcomes: [] };

function parseDeclarations(value: unknown): InsightDeclarations | null {
  // Missing provider declarations remain unknown.
  if (!isRecord(value)) return { ...UNKNOWN_DECLARATIONS };
  const usages = list(value.usages, INSIGHT_LIMITS.usages, parseUsage);
  if (!usages) return null;
  return {
    usages,
    usage_completeness: oneOf(value.usage_completeness, COMPLETENESS) || 'unknown',
    expected_outcomes: strings(value.expected_outcomes, INSIGHT_LIMITS.outcomes),
  };
}

/**
 * Comparison of exactly `left` and `right` (and `metricSetID` when given), or
 * null when malformed or foreign. When either side is withheld, neither
 * side's numbers, coverage or declarations are kept.
 */
export function parseComparison(value: unknown, left: ExploreSelection, right: ExploreSelection, metricSetID = ''): SelectionComparison | null {
  if (!isRecord(value)) return null;
  const leftSide = parseInsights(value.left, left, metricSetID);
  const rightSide = parseInsights(value.right, right, metricSetID);
  if (!leftSide || !rightSide) return null;
  const metrics = list(value.metrics, INSIGHT_LIMITS.comparisons, (item) => parseMetricComparison(item, leftSide, rightSide));
  const leftDeclarations = parseDeclarations(value.left_declarations);
  const rightDeclarations = parseDeclarations(value.right_declarations);
  if (!metrics || !leftDeclarations || !rightDeclarations || duplicated(metrics.map((metric) => metric.id))) return null;
  const withheld = leftSide.state === 'suppressed' || rightSide.state === 'suppressed';
  if (withheld) {
    for (const side of [leftSide, rightSide]) {
      side.metrics = [];
      side.coverage = [];
    }
  }
  return {
    left: leftSide,
    right: rightSide,
    comparison_id: str(value.comparison_id),
    observed_at: str(value.observed_at),
    metrics: withheld ? [] : metrics,
    left_declarations: withheld ? { ...UNKNOWN_DECLARATIONS } : leftDeclarations,
    right_declarations: withheld ? { ...UNKNOWN_DECLARATIONS } : rightDeclarations,
  };
}
