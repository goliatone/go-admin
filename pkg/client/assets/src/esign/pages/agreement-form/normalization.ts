import { PLACEMENT_SOURCE } from './constants';
import type {
  AgreementDocumentOption,
  EffectivePageResult,
  ExpandedRuleField,
  FieldRuleFormPayload,
  FieldRuleState,
  NormalizedPlacementInstance,
  PlacementFormPayload,
  RawPlacementInstance,
  RuleExpansionPageRange,
} from './contracts';

const DEFAULT_PLACEMENT_WIDTH = 150;
const DEFAULT_PLACEMENT_HEIGHT = 32;

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function parseBool(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  const raw = asString(value).toLowerCase();
  if (raw === '') return false;
  return raw === '1' || raw === 'true' || raw === 'on' || raw === 'yes';
}

function normalizeRuleType(value: unknown): string {
  return asString(value).toLowerCase();
}

export function parsePositiveInt(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
    return fallback;
  }
  const parsed = Number.parseInt(asString(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

export function parseFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  const parsed = Number.parseFloat(asString(value));
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function normalizeOptionalPageNumber(value: unknown, maxPage: number): number {
  const parsed = parsePositiveInt(value, 0);
  if (parsed <= 0) return 0;
  if (maxPage > 0 && parsed > maxPage) return maxPage;
  return parsed;
}

export function clampPageNumber(value: unknown, maxPage: number, fallback = 1): number {
  const resolvedFallback = parsePositiveInt(fallback, 1);
  const parsed = parsePositiveInt(value, resolvedFallback);
  if (maxPage > 0) {
    return clampNumber(parsed, 1, maxPage);
  }
  return parsed > 0 ? parsed : resolvedFallback;
}

export function normalizePageRange(fromPage: unknown, toPage: unknown, terminalPage: unknown): RuleExpansionPageRange {
  const safeTerminalPage = parsePositiveInt(terminalPage, 1);
  let start = normalizeOptionalPageNumber(fromPage, safeTerminalPage);
  let end = normalizeOptionalPageNumber(toPage, safeTerminalPage);
  if (start <= 0) start = 1;
  if (end <= 0) end = safeTerminalPage;
  if (end < start) {
    return { start: end, end: start };
  }
  return { start, end };
}

export function parseExcludePagesCSV(raw: unknown): number[] {
  if (raw === null || raw === undefined) return [];
  const chunks = Array.isArray(raw) ? raw.map((value) => asString(value)) : asString(raw).split(',');
  const unique = new Set<number>();
  chunks.forEach((chunk) => {
    const parsed = parsePositiveInt(chunk, 0);
    if (parsed > 0) unique.add(parsed);
  });
  return Array.from(unique).sort((left, right) => left - right);
}

export function normalizeFieldRuleState(input: Partial<FieldRuleState> & Record<string, unknown>, terminalPage: number): FieldRuleState {
  const safeTerminalPage = parsePositiveInt(terminalPage, 1);
  const participantID = asString(input.participantId ?? input.participant_id);
  const excludePages = parseExcludePagesCSV(input.excludePages ?? input.exclude_pages);
  const requiredRaw = input.required;
  const required = typeof requiredRaw === 'boolean'
    ? requiredRaw
    : !['0', 'false', 'off', 'no'].includes(asString(requiredRaw).toLowerCase());

  return {
    id: asString(input.id),
    type: normalizeRuleType(input.type),
    participantId: participantID,
    participantTempId: asString(input.participantTempId) || participantID,
    fromPage: normalizeOptionalPageNumber(input.fromPage ?? input.from_page, safeTerminalPage),
    toPage: normalizeOptionalPageNumber(input.toPage ?? input.to_page, safeTerminalPage),
    page: normalizeOptionalPageNumber(input.page, safeTerminalPage),
    excludeLastPage: parseBool(input.excludeLastPage ?? input.exclude_last_page),
    excludePages,
    required,
  };
}

export function toFieldRuleFormPayload(rule: FieldRuleState): FieldRuleFormPayload {
  return {
    id: asString(rule.id),
    type: normalizeRuleType(rule.type),
    participant_id: asString(rule.participantId),
    from_page: normalizeOptionalPageNumber(rule.fromPage, 0),
    to_page: normalizeOptionalPageNumber(rule.toPage, 0),
    page: normalizeOptionalPageNumber(rule.page, 0),
    exclude_last_page: Boolean(rule.excludeLastPage),
    exclude_pages: parseExcludePagesCSV(rule.excludePages),
    required: rule.required !== false,
  };
}

export function resolveRuleExpansionBaseID(rule: Partial<FieldRuleState>, index: number): string {
  const explicitID = asString(rule?.id);
  if (explicitID !== '') return explicitID;
  return `rule-${index + 1}`;
}

export function expandRuleDefinitionsForPreview(rules: Array<Partial<FieldRuleState>>, terminalPage: number): ExpandedRuleField[] {
  const safeTerminalPage = parsePositiveInt(terminalPage, 1);
  const expanded: ExpandedRuleField[] = [];

  rules.forEach((rawRule, index) => {
    const rule = normalizeFieldRuleState((rawRule || {}) as Partial<FieldRuleState> & Record<string, unknown>, safeTerminalPage);
    if (rule.type === '') return;
    const baseRuleID = resolveRuleExpansionBaseID(rule, index);

    if (rule.type === 'initials_each_page') {
      const range = normalizePageRange(rule.fromPage, rule.toPage, safeTerminalPage);
      const excludedPages = new Set<number>();
      parseExcludePagesCSV(rule.excludePages).forEach((page) => {
        if (page <= safeTerminalPage) excludedPages.add(page);
      });
      if (rule.excludeLastPage) {
        excludedPages.add(safeTerminalPage);
      }
      for (let page = range.start; page <= range.end; page += 1) {
        if (excludedPages.has(page)) continue;
        expanded.push({
          id: `${baseRuleID}-initials-${page}`,
          type: 'initials',
          page,
          participantId: asString(rule.participantId),
          required: rule.required !== false,
          ruleId: baseRuleID, // Phase 3: Track rule ID for link group creation
        });
      }
      return;
    }

    if (rule.type === 'signature_once') {
      let page = rule.page > 0 ? rule.page : (rule.toPage > 0 ? rule.toPage : safeTerminalPage);
      if (page <= 0) page = 1;
      expanded.push({
        id: `${baseRuleID}-signature-${page}`,
        type: 'signature',
        page,
        participantId: asString(rule.participantId),
        required: rule.required !== false,
        ruleId: baseRuleID, // Phase 3: Track rule ID for link group creation
      });
    }
  });

  expanded.sort((left, right) => {
    if (left.page !== right.page) return left.page - right.page;
    return left.id.localeCompare(right.id);
  });

  return expanded;
}

/**
 * Computes the effective pages that will be generated for an initials_each_page rule.
 * This matches the backend expansion logic in panel_repositories.go.
 *
 * @param fromPage - Start of range (defaults to 1 if <= 0)
 * @param toPage - End of range (defaults to terminalPage if <= 0)
 * @param terminalPage - Document page count (used for excludeLastPage)
 * @param excludeLastPage - If true, excludes terminalPage from generation
 * @param excludePages - Array of specific pages to exclude
 * @returns EffectivePageResult with the actual pages that will be generated
 */
export function computeEffectiveRulePages(
  fromPage: number,
  toPage: number,
  terminalPage: number,
  excludeLastPage: boolean,
  excludePages: number[],
): EffectivePageResult {
  const safeTerminalPage = parsePositiveInt(terminalPage, 1);

  // Normalize range start/end
  let rangeStart = fromPage > 0 ? fromPage : 1;
  let rangeEnd = toPage > 0 ? toPage : safeTerminalPage;

  // Clamp to document bounds
  rangeStart = clampNumber(rangeStart, 1, safeTerminalPage);
  rangeEnd = clampNumber(rangeEnd, 1, safeTerminalPage);

  // Swap if inverted
  if (rangeEnd < rangeStart) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }

  // Build excluded pages set
  const excludedSet = new Set<number>();
  excludePages.forEach((page) => {
    const safePage = parsePositiveInt(page, 0);
    if (safePage > 0) {
      // Match backend expansion semantics: out-of-range excluded pages clamp to terminalPage.
      excludedSet.add(clampNumber(safePage, 1, safeTerminalPage));
    }
  });

  // excludeLastPage excludes the document's terminal page, not the range's end
  if (excludeLastPage) {
    excludedSet.add(safeTerminalPage);
  }

  // Compute effective pages
  const effectivePages: number[] = [];
  for (let page = rangeStart; page <= rangeEnd; page += 1) {
    if (!excludedSet.has(page)) {
      effectivePages.push(page);
    }
  }

  return {
    pages: effectivePages,
    rangeStart,
    rangeEnd,
    excludedPages: Array.from(excludedSet).sort((a, b) => a - b),
    isEmpty: effectivePages.length === 0,
  };
}

/**
 * Formats the effective page result into a human-readable summary string.
 * Shows explicit derived range to avoid ambiguity with excludeLastPage behavior.
 *
 * Examples:
 * - "pages 1, 2, 3, 4" (small count, listed)
 * - "pages 1-10" (contiguous range)
 * - "pages 1-3, 5-8, 10" (non-contiguous with gaps)
 * - "(no pages - all excluded)" (empty result)
 */
export function formatEffectivePageRange(result: EffectivePageResult): string {
  if (result.isEmpty) {
    return '(no pages - all excluded)';
  }

  const { pages } = result;

  // For very small page counts (1-5), just list them
  if (pages.length <= 5) {
    return `pages ${pages.join(', ')}`;
  }

  // For larger counts, use range notation with gap detection
  const ranges: string[] = [];
  let rangeStartIdx = 0;

  for (let i = 1; i <= pages.length; i += 1) {
    // Check if we're at end or there's a gap
    if (i === pages.length || pages[i] !== pages[i - 1] + 1) {
      const rangeStartPage = pages[rangeStartIdx];
      const rangeEndPage = pages[i - 1];

      if (rangeStartPage === rangeEndPage) {
        ranges.push(String(rangeStartPage));
      } else if (rangeEndPage === rangeStartPage + 1) {
        // Two consecutive pages - list them
        ranges.push(`${rangeStartPage}, ${rangeEndPage}`);
      } else {
        // Three or more - use range notation
        ranges.push(`${rangeStartPage}-${rangeEndPage}`);
      }
      rangeStartIdx = i;
    }
  }

  return `pages ${ranges.join(', ')}`;
}

export function normalizeDocumentOption(raw: Record<string, unknown> | null | undefined): AgreementDocumentOption {
  const value = raw || {};
  return {
    id: asString(value.id),
    title: asString(value.title || value.name) || 'Untitled',
    pageCount: parsePositiveInt(value.page_count ?? value.pageCount, 0),
    compatibilityTier: asString(value.pdf_compatibility_tier ?? value.pdfCompatibilityTier).toLowerCase(),
    compatibilityReason: asString(value.pdf_compatibility_reason ?? value.pdfCompatibilityReason).toLowerCase(),
  };
}

export function normalizePlacementSource(value: unknown): string {
  const source = asString(value).toLowerCase();
  if (source === '') return PLACEMENT_SOURCE.MANUAL;
  switch (source) {
    case PLACEMENT_SOURCE.AUTO:
    case PLACEMENT_SOURCE.MANUAL:
    case PLACEMENT_SOURCE.AUTO_LINKED:
    case PLACEMENT_SOURCE.AUTO_FALLBACK:
      return source;
    default:
      return source;
  }
}

export function normalizePlacementInstance(instance: RawPlacementInstance, index = 0): NormalizedPlacementInstance {
  const raw = (instance || {}) as Record<string, unknown>;
  const id = asString(raw.id) || `fi_init_${index}`;
  const definitionID = asString(raw.definitionId || raw.definition_id || raw.field_definition_id) || id;
  const page = parsePositiveInt(raw.page ?? raw.page_number, 1);
  const x = parseFiniteNumber(raw.x ?? raw.pos_x, 0);
  const y = parseFiniteNumber(raw.y ?? raw.pos_y, 0);
  const width = parseFiniteNumber(raw.width, DEFAULT_PLACEMENT_WIDTH);
  const height = parseFiniteNumber(raw.height, DEFAULT_PLACEMENT_HEIGHT);

  return {
    id,
    definitionId: definitionID,
    type: asString(raw.type) || 'text',
    participantId: asString(raw.participantId || raw.participant_id),
    participantName: asString(raw.participantName || raw.participant_name) || 'Unassigned',
    page: page > 0 ? page : 1,
    x: x >= 0 ? x : 0,
    y: y >= 0 ? y : 0,
    width: width > 0 ? width : DEFAULT_PLACEMENT_WIDTH,
    height: height > 0 ? height : DEFAULT_PLACEMENT_HEIGHT,
    placementSource: normalizePlacementSource(raw.placementSource || raw.placement_source),
    linkGroupId: asString(raw.linkGroupId || raw.link_group_id),
    linkedFromFieldId: asString(raw.linkedFromFieldId || raw.linked_from_field_id),
    isUnlinked: parseBool(raw.isUnlinked ?? raw.is_unlinked),
  };
}

export function toPlacementFormPayload(instance: RawPlacementInstance, index = 0): PlacementFormPayload {
  const normalized = normalizePlacementInstance(instance, index);
  return {
    id: normalized.id,
    definition_id: normalized.definitionId,
    page: normalized.page,
    x: Math.round(normalized.x),
    y: Math.round(normalized.y),
    width: Math.round(normalized.width),
    height: Math.round(normalized.height),
    placement_source: normalizePlacementSource(normalized.placementSource),
    link_group_id: asString(normalized.linkGroupId),
    linked_from_field_id: asString(normalized.linkedFromFieldId),
    is_unlinked: Boolean(normalized.isUnlinked),
  };
}
