/**
 * Activity Feed Formatters
 * Handles action categorization, sentence formatting, and metadata display
 */

import type { ActivityEntry, ActionCategory, ParsedObject, ActorType } from './types.js';
import { renderIcon } from '../shared/icon-renderer.js';

/**
 * Mapping of verbs to action categories
 */
const ACTION_CATEGORY_MAP: Record<string, ActionCategory> = {
  // Created
  created: 'created',
  added: 'created',
  inserted: 'created',
  registered: 'created',
  signed_up: 'created',
  imported: 'created',

  // Updated
  updated: 'updated',
  modified: 'updated',
  changed: 'updated',
  edited: 'updated',
  saved: 'updated',
  enabled: 'updated',
  disabled: 'updated',
  activated: 'updated',
  deactivated: 'updated',

  // Deleted
  deleted: 'deleted',
  removed: 'deleted',
  destroyed: 'deleted',
  purged: 'deleted',
  archived: 'deleted',

  // Auth
  login: 'auth',
  logout: 'auth',
  logged_in: 'auth',
  logged_out: 'auth',
  authenticated: 'auth',
  password_reset: 'auth',
  password_changed: 'auth',
  token_refreshed: 'auth',
  session_expired: 'auth',

  // Viewed
  viewed: 'viewed',
  accessed: 'viewed',
  read: 'viewed',
  downloaded: 'viewed',
  exported: 'viewed',
};

const METADATA_KEY_ACTOR_DISPLAY = 'actor_display';
const METADATA_KEY_OBJECT_DISPLAY = 'object_display';
const METADATA_KEY_OBJECT_DELETED = 'object_deleted';
const METADATA_KEY_ACTOR_TYPE = 'actor_type';
const METADATA_KEY_ACTOR_EMAIL = 'actor_email';
const METADATA_KEY_SESSION_ID = 'session_id';
const METADATA_KEY_ENRICHED_AT = 'enriched_at';
const METADATA_KEY_ENRICHER_VERSION = 'enricher_version';

/**
 * Icons for actor types (using iconoir icon names)
 */
export const ACTOR_TYPE_ICONS: Record<ActorType, string> = {
  user: 'user',
  system: 'settings',
  job: 'clock',
  api: 'cloud',
  unknown: 'help-circle',
};

/**
 * Labels for actor types
 */
export const ACTOR_TYPE_LABELS: Record<ActorType, string> = {
  user: 'User',
  system: 'System',
  job: 'Job',
  api: 'API',
  unknown: 'Unknown',
};

/**
 * Check if a value looks like it's been masked (hashed or partially hidden)
 */
export function isMaskedValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (!value) return false;

  // Check for common masking patterns:
  // - All asterisks: ****
  // - Partial masking: abc***xyz
  // - Hash-like strings (long hex strings that aren't UUIDs)
  // - [REDACTED], [HIDDEN], [MASKED] placeholders

  const trimmed = value.trim();

  // Check for placeholder patterns
  if (/^\[(REDACTED|HIDDEN|MASKED|REMOVED)\]$/i.test(trimmed)) {
    return true;
  }

  // Check for all asterisks
  if (/^\*+$/.test(trimmed)) {
    return true;
  }

  // Check for partial masking with asterisks in the middle
  if (/^[^*]+\*{3,}[^*]+$/.test(trimmed)) {
    return true;
  }

  // Check for hash-like strings (64+ hex chars, not a UUID)
  const clean = trimmed.replace(/-/g, '');
  if (/^[0-9a-f]{64,}$/i.test(clean)) {
    return true;
  }

  return false;
}

/**
 * Check if metadata is empty or hidden (support role scenario)
 */
export function isMetadataHidden(metadata: Record<string, unknown> | undefined): boolean {
  if (!metadata) return true;
  if (typeof metadata !== 'object') return true;

  const keys = Object.keys(metadata);
  if (keys.length === 0) return true;

  // Check if all values are null, undefined, or empty strings
  return keys.every(key => {
    const value = metadata[key];
    return value === null || value === undefined || value === '';
  });
}

/**
 * Icons for each action category (using iconoir icon names)
 */
export const ACTION_ICONS: Record<ActionCategory, string> = {
  created: 'plus',
  updated: 'edit-pencil',
  deleted: 'trash',
  auth: 'key',
  viewed: 'eye',
  system: 'settings',
};

/**
 * Icons for action namespaces (first segment of dotted action strings)
 */
