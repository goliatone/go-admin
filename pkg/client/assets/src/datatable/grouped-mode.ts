/**
 * Grouped Mode Utilities for DataGrid (Phase 2)
 *
 * Provides data transformation, state management, and rendering support
 * for translation-grouped content views.
 *
 * Contract:
 * - Groups records by `translation_group_id`
 * - Preserves backend-provided group summaries when available
 * - Falls back to client-computed summaries when backend omits them
 * - Maintains expand/collapse state with persistence
 */

// ============================================================================
// Types
// ============================================================================

/**
 * View mode for DataGrid
 *
 * View modes control how translation-enabled content is displayed:
 *
 * - **flat**: Standard list view. Each record is a separate row.
 *   Cell renderers show basic translation status badges.
 *
 * - **grouped**: Records are grouped by `translation_group_id`.
 *   Expandable group headers show aggregate translation state.
 *   Child rows are collapsible under each group.
 *
 * - **matrix**: Grouped layout with compact locale status icons.
 *   Uses `renderTranslationMatrixCell()` to show per-locale status (●/◐/○)
 *   for each required locale in a single cell. This is a "matrix summary"
 *   representation where locale status icons are inline, NOT separate columns.
 *
 * Note: A "true locale-column matrix" (separate column per locale) is not
 * currently implemented. The current matrix mode provides locale status
 * visibility within the grouped row structure.
 *
 * Both 'grouped' and 'matrix' modes share the same expand/collapse behavior,
 * URL state sync, and pagination handling. The difference is purely visual:
 * the cell renderer switches to compact locale chips in matrix mode.
 */
export type ViewMode = 'flat' | 'grouped' | 'matrix';

/**
 * Group summary from backend or computed locally
 */
export interface GroupSummary {
  /** Total items in the group */
  totalItems: number;
  /** Number of available/complete locales */
  availableLocales: string[];
  /** Number of missing locales */
  missingLocales: string[];
  /** Overall readiness state */
  readinessState: 'ready' | 'missing_locales' | 'missing_fields' | 'missing_locales_and_fields' | null;
  /** Ready for publish transition */
  readyForPublish: boolean | null;
}

/**
 * A group of records sharing the same translation_group_id
 */
export interface RecordGroup {
  /** The translation_group_id */
  groupId: string;
  /** Optional display label for group headers */
  displayLabel?: string;
  /** Records in this group */
  records: Record<string, unknown>[];
  /** Group summary (from backend or computed) */
  summary: GroupSummary;
  /** Whether this group is expanded (for UI) */
  expanded: boolean;
  /** Whether summary came from backend */
  summaryFromBackend: boolean;
}

/**
 * Result of grouping transformation
 */
export interface GroupedData {
  /** Groups of records */
  groups: RecordGroup[];
  /** Ungrouped records (no translation_group_id) */
  ungrouped: Record<string, unknown>[];
  /** Total group count */
  totalGroups: number;
  /** Total record count */
  totalRecords: number;
}

/**
 * Options for group transformation
 */
export interface GroupTransformOptions {
  /** Field to group by (default: translation_group_id) */
  groupByField?: string;
  /** Default expanded state for groups */
  defaultExpanded?: boolean;
  /** Previously expanded group IDs */
  expandedGroups?: Set<string>;
}

/**
 * Backend grouped row shape for `group_by=translation_group_id`.
 */
interface BackendGroupedRow {
  translation_group_id?: string;
  group_by?: string;
  records?: unknown;
  children?: unknown;
  parent?: unknown;
  translation_group_summary?: unknown;
  _group?: unknown;
}

// ============================================================================
// Group Data Transformation (TX-055)
// ============================================================================

/**
 * Transform flat records into grouped structure by translation_group_id.
 *
 * @param records - Array of records from API
 * @param options - Grouping options
 * @returns Grouped data structure
 */
