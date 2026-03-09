/**
 * Linked Field Placement Module (Phase 3)
 *
 * Enables automatic field placement propagation within link groups.
 * When a field in a link group is manually placed, its position is saved as a template.
 * When navigating to other pages, unplaced fields for that page are auto-placed at the template position.
 *
 * Behavior rules:
 * 1. First manually placed field in a group sets the template position
 * 2. When navigating to a new page, unplaced linked fields for that page are auto-placed
 * 3. Manual placements are never overwritten
 * 4. Unlinking a field stops future propagation to that field
 * 5. Auto-linked placements become manual once user drags/resizes that field
 */
import type { LinkGroup, LinkGroupState, LinkGroupTemplatePosition, NormalizedPlacementInstance } from './contracts';
/**
 * Generate a unique link group ID
 */
export declare function generateLinkGroupId(): string;
/**
 * Create initial link group state
 */
export declare function createLinkGroupState(): LinkGroupState;
/**
 * Create a new link group from field definition IDs
 */
export declare function createLinkGroup(definitionIds: string[], name?: string): LinkGroup;
/**
 * Add a link group to the state
 */
export declare function addLinkGroup(state: LinkGroupState, group: LinkGroup): LinkGroupState;
/**
 * Remove a link group from the state
 */
export declare function removeLinkGroup(state: LinkGroupState, groupId: string): LinkGroupState;
/**
 * Unlink a field definition from its group
 * The field will no longer receive linked placements but remains in the group
 */
export declare function unlinkField(state: LinkGroupState, definitionId: string): LinkGroupState;
/**
 * Re-link a previously unlinked field
 */
export declare function relinkField(state: LinkGroupState, definitionId: string): LinkGroupState;
/**
 * Check if a field is linked (belongs to a group and is not unlinked)
 */
export declare function isFieldLinked(state: LinkGroupState, definitionId: string): boolean;
/**
 * Get the link group for a field definition
 */
export declare function getFieldLinkGroup(state: LinkGroupState, definitionId: string): LinkGroup | undefined;
/**
 * Get linked siblings for a field definition (other fields in the same group)
 */
export declare function getLinkedSiblings(state: LinkGroupState, definitionId: string): string[];
/**
 * Result of setting template position
 */
export interface SetTemplateResult {
    /** Updated link group with template position set */
    updatedGroup: LinkGroup;
}
/**
 * Set template position for a link group when first field is manually placed.
 * This does NOT place any siblings - it just saves the position for later use.
 *
 * @param state Current link group state
 * @param sourcePlacement The placement that triggered this (manual placement)
 * @returns Updated group with template position, or null if not applicable
 */
export declare function setLinkGroupTemplatePosition(state: LinkGroupState, sourcePlacement: NormalizedPlacementInstance): SetTemplateResult | null;
/**
 * Result of computing linked placement for a page
 */
export interface LinkedPlacementForPageResult {
    /** New placement to create (or null if none needed) */
    newPlacement: NormalizedPlacementInstance | null;
}
/**
 * Compute linked placement for a specific page when navigating.
 * Finds the unplaced linked field for the given page and creates a placement at the template position.
 *
 * @param state Current link group state
 * @param targetPage The page being navigated to
 * @param existingPlacements All existing placements (to avoid duplicates)
 * @param fieldDefinitions Map of definition ID to field metadata including page
 * @returns New placement to create, or null if no unplaced field for this page
 */
export declare function computeLinkedPlacementForPage(state: LinkGroupState, targetPage: number, existingPlacements: NormalizedPlacementInstance[], fieldDefinitions: Map<string, {
    type: string;
    participantId: string;
    participantName: string;
    page: number;
    linkGroupId?: string;
}>): LinkedPlacementForPageResult | null;
/**
 * @deprecated Use setLinkGroupTemplatePosition and computeLinkedPlacementForPage instead.
 * This function is kept for backwards compatibility with tests.
 */
export interface LinkedPlacementResult {
    /** New placements to create for linked fields */
    newPlacements: NormalizedPlacementInstance[];
    /** Updated link group with source field set */
    updatedGroup: LinkGroup;
}
/**
 * @deprecated Use setLinkGroupTemplatePosition and computeLinkedPlacementForPage instead.
 * Compute linked placements - now only sets template position without placing siblings.
 */
export declare function computeLinkedPlacements(state: LinkGroupState, sourcePlacement: NormalizedPlacementInstance, existingPlacements: NormalizedPlacementInstance[], fieldDefinitions: Map<string, {
    type: string;
    participantId: string;
    participantName: string;
}>): LinkedPlacementResult | null;
/**
 * Convert a linked placement to manual when user modifies it
 * This prevents future automatic updates to this placement
 */
export declare function convertToManualPlacement(placement: NormalizedPlacementInstance): NormalizedPlacementInstance;
/**
 * Check if a placement was created via linking
 */
export declare function isLinkedPlacement(placement: NormalizedPlacementInstance): boolean;
/**
 * Create link groups from field rules (automation rules that generate multiple fields)
 * Each rule that generates multiple fields creates a link group
 */
export declare function createLinkGroupsFromRules(expandedFields: Array<{
    id: string;
    ruleId: string;
    type: string;
    page: number;
    participantId: string;
}>): LinkGroup[];
/**
 * Serialize link group state for persistence
 */
export declare function serializeLinkGroupState(state: LinkGroupState): {
    groups: Array<{
        id: string;
        name?: string;
        memberDefinitionIds: string[];
        sourceFieldId?: string;
        isActive: boolean;
        templatePosition?: LinkGroupTemplatePosition;
    }>;
    unlinkedDefinitions: string[];
};
/**
 * Deserialize link group state from persistence
 */
export declare function deserializeLinkGroupState(data: {
    groups?: Array<{
        id: string;
        name?: string;
        memberDefinitionIds: string[];
        sourceFieldId?: string;
        isActive: boolean;
        templatePosition?: LinkGroupTemplatePosition;
    }>;
    unlinkedDefinitions?: string[];
}): LinkGroupState;
//# sourceMappingURL=linked-placement.d.ts.map