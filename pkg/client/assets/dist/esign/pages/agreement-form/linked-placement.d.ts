/**
 * Linked Field Placement Module (Phase 3)
 *
 * Enables automatic field placement propagation within link groups.
 * When a field in a link group is manually placed, other members of the
 * group automatically receive placements at the same position.
 *
 * Behavior rules:
 * 1. Fields in the same link group auto-place from any first manually placed member
 * 2. Manual placements are never overwritten
 * 3. Unlinking a field stops future propagation to that field
 * 4. Auto-linked placements become manual once user drags/resizes that field
 */
import type { LinkGroup, LinkGroupState, NormalizedPlacementInstance } from './contracts';
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
 * Result of computing linked placements
 */
export interface LinkedPlacementResult {
    /** New placements to create for linked fields */
    newPlacements: NormalizedPlacementInstance[];
    /** Updated link group with source field set */
    updatedGroup: LinkGroup;
}
/**
 * Compute linked placements when a field is manually placed
 *
 * @param state Current link group state
 * @param sourcePlacement The placement that triggered this (manual placement)
 * @param existingPlacements All existing placements (to avoid duplicates)
 * @param fieldDefinitions Map of definition ID to field metadata
 * @returns New placements to create and updated group
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
    }>;
    unlinkedDefinitions?: string[];
}): LinkGroupState;
//# sourceMappingURL=linked-placement.d.ts.map