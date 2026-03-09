import type { PlacementSource } from './constants';
export type FieldRuleType = 'initials_each_page' | 'signature_once';
export interface AgreementDocumentOption {
    id: string;
    title: string;
    pageCount: number;
}
export interface FieldRuleState {
    id: string;
    type: FieldRuleType | string;
    participantId: string;
    participantTempId: string;
    fromPage: number;
    toPage: number;
    page: number;
    excludeLastPage: boolean;
    excludePages: number[];
    required: boolean;
}
export interface FieldRuleFormPayload {
    id: string;
    type: string;
    participant_id: string;
    from_page: number;
    to_page: number;
    page: number;
    exclude_last_page: boolean;
    exclude_pages: number[];
    required: boolean;
}
export interface ExpandedRuleField {
    id: string;
    type: 'initials' | 'signature';
    page: number;
    participantId: string;
    required: boolean;
    /** Rule ID that generated this field (for link group creation in Phase 3) */
    ruleId?: string;
}
export type RuleExpansionPageRange = {
    start: number;
    end: number;
};
export interface EffectivePageResult {
    pages: number[];
    rangeStart: number;
    rangeEnd: number;
    excludedPages: number[];
    isEmpty: boolean;
}
export type RawPlacementInstance = Record<string, unknown> | null | undefined;
export interface NormalizedPlacementInstance {
    id: string;
    definitionId: string;
    type: string;
    participantId: string;
    participantName: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    placementSource: PlacementSource;
    /** Link group ID for linked field placement (Phase 3) */
    linkGroupId?: string;
    /** Whether this field has been unlinked from its group */
    isUnlinked?: boolean;
    /** ID of the source field that triggered this linked placement */
    linkedFromFieldId?: string;
}
export interface PlacementFormPayload {
    id: string;
    definition_id: string;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    /** Link group ID for linked field placement (Phase 3) */
    link_group_id?: string;
    /** Whether this field has been unlinked from its group */
    is_unlinked?: boolean;
    /** ID of the source field that triggered this linked placement */
    linked_from_field_id?: string;
    /** Placement source (auto, manual, auto_linked) */
    placement_source?: string;
}
/**
 * Template position for linked field placement.
 * When first field in a group is placed, this position is saved as the template.
 * Subsequent fields on other pages will be auto-placed at this same position.
 */
export interface LinkGroupTemplatePosition {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Link group definition for field placement (Phase 3)
 * Groups fields that should be placed together when any member is manually placed.
 */
export interface LinkGroup {
    /** Unique identifier for the link group */
    id: string;
    /** Human-readable name for the link group (e.g., "Initials pages 1-5") */
    name?: string;
    /** IDs of field definitions that belong to this group */
    memberDefinitionIds: string[];
    /** ID of the first field that was manually placed (triggers linked placements) */
    sourceFieldId?: string;
    /** Whether the group is active (linked placements enabled) */
    isActive: boolean;
    /** Template position from first placed field - used for auto-placing on page navigation */
    templatePosition?: LinkGroupTemplatePosition;
}
/**
 * State for managing link groups in the placement editor
 */
export interface LinkGroupState {
    /** Map of link group ID to LinkGroup */
    groups: Map<string, LinkGroup>;
    /** Map of definition ID to link group ID for quick lookup */
    definitionToGroup: Map<string, string>;
    /** Set of definition IDs that have been manually unlinked */
    unlinkedDefinitions: Set<string>;
}
/**
 * Document summary for typeahead results
 */
export interface DocumentSummary {
    id: string;
    title: string;
    pageCount: number;
    createdAt?: string;
    updatedAt?: string;
}
/**
 * Document typeahead state for managing dropdown behavior
 */
export interface DocumentTypeaheadState {
    isOpen: boolean;
    query: string;
    recentDocuments: DocumentSummary[];
    searchResults: DocumentSummary[];
    selectedIndex: number;
    isLoading: boolean;
    isSearchMode: boolean;
}
/**
 * Document preview card state
 */
export interface DocumentPreviewState {
    documentId: string | null;
    documentTitle: string | null;
    pageCount: number | null;
    thumbnailUrl: string | null;
    isLoading: boolean;
    error: string | null;
}
/**
 * Document preview card configuration
 */
export interface DocumentPreviewConfig {
    apiBasePath: string;
    basePath: string;
    thumbnailMaxWidth: number;
    thumbnailMaxHeight: number;
}
//# sourceMappingURL=contracts.d.ts.map