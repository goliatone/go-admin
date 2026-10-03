// Display text for normalized insight values. Charts and tables render the
// same strings from these helpers, so both views always state the same
// numbers. Inputs are already normalized: a null value is unknown and never
// formats as zero; shares need a known, non-zero denominator.

import type { CoverageStatus, InsightKind, InsightMetric, InsightPeriod, InsightStatus } from './contract.js';

/** Measured value as text (counts are whole numbers). */
export function formatMeasure(value: number, kind: InsightKind | 'bucket'): string {
  return kind === 'count'
    ? Math.round(value).toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Value with its declared unit, e.g. "3 orders". */
export function formatWithUnit(value: number, kind: InsightKind | 'bucket', unit: string): string {
  const text = formatMeasure(value, kind);
  return unit ? `${text} ${unit}` : text;
}

/** Share of a known denominator as a percentage, else null. */
export function shareOf(value: number, denominator: number | null): number | null {
  if (denominator === null || !(denominator > 0)) return null;
  const share = (value / denominator) * 100;
  return Number.isFinite(share) ? share : null;
}

export function formatPercent(percent: number): string {
  return `${percent.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

const MINUS = '−';

/** Signed difference ("+3", "−250", "0"). */
export function formatSigned(value: number, kind: InsightKind | 'bucket'): string {
  if (value === 0) return '0';
  const text = formatMeasure(Math.abs(value), kind);
  return value > 0 ? `+${text}` : `${MINUS}${text}`;
}

export function formatSignedPercent(percent: number): string {
  if (percent === 0) return '0%';
  const text = formatPercent(Math.abs(percent));
  return percent > 0 ? `+${text}` : `${MINUS}${text}`;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function dayParts(day: string): [number, number, number] {
  const [year, month, date] = day.split('-').map(Number);
  return [year, month, date];
}

/** Calendar parts of a validated local day; computed on the calendar date, never in a browser timezone. */
export function localDayParts(day: string): { year: number; month: number; date: number; weekday: number } {
  const [year, month, date] = dayParts(day);
  return { year, month, date, weekday: new Date(Date.UTC(year, month - 1, date)).getUTCDay() };
}

/** "Thursday 1 January 2026". */
export function longDay(day: string): string {
  const { year, month, date, weekday } = localDayParts(day);
  return `${WEEKDAYS[weekday]} ${date} ${MONTHS[month - 1]} ${year}`;
}

/** "1 Jan 2026". */
export function shortDay(day: string): string {
  const { year, month, date } = localDayParts(day);
  return `${date} ${SHORT_MONTHS[month - 1]} ${year}`;
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month - 1]} ${year}`;
}

/** The day after `day` (calendar arithmetic). */
export function nextLocalDay(day: string): string {
  const [year, month, date] = dayParts(day);
  const next = new Date(Date.UTC(year, month - 1, date + 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')}`;
}

/** "2026-01-01 (UTC)" or "2026-01-01 to 2026-01-07 (UTC)"; '' when unknown. */
export function periodText(period: InsightPeriod): string {
  if (!period.start && !period.end) return '';
  const range = !period.end || period.start === period.end ? period.start : !period.start ? period.end : `${period.start} to ${period.end}`;
  return period.timezone ? `${range} (${period.timezone})` : range;
}

export const STATUS_LABELS: Record<InsightStatus, string> = {
  known: 'Known',
  unknown: 'Unknown',
  suppressed: 'Withheld by policy',
  unavailable: 'Unavailable',
};

/** What stands in for a value that is not known. */
export const STATUS_VALUES: Record<Exclude<InsightStatus, 'known'>, string> = {
  unknown: 'Unknown',
  suppressed: 'Withheld',
  unavailable: 'Unavailable',
};

export type CoverageStyle = { label: string; glyph: string; description: string };

/** Lifecycle coverage labels; each state also has its own glyph and pattern. */
export const COVERAGE_STYLES: Record<CoverageStatus | 'not_reported', CoverageStyle> = {
  covered: { label: 'Covered', glyph: '✓', description: 'records verified for this day' },
  covered_empty: { label: 'Covered — no records', glyph: '0', description: 'verified, and the day has no records' },
  partial: { label: 'Partially covered', glyph: '◐', description: 'only part of this day is verified' },
  uncovered: { label: 'Not covered', glyph: '–', description: 'no verification covers this day' },
  policy_suppressed: { label: 'Suppressed by policy', glyph: '⊘', description: 'coverage withheld by policy' },
  unavailable: { label: 'Unavailable', glyph: '?', description: 'coverage could not be read' },
  not_reported: { label: 'Not reported', glyph: '·', description: 'the provider reported nothing for this day' },
};

/** Safe reasons the server reports; unknown codes read as their plain words. */
const REASONS: Record<string, string> = {
  not_supported: 'Not offered by this dataset’s provider.',
  policy_suppressed: 'Withheld by policy.',
  expected_only: 'Expected by the catalog example; not verified.',
  unbound_evidence: 'No verification evidence for this exact selection.',
  not_verified: 'Not verified: no passed verification of this receipt covers this day.',
  unknown_status: 'The reported coverage state is not recognized.',
  missing_metric: 'Only one side reports this metric.',
  unknown_value: 'At least one value is not known.',
  not_observed: 'Example values are declarations, not observations, so no difference is computed.',
  partial_population: 'At least one side is incomplete.',
  uncertified_schema: 'The datasets do not certify equivalent metrics.',
  unit_mismatch: 'Units or metric kinds differ.',
  population_mismatch: 'Populations or sampling differ.',
  time_scope_mismatch: 'Periods or timezones differ.',
  denominator_mismatch: 'Denominators differ or are unknown.',
  numeric_range: 'The difference is outside the supported range.',
  zero_baseline: 'The baseline is zero, so a percentage is not defined.',
  percentage_unavailable: 'A percentage could not be computed.',
};

export function reasonText(code: string): string {
  if (!code) return '';
  return REASONS[code] || `${code.replace(/[_-]+/g, ' ').replace(/^./, (first) => first.toUpperCase())}.`;
}

/** Text of a metric's main value (or the state standing in for it). */
export function metricValueText(metric: InsightMetric): string {
  if (metric.status !== 'known' || metric.value === null) return STATUS_VALUES[metric.status === 'known' ? 'unknown' : metric.status];
  return formatMeasure(metric.value, metric.kind);
}