export function transformToGroups(
  records: Record<string, unknown>[],
  options: GroupTransformOptions = {}
): GroupedData {
  const {
    groupByField = 'translation_group_id',
    defaultExpanded = true,
    expandedGroups = new Set<string>(),
  } = options;

  const groupMap = new Map<string, Record<string, unknown>[]>();
  const ungrouped: Record<string, unknown>[] = [];

  // Partition records by group ID
  for (const record of records) {
    const groupId = getGroupId(record, groupByField);

    if (groupId) {
      const existing = groupMap.get(groupId);
      if (existing) {
        existing.push(record);
      } else {
        groupMap.set(groupId, [record]);
      }
    } else {
      ungrouped.push(record);
    }
  }

  // Transform map to RecordGroup array
  const groups: RecordGroup[] = [];
  for (const [groupId, groupRecords] of groupMap) {
    const summary = computeGroupSummary(groupRecords);
    const expanded = expandedGroups.has(groupId) || (expandedGroups.size === 0 && defaultExpanded);

    groups.push({
      groupId,
      records: groupRecords,
      summary,
      expanded,
      summaryFromBackend: false, // We're computing client-side here
    });
  }

  // Sort groups by first record's order (preserve API sort)
  groups.sort((a, b) => {
    const aIndex = records.indexOf(a.records[0]);
    const bIndex = records.indexOf(b.records[0]);
    return aIndex - bIndex;
  });

  return {
    groups,
    ungrouped,
    totalGroups: groups.length,
    totalRecords: records.length,
  };
}

// ============================================================================
// Backend Grouped Payload Normalization (TX-058)
// ============================================================================

/**
 * Check whether list items follow backend grouped-row contract.
 */
export function hasBackendGroupedRows(records: Record<string, unknown>[]): boolean {
  if (records.length === 0) {
    return false;
  }
  let hasContractRows = false;
  for (const record of records) {
    if (isBackendGroupedRow(record)) {
      hasContractRows = true;
      continue;
    }
    if (isBackendUngroupedRow(record)) {
      hasContractRows = true;
      continue;
    }
    return false;
  }
  return hasContractRows;
}

/**
 * Normalize backend grouped payload (`group_by=translation_group_id`) into GroupedData.
 * Returns `null` when payload does not match grouped-row contract.
 */
export function normalizeBackendGroupedRows(
  records: Record<string, unknown>[],
  options: GroupTransformOptions = {}
): GroupedData | null {
  const {
    defaultExpanded = true,
    expandedGroups = new Set<string>(),
  } = options;

  if (!hasBackendGroupedRows(records)) {
    return null;
  }

  const groups: RecordGroup[] = [];
  const ungrouped: Record<string, unknown>[] = [];
  let totalRecords = 0;

  for (const row of records) {
    if (isBackendUngroupedRow(row)) {
      ungrouped.push({ ...row });
      totalRecords += 1;
      continue;
    }
    const groupId = getBackendGroupID(row);
    if (!groupId) {
      return null;
    }

    const children = getBackendGroupChildren(row);
    const summary = getBackendGroupSummary(row, children);
    const expanded = expandedGroups.has(groupId) || (expandedGroups.size === 0 && defaultExpanded);

    groups.push({
      groupId,
      displayLabel: getBackendGroupLabel(row, children),
      records: children,
      summary,
      expanded,
      summaryFromBackend: hasBackendGroupSummary(row),
    });

    totalRecords += children.length;
  }

  return {
    groups,
    ungrouped,
    totalGroups: groups.length,
    totalRecords,
  };
}

function isBackendGroupedRow(record: Record<string, unknown>): record is Record<string, unknown> & BackendGroupedRow {
  const row = record as BackendGroupedRow;
  const groupBy = typeof row.group_by === 'string'
    ? row.group_by.trim().toLowerCase()
    : '';
  const rowType = getBackendGroupRowType(record);
  const hasGroupedMarker = groupBy === 'translation_group_id' || rowType === 'group';
  if (!hasGroupedMarker) {
    return false;
  }
  const children = getBackendGroupChildren(record);
  return Array.isArray(children);
}

function isBackendUngroupedRow(record: Record<string, unknown>): boolean {
  const rowType = getBackendGroupRowType(record);
  return rowType === 'ungrouped';
}

function getBackendGroupRowType(record: Record<string, unknown>): string {
  const meta = record._group;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return '';
  }
  const raw = (meta as Record<string, unknown>).row_type;
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

function getBackendGroupID(record: Record<string, unknown>): string | null {
  const direct = record.translation_group_id;
  if (typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }
  const meta = record._group;
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return null;
  }
  const metaID = (meta as Record<string, unknown>).id;
  return typeof metaID === 'string' && metaID.trim() ? metaID.trim() : null;
}

