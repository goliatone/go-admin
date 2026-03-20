/**
 * Timeline Event Resolver
 *
 * Handles resolution of actors, field definitions, and metadata for timeline display.
 * Implements proper fallback chains to ensure human-readable output.
 *
 * @module esign/timeline/event-resolver
 */

import type {
  TimelineEvent,
  TimelineActor,
  TimelineParticipant,
  TimelineFieldDefinition,
  AgreementTimelineBootstrap,
  ResolvedActorInfo,
  ResolvedMetadataField,
} from '../types.js';

/**
 * UUID detection pattern (8-4-4-4-12 hex or 24-32 hex without dashes)
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_ID_PATTERN = /^[0-9a-f]{24,32}$/i;

/**
 * Metadata keys that should always be hidden
 */
const HIDDEN_METADATA_KEYS = new Set([
  'correlation_id',
  'correlationid',
  'session_id',
  'sessionid',
  'trace_id',
  'traceid',
  'span_id',
  'spanid',
  'request_id',
  'requestid',
]);

/**
 * Keys that indicate a badge-style display
 */
const BADGE_LIKE_KEYS = [
  'status',
  'result',
  'guard_policy',
  'effect_status',
  'notification_status',
  'decision_status',
  'state',
  'outcome',
];

/**
 * Keys that reference entities requiring resolution
 */
const RESOLVABLE_ENTITY_KEYS = new Set([
  'participant_id',
  'recipient_id',
  'signer_id',
  'field_definition_id',
  'field_id',
  'review_id',
  'thread_id',
  'reviewer_id',
  'actor_id',
]);

/**
 * Actor type to human-readable role mapping
 */
const ACTOR_TYPE_LABELS: Record<string, string> = {
  user: 'Sender',
  sender: 'Sender',
  reviewer: 'Reviewer',
  external: 'External Reviewer',
  recipient: 'Signer',
  signer: 'Signer',
  system: 'System',
  admin: 'Admin',
  automation: 'Automation',
};

/**
 * Actor type to avatar color mapping
 */
const ACTOR_TYPE_COLORS: Record<string, string> = {
  user: '#2563eb',
  sender: '#2563eb',
  reviewer: '#7c3aed',
  external: '#7c3aed',
  recipient: '#059669',
  signer: '#059669',
  system: '#64748b',
  admin: '#dc2626',
  automation: '#64748b',
};

/**
 * Check if a string looks like a UUID or opaque ID
 */
export function looksLikeUUID(str: unknown): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }
  const normalized = str.trim();
  return UUID_PATTERN.test(normalized) || HEX_ID_PATTERN.test(normalized);
}

/**
 * Build an actor map key from type and ID
 */
export function buildActorKey(actorType: string, actorId: string): string {
  const normalizedType = String(actorType || '').trim();
  const normalizedId = String(actorId || '').trim();
  if (!normalizedType || !normalizedId) {
    return '';
  }
  return `${normalizedType}:${normalizedId}`;
}

/**
 * Get humanized actor role label
 */
export function humanizeActorRole(actorType: string): string {
  const normalized = String(actorType || '').trim().toLowerCase();
  return ACTOR_TYPE_LABELS[normalized] || (normalized
    ? normalized.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
    : 'Participant');
}

/**
 * Get avatar color for an actor type
 */
export function getActorColor(actorType: string): string {
  const normalized = String(actorType || '').trim().toLowerCase();
  return ACTOR_TYPE_COLORS[normalized] || '#64748b';
}

/**
 * Generate initials from a name
 */
export function getActorInitials(name: string, fallback = 'P'): string {
  const normalized = String(name || '').trim();
  if (!normalized) {
    return String(fallback || 'P').trim().slice(0, 2).toUpperCase() || 'P';
  }

  const initials = normalized
    .split(/\s+/)
    .map((part) => part[0] || '')
    .join('')
    .replace(/[^a-z0-9]/gi, '')
    .toUpperCase();

  return initials.slice(0, 2) || String(fallback || 'P').trim().slice(0, 2).toUpperCase() || 'P';
}

/**
 * Timeline event resolver context
 */
export interface EventResolverContext {
  actors: Record<string, TimelineActor>;
  participants: TimelineParticipant[];
  fieldDefinitions: TimelineFieldDefinition[];
  currentUserId?: string;
}

/**
 * Create a resolver context from bootstrap data
 */