export const NAMESPACE_ICONS: Record<string, string> = {
  debug: 'terminal',
  user: 'user',
  users: 'group',
  auth: 'key',
  admin: 'settings',
  system: 'cpu',
  api: 'cloud',
  db: 'database',
  cache: 'archive',
  file: 'folder',
  email: 'mail',
  notification: 'bell',
  webhook: 'link',
  job: 'clock',
  queue: 'list',
  export: 'download',
  import: 'upload',
  report: 'page',
  log: 'clipboard',
  config: 'adjustments',
  settings: 'settings',
  security: 'shield',
  tenant: 'building',
  org: 'community',
  media: 'media-image',
  content: 'page-edit',
  repl: 'terminal',
};

/**
 * Parse a dotted action string like "debug.repl.close" into namespace and action
 */
export interface ParsedAction {
  namespace: string;
  action: string;
  icon: string;
  category: ActionCategory;
}

export function resolveActionLabel(
  actionStr: string,
  labels?: Record<string, string>
): string {
  if (!actionStr) return '';
  if (!labels) return actionStr;
  const trimmed = actionStr.trim();
  if (!trimmed) return actionStr;
  const label = labels[trimmed];
  if (typeof label === 'string' && label.trim() !== '') {
    return label;
  }
  return actionStr;
}

export function parseActionString(
  actionStr: string,
  labels?: Record<string, string>
): ParsedAction {
  if (!actionStr) {
    return { namespace: '', action: '', icon: 'activity', category: 'system' };
  }

  const actionLabel = resolveActionLabel(actionStr, labels);

  // Check if it's a dotted notation action
  if (actionStr.includes('.')) {
    const parts = actionStr.split('.');
    const namespace = parts[0].toLowerCase();
    const action = parts.slice(1).join('.');
    const icon = NAMESPACE_ICONS[namespace] || 'activity';

    // Determine category from the last part (the verb)
    const verb = parts[parts.length - 1];
    const category = getActionCategory(verb);

    const displayAction = actionLabel !== actionStr ? actionLabel : action;
    return { namespace, action: displayAction, icon, category };
  }

  // Standard single-word action
  const category = getActionCategory(actionStr);
  const displayAction = actionLabel !== actionStr ? actionLabel : actionStr;
  return {
    namespace: '',
    action: displayAction,
    icon: ACTION_ICONS[category],
    category,
  };
}

/**
 * Get the action category for a verb
 */
export function getActionCategory(verb: string): ActionCategory {
  if (!verb) return 'system';
  const normalized = verb.toLowerCase().trim().replace(/-/g, '_');
  return ACTION_CATEGORY_MAP[normalized] || 'system';
}

/**
 * Parse an object string (format: "type:id") into its components
 */
export function parseObject(object: string): ParsedObject {
  if (!object) return { type: '', id: '' };

  if (!object.includes(':')) {
    return { type: object, id: '' };
  }

  const colonIndex = object.indexOf(':');
  return {
    type: object.substring(0, colonIndex),
    id: object.substring(colonIndex + 1),
  };
}