function getBackendGroupChildren(record: Record<string, unknown>): Record<string, unknown>[] {
  const grouped = record as BackendGroupedRow;
  const primary = Array.isArray(grouped.records) ? grouped.records : grouped.children;
  if (Array.isArray(primary)) {
    const children = primary
      .filter((entry): entry is Record<string, unknown> => {
        return !!entry && typeof entry === 'object' && !Array.isArray(entry);
      })
      .map((entry) => ({ ...entry }));
    if (children.length > 0) {
      return children;
    }
  }

  const parent = grouped.parent;
  if (parent && typeof parent === 'object' && !Array.isArray(parent)) {
    return [{ ...(parent as Record<string, unknown>) }];
  }

  return [];
}

function hasBackendGroupSummary(record: Record<string, unknown>): boolean {
  const summary = record.translation_group_summary;
  return !!summary && typeof summary === 'object' && !Array.isArray(summary);
}

function getBackendGroupSummary(record: Record<string, unknown>, children: Record<string, unknown>[]): GroupSummary {
  const summary = record.translation_group_summary;
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return computeGroupSummary(children);
  }

  const raw = summary as Record<string, unknown>;
  const availableLocales = Array.isArray(raw.available_locales)
    ? raw.available_locales.filter(isString)
    : [];
  const missingLocales = Array.isArray(raw.missing_locales)
    ? raw.missing_locales.filter(isString)
    : [];
  const readinessState = isValidReadinessState(raw.readiness_state)
    ? raw.readiness_state
    : null;
  const fallbackTotal = Math.max(children.length, typeof raw.child_count === 'number' ? Math.max(raw.child_count, 0) : 0);

  return {
    totalItems: typeof raw.total_items === 'number'
      ? Math.max(raw.total_items, 0)
      : fallbackTotal,
    availableLocales,
    missingLocales,
    readinessState,
    readyForPublish: typeof raw.ready_for_publish === 'boolean' ? raw.ready_for_publish : null,
  };
}

function getBackendGroupLabel(record: Record<string, unknown>, children: Record<string, unknown>[]): string | undefined {
  const directLabel = record.translation_group_label;
  if (typeof directLabel === 'string' && directLabel.trim()) {
    return directLabel.trim();
  }

  const summary = record.translation_group_summary;
  if (summary && typeof summary === 'object' && !Array.isArray(summary)) {
    const summaryLabel = (summary as Record<string, unknown>).group_label;
    if (typeof summaryLabel === 'string' && summaryLabel.trim()) {
      return summaryLabel.trim();
    }
  }

  const meta = record._group;
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    const metaLabel = (meta as Record<string, unknown>).label;
    if (typeof metaLabel === 'string' && metaLabel.trim()) {
      return metaLabel.trim();
    }
  }

  const candidates: unknown[] = [];
  const parent = (record as BackendGroupedRow).parent;
  if (parent && typeof parent === 'object' && !Array.isArray(parent)) {
    const parentRecord = parent as Record<string, unknown>;
    candidates.push(parentRecord.title, parentRecord.name, parentRecord.slug, parentRecord.path);
  }
  if (children.length > 0) {
    candidates.push(children[0].title, children[0].name, children[0].slug, children[0].path);
  }
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return undefined;
}

/**
 * Extract group ID from a record.
 */
function getGroupId(record: Record<string, unknown>, field: string): string | null {
  const value = record[field];
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  // Try nested paths (e.g., translation.meta.translation_group_id)
  const nestedPaths = [
    `translation.meta.${field}`,
    `content_translation.meta.${field}`,
  ];

  for (const path of nestedPaths) {
    const nested = getNestedValue(record, path);
    if (typeof nested === 'string' && nested.trim()) {
      return nested;
    }
  }

  return null;
}

/**
 * Get nested value from object by dot-separated path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Compute group summary from records (client-side fallback).
 * Backend summary should be preferred when available.
 */
