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
/**
 * View mode for DataGrid
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
 * Transform flat records into grouped structure by translation_group_id.
 *
 * @param records - Array of records from API
 * @param options - Grouping options
 * @returns Grouped data structure
 */
export declare function transformToGroups(records: Record<string, unknown>[], options?: GroupTransformOptions): GroupedData;
/**
 * Check whether list items follow backend grouped-row contract.
 */
export declare function hasBackendGroupedRows(records: Record<string, unknown>[]): boolean;
/**
 * Normalize backend grouped payload (`group_by=translation_group_id`) into GroupedData.
 * Returns `null` when payload does not match grouped-row contract.
 */
export declare function normalizeBackendGroupedRows(records: Record<string, unknown>[], options?: GroupTransformOptions): GroupedData | null;
/**
 * Merge backend-provided group summaries into grouped data.
 * Backend summaries override client-computed summaries.
 *
 * @param groupedData - Client-computed grouped data
 * @param backendSummaries - Map of groupId to backend summary
 * @returns Grouped data with backend summaries merged
 */
export declare function mergeBackendSummaries(groupedData: GroupedData, backendSummaries: Map<string, Partial<GroupSummary>>): GroupedData;
/**
 * Extract backend summaries from API response metadata.
 * Looks for `group_summaries` in response.
 */
export declare function extractBackendSummaries(response: Record<string, unknown>): Map<string, Partial<GroupSummary>>;
/**
 * Get persisted expand state for a panel.
 */
export declare function getPersistedExpandState(panelId: string): Set<string>;
/**
 * Whether a panel has persisted expand/collapse preferences.
 * Distinguishes "no preference stored yet" from an explicitly collapsed-all state.
 */
export declare function hasPersistedExpandState(panelId: string): boolean;
/**
 * Persist expand state for a panel.
 */
export declare function persistExpandState(panelId: string, expandedGroups: Set<string>): void;
/**
 * Toggle expand state for a group.
 */
export declare function toggleGroupExpand(groupedData: GroupedData, groupId: string): GroupedData;
/**
 * Expand all groups.
 */
export declare function expandAllGroups(groupedData: GroupedData): GroupedData;
/**
 * Collapse all groups.
 */
export declare function collapseAllGroups(groupedData: GroupedData): GroupedData;
/**
 * Get set of currently expanded group IDs.
 */
export declare function getExpandedGroupIds(groupedData: GroupedData): Set<string>;
/**
 * Get persisted view mode for a panel.
 */
export declare function getPersistedViewMode(panelId: string): ViewMode | null;
/**
 * Persist view mode for a panel.
 */
export declare function persistViewMode(panelId: string, mode: ViewMode): void;
/**
 * Parse view mode from URL query parameter.
 */
export declare function parseViewMode(value: string | null): ViewMode | null;
/**
 * Encode expanded group IDs into a compact URL-safe token.
 * Token strategy: URI-encode each group ID, sort deterministically, join with commas.
 */
export declare function encodeExpandedGroupsToken(expandedGroups: Set<string>): string;
/**
 * Decode expanded group token into a validated Set of group IDs.
 */
export declare function decodeExpandedGroupsToken(token: string | null): Set<string>;
/**
 * Render group header summary HTML.
 * Displays locale completeness and readiness state.
 */
export declare function renderGroupHeaderSummary(group: RecordGroup, options?: {
    size?: 'sm' | 'md';
}): string;
/**
 * Render group header row HTML for the DataGrid.
 */
export declare function renderGroupHeaderRow(group: RecordGroup, colSpan: number, options?: {
    showExpandIcon?: boolean;
}): string;
/**
 * Render grouped mode empty state.
 */
export declare function renderGroupedEmptyState(colSpan: number): string;
/**
 * Render grouped mode loading state.
 */
export declare function renderGroupedLoadingState(colSpan: number): string;
/**
 * Render grouped mode error state.
 */
export declare function renderGroupedErrorState(colSpan: number, error: string, onRetry?: () => void): string;
/**
 * Check if we're in narrow viewport mode.
 */
export declare function isNarrowViewport(breakpoint?: number): boolean;
/**
 * Get recommended view mode for viewport.
 * On narrow viewports, prefer flat mode over grouped.
 */
export declare function getViewModeForViewport(preferredMode: ViewMode, breakpoint?: number): ViewMode;
//# sourceMappingURL=grouped-mode.d.ts.map