function getMetadataString(
  metadata: Record<string, unknown> | undefined,
  key: string
): string {
  if (!metadata || typeof metadata !== 'object') return '';
  const value = metadata[key];
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function firstNonEmpty(...values: string[]): string {
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return '';
}

export function resolveActorLabel(entry: ActivityEntry): string {
  return firstNonEmpty(getMetadataString(entry.metadata, METADATA_KEY_ACTOR_DISPLAY), entry.actor);
}

export function resolveObjectDisplay(entry: ActivityEntry): string {
  return getMetadataString(entry.metadata, METADATA_KEY_OBJECT_DISPLAY);
}

/**
 * Check if the object has been deleted
 */
export function isObjectDeleted(entry: ActivityEntry): boolean {
  if (!entry.metadata || typeof entry.metadata !== 'object') return false;
  return entry.metadata[METADATA_KEY_OBJECT_DELETED] === true;
}

/**
 * Get the actor type from metadata
 */
export function getActorType(entry: ActivityEntry): ActorType {
  if (!entry.metadata || typeof entry.metadata !== 'object') return 'unknown';
  const value = entry.metadata[METADATA_KEY_ACTOR_TYPE];
  if (typeof value === 'string') {
    const normalized = value.toLowerCase() as ActorType;
    if (normalized in ACTOR_TYPE_ICONS) {
      return normalized;
    }
  }
  return 'unknown';
}

/**
 * Get the actor email from metadata (may be masked)
 */
export function getActorEmail(entry: ActivityEntry): string {
  return getMetadataString(entry.metadata, METADATA_KEY_ACTOR_EMAIL);
}

/**
 * Get the session ID from metadata
 */
export function getSessionId(entry: ActivityEntry): string {
  return getMetadataString(entry.metadata, METADATA_KEY_SESSION_ID);
}

/**
 * Get enrichment info (enriched_at and enricher_version)
 */
export function getEnrichmentInfo(entry: ActivityEntry): { enrichedAt: string; enricherVersion: string } | null {
  const enrichedAt = getMetadataString(entry.metadata, METADATA_KEY_ENRICHED_AT);
  const enricherVersion = getMetadataString(entry.metadata, METADATA_KEY_ENRICHER_VERSION);

  if (!enrichedAt && !enricherVersion) return null;

  return { enrichedAt, enricherVersion };
}

/**
 * Capitalize the first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format object type for display (e.g., "user_profile" -> "User Profile")
 */
function formatObjectType(type: string): string {
  if (!type) return '';
  return type
    .split(/[_-]/)
    .map(capitalize)
    .join(' ');
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Shorten a UUID or long string to first N characters (like git short hash)
 */
export function shortenId(id: string, length: number = 7): string {
  if (!id) return '';
  // Remove dashes for UUID detection
  const clean = id.replace(/-/g, '');
  // If it looks like a UUID (32 hex chars without dashes), shorten it
  if (/^[0-9a-f]{32}$/i.test(clean)) {
    return id.substring(0, length);
  }
  // For other long strings, also shorten
  if (id.length > length + 3) {
    return id.substring(0, length);
  }
  return id;
}

/**
 * Check if a string looks like a UUID
 */
function isUuidLike(str: string): boolean {
  if (!str) return false;
  const clean = str.replace(/-/g, '');
  return /^[0-9a-f]{32}$/i.test(clean);
}

/**
 * Format an ID for display with optional tooltip for full value
 * Returns HTML with shortened ID and title attribute for full ID
 */
function formatIdWithTooltip(id: string, length: number = 8): string {
  if (!id) return '';
  const shortened = shortenId(id, length);
  if (shortened === id) {
    return escapeHtml(id);
  }
  // Return span with tooltip showing full ID
  return `<span class="activity-id-short" title="${escapeHtml(id)}" style="cursor: help; border-bottom: 1px dotted #9ca3af;">${escapeHtml(shortened)}</span>`;
}

/**
 * Options for formatting activity sentences
 */
export interface FormatActivitySentenceOptions {
  /** Include actor type badge before the actor name (for table view) */
  showActorTypeBadge?: boolean;
}

/**
 * Format an activity entry into a human-readable sentence
 */
export function formatActivitySentence(
  entry: ActivityEntry,
  labels?: Record<string, string>,
  options?: FormatActivitySentenceOptions
): string {
  const { showActorTypeBadge = false } = options || {};
  const actor = resolveActorLabel(entry) || 'Unknown';
  const rawVerb = entry.action || 'performed action on';
  const verb = resolveActionLabel(rawVerb, labels);

  // Get actor type badge if requested (only for non-user types)
  let actorTypeBadge = '';
  if (showActorTypeBadge) {
    const actorType = getActorType(entry);
    if (actorType !== 'user' && actorType !== 'unknown') {
      actorTypeBadge = getActorTypeIconHtml(actorType, { badge: true, size: 'sm' }) + ' ';
    }
  }

  // Format actor - shorten if UUID
  const actorDisplay = isUuidLike(actor)
    ? `${actorTypeBadge}${formatIdWithTooltip(actor, 8)}`
    : `${actorTypeBadge}<strong>${escapeHtml(actor)}</strong>`;

  // Check if object has been deleted
  const objectDeleted = isObjectDeleted(entry);
  const deletedMarker = objectDeleted
    ? ' <span class="activity-deleted-marker" title="This object has been deleted">(deleted)</span>'
    : '';

  // Build object reference with shortened ID
  let objectRef = '';
  const objectDisplay = resolveObjectDisplay(entry);
  if (objectDisplay) {
    objectRef = escapeHtml(objectDisplay) + deletedMarker;
  } else {
    const { type, id } = parseObject(entry.object);
    if (type && id) {
      const shortId = formatIdWithTooltip(id, 8);
      objectRef = `${escapeHtml(formatObjectType(type))} #${shortId}${deletedMarker}`;
    } else if (type) {
      objectRef = escapeHtml(formatObjectType(type)) + deletedMarker;
    } else if (id) {
      objectRef = `#${formatIdWithTooltip(id, 8)}${deletedMarker}`;
    }
  }

  // Build sentence based on action category
  const category = getActionCategory(rawVerb);

  // Special handling for auth events
  if (category === 'auth') {
    const ip = entry.metadata?.ip || entry.metadata?.IP;
    if (ip) {
      return `${actorDisplay} ${escapeHtml(verb)} from ${escapeHtml(String(ip))}`;
    }
    return `${actorDisplay} ${escapeHtml(verb)}`;
  }

  // Standard sentence
  if (objectRef) {
    return `${actorDisplay} ${escapeHtml(verb)} <strong>${objectRef}</strong>`;
  }

  return `${actorDisplay} ${escapeHtml(verb)}`;
}

/**
 * Format a timestamp for display
 */
export function formatTimestamp(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

/**
 * Format relative time in short format (e.g., "2h ago")
 */
export function formatRelativeTime(value: string): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Format relative time using Intl.RelativeTimeFormat for natural language output
 * (e.g., "2 hours ago", "yesterday", "3 days ago")
 */
export function formatRelativeTimeIntl(value: string): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return rtf.format(-diffMins, 'minute');
  if (diffHours < 24) return rtf.format(-diffHours, 'hour');
  if (diffDays < 7) return rtf.format(-diffDays, 'day');
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return rtf.format(-weeks, 'week');
  }

  return date.toLocaleDateString();
}

/**
 * Get date label for timeline grouping ("Today", "Yesterday", or formatted date)
 */
export function getDateGroupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetDate.getTime() === today.getTime()) {
    return 'Today';
  }
  if (targetDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  // Use Intl.DateTimeFormat for consistent formatting
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: targetDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  }).format(date);
}