export function createResolverContext(bootstrap: AgreementTimelineBootstrap): EventResolverContext {
  return {
    actors: bootstrap.actors || {},
    participants: bootstrap.participants || [],
    fieldDefinitions: bootstrap.field_definitions || [],
    currentUserId: bootstrap.current_user_id,
  };
}

/**
 * Find a participant by ID (checks both id and recipient_id)
 */
export function findParticipantById(
  ctx: EventResolverContext,
  id: string
): TimelineParticipant | null {
  if (!id) {
    return null;
  }
  const normalizedId = String(id).trim();
  return ctx.participants.find((p) => {
    const pId = String(p.id || '').trim();
    const pRecipientId = String(p.recipient_id || '').trim();
    return pId === normalizedId || pRecipientId === normalizedId;
  }) || null;
}

/**
 * Find a field definition by ID
 */
export function findFieldDefinitionById(
  ctx: EventResolverContext,
  id: string
): TimelineFieldDefinition | null {
  if (!id) {
    return null;
  }
  const normalizedId = String(id).trim();
  return ctx.fieldDefinitions.find((f) => String(f.id || '').trim() === normalizedId) || null;
}

/**
 * Resolve actor display information for an event.
 *
 * Resolution order:
 * 1. actors[actor_type:actor_id].display_name
 * 2. actors[actor_type:actor_id].email
 * 3. participant match by id or recipient_id
 * 4. current_user_id -> "You"
 * 5. humanized actor type
 * 6. "Unknown User" (never raw UUID)
 */
export function resolveActor(
  ctx: EventResolverContext,
  event: TimelineEvent
): ResolvedActorInfo {
  const actorType = String(event.actor_type || '').trim();
  const actorId = String(event.actor_id || '').trim();

  // Build alias keys to check in actor map (handle type synonyms)
  const aliases: string[] = [];
  if (actorType === 'recipient' || actorType === 'signer') {
    aliases.push(buildActorKey('recipient', actorId), buildActorKey('signer', actorId));
  } else if (actorType === 'user' || actorType === 'sender') {
    aliases.push(buildActorKey('user', actorId), buildActorKey('sender', actorId));
  } else if (actorType === 'reviewer' || actorType === 'external') {
    aliases.push(buildActorKey('reviewer', actorId), buildActorKey('external', actorId));
  } else {
    aliases.push(buildActorKey(actorType, actorId));
  }

  // Step 1 & 2: Check actor_map for name/email
  const actor = aliases.map((key) => ctx.actors[key]).find(Boolean) || ({} as TimelineActor);
  const actorName = String(actor.display_name || actor.name || '').trim();
  const actorEmail = String(actor.email || '').trim();

  // Step 3: Check participants for display_name/email
  const participant = findParticipantById(ctx, actorId);
  const participantDisplayName = participant
    ? String(participant.display_name || participant.name || '').trim()
    : '';
  const participantEmail = participant ? String(participant.email || '').trim() : '';

  // Step 4: Check for current user
  const isCurrentUser = ctx.currentUserId && actorId === ctx.currentUserId;

  // Step 5: Humanized role label
  const roleLabel = humanizeActorRole(actor.role || actor.actor_type || actorType);

  // Determine the best display name using fallback chain (never show UUID)
  let resolvedName = '';
  if (actorName && !looksLikeUUID(actorName)) {
    resolvedName = actorName;
  } else if (actorEmail && !looksLikeUUID(actorEmail)) {
    resolvedName = actorEmail;
  } else if (participantDisplayName && !looksLikeUUID(participantDisplayName)) {
    resolvedName = participantDisplayName;
  } else if (participantEmail && !looksLikeUUID(participantEmail)) {
    resolvedName = participantEmail;
  } else if (isCurrentUser) {
    resolvedName = 'You';
  } else if (roleLabel) {
    resolvedName = roleLabel;
  } else {
    resolvedName = 'Unknown User';
  }

  const resolvedRole = String(actor.role || actor.actor_type || actorType || 'participant').trim() || 'participant';
  const resolvedActorType = String(actor.actor_type || actorType).trim();

  return {
    name: resolvedName,
    role: resolvedRole,
    actor_type: resolvedActorType,
    email: actorEmail || participantEmail || undefined,
    initials: getActorInitials(resolvedName, roleLabel),
    color: getActorColor(resolvedActorType),
  };
}

/**
 * Check if a metadata key should be hidden
 */
