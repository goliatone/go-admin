/**
 * Linked field placement module.
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

import type {
  LinkGroup,
  LinkGroupState,
  LinkGroupTemplatePosition,
  NormalizedPlacementInstance,
} from './contracts';
import { PLACEMENT_SOURCE } from './constants';

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
export function setLinkGroupTemplatePosition(
  state: LinkGroupState,
  sourcePlacement: NormalizedPlacementInstance
): SetTemplateResult | null {
  const group = getFieldLinkGroup(state, sourcePlacement.definitionId);
  if (!group || !group.isActive) return null;

  // Only set template if not already set
  if (group.templatePosition) return null;

  const templatePosition: LinkGroupTemplatePosition = {
    x: sourcePlacement.x,
    y: sourcePlacement.y,
    width: sourcePlacement.width,
    height: sourcePlacement.height,
  };

  const updatedGroup: LinkGroup = {
    ...group,
    sourceFieldId: sourcePlacement.id,
    templatePosition,
  };

  return { updatedGroup };
}

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
export function computeLinkedPlacementForPage(
  state: LinkGroupState,
  targetPage: number,
  existingPlacements: NormalizedPlacementInstance[],
  fieldDefinitions: Map<
    string,
    { type: string; participantId: string; participantName: string; page: number; linkGroupId?: string }
  >
): LinkedPlacementForPageResult | null {
  // Find existing placement definition IDs to avoid duplicates
  const existingPlacementsByDefId = new Set<string>();
  for (const p of existingPlacements) {
    existingPlacementsByDefId.add(p.definitionId);
  }

  // Look for unplaced fields on this page that belong to a link group with a template
  for (const [defId, fieldDef] of fieldDefinitions) {
    // Skip if not for target page
    if (fieldDef.page !== targetPage) continue;

    // Skip if already placed
    if (existingPlacementsByDefId.has(defId)) continue;

    // Skip if unlinked
    if (state.unlinkedDefinitions.has(defId)) continue;

    // Get link group
    const groupId = state.definitionToGroup.get(defId);
    if (!groupId) continue;

    const group = state.groups.get(groupId);
    if (!group || !group.isActive || !group.templatePosition) continue;

    // Found an unplaced linked field for this page - create placement at template position
    const newPlacement: NormalizedPlacementInstance = {
      id: `linked_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      definitionId: defId,
      type: fieldDef.type,
      participantId: fieldDef.participantId,
      participantName: fieldDef.participantName,
      page: targetPage,
      x: group.templatePosition.x,
      y: group.templatePosition.y,
      width: group.templatePosition.width,
      height: group.templatePosition.height,
      placementSource: PLACEMENT_SOURCE.AUTO_LINKED,
      linkGroupId: group.id,
      linkedFromFieldId: group.sourceFieldId,
    };

    return { newPlacement };
  }

  return null;
}

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
export function computeLinkedPlacements(
  state: LinkGroupState,
  sourcePlacement: NormalizedPlacementInstance,
  existingPlacements: NormalizedPlacementInstance[],
  fieldDefinitions: Map<
    string,
    { type: string; participantId: string; participantName: string }
  >
): LinkedPlacementResult | null {
  const result = setLinkGroupTemplatePosition(state, sourcePlacement);
  if (!result) return null;

  // Return empty placements array - we don't place siblings immediately anymore
  return {
    newPlacements: [],
    updatedGroup: result.updatedGroup,
  };
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
    templatePosition?: LinkGroupTemplatePosition;
  }>;
  unlinkedDefinitions: string[];
} {
  const groups: Array<{
    id: string;
    name?: string;
    memberDefinitionIds: string[];
    sourceFieldId?: string;
    isActive: boolean;
    templatePosition?: LinkGroupTemplatePosition;
  }> = [];

  for (const group of state.groups.values()) {
    groups.push({
      id: group.id,
      name: group.name,
      memberDefinitionIds: group.memberDefinitionIds,
      sourceFieldId: group.sourceFieldId,
      isActive: group.isActive,
      templatePosition: group.templatePosition,
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
    templatePosition?: LinkGroupTemplatePosition;
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
        templatePosition: groupData.templatePosition,
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