/**
 * Get the start of day for a given date (midnight in local timezone)
 */
export function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Get a stable date key for grouping (YYYY-MM-DD format)
 */
export function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Count the number of fields in metadata
 */
export function countMetadataFields(metadata: Record<string, unknown> | undefined): number {
  if (!metadata || typeof metadata !== 'object') return 0;
  return Object.keys(metadata).length;
}

/**
 * Get a summary of metadata changes
 * Returns a summary string, or 'hidden' for support role scenario, or empty for no metadata
 */
export function getMetadataSummary(metadata: Record<string, unknown> | undefined | null): string {
  // Handle null/undefined metadata as hidden (support role scenario where backend omits metadata)
  if (metadata === null) return 'hidden';
  if (metadata === undefined) return '';
  if (typeof metadata !== 'object') return '';

  const count = countMetadataFields(metadata);

  // Empty object {} is treated as hidden (support role scenario)
  if (count === 0) return 'hidden';

  // Check if metadata has keys but all values are empty/null (another hidden scenario)
  if (isMetadataHidden(metadata)) {
    return 'hidden';
  }

  if (count === 1) return '1 field';
  return `${count} fields`;
}

/**
 * Format metadata for expanded display (grid-friendly items)
 */
export function formatMetadataExpanded(metadata: Record<string, unknown> | undefined | null): string {
  // Handle null metadata as hidden (support role scenario)
  if (metadata === null) {
    return `
      <div class="activity-metadata-hidden" style="padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; text-align: center;">
        <span style="color: #9ca3af; font-size: 12px; font-style: italic;">Metadata hidden</span>
      </div>
    `;
  }

  if (metadata === undefined || typeof metadata !== 'object') return '';

  const entries = Object.entries(metadata);

  // Empty object {} or all-null values = hidden
  if (entries.length === 0 || isMetadataHidden(metadata)) {
    return `
      <div class="activity-metadata-hidden" style="padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; text-align: center;">
        <span style="color: #9ca3af; font-size: 12px; font-style: italic;">Metadata hidden</span>
      </div>
    `;
  }

  const items = entries.map(([key, value]) => {
    const formattedKey = escapeHtml(key);
    let formattedValue: string;
    let isMasked = false;

    // Check if this value is masked
    if (isMaskedValue(value)) {
      isMasked = true;
      formattedValue = `<span class="activity-masked-value" title="This value is masked">${escapeHtml(String(value))}</span>`;
    } else if (key.endsWith('_old') || key.endsWith('_new')) {
      // Check for change diff pattern (old_value -> new_value)
      formattedValue = escapeHtml(formatValue(value));
    } else if (typeof value === 'object' && value !== null) {
      // Truncate JSON strings
      const jsonStr = JSON.stringify(value);
      const truncated = jsonStr.length > 100 ? jsonStr.substring(0, 100) + '...' : jsonStr;
      formattedValue = `<code style="font-size: 11px; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; word-break: break-all;">${escapeHtml(truncated)}</code>`;
    } else {
      formattedValue = escapeHtml(formatValue(value));
    }

    const maskedClass = isMasked ? ' activity-metadata-item--masked' : '';

    return `
      <div class="activity-metadata-item${maskedClass}" style="display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
        <span style="color: #6b7280; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">${formattedKey}</span>
        <span style="color: #111827; font-size: 12px; font-weight: 500; word-break: break-word;">${formattedValue}</span>
      </div>
    `;
  });

  return items.join('');
}

