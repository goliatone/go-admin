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

import type {
  LinkGroup,
  LinkGroupState,
  NormalizedPlacementInstance,
} from './contracts';
import { LINKED_PLACEMENT_DEFAULTS, PLACEMENT_SOURCE } from './constants';

/**
 * Generate a unique link group ID
 */
export function generateLinkGroupId(): string {
  return `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create initial link group state
 */
export function createLinkGroupState(): LinkGroupState {
  return {
    groups: new Map(),
    definitionToGroup: new Map(),
    unlinkedDefinitions: new Set(),
  };
}

/**
 * Create a new link group from field definition IDs
 */
export function createLinkGroup(
  definitionIds: string[],
  name?: string
): LinkGroup {
  return {
    id: generateLinkGroupId(),
    name,
    memberDefinitionIds: [...definitionIds],
    sourceFieldId: undefined,
    isActive: true,
  };
}

/**
 * Add a link group to the state
 */
export function addLinkGroup(
  state: LinkGroupState,
  group: LinkGroup
): LinkGroupState {
  const newGroups = new Map(state.groups);
  newGroups.set(group.id, group);

  const newDefinitionToGroup = new Map(state.definitionToGroup);
  for (const defId of group.memberDefinitionIds) {
    newDefinitionToGroup.set(defId, group.id);
  }

  return {
    ...state,
    groups: newGroups,
    definitionToGroup: newDefinitionToGroup,
  };
}

/**
 * Remove a link group from the state
 */
export function removeLinkGroup(
  state: LinkGroupState,
  groupId: string
): LinkGroupState {
  const group = state.groups.get(groupId);
  if (!group) return state;

  const newGroups = new Map(state.groups);
  newGroups.delete(groupId);

  const newDefinitionToGroup = new Map(state.definitionToGroup);
  for (const defId of group.memberDefinitionIds) {
    if (newDefinitionToGroup.get(defId) === groupId) {
      newDefinitionToGroup.delete(defId);
    }
  }

  return {
    ...state,
    groups: newGroups,
    definitionToGroup: newDefinitionToGroup,
  };
}

/**
 * Unlink a field definition from its group
 * The field will no longer receive linked placements but remains in the group
 */
export function unlinkField(
  state: LinkGroupState,
  definitionId: string
): LinkGroupState {
  const newUnlinked = new Set(state.unlinkedDefinitions);
  newUnlinked.add(definitionId);
  return {
    ...state,
    unlinkedDefinitions: newUnlinked,
  };
}

/**
 * Re-link a previously unlinked field
 */
export function relinkField(
  state: LinkGroupState,
  definitionId: string
): LinkGroupState {
  const newUnlinked = new Set(state.unlinkedDefinitions);
  newUnlinked.delete(definitionId);
  return {
    ...state,
    unlinkedDefinitions: newUnlinked,
  };
}

/**
 * Check if a field is linked (belongs to a group and is not unlinked)
 */
export function isFieldLinked(
  state: LinkGroupState,
  definitionId: string
): boolean {
  return (
    state.definitionToGroup.has(definitionId) &&
    !state.unlinkedDefinitions.has(definitionId)
  );
}

/**
 * Get the link group for a field definition
 */
export function getFieldLinkGroup(
  state: LinkGroupState,
  definitionId: string
): LinkGroup | undefined {
  const groupId = state.definitionToGroup.get(definitionId);
  if (!groupId) return undefined;
  return state.groups.get(groupId);
}

/**
 * Get linked siblings for a field definition (other fields in the same group)
 */
export function getLinkedSiblings(
  state: LinkGroupState,
  definitionId: string
): string[] {
  const group = getFieldLinkGroup(state, definitionId);
  if (!group) return [];
  return group.memberDefinitionIds.filter(
    (id) => id !== definitionId && !state.unlinkedDefinitions.has(id)
  );
}

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
export function computeLinkedPlacements(
  state: LinkGroupState,
  sourcePlacement: NormalizedPlacementInstance,
  existingPlacements: NormalizedPlacementInstance[],
  fieldDefinitions: Map<
    string,
    { type: string; participantId: string; participantName: string }
  >
): LinkedPlacementResult | null {
  const group = getFieldLinkGroup(state, sourcePlacement.definitionId);
  if (!group || !group.isActive) return null;

  // Get siblings that need placements
  const siblings = getLinkedSiblings(state, sourcePlacement.definitionId);
  if (siblings.length === 0) return null;

  // Find existing placement IDs to avoid duplicates
  const existingPlacementsByDefId = new Set<string>();
  for (const p of existingPlacements) {
    existingPlacementsByDefId.add(p.definitionId);
  }

  const newPlacements: NormalizedPlacementInstance[] = [];
  let yOffset = 0;

  for (const siblingDefId of siblings) {
    // Skip if already placed
    if (existingPlacementsByDefId.has(siblingDefId)) continue;

    // Get field metadata
    const fieldDef = fieldDefinitions.get(siblingDefId);
    if (!fieldDef) continue;

    // Calculate position (same x, offset y)
    yOffset += LINKED_PLACEMENT_DEFAULTS.VERTICAL_OFFSET;

    const newPlacement: NormalizedPlacementInstance = {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: siblingDefId,
      type: fieldDef.type,
      participantId: fieldDef.participantId,
      participantName: fieldDef.participantName,
      page: sourcePlacement.page,
      x: sourcePlacement.x,
      y: sourcePlacement.y + yOffset,
      width: sourcePlacement.width,
      height: sourcePlacement.height,
      placementSource: PLACEMENT_SOURCE.AUTO_LINKED,
      linkGroupId: group.id,
      linkedFromFieldId: sourcePlacement.id,
    };

    newPlacements.push(newPlacement);
  }

  // Update group with source field if not already set
  const updatedGroup: LinkGroup = {
    ...group,
    sourceFieldId: group.sourceFieldId || sourcePlacement.id,
  };

  return { newPlacements, updatedGroup };
}

/**
 * Convert a linked placement to manual when user modifies it
 * This prevents future automatic updates to this placement
 */
export function convertToManualPlacement(
  placement: NormalizedPlacementInstance
): NormalizedPlacementInstance {
  return {
    ...placement,
    placementSource: PLACEMENT_SOURCE.MANUAL,
    linkedFromFieldId: undefined,
  };
}

/**
 * Check if a placement was created via linking
 */
export function isLinkedPlacement(
  placement: NormalizedPlacementInstance
): boolean {
  return placement.placementSource === PLACEMENT_SOURCE.AUTO_LINKED;
}

/**
 * Create link groups from field rules (automation rules that generate multiple fields)
 * Each rule that generates multiple fields creates a link group
 */
export function createLinkGroupsFromRules(
  expandedFields: Array<{
    id: string;
    ruleId: string;
    type: string;
    page: number;
    participantId: string;
  }>
): LinkGroup[] {
  // Group fields by rule ID
  const fieldsByRule = new Map<string, string[]>();
  for (const field of expandedFields) {
    const existing = fieldsByRule.get(field.ruleId) || [];
    existing.push(field.id);
    fieldsByRule.set(field.ruleId, existing);
  }

  // Create a link group for each rule that has multiple fields
  const groups: LinkGroup[] = [];
  for (const [ruleId, fieldIds] of fieldsByRule) {
    if (fieldIds.length > 1) {
      groups.push({
        id: `rule_${ruleId}`,
        name: `Rule ${ruleId}`,
        memberDefinitionIds: fieldIds,
        sourceFieldId: undefined,
        isActive: true,
      });
    }
  }

  return groups;
}

/**
 * Serialize link group state for persistence
 */
export function serializeLinkGroupState(state: LinkGroupState): {
  groups: Array<{
    id: string;
    name?: string;
    memberDefinitionIds: string[];
    sourceFieldId?: string;
    isActive: boolean;
  }>;
  unlinkedDefinitions: string[];
} {
  const groups: Array<{
    id: string;
    name?: string;
    memberDefinitionIds: string[];
    sourceFieldId?: string;
    isActive: boolean;
  }> = [];

  for (const group of state.groups.values()) {
    groups.push({
      id: group.id,
      name: group.name,
      memberDefinitionIds: group.memberDefinitionIds,
      sourceFieldId: group.sourceFieldId,
      isActive: group.isActive,
    });
  }

  return {
    groups,
    unlinkedDefinitions: Array.from(state.unlinkedDefinitions),
  };
}

/**
 * Deserialize link group state from persistence
 */
export function deserializeLinkGroupState(data: {
  groups?: Array<{
    id: string;
    name?: string;
    memberDefinitionIds: string[];
    sourceFieldId?: string;
    isActive: boolean;
  }>;
  unlinkedDefinitions?: string[];
}): LinkGroupState {
  let state = createLinkGroupState();

  if (Array.isArray(data.groups)) {
    for (const groupData of data.groups) {
      const group: LinkGroup = {
        id: groupData.id,
        name: groupData.name,
        memberDefinitionIds: groupData.memberDefinitionIds || [],
        sourceFieldId: groupData.sourceFieldId,
        isActive: groupData.isActive !== false,
      };
      state = addLinkGroup(state, group);
    }
  }

  if (Array.isArray(data.unlinkedDefinitions)) {
    for (const defId of data.unlinkedDefinitions) {
      state = unlinkField(state, defId);
    }
  }

  return state;
}