function computeGroupSummary(records: Record<string, unknown>[]): GroupSummary {
  const allAvailable = new Set<string>();
  const allMissing = new Set<string>();
  let hasIncomplete = false;
  let readyCount = 0;

  for (const record of records) {
    const readiness = record.translation_readiness as Record<string, unknown> | undefined;

    if (readiness) {
      const available = readiness.available_locales;
      const missing = readiness.missing_required_locales;
      const state = readiness.readiness_state;

      if (Array.isArray(available)) {
        available.filter(isString).forEach((loc) => allAvailable.add(loc));
      }
      if (Array.isArray(missing)) {
        missing.filter(isString).forEach((loc) => allMissing.add(loc));
      }
      if (state === 'missing_fields' || state === 'missing_locales_and_fields') {
        hasIncomplete = true;
      }
      if (state === 'ready') {
        readyCount++;
      }
    }

    // Also check legacy available_locales
    const legacyAvailable = record.available_locales;
    if (Array.isArray(legacyAvailable)) {
      legacyAvailable.filter(isString).forEach((loc) => allAvailable.add(loc));
    }
  }

  // Determine overall readiness state
  let readinessState: GroupSummary['readinessState'] = null;
  if (records.length > 0) {
    const allReady = readyCount === records.length;
    const hasMissing = allMissing.size > 0;

    if (allReady) {
      readinessState = 'ready';
    } else if (hasMissing && hasIncomplete) {
      readinessState = 'missing_locales_and_fields';
    } else if (hasMissing) {
      readinessState = 'missing_locales';
    } else if (hasIncomplete) {
      readinessState = 'missing_fields';
    }
  }

  return {
    totalItems: records.length,
    availableLocales: Array.from(allAvailable),
    missingLocales: Array.from(allMissing),
    readinessState,
    readyForPublish: readinessState === 'ready',
  };
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// ============================================================================
// Backend Summary Merging
// ============================================================================

/**
 * Merge backend-provided group summaries into grouped data.
 * Backend summaries override client-computed summaries.
 *
 * @param groupedData - Client-computed grouped data
 * @param backendSummaries - Map of groupId to backend summary
 * @returns Grouped data with backend summaries merged
 */
export function mergeBackendSummaries(
  groupedData: GroupedData,
  backendSummaries: Map<string, Partial<GroupSummary>>
): GroupedData {
  const groups = groupedData.groups.map((group) => {
    const backendSummary = backendSummaries.get(group.groupId);
    if (backendSummary) {
      return {
        ...group,
        summary: {
          ...group.summary,
          ...backendSummary,
        },
        summaryFromBackend: true,
      };
    }
    return group;
  });

  return {
    ...groupedData,
    groups,
  };
}

/**
 * Extract backend summaries from API response metadata.
 * Looks for `group_summaries` in response.
 */
export function extractBackendSummaries(
  response: Record<string, unknown>
): Map<string, Partial<GroupSummary>> {
  const summaries = new Map<string, Partial<GroupSummary>>();

  const groupSummaries = response.group_summaries;
  if (!groupSummaries || typeof groupSummaries !== 'object' || Array.isArray(groupSummaries)) {
    return summaries;
  }

  for (const [groupId, summary] of Object.entries(groupSummaries as Record<string, unknown>)) {
    if (summary && typeof summary === 'object') {
      const s = summary as Record<string, unknown>;
      summaries.set(groupId, {
        totalItems: typeof s.total_items === 'number' ? s.total_items : undefined,
        availableLocales: Array.isArray(s.available_locales) ? s.available_locales.filter(isString) : undefined,
        missingLocales: Array.isArray(s.missing_locales) ? s.missing_locales.filter(isString) : undefined,
        readinessState: isValidReadinessState(s.readiness_state) ? s.readiness_state : undefined,
        readyForPublish: typeof s.ready_for_publish === 'boolean' ? s.ready_for_publish : undefined,
      });
    }
  }

  return summaries;
}

function isValidReadinessState(
  value: unknown
): value is 'ready' | 'missing_locales' | 'missing_fields' | 'missing_locales_and_fields' {
  return (
    value === 'ready' ||
    value === 'missing_locales' ||
    value === 'missing_fields' ||
    value === 'missing_locales_and_fields'
  );
}

// ============================================================================
// Expand/Collapse State Management (TX-057)
// ============================================================================

const EXPAND_STATE_KEY_PREFIX = 'datagrid-expand-state-';

/**
 * Get persisted expand state for a panel.
 */
export function getPersistedExpandState(panelId: string): Set<string> {
  try {
    const key = EXPAND_STATE_KEY_PREFIX + panelId;
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter(isString));
      }
    }
  } catch {
    // Ignore storage errors
  }
  return new Set<string>();
}

