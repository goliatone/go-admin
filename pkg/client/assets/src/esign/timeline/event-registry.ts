/**
 * Timeline Event Registry
 *
 * Canonical registry for timeline event type display configuration.
 * Keys are exact backend event type strings (dotted/underscored format).
 *
 * @module esign/timeline/event-registry
 */

import type {
  TimelineEventConfig,
  TimelineEventCategory,
  TimelineEventPriority,
  TimelineColorKey,
  TimelineColorClasses,
} from '../types.js';

/**
 * Color class mappings for timeline display
 */
export const TIMELINE_COLOR_CLASSES: Record<TimelineColorKey, TimelineColorClasses> = {
  green: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  blue: { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  red: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  gray: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  amber: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
};

/**
 * Default configuration for unknown event types
 */
export const DEFAULT_EVENT_CONFIG: TimelineEventConfig = {
  label: 'Event',
  icon: 'info-circle',
  color: 'gray',
  category: 'system',
  priority: 4,
  groupable: true,
};

/**
 * Helper to create an event config entry
 */
function eventConfig(
  label: string,
  icon: string,
  color: TimelineColorKey,
  category: TimelineEventCategory,
  priority: TimelineEventPriority,
  groupable = false
): TimelineEventConfig {
  return { label, icon, color, category, priority, groupable };
}

/**
 * Canonical event type registry
 *
 * Keys match exact backend event type strings as emitted in audit logs.
 * Priority semantics:
 *   1 = major lifecycle milestones (always visible)
 *   2 = important user workflow decisions
 *   3 = meaningful but secondary collaboration events
 *   4 = repetitive attention or notification events
 *   5 = technical/system churn (hidden by default)
 */
export const EVENT_REGISTRY: Record<string, TimelineEventConfig> = {
  // ===== Agreement Lifecycle (Priority 1-2) =====
  'agreement.created': eventConfig('Agreement Created', 'plus', 'green', 'lifecycle', 1),
  'agreement.updated': eventConfig('Agreement Updated', 'edit-pencil', 'blue', 'lifecycle', 3, true),
  'agreement.sent': eventConfig('Sent for Signature', 'send', 'blue', 'lifecycle', 1),
  'agreement.resent': eventConfig('Invitation Resent', 'refresh', 'yellow', 'lifecycle', 2),
  'agreement.voided': eventConfig('Agreement Voided', 'cancel', 'red', 'lifecycle', 1),
  'agreement.declined': eventConfig('Agreement Declined', 'xmark', 'orange', 'lifecycle', 1),
  'agreement.expired': eventConfig('Agreement Expired', 'clock', 'purple', 'lifecycle', 1),
  'agreement.completed': eventConfig('Agreement Completed', 'check-circle', 'green', 'lifecycle', 1),

  // ===== Review Lifecycle (Priority 1-3) =====
  'agreement.review_requested': eventConfig('Review Requested', 'eye', 'indigo', 'review', 1),
  'agreement.review_approved': eventConfig('Review Approved', 'check-circle', 'green', 'review', 1),
  'agreement.review_changes_requested': eventConfig('Changes Requested', 'edit-pencil', 'orange', 'review', 2),
  'agreement.review_viewed': eventConfig('Reviewed Document', 'eye', 'purple', 'review', 4, true),
  'agreement.review_notified': eventConfig('Reviewers Notified', 'bell', 'blue', 'review', 3, true),
  'agreement.review_notification_failed': eventConfig('Review Notification Failed', 'warning-triangle', 'red', 'review', 2),
  'agreement.review_reminders_paused': eventConfig('Reminders Paused', 'pause', 'yellow', 'review', 3),
  'agreement.review_reminders_resumed': eventConfig('Reminders Resumed', 'play', 'green', 'review', 3),
  'agreement.review_closed': eventConfig('Review Closed', 'check', 'gray', 'review', 2),
  'agreement.review_reopened': eventConfig('Review Reopened', 'refresh', 'indigo', 'review', 2),
  'agreement.review_force_approved': eventConfig('Review Force Approved', 'shield-check', 'orange', 'review', 2),
  'agreement.review_participant_approved_on_behalf': eventConfig('Approved on Behalf', 'shield-check', 'orange', 'review', 2),

  // ===== Comment Thread Lifecycle (Priority 2-3) =====
  'agreement.comment_thread_created': eventConfig('Comment Added', 'chat', 'blue', 'comment', 2),
  'agreement.comment_replied': eventConfig('Reply Added', 'chat', 'blue', 'comment', 3, true),
  'agreement.comment_resolved': eventConfig('Comment Resolved', 'check', 'green', 'comment', 2),
  'agreement.comment_reopened': eventConfig('Comment Reopened', 'refresh', 'orange', 'comment', 2),

  // ===== Participant & Recipient Mutations (Priority 3-4) =====
  'agreement.participant_upserted': eventConfig('Participant Updated', 'user', 'blue', 'participant', 4, true),
  'agreement.participant_deleted': eventConfig('Participant Removed', 'user-minus', 'red', 'participant', 4, true),
  'agreement.recipient_upserted': eventConfig('Recipient Updated', 'user', 'blue', 'participant', 4, true),
  'agreement.recipient_removed': eventConfig('Recipient Removed', 'user-minus', 'red', 'participant', 4, true),
  'recipient.added': eventConfig('Recipient Added', 'user-plus', 'green', 'participant', 3),
  'recipient.removed': eventConfig('Recipient Removed', 'user-minus', 'red', 'participant', 3),
  'recipient.updated': eventConfig('Recipient Updated', 'user', 'blue', 'participant', 4, true),

  // ===== Recipient Actions (Priority 1-2) =====
  'recipient.viewed': eventConfig('Document Viewed', 'eye', 'purple', 'lifecycle', 2),
  'recipient.signed': eventConfig('Signed', 'edit', 'green', 'lifecycle', 1),
  'recipient.declined': eventConfig('Declined to Sign', 'xmark', 'orange', 'lifecycle', 1),
  'recipient.consent': eventConfig('Consent Given', 'check', 'blue', 'lifecycle', 2),
  'recipient.submitted': eventConfig('Signature Submitted', 'check-circle', 'green', 'lifecycle', 1),
  'signer.viewed': eventConfig('Document Viewed', 'eye', 'purple', 'lifecycle', 2),
  'signer.submitted': eventConfig('Signature Submitted', 'check-circle', 'green', 'lifecycle', 1),
  'signer.declined': eventConfig('Declined to Sign', 'xmark', 'orange', 'lifecycle', 1),
  'signer.consent': eventConfig('Consent Given', 'check', 'blue', 'lifecycle', 2),
  'signer.consent_captured': eventConfig('Consent Given', 'check', 'blue', 'lifecycle', 2),
  'signer.signature_attached': eventConfig('Signature Attached', 'edit', 'blue', 'lifecycle', 2),
  'signer.assets.asset_opened': eventConfig('Opened Document', 'document', 'purple', 'lifecycle', 4, true),
  'signer.assets.contract_viewed': eventConfig('Viewed Contract', 'eye', 'purple', 'lifecycle', 4, true),

  // ===== Field Definitions & Instances (Priority 4-5) =====
  'agreement.field_definition_upserted': eventConfig('Field Definition Updated', 'document', 'gray', 'field', 5, true),
  'agreement.field_definition_deleted': eventConfig('Field Definition Removed', 'trash', 'gray', 'field', 5, true),
  'agreement.field_instance_upserted': eventConfig('Field Placement Updated', 'document', 'gray', 'field', 5, true),
  'agreement.field_instance_deleted': eventConfig('Field Placement Removed', 'trash', 'gray', 'field', 5, true),
  'agreement.field_upserted': eventConfig('Field Updated', 'edit-pencil', 'gray', 'field', 5, true),
  'agreement.field_deleted': eventConfig('Field Removed', 'trash', 'gray', 'field', 5, true),
  'field.created': eventConfig('Field Added', 'plus', 'gray', 'field', 4, true),
  'field.updated': eventConfig('Field Updated', 'edit-pencil', 'gray', 'field', 4, true),
  'field.deleted': eventConfig('Field Removed', 'trash', 'gray', 'field', 4, true),

  // ===== Signer Field Values (Priority 2-3) =====
  'signer.field_value_upserted': eventConfig('Field Value Set', 'edit-pencil', 'blue', 'field', 3, true),
  'field_value.updated': eventConfig('Field Value Set', 'edit-pencil', 'blue', 'field', 3, true),

  // ===== Signature Artifacts (Priority 2) =====
  'signature.attached': eventConfig('Signature Attached', 'edit', 'blue', 'lifecycle', 2),
  'artifact.generated': eventConfig('Artifact Generated', 'document', 'green', 'delivery', 2),
  'artifact.executed_generated': eventConfig('Executed PDF Generated', 'document', 'green', 'delivery', 2),
  'artifact.certificate_generated': eventConfig('Certificate Generated', 'document', 'green', 'delivery', 2),
  'artifact.render_executed': eventConfig('Rendered Executed PDF', 'document', 'gray', 'delivery', 5, true),
  'artifact.pages_rendered': eventConfig('Rendered Preview Pages', 'document', 'gray', 'delivery', 5, true),

  // ===== Token Events (Priority 4-5) =====
  'token.rotated': eventConfig('Token Rotated', 'refresh', 'yellow', 'system', 4, true),
  'token.revoked': eventConfig('Token Revoked', 'lock', 'red', 'system', 3),
  'token.created': eventConfig('Token Created', 'key', 'blue', 'system', 4, true),

  // ===== Delivery Events (Priority 2-4) =====
  'delivery.executed_generated': eventConfig('Executed PDF Generated', 'document', 'green', 'delivery', 2),
  'delivery.certificate_generated': eventConfig('Certificate Generated', 'document', 'green', 'delivery', 2),
  'delivery.executed_delivered': eventConfig('Executed PDF Delivered', 'check', 'green', 'delivery', 2),
  'delivery.certificate_delivered': eventConfig('Certificate Delivered', 'check', 'green', 'delivery', 2),
  'delivery.notification_sent': eventConfig('Notification Sent', 'mail', 'blue', 'delivery', 3, true),
  'delivery.notification_failed': eventConfig('Notification Failed', 'warning-triangle', 'red', 'delivery', 2),
  'agreement.notification_delivered': eventConfig('Notification Delivered', 'mail', 'green', 'delivery', 4, true),
  'agreement.notification_delivery_resumed': eventConfig('Notification Delivery Resumed', 'play', 'blue', 'delivery', 3),
  'agreement.send_notification_failed': eventConfig('Send Notification Failed', 'warning-triangle', 'red', 'delivery', 2),
  'agreement.resend_notification_failed': eventConfig('Resend Notification Failed', 'warning-triangle', 'red', 'delivery', 2),

  // ===== Email Events (Priority 3-4) =====
  'email.sent': eventConfig('Email Sent', 'mail', 'blue', 'delivery', 3, true),
  'email.failed': eventConfig('Email Failed', 'warning-triangle', 'red', 'delivery', 2),
  'email.delivered': eventConfig('Email Delivered', 'check', 'green', 'delivery', 4, true),
  'email.opened': eventConfig('Email Opened', 'eye', 'purple', 'delivery', 4, true),
  'email.bounced': eventConfig('Email Bounced', 'warning-triangle', 'red', 'delivery', 2),

  // ===== Placement / System Workflow (Priority 5) =====
  'agreement.placement_run_created': eventConfig('Placement Run Created', 'cog', 'gray', 'system', 5, true),
  'agreement.placement_run_applied': eventConfig('Placement Run Applied', 'cog', 'gray', 'system', 5, true),
  'agreement.send': eventConfig('Sending Agreement', 'send', 'blue', 'lifecycle', 2),
  'agreement.send_degraded_preview': eventConfig('Sent with Degraded Preview', 'warning-triangle', 'yellow', 'delivery', 3),
  'agreement.incomplete': eventConfig('Agreement Incomplete', 'warning-triangle', 'orange', 'lifecycle', 2),
  'signer.stage_activation_workflow_failed': eventConfig('Signer Activation Failed', 'warning-triangle', 'red', 'system', 2),
  'signer.completion_workflow_failed': eventConfig('Signer Completion Failed', 'warning-triangle', 'red', 'system', 2),

  // ===== Legacy/Compatibility Event Names =====
  // These map older event formats to canonical display configs
  'agreement_created': eventConfig('Agreement Created', 'plus', 'green', 'lifecycle', 1),
  'agreement_sent': eventConfig('Sent for Signature', 'send', 'blue', 'lifecycle', 1),
  'agreement_completed': eventConfig('Agreement Completed', 'check-circle', 'green', 'lifecycle', 1),
  'agreement_voided': eventConfig('Agreement Voided', 'cancel', 'red', 'lifecycle', 1),
  'agreement_declined': eventConfig('Agreement Declined', 'xmark', 'orange', 'lifecycle', 1),
  'agreement_expired': eventConfig('Agreement Expired', 'clock', 'purple', 'lifecycle', 1),
};

/**
 * Alias mapping for event types that may appear in different formats
 * Maps non-canonical keys to their canonical form
 */
export const EVENT_TYPE_ALIASES: Record<string, string> = {
  // Underscore to dot conversions
  'agreement_created': 'agreement.created',
  'agreement_updated': 'agreement.updated',
  'agreement_sent': 'agreement.sent',
  'agreement_completed': 'agreement.completed',
  'agreement_voided': 'agreement.voided',
  'agreement_declined': 'agreement.declined',
  'agreement_expired': 'agreement.expired',
  'email.send': 'email.sent',
  'signer.submit': 'signer.submitted',
  'signer.complete': 'signer.submitted',
  // Space-separated (unlikely but defensive)
  'agreement created': 'agreement.created',
  'agreement sent': 'agreement.sent',
  'agreement completed': 'agreement.completed',
};

/**
 * Get the canonical event type key
 */
export function resolveEventTypeKey(eventType: string): string {
  const normalized = String(eventType || '').trim().toLowerCase();
  return EVENT_TYPE_ALIASES[normalized] || normalized;
}

/**
 * Get event display configuration for a given event type
 * Falls back to a deterministic default if unknown
 */
export function getEventConfig(eventType: string): TimelineEventConfig {
  const key = resolveEventTypeKey(eventType);

  // Check canonical registry
  if (EVENT_REGISTRY[key]) {
    return EVENT_REGISTRY[key];
  }

  // Check with original case-preserved key
  if (EVENT_REGISTRY[eventType]) {
    return EVENT_REGISTRY[eventType];
  }

  // Generate fallback label from event type
  const fallbackLabel = generateFallbackLabel(eventType);
  return {
    ...DEFAULT_EVENT_CONFIG,
    label: fallbackLabel,
  };
}

/**
 * Generate a human-readable label from an event type string
 */
export function generateFallbackLabel(eventType: string): string {
  const normalized = String(eventType || '').trim();
  if (!normalized) {
    return 'Event';
  }

  return normalized
    .replace(/[._]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim() || 'Event';
}

/**
 * Get color classes for a color key
 */
export function getColorClasses(colorKey: TimelineColorKey): TimelineColorClasses {
  return TIMELINE_COLOR_CLASSES[colorKey] || TIMELINE_COLOR_CLASSES.gray;
}

/**
 * Check if an event type should be shown in condensed mode
 */
export function isVisibleInCondensedMode(eventType: string): boolean {
  const config = getEventConfig(eventType);
  return config.priority <= 3;
}

/**
 * Check if an event type is groupable
 */
export function isGroupableEvent(eventType: string): boolean {
  const config = getEventConfig(eventType);
  return config.groupable;
}

/**
 * Get all known event types for a category
 */
export function getEventTypesByCategory(category: TimelineEventCategory): string[] {
  return Object.entries(EVENT_REGISTRY)
    .filter(([, config]) => config.category === category)
    .map(([key]) => key);
}

/**
 * Get the priority threshold for condensed mode
 */
export const CONDENSED_MODE_PRIORITY_THRESHOLD: TimelineEventPriority = 3;
