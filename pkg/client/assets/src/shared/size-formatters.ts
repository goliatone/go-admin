export interface ByteSizeFormatOptions {
  emptyFallback?: string;
  zeroFallback?: string;
  invalidFallback?: string;
  unitLabels?: readonly string[];
  precisionByUnit?: readonly number[];
  trimTrailingZeros?: boolean;
}

const DEFAULT_UNIT_LABELS = ['B', 'KB', 'MB', 'GB'] as const;
const DEFAULT_PRECISION_BY_UNIT = [0, 1, 1, 1] as const;

export function formatByteSize(
  value: number | string | undefined | null,
  options: ByteSizeFormatOptions = {}
): string | undefined {
  const hasEmptyFallback = Object.prototype.hasOwnProperty.call(options, 'emptyFallback');
  const hasZeroFallback = Object.prototype.hasOwnProperty.call(options, 'zeroFallback');
  const hasInvalidFallback = Object.prototype.hasOwnProperty.call(options, 'invalidFallback');

  const emptyFallback = hasEmptyFallback ? options.emptyFallback : '0 B';
  const zeroFallback = hasZeroFallback ? options.zeroFallback : emptyFallback;
  const invalidFallback = hasInvalidFallback ? options.invalidFallback : emptyFallback;
  const unitLabels = options.unitLabels ?? DEFAULT_UNIT_LABELS;
  const precisionByUnit = options.precisionByUnit ?? DEFAULT_PRECISION_BY_UNIT;
  const trimTrailingZeros = options.trimTrailingZeros ?? false;

  if (value === undefined || value === null || value === '') {
    return emptyFallback;
  }

  const bytes = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(bytes) || bytes < 0) {
    return invalidFallback;
  }

  if (bytes === 0) {
    return zeroFallback;
  }

  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < unitLabels.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = precisionByUnit[unitIndex] ?? precisionByUnit[precisionByUnit.length - 1] ?? 0;
  let formatted = size.toFixed(precision);
  if (trimTrailingZeros) {
    formatted = String(Number(formatted));
  }

  return `${formatted} ${unitLabels[unitIndex]}`;
}