/**
 * Whether a panel has persisted expand/collapse preferences.
 * Distinguishes "no preference stored yet" from an explicitly collapsed-all state.
 */
export function hasPersistedExpandState(panelId: string): boolean {
  try {
    const key = EXPAND_STATE_KEY_PREFIX + panelId;
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Persist expand state for a panel.
 */
export function persistExpandState(panelId: string, expandedGroups: Set<string>): void {
  try {
    const key = EXPAND_STATE_KEY_PREFIX + panelId;
    localStorage.setItem(key, JSON.stringify(Array.from(expandedGroups)));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Toggle expand state for a group.
 */
export function toggleGroupExpand(
  groupedData: GroupedData,
  groupId: string
): GroupedData {
  const groups = groupedData.groups.map((group) => {
    if (group.groupId === groupId) {
      return { ...group, expanded: !group.expanded };
    }
    return group;
  });

  return { ...groupedData, groups };
}

/**
 * Expand all groups.
 *
 * Note: This only affects grouped records (those with translation_group_id).
 * Ungrouped records (in groupedData.ungrouped) are always visible and
 * are not affected by expand/collapse operations.
 */
export function expandAllGroups(groupedData: GroupedData): GroupedData {
  const groups = groupedData.groups.map((group) => ({
    ...group,
    expanded: true,
  }));
  return { ...groupedData, groups };
}

/**
 * Collapse all groups.
 *
 * Note: This only affects grouped records (those with translation_group_id).
 * Ungrouped records (in groupedData.ungrouped) are always visible and
 * are not affected by expand/collapse operations. This is the expected
 * behavior for mixed datasets where some records have translation groups
 * and others are standalone.
 */
export function collapseAllGroups(groupedData: GroupedData): GroupedData {
  const groups = groupedData.groups.map((group) => ({
    ...group,
    expanded: false,
  }));
  return { ...groupedData, groups };
}

/**
 * Get set of currently expanded group IDs.
 */
export function getExpandedGroupIds(groupedData: GroupedData): Set<string> {
  const expanded = new Set<string>();
  for (const group of groupedData.groups) {
    if (group.expanded) {
      expanded.add(group.groupId);
    }
  }
  return expanded;
}

// ============================================================================
// View Mode Persistence (TX-034)
// ============================================================================

const VIEW_MODE_KEY_PREFIX = 'datagrid-view-mode-';
const MAX_EXPANDED_GROUPS_TOKEN_ITEMS = 200;
const MAX_EXPANDED_GROUP_ID_LENGTH = 256;

/**
 * Get persisted view mode for a panel.
 */
export function getPersistedViewMode(panelId: string): ViewMode | null {
  try {
    const key = VIEW_MODE_KEY_PREFIX + panelId;
    const stored = localStorage.getItem(key);
    if (stored && isValidViewMode(stored)) {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

/**
 * Persist view mode for a panel.
 */
export function persistViewMode(panelId: string, mode: ViewMode): void {
  try {
    const key = VIEW_MODE_KEY_PREFIX + panelId;
    localStorage.setItem(key, mode);
  } catch {
    // Ignore storage errors
  }
}

function isValidViewMode(value: string): value is ViewMode {
  return value === 'flat' || value === 'grouped' || value === 'matrix';
}

/**
 * Parse view mode from URL query parameter.
 */
export function parseViewMode(value: string | null): ViewMode | null {
  if (!value) return null;
  return isValidViewMode(value) ? value : null;
}

/**
 * Encode expanded group IDs into a compact URL-safe token.
 * Token strategy: URI-encode each group ID, sort deterministically, join with commas.
 */
export function encodeExpandedGroupsToken(expandedGroups: Set<string>): string {
  if (!(expandedGroups instanceof Set) || expandedGroups.size === 0) {
    return '';
  }

  const normalized = Array.from(new Set(
    Array.from(expandedGroups)
      .map((value) => sanitizeGroupId(value))
      .filter((value): value is string => value !== null)
  )).sort();

  if (normalized.length === 0) {
    return '';
  }

  return normalized.map((groupId) => encodeURIComponent(groupId)).join(',');
}

/**
 * Decode expanded group token into a validated Set of group IDs.
 */
export function decodeExpandedGroupsToken(token: string | null): Set<string> {
  const expanded = new Set<string>();
  if (!token) {
    return expanded;
  }

  const segments = token.split(',');
  for (const segment of segments) {
    if (expanded.size >= MAX_EXPANDED_GROUPS_TOKEN_ITEMS) {
      break;
    }

    if (!segment) {
      continue;
    }

    let decoded = '';
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      continue;
    }

    const normalized = sanitizeGroupId(decoded);
    if (normalized) {
      expanded.add(normalized);
    }
  }

  return expanded;
}

function sanitizeGroupId(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > MAX_EXPANDED_GROUP_ID_LENGTH) {
    return null;
  }
  return trimmed;
}

// ============================================================================
// Group Rendering Helpers (TX-056)
// ============================================================================

/**
 * Render group header summary HTML.
 * Displays locale completeness and readiness state.
 */
export function renderGroupHeaderSummary(
  group: RecordGroup,
  options: { size?: 'sm' | 'md' } = {}
): string {
  const { summary } = group;
  const { size = 'sm' } = options;

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const availableCount = summary.availableLocales.length;
  const missingCount = summary.missingLocales.length;
  const totalLocales = availableCount + missingCount;

  // Readiness badge
  let readinessBadge = '';
  if (summary.readinessState) {
    const stateConfig = getReadinessStateConfig(summary.readinessState);
    readinessBadge = `
      <span class="${textSize} px-1.5 py-0.5 rounded ${stateConfig.bgClass} ${stateConfig.textClass}"
            title="${stateConfig.description}">
        ${stateConfig.icon} ${stateConfig.label}
      </span>
    `;
  }

  // Locale count
  const localeCount = totalLocales > 0
    ? `<span class="${textSize} text-gray-500">${availableCount}/${totalLocales} locales</span>`
    : '';

  // Item count
  const itemCount = `<span class="${textSize} text-gray-500">${summary.totalItems} item${summary.totalItems !== 1 ? 's' : ''}</span>`;

  return `
    <div class="inline-flex items-center gap-2">
      ${readinessBadge}
      ${localeCount}
      ${itemCount}
    </div>
  `;
}

/**
 * Get configuration for readiness state display.
 */
function getReadinessStateConfig(state: GroupSummary['readinessState']): {
  icon: string;
  label: string;
  bgClass: string;
  textClass: string;
  description: string;
} {
  switch (state) {
    case 'ready':
      return {
        icon: '●',
        label: 'Ready',
        bgClass: 'bg-green-100',
        textClass: 'text-green-700',
        description: 'All translations complete',
      };
    case 'missing_locales':
      return {
        icon: '○',
        label: 'Missing',
        bgClass: 'bg-amber-100',
        textClass: 'text-amber-700',
        description: 'Missing required locale translations',
      };
    case 'missing_fields':
      return {
        icon: '◐',
        label: 'Incomplete',
        bgClass: 'bg-yellow-100',
        textClass: 'text-yellow-700',
        description: 'Has translations but missing required fields',
      };
    case 'missing_locales_and_fields':
      return {
        icon: '⚠',
        label: 'Not Ready',
        bgClass: 'bg-red-100',
        textClass: 'text-red-700',
        description: 'Missing translations and required fields',
      };
    default:
      return {
        icon: '?',
        label: 'Unknown',
        bgClass: 'bg-gray-100',
        textClass: 'text-gray-700',
        description: 'Status unknown',
      };
  }
}

/**
 * Derive a meaningful label for a group from its records.
 * Prefers: displayLabel > first record's title/name > fallback label.
 */
function deriveGroupLabel(group: RecordGroup): string {
  // Priority 1: Explicit displayLabel
  if (typeof group.displayLabel === 'string' && group.displayLabel.trim()) {
    return group.displayLabel.trim();
  }

  // Priority 2: Check if this is an ungrouped pseudo-group
  if (group.groupId.startsWith('ungrouped:')) {
    return 'Ungrouped Records';
  }

  // Priority 3: Derive from first record's title/name field
  if (group.records.length > 0) {
    const firstRecord = group.records[0];
    // Try common title fields
    for (const field of ['title', 'name', 'label', 'subject']) {
      const value = firstRecord[field];
      if (typeof value === 'string' && value.trim()) {
        // Truncate long titles
        const trimmed = value.trim();
        return trimmed.length > 60 ? trimmed.slice(0, 57) + '...' : trimmed;
      }
    }
  }

  // Priority 4: Fallback with group ID hint
  const shortId = group.groupId.length > 8 ? group.groupId.slice(0, 8) + '...' : group.groupId;
  return `Translation Group (${shortId})`;
}

/**
 * Render group header row HTML for the DataGrid.
 *
 * Group header semantics:
 * - Groups show an expandable/collapsible header with a derived label
 * - Label is derived from: displayLabel > first record's title > fallback
 * - Ungrouped records (those without translation_group_id) are rendered
 *   as regular rows without a header, after all grouped content
 * - Collapse All only affects grouped records, not ungrouped rows
 */
export function renderGroupHeaderRow(
  group: RecordGroup,
  colSpan: number,
  options: { showExpandIcon?: boolean } = {}
): string {
  const { showExpandIcon = true } = options;
  const expandIcon = showExpandIcon
    ? `<span class="expand-icon mr-2" aria-hidden="true">${group.expanded ? '▼' : '▶'}</span>`
    : '';

  const summaryHtml = renderGroupHeaderSummary(group);
  const groupLabel = escapeHtml(deriveGroupLabel(group));
  const recordCount = group.records.length;
  const countBadge = recordCount > 1
    ? `<span class="ml-2 text-xs text-gray-500">(${recordCount} locales)</span>`
    : '';

  return `
    <tr class="group-header bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-gray-200"
        data-group-id="${escapeAttr(group.groupId)}"
        data-expanded="${group.expanded}"
        role="row"
        aria-expanded="${group.expanded}"
        tabindex="0">
      <td colspan="${colSpan + 2}" class="px-4 py-2">
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            ${expandIcon}
            <span class="font-medium text-gray-700">${groupLabel}</span>
            ${countBadge}
          </div>
          ${summaryHtml}
        </div>
      </td>
    </tr>
  `;
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Escape attribute value.
 */
function escapeAttr(str: string): string {
  return escapeHtml(str);
}

// ============================================================================
// Empty and Loading States (TX-061, TX-062)
// ============================================================================

/**
 * Render grouped mode empty state.
 */
export function renderGroupedEmptyState(colSpan: number): string {
  return `
    <tr>
      <td colspan="${colSpan + 2}" class="px-6 py-12 text-center">
        <div class="text-gray-500">
          <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">No translation groups</h3>
          <p class="mt-1 text-sm text-gray-500">No grouped translations found for this content type.</p>
        </div>
      </td>
    </tr>
  `;
}

/**
 * Render grouped mode loading state.
 */
export function renderGroupedLoadingState(colSpan: number): string {
  return `
    <tr>
      <td colspan="${colSpan + 2}" class="px-6 py-12 text-center">
        <div class="flex items-center justify-center">
          <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="ml-2 text-gray-500">Loading groups...</span>
        </div>
      </td>
    </tr>
  `;
}

// ============================================================================
// Error Boundary (TX-060)
// ============================================================================

/**
 * Render grouped mode error state.
 */
export function renderGroupedErrorState(
  colSpan: number,
  error: string,
  onRetry?: () => void
): string {
  const retryButton = onRetry
    ? `<button type="button" class="mt-2 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600" onclick="this.dispatchEvent(new CustomEvent('retry', { bubbles: true }))">Retry</button>`
    : '';

  return `
    <tr>
      <td colspan="${colSpan + 2}" class="px-6 py-12 text-center">
        <div class="text-red-500">
          <svg class="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">Error loading groups</h3>
          <p class="mt-1 text-sm text-gray-500">${escapeHtml(error)}</p>
          ${retryButton}
        </div>
      </td>
    </tr>
  `;
}

// ============================================================================
// Mobile/Responsive Helpers (TX-063)
// ============================================================================

/**
 * Check if we're in narrow viewport mode.
 */
export function isNarrowViewport(breakpoint: number = 768): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoint;
}

/**
 * Get recommended view mode for viewport.
 * On narrow viewports, prefer flat mode over grouped.
 */
export function getViewModeForViewport(
  preferredMode: ViewMode,
  breakpoint: number = 768
): ViewMode {
  if (isNarrowViewport(breakpoint) && preferredMode === 'grouped') {
    return 'flat';
  }
  return preferredMode;
}