function isHiddenMetadataKey(key: string): boolean {
  const normalized = key.toLowerCase();
  if (HIDDEN_METADATA_KEYS.has(normalized)) {
    return true;
  }
  if (normalized.startsWith('_')) {
    return true;
  }
  return false;
}

/**
 * Check if a metadata key should be displayed as a badge
 */
function isBadgeLikeKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return BADGE_LIKE_KEYS.some((pattern) => normalized.includes(pattern));
}

/**
 * Convert a metadata key to a human-readable display key
 */
function formatMetadataKey(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Format a metadata value for display
 */
function formatMetadataValue(
  ctx: EventResolverContext,
  key: string,
  value: unknown
): { displayValue: string; isResolved: boolean } {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return { displayValue: '-', isResolved: false };
  }

  // Handle objects and arrays - don't show inline, mark for expansion
  if (typeof value === 'object') {
    return { displayValue: '[Complex Data]', isResolved: false };
  }

  const stringValue = String(value).trim();

  // Check if this is a resolvable entity reference
  if (RESOLVABLE_ENTITY_KEYS.has(key.toLowerCase())) {
    // Try to resolve participant
    if (key.toLowerCase().includes('participant') || key.toLowerCase().includes('recipient') || key.toLowerCase().includes('signer')) {
      const participant = findParticipantById(ctx, stringValue);
      if (participant) {
        const name = String(participant.display_name || participant.name || '').trim();
        const email = String(participant.email || '').trim();
        if (name && !looksLikeUUID(name)) {
          return { displayValue: name, isResolved: true };
        }
        if (email && !looksLikeUUID(email)) {
          return { displayValue: email, isResolved: true };
        }
      }
    }

    // Try to resolve field definition
    if (key.toLowerCase().includes('field')) {
      const fieldDef = findFieldDefinitionById(ctx, stringValue);
      if (fieldDef) {
        const label = String(fieldDef.label || '').trim();
        const type = String(fieldDef.type || '').trim();
        if (label && !looksLikeUUID(label)) {
          return { displayValue: label, isResolved: true };
        }
        if (type && !looksLikeUUID(type)) {
          return { displayValue: `${formatMetadataKey(type)} Field`, isResolved: true };
        }
      }
    }

    // If it's an unresolvable UUID, hide it
    if (looksLikeUUID(stringValue)) {
      return { displayValue: '', isResolved: false };
    }
  }

  // Check if the value itself looks like an opaque UUID that we can't resolve
  if (looksLikeUUID(stringValue)) {
    return { displayValue: '', isResolved: false };
  }

  // Return the string value
  return { displayValue: stringValue, isResolved: false };
}

/**
 * Resolve metadata fields for display
 */
export function resolveMetadata(
  ctx: EventResolverContext,
  event: TimelineEvent
): ResolvedMetadataField[] {
  const metadata = event.metadata || {};
  const results: ResolvedMetadataField[] = [];

  for (const [key, value] of Object.entries(metadata)) {
    // Check if hidden
    if (isHiddenMetadataKey(key)) {
      continue;
    }

    const { displayValue, isResolved } = formatMetadataValue(ctx, key, value);

    // Skip entries with empty display values (unresolvable UUIDs)
    if (!displayValue) {
      continue;
    }

    results.push({
      key,
      displayKey: formatMetadataKey(key),
      value,
      displayValue,
      isBadge: isBadgeLikeKey(key),
      isHidden: false,
    });
  }

  return results;
}

/**
 * Get field label from field definition by ID
 */
export function resolveFieldLabel(
  ctx: EventResolverContext,
  fieldId: string
): string | null {
  const fieldDef = findFieldDefinitionById(ctx, fieldId);
  if (!fieldDef) {
    return null;
  }

  const label = String(fieldDef.label || '').trim();
  if (label && !looksLikeUUID(label)) {
    return label;
  }

  const type = String(fieldDef.type || '').trim();
  if (type && !looksLikeUUID(type)) {
    return formatMetadataKey(type) + ' Field';
  }

  return null;
}

/**
 * Get participant name from participant ID
 */
export function resolveParticipantName(
  ctx: EventResolverContext,
  participantId: string
): string | null {
  const participant = findParticipantById(ctx, participantId);
  if (!participant) {
    return null;
  }

  const name = String(participant.display_name || participant.name || '').trim();
  if (name && !looksLikeUUID(name)) {
    return name;
  }

  const email = String(participant.email || '').trim();
  if (email && !looksLikeUUID(email)) {
    return email;
  }

  return null;
}