/**
 * Format enrichment debug info for display (collapsible diagnostics panel)
 */
export function formatEnrichmentDebugInfo(entry: ActivityEntry): string {
  const info = getEnrichmentInfo(entry);
  if (!info) return '';

  const items: string[] = [];

  if (info.enrichedAt) {
    const date = new Date(info.enrichedAt);
    const formatted = Number.isNaN(date.getTime()) ? info.enrichedAt : date.toLocaleString();
    items.push(`
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <span style="color: #9ca3af; font-size: 11px;">Enriched at:</span>
        <span style="color: #6b7280; font-size: 11px; font-family: ui-monospace, monospace;">${escapeHtml(formatted)}</span>
      </div>
    `);
  }

  if (info.enricherVersion) {
    items.push(`
      <div style="display: flex; justify-content: space-between; gap: 8px;">
        <span style="color: #9ca3af; font-size: 11px;">Enricher version:</span>
        <span style="color: #6b7280; font-size: 11px; font-family: ui-monospace, monospace;">${escapeHtml(info.enricherVersion)}</span>
      </div>
    `);
  }

  if (items.length === 0) return '';

  return `
    <div class="activity-enrichment-debug" style="margin-top: 8px; padding: 8px; background: #f9fafb; border-radius: 4px; border: 1px dashed #e5e7eb;">
      <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
        <i class="iconoir-info-circle" style="font-size: 12px; color: #9ca3af;"></i>
        <span style="color: #9ca3af; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Debug Info</span>
      </div>
      ${items.join('')}
    </div>
  `;
}

/**
 * Format a value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') {
    // Truncate long strings
    if (value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  }
  return JSON.stringify(value);
}

/**
 * Format channel for display (shorten UUIDs)
 */
export function formatChannel(channel: string | undefined): string {
  if (!channel) return '';
  return shortenId(channel, 7);
}

/**
 * Get CSS class for action category
 */
export function getActionClass(category: ActionCategory): string {
  return `activity-action--${category}`;
}

/**
 * Get icon HTML for action category
 */
export function getActionIconHtml(category: ActionCategory): string {
  const icon = ACTION_ICONS[category];
  return renderIcon(`iconoir:${icon}`, { extraClass: 'activity-action-icon' });
}

/**
 * Get actor type icon HTML with optional badge styling
 */
export function getActorTypeIconHtml(actorType: ActorType, options?: { badge?: boolean; size?: 'sm' | 'md' | 'lg' }): string {
  const { badge = false, size = 'md' } = options || {};
  const icon = ACTOR_TYPE_ICONS[actorType];
  const label = ACTOR_TYPE_LABELS[actorType];

  const sizeMap: Record<string, string> = {
    sm: '12px',
    md: '14px',
    lg: '16px',
  };

  if (badge) {
    const iconHtml = renderIcon(`iconoir:${icon}`, { size: sizeMap[size] });
    return `
      <span class="activity-actor-type-badge activity-actor-type-badge--${actorType}" title="${escapeHtml(label)}">
        ${iconHtml}
      </span>
    `;
  }

  return renderIcon(`iconoir:${icon}`, {
    size: sizeMap[size],
    extraClass: `activity-actor-type-icon activity-actor-type-icon--${actorType}`,
  });
}

/**
 * Format actor display with type icon
 */
export function formatActorWithType(entry: ActivityEntry): string {
  const actor = resolveActorLabel(entry) || 'Unknown';
  const actorType = getActorType(entry);

  // Format actor - shorten if UUID
  const actorDisplay = isUuidLike(actor)
    ? formatIdWithTooltip(actor, 8)
    : escapeHtml(actor);

  // Only show icon for non-user types (user is the default/expected)
  const typeIcon = actorType !== 'user' && actorType !== 'unknown'
    ? getActorTypeIconHtml(actorType, { badge: true, size: 'sm' }) + ' '
    : '';

  return `${typeIcon}<strong>${actorDisplay}</strong>`;
}

/**
 * Shorten a session ID for display
 */
export function formatSessionId(sessionId: string, length: number = 10): string {
  if (!sessionId) return '';
  return shortenId(sessionId, length);
}

/**
 * Get session group label for timeline display
 */
export function getSessionGroupLabel(sessionId: string): string {
  if (!sessionId) return 'No session';
  if (isMaskedValue(sessionId)) return 'Session (masked)';
  return `Session ${formatSessionId(sessionId, 8)}`;
}